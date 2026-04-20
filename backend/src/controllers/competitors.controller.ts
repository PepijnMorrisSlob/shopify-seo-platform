/**
 * Competitors Controller
 * Shopify SEO Platform
 *
 * API endpoints for competitor tracking and competitive intelligence:
 * - GET    /api/competitors                - List all tracked competitors
 * - POST   /api/competitors                - Add a new competitor to track
 * - GET    /api/competitors/overview       - Aggregate overview across all competitors
 * - GET    /api/competitors/keyword-gaps   - Keyword gap analysis (real DataForSEO data)
 * - GET    /api/competitors/content-gaps   - Content gap analysis (real DataForSEO data)
 * - GET    /api/competitors/:id            - Detailed competitor analysis
 * - DELETE /api/competitors/:id            - Remove a tracked competitor
 * - POST   /api/competitors/:id/analyze    - Queue a fresh competitor analysis (async)
 *
 * Competitor analysis runs as a background BullMQ job because DataForSEO calls
 * take 30-60 seconds. Results are stored in the Competitor model's JSON fields
 * (keywordsTheyRankFor, contentTopics, contentGaps).
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  competitorAnalysisQueue,
  CompetitorAnalysisJobData,
} from '../queues/competitor-analysis-queue';

@Controller('competitors')
export class CompetitorsController implements OnModuleInit {
  private readonly logger = new Logger(CompetitorsController.name);
  private prisma = new PrismaClient();

  async onModuleInit() {
    try {
      await import('../queues/workers/competitor-analysis-worker');
      this.logger.log('Competitor analysis worker started');
    } catch (error: any) {
      this.logger.warn(`Worker startup warning: ${error.message}`);
    }
  }

  /**
   * Resolve organizationId — in dev mode uses the first active org.
   */
  private async resolveOrganizationId(
    organizationId?: string,
  ): Promise<string | null> {
    if (organizationId) return organizationId;

    const firstOrg = await this.prisma.organization.findFirst({
      where: { isActive: true },
      select: { id: true },
    });

    return firstOrg?.id || null;
  }

  /**
   * Extract a display name from a competitor URL.
   */
  private extractDomainName(url: string): string {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      return parsed.hostname
        .replace(/^www\./, '')
        .split('.')[0]
        .replace(/^\w/, (c) => c.toUpperCase());
    } catch {
      return url;
    }
  }

  /**
   * Shape a Competitor DB record for frontend consumption.
   */
  private shapeCompetitor(record: any) {
    const keywords = (record.keywordsTheyRankFor as any[]) || [];
    const topics = (record.contentTopics as any[]) || [];
    const gaps = (record.contentGaps as any[]) || [];

    return {
      id: record.id,
      competitorUrl: record.competitorUrl,
      competitorName:
        record.competitorName || this.extractDomainName(record.competitorUrl),
      keywordCount: keywords.length,
      topKeywords: keywords.slice(0, 10),
      contentTopics: topics.slice(0, 10),
      contentGaps: gaps.slice(0, 10),
      lastAnalyzedAt: record.lastAnalyzedAt?.toISOString() || null,
      status: record.lastAnalyzedAt ? 'analyzed' : 'pending',
      createdAt: record.createdAt.toISOString(),
    };
  }

  // ===========================================================================
  // LIST + CRUD
  // ===========================================================================

  @Get()
  async listCompetitors(@Query('organizationId') organizationId?: string) {
    const orgId = await this.resolveOrganizationId(organizationId);
    if (!orgId) {
      return { competitors: [], total: 0 };
    }

    const competitors = await this.prisma.competitor.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      competitors: competitors.map((c) => this.shapeCompetitor(c)),
      total: competitors.length,
    };
  }

  @Get('overview')
  async getOverview(@Query('organizationId') organizationId?: string) {
    const orgId = await this.resolveOrganizationId(organizationId);
    if (!orgId) {
      return {
        competitorsTracked: 0,
        totalKeywordGaps: 0,
        totalContentGaps: 0,
        message: 'No organization resolved.',
      };
    }

    const competitors = await this.prisma.competitor.findMany({
      where: { organizationId: orgId },
    });

    if (competitors.length === 0) {
      return {
        competitorsTracked: 0,
        totalKeywordGaps: 0,
        totalContentGaps: 0,
        totalAnalyzed: 0,
        avgOverlapPercentage: 0,
        message:
          'No competitors tracked. Add a competitor URL and run analysis to see gaps.',
      };
    }

    const totalKeywordGaps = competitors.reduce((sum, c) => {
      const kws = (c.keywordsTheyRankFor as any[]) || [];
      return sum + kws.length;
    }, 0);

    const totalContentGaps = competitors.reduce((sum, c) => {
      const gaps = (c.contentGaps as any[]) || [];
      return sum + gaps.length;
    }, 0);

    const analyzedCount = competitors.filter((c) => c.lastAnalyzedAt).length;

    return {
      competitorsTracked: competitors.length,
      totalAnalyzed: analyzedCount,
      totalKeywordGaps,
      totalContentGaps,
      pendingAnalysis: competitors.length - analyzedCount,
    };
  }

  /**
   * Keyword gaps: keywords the competitors rank for that we don't.
   * Pulls from Competitor.keywordsTheyRankFor (populated by analysis worker).
   */
  @Get('keyword-gaps')
  async getKeywordGaps(
    @Query('organizationId') organizationId?: string,
    @Query('competitor') competitorFilter?: string,
  ) {
    const orgId = await this.resolveOrganizationId(organizationId);
    if (!orgId) {
      return { keywordGaps: [], total: 0, message: 'No organization resolved.' };
    }

    const where: any = { organizationId: orgId };
    if (competitorFilter) {
      where.competitorUrl = { contains: competitorFilter };
    }

    const competitors = await this.prisma.competitor.findMany({ where });

    if (competitors.length === 0) {
      return {
        keywordGaps: [],
        total: 0,
        message:
          'No competitors tracked yet. Add a competitor URL and run analysis to discover keyword gaps.',
      };
    }

    // Our org's existing keywords — used to filter out keywords we already cover
    const ourKeywords = await this.prisma.keyword.findMany({
      where: { organizationId: orgId },
      select: { keyword: true },
    });
    const ourSet = new Set(ourKeywords.map((k) => k.keyword.toLowerCase()));

    const gaps: any[] = [];
    for (const c of competitors) {
      const keywords = (c.keywordsTheyRankFor as any[]) || [];
      for (const kw of keywords) {
        if (!kw.keyword || ourSet.has(kw.keyword.toLowerCase())) continue;
        gaps.push({
          keyword: kw.keyword,
          searchVolume: kw.search_volume || 0,
          competitorPosition: kw.position || 0,
          competitor:
            c.competitorName || this.extractDomainName(c.competitorUrl),
          competitorId: c.id,
          url: kw.url || '',
        });
      }
    }

    gaps.sort((a, b) => b.searchVolume - a.searchVolume);

    const analyzedCount = competitors.filter((c) => c.lastAnalyzedAt).length;

    return {
      keywordGaps: gaps,
      total: gaps.length,
      summary: {
        totalSearchVolume: gaps.reduce((s, g) => s + (g.searchVolume || 0), 0),
        highOpportunityCount: gaps.filter((g) => (g.searchVolume || 0) > 1000)
          .length,
        competitorsAnalyzed: analyzedCount,
      },
      message:
        analyzedCount === 0
          ? 'Competitors added but none analyzed yet. Click "Analyze" on each competitor.'
          : undefined,
    };
  }

  @Get('content-gaps')
  async getContentGaps(
    @Query('organizationId') organizationId?: string,
    @Query('competitor') competitorFilter?: string,
  ) {
    const orgId = await this.resolveOrganizationId(organizationId);
    if (!orgId) {
      return { contentGaps: [], total: 0, message: 'No organization resolved.' };
    }

    const where: any = { organizationId: orgId };
    if (competitorFilter) {
      where.competitorUrl = { contains: competitorFilter };
    }

    const competitors = await this.prisma.competitor.findMany({ where });

    if (competitors.length === 0) {
      return {
        contentGaps: [],
        total: 0,
        message:
          'No competitors tracked yet. Add a competitor URL and run analysis to discover content gaps.',
      };
    }

    const gaps: any[] = [];
    for (const c of competitors) {
      const contentGaps = (c.contentGaps as any[]) || [];
      for (const gap of contentGaps) {
        gaps.push({
          ...gap,
          competitor:
            c.competitorName || this.extractDomainName(c.competitorUrl),
          competitorId: c.id,
        });
      }
    }

    gaps.sort((a, b) => (b.estimatedTraffic || 0) - (a.estimatedTraffic || 0));

    return {
      contentGaps: gaps,
      total: gaps.length,
      summary: {
        totalEstimatedTraffic: gaps.reduce(
          (s, g) => s + (g.estimatedTraffic || 0),
          0,
        ),
        highPriorityCount: gaps.filter((g) => g.priority === 'high').length,
      },
    };
  }

  @Get(':id')
  async getCompetitor(@Param('id') id: string) {
    if (!id) {
      throw new HttpException('Competitor ID is required', HttpStatus.BAD_REQUEST);
    }

    const competitor = await this.prisma.competitor.findUnique({
      where: { id },
    });

    if (!competitor) {
      throw new HttpException('Competitor not found', HttpStatus.NOT_FOUND);
    }

    return this.shapeCompetitor(competitor);
  }

  @Post()
  async addCompetitor(
    @Body() body: { competitorUrl: string; competitorName?: string },
    @Query('organizationId') organizationId?: string,
  ) {
    if (!body?.competitorUrl) {
      throw new HttpException('competitorUrl is required', HttpStatus.BAD_REQUEST);
    }

    const orgId = await this.resolveOrganizationId(organizationId);
    if (!orgId) {
      throw new HttpException(
        'No active organization found. Install the Shopify app first.',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const created = await this.prisma.competitor.create({
        data: {
          organizationId: orgId,
          competitorUrl: body.competitorUrl,
          competitorName:
            body.competitorName || this.extractDomainName(body.competitorUrl),
        },
      });

      this.logger.log(`Competitor created: ${created.id} (${created.competitorUrl})`);

      // Queue an analysis job immediately so the user doesn't have to click "analyze"
      const jobData: CompetitorAnalysisJobData = {
        competitorId: created.id,
        organizationId: orgId,
      };
      await competitorAnalysisQueue.add(`analyze-${created.id}`, jobData);
      this.logger.log(`Queued initial analysis for competitor ${created.id}`);

      return {
        ...this.shapeCompetitor(created),
        analysisQueued: true,
        message:
          'Competitor added. Analysis is running in the background and will take 30-60 seconds.',
      };
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new HttpException(
          'This competitor URL is already being tracked',
          HttpStatus.CONFLICT,
        );
      }
      throw error;
    }
  }

  @Delete(':id')
  async removeCompetitor(@Param('id') id: string) {
    const existing = await this.prisma.competitor.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new HttpException('Competitor not found', HttpStatus.NOT_FOUND);
    }

    await this.prisma.competitor.delete({ where: { id } });
    this.logger.log(`Competitor deleted: ${id}`);

    return { success: true, id };
  }

  /**
   * Queue a fresh analysis of the competitor.
   * Returns 202 Accepted with the job ID — poll the competitor resource
   * to see `lastAnalyzedAt` update.
   */
  @Post(':id/analyze')
  async analyzeCompetitor(@Param('id') id: string) {
    const competitor = await this.prisma.competitor.findUnique({
      where: { id },
    });

    if (!competitor) {
      throw new HttpException('Competitor not found', HttpStatus.NOT_FOUND);
    }

    const jobData: CompetitorAnalysisJobData = {
      competitorId: id,
      organizationId: competitor.organizationId,
    };

    const job = await competitorAnalysisQueue.add(`analyze-${id}`, jobData);
    this.logger.log(`Queued analysis for competitor ${id} (job ${job.id})`);

    return {
      success: true,
      competitorId: id,
      jobId: job.id,
      status: 'queued',
      estimatedDurationSeconds: 45,
      message:
        'Analysis queued. DataForSEO calls take ~30-60 seconds. Poll the competitor record for updates.',
    };
  }
}
