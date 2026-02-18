// Q&A Content Engine Type Definitions
// Matches backend types from Database Specialist

export interface BusinessProfile {
  id: string;
  organizationId: string;

  // Basic Info
  businessName: string;
  industry: Industry;
  productTypes: ProductType[];

  // Target Audience
  targetAudience: TargetAudience;

  // Brand Voice
  brandVoice: BrandVoice;

  // Content Strategy
  contentStrategy: ContentStrategy;

  // SEO Strategy
  seoStrategy: SEOStrategy;

  // Product Integration
  productStrategy: ProductStrategy;

  // Advanced Settings
  advancedSettings: AdvancedSettings;

  createdAt: string;
  updatedAt: string;
}

export type Industry =
  | 'ecommerce'
  | 'saas'
  | 'services'
  | 'health'
  | 'fashion'
  | 'food'
  | 'home_garden'
  | 'b2b';

export type ProductType = 'physical' | 'digital' | 'services';

export interface TargetAudience {
  demographics: string;
  expertiseLevel: 'beginner' | 'intermediate' | 'expert';
  painPoints: string[];
  searchBehavior: string;
}

export interface BrandVoice {
  tone: 'professional' | 'casual' | 'technical' | 'friendly' | 'authoritative' | 'conversational';
  personality: string[];
  avoidWords: string[];
  preferredWords: string[];
  exampleContent: string;
}

export interface ContentStrategy {
  primaryGoal: 'traffic' | 'conversions' | 'brand_awareness' | 'education';
  contentTypes: ContentType[];
  postLength: 'short' | 'medium' | 'long';
  publishingFrequency: number;
  competitorUrls: string[];
}

export type ContentType = 'how-to' | 'comparison' | 'educational' | 'troubleshooting' | 'guide';

export interface SEOStrategy {
  targetKeywords: string[];
  avoidKeywords: string[];
  targetLocations: string[];
  languagePreference: 'en-US' | 'en-GB' | 'es' | 'fr' | 'de';
}

export interface ProductStrategy {
  productMentionFrequency: 'minimal' | 'moderate' | 'aggressive';
  ctaStyle: 'soft' | 'direct' | 'educational';
  preferredCTAs: string[];
}

export interface AdvancedSettings {
  factCheckingLevel: 'basic' | 'thorough' | 'expert';
  externalLinkingPolicy: 'minimal' | 'moderate' | 'generous';
  imageStyle: 'realistic' | 'illustrated' | 'minimal';
  schemaPreferences: string[];
}

// Question Discovery
export interface Question {
  id: string;
  organizationId: string;
  text: string;
  source: QuestionSource;
  category: string;
  priority: 'low' | 'medium' | 'high';
  searchVolume?: number;
  difficulty?: number;
  competitorsCovering?: number;
  status: 'discovered' | 'queued' | 'generating' | 'completed' | 'rejected';
  createdAt: string;
}

export type QuestionSource = 'paa' | 'competitor' | 'ai_suggestion' | 'template' | 'manual';

export interface QuestionFilters {
  source?: QuestionSource;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  minSearchVolume?: number;
  maxSearchVolume?: number;
  status?: Question['status'];
}

// Q&A Pages
export interface QAPage {
  id: string;
  organizationId: string;

  // Content
  question: string;
  answerContent: string;
  answerMarkdown: string;
  featuredImageUrl?: string;

  // Shopify Integration
  shopifyBlogId?: string;
  shopifyBlogPostId?: string;
  shopifyPageId?: string;
  shopifyUrl?: string;

  // SEO
  targetKeyword: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  schemaMarkup: SchemaMarkup;

  // Performance Tracking
  currentPosition?: number;
  bestPosition?: number;
  monthlyImpressions: number;
  monthlyClicks: number;
  monthlyTraffic: number;
  ctr: number;
  seoScore: number;

  // Internal Links
  internalLinks: InternalLink[];

  // Status
  status: QAPageStatus;
  publishedAt?: string;
  lastOptimizedAt?: string;

  createdAt: string;
  updatedAt: string;
}

export type QAPageStatus = 'draft' | 'generating' | 'pending_review' | 'published' | 'archived';

export interface SchemaMarkup {
  '@context': string;
  '@type': string;
  mainEntity?: any;
  [key: string]: any;
}

export interface InternalLink {
  id: string;
  sourcePageId: string;
  sourceUrl: string;
  targetPageType: 'qa_page' | 'product' | 'collection';
  targetPageId: string;
  targetUrl: string;
  anchorText: string;
  context: string;
  relevanceScore: number;
}

