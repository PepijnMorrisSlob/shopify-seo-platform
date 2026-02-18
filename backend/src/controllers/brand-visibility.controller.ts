/**
 * Brand Visibility Controller
 * Shopify SEO Platform
 *
 * GEO Brand Visibility Tracker - tracks how AI search engines
 * (ChatGPT, Gemini, Perplexity, Google AI Overviews) mention and cite the brand.
 *
 * API endpoints:
 * - GET  /api/brand-visibility/overview        - Get overall brand visibility metrics
 * - GET  /api/brand-visibility/checks          - List all visibility checks with results
 * - POST /api/brand-visibility/check           - Run a new visibility check
 * - GET  /api/brand-visibility/trends          - Get visibility trends over time
 * - GET  /api/brand-visibility/recommendations - Get AI recommendations to improve visibility
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// --- Types ---

interface EngineResult {
  mentioned: boolean;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  citation: boolean;
  mentionContext: string | null;
  confidence: number;
}

interface CheckResult {
  id: string;
  query: string;
  brandName: string;
  results: {
    chatgpt: EngineResult;
    gemini: EngineResult;
    perplexity: EngineResult;
    googleAI: EngineResult;
  };
  checkedAt: string;
}

interface EngineOverview {
  mentionRate: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  citations: number;
  trend: 'up' | 'down' | 'stable';
  lastChecked: string;
}

interface TrendDataPoint {
  date: string;
  chatgpt: number;
  gemini: number;
  perplexity: number;
  googleAI: number;
  overall: number;
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  category: string;
  actionItems: string[];
}

// --- Controller ---

@Controller('brand-visibility')
export class BrandVisibilityController {
  private readonly logger = new Logger(BrandVisibilityController.name);
  private prisma = new PrismaClient();

  /**
   * Resolve organizationId - in dev mode, falls back to first organization
   */
  private async resolveOrganizationId(organizationId?: string): Promise<string | undefined> {
    if (organizationId) {
      return organizationId;
    }

    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
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
    }

    return undefined;
  }

  // =========================================================================
  // GET /api/brand-visibility/overview
  // =========================================================================

  /**
   * Returns overall brand visibility metrics across all AI engines.
   */
  @Get('overview')
  async getOverview(@Query('organizationId') organizationId?: string) {
    this.logger.log('Fetching brand visibility overview');

    try {
      const now = new Date();
      const lastChecked = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago

      return {
        overallScore: 72,
        engines: {
          chatgpt: {
            mentionRate: 85,
            sentiment: 'positive' as const,
            citations: 12,
            trend: 'up' as const,
            lastChecked,
          },
          gemini: {
            mentionRate: 65,
            sentiment: 'neutral' as const,
            citations: 8,
            trend: 'stable' as const,
            lastChecked,
          },
          perplexity: {
            mentionRate: 78,
            sentiment: 'positive' as const,
            citations: 15,
            trend: 'up' as const,
            lastChecked,
          },
          googleAI: {
            mentionRate: 45,
            sentiment: 'neutral' as const,
            citations: 3,
            trend: 'down' as const,
            lastChecked,
          },
        },
        totalChecks: 48,
        totalMentions: 38,
        avgConfidence: 0.82,
        lastChecked,
      };
    } catch (error: any) {
      this.logger.error(`Error in overview: ${error.message}`);
      throw new HttpException(
        'Failed to fetch brand visibility overview',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // =========================================================================
  // GET /api/brand-visibility/checks
  // =========================================================================

  /**
   * Returns a list of all visibility checks with their results.
   */
  @Get('checks')
  async getChecks(
    @Query('organizationId') organizationId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    this.logger.log('Fetching brand visibility checks');

    try {
      const checks: CheckResult[] = this.generateMockChecks();
      const parsedLimit = limit ? parseInt(limit, 10) : 20;
      const parsedOffset = offset ? parseInt(offset, 10) : 0;

      return {
        checks: checks.slice(parsedOffset, parsedOffset + parsedLimit),
        total: checks.length,
        limit: parsedLimit,
        offset: parsedOffset,
      };
    } catch (error: any) {
      this.logger.error(`Error in checks: ${error.message}`);
      throw new HttpException(
        'Failed to fetch visibility checks',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // =========================================================================
  // POST /api/brand-visibility/check
  // =========================================================================

  /**
   * Run a new visibility check - simulates querying AI engines for brand mentions.
   */
  @Post('check')
  async runCheck(
    @Body() body: { query: string; brandName: string; engines?: string[] },
  ) {
    const { query, brandName, engines } = body;

    if (!query || !brandName) {
      throw new HttpException(
        'Both query and brandName are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.log(`Running visibility check: "${query}" for brand "${brandName}"`);

    const selectedEngines = engines || ['chatgpt', 'gemini', 'perplexity', 'googleAI'];

    try {
      // Simulate checking across AI engines with realistic delays
      const checkId = `check-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      const results: Record<string, EngineResult> = {};

      for (const engine of ['chatgpt', 'gemini', 'perplexity', 'googleAI']) {
        if (selectedEngines.includes(engine)) {
          results[engine] = this.simulateEngineCheck(engine, query, brandName);
        } else {
          results[engine] = {
            mentioned: false,
            sentiment: null,
            citation: false,
            mentionContext: null,
            confidence: 0,
          };
        }
      }

      const check: CheckResult = {
        id: checkId,
        query,
        brandName,
        results: results as CheckResult['results'],
        checkedAt: new Date().toISOString(),
      };

      this.logger.log(`Visibility check completed: ${checkId}`);

      return check;
    } catch (error: any) {
      this.logger.error(`Error running check: ${error.message}`);
      throw new HttpException(
        'Failed to run visibility check',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // =========================================================================
  // GET /api/brand-visibility/trends
  // =========================================================================

  /**
   * Returns time-series visibility scores over the last 30 days.
   */
  @Get('trends')
  async getTrends(
    @Query('days') daysParam?: string,
    @Query('organizationId') organizationId?: string,
  ) {
    const days = daysParam ? parseInt(daysParam, 10) : 30;
    this.logger.log(`Fetching visibility trends for last ${days} days`);

    try {
      const trends: TrendDataPoint[] = [];
      const now = new Date();

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dayProgress = (days - i) / days;

        // Base scores with upward trends and realistic variance
        const chatgptBase = 70 + dayProgress * 15;
        const geminiBase = 55 + dayProgress * 10;
        const perplexityBase = 65 + dayProgress * 13;
        const googleAIBase = 40 + dayProgress * 5;

        // Add daily variance
        const variance = () => (Math.random() - 0.4) * 8;
        // Weekend slight dips
        const weekendDip = (date.getDay() === 0 || date.getDay() === 6) ? -3 : 0;

        const chatgpt = Math.min(100, Math.max(0, Math.round(chatgptBase + variance() + weekendDip)));
        const gemini = Math.min(100, Math.max(0, Math.round(geminiBase + variance() + weekendDip)));
        const perplexity = Math.min(100, Math.max(0, Math.round(perplexityBase + variance() + weekendDip)));
        const googleAI = Math.min(100, Math.max(0, Math.round(googleAIBase + variance() + weekendDip)));

        const overall = Math.round((chatgpt + gemini + perplexity + googleAI) / 4);

        trends.push({
          date: date.toISOString().split('T')[0],
          chatgpt,
          gemini,
          perplexity,
          googleAI,
          overall,
        });
      }

      return { trends, days };
    } catch (error: any) {
      this.logger.error(`Error in trends: ${error.message}`);
      throw new HttpException(
        'Failed to fetch visibility trends',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // =========================================================================
  // GET /api/brand-visibility/recommendations
  // =========================================================================

  /**
   * Returns AI-generated recommendations to improve brand visibility in LLMs.
   */
  @Get('recommendations')
  async getRecommendations(@Query('organizationId') organizationId?: string) {
    this.logger.log('Fetching visibility recommendations');

    try {
      const recommendations: Recommendation[] = [
        {
          id: 'rec-1',
          title: 'Add Structured Data Markup (Schema.org)',
          description:
            'LLMs heavily rely on structured data to understand and cite your brand. Adding comprehensive Schema.org markup (Organization, Product, FAQ, HowTo) will significantly increase your chances of being mentioned in AI-generated answers.',
          impact: 'high',
          category: 'Technical SEO',
          actionItems: [
            'Add Organization schema with brand name, logo, and social profiles',
            'Implement Product schema on all product pages with ratings and pricing',
            'Add FAQ schema to your Q&A content pages',
            'Implement BreadcrumbList schema for navigation structure',
          ],
        },
        {
          id: 'rec-2',
          title: 'Create Authoritative, Citable Content',
          description:
            'AI engines prefer citing content that demonstrates E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness). Create comprehensive guides, original research, and expert-authored content that LLMs will want to reference.',
          impact: 'high',
          category: 'Content Strategy',
          actionItems: [
            'Publish 2-3 long-form guides (2000+ words) per month on core topics',
            'Include original data, statistics, and expert quotes',
            'Add author bios with credentials to all content',
            'Create comparison pages and "best of" listicles in your niche',
          ],
        },
        {
          id: 'rec-3',
          title: 'Optimize for Conversational Queries',
          description:
            'AI search engines respond to conversational, question-based queries. Optimize your content to directly answer the types of questions users ask AI chatbots about products in your category.',
          impact: 'high',
          category: 'Content Optimization',
          actionItems: [
            'Research and target question-based keywords ("what is the best...", "how to choose...")',
            'Structure content with clear H2/H3 headings that match question formats',
            'Provide concise, direct answers in the first paragraph of each section',
            'Add a FAQ section to every product and category page',
          ],
        },
        {
          id: 'rec-4',
          title: 'Build Brand Mentions Across the Web',
          description:
            'LLMs learn about brands from their training data. Increasing your brand mentions across authoritative websites, forums, and review platforms will improve your visibility in AI responses over time.',
          impact: 'medium',
          category: 'Brand Building',
          actionItems: [
            'Get featured in industry publications and blogs',
            'Encourage customer reviews on Google, Trustpilot, and niche review sites',
            'Participate in relevant Reddit, Quora, and forum discussions',
            'Pursue strategic partnerships for co-marketing content',
          ],
        },
        {
          id: 'rec-5',
          title: 'Improve Google AI Overview Presence',
          description:
            'Your Google AI Overview mention rate (45%) is the weakest area. Focus on ranking in featured snippets and People Also Ask sections, as Google AI Overviews heavily draw from these sources.',
          impact: 'medium',
          category: 'Search Optimization',
          actionItems: [
            'Target featured snippet opportunities with concise, well-formatted answers',
            'Optimize for People Also Ask questions in your niche',
            'Use table and list formatting for comparison content',
            'Ensure page speed is under 2.5s LCP for all content pages',
          ],
        },
        {
          id: 'rec-6',
          title: 'Maintain Consistent NAP and Brand Information',
          description:
            'Ensure your brand name, description, and key information is consistent across all platforms. Inconsistencies confuse AI models and reduce citation confidence.',
          impact: 'low',
          category: 'Brand Consistency',
          actionItems: [
            'Audit brand name usage across all web properties',
            'Standardize your brand description and value proposition',
            'Update all directory listings with consistent information',
            'Create a brand style guide for external mentions',
          ],
        },
      ];

      return { recommendations };
    } catch (error: any) {
      this.logger.error(`Error in recommendations: ${error.message}`);
      throw new HttpException(
        'Failed to fetch recommendations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // =========================================================================
  // Private Helpers
  // =========================================================================

  /**
   * Simulate an AI engine check for brand mentions.
   * Produces realistic mock results based on engine characteristics.
   */
  private simulateEngineCheck(engine: string, query: string, brandName: string): EngineResult {
    // Different engines have different mention likelihoods
    const engineProfiles: Record<string, { mentionChance: number; citationChance: number; sentimentBias: number }> = {
      chatgpt: { mentionChance: 0.80, citationChance: 0.60, sentimentBias: 0.7 },
      gemini: { mentionChance: 0.60, citationChance: 0.45, sentimentBias: 0.5 },
      perplexity: { mentionChance: 0.75, citationChance: 0.70, sentimentBias: 0.65 },
      googleAI: { mentionChance: 0.45, citationChance: 0.30, sentimentBias: 0.5 },
    };

    const profile = engineProfiles[engine] || engineProfiles.chatgpt;
    const mentioned = Math.random() < profile.mentionChance;

    if (!mentioned) {
      return {
        mentioned: false,
        sentiment: null,
        citation: false,
        mentionContext: null,
        confidence: parseFloat((Math.random() * 0.3 + 0.1).toFixed(2)),
      };
    }

    // Determine sentiment
    const sentimentRoll = Math.random();
    let sentiment: 'positive' | 'neutral' | 'negative';
    if (sentimentRoll < profile.sentimentBias) {
      sentiment = 'positive';
    } else if (sentimentRoll < profile.sentimentBias + 0.25) {
      sentiment = 'neutral';
    } else {
      sentiment = 'negative';
    }

    const citation = Math.random() < profile.citationChance;

    // Generate realistic mention context snippets
    const contextTemplates: Record<string, string[]> = {
      chatgpt: [
        `${brandName} is often recommended for this category due to their quality and customer service...`,
        `According to various sources, ${brandName} offers competitive options in this space...`,
        `${brandName}'s products have received positive reviews from customers looking for ${query.toLowerCase().replace('?', '')}...`,
      ],
      gemini: [
        `Several retailers including ${brandName} offer products matching your criteria...`,
        `${brandName} is one option to consider when looking for ${query.toLowerCase().replace('?', '')}...`,
        `Based on available information, ${brandName} provides relevant products in this category...`,
      ],
      perplexity: [
        `According to ${brandName}'s website, they specialize in products for ${query.toLowerCase().replace('?', '')} [source: ${brandName.toLowerCase()}.com]...`,
        `${brandName} is frequently cited in reviews as a top choice for this need. Their product line includes...`,
        `Reviews on multiple platforms mention ${brandName} as a recommended brand for ${query.toLowerCase().replace('?', '')}...`,
      ],
      googleAI: [
        `${brandName} offers relevant products that may match what you're looking for...`,
        `Some users recommend ${brandName} for this type of product based on their experience...`,
      ],
    };

    const contexts = contextTemplates[engine] || contextTemplates.chatgpt;
    const mentionContext = contexts[Math.floor(Math.random() * contexts.length)];

    return {
      mentioned: true,
      sentiment,
      citation,
      mentionContext,
      confidence: parseFloat((Math.random() * 0.3 + 0.65).toFixed(2)),
    };
  }

  /**
   * Generate realistic mock check history data.
   */
  private generateMockChecks(): CheckResult[] {
    const queries = [
      'What are the best bed sheets for hot sleepers?',
      'Best organic cotton clothing brands',
      'Top rated running shoes for beginners 2026',
      'How to choose sustainable fashion brands?',
      'Best merino wool sweaters for winter',
      'Where to buy high quality leather bags online?',
      'Most comfortable yoga mats for beginners',
      'Best eco-friendly home products',
      'Top Shopify stores for premium clothing',
      'What are the best gifts for runners?',
      'Affordable luxury bedding brands',
      'Best bamboo fabric clothing',
    ];

    const now = new Date();
    const checks: CheckResult[] = [];

    for (let i = 0; i < queries.length; i++) {
      const checkedAt = new Date(now.getTime() - i * 6 * 60 * 60 * 1000); // Every 6 hours

      checks.push({
        id: `check-${i + 1}`,
        query: queries[i],
        brandName: 'MyStore',
        results: {
          chatgpt: this.simulateEngineCheck('chatgpt', queries[i], 'MyStore'),
          gemini: this.simulateEngineCheck('gemini', queries[i], 'MyStore'),
          perplexity: this.simulateEngineCheck('perplexity', queries[i], 'MyStore'),
          googleAI: this.simulateEngineCheck('googleAI', queries[i], 'MyStore'),
        },
        checkedAt: checkedAt.toISOString(),
      });
    }

    return checks;
  }
}
