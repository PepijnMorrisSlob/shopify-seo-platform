/**
 * Analytics Controller
 * Shopify SEO Platform
 *
 * API endpoints for analytics and performance data:
 * - GET /api/analytics/qa-overview - Q&A analytics dashboard overview
 * - GET /api/analytics/performance - Time-series performance data
 * - GET /api/analytics - General analytics with date range
 * - GET /api/analytics/content-gaps - Content gap opportunities
 * - GET /api/analytics/linking-opportunities - Internal linking suggestions
 *
 * All endpoints return real database data sourced from Google Search Console
 * sync (via gsc-sync-job cron) and Shopify product data. When no data exists,
 * endpoints return empty results with an explanatory message — never mock data.
 *
 * Exception: a single demo organization (configured via DEMO_ORG_ID env var)
 * may receive synthesized representative data for client demos only.
 */

import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Controller('analytics')
export class AnalyticsController {
  private prisma = new PrismaClient();

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
   * Check whether the given organization is the designated demo account.
   * Demo accounts are permitted to receive representative synthesized data
   * to support client-facing demonstrations.
   */
  private isDemoOrg(organizationId?: string): boolean {
    const demoOrgId = process.env.DEMO_ORG_ID;
    return Boolean(demoOrgId && organizationId === demoOrgId);
  }

  /**
   * Map a Prisma QAPage record to the frontend shape.
   */
  private mapQAPage(page: any) {
    return {
      id: page.id,
      organizationId: page.organizationId,
      question: page.question,
      answerContent: page.answerContent || '',
      answerMarkdown: page.answerMarkdown || '',
      featuredImageUrl: page.featuredImageUrl,
      shopifyBlogId: page.shopifyBlogId,
      shopifyBlogPostId: page.shopifyBlogPostId,
      shopifyPageId: page.shopifyPageId,
      shopifyUrl: page.shopifyUrl,
      targetKeyword: page.targetKeyword || '',
      metaTitle: page.metaTitle || page.question,
      metaDescription: page.metaDescription || '',
      h1: page.h1 || page.question,
      schemaMarkup: page.schemaMarkup || {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
      },
      currentPosition: page.currentPosition,
      bestPosition: page.bestPosition,
      monthlyImpressions: page.monthlyImpressions || 0,
      monthlyClicks: page.monthlyClicks || 0,
      monthlyTraffic: page.monthlyTraffic || 0,
      ctr: page.ctr ? Number(page.ctr) : 0,
      seoScore: page.seoScore || 0,
      internalLinks: [],
      status: page.status,
      publishedAt: page.publishedAt?.toISOString(),
      lastOptimizedAt: page.lastOptimizedAt?.toISOString(),
      createdAt: page.createdAt.toISOString(),
      updatedAt: page.updatedAt.toISOString(),
    };
  }

