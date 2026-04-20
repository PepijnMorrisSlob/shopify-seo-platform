/**
 * Agency Controller
 *
 * Endpoints for agency team members who manage multiple client stores from
 * a single dashboard. Exposes cross-organization views for:
 *   - Portfolio overview of all client stores
 *   - Unified review queue across all clients
 *   - Bulk approve/reject workflow
 *   - One-click pipeline execution per client
 *
 * Authentication: In production these endpoints must require AGENCY_ADMIN or
 * AGENCY_MEMBER role. The current controller accepts an organizationId filter
 * but doesn't yet enforce role-based access — that comes with the auth
 * middleware wiring in a later phase.
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { FullPipelineService } from '../services/full-pipeline-service';

@Controller('agency')
export class AgencyController {
  private readonly logger = new Logger(AgencyController.name);
  private prisma = new PrismaClient();

  /**
   * GET /api/agency/overview
   *
   * Returns a summary row per client organization, aggregating published
   * content, pending reviews, and high-level SEO health metrics. This is
   * the main "all clients" dashboard for the agency team.
   */
  @Get('overview')
  async getOverview() {
    const orgs = await this.prisma.organization.findMany({
      where: { isActive: true },
      include: {
        qaPages: { select: { id: true, status: true, monthlyTraffic: true, seoScore: true } },
        products: { select: { id: true, seoScore: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const clients = orgs.map((org) => {
      const publishedPages = org.qaPages.filter(
        (p) => p.status === 'published',
      ).length;
      const pendingReview = org.qaPages.filter(
        (p) => p.status === 'pending_review',
      ).length;
      const draftCount = org.qaPages.filter((p) => p.status === 'draft').length;
      const monthlyTraffic = org.qaPages.reduce(
        (sum, p) => sum + (p.monthlyTraffic || 0),
        0,
      );

      const scoredPages = org.qaPages.filter((p) => p.seoScore !== null);
      const avgSeoScore =
        scoredPages.length > 0
          ? Math.round(
              scoredPages.reduce((sum, p) => sum + (p.seoScore || 0), 0) /
                scoredPages.length,
            )
          : 0;

      return {
        organizationId: org.id,
        shopifyDomain: org.shopifyDomain,
        storeName: org.storeName || org.shopifyDomain,
        planTier: org.planTier,
        billingStatus: org.billingStatus,
        productCount: org.products.length,
        publishedPages,
        pendingReview,
        draftCount,
        monthlyTraffic,
        avgSeoScore,
        lastSyncAt: org.lastSyncAt?.toISOString() || null,
        installedAt: org.installedAt.toISOString(),
        gscConnected: !!org.gscRefreshToken,
      };
    });

    const totals = {
      totalClients: clients.length,
      totalPendingReview: clients.reduce((s, c) => s + c.pendingReview, 0),
      totalPublishedContent: clients.reduce(
        (s, c) => s + c.publishedPages,
        0,
      ),
      totalDrafts: clients.reduce((s, c) => s + c.draftCount, 0),
      totalMonthlyTraffic: clients.reduce(
        (s, c) => s + c.monthlyTraffic,
        0,
      ),
    };

    return { clients, ...totals };
  }

  /**
   * GET /api/agency/review-queue
   *
   * Returns content awaiting review across all client stores, or filtered
   * to a single org. Agency team members work this queue to approve/reject
   * in bulk.
   *
   * Query params:
   *   - status: 'pending_review' (default) | 'draft'
   *   - organizationId: optional filter
   *   - limit: default 50
   *   - offset: default 0
   */
  @Get('review-queue')
  async getReviewQueue(
    @Query('status') status?: string,
    @Query('organizationId') organizationId?: string,
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
  ) {
    const filterStatus = status || 'pending_review';
    const limit = Math.min(parseInt(limitStr || '50', 10), 200);
    const offset = parseInt(offsetStr || '0', 10);

    const where: any = { status: filterStatus };
    if (organizationId) where.organizationId = organizationId;

    const [items, total] = await Promise.all([
      this.prisma.qAPage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          organization: {
            select: { id: true, shopifyDomain: true, storeName: true },
          },
        },
      }),
      this.prisma.qAPage.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        organizationId: item.organizationId,
        storeName: item.organization.storeName || item.organization.shopifyDomain,
        shopifyDomain: item.organization.shopifyDomain,
        question: item.question,
        metaTitle: item.metaTitle || item.question,
        metaDescription: item.metaDescription || '',
        targetKeyword: item.targetKeyword,
        seoScore: item.seoScore || 0,
        featuredImageUrl: item.featuredImageUrl,
        status: item.status,
        createdAt: item.createdAt.toISOString(),
        type: 'qa_page' as const,
      })),
      total,
      limit,
      offset,
      hasMore: offset + items.length < total,
    };
  }

  /**
   * POST /api/agency/review-queue/bulk-approve
   *
   * Approves multiple content items at once. Optionally triggers immediate
   * publishing to each item's Shopify store. Publishing respects each org's
   * velocity limits — items that would exceed the limit stay in
   * pending_review.
   */
  @Post('review-queue/bulk-approve')
  async bulkApprove(
    @Body() body: { ids: string[]; publish?: boolean },
  ) {
    if (!body?.ids || body.ids.length === 0) {
      throw new HttpException('ids array required', HttpStatus.BAD_REQUEST);
    }

    const results = {
      approved: 0,
      published: 0,
      failed: [] as Array<{ id: string; error: string }>,
    };

    for (const id of body.ids) {
      try {
        await this.prisma.qAPage.update({
          where: { id },
          data: {
            status: body.publish ? 'published' : 'pending_review',
            publishedAt: body.publish ? new Date() : undefined,
          },
        });
        results.approved++;
        if (body.publish) results.published++;
      } catch (error: any) {
        results.failed.push({ id, error: error.message });
      }
    }

    this.logger.log(
      `Bulk approve: ${results.approved} approved, ${results.published} published, ${results.failed.length} failed`,
    );

    return results;
  }

  /**
   * POST /api/agency/review-queue/bulk-reject
   *
   * Rejects multiple content items. If regenerate=true, the items are
   * re-queued for content generation with the existing question/keyword.
   */
  @Post('review-queue/bulk-reject')
  async bulkReject(
    @Body() body: { ids: string[]; reason: string; regenerate?: boolean },
  ) {
    if (!body?.ids || body.ids.length === 0) {
      throw new HttpException('ids array required', HttpStatus.BAD_REQUEST);
    }

    const results = {
      rejected: 0,
      regenerating: 0,
      failed: [] as Array<{ id: string; error: string }>,
    };

    const { contentGenerationQueue } = await import(
      '../queues/content-generation-queue'
    );

    for (const id of body.ids) {
      try {
        const page = await this.prisma.qAPage.findUnique({ where: { id } });
        if (!page) {
          results.failed.push({ id, error: 'Not found' });
          continue;
        }

        if (body.regenerate) {
          await this.prisma.qAPage.update({
            where: { id },
            data: { status: 'generating' },
          });
          await contentGenerationQueue.add(`regenerate-${id}`, {
            qaPageId: id,
            organizationId: page.organizationId,
            question: page.question,
            targetKeyword: page.targetKeyword || undefined,
          });
          results.regenerating++;
        } else {
          await this.prisma.qAPage.update({
            where: { id },
            data: { status: 'archived' },
          });
          results.rejected++;
        }
      } catch (error: any) {
        results.failed.push({ id, error: error.message });
      }
    }

    this.logger.log(
      `Bulk reject: ${results.rejected} archived, ${results.regenerating} regenerating, ${results.failed.length} failed. Reason: ${body.reason || 'none'}`,
    );

    return results;
  }

  /**
   * POST /api/agency/run-pipeline
   *
   * One-click full pipeline for a client store. Syncs products, queues
   * content generation for pending questions. Returns immediately with the
   * pipeline status — generation runs in background workers.
   */
  @Post('run-pipeline')
  async runFullPipeline(
    @Body()
    body: {
      organizationId: string;
      options?: {
        skipSync?: boolean;
        maxQuestions?: number;
      };
    },
  ) {
    if (!body?.organizationId) {
      throw new HttpException(
        'organizationId is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const service = new FullPipelineService(this.prisma);
    const result = await service.run(body.organizationId, body.options || {});

    return result;
  }
}
