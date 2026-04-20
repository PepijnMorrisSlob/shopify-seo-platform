/**
 * Products Controller
 * Shopify SEO Platform
 *
 * API endpoints for product management:
 * - GET /api/products - List products with search/pagination
 * - GET /api/products/:id - Get single product
 * - POST /api/products/sync - Sync products from Shopify
 *
 * Returns data matching the frontend Product type:
 * { id, shopifyId, title, handle, description, vendor, productType,
 *   tags, status, variants, images, seoScore, metaTitle, metaDescription,
 *   createdAt, updatedAt, organizationId }
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getShopifyService } from '../services/shopify-service';

@Controller('products')
export class ProductsController {
  private prisma = new PrismaClient();
  private shopifyService = getShopifyService(this.prisma);

  /**
   * Resolve organizationId - in dev mode, falls back to first organization
   */
  private async resolveOrganizationId(organizationId?: string): Promise<string | undefined> {
    if (organizationId) {
      return organizationId;
    }

    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      const firstOrg = await this.prisma.organization.findFirst({
        select: { id: true },
      });
      if (firstOrg) {
        return firstOrg.id;
      }
    }

    return undefined;
  }

  /**
   * Map a Prisma Product record to the frontend Product shape
   */
  private mapProductToFrontend(product: any): any {
    return {
      id: product.id,
      shopifyId: product.shopifyProductId || product.id,
      title: product.title,
      handle: product.handle,
      description: product.bodyHtml || '',
      vendor: product.vendor || '',
      productType: product.productType || '',
      tags: product.tags || [],
      status: (product.status || 'DRAFT').toLowerCase(),
      variants: this.extractVariants(product),
      images: this.extractImages(product),
      seoScore: product.seoScore || 0,
      metaTitle: product.currentMetaTitle || product.generatedMetaTitle || '',
      metaDescription: product.currentMetaDescription || product.generatedMetaDescription || '',
      createdAt: product.createdAt instanceof Date ? product.createdAt.toISOString() : product.createdAt,
      updatedAt: product.updatedAt instanceof Date ? product.updatedAt.toISOString() : product.updatedAt,
      organizationId: product.organizationId,
    };
  }

  /**
   * Extract variant data from product record
   */
  private extractVariants(product: any): any[] {
    // Prisma doesn't have a variants relation on Product, so we create a default variant
    // from the product data, or return mock variants
    if (product.shopifyVariantId) {
      return [{
        id: product.shopifyVariantId,
        title: 'Default',
        price: '0.00',
        sku: '',
        inventoryQuantity: 0,
      }];
    }

    return [{
      id: `variant-${product.id}`,
      title: 'Default',
      price: '0.00',
      sku: '',
      inventoryQuantity: 0,
    }];
  }

  /**
   * Extract image data from product record
   */
  private extractImages(product: any): any[] {
    if (product.currentImageUrl) {
      return [{
        id: `img-${product.id}`,
        src: product.currentImageUrl,
        altText: product.currentImageAlt || product.title,
        position: 1,
      }];
    }

    return [];
  }

  /**
   * GET /api/products
   *
   * Returns products matching the frontend Product[] type.
   * Supports optional query params: search, limit, offset, organizationId
   */
  @Get()
  async getProducts(
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('organizationId') organizationId?: string,
  ) {
    const resolvedOrgId = await this.resolveOrganizationId(organizationId);
    const take = limit ? parseInt(limit, 10) : 50;
    const skip = offset ? parseInt(offset, 10) : 0;

    const whereClause: any = {};

    if (resolvedOrgId) {
      whereClause.organizationId = resolvedOrgId;
    }

    if (search) {
      whereClause.title = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const products = await this.prisma.product.findMany({
      where: whereClause,
      take,
      skip,
      orderBy: { updatedAt: 'desc' },
    });

    if (products.length === 0) {
      return {
        products: [],
        total: 0,
        message:
          'No products synced yet. Click "Sync Products" to import from your Shopify store.',
      };
    }

    return products.map((p) => this.mapProductToFrontend(p));
  }

  /**
   * GET /api/products/:id
   *
   * Returns a single product by ID.
   */
  @Get(':id')
  async getProduct(@Param('id') id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
    }

    return this.mapProductToFrontend(product);
  }

  /**
   * POST /api/products/sync
   *
   * Syncs products from Shopify store.
   */
  @Post('sync')
  async syncProducts(@Body() body: { organizationId?: string; forceFullSync?: boolean }) {
    let organizationId = body.organizationId;

    if (!organizationId) {
      const organization = await this.prisma.organization.findFirst({
        where: { isActive: true },
        select: { id: true, shopifyDomain: true },
      });

      if (!organization) {
        throw new HttpException(
          {
            success: false,
            message: 'No active organization found. Please connect your Shopify store first.',
          },
          HttpStatus.BAD_REQUEST
        );
      }

      organizationId = organization.id;
      console.log('[ProductsController] Using organization:', organizationId, organization.shopifyDomain);
    }

    console.log('[ProductsController] Starting product sync for organization:', organizationId);

    try {
      const result = await this.shopifyService.syncProducts(organizationId);

      return {
        success: true,
        message: `Successfully synced ${result.synced} products`,
        synced: result.synced,
        syncedCount: result.synced,
        newCount: result.synced,
        updatedCount: 0,
        errors: result.errors,
      };
    } catch (error: any) {
      console.error('[ProductsController] Product sync failed:', error);
      throw new HttpException(
        {
          success: false,
          message: 'Product sync failed',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