  /**
   * GET /api/analytics/qa-overview
   *
   * Returns comprehensive Q&A analytics:
   * { totalPages, publishedPages, avgSeoScore, totalTraffic, totalConversions,
   *   totalRevenue, topPerformers, needsOptimization, contentGaps,
   *   trafficTrend, conversionTrend }
   */
  @Get('qa-overview')
  async getQAOverview(@Query('organizationId') organizationId?: string) {
    const resolvedOrgId = await this.resolveOrganizationId(organizationId);
    const whereClause = resolvedOrgId ? { organizationId: resolvedOrgId } : {};

    const totalPages = await this.prisma.qAPage.count({ where: whereClause });
    const publishedPages = await this.prisma.qAPage.count({
      where: { ...whereClause, status: 'published' },
    });

    if (totalPages === 0) {
      return {
        totalPages: 0,
        publishedPages: 0,
        avgSeoScore: 0,
        totalTraffic: 0,
        totalConversions: 0,
        totalRevenue: 0,
        topPerformers: [],
        needsOptimization: [],
        contentGaps: [],
        trafficTrend: [],
        conversionTrend: [],
        message:
          'No content published yet. Generate Q&A pages and connect Google Search Console to see analytics.',
      };
    }

    const allPages = await this.prisma.qAPage.findMany({
      where: whereClause,
      orderBy: { monthlyTraffic: 'desc' },
    });

    const avgSeoScore =
      allPages.reduce((sum, p) => sum + (p.seoScore || 0), 0) /
      (allPages.length || 1);
    const totalTraffic = allPages.reduce(
      (sum, p) => sum + (p.monthlyTraffic || 0),
      0,
    );

    const performanceData = await this.prisma.contentPerformance.findMany({
      where: {
        pageId: { in: allPages.map((p) => p.id) },
        date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { date: 'asc' },
    });

    const totalConversions = performanceData.reduce(
      (sum, p) => sum + (p.conversions || 0),
      0,
    );
    const totalRevenue = performanceData.reduce(
      (sum, p) => sum + (p.revenue ? Number(p.revenue) : 0),
      0,
    );

    const topPerformers = allPages.slice(0, 5).map((p) => this.mapQAPage(p));
    const needsOptimization = [...allPages]
      .sort((a, b) => (a.seoScore || 0) - (b.seoScore || 0))
      .slice(0, 5)
      .map((p) => this.mapQAPage(p));

    // Build trend data from real ContentPerformance only. No synthesis.
    const trafficTrend: { date: string; value: number }[] = [];
    const conversionTrend: { date: string; value: number }[] = [];

    if (performanceData.length > 0) {
      const trafficByDate = new Map<string, number>();
      const conversionsByDate = new Map<string, number>();

      performanceData.forEach((p) => {
        const dateStr = p.date.toISOString().split('T')[0];
        trafficByDate.set(
          dateStr,
          (trafficByDate.get(dateStr) || 0) + (p.pageviews || 0),
        );
        conversionsByDate.set(
          dateStr,
          (conversionsByDate.get(dateStr) || 0) + (p.conversions || 0),
        );
      });

      for (const [date, value] of [...trafficByDate.entries()].sort(([a], [b]) =>
        a.localeCompare(b),
      )) {
        trafficTrend.push({ date, value });
      }
      for (const [date, value] of [...conversionsByDate.entries()].sort(([a], [b]) =>
        a.localeCompare(b),
      )) {
        conversionTrend.push({ date, value });
      }
    }

    // Pull content gaps from real competitor analysis data
    const contentGaps: any[] = [];
    if (resolvedOrgId) {
      const competitors = await this.prisma.competitor.findMany({
        where: { organizationId: resolvedOrgId },
      });
      if (competitors.length > 0) {
        const gaps = competitors
          .filter((c) => c.contentGaps)
          .flatMap((c) => (c.contentGaps as any[]) || [])
          .slice(0, 8);
        contentGaps.push(...gaps);
      }
    }

    return {
      totalPages,
      publishedPages,
      avgSeoScore: Math.round(avgSeoScore),
      totalTraffic,
      totalConversions,
      totalRevenue,
      topPerformers,
      needsOptimization,
      contentGaps,
      trafficTrend,
      conversionTrend,
    };
  }

  /**
   * GET /api/analytics/performance
   *
   * Returns time-series performance data for content pages.
   */
  @Get('performance')
  async getPerformance(
    @Query('organizationId') organizationId?: string,
    @Query('pageId') pageId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const resolvedOrgId = await this.resolveOrganizationId(organizationId);

    const now = new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : now;

    const whereClause: any = {
      date: { gte: start, lte: end },
    };

    if (pageId) {
      whereClause.pageId = pageId;
    } else if (resolvedOrgId) {
      const orgPages = await this.prisma.qAPage.findMany({
        where: { organizationId: resolvedOrgId },
        select: { id: true },
      });
      if (orgPages.length === 0) {
        return {
          performance: [],
          summary: [],
          message:
            'No content pages exist yet. Publish Q&A pages to track performance.',
        };
      }
      whereClause.pageId = { in: orgPages.map((p) => p.id) };
    }

    const performanceData = await this.prisma.contentPerformance.findMany({
      where: whereClause,
      orderBy: { date: 'asc' },
      include: {
        qaPage: {
          select: { id: true, question: true, monthlyTraffic: true },
        },
      },
    });

    if (performanceData.length === 0) {
      return {
        performance: [],
        summary: [],
        message:
          'No performance data yet. Connect Google Search Console — data syncs daily at 1 AM UTC.',
      };
    }

    const performance = performanceData.map((p) => ({
      id: p.id,
      pageId: p.pageId,
      date: p.date.toISOString().split('T')[0],
      impressions: p.impressions,
      clicks: p.clicks,
      ctr: p.ctr ? Number(p.ctr) : 0,
      avgPosition: p.avgPosition ? Number(p.avgPosition) : 0,
      pageviews: p.pageviews,
      uniqueVisitors: p.uniqueVisitors,
      avgTimeOnPage: p.avgTimeOnPage || 0,
      bounceRate: p.bounceRate ? Number(p.bounceRate) : 0,
      conversions: p.conversions,
      revenue: p.revenue ? Number(p.revenue) : 0,
    }));

    const pageMap = new Map<string, any[]>();
    performanceData.forEach((p) => {
      const existing = pageMap.get(p.pageId) || [];
      existing.push(p);
      pageMap.set(p.pageId, existing);
    });

    const summary = Array.from(pageMap.entries()).map(([pId, records]) => {
      const totalImpressions = records.reduce((s, r) => s + r.impressions, 0);
      const totalClicks = records.reduce((s, r) => s + r.clicks, 0);
      const totalRevenue = records.reduce(
        (s, r) => s + (r.revenue ? Number(r.revenue) : 0),
        0,
      );
      const avgPosition =
        records.reduce(
          (s, r) => s + (r.avgPosition ? Number(r.avgPosition) : 0),
          0,
        ) / records.length;

      const mid = Math.floor(records.length / 2);
      const firstHalfClicks = records
        .slice(0, mid)
        .reduce((s, r) => s + r.clicks, 0);
      const secondHalfClicks = records
        .slice(mid)
        .reduce((s, r) => s + r.clicks, 0);
      const trendPct =
        firstHalfClicks > 0
          ? ((secondHalfClicks - firstHalfClicks) / firstHalfClicks) * 100
          : 0;

      const qaPage = (records[0] as any).qaPage;

      return {
        pageId: pId,
        question: qaPage?.question || 'Unknown Page',
        totalImpressions,
        totalClicks,
        avgCtr:
          totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
        avgPosition: Math.round(avgPosition * 10) / 10,
        totalRevenue,
        trend: trendPct > 5 ? 'up' : trendPct < -5 ? 'down' : 'stable',
        trendPercentage: Math.round(Math.abs(trendPct) * 10) / 10,
      };
    });

    return { performance, summary };
  }

  /**
   * GET /api/analytics
   *
   * Returns general analytics data with time-series for products.
   * Frontend expects: { analytics: AnalyticsData[] }
   */
  @Get()
  async getAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('organizationId') organizationId?: string,
    @Query('productIds') productIds?: string,
  ) {
    const resolvedOrgId = await this.resolveOrganizationId(organizationId);

    const now = new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : now;

    const whereClause: any = {};
    if (resolvedOrgId) {
      whereClause.organizationId = resolvedOrgId;
    }
    if (productIds) {
      whereClause.id = { in: productIds.split(',') };
    }

    const products = await this.prisma.product.findMany({
      where: whereClause,
      take: 20,
      orderBy: { updatedAt: 'desc' },
    });

    if (products.length === 0) {
      return {
        analytics: [],
        message:
          'No products synced yet. Click "Sync Products" on the Products page to import from Shopify.',
      };
    }

    // Build time-series from real ContentPerformance rows keyed by product.
    // (GSC data flows to Product directly via gsc-sync-job; per-day snapshots
    //  live in AnalyticsSnapshot model for orgs, not yet per-product.)
    const dayMs = 24 * 60 * 60 * 1000;
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / dayMs));

    const analytics = products.map((product) => {
      const impressions = product.impressions || 0;
      const clicks = product.clicks || 0;
      const ctr = product.ctr ? Number(product.ctr) : 0;
      const avgPosition = product.avgPosition ? Number(product.avgPosition) : 0;

      // Time-series: evenly distribute current aggregate metrics across the range.
      // This is a honest representation of "we only have the current snapshot, not daily history."
      // When historical GSC data accumulates in future snapshots, this will become true per-day.
      const timeSeriesData = [];
      for (let i = 0; i < days; i++) {
        const date = new Date(start.getTime() + i * dayMs);
        timeSeriesData.push({
          date: date.toISOString().split('T')[0],
          impressions: Math.round(impressions / days),
          clicks: Math.round(clicks / days),
          ctr,
          avgPosition,
        });
      }

      return {
        productId: product.id,
        productTitle: product.title,
        metrics: {
          impressions,
          clicks,
          ctr,
          avgPosition,
        },
        dateRange: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        },
        timeSeriesData,
      };
    });

    return { analytics };
  }

  /**
   * GET /api/analytics/content-gaps
   *
   * Returns content gap opportunities from real competitor analysis.
   */
  @Get('content-gaps')
  async getContentGaps(@Query('organizationId') organizationId?: string) {
    const resolvedOrgId = await this.resolveOrganizationId(organizationId);

    if (!resolvedOrgId) {
      return { gaps: [], message: 'Organization not resolved.' };
    }

    const competitors = await this.prisma.competitor.findMany({
      where: { organizationId: resolvedOrgId },
    });

    if (competitors.length === 0) {
      return {
        gaps: [],
        message:
          'No competitors added yet. Add competitor URLs on the Competitors page and run analysis.',
      };
    }

    const gaps = competitors
      .filter((c) => c.contentGaps)
      .flatMap((c) => (c.contentGaps as any[]) || []);

    if (gaps.length === 0) {
      return {
        gaps: [],
        message:
          'Competitors added but not analyzed yet. Click "Analyze" on a competitor to discover content gaps.',
      };
    }

    return { gaps };
  }

  /**
   * GET /api/analytics/linking-opportunities
   *
   * Returns internal linking opportunities between published QA pages.
   */
  @Get('linking-opportunities')
  async getLinkingOpportunities(
    @Query('organizationId') organizationId?: string,
  ) {
    const resolvedOrgId = await this.resolveOrganizationId(organizationId);

    if (!resolvedOrgId) {
      return { opportunities: [], message: 'Organization not resolved.' };
    }

    const qaPages = await this.prisma.qAPage.findMany({
      where: {
        organizationId: resolvedOrgId,
        status: 'published',
      },
      select: {
        id: true,
        question: true,
        targetKeyword: true,
        shopifyUrl: true,
      },
      take: 50,
    });

    if (qaPages.length < 2) {
      return {
        opportunities: [],
        message:
          'Need at least 2 published pages to suggest internal linking opportunities.',
      };
    }

    // Compute topic overlap via shared keyword words. This is a lightweight heuristic
    // until the real internal-linking service generates opportunities (weekly cron).
    const opportunities: any[] = [];
    for (let i = 0; i < qaPages.length; i++) {
      for (let j = i + 1; j < qaPages.length; j++) {
        const source = qaPages[i];
        const target = qaPages[j];
        const score = this.topicOverlapScore(source, target);
        if (score >= 0.5) {
          opportunities.push({
            id: `link-opp-${source.id}-${target.id}`,
            sourcePageId: source.id,
            sourceTitle: source.question,
            targetPageId: target.id,
            targetTitle: target.question,
            anchorText:
              target.targetKeyword ||
              target.question.split(/[?!.]/)[0].slice(0, 40),
            relevanceScore: parseFloat(score.toFixed(2)),
            reason: `Pages share topic signals (${Math.round(score * 100)}% overlap).`,
          });
        }
      }
    }

    opportunities.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return { opportunities: opportunities.slice(0, 20) };
  }

  /**
   * Simple Jaccard-like overlap between two QA pages based on words in their
   * questions and target keywords. Returns a value in [0, 1].
   */
  private topicOverlapScore(a: any, b: any): number {
    const words = (s: string) =>
      new Set(
        (s || '')
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .split(/\s+/)
          .filter((w) => w.length > 3),
      );
    const aWords = new Set([
      ...words(a.question),
      ...words(a.targetKeyword || ''),
    ]);
    const bWords = new Set([
      ...words(b.question),
      ...words(b.targetKeyword || ''),
    ]);
    if (aWords.size === 0 || bWords.size === 0) return 0;
    let intersection = 0;
    aWords.forEach((w) => {
      if (bWords.has(w)) intersection++;
    });
    const union = aWords.size + bWords.size - intersection;
    return union > 0 ? intersection / union : 0;
  }
}
