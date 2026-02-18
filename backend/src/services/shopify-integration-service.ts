/**
 * Shopify GraphQL Integration Service
 *
 * Integrates with Shopify GraphQL Admin API 2026-01 (REST deprecated April 2025)
 *
 * Features:
 * - GraphQL Admin API 2026-01 client
 * - Cost-based rate limiting (50 points/sec, 1000-point bucket)
 * - Bulk operations for large product imports
 * - Product sync (import + webhooks)
 * - GraphQL mutations (update product SEO)
 * - Webhook subscription management
 * - HMAC validation
 * - Automatic retry with exponential backoff
 * - Circuit breaker for fault tolerance
 *
 * Rate Limiting:
 * - Shopify uses cost-based rate limiting
 * - Each query has a cost (simple: 1-10, complex: 50-100+)
 * - 50 points restored per second
 * - 1000-point bucket capacity
 * - Throttle at 90% capacity to prevent errors
 */

import { GraphQLClient } from 'graphql-request';
import crypto from 'crypto';
import {
  ShopifyProduct,
  ShopifyBulkOperation,
  ShopifyWebhook,
  ShopifyWebhookTopic,
  ShopifyWebhookPayload,
  ShopifyGraphQLResponse,
  APIError,
  RateLimitError,
} from '../types/external-apis.types';
import { Organization } from '@prisma/client';
import { Product } from '../types/database.types';
import { RateLimiter, createShopifyRateLimiter } from '../utils/rate-limiter';
import { RetryHelper, CircuitBreaker } from '../utils/retry-helper';

export interface ShopifyClientConfig {
  shopDomain: string;
  accessToken: string;
  apiVersion?: string;
  rateLimiter?: RateLimiter;
}

