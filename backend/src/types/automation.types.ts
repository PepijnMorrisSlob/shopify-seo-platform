/**
 * Automation and Queue Types
 * For Shopify SEO Platform - Workflow/Automation Services
 */

export interface PublishResult {
  success: boolean;
  productId: string;
  publishedAt?: Date;
  error?: string;
  shopifyProductId?: string;
}

export interface ScheduledJob {
  id: string;
  productId: string;
  organizationId: string;
  content: GeneratedContent;
  publishAt: Date;
  status: 'scheduled' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface GeneratedContent {
  metaTitle: string;
  metaDescription: string;
  schemaMarkup?: string;
  internalLinks?: InternalLink[];
  qualityScore?: number;
}

export interface InternalLink {
  url: string;
  anchorText: string;
  position?: number;
}

export interface BulkJobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  progress: number; // percentage
  startedAt?: Date;
  completedAt?: Date;
  errors?: BulkJobError[];
}

export interface BulkJobError {
  itemId: string;
  error: string;
  timestamp: Date;
}

export interface ShopifyWebhook {
  id: string;
  topic: string;
  shop_domain: string;
  payload: any;
  received_at: Date;
}

export interface WebhookProcessResult {
  success: boolean;
  webhookId: string;
  action: 'created' | 'updated' | 'deleted' | 'app_uninstalled';
  error?: string;
}

export type SchemaType = 'Product' | 'FAQ' | 'BreadcrumbList';

export interface QueueJob {
  id: string;
  name: string;
  data: any;
  opts?: QueueJobOptions;
}

export interface QueueJobOptions {
  attempts?: number;
  backoff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
  delay?: number;
  priority?: number;
  removeOnComplete?: boolean;
  removeOnFail?: boolean;
}

export interface ContentGenerationJobData {
  productId: string;
  organizationId: string;
  aiModel: string;
  productData: {
    title: string;
    description: string;
    vendor: string;
    product_type: string;
  };
}

export interface QAContentGenerationJobData {
  qaPageId: string;
  organizationId: string;
  question: string;
  targetKeyword?: string;
}

export interface PublishingJobData {
  productId: string;
  organizationId: string;
  metaTitle: string;
  metaDescription: string;
  schemaMarkup?: string;
}

export interface WebhookJobData {
  webhookId: string;
  topic: string;
  shopDomain: string;
  payload: any;
}

export interface BulkOperationJobData {
  bulkJobId: string;
  organizationId: string;
  operation: 'generate' | 'publish';
  items: Array<{
    productId: string;
    data?: any;
  }>;
}
