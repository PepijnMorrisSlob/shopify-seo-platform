import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { getRedisConnection } from '../../config/redis.config';
import { ContentGenerationJobData, QAContentGenerationJobData } from '../../types/automation.types';
import { ContentGenerationWorkflow } from '../../workflows/content-generation-workflow';
import { Logger } from '@nestjs/common';

/**
 * Content Generation Worker
 * Processes AI content generation jobs using ContentGenerationWorkflow
 *
 * Handles both:
 * - Product content generation (ContentGenerationJobData)
 * - Q&A content generation (QAContentGenerationJobData) - triggered by add-to-queue
 *
 * Scale: 10 concurrent jobs
 * Retry: 3 attempts with exponential backoff
 * DLQ: Failed jobs after 3 attempts
 */

const logger = new Logger('ContentGenerationWorker');
const prisma = new PrismaClient();

type JobData = ContentGenerationJobData | QAContentGenerationJobData;

function isQAJob(data: JobData): data is QAContentGenerationJobData {
  return 'qaPageId' in data && 'question' in data;
}

export const contentGenerationWorker = new Worker<JobData>(
  'content-generation',
  async (job: Job<JobData>) => {
    const data = job.data;

    if (isQAJob(data)) {
      // Q&A Content Generation - uses full ContentGenerationWorkflow
      const { qaPageId, organizationId, question, targetKeyword } = data;
      logger.log(`Processing Q&A content generation for "${question}" (QAPage ${qaPageId}, Job ${job.id})`);

      try {
        await job.updateProgress(5);

        // Update QAPage status to show we're actively processing
        await prisma.qAPage.update({
          where: { id: qaPageId },
          data: { status: 'generating' },
        });

        await job.updateProgress(10);

        // Execute the full 8-step content generation workflow
        const workflow = new ContentGenerationWorkflow(prisma);
        const result = await workflow.execute({
          questionId: qaPageId,
          organizationId,
          question,
          targetKeyword,
        });

        await job.updateProgress(90);

        if (result.success) {
          logger.log(
            `Successfully generated content for "${question}" - ` +
            `SEO Score: ${result.seoScore}, Status: ${result.status}`
          );

          // The workflow already saves to DB and updates status,
          // but if it created a new QAPage, update the original one
          if (result.qaPageId && result.qaPageId !== qaPageId) {
            // Workflow created a new record; update original to point to it
            await prisma.qAPage.update({
              where: { id: qaPageId },
              data: {
                status: result.status === 'published' ? 'published' :
                        result.status === 'pending_review' ? 'pending_review' : 'draft',
                seoScore: result.seoScore || 0,
              },
            });
          }
        } else {
          logger.error(`Content generation failed for "${question}": ${result.error}`);

          // Update QAPage to draft status with error
          await prisma.qAPage.update({
            where: { id: qaPageId },
            data: { status: 'draft' },
          });
        }

        await job.updateProgress(100);

        return {
          success: result.success,
          qaPageId,
          seoScore: result.seoScore,
          status: result.status,
        };
      } catch (error: any) {
        logger.error(`Error generating Q&A content for "${question}":`, error);

        // Update QAPage status to indicate failure
        try {
          await prisma.qAPage.update({
            where: { id: qaPageId },
            data: { status: 'draft' },
          });
        } catch {
          // DB update failed too - ignore
        }

        throw error; // Re-throw to trigger retry
      }
    } else {
      // Product Content Generation (legacy path)
      const { productId, organizationId, aiModel, productData } = data;
      logger.log(`Processing product content generation for ${productId} (Job ${job.id})`);

      try {
        await job.updateProgress(10);

        // Use AIContentService for product-based content
        const { default: AIContentService } = await import('../../services/ai-content-service');
        const aiContentService = new AIContentService();

        await job.updateProgress(30);

        const variants = await aiContentService.generateContent(
          'product_meta',
          { productTitle: productData.title, productDescription: productData.description },
          organizationId,
          3,
        );

        await job.updateProgress(80);

        // Save to database
        const bestVariant = variants[0];
        const overallScore = typeof bestVariant?.qualityScore === 'object'
          ? (bestVariant.qualityScore as any).overall || 0
          : 0;
        await prisma.contentGeneration.create({
          data: {
            organizationId,
            productId,
            targetType: 'META_TITLE',
            aiModel,
            prompt: `Generate SEO meta content for: ${productData.title}`,
            generatedContent: bestVariant?.content || `${productData.title} | Best ${productData.product_type}`,
            variants: JSON.parse(JSON.stringify(variants)),
            qualityScore: overallScore,
            status: 'PENDING',
          },
        });

        await job.updateProgress(100);

        logger.log(`Successfully generated product content for ${productId}`);

        return {
          success: true,
          productId,
          variants,
        };
      } catch (error: any) {
        logger.error(`Error generating product content for ${productId}:`, error);
        throw error;
      }
    }
  },
  {
    connection: getRedisConnection(),
    concurrency: 5, // Process 5 jobs concurrently (conservative for AI API rate limits)
    limiter: {
      max: 30, // Max 30 jobs per minute (stay under API rate limits)
      duration: 60000,
    },
  }
);

// Worker event handlers
contentGenerationWorker.on('completed', (job) => {
  logger.log(`Job ${job.id} completed successfully`);
});

contentGenerationWorker.on('failed', (job, error) => {
  logger.error(`Job ${job?.id} failed:`, error);

  if (job && job.attemptsMade >= 3) {
    logger.error(`Job ${job.id} moved to DLQ after ${job.attemptsMade} attempts`);
  }
});

contentGenerationWorker.on('error', (error) => {
  logger.error('Worker error:', error);
});

export default contentGenerationWorker;
