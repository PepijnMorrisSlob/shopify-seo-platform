/**
 * Q&A Page Repository
 * Database operations for question-answer content pages
 */

import { PrismaClient, QAPage } from '@prisma/client';

export class QAPageRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new Q&A page
   */
  async create(data: {
    organizationId: string;
    question: string;
    answerContent?: string;
    answerMarkdown?: string;
    featuredImageUrl?: string;
    targetKeyword?: string;
    metaTitle?: string;
    metaDescription?: string;
    h1?: string;
    schemaMarkup?: any;
    seoScore?: number;
    status?: 'draft' | 'pending_review' | 'published' | 'archived';
  }): Promise<QAPage> {
    return this.prisma.qAPage.create({
      data: {
        organizationId: data.organizationId,
        question: data.question,
        answerContent: data.answerContent,
        answerMarkdown: data.answerMarkdown,
        featuredImageUrl: data.featuredImageUrl,
        targetKeyword: data.targetKeyword,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        h1: data.h1,
        schemaMarkup: data.schemaMarkup,
        seoScore: data.seoScore,
        status: data.status || 'draft',
      },
    });
  }

  /**
   * Get Q&A page by ID
   */
  async getById(id: string): Promise<QAPage | null> {
    return this.prisma.qAPage.findUnique({
      where: { id },
    });
  }

  /**
   * Get all Q&A pages for an organization
   */
  async getByOrganization(
    organizationId: string,
    filters?: {
      status?: string;
      limit?: number;
      offset?: number;
      orderBy?: 'created_at' | 'monthly_traffic' | 'seo_score';
      orderDirection?: 'asc' | 'desc';
    }
  ): Promise<QAPage[]> {
    const { status, limit = 50, offset = 0, orderBy = 'created_at', orderDirection = 'desc' } = filters || {};

    return this.prisma.qAPage.findMany({
      where: {
        organizationId,
        ...(status && { status }),
      },
      orderBy: {
        [orderBy]: orderDirection,
      },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get Q&A pages by status
   */
  async getByStatus(
    organizationId: string,
    status: 'draft' | 'pending_review' | 'published' | 'archived'
  ): Promise<QAPage[]> {
    return this.prisma.qAPage.findMany({
      where: {
        organizationId,
        status,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get top performing pages
   */
  async getTopPerformers(organizationId: string, limit: number = 10): Promise<QAPage[]> {
    return this.prisma.qAPage.findMany({
      where: {
        organizationId,
        status: 'published',
      },
      orderBy: { monthlyTraffic: 'desc' },
      take: limit,
    });
  }

  /**
   * Get underperforming pages (low traffic, declining rankings)
   */
  async getUnderperformers(organizationId: string): Promise<QAPage[]> {
    return this.prisma.qAPage.findMany({
      where: {
        organizationId,
        status: 'published',
        OR: [
          { monthlyTraffic: { lt: 10 } },
          { currentPosition: { gt: 20 } },
          { seoScore: { lt: 70 } },
        ],
      },
      orderBy: { monthlyTraffic: 'asc' },
    });
  }

  /**
   * Update Q&A page
   */
  async update(
    id: string,
    data: Partial<{
      question: string;
      answerContent: string;
      answerMarkdown: string;
      featuredImageUrl: string;
      shopifyBlogId: string;
      shopifyBlogPostId: string;
      shopifyPageId: string;
      shopifyUrl: string;
      targetKeyword: string;
      metaTitle: string;
      metaDescription: string;
      h1: string;
      schemaMarkup: any;
      currentPosition: number;
      bestPosition: number;
      monthlyImpressions: number;
      monthlyClicks: number;
      monthlyTraffic: number;
      ctr: number;
      seoScore: number;
      status: 'draft' | 'pending_review' | 'published' | 'archived';
      publishedAt: Date;
      lastOptimizedAt: Date;
    }>
  ): Promise<QAPage> {
    return this.prisma.qAPage.update({
      where: { id },
      data,
    });
  }

  /**
   * Publish a Q&A page to Shopify
   */
  async publish(
    id: string,
    shopifyData: {
      shopifyBlogId: string;
      shopifyBlogPostId: string;
      shopifyUrl: string;
    }
  ): Promise<QAPage> {
    return this.prisma.qAPage.update({
      where: { id },
      data: {
        ...shopifyData,
        status: 'published',
        publishedAt: new Date(),
      },
    });
  }

  /**
   * Update performance metrics
   */
  async updateMetrics(
    id: string,
    metrics: {
      currentPosition?: number;
      bestPosition?: number;
      monthlyImpressions?: number;
      monthlyClicks?: number;
      monthlyTraffic?: number;
      ctr?: number;
    }
  ): Promise<QAPage> {
    const updateData: any = { ...metrics };

    // Auto-update best position if current is better
    if (metrics.currentPosition) {
      const page = await this.getById(id);
      if (page && (!page.bestPosition || metrics.currentPosition < page.bestPosition)) {
        updateData.bestPosition = metrics.currentPosition;
      }
    }

    return this.prisma.qAPage.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Mark page as optimized
   */
  async markOptimized(id: string): Promise<QAPage> {
    return this.prisma.qAPage.update({
      where: { id },
      data: {
        lastOptimizedAt: new Date(),
      },
    });
  }

  /**
   * Get pages needing optimization
   */
  async getNeedingOptimization(organizationId: string): Promise<QAPage[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.prisma.qAPage.findMany({
      where: {
        organizationId,
        status: 'published',
        OR: [
          { lastOptimizedAt: null },
          { lastOptimizedAt: { lt: thirtyDaysAgo } },
        ],
        currentPosition: { gt: 10 }, // Not ranking in top 10
      },
    });
  }

  /**
   * Search Q&A pages by keyword
   */
  async searchByKeyword(organizationId: string, keyword: string): Promise<QAPage[]> {
    return this.prisma.qAPage.findMany({
      where: {
        organizationId,
        OR: [
          { question: { contains: keyword, mode: 'insensitive' } },
          { targetKeyword: { contains: keyword, mode: 'insensitive' } },
          { answerContent: { contains: keyword, mode: 'insensitive' } },
        ],
      },
    });
  }

  /**
   * Get page with performance data
   */
  async getWithPerformance(id: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.prisma.qAPage.findUnique({
      where: { id },
      include: {
        contentPerformance: {
          where: {
            date: { gte: startDate },
          },
          orderBy: { date: 'desc' },
        },
      },
    });
  }

  /**
   * Get page with internal links
   */
  async getWithLinks(id: string) {
    return this.prisma.qAPage.findUnique({
      where: { id },
      include: {
        internalLinksSource: true,
      },
    });
  }

  /**
   * Get page with A/B tests
   */
  async getWithABTests(id: string) {
    return this.prisma.qAPage.findUnique({
      where: { id },
      include: {
        abTests: {
          where: { status: 'running' },
        },
      },
    });
  }

  /**
   * Delete Q&A page
   */
  async delete(id: string): Promise<void> {
    await this.prisma.qAPage.delete({
      where: { id },
    });
  }

  /**
   * Get count of pages by status
   */
  async getCountByStatus(organizationId: string): Promise<{
    draft: number;
    pending_review: number;
    published: number;
    archived: number;
  }> {
    const [draft, pendingReview, published, archived] = await Promise.all([
      this.prisma.qAPage.count({ where: { organizationId, status: 'draft' } }),
      this.prisma.qAPage.count({ where: { organizationId, status: 'pending_review' } }),
      this.prisma.qAPage.count({ where: { organizationId, status: 'published' } }),
      this.prisma.qAPage.count({ where: { organizationId, status: 'archived' } }),
    ]);

    return {
      draft,
      pending_review: pendingReview,
      published,
      archived,
    };
  }

  /**
   * Get total traffic for organization
   */
  async getTotalTraffic(organizationId: string): Promise<number> {
    const result = await this.prisma.qAPage.aggregate({
      where: { organizationId, status: 'published' },
      _sum: { monthlyTraffic: true },
    });

    return result._sum.monthlyTraffic || 0;
  }
}
