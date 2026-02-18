/**
 * Auto-Optimization Workflow
 *
 * Monitors content performance and automatically optimizes underperforming pages.
 *
 * Triggers:
 * - Daily cron job (checks all published pages)
 * - Manual trigger via API
 *
 * Optimization triggers:
 * - Ranking drop >5 positions
 * - Traffic decline >20%
 * - Content older than 90 days
 * - SEO score dropped below 70
 * - Competitor surpassed us
 *
 * Actions:
 * - Refresh content with latest data (Perplexity)
 * - Enhance with competitor insights
 * - Update meta tags for better CTR
 * - Add more internal links
 * - Regenerate schema markup
 */

import { PrismaClient } from '@prisma/client';
import AutoOptimizationService from '../services/auto-optimization-service';
import AIContentService from '../services/ai-content-service';
import PerplexityService from '../services/perplexity-service';
import AdvancedInternalLinkingService from '../services/advanced-internal-linking-service';
import SEOValidatorService from '../services/seo-validator-service';
import { ShopifyBlogService } from '../services/shopify-blog-service';
import { QAPageRepository } from '../repositories/qa-page.repository';

export interface OptimizationWorkflowInput {
  organizationId: string;
  pageId?: string; // If specified, only optimize this page
  forceOptimize?: boolean; // Ignore optimization criteria
}

export interface OptimizationWorkflowResult {
  success: boolean;
  pagesAnalyzed: number;
  pagesOptimized: number;
  optimizations: {
    pageId: string;
    question: string;
    issuesFound: string[];
    actionsToken: string[];
    newSeoScore?: number;
  }[];
  error?: string;
}

export class AutoOptimizationWorkflow {
  private autoOptimizationService: AutoOptimizationService;
  private aiContentService: AIContentService;
  private perplexityService: PerplexityService;
  private internalLinkingService: AdvancedInternalLinkingService;
  private seoValidatorService: SEOValidatorService;
  private qaPageRepo: QAPageRepository;

  constructor(private prisma: PrismaClient) {
    this.autoOptimizationService = new AutoOptimizationService();
    this.aiContentService = new AIContentService();
    this.perplexityService = new PerplexityService();
    this.internalLinkingService = new AdvancedInternalLinkingService();
    this.seoValidatorService = new SEOValidatorService();
    this.qaPageRepo = new QAPageRepository(prisma);
  }

  /**
   * Execute auto-optimization workflow
   */
  async execute(input: OptimizationWorkflowInput): Promise<OptimizationWorkflowResult> {
    console.log(`[AutoOptimizationWorkflow] Starting for organization: ${input.organizationId}`);

    try {
      // Get pages to analyze
      const pagesToAnalyze = input.pageId
        ? [await this.qaPageRepo.getById(input.pageId)]
        : await this.qaPageRepo.getByOrganization(input.organizationId, {
            status: 'published',
            limit: 100,
          });

      const validPages = pagesToAnalyze.filter((p): p is NonNullable<typeof p> => p !== null);

      console.log(`[AutoOptimizationWorkflow] Analyzing ${validPages.length} pages`);

      const optimizations: any[] = [];

      for (const page of validPages) {
        try {
          // Get page performance data
          const performance = await this.getPagePerformance(page.id);

          // Analyze page for optimization needs
          const analysis = await this.autoOptimizationService.analyzePage(
            page.id,
            performance,
            page.answerContent || ''
          );

          console.log(`[AutoOptimizationWorkflow] Page ${page.id}: ${analysis.status}`);

          // Only optimize if critical or needs attention
          if (
            analysis.status === 'critical' ||
            analysis.status === 'needs_attention' ||
            input.forceOptimize
          ) {
            console.log(`[AutoOptimizationWorkflow] Optimizing page: "${page.question}"`);

            const optimizationResult = await this.optimizePage(page, analysis);

            optimizations.push({
              pageId: page.id,
              question: page.question,
              issuesFound: analysis.issues.map((i) => i.description),
              actionsToken: optimizationResult.actions,
              newSeoScore: optimizationResult.newSeoScore,
            });
          }
        } catch (error) {
          console.error(`[AutoOptimizationWorkflow] Failed to optimize page ${page.id}:`, error);
          // Continue with other pages
        }
      }

      console.log(`[AutoOptimizationWorkflow] Optimized ${optimizations.length} pages`);

      return {
        success: true,
        pagesAnalyzed: validPages.length,
        pagesOptimized: optimizations.length,
        optimizations,
      };
    } catch (error: any) {
      console.error('[AutoOptimizationWorkflow] Workflow failed:', error);

      return {
        success: false,
        pagesAnalyzed: 0,
        pagesOptimized: 0,
        optimizations: [],
        error: error.message,
      };
    }
  }

