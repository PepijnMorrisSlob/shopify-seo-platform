/**
 * Prompt Engineering Library
 *
 * Pre-engineered prompts for various content types optimized for
 * different AI models (GPT-3.5, GPT-4, Claude Sonnet 4, Perplexity).
 */

import { PromptTemplate, ContentType, AIModel } from '../types/ai.types';

// ============================================================================
// PROMPT TEMPLATES
// ============================================================================

export const PROMPT_TEMPLATES: Record<string, PromptTemplate> = {
  // PRODUCT META TITLE
  product_meta_title: {
    id: 'product_meta_title',
    name: 'Product Meta Title Generator',
    contentType: 'product_meta',
    template: `Generate 3 SEO-optimized meta titles for an e-commerce product.

Product Information:
- Title: {productTitle}
- Type: {productType}
- Keywords: {keywords}
- Brand Voice: {brandVoice}

Requirements:
- Length: 50-60 characters (optimal for Google)
- Include primary keyword naturally
- Use power words (Free, New, Best, Premium, etc.)
- Include numbers if applicable
- Front-load important keywords
- Create urgency or curiosity when appropriate

Format: Return 3 variants as JSON array:
[
  "Meta Title 1",
  "Meta Title 2",
  "Meta Title 3"
]`,
    variables: ['productTitle', 'productType', 'keywords', 'brandVoice'],
    temperature: 0.7,
    maxTokens: 300,
    bestModel: 'gpt-3.5-turbo',
    examples: [
      {
        input: 'Wireless Bluetooth Headphones, Electronics, ["wireless headphones", "bluetooth headphones"], Professional',
        output: '["Premium Wireless Bluetooth Headphones - Free Shipping", "Best Bluetooth Headphones 2026 | Wireless & Noise Cancelling", "Wireless Bluetooth Headphones - Premium Sound Quality"]',
      },
    ],
  },

  // PRODUCT META DESCRIPTION
  product_meta_description: {
    id: 'product_meta_description',
    name: 'Product Meta Description Generator',
    contentType: 'product_meta',
    template: `Generate 3 compelling meta descriptions for an e-commerce product.

Product Information:
- Title: {productTitle}
- Description: {productDescription}
- Type: {productType}
- Keywords: {keywords}
- Target Audience: {targetAudience}

Requirements:
- Length: 150-160 characters (optimal for Google)
- Include primary keyword naturally
- Include call-to-action (Shop Now, Buy Today, Get Yours, etc.)
- Highlight unique value proposition
- Create urgency or benefit-driven copy
- Use active voice

Format: Return 3 variants as JSON array:
[
  "Meta Description 1",
  "Meta Description 2",
  "Meta Description 3"
]`,
    variables: ['productTitle', 'productDescription', 'productType', 'keywords', 'targetAudience'],
    temperature: 0.8,
    maxTokens: 400,
    bestModel: 'gpt-3.5-turbo',
    examples: [
      {
        input: 'Wireless Bluetooth Headphones, High-quality audio experience, Electronics, ["wireless headphones"], Music lovers',
        output: '["Shop premium wireless Bluetooth headphones with noise cancellation. Free shipping & 30-day returns. Audiophile-quality sound awaits!", "Get the best wireless headphones 2026. Crystal-clear audio, 40hr battery, comfort fit. Order now with free shipping!", "Premium Bluetooth headphones for music lovers. Noise-cancelling, wireless freedom, superior sound. Buy today, save 20%!"]',
      },
    ],
  },

  // PRODUCT DESCRIPTION
  product_description_long: {
    id: 'product_description_long',
    name: 'Long-Form Product Description',
    contentType: 'product_description',
    template: `Create a compelling, SEO-optimized product description for an e-commerce product.

Product Information:
- Title: {productTitle}
- Type: {productType}
- Keywords: {keywords}
- Target Audience: {targetAudience}
- Brand Voice: {brandVoice}
- Additional Context: {additionalContext}

Requirements:
- Length: 300-500 words
- Include keywords naturally (1-3% density)
- Use H2/H3 headings for structure
- Highlight features and benefits
- Address customer pain points
- Include social proof if applicable
- End with clear call-to-action
- Use bullet points for key features
- SEO-optimized but human-friendly

Structure:
1. Hook (compelling opening)
2. Problem/Solution
3. Key Features (bullets)
4. Benefits (how it helps customer)
5. Social Proof (optional)
6. Call-to-Action

Tone: {tone}`,
    variables: ['productTitle', 'productType', 'keywords', 'targetAudience', 'brandVoice', 'additionalContext', 'tone'],
    temperature: 0.7,
    maxTokens: 1500,
    bestModel: 'gpt-4-turbo',
  },

  // BLOG POST
  blog_post: {
    id: 'blog_post',
    name: 'SEO Blog Post Generator',
    contentType: 'blog_post',
    template: `Write a comprehensive, SEO-optimized blog post.

Topic: {topic}
Keywords: {keywords}
Word Count: {wordCount}
Target Audience: {targetAudience}
Tone: {tone}

Requirements:
- Include SEO keywords naturally throughout
- Use H2 and H3 headings (keyword-rich)
- Write engaging introduction with hook
- Include actionable takeaways
- Add relevant statistics or data
- Use short paragraphs (3-4 sentences)
- Include transition words for flow
- End with strong conclusion and CTA
- Optimize for featured snippets (lists, tables)

Structure:
1. Introduction (hook + overview)
2. Main sections with H2 headings
3. Subsections with H3 headings
4. Bullet points or numbered lists
5. Conclusion with key takeaways
6. Call-to-action

Write in a {tone} tone for {targetAudience}.`,
    variables: ['topic', 'keywords', 'wordCount', 'targetAudience', 'tone'],
    temperature: 0.7,
    maxTokens: 4000,
    bestModel: 'claude-sonnet-4',
  },

  // RESEARCH
  research_query: {
    id: 'research_query',
    name: 'Research & Fact-Finding',
    contentType: 'research',
    template: `Research the following topic and provide accurate, up-to-date information.

Query: {query}
Depth: {depth}

Requirements:
- Provide factual, verifiable information
- Include statistics and data where available
- Cite sources when possible
- Highlight key insights
- Identify trends or patterns
- Be objective and balanced
- Focus on recent information (2024-2026)

Structure:
1. Executive Summary
2. Key Findings (bullet points)
3. Detailed Analysis
4. Statistics & Data
5. Sources & Citations

Depth Level: {depth} (shallow = overview, moderate = standard research, deep = comprehensive analysis)`,
    variables: ['query', 'depth'],
    temperature: 0.3,
    maxTokens: 3000,
    bestModel: 'perplexity-sonar-pro',
  },

  // SCHEMA MARKUP
  schema_product: {
    id: 'schema_product',
    name: 'Product Schema Markup Generator',
    contentType: 'schema',
    template: `Generate JSON-LD schema markup for a product.

Product Information:
{productData}

Requirements:
- Follow Schema.org Product specification
- Include all required properties (name, description, image, offers)
- Add optional properties when data available (brand, sku, gtin, reviews)
- Ensure valid JSON-LD format
- Use proper data types
- Include breadcrumb schema if applicable

Return valid JSON-LD schema markup ready to insert in <script type="application/ld+json"> tag.`,
    variables: ['productData'],
    temperature: 0.1,
    maxTokens: 1000,
    bestModel: 'claude-sonnet-4',
  },

  schema_article: {
    id: 'schema_article',
    name: 'Article Schema Markup Generator',
    contentType: 'schema',
    template: `Generate JSON-LD schema markup for a blog article.

Article Information:
{articleData}

Requirements:
- Follow Schema.org Article specification
- Include headline, author, datePublished, dateModified
- Add image with proper dimensions
- Include publisher information
- Use proper data types
- Ensure valid JSON-LD format

Return valid JSON-LD schema markup ready to insert in <script type="application/ld+json"> tag.`,
    variables: ['articleData'],
    temperature: 0.1,
    maxTokens: 1000,
    bestModel: 'claude-sonnet-4',
  },

  // LSI KEYWORDS GENERATOR
  lsi_keywords: {
    id: 'lsi_keywords',
    name: 'LSI Keywords Generator',
    contentType: 'research',
    template: `Generate LSI (Latent Semantic Indexing) keywords for SEO optimization.

Primary Keyword: {keyword}
Industry: {industry}
Content Type: {contentType}

Requirements:
- Generate 20-30 semantically related keywords
- Include synonyms, related terms, and long-tail variations
- Consider user intent and search context
- Group by category (direct synonyms, related concepts, questions, modifiers)
- Prioritize high-value, low-competition terms

Return as JSON object:
{
  "direct_synonyms": [],
  "related_concepts": [],
  "long_tail_variations": [],
  "questions": [],
  "modifiers": []
}`,
    variables: ['keyword', 'industry', 'contentType'],
    temperature: 0.5,
    maxTokens: 800,
    bestModel: 'gpt-4-turbo',
  },
};

