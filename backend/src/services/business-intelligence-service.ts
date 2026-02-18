/**
 * Business Intelligence Service
 *
 * Analyzes businesses during onboarding to understand their unique characteristics,
 * learn brand voice, generate custom question templates, and analyze competitors.
 *
 * Features:
 * - Product catalog analysis (extract categories, USPs, pricing)
 * - Brand voice learning from example content
 * - Competitor content strategy analysis
 * - Custom question template generation
 * - Industry-specific insights
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import {
  BusinessProfile,
  BusinessContext,
  ProductAnalysis,
  BrandVoiceProfile,
  CompetitorInsights,
  QuestionTemplate,
  Industry,
} from '../types/qa-content.types';

export class BusinessIntelligenceService {
  private anthropic: Anthropic;
  private openai: OpenAI;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  // ==========================================================================
  // MAIN BUSINESS ANALYSIS
  // ==========================================================================

  /**
   * Analyze business context during onboarding
   * Combines product analysis, brand voice, and competitor insights
   */
  async analyzeBusinessContext(
    shopifyDomain: string,
    profile: BusinessProfile,
    products: any[]
  ): Promise<BusinessContext> {
    console.log(`[BusinessIntelligence] Analyzing business: ${shopifyDomain}`);

    // Run analyses in parallel for speed
    const [productInsights, brandVoiceProfile, competitorInsights] = await Promise.all([
      this.analyzeProducts(products, profile.industry),
      this.analyzeBrandVoice(profile.brandVoice.exampleContent),
      this.analyzeCompetitors(profile.contentStrategy.competitorUrls),
    ]);

    // Generate custom question templates based on all insights
    const customTemplates = await this.generateCustomQuestionTemplates({
      profile,
      productInsights,
      brandVoiceProfile,
      competitorInsights,
    });

    return {
      profile,
      productInsights,
      brandVoiceProfile,
      competitorInsights,
      customTemplates,
    };
  }

  // ==========================================================================
  // PRODUCT ANALYSIS
  // ==========================================================================

  /**
   * Analyze product catalog to extract insights
   */
  async analyzeProducts(products: any[], industry: Industry): Promise<ProductAnalysis> {
    console.log(`[BusinessIntelligence] Analyzing ${products.length} products...`);

    const productSummary = products
      .slice(0, 50) // Limit to first 50 to avoid token limits
      .map((p) => ({
        title: p.title,
        description: p.body_html?.substring(0, 200),
        price: p.variants?.[0]?.price,
        productType: p.product_type,
        tags: p.tags,
      }));

    const prompt = `Analyze these products and extract key business insights:

${JSON.stringify(productSummary, null, 2)}

Industry: ${industry}

Provide a detailed analysis in JSON format:
{
  "categories": ["list of product categories"],
  "commonFeatures": ["common features/benefits across products"],
  "pricePoints": {
    "min": number,
    "max": number,
    "average": number
  },
  "targetCustomerInsights": ["insights about target customers"],
  "uniqueSellingPropositions": ["what makes these products unique"]
}

Focus on:
1. Product categories and types
2. Common features, benefits, materials
3. Price range and positioning (budget, mid-range, premium)
4. Who would buy these products (demographics, needs)
5. What makes them unique vs competitors`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0]?.type === 'text' ? response.content[0].text : '{}';
    const analysis = this.extractJSON(content);

    return {
      categories: analysis.categories || [],
      commonFeatures: analysis.commonFeatures || [],
      pricePoints: analysis.pricePoints || { min: 0, max: 0, average: 0 },
      targetCustomerInsights: analysis.targetCustomerInsights || [],
      uniqueSellingPropositions: analysis.uniqueSellingPropositions || [],
    };
  }

  // ==========================================================================
  // BRAND VOICE ANALYSIS
  // ==========================================================================

  /**
   * Learn brand voice from example content
   * Extracts tone, style, vocabulary, sentence structure
   */
  async analyzeBrandVoice(exampleContent: string): Promise<BrandVoiceProfile> {
    console.log('[BusinessIntelligence] Analyzing brand voice...');

    if (!exampleContent || exampleContent.length < 100) {
      return this.getDefaultBrandVoice();
    }

    const prompt = `Analyze this brand's writing style and extract their voice profile:

${exampleContent}

Provide a detailed brand voice analysis in JSON format:
{
  "tone": "professional|casual|technical|friendly|authoritative|conversational",
  "formalityLevel": number (0-10, where 0=very casual, 10=very formal),
  "sentenceStructure": {
    "averageLength": number,
    "complexity": "simple|moderate|complex"
  },
  "vocabularyLevel": "elementary|intermediate|advanced|expert",
  "commonPhrases": ["phrases they use frequently"],
  "personalityTraits": ["helpful", "enthusiastic", "direct", etc.],
  "writingPatterns": ["patterns you notice in their writing style"]
}

Analyze:
1. Overall tone (formal vs casual, technical vs accessible)
2. Formality level (0-10 scale)
3. Sentence structure (average length, complexity)
4. Vocabulary level (elementary to expert)
5. Common phrases or words they use
6. Personality traits that come through
7. Unique writing patterns or style choices`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0]?.type === 'text' ? response.content[0].text : '{}';
    const analysis = this.extractJSON(content);

    return {
      tone: analysis.tone || 'professional',
      formalityLevel: analysis.formalityLevel || 5,
      sentenceStructure: analysis.sentenceStructure || { averageLength: 15, complexity: 'moderate' },
      vocabularyLevel: analysis.vocabularyLevel || 'intermediate',
      commonPhrases: analysis.commonPhrases || [],
      personalityTraits: analysis.personalityTraits || [],
      writingPatterns: analysis.writingPatterns || [],
    };
  }

  // ==========================================================================
  // COMPETITOR ANALYSIS
  // ==========================================================================

  /**
   * Analyze competitor content strategies
   * Scrapes content and identifies gaps/opportunities
   */
  async analyzeCompetitors(competitorUrls: string[]): Promise<CompetitorInsights[]> {
    console.log(`[BusinessIntelligence] Analyzing ${competitorUrls.length} competitors...`);

    const insights = await Promise.all(
      competitorUrls.map((url) => this.analyzeCompetitor(url))
    );

    return insights;
  }

  private async analyzeCompetitor(url: string): Promise<CompetitorInsights> {
    try {
      // Scrape competitor content (simplified - would use proper scraper in production)
      const content = await this.scrapeCompetitorContent(url);

      const prompt = `Analyze this competitor's content strategy:

URL: ${url}
Content: ${content.substring(0, 3000)}

Provide competitive analysis in JSON format:
{
  "name": "competitor name",
  "contentTopics": ["main topics they cover"],
  "questionsCovered": ["questions they answer on their blog/site"],
  "contentGaps": ["topics they DON'T cover that they should"],
  "strengths": ["what they do well"],
  "weaknesses": ["areas where their content is weak"],
  "opportunityAreas": ["opportunities to outperform them"]
}

Focus on:
1. What topics/questions do they cover?
2. What's missing from their content?
3. What do they do well?
4. Where are they weak?
5. How can we outperform them?`;

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const responseContent = response.content[0]?.type === 'text' ? response.content[0].text : '{}';
      const analysis = this.extractJSON(responseContent);

      return {
        url,
        name: analysis.name || this.extractDomainName(url),
        contentTopics: analysis.contentTopics || [],
        questionsCovered: analysis.questionsCovered || [],
        contentGaps: analysis.contentGaps || [],
        strengths: analysis.strengths || [],
        weaknesses: analysis.weaknesses || [],
        opportunityAreas: analysis.opportunityAreas || [],
      };
    } catch (error) {
      console.error(`[BusinessIntelligence] Failed to analyze competitor ${url}:`, error);
      return this.getDefaultCompetitorInsights(url);
    }
  }

  // ==========================================================================
  // CUSTOM QUESTION TEMPLATE GENERATION
  // ==========================================================================

  /**
   * Generate custom question templates for this specific business
   * Based on products, brand voice, industry, and competitor gaps
   */
  async generateCustomQuestionTemplates(context: {
    profile: BusinessProfile;
    productInsights: ProductAnalysis;
    brandVoiceProfile: BrandVoiceProfile;
    competitorInsights: CompetitorInsights[];
  }): Promise<QuestionTemplate[]> {
    console.log('[BusinessIntelligence] Generating custom question templates...');

    const { profile, productInsights, competitorInsights } = context;

    const competitorGaps = competitorInsights.flatMap((c) => c.contentGaps);

    const prompt = `Generate 50 custom question templates for this business:

Business Profile:
- Industry: ${profile.industry}
- Product Categories: ${productInsights.categories.join(', ')}
- Target Audience: ${profile.targetAudience.demographics}
- Expertise Level: ${profile.targetAudience.expertiseLevel}
- Pain Points: ${profile.targetAudience.painPoints.join(', ')}
- Primary Goal: ${profile.contentStrategy.primaryGoal}

Competitor Content Gaps:
${competitorGaps.join('\n')}

Generate question templates that:
1. Are specific to their products and industry
2. Address their audience's pain points
3. Match their target expertise level
4. Fill gaps competitors aren't covering
5. Support their primary goal (${profile.contentStrategy.primaryGoal})

Format as JSON array:
[
  {
    "template": "How to {action} with {product_category} for {use_case}",
    "category": "how-to",
    "variables": ["action", "product_category", "use_case"],
    "priority": 8,
    "examples": ["How to choose coffee beans for home brewing"]
  }
]

Include templates for:
- How-to questions
- Comparison questions
- Troubleshooting questions
- Best practices
- Buying guides
- Use case questions
- Feature explanations

Make them SPECIFIC to this business, not generic.`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0]?.type === 'text' ? response.content[0].text : '[]';
    const templates = this.extractJSON(content);

    return (Array.isArray(templates) ? templates : []).map((t, index) => ({
      id: `${profile.industry}-${Date.now()}-${index}`,
      template: t.template,
      category: t.category,
      variables: t.variables || [],
      priority: t.priority || 5,
      usageCount: 0,
      industry: profile.industry,
      examples: t.examples || [],
    }));
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Scrape competitor website content
   * Simplified version - would use proper scraping in production
   */
  private async scrapeCompetitorContent(url: string): Promise<string> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SEOBot/1.0)',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();

      // Extract text content (simplified - would use cheerio or similar)
      const text = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      return text.substring(0, 5000); // Limit to avoid token issues
    } catch (error) {
      console.error(`[BusinessIntelligence] Failed to scrape ${url}:`, error);
      return '';
    }
  }

  /**
   * Extract JSON from Claude response
   * Handles cases where Claude wraps JSON in markdown code blocks
   */
  private extractJSON(content: string): any {
    try {
      // Remove markdown code blocks if present
      let cleaned = content.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      return JSON.parse(cleaned);
    } catch (error) {
      console.error('[BusinessIntelligence] Failed to parse JSON:', error);
      return {};
    }
  }

  /**
   * Extract domain name from URL
   */
  private extractDomainName(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url;
    }
  }

  /**
   * Get default brand voice profile when no example content provided
   */
  private getDefaultBrandVoice(): BrandVoiceProfile {
    return {
      tone: 'professional',
      formalityLevel: 6,
      sentenceStructure: {
        averageLength: 18,
        complexity: 'moderate',
      },
      vocabularyLevel: 'intermediate',
      commonPhrases: [],
      personalityTraits: ['helpful', 'clear', 'informative'],
      writingPatterns: ['structured', 'educational'],
    };
  }

  /**
   * Get default competitor insights when analysis fails
   */
  private getDefaultCompetitorInsights(url: string): CompetitorInsights {
    return {
      url,
      name: this.extractDomainName(url),
      contentTopics: [],
      questionsCovered: [],
      contentGaps: [],
      strengths: [],
      weaknesses: [],
      opportunityAreas: [],
    };
  }
}

export default BusinessIntelligenceService;
