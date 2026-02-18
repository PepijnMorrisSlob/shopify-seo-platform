import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis.config';
import { WebhookJobData } from '../types/automation.types';

/**
 * Webhook Processing Queue
 * Handles Shopify webhooks with FIFO ordering and idempotency
 * 
 * Scale: 1,000+ webhooks/minute
 * Retry: 3 attempts with exponential backoff
 * Target: <30s processing time
 */

export const webhookProcessingQueue = new Queue<WebhookJobData>(
  'webhook-processing',
  {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000, // 1s, 2s, 4s
      },
      removeOnComplete: {
        age: 86400, // Keep for 24 hours
        count: 10000, // Keep last 10000
      },
      removeOnFail: {
        age: 604800, // Keep failed jobs for 7 days
      },
    },
  }
);

// Queue event handlers (only valid Queue events)
webhookProcessingQueue.on('error', (error) => {
  console.error('[WebhookProcessingQueue] Error:', error);
});

// Note: 'active', 'completed', 'failed' events are Worker events, not Queue events
// These are handled in webhook-processing-worker.ts with DLQ alerting

export default webhookProcessingQueue;
