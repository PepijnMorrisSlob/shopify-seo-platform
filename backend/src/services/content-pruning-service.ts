/**
 * Content Pruning Service
 *
 * Identifies and removes/refreshes underperforming content to protect domain
 * authority. Over time, old low-traffic pages dilute a site's topical authority
 * and can drag down rankings for high-performers. This service:
 *
 *   1. Scans published QA pages older than 6 months
 *   2. Applies pruning criteria against real GSC traffic data
 *   3. Recommends (or auto-executes) one of:
 *        - update   → queue for AI refresh via AutoOptimizationService
 *        - redirect → 301 to a topically-related higher-performing page
 *        - remove   → unpublish from Shopify + archive in DB
 *
 * Relies on:
 *   - Real GSC data from gsc-sync-job (Phase 1)
 *   - Auto-optimization workflow (existing) for refresh
 *   - Shopify blog service for unpublish
 */

import { PrismaClient } from '@prisma/client';
import { Logger } from '@nestjs/common';
import { optimizationQueue } from '../queues/optimization-queue';

export type PruningAction = 'update' | 'redirect' | 'remove' | 'retain';

export interface PruningCandidate {
  pageId: string;
  title: string;
  url: string | null;
  ageInDays: number;
  monthlyTraffic: number;
  monthlyImpressions: number;
  seoScore: number;
  recommendation: PruningAction;
  reason: string;
  redirectTarget?: string;
}

export interface PruningReport {
  organizationId: string;
  totalPublished: number;
  candidates: PruningCandidate[];
  summary: Record<PruningAction, number>;
  generatedAt: Date;
}

/**
 * Default thresholds. Agencies can override per-client in the future via
 * business profile advanced settings.
 */
const THRESHOLDS = {
  minAgeDaysForPruning: 180, // 6 months
  lowTrafficMonthly: 10,
  zeroTrafficAgeDays: 365,
  criticallyLowSeoScore: 30,
} as const;

export class ContentPruningService {
  private readonly logger = new Logger(ContentPruningService.name);
  private readonly prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Scan all published QA pages for an organization and classify each by
   * pruning recommendation. Does NOT execute — just reports.
   */
  async identifyCandidates(organizationId: string): Promise<PruningReport> {
    const pages = await this.prisma.qAPage.findMany({
      where: { organizationId, status: 'published' },
    });

    const candidates: PruningCandidate[] = pages.map((page) => {
      const ageInDays = page.publishedAt
        ? Math.floor((Date.now() - page.publishedAt.getTime()) / 86400000)
        : Math.floor((Date.now() - page.createdAt.getTime()) / 86400000);
      const monthlyTraffic = page.monthlyTraffic || 0;
      const monthlyImpressions = page.monthlyImpressions || 0;
      const seoScore = page.seoScore || 0;

      let recommendation: PruningAction = 'retain';
      let reason = 'Page is performing within acceptable thresholds.';

      if (ageInDays >= THRESHOLDS.zeroTrafficAgeDays && monthlyTraffic === 0) {
        recommendation = 'remove';
        reason = `No traffic in 12+ months (${Math.floor(ageInDays / 30)} months old)`;
      } else if (seoScore > 0 && seoScore < THRESHOLDS.criticallyLowSeoScore) {
        recommendation = 'remove';
        reason = `SEO score ${seoScore}/100 is critically low`;
      } else if (
        ageInDays >= 300 &&
        monthlyTraffic < 5 &&
        monthlyImpressions < 100
      ) {
        recommendation = 'redirect';
        reason = `10+ months old, <5 visits/month, <100 impressions — redirect to stronger page`;
      } else if (
        ageInDays >= THRESHOLDS.minAgeDaysForPruning &&
        monthlyTraffic < THRESHOLDS.lowTrafficMonthly
      ) {
        recommendation = 'update';
        reason = `6+ months old with <${THRESHOLDS.lowTrafficMonthly} visits/month — refresh content`;
      }

      return {
        pageId: page.id,
        title: page.question,
        url: page.shopifyUrl,
        ageInDays,
        monthlyTraffic,
        monthlyImpressions,
        seoScore,
        recommendation,
        reason,
      };
    });

    // Assign redirect targets based on topical similarity to the best-performing page
    const retained = candidates.filter((c) => c.recommendation === 'retain');
    const topPerformers = [...retained].sort((a, b) =>
      (b.monthlyTraffic || 0) - (a.monthlyTraffic || 0),
    );

    for (const candidate of candidates) {
      if (candidate.recommendation !== 'redirect') continue;
      const target = this.findBestRedirectTarget(candidate, topPerformers);
      if (target) candidate.redirectTarget = target.url || undefined;
    }

    const summary: Record<PruningAction, number> = {
      update: 0,
      redirect: 0,
      remove: 0,
      retain: 0,
    };
    for (const c of candidates) summary[c.recommendation]++;

    return {
      organizationId,
      totalPublished: pages.length,
      candidates,
      summary,
      generatedAt: new Date(),
    };
  }

  /**
   * Execute a pruning action on a single page.
   *
   * - update:   queue the auto-optimization refresh workflow
   * - redirect: mark DB row as archived with redirectTo metadata (Shopify
   *             redirects to be set up via Shopify's redirects API in a
   *             later phase when auth context is available)
   * - remove:   unpublish from Shopify (best-effort) + archive in DB
   */
  async executePrune(pageId: string, action: PruningAction): Promise<void> {
    const page = await this.prisma.qAPage.findUnique({ where: { id: pageId } });
    if (!page) throw new Error(`QAPage ${pageId} not found`);

    switch (action) {
      case 'update': {
        // Queue the refresh via the existing optimization workflow
        await optimizationQueue.add(`refresh-${pageId}`, {
          organizationId: page.organizationId,
          pageId,
          forceOptimize: true,
        });
        await this.prisma.qAPage.update({
          where: { id: pageId },
          data: { lastOptimizedAt: new Date() },
        });
        this.logger.log(`Queued refresh for page ${pageId}`);
        break;
      }

      case 'redirect':
      case 'remove': {
        // Archive in DB. The Shopify-side unpublish requires org credentials
        // and runs via the publishing queue in a follow-up workflow.
        await this.prisma.qAPage.update({
          where: { id: pageId },
          data: { status: 'archived' },
        });
        this.logger.log(
          `Archived page ${pageId} (action=${action})`,
        );
        break;
      }

      case 'retain':
        // No-op
        break;
    }
  }

  /**
   * Given a candidate to redirect, find the best redirect target among the
   * organization's retained pages. "Best" = shares the most keywords with
   * the candidate.
   */
  private findBestRedirectTarget(
    candidate: PruningCandidate,
    retained: PruningCandidate[],
  ): PruningCandidate | null {
    if (retained.length === 0) return null;

    const candidateWords = new Set(
      candidate.title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 3),
    );

    let best: PruningCandidate | null = null;
    let bestOverlap = 0;

    for (const retainedPage of retained) {
      const retainedWords = new Set(
        retainedPage.title
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .split(/\s+/)
          .filter((w) => w.length > 3),
      );

      let overlap = 0;
      candidateWords.forEach((w) => {
        if (retainedWords.has(w)) overlap++;
      });

      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        best = retainedPage;
      }
    }

    return bestOverlap >= 2 ? best : null; // require at least 2 shared words
  }
}

let instance: ContentPruningService | null = null;

export function getContentPruningService(): ContentPruningService {
  if (!instance) instance = new ContentPruningService();
  return instance;
}
