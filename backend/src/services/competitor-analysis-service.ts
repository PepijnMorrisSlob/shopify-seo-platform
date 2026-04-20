/**
 * Competitor Analysis Service
 *
 * Performs real competitor intelligence using the DataForSEO API.
 * Given a competitor URL, this service:
 *   1. Fetches the keywords the competitor ranks for (domain keywords endpoint)
 *   2. Fetches their top-performing content pages (top pages endpoint)
 *   3. Computes keyword gaps vs. our organization's keyword set
 *   4. Computes content gaps vs. our organization's published QA pages
 *   5. Stores all results in the Competitor model's JSON fields
 *
 * Cost: ~$0.90-1.50 per analysis in DataForSEO credits (2 SERP-style calls).
 * Latency: 30-60 seconds end-to-end. Callers should queue this job.
 */

import { PrismaClient } from '@prisma/client';
import { DataForSEOService } from './dataforseo-service';

export interface CompetitorAnalysisResult {
  competitorId: string;
  organizationId: string;
  domain: string;
  totalKeywords: number;
  totalTopPages: number;
  keywordGaps: KeywordGap[];
  contentGaps: ContentGap[];
  overlapPercentage: number;
  estimatedCost: number;
  analyzedAt: Date;
}

export interface KeywordGap {
  keyword: string;
  searchVolume: number;
  competitorPosition: number;
  url: string;
  /** 0-100 — higher means a bigger opportunity for us */
  opportunityScore: number;
}

export interface ContentGap {
  topic: string;
  competitorUrl: string;
  estimatedTraffic: number;
  priority: 'high' | 'medium' | 'low';
}

export class CompetitorAnalysisService {
  private readonly dataforseo: DataForSEOService;
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;

    const login = process.env.DATAFORSEO_LOGIN;
    const password = process.env.DATAFORSEO_PASSWORD;

    if (!login || !password) {
      throw new Error(
        'DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD must be set to run competitor analysis',
      );
    }

    this.dataforseo = new DataForSEOService({ login, password });
  }

  /**
   * Run the full competitor analysis pipeline and persist results to DB.
   * Throws on DataForSEO errors — caller (queue worker) should retry.
   */
  async analyzeCompetitor(
    competitorId: string,
    organizationId: string,
  ): Promise<CompetitorAnalysisResult> {
    const competitor = await this.prisma.competitor.findUnique({
      where: { id: competitorId },
    });

    if (!competitor) {
      throw new Error(`Competitor ${competitorId} not found`);
    }

    if (competitor.organizationId !== organizationId) {
      throw new Error(
        `Competitor ${competitorId} does not belong to organization ${organizationId}`,
      );
    }

    const domain = this.extractDomain(competitor.competitorUrl);

    // 1. Fetch keywords the competitor ranks for
    const domainKeywords = await this.dataforseo.getDomainKeywords(
      domain,
      2840,
      100,
    );

    // 2. Fetch top content pages
    const competitorContent = await this.dataforseo.getCompetitorContent(
      domain,
      2840,
    );

    // 3. Our keyword set for overlap analysis
    const ourKeywords = await this.prisma.keyword.findMany({
      where: { organizationId },
      select: { keyword: true },
    });
    const ourKeywordSet = new Set(
      ourKeywords.map((k) => k.keyword.toLowerCase()),
    );

    // 4. Keyword gaps — they rank, we don't
    const keywordGaps: KeywordGap[] = domainKeywords
      .filter((dk) => !ourKeywordSet.has(dk.keyword.toLowerCase()))
      .map((dk) => ({
        keyword: dk.keyword,
        searchVolume: dk.search_volume || 0,
        competitorPosition: dk.position || 0,
        url: dk.url || '',
        opportunityScore: this.opportunityScore(dk.search_volume, dk.position),
      }))
      .sort((a, b) => b.opportunityScore - a.opportunityScore);

    // 5. Content gaps — topics they cover, we don't
    const ourPages = await this.prisma.qAPage.findMany({
      where: { organizationId },
      select: { targetKeyword: true, question: true },
    });
    const ourTopics = new Set(
      ourPages
        .map((p) => (p.targetKeyword || p.question || '').toLowerCase())
        .filter(Boolean),
    );
    const contentGaps: ContentGap[] = (competitorContent.topPages || [])
      .filter((page: any) => {
        const title = (page.title || '').toLowerCase();
        // Match if our topics don't contain any word from the page title
        if (!title) return false;
        for (const ourTopic of ourTopics) {
          if (title.includes(ourTopic) || ourTopic.includes(title))
            return false;
        }
        return true;
      })
      .map((page: any) => ({
        topic: page.title,
        competitorUrl: page.url,
        estimatedTraffic: page.traffic || 0,
        priority:
          page.traffic > 1000
            ? ('high' as const)
            : page.traffic > 100
              ? ('medium' as const)
              : ('low' as const),
      }))
      .sort((a, b) => b.estimatedTraffic - a.estimatedTraffic);

    // 6. Overlap percentage
    const overlapCount = domainKeywords.filter((dk) =>
      ourKeywordSet.has(dk.keyword.toLowerCase()),
    ).length;
    const overlapPercentage =
      domainKeywords.length > 0
        ? Math.round((overlapCount / domainKeywords.length) * 100)
        : 0;

    // 7. Persist — store top 50 keywords, top 20 content topics, top 20 gaps
    await this.prisma.competitor.update({
      where: { id: competitorId },
      data: {
        keywordsTheyRankFor: domainKeywords.slice(0, 50) as any,
        contentTopics: (competitorContent.topPages || []).slice(0, 20) as any,
        contentGaps: contentGaps.slice(0, 20) as any,
        lastAnalyzedAt: new Date(),
      },
    });

    return {
      competitorId,
      organizationId,
      domain,
      totalKeywords: domainKeywords.length,
      totalTopPages: (competitorContent.topPages || []).length,
      keywordGaps: keywordGaps.slice(0, 50),
      contentGaps: contentGaps.slice(0, 20),
      overlapPercentage,
      estimatedCost: this.dataforseo.getTotalCost(),
      analyzedAt: new Date(),
    };
  }

  /**
   * Extract the hostname from a URL. Handles bare domains ("example.com")
   * and full URLs ("https://example.com/path").
   */
  private extractDomain(input: string): string {
    try {
      const url = new URL(input.startsWith('http') ? input : `https://${input}`);
      return url.hostname.replace(/^www\./, '');
    } catch {
      return input.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
    }
  }

  /**
   * Score a keyword opportunity from 0-100. Prioritizes high volume keywords
   * where the competitor ranks in the top 20 (we can realistically catch up).
   */
  private opportunityScore(searchVolume: number, position: number): number {
    if (!searchVolume || searchVolume <= 0) return 0;

    // Volume score: log-scale up to ~10k/month
    const volumeScore = Math.min(60, Math.log10(Math.max(1, searchVolume)) * 15);

    // Position score: top 20 is where we can compete
    const positionScore =
      position > 0 && position <= 20 ? (20 - position) * 2 : 0;

    return Math.round(Math.min(100, volumeScore + positionScore));
  }
}

let instance: CompetitorAnalysisService | null = null;

export function getCompetitorAnalysisService(
  prisma?: PrismaClient,
): CompetitorAnalysisService {
  if (!instance) {
    instance = new CompetitorAnalysisService(prisma || new PrismaClient());
  }
  return instance;
}
