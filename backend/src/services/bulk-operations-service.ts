import { Injectable, Logger } from '@nestjs/common';
import { BulkJobStatus, BulkJobError } from '../types/automation.types';
import { contentGenerationQueue } from '../queues/content-generation-queue';
import { publishingQueue } from '../queues/publishing-queue';
import { PrismaClient } from '../types/database.types';

/**
 * Bulk Operations Service
 * Handles bulk content generation and publishing
 *
 * Features:
 * - Process 100+ products simultaneously
 * - Real-time progress tracking
 * - Pause/resume capability
 * - Error handling (continue on failure)
 * - Detailed error reporting
 *
 * Scale: 1,000+ products per bulk operation
 * Target: <10min for 100 products
 */

@Injectable()
export class BulkOperationsService {
  private readonly logger = new Logger(BulkOperationsService.name);
  private prisma: PrismaClient;
  private aiContentService: any; // AIContentService - injected

  constructor() {
    // Injected via NestJS DI in production
  }

  /**
   * Generate content for multiple products in bulk
   * @param productIds Array of product IDs
   * @param aiModel AI model to use
   * @param organizationId Organization ID
   * @returns Bulk job ID for tracking
   */
  async generateBulkContent(
    productIds: string[],
    aiModel: string,
    organizationId: string
  ): Promise<string> {
    this.logger.log(`Starting bulk content generation for ${productIds.length} products`);

    // 1. Create bulk operation record
    const bulkOp = await this.prisma.bulkOperation.create({
      data: {
        organization_id: organizationId,
        operation_type: 'generate',
        total_items: productIds.length,
        processed_items: 0,
        successful_items: 0,
        failed_items: 0,
        status: 'pending',
        created_at: new Date(),
      },
    });

    // 2. Fetch products from database
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        organization_id: organizationId,
      },
    });

    if (products.length !== productIds.length) {
      this.logger.warn(
        `Only found ${products.length} out of ${productIds.length} products`
      );
    }

    // 3. Queue content generation jobs
    const jobPromises = products.map((product: any, index: number) =>
      contentGenerationQueue.add(
        `bulk-generate-${bulkOp.id}-${product.id}` as any, // Type cast for dynamic queue name
        {
          productId: product.id,
          organizationId,
          aiModel,
          productData: {
            title: product.title,
            description: product.description,
            vendor: product.vendor,
            product_type: product.product_type,
          },
        },
        {
          priority: 5, // Medium priority for bulk operations
        }
      )
    );

    await Promise.all(jobPromises);

    // 4. Update bulk operation status
    await this.prisma.bulkOperation.update({
      where: { id: bulkOp.id },
      data: {
        job_id: bulkOp.id,
        status: 'processing',
        started_at: new Date(),
      },
    });

    this.logger.log(`Queued ${products.length} content generation jobs for bulk operation ${bulkOp.id}`);

    return bulkOp.id;
  }

  /**
   * Get status of a bulk operation
   * @param jobId Bulk job ID
   * @returns Bulk job status with progress
   */
  async getBulkJobStatus(jobId: string): Promise<BulkJobStatus> {
    this.logger.log(`Fetching status for bulk job ${jobId}`);

    const bulkOp = await this.prisma.bulkOperation.findUnique({
      where: { id: jobId },
    });

    if (!bulkOp) {
      throw new Error(`Bulk operation ${jobId} not found`);
    }

    // Calculate progress percentage
    const progress =
      bulkOp.total_items > 0
        ? Math.round((bulkOp.processed_items / bulkOp.total_items) * 100)
        : 0;

    // Fetch errors if any
    const errors: BulkJobError[] = [];
    // TODO: Query errors from database or cache

    return {
      jobId: bulkOp.id,
      status: bulkOp.status as 'pending' | 'processing' | 'completed' | 'failed',
      totalItems: bulkOp.total_items,
      processedItems: bulkOp.processed_items,
      successfulItems: bulkOp.successful_items,
      failedItems: bulkOp.failed_items,
      progress,
      startedAt: bulkOp.started_at || undefined,
      completedAt: bulkOp.completed_at || undefined,
      errors,
    };
  }

  /**
   * Publish multiple products in bulk
   * @param contentIds Array of content generation IDs
   * @param organizationId Organization ID
   * @returns Bulk job ID
   */
  async publishBulk(
    contentIds: string[],
    organizationId: string
  ): Promise<string> {
    this.logger.log(`Starting bulk publish for ${contentIds.length} content items`);

    // 1. Create bulk operation record
    const bulkOp = await this.prisma.bulkOperation.create({
      data: {
        organization_id: organizationId,
        operation_type: 'publish',
        total_items: contentIds.length,
        processed_items: 0,
        successful_items: 0,
        failed_items: 0,
        status: 'pending',
        created_at: new Date(),
      },
    });

    // 2. Fetch content from database
    const contentItems = await this.prisma.contentGeneration.findMany({
      where: {
        id: { in: contentIds },
        organization_id: organizationId,
        status: 'approved', // Only publish approved content
      },
    });

    if (contentItems.length !== contentIds.length) {
      this.logger.warn(
        `Only found ${contentItems.length} approved content items out of ${contentIds.length}`
      );
    }

    // 3. Queue publishing jobs
    const jobPromises = contentItems.map((content: any, index: number) =>
      publishingQueue.add(
        `bulk-publish-${bulkOp.id}-${content.id}` as any, // Type cast for dynamic queue name
        {
          productId: content.product_id,
          organizationId,
          metaTitle: content.metaTitle,
          metaDescription: content.metaDescription,
          schemaMarkup: content.schema_markup || undefined,
        },
        {
          priority: 7, // Higher priority for publishing
        }
      )
    );

    await Promise.all(jobPromises);

    // 4. Update bulk operation status
    await this.prisma.bulkOperation.update({
      where: { id: bulkOp.id },
      data: {
        job_id: bulkOp.id,
        status: 'processing',
        started_at: new Date(),
      },
    });

    this.logger.log(`Queued ${contentItems.length} publishing jobs for bulk operation ${bulkOp.id}`);

    return bulkOp.id;
  }

  /**
   * Pause a bulk operation
   * @param jobId Bulk job ID
   */
  async pauseBulkOperation(jobId: string): Promise<void> {
    this.logger.log(`Pausing bulk operation ${jobId}`);

    const bulkOp = await this.prisma.bulkOperation.findUnique({
      where: { id: jobId },
    });

    if (!bulkOp) {
      throw new Error(`Bulk operation ${jobId} not found`);
    }

    if (bulkOp.status !== 'processing') {
      throw new Error(`Cannot pause bulk operation with status: ${bulkOp.status}`);
    }

    // Update status to paused
    await this.prisma.bulkOperation.update({
      where: { id: jobId },
      data: {
        status: 'paused',
        updated_at: new Date(),
      },
    });

    // TODO: Pause queue workers for this bulk operation
    // This would require custom queue management logic

    this.logger.log(`Paused bulk operation ${jobId}`);
  }

  /**
   * Resume a paused bulk operation
   * @param jobId Bulk job ID
   */
  async resumeBulkOperation(jobId: string): Promise<void> {
    this.logger.log(`Resuming bulk operation ${jobId}`);

    const bulkOp = await this.prisma.bulkOperation.findUnique({
      where: { id: jobId },
    });

    if (!bulkOp) {
      throw new Error(`Bulk operation ${jobId} not found`);
    }

    if (bulkOp.status !== 'paused') {
      throw new Error(`Cannot resume bulk operation with status: ${bulkOp.status}`);
    }

    // Update status to processing
    await this.prisma.bulkOperation.update({
      where: { id: jobId },
      data: {
        status: 'processing',
        updated_at: new Date(),
      },
    });

    // TODO: Resume queue workers for this bulk operation

    this.logger.log(`Resumed bulk operation ${jobId}`);
  }

  /**
   * Update bulk operation progress (called by queue workers)
   * @param jobId Bulk job ID
   * @param success Whether the item was processed successfully
   */
  async updateBulkProgress(jobId: string, success: boolean): Promise<void> {
    const bulkOp = await this.prisma.bulkOperation.findUnique({
      where: { id: jobId },
    });

    if (!bulkOp) {
      this.logger.error(`Bulk operation ${jobId} not found`);
      return;
    }

    const processedItems = bulkOp.processed_items + 1;
    const successfulItems = success
      ? bulkOp.successful_items + 1
      : bulkOp.successful_items;
    const failedItems = success ? bulkOp.failed_items : bulkOp.failed_items + 1;

    // Check if bulk operation is complete
    const isComplete = processedItems >= bulkOp.total_items;
    const status = isComplete ? 'completed' : bulkOp.status;

    await this.prisma.bulkOperation.update({
      where: { id: jobId },
      data: {
        processed_items: processedItems,
        successful_items: successfulItems,
        failed_items: failedItems,
        status: status as 'pending' | 'processing' | 'completed' | 'failed' | 'paused',
        completed_at: isComplete ? new Date() : undefined,
        updated_at: new Date(),
      },
    });

    if (isComplete) {
      this.logger.log(
        `Bulk operation ${jobId} completed: ${successfulItems}/${bulkOp.total_items} successful, ${failedItems} failed`
      );
    }
  }

  /**
   * Cancel a bulk operation
   * @param jobId Bulk job ID
   */
  async cancelBulkOperation(jobId: string): Promise<void> {
    this.logger.log(`Cancelling bulk operation ${jobId}`);

    const bulkOp = await this.prisma.bulkOperation.findUnique({
      where: { id: jobId },
    });

    if (!bulkOp) {
      throw new Error(`Bulk operation ${jobId} not found`);
    }

    if (bulkOp.status === 'completed') {
      throw new Error('Cannot cancel completed bulk operation');
    }

    // Update status
    await this.prisma.bulkOperation.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        completed_at: new Date(),
        updated_at: new Date(),
      },
    });

    // TODO: Remove pending jobs from queue

    this.logger.log(`Cancelled bulk operation ${jobId}`);
  }

  /**
   * Get all bulk operations for an organization
   * @param organizationId Organization ID
   * @returns Array of bulk operations
   */
  async getBulkOperations(organizationId: string): Promise<BulkJobStatus[]> {
    const bulkOps = await this.prisma.bulkOperation.findMany({
      where: { organization_id: organizationId },
      orderBy: { created_at: 'desc' },
      take: 50, // Limit to last 50 operations
    });

    return bulkOps.map((op: any) => ({
      jobId: op.id,
      status: op.status as 'pending' | 'processing' | 'completed' | 'failed',
      totalItems: op.total_items,
      processedItems: op.processed_items,
      successfulItems: op.successful_items,
      failedItems: op.failed_items,
      progress:
        op.total_items > 0
          ? Math.round((op.processed_items / op.total_items) * 100)
          : 0,
      startedAt: op.started_at || undefined,
      completedAt: op.completed_at || undefined,
      errors: [],
    }));
  }
}

export default BulkOperationsService;
