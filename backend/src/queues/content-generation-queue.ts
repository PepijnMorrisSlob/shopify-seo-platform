import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis.config';
import { ContentGenerationJobData, QAContentGenerationJobData } from '../types/automation.types';

/**
 * Content Generation Queue
 * Handles AI-powered content generation for products and Q&A pages
 *
 * Scale: 100+ concurrent generations
 * Retry: 3 attempts with exponential backoff
 */

type ContentJobData = ContentGenerationJobData | QAContentGenerationJobData;

export const contentGenerationQueue = new Queue<ContentJobData>(
  'content-generation',
  {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000, // 2s, 4s, 8s
      },
      removeOnComplete: {
        age: 86400, // Keep for 24 hours
        count: 1000, // Keep last 1000
      },
      removeOnFail: {
        age: 604800, // Keep failed jobs for 7 days
      },
    },
  }
);

// Queue event handlers (only valid Queue events)
contentGenerationQueue.on('error', (error) => {
  console.error('[ContentGenerationQueue] Error:', error);
});

// Note: 'active', 'completed', 'failed' events are Worker events, not Queue events
// These are handled in content-generation-worker.ts

export default contentGenerationQueue;
