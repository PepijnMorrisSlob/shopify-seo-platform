// API Type Definitions for Shopify SEO Platform
// Coordinates with backend API types (from Backend Specialist)

export interface Product {
  id: string;
  shopifyId: string;
  title: string;
  handle: string;
  description?: string;
  vendor?: string;
  productType?: string;
  tags: string[];
  status: 'active' | 'draft' | 'archived';
  variants: ProductVariant[];
  images: ProductImage[];
  seoScore: number;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
}

export interface ProductVariant {
  id: string;
  title: string;
  price: string;
  sku?: string;
  inventoryQuantity: number;
}

export interface ProductImage {
  id: string;
  src: string;
  altText?: string;
  position: number;
}

export interface ContentGeneration {
  id: string;
  productId: string;
  aiModel: AIModel;
  status: ContentGenerationStatus;
  variants: ContentVariant[];
  selectedVariantId?: string;
  publishedAt?: string;
  createdAt: string;
  organizationId: string;
}

export type AIModel = 'gpt-3.5-turbo' | 'gpt-4' | 'gpt-4-turbo' | 'claude-3-haiku' | 'claude-3-sonnet' | 'claude-3-opus';

export type ContentGenerationStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'published';

export interface ContentVariant {
  id: string;
  metaTitle: string;
  metaDescription: string;
  qualityScore: number;
  reasoning: string;
}

export interface AnalyticsData {
  productId: string;
  productTitle: string;
  metrics: {
    impressions: number;
    clicks: number;
    ctr: number;
    avgPosition: number;
  };
  dateRange: {
    start: string;
    end: string;
  };
  timeSeriesData: TimeSeriesDataPoint[];
}

export interface TimeSeriesDataPoint {
  date: string;
  impressions: number;
  clicks: number;
  ctr: number;
  avgPosition: number;
}

export interface Organization {
  id: string;
  shopDomain: string;
  shopifyAccessToken?: string; // Encrypted on backend
  planName: string;
  trialEndsAt?: string;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  organizationId: string;
}

export type UserRole = 'owner' | 'admin' | 'member';

// API Request/Response types
export interface GenerateContentRequest {
  productIds: string[];
  aiModel: AIModel;
  numberOfVariants?: number; // Default 3
}

export interface GenerateContentResponse {
  contentGenerations: ContentGeneration[];
}

export interface PublishContentRequest {
  contentGenerationId: string;
  variantId: string;
}

export interface PublishContentResponse {
  success: boolean;
  productId: string;
  publishedAt: string;
}

export interface SyncProductsRequest {
  forceFullSync?: boolean;
}

export interface SyncProductsResponse {
  syncedCount: number;
  newCount: number;
  updatedCount: number;
}

export interface GetAnalyticsRequest {
  productIds?: string[];
  startDate: string;
  endDate: string;
}

export interface GetAnalyticsResponse {
  analytics: AnalyticsData[];
}

// Error types
export interface APIError {
  statusCode: number;
  message: string;
  error: string;
  details?: Record<string, unknown>;
}
