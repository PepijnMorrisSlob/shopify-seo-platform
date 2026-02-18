import { contentGenerationWorker } from './content-generation-worker';
import { publishingWorker } from './publishing-worker';
import { webhookProcessingWorker } from './webhook-processing-worker';
import { createOptimizationWorker } from './optimization-worker';
import { createBatchProcessingWorker } from './batch-processing-worker';
import { Logger } from '@nestjs/common';

/**
 * Queue Workers Entry Point
 * Starts all queue workers for background processing
 *
 * Usage:
 * - Development: npm run queue:dev
 * - Production: pm2 start dist/queues/workers/index.js --name queue-workers
 *
 * Workers:
 * - Content Generation Worker (10 concurrent, 100/min limit)
 * - Publishing Worker (5 concurrent, 50/min limit)
 * - Webhook Processing Worker (20 concurrent, 1000/min limit)
 * - Optimization Worker (2 concurrent, 10/min limit) - NEW
 * - Batch Processing Worker (1 concurrent, 5/hour limit) - NEW
 */

const logger = new Logger('QueueWorkers');

// Initialize new workers
const optimizationWorker = createOptimizationWorker();
const batchProcessingWorker = createBatchProcessingWorker();

// Graceful shutdown handler
async function shutdown() {
  logger.log('Shutting down queue workers...');

  try {
    await Promise.all([
      contentGenerationWorker.close(),
      publishingWorker.close(),
      webhookProcessingWorker.close(),
      optimizationWorker.close(),
      batchProcessingWorker.close(),
    ]);

    logger.log('All workers shut down successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error shutting down workers:', error);
    process.exit(1);
  }
}

// Handle termination signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  shutdown();
});

// Start workers
logger.log('Starting queue workers...');
logger.log('Content Generation Worker: 10 concurrent, 100/min limit');
logger.log('Publishing Worker: 5 concurrent, 50/min limit');
logger.log('Webhook Processing Worker: 20 concurrent, 1000/min limit');
logger.log('Optimization Worker: 2 concurrent, 10/min limit');
logger.log('Batch Processing Worker: 1 concurrent, 5/hour limit');
logger.log('Queue workers are running. Press Ctrl+C to stop.');

export {
  contentGenerationWorker,
  publishingWorker,
  webhookProcessingWorker,
  optimizationWorker,
  batchProcessingWorker
};