  /**
   * Optimize a specific page
   */
  private async optimizePage(page: any, analysis: any): Promise<{ actions: string[]; newSeoScore?: number }> {
    const actions: string[] = [];

    // 1. Refresh content if outdated or ranking declined
    if (
      analysis.issues.some((i: any) => i.type === 'ranking_decline' || i.type === 'outdated_content')
    ) {
      console.log(`[AutoOptimizationWorkflow] Refreshing content for "${page.question}"`);

      const refreshedContent = await this.autoOptimizationService.refreshContent(
        page.id,
        page.answerContent,
        page.question
      );

      await this.qaPageRepo.update(page.id, {
        answerContent: refreshedContent,
        answerMarkdown: refreshedContent,
      });

      actions.push('Refreshed content with latest information');
    }

    // 2. Add more internal links if weak link graph
    if (analysis.issues.some((i: any) => i.type === 'weak_internal_links')) {
      console.log(`[AutoOptimizationWorkflow] Adding internal links for "${page.question}"`);

      const existingPages = await this.qaPageRepo.getByOrganization(page.organization_id, {
        status: 'published',
        limit: 50,
      });

      const availablePages = existingPages
        .filter((p) => p.id !== page.id)
        .map((p) => ({
          id: p.id,
          url: p.shopifyUrl || '',
          title: p.question,
          content: p.answerContent || '',
          type: 'qa_page',
        }));

      if (availablePages.length > 0) {
        const links = await this.internalLinkingService.generateContextualLinks(
          page.answerContent,
          page.id,
          availablePages,
          3
        );

        // Insert links into content
        let updatedContent = page.answerContent;
        for (const link of links) {
          const anchorIndex = updatedContent.toLowerCase().indexOf(link.anchorText.toLowerCase());
          if (anchorIndex !== -1) {
            const before = updatedContent.substring(0, anchorIndex);
            const after = updatedContent.substring(anchorIndex + link.anchorText.length);
            updatedContent = before + `<a href="${link.targetUrl}">${link.anchorText}</a>` + after;
          }
        }

        await this.qaPageRepo.update(page.id, {
          answerContent: updatedContent,
        });

        actions.push(`Added ${links.length} internal links`);
      }
    }

    // 3. Optimize meta tags for better CTR
    if (analysis.issues.some((i: any) => i.type === 'traffic_decline' || i.type === 'low_ctr')) {
      console.log(`[AutoOptimizationWorkflow] Optimizing meta tags for "${page.question}"`);

      // Generate better meta title
      const metaTitle = await this.generateOptimizedMetaTitle(page.question, page.targetKeyword);
      const metaDescription = await this.generateOptimizedMetaDescription(
        page.answerContent,
        page.targetKeyword
      );

      await this.qaPageRepo.update(page.id, {
        metaTitle,
        metaDescription,
      });

      actions.push('Optimized meta tags for better CTR');
    }

    // 4. Re-validate SEO
    const updatedPage = await this.qaPageRepo.getById(page.id);
    if (updatedPage) {
      const seoValidation = await this.seoValidatorService.validate(
        updatedPage.answerContent || '',
        {
          targetKeyword: updatedPage.targetKeyword || '',
          metaTitle: updatedPage.metaTitle || undefined,
          metaDescription: updatedPage.metaDescription || undefined,
        }
      );

      await this.qaPageRepo.update(page.id, {
        seoScore: seoValidation.overallScore,
        lastOptimizedAt: new Date(),
      });

      // 5. Update on Shopify if published
      if (updatedPage.shopifyBlogId && updatedPage.shopifyBlogPostId) {
        try {
          const shopifyService = await this.getShopifyBlogService(page.organization_id);
          if (shopifyService) {
            await shopifyService.updateBlogPost(
              updatedPage.shopifyBlogId,
              updatedPage.shopifyBlogPostId,
              {
                bodyHtml: updatedPage.answerContent || undefined,
                title: updatedPage.metaTitle || undefined,
                summary: updatedPage.metaDescription || undefined,
              }
            );

            actions.push('Updated on Shopify');
          }
        } catch (error) {
          console.error('[AutoOptimizationWorkflow] Failed to update Shopify:', error);
        }
      }

      return {
        actions,
        newSeoScore: seoValidation.overallScore,
      };
    }

    return { actions };
  }

