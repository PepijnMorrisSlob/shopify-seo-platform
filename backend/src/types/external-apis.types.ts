/**
 * External API Type Definitions
 *
 * Comprehensive type definitions for all external API integrations:
 * - Shopify GraphQL Admin API 2026-01
 * - Google Search Console API
 * - DataForSEO API
 * - SEMrush API
 */

// ============================================================================
// SHOPIFY GRAPHQL API TYPES (2026-01)
// ============================================================================

export interface ShopifyProduct {
  id: string;
  title: string;
  descriptionHtml: string;
  handle: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'DRAFT';
  productType: string;
  vendor: string;
  tags: string[];
  seo: ShopifySEO;
  variants: {
    edges: Array<{
      node: ShopifyProductVariant;
    }>;
  };
  images: {
    edges: Array<{
      node: ShopifyImage;
    }>;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ShopifySEO {
  title: string | null;
  description: string | null;
}

export interface ShopifyProductVariant {
  id: string;
  title: string;
  price: string;
  sku: string;
  inventoryQuantity: number;
  position: number;
}

export interface ShopifyImage {
  id: string;
  url: string;
  altText: string | null;
  width: number;
  height: number;
}

export interface ShopifyBulkOperation {
  id: string;
  status: 'CREATED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELED';
  errorCode?: string;
  createdAt: string;
  completedAt?: string;
  objectCount: number;
  fileSize?: number;
  url?: string;
  query: string;
}

export interface ShopifyWebhook {
  id: string;
  topic: ShopifyWebhookTopic;
  callbackUrl: string;
  format: 'JSON' | 'XML';
  createdAt: string;
  updatedAt: string;
}

export type ShopifyWebhookTopic =
  | 'PRODUCTS_CREATE'
  | 'PRODUCTS_UPDATE'
  | 'PRODUCTS_DELETE'
  | 'COLLECTIONS_CREATE'
  | 'COLLECTIONS_UPDATE'
  | 'APP_UNINSTALLED'
  | 'SHOP_UPDATE';

export interface ShopifyWebhookPayload {
  id: number;
  admin_graphql_api_id: string;
  [key: string]: any;
}

export interface ShopifyRateLimitInfo {
  currentlyAvailable: number;
  maximumAvailable: number;
  restoreRate: number;
  requestedCost: number;
}

export interface ShopifyGraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{
    message: string;
    extensions?: {
      code: string;
      [key: string]: any;
    };
  }>;
  extensions?: {
    cost: {
      requestedQueryCost: number;
      actualQueryCost: number;
      throttleStatus: ShopifyRateLimitInfo;
    };
  };
}

// ============================================================================
// GOOGLE SEARCH CONSOLE API TYPES
// ============================================================================

export interface GSCAuthTokens {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

export interface GSCPerformanceRequest {
  startDate: string; // YYYY-MM-DD format
  endDate: string; // YYYY-MM-DD format
  dimensions?: Array<'query' | 'page' | 'country' | 'device' | 'searchAppearance' | 'date'>;
  type?: 'web' | 'image' | 'video' | 'news' | 'discover' | 'googleNews';
  dimensionFilterGroups?: Array<{
    filters: Array<{
      dimension: string;
      operator: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'includingRegex' | 'excludingRegex';
      expression: string;
    }>;
  }>;
  aggregationType?: 'auto' | 'byProperty' | 'byPage';
  rowLimit?: number;
  startRow?: number;
}

export interface GSCPerformanceRow {
  keys?: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCPerformanceData {
  rows: GSCPerformanceRow[];
  responseAggregationType: string;
}

export interface GSCTopQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCTopPage {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCSiteInfo {
  siteUrl: string;
  permissionLevel: 'siteFullUser' | 'siteOwner' | 'siteRestrictedUser' | 'siteUnverifiedUser';
}

// ============================================================================
// DATAFORSEO API TYPES
// ============================================================================

export interface DataForSEOCredentials {
  login: string;
  password: string;
}

export interface DataForSEOKeywordData {
  keyword: string;
  location_code: number;
  language_code: string;
  search_partners: boolean;
  competition: number; // 0-1 scale
  competition_level: 'LOW' | 'MEDIUM' | 'HIGH';
  cpc: number;
  search_volume: number;
  low_top_of_page_bid: number;
  high_top_of_page_bid: number;
  categories: number[];
  monthly_searches: Array<{
    year: number;
    month: number;
    search_volume: number;
  }>;
}

export interface DataForSEOKeywordRequest {
  keywords: string[];
  location_code?: number; // Default: 2840 (USA)
  language_code?: string; // Default: 'en'
  include_serp_info?: boolean;
  include_clickstream_data?: boolean;
}

export interface DataForSEOSERPRequest {
  keyword: string;
  location_code?: number;
  language_code?: string;
  device?: 'desktop' | 'mobile';
  os?: 'windows' | 'macos';
  depth?: number; // Max 700 for organic results
}

export interface DataForSEOSERPResult {
  keyword: string;
  type: string;
  se_domain: string;
  location_code: number;
  language_code: string;
  check_url: string;
  datetime: string;
  spell?: {
    keyword: string;
    type: string;
  };
  item_types: string[];
  se_results_count: number;
  items_count: number;
  items: DataForSEOSERPItem[];
}

export interface DataForSEOSERPItem {
  type: string;
  rank_group: number;
  rank_absolute: number;
  position: string;
  xpath: string;
  domain: string;
  title: string;
  url: string;
  breadcrumb?: string;
  is_image?: boolean;
  is_video?: boolean;
  is_featured_snippet?: boolean;
  is_malicious?: boolean;
  description?: string;
  pre_snippet?: string;
  extended_snippet?: string;
  images?: Array<{
    type: string;
    alt: string;
    url: string;
  }>;
}

export interface DataForSEOKeywordSuggestion {
  keyword: string;
  search_volume: number;
  competition: number;
  cpc: number;
}

export interface DataForSEOResponse<T = any> {
  version: string;
  status_code: number;
  status_message: string;
  time: string;
  cost: number;
  tasks_count: number;
  tasks_error: number;
  tasks: Array<{
    id: string;
    status_code: number;
    status_message: string;
    time: string;
    cost: number;
    result_count: number;
    path: string[];
    data: any;
    result: T[];
  }>;
}

// ============================================================================
// SEMRUSH API TYPES
// ============================================================================

export interface SEMrushCredentials {
  apiKey: string;
}

export interface SEMrushDomainOverview {
  domain: string;
  organic_keywords: number;
  organic_traffic: number;
  organic_cost: number;
  adwords_keywords: number;
  adwords_traffic: number;
  adwords_cost: number;
}

export interface SEMrushKeyword {
  keyword: string;
  position: number;
  previous_position: number;
  search_volume: number;
  cpc: number;
  url: string;
  traffic: number;
  traffic_cost: number;
  competition: number;
  number_of_results: number;
  trends: string;
  serp_features: string[];
}

export interface SEMrushCompetitorKeyword {
  keyword: string;
  domain: string;
  position: number;
  search_volume: number;
  keyword_difficulty: number;
  cpc: number;
  competition_level: number;
  number_of_results: number;
  trends: string;
}

export interface SEMrushBacklink {
  source_url: string;
  target_url: string;
  anchor: string;
  external_links: number;
  internal_links: number;
  source_title: string;
  last_seen: string;
  first_seen: string;
  link_type: 'text' | 'image' | 'redirect' | 'form';
  is_new: boolean;
  is_lost: boolean;
}

export interface SEMrushTopicalMap {
  topic: string;
  parent_topic: string | null;
  level: number;
  keyword_volume: number;
  keyword_difficulty: number;
  related_keywords: string[];
}

// ============================================================================
// COMMON ERROR TYPES
// ============================================================================

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public provider: 'shopify' | 'google' | 'dataforseo' | 'semrush',
    public originalError?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class RateLimitError extends APIError {
  constructor(
    provider: 'shopify' | 'google' | 'dataforseo' | 'semrush',
    public retryAfter?: number,
    originalError?: any
  ) {
    super(`Rate limit exceeded for ${provider}`, 429, provider, originalError);
    this.name = 'RateLimitError';
  }
}

export class AuthenticationError extends APIError {
  constructor(provider: 'shopify' | 'google' | 'dataforseo' | 'semrush', originalError?: any) {
    super(`Authentication failed for ${provider}`, 401, provider, originalError);
    this.name = 'AuthenticationError';
  }
}

// ============================================================================
// RETRY CONFIGURATION
// ============================================================================

export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableStatusCodes: number[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

// ============================================================================
// CIRCUIT BREAKER TYPES
// ============================================================================

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  monitoringWindowMs: number;
}

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerStats {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: number;
  nextAttemptTime?: number;
}

// ============================================================================
// SHOPIFY BLOG & PAGES API TYPES (2026-01)
// ============================================================================

export interface ShopifyBlog {
  id: string;
  handle: string;
  title: string;
  commentable?: string;
  feedburner?: string | null;
  feedburnerLocation?: string | null;
  createdAt: string;
  updatedAt: string;
  tags?: string;
  templateSuffix?: string | null;
  adminGraphqlApiId: string;
}

export interface ShopifyBlogPost {
  id: string;
  title: string;
  bodyHtml: string;
  handle: string;
  author: string;
  blogId: string;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
  tags: string[];
  summary?: string | null;
  templateSuffix?: string | null;
  image?: {
    src: string;
    alt?: string;
  };
  metafields?: ShopifyMetafield[];
  adminGraphqlApiId: string;
}

export interface ShopifyPage {
  id: string;
  title: string;
  bodyHtml: string;
  handle: string;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
  templateSuffix?: string | null;
  author?: string;
  metafields?: ShopifyMetafield[];
  adminGraphqlApiId: string;
}

export interface ShopifyMetafield {
  id?: string;
  namespace: string;
  key: string;
  value: string;
  type: 'string' | 'json_string' | 'integer' | 'boolean' | 'single_line_text_field' | 'multi_line_text_field';
  description?: string;
}

export interface CreateBlogPostInput {
  title: string;
  bodyHtml: string;
  author?: string;
  tags?: string[];
  published?: boolean;
  publishedAt?: string;
  image?: {
    src: string;
    alt?: string;
  };
  metafields?: ShopifyMetafield[];
  handle?: string;
  summary?: string;
}

export interface UpdateBlogPostInput {
  title?: string;
  bodyHtml?: string;
  author?: string;
  tags?: string[];
  published?: boolean;
  publishedAt?: string;
  image?: {
    src: string;
    alt?: string;
  };
  metafields?: ShopifyMetafield[];
  handle?: string;
  summary?: string;
}

export interface CreatePageInput {
  title: string;
  bodyHtml: string;
  handle?: string;
  published?: boolean;
  publishedAt?: string;
  author?: string;
  metafields?: ShopifyMetafield[];
  templateSuffix?: string;
}

export interface UpdatePageInput {
  title?: string;
  bodyHtml?: string;
  handle?: string;
  published?: boolean;
  publishedAt?: string;
  author?: string;
  metafields?: ShopifyMetafield[];
  templateSuffix?: string;
}

// ============================================================================
// PERPLEXITY API TYPES
// ============================================================================

export interface PerplexityCredentials {
  apiKey: string;
}

export interface PerplexityResearchOptions {
  depth?: 'basic' | 'thorough' | 'expert';
  dateFilter?: 'last_month' | 'last_6_months' | 'last_year';
  searchDomainFilter?: string[];
  returnImages?: boolean;
  returnRelatedQuestions?: boolean;
}

export interface PerplexityCitation {
  url: string;
  title?: string;
  snippet?: string;
  position?: number;
}

export interface PerplexityResearchResult {
  answer: string;
  citations: PerplexityCitation[];
  sources: string[];
  relatedQuestions?: string[];
  images?: Array<{
    url: string;
    description?: string;
  }>;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface PerplexityClaimVerification {
  claim: string;
  verdict: 'true' | 'false' | 'partially_true' | 'unverifiable';
  confidence: number; // 0-1
  evidence: string[];
  sources: PerplexityCitation[];
}

export interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface PerplexityCompletionRequest {
  model: 'sonar' | 'sonar-pro' | 'sonar-reasoning';
  messages: PerplexityMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  search_domain_filter?: string[];
  return_images?: boolean;
  return_related_questions?: boolean;
  search_recency_filter?: 'month' | 'week' | 'day' | 'hour';
  return_citations?: boolean;
}

export interface PerplexityCompletionResponse {
  id: string;
  model: string;
  object: 'chat.completion';
  created: number;
  choices: Array<{
    index: number;
    finish_reason: 'stop' | 'length';
    message: {
      role: 'assistant';
      content: string;
    };
    delta?: {
      role?: string;
      content?: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  citations?: string[];
  images?: string[];
  related_questions?: string[];
}

// ============================================================================
// ENHANCED DATAFORSEO TYPES (People Also Ask)
// ============================================================================

export interface DataForSEOPAAQuestion {
  question: string;
  answer?: string;
  url?: string;
  domain?: string;
  position?: number;
}

export interface DataForSEORelatedSearch {
  keyword: string;
  searchVolume?: number;
  position?: number;
}

export interface DataForSEOCompetitorContent {
  domain: string;
  topPages: Array<{
    url: string;
    title: string;
    position: number;
    traffic: number;
    keywords: number;
  }>;
  topKeywords: Array<{
    keyword: string;
    position: number;
    searchVolume: number;
    traffic: number;
  }>;
  contentTypes: string[];
  totalKeywords: number;
  totalTraffic: number;
}
