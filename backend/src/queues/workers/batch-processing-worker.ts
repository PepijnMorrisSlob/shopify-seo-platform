/**
 * Batch Processing Worker
 *
 * Processes batch content generation jobs from the queue.
 * Handles large batches (10-100+ questions) with progress tracking.
 */

import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { getRedisConnection } from '../../config/redis.config';
import BatchProcessingWorkflow, { BatchProcessingWorkflowInput } from '../../workflows/batch-processing-workflow';

const prisma = new PrismaClient();

/**
 * Process batch job
 */
async function processBatchJob(job: Job<BatchProcessingWorkflowInput>) {
  console.log(`[BatchProcessingWorker] Processing job ${job.id} - ${job.data.questions.length} questions`);

  const workflow = new BatchProcessingWorkflow(prisma);

  try {
    // Update progress: Starting
    await job.updateProgress(0);

    // Execute batch workflow with progress updates
    const concurrency = job.data.concurrency || 5;
    const totalQuestions = job.data.questions.length;
    const results: any[] = [];

    // Sort by priority
    const sortedQuestions = [...job.data.questions].sort(
      (a, b) => (b.priority || 5) - (a.priority || 5)
    );

    // Process in batches
    for (let i = 0; i < sortedQuestions.length; i += concurrency) {
      const batch = sortedQuestions.slice(i, i + concurrency);

      // Process batch
      const batchResults = await Promise.allSettled(
        batch.map((q) =>
          workflow['processQuestion']({
            questionId: q.id,
            organizationId: job.data.organizationId,
            question: q.question,
            targetKeyword: q.targetKeyword,
            relatedProducts: q.relatedProducts,
            skipPublishing: job.data.skipPublishing,
          })
        )
      );

      // Collect results
      batchResults.forEach((result, index) => {
        const question = batch[index];

        if (result.status === 'fulfilled' && result.value.success) {
          results.push({
            questionId: question.id,
            question: question.question,
            status: 'completed',
            qaPageId: result.value.qaPageId,
            seoScore: result.value.seoScore,
          });
        } else {
          const error = result.status === 'rejected' ? result.reason : result.value.error;
          results.push({
            questionId: question.id,
            question: question.question,
            status: 'failed',
            error: error?.message || error || 'Unknown error',
          });
        }
      });

      // Update progress
      const progress = Math.round(((i + batch.length) / totalQuestions) * 100);
      await job.updateProgress(progress);

      console.log(`[BatchProcessingWorker] Progress: ${i + batch.length}/${totalQuestions} (${progress}%)`);

      // Delay between batches
      if (i + concurrency < sortedQuestions.length) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    const completed = results.filter((r) => r.status === 'completed').length;
    const failed = results.filter((r) => r.status === 'failed').length;

    console.log(`[BatchProcessingWorker] Job ${job.id} completed. Success: ${completed}, Failed: ${failed}`);

    return {
      success: true,
      totalQuestions,
      completed,
      failed,
      pending: 0,
      results,
    };
  } catch (error: any) {
    console.error(`[BatchProcessingWorker] Job ${job.id} failed:`, error);
    throw error;
  }
}

/**
 * Create and start batch processing worker
 */
export function createBatchProcessingWorker() {
  const worker = new Worker<BatchProcessingWorkflowInput>('batch-processing', processBatchJob, {
    connection: getRedisConnection(),
    concurrency: 1, // Process 1 batch at a time (each batch has internal concurrency)
    limiter: {
      max: 5, // Max 5 batches
      duration: 3600000, // Per hour
    },
  });

  // Event handlers
  worker.on('completed', (job) => {
    console.log(`[BatchProcessingWorker] Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, error) => {
    console.error(`[BatchProcessingWorker] Job ${job?.id} failed:`, error);
  });

  worker.on('progress', (job, progress) => {
    console.log(`[BatchProcessingWorker] Job ${job.id} progress: ${progress}%`);
  });

  worker.on('error', (error) => {
    console.error('[BatchProcessingWorker] Worker error:', error);
  });

  console.log('[BatchProcessingWorker] Worker started');

  return worker;
}

// If running as standalone process
if (require.main === module) {
  const worker = createBatchProcessingWorker();

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('[BatchProcessingWorker] SIGTERM received, shutting down gracefully...');
    await worker.close();
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('[BatchProcessingWorker] SIGINT received, shutting down gracefully...');
    await worker.close();
    await prisma.$disconnect();
    process.exit(0);
  });
}

export default createBatchProcessingWorker;