  /**
   * Get page performance data
   */
  private async getPagePerformance(pageId: string): Promise<any> {
    // Get performance data from last 30 days
    const pageWithPerformance = await this.qaPageRepo.getWithPerformance(pageId, 30);

    if (!pageWithPerformance || !pageWithPerformance.contentPerformance) {
      // No performance data - return defaults
      return {
        positionChange: 0,
        clicks: { current: 0, previous: 0, changePercentage: 0 },
        impressions: { current: 0, previous: 0, changePercentage: 0 },
        ctr: { current: 0, previous: 0, changePercentage: 0 },
        engagement: { bounceRate: 0, avgTimeOnPage: 0 },
      };
    }

    const performances = pageWithPerformance.contentPerformance;

    // Calculate changes
    const latest = performances[0];
    const previous = performances[performances.length - 1];

    return {
      positionChange: Number(previous?.avgPosition || 0) - Number(latest?.avgPosition || 0),
      clicks: {
        current: latest?.clicks || 0,
        previous: previous?.clicks || 0,
        changePercentage: this.calculatePercentageChange(
          previous?.clicks || 0,
          latest?.clicks || 0
        ),
      },
      impressions: {
        current: latest?.impressions || 0,
        previous: previous?.impressions || 0,
        changePercentage: this.calculatePercentageChange(
          previous?.impressions || 0,
          latest?.impressions || 0
        ),
      },
      ctr: {
        current: Number(latest?.ctr || 0),
        previous: Number(previous?.ctr || 0),
        changePercentage: this.calculatePercentageChange(Number(previous?.ctr || 0), Number(latest?.ctr || 0)),
      },
      engagement: {
        bounceRate: Number(latest?.bounceRate || 0),
        avgTimeOnPage: latest?.avgTimeOnPage || 0,
      },
    };
  }

  /**
   * Calculate percentage change
   */
  private calculatePercentageChange(oldValue: number, newValue: number): number {
    if (oldValue === 0) return 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  /**
   * Generate optimized meta title
   */
  private async generateOptimizedMetaTitle(question: string, keyword: string): Promise<string> {
    // Ensure keyword is at the beginning, keep under 60 chars
    const title = question.substring(0, 55);
    return keyword ? `${keyword} - ${title}` : title;
  }

  /**
   * Generate optimized meta description
   */
  private async generateOptimizedMetaDescription(content: string, keyword: string): Promise<string> {
    const plainText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    // Try to find a sentence with the keyword
    const sentences = plainText.split(/[.!?]+/);
    const sentenceWithKeyword = sentences.find((s) => s.toLowerCase().includes(keyword.toLowerCase()));

    if (sentenceWithKeyword) {
      const desc = sentenceWithKeyword.trim().substring(0, 150);
      return desc + (sentenceWithKeyword.length > 150 ? '...' : '');
    }

    // Fallback to first 150 chars
    return plainText.substring(0, 150) + '...';
  }

  /**
   * Get Shopify Blog Service
   */
  private async getShopifyBlogService(organizationId: string): Promise<ShopifyBlogService | null> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org || !org.shopifyDomain || !org.accessTokenEncrypted) {
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

export default AutoOptimizationWorkflow;
