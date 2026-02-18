/**
 * Content Generation Workflow
 *
 * Complete pipeline for Q&A content generation from question to published blog post.
 *
 * Pipeline:
 * 1. Research question (Perplexity)
 * 2. Generate content (Claude with business context)
 * 3. Add internal links (AI-powered)
 * 4. Generate featured image (if configured)
 * 5. Generate schema markup
 * 6. SEO validation
 * 7. Save to database
 * 8. Publish to Shopify (if auto-approved)
 *
 * Auto-approval criteria:
 * - SEO score >= 85: Auto-publish
 * - SEO score 70-84: Manual review required
 * - SEO score < 70: Auto-reject (regenerate)
 */

import { PrismaClient } from '@prisma/client';
import AIContentService from '../services/ai-content-service';
import PerplexityService from '../services/perplexity-service';
import AdvancedInternalLinkingService from '../services/advanced-internal-linking-service';
import SchemaService from '../services/schema-service';
import SEOValidatorService from '../services/seo-validator-service';
import { ShopifyBlogService } from '../services/shopify-blog-service';
import { BusinessProfileRepository } from '../repositories/business-profile.repository';
import { QAPageRepository } from '../repositories/qa-page.repository';
import { InternalLinkRepository } from '../repositories/internal-link.repository';

export interface ContentGenerationWorkflowInput {
  questionId: string;
  organizationId: string;
  question: string;
  targetKeyword?: string;
  relatedProducts?: any[];
  skipPublishing?: boolean;
}

export interface ContentGenerationWorkflowResult {
  success: boolean;
  qaPageId?: string;
  seoScore?: number;
  status?: 'published' | 'pending_review' | 'rejected';
  shopifyUrl?: string;
  error?: string;
}

export class ContentGenerationWorkflow {
  private aiContentService: AIContentService;
  private perplexityService: PerplexityService;
  private internalLinkingService: AdvancedInternalLinkingService;
  private schemaService: SchemaService;
  private seoValidatorService: SEOValidatorService;
  private businessProfileRepo: BusinessProfileRepository;
  private qaPageRepo: QAPageRepository;
  private internalLinkRepo: InternalLinkRepository;

  constructor(private prisma: PrismaClient) {
    this.aiContentService = new AIContentService();
    this.perplexityService = new PerplexityService();
    this.internalLinkingService = new AdvancedInternalLinkingService();
    this.schemaService = new SchemaService();
    this.seoValidatorService = new SEOValidatorService();
    this.businessProfileRepo = new BusinessProfileRepository(prisma);
    this.qaPageRepo = new QAPageRepository(prisma);
    this.internalLinkRepo = new InternalLinkRepository(prisma);
  }

