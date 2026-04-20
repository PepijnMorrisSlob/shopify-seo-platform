import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { Logger } from '@nestjs/common';
import { getRedisConnection } from '../../config/redis.config';
import { CompetitorAnalysisJobData } from '../competitor-analysis-queue';
import { CompetitorAnalysisService } from '../../services/competitor-analysis-service';

/**
 * Competitor Analysis Worker
 *
 * Drains the competitor-analysis queue, calling DataForSEO for each competitor
 * and storing results. Concurrency is intentionally low (2) because each job
 * makes 2-4 paid DataForSEO calls and we want to respect rate limits.
 */

const logger = new Logger('CompetitorAnalysisWorker');
const prisma = new PrismaClient();

export const competitorAnalysisWorker = new Worker<CompetitorAnalysisJobData>(
  'competitor-analysis',
  async (job: Job<CompetitorAnalysisJobData>) => {
    const { competitorId, organizationId } = job.data;
    logger.log(
      `Analyzing competitor ${competitorId} for org ${organizationId} (job ${job.id})`,
    );

    await job.updateProgress(10);

    const service = new CompetitorAnalysisService(prisma);
    const result = await service.analyzeCompetitor(competitorId, organizationId);

    await job.updateProgress(100);

    logger.log(
      `Analysis complete for ${result.domain}: ${result.totalKeywords} keywords, ${result.keywordGaps.length} gaps, $${result.estimatedCost.toFixed(2)} cost`,
    );

    return {
      success: true,
      competitorId,
      domain: result.domain,
      totalKeywords: result.totalKeywords,
      totalTopPages: result.totalTopPages,
      keywordGapCount: result.keywordGaps.length,
      contentGapCount: result.contentGaps.length,
      overlapPercentage: result.overlapPercentage,
      estimatedCost: result.estimatedCost,
    };
  },
  {
    connection: getRedisConnection(),
    concurrency: 2,
    limiter: {
      max: 10,
      duration: 60000, // Max 10 analyses per minute
    },
  },
);

competitorAnalysisWorker.on('completed', (job) => {
  logger.log(`Job ${job.id} completed (competitor ${job.data.competitorId})`);
});

competitorAnalysisWorker.on('failed', (job, error) => {
  logger.error(
    `Job ${job?.id} failed for competitor ${job?.data?.competitorId}: ${error.message}`,
  );
  if (job && job.attemptsMade >= 3) {
    logger.error(
      `Job ${job.id} sent to DLQ after ${job.attemptsMade} attempts`,
    );
  }
});

competitorAnalysisWorker.on('error', (error) => {
  logger.error('Worker error:', error);
});

export default competitorAnalysisWorker;
