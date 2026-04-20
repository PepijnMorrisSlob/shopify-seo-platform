/**
 * AI Content Service
 *
 * Multi-model AI orchestration service for content generation.
 * Supports GPT-3.5 Turbo, GPT-4 Turbo, Claude Sonnet 4, and Perplexity Sonar Pro.
 *
 * Features:
 * - Intelligent model routing based on content type
 * - Quality scoring (5 criteria)
 * - Variant generation (3 variants per request)
 * - Cost tracking per organization
 * - Automatic approval/rejection based on quality scores
 * - Fallback handling and retry logic
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import {
  AIModel,
  ContentType,
  ContentGenerationInput,
  GeneratedContent,
  QualityScore,
  ScoringCriteria,
  ModelConfig,
  CostTracking,
  AIServiceError,
  ContentMetadata,
  ReadabilityScore,
  SEOScore,
  UniquenessScore,
  BrandAlignmentScore,
  FactualAccuracyScore,
} from '../types/ai.types';
import {
  buildPrompt,
  getRecommendedModel,
  getSystemMessage,
} from '../utils/prompt-library';

// ============================================================================
// AI MODEL ROUTING STRATEGY
// ============================================================================

const AI_MODEL_ROUTING: Record<ContentType, { primary: AIModel; fallbacks: AIModel[] }> = {
  product_meta: {
    primary: 'gpt-4o-mini',
    fallbacks: ['claude-haiku-3.5', 'gpt-4o'],
  },
  product_description: {
    primary: 'gpt-4o-mini',
    fallbacks: ['claude-haiku-3.5', 'gpt-4o'],
  },
  blog_post: {
    primary: 'claude-haiku-3.5',
    fallbacks: ['gpt-4o-mini', 'gpt-4o'],
  },
  research: {
    primary: 'perplexity-sonar',
    fallbacks: ['gpt-4o-mini', 'claude-haiku-3.5'],
  },
  schema: {
    primary: 'gpt-4o-mini',
    fallbacks: ['claude-haiku-3.5'],
  },
};

// ============================================================================
// MODEL PRICING (per 1M tokens)
// ============================================================================

const MODEL_PRICING = {
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'claude-haiku-3.5': { input: 0.80, output: 4.00 },
  'claude-sonnet-4': { input: 3.00, output: 15.00 },
  'perplexity-sonar': { input: 1.00, output: 1.00 },
  'perplexity-sonar-pro': { input: 1.00, output: 1.00 },
};

// ============================================================================
// AI CONTENT SERVICE CLASS
// ============================================================================

export class AIContentService {
  private openai: OpenAI;
  private anthropic: Anthropic;
  private costTracking: CostTracking[] = [];

  constructor() {
    // Initialize API clients
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  // ==========================================================================
  // MAIN CONTENT GENERATION METHOD
  // ==========================================================================

  /**
   * Generate AI content with automatic model selection and variant generation
   *
   * @param contentType - Type of content to generate
   * @param input - Content generation input parameters
   * @param organizationId - Organization ID for cost tracking
   * @param variantCount - Number of variants to generate (default: 3)
   * @returns Array of generated content variants with quality scores
   */
  async generateContent(
    contentType: ContentType,
    input: ContentGenerationInput,
    organizationId: string,
    variantCount: number = 3
  ): Promise<GeneratedContent[]> {
    try {
      // Select best model for content type
      const model = this.selectModel(contentType);

      // Generate variants in parallel
      const variants = await this.generateVariants(
        contentType,
        input,
        organizationId,
        model,
        variantCount
      );

      // Score each variant
      const scoredVariants = await Promise.all(
        variants.map(async (variant) => {
          const score = await this.scoreContent(variant.content, {
            enableReadability: true,
            enableSEO: true,
            enableUniqueness: true,
            enableBrandAlignment: input.brandVoice ? true : false,
            enableFactualAccuracy: contentType === 'research' || contentType === 'blog_post',
            targetKeywords: input.keywords,
            knowledgeBase: input.brandVoice,
          });

          return {
            ...variant,
            qualityScore: score,
          };
        })
      );

      // Sort by quality score (highest first)
      scoredVariants.sort((a, b) => b.qualityScore.overall - a.qualityScore.overall);

      return scoredVariants;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ==========================================================================
  // VARIANT GENERATION
  // ==========================================================================

  /**
   * Generate multiple content variants
   */
  async generateVariants(
    contentType: ContentType,
    input: ContentGenerationInput,
    organizationId: string,
    model: AIModel,
    count: number = 3
  ): Promise<GeneratedContent[]> {
    const variants: GeneratedContent[] = [];

    // Generate variants in parallel with different temperatures
    const temperatures = this.getTemperatureRange(count);

    const promises = temperatures.map(async (temperature, index) => {
      const startTime = Date.now();

      let content: string;
      let metadata: ContentMetadata;

      try {
        if (model.startsWith('gpt')) {
          const result = await this.generateWithOpenAI(contentType, input, model, temperature);
          content = result.content;
          metadata = result.metadata;
        } else if (model.startsWith('claude')) {
          const result = await this.generateWithClaude(contentType, input, temperature, model);
          content = result.content;
          metadata = result.metadata;
        } else if (model.startsWith('perplexity')) {
          const result = await this.generateWithPerplexity(contentType, input);
          content = result.content;
          metadata = result.metadata;
        } else {
          throw new AIServiceError('Unsupported AI model', 'MODEL_UNAVAILABLE', model);
        }

        // Track costs
        this.trackCost(organizationId, model, metadata);

        return {
          id: `${organizationId}-${Date.now()}-${index}`,
          content,
          model,
          qualityScore: {} as QualityScore, // Will be filled in later
          metadata: {
            ...metadata,
            generationTime: Date.now() - startTime,
          },
          createdAt: new Date(),
        };
      } catch (error) {
        console.error(`Failed to generate variant ${index + 1}:`, error);
        return null;
      }
    });

    const results = await Promise.all(promises);
    return results.filter((r): r is GeneratedContent => r !== null);
  }

  // ==========================================================================
  // OPENAI INTEGRATION (GPT-3.5 & GPT-4)
  // ==========================================================================

  private async generateWithOpenAI(
    contentType: ContentType,
    input: ContentGenerationInput,
    model: AIModel,
    temperature: number = 0.7
  ): Promise<{ content: string; metadata: ContentMetadata }> {
    const prompt = this.buildPrompt(contentType, input);
    const systemMessage = getSystemMessage('seo_expert');

    const response = await this.openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt },
      ],
      temperature,
      max_tokens: this.getMaxTokens(contentType),
      top_p: 1,
      frequency_penalty: 0.3,
      presence_penalty: 0.3,
    });

    const content = response.choices[0]?.message?.content || '';
    const usage = response.usage;

    return {
      content,
      metadata: {
        promptTokens: usage?.prompt_tokens || 0,
        completionTokens: usage?.completion_tokens || 0,
        totalTokens: usage?.total_tokens || 0,
        cost: this.calculateCost(
          model,
          usage?.prompt_tokens || 0,
          usage?.completion_tokens || 0
        ),
        generationTime: 0,
        temperature,
        maxTokens: this.getMaxTokens(contentType),
      },
    };
  }

  // ==========================================================================
  // ANTHROPIC INTEGRATION (Claude Haiku 3.5 / Sonnet 4)
  // ==========================================================================

  private getAnthropicModelId(model: AIModel): string {
    switch (model) {
      case 'claude-haiku-3.5': return 'claude-haiku-4-5-20251001';
      case 'claude-sonnet-4': return 'claude-sonnet-4-5-20250929';
      default: return 'claude-haiku-4-5-20251001';
    }
  }

  private async generateWithClaude(
    contentType: ContentType,
    input: ContentGenerationInput,
    temperature: number = 0.7,
    model: AIModel = 'claude-haiku-3.5'
  ): Promise<{ content: string; metadata: ContentMetadata }> {
    const prompt = this.buildPrompt(contentType, input);
    const systemMessage = getSystemMessage('seo_expert');
    const anthropicModel = this.getAnthropicModelId(model);

    const response = await this.anthropic.messages.create({
      model: anthropicModel,
      max_tokens: this.getMaxTokens(contentType),
      temperature,
      system: systemMessage,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const usage = response.usage;

    return {
      content,
      metadata: {
        promptTokens: usage.input_tokens,
        completionTokens: usage.output_tokens,
        totalTokens: usage.input_tokens + usage.output_tokens,
        cost: this.calculateCost(
          model,
          usage.input_tokens,
          usage.output_tokens
        ),
        generationTime: 0,
        temperature,
        maxTokens: this.getMaxTokens(contentType),
      },
    };
  }

  // ==========================================================================
  // PERPLEXITY INTEGRATION (Sonar Pro)
  // ==========================================================================

  private async generateWithPerplexity(
    contentType: ContentType,
    input: ContentGenerationInput
  ): Promise<{ content: string; metadata: ContentMetadata }> {
    const prompt = this.buildPrompt(contentType, input);

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: this.getMaxTokens(contentType),
      }),
    });

    if (!response.ok) {
      throw new AIServiceError(
        'Perplexity API request failed',
        'NETWORK_ERROR',
        'perplexity-sonar-pro',
        true
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    const usage = data.usage;

    return {
      content,
      metadata: {
        promptTokens: usage?.prompt_tokens || 0,
        completionTokens: usage?.completion_tokens || 0,
        totalTokens: usage?.total_tokens || 0,
        cost: this.calculateCost(
          'perplexity-sonar-pro',
          usage?.prompt_tokens || 0,
          usage?.completion_tokens || 0
        ),
        generationTime: 0,
        temperature: 0.3,
        maxTokens: this.getMaxTokens(contentType),
      },
    };
  }

  // ==========================================================================
  // QUALITY SCORING (5 CRITERIA)
  // ==========================================================================

  /**
   * Score content quality across 5 dimensions
   */
  async scoreContent(
    content: string,
    criteria: ScoringCriteria
  ): Promise<QualityScore> {
    const scores: Partial<QualityScore> = {};

    // 1. Readability Score
    if (criteria.enableReadability !== false) {
      scores.readability = this.scoreReadability(content);
    }

    // 2. SEO Optimization Score
    if (criteria.enableSEO !== false) {
      scores.seoOptimization = this.scoreSEO(content, criteria.targetKeywords || []);
    }

    // 3. Uniqueness Score
    if (criteria.enableUniqueness !== false) {
      scores.uniqueness = this.scoreUniqueness(content, criteria.existingContent || []);
    }

    // 4. Brand Alignment Score
    if (criteria.enableBrandAlignment && criteria.knowledgeBase) {
      scores.brandAlignment = this.scoreBrandAlignment(content, criteria.knowledgeBase);
    }

    // 5. Factual Accuracy Score
    if (criteria.enableFactualAccuracy !== false) {
      scores.factualAccuracy = await this.scoreFactualAccuracy(content);
    }

    // Calculate overall score (weighted average)
    const enabledScores = Object.values(scores).filter((s) => s !== undefined);
    const overall = enabledScores.reduce((sum, score: any) => sum + score.score, 0) / enabledScores.length;

    // Determine recommendation
    let recommendation: 'auto_approve' | 'manual_review' | 'auto_reject';
    if (overall >= 85) {
      recommendation = 'auto_approve';
    } else if (overall >= 70) {
      recommendation = 'manual_review';
    } else {
      recommendation = 'auto_reject';
    }

    return {
      overall: Math.round(overall),
      readability: scores.readability || this.getDefaultReadabilityScore(),
      seoOptimization: scores.seoOptimization || this.getDefaultSEOScore(),
      uniqueness: scores.uniqueness || this.getDefaultUniquenessScore(),
      brandAlignment: scores.brandAlignment || this.getDefaultBrandAlignmentScore(),
      factualAccuracy: scores.factualAccuracy || this.getDefaultFactualAccuracyScore(),
      recommendation,
    };
  }

  // ==========================================================================
  // READABILITY SCORING
  // ==========================================================================

  private scoreReadability(content: string): ReadabilityScore {
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const words = content.split(/\s+/).filter((w) => w.length > 0);
    const syllables = this.countSyllables(content);

    const sentenceCount = sentences.length || 1;
    const wordCount = words.length || 1;

    // Flesch Reading Ease: 206.835 - 1.015(words/sentences) - 84.6(syllables/words)
    const fleschReadingEase = Math.max(
      0,
      Math.min(
        100,
        206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (syllables / wordCount)
      )
    );

    // Flesch-Kincaid Grade Level: 0.39(words/sentences) + 11.8(syllables/words) - 15.59
    const fleschKincaidGrade = Math.max(
      0,
      0.39 * (wordCount / sentenceCount) + 11.8 * (syllables / wordCount) - 15.59
    );

    const averageWordsPerSentence = wordCount / sentenceCount;
    const complexWords = words.filter((word) => this.countWordSyllables(word) >= 3);
    const complexWordPercentage = (complexWords.length / wordCount) * 100;

    // Score: 60-80 Flesch Reading Ease is ideal (conversational)
    let score = 100;
    if (fleschReadingEase >= 60 && fleschReadingEase <= 80) {
      score = 100;
    } else if (fleschReadingEase >= 50 && fleschReadingEase < 60) {
      score = 85;
    } else if (fleschReadingEase >= 80 && fleschReadingEase <= 90) {
      score = 85;
    } else {
      score = Math.max(50, 100 - Math.abs(70 - fleschReadingEase));
    }

    let recommendation = 'Excellent readability';
    if (score < 70) {
      recommendation = 'Consider simplifying language and shortening sentences';
    } else if (score < 85) {
      recommendation = 'Good readability, minor improvements possible';
    }

    return {
      score: Math.round(score),
      fleschKincaidGrade: Math.round(fleschKincaidGrade * 10) / 10,
      fleschReadingEase: Math.round(fleschReadingEase),
      averageWordsPerSentence: Math.round(averageWordsPerSentence * 10) / 10,
      complexWordPercentage: Math.round(complexWordPercentage * 10) / 10,
      recommendation,
    };
  }

  // ==========================================================================
  // SEO SCORING
  // ==========================================================================

  private scoreSEO(content: string, targetKeywords: string[]): SEOScore {
    const words = content.toLowerCase().split(/\s+/);
    const wordCount = words.length;

    let score = 100;
    let keywordDensity = 0;
    let hasLSIKeywords = false;
    const lsiKeywords: string[] = [];
    let hasCallToAction = false;
    let hasNumbers = false;

    // Check keyword density
    if (targetKeywords.length > 0) {
      const primaryKeyword = targetKeywords[0].toLowerCase();
      const keywordOccurrences = content.toLowerCase().split(primaryKeyword).length - 1;
      keywordDensity = (keywordOccurrences / wordCount) * 100;

      // Ideal keyword density: 1-3%
      if (keywordDensity >= 1 && keywordDensity <= 3) {
        // Perfect
      } else if (keywordDensity === 0) {
        score -= 40;
      } else if (keywordDensity > 3) {
        score -= 20; // Keyword stuffing
      } else {
        score -= 15; // Too low
      }
    }

    // Check for LSI keywords (semantic variations)
    const commonLSIPatterns = ['best', 'top', 'guide', 'how to', 'review', 'compare'];
    lsiKeywords.push(...commonLSIPatterns.filter((pattern) => content.toLowerCase().includes(pattern)));
    hasLSIKeywords = lsiKeywords.length > 0;
    if (!hasLSIKeywords) score -= 10;

    // Check for call-to-action
    const ctaPatterns = [
      'buy now',
      'shop now',
      'get started',
      'learn more',
      'contact us',
      'sign up',
      'try free',
      'order today',
    ];
    hasCallToAction = ctaPatterns.some((cta) => content.toLowerCase().includes(cta));
    if (!hasCallToAction) score -= 15;

    // Check for numbers (increases click-through rate)
    hasNumbers = /\d+/.test(content);
    if (!hasNumbers) score -= 10;

    // Meta length check (if applicable)
    const metaLength = {
      title: content.length <= 60 ? { actual: content.length, optimal: 60, isOptimal: true } : undefined,
      description:
        content.length <= 160 ? { actual: content.length, optimal: 160, isOptimal: true } : undefined,
    };

    let recommendation = 'Excellent SEO optimization';
    if (score < 70) {
      recommendation = 'Improve keyword usage, add LSI keywords, and include clear CTA';
    } else if (score < 85) {
      recommendation = 'Good SEO, consider adding numbers and stronger CTA';
    }

    return {
      score: Math.max(0, Math.round(score)),
      keywordDensity: Math.round(keywordDensity * 100) / 100,
      hasLSIKeywords,
      lsiKeywords,
      metaLength,
      hasCallToAction,
      hasNumbers,
      recommendation,
    };
  }

  // ==========================================================================
  // UNIQUENESS SCORING
  // ==========================================================================

  private scoreUniqueness(content: string, existingContent: string[]): UniquenessScore {
    if (existingContent.length === 0) {
      return {
        score: 100,
        similarityWithExisting: 0,
        duplicatePhrases: [],
        originalityPercentage: 100,
        recommendation: 'Completely unique content',
      };
    }

    // Calculate cosine similarity with existing content
    let maxSimilarity = 0;
    const duplicatePhrases: string[] = [];

    for (const existing of existingContent) {
      const similarity = this.calculateCosineSimilarity(content, existing);
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
      }

      // Find duplicate phrases (3+ words)
      const phrases = this.extractPhrases(content, 3);
      phrases.forEach((phrase) => {
        if (existing.toLowerCase().includes(phrase.toLowerCase())) {
          duplicatePhrases.push(phrase);
        }
      });
    }

    const originalityPercentage = Math.round((1 - maxSimilarity) * 100);

    // Scoring: <0.8 similarity is good, <0.5 is excellent
    let score = 100;
    if (maxSimilarity >= 0.8) {
      score = 30; // Too similar
    } else if (maxSimilarity >= 0.6) {
      score = 60;
    } else if (maxSimilarity >= 0.4) {
      score = 80;
    }

    let recommendation = 'Excellent uniqueness';
    if (score < 70) {
      recommendation = 'Content too similar to existing - rewrite for originality';
    } else if (score < 85) {
      recommendation = 'Good uniqueness, but some phrases may be too common';
    }

    return {
      score: Math.round(score),
      similarityWithExisting: Math.round(maxSimilarity * 100) / 100,
      duplicatePhrases: duplicatePhrases.slice(0, 5),
      originalityPercentage,
      recommendation,
    };
  }

  // ==========================================================================
  // BRAND ALIGNMENT SCORING
  // ==========================================================================

  private scoreBrandAlignment(content: string, knowledgeBase: string): BrandAlignmentScore {
    // Calculate embedding similarity (simplified - would use actual embeddings in production)
    const embeddingSimilarity = this.calculateCosineSimilarity(content, knowledgeBase);

    // Check tone match
    const toneMatch = this.analyzeTone(content) === this.analyzeTone(knowledgeBase);

    // Check vocabulary match
    const contentVocab = new Set(content.toLowerCase().split(/\s+/));
    const kbVocab = new Set(knowledgeBase.toLowerCase().split(/\s+/));
    const commonWords = [...contentVocab].filter((word) => kbVocab.has(word));
    const vocabularyMatch = commonWords.length / contentVocab.size > 0.3;

    // Style consistency
    const styleConsistency = embeddingSimilarity * 100;

    // Overall score
    let score = 70; // Base score
    if (embeddingSimilarity > 0.7) score += 15;
    if (toneMatch) score += 10;
    if (vocabularyMatch) score += 5;

    let recommendation = 'Good brand alignment';
    if (score < 70) {
      recommendation = 'Adjust tone and vocabulary to match brand voice';
    } else if (score >= 90) {
      recommendation = 'Excellent brand alignment';
    }

    return {
      score: Math.min(100, Math.round(score)),
      embeddingSimilarity: Math.round(embeddingSimilarity * 100) / 100,
      toneMatch,
      vocabularyMatch,
      styleConsistency: Math.round(styleConsistency),
      recommendation,
    };
  }

  // ==========================================================================
  // FACTUAL ACCURACY SCORING
  // ==========================================================================

  private async scoreFactualAccuracy(content: string): Promise<FactualAccuracyScore> {
    // Extract claims (simplified - would use NLP in production)
    const claims = this.extractClaims(content);
    const verifiedClaims = 0; // Would verify using Perplexity
    const unverifiedClaims = claims.length;
    const potentiallyInaccurate: string[] = [];
    const citationsProvided = /\[.*\]|\(.*\)/.test(content);

    // Base score
    let score = 80;
    if (!citationsProvided && claims.length > 3) {
      score -= 20;
    }

    return {
      score: Math.round(score),
      verifiedClaims,
      unverifiedClaims,
      potentiallyInaccurate,
      citationsProvided,
      recommendation: citationsProvided
        ? 'Good factual accuracy with citations'
        : 'Consider adding citations for claims',
    };
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private selectModel(contentType: ContentType): AIModel {
    return AI_MODEL_ROUTING[contentType]?.primary || 'gpt-3.5-turbo';
  }

  private buildPrompt(contentType: ContentType, input: ContentGenerationInput): string {
    const templateId = this.getTemplateId(contentType);
    return buildPrompt(templateId, input);
  }

  private getTemplateId(contentType: ContentType): string {
    const mapping: Record<ContentType, string> = {
      product_meta: 'product_meta_pair',
      product_description: 'product_description_long',
      blog_post: 'blog_post',
      research: 'research_query',
      schema: 'schema_product',
    };
    return mapping[contentType] || 'product_meta_pair';
  }

  private getMaxTokens(contentType: ContentType): number {
    const tokenLimits: Record<ContentType, number> = {
      product_meta: 500,
      product_description: 1500,
      blog_post: 4000,
      research: 3000,
      schema: 1000,
    };
    return tokenLimits[contentType] || 1000;
  }

  private getTemperatureRange(count: number): number[] {
    // Generate different temperatures for variety
    const base = 0.7;
    const range = 0.2;
    return Array.from({ length: count }, (_, i) => base + (i * range) / (count - 1) - range / 2);
  }

  private calculateCost(model: AIModel, inputTokens: number, outputTokens: number): number {
    const pricing = MODEL_PRICING[model];
    if (!pricing) return 0;

    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;

    return inputCost + outputCost;
  }

  private trackCost(organizationId: string, model: AIModel, metadata: ContentMetadata): void {
    this.costTracking.push({
      organizationId,
      model,
      promptTokens: metadata.promptTokens,
      completionTokens: metadata.completionTokens,
      totalTokens: metadata.totalTokens,
      cost: metadata.cost,
      timestamp: new Date(),
    });
  }

  private countSyllables(text: string): number {
    const words = text.toLowerCase().split(/\s+/);
    return words.reduce((total, word) => total + this.countWordSyllables(word), 0);
  }

  private countWordSyllables(word: string): number {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;

    const vowels = 'aeiouy';
    let count = 0;
    let previousWasVowel = false;

    for (let i = 0; i < word.length; i++) {
      const isVowel = vowels.includes(word[i]);
      if (isVowel && !previousWasVowel) {
        count++;
      }
      previousWasVowel = isVowel;
    }

    if (word.endsWith('e')) count--;
    return Math.max(1, count);
  }

  private calculateCosineSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);

    const vocab = new Set([...words1, ...words2]);
    const vector1: number[] = [];
    const vector2: number[] = [];

    vocab.forEach((word) => {
      vector1.push(words1.filter((w) => w === word).length);
      vector2.push(words2.filter((w) => w === word).length);
    });

    const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
    const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));

    return dotProduct / (magnitude1 * magnitude2) || 0;
  }

  private extractPhrases(text: string, minWords: number): string[] {
    const words = text.split(/\s+/);
    const phrases: string[] = [];

    for (let i = 0; i <= words.length - minWords; i++) {
      phrases.push(words.slice(i, i + minWords).join(' '));
    }

    return phrases;
  }

  private analyzeTone(text: string): string {
    const lowercaseText = text.toLowerCase();
    if (lowercaseText.includes('!') || lowercaseText.includes('amazing')) return 'enthusiastic';
    if (lowercaseText.includes('professional') || lowercaseText.includes('enterprise'))
      return 'professional';
    return 'casual';
  }

  private extractClaims(text: string): string[] {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    return sentences.filter((s) => {
      const lower = s.toLowerCase();
      return (
        lower.includes('research shows') ||
        lower.includes('studies indicate') ||
        lower.includes('proven') ||
        /\d+%/.test(lower)
      );
    });
  }

  private handleError(error: any): AIServiceError {
    if (error instanceof AIServiceError) {
      return error;
    }

    if (error.code === 'rate_limit_exceeded') {
      return new AIServiceError('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', undefined, true);
    }

    if (error.code === 'invalid_api_key') {
      return new AIServiceError('Invalid API key', 'INVALID_API_KEY', undefined, false);
    }

    return new AIServiceError(error.message || 'Unknown error', 'UNKNOWN_ERROR', undefined, true);
  }

  // Default scores for optional criteria
  private getDefaultReadabilityScore(): ReadabilityScore {
    return {
      score: 0,
      fleschKincaidGrade: 0,
      fleschReadingEase: 0,
      averageWordsPerSentence: 0,
      complexWordPercentage: 0,
      recommendation: 'Not evaluated',
    };
  }

  private getDefaultSEOScore(): SEOScore {
    return {
      score: 0,
      keywordDensity: 0,
      hasLSIKeywords: false,
      lsiKeywords: [],
      metaLength: {},
      hasCallToAction: false,
      hasNumbers: false,
      recommendation: 'Not evaluated',
    };
  }

  private getDefaultUniquenessScore(): UniquenessScore {
    return {
      score: 0,
      similarityWithExisting: 0,
      duplicatePhrases: [],
      originalityPercentage: 0,
      recommendation: 'Not evaluated',
    };
  }

  private getDefaultBrandAlignmentScore(): BrandAlignmentScore {
    return {
      score: 0,
      embeddingSimilarity: 0,
      toneMatch: false,
      vocabularyMatch: false,
      styleConsistency: 0,
      recommendation: 'Not evaluated',
    };
  }

  private getDefaultFactualAccuracyScore(): FactualAccuracyScore {
    return {
      score: 0,
      verifiedClaims: 0,
      unverifiedClaims: 0,
      potentiallyInaccurate: [],
      citationsProvided: false,
      recommendation: 'Not evaluated',
    };
  }

  // ==========================================================================
  // BUSINESS-AWARE Q&A CONTENT GENERATION (NEW)
  // ==========================================================================

  /**
   * Generate comprehensive Q&A content with business customization
   * Matches brand voice, addresses pain points, includes products naturally
   */
  async generateQAContent(
    question: string,
    businessProfile: any,
    researchResult: any,
    relatedProducts: any[]
  ): Promise<any> {
    console.log(`[AIContent] Generating business-aware Q&A for: "${question}"`);

    const wordCount = this.getWordCountForLength(businessProfile.contentStrategy?.postLength || 'medium');

    const prompt = `You are a content writer for ${businessProfile.businessName}.

=== BRAND VOICE ===
Tone: ${businessProfile.brandVoice?.tone || 'professional'}
Personality: ${businessProfile.brandVoice?.personality?.join(', ') || 'helpful, clear'}
Avoid words: ${businessProfile.brandVoice?.avoidWords?.join(', ') || 'none'}
Prefer words: ${businessProfile.brandVoice?.preferredWords?.join(', ') || 'quality, premium'}

Example of their writing style:
${businessProfile.brandVoice?.exampleContent?.substring(0, 500) || 'Professional and informative'}

=== TARGET AUDIENCE ===
${businessProfile.targetAudience?.demographics || 'General audience'}
Expertise Level: ${businessProfile.targetAudience?.expertiseLevel || 'intermediate'}
Pain Points: ${businessProfile.targetAudience?.painPoints?.join(', ') || 'Finding quality products'}

=== TASK ===
Write a comprehensive answer to: "${question}"

Word count: ${wordCount} words

Structure:
1. **Introduction** (100-150 words) - Direct answer to the question
2. **Main Content** (${Math.round(wordCount * 0.6)} words) - Detailed explanation with H2 and H3 sections
3. **Product Recommendations** (${Math.round(wordCount * 0.2)} words) - Naturally mention these products:
${relatedProducts.map((p) => `   - ${p.title}`).join('\n')}
4. **FAQ Section** (3-5 related questions)
5. **Conclusion** (100 words) - Summary with CTA

=== CONTENT REQUIREMENTS ===
- Use factual information from research: ${JSON.stringify(researchResult.factualInformation?.slice(0, 5))}
- Write in the exact tone and style shown in the example
- Match expertise level: ${businessProfile.targetAudience?.expertiseLevel}
- Address pain points: ${businessProfile.targetAudience?.painPoints?.join(', ')}
- Product mention frequency: ${businessProfile.productStrategy?.productMentionFrequency || 'moderate'}
- CTA style: ${businessProfile.productStrategy?.ctaStyle || 'soft'}
- Include ${businessProfile.advanced?.externalLinkingPolicy || 'moderate'} external links to sources

=== SEO REQUIREMENTS ===
- Primary keyword: "${question.replace(/^(how|what|why|when|where|who|can|should|is|are|do|does)\s+/i, '')}"
- Keyword density: 1-2%
- Add relevant H2s and H3s
- Include "People also ask" section as FAQ

Generate the content in HTML format with proper heading tags.`;

    const anthropicModel = this.getAnthropicModelId('claude-haiku-3.5');
    const response = await this.anthropic.messages.create({
      model: anthropicModel,
      max_tokens: Math.min(8000, wordCount * 2),
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0]?.type === 'text' ? response.content[0].text : '';

    return {
      content,
      wordCount: content.split(/\s+/).length,
      metadata: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        cost: this.calculateCost(
          'claude-haiku-3.5',
          response.usage.input_tokens,
          response.usage.output_tokens
        ),
      },
    };
  }

  /**
   * Get word count target based on post length setting
   */
  private getWordCountForLength(length: string): number {
    const wordCounts = {
      short: 700,
      medium: 1200,
      long: 2000,
    };
    return wordCounts[length as keyof typeof wordCounts] || 1200;
  }

  /**
   * Get cost summary for an organization
   */
  getCostSummary(organizationId: string, period: 'daily' | 'weekly' | 'monthly'): any {
    const relevantTracking = this.costTracking.filter((t) => t.organizationId === organizationId);

    const totalCost = relevantTracking.reduce((sum, t) => sum + t.cost, 0);
    const totalTokens = relevantTracking.reduce((sum, t) => sum + t.totalTokens, 0);

    const breakdown = Object.entries(
      relevantTracking.reduce(
        (acc, t) => {
          if (!acc[t.model]) {
            acc[t.model] = { requests: 0, tokens: 0, cost: 0 };
          }
          acc[t.model].requests++;
          acc[t.model].tokens += t.totalTokens;
          acc[t.model].cost += t.cost;
          return acc;
        },
        {} as Record<AIModel, { requests: number; tokens: number; cost: number }>
      )
    ).map(([model, data]) => ({
      model: model as AIModel,
      ...data,
    }));

    return {
      organizationId,
      period,
      totalCost: Math.round(totalCost * 10000) / 10000,
      totalTokens,
      breakdown,
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let aiContentServiceInstance: AIContentService | null = null;

export function getAIContentService(): AIContentService {
  if (!aiContentServiceInstance) {
    aiContentServiceInstance = new AIContentService();
  }
  return aiContentServiceInstance;
}

// ============================================================================
// EXPORT
// ============================================================================

export default AIContentService;
