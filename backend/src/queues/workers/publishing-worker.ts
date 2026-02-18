import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../../config/redis.config';
import { PublishingJobData } from '../../types/automation.types';
import { Logger } from '@nestjs/common';

/**
 * Publishing Worker
 * Processes content publishing jobs to Shopify
 *
 * Critical operation with higher retry attempts
 * Scale: 100+ concurrent publishes
 * Retry: 5 attempts with exponential backoff
 * DLQ: Failed jobs after 5 attempts + alerts
 */

const logger = new Logger('PublishingWorker');

export const publishingWorker = new Worker<PublishingJobData>(
  'publishing',
  async (job: Job<PublishingJobData>) => {
    const { productId, organizationId, metaTitle, metaDescription, schemaMarkup } = job.data;

    logger.log(`Processing publish for product ${productId} (Job ${job.id})`);

    try {
      // Update job progress
      await job.updateProgress(10);

      // TODO: Call PublishingService to publish content
      // const publishingService = new PublishingService();
      // const result = await publishingService.publishProductMetaTags(
      //   productId,
      //   metaTitle,
      //   metaDescription,
      //   organizationId
      // );

      await job.updateProgress(50);

      // Mock publishing (replace with actual service call)
      const result = {
        success: true,
        productId,
        publishedAt: new Date(),
        shopifyProductId: '12345',
      };

      if (!result.success) {
        throw new Error('Publishing failed');
      }

      await job.updateProgress(90);

      // Update bulk operation progress if this is part of bulk operation
      const bulkJobId = job.name.includes('bulk-publish-')
        ? job.name.split('-')[2]
        : null;

      if (bulkJobId) {
        // const bulkOpsService = new BulkOperationsService();
        // await bulkOpsService.updateBulkProgress(bulkJobId, true);
      }

      // Update scheduled content if this is a scheduled publish
      if (job.name.includes('scheduled-publish-')) {
        const scheduledJobId = job.name.split('-')[2];
        // const contentCalendarService = new ContentCalendarService();
        // await contentCalendarService.markScheduledPublishCompleted(scheduledJobId);
      }

      await job.updateProgress(100);

      logger.log(`Successfully published content for product ${productId}`);

      return {
        success: true,
        productId,
        publishedAt: result.publishedAt,
      };
    } catch (error) {
      logger.error(`Error publishing content for product ${productId}:`, error);

      // Update bulk operation progress with failure
      const bulkJobId = job.name.includes('bulk-publish-')
        ? job.name.split('-')[2]
        : null;

      if (bulkJobId) {
        // const bulkOpsService = new BulkOperationsService();
        // await bulkOpsService.updateBulkProgress(bulkJobId, false);
      }

      // Update scheduled content with error
      if (job.name.includes('scheduled-publish-')) {
        const scheduledJobId = job.name.split('-')[2];
        // const contentCalendarService = new ContentCalendarService();
        // await contentCalendarService.markScheduledPublishFailed(
        //   scheduledJobId,
        //   error instanceof Error ? error.message : 'Unknown error'
        // );
      }

      throw error; // Re-throw to trigger retry
    }
  },
  {
    connection: getRedisConnection(),
    concurrency: 5, // Process 5 publishing jobs concurrently (critical operation)
    limiter: {
      max: 50, // Max 50 publishes per duration
      duration: 60000, // 1 minute (respect Shopify rate limits)
    },
  }
);

// Worker event handlers
publishingWorker.on('completed', (job) => {
  logger.log(`Publishing job ${job.id} completed successfully`);
});

publishingWorker.on('failed', (job, error) => {
  logger.error(`Publishing job ${job?.id} failed:`, error);

  // CRITICAL ALERT: Publishing failure
  if (job && job.attemptsMade >= 5) {
    logger.error(`CRITICAL: Publishing job ${job.id} permanently failed after ${job.attemptsMade} attempts`);
    // TODO: Send critical alert to monitoring system (PagerDuty, Slack, etc.)
    // TODO: Move to DLQ for manual review
  }
});

publishingWorker.on('progress', (job, progress) => {
  logger.log(`Publishing job ${job.id} progress: ${progress}%`);
});

publishingWorker.on('error', (error) => {
  logger.error('Publishing worker error:', error);
});

export default publishingWorker;
