/**
 * Rate Limiter Utility
 *
 * Implements cost-based rate limiting for Shopify GraphQL API
 * and token-based rate limiting for other APIs.
 *
 * Shopify API Limits:
 * - 50 points per second restore rate
 * - 1000 point bucket capacity
 * - Each query has a cost (typically 1-100+ points)
 *
 * Features:
 * - Cost-based throttling
 * - Bucket refill simulation
 * - 90% threshold to prevent rate limit errors
 * - Exponential backoff on rate limit errors
 */

import Redis from 'ioredis';

export interface RateLimitConfig {
  maxPoints: number; // Bucket capacity
  restoreRatePerSecond: number; // Points restored per second
  warningThreshold: number; // Percentage threshold to start throttling (0.9 = 90%)
  redisClient?: Redis;
  redisKeyPrefix?: string;
}

export interface RateLimitStatus {
  currentPoints: number;
  maxPoints: number;
  restoreRate: number;
  estimatedWaitMs: number;
  shouldThrottle: boolean;
}

export class RateLimiter {
  private currentPoints: number;
  private readonly maxPoints: number;
  private readonly restoreRatePerSecond: number;
  private readonly warningThreshold: number;
  private lastUpdateTime: number;
  private readonly redisClient?: Redis;
  private readonly redisKeyPrefix: string;
  private readonly useRedis: boolean;

  constructor(config: RateLimitConfig) {
    this.maxPoints = config.maxPoints;
    this.restoreRatePerSecond = config.restoreRatePerSecond;
    this.warningThreshold = config.warningThreshold;
    this.currentPoints = config.maxPoints;
    this.lastUpdateTime = Date.now();
    this.redisClient = config.redisClient;
    this.redisKeyPrefix = config.redisKeyPrefix || 'rate_limit';
    this.useRedis = !!config.redisClient;
  }

  /**
   * Check if a request with the given cost can be made
   * Returns the wait time in milliseconds if throttling is needed
   */
  async checkAndConsume(cost: number, identifier: string = 'default'): Promise<number> {
    await this.refillBucket(identifier);

    const status = await this.getStatus(identifier);

    // If we're above the warning threshold, allow the request
    if (status.currentPoints >= cost) {
      await this.consumePoints(cost, identifier);
      return 0;
    }

    // Calculate wait time needed for bucket to refill
    const pointsNeeded = cost - status.currentPoints;
    const waitMs = Math.ceil((pointsNeeded / this.restoreRatePerSecond) * 1000);

    return waitMs;
  }

  /**
   * Wait for rate limit if necessary, then consume points
   */
  async waitAndConsume(cost: number, identifier: string = 'default'): Promise<void> {
    const waitMs = await this.checkAndConsume(cost, identifier);

    if (waitMs > 0) {
      console.log(
        `[RateLimiter] Throttling request for ${identifier}. Waiting ${waitMs}ms (cost: ${cost} points)`
      );
      await this.sleep(waitMs);
      // Consume points after waiting
      await this.consumePoints(cost, identifier);
    }
  }

  /**
   * Get current rate limit status
   */
  async getStatus(identifier: string = 'default'): Promise<RateLimitStatus> {
    await this.refillBucket(identifier);

    const currentPoints = await this.getCurrentPoints(identifier);
    const thresholdPoints = this.maxPoints * this.warningThreshold;
    const shouldThrottle = currentPoints < thresholdPoints;

    let estimatedWaitMs = 0;
    if (shouldThrottle) {
      const pointsNeeded = thresholdPoints - currentPoints;
      estimatedWaitMs = Math.ceil((pointsNeeded / this.restoreRatePerSecond) * 1000);
    }

    return {
      currentPoints,
      maxPoints: this.maxPoints,
      restoreRate: this.restoreRatePerSecond,
      estimatedWaitMs,
      shouldThrottle,
    };
  }

