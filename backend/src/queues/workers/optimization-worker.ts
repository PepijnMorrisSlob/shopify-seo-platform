/**
 * Optimization Worker
 *
 * Processes auto-optimization jobs from the queue.
 * Triggered by:
 * - Daily cron job
 * - Manual optimization requests
 * - Performance threshold alerts
 */

import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { getRedisConnection } from '../../config/redis.config';
import AutoOptimizationWorkflow, { OptimizationWorkflowInput } from '../../workflows/auto-optimization-workflow';

const prisma = new PrismaClient();

/**
 * Process optimization job
 */
async function processOptimizationJob(job: Job<OptimizationWorkflowInput>) {
  console.log(`[OptimizationWorker] Processing job ${job.id} for organization ${job.data.organizationId}`);

  const workflow = new AutoOptimizationWorkflow(prisma);

  try {
    // Update progress: Starting
    await job.updateProgress(0);

    // Execute optimization workflow
    const result = await workflow.execute(job.data);

    // Update progress: Complete
    await job.updateProgress(100);

    console.log(`[OptimizationWorker] Job ${job.id} completed. Optimized ${result.pagesOptimized} pages`);

    return result;
  } catch (error: any) {
    console.error(`[OptimizationWorker] Job ${job.id} failed:`, error);
    throw error;
  }
}

/**
 * Create and start optimization worker
 */
export function createOptimizationWorker() {
  const worker = new Worker<OptimizationWorkflowInput>('optimization', processOptimizationJob, {
    connection: getRedisConnection(),
    concurrency: 2, // Process 2 optimization jobs concurrently
    limiter: {
      max: 10, // Max 10 jobs
      duration: 60000, // Per minute
    },
  });

  // Event handlers
  worker.on('completed', (job) => {
    console.log(`[OptimizationWorker] Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, error) => {
    console.error(`[OptimizationWorker] Job ${job?.id} failed:`, error);
  });

  worker.on('error', (error) => {
    console.error('[OptimizationWorker] Worker error:', error);
  });

  console.log('[OptimizationWorker] Worker started');

  return worker;
}

// If running as standalone process
if (require.main === module) {
  const worker = createOptimizationWorker();

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('[OptimizationWorker] SIGTERM received, shutting down gracefully...');
    await worker.close();
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('[OptimizationWorker] SIGINT received, shutting down gracefully...');
    await worker.close();
    await prisma.$disconnect();
    process.exit(0);
  });
}

export default createOptimizationWorker;
