/**
 * Retry Helper Utility
 *
 * Implements exponential backoff retry logic for external API calls.
 *
 * Features:
 * - Configurable retry attempts
 * - Exponential backoff with jitter
 * - Retryable error detection
 * - Circuit breaker integration
 * - Comprehensive error logging
 */

import {
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
  APIError,
  RateLimitError,
  CircuitBreakerState,
  CircuitBreakerConfig,
  CircuitBreakerStats,
} from '../types/external-apis.types';

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime?: number;
  private nextAttemptTime?: number;
  private readonly config: CircuitBreakerConfig;

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = {
      failureThreshold: config?.failureThreshold || 5,
      resetTimeoutMs: config?.resetTimeoutMs || 60000, // 1 minute
      monitoringWindowMs: config?.monitoringWindowMs || 120000, // 2 minutes
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() < (this.nextAttemptTime || 0)) {
        throw new Error(
          `Circuit breaker is OPEN. Next attempt in ${
            ((this.nextAttemptTime || 0) - Date.now()) / 1000
          }s`
        );
      }
      // Transition to HALF_OPEN to test if service recovered
      this.state = CircuitBreakerState.HALF_OPEN;
      console.log('[CircuitBreaker] Transitioning to HALF_OPEN state');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }

  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.nextAttemptTime = undefined;
  }

  private onSuccess(): void {
    this.successCount++;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      console.log('[CircuitBreaker] Success in HALF_OPEN state. Closing circuit.');
      this.state = CircuitBreakerState.CLOSED;
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
      this.nextAttemptTime = Date.now() + this.config.resetTimeoutMs;

      console.error(
        `[CircuitBreaker] OPENED after ${this.failureCount} failures. Next attempt at ${new Date(
          this.nextAttemptTime
        ).toISOString()}`
      );
    }
  }
}

export class RetryHelper {
  private readonly config: RetryConfig;

  constructor(config?: Partial<RetryConfig>) {
    this.config = {
      ...DEFAULT_RETRY_CONFIG,
      ...config,
    };
  }

  /**
   * Execute a function with retry logic
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    context: string,
    circuitBreaker?: CircuitBreaker
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        // If circuit breaker provided, use it
        if (circuitBreaker) {
          return await circuitBreaker.execute(fn);
        }

        return await fn();
      } catch (error) {
        lastError = error as Error;

        const shouldRetry = this.shouldRetry(error, attempt);

        if (!shouldRetry) {
          console.error(
            `[RetryHelper] Non-retryable error in ${context} (attempt ${attempt}/${this.config.maxAttempts})`,
            error
          );
          throw error;
        }

        const delayMs = this.calculateDelay(attempt, error);

        console.warn(
          `[RetryHelper] Retry ${attempt}/${this.config.maxAttempts} for ${context}. ` +
            `Waiting ${delayMs}ms before next attempt. Error: ${
              error instanceof Error ? error.message : String(error)
            }`
        );

        if (attempt < this.config.maxAttempts) {
          await this.sleep(delayMs);
        }
      }
    }

    // All retries exhausted
    console.error(
      `[RetryHelper] All ${this.config.maxAttempts} retry attempts exhausted for ${context}`
    );
    throw lastError || new Error('Retry attempts exhausted');
  }

  /**
   * Determine if error is retryable
   */
  private shouldRetry(error: unknown, attempt: number): boolean {
    // Never retry on last attempt
    if (attempt >= this.config.maxAttempts) {
      return false;
    }

    // Always retry rate limit errors
    if (error instanceof RateLimitError) {
      return true;
    }

    // Retry APIErrors with retryable status codes
    if (error instanceof APIError) {
      return this.config.retryableStatusCodes.includes(error.statusCode);
    }

    // Retry network errors
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      const networkErrors = [
        'network',
        'econnreset',
        'econnrefused',
        'etimedout',
        'enotfound',
        'socket hang up',
      ];

      return networkErrors.some((networkError) => errorMessage.includes(networkError));
    }

    return false;
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  private calculateDelay(attempt: number, error: unknown): number {
    // If rate limit error with retryAfter, use that
    if (error instanceof RateLimitError && error.retryAfter) {
      return error.retryAfter * 1000;
    }

    // Exponential backoff: delay = initialDelay * (multiplier ^ (attempt - 1))
    const exponentialDelay =
      this.config.initialDelayMs * Math.pow(this.config.backoffMultiplier, attempt - 1);

    // Add jitter (±25%)
    const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
    const delayWithJitter = exponentialDelay + jitter;

    // Cap at max delay
    return Math.min(delayWithJitter, this.config.maxDelayMs);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create retry helper with custom config
 */
export function createRetryHelper(config?: Partial<RetryConfig>): RetryHelper {
  return new RetryHelper(config);
}

/**
 * Decorator for automatic retry on class methods
 */
export function Retryable(config?: Partial<RetryConfig>) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    const retryHelper = new RetryHelper(config);

    descriptor.value = async function (...args: any[]) {
      return retryHelper.executeWithRetry(
        () => originalMethod.apply(this, args),
        `${target.constructor.name}.${propertyKey}`
      );
    };

    return descriptor;
  };
}
