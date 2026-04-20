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
import { getAIContentService } from '../services/ai-content-service';
import { getPublishingVelocityService } from '../services/publishing-velocity-service';
import { ContentGenerationInput } from '../types/ai.types';
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

        // Load business profile for brand voice
        let businessProfile: any = null;
        try {
          businessProfile = await this.prisma.businessProfile.findUnique({
            where: { organizationId },
          });
        } catch {
          // Business profile optional
        }

        // Generate variants using real AI (OpenAI/Claude via AIContentService)
        const variants = await this.generateProductVariants(
          product,
          aiModel,
          numberOfVariants,
          keywordData,
          businessProfile,
          organizationId,
        );

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

    // Enforce publishing velocity limits (anti-spam / Google safety).
    // If the org is over their daily or weekly limit, refuse the publish.
    const velocityService = getPublishingVelocityService();
    const check = await velocityService.canPublish(organizationId);
    if (!check.allowed) {
      this.logger.warn(
        `Publish blocked for org ${organizationId}: ${check.reason}`,
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Publishing velocity limit exceeded',
          reason: check.reason,
          counters: check.counters,
          rampUpActive: check.rampUpActive,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    try {
      // Try QAPage first
      const qaPage = await this.prisma.qAPage.findUnique({
        where: { id: contentGenerationId },
      });

      if (qaPage) {
        const result = await this.publishQAPageToShopify(qaPage, organizationId);
        await velocityService.recordPublish(organizationId);
        return result;
      }

      // Product flow - update product SEO meta on Shopify
      const product = await this.findProduct(contentGenerationId);
      if (product) {
        const result = await this.publishProductSEOToShopify(
          product,
          variantId,
          organizationId,
        );
        await velocityService.recordPublish(organizationId);
        return result;
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
   * Get current publishing velocity counters for an organization.
   * GET /api/content/velocity?organizationId=...
   */
  @Get('velocity')
  async getVelocity(@Query('organizationId') organizationId?: string) {
    const orgId = organizationId || (await this.resolveOrganizationId());
    const velocity = getPublishingVelocityService();
    return velocity.getCounters(orgId);
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
    // Look up the previously-generated ContentGeneration record rather than
    // regenerating content — the user already approved a specific variant.
    const generations = await this.prisma.contentGeneration.findMany({
      where: { productId: product.id, organizationId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    let selectedVariant: any = null;
    for (const gen of generations) {
      try {
        const content = JSON.parse(gen.generatedContent);
        if (content.metaTitle && content.metaDescription) {
          selectedVariant = {
            id: gen.id,
            metaTitle: content.metaTitle,
            metaDescription: content.metaDescription,
          };
          if (gen.id === variantId) break; // exact match
        }
      } catch {
        // Skip malformed
      }
    }

    if (!selectedVariant) {
      // No prior generation — generate fresh
      const variants = await this.generateProductVariants(
        product,
        'gpt-4o-mini',
        3,
        undefined,
        undefined,
        organizationId,
      );
      selectedVariant = variants.find((v: any) => v.id === variantId) || variants[0];
    }

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
   * Find product by ID from the database. Returns null if not found —
   * the caller should prompt the user to sync products from Shopify.
   */
  private async findProduct(productId: string): Promise<any | null> {
    const dbProduct = await this.prisma.product.findFirst({
      where: {
        OR: [{ id: productId }, { shopifyProductId: productId }],
      },
    });

    if (!dbProduct) return null;

    return {
      id: dbProduct.id,
      title: dbProduct.title,
      description: dbProduct.bodyHtml || '',
      vendor: dbProduct.vendor || '',
      productType: dbProduct.productType || '',
      tags: dbProduct.tags || [],
      primaryKeyword: dbProduct.primaryKeyword || null,
      organizationId: dbProduct.organizationId,
    };
  }

  // ===========================================================================
  // VARIANT GENERATION (async, real AI via AIContentService)
  // ===========================================================================

  /**
   * Generate SEO content variants for a product using real AI.
   *
   * Calls OpenAI/Claude via AIContentService with the `product_meta_pair` prompt
   * which returns structured JSON per variant. Enriches with DataForSEO keyword
   * data (search volume, difficulty, CPC) and the organization's brand voice.
   *
   * Falls back to returning a single variant with an error reasoning when the
   * AI call fails — the UI can then surface the actual error to the user.
   */
  private async generateProductVariants(
    product: any,
    aiModel: string,
    count: number,
    keywordData?: any,
    businessProfile?: any,
    organizationId?: string,
  ): Promise<any[]> {
    const { title, description, vendor, productType, tags } = product;
    const cleanDesc = (description || '').replace(/<[^>]*>/g, '').trim().slice(0, 500);

    // Build target keyword from product info + keyword research
    const targetKeyword =
      keywordData?.keyword ||
      product.primaryKeyword ||
      (productType ? `${productType} ${title.split(' - ')[0]}`.trim() : title);

    // Brand voice summary for the prompt
    const brandVoiceSummary = businessProfile?.brandVoice
      ? [
          businessProfile.brandVoice.tone && `Tone: ${businessProfile.brandVoice.tone}`,
          businessProfile.brandVoice.personality &&
            `Personality: ${Array.isArray(businessProfile.brandVoice.personality) ? businessProfile.brandVoice.personality.join(', ') : businessProfile.brandVoice.personality}`,
          businessProfile.brandVoice.avoidWords?.length &&
            `Avoid: ${businessProfile.brandVoice.avoidWords.join(', ')}`,
        ]
          .filter(Boolean)
          .join('. ')
      : 'Professional and customer-focused.';

    // AIContentService input
    const input: ContentGenerationInput = {
      productTitle: title,
      productDescription: cleanDesc,
      productType: productType || 'product',
      keywords: [targetKeyword, ...(tags || [])].filter(Boolean),
      brandVoice: brandVoiceSummary,
      tone: this.mapBrandTone(businessProfile?.brandVoice?.tone),
      additionalContext: [
        `Vendor: ${vendor || 'Unknown'}`,
        keywordData?.search_volume !== undefined &&
          `Target keyword search volume: ${keywordData.search_volume}/month`,
        keywordData?.keyword_difficulty !== undefined &&
          `Target keyword difficulty: ${keywordData.keyword_difficulty}/100`,
      ]
        .filter(Boolean)
        .join('. '),
    };

    const aiService = getAIContentService();
    const orgId = organizationId || 'unknown';

    let scoredVariants: any[];
    try {
      scoredVariants = await aiService.generateContent('product_meta', input, orgId, count);
    } catch (error: any) {
      this.logger.error(
        `AIContentService.generateContent failed for product ${product.id}: ${error.message}`,
      );
      // Surface the failure to the UI — do not fall back to templates.
      return [
        {
          id: `${product.id}-error-1`,
          metaTitle: '',
          metaDescription: '',
          qualityScore: 0,
          reasoning: `AI generation failed: ${error.message}. Check API keys (OPENAI_API_KEY, ANTHROPIC_API_KEY) and try again.`,
          error: true,
        },
      ];
    }

    // Each variant's `content` field holds the raw AI response. Our
    // `product_meta_pair` prompt asks for JSON with metaTitle, metaDescription,
    // angle, reasoning. Parse defensively.
    const variants = scoredVariants.map((variant, i) => {
      const parsed = this.parseMetaPairJSON(variant.content);
      return {
        id: `${product.id}-variant-${i + 1}`,
        metaTitle: parsed.metaTitle || '',
        metaDescription: parsed.metaDescription || '',
        qualityScore: variant.qualityScore?.overall ?? 0,
        reasoning: parsed.reasoning
          ? `${parsed.angle ? `[${parsed.angle}] ` : ''}${parsed.reasoning}`
          : 'Generated by AI.',
        model: variant.model,
        cost: variant.metadata?.cost,
        tokensUsed: variant.metadata?.totalTokens,
      };
    });

    // Best variant first
    variants.sort((a, b) => b.qualityScore - a.qualityScore);

    // Persist each variant as a ContentGeneration record for audit + cost tracking
    if (organizationId) {
      for (const variant of variants) {
        try {
          await this.prisma.contentGeneration.create({
            data: {
              organizationId,
              productId: product.id?.startsWith('mock-') ? null : product.id,
              targetType: 'META_TITLE',
              aiModel: variant.model || aiModel,
              prompt: input.productTitle || '',
              generatedContent: JSON.stringify({
                metaTitle: variant.metaTitle,
                metaDescription: variant.metaDescription,
              }),
              qualityScore: Math.round(variant.qualityScore || 0),
              status:
                (variant.qualityScore || 0) >= 85
                  ? 'APPROVED'
                  : (variant.qualityScore || 0) >= 70
                    ? 'PENDING'
                    : 'REJECTED',
              tokensUsed: variant.tokensUsed || null,
              cost: variant.cost ? variant.cost.toString() : null,
            },
          });
        } catch (error: any) {
          // Non-fatal — logging only
          this.logger.warn(`Failed to persist ContentGeneration: ${error.message}`);
        }
      }
    }

    return variants;
  }

  /**
   * Parse the JSON payload the AI returns from the product_meta_pair prompt.
   * The AI sometimes wraps JSON in ```json fences; strip them defensively.
   */
  private parseMetaPairJSON(raw: string): {
    metaTitle?: string;
    metaDescription?: string;
    angle?: string;
    reasoning?: string;
  } {
    if (!raw) return {};
    // Strip common fence patterns
    let cleaned = raw.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
    // Find the first { and last } and parse that slice
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return {};
    try {
      const obj = JSON.parse(cleaned.slice(start, end + 1));
      return {
        metaTitle: obj.metaTitle,
        metaDescription: obj.metaDescription,
        angle: obj.angle,
        reasoning: obj.reasoning,
      };
    } catch {
      return {};
    }
  }

  /**
   * Map business profile tone (from Onboarding) to AIContentService tone enum.
   */
  private mapBrandTone(
    tone?: string,
  ): 'professional' | 'casual' | 'enthusiastic' | 'authoritative' | 'friendly' | undefined {
    if (!tone) return undefined;
    switch (tone) {
      case 'professional':
      case 'casual':
      case 'authoritative':
      case 'friendly':
        return tone as any;
      case 'technical':
        return 'professional';
      case 'conversational':
        return 'casual';
      default:
        return undefined;
    }
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
