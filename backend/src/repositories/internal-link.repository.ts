/**
 * Internal Link Repository
 * Database operations for internal linking graph
 */

import { PrismaClient, InternalLink } from '@prisma/client';

export class InternalLinkRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new internal link
   */
  async create(data: {
    organizationId: string;
    sourcePageType: string;
    sourcePageId?: string;
    sourceUrl: string;
    targetPageType: string;
    targetPageId?: string;
    targetUrl: string;
    anchorText: string;
    context?: string;
    linkType: string;
    relevanceScore?: number;
  }): Promise<InternalLink> {
    return this.prisma.internalLink.create({
      data: {
        organizationId: data.organizationId,
        sourcePageType: data.sourcePageType,
        sourcePageId: data.sourcePageId,
        sourceUrl: data.sourceUrl,
        targetPageType: data.targetPageType,
        targetPageId: data.targetPageId,
        targetUrl: data.targetUrl,
        anchorText: data.anchorText,
        context: data.context,
        linkType: data.linkType,
        relevanceScore: data.relevanceScore,
      },
    });
  }

  /**
   * Create multiple internal links (bulk operation)
   */
  async createMany(
    links: Array<{
      organizationId: string;
      sourcePageType: string;
      sourcePageId?: string;
      sourceUrl: string;
      targetPageType: string;
      targetPageId?: string;
      targetUrl: string;
      anchorText: string;
      context?: string;
      linkType: string;
      relevanceScore?: number;
    }>
  ): Promise<{ count: number }> {
    return this.prisma.internalLink.createMany({
      data: links,
      skipDuplicates: true, // Skip if link already exists
    });
  }

  /**
   * Get all links from a source page
   */
  async getOutboundLinks(sourceUrl: string): Promise<InternalLink[]> {
    return this.prisma.internalLink.findMany({
      where: { sourceUrl },
      orderBy: { relevanceScore: 'desc' },
    });
  }

  /**
   * Get all links to a target page
   */
  async getInboundLinks(targetUrl: string): Promise<InternalLink[]> {
    return this.prisma.internalLink.findMany({
      where: { targetUrl },
      orderBy: { relevanceScore: 'desc' },
    });
  }

  /**
   * Get all links for an organization
   */
  async getByOrganization(
    organizationId: string,
    filters?: {
      linkType?: string;
      pageType?: string;
      minRelevance?: number;
      limit?: number;
    }
  ): Promise<InternalLink[]> {
    const { linkType, pageType, minRelevance, limit = 100 } = filters || {};

    return this.prisma.internalLink.findMany({
      where: {
        organizationId,
        ...(linkType && { linkType }),
        ...(pageType && {
          OR: [
            { sourcePageType: pageType },
            { targetPageType: pageType },
          ],
        }),
        ...(minRelevance && { relevanceScore: { gte: minRelevance } }),
      },
      take: limit,
      orderBy: { relevanceScore: 'desc' },
    });
  }

  /**
   * Find orphan pages (pages with no inbound links)
   */
  async findOrphanPages(organizationId: string): Promise<string[]> {
    // Get all published QA pages
    const allPages = await this.prisma.qAPage.findMany({
      where: {
        organizationId,
        status: 'published',
      },
      select: { shopifyUrl: true },
    });

    // Get pages with inbound links
    const pagesWithLinks = await this.prisma.internalLink.findMany({
      where: { organizationId },
      select: { targetUrl: true },
      distinct: ['targetUrl'],
    });

    const pagesWithLinksSet = new Set(pagesWithLinks.map(l => l.targetUrl));

    // Find pages without inbound links
    return allPages
      .filter(page => page.shopifyUrl && !pagesWithLinksSet.has(page.shopifyUrl))
      .map(page => page.shopifyUrl!);
  }

  /**
   * Get link graph statistics for a page
   */
  async getPageLinkStats(pageUrl: string): Promise<{
    inboundCount: number;
    outboundCount: number;
    avgInboundRelevance: number;
    avgOutboundRelevance: number;
  }> {
    const [inboundLinks, outboundLinks] = await Promise.all([
      this.prisma.internalLink.findMany({ where: { targetUrl: pageUrl } }),
      this.prisma.internalLink.findMany({ where: { sourceUrl: pageUrl } }),
    ]);

    const avgInboundRelevance = inboundLinks.length > 0
      ? inboundLinks.reduce((sum, link) => sum + Number(link.relevanceScore || 0), 0) / inboundLinks.length
      : 0;

    const avgOutboundRelevance = outboundLinks.length > 0
      ? outboundLinks.reduce((sum, link) => sum + Number(link.relevanceScore || 0), 0) / outboundLinks.length
      : 0;

    return {
      inboundCount: inboundLinks.length,
      outboundCount: outboundLinks.length,
      avgInboundRelevance,
      avgOutboundRelevance,
    };
  }

  /**
   * Find potential linking opportunities
   * (pages that could link to each other based on topic similarity)
   */
  async findLinkingOpportunities(
    organizationId: string,
    targetPageUrl: string,
    limit: number = 10
  ): Promise<{
    sourceUrl: string;
    question: string;
    targetKeyword?: string;
    currentLinks: number;
  }[]> {
    // Get the target page
    const targetPage = await this.prisma.qAPage.findFirst({
      where: { organizationId, shopifyUrl: targetPageUrl },
    });

    if (!targetPage) return [];

    // Find pages with similar keywords that don't already link to target
    const existingLinks = await this.prisma.internalLink.findMany({
      where: { targetUrl: targetPageUrl },
      select: { sourceUrl: true },
    });

    const excludeUrls = existingLinks.map(l => l.sourceUrl);

    const potentialSources = await this.prisma.qAPage.findMany({
      where: {
        organizationId,
        status: 'published',
        shopifyUrl: { notIn: [...excludeUrls, targetPageUrl] },
        ...(targetPage.targetKeyword && {
          OR: [
            { question: { contains: targetPage.targetKeyword, mode: 'insensitive' } },
            { answerContent: { contains: targetPage.targetKeyword, mode: 'insensitive' } },
          ],
        }),
      },
      select: {
        shopifyUrl: true,
        question: true,
        targetKeyword: true,
        internalLinksSource: {
          select: { id: true },
        },
      },
      take: limit,
    });

    return potentialSources
      .filter(p => p.shopifyUrl)
      .map(p => ({
        sourceUrl: p.shopifyUrl!,
        question: p.question,
        targetKeyword: p.targetKeyword || undefined,
        currentLinks: p.internalLinksSource.length,
      }));
  }

  /**
   * Update link relevance score
   */
  async updateRelevanceScore(linkId: string, relevanceScore: number): Promise<InternalLink> {
    return this.prisma.internalLink.update({
      where: { id: linkId },
      data: { relevanceScore },
    });
  }

  /**
   * Delete a specific link
   */
  async delete(linkId: string): Promise<void> {
    await this.prisma.internalLink.delete({
      where: { id: linkId },
    });
  }

  /**
   * Delete all links for a page (when page is deleted or unpublished)
   */
  async deleteLinksForPage(pageUrl: string): Promise<{ count: number }> {
    return this.prisma.internalLink.deleteMany({
      where: {
        OR: [
          { sourceUrl: pageUrl },
          { targetUrl: pageUrl },
        ],
      },
    });
  }

  /**
   * Get link graph for visualization
   * Returns nodes and edges for graph visualization
   */
  async getLinkGraph(organizationId: string): Promise<{
    nodes: Array<{ id: string; label: string; type: string }>;
    edges: Array<{ from: string; to: string; label: string; relevance: number }>;
  }> {
    const links = await this.prisma.internalLink.findMany({
      where: { organizationId },
    });

    const nodes = new Map<string, { id: string; label: string; type: string }>();
    const edges = links.map(link => {
      // Add source node
      if (!nodes.has(link.sourceUrl)) {
        nodes.set(link.sourceUrl, {
          id: link.sourceUrl,
          label: link.sourceUrl.split('/').pop() || link.sourceUrl,
          type: link.sourcePageType,
        });
      }

      // Add target node
      if (!nodes.has(link.targetUrl)) {
        nodes.set(link.targetUrl, {
          id: link.targetUrl,
          label: link.targetUrl.split('/').pop() || link.targetUrl,
          type: link.targetPageType,
        });
      }

      return {
        from: link.sourceUrl,
        to: link.targetUrl,
        label: link.anchorText,
        relevance: Number(link.relevanceScore || 0),
      };
    });

    return {
      nodes: Array.from(nodes.values()),
      edges,
    };
  }

  /**
   * Get pages that need more internal links
   * (pages with fewer than minimum inbound links)
   */
  async getPagesNeedingLinks(
    organizationId: string,
    minimumInboundLinks: number = 3
  ): Promise<{
    url: string;
    question: string;
    currentInboundLinks: number;
  }[]> {
    const publishedPages = await this.prisma.qAPage.findMany({
      where: {
        organizationId,
        status: 'published',
      },
      select: {
        shopifyUrl: true,
        question: true,
      },
    });

    const results = await Promise.all(
      publishedPages
        .filter(p => p.shopifyUrl)
        .map(async page => {
          const inboundCount = await this.prisma.internalLink.count({
            where: { targetUrl: page.shopifyUrl! },
          });

          return {
            url: page.shopifyUrl!,
            question: page.question,
            currentInboundLinks: inboundCount,
          };
        })
    );

    return results.filter(r => r.currentInboundLinks < minimumInboundLinks);
  }

  /**
   * Check if link already exists
   */
  async linkExists(sourceUrl: string, targetUrl: string, anchorText: string): Promise<boolean> {
    const link = await this.prisma.internalLink.findFirst({
      where: {
        sourceUrl,
        targetUrl,
        anchorText,
      },
    });

    return link !== null;
  }

  /**
   * Find link by source and target page IDs
   */
  async findBySourceAndTarget(sourcePageId: string, targetPageId: string): Promise<InternalLink | null> {
    return this.prisma.internalLink.findFirst({
      where: {
        sourcePageId,
        targetPageId,
      },
    });
  }
}
