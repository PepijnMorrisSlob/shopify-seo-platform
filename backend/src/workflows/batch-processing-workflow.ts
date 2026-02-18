/**
 * Batch Processing Workflow
 *
 * Generate multiple Q&A pages in one batch (10-100 questions).
 *
 * Use cases:
 * - Initial content seeding for new clients
 * - Bulk content generation from keyword lists
 * - Competitor content gap filling
 * - Seasonal content campaigns
 *
 * Features:
 * - Priority queue management
 * - Progress tracking
 * - Error handling (continue on failure)
 * - Rate limiting (avoid API throttling)
 * - Concurrent processing (up to 5 at once)
 * - Automatic retries for failed items
 */

import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import ContentGenerationWorkflow from './content-generation-workflow';
import { getRedisConnection } from '../config/redis.config';

export interface BatchProcessingWorkflowInput {
  organizationId: string;
  questions: {
    id: string;
    question: string;
    targetKeyword?: string;
    priority?: number; // 1-10, higher = more important
    relatedProducts?: any[];
  }[];
  concurrency?: number; // How many to process in parallel (default: 5)
  skipPublishing?: boolean; // Generate but don't auto-publish
  retryFailures?: boolean; // Retry failed items
}

export interface BatchProcessingWorkflowResult {
  success: boolean;
  totalQuestions: number;
  completed: number;
  failed: number;
  pending: number;
  results: {
    questionId: string;
    question: string;
    status: 'completed' | 'failed' | 'pending';
    qaPageId?: string;
    seoScore?: number;
    error?: string;
  }[];
  error?: string;
}

export class BatchProcessingWorkflow {
  private contentGenerationWorkflow: ContentGenerationWorkflow;
  private batchQueue: Queue;

