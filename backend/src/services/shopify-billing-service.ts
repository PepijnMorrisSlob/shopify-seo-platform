/**
 * Shopify Billing Service
 *
 * Manages subscriptions via Shopify's RecurringApplicationCharge API.
 * Flow:
 *   1. User clicks "Upgrade to Starter" → POST /api/billing/subscribe
 *   2. We create a RecurringApplicationCharge via Shopify GraphQL
 *   3. Shopify returns a confirmationUrl — we redirect the user
 *   4. User approves in Shopify admin → redirected back to our returnUrl
 *   5. We fetch the charge status and mark the org as ACTIVE on confirmed charge
 *   6. APP_SUBSCRIPTIONS_UPDATE webhook keeps status in sync going forward
 */

import axios from 'axios';
import { PrismaClient, PlanTier } from '@prisma/client';
import { Logger } from '@nestjs/common';
import { getEncryptionService } from './encryption-service';
import { TierLimits, DEFAULT_TIER_CONFIG } from './tier-service';

const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2026-01';

export interface CreateSubscriptionInput {
  organizationId: string;
  tier: PlanTier;
  /** Shopify-safe return URL — user lands here after approve/decline */
  returnUrl: string;
  /** If true, charge in test mode (works on development stores) */
  test?: boolean;
}

export interface CreateSubscriptionResult {
  confirmationUrl: string;
  chargeId: string;
}

