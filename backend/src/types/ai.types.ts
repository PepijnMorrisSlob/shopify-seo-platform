/**
 * AI Content Service Type Definitions
 *
 * Types and interfaces for multi-model AI content generation,
 * quality scoring, and prompt engineering.
 */

// ============================================================================
// AI MODEL TYPES
// ============================================================================

export type AIModel =
  | 'gpt-4o-mini'
  | 'gpt-4o'
  | 'gpt-3.5-turbo'
  | 'gpt-4-turbo'
  | 'claude-haiku-3.5'
  | 'claude-sonnet-4'
  | 'perplexity-sonar'
  | 'perplexity-sonar-pro';

export type ContentType =
  | 'product_meta'
  | 'product_description'
  | 'blog_post'
  | 'research'
  | 'schema';

// ============================================================================
// CONTENT GENERATION INPUT
// ============================================================================

export interface ContentGenerationInput {
  productTitle?: string;
  productDescription?: string;
  productType?: string;
  keywords?: string[];
  targetAudience?: string;
  brandVoice?: string;
  additionalContext?: string;
  maxLength?: number;
  tone?: 'professional' | 'casual' | 'enthusiastic' | 'authoritative' | 'friendly';
  includeEmojis?: boolean;
  language?: string;
}

export interface BlogPostInput extends ContentGenerationInput {
  topic: string;
  outline?: string[];
  seoKeywords?: string[];
  wordCount?: number;
  includeImages?: boolean;
}

export interface ResearchInput {
  query: string;
  depth?: 'shallow' | 'moderate' | 'deep';
  sources?: string[];
  includeStatistics?: boolean;
  includeCitations?: boolean;
}

export interface SchemaInput {
  schemaType: 'Product' | 'Article' | 'Organization' | 'FAQPage' | 'Review';
  data: Record<string, any>;
}

// ============================================================================
// GENERATED CONTENT
// ============================================================================

export interface GeneratedContent {
  id: string;
  content: string;
  model: AIModel;
  qualityScore: QualityScore;
  metadata: ContentMetadata;
  createdAt: Date;
}

export interface ContentMetadata {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  generationTime: number; // milliseconds
  temperature: number;
  maxTokens: number;
}

// ============================================================================
// QUALITY SCORING
// ============================================================================

export interface QualityScore {
  overall: number; // 0-100
  readability: ReadabilityScore;
  seoOptimization: SEOScore;
  uniqueness: UniquenessScore;
  brandAlignment: BrandAlignmentScore;
  factualAccuracy: FactualAccuracyScore;
  recommendation: 'auto_approve' | 'manual_review' | 'auto_reject';
}

export interface ReadabilityScore {
  score: number; // 0-100
  fleschKincaidGrade: number;
  fleschReadingEase: number;
  averageWordsPerSentence: number;
  complexWordPercentage: number;
  recommendation: string;
}

export interface SEOScore {
  score: number; // 0-100
  keywordDensity: number; // percentage
  hasLSIKeywords: boolean;
  lsiKeywords: string[];
  metaLength: {
    title?: { actual: number; optimal: number; isOptimal: boolean };
    description?: { actual: number; optimal: number; isOptimal: boolean };
  };
  hasCallToAction: boolean;
  hasNumbers: boolean;
  recommendation: string;
}

export interface UniquenessScore {
  score: number; // 0-100
  similarityWithExisting: number; // cosine similarity 0-1
  duplicatePhrases: string[];
  originalityPercentage: number;
  recommendation: string;
}

export interface BrandAlignmentScore {
  score: number; // 0-100
  embeddingSimilarity: number; // 0-1
  toneMatch: boolean;
  vocabularyMatch: boolean;
  styleConsistency: number;
  recommendation: string;
}

export interface FactualAccuracyScore {
  score: number; // 0-100
  verifiedClaims: number;
  unverifiedClaims: number;
  potentiallyInaccurate: string[];
  citationsProvided: boolean;
  recommendation: string;
}

// ============================================================================
// SCORING CRITERIA
// ============================================================================

export interface ScoringCriteria {
  enableReadability?: boolean;
  enableSEO?: boolean;
  enableUniqueness?: boolean;
  enableBrandAlignment?: boolean;
  enableFactualAccuracy?: boolean;
  knowledgeBase?: string; // For brand alignment
  existingContent?: string[]; // For uniqueness check
  targetKeywords?: string[]; // For SEO scoring
}

// ============================================================================
// PROMPT TEMPLATES
// ============================================================================

export interface PromptTemplate {
  id: string;
  name: string;
  contentType: ContentType;
  template: string;
  variables: string[];
  systemMessage?: string;
  examples?: PromptExample[];
  temperature?: number;
  maxTokens?: number;
  bestModel?: AIModel;
}

export interface PromptExample {
  input: string;
  output: string;
}

// ============================================================================
// MODEL CONFIGURATION
// ============================================================================

export interface ModelConfig {
  model: AIModel;
  temperature: number;
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
}

export interface ModelRouting {
  contentType: ContentType;
  preferredModel: AIModel;
  fallbackModels: AIModel[];
  reason: string;
}

// ============================================================================
// COST TRACKING
// ============================================================================

export interface CostTracking {
  organizationId: string;
  model: AIModel;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  timestamp: Date;
}

export interface CostSummary {
  organizationId: string;
  period: 'daily' | 'weekly' | 'monthly';
  totalCost: number;
  totalTokens: number;
  breakdown: {
    model: AIModel;
    requests: number;
    tokens: number;
    cost: number;
  }[];
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: {
    type: string;
    text: string;
  }[];
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface PerplexityResponse {
  id: string;
  model: string;
  created: number;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  citations?: string[];
  object: string;
  choices: {
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
    delta: {
      role: string;
      content: string;
    };
  }[];
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class AIServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public model?: AIModel,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

export type AIErrorCode =
  | 'RATE_LIMIT_EXCEEDED'
  | 'INVALID_API_KEY'
  | 'MODEL_UNAVAILABLE'
  | 'TOKEN_LIMIT_EXCEEDED'
  | 'CONTENT_POLICY_VIOLATION'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNKNOWN_ERROR';
