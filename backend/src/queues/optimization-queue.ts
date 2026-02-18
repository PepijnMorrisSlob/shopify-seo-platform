import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis.config';

/**
 * Optimization Queue
 * Handles auto-optimization jobs for underperforming content
 *
 * Triggered by:
 * - Daily cron job
 * - Manual optimization requests
 * - Performance alerts
 *
 * Scale: 10 concurrent optimizations
 * Retry: 2 attempts with exponential backoff
 */

export interface OptimizationJobData {
  organizationId: string;
  pageId?: string; // If specified, only optimize this page
  forceOptimize?: boolean; // Ignore optimization criteria
}

export const optimizationQueue = new Queue<OptimizationJobData>(
  'optimization',
  {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 5000, // 5s, 10s
      },
      removeOnComplete: {
        age: 86400, // Keep for 24 hours
        count: 500,
      },
      removeOnFail: {
        age: 604800, // Keep failed jobs for 7 days
      },
    },
  }
);

// Queue event handlers (only valid Queue events)
optimizationQueue.on('error', (error) => {
  console.error('[OptimizationQueue] Error:', error);
});

// Note: 'active', 'completed', 'failed' events are Worker events, not Queue events
// These are handled in optimization-worker.ts

export default optimizationQueue;