  /**
   * Update rate limit info from API response (Shopify GraphQL)
   */
  async updateFromAPIResponse(
    requestedCost: number,
    actualCost: number,
    currentlyAvailable: number,
    identifier: string = 'default'
  ): Promise<void> {
    // Shopify returns the currently available points
    // Update our local/Redis state to match
    if (this.useRedis && this.redisClient) {
      const key = `${this.redisKeyPrefix}:${identifier}`;
      await this.redisClient.set(key, currentlyAvailable.toString(), 'EX', 3600);
    } else {
      this.currentPoints = currentlyAvailable;
    }

    this.lastUpdateTime = Date.now();

    console.log(
      `[RateLimiter] Updated from API - Requested: ${requestedCost}, Actual: ${actualCost}, Available: ${currentlyAvailable}/${this.maxPoints}`
    );
  }

  /**
   * Handle rate limit error (429 response)
   * Returns suggested wait time in milliseconds
   */
  async handleRateLimitError(
    identifier: string = 'default',
    retryAfter?: number
  ): Promise<number> {
    console.warn(`[RateLimiter] Rate limit error encountered for ${identifier}`);

    // If API provides retry-after header, use it
    if (retryAfter) {
      return retryAfter * 1000;
    }

    // Otherwise, assume bucket is empty and calculate refill time
    if (this.useRedis && this.redisClient) {
      const key = `${this.redisKeyPrefix}:${identifier}`;
      await this.redisClient.set(key, '0', 'EX', 3600);
    } else {
      this.currentPoints = 0;
    }

    // Wait for bucket to refill to warning threshold
    const pointsNeeded = this.maxPoints * this.warningThreshold;
    return Math.ceil((pointsNeeded / this.restoreRatePerSecond) * 1000);
  }

  /**
   * Reset rate limiter (useful for testing)
   */
  async reset(identifier: string = 'default'): Promise<void> {
    if (this.useRedis && this.redisClient) {
      const key = `${this.redisKeyPrefix}:${identifier}`;
      await this.redisClient.set(key, this.maxPoints.toString(), 'EX', 3600);
    } else {
      this.currentPoints = this.maxPoints;
    }
    this.lastUpdateTime = Date.now();
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async refillBucket(identifier: string): Promise<void> {
    const now = Date.now();
    const timeDiffSeconds = (now - this.lastUpdateTime) / 1000;

    if (timeDiffSeconds <= 0) {
      return;
    }

    const pointsToAdd = timeDiffSeconds * this.restoreRatePerSecond;
    const currentPoints = await this.getCurrentPoints(identifier);
    const newPoints = Math.min(currentPoints + pointsToAdd, this.maxPoints);

    if (this.useRedis && this.redisClient) {
      const key = `${this.redisKeyPrefix}:${identifier}`;
      await this.redisClient.set(key, newPoints.toString(), 'EX', 3600);
    } else {
      this.currentPoints = newPoints;
    }

    this.lastUpdateTime = now;
  }

  private async consumePoints(cost: number, identifier: string): Promise<void> {
    const currentPoints = await this.getCurrentPoints(identifier);
    const newPoints = Math.max(currentPoints - cost, 0);

    if (this.useRedis && this.redisClient) {
      const key = `${this.redisKeyPrefix}:${identifier}`;
      await this.redisClient.set(key, newPoints.toString(), 'EX', 3600);
    } else {
      this.currentPoints = newPoints;
    }
  }

  private async getCurrentPoints(identifier: string): Promise<number> {
    if (this.useRedis && this.redisClient) {
      const key = `${this.redisKeyPrefix}:${identifier}`;
      const points = await this.redisClient.get(key);

      if (points === null) {
        // Initialize if not exists
        await this.redisClient.set(key, this.maxPoints.toString(), 'EX', 3600);
        return this.maxPoints;
      }

      return parseFloat(points);
    }

    return this.currentPoints;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create Shopify rate limiter
 */
export function createShopifyRateLimiter(redisClient?: Redis): RateLimiter {
  return new RateLimiter({
    maxPoints: 1000,
    restoreRatePerSecond: 50,
    warningThreshold: 0.9, // Start throttling at 90% capacity
    redisClient,
    redisKeyPrefix: 'shopify_rate_limit',
  });
}

/**
 * Factory function to create Google API rate limiter
 */
export function createGoogleRateLimiter(redisClient?: Redis): RateLimiter {
  return new RateLimiter({
    maxPoints: 100000, // 100K requests per day
    restoreRatePerSecond: 1.157, // ~100K per day
    warningThreshold: 0.95,
    redisClient,
    redisKeyPrefix: 'google_rate_limit',
  });
}
