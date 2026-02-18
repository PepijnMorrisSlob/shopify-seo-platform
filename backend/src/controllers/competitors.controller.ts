/**
 * Competitors Controller
 * Shopify SEO Platform
 *
 * API endpoints for competitor tracking and competitive intelligence:
 * - GET    /api/competitors              - List all tracked competitors
 * - POST   /api/competitors              - Add a new competitor to track
 * - GET    /api/competitors/overview      - Get competitor landscape overview
 * - GET    /api/competitors/keyword-gaps  - Get keyword gap analysis
 * - GET    /api/competitors/content-gaps  - Get content gap analysis
 * - GET    /api/competitors/:id           - Get detailed competitor analysis
 * - DELETE /api/competitors/:id           - Remove a competitor
 * - POST   /api/competitors/:id/analyze   - Trigger fresh analysis of competitor
 *
 * Uses Prisma for all database operations against the Competitor model.
 * Returns realistic mock analysis data for competitive intelligence.
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
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// ---------------------------------------------------------------------------
// Default organization ID for dev mode
// ---------------------------------------------------------------------------
const DEFAULT_ORG_ID = '77e2c3a5-b35f-4464-8f94-f0b42728ac3d';

// ---------------------------------------------------------------------------
// Mock data generators
// ---------------------------------------------------------------------------

function generateMockCompetitors() {
  return [
    {
      id: 'comp-1',
      competitorUrl: 'https://brooklinen.com',
      competitorName: 'Brooklinen',
      estimatedTraffic: 450000,
      keywordCount: 2300,
      overlapPercentage: 35,
      contentTopics: ['bedding', 'sheets', 'comforters', 'towels', 'sleep tips'],
      topKeywords: ['best sheets', 'luxury bedding', 'cotton sheets'],
      keywordsTheyRankFor: [
        { keyword: 'best cooling sheets 2026', position: 3, searchVolume: 14800 },
        { keyword: 'luxury bedding sets', position: 5, searchVolume: 9200 },
        { keyword: 'sateen vs percale sheets', position: 2, searchVolume: 8100 },
        { keyword: 'best sheets for hot sleepers', position: 4, searchVolume: 12500 },
        { keyword: 'cotton sheet thread count guide', position: 7, searchVolume: 6700 },
      ],
      contentGaps: [
        { topic: 'How to choose sheets for different seasons', competitorUrl: 'https://brooklinen.com/blogs/bedroom/seasonal-sheets', estTraffic: 3200, priority: 'high' },
        { topic: 'Linen vs cotton: complete comparison', competitorUrl: 'https://brooklinen.com/blogs/bedroom/linen-vs-cotton', estTraffic: 5100, priority: 'high' },
        { topic: 'Best bedding for allergies', competitorUrl: 'https://brooklinen.com/blogs/bedroom/hypoallergenic-bedding', estTraffic: 4300, priority: 'medium' },
      ],
      lastAnalyzedAt: '2026-02-05T14:00:00Z',
      status: 'tracked',
    },
    {
      id: 'comp-2',
      competitorUrl: 'https://parachutehome.com',
      competitorName: 'Parachute',
      estimatedTraffic: 380000,
      keywordCount: 1800,
      overlapPercentage: 42,
      contentTopics: ['home essentials', 'bedding', 'bath', 'mattresses', 'rugs'],
      topKeywords: ['organic sheets', 'linen bedding', 'luxury bath towels'],
      keywordsTheyRankFor: [
        { keyword: 'organic cotton sheets', position: 2, searchVolume: 11200 },
        { keyword: 'linen duvet cover', position: 4, searchVolume: 7800 },
        { keyword: 'luxury bath towels', position: 3, searchVolume: 9500 },
        { keyword: 'percale vs sateen', position: 5, searchVolume: 9900 },
        { keyword: 'best linen sheets', position: 6, searchVolume: 8400 },
      ],
      contentGaps: [
        { topic: 'Organic cotton certification guide', competitorUrl: 'https://parachutehome.com/blog/organic-cotton-guide', estTraffic: 2800, priority: 'high' },
        { topic: 'How to style your bathroom like a spa', competitorUrl: 'https://parachutehome.com/blog/spa-bathroom', estTraffic: 4100, priority: 'medium' },
      ],
      lastAnalyzedAt: '2026-02-04T09:00:00Z',
      status: 'tracked',
    },
    {
      id: 'comp-3',
      competitorUrl: 'https://boll-branch.com',
      competitorName: 'Boll & Branch',
      estimatedTraffic: 290000,
      keywordCount: 1400,
      overlapPercentage: 28,
      contentTopics: ['organic bedding', 'fair trade', 'sustainability', 'home textiles'],
      topKeywords: ['fair trade bedding', 'organic cotton comforter', 'sustainable sheets'],
      keywordsTheyRankFor: [
        { keyword: 'fair trade bedding', position: 1, searchVolume: 5200 },
        { keyword: 'organic cotton comforter', position: 3, searchVolume: 7100 },
        { keyword: 'sustainable bedding brands', position: 2, searchVolume: 6300 },
        { keyword: 'GOTS certified sheets', position: 4, searchVolume: 3800 },
      ],
      contentGaps: [
        { topic: 'Fair trade vs organic: what matters more', competitorUrl: 'https://boll-branch.com/blog/fair-trade-organic', estTraffic: 2400, priority: 'medium' },
        { topic: 'Sustainable home buying guide 2026', competitorUrl: 'https://boll-branch.com/blog/sustainable-home-guide', estTraffic: 3600, priority: 'high' },
      ],
      lastAnalyzedAt: '2026-02-03T16:30:00Z',
      status: 'tracked',
    },
    {
      id: 'comp-4',
      competitorUrl: 'https://casper.com',
      competitorName: 'Casper',
      estimatedTraffic: 820000,
      keywordCount: 3500,
      overlapPercentage: 18,
      contentTopics: ['mattresses', 'sleep science', 'pillows', 'bed frames', 'sleep tips'],
      topKeywords: ['best mattress 2026', 'memory foam vs spring', 'sleep tips'],
      keywordsTheyRankFor: [
        { keyword: 'best mattress 2026', position: 2, searchVolume: 33100 },
        { keyword: 'memory foam vs spring mattress', position: 3, searchVolume: 18200 },
        { keyword: 'how to improve sleep quality', position: 5, searchVolume: 22400 },
        { keyword: 'best pillows for neck pain', position: 4, searchVolume: 14600 },
      ],
      contentGaps: [
        { topic: 'Complete bedroom makeover guide', competitorUrl: 'https://casper.com/blog/bedroom-makeover', estTraffic: 8200, priority: 'high' },
        { topic: 'Sleep science: how temperature affects sleep', competitorUrl: 'https://casper.com/blog/sleep-temperature', estTraffic: 6100, priority: 'medium' },
      ],
      lastAnalyzedAt: '2026-02-02T11:00:00Z',
      status: 'tracked',
    },
  ];
}

function generateKeywordGaps() {
  return [
    { keyword: 'best cooling sheets 2026', searchVolume: 14800, difficulty: 52, competitorPosition: 3, competitor: 'Brooklinen', opportunityScore: 85 },
    { keyword: 'percale vs sateen', searchVolume: 9900, difficulty: 35, competitorPosition: 5, competitor: 'Parachute', opportunityScore: 92 },
    { keyword: 'organic cotton sheets review', searchVolume: 11200, difficulty: 48, competitorPosition: 2, competitor: 'Parachute', opportunityScore: 78 },
    { keyword: 'luxury bath towels guide', searchVolume: 9500, difficulty: 41, competitorPosition: 3, competitor: 'Parachute', opportunityScore: 81 },
    { keyword: 'best sheets for hot sleepers', searchVolume: 12500, difficulty: 55, competitorPosition: 4, competitor: 'Brooklinen', opportunityScore: 74 },
    { keyword: 'fair trade bedding brands', searchVolume: 5200, difficulty: 32, competitorPosition: 1, competitor: 'Boll & Branch', opportunityScore: 88 },
    { keyword: 'sustainable sheets buying guide', searchVolume: 6300, difficulty: 38, competitorPosition: 2, competitor: 'Boll & Branch', opportunityScore: 86 },
    { keyword: 'how to improve sleep quality', searchVolume: 22400, difficulty: 68, competitorPosition: 5, competitor: 'Casper', opportunityScore: 62 },
    { keyword: 'linen duvet cover review', searchVolume: 7800, difficulty: 44, competitorPosition: 4, competitor: 'Parachute', opportunityScore: 76 },
    { keyword: 'cotton sheet thread count guide', searchVolume: 6700, difficulty: 29, competitorPosition: 7, competitor: 'Brooklinen', opportunityScore: 91 },
    { keyword: 'GOTS certified organic sheets', searchVolume: 3800, difficulty: 25, competitorPosition: 4, competitor: 'Boll & Branch', opportunityScore: 93 },
    { keyword: 'best mattress for couples 2026', searchVolume: 18200, difficulty: 72, competitorPosition: 3, competitor: 'Casper', opportunityScore: 55 },
    { keyword: 'memory foam pillow benefits', searchVolume: 8900, difficulty: 46, competitorPosition: 6, competitor: 'Casper', opportunityScore: 71 },
    { keyword: 'bedroom temperature for best sleep', searchVolume: 5400, difficulty: 33, competitorPosition: 8, competitor: 'Casper', opportunityScore: 84 },
    { keyword: 'sateen sheet care instructions', searchVolume: 4100, difficulty: 22, competitorPosition: 5, competitor: 'Brooklinen', opportunityScore: 95 },
  ];
}

function generateContentGaps() {
  return [
    { topic: 'How to choose sheets for different seasons', competitor: 'Brooklinen', competitorUrl: 'https://brooklinen.com/blogs/bedroom/seasonal-sheets', estTraffic: 3200, priority: 'high' },
    { topic: 'Linen vs cotton: complete comparison', competitor: 'Brooklinen', competitorUrl: 'https://brooklinen.com/blogs/bedroom/linen-vs-cotton', estTraffic: 5100, priority: 'high' },
    { topic: 'Organic cotton certification guide', competitor: 'Parachute', competitorUrl: 'https://parachutehome.com/blog/organic-cotton-guide', estTraffic: 2800, priority: 'high' },
    { topic: 'Complete bedroom makeover guide', competitor: 'Casper', competitorUrl: 'https://casper.com/blog/bedroom-makeover', estTraffic: 8200, priority: 'high' },
    { topic: 'Sustainable home buying guide 2026', competitor: 'Boll & Branch', competitorUrl: 'https://boll-branch.com/blog/sustainable-home-guide', estTraffic: 3600, priority: 'high' },
    { topic: 'Best bedding for allergies', competitor: 'Brooklinen', competitorUrl: 'https://brooklinen.com/blogs/bedroom/hypoallergenic-bedding', estTraffic: 4300, priority: 'medium' },
    { topic: 'How to style your bathroom like a spa', competitor: 'Parachute', competitorUrl: 'https://parachutehome.com/blog/spa-bathroom', estTraffic: 4100, priority: 'medium' },
    { topic: 'Sleep science: how temperature affects sleep', competitor: 'Casper', competitorUrl: 'https://casper.com/blog/sleep-temperature', estTraffic: 6100, priority: 'medium' },
    { topic: 'Fair trade vs organic: what matters more', competitor: 'Boll & Branch', competitorUrl: 'https://boll-branch.com/blog/fair-trade-organic', estTraffic: 2400, priority: 'medium' },
    { topic: 'Thread count myths debunked', competitor: 'Brooklinen', competitorUrl: 'https://brooklinen.com/blogs/bedroom/thread-count-myths', estTraffic: 3900, priority: 'low' },
    { topic: 'Mattress buying mistakes to avoid', competitor: 'Casper', competitorUrl: 'https://casper.com/blog/mattress-mistakes', estTraffic: 5800, priority: 'low' },
  ];
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

@Controller('competitors')
export class CompetitorsController {
  private readonly logger = new Logger(CompetitorsController.name);
  private prisma = new PrismaClient();

  /**
   * Resolve organizationId - in dev mode, falls back to first organization
   */
  private async resolveOrganizationId(organizationId?: string): Promise<string> {
    if (organizationId) {
      return organizationId;
    }

    try {
      const firstOrg = await this.prisma.organization.findFirst({
        select: { id: true },
      });
      if (firstOrg) {
        return firstOrg.id;
      }
    } catch {
      // Database might not be available
    }

    return DEFAULT_ORG_ID;
  }

  /**
   * Build enriched competitor response with mock analysis data
   */
  private enrichCompetitor(dbRow: any, mockData?: any): any {
    const mock = mockData || {};
    return {
      id: dbRow.id,
      organizationId: dbRow.organizationId,
      competitorUrl: dbRow.competitorUrl,
      competitorName: dbRow.competitorName || this.extractDomainName(dbRow.competitorUrl),
      estimatedTraffic: mock.estimatedTraffic || Math.floor(Math.random() * 400000) + 100000,
      keywordCount: mock.keywordCount || Math.floor(Math.random() * 2000) + 500,
      overlapPercentage: mock.overlapPercentage || Math.floor(Math.random() * 40) + 10,
      contentTopics: dbRow.contentTopics || mock.contentTopics || [],
      topKeywords: mock.topKeywords || [],
      keywordsTheyRankFor: dbRow.keywordsTheyRankFor || mock.keywordsTheyRankFor || [],
      contentGaps: dbRow.contentGaps || mock.contentGaps || [],
      lastAnalyzedAt: dbRow.lastAnalyzedAt
        ? dbRow.lastAnalyzedAt.toISOString()
        : mock.lastAnalyzedAt || null,
      status: mock.status || 'tracked',
      createdAt: dbRow.createdAt ? dbRow.createdAt.toISOString() : new Date().toISOString(),
    };
  }

  /**
   * Extract a readable domain name from a URL
   */
  private extractDomainName(url: string): string {
    try {
      const hostname = new URL(url).hostname.replace('www.', '');
      const parts = hostname.split('.');
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    } catch {
      return url;
    }
  }

  // =========================================================================
  // GET /api/competitors
  // =========================================================================

  /**
   * List all tracked competitors for the organization.
   * Returns database records enriched with mock analysis data.
   */
  @Get()
  async listCompetitors(@Query('organizationId') organizationId?: string) {
    const orgId = await this.resolveOrganizationId(organizationId);
    this.logger.log(`GET /competitors - orgId=${orgId}`);

    try {
      const dbCompetitors = await this.prisma.competitor.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
      });

      if (dbCompetitors.length > 0) {
        // Enrich DB records with mock analysis data
        const mockData = generateMockCompetitors();
        const enriched = dbCompetitors.map((row, index) => {
          const mock = mockData[index % mockData.length];
          return this.enrichCompetitor(row, mock);
        });

        this.logger.log(`Returning ${enriched.length} competitors from database`);
        return { competitors: enriched, total: enriched.length };
      }

      // No database records - return mock competitors
      this.logger.log('No competitors in database, returning mock data');
      const mockCompetitors = generateMockCompetitors();
      return { competitors: mockCompetitors, total: mockCompetitors.length };
    } catch (error: any) {
      this.logger.error(`Failed to list competitors: ${error.message}`);
      // Fallback to mock data on database error
      const mockCompetitors = generateMockCompetitors();
      return { competitors: mockCompetitors, total: mockCompetitors.length };
    }
  }

  // =========================================================================
  // GET /api/competitors/overview
  // =========================================================================

  /**
   * Get competitor landscape overview with aggregate metrics.
   */
  @Get('overview')
  async getOverview(@Query('organizationId') organizationId?: string) {
    const orgId = await this.resolveOrganizationId(organizationId);
    this.logger.log(`GET /competitors/overview - orgId=${orgId}`);

    try {
      const mockCompetitors = generateMockCompetitors();
      const keywordGaps = generateKeywordGaps();
      const contentGaps = generateContentGaps();

      // Calculate aggregate metrics
      const totalCompetitorTraffic = mockCompetitors.reduce((sum, c) => sum + c.estimatedTraffic, 0);
      const avgCompetitorTraffic = Math.round(totalCompetitorTraffic / mockCompetitors.length);
      const avgOverlap = Math.round(
        mockCompetitors.reduce((sum, c) => sum + c.overlapPercentage, 0) / mockCompetitors.length
      );

      // Our estimated metrics
      const ourEstimatedTraffic = 185000;
      const competitiveScore = Math.round(
        (ourEstimatedTraffic / avgCompetitorTraffic) * 100 * (avgOverlap / 100) + 20
      );

      return {
        ourTraffic: ourEstimatedTraffic,
        avgCompetitorTraffic,
        keywordOverlapPercent: avgOverlap,
        contentGapsFound: contentGaps.length,
        keywordGapsFound: keywordGaps.length,
        competitiveScore: Math.min(competitiveScore, 100),
        competitorsTracked: mockCompetitors.length,
        topOpportunity: keywordGaps.sort((a, b) => b.opportunityScore - a.opportunityScore)[0],
        trafficComparison: mockCompetitors.map(c => ({
          name: c.competitorName,
          traffic: c.estimatedTraffic,
          keywords: c.keywordCount,
          overlap: c.overlapPercentage,
        })),
      };
    } catch (error: any) {
      this.logger.error(`Failed to get overview: ${error.message}`);
      throw new HttpException(
        `Failed to get competitor overview: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // =========================================================================
  // GET /api/competitors/keyword-gaps
  // =========================================================================

  /**
   * Get keyword gap analysis - keywords competitors rank for that we don't.
   * Supports filtering by competitor name.
   */
  @Get('keyword-gaps')
  async getKeywordGaps(
    @Query('organizationId') organizationId?: string,
    @Query('competitor') competitorFilter?: string,
  ) {
    this.logger.log(`GET /competitors/keyword-gaps - competitor=${competitorFilter}`);

    try {
      let gaps = generateKeywordGaps();

      if (competitorFilter && competitorFilter !== 'all') {
        gaps = gaps.filter(g => g.competitor === competitorFilter);
      }

      // Sort by opportunity score descending
      gaps.sort((a, b) => b.opportunityScore - a.opportunityScore);

      return {
        keywordGaps: gaps,
        total: gaps.length,
        summary: {
          avgOpportunityScore: Math.round(
            gaps.reduce((sum, g) => sum + g.opportunityScore, 0) / (gaps.length || 1)
          ),
          totalSearchVolume: gaps.reduce((sum, g) => sum + g.searchVolume, 0),
          highOpportunityCount: gaps.filter(g => g.opportunityScore >= 80).length,
        },
      };
    } catch (error: any) {
      this.logger.error(`Failed to get keyword gaps: ${error.message}`);
      throw new HttpException(
        `Failed to get keyword gaps: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // =========================================================================
  // GET /api/competitors/content-gaps
  // =========================================================================

  /**
   * Get content gap analysis - topics competitors cover that we don't.
   * Supports filtering by competitor name.
   */
  @Get('content-gaps')
  async getContentGaps(
    @Query('organizationId') organizationId?: string,
    @Query('competitor') competitorFilter?: string,
  ) {
    this.logger.log(`GET /competitors/content-gaps - competitor=${competitorFilter}`);

    try {
      let gaps = generateContentGaps();

      if (competitorFilter && competitorFilter !== 'all') {
        gaps = gaps.filter(g => g.competitor === competitorFilter);
      }

      // Sort by estimated traffic descending
      gaps.sort((a, b) => b.estTraffic - a.estTraffic);

      return {
        contentGaps: gaps,
        total: gaps.length,
        summary: {
          totalEstimatedTraffic: gaps.reduce((sum, g) => sum + g.estTraffic, 0),
          highPriorityCount: gaps.filter(g => g.priority === 'high').length,
          competitorsWithGaps: [...new Set(gaps.map(g => g.competitor))].length,
        },
      };
    } catch (error: any) {
      this.logger.error(`Failed to get content gaps: ${error.message}`);
      throw new HttpException(
        `Failed to get content gaps: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // =========================================================================
  // GET /api/competitors/:id
  // =========================================================================

  /**
   * Get detailed analysis for a specific competitor.
   */
  @Get(':id')
  async getCompetitor(@Param('id') id: string) {
    this.logger.log(`GET /competitors/${id}`);

    if (!id || id.trim().length === 0) {
      throw new HttpException('Competitor ID is required', HttpStatus.BAD_REQUEST);
    }

    try {
      // Try to find in database first
      const dbRow = await this.prisma.competitor.findUnique({
        where: { id },
      });

      if (dbRow) {
        const mockData = generateMockCompetitors();
        const matchingMock = mockData.find(m => m.id === id) || mockData[0];
        return this.enrichCompetitor(dbRow, matchingMock);
      }

      // Check if it's a mock ID
      const mockCompetitors = generateMockCompetitors();
      const mockCompetitor = mockCompetitors.find(c => c.id === id);

      if (mockCompetitor) {
        return mockCompetitor;
      }

      throw new HttpException(
        `Competitor not found: ${id}`,
        HttpStatus.NOT_FOUND,
      );
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to get competitor ${id}: ${error.message}`);

      // Try mock data fallback
      const mockCompetitors = generateMockCompetitors();
      const mockCompetitor = mockCompetitors.find(c => c.id === id);
      if (mockCompetitor) return mockCompetitor;

      throw new HttpException(
        `Failed to get competitor: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // =========================================================================
  // POST /api/competitors
  // =========================================================================

  /**
   * Add a new competitor to track.
   * Creates a Competitor record and seeds with mock analysis data.
   *
   * Body: { competitorUrl: string, competitorName?: string }
   */
  @Post()
  async addCompetitor(
    @Body() body: { competitorUrl: string; competitorName?: string },
    @Query('organizationId') organizationId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(organizationId);
    this.logger.log(`POST /competitors - url=${body.competitorUrl}, org=${orgId}`);

    if (!body.competitorUrl || body.competitorUrl.trim().length === 0) {
      throw new HttpException('Competitor URL is required', HttpStatus.BAD_REQUEST);
    }

    // Normalize URL
    let url = body.competitorUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }

    const competitorName = body.competitorName?.trim() || this.extractDomainName(url);

    try {
      // Generate mock analysis data for the new competitor
      const mockTopics = ['home goods', 'lifestyle', 'product reviews', 'buying guides', 'tips & tricks'];
      const selectedTopics = mockTopics
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.floor(Math.random() * 3) + 2);

      const mockKeywords = [
        { keyword: `best ${competitorName.toLowerCase()} products`, position: Math.floor(Math.random() * 10) + 1, searchVolume: Math.floor(Math.random() * 5000) + 1000 },
        { keyword: `${competitorName.toLowerCase()} reviews 2026`, position: Math.floor(Math.random() * 15) + 1, searchVolume: Math.floor(Math.random() * 3000) + 500 },
        { keyword: `${competitorName.toLowerCase()} vs alternatives`, position: Math.floor(Math.random() * 20) + 1, searchVolume: Math.floor(Math.random() * 4000) + 800 },
      ];

      const mockGaps = [
        {
          topic: `${competitorName} complete buying guide`,
          competitorUrl: `${url}/blog/buying-guide`,
          estTraffic: Math.floor(Math.random() * 3000) + 1000,
          priority: 'high',
        },
        {
          topic: `${competitorName} product comparison`,
          competitorUrl: `${url}/blog/comparison`,
          estTraffic: Math.floor(Math.random() * 2000) + 500,
          priority: 'medium',
        },
      ];

      const created = await this.prisma.competitor.create({
        data: {
          organizationId: orgId,
          competitorUrl: url,
          competitorName,
          contentTopics: selectedTopics,
          keywordsTheyRankFor: mockKeywords,
          contentGaps: mockGaps,
          lastAnalyzedAt: new Date(),
        },
      });

      this.logger.log(`Created competitor ${created.id}: ${competitorName}`);

      return this.enrichCompetitor(created, {
        estimatedTraffic: Math.floor(Math.random() * 300000) + 50000,
        keywordCount: Math.floor(Math.random() * 1500) + 300,
        overlapPercentage: Math.floor(Math.random() * 35) + 5,
        topKeywords: mockKeywords.map(k => k.keyword),
        status: 'tracked',
      });
    } catch (error: any) {
      // Handle unique constraint violation
      if (error.code === 'P2002') {
        throw new HttpException(
          `Competitor ${url} is already being tracked`,
          HttpStatus.CONFLICT,
        );
      }
      this.logger.error(`Failed to add competitor: ${error.message}`);
      throw new HttpException(
        `Failed to add competitor: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // =========================================================================
  // DELETE /api/competitors/:id
  // =========================================================================

  /**
   * Remove a competitor from tracking.
   */
  @Delete(':id')
  async removeCompetitor(@Param('id') id: string) {
    this.logger.log(`DELETE /competitors/${id}`);

    if (!id || id.trim().length === 0) {
      throw new HttpException('Competitor ID is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const existing = await this.prisma.competitor.findUnique({
        where: { id },
      });

      if (!existing) {
        // If it's a mock ID, just return success
        const mockCompetitors = generateMockCompetitors();
        if (mockCompetitors.some(c => c.id === id)) {
          return { success: true, message: `Competitor ${id} removed` };
        }
        throw new HttpException(
          `Competitor not found: ${id}`,
          HttpStatus.NOT_FOUND,
        );
      }

      await this.prisma.competitor.delete({ where: { id } });
      this.logger.log(`Competitor ${id} removed successfully`);

      return { success: true, message: `Competitor ${id} removed` };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to remove competitor ${id}: ${error.message}`);
      throw new HttpException(
        `Failed to remove competitor: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // =========================================================================
  // POST /api/competitors/:id/analyze
  // =========================================================================

  /**
   * Trigger a fresh analysis of a competitor.
   * Simulates crawling and updates analysis data with new mock results.
   */
  @Post(':id/analyze')
  async analyzeCompetitor(@Param('id') id: string) {
    this.logger.log(`POST /competitors/${id}/analyze`);

    if (!id || id.trim().length === 0) {
      throw new HttpException('Competitor ID is required', HttpStatus.BAD_REQUEST);
    }

    try {
      // Try to find in database
      const existing = await this.prisma.competitor.findUnique({
        where: { id },
      });

      if (existing) {
        // Generate fresh mock analysis data
        const freshTopics = ['bedding', 'home decor', 'lifestyle', 'buying guides', 'product care', 'sustainability']
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.floor(Math.random() * 3) + 3);

        const freshKeywords = [
          { keyword: `best ${existing.competitorName?.toLowerCase() || 'home'} products 2026`, position: Math.floor(Math.random() * 10) + 1, searchVolume: Math.floor(Math.random() * 8000) + 2000 },
          { keyword: `${existing.competitorName?.toLowerCase() || 'home'} review`, position: Math.floor(Math.random() * 15) + 1, searchVolume: Math.floor(Math.random() * 5000) + 1000 },
          { keyword: `${existing.competitorName?.toLowerCase() || 'home'} discount code`, position: Math.floor(Math.random() * 20) + 1, searchVolume: Math.floor(Math.random() * 6000) + 1500 },
          { keyword: `${existing.competitorName?.toLowerCase() || 'home'} alternatives`, position: Math.floor(Math.random() * 12) + 1, searchVolume: Math.floor(Math.random() * 4000) + 800 },
        ];

        const freshGaps = [
          { topic: `Complete ${existing.competitorName || 'competitor'} product guide`, competitorUrl: `${existing.competitorUrl}/blog/guide`, estTraffic: Math.floor(Math.random() * 4000) + 1000, priority: 'high' },
          { topic: `${existing.competitorName || 'Competitor'} vs us: honest comparison`, competitorUrl: `${existing.competitorUrl}/blog/comparison`, estTraffic: Math.floor(Math.random() * 3000) + 800, priority: 'medium' },
        ];

        const updated = await this.prisma.competitor.update({
          where: { id },
          data: {
            contentTopics: freshTopics,
            keywordsTheyRankFor: freshKeywords,
            contentGaps: freshGaps,
            lastAnalyzedAt: new Date(),
          },
        });

        this.logger.log(`Competitor ${id} re-analyzed successfully`);

        return this.enrichCompetitor(updated, {
          estimatedTraffic: Math.floor(Math.random() * 400000) + 100000,
          keywordCount: freshKeywords.length * Math.floor(Math.random() * 300) + 200,
          overlapPercentage: Math.floor(Math.random() * 40) + 10,
          topKeywords: freshKeywords.map(k => k.keyword),
          status: 'tracked',
        });
      }

      // Check if it's a mock competitor ID
      const mockCompetitors = generateMockCompetitors();
      const mockCompetitor = mockCompetitors.find(c => c.id === id);

      if (mockCompetitor) {
        // Return refreshed mock data
        return {
          ...mockCompetitor,
          lastAnalyzedAt: new Date().toISOString(),
          status: 'tracked',
        };
      }

      throw new HttpException(
        `Competitor not found: ${id}`,
        HttpStatus.NOT_FOUND,
      );
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to analyze competitor ${id}: ${error.message}`);
      throw new HttpException(
        `Failed to analyze competitor: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
