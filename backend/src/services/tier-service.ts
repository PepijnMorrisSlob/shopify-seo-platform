/**
 * Tier Service
 *
 * Single source of truth for what each plan tier allows. Limits are loaded
 * from the `TIER_CONFIG` env var (JSON) if set, otherwise fall back to
 * sensible defaults for the managed-SEO product.
 *
 * Usage:
 *   const tier = getTierService();
 *   const limits = await tier.getLimits(organizationId);
 *   const check = await tier.canCreateQAPage(organizationId);
 *   if (!check.allowed) throw new HttpException(...);
 */

import { PrismaClient, PlanTier } from '@prisma/client';

export interface TierLimits {
  /** Max products that can be synced (-1 = unlimited) */
  maxProducts: number;
  /** Max Q&A pages (-1 = unlimited) */
  maxQAPages: number;
  /** Max competitors tracked (-1 = unlimited) */
  maxCompetitors: number;
  /** Daily publishing cap */
  dailyPublish: number;
  /** Weekly publishing cap */
  weeklyPublish: number;
  /** Monthly AI content generations (-1 = unlimited) */
  monthlyContentGens: number;
  /** Whether auto-optimization workflows run */
  autoOptimization: boolean;
  /** Whether A/B testing is enabled */
  abTesting: boolean;
  /** Whether competitor analysis is enabled */
  competitorAnalysis: boolean;
  /** Monthly price in USD (for display only) */
  monthlyPriceUsd: number;
}

export interface TierCheckResult {
  allowed: boolean;
  reason?: string;
  current: number;
  limit: number;
  tier: PlanTier;
}

// Sensible defaults; override by setting TIER_CONFIG env var to a JSON blob.
const DEFAULT_TIER_CONFIG: Record<PlanTier, TierLimits> = {
  FREE: {
    maxProducts: 25,
    maxQAPages: 5,
    maxCompetitors: 0,
    dailyPublish: 1,
    weeklyPublish: 3,
    monthlyContentGens: 10,
    autoOptimization: false,
    abTesting: false,
    competitorAnalysis: false,
    monthlyPriceUsd: 0,
  },
  STARTER: {
    maxProducts: 250,
    maxQAPages: 25,
    maxCompetitors: 3,
    dailyPublish: 2,
    weeklyPublish: 7,
    monthlyContentGens: 50,
    autoOptimization: true,
    abTesting: false,
    competitorAnalysis: true,
    monthlyPriceUsd: 500,
  },
  PROFESSIONAL: {
    maxProducts: 1000,
    maxQAPages: 100,
    maxCompetitors: 10,
    dailyPublish: 3,
    weeklyPublish: 14,
    monthlyContentGens: 200,
    autoOptimization: true,
    abTesting: true,
    competitorAnalysis: true,
    monthlyPriceUsd: 1000,
  },
  ENTERPRISE: {
    maxProducts: -1,
    maxQAPages: -1,
    maxCompetitors: -1,
    dailyPublish: 5,
    weeklyPublish: 25,
    monthlyContentGens: -1,
    autoOptimization: true,
    abTesting: true,
    competitorAnalysis: true,
    monthlyPriceUsd: 2500,
  },
};

