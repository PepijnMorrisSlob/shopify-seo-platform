/**
 * Auto-Optimization Service
 *
 * Monitors content performance and automatically optimizes underperforming pages.
 * Detects ranking declines, traffic drops, and triggers content refresh.
 */

import Anthropic from '@anthropic-ai/sdk';
import { OptimizationAnalysis, OptimizationIssue, ContentPerformance } from '../types/qa-content.types';
import { GeminiService } from './gemini-service';

export class AutoOptimizationService {
  private anthropic: Anthropic;
  private researchService: GeminiService;

  constructor() {
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.researchService = new GeminiService();
  }

  /**
   * Analyze page performance and identify optimization needs
   */
  async analyzePage(
    pageId: string,
    performance: ContentPerformance,
    content: string
  ): Promise<OptimizationAnalysis> {
    const issues: OptimizationIssue[] = [];

    // Check for ranking decline
    if (performance.positionChange < -5) {
      issues.push({
        type: 'ranking_decline',
        severity: 'high',
        description: `Ranking dropped ${Math.abs(performance.positionChange)} positions`,
        detectedAt: new Date(),
      });
    }

    // Check for traffic decline
    if (performance.clicks.changePercentage < -20) {
      issues.push({
        type: 'traffic_decline',
        severity: 'high',
        description: `Traffic declined by ${Math.abs(performance.clicks.changePercentage)}%`,
        detectedAt: new Date(),
      });
    }

    // Check for low engagement
    if (performance.engagement.bounceRate > 70) {
      issues.push({
        type: 'low_engagement',
        severity: 'medium',
        description: `High bounce rate: ${performance.engagement.bounceRate}%`,
        detectedAt: new Date(),
      });
    }

    const status = issues.some((i) => i.severity === 'high')
      ? 'critical'
      : issues.length > 0
      ? 'needs_attention'
      : 'healthy';

    return {
      pageId,
      status,
      issues,
      opportunities: [],
      recommendations: await this.generateRecommendations(issues, content),
      estimatedImpact: status === 'critical' ? 'high' : 'medium',
    };
  }

  /**
   * Refresh content with latest information
   */
  async refreshContent(pageId: string, originalContent: string, topic: string): Promise<string> {
    console.log(`[AutoOptimization] Refreshing content for page ${pageId}...`);

    // Research latest information
    const research = await this.researchService.research(topic, {
      depth: 'thorough',
      dateFilter: 'last_6_months',
    });

    // Generate updated content
    const prompt = `Update this content with the latest information:

ORIGINAL CONTENT:
${originalContent}

LATEST RESEARCH:
${JSON.stringify(research.factualInformation)}

RECENT UPDATES:
${JSON.stringify(research.recentUpdates)}

Instructions:
1. Keep the same structure and tone
2. Update statistics with latest data
3. Add recent developments
4. Preserve existing sections
5. Enhance with new insights

Provide the updated content:`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    return response.content[0]?.type === 'text' ? response.content[0].text : originalContent;
  }

  private async generateRecommendations(issues: OptimizationIssue[], content: string) {
    const recommendations = [];

    for (const issue of issues) {
      if (issue.type === 'ranking_decline') {
        recommendations.push({
          action: 'Refresh content with latest information and statistics',
          reasoning: 'Rankings often decline when content becomes outdated',
          priority: 9,
          automatable: true,
          estimatedTimeToImplement: 30,
        });
      }

      if (issue.type === 'traffic_decline') {
        recommendations.push({
          action: 'Optimize title and meta description for higher CTR',
          reasoning: 'Traffic decline may indicate poor click-through rate',
          priority: 8,
          automatable: true,
          estimatedTimeToImplement: 15,
        });
      }

      if (issue.type === 'low_engagement') {
        recommendations.push({
          action: 'Improve content structure and add more visuals',
          reasoning: 'High bounce rate suggests content not meeting user expectations',
          priority: 7,
          automatable: false,
          estimatedTimeToImplement: 60,
        });
      }
    }

    return recommendations;
  }
}

export default AutoOptimizationService;
