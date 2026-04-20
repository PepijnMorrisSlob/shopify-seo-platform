/**
 * Report Generation Service
 *
 * Generates monthly SEO performance PDF reports for client stores.
 * Reports are delivered via email (monthly-report-job cron) and downloadable
 * from the client dashboard.
 *
 * Report sections:
 *   1. Executive summary (traffic, published content, avg SEO score)
 *   2. Top performing pages
 *   3. Keyword rankings + position changes
 *   4. Content published this month
 *   5. Recommendations for next month
 *
 * Branded with agency logo + colors sourced from business profile.
 */

import { PrismaClient } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { Logger } from '@nestjs/common';

export interface MonthlyReportOptions {
  organizationId: string;
  month?: Date; // Defaults to previous month
}

export interface ReportMetrics {
  totalImpressions: number;
  totalClicks: number;
  avgCtr: number;
  avgPosition: number;
  monthlyTraffic: number;
  publishedThisMonth: number;
  totalPublished: number;
  avgSeoScore: number;
  topKeywords: Array<{ keyword: string; position: number; clicks: number }>;
  topPages: Array<{ title: string; url: string | null; traffic: number; seoScore: number }>;
  newContent: Array<{ title: string; publishedAt: Date; seoScore: number }>;
  positionChanges: Array<{ keyword: string; from: number; to: number; delta: number }>;
}

const BRAND_COLORS = {
  primary: '#18181b', // zinc-900
  accent: '#2563eb',  // blue-600
  emerald: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  muted: '#a1a1aa',
  border: '#e4e4e7',
  bg: '#fafafa',
};

export class ReportGenerationService {
  private readonly logger = new Logger(ReportGenerationService.name);
  private readonly prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Collect all metrics for a monthly report. Uses real GSC + DB data —
   * no synthesis. Returns zeros/empty arrays when data is missing.
   */
  async collectMetrics(
    organizationId: string,
    month: Date,
  ): Promise<ReportMetrics> {
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);

    // 1. Content performance across the month (GSC data)
    const orgPages = await this.prisma.qAPage.findMany({
      where: { organizationId },
      select: { id: true, question: true, shopifyUrl: true, seoScore: true, monthlyTraffic: true },
    });

    const performance = await this.prisma.contentPerformance.findMany({
      where: {
        pageId: { in: orgPages.map((p) => p.id) },
        date: { gte: monthStart, lte: monthEnd },
      },
    });

    const totalImpressions = performance.reduce((sum, p) => sum + p.impressions, 0);
    const totalClicks = performance.reduce((sum, p) => sum + p.clicks, 0);
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const positionsWithData = performance.filter((p) => p.avgPosition);
    const avgPosition =
      positionsWithData.length > 0
        ? positionsWithData.reduce((sum, p) => sum + Number(p.avgPosition), 0) /
          positionsWithData.length
        : 0;

    const monthlyTraffic = orgPages.reduce(
      (sum, p) => sum + (p.monthlyTraffic || 0),
      0,
    );

    // 2. Published content
    const publishedThisMonth = await this.prisma.qAPage.count({
      where: {
        organizationId,
        status: 'published',
        publishedAt: { gte: monthStart, lte: monthEnd },
      },
    });

    const totalPublished = await this.prisma.qAPage.count({
      where: { organizationId, status: 'published' },
    });

    const scoredPages = orgPages.filter((p) => p.seoScore !== null);
    const avgSeoScore =
      scoredPages.length > 0
        ? scoredPages.reduce((sum, p) => sum + (p.seoScore || 0), 0) /
          scoredPages.length
        : 0;

    // 3. Top keywords — aggregated across all pages for the month
    const keywords = await this.prisma.keyword.findMany({
      where: {
        organizationId,
        dataSource: 'google_search_console',
        impressions: { gt: 0 },
      },
      orderBy: { clicks: 'desc' },
      take: 10,
    });
    const topKeywords = keywords.map((k) => ({
      keyword: k.keyword,
      position: k.currentPosition || 0,
      clicks: k.clicks || 0,
    }));

    // 4. Top pages
    const pageTraffic = new Map<string, number>();
    performance.forEach((p) => {
      pageTraffic.set(p.pageId, (pageTraffic.get(p.pageId) || 0) + p.clicks);
    });
    const topPages = orgPages
      .map((p) => ({
        title: p.question,
        url: p.shopifyUrl,
        traffic: pageTraffic.get(p.id) || 0,
        seoScore: p.seoScore || 0,
      }))
      .sort((a, b) => b.traffic - a.traffic)
      .slice(0, 5);

    // 5. New content this month
    const newContentPages = await this.prisma.qAPage.findMany({
      where: {
        organizationId,
        publishedAt: { gte: monthStart, lte: monthEnd },
      },
      select: { question: true, publishedAt: true, seoScore: true },
      orderBy: { publishedAt: 'desc' },
      take: 20,
    });
    const newContent = newContentPages.map((p) => ({
      title: p.question,
      publishedAt: p.publishedAt || new Date(),
      seoScore: p.seoScore || 0,
    }));

