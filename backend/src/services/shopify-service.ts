/**
 * Shopify GraphQL Admin API Service
 * Handles product sync and Shopify API interactions
 * API Version: 2026-01
 */

import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { getEncryptionService } from './encryption-service';
import { EncryptedData } from '../types/auth.types';

export class ShopifyService {
  private readonly prisma: PrismaClient;
  private readonly encryptionService = getEncryptionService();
  private readonly apiVersion = '2026-01';

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Get decrypted access token for an organization
   */
  private async getAccessToken(organizationId: string): Promise<string> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        accessTokenEncrypted: true,
        shopifyDomain: true,
      },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    if (!organization.accessTokenEncrypted) {
      throw new Error('No access token found for organization');
    }

    // Parse encrypted token and decrypt
    const encryptedData = JSON.parse(organization.accessTokenEncrypted) as EncryptedData;
    const accessToken = this.encryptionService.decryptAccessToken(encryptedData);

    return accessToken;
  }

  /**
   * Execute GraphQL query against Shopify Admin API
   */
  private async executeGraphQL(shop: string, accessToken: string, query: string, variables?: any): Promise<any> {
    const url = `https://${shop}/admin/api/${this.apiVersion}/graphql.json`;

    try {
      const response = await axios.post(
        url,
        { query, variables },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': accessToken,
          },
        }
      );

      if (response.data.errors) {
        console.error('[ShopifyService] GraphQL errors:', response.data.errors);
        throw new Error(`GraphQL errors: ${JSON.stringify(response.data.errors)}`);
      }

      return response.data.data;
    } catch (error: any) {
      console.error('[ShopifyService] API call failed:', error.message);
      throw error;
    }
  }

  /**
   * Sync all products from Shopify to database
   */
  async syncProducts(organizationId: string): Promise<{
    synced: number;
    errors: string[];
  }> {
    console.log(`[ShopifyService] Starting product sync for organization: ${organizationId}`);

    // Get organization details
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        shopifyDomain: true,
        accessTokenEncrypted: true,
      },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    const accessToken = await this.getAccessToken(organizationId);
    const errors: string[] = [];
    let synced = 0;
    let hasNextPage = true;
    let cursor: string | null = null;

    // GraphQL query to fetch products
    const query = `
      query getProducts($cursor: String) {
        products(first: 50, after: $cursor) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              title
              handle
              description
              descriptionHtml
              status
              vendor
              productType
              tags
              createdAt
              updatedAt
              seo {
                title
                description
              }
              featuredImage {
                url
                altText
              }
              variants(first: 1) {
                edges {
                  node {
                    id
                    price
                    sku
                  }
                }
              }
            }
          }
        }
      }
    `;

    try {
      while (hasNextPage) {
        const data = await this.executeGraphQL(
          organization.shopifyDomain,
          accessToken,
          query,
          { cursor }
        );

        const productsData = data.products;
        hasNextPage = productsData.pageInfo.hasNextPage;
        cursor = productsData.pageInfo.endCursor;

        // Process each product
        for (const edge of productsData.edges) {
          const product = edge.node;

          try {
            // Extract Shopify numeric ID from gid://shopify/Product/123456
            const shopifyProductId = product.id.split('/').pop();
            const firstVariant = product.variants.edges[0]?.node;

            await this.prisma.product.upsert({
              where: {
                organizationId_shopifyProductId: {
                  organizationId,
                  shopifyProductId,
                },
              },
              update: {
                title: product.title,
                handle: product.handle,
                bodyHtml: product.descriptionHtml || null,
                status: product.status,
                vendor: product.vendor || null,
                productType: product.productType || null,
                tags: product.tags,
                currentMetaTitle: product.seo?.title || product.title,
                currentMetaDescription: product.seo?.description || null,
                currentImageUrl: product.featuredImage?.url || null,
                currentImageAlt: product.featuredImage?.altText || null,
                updatedAt: new Date(product.updatedAt),
              },
              create: {
                organizationId,
                shopifyProductId,
                title: product.title,
                handle: product.handle,
                bodyHtml: product.descriptionHtml || null,
                status: product.status,
                vendor: product.vendor || null,
                productType: product.productType || null,
                tags: product.tags,
                currentMetaTitle: product.seo?.title || product.title,
                currentMetaDescription: product.seo?.description || null,
                currentImageUrl: product.featuredImage?.url || null,
                currentImageAlt: product.featuredImage?.altText || null,
                seoScore: null,
                targetKeywords: [],
                createdAt: new Date(product.createdAt),
                updatedAt: new Date(product.updatedAt),
              },
            });

            synced++;
          } catch (productError: any) {
            console.error(`[ShopifyService] Failed to sync product ${product.title}:`, productError.message);
            errors.push(`${product.title}: ${productError.message}`);
          }
        }

        console.log(`[ShopifyService] Synced batch: ${synced} products so far...`);
      }

      console.log(`[ShopifyService] Product sync completed: ${synced} products synced, ${errors.length} errors`);

      return { synced, errors };
    } catch (error: any) {
      console.error('[ShopifyService] Product sync failed:', error.message);
      throw error;
    }
  }

  /**
   * Fetch a single product by Shopify Product ID
   */
  async fetchProduct(organizationId: string, shopifyProductId: string): Promise<any> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { shopifyDomain: true },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    const accessToken = await this.getAccessToken(organizationId);

    const query = `
      query getProduct($id: ID!) {
        product(id: $id) {
          id
          title
          handle
          description
          seo {
            title
            description
          }
        }
      }
    `;

    const data = await this.executeGraphQL(
      organization.shopifyDomain,
      accessToken,
      query,
      { id: `gid://shopify/Product/${shopifyProductId}` }
    );

    return data.product;
  }

  /**
   * Update product SEO fields in Shopify
   */
  async updateProductSEO(
    organizationId: string,
    shopifyProductId: string,
    seo: { title: string; description: string }
  ): Promise<void> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { shopifyDomain: true },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    const accessToken = await this.getAccessToken(organizationId);

    const mutation = `
      mutation updateProduct($input: ProductInput!) {
        productUpdate(input: $input) {
          product {
            id
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

    const variables = {
      input: {
        id: `gid://shopify/Product/${shopifyProductId}`,
        seo: {
          title: seo.title,
          description: seo.description,
        },
      },
    };

    const data = await this.executeGraphQL(
      organization.shopifyDomain,
      accessToken,
      mutation,
      variables
    );

    if (data.productUpdate.userErrors.length > 0) {
      throw new Error(`Failed to update product: ${JSON.stringify(data.productUpdate.userErrors)}`);
    }

    console.log(`[ShopifyService] Updated SEO for product ${shopifyProductId}`);
  }
}

export function getShopifyService(prisma: PrismaClient): ShopifyService {
  return new ShopifyService(prisma);
}
