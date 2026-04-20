/**
 * Billing Controller
 *
 * Subscription management via Shopify's RecurringApplicationCharge API.
 *   POST /api/billing/subscribe      — create subscription, returns confirmation URL
 *   GET  /api/billing/return          — Shopify redirects here after approve/decline
 *   GET  /api/billing/tier            — current tier + limits for an org
 *   GET  /api/billing/plans           — list available tiers with prices/features
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { PlanTier } from '@prisma/client';
import { getShopifyBillingService } from '../services/shopify-billing-service';
import { getTierService, DEFAULT_TIER_CONFIG } from '../services/tier-service';

@Controller('billing')
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  /**
   * Start a new subscription. Returns the Shopify confirmationUrl — the
   * caller redirects the merchant there to approve the charge.
   */
  @Post('subscribe')
  async subscribe(
    @Body()
    body: {
      organizationId: string;
      tier: PlanTier;
      returnUrl?: string;
      test?: boolean;
    },
  ) {
    if (!body?.organizationId || !body?.tier) {
      throw new HttpException(
        'organizationId and tier are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (body.tier === 'FREE') {
      throw new HttpException(
        'FREE plan does not require a subscription',
        HttpStatus.BAD_REQUEST,
      );
    }

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3003';
    const returnUrl =
      body.returnUrl ||
      `${backendUrl}/api/billing/return?organizationId=${body.organizationId}&tier=${body.tier}`;

    const service = getShopifyBillingService();
    try {
      const result = await service.createSubscription({
        organizationId: body.organizationId,
        tier: body.tier,
        returnUrl,
        test: body.test,
      });

      return {
        success: true,
        confirmationUrl: result.confirmationUrl,
        chargeId: result.chargeId,
      };
    } catch (error: any) {
      this.logger.error(`Subscribe failed: ${error.message}`);
      throw new HttpException(
        `Subscription failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Shopify redirects the merchant here after they approve or decline the
   * charge. We verify the subscription is ACTIVE, then flip the org's tier
   * and redirect to the frontend dashboard.
   */
  @Get('return')
  async billingReturn(
    @Query('organizationId') organizationId: string,
    @Query('tier') tier: PlanTier,
    @Query('charge_id') chargeIdParam: string | undefined,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4173';

    if (!organizationId || !tier) {
      return res.redirect(`${frontendUrl}/settings?billing=error&reason=missing_params`);
    }

    // Shopify returns the charge id either as ?charge_id=... (legacy REST) or
    // we stored it on the org record during subscribe (GraphQL). Try both.
    let chargeId = chargeIdParam;
    if (!chargeId) {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { subscriptionId: true },
      });
      chargeId = org?.subscriptionId || undefined;
      await prisma.$disconnect();
    }

    if (!chargeId) {
      return res.redirect(
        `${frontendUrl}/settings?billing=error&reason=no_charge_id`,
      );
    }

    const service = getShopifyBillingService();
    try {
      // Convert numeric REST id to GraphQL gid if needed
      const gid = chargeId.startsWith('gid://')
        ? chargeId
        : `gid://shopify/AppSubscription/${chargeId}`;
      await service.activateSubscription(organizationId, gid, tier);
      return res.redirect(`${frontendUrl}/settings?billing=active&tier=${tier}`);
    } catch (error: any) {
      this.logger.error(`Billing return failed: ${error.message}`);
      return res.redirect(
        `${frontendUrl}/settings?billing=error&reason=${encodeURIComponent(error.message)}`,
      );
    }
  }

  /**
   * GET /api/billing/tier?organizationId=...
   * Returns the org's current tier + limits + usage counters.
   */
  @Get('tier')
  async getTier(@Query('organizationId') organizationId: string) {
    if (!organizationId) {
      throw new HttpException(
        'organizationId is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const tierService = getTierService();
    const limits = await tierService.getLimits(organizationId);

    const [qaPageCheck, competitorCheck, productCheck, contentGenCheck] =
      await Promise.all([
        tierService.canCreateQAPage(organizationId),
        tierService.canAddCompetitor(organizationId),
        tierService.canSyncProducts(organizationId),
        tierService.canGenerateContent(organizationId),
      ]);

    return {
      tier: limits.tier,
      limits,
      usage: {
        qaPages: { current: qaPageCheck.current, limit: qaPageCheck.limit },
        competitors: { current: competitorCheck.current, limit: competitorCheck.limit },
        products: { current: productCheck.current, limit: productCheck.limit },
        contentGenerationsThisMonth: {
          current: contentGenCheck.current,
          limit: contentGenCheck.limit,
        },
      },
    };
  }

  /**
   * GET /api/billing/plans — public list of available plans with prices.
   */
  @Get('plans')
  getPlans() {
    const tiers: PlanTier[] = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];
    return {
      plans: tiers.map((tier) => ({
        tier,
        ...DEFAULT_TIER_CONFIG[tier],
      })),
    };
  }
}