    // 6. Position changes (keywords where previous vs current differs)
    const keywordsWithChange = await this.prisma.keyword.findMany({
      where: {
        organizationId,
        previousPosition: { not: null },
        currentPosition: { not: null },
      },
    });
    const positionChanges = keywordsWithChange
      .map((k) => ({
        keyword: k.keyword,
        from: k.previousPosition || 0,
        to: k.currentPosition || 0,
        delta: (k.previousPosition || 0) - (k.currentPosition || 0),
      }))
      .filter((c) => c.delta !== 0)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 10);

    return {
      totalImpressions,
      totalClicks,
      avgCtr,
      avgPosition,
      monthlyTraffic,
      publishedThisMonth,
      totalPublished,
      avgSeoScore,
      topKeywords,
      topPages,
      newContent,
      positionChanges,
    };
  }

  /**
   * Render a monthly report to a PDF Buffer.
   */
  async generateMonthlyPDF(
    options: MonthlyReportOptions,
  ): Promise<{ buffer: Buffer; filename: string; metrics: ReportMetrics }> {
    const reportDate = options.month || this.previousMonth();

    const org = await this.prisma.organization.findUnique({
      where: { id: options.organizationId },
      include: { businessProfile: true },
    });
    if (!org) {
      throw new Error(`Organization ${options.organizationId} not found`);
    }

    const metrics = await this.collectMetrics(options.organizationId, reportDate);

    const monthLabel = reportDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
    const storeName = org.storeName || org.shopifyDomain;
    const filename = `seo-report-${org.shopifyDomain}-${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, '0')}.pdf`;

    const buffer = await this.renderPDF({
      storeName,
      shopifyDomain: org.shopifyDomain,
      monthLabel,
      metrics,
    });

    this.logger.log(
      `Generated report for ${org.shopifyDomain} (${monthLabel}): ${(buffer.length / 1024).toFixed(1)}KB`,
    );

    return { buffer, filename, metrics };
  }

  private renderPDF(data: {
    storeName: string;
    shopifyDomain: string;
    monthLabel: string;
    metrics: ReportMetrics;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const { storeName, shopifyDomain, monthLabel, metrics } = data;

      // ============ HEADER ============
      doc
        .fillColor(BRAND_COLORS.primary)
        .fontSize(28)
        .text('SEO Performance Report', 50, 50);
      doc
        .fontSize(14)
        .fillColor(BRAND_COLORS.muted)
        .text(monthLabel, 50, 85);

      // Divider
      doc
        .moveTo(50, 115)
        .lineTo(545, 115)
        .strokeColor(BRAND_COLORS.border)
        .lineWidth(1)
        .stroke();

      // Store info
      doc
        .fontSize(11)
        .fillColor(BRAND_COLORS.primary)
        .text(storeName, 50, 128)
        .fillColor(BRAND_COLORS.muted)
        .fontSize(9)
        .text(shopifyDomain, 50, 144);

      // ============ EXECUTIVE SUMMARY ============
      doc
        .fillColor(BRAND_COLORS.primary)
        .fontSize(16)
        .text('Executive Summary', 50, 180);

      const stats = [
        { label: 'Total impressions', value: metrics.totalImpressions.toLocaleString() },
        { label: 'Total clicks', value: metrics.totalClicks.toLocaleString() },
        { label: 'Average CTR', value: `${metrics.avgCtr.toFixed(2)}%` },
        { label: 'Average position', value: metrics.avgPosition.toFixed(1) },
        { label: 'Monthly traffic', value: metrics.monthlyTraffic.toLocaleString() },
        { label: 'Pages published this month', value: metrics.publishedThisMonth.toString() },
        { label: 'Total published content', value: metrics.totalPublished.toString() },
        { label: 'Average SEO score', value: `${metrics.avgSeoScore.toFixed(0)} / 100` },
      ];

      let y = 210;
      const col1X = 50;
      const col2X = 300;
      stats.forEach((stat, i) => {
        const x = i % 2 === 0 ? col1X : col2X;
        if (i % 2 === 0 && i > 0) y += 50;

        doc
          .fillColor(BRAND_COLORS.muted)
          .fontSize(9)
          .text(stat.label.toUpperCase(), x, y);
        doc
          .fillColor(BRAND_COLORS.primary)
          .fontSize(20)
          .text(stat.value, x, y + 14);
      });

      // ============ TOP PAGES ============
      y += 80;
      if (y > 680) { doc.addPage(); y = 50; }

      doc
        .fillColor(BRAND_COLORS.primary)
        .fontSize(16)
        .text('Top Performing Pages', 50, y);
      y += 30;

      if (metrics.topPages.length === 0) {
        doc
          .fillColor(BRAND_COLORS.muted)
          .fontSize(10)
          .text('No page traffic recorded yet this month.', 50, y);
        y += 20;
      } else {
        metrics.topPages.forEach((page, i) => {
          if (y > 720) { doc.addPage(); y = 50; }
          doc
            .fillColor(BRAND_COLORS.accent)
            .fontSize(10)
            .text(`${i + 1}.`, 50, y, { continued: true })
            .fillColor(BRAND_COLORS.primary)
            .text(` ${page.title}`, { width: 380 });
          doc
            .fillColor(BRAND_COLORS.muted)
            .fontSize(9)
            .text(
              `${page.traffic.toLocaleString()} visits  •  SEO ${page.seoScore}`,
              50,
              doc.y + 2,
            );
          y = doc.y + 10;
        });
      }

      // ============ TOP KEYWORDS ============
      y += 20;
      if (y > 680) { doc.addPage(); y = 50; }

      doc
        .fillColor(BRAND_COLORS.primary)
        .fontSize(16)
        .text('Top Keywords', 50, y);
      y += 30;

      if (metrics.topKeywords.length === 0) {
        doc
          .fillColor(BRAND_COLORS.muted)
          .fontSize(10)
          .text(
            'No keyword data yet. Connect Google Search Console to populate.',
            50,
            y,
          );
        y += 20;
      } else {
        metrics.topKeywords.forEach((kw, i) => {
          if (y > 720) { doc.addPage(); y = 50; }
          doc
            .fillColor(BRAND_COLORS.primary)
            .fontSize(10)
            .text(`${i + 1}. ${kw.keyword}`, 50, y, { width: 330, continued: false });
          doc
            .fillColor(BRAND_COLORS.muted)
            .fontSize(9)
            .text(
              `Position ${kw.position}  •  ${kw.clicks.toLocaleString()} clicks`,
              390,
              y + 2,
            );
          y += 20;
        });
      }

      // ============ POSITION CHANGES ============
      y += 20;
      if (y > 680) { doc.addPage(); y = 50; }

      doc
        .fillColor(BRAND_COLORS.primary)
        .fontSize(16)
        .text('Biggest Ranking Movements', 50, y);
      y += 30;

      if (metrics.positionChanges.length === 0) {
        doc
          .fillColor(BRAND_COLORS.muted)
          .fontSize(10)
          .text('No position changes tracked yet.', 50, y);
        y += 20;
      } else {
        metrics.positionChanges.forEach((change) => {
          if (y > 720) { doc.addPage(); y = 50; }
          const color = change.delta > 0 ? BRAND_COLORS.emerald : BRAND_COLORS.red;
          const arrow = change.delta > 0 ? '↑' : '↓';
          doc
            .fillColor(BRAND_COLORS.primary)
            .fontSize(10)
            .text(change.keyword, 50, y, { width: 300, continued: false });
          doc
            .fillColor(BRAND_COLORS.muted)
            .fontSize(9)
            .text(`${change.from} → ${change.to}`, 360, y + 2, { continued: false });
          doc
            .fillColor(color)
            .fontSize(11)
            .text(
              `${arrow} ${Math.abs(change.delta)}`,
              460,
              y + 1,
            );
          y += 20;
        });
      }

      // ============ NEW CONTENT ============
      y += 20;
      if (y > 680) { doc.addPage(); y = 50; }

      doc
        .fillColor(BRAND_COLORS.primary)
        .fontSize(16)
        .text('Content Published This Month', 50, y);
      y += 30;

      if (metrics.newContent.length === 0) {
        doc
          .fillColor(BRAND_COLORS.muted)
          .fontSize(10)
          .text('No new content published this month.', 50, y);
        y += 20;
      } else {
        metrics.newContent.forEach((item) => {
          if (y > 720) { doc.addPage(); y = 50; }
          doc
            .fillColor(BRAND_COLORS.primary)
            .fontSize(10)
            .text(item.title, 50, y, { width: 380, continued: false });
          doc
            .fillColor(BRAND_COLORS.muted)
            .fontSize(9)
            .text(
              `${item.publishedAt.toLocaleDateString()}  •  SEO ${item.seoScore}`,
              50,
              doc.y + 2,
            );
          y = doc.y + 10;
        });
      }

      // ============ FOOTER ============
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc
          .fillColor(BRAND_COLORS.muted)
          .fontSize(8)
          .text(
            `Generated ${new Date().toLocaleDateString()}  •  Page ${i + 1} of ${pages.count}`,
            50,
            780,
            { align: 'center', width: 495 },
          );
      }

      doc.end();
    });
  }

  /**
   * Return the first of the previous month.
   */
  private previousMonth(): Date {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() - 1, 1);
  }
}

let instance: ReportGenerationService | null = null;

export function getReportGenerationService(): ReportGenerationService {
  if (!instance) instance = new ReportGenerationService();
  return instance;
}
