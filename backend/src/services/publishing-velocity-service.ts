/**
 * Publishing Velocity Service
 *
 * Google spam-protection safeguard: enforces maximum publish-per-day and
 * publish-per-week limits on each organization. Without this, automated
 * pipelines could publish dozens of posts in one day and trigger Google's
 * spam detection, permanently harming the store's domain authority.
 *
 * Limits:
 *   - Default: 2/day, 7/week
 *   - New stores (<14 days since install): half-rate ramp-up
 *   - Tiers can override defaults via business profile advancedSettings.publishingLimits
 *
 * Implementation: Redis counters keyed by organizationId + date/week. TTL-based
 * expiry handles the reset windows automatically.
 */

import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { getRedisConnection } from '../config/redis.config';

export interface PublishingLimits {
  daily: number;
  weekly: number;
}

export interface PublishingCheckResult {
  allowed: boolean;
  reason?: string;
  counters: {
    today: number;
    thisWeek: number;
    dailyLimit: number;
    weeklyLimit: number;
  };
  rampUpActive: boolean;
}

export const DEFAULT_PUBLISHING_LIMITS: PublishingLimits = {
  daily: 2,
  weekly: 7,
};

export class PublishingVelocityService {
  private readonly redis: Redis;
  private readonly prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.redis = getRedisConnection();
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Check whether publishing is allowed for this organization right now.
   * Does NOT increment counters — call recordPublish() after a successful
   * Shopify publish.
   */
  async canPublish(organizationId: string): Promise<PublishingCheckResult> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: { businessProfile: true },
    });

    if (!org) {
      return {
        allowed: false,
        reason: 'Organization not found',
        counters: { today: 0, thisWeek: 0, dailyLimit: 0, weeklyLimit: 0 },
        rampUpActive: false,
      };
    }

    const limits = this.getLimitsForOrg(org);

    // New-store ramp-up: first 14 days after install → halve the limits
    // Domain trust builds gradually; Google dislikes sudden content bursts.
    const daysSinceInstall = Math.floor(
      (Date.now() - org.installedAt.getTime()) / 86400000,
    );
    const rampUpActive = daysSinceInstall < 14;
    const multiplier = rampUpActive ? 0.5 : 1;
    const effectiveDaily = Math.max(1, Math.ceil(limits.daily * multiplier));
    const effectiveWeekly = Math.max(1, Math.ceil(limits.weekly * multiplier));

    const dailyKey = this.dailyKey(organizationId);
    const weeklyKey = this.weeklyKey(organizationId);

    const [dailyStr, weeklyStr] = await Promise.all([
      this.redis.get(dailyKey),
      this.redis.get(weeklyKey),
    ]);
    const dailyCount = parseInt(dailyStr || '0', 10);
    const weeklyCount = parseInt(weeklyStr || '0', 10);

    if (dailyCount >= effectiveDaily) {
      return {
        allowed: false,
        reason: `Daily publish limit reached (${dailyCount}/${effectiveDaily}). Resets at 00:00 UTC.${rampUpActive ? ' New-store ramp-up is active for the first 14 days.' : ''}`,
        counters: {
          today: dailyCount,
          thisWeek: weeklyCount,
          dailyLimit: effectiveDaily,
          weeklyLimit: effectiveWeekly,
        },
        rampUpActive,
      };
    }

    if (weeklyCount >= effectiveWeekly) {
      return {
        allowed: false,
        reason: `Weekly publish limit reached (${weeklyCount}/${effectiveWeekly}). Resets Monday 00:00 UTC.${rampUpActive ? ' New-store ramp-up is active.' : ''}`,
        counters: {
          today: dailyCount,
          thisWeek: weeklyCount,
          dailyLimit: effectiveDaily,
          weeklyLimit: effectiveWeekly,
        },
        rampUpActive,
      };
    }

    return {
      allowed: true,
      counters: {
        today: dailyCount,
        thisWeek: weeklyCount,
        dailyLimit: effectiveDaily,
        weeklyLimit: effectiveWeekly,
      },
      rampUpActive,
    };
  }

  /**
   * Record a successful publish. Call AFTER the Shopify publish succeeds.
   * Increments daily and weekly counters with TTL-based expiry.
   */
  async recordPublish(organizationId: string): Promise<void> {
    const dailyKey = this.dailyKey(organizationId);
    const weeklyKey = this.weeklyKey(organizationId);

    const pipeline = this.redis.pipeline();
    pipeline.incr(dailyKey);
    pipeline.expire(dailyKey, 86400); // 24h
    pipeline.incr(weeklyKey);
    pipeline.expire(weeklyKey, 604800); // 7d
    await pipeline.exec();
  }

  /**
   * Return current counter values without modifying them. For display in UI.
   */
  async getCounters(organizationId: string): Promise<PublishingCheckResult> {
    return this.canPublish(organizationId);
  }

  /**
   * Build a Redis key namespaced by org + today's UTC date.
   * Format: publish:daily:{orgId}:{YYYY-MM-DD}
   */
  private dailyKey(organizationId: string): string {
    const today = new Date().toISOString().split('T')[0];
    return `publish:daily:${organizationId}:${today}`;
  }

  /**
   * Build a Redis key namespaced by org + Monday of current week (UTC).
   * Format: publish:weekly:{orgId}:{YYYY-MM-DD}
   */
  private weeklyKey(organizationId: string): string {
    const d = new Date();
    const dayOfWeek = d.getUTCDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - daysToMonday),
    );
    return `publish:weekly:${organizationId}:${monday.toISOString().split('T')[0]}`;
  }

  /**
   * Get effective limits for an org. Checks business profile advanced
   * settings for overrides, otherwise falls back to tier defaults.
   *
   * Why: Enterprise accounts want higher velocity; free trials want lower.
   */
  private getLimitsForOrg(org: any): PublishingLimits {
    // 1. Org-specific override via business profile
    const override =
      org.businessProfile?.advancedSettings?.publishingLimits;
    if (
      override &&
      typeof override.daily === 'number' &&
      typeof override.weekly === 'number'
    ) {
      return {
        daily: override.daily,
        weekly: override.weekly,
      };
    }

    // 2. Tier-based defaults (adjust these as pricing is finalized)
    switch (org.planTier) {
      case 'ENTERPRISE':
        return { daily: 5, weekly: 25 };
      case 'PROFESSIONAL':
        return { daily: 3, weekly: 14 };
      case 'STARTER':
        return { daily: 2, weekly: 7 };
      case 'FREE':
      default:
        return { daily: 1, weekly: 3 };
    }
  }
}

let instance: PublishingVelocityService | null = null;

export function getPublishingVelocityService(): PublishingVelocityService {
  if (!instance) {
    instance = new PublishingVelocityService();
  }
  return instance;
}
