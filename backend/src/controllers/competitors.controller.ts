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

    // Estimated monthly traffic: sum of each keyword's volume × CTR-by-position
    const estimatedTraffic = keywords.reduce((sum: number, kw: any) => {
      const v = kw.search_volume || 0;
      const pos = kw.position || 100;
      const ctr = pos <= 3 ? 0.3 : pos <= 10 ? 0.1 : pos <= 20 ? 0.03 : 0.005;
      return sum + Math.round(v * ctr);
    }, 0);

    return {
      id: record.id,
      competitorUrl: record.competitorUrl,
      competitorName:
        record.competitorName || this.extractDomainName(record.competitorUrl),
      estimatedTraffic,
      keywordCount: keywords.length,
      overlapPercentage: 0, // populated by list endpoint when org context is available
      contentTopics: topics.map((t: any) => t.title || t.topic || '').filter(Boolean).slice(0, 10),
      topKeywords: keywords.slice(0, 10).map((k: any) => k.keyword || '').filter(Boolean),
      keywordsTheyRankFor: keywords.slice(0, 20),
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

    const empty = {
      ourTraffic: 0,
      avgCompetitorTraffic: 0,
      keywordOverlapPercent: 0,
      contentGapsFound: 0,
      keywordGapsFound: 0,
      competitiveScore: 0,
      competitorsTracked: 0,
      topOpportunity: null as string | null,
      trafficComparison: [] as Array<{
        name: string;
        traffic: number;
        keywords: number;
        overlap: number;
      }>,
    };

    if (!orgId) {
      return { ...empty, message: 'No organization resolved.' };
    }

    const [competitors, qaPages] = await Promise.all([
      this.prisma.competitor.findMany({ where: { organizationId: orgId } }),
      this.prisma.qAPage.findMany({
        where: { organizationId: orgId, status: 'published' },
        select: { monthlyTraffic: true, seoScore: true },
      }),
    ]);

    if (competitors.length === 0) {
      return {
        ...empty,
        message:
          'No competitors tracked. Add a competitor URL and run analysis to see gaps.',
      };
    }

    // Our traffic = sum of real monthly traffic on published QA pages
    const ourTraffic = qaPages.reduce(
      (sum, p) => sum + (p.monthlyTraffic || 0),
      0,
    );

    // Build per-competitor rollup
    const perCompetitor = competitors.map((c) => {
      const keywords = (c.keywordsTheyRankFor as any[]) || [];
      const topics = (c.contentTopics as any[]) || [];

      // Traffic estimate: sum of each keyword's estimated click share
      // (search_volume * CTR proxy based on position)
      const traffic = keywords.reduce((sum: number, kw: any) => {
        const v = kw.search_volume || 0;
        const pos = kw.position || 100;
        const ctr = pos <= 3 ? 0.3 : pos <= 10 ? 0.1 : pos <= 20 ? 0.03 : 0.005;
        return sum + Math.round(v * ctr);
      }, 0);

      // Alt source: top pages traffic
      const pageTraffic = topics.reduce(
        (sum: number, p: any) => sum + (p.traffic || 0),
        0,
      );

      return {
        id: c.id,
        name: c.competitorName || this.extractDomainName(c.competitorUrl),
        traffic: Math.max(traffic, pageTraffic),
        keywordCount: keywords.length,
      };
    });

    // Overlap percent: keywords both we and competitors target
    const ourKeywords = await this.prisma.keyword.findMany({
      where: { organizationId: orgId },
      select: { keyword: true },
    });
    const ourSet = new Set(ourKeywords.map((k) => k.keyword.toLowerCase()));
    let overlapTotal = 0;
    let overlapCompetitorKeywords = 0;
    for (const c of competitors) {
      const kws = (c.keywordsTheyRankFor as any[]) || [];
      overlapCompetitorKeywords += kws.length;
      for (const kw of kws) {
        if (kw.keyword && ourSet.has(kw.keyword.toLowerCase())) overlapTotal++;
      }
    }
    const keywordOverlapPercent =
      overlapCompetitorKeywords > 0
        ? Math.round((overlapTotal / overlapCompetitorKeywords) * 100)
        : 0;

    // Keyword gaps: competitor-unique keywords
    const keywordGapsFound = overlapCompetitorKeywords - overlapTotal;

    // Content gaps from stored analysis
    const contentGapsFound = competitors.reduce((sum, c) => {
      const gaps = (c.contentGaps as any[]) || [];
      return sum + gaps.length;
    }, 0);

    const avgCompetitorTraffic =
      perCompetitor.length > 0
        ? Math.round(
            perCompetitor.reduce((sum, c) => sum + c.traffic, 0) /
              perCompetitor.length,
          )
        : 0;

    // Competitive score: how we compare vs avg competitor on traffic + content depth
    const trafficRatio =
      avgCompetitorTraffic > 0 ? ourTraffic / avgCompetitorTraffic : 0;
    const contentRatio =
      keywordGapsFound > 0
        ? Math.max(0, 1 - keywordGapsFound / overlapCompetitorKeywords)
        : 1;
    const competitiveScore = Math.round(
      Math.min(100, 100 * (0.6 * Math.min(1, trafficRatio) + 0.4 * contentRatio)),
    );

    // Top opportunity = highest-volume keyword gap across competitors
    let topOpportunity: string | null = null;
    let topVolume = 0;
    for (const c of competitors) {
      const kws = (c.keywordsTheyRankFor as any[]) || [];
      for (const kw of kws) {
        if (!kw.keyword || ourSet.has(kw.keyword.toLowerCase())) continue;
        if ((kw.search_volume || 0) > topVolume) {
          topVolume = kw.search_volume;
          topOpportunity = kw.keyword;
        }
      }
    }

    // Traffic comparison: "Us" + top 4 competitors by traffic
    const trafficComparison = [
      {
        name: 'Us',
        traffic: ourTraffic,
        keywords: ourKeywords.length,
        overlap: 100,
      },
      ...perCompetitor
        .sort((a, b) => b.traffic - a.traffic)
        .slice(0, 4)
        .map((c) => ({
          name: c.name,
          traffic: c.traffic,
          keywords: c.keywordCount,
          overlap: keywordOverlapPercent,
        })),
    ];

    return {
      ourTraffic,
      avgCompetitorTraffic,
      keywordOverlapPercent,
      contentGapsFound,
      keywordGapsFound,
      competitiveScore,
      competitorsTracked: competitors.length,
      topOpportunity,
      trafficComparison,
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
        const searchVolume = kw.search_volume || 0;
        const position = kw.position || 0;
        // Opportunity score: favor high volume where competitor is in top 20
        const volumeScore = Math.min(
          60,
          Math.log10(Math.max(1, searchVolume)) * 15,
        );
        const positionScore =
          position > 0 && position <= 20 ? (20 - position) * 2 : 0;
        gaps.push({
          keyword: kw.keyword,
          searchVolume,
          difficulty: kw.keyword_difficulty || 0,
          competitorPosition: position,
          competitor:
            c.competitorName || this.extractDomainName(c.competitorUrl),
          competitorId: c.id,
          url: kw.url || '',
          opportunityScore: Math.round(Math.min(100, volumeScore + positionScore)),
        });
      }
    }

    gaps.sort((a, b) => b.opportunityScore - a.opportunityScore);

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
          topic: gap.topic || gap.title || '',
          competitor:
            c.competitorName || this.extractDomainName(c.competitorUrl),
          competitorId: c.id,
          competitorUrl: gap.competitorUrl || gap.url || c.competitorUrl,
          estimatedTraffic: gap.estimatedTraffic || gap.traffic || 0,
          estTraffic: gap.estimatedTraffic || gap.traffic || 0, // alias for frontend
          priority: gap.priority || 'medium',
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
