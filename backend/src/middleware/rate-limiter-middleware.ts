/**
 * Rate Limiter Middleware
 * Shopify SEO Automation Platform
 *
 * Implements rate limiting per organization based on plan tier
 *
 * RATE LIMITS (per minute):
 * - Free: 60 requests/minute
 * - Starter: 300 requests/minute
 * - Professional: 1000 requests/minute
 * - Enterprise: 5000 requests/minute
 *
 * IMPLEMENTATION:
 * - Uses Redis for distributed rate limiting
 * - Sliding window algorithm
 * - Per-organization limits (not per IP)
 * - Returns 429 Too Many Requests when exceeded
 * - Includes rate limit headers in response
 *
 * RESPONSE HEADERS:
 * - X-RateLimit-Limit: Max requests per window
 * - X-RateLimit-Remaining: Remaining requests in window
 * - X-RateLimit-Reset: Timestamp when limit resets
 * - Retry-After: Seconds until retry (when rate limited)
 */

import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import {
  AuthenticatedRequest,
  PLAN_RATE_LIMITS,
  SecurityEventType,
} from '../types/auth.types';

// Redis client (singleton)
let redisClient: Redis | null = null;

function getRedisClient(): Redis {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redisClient.on('error', (error) => {
      console.error('Redis client error:', error);
    });
  }

  return redisClient;
}

/**
 * Rate Limiter Middleware
 *
 * Enforces rate limits based on organization's plan tier
 */
export async function rateLimiterMiddleware(
  req: Request & Partial<AuthenticatedRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Skip if user is not authenticated
    if (!req.organization) {
      next();
      return;
    }

    const organizationId = req.organization.id;
    const planTier = req.organization.planTier || 'free';

    // Get rate limit config for plan
    const rateLimitConfig = PLAN_RATE_LIMITS[planTier] || PLAN_RATE_LIMITS.free;

    const { windowMs, maxRequests } = rateLimitConfig;

    // Redis key for rate limiting
    const key = `rate_limit:${organizationId}`;

    // Get Redis client
    const redis = getRedisClient();

    // Increment request count
    const currentCount = await redis.incr(key);

    // Set expiration on first request in window
    if (currentCount === 1) {
      await redis.pexpire(key, windowMs);
    }

    // Get TTL (time to live) for reset timestamp
    const ttl = await redis.pttl(key);
    const resetTime = Date.now() + ttl;

    // Calculate remaining requests
    const remaining = Math.max(0, maxRequests - currentCount);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());

    // Check if rate limit exceeded
    if (currentCount > maxRequests) {
      // Log rate limit event
      await logSecurityEvent({
        type: SecurityEventType.RATE_LIMIT_EXCEEDED,
        organizationId,
        userId: req.user?.id,
        metadata: {
          planTier,
          limit: maxRequests,
          currentCount,
        },
        severity: 'medium',
      });

      // Set Retry-After header
      const retryAfterSeconds = Math.ceil(ttl / 1000);
      res.setHeader('Retry-After', retryAfterSeconds.toString());

      res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Maximum ${maxRequests} requests per minute for ${planTier} plan.`,
        limit: maxRequests,
        remaining: 0,
        resetAt: new Date(resetTime).toISOString(),
        retryAfter: retryAfterSeconds,
      });
      return;
    }

    // Continue to next middleware
    next();
  } catch (error) {
    console.error('Rate limiter middleware error:', error);

    // On error, allow request (fail open)
    // In production, you might want to fail closed for security
    next();
  }
}

/**
 * Custom Rate Limiter
 *
 * Allows custom rate limits for specific endpoints
 *
 * @param maxRequests - Maximum requests per window
 * @param windowMs - Time window in milliseconds
 */
export function customRateLimiter(maxRequests: number, windowMs: number) {
  return async (
    req: Request & Partial<AuthenticatedRequest>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Skip if user is not authenticated
      if (!req.organization) {
        next();
        return;
      }

      const organizationId = req.organization.id;

      // Use custom key for this endpoint
      const endpoint = req.route?.path || req.path;
      const key = `rate_limit:custom:${organizationId}:${endpoint}`;

      const redis = getRedisClient();

      const currentCount = await redis.incr(key);

      if (currentCount === 1) {
        await redis.pexpire(key, windowMs);
      }

      const ttl = await redis.pttl(key);
      const resetTime = Date.now() + ttl;
      const remaining = Math.max(0, maxRequests - currentCount);

      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());

      if (currentCount > maxRequests) {
        const retryAfterSeconds = Math.ceil(ttl / 1000);
        res.setHeader('Retry-After', retryAfterSeconds.toString());

        res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowMs / 1000} seconds.`,
          limit: maxRequests,
          remaining: 0,
          resetAt: new Date(resetTime).toISOString(),
          retryAfter: retryAfterSeconds,
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Custom rate limiter error:', error);
      next();
    }
  };
}