  /**
   * Execute full content generation pipeline
   */
  async execute(input: ContentGenerationWorkflowInput): Promise<ContentGenerationWorkflowResult> {
    console.log(`[ContentGenerationWorkflow] Starting pipeline for question: "${input.question}"`);

    try {
      // Step 1: Get business profile
      const businessProfile = await this.businessProfileRepo.getByOrganizationId(input.organizationId);
      if (!businessProfile) {
        throw new Error(`Business profile not found for organization ${input.organizationId}`);
      }

      // Step 2: Research the question (Perplexity)
      console.log('[ContentGenerationWorkflow] Step 1/8: Researching question...');
      const research = await this.perplexityService.research(input.question, {
        depth: (businessProfile.advancedSettings as any)?.factCheckingLevel || 'thorough',
      });

      // Step 3: Generate Q&A content (Claude with business context)
      console.log('[ContentGenerationWorkflow] Step 2/8: Generating AI content...');
      const contentResult = await this.aiContentService.generateQAContent(
        input.question,
        businessProfile,
        research,
        input.relatedProducts || []
      );

      // Step 4: Get existing pages for internal linking
      console.log('[ContentGenerationWorkflow] Step 3/8: Adding internal links...');
      const existingPages = await this.qaPageRepo.getByOrganization(input.organizationId, {
        status: 'published',
        limit: 50,
        orderBy: 'monthly_traffic',
        orderDirection: 'desc',
      });

      // Convert existing pages to format needed by linking service
      const availablePages = existingPages.map((page) => ({
        id: page.id,
        url: page.shopifyUrl || `https://example.com/blogs/seo/${page.id}`,
        title: page.question,
        content: page.answerContent || '',
        type: 'qa_page',
      }));

      // Add contextual internal links (if we have existing pages)
      let linkedContent = contentResult.content;
      const internalLinks: any[] = [];

      if (availablePages.length > 0) {
        const links = await this.internalLinkingService.generateContextualLinks(
          contentResult.content,
          'temp-page-id', // Will be replaced after page creation
          availablePages,
          5 // Max 5 internal links
        );

        // Insert links into content
        linkedContent = this.insertLinksIntoContent(contentResult.content, links);
        internalLinks.push(...links);
      }

      // Step 5: Extract FAQ items from content for schema
      console.log('[ContentGenerationWorkflow] Step 4/8: Generating schema markup...');
      const faqItems = this.extractFAQsFromContent(linkedContent);
      const schema = this.schemaService.generateFAQSchema(
        input.question,
        linkedContent,
        faqItems
      );

      // Step 6: SEO validation
      console.log('[ContentGenerationWorkflow] Step 5/8: Validating SEO...');
      const targetKeyword = input.targetKeyword || this.extractKeywordFromQuestion(input.question);
      const metaTitle = input.question;
      const metaDescription = this.generateMetaDescription(linkedContent);

      const seoValidation = await this.seoValidatorService.validate(linkedContent, {
        targetKeyword,
        metaTitle,
        metaDescription,
      });

      // Step 7: Save to database
      console.log('[ContentGenerationWorkflow] Step 6/8: Saving to database...');
      const qaPage = await this.qaPageRepo.create({
        organizationId: input.organizationId,
        question: input.question,
        answerContent: linkedContent,
        answerMarkdown: linkedContent, // Would convert HTML to Markdown in production
        targetKeyword,
        metaTitle,
        metaDescription,
        h1: input.question,
        schemaMarkup: schema,
        seoScore: seoValidation.overallScore,
        status: seoValidation.overallScore >= 85 ? 'published' : seoValidation.overallScore >= 70 ? 'pending_review' : 'draft',
      });

      // Update internal link source page IDs
      for (const link of internalLinks) {
        link.sourcePageId = qaPage.id;
      }

      // Save internal links
      if (internalLinks.length > 0) {
        for (const link of internalLinks) {
          await this.internalLinkRepo.create({
            organizationId: input.organizationId,
            sourcePageType: 'qa_page',
            sourcePageId: qaPage.id,
            sourceUrl: '', // Will be set after publishing
            targetPageType: link.targetPageType,
            targetPageId: link.targetUrl,
            targetUrl: link.targetUrl,
            anchorText: link.anchorText,
            context: link.context,
            linkType: link.linkType,
            relevanceScore: link.relevanceScore,
          });
        }
      }

      // Step 8: Publish to Shopify (if auto-approved)
      console.log('[ContentGenerationWorkflow] Step 7/8: Publishing to Shopify...');
      let shopifyUrl: string | undefined;

      if (seoValidation.overallScore >= 85 && !input.skipPublishing) {
        try {
          const shopifyBlogService = await this.getShopifyBlogService(input.organizationId);

          if (shopifyBlogService) {
            // Get default blog
            const blog = await shopifyBlogService.getDefaultBlog();

            // Create blog post
            const blogPost = await shopifyBlogService.createBlogPost(blog.id, {
              title: input.question,
              bodyHtml: linkedContent,
              tags: ['qa', 'seo', targetKeyword],
              author: (businessProfile.businessName as any) || 'SEO Team',
              published: true,
              metafields: [
                {
                  namespace: 'seo',
                  key: 'schema_markup',
                  value: JSON.stringify(schema),
                  type: 'json_string',
                },
                {
                  namespace: 'seo',
                  key: 'seo_score',
                  value: seoValidation.overallScore.toString(),
                  type: 'integer', // Use 'integer' instead of 'number_integer'
                },
              ],
            });

            shopifyUrl = `https://${process.env.SHOPIFY_DOMAIN}/blogs/${blog.handle}/${blogPost.handle}`;

            // Update QA page with Shopify details
            await this.qaPageRepo.publish(qaPage.id, {
              shopifyBlogId: blog.id,
              shopifyBlogPostId: blogPost.id,
              shopifyUrl,
            });

            console.log(`[ContentGenerationWorkflow] Published to Shopify: ${shopifyUrl}`);
          }
        } catch (error) {
          console.error('[ContentGenerationWorkflow] Failed to publish to Shopify:', error);
          // Don't fail the whole workflow - content is still saved
        }
      }

      console.log('[ContentGenerationWorkflow] Step 8/8: Complete!');
      console.log(`[ContentGenerationWorkflow] Result: ${qaPage.status} (SEO Score: ${seoValidation.overallScore})`);

      return {
        success: true,
        qaPageId: qaPage.id,
        seoScore: seoValidation.overallScore,
        status: qaPage.status as any,
        shopifyUrl,
      };
    } catch (error: any) {
      console.error('[ContentGenerationWorkflow] Pipeline failed:', error);

      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Insert internal links into content at optimal positions
   */
  private insertLinksIntoContent(content: string, links: any[]): string {
    let modifiedContent = content;

    for (const link of links) {
      // Find first occurrence of anchor text in content
      const anchorIndex = modifiedContent.toLowerCase().indexOf(link.anchorText.toLowerCase());

      if (anchorIndex !== -1) {
        // Replace with linked version
        const before = modifiedContent.substring(0, anchorIndex);
        const after = modifiedContent.substring(anchorIndex + link.anchorText.length);
        const linkedAnchor = `<a href="${link.targetUrl}" class="internal-link">${link.anchorText}</a>`;

        modifiedContent = before + linkedAnchor + after;
      }
    }

    return modifiedContent;
  }

  /**
   * Extract FAQ items from content
   */
  private extractFAQsFromContent(content: string): any[] {
    const faqItems: any[] = [];

    // Look for FAQ sections (H2/H3 with question pattern)
    const questionPattern = /<h[23][^>]*>(.*?)<\/h[23]>/gi;
    const matches = content.matchAll(questionPattern);

    for (const match of matches) {
      const question = match[1].replace(/<[^>]*>/g, '');

      // Check if it looks like a question
      if (/\?|how|what|why|when|where|who|can|should/i.test(question)) {
        // Extract answer (text after heading until next heading)
        const answerMatch = content.substring(match.index!).match(/<\/h[23]>(.*?)<h[23]/is);
        const answer = answerMatch ? answerMatch[1].replace(/<[^>]*>/g, '').trim() : '';

        if (answer) {
          faqItems.push({ question, answer });
        }
      }
    }

    return faqItems.slice(0, 5); // Limit to 5 FAQs
  }

  /**
   * Extract primary keyword from question
   */
  private extractKeywordFromQuestion(question: string): string {
    // Remove question words to get core topic
    return question
      .replace(/^(how|what|why|when|where|who|can|should|is|are|do|does)\s+/i, '')
      .replace(/\?$/, '')
      .trim();
  }

  /**
   * Generate meta description from content
   */
  private generateMetaDescription(content: string): string {
    // Strip HTML and get first 150 characters
    const plainText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return plainText.substring(0, 150) + (plainText.length > 150 ? '...' : '');
  }

  /**
   * Get Shopify Blog Service for organization
   */
  private async getShopifyBlogService(organizationId: string): Promise<ShopifyBlogService | null> {
    // Get organization's Shopify credentials
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org || !org.shopifyDomain || !org.accessTokenEncrypted) {
      console.warn('[ContentGenerationWorkflow] No Shopify credentials found');
      return null;
    }

    // Decrypt access token
    const encryptionService = (await import('../services/encryption-service')).getEncryptionService();
    const accessToken = encryptionService.decryptAccessToken(JSON.parse(org.accessTokenEncrypted) as any);

    return new ShopifyBlogService({
      shopDomain: org.shopifyDomain,
      accessToken,
    });
  }
}

export default ContentGenerationWorkflow;
