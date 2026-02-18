/**
 * Content Calendar Type Definitions
 * Shopify SEO Platform - Content Calendar Module
 *
 * Defines all types for the content calendar functionality
 */

/**
 * Content Item Type (matches Prisma enum)
 */
export enum ContentType {
  BLOG_POST = 'BLOG_POST',
  CUSTOM_PAGE = 'CUSTOM_PAGE',
}

/**
 * Content Item Status (matches Prisma enum)
 */
export enum ContentItemStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  PUBLISHED = 'PUBLISHED',
}

/**
 * Content Item Interface
 * Represents a content item in the calendar
 */
export interface ContentItem {
  id: string;
  organizationId: string;
  title: string;
  content: string;
  contentType: ContentType;
  status: ContentItemStatus;
  scheduledAt: Date | null;
  publishedAt: Date | null;
  shopifyId: string | null;
  shopifyHandle: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  tags: string[];
  author: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO for creating a content item
 */
export interface CreateContentItemDto {
  title: string;
  content: string;
  contentType: ContentType;
  status?: ContentItemStatus;
  scheduledAt?: string | Date;
  seoTitle?: string;
  seoDescription?: string;
  tags?: string[];
  author?: string;
}

/**
 * DTO for getting calendar items (query parameters)
 */
export interface GetCalendarItemsDto {
  organizationId: string;
  startDate: string;
  endDate: string;
  contentType?: string;
  status?: string;
}

/**
 * DTO for rescheduling an item
 */
export interface RescheduleDto {
  scheduledAt: string | Date;
}

/**
 * DTO for updating item status
 */
export interface UpdateStatusDto {
  status: ContentItemStatus;
}

/**
 * Calendar filters for querying items
 */
export interface CalendarFilters {
  contentType?: ContentType;
  status?: ContentItemStatus;
}

/**
 * Calendar view date range
 */
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * Calendar statistics
 */
export interface CalendarStats {
  totalItems: number;
  draftCount: number;
  scheduledCount: number;
  publishedCount: number;
  blogPostCount: number;
  customPageCount: number;
}
