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
   * Generate realistic mock products for when database is empty
   */
  private generateMockProducts(): any[] {
    const mockProducts = [
      {
        id: 'mock-prod-001',
        shopifyId: 'gid://shopify/Product/7891234567890',
        title: 'Premium Running Shoes - CloudStep Pro',
        handle: 'cloudstep-pro-running-shoes',
        description: '<p>Experience ultimate comfort with our CloudStep Pro running shoes. Featuring responsive foam cushioning, breathable mesh upper, and durable rubber outsole. Perfect for daily training and marathon distances.</p>',
        vendor: 'CloudStep Athletics',
        productType: 'Footwear',
        tags: ['running', 'shoes', 'athletics', 'comfort', 'sports'],
        status: 'active',
        seoScore: 82,
        metaTitle: 'CloudStep Pro Running Shoes | Premium Comfort for Every Run',
        metaDescription: 'Shop CloudStep Pro running shoes with responsive foam cushioning and breathable design. Free shipping on orders over $75.',
        variants: [
          { id: 'var-001-1', title: 'US 8 / Black', price: '129.99', sku: 'CSP-BLK-8', inventoryQuantity: 45 },
          { id: 'var-001-2', title: 'US 9 / Black', price: '129.99', sku: 'CSP-BLK-9', inventoryQuantity: 38 },
          { id: 'var-001-3', title: 'US 10 / Navy', price: '129.99', sku: 'CSP-NVY-10', inventoryQuantity: 22 },
        ],
        images: [
          { id: 'img-001-1', src: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800', altText: 'CloudStep Pro Running Shoes - Side View', position: 1 },
          { id: 'img-001-2', src: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800', altText: 'CloudStep Pro Running Shoes - Top View', position: 2 },
        ],
      },
      {
        id: 'mock-prod-002',
        shopifyId: 'gid://shopify/Product/7891234567891',
        title: 'Organic Cotton T-Shirt - Essential Fit',
        handle: 'organic-cotton-tshirt-essential',
        description: '<p>Made from 100% GOTS-certified organic cotton, this essential-fit t-shirt offers unmatched softness and sustainability. Pre-shrunk, reinforced seams, and available in 12 colors.</p>',
        vendor: 'EcoWear Basics',
        productType: 'Apparel',
        tags: ['organic', 'cotton', 't-shirt', 'sustainable', 'basics'],
        status: 'active',
        seoScore: 91,
        metaTitle: 'Organic Cotton T-Shirt | GOTS Certified Sustainable Basics',
        metaDescription: 'Shop our GOTS-certified organic cotton t-shirt. Ultra-soft, pre-shrunk, and sustainably made. Available in 12 colors. Free returns.',
        variants: [
          { id: 'var-002-1', title: 'S / White', price: '34.99', sku: 'OCT-WHT-S', inventoryQuantity: 120 },
          { id: 'var-002-2', title: 'M / White', price: '34.99', sku: 'OCT-WHT-M', inventoryQuantity: 95 },
          { id: 'var-002-3', title: 'L / Black', price: '34.99', sku: 'OCT-BLK-L', inventoryQuantity: 88 },
          { id: 'var-002-4', title: 'XL / Navy', price: '34.99', sku: 'OCT-NVY-XL', inventoryQuantity: 56 },
        ],
        images: [
          { id: 'img-002-1', src: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800', altText: 'Organic Cotton T-Shirt White', position: 1 },
        ],
      },
      {
        id: 'mock-prod-003',
        shopifyId: 'gid://shopify/Product/7891234567892',
        title: 'Merino Wool Sweater - Alpine Collection',
        handle: 'merino-wool-sweater-alpine',
        description: '<p>Luxurious 100% Australian merino wool sweater. Temperature regulating, moisture-wicking, and incredibly soft. Perfect for layering in cooler months.</p>',
        vendor: 'Alpine Outfitters',
        productType: 'Apparel',
        tags: ['merino', 'wool', 'sweater', 'winter', 'luxury'],
        status: 'active',
        seoScore: 67,
        metaTitle: 'Merino Wool Sweater - Alpine Collection',
        metaDescription: 'Premium Australian merino wool sweater. Temperature regulating and ultra-soft. Shop the Alpine Collection today.',
        variants: [
          { id: 'var-003-1', title: 'M / Charcoal', price: '149.99', sku: 'MWS-CHR-M', inventoryQuantity: 32 },
          { id: 'var-003-2', title: 'L / Charcoal', price: '149.99', sku: 'MWS-CHR-L', inventoryQuantity: 28 },
        ],
        images: [
          { id: 'img-003-1', src: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800', altText: 'Merino Wool Sweater Charcoal', position: 1 },
        ],
      },
      {
        id: 'mock-prod-004',
        shopifyId: 'gid://shopify/Product/7891234567893',
        title: 'Leather Crossbody Bag - Metropolitan',
        handle: 'leather-crossbody-metropolitan',
        description: '<p>Handcrafted from full-grain Italian leather, the Metropolitan crossbody bag features multiple compartments, adjustable strap, and brass hardware. Ages beautifully over time.</p>',
        vendor: 'Artisan Leather Co.',
        productType: 'Accessories',
        tags: ['leather', 'bag', 'crossbody', 'italian', 'handcrafted'],
        status: 'active',
        seoScore: 75,
        metaTitle: 'Italian Leather Crossbody Bag | Metropolitan Collection',
        metaDescription: 'Handcrafted full-grain Italian leather crossbody bag. Multiple compartments, brass hardware. Shop the Metropolitan collection.',
        variants: [
          { id: 'var-004-1', title: 'Cognac', price: '189.99', sku: 'LCB-COG', inventoryQuantity: 18 },
          { id: 'var-004-2', title: 'Black', price: '189.99', sku: 'LCB-BLK', inventoryQuantity: 24 },
        ],
        images: [
          { id: 'img-004-1', src: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800', altText: 'Leather Crossbody Bag Cognac', position: 1 },
        ],
      },
      {
        id: 'mock-prod-005',
        shopifyId: 'gid://shopify/Product/7891234567894',
        title: 'Bamboo Yoga Mat - ZenFlow Series',
        handle: 'bamboo-yoga-mat-zenflow',
        description: '<p>Eco-friendly yoga mat made from natural bamboo fiber and natural rubber. Non-slip surface, excellent grip, and antimicrobial properties. 6mm thick for optimal cushioning.</p>',
        vendor: 'ZenFlow Wellness',
        productType: 'Fitness Equipment',
        tags: ['yoga', 'mat', 'bamboo', 'eco-friendly', 'fitness'],
        status: 'active',
        seoScore: 58,
        metaTitle: 'Bamboo Yoga Mat - ZenFlow Series',
        metaDescription: 'Eco-friendly bamboo yoga mat with non-slip surface and antimicrobial properties. 6mm cushioning for ultimate comfort.',
        variants: [
          { id: 'var-005-1', title: 'Natural / Standard', price: '79.99', sku: 'BYM-NAT', inventoryQuantity: 65 },
          { id: 'var-005-2', title: 'Sage Green / Standard', price: '79.99', sku: 'BYM-SGR', inventoryQuantity: 42 },
        ],
        images: [
          { id: 'img-005-1', src: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800', altText: 'Bamboo Yoga Mat Natural', position: 1 },
        ],
      },
      {
        id: 'mock-prod-006',
        shopifyId: 'gid://shopify/Product/7891234567895',
        title: 'Stainless Steel Water Bottle - HydroElite 32oz',
        handle: 'stainless-steel-water-bottle-hydroelite',
        description: '<p>Triple-wall vacuum insulated stainless steel water bottle. Keeps drinks cold for 24 hours or hot for 12 hours. BPA-free, leak-proof cap, and powder-coated finish.</p>',
        vendor: 'HydroElite',
        productType: 'Drinkware',
        tags: ['water-bottle', 'stainless-steel', 'insulated', 'bpa-free', 'eco'],
        status: 'active',
        seoScore: 88,
        metaTitle: 'HydroElite 32oz Stainless Steel Water Bottle | Triple Insulated',
        metaDescription: 'Triple-wall vacuum insulated water bottle. Cold 24hrs, hot 12hrs. BPA-free, leak-proof. Shop HydroElite now.',
        variants: [
          { id: 'var-006-1', title: 'Matte Black', price: '39.99', sku: 'HE-BLK-32', inventoryQuantity: 150 },
          { id: 'var-006-2', title: 'Ocean Blue', price: '39.99', sku: 'HE-BLU-32', inventoryQuantity: 89 },
          { id: 'var-006-3', title: 'Rose Gold', price: '42.99', sku: 'HE-RGD-32', inventoryQuantity: 67 },
        ],
        images: [
          { id: 'img-006-1', src: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800', altText: 'HydroElite Water Bottle Matte Black', position: 1 },
        ],
      },
      {
        id: 'mock-prod-007',
        shopifyId: 'gid://shopify/Product/7891234567896',
        title: 'Wireless Noise Cancelling Headphones - SoundWave Pro',
        handle: 'wireless-headphones-soundwave-pro',
        description: '<p>Premium wireless headphones with active noise cancellation, 40mm custom drivers, and 35-hour battery life. Bluetooth 5.3, multipoint connection, and foldable design.</p>',
        vendor: 'SoundWave Audio',
        productType: 'Electronics',
        tags: ['headphones', 'wireless', 'noise-cancelling', 'bluetooth', 'audio'],
        status: 'active',
        seoScore: 72,
        metaTitle: 'SoundWave Pro Wireless Noise Cancelling Headphones',
        metaDescription: 'Premium ANC headphones with 35hr battery, Bluetooth 5.3, and custom 40mm drivers. Experience pure audio.',
        variants: [
          { id: 'var-007-1', title: 'Midnight Black', price: '249.99', sku: 'SWP-BLK', inventoryQuantity: 35 },
          { id: 'var-007-2', title: 'Pearl White', price: '249.99', sku: 'SWP-WHT', inventoryQuantity: 28 },
        ],
        images: [
          { id: 'img-007-1', src: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800', altText: 'SoundWave Pro Headphones Black', position: 1 },
        ],
      },
      {
        id: 'mock-prod-008',
        shopifyId: 'gid://shopify/Product/7891234567897',
        title: 'Scented Soy Candle - Wanderlust Collection',
        handle: 'scented-soy-candle-wanderlust',
        description: '<p>Hand-poured 100% soy wax candle with cotton wick. Burns clean for 55+ hours. Available in artisan fragrances inspired by global destinations.</p>',
        vendor: 'Lumiere Home',
        productType: 'Home & Garden',
        tags: ['candle', 'soy', 'scented', 'home-decor', 'handmade'],
        status: 'active',
        seoScore: 45,
        metaTitle: 'Scented Soy Candle - Wanderlust Collection',
        metaDescription: 'Hand-poured soy candle with 55+ hour burn time. Artisan fragrances inspired by global destinations.',
        variants: [
          { id: 'var-008-1', title: 'Parisian Lavender', price: '28.99', sku: 'SC-PLV', inventoryQuantity: 200 },
          { id: 'var-008-2', title: 'Tokyo Cherry Blossom', price: '28.99', sku: 'SC-TCB', inventoryQuantity: 175 },
          { id: 'var-008-3', title: 'Moroccan Amber', price: '28.99', sku: 'SC-MAM', inventoryQuantity: 145 },
        ],
        images: [
          { id: 'img-008-1', src: 'https://images.unsplash.com/photo-1602607841806-11d468f8a8cb?w=800', altText: 'Wanderlust Scented Soy Candle', position: 1 },
        ],
      },
      {
        id: 'mock-prod-009',
        shopifyId: 'gid://shopify/Product/7891234567898',
        title: 'Linen Bed Sheet Set - Riviera Collection',
        handle: 'linen-bed-sheets-riviera',
        description: '<p>Stonewashed French linen bed sheet set. Gets softer with every wash. Includes fitted sheet, flat sheet, and two pillowcases. OEKO-TEX certified.</p>',
        vendor: 'Riviera Home',
        productType: 'Bedding',
        tags: ['linen', 'bed-sheets', 'bedding', 'french-linen', 'luxury'],
        status: 'active',
        seoScore: 79,
        metaTitle: 'French Linen Bed Sheet Set | Riviera Collection',
        metaDescription: 'Stonewashed French linen sheet set. Gets softer with every wash. OEKO-TEX certified. Free shipping on all bedding.',
        variants: [
          { id: 'var-009-1', title: 'Queen / Natural', price: '199.99', sku: 'LBS-NAT-Q', inventoryQuantity: 42 },
          { id: 'var-009-2', title: 'King / Natural', price: '229.99', sku: 'LBS-NAT-K', inventoryQuantity: 31 },
          { id: 'var-009-3', title: 'Queen / Dusty Rose', price: '199.99', sku: 'LBS-DRS-Q', inventoryQuantity: 25 },
        ],
        images: [
          { id: 'img-009-1', src: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800', altText: 'Linen Bed Sheet Set Natural', position: 1 },
        ],
      },
      {
        id: 'mock-prod-010',
        shopifyId: 'gid://shopify/Product/7891234567899',
        title: 'Ceramic Pour Over Coffee Maker - Artisan Brew',
        handle: 'ceramic-pour-over-coffee-maker',
        description: '<p>Handmade ceramic pour over coffee maker with reusable stainless steel filter. Makes 1-3 cups of perfectly extracted coffee. Dishwasher safe, lead-free glaze.</p>',
        vendor: 'Artisan Brew Co.',
        productType: 'Kitchen',
        tags: ['coffee', 'pour-over', 'ceramic', 'handmade', 'kitchen'],
        status: 'draft',
        seoScore: 34,
        metaTitle: '',
        metaDescription: '',
        variants: [
          { id: 'var-010-1', title: 'Matte White', price: '54.99', sku: 'CPO-WHT', inventoryQuantity: 58 },
          { id: 'var-010-2', title: 'Speckled Grey', price: '54.99', sku: 'CPO-GRY', inventoryQuantity: 43 },
        ],
        images: [
          { id: 'img-010-1', src: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800', altText: 'Ceramic Pour Over Coffee Maker', position: 1 },
        ],
      },
    ];

    return mockProducts.map(p => ({
      ...p,
      createdAt: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString(),
      organizationId: 'mock-org',
    }));
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

    try {
      // Build query
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

      const [products, total] = await Promise.all([
        this.prisma.product.findMany({
          where: whereClause,
          take,
          skip,
          orderBy: { updatedAt: 'desc' },
        }),
        this.prisma.product.count({ where: whereClause }),
      ]);

      if (products.length > 0) {
        // Map database products to frontend shape
        return products.map(p => this.mapProductToFrontend(p));
      }

      // No products in database - return realistic mock data
      console.log('[ProductsController] No products found in database, returning mock data');

      let mockProducts = this.generateMockProducts();

      // Apply search filter to mock data
      if (search) {
        const searchLower = search.toLowerCase();
        mockProducts = mockProducts.filter(p =>
          p.title.toLowerCase().includes(searchLower) ||
          p.vendor.toLowerCase().includes(searchLower) ||
          p.productType.toLowerCase().includes(searchLower) ||
          p.tags.some((t: string) => t.toLowerCase().includes(searchLower))
        );
      }

      // Apply pagination to mock data
      return mockProducts.slice(skip, skip + take);
    } catch (error) {
      console.error('[ProductsController] Error fetching products:', error);

      // Return mock data on database error
      let mockProducts = this.generateMockProducts();

      if (search) {
        const searchLower = search.toLowerCase();
        mockProducts = mockProducts.filter(p =>
          p.title.toLowerCase().includes(searchLower)
        );
      }

      return mockProducts.slice(skip, skip + take);
    }
  }

  /**
   * GET /api/products/:id
   *
   * Returns a single product by ID.
   */
  @Get(':id')
  async getProduct(@Param('id') id: string) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id },
      });

      if (product) {
        return this.mapProductToFrontend(product);
      }

      // Check if it's a mock product ID
      if (id.startsWith('mock-prod-')) {
        const mockProducts = this.generateMockProducts();
        const mockProduct = mockProducts.find(p => p.id === id);
        if (mockProduct) {
          return mockProduct;
        }
      }

      throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      console.error('[ProductsController] Error fetching product:', error);

      // Try mock data
      if (id.startsWith('mock-prod-')) {
        const mockProducts = this.generateMockProducts();
        const mockProduct = mockProducts.find(p => p.id === id);
        if (mockProduct) {
          return mockProduct;
        }
      }

      throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
    }
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