  constructor(private prisma: PrismaClient) {
    this.contentGenerationWorkflow = new ContentGenerationWorkflow(prisma);

    // Create batch processing queue
    this.batchQueue = new Queue('batch-processing', {
      connection: getRedisConnection() as any, // Type cast to resolve BullMQ/ioredis version mismatch
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          age: 86400, // 24 hours
          count: 500,
        },
        removeOnFail: {
          age: 604800, // 7 days
        },
      },
    });
  }

  /**
   * Execute batch content generation
   */
  async execute(input: BatchProcessingWorkflowInput): Promise<BatchProcessingWorkflowResult> {
    console.log(`[BatchProcessingWorkflow] Starting batch of ${input.questions.length} questions`);

    const concurrency = input.concurrency || 5;
    const results: any[] = [];

    try {
      // Sort questions by priority (highest first)
      const sortedQuestions = [...input.questions].sort(
        (a, b) => (b.priority || 5) - (a.priority || 5)
      );

      console.log(`[BatchProcessingWorkflow] Processing with concurrency: ${concurrency}`);

      // Process in batches to respect rate limits
      for (let i = 0; i < sortedQuestions.length; i += concurrency) {
        const batch = sortedQuestions.slice(i, i + concurrency);

        console.log(
          `[BatchProcessingWorkflow] Processing batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(sortedQuestions.length / concurrency)}`
        );

        // Process batch in parallel
        const batchResults = await Promise.allSettled(
          batch.map((q) =>
            this.processQuestion({
              questionId: q.id,
              organizationId: input.organizationId,
              question: q.question,
              targetKeyword: q.targetKeyword,
              relatedProducts: q.relatedProducts,
              skipPublishing: input.skipPublishing,
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

            console.error(
              `[BatchProcessingWorkflow] Failed to process "${question.question}":`,
              error
            );
          }
        });

        // Add delay between batches to avoid rate limiting
        if (i + concurrency < sortedQuestions.length) {
          console.log('[BatchProcessingWorkflow] Waiting 5s before next batch...');
          await this.sleep(5000);
        }
      }

      // Retry failed items if requested
      if (input.retryFailures) {
        const failedItems = results.filter((r) => r.status === 'failed');

        if (failedItems.length > 0) {
          console.log(`[BatchProcessingWorkflow] Retrying ${failedItems.length} failed items...`);

          for (const failedItem of failedItems) {
            try {
              const retryResult = await this.processQuestion({
                questionId: failedItem.questionId,
                organizationId: input.organizationId,
                question: failedItem.question,
                skipPublishing: input.skipPublishing,
              });

              if (retryResult.success) {
                // Update result
                failedItem.status = 'completed';
                failedItem.qaPageId = retryResult.qaPageId;
                failedItem.seoScore = retryResult.seoScore;
                delete failedItem.error;
              }
            } catch (error) {
              console.error('[BatchProcessingWorkflow] Retry failed:', error);
            }
          }
        }
      }

      // Calculate stats
      const completed = results.filter((r) => r.status === 'completed').length;
      const failed = results.filter((r) => r.status === 'failed').length;
      const pending = results.filter((r) => r.status === 'pending').length;

      console.log('[BatchProcessingWorkflow] Batch complete!');
      console.log(`[BatchProcessingWorkflow] Completed: ${completed}, Failed: ${failed}, Pending: ${pending}`);

      return {
        success: true,
        totalQuestions: input.questions.length,
        completed,
        failed,
        pending,
        results,
      };
    } catch (error: any) {
      console.error('[BatchProcessingWorkflow] Batch processing failed:', error);

      return {
        success: false,
        totalQuestions: input.questions.length,
        completed: 0,
        failed: 0,
        pending: 0,
        results: [],
        error: error.message,
      };
    }
  }

  /**
   * Process a single question
   */
  private async processQuestion(input: {
    questionId: string;
    organizationId: string;
    question: string;
    targetKeyword?: string;
    relatedProducts?: any[];
    skipPublishing?: boolean;
  }): Promise<any> {
    console.log(`[BatchProcessingWorkflow] Processing: "${input.question}"`);

    try {
      const result = await this.contentGenerationWorkflow.execute({
        questionId: input.questionId,
        organizationId: input.organizationId,
        question: input.question,
        targetKeyword: input.targetKeyword,
        relatedProducts: input.relatedProducts,
        skipPublishing: input.skipPublishing,
      });

      return result;
    } catch (error: any) {
      console.error(`[BatchProcessingWorkflow] Error processing "${input.question}":`, error);
      throw error;
    }
  }

  /**
   * Add batch to queue for background processing
   */
  async addToQueue(input: BatchProcessingWorkflowInput): Promise<{ jobId: string }> {
    console.log(`[BatchProcessingWorkflow] Adding batch of ${input.questions.length} to queue`);

    const job = await this.batchQueue.add(
      'batch-content-generation',
      input,
      {
        priority: 5,
      }
    );

    console.log(`[BatchProcessingWorkflow] Added to queue with job ID: ${job.id}`);

    return { jobId: job.id || 'unknown' };
  }

  /**
   * Get batch processing progress
   */
  async getProgress(jobId: string): Promise<{
    status: string;
    progress: number;
    completed: number;
    total: number;
    result?: any;
  }> {
    const job = await this.batchQueue.getJob(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const state = await job.getState();
    const progress = job.progress || 0;

    return {
      status: state,
      progress: typeof progress === 'number' ? progress : 0,
      completed: job.returnvalue?.completed || 0,
      total: job.data.questions?.length || 0,
      result: job.returnvalue,
    };
  }

  /**
   * Get all batch jobs for an organization
   */
  async getBatchJobs(organizationId: string, limit: number = 10): Promise<any[]> {
    const jobs = await this.batchQueue.getJobs(['completed', 'failed', 'active', 'waiting'], 0, limit);

    return jobs
      .filter((job) => job.data.organizationId === organizationId)
      .map((job) => ({
        jobId: job.id,
        status: job.finishedOn ? 'completed' : job.failedReason ? 'failed' : 'processing',
        totalQuestions: job.data.questions?.length || 0,
        createdAt: new Date(job.timestamp),
        completedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
        result: job.returnvalue,
      }));
  }

  /**
   * Cancel a batch job
   */
  async cancelBatch(jobId: string): Promise<void> {
    const job = await this.batchQueue.getJob(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    await job.remove();
    console.log(`[BatchProcessingWorkflow] Cancelled job ${jobId}`);
  }

  /**
   * Estimate batch processing time
   */
  estimateProcessingTime(questionCount: number, concurrency: number = 5): {
    estimatedMinutes: number;
    estimatedCost: number;
  } {
    // Average: 30 seconds per question
    const avgTimePerQuestion = 30; // seconds
    const totalTime = (questionCount / concurrency) * avgTimePerQuestion;
    const estimatedMinutes = Math.ceil(totalTime / 60);

    // Cost estimation:
    // - Perplexity: $0.01 per question
    // - Claude: $0.05 per question
    // - OpenAI embeddings: $0.02 per question
    const avgCostPerQuestion = 0.08;
    const estimatedCost = questionCount * avgCostPerQuestion;

    return {
      estimatedMinutes,
      estimatedCost: Math.round(estimatedCost * 100) / 100,
    };
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get queue stats
   */
  async getQueueStats() {
    const counts = await this.batchQueue.getJobCounts('waiting', 'active', 'completed', 'failed');

    return {
      waiting: counts.waiting,
      active: counts.active,
      completed: counts.completed,
      failed: counts.failed,
    };
  }
}

export default BatchProcessingWorkflow;
