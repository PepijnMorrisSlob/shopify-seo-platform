/**
 * Calendar Controller
 * Shopify SEO Platform
 *
 * API endpoints for content calendar operations:
 * - GET /api/calendar - Get calendar items within a date range
 * - GET /api/calendar/:id - Get a single content item
 * - POST /api/calendar - Create a new content item
 * - PATCH /api/calendar/:id/reschedule - Reschedule a content item
 * - PATCH /api/calendar/:id/status - Update content item status
 * - PATCH /api/calendar/:id - Update content item
 * - DELETE /api/calendar/:id - Delete content item
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ContentCalendarService } from '../services/content-calendar-service';
import {
  CreateContentItemDto,
  RescheduleDto,
  UpdateStatusDto,
  ContentItemStatus,
  ContentType,
  CalendarFilters,
} from '../types/calendar.types';

@Controller('calendar')
export class CalendarController {
  private prisma = new PrismaClient();
  private calendarService = new ContentCalendarService(this.prisma);

  /**
   * Resolve organizationId from shop domain or use directly
   * In production, this would come from authenticated session
   */
  private async resolveOrganizationId(
    organizationId?: string,
    shop?: string
  ): Promise<string | null> {
    // If organizationId provided directly, use it
    if (organizationId) {
      return organizationId;
    }

    // If shop domain provided, look up organization
    if (shop) {
      const org = await this.prisma.organization.findUnique({
        where: { shopifyDomain: shop },
        select: { id: true },
      });
      return org?.id || null;
    }

    // Fall back to first active organization. This matches the pattern used
    // across other controllers (analytics, products, competitors) and lets
    // single-tenant deployments work without passing orgId on every request.
    const firstOrg = await this.prisma.organization.findFirst({
      where: { isActive: true },
      select: { id: true },
    });
    return firstOrg?.id || null;
  }

  /**
   * Same as resolveOrganizationId but throws 400 when no org found.
   * Use for write/detail operations where an org is required.
   */
  private async requireOrganizationId(
    organizationId?: string,
    shop?: string,
  ): Promise<string> {
    const id = await this.resolveOrganizationId(organizationId, shop);
    if (!id) {
      throw new HttpException(
        'No active organization found. Install the Shopify app first.',
        HttpStatus.BAD_REQUEST,
      );
    }
    return id;
  }

  /**
   * Get calendar items within a date range
   * GET /api/calendar?shop=xxx&start=xxx&end=xxx&type=xxx&status=xxx
   * Or: GET /api/calendar?organizationId=xxx&start=xxx&end=xxx
   */
  @Get()
  async getCalendarItems(
    @Query('organizationId') organizationId: string,
    @Query('shop') shop: string,
    @Query('start') startDate: string,
    @Query('end') endDate: string,
    @Query('type') contentType?: string,
    @Query('status') status?: string
  ) {
    // Resolve organization from shop or organizationId. If no org exists yet
    // (before Shopify app install), return an empty calendar instead of 400.
    const resolvedOrgId = await this.resolveOrganizationId(organizationId, shop);
    if (!resolvedOrgId) {
      return { success: true, items: [], total: 0 };
    }

    // Default date range to current month if not provided
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);

    const start = startDate ? new Date(startDate) : defaultStart;
    const end = endDate ? new Date(endDate) : defaultEnd;

    if (isNaN(start.getTime())) {
      throw new HttpException('Invalid start date format', HttpStatus.BAD_REQUEST);
    }

    if (isNaN(end.getTime())) {
      throw new HttpException('Invalid end date format', HttpStatus.BAD_REQUEST);
    }

    // Build filters
    const filters: CalendarFilters = {};

    if (contentType) {
      filters.contentType = contentType as ContentType;
    }

    if (status) {
      filters.status = status as ContentItemStatus;
    }

    const items = await this.calendarService.getCalendarItems(
      resolvedOrgId,
      start,
      end,
      Object.keys(filters).length > 0 ? filters : undefined
    );

    return {
      success: true,
      items: items,
      total: items.length,
    };
  }

  /**
   * Get a single content item
   * GET /api/calendar/:id?shop=xxx (or organizationId=xxx)
   */
  @Get(':id')
  async getItem(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
    @Query('shop') shop: string
  ) {
    const resolvedOrgId = await this.requireOrganizationId(organizationId, shop);
    const item = await this.calendarService.getItem(id, resolvedOrgId);

    return {
      success: true,
      data: item,
    };
  }

  /**
   * Create a new content item
   * POST /api/calendar
   * Body: { shop?, organizationId?, title, content, contentType, status?, scheduledAt?, ... }
   */
  @Post()
  async createItem(
    @Body() body: CreateContentItemDto & { organizationId?: string; shop?: string }
  ) {
    const { organizationId, shop, ...data } = body;
    const resolvedOrgId = await this.requireOrganizationId(organizationId, shop);

    const item = await this.calendarService.createItem(resolvedOrgId, data);

    return {
      success: true,
      data: item,
      message: 'Content item created successfully',
    };
  }

  /**
   * Reschedule a content item
   * PATCH /api/calendar/:id/reschedule
   * Body: { scheduledAt, shop?, organizationId? }
   */
  @Patch(':id/reschedule')
  async rescheduleItem(
    @Param('id') id: string,
    @Body() body: RescheduleDto & { organizationId?: string; shop?: string }
  ) {
    const { organizationId, shop, scheduledAt } = body;
    const resolvedOrgId = await this.requireOrganizationId(organizationId, shop);

    if (!scheduledAt) {
      throw new HttpException('scheduledAt is required', HttpStatus.BAD_REQUEST);
    }

    const newDate = new Date(scheduledAt);
    if (isNaN(newDate.getTime())) {
      throw new HttpException('Invalid scheduledAt format', HttpStatus.BAD_REQUEST);
    }

    const item = await this.calendarService.rescheduleItem(id, resolvedOrgId, newDate);

    return {
      success: true,
      data: item,
      message: 'Content item rescheduled successfully',
    };
  }

  /**
   * Update content item status
   * PATCH /api/calendar/:id/status
   * Body: { status, shop?, organizationId? }
   */
  @Patch(':id/status')
  async updateItemStatus(
    @Param('id') id: string,
    @Body() body: UpdateStatusDto & { organizationId?: string; shop?: string }
  ) {
    const { organizationId, shop, status } = body;
    const resolvedOrgId = await this.requireOrganizationId(organizationId, shop);

    if (!status) {
      throw new HttpException('status is required', HttpStatus.BAD_REQUEST);
    }

    const item = await this.calendarService.updateItemStatus(id, resolvedOrgId, status);

    return {
      success: true,
      data: item,
      message: `Content item status updated to ${status}`,
    };
  }

  /**
   * Update content item
   * PATCH /api/calendar/:id
   * Body: { shop?, organizationId?, ...updateData }
   */
  @Patch(':id')
  async updateItem(
    @Param('id') id: string,
    @Body() body: Partial<CreateContentItemDto> & { organizationId?: string; shop?: string }
  ) {
    const { organizationId, shop, ...data } = body;
    const resolvedOrgId = await this.requireOrganizationId(organizationId, shop);

    const item = await this.calendarService.updateItem(id, resolvedOrgId, data);

    return {
      success: true,
      data: item,
      message: 'Content item updated successfully',
    };
  }

  /**
   * Delete content item
   * DELETE /api/calendar/:id?shop=xxx (or organizationId=xxx)
   */
  @Delete(':id')
  async deleteItem(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
    @Query('shop') shop: string
  ) {
    const resolvedOrgId = await this.requireOrganizationId(organizationId, shop);

    await this.calendarService.deleteItem(id, resolvedOrgId);

    return {
      success: true,
      message: 'Content item deleted successfully',
    };
  }
}