export class TierService {
  private readonly prisma: PrismaClient;
  private readonly config: Record<PlanTier, TierLimits>;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
    this.config = this.loadConfig();
  }

  /**
   * Get the full limits object for an org's current tier.
   */
  async getLimits(organizationId: string): Promise<TierLimits & { tier: PlanTier }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { planTier: true },
    });
    const tier = org?.planTier || 'FREE';
    return { ...this.config[tier], tier };
  }

  /**
   * Check if this org can create another QA page.
   */
  async canCreateQAPage(organizationId: string): Promise<TierCheckResult> {
    const limits = await this.getLimits(organizationId);
    const current = await this.prisma.qAPage.count({
      where: { organizationId },
    });
    return this.gateCount(
      limits.tier,
      current,
      limits.maxQAPages,
      'Q&A pages',
    );
  }

  /**
   * Check if this org can add another competitor.
   */
  async canAddCompetitor(organizationId: string): Promise<TierCheckResult> {
    const limits = await this.getLimits(organizationId);
    if (!limits.competitorAnalysis) {
      return {
        allowed: false,
        reason: `Competitor analysis is not available on the ${limits.tier} plan.`,
        current: 0,
        limit: 0,
        tier: limits.tier,
      };
    }
    const current = await this.prisma.competitor.count({
      where: { organizationId },
    });
    return this.gateCount(
      limits.tier,
      current,
      limits.maxCompetitors,
      'competitors',
    );
  }

  /**
   * Check if this org can sync another product batch.
   */
  async canSyncProducts(organizationId: string): Promise<TierCheckResult> {
    const limits = await this.getLimits(organizationId);
    const current = await this.prisma.product.count({
      where: { organizationId },
    });
    return this.gateCount(
      limits.tier,
      current,
      limits.maxProducts,
      'products',
    );
  }

  /**
   * Check if auto-optimization is enabled for this tier.
   */
  async canUseAutoOptimization(
    organizationId: string,
  ): Promise<TierCheckResult> {
    const limits = await this.getLimits(organizationId);
    return {
      allowed: limits.autoOptimization,
      reason: limits.autoOptimization
        ? undefined
        : `Auto-optimization is not available on the ${limits.tier} plan.`,
      current: 0,
      limit: 0,
      tier: limits.tier,
    };
  }

  /**
   * Check if AI content generation is within monthly quota.
   */
  async canGenerateContent(
    organizationId: string,
  ): Promise<TierCheckResult> {
    const limits = await this.getLimits(organizationId);
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { monthlyContentGens: true },
    });
    const current = org?.monthlyContentGens || 0;
    return this.gateCount(
      limits.tier,
      current,
      limits.monthlyContentGens,
      'content generations this month',
    );
  }

  // --------------------------------------------------------------------------
  // Private
  // --------------------------------------------------------------------------

  private gateCount(
    tier: PlanTier,
    current: number,
    limit: number,
    resourceLabel: string,
  ): TierCheckResult {
    // -1 means unlimited
    if (limit < 0) {
      return { allowed: true, current, limit, tier };
    }
    if (current >= limit) {
      return {
        allowed: false,
        reason: `You've reached the ${limit} ${resourceLabel} limit on the ${tier} plan. Upgrade to increase this limit.`,
        current,
        limit,
        tier,
      };
    }
    return { allowed: true, current, limit, tier };
  }

  private loadConfig(): Record<PlanTier, TierLimits> {
    const envConfig = process.env.TIER_CONFIG;
    if (!envConfig) return DEFAULT_TIER_CONFIG;

    try {
      const parsed = JSON.parse(envConfig);
      // Merge with defaults — env can override any subset
      return {
        FREE: { ...DEFAULT_TIER_CONFIG.FREE, ...(parsed.FREE || {}) },
        STARTER: { ...DEFAULT_TIER_CONFIG.STARTER, ...(parsed.STARTER || {}) },
        PROFESSIONAL: {
          ...DEFAULT_TIER_CONFIG.PROFESSIONAL,
          ...(parsed.PROFESSIONAL || {}),
        },
        ENTERPRISE: {
          ...DEFAULT_TIER_CONFIG.ENTERPRISE,
          ...(parsed.ENTERPRISE || {}),
        },
      };
    } catch (err: any) {
      console.warn(
        `[TierService] TIER_CONFIG is malformed JSON, using defaults: ${err.message}`,
      );
      return DEFAULT_TIER_CONFIG;
    }
  }
}

let instance: TierService | null = null;

export function getTierService(): TierService {
  if (!instance) instance = new TierService();
  return instance;
}

export { DEFAULT_TIER_CONFIG };
