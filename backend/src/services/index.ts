/**
 * Services Index
 *
 * Central export point for all API integration services
 */

// Shopify Integration
export {
  ShopifyIntegrationService,
  createShopifyClient,
} from './shopify-integration-service';

// Google Search Console
export {
  GoogleSearchConsoleService,
  createGoogleSearchConsoleClient,
} from './google-search-console-service';

// DataForSEO
export {
  DataForSEOService,
  createDataForSEOClient,
  DATAFORSEO_LOCATIONS,
} from './dataforseo-service';

// SEMrush
export {
  SEMrushService,
  createSEMrushClient,
  SEMRUSH_DATABASES,
} from './semrush-service';

// Shopify Blog
export {
  ShopifyBlogService,
  createShopifyBlogService,
} from './shopify-blog-service';

// Shopify Pages
export {
  ShopifyPagesService,
  createShopifyPagesService,
} from './shopify-pages-service';

// Perplexity AI Research
export {
  PerplexityService,
  // createPerplexityService, // Not exported from perplexity-service
} from './perplexity-service';

// Webhook Handler
export {
  WebhookHandlerService,
  createWebhookHandler,
  webhookValidationMiddleware,
} from './webhook-handler-service';

// Re-export types for convenience
export type {
  ShopifyProduct,
  ShopifyBulkOperation,
  ShopifyWebhook,
  ShopifyWebhookTopic,
  ShopifyBlog,
  ShopifyBlogPost,
  ShopifyPage,
  ShopifyMetafield,
  CreateBlogPostInput,
  UpdateBlogPostInput,
  CreatePageInput,
  UpdatePageInput,
  GSCAuthTokens,
  GSCPerformanceData,
  GSCTopQuery,
  GSCTopPage,
  DataForSEOKeywordData,
  DataForSEOSERPResult,
  DataForSEOPAAQuestion,
  DataForSEORelatedSearch,
  DataForSEOCompetitorContent,
  PerplexityResearchResult,
  PerplexityClaimVerification,
  PerplexityResearchOptions,
  SEMrushDomainOverview,
  SEMrushKeyword,
  SEMrushCompetitorKeyword,
  SEMrushBacklink,
  // WebhookEvent, // Not exported from external-apis.types
} from '../types/external-apis.types';