/**
 * IP-Based Rate Limiter
 *
 * Rate limits by IP address (for public endpoints)
 *
 * @param maxRequests - Maximum requests per window
 * @param windowMs - Time window in milliseconds
 */
export function ipRateLimiter(maxRequests: number, windowMs: number) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Get IP address
      const ip =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
        req.socket.remoteAddress ||
        'unknown';

      const key = `rate_limit:ip:${ip}`;

      const redis = getRedisClient();

      const currentCount = await redis.incr(key);

      if (currentCount === 1) {
        await redis.pexpire(key, windowMs);
      }

      const ttl = await redis.pttl(key);
      const resetTime = Date.now() + ttl;
      const remaining = Math.max(0, maxRequests - currentCount);

      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());

      if (currentCount > maxRequests) {
        const retryAfterSeconds = Math.ceil(ttl / 1000);
        res.setHeader('Retry-After', retryAfterSeconds.toString());

        res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Please try again in ${retryAfterSeconds} seconds.`,
          limit: maxRequests,
          remaining: 0,
          resetAt: new Date(resetTime).toISOString(),
          retryAfter: retryAfterSeconds,
        });
        return;
      }

      next();
    } catch (error) {
      console.error('IP rate limiter error:', error);
      next();
    }
  };
}

/**
 * Sliding Window Rate Limiter
 *
 * More accurate rate limiting using sliding window algorithm
 *
 * @param maxRequests - Maximum requests per window
 * @param windowMs - Time window in milliseconds
 */
export function slidingWindowRateLimiter(maxRequests: number, windowMs: number) {
  return async (
    req: Request & Partial<AuthenticatedRequest>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.organization) {
        next();
        return;
      }

      const organizationId = req.organization.id;
      const now = Date.now();
      const windowStart = now - windowMs;

      const key = `rate_limit:sliding:${organizationId}`;

      const redis = getRedisClient();

      // Remove old entries outside the window
      await redis.zremrangebyscore(key, 0, windowStart);

      // Count requests in current window
      const currentCount = await redis.zcard(key);

      if (currentCount >= maxRequests) {
        // Get oldest request timestamp to calculate reset time
        const oldestRequest = await redis.zrange(key, 0, 0, 'WITHSCORES');
        const oldestTimestamp = oldestRequest[1]
          ? parseInt(oldestRequest[1], 10)
          : now;
        const resetTime = oldestTimestamp + windowMs;
        const retryAfterMs = resetTime - now;
        const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

        res.setHeader('X-RateLimit-Limit', maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());
        res.setHeader('Retry-After', retryAfterSeconds.toString());

        res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowMs / 1000} seconds.`,
          limit: maxRequests,
          remaining: 0,
          resetAt: new Date(resetTime).toISOString(),
          retryAfter: retryAfterSeconds,
        });
        return;
      }

      // Add current request
      await redis.zadd(key, now, `${now}-${Math.random()}`);
      await redis.pexpire(key, windowMs);

      const remaining = maxRequests - currentCount - 1;
      const resetTime = now + windowMs;

      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());

      next();
    } catch (error) {
      console.error('Sliding window rate limiter error:', error);
      next();
    }
  };
}

/**
 * Log Security Event
 */
async function logSecurityEvent(event: {
  type: SecurityEventType;
  organizationId?: string;
  userId?: string;
  metadata: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}): Promise<void> {
  console.log('[SECURITY EVENT]', {
    ...event,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Get Current Rate Limit Status
 *
 * Utility function to check current rate limit status
 */
export async function getRateLimitStatus(organizationId: string): Promise<{
  limit: number;
  remaining: number;
  resetAt: Date;
}> {
  try {
    const redis = getRedisClient();
    const key = `rate_limit:${organizationId}`;

    const currentCount = await redis.get(key);
    const ttl = await redis.pttl(key);

    // Get plan tier (would need to query database)
    // For now, assume free plan
    const limit = PLAN_RATE_LIMITS.free.maxRequests;

    const count = currentCount ? parseInt(currentCount, 10) : 0;
    const remaining = Math.max(0, limit - count);
    const resetAt = new Date(Date.now() + ttl);

    return {
      limit,
      remaining,
      resetAt,
    };
  } catch (error) {
    console.error('Get rate limit status error:', error);
    return {
      limit: 0,
      remaining: 0,
      resetAt: new Date(),
    };
  }
}

/**
 * Reset Rate Limit
 *
 * Manually reset rate limit for an organization (admin function)
 */
export async function resetRateLimit(organizationId: string): Promise<void> {
  try {
    const redis = getRedisClient();
    const key = `rate_limit:${organizationId}`;
    await redis.del(key);
    console.log(`Rate limit reset for organization: ${organizationId}`);
  } catch (error) {
    console.error('Reset rate limit error:', error);
  }
}
