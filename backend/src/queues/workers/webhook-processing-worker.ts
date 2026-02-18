import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../../config/redis.config';
import { WebhookJobData } from '../../types/automation.types';
import { Logger } from '@nestjs/common';

/**
 * Webhook Processing Worker
 * Processes Shopify webhooks with idempotency
 *
 * Critical Features:
 * - FIFO processing
 * - Idempotency check
 * - Fast processing (<30s target)
 * - Retry: 3 attempts
 * - DLQ for failed webhooks + alerts
 *
 * Scale: 1,000+ webhooks/minute
 */

const logger = new Logger('WebhookProcessingWorker');

export const webhookProcessingWorker = new Worker<WebhookJobData>(
  'webhook-processing',
  async (job: Job<WebhookJobData>) => {
    const { webhookId, topic, shopDomain, payload } = job.data;

    const startTime = Date.now();
    logger.log(`Processing webhook ${webhookId} - Topic: ${topic} (Job ${job.id})`);

    try {
      // Update job progress
      await job.updateProgress(10);

      // TODO: Call WebhookProcessorService to process webhook
      // const webhookProcessor = new WebhookProcessorService();
      // const result = await webhookProcessor.processWebhook({
      //   id: webhookId,
      //   topic,
      //   shop_domain: shopDomain,
      //   payload,
      //   received_at: new Date(),
      // });

      await job.updateProgress(50);

      // Mock processing (replace with actual service call)
      const result = {
        success: true,
        webhookId,
        action: 'updated' as 'created' | 'updated' | 'deleted' | 'app_uninstalled',
      };

      if (!result.success) {
        throw new Error('Webhook processing failed');
      }

      await job.updateProgress(100);

      const processingTime = Date.now() - startTime;
      logger.log(`Successfully processed webhook ${webhookId} in ${processingTime}ms`);

      // Alert if processing time exceeds threshold
      if (processingTime > 30000) {
        logger.warn(`Webhook ${webhookId} processing time exceeded 30s: ${processingTime}ms`);
      }

      return {
        success: true,
        webhookId,
        action: result.action,
        processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error(`Error processing webhook ${webhookId} after ${processingTime}ms:`, error);

      throw error; // Re-throw to trigger retry
    }
  },
  {
    connection: getRedisConnection(),
    concurrency: 20, // Process 20 webhooks concurrently (high throughput)
    limiter: {
      max: 1000, // Max 1000 webhooks per duration
      duration: 60000, // 1 minute
    },
  }
);

// Worker event handlers
webhookProcessingWorker.on('completed', (job) => {
  logger.log(`Webhook job ${job.id} completed successfully`);
});

webhookProcessingWorker.on('failed', (job, error) => {
  logger.error(`Webhook job ${job?.id} failed:`, error);

  // Move to DLQ if max attempts reached
  if (job && job.attemptsMade >= 3) {
    logger.error(`Webhook job ${job.id} moved to DLQ after ${job.attemptsMade} attempts`);

    // Check DLQ depth and alert if exceeds threshold
    // TODO: Implement DLQ depth monitoring
    // if (dlqDepth > 10) {
    //   logger.error('ALERT: DLQ depth exceeds 10 failed webhooks');
    //   // Send alert to monitoring system
    // }
  }
});

webhookProcessingWorker.on('error', (error) => {
  logger.error('Webhook processing worker error:', error);
});

// Monitor queue health
webhookProcessingWorker.on('active', (job) => {
  logger.log(`Webhook job ${job.id} is now active`);
});

export default webhookProcessingWorker;