export class ShopifyBillingService {
  private readonly logger = new Logger(ShopifyBillingService.name);
  private readonly prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Create a RecurringApplicationCharge on the store via GraphQL Admin API.
   * Returns the Shopify confirmationUrl the user must visit to approve.
   */
  async createSubscription(
    input: CreateSubscriptionInput,
  ): Promise<CreateSubscriptionResult> {
    const org = await this.prisma.organization.findUnique({
      where: { id: input.organizationId },
      select: {
        id: true,
        shopifyDomain: true,
        accessTokenEncrypted: true,
      },
    });

    if (!org) {
      throw new Error(`Organization ${input.organizationId} not found`);
    }

    const tierConfig: TierLimits = DEFAULT_TIER_CONFIG[input.tier];
    if (!tierConfig) {
      throw new Error(`Unknown tier: ${input.tier}`);
    }

    if (tierConfig.monthlyPriceUsd <= 0) {
      throw new Error(
        `Tier ${input.tier} is free — no subscription needed.`,
      );
    }

    const accessToken = this.decryptAccessToken(org.accessTokenEncrypted);
    const endpoint = `https://${org.shopifyDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;

    // Shopify appSubscriptionCreate mutation
    const mutation = `
      mutation appSubscriptionCreate(
        $name: String!
        $returnUrl: URL!
        $test: Boolean
        $lineItems: [AppSubscriptionLineItemInput!]!
      ) {
        appSubscriptionCreate(
          name: $name
          returnUrl: $returnUrl
          test: $test
          lineItems: $lineItems
        ) {
          userErrors { field message }
          confirmationUrl
          appSubscription { id status }
        }
      }
    `;

    const variables = {
      name: `${this.humanizeTier(input.tier)} plan`,
      returnUrl: input.returnUrl,
      test: input.test ?? this.isTestMode(org.shopifyDomain),
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              price: {
                amount: tierConfig.monthlyPriceUsd,
                currencyCode: 'USD',
              },
              interval: 'EVERY_30_DAYS',
            },
          },
        },
      ],
    };

    try {
      const response = await axios.post(
        endpoint,
        { query: mutation, variables },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': accessToken,
          },
        },
      );

      const payload = response.data?.data?.appSubscriptionCreate;
      if (payload?.userErrors?.length > 0) {
        const errors = payload.userErrors.map((e: any) => e.message).join('; ');
        throw new Error(`Shopify rejected subscription: ${errors}`);
      }

      const confirmationUrl = payload?.confirmationUrl;
      const chargeId = payload?.appSubscription?.id;
      if (!confirmationUrl || !chargeId) {
        throw new Error('Shopify did not return a confirmation URL');
      }

      // Record the pending subscription so we can reconcile via webhook
      await this.prisma.organization.update({
        where: { id: org.id },
        data: {
          subscriptionId: chargeId,
          billingStatus: 'TRIAL', // stays TRIAL until activate webhook/confirmation
        },
      });

      this.logger.log(
        `Created ${input.tier} subscription for ${org.shopifyDomain} — ${chargeId}`,
      );

      return { confirmationUrl, chargeId };
    } catch (error: any) {
      this.logger.error(
        `Failed to create subscription for ${org.shopifyDomain}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Handle the APP_SUBSCRIPTIONS_UPDATE webhook payload. Shopify sends this
   * whenever the subscription status changes (ACTIVE, CANCELLED, DECLINED,
   * EXPIRED, FROZEN, PENDING).
   */
  async handleSubscriptionUpdate(payload: {
    app_subscription: {
      admin_graphql_api_id: string;
      status: string;
      name?: string;
    };
  }): Promise<void> {
    const chargeId = payload.app_subscription.admin_graphql_api_id;
    const status = payload.app_subscription.status.toUpperCase();

    const org = await this.prisma.organization.findFirst({
      where: { subscriptionId: chargeId },
      select: { id: true, shopifyDomain: true, planTier: true },
    });

    if (!org) {
      this.logger.warn(
        `Subscription update for unknown chargeId ${chargeId}`,
      );
      return;
    }

    const billingStatus = this.mapShopifyStatus(status);
    const newTier = billingStatus === 'CANCELED' ? 'FREE' : org.planTier;

    await this.prisma.organization.update({
      where: { id: org.id },
      data: {
        billingStatus,
        planTier: newTier,
      },
    });

    this.logger.log(
      `Updated billing for ${org.shopifyDomain}: ${status} → ${billingStatus}`,
    );
  }

  /**
   * Activate the subscription after the user approves on Shopify's side.
   * Called from the billing return URL handler.
   */
  async activateSubscription(
    organizationId: string,
    chargeId: string,
    tier: PlanTier,
  ): Promise<void> {
    // Verify the charge status with Shopify before flipping our DB.
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!org) throw new Error('Organization not found');

    const accessToken = this.decryptAccessToken(org.accessTokenEncrypted);
    const endpoint = `https://${org.shopifyDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;

    const query = `
      query getCharge($id: ID!) {
        node(id: $id) {
          ... on AppSubscription {
            id
            status
            name
          }
        }
      }
    `;

    const response = await axios.post(
      endpoint,
      { query, variables: { id: chargeId } },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
        },
      },
    );

    const status = response.data?.data?.node?.status?.toUpperCase();
    if (status !== 'ACTIVE') {
      throw new Error(
        `Subscription is not active yet (status=${status}). Have the user complete the Shopify approval.`,
      );
    }

    await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        planTier: tier,
        billingStatus: 'ACTIVE',
        subscriptionId: chargeId,
      },
    });

    this.logger.log(
      `Activated ${tier} subscription for ${org.shopifyDomain}`,
    );
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private decryptAccessToken(encrypted: string): string {
    // The encryption service expects EncryptedData (object), but our DB stores
    // the serialized token directly. The existing auth-service encodes it
    // when storing — decrypt expects the same format.
    try {
      const encryption = getEncryptionService();
      const data = JSON.parse(encrypted);
      return encryption.decryptAccessToken(data);
    } catch {
      // Legacy token format (pre-encryption) — return as-is
      return encrypted;
    }
  }

  private humanizeTier(tier: PlanTier): string {
    switch (tier) {
      case 'STARTER':
        return 'Starter';
      case 'PROFESSIONAL':
        return 'Professional';
      case 'ENTERPRISE':
        return 'Enterprise';
      default:
        return tier;
    }
  }

  private mapShopifyStatus(status: string): 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIAL' {
    switch (status) {
      case 'ACTIVE':
        return 'ACTIVE';
      case 'CANCELLED':
      case 'CANCELED':
      case 'DECLINED':
      case 'EXPIRED':
        return 'CANCELED';
      case 'FROZEN':
      case 'PAST_DUE':
        return 'PAST_DUE';
      default:
        return 'TRIAL';
    }
  }

  private isTestMode(shopifyDomain: string): boolean {
    // Dev stores typically have "test" or "dev" in the subdomain. Use test
    // mode on them so the merchant isn't actually billed.
    return /test|dev|staging|sandbox/i.test(shopifyDomain);
  }
}

let instance: ShopifyBillingService | null = null;

export function getShopifyBillingService(): ShopifyBillingService {
  if (!instance) instance = new ShopifyBillingService();
  return instance;
}
