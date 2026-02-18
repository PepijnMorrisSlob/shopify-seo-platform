/**
 * Q&A Content Engine Type Definitions
 *
 * Types for business-aware question-based content generation,
 * intelligent internal linking, content optimization, and A/B testing.
 */

// ============================================================================
// BUSINESS PROFILE TYPES
// ============================================================================

export type Industry =
  | 'ecommerce'
  | 'saas'
  | 'services'
  | 'health_wellness'
  | 'fashion'
  | 'food_beverage'
  | 'home_garden'
  | 'b2b'
  | 'b2c';

export type ProductType = 'physical' | 'digital' | 'services';

export type ExpertiseLevel = 'beginner' | 'intermediate' | 'expert';

export type Tone =
  | 'professional'
  | 'casual'
  | 'technical'
  | 'friendly'
  | 'authoritative'
  | 'conversational';

export type ContentGoal = 'traffic' | 'conversions' | 'brand_awareness' | 'education';

export type FactCheckingLevel = 'basic' | 'thorough' | 'expert';

export type ExternalLinkingPolicy = 'minimal' | 'moderate' | 'generous';

export type ImageStyle = 'realistic' | 'illustrated' | 'minimal';

export type ProductMentionFrequency = 'minimal' | 'moderate' | 'aggressive';

export type CTAStyle = 'soft' | 'direct' | 'educational';

export interface BusinessProfile {
  // Basic Info
  businessName: string;
  industry: Industry;
  productTypes: ProductType[];

  // Target Audience
  targetAudience: {
    demographics: string;
    expertiseLevel: ExpertiseLevel;
    painPoints: string[];
    searchBehavior: string;
  };

  // Brand Voice
  brandVoice: {
    tone: Tone;
    personality: string[];
    avoidWords: string[];
    preferredWords: string[];
    exampleContent: string;
  };

  // Content Strategy
  contentStrategy: {
    primaryGoal: ContentGoal;
    contentTypes: string[];
    postLength: 'short' | 'medium' | 'long';
    publishingFrequency: number;
    competitorUrls: string[];
  };

  // SEO Strategy
  seoStrategy: {
    targetKeywords: string[];
    avoidKeywords: string[];
    targetLocations: string[];
    languagePreference: string;
  };

  // Product Integration
  productStrategy: {
    productMentionFrequency: ProductMentionFrequency;
    ctaStyle: CTAStyle;
    preferredCTAs: string[];
  };

  // Advanced Settings
  advanced: {
    factCheckingLevel: FactCheckingLevel;
    externalLinkingPolicy: ExternalLinkingPolicy;
    imageStyle: ImageStyle;
    schemaPreferences: string[];
  };
}

// ============================================================================
// BUSINESS CONTEXT & INTELLIGENCE
// ============================================================================

export interface BusinessContext {
  profile: BusinessProfile;
  productInsights: ProductAnalysis;
  brandVoiceProfile: BrandVoiceProfile;
  competitorInsights: CompetitorInsights[];
  customTemplates: QuestionTemplate[];
}

export interface ProductAnalysis {
  categories: string[];
  commonFeatures: string[];
  pricePoints: {
    min: number;
    max: number;
    average: number;
  };
  targetCustomerInsights: string[];
  uniqueSellingPropositions: string[];
}

export interface BrandVoiceProfile {
  tone: Tone;
  formalityLevel: number; // 0-10 scale
  sentenceStructure: {
    averageLength: number;
    complexity: 'simple' | 'moderate' | 'complex';
  };
  vocabularyLevel: 'elementary' | 'intermediate' | 'advanced' | 'expert';
  commonPhrases: string[];
  personalityTraits: string[];
  writingPatterns: string[];
}

export interface CompetitorInsights {
  url: string;
  name: string;
  contentTopics: string[];
  questionsCovered: string[];
  contentGaps: string[];
  strengths: string[];
  weaknesses: string[];
  opportunityAreas: string[];
}

// ============================================================================
// QUESTION DISCOVERY
// ============================================================================

export interface Question {
  id: string;
  question: string;
  category: string;
  source: 'paa' | 'competitor' | 'template' | 'custom' | 'ai_generated';
  priority: number; // 1-10
  searchVolume?: number;
  difficulty?: number; // SEO difficulty
  estimatedTraffic?: number;
  relatedKeywords: string[];
  metadata: {
    createdAt: Date;
    templateUsed?: string;
    competitorUrl?: string;
  };
}

export interface QuestionTemplate {
  id: string;
  template: string;
  category: string;
  variables: string[];
  priority: number;
  usageCount: number;
  industry: Industry;
  examples: string[];
}

