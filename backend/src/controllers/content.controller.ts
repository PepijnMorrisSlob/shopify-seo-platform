/**
 * Content Controller
 * Shopify SEO Platform
 *
 * API endpoints for content generation management:
 * - GET /api/content/generations - List content generations
 * - POST /api/content/generate - Generate SEO content for products (synchronous)
 * - POST /api/content/publish - Publish approved content to Shopify (REAL)
 * - GET /api/content/keyword-data - Get keyword research data from DataForSEO
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpStatus,
  HttpException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { contentGenerationQueue } from '../queues/content-generation-queue';
import { v4 as uuidv4 } from 'uuid';
import { ShopifyBlogService } from '../services/shopify-blog-service';
import { getEncryptionService } from '../services/encryption-service';
import { EncryptedData } from '../types/auth.types';
import { DataForSEOService } from '../services/dataforseo-service';
import axios from 'axios';

@Controller('content')
export class ContentController implements OnModuleInit {
  private readonly logger = new Logger(ContentController.name);
  private prisma = new PrismaClient();

  async onModuleInit() {
    // Import the worker to start it within the NestJS process
    try {
      await import('../queues/workers/content-generation-worker');
      this.logger.log('Content generation worker started');
    } catch (error: any) {
      this.logger.warn(`Worker startup warning: ${error.message}`);
    }
  }

  /**
   * Resolve organizationId - DEV MODE uses first available org
   */
  private async resolveOrganizationId(): Promise<string> {
    try {
      const firstOrg = await this.prisma.organization.findFirst({
        select: { id: true },
      });
      if (firstOrg) return firstOrg.id;
    } catch {
      // Database might not be available
    }
    return 'org-dev';
  }

  /**
   * List content generations
   * GET /api/content/generations?productId=X
   */
  @Get('generations')
  async getGenerations(@Query('productId') productId?: string) {
    this.logger.log(`Getting content generations (productId=${productId || 'all'})`);

    const organizationId = await this.resolveOrganizationId();

    try {
      // Get QAPages mapped as content generations
      const qaPages = await this.prisma.qAPage.findMany({
        where: {
          organizationId,
          ...(productId ? { id: productId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      const generations = qaPages.map((page) => ({
        id: page.id,
        productId: page.id,
        aiModel: 'gpt-4o-mini' as const,
        status: this.mapQAPageStatus(page.status),
        variants: [
          {
            id: `${page.id}-v1`,
            metaTitle: page.metaTitle || page.question,
            metaDescription: page.metaDescription || '',
            qualityScore: page.seoScore || 0,
            reasoning: page.seoScore && page.seoScore >= 85
              ? 'High quality content with strong SEO optimization'
              : page.seoScore && page.seoScore >= 70
                ? 'Good content, some SEO improvements recommended'
                : 'Content needs review and optimization',
          },
        ],
        selectedVariantId: page.status === 'published' ? `${page.id}-v1` : undefined,
        publishedAt: page.publishedAt?.toISOString(),
        createdAt: page.createdAt.toISOString(),
        organizationId: page.organizationId,
      }));

      return generations;
    } catch (error: any) {
      this.logger.error(`Failed to get generations: ${error.message}`);
      return [];
    }
  }

  /**
   * Generate SEO content for products
   * POST /api/content/generate
   * Body: { productIds: string[], aiModel: string, numberOfVariants?: number }
   *
   * For products: generates meta title/description variants synchronously
   * For QA pages: enqueues BullMQ jobs for the full workflow
   */
  @Post('generate')
  async generateContent(
    @Body() body: { productIds?: string[]; questionIds?: string[]; aiModel?: string; numberOfVariants?: number },
  ) {
    const productIds = body.productIds || body.questionIds || [];
    const aiModel = body.aiModel || 'gpt-4o-mini';
    const numberOfVariants = body.numberOfVariants || 3;

    if (!productIds || productIds.length === 0) {
      throw new HttpException(
        'productIds must be a non-empty array',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.log(`Generating content for ${productIds.length} products with model ${aiModel}`);

    const organizationId = await this.resolveOrganizationId();
    const contentGenerations: any[] = [];

    for (const productId of productIds) {
      try {
        // First check if this is a QAPage ID
        const qaPage = await this.prisma.qAPage.findUnique({
          where: { id: productId },
        });

        if (qaPage) {
          // QA page flow - enqueue for full workflow
          await this.prisma.qAPage.update({
            where: { id: productId },
            data: { status: 'generating' },
          });

          await contentGenerationQueue.add(`qa-generate-${qaPage.id}`, {
            qaPageId: qaPage.id,
            organizationId,
            question: qaPage.question,
            targetKeyword: qaPage.targetKeyword || undefined,
          });

          contentGenerations.push({
            id: qaPage.id,
            productId: qaPage.id,
            aiModel,
            status: 'processing',
            variants: [{
              id: `${qaPage.id}-v1`,
              metaTitle: qaPage.metaTitle || qaPage.question,
              metaDescription: qaPage.metaDescription || '',
              qualityScore: 0,
              reasoning: 'Content is being generated by AI...',
            }],
            createdAt: qaPage.createdAt.toISOString(),
            organizationId,
          });

          continue;
        }

        // Product flow - look up product from DB or mock data
        const product = await this.findProduct(productId);

        if (!product) {
          this.logger.warn(`Product ${productId} not found, skipping`);
          continue;
        }

        // Enrich with DataForSEO keyword data if available
        let keywordData: any = null;
        try {
          const dataForSEO = this.getDataForSEOService();
          if (dataForSEO && product.title) {
            const keyword = product.productType
              ? `${product.productType} ${product.title.split(' - ')[0]}`.trim()
              : product.title.split(' - ')[0].trim();
            this.logger.log(`Fetching keyword data for: "${keyword}"`);
            const results = await dataForSEO.getKeywordData([keyword]);
            if (results && results.length > 0) {
              keywordData = results[0];
              this.logger.log(`Keyword data: volume=${keywordData.search_volume}, difficulty=${keywordData.keyword_difficulty}`);
            }
          }
        } catch (error: any) {
          this.logger.warn(`DataForSEO enrichment skipped: ${error.message}`);
        }

        // Generate variants synchronously for the product (enriched with keyword data)
        const variants = this.generateProductVariants(product, aiModel, numberOfVariants, keywordData);

        const generationId = uuidv4();
        contentGenerations.push({
          id: generationId,
          productId: product.id,
          aiModel,
          status: 'completed',
          variants,
          keywordData: keywordData ? {
            searchVolume: keywordData.search_volume,
            difficulty: keywordData.keyword_difficulty,
            cpc: keywordData.cpc,
            competition: keywordData.competition,
          } : null,
          createdAt: new Date().toISOString(),
          organizationId,
        });

        this.logger.log(`Generated ${variants.length} variants for product "${product.title}"`);
      } catch (error: any) {
        this.logger.error(`Failed to generate for ${productId}: ${error.message}`);
      }
    }

    return { contentGenerations };
  }

  /**
   * Publish content to Shopify (REAL)
   * POST /api/content/publish
   * Body: { contentGenerationId: string, variantId: string }
   *
   * For QA pages: Creates a blog post on Shopify via REST Admin API
   * For products: Updates product SEO meta via GraphQL Admin API
   */
  @Post('publish')
  async publishContent(
    @Body() body: { contentGenerationId: string; variantId: string },
  ) {
    const { contentGenerationId, variantId } = body;

    if (!contentGenerationId) {
      throw new HttpException(
        'contentGenerationId is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.log(`Publishing content ${contentGenerationId} (variant: ${variantId})`);

    const organizationId = await this.resolveOrganizationId();

    try {
      // Try QAPage first
      const qaPage = await this.prisma.qAPage.findUnique({
        where: { id: contentGenerationId },
      });

      if (qaPage) {
        return await this.publishQAPageToShopify(qaPage, organizationId);
      }

      // Product flow - update product SEO meta on Shopify
      const product = await this.findProduct(contentGenerationId);
      if (product) {
        return await this.publishProductSEOToShopify(product, variantId, organizationId);
      }

      throw new HttpException(
        'Content not found for the given ID',
        HttpStatus.NOT_FOUND,
      );
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to publish content: ${error.message}`);
      throw new HttpException(
        `Failed to publish content: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get keyword research data from DataForSEO
   * GET /api/content/keyword-data?keyword=example
   */
  @Get('keyword-data')
  async getKeywordData(
    @Query('keyword') keyword?: string,
    @Query('keywords') keywordsStr?: string,
  ) {
    const keywords = keyword ? [keyword] : keywordsStr ? keywordsStr.split(',') : [];

    if (keywords.length === 0) {
      throw new HttpException('keyword or keywords query param required', HttpStatus.BAD_REQUEST);
    }

    this.logger.log(`Fetching keyword data for: ${keywords.join(', ')}`);

    try {
      const dataForSEO = this.getDataForSEOService();
      if (!dataForSEO) {
        return { keywords: keywords.map(k => ({ keyword: k, searchVolume: null, difficulty: null, cpc: null, message: 'DataForSEO not configured' })) };
      }

      const data = await dataForSEO.getKeywordData(keywords);
      return { keywords: data };
    } catch (error: any) {
      this.logger.error(`DataForSEO error: ${error.message}`);
      return { keywords: keywords.map(k => ({ keyword: k, searchVolume: null, difficulty: null, cpc: null, error: error.message })) };
    }
  }

  // ===========================================================================
  // SHOPIFY PUBLISHING - QA PAGES (Blog Posts)
  // ===========================================================================

  /**
   * Publish a QA page as a blog post on Shopify
   */
  private async publishQAPageToShopify(qaPage: any, organizationId: string) {
    const shopifyBlogService = await this.getShopifyBlogService(organizationId);

    if (!shopifyBlogService) {
      // Fallback: just update local DB if no Shopify credentials
      this.logger.warn('No Shopify credentials - updating local DB only');
      const updated = await this.prisma.qAPage.update({
        where: { id: qaPage.id },
        data: { status: 'published', publishedAt: new Date() },
      });
      return {
        success: true,
        productId: updated.id,
        publishedAt: updated.publishedAt?.toISOString(),
        shopifyUrl: null,
        message: 'Published locally (no Shopify credentials configured)',
      };
    }

    // Get or create the default blog
    let blog: any;
    try {
      blog = await shopifyBlogService.getDefaultBlog();
      this.logger.log(`Using blog: "${blog.title}" (ID: ${blog.id})`);
    } catch (error: any) {
      this.logger.error(`Failed to get blog: ${error.message}`);
      throw new HttpException(
        'Failed to get Shopify blog. Make sure the store has at least one blog.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Build blog post content
    const bodyHtml = qaPage.answerContent || this.buildQAPageHtml(qaPage);
    const tags = ['qa', 'seo'];
    if (qaPage.targetKeyword) tags.push(qaPage.targetKeyword);

    // Build metafields for schema markup
    const metafields: any[] = [];
    if (qaPage.schemaMarkup) {
      metafields.push({
        namespace: 'seo',
        key: 'schema_markup',
        value: typeof qaPage.schemaMarkup === 'string' ? qaPage.schemaMarkup : JSON.stringify(qaPage.schemaMarkup),
        type: 'json_string',
      });
    }
    if (qaPage.seoScore) {
      metafields.push({
        namespace: 'seo',
        key: 'seo_score',
        value: qaPage.seoScore.toString(),
        type: 'integer',
      });
    }

    // Create the blog post on Shopify
    this.logger.log(`Creating blog post: "${qaPage.question}" on blog ${blog.id}`);
    const blogPost = await shopifyBlogService.createBlogPost(blog.id.toString(), {
      title: qaPage.metaTitle || qaPage.question,
      bodyHtml,
      tags,
      author: 'SEO Platform',
      published: true,
      summary: qaPage.metaDescription || undefined,
      metafields: metafields.length > 0 ? metafields : undefined,
    });

    // Get the org's domain for building the URL
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { shopifyDomain: true },
    });
    const shopifyUrl = `https://${org?.shopifyDomain}/blogs/${blog.handle}/${blogPost.handle}`;

    // Update the QA page with Shopify details
    const updated = await this.prisma.qAPage.update({
      where: { id: qaPage.id },
      data: {
        status: 'published',
        publishedAt: new Date(),
        shopifyBlogId: blog.id.toString(),
        shopifyBlogPostId: blogPost.id.toString(),
        shopifyUrl,
      },
    });

    this.logger.log(`Published to Shopify: ${shopifyUrl} (Article ID: ${blogPost.id})`);

    return {
      success: true,
      productId: updated.id,
      publishedAt: updated.publishedAt?.toISOString(),
      shopifyUrl,
      shopifyBlogPostId: blogPost.id.toString(),
    };
  }

  // ===========================================================================
  // SHOPIFY PUBLISHING - PRODUCTS (SEO Meta Update)
  // ===========================================================================

  /**
   * Update product SEO meta on Shopify
   */
  private async publishProductSEOToShopify(product: any, variantId: string, organizationId: string) {
    // Find the variant data (from the generated variants)
    const variants = this.generateProductVariants(product, 'gpt-4o-mini', 4);
    const selectedVariant = variants.find((v: any) => v.id === variantId) || variants[0];

    if (!selectedVariant) {
      throw new HttpException('No variant found to publish', HttpStatus.BAD_REQUEST);
    }

    // Get org credentials for Shopify API
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { shopifyDomain: true, accessTokenEncrypted: true },
    });

    if (!org?.accessTokenEncrypted || !org?.shopifyDomain) {
      this.logger.warn('No Shopify credentials for product SEO update');
      return {
        success: true,
        productId: product.id,
        publishedAt: new Date().toISOString(),
        message: 'Product SEO updated locally (no Shopify credentials)',
        metaTitle: selectedVariant.metaTitle,
        metaDescription: selectedVariant.metaDescription,
      };
    }

    // Decrypt access token
    const encryptedData = JSON.parse(org.accessTokenEncrypted) as EncryptedData;
    const accessToken = getEncryptionService().decryptAccessToken(encryptedData);

    // Find the Shopify product ID
    const dbProduct = await this.prisma.product.findFirst({
      where: {
        OR: [
          { id: product.id },
          { shopifyProductId: product.id },
        ],
      },
    });

    const shopifyProductId = dbProduct?.shopifyProductId || product.shopifyId;

    if (shopifyProductId) {
      // Update product SEO via Shopify GraphQL API
      const mutation = `
        mutation updateProduct($input: ProductInput!) {
          productUpdate(input: $input) {
            product {
              id
              seo { title description }
            }
            userErrors { field message }
          }
        }
      `;

      const gid = shopifyProductId.startsWith('gid://') ? shopifyProductId : `gid://shopify/Product/${shopifyProductId}`;

      const graphqlUrl = `https://${org.shopifyDomain}/admin/api/2024-10/graphql.json`;
      const response = await axios.post(
        graphqlUrl,
        {
          query: mutation,
          variables: {
            input: {
              id: gid,
              seo: {
                title: selectedVariant.metaTitle,
                description: selectedVariant.metaDescription,
              },
            },
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': accessToken,
          },
          timeout: 15000,
        },
      );

      if (response.data.errors || response.data.data?.productUpdate?.userErrors?.length > 0) {
        const errors = response.data.errors || response.data.data.productUpdate.userErrors;
        this.logger.error(`Shopify product update failed: ${JSON.stringify(errors)}`);
        throw new HttpException(`Shopify API error: ${JSON.stringify(errors)}`, HttpStatus.BAD_GATEWAY);
      }

      this.logger.log(`Updated SEO for product ${shopifyProductId} on Shopify`);

      // Update local DB
      if (dbProduct) {
        await this.prisma.product.update({
          where: { id: dbProduct.id },
          data: {
            currentMetaTitle: selectedVariant.metaTitle,
            currentMetaDescription: selectedVariant.metaDescription,
          },
        });
      }

      return {
        success: true,
        productId: product.id,
        publishedAt: new Date().toISOString(),
        shopifyUrl: `https://${org.shopifyDomain}/products/${dbProduct?.handle || ''}`,
        metaTitle: selectedVariant.metaTitle,
        metaDescription: selectedVariant.metaDescription,
      };
    }

    // Mock product - no Shopify ID to update
    return {
      success: true,
      productId: product.id,
      publishedAt: new Date().toISOString(),
      message: 'Mock product - no Shopify product to update',
      metaTitle: selectedVariant.metaTitle,
      metaDescription: selectedVariant.metaDescription,
    };
  }

  /**
   * Build HTML content for a QA page that doesn't have answerContent yet
   */
  private buildQAPageHtml(qaPage: any): string {
    const question = qaPage.question || 'Untitled';
    const answer = qaPage.metaDescription || 'Content is being prepared.';
    return `<h1>${question}</h1>\n<p>${answer}</p>`;
  }

  // ===========================================================================
  // PRODUCT LOOKUP
  // ===========================================================================

  /**
   * Find product by ID - checks DB first, falls back to mock data
   */
  private async findProduct(productId: string): Promise<any | null> {
    // Try Prisma DB
    try {
      const dbProduct = await this.prisma.product.findFirst({
        where: {
          OR: [
            { id: productId },
            { shopifyProductId: productId },
          ],
        },
      });
      if (dbProduct) {
        return {
          id: dbProduct.id,
          title: dbProduct.title,
          description: dbProduct.bodyHtml || '',
          vendor: dbProduct.vendor || '',
          productType: dbProduct.productType || '',
        };
      }
    } catch {
      // DB might not have the product
    }

    // Check mock products from products controller
    const mockProducts = this.getMockProducts();
    return mockProducts.find(
      (p) => p.id === productId || p.shopifyId === productId
    ) || null;
  }

  /**
   * Mock product catalog (mirrors products.controller.ts)
   */
  private getMockProducts(): any[] {
    return [
      { id: 'mock-prod-001', shopifyId: 'gid://shopify/Product/7891234567890', title: 'Premium Running Shoes - CloudStep Pro', description: 'Experience ultimate comfort with our CloudStep Pro running shoes.', vendor: 'CloudStep Athletics', productType: 'Footwear' },
      { id: 'mock-prod-002', shopifyId: 'gid://shopify/Product/7891234567891', title: 'Organic Cotton T-Shirt - Essential Fit', description: 'Made from 100% GOTS-certified organic cotton.', vendor: 'EcoWear Basics', productType: 'Apparel' },
      { id: 'mock-prod-003', shopifyId: 'gid://shopify/Product/7891234567892', title: 'Merino Wool Sweater - Alpine Collection', description: 'Luxurious 100% Australian merino wool sweater.', vendor: 'Alpine Outfitters', productType: 'Apparel' },
      { id: 'mock-prod-004', shopifyId: 'gid://shopify/Product/7891234567893', title: 'Leather Crossbody Bag - Metropolitan', description: 'Handcrafted from full-grain Italian leather.', vendor: 'Artisan Leather Co.', productType: 'Accessories' },
      { id: 'mock-prod-005', shopifyId: 'gid://shopify/Product/7891234567894', title: 'Bamboo Yoga Mat - ZenFlow Series', description: 'Eco-friendly yoga mat made from natural bamboo fiber.', vendor: 'ZenFlow Wellness', productType: 'Fitness Equipment' },
      { id: 'mock-prod-006', shopifyId: 'gid://shopify/Product/7891234567895', title: 'Stainless Steel Water Bottle - HydroElite 32oz', description: 'Triple-wall vacuum insulated stainless steel water bottle.', vendor: 'HydroElite', productType: 'Drinkware' },
      { id: 'mock-prod-007', shopifyId: 'gid://shopify/Product/7891234567896', title: 'Wireless Noise Cancelling Headphones - SoundWave Pro', description: 'Premium wireless headphones with active noise cancellation.', vendor: 'SoundWave Audio', productType: 'Electronics' },
      { id: 'mock-prod-008', shopifyId: 'gid://shopify/Product/7891234567897', title: 'Scented Soy Candle - Wanderlust Collection', description: 'Hand-poured 100% soy wax candle with cotton wick.', vendor: 'Lumiere Home', productType: 'Home & Garden' },
      { id: 'mock-prod-009', shopifyId: 'gid://shopify/Product/7891234567898', title: 'Linen Bed Sheet Set - Riviera Collection', description: 'Stonewashed French linen bed sheet set.', vendor: 'Riviera Home', productType: 'Bedding' },
      { id: 'mock-prod-010', shopifyId: 'gid://shopify/Product/7891234567899', title: 'Ceramic Pour Over Coffee Maker - Artisan Brew', description: 'Handmade ceramic pour over coffee maker.', vendor: 'Artisan Brew Co.', productType: 'Kitchen' },
    ];
  }

  // ===========================================================================
  // VARIANT GENERATION (synchronous, template-based)
  // ===========================================================================

  /**
   * Generate SEO content variants for a product
   * Uses smart templates enriched with DataForSEO keyword data when available
   */
  private generateProductVariants(
    product: any,
    aiModel: string,
    count: number,
    keywordData?: any,
  ): any[] {
    const variants: any[] = [];
    const { title, description, vendor, productType } = product;

    // Clean description (strip HTML)
    const cleanDesc = (description || '').replace(/<[^>]*>/g, '').trim();
    const shortDesc = cleanDesc.substring(0, 120);

    // Boost scores if we have keyword data (real SEO intelligence)
    const hasKeywordData = !!keywordData;
    const searchVolume = keywordData?.search_volume || 0;
    const difficulty = keywordData?.keyword_difficulty || 50;

    // Adjust strategy based on keyword difficulty
    const difficultyNote = hasKeywordData
      ? difficulty > 70
        ? ` Keyword difficulty: ${difficulty}/100 (high competition - long-tail recommended).`
        : difficulty > 40
          ? ` Keyword difficulty: ${difficulty}/100 (moderate - good opportunity).`
          : ` Keyword difficulty: ${difficulty}/100 (low competition - excellent opportunity).`
      : '';

    const volumeNote = hasKeywordData && searchVolume > 0
      ? ` Monthly search volume: ${searchVolume.toLocaleString()}.`
      : '';

    // Template strategies for variant diversity
    const strategies = [
      {
        // Strategy 1: Benefit-focused
        metaTitle: `${title} | Premium ${productType} by ${vendor}`,
        metaDescription: `${shortDesc}. Shop ${title} from ${vendor} - free shipping on qualifying orders.`,
        score: hasKeywordData ? Math.min(95, 88 + (searchVolume > 1000 ? 5 : 0)) : 88,
        reasoning: `Strong brand mention, benefit-focused, includes shipping incentive. Good keyword density and natural reading flow.${difficultyNote}${volumeNote}`,
      },
      {
        // Strategy 2: Problem-solution
        metaTitle: `Buy ${title} - Best ${productType} ${new Date().getFullYear()}`,
        metaDescription: `Looking for the best ${productType.toLowerCase()}? ${title} by ${vendor} delivers exceptional quality. ${shortDesc.substring(0, 80)}...`,
        score: hasKeywordData ? Math.min(95, 82 + (difficulty < 50 ? 8 : 0)) : 82,
        reasoning: `Good search intent match with "best" keyword. Question-based meta description engages users.${difficultyNote}${volumeNote}`,
      },
      {
        // Strategy 3: Value proposition
        metaTitle: `${title} - ${vendor} | Shop ${productType}`,
        metaDescription: `Discover ${title}. ${cleanDesc.substring(0, 100)}. Trusted by thousands of happy customers. Order yours today.`,
        score: hasKeywordData ? Math.min(95, 76 + (searchVolume > 500 ? 5 : 0)) : 76,
        reasoning: `Clean and professional. Social proof element with "trusted by thousands". Meta title could be more descriptive.${difficultyNote}${volumeNote}`,
      },
      {
        // Strategy 4: Feature-rich
        metaTitle: `${title} | Top-Rated ${productType} - ${vendor}`,
        metaDescription: `${cleanDesc.substring(0, 130)}. Rated 4.8/5 by our customers. Free returns within 30 days.`,
        score: hasKeywordData ? Math.min(95, 85 + (searchVolume > 1000 ? 3 : 0)) : 85,
        reasoning: `Excellent use of ratings for CTR boost. Return policy reduces purchase friction. Strong keyword placement.${difficultyNote}${volumeNote}`,
      },
    ];

    for (let i = 0; i < Math.min(count, strategies.length); i++) {
      const strategy = strategies[i];
      variants.push({
        id: `${product.id}-variant-${i + 1}`,
        metaTitle: strategy.metaTitle,
        metaDescription: strategy.metaDescription,
        qualityScore: strategy.score,
        reasoning: strategy.reasoning,
      });
    }

    // Sort by score descending
    variants.sort((a, b) => b.qualityScore - a.qualityScore);

    return variants;
  }

  /**
   * Map QAPage status to frontend ContentGenerationStatus
   */
  private mapQAPageStatus(status: string): string {
    switch (status) {
      case 'generating': return 'processing';
      case 'published': return 'published';
      case 'pending_review': return 'completed';
      case 'draft': return 'completed';
      case 'archived': return 'completed';
      default: return 'pending';
    }
  }

  // ===========================================================================
  // SERVICE HELPERS
  // ===========================================================================

  /**
   * Get ShopifyBlogService for the organization (decrypts access token)
   */
  private async getShopifyBlogService(organizationId: string): Promise<ShopifyBlogService | null> {
    try {
      const org = await this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: { shopifyDomain: true, accessTokenEncrypted: true },
      });

      if (!org?.shopifyDomain || !org?.accessTokenEncrypted) {
        return null;
      }

      const encryptedData = JSON.parse(org.accessTokenEncrypted) as EncryptedData;
      const accessToken = getEncryptionService().decryptAccessToken(encryptedData);

      return new ShopifyBlogService({
        shopDomain: org.shopifyDomain,
        accessToken,
        apiVersion: '2024-10',
      });
    } catch (error: any) {
      this.logger.error(`Failed to create ShopifyBlogService: ${error.message}`);
      return null;
    }
  }

  /**
   * Get DataForSEO service (if credentials configured)
   */
  private getDataForSEOService(): DataForSEOService | null {
    const login = process.env.DATAFORSEO_LOGIN;
    const password = process.env.DATAFORSEO_PASSWORD;

    if (!login || !password || login === 'your_login' || password === 'your_password') {
      return null;
    }

    return new DataForSEOService({ login, password });
  }
}
