import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis.config';
import { PublishingJobData } from '../types/automation.types';

/**
 * Publishing Queue
 * Handles publishing SEO content to Shopify
 * 
 * Critical operation: More retries, longer backoff
 * Retry: 5 attempts with exponential backoff
 * Target: <5s publish time
 */

export const publishingQueue = new Queue<PublishingJobData>(
  'publishing',
  {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 5, // Critical operation, more retries
      backoff: {
        type: 'exponential',
        delay: 3000, // 3s, 6s, 12s, 24s, 48s
      },
      removeOnComplete: {
        age: 86400, // Keep for 24 hours
        count: 5000, // Keep last 5000
      },
      removeOnFail: {
        age: 604800, // Keep failed jobs for 7 days
      },
    },
  }
);

// Queue event handlers (only valid Queue events)
publishingQueue.on('error', (error) => {
  console.error('[PublishingQueue] Error:', error);
});

// Note: 'active', 'completed', 'failed', 'progress' events are Worker events, not Queue events
// These are handled in publishing-worker.ts with proper failure alerting

export default publishingQueue;