export interface PAQQuestion {
  question: string;
  relatedKeyword: string;
  searchVolume: number;
  relatedQuestions: string[];
}

// ============================================================================
// Q&A CONTENT
// ============================================================================

export interface QAContent {
  id: string;
  organizationId: string;
  question: string;
  answer: {
    content: string; // Full HTML
    markdown: string; // Markdown for editing
    wordCount: number;
    structure: ContentStructure;
  };
  seo: {
    targetKeyword: string;
    metaTitle: string;
    metaDescription: string;
    h1: string;
    h2s: string[];
    h3s: string[];
    keywordDensity: number;
  };
  internalLinks: InternalLink[];
  featuredImage?: {
    url: string;
    alt: string;
    caption?: string;
  };
  schema: any; // FAQ or Article schema
  qualityScore: number;
  status: 'draft' | 'pending_review' | 'published' | 'archived';
  performance?: ContentPerformance;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    publishedAt?: Date;
    lastOptimizedAt?: Date;
    generationModel: string;
    generationCost: number;
  };
}

export interface ContentStructure {
  intro: string;
  sections: ContentSection[];
  faq: FAQItem[];
  conclusion?: string;
}

export interface ContentSection {
  heading: string;
  level: 2 | 3;
  content: string;
  includesCTA?: boolean;
}

export interface FAQItem {
  question: string;
  answer: string;
}

// ============================================================================
// INTERNAL LINKING
// ============================================================================

export interface InternalLink {
  id: string;
  sourcePageId: string;
  sourceUrl: string;
  targetUrl: string;
  targetPageType: 'qa_page' | 'product' | 'collection' | 'page';
  anchorText: string;
  context: string; // Surrounding paragraph
  relevanceScore: number; // 0-1
  linkType: 'contextual' | 'cta' | 'navigation';
  metadata: {
    createdAt: Date;
    generatedBy: 'ai' | 'manual';
  };
}

export interface LinkOpportunity {
  sourcePage: {
    id: string;
    url: string;
    title: string;
  };
  targetPage: {
    id: string;
    url: string;
    title: string;
    type: string;
  };
  suggestedAnchorText: string;
  suggestedPosition: number; // Character position in content
  relevanceScore: number;
  reasoning: string;
}

export interface LinkGraphMetrics {
  totalPages: number;
  totalLinks: number;
  averageInboundLinks: number;
  averageOutboundLinks: number;
  orphanPages: number;
  hubPages: string[]; // High authority pages
  authorities: string[]; // Pages with many inbound links
}

// ============================================================================
// CONTENT PERFORMANCE
// ============================================================================

export interface ContentPerformance {
  pageId: string;
  currentPosition: number;
  bestPosition: number;
  positionChange: number; // Change in last 7 days
  impressions: {
    total: number;
    trend: 'up' | 'down' | 'stable';
    changePercentage: number;
  };
  clicks: {
    total: number;
    trend: 'up' | 'down' | 'stable';
    changePercentage: number;
  };
  ctr: number;
  traffic: {
    total: number;
    organic: number;
    direct: number;
    referral: number;
  };
  conversions: {
    total: number;
    rate: number;
    revenue: number;
  };
  engagement: {
    avgTimeOnPage: number;
    bounceRate: number;
    scrollDepth: number;
  };
  lastUpdated: Date;
}

// ============================================================================
// CONTENT OPTIMIZATION
// ============================================================================

export interface OptimizationAnalysis {
  pageId: string;
  status: 'healthy' | 'needs_attention' | 'critical';
  issues: OptimizationIssue[];
  opportunities: OptimizationOpportunity[];
  recommendations: OptimizationRecommendation[];
  estimatedImpact: 'low' | 'medium' | 'high';
}

export interface OptimizationIssue {
  type:
    | 'outdated_content'
    | 'ranking_decline'
    | 'traffic_decline'
    | 'low_engagement'
    | 'weak_internal_links'
    | 'keyword_cannibalization';
  severity: 'low' | 'medium' | 'high';
  description: string;
  detectedAt: Date;
}

export interface OptimizationOpportunity {
  type:
    | 'update_statistics'
    | 'add_new_section'
    | 'enhance_examples'
    | 'add_internal_links'
    | 'optimize_meta'
    | 'add_schema';
  description: string;
  estimatedImpact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
}

export interface OptimizationRecommendation {
  action: string;
  reasoning: string;
  priority: number;
  automatable: boolean;
  estimatedTimeToImplement: number; // minutes
}

// ============================================================================
// CONTENT GAP ANALYSIS
// ============================================================================

