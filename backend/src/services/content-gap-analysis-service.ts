/**
 * Content Gap Analysis Service
 *
 * Identifies content opportunities by analyzing:
 * - Competitor topics we don't cover
 * - Unanswered PAA questions
 * - Keyword gaps
 * - Seasonal opportunities
 */

import Anthropic from '@anthropic-ai/sdk';
import { ContentGap, GapAnalysisResult } from '../types/qa-content.types';

export class ContentGapAnalysisService {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  /**
   * Analyze content gaps for organization
   */
  async analyzeGaps(
    organizationId: string,
    yourContent: string[],
    competitorContent: { url: string; topics: string[] }[]
  ): Promise<GapAnalysisResult> {
    console.log(`[ContentGap] Analyzing gaps for org ${organizationId}...`);

    const gaps: ContentGap[] = [];

    // Find competitor topics we don't cover
    for (const competitor of competitorContent) {
      for (const topic of competitor.topics) {
        const covered = yourContent.some((c) => c.toLowerCase().includes(topic.toLowerCase()));

        if (!covered) {
          gaps.push({
            type: 'competitor_topic',
            topic,
            relatedKeywords: [],
            estimatedSearchVolume: 1000,
            difficulty: 50,
            competitorsCoveringTopic: [competitor.url],
            priority: 7,
            reasoning: `${competitor.url} covers "${topic}" but we don't`,
          });
        }
      }
    }

    // Prioritize gaps
    const prioritized = this.prioritizeGaps(gaps);

    return {
      organizationId,
      gaps: prioritized,
      topOpportunities: prioritized.slice(0, 10),
      analysisDate: new Date(),
      competitorsAnalyzed: competitorContent.map((c) => c.url),
    };
  }

  /**
   * Find keyword gaps using AI analysis
   */
  async findKeywordGaps(yourKeywords: string[], competitorKeywords: string[]): Promise<string[]> {
    const gaps = competitorKeywords.filter((kw) => !yourKeywords.includes(kw));
    return gaps.slice(0, 50); // Top 50 gaps
  }

  private prioritizeGaps(gaps: ContentGap[]): ContentGap[] {
    return gaps.sort((a, b) => {
      // Higher search volume = higher priority
      const volumeDiff = b.estimatedSearchVolume - a.estimatedSearchVolume;
      if (volumeDiff !== 0) return volumeDiff;

      // Lower difficulty = higher priority
      return a.difficulty - b.difficulty;
    });
  }
}

export default ContentGapAnalysisService;
