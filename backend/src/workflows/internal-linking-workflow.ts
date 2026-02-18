/**
 * Internal Linking Workflow
 *
 * Weekly workflow to optimize the internal link graph.
 *
 * Goals:
 * - Eliminate orphan pages (pages with 0 inbound links)
 * - Balance link distribution (ensure all pages have 3-5 inbound links)
 * - Identify and create hub pages (high-traffic pages that link out)
 * - Use AI to generate contextual, natural anchor text
 * - Update Shopify blog posts with new links
 *
 * Run frequency: Weekly (every Sunday at 2 AM)
 */

import { PrismaClient } from '@prisma/client';
import AdvancedInternalLinkingService from '../services/advanced-internal-linking-service';
import { ShopifyBlogService } from '../services/shopify-blog-service';
import { QAPageRepository } from '../repositories/qa-page.repository';
import { InternalLinkRepository } from '../repositories/internal-link.repository';

export interface InternalLinkingWorkflowInput {
  organizationId: string;
  targetInboundLinks?: number; // Target minimum inbound links per page (default: 3)
  maxLinksPerUpdate?: number; // Max links to add in one run (default: 50)
}

export interface InternalLinkingWorkflowResult {
  success: boolean;
  orphanPagesFound: number;
  orphanPagesFixed: number;
  underlinkedPagesFound: number;
  underlinkedPagesFixed: number;
  totalLinksAdded: number;
  pagesUpdated: number;
  linkGraphMetrics: {
    totalPages: number;
    totalLinks: number;
    averageInboundLinks: number;
    averageOutboundLinks: number;
    orphanPages: number;
  };
  error?: string;
}

export class InternalLinkingWorkflow {
  private internalLinkingService: AdvancedInternalLinkingService;
  private qaPageRepo: QAPageRepository;
  private internalLinkRepo: InternalLinkRepository;

  constructor(private prisma: PrismaClient) {
    this.internalLinkingService = new AdvancedInternalLinkingService();
    this.qaPageRepo = new QAPageRepository(prisma);
    this.internalLinkRepo = new InternalLinkRepository(prisma);
  }

