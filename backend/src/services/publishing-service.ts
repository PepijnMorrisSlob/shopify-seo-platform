import { Injectable, Logger } from '@nestjs/common';
import { PublishResult, SchemaType } from '../types/automation.types';
import { publishingQueue } from '../queues/publishing-queue';
import { PrismaClient } from '../types/database.types';

/**
 * Publishing Service
 * Handles publishing SEO content to Shopify
 *
 * Features:
 * - Single product publishing
 * - Bulk publishing (queued)
 * - Schema markup generation
 * - Internal linking
 * - Quality validation
 * - Audit trail
 *
 * Scale: 100+ concurrent publishes
 * Target: <5s publish time
 */

@Injectable()
export class PublishingService {
  private readonly logger = new Logger(PublishingService.name);
  private prisma: PrismaClient;
  private shopifyService: any;

  constructor() {
    // Injected via NestJS DI in production
  }

  async publishProductMetaTags(
    productId: string,
    metaTitle: string,
    metaDescription: string,
    organizationId: string
  ): Promise<PublishResult> {
    try {
      this.logger.log(`Publishing meta tags for product ${productId}`);

      // 1. Validate content quality
      const isValid = this.validateContent(metaTitle, metaDescription);
      if (!isValid) {
        return {
          success: false,
          productId,
          error: 'Content validation failed: Quality score too low',
        };
      }

      // 2. Fetch product from database
      const product = await this.prisma.product.findUnique({
        where: { id: productId, organization_id: organizationId },
      });

      if (!product) {
        return {
          success: false,
          productId,
          error: 'Product not found',
        };
      }

      // 3. Call Shopify API to update meta tags
      const shopifyResult = await this.shopifyService.updateProductMetafields(
        product.shopify_product_id,
        {
          metaTitle,
          metaDescription,
        },
        organizationId
      );

      if (!shopifyResult.success) {
        return {
          success: false,
          productId,
          error: `Shopify API error: ${shopifyResult.error}`,
        };
      }

      // 4. Update database with published timestamp
      const publishedAt = new Date();
      await this.prisma.contentGeneration.update({
        where: { product_id: productId },
        data: {
          status: 'published',
          published_at: publishedAt,
          updated_at: publishedAt,
        },
      });

      await this.prisma.product.update({
        where: { id: productId },
        data: {
          current_meta_title: metaTitle,
          current_meta_description: metaDescription,
          updated_at: publishedAt,
        },
      });

      // 5. Log audit trail
      await this.logAudit({
        organizationId,
        action: 'publish_meta_tags',
        entityType: 'product',
        entityId: productId,
        changes: { metaTitle, metaDescription },
      });

      this.logger.log(`Successfully published meta tags for product ${productId}`);

      return {
        success: true,
        productId,
        publishedAt,
        shopifyProductId: product.shopify_product_id,
      };
    } catch (error) {
      this.logger.error(`Error publishing meta tags for product ${productId}:`, error);
      return {
        success: false,
        productId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async publishBulk(
    products: Array<{ id: string; metaTitle: string; metaDescription: string }>,
    organizationId: string
  ): Promise<string> {
    this.logger.log(`Queuing bulk publish for ${products.length} products`);

    const bulkOp = await this.prisma.bulkOperation.create({
      data: {
        organization_id: organizationId,
        operation_type: 'publish',
        total_items: products.length,
        processed_items: 0,
        successful_items: 0,
        failed_items: 0,
        status: 'pending',
      },
    });

    const jobPromises = products.map((product: any, index: number) =>
      publishingQueue.add(
        `publish-${product.id}` as any, // Type cast for dynamic queue name
        {
          productId: product.id,
          organizationId,
          metaTitle: product.metaTitle,
          metaDescription: product.metaDescription,
        },
        {
          priority: 10 - Math.floor(index / 100),
        }
      )
    );

    await Promise.all(jobPromises);

    await this.prisma.bulkOperation.update({
      where: { id: bulkOp.id },
      data: { job_id: bulkOp.id, status: 'processing' },
    });

    return bulkOp.id;
  }

  async generateAndPublishSchema(
    productId: string,
    schemaType: SchemaType
  ): Promise<void> {
    this.logger.log(`Generating ${schemaType} schema for product ${productId}`);

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { contentGeneration: true },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    let schemaMarkup: string;
    switch (schemaType) {
      case 'Product':
        schemaMarkup = this.generateProductSchema(product);
        break;
      case 'FAQ':
        schemaMarkup = this.generateFAQSchema(product);
        break;
      case 'BreadcrumbList':
        schemaMarkup = this.generateBreadcrumbSchema(product);
        break;
      default:
        throw new Error(`Unsupported schema type: ${schemaType}`);
    }

    await this.shopifyService.updateProductMetafields(
      product.shopify_product_id,
      { schemaMarkup },
      product.organization_id
    );

    await this.prisma.contentGeneration.update({
      where: { product_id: productId },
      data: { schema_markup: schemaMarkup },
    });
  }

  async insertInternalLinks(
    productId: string,
    targetUrls: Array<{ url: string; anchorText: string }>
  ): Promise<void> {
    this.logger.log(`Inserting ${targetUrls.length} internal links for product ${productId}`);

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    let updatedDescription = product.description;
    targetUrls.forEach(({ url, anchorText }) => {
      const linkHtml = `<a href="${url}">${anchorText}</a>`;
      updatedDescription = updatedDescription.replace(anchorText, linkHtml);
    });

    await this.shopifyService.updateProductDescription(
      product.shopify_product_id,
      updatedDescription,
      product.organization_id
    );
  }

  private validateContent(metaTitle: string, metaDescription: string): boolean {
    if (!metaTitle || metaTitle.length < 10 || metaTitle.length > 60) {
      this.logger.warn('Meta title validation failed');
      return false;
    }

    if (!metaDescription || metaDescription.length < 50 || metaDescription.length > 160) {
      this.logger.warn('Meta description validation failed');
      return false;
    }

    return true;
  }

  private generateProductSchema(product: any): string {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      description: product.description,
      brand: {
        '@type': 'Brand',
        name: product.vendor,
      },
    };
    return JSON.stringify(schema);
  }

  private generateFAQSchema(product: any): string {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [],
    };
    return JSON.stringify(schema);
  }

  private generateBreadcrumbSchema(product: any): string {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: `https://${product.organization.shop_domain}`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: product.product_type,
          item: `https://${product.organization.shop_domain}/collections/${product.product_type}`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: product.title,
          item: `https://${product.organization.shop_domain}/products/${product.handle}`,
        },
      ],
    };
    return JSON.stringify(schema);
  }

  private async logAudit(data: {
    organizationId: string;
    action: string;
    entityType: string;
    entityId: string;
    changes: any;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        organization_id: data.organizationId,
        action: data.action,
        entity_type: data.entityType,
        entity_id: data.entityId,
        changes: data.changes,
        created_at: new Date(),
      },
    });
  }
}

export default PublishingService;