// Performance Tracking
export interface ContentPerformance {
  id: string;
  pageId: string;
  date: string;

  // Google Search Console Metrics
  impressions: number;
  clicks: number;
  ctr: number;
  avgPosition: number;

  // Analytics Metrics
  pageviews: number;
  uniqueVisitors: number;
  avgTimeOnPage: number;
  bounceRate: number;

  // Conversion Tracking
  conversions: number;
  revenue: number;
}

export interface PerformanceSummary {
  pageId: string;
  question: string;
  totalImpressions: number;
  totalClicks: number;
  avgCtr: number;
  avgPosition: number;
  totalRevenue: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

// A/B Testing
export interface ABTest {
  id: string;
  organizationId: string;
  pageId: string;

  elementType: ABTestElement;

  // Variations
  controlValue: string;
  variantAValue: string;
  variantBValue: string;

  // Traffic Split
  trafficSplit: {
    control: number;
    variant_a: number;
    variant_b: number;
  };

  // Results
  results: ABTestResults;
  winner?: 'control' | 'variant_a' | 'variant_b';
  confidence?: number;

  status: 'running' | 'completed' | 'winner_applied' | 'cancelled';

  startedAt: string;
  endedAt?: string;
  createdAt: string;
}

export type ABTestElement = 'title' | 'meta_description' | 'h2s' | 'cta' | 'intro';

export interface ABTestResults {
  control: VariantResults;
  variant_a: VariantResults;
  variant_b: VariantResults;
}

export interface VariantResults {
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  revenue: number;
}

// API Request/Response Types

export interface CreateBusinessProfileRequest {
  businessName: string;
  industry: Industry;
  productTypes: ProductType[];
  targetAudience: TargetAudience;
  brandVoice: BrandVoice;
  contentStrategy: ContentStrategy;
  seoStrategy: SEOStrategy;
  productStrategy: ProductStrategy;
  advancedSettings: AdvancedSettings;
}

export interface UpdateBusinessProfileRequest extends Partial<CreateBusinessProfileRequest> {
  id: string;
}

export interface DiscoverQuestionsRequest {
  filters?: QuestionFilters;
  limit?: number;
  offset?: number;
}

export interface DiscoverQuestionsResponse {
  questions: Question[];
  total: number;
  hasMore: boolean;
}

export interface AddToQueueRequest {
  questionIds: string[];
}

export interface AddToQueueResponse {
  queued: number;
  qaPageIds: string[];
}

export interface GetQAPagesRequest {
  status?: QAPageStatus;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'seoScore' | 'traffic' | 'position';
  sortOrder?: 'asc' | 'desc';
}

export interface GetQAPagesResponse {
  pages: QAPage[];
  total: number;
  hasMore: boolean;
}

export interface ApproveQAPageRequest {
  pageId: string;
  publish: boolean;
}

export interface ApproveQAPageResponse {
  success: boolean;
  pageId: string;
  shopifyUrl?: string;
  publishedAt?: string;
}

export interface GetPerformanceRequest {
  pageId?: string;
  startDate: string;
  endDate: string;
}

export interface GetPerformanceResponse {
  performance: ContentPerformance[];
  summary: PerformanceSummary[];
}

export interface CreateABTestRequest {
  pageId: string;
  elementType: ABTestElement;
  controlValue: string;
  variantAValue: string;
  variantBValue: string;
  trafficSplit?: {
    control: number;
    variant_a: number;
    variant_b: number;
  };
}

export interface CreateABTestResponse {
  test: ABTest;
}

// Analytics Dashboard Types
export interface QAAnalytics {
  totalPages: number;
  publishedPages: number;
  avgSeoScore: number;
  totalTraffic: number;
  totalConversions: number;
  totalRevenue: number;

  topPerformers: QAPage[];
  needsOptimization: QAPage[];
  contentGaps: ContentGap[];

  trafficTrend: TrendData[];
  conversionTrend: TrendData[];
}

export interface ContentGap {
  question: string;
  searchVolume: number;
  difficulty: number;
  competitorsCovering: number;
  estimatedTraffic: number;
  priority: 'low' | 'medium' | 'high';
}

export interface TrendData {
  date: string;
  value: number;
}

// Onboarding Flow Types
export interface OnboardingStep {
  step: number;
  title: string;
  description: string;
  isComplete: boolean;
}

export interface OnboardingState {
  currentStep: number;
  profile: Partial<BusinessProfile>;
  steps: OnboardingStep[];
}
