/**
 * Content Calendar Service
 * Shopify SEO Platform
 *
 * Handles content calendar operations:
 * - Get calendar items within a date range
 * - Create, update, and reschedule content items
 * - Update item status (draft -> scheduled -> published)
 * - Filter by content type and status
 *
 * Uses PrismaClient for database operations
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  ContentItem,
  ContentType,
  ContentItemStatus,
  CreateContentItemDto,
  CalendarFilters,
} from '../types/calendar.types';

@Injectable()
export class ContentCalendarService {
  private readonly logger = new Logger(ContentCalendarService.name);
  private readonly prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Get calendar items for a date range
   *
   * @param organizationId - Organization ID
   * @param startDate - Start of date range
   * @param endDate - End of date range
   * @param filters - Optional filters for content type and status
   * @returns Array of content items
   */
  async getCalendarItems(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    filters?: CalendarFilters
  ): Promise<ContentItem[]> {
    this.logger.log(
      `Fetching calendar items for org ${organizationId} from ${startDate.toISOString()} to ${endDate.toISOString()}`
    );

    try {
      // Build where clause
      const whereClause: any = {
        organizationId,
        OR: [
          // Items scheduled within the date range
          {
            scheduledAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          // Items published within the date range
          {
            publishedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          // Draft items created within the date range (no scheduled date)
          {
            AND: [
              { scheduledAt: null },
              { publishedAt: null },
              {
                createdAt: {
                  gte: startDate,
                  lte: endDate,
                },
              },
            ],
          },
        ],
      };

      // Apply optional filters
      if (filters?.contentType) {
        whereClause.contentType = filters.contentType;
      }

      if (filters?.status) {
        whereClause.status = filters.status;
      }

      const items = await this.prisma.contentItem.findMany({
        where: whereClause,
        orderBy: [
          { scheduledAt: 'asc' },
          { publishedAt: 'asc' },
          { createdAt: 'asc' },
        ],
      });

      this.logger.log(`Found ${items.length} calendar items`);

      return items.map(this.mapPrismaToContentItem);
    } catch (error: any) {
      this.logger.error(`Failed to fetch calendar items: ${error.message}`);
      throw new HttpException(
        `Failed to fetch calendar items: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Reschedule a content item to a new date/time
   *
   * @param itemId - Content item ID
   * @param organizationId - Organization ID (for tenant isolation)
   * @param newScheduledAt - New scheduled date/time
   * @returns Updated content item
   */
  async rescheduleItem(
    itemId: string,
    organizationId: string,
    newScheduledAt: Date
  ): Promise<ContentItem> {
    this.logger.log(
      `Rescheduling item ${itemId} to ${newScheduledAt.toISOString()}`
    );

    try {
      // Validate item exists and belongs to organization
      const existingItem = await this.prisma.contentItem.findFirst({
        where: {
          id: itemId,
          organizationId,
        },
      });

      if (!existingItem) {
        throw new HttpException(
          `Content item not found or access denied`,
          HttpStatus.NOT_FOUND
        );
      }

      // Validate that item can be rescheduled (not already published)
      if (existingItem.status === 'PUBLISHED') {
        throw new HttpException(
          `Cannot reschedule a published item`,
          HttpStatus.BAD_REQUEST
        );
      }

      // Validate that new date is in the future
      if (newScheduledAt <= new Date()) {
        throw new HttpException(
          `Scheduled date must be in the future`,
          HttpStatus.BAD_REQUEST
        );
      }

      // Update the item
      const updatedItem = await this.prisma.contentItem.update({
        where: { id: itemId },
        data: {
          scheduledAt: newScheduledAt,
          status: 'SCHEDULED',
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Successfully rescheduled item ${itemId}`);

      return this.mapPrismaToContentItem(updatedItem);
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Failed to reschedule item: ${error.message}`);
      throw new HttpException(
        `Failed to reschedule item: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Update content item status
   *
   * @param itemId - Content item ID
   * @param organizationId - Organization ID (for tenant isolation)
   * @param status - New status
   * @returns Updated content item
   */
  async updateItemStatus(
    itemId: string,
    organizationId: string,
    status: ContentItemStatus
  ): Promise<ContentItem> {
    this.logger.log(`Updating status of item ${itemId} to ${status}`);

    try {
      // Validate item exists and belongs to organization
      const existingItem = await this.prisma.contentItem.findFirst({
        where: {
          id: itemId,
          organizationId,
        },
      });

      if (!existingItem) {
        throw new HttpException(
          `Content item not found or access denied`,
          HttpStatus.NOT_FOUND
        );
      }

      // Build update data
      const updateData: any = {
        status,
        updatedAt: new Date(),
      };

      // If status is being set to PUBLISHED, set publishedAt
      if (status === ContentItemStatus.PUBLISHED) {
        updateData.publishedAt = new Date();
      }

      // If status is being set to DRAFT, clear scheduling
      if (status === ContentItemStatus.DRAFT) {
        updateData.scheduledAt = null;
        updateData.publishedAt = null;
      }

      // Update the item
      const updatedItem = await this.prisma.contentItem.update({
        where: { id: itemId },
        data: updateData,
      });

      this.logger.log(`Successfully updated status of item ${itemId}`);

      return this.mapPrismaToContentItem(updatedItem);
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Failed to update item status: ${error.message}`);
      throw new HttpException(
        `Failed to update item status: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get a single content item by ID
   *
   * @param itemId - Content item ID
   * @param organizationId - Organization ID (for tenant isolation)
   * @returns Content item or throws not found
   */
  async getItem(itemId: string, organizationId: string): Promise<ContentItem> {
    this.logger.log(`Fetching item ${itemId}`);

    try {
      const item = await this.prisma.contentItem.findFirst({
        where: {
          id: itemId,
          organizationId,
        },
      });

      if (!item) {
        throw new HttpException(
          `Content item not found or access denied`,
          HttpStatus.NOT_FOUND
        );
      }

      return this.mapPrismaToContentItem(item);
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Failed to fetch item: ${error.message}`);
      throw new HttpException(
        `Failed to fetch item: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Create a new content item
   *
   * @param organizationId - Organization ID
   * @param data - Content item data
   * @returns Created content item
   */
  async createItem(
    organizationId: string,
    data: CreateContentItemDto
  ): Promise<ContentItem> {
    this.logger.log(`Creating new content item for org ${organizationId}`);

    try {
      // Validate required fields
      if (!data.title || !data.title.trim()) {
        throw new HttpException(
          'Title is required',
          HttpStatus.BAD_REQUEST
        );
      }

      if (!data.content || !data.content.trim()) {
        throw new HttpException(
          'Content is required',
          HttpStatus.BAD_REQUEST
        );
      }

      if (!data.contentType) {
        throw new HttpException(
          'Content type is required',
          HttpStatus.BAD_REQUEST
        );
      }

      // Parse and validate scheduledAt if provided
      let scheduledAt: Date | null = null;
      if (data.scheduledAt) {
        scheduledAt = new Date(data.scheduledAt);
        if (isNaN(scheduledAt.getTime())) {
          throw new HttpException(
            'Invalid scheduled date format',
            HttpStatus.BAD_REQUEST
          );
        }
        if (scheduledAt <= new Date()) {
          throw new HttpException(
            'Scheduled date must be in the future',
            HttpStatus.BAD_REQUEST
          );
        }
      }

      // Determine status based on scheduledAt
      let status = data.status || ContentItemStatus.DRAFT;
      if (scheduledAt && status === ContentItemStatus.DRAFT) {
        status = ContentItemStatus.SCHEDULED;
      }

      // Create the item
      const createdItem = await this.prisma.contentItem.create({
        data: {
          organizationId,
          title: data.title.trim(),
          content: data.content.trim(),
          contentType: data.contentType,
          status,
          scheduledAt,
          seoTitle: data.seoTitle?.trim() || null,
          seoDescription: data.seoDescription?.trim() || null,
          tags: data.tags || [],
          author: data.author?.trim() || null,
        },
      });

      this.logger.log(`Successfully created content item ${createdItem.id}`);

      return this.mapPrismaToContentItem(createdItem);
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Failed to create item: ${error.message}`);
      throw new HttpException(
        `Failed to create item: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Update an existing content item
   *
   * @param itemId - Content item ID
   * @param organizationId - Organization ID (for tenant isolation)
   * @param data - Partial update data
   * @returns Updated content item
   */
  async updateItem(
    itemId: string,
    organizationId: string,
    data: Partial<CreateContentItemDto>
  ): Promise<ContentItem> {
    this.logger.log(`Updating content item ${itemId}`);

    try {
      // Validate item exists and belongs to organization
      const existingItem = await this.prisma.contentItem.findFirst({
        where: {
          id: itemId,
          organizationId,
        },
      });

      if (!existingItem) {
        throw new HttpException(
          `Content item not found or access denied`,
          HttpStatus.NOT_FOUND
        );
      }

      // Build update data
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (data.title !== undefined) {
        updateData.title = data.title.trim();
      }
      if (data.content !== undefined) {
        updateData.content = data.content.trim();
      }
      if (data.contentType !== undefined) {
        updateData.contentType = data.contentType;
      }
      if (data.status !== undefined) {
        updateData.status = data.status;
      }
      if (data.scheduledAt !== undefined) {
        updateData.scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null;
      }
      if (data.seoTitle !== undefined) {
        updateData.seoTitle = data.seoTitle?.trim() || null;
      }
      if (data.seoDescription !== undefined) {
        updateData.seoDescription = data.seoDescription?.trim() || null;
      }
      if (data.tags !== undefined) {
        updateData.tags = data.tags;
      }
      if (data.author !== undefined) {
        updateData.author = data.author?.trim() || null;
      }

      // Update the item
      const updatedItem = await this.prisma.contentItem.update({
        where: { id: itemId },
        data: updateData,
      });

      this.logger.log(`Successfully updated content item ${itemId}`);

      return this.mapPrismaToContentItem(updatedItem);
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Failed to update item: ${error.message}`);
      throw new HttpException(
        `Failed to update item: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Delete a content item
   *
   * @param itemId - Content item ID
   * @param organizationId - Organization ID (for tenant isolation)
   */
  async deleteItem(itemId: string, organizationId: string): Promise<void> {
    this.logger.log(`Deleting content item ${itemId}`);

    try {
      // Validate item exists and belongs to organization
      const existingItem = await this.prisma.contentItem.findFirst({
        where: {
          id: itemId,
          organizationId,
        },
      });

      if (!existingItem) {
        throw new HttpException(
          `Content item not found or access denied`,
          HttpStatus.NOT_FOUND
        );
      }

      // Delete the item
      await this.prisma.contentItem.delete({
        where: { id: itemId },
      });

      this.logger.log(`Successfully deleted content item ${itemId}`);
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Failed to delete item: ${error.message}`);
      throw new HttpException(
        `Failed to delete item: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Map Prisma ContentItem to our ContentItem interface
   */
  private mapPrismaToContentItem(prismaItem: any): ContentItem {
    return {
      id: prismaItem.id,
      organizationId: prismaItem.organizationId,
      title: prismaItem.title,
      content: prismaItem.content,
      contentType: prismaItem.contentType as ContentType,
      status: prismaItem.status as ContentItemStatus,
      scheduledAt: prismaItem.scheduledAt,
      publishedAt: prismaItem.publishedAt,
      shopifyId: prismaItem.shopifyId,
      shopifyHandle: prismaItem.shopifyHandle,
      seoTitle: prismaItem.seoTitle,
      seoDescription: prismaItem.seoDescription,
      tags: prismaItem.tags || [],
      author: prismaItem.author,
      createdAt: prismaItem.createdAt,
      updatedAt: prismaItem.updatedAt,
    };
  }
}

// Singleton instance for non-DI usage
let serviceInstance: ContentCalendarService | null = null;

/**
 * Get ContentCalendarService instance
 * For use outside of NestJS dependency injection
 *
 * @param prisma - Optional PrismaClient instance
 * @returns ContentCalendarService instance
 */
export function getContentCalendarService(
  prisma?: PrismaClient
): ContentCalendarService {
  if (!serviceInstance) {
    serviceInstance = new ContentCalendarService(prisma);
  }
  return serviceInstance;
}

export default ContentCalendarService;