// ============================================================================
// SYSTEM MESSAGES
// ============================================================================

export const SYSTEM_MESSAGES: Record<string, string> = {
  seo_expert: `You are an expert SEO copywriter with 10+ years of experience. You understand:
- Google's ranking algorithms and E-E-A-T principles
- Keyword optimization without keyword stuffing
- User intent and search behavior
- Conversion-focused copywriting
- Schema markup and technical SEO
- Current SEO best practices (2026)

Your writing is engaging, informative, and optimized for both search engines and human readers.`,

  brand_voice_analyzer: `You are a brand voice and content strategist. You analyze existing content to:
- Identify tone, style, and vocabulary patterns
- Assess brand consistency
- Evaluate emotional resonance
- Measure alignment with target audience
- Provide actionable recommendations

You provide objective, data-driven analysis with specific examples.`,

  content_quality_scorer: `You are a content quality expert who evaluates text based on:
- Readability (Flesch-Kincaid, grade level)
- SEO optimization (keyword usage, structure)
- Uniqueness and originality
- Brand voice alignment
- Factual accuracy and credibility
- Engagement potential

You provide detailed scores with specific improvement recommendations.`,

  product_marketer: `You are an expert e-commerce product marketer. You create:
- Compelling product descriptions that sell
- SEO-optimized meta titles and descriptions
- Benefit-focused copy (not just features)
- Urgency and scarcity-driven messaging
- Conversion-focused CTAs

You understand consumer psychology and persuasive writing techniques.`,

  technical_writer: `You are a technical writer who creates:
- Clear, accurate documentation
- Well-structured content with proper hierarchy
- Scannable text with headings and lists
- Accessible language for target audience
- Properly formatted code and examples

You prioritize clarity, accuracy, and usability.`,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get prompt template by ID
 */
export function getPromptTemplate(templateId: string): PromptTemplate | undefined {
  return PROMPT_TEMPLATES[templateId];
}

/**
 * Get all templates for a content type
 */
export function getTemplatesByContentType(contentType: ContentType): PromptTemplate[] {
  return Object.values(PROMPT_TEMPLATES).filter(
    (template) => template.contentType === contentType
  );
}

/**
 * Build prompt from template with variable substitution
 */
export function buildPrompt(
  templateId: string,
  variables: Record<string, any>
): string {
  const template = PROMPT_TEMPLATES[templateId];
  if (!template) {
    throw new Error(`Prompt template '${templateId}' not found`);
  }

  let prompt = template.template;

  // Substitute variables
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`;
    prompt = prompt.replace(new RegExp(placeholder, 'g'), String(value || ''));
  }

  // Remove any remaining unreplaced placeholders
  prompt = prompt.replace(/\{[^}]+\}/g, '');

  return prompt;
}

/**
 * Get recommended model for content type
 */
export function getRecommendedModel(contentType: ContentType): AIModel {
  const routing: Record<ContentType, AIModel> = {
    product_meta: 'gpt-3.5-turbo',
    product_description: 'gpt-4-turbo',
    blog_post: 'claude-sonnet-4',
    research: 'perplexity-sonar-pro',
    schema: 'claude-sonnet-4',
  };

  return routing[contentType] || 'gpt-3.5-turbo';
}

/**
 * Get system message for role
 */
export function getSystemMessage(role: string): string {
  return SYSTEM_MESSAGES[role] || SYSTEM_MESSAGES.seo_expert;
}

/**
 * Validate template variables
 */
export function validateTemplateVariables(
  templateId: string,
  variables: Record<string, any>
): { valid: boolean; missing: string[] } {
  const template = PROMPT_TEMPLATES[templateId];
  if (!template) {
    return { valid: false, missing: ['template_not_found'] };
  }

  const missing = template.variables.filter(
    (varName) => variables[varName] === undefined || variables[varName] === null
  );

  return {
    valid: missing.length === 0,
    missing,
  };
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default {
  templates: PROMPT_TEMPLATES,
  systemMessages: SYSTEM_MESSAGES,
  getPromptTemplate,
  getTemplatesByContentType,
  buildPrompt,
  getRecommendedModel,
  getSystemMessage,
  validateTemplateVariables,
};