export class ShopifyIntegrationService {
  private readonly graphqlClient: GraphQLClient;
  private readonly shopDomain: string;
  private readonly accessToken: string;
  private readonly apiVersion: string;
  private readonly rateLimiter: RateLimiter;
  private readonly retryHelper: RetryHelper;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(config: ShopifyClientConfig) {
    this.shopDomain = config.shopDomain;
    this.accessToken = config.accessToken;
    this.apiVersion = config.apiVersion || '2026-01';

    const endpoint = `https://${this.shopDomain}/admin/api/${this.apiVersion}/graphql.json`;

    this.graphqlClient = new GraphQLClient(endpoint, {
      headers: {
        'X-Shopify-Access-Token': this.accessToken,
        'Content-Type': 'application/json',
      },
    });

    this.rateLimiter = config.rateLimiter || createShopifyRateLimiter();
    this.retryHelper = new RetryHelper({
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      retryableStatusCodes: [408, 429, 500, 502, 503, 504],
    });
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeoutMs: 60000,
    });
  }

  // ============================================================================
  // PRODUCT SYNC OPERATIONS
  // ============================================================================

  /**
   * Bulk import all products using GraphQL Bulk Operations API
   * New in 2026-01: More efficient than paginated queries
   */
  async bulkImportProducts(): Promise<ShopifyBulkOperation> {
    console.log(`[Shopify] Starting bulk product import for ${this.shopDomain}`);

    const query = `
      mutation {
        bulkOperationRunQuery(
          query: """
            {
              products {
                edges {
                  node {
                    id
                    title
                    descriptionHtml
                    handle
                    status
                    productType
                    vendor
                    tags
                    seo {
                      title
                      description
                    }
                    variants(first: 100) {
                      edges {
                        node {
                          id
                          title
                          price
                          sku
                          inventoryQuantity
                          position
                        }
                      }
                    }
                    images(first: 10) {
                      edges {
                        node {
                          id
                          url
                          altText
                          width
                          height
                        }
                      }
                    }
                    createdAt
                    updatedAt
                  }
                }
              }
            }
          """
        ) {
          bulkOperation {
            id
            status
            query
            createdAt
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const response = await this.executeGraphQL<{
      bulkOperationRunQuery: {
        bulkOperation: ShopifyBulkOperation;
        userErrors: Array<{ field: string[]; message: string }>;
      };
    }>(query, 'bulkImportProducts', 10); // Bulk operations typically cost ~10 points

    if (response.bulkOperationRunQuery.userErrors?.length > 0) {
      throw new APIError(
        `Bulk operation failed: ${JSON.stringify(response.bulkOperationRunQuery.userErrors)}`,
        400,
        'shopify'
      );
    }

    const operation = response.bulkOperationRunQuery.bulkOperation;

    console.log(
      `[Shopify] Bulk operation started: ${operation.id} (status: ${operation.status})`
    );

    return operation;
  }

  /**
   * Check status of bulk operation and download results
   */
  async getBulkOperationStatus(operationId: string): Promise<ShopifyBulkOperation> {
    const query = `
      query {
        node(id: "${operationId}") {
          ... on BulkOperation {
            id
            status
            errorCode
            createdAt
            completedAt
            objectCount
            fileSize
            url
            query
          }
        }
      }
    `;

    const response = await this.executeGraphQL<{
      node: ShopifyBulkOperation;
    }>(query, 'getBulkOperationStatus', 1);

    return response.node;
  }

  /**
   * Sync a single product by ID
   */
  async syncProduct(productId: string): Promise<ShopifyProduct> {
    console.log(`[Shopify] Syncing product: ${productId}`);

    const query = `
      query {
        product(id: "${productId}") {
          id
          title
          descriptionHtml
          handle
          status
          productType
          vendor
          tags
          seo {
            title
            description
          }
          variants(first: 100) {
            edges {
              node {
                id
                title
                price
                sku
                inventoryQuantity
                position
              }
            }
          }
          images(first: 10) {
            edges {
              node {
                id
                url
                altText
                width
                height
              }
            }
          }
          createdAt
          updatedAt
        }
      }
    `;

    const response = await this.executeGraphQL<{
      product: ShopifyProduct;
    }>(query, 'syncProduct', 5);

    return response.product;
  }

  /**
   * Get all products with pagination (legacy method, use bulk import for large catalogs)
   */
  async getAllProducts(limit: number = 250): Promise<ShopifyProduct[]> {
    const products: ShopifyProduct[] = [];
    let hasNextPage = true;
    let endCursor: string | null = null;

    while (hasNextPage) {
      const query: any = `
        query {
          products(first: ${limit}${endCursor ? `, after: "${endCursor}"` : ''}) {
            edges {
              node {
                id
                title
                descriptionHtml
                handle
                status
                productType
                vendor
                tags
                seo {
                  title
                  description
                }
                createdAt
                updatedAt
              }
              cursor
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;

      const response = await this.executeGraphQL<{
        products: {
          edges: Array<{ node: ShopifyProduct; cursor: string }>;
          pageInfo: { hasNextPage: boolean; endCursor: string };
        };
      }>(query, 'getAllProducts', 10);

      products.push(...response.products.edges.map((edge: any) => edge.node));

      hasNextPage = response.products.pageInfo.hasNextPage;
      endCursor = response.products.pageInfo.endCursor;

      console.log(`[Shopify] Fetched ${products.length} products so far...`);
    }

    return products;
  }

  // ============================================================================
  // PRODUCT UPDATE OPERATIONS
  // ============================================================================

  /**
   * Update product meta tags (SEO)
   */
  async updateProductMetaTags(
    productId: string,
    metaTitle: string,
    metaDescription: string
  ): Promise<ShopifyProduct> {
    console.log(`[Shopify] Updating meta tags for product: ${productId}`);

    const mutation = `
      mutation {
        productUpdate(input: {
          id: "${productId}",
          seo: {
            title: "${this.escapeGraphQL(metaTitle)}",
            description: "${this.escapeGraphQL(metaDescription)}"
          }
        }) {
          product {
            id
            title
            seo {
              title
              description
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const response = await this.executeGraphQL<{
      productUpdate: {
        product: ShopifyProduct;
        userErrors: Array<{ field: string[]; message: string }>;
      };
    }>(mutation, 'updateProductMetaTags', 10);

    if (response.productUpdate.userErrors?.length > 0) {
      throw new APIError(
        `Product update failed: ${JSON.stringify(response.productUpdate.userErrors)}`,
        400,
        'shopify'
      );
    }

    console.log(`[Shopify] Successfully updated meta tags for ${productId}`);

    return response.productUpdate.product;
  }

  /**
   * Update product description
   */
  async updateProductDescription(
    productId: string,
    descriptionHtml: string
  ): Promise<ShopifyProduct> {
    console.log(`[Shopify] Updating description for product: ${productId}`);

    const mutation = `
      mutation {
        productUpdate(input: {
          id: "${productId}",
          descriptionHtml: "${this.escapeGraphQL(descriptionHtml)}"
        }) {
          product {
            id
            title
            descriptionHtml
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const response = await this.executeGraphQL<{
      productUpdate: {
        product: ShopifyProduct;
        userErrors: Array<{ field: string[]; message: string }>;
      };
    }>(mutation, 'updateProductDescription', 10);

    if (response.productUpdate.userErrors?.length > 0) {
      throw new APIError(
        `Product update failed: ${JSON.stringify(response.productUpdate.userErrors)}`,
        400,
        'shopify'
      );
    }

    return response.productUpdate.product;
  }

  // ============================================================================
  // WEBHOOK OPERATIONS
  // ============================================================================

  /**
   * Create webhook subscriptions for product events
   */
  async createWebhookSubscriptions(callbackUrl: string): Promise<ShopifyWebhook[]> {
    const topics: ShopifyWebhookTopic[] = [
      'PRODUCTS_CREATE',
      'PRODUCTS_UPDATE',
      'PRODUCTS_DELETE',
      'APP_UNINSTALLED',
    ];

    const webhooks: ShopifyWebhook[] = [];

    for (const topic of topics) {
      console.log(`[Shopify] Creating webhook subscription for ${topic}`);

      const mutation = `
        mutation {
          webhookSubscriptionCreate(
            topic: ${topic},
            webhookSubscription: {
              callbackUrl: "${callbackUrl}",
              format: JSON
            }
          ) {
            webhookSubscription {
              id
              topic
              callbackUrl
              format
              createdAt
              updatedAt
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const response = await this.executeGraphQL<{
        webhookSubscriptionCreate: {
          webhookSubscription: ShopifyWebhook;
          userErrors: Array<{ field: string[]; message: string }>;
        };
      }>(mutation, 'createWebhookSubscription', 10);

      if (response.webhookSubscriptionCreate.userErrors?.length > 0) {
        console.error(
          `[Shopify] Failed to create webhook for ${topic}:`,
          response.webhookSubscriptionCreate.userErrors
        );
        continue;
      }

      webhooks.push(response.webhookSubscriptionCreate.webhookSubscription);
    }

    console.log(`[Shopify] Created ${webhooks.length} webhook subscriptions`);

    return webhooks;
  }

  /**
   * Validate webhook HMAC signature
   */
  validateWebhookHMAC(body: string, hmacHeader: string, secret: string): boolean {
    const hash = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('base64');

    return hash === hmacHeader;
  }

  /**
   * Delete webhook subscription
   */
  async deleteWebhookSubscription(webhookId: string): Promise<void> {
    const mutation = `
      mutation {
        webhookSubscriptionDelete(id: "${webhookId}") {
          deletedWebhookSubscriptionId
          userErrors {
            field
            message
          }
        }
      }
    `;

    await this.executeGraphQL(mutation, 'deleteWebhookSubscription', 10);
  }

  // ============================================================================
  // GRAPHQL EXECUTION WITH RATE LIMITING
  // ============================================================================

  private async executeGraphQL<T = any>(
    query: string,
    operationName: string,
    estimatedCost: number = 10
  ): Promise<T> {
    return this.retryHelper.executeWithRetry(
      async () => {
        // Wait for rate limiter
        await this.rateLimiter.waitAndConsume(estimatedCost, this.shopDomain);

        try {
          const response: ShopifyGraphQLResponse<T> =
            await this.graphqlClient.request(query);

          // Check for GraphQL errors
          if (response.errors && response.errors.length > 0) {
            const error = response.errors[0];

            // Check if it's a rate limit error
            if (error.extensions?.code === 'THROTTLED') {
              const retryAfter = await this.rateLimiter.handleRateLimitError(this.shopDomain);
              throw new RateLimitError('shopify', retryAfter / 1000);
            }

            throw new APIError(error.message, 400, 'shopify', error);
          }

          // Update rate limiter from API response
          if (response.extensions?.cost) {
            const { requestedQueryCost, actualQueryCost, throttleStatus } =
              response.extensions.cost;

            await this.rateLimiter.updateFromAPIResponse(
              requestedQueryCost,
              actualQueryCost,
              throttleStatus.currentlyAvailable,
              this.shopDomain
            );
          }

          return response.data as T;
        } catch (error: any) {
          // Handle HTTP errors
          if (error.response?.status === 429) {
            const retryAfter = error.response.headers?.['retry-after'];
            const waitTime = await this.rateLimiter.handleRateLimitError(
              this.shopDomain,
              retryAfter ? parseInt(retryAfter) : undefined
            );
            throw new RateLimitError('shopify', waitTime / 1000, error);
          }

          throw new APIError(
            error.message || 'GraphQL request failed',
            error.response?.status || 500,
            'shopify',
            error
          );
        }
      },
      `Shopify.${operationName}`,
      this.circuitBreaker
    );
  }

  private escapeGraphQL(str: string): string {
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get rate limit status
   */
  async getRateLimitStatus() {
    return this.rateLimiter.getStatus(this.shopDomain);
  }

  /**
   * Get circuit breaker stats
   */
  getCircuitBreakerStats() {
    return this.circuitBreaker.getStats();
  }
}

/**
 * Factory function to create Shopify client from organization
 * TODO: Integrate with encryption service from Security Specialist
 */
export async function createShopifyClient(
  organization: Organization,
  rateLimiter?: RateLimiter
): Promise<ShopifyIntegrationService> {
  // Decrypt access token using encryption service
  const encryptionService = (await import('./encryption-service')).getEncryptionService();
  const accessToken = encryptionService.decryptAccessToken(JSON.parse(organization.accessTokenEncrypted) as any);

  return new ShopifyIntegrationService({
    shopDomain: organization.shopifyDomain,
    accessToken,
    rateLimiter,
  });
}