  /**
   * Execute internal linking optimization workflow
   */
  async execute(input: InternalLinkingWorkflowInput): Promise<InternalLinkingWorkflowResult> {
    console.log(`[InternalLinkingWorkflow] Starting for organization: ${input.organizationId}`);

    try {
      const targetInboundLinks = input.targetInboundLinks || 3;
      const maxLinksPerUpdate = input.maxLinksPerUpdate || 50;

      // Step 1: Get all published pages
      const allPages = await this.qaPageRepo.getByOrganization(input.organizationId, {
        status: 'published',
        limit: 1000,
      });

      console.log(`[InternalLinkingWorkflow] Analyzing ${allPages.length} published pages`);

      // Step 2: Get current link graph
      const allLinks = await this.internalLinkRepo.getByOrganization(input.organizationId);

      // Calculate inbound/outbound links for each page
      const pageStats = allPages.map((page) => {
        const inboundLinks = allLinks.filter((l) => l.targetPageId === page.id).length;
        const outboundLinks = allLinks.filter((l) => l.sourcePageId === page.id).length;

        return {
          id: page.id,
          url: page.shopifyUrl || '',
          title: page.question,
          content: page.answerContent || '',
          inboundLinks,
          outboundLinks,
          monthlyTraffic: page.monthlyTraffic || 0,
        };
      });

      // Step 3: Calculate link graph metrics
      const linkGraphMetrics = await this.internalLinkingService.calculateLinkGraphMetrics(
        pageStats.map((p) => ({
          id: p.id,
          inboundLinks: p.inboundLinks,
          outboundLinks: p.outboundLinks,
        }))
      );

      console.log('[InternalLinkingWorkflow] Link graph metrics:', linkGraphMetrics);

      // Step 4: Find orphan pages (0 inbound links)
      const orphanPages = pageStats.filter((p) => p.inboundLinks === 0);
      console.log(`[InternalLinkingWorkflow] Found ${orphanPages.length} orphan pages`);

      // Step 5: Find underlinked pages (< target inbound links)
      const underlinkedPages = pageStats.filter(
        (p) => p.inboundLinks > 0 && p.inboundLinks < targetInboundLinks
      );
      console.log(`[InternalLinkingWorkflow] Found ${underlinkedPages.length} underlinked pages`);

      // Step 6: Optimize link graph
      const opportunities = await this.internalLinkingService.optimizeLinkGraph(
        input.organizationId,
        pageStats
      );

      console.log(`[InternalLinkingWorkflow] Found ${opportunities.length} link opportunities`);

      // Step 7: Apply link opportunities (up to max limit)
      let linksAdded = 0;
      const updatedPages = new Set<string>();

      for (const opportunity of opportunities.slice(0, maxLinksPerUpdate)) {
        try {
          // Get source page
          const sourcePage = await this.qaPageRepo.getById(opportunity.sourcePage.id);
          if (!sourcePage || !sourcePage.answerContent) continue;

          // Check if link already exists
          const existingLink = await this.internalLinkRepo.findBySourceAndTarget(
            opportunity.sourcePage.id,
            opportunity.targetPage.id
          );

          if (existingLink) {
            console.log(`[InternalLinkingWorkflow] Link already exists, skipping`);
            continue;
          }

          // Insert link into content at suggested position
          const updatedContent = this.insertLinkAtPosition(
            sourcePage.answerContent,
            opportunity.suggestedAnchorText,
            opportunity.targetPage.url,
            opportunity.suggestedPosition
          );

          // Update page content
          await this.qaPageRepo.update(sourcePage.id, {
            answerContent: updatedContent,
            answerMarkdown: updatedContent,
          });

          // Save link to database
          await this.internalLinkRepo.create({
            organizationId: input.organizationId,
            sourcePageType: 'qa_page',
            sourcePageId: sourcePage.id,
            sourceUrl: sourcePage.shopifyUrl || '',
            targetPageType: 'qa_page',
            targetPageId: opportunity.targetPage.id,
            targetUrl: opportunity.targetPage.url,
            anchorText: opportunity.suggestedAnchorText,
            context: '',
            linkType: 'contextual',
            relevanceScore: opportunity.relevanceScore,
          });

          linksAdded++;
          updatedPages.add(sourcePage.id);

          console.log(
            `[InternalLinkingWorkflow] Added link: "${opportunity.sourcePage.title}" -> "${opportunity.targetPage.title}"`
          );
        } catch (error) {
          console.error('[InternalLinkingWorkflow] Failed to add link:', error);
        }
      }

      // Step 8: Update Shopify blog posts
      console.log(`[InternalLinkingWorkflow] Updating ${updatedPages.size} Shopify blog posts`);

      const shopifyService = await this.getShopifyBlogService(input.organizationId);

      if (shopifyService) {
        for (const pageId of updatedPages) {
          try {
            const page = await this.qaPageRepo.getById(pageId);
            if (!page || !page.shopifyBlogId || !page.shopifyBlogPostId) continue;

            await shopifyService.updateBlogPost(
              page.shopifyBlogId,
              page.shopifyBlogPostId,
              {
                bodyHtml: page.answerContent || undefined,
              }
            );

            console.log(`[InternalLinkingWorkflow] Updated Shopify blog post ${page.shopifyBlogPostId}`);
          } catch (error) {
            console.error('[InternalLinkingWorkflow] Failed to update Shopify:', error);
          }
        }
      }

      // Step 9: Calculate how many orphans/underlinked pages were fixed
      const orphanPagesFixed = opportunities.filter((o) =>
        orphanPages.some((p) => p.id === o.targetPage.id)
      ).length;

      const underlinkedPagesFixed = opportunities.filter((o) =>
        underlinkedPages.some((p) => p.id === o.targetPage.id)
      ).length;

      console.log('[InternalLinkingWorkflow] Complete!');

      return {
        success: true,
        orphanPagesFound: orphanPages.length,
        orphanPagesFixed,
        underlinkedPagesFound: underlinkedPages.length,
        underlinkedPagesFixed,
        totalLinksAdded: linksAdded,
        pagesUpdated: updatedPages.size,
        linkGraphMetrics: {
          totalPages: linkGraphMetrics.totalPages,
          totalLinks: linkGraphMetrics.totalLinks + linksAdded,
          averageInboundLinks: linkGraphMetrics.averageInboundLinks,
          averageOutboundLinks: linkGraphMetrics.averageOutboundLinks,
          orphanPages: Math.max(0, orphanPages.length - orphanPagesFixed),
        },
      };
    } catch (error: any) {
      console.error('[InternalLinkingWorkflow] Workflow failed:', error);

      return {
        success: false,
        orphanPagesFound: 0,
        orphanPagesFixed: 0,
        underlinkedPagesFound: 0,
        underlinkedPagesFixed: 0,
        totalLinksAdded: 0,
        pagesUpdated: 0,
        linkGraphMetrics: {
          totalPages: 0,
          totalLinks: 0,
          averageInboundLinks: 0,
          averageOutboundLinks: 0,
          orphanPages: 0,
        },
        error: error.message,
      };
    }
  }

  /**
   * Insert link at specific position in content
   */
  private insertLinkAtPosition(
    content: string,
    anchorText: string,
    targetUrl: string,
    position: number
  ): string {
    // Try to find anchor text naturally in content first
    const anchorIndex = content.toLowerCase().indexOf(anchorText.toLowerCase());

    if (anchorIndex !== -1) {
      // Replace natural occurrence
      const before = content.substring(0, anchorIndex);
      const after = content.substring(anchorIndex + anchorText.length);
      return before + `<a href="${targetUrl}" class="internal-link">${anchorText}</a>` + after;
    }

    // If not found naturally, insert at position (within a paragraph)
    const paragraphs = content.split(/<\/p>/i);

    if (paragraphs.length > 1) {
      const targetParagraph = Math.min(Math.floor(position / 300), paragraphs.length - 1);

      paragraphs[targetParagraph] =
        paragraphs[targetParagraph] +
        ` <a href="${targetUrl}" class="internal-link">${anchorText}</a>`;

      return paragraphs.join('</p>');
    }

    // Fallback: append to end
    return content + ` <a href="${targetUrl}" class="internal-link">${anchorText}</a>`;
  }

  /**
   * Get Shopify Blog Service
   */
  private async getShopifyBlogService(organizationId: string): Promise<ShopifyBlogService | null> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org || !org.shopifyDomain || !org.accessTokenEncrypted) {
      console.warn('[InternalLinkingWorkflow] No Shopify credentials found');
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

export default InternalLinkingWorkflow;
