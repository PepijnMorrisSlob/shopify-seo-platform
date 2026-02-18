/**
 * Question Discovery Service
 *
 * Discovers high-value questions to answer through multiple sources:
 * - Google People Also Ask (via DataForSEO)
 * - Competitor content analysis
 * - Custom question generation (AI-powered)
 * - Industry-specific templates
 * - Search trend analysis
 *
 * Features:
 * - Multi-source question discovery
 * - Priority scoring based on search volume, difficulty, opportunity
 * - Deduplication and clustering
 * - Content gap identification
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  Question,
  QuestionTemplate,
  PAQQuestion,
  BusinessProfile,
  BusinessContext,
  ContentGap,
} from '../types/qa-content.types';

export class QuestionDiscoveryService {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  // ==========================================================================
  // MULTI-SOURCE QUESTION DISCOVERY
  // ==========================================================================

  /**
   * Discover questions from all available sources
   * Combines PAA, competitors, templates, and AI generation
   */
  async discoverQuestions(
    businessContext: BusinessContext,
    targetKeywords: string[]
  ): Promise<Question[]> {
    console.log('[QuestionDiscovery] Discovering questions from multiple sources...');

    // Discover from all sources in parallel
    const [paaQuestions, competitorQuestions, templateQuestions, aiQuestions] = await Promise.all([
      this.discoverFromPAA(targetKeywords),
      this.discoverFromCompetitors(businessContext.competitorInsights),
      this.generateFromTemplates(businessContext.customTemplates, businessContext.productInsights),
      this.generateAIQuestions(businessContext),
    ]);

    // Combine and deduplicate
    const allQuestions = [...paaQuestions, ...competitorQuestions, ...templateQuestions, ...aiQuestions];
    const deduplicated = this.deduplicateQuestions(allQuestions);

    // Score and prioritize
    const scored = deduplicated.map((q) => this.scoreQuestion(q, businessContext));

    // Sort by priority
    scored.sort((a, b) => b.priority - a.priority);

    console.log(`[QuestionDiscovery] Discovered ${scored.length} unique questions`);

    return scored;
  }

  // ==========================================================================
  // PEOPLE ALSO ASK DISCOVERY
  // ==========================================================================

  /**
   * Get questions from Google People Also Ask
   * Uses DataForSEO API
   */
  async discoverFromPAA(keywords: string[]): Promise<Question[]> {
    console.log(`[QuestionDiscovery] Fetching PAA questions for ${keywords.length} keywords...`);

    const questions: Question[] = [];

    for (const keyword of keywords.slice(0, 10)) {
      // Limit to avoid rate limits
      try {
        const paaData = await this.getPAAFromDataForSEO(keyword);

        for (const paa of paaData) {
          questions.push({
            id: this.generateQuestionId(paa.question),
            question: paa.question,
            category: this.categorizeQuestion(paa.question),
            source: 'paa',
            priority: 7, // PAA questions are high priority
            searchVolume: paa.searchVolume,
            difficulty: undefined,
            estimatedTraffic: this.estimateTraffic(paa.searchVolume),
            relatedKeywords: [keyword, ...paa.relatedQuestions.slice(0, 3)],
            metadata: {
              createdAt: new Date(),
            },
          });
        }
      } catch (error) {
        console.error(`[QuestionDiscovery] Failed to fetch PAA for "${keyword}":`, error);
      }
    }

    return questions;
  }

  /**
   * Get PAA data from DataForSEO
   * (Simplified - would integrate with actual DataForSEO API)
   */
  private async getPAAFromDataForSEO(keyword: string): Promise<PAQQuestion[]> {
    // TODO: Integrate with DataForSEO API
    // For now, return mock data structure
    console.log(`[QuestionDiscovery] DataForSEO API call for: ${keyword}`);

    // Mock implementation - replace with actual API call
    return [
      {
        question: `What is the best ${keyword}?`,
        relatedKeyword: keyword,
        searchVolume: 1000,
        relatedQuestions: [
          `How to choose ${keyword}`,
          `Where to buy ${keyword}`,
          `${keyword} reviews`,
        ],
      },
    ];
  }

  // ==========================================================================
  // COMPETITOR QUESTION DISCOVERY
  // ==========================================================================

  /**
   * Extract questions from competitor content
   */
  async discoverFromCompetitors(competitorInsights: any[]): Promise<Question[]> {
    console.log('[QuestionDiscovery] Extracting questions from competitor content...');

    const questions: Question[] = [];

    for (const competitor of competitorInsights) {
      for (const question of competitor.questionsCovered || []) {
        questions.push({
          id: this.generateQuestionId(question),
          question,
          category: this.categorizeQuestion(question),
          source: 'competitor',
          priority: 6, // Competitor questions are medium-high priority
          relatedKeywords: [],
          metadata: {
            createdAt: new Date(),
            competitorUrl: competitor.url,
          },
        });
      }
    }

    return questions;
  }

  // ==========================================================================
  // TEMPLATE-BASED QUESTION GENERATION
  // ==========================================================================

  /**
   * Generate questions from custom templates
   */
  async generateFromTemplates(
    templates: QuestionTemplate[],
    productInsights: any
  ): Promise<Question[]> {
    console.log(`[QuestionDiscovery] Generating questions from ${templates.length} templates...`);

    const questions: Question[] = [];

    for (const template of templates.slice(0, 20)) {
      // Limit to top 20 templates
      try {
        const generated = await this.fillTemplate(template, productInsights);

        for (const questionText of generated) {
          questions.push({
            id: this.generateQuestionId(questionText),
            question: questionText,
            category: template.category,
            source: 'template',
            priority: template.priority,
            relatedKeywords: [],
            metadata: {
              createdAt: new Date(),
              templateUsed: template.id,
            },
          });
        }
      } catch (error) {
        console.error(`[QuestionDiscovery] Failed to fill template ${template.id}:`, error);
      }
    }

    return questions;
  }

  /**
   * Fill template with actual product/business data
   */
  private async fillTemplate(template: QuestionTemplate, productInsights: any): Promise<string[]> {
    const categories = productInsights.categories || [];
    const features = productInsights.commonFeatures || [];

    const questions: string[] = [];

    // Simple variable substitution
    // In production, would use more sophisticated template filling with AI

    for (const category of categories.slice(0, 3)) {
      let filled = template.template;

      // Replace common variables
      filled = filled.replace(/{product_category}/g, category);
      filled = filled.replace(/{product}/g, category);

      if (features.length > 0) {
        filled = filled.replace(/{feature}/g, features[0]);
      }

      // Only add if successfully filled (no unreplaced variables)
      if (!filled.includes('{') && !filled.includes('}')) {
        questions.push(filled);
      }
    }

    return questions;
  }

  // ==========================================================================
  // AI-POWERED QUESTION GENERATION
  // ==========================================================================

  /**
   * Generate custom questions using AI
   * Based on business context and market gaps
   */
  async generateAIQuestions(businessContext: BusinessContext): Promise<Question[]> {
    console.log('[QuestionDiscovery] Generating AI-powered custom questions...');

    const { profile, productInsights, competitorInsights } = businessContext;

    const competitorGaps = competitorInsights.flatMap((c) => c.contentGaps || []);

    const prompt = `Generate 30 high-value questions for this business to answer:

Business Profile:
- Industry: ${profile.industry}
- Products: ${productInsights.categories.join(', ')}
- Target Audience: ${profile.targetAudience.demographics}
- Pain Points: ${profile.targetAudience.painPoints.join(', ')}
- Expertise Level: ${profile.targetAudience.expertiseLevel}

Competitor Content Gaps:
${competitorGaps.join('\n')}

Generate questions that:
1. Address customer pain points directly
2. Fill gaps competitors aren't covering
3. Match target audience expertise level
4. Have high search intent
5. Lead to conversions

Format as JSON array:
[
  {
    "question": "the full question text",
    "category": "how-to|comparison|troubleshooting|buying-guide|feature-explanation",
    "priority": 1-10,
    "relatedKeywords": ["keyword1", "keyword2"]
  }
]

Focus on questions that demonstrate expertise and build trust.`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 3000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0]?.type === 'text' ? response.content[0].text : '[]';
    const generated = this.extractJSON(content);

    return (Array.isArray(generated) ? generated : []).map((q) => ({
      id: this.generateQuestionId(q.question),
      question: q.question,
      category: q.category || 'general',
      source: 'ai_generated',
      priority: q.priority || 5,
      relatedKeywords: q.relatedKeywords || [],
      metadata: {
        createdAt: new Date(),
      },
    }));
  }

  // ==========================================================================
  // CONTENT GAP ANALYSIS
  // ==========================================================================

  /**
   * Find content gaps vs competitors
   */
  async findContentGaps(
    yourDomain: string,
    yourQuestions: string[],
    competitorInsights: any[]
  ): Promise<ContentGap[]> {
    console.log('[QuestionDiscovery] Analyzing content gaps...');

    const gaps: ContentGap[] = [];

    // Find questions competitors answer that we don't
    for (const competitor of competitorInsights) {
      const competitorQuestions = competitor.questionsCovered || [];

      for (const question of competitorQuestions) {
        // Check if we already answer this
        const alreadyCovered = yourQuestions.some((q) =>
          this.questionsAreSimilar(q, question)
        );

        if (!alreadyCovered) {
          gaps.push({
            type: 'competitor_topic',
            topic: question,
            relatedKeywords: [],
            estimatedSearchVolume: 500, // Would get from actual data
            difficulty: 50,
            competitorsCoveringTopic: [competitor.name],
            priority: 6,
            reasoning: `${competitor.name} covers this topic but we don't`,
          });
        }
      }
    }

    return gaps;
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Deduplicate similar questions
   */
  private deduplicateQuestions(questions: Question[]): Question[] {
    const unique: Question[] = [];
    const seen = new Set<string>();

    for (const question of questions) {
      const normalized = this.normalizeQuestion(question.question);

      if (!seen.has(normalized)) {
        seen.add(normalized);
        unique.push(question);
      }
    }

    return unique;
  }

  /**
   * Normalize question for comparison
   */
  private normalizeQuestion(question: string): string {
    return question
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Check if two questions are similar
   */
  private questionsAreSimilar(q1: string, q2: string): boolean {
    const norm1 = this.normalizeQuestion(q1);
    const norm2 = this.normalizeQuestion(q2);

    // Simple similarity check - would use better algorithm in production
    return norm1 === norm2 || this.calculateSimilarity(norm1, norm2) > 0.8;
  }

  /**
   * Calculate similarity between two strings
   * Simple implementation - would use proper similarity algorithm in production
   */
  private calculateSimilarity(s1: string, s2: string): number {
    const words1 = new Set(s1.split(' '));
    const words2 = new Set(s2.split(' '));

    const intersection = new Set([...words1].filter((w) => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Score and prioritize question
   */
  private scoreQuestion(question: Question, context: BusinessContext): Question {
    let priority = question.priority;

    // Boost priority based on search volume
    if (question.searchVolume) {
      if (question.searchVolume > 5000) priority += 2;
      else if (question.searchVolume > 1000) priority += 1;
    }

    // Boost priority if matches pain points
    const matchesPainPoints = context.profile.targetAudience.painPoints.some((pain) =>
      question.question.toLowerCase().includes(pain.toLowerCase())
    );
    if (matchesPainPoints) priority += 1;

    // Boost priority for PAA questions
    if (question.source === 'paa') priority += 1;

    return {
      ...question,
      priority: Math.min(10, Math.max(1, priority)),
    };
  }

  /**
   * Categorize question by type
   */
  private categorizeQuestion(question: string): string {
    const lower = question.toLowerCase();

    if (lower.startsWith('how to') || lower.startsWith('how do')) return 'how-to';
    if (lower.includes('vs') || lower.includes('versus') || lower.includes('compared')) return 'comparison';
    if (lower.startsWith('what is') || lower.startsWith('what are')) return 'definition';
    if (lower.startsWith('why') || lower.includes('why')) return 'explanation';
    if (lower.includes('best') || lower.includes('top')) return 'buying-guide';
    if (lower.includes('fix') || lower.includes('solve') || lower.includes('problem')) return 'troubleshooting';
    if (lower.startsWith('can') || lower.startsWith('should')) return 'advice';

    return 'general';
  }

  /**
   * Generate unique question ID
   */
  private generateQuestionId(question: string): string {
    const normalized = this.normalizeQuestion(question);
    const hash = this.simpleHash(normalized);
    return `q-${hash}-${Date.now()}`;
  }

  /**
   * Simple hash function
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Estimate traffic potential from search volume
   */
  private estimateTraffic(searchVolume?: number): number | undefined {
    if (!searchVolume) return undefined;

    // Assume 30% CTR for position 1-3
    return Math.round(searchVolume * 0.3);
  }

  /**
   * Extract JSON from response
   */
  private extractJSON(content: string): any {
    try {
      let cleaned = content.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('[QuestionDiscovery] Failed to parse JSON:', error);
      return [];
    }
  }
}

export default QuestionDiscoveryService;
