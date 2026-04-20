import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis.config';

/**
 * Competitor Analysis Queue
 *
 * Runs DataForSEO-based competitor intelligence. Each job makes 2-4 paid API
 * calls, so we keep concurrency low (2) to avoid DataForSEO rate limits.
 * Retries with exponential backoff handle transient 5xx/rate-limit errors.
 */

export interface CompetitorAnalysisJobData {
  competitorId: string;
  organizationId: string;
}

export const competitorAnalysisQueue = new Queue<CompetitorAnalysisJobData>(
  'competitor-analysis',
  {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000, // 5s, 10s, 20s
      },
      removeOnComplete: {
        age: 604800, // Keep completed for 7 days (audit)
        count: 500,
      },
      removeOnFail: {
        age: 2592000, // Keep failed for 30 days
      },
    },
  },
);

competitorAnalysisQueue.on('error', (error) => {
  console.error('[CompetitorAnalysisQueue] Error:', error);
});

export default competitorAnalysisQueue;