export interface ContentGap {
  type: 'competitor_topic' | 'unanswered_paa' | 'keyword_gap' | 'seasonal_opportunity';
  topic: string;
  relatedKeywords: string[];
  estimatedSearchVolume: number;
  difficulty: number;
  competitorsCoveringTopic: string[];
  priority: number;
  reasoning: string;
}

export interface GapAnalysisResult {
  organizationId: string;
  gaps: ContentGap[];
  topOpportunities: ContentGap[];
  analysisDate: Date;
  competitorsAnalyzed: string[];
}

// ============================================================================
// A/B TESTING
// ============================================================================

export interface ABTest {
  id: string;
  organizationId: string;
  pageId: string;
  elementType: 'title' | 'meta_description' | 'h2s' | 'cta' | 'intro';
  variations: {
    control: TestVariation;
    variantA: TestVariation;
    variantB: TestVariation;
  };
  trafficSplit: {
    control: number;
    variantA: number;
    variantB: number;
  };
  status: 'running' | 'completed' | 'winner_applied' | 'cancelled';
  results?: TestResults;
  winner?: 'control' | 'variantA' | 'variantB';
  confidence?: number; // Statistical confidence 0-1
  startedAt: Date;
  endedAt?: Date;
  duration: number; // days
  minimumSampleSize: number;
}

export interface TestVariation {
  value: string;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
}

export interface TestResults {
  control: VariationResults;
  variantA: VariationResults;
  variantB: VariationResults;
  statisticalSignificance: number;
  winningVariation: 'control' | 'variantA' | 'variantB';
  improvementPercentage: number;
}

export interface VariationResults {
  impressions: number;
  clicks: number;
  ctr: number;
  avgPosition: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
  revenuePerClick: number;
}

// ============================================================================
// RESEARCH & FACTUAL ACCURACY
// ============================================================================

export interface ResearchResult {
  query: string;
  factualInformation: string[];
  statistics: Statistic[];
  citations: Citation[];
  recentUpdates: string[];
  relatedTopics: string[];
  keyTakeaways: string[];
  sources: string[];
}

export interface Statistic {
  claim: string;
  value: string;
  source: string;
  date: string;
  verified: boolean;
}

export interface Citation {
  text: string;
  url: string;
  title: string;
  publishDate?: string;
  author?: string;
}

// ============================================================================
// SCHEMA MARKUP
// ============================================================================

export interface FAQSchema {
  '@context': 'https://schema.org';
  '@type': 'FAQPage';
  mainEntity: FAQEntity[];
}

export interface FAQEntity {
  '@type': 'Question';
  name: string;
  acceptedAnswer: {
    '@type': 'Answer';
    text: string;
  };
}

export interface ArticleSchema {
  '@context': 'https://schema.org';
  '@type': 'Article';
  headline: string;
  description: string;
  author: {
    '@type': 'Organization' | 'Person';
    name: string;
  };
  publisher: {
    '@type': 'Organization';
    name: string;
    logo: {
      '@type': 'ImageObject';
      url: string;
    };
  };
  datePublished: string;
  dateModified: string;
  mainEntityOfPage: string;
}

// ============================================================================
// SEO VALIDATION
// ============================================================================

export interface SEOValidationResult {
  overallScore: number;
  checks: SEOCheck[];
  errors: SEOError[];
  warnings: SEOWarning[];
  recommendations: string[];
  passed: boolean;
}

export interface SEOCheck {
  name: string;
  passed: boolean;
  score: number;
  message: string;
  category: 'critical' | 'important' | 'optional';
}

export interface SEOError {
  type: string;
  message: string;
  severity: 'critical' | 'high' | 'medium';
  fix: string;
}

export interface SEOWarning {
  type: string;
  message: string;
  recommendation: string;
}

// ============================================================================
// AUTOMATION RULES
// ============================================================================

export interface AutomationRule {
  id: string;
  organizationId: string;
  ruleType: 'content_refresh' | 'auto_publish' | 'internal_linking' | 'ab_testing';
  enabled: boolean;
  configuration: any;
  lastExecutedAt?: Date;
  executionCount: number;
}

export interface ContentRefreshRule {
  checkFrequency: 'daily' | 'weekly' | 'monthly';
  refreshCriteria: {
    rankingDrop: number; // positions
    trafficDrop: number; // percentage
    contentAge: number; // months
  };
  autoApprove: boolean;
}

export interface InternalLinkingRule {
  orphanPageCheck: boolean;
  minimumInboundLinks: number;
  maximumOutboundLinks: number;
  autoLinkNewProducts: boolean;
  relevanceThreshold: number;
}
