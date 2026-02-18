/**
 * Shopify Pages API Service
 *
 * Comprehensive service for managing Shopify pages via REST Admin API 2026-01
 *
 * Features:
 * - Create pages with full metadata
 * - Update existing pages
 * - Get all pages with filtering
 * - Delete pages
 * - Add metafields (schema markup, custom data)
 * - Automatic slug generation (handle)
 * - Rate limit handling
 *
 * Use Cases:
 * - Q&A content pages
 * - Landing pages
 * - Educational content
 * - Resource pages
 */

import axios, { AxiosInstance } from 'axios';
import {
  ShopifyPage,
  ShopifyMetafield,
  CreatePageInput,
  UpdatePageInput,
  APIError,
  AuthenticationError,
  RateLimitError,
} from '../types/external-apis.types';
import { RetryHelper, CircuitBreaker } from '../utils/retry-helper';

export interface ShopifyPagesServiceConfig {
  shopDomain: string;
  accessToken: string;
  apiVersion?: string;
}

export interface PageFilters {
  limit?: number;
  sinceId?: string;
  title?: string;
  handle?: string;
  createdAtMin?: string;
  createdAtMax?: string;
  updatedAtMin?: string;
  updatedAtMax?: string;
  publishedAtMin?: string;
  publishedAtMax?: string;
  publishedStatus?: 'published' | 'unpublished' | 'any';
}

export class ShopifyPagesService {
  private readonly client: AxiosInstance;
  private readonly shopDomain: string;
  private readonly accessToken: string;
  private readonly apiVersion: string;
  private readonly retryHelper: RetryHelper;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(config: ShopifyPagesServiceConfig) {
    this.shopDomain = config.shopDomain;
    this.accessToken = config.accessToken;
    this.apiVersion = config.apiVersion || '2026-01';

    const baseURL = `https://${this.shopDomain}/admin/api/${this.apiVersion}`;

    this.client = axios.create({
      baseURL,
      headers: {
        'X-Shopify-Access-Token': this.accessToken,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds
    });

    this.retryHelper = new RetryHelper({
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      retryableStatusCodes: [408, 429, 500, 502, 503, 504],
    });

    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeoutMs: 60000,
    });

    this.setupRateLimitInterceptor();
  }

  // ============================================================================
  // PAGE CRUD OPERATIONS
  // ============================================================================

  /**
   * Create a new page
   */
  async createPage(input: CreatePageInput): Promise<ShopifyPage> {
    console.log(`[ShopifyPages] Creating page: "${input.title}"`);

    // Generate handle (slug) from title if not provided
    const handle = input.handle || this.generateHandle(input.title);

    const page = {
      title: input.title,
      body_html: input.bodyHtml,
      handle,
      published: input.published !== false, // Default to true
    };

    // Add optional fields
    if (input.publishedAt) {
      (page as any).published_at = input.publishedAt;
    }

    if (input.author) {
      (page as any).author = input.author;
    }

    if (input.templateSuffix) {
      (page as any).template_suffix = input.templateSuffix;
    }

    const response = await this.executeRequest<{ page: ShopifyPage }>(
      'POST',
      '/pages.json',
      { page },
      'createPage'
    );

    const createdPage = response.page;

    // Add metafields if provided
    if (input.metafields && input.metafields.length > 0) {
      await this.addMetafieldsToPage(createdPage.id, input.metafields);
    }

    console.log(`[ShopifyPages] Created page: ${createdPage.id} - "${createdPage.title}"`);

    return createdPage;
  }

  /**
   * Update an existing page
   */
  async updatePage(pageId: string, input: UpdatePageInput): Promise<ShopifyPage> {
    console.log(`[ShopifyPages] Updating page ${pageId}`);

    const updateData: any = {};

    if (input.title) updateData.title = input.title;
    if (input.bodyHtml) updateData.body_html = input.bodyHtml;
    if (input.handle) updateData.handle = input.handle;
    if (input.published !== undefined) updateData.published = input.published;
    if (input.publishedAt) updateData.published_at = input.publishedAt;
    if (input.author) updateData.author = input.author;
    if (input.templateSuffix) updateData.template_suffix = input.templateSuffix;

    const response = await this.executeRequest<{ page: ShopifyPage }>(
      'PUT',
      `/pages/${pageId}.json`,
      { page: updateData },
      'updatePage'
    );

    const updatedPage = response.page;

    // Update metafields if provided
    if (input.metafields && input.metafields.length > 0) {
      await this.addMetafieldsToPage(pageId, input.metafields);
    }

    console.log(`[ShopifyPages] Updated page: ${updatedPage.id}`);

    return updatedPage;
  }

  /**
   * Get all pages
   */
  async getPages(filters?: PageFilters): Promise<ShopifyPage[]> {
    console.log('[ShopifyPages] Fetching pages');

    const params: any = {
      limit: filters?.limit || 250, // Max 250
    };

    if (filters?.sinceId) params.since_id = filters.sinceId;
    if (filters?.title) params.title = filters.title;
    if (filters?.handle) params.handle = filters.handle;
    if (filters?.createdAtMin) params.created_at_min = filters.createdAtMin;
    if (filters?.createdAtMax) params.created_at_max = filters.createdAtMax;
    if (filters?.updatedAtMin) params.updated_at_min = filters.updatedAtMin;
    if (filters?.updatedAtMax) params.updated_at_max = filters.updatedAtMax;
    if (filters?.publishedAtMin) params.published_at_min = filters.publishedAtMin;
    if (filters?.publishedAtMax) params.published_at_max = filters.publishedAtMax;
    if (filters?.publishedStatus) params.published_status = filters.publishedStatus;

    const response = await this.executeRequest<{ pages: ShopifyPage[] }>(
      'GET',
      '/pages.json',
      undefined,
      'getPages',
      params
    );

    return response.pages || [];
  }

  /**
   * Get a single page by ID
   */
  async getPageById(pageId: string): Promise<ShopifyPage> {
    console.log(`[ShopifyPages] Fetching page ${pageId}`);

    const response = await this.executeRequest<{ page: ShopifyPage }>(
      'GET',
      `/pages/${pageId}.json`,
      undefined,
      'getPageById'
    );

    return response.page;
  }

  /**
   * Get a page by handle (slug)
   */
  async getPageByHandle(handle: string): Promise<ShopifyPage | null> {
    console.log(`[ShopifyPages] Fetching page by handle: ${handle}`);

    const pages = await this.getPages({ handle, limit: 1 });

    return pages.length > 0 ? pages[0] : null;
  }

  /**
   * Delete a page
   */
  async deletePage(pageId: string): Promise<void> {
    console.log(`[ShopifyPages] Deleting page ${pageId}`);

    await this.executeRequest<void>(
      'DELETE',
      `/pages/${pageId}.json`,
      undefined,
      'deletePage'
    );

    console.log(`[ShopifyPages] Deleted page ${pageId}`);
  }

  /**
   * Get page count
   */
  async getPageCount(filters?: PageFilters): Promise<number> {
    const params: any = {};

    if (filters?.title) params.title = filters.title;
    if (filters?.createdAtMin) params.created_at_min = filters.createdAtMin;
    if (filters?.createdAtMax) params.created_at_max = filters.createdAtMax;
    if (filters?.updatedAtMin) params.updated_at_min = filters.updatedAtMin;
    if (filters?.updatedAtMax) params.updated_at_max = filters.updatedAtMax;
    if (filters?.publishedAtMin) params.published_at_min = filters.publishedAtMin;
    if (filters?.publishedAtMax) params.published_at_max = filters.publishedAtMax;
    if (filters?.publishedStatus) params.published_status = filters.publishedStatus;

    const response = await this.executeRequest<{ count: number }>(
      'GET',
      '/pages/count.json',
      undefined,
      'getPageCount',
      params
    );

    return response.count;
  }

  // ============================================================================
  // METAFIELDS (SCHEMA MARKUP, CUSTOM DATA)
  // ============================================================================

  /**
   * Add metafields to a page (for schema markup, etc.)
   */
  async addMetafieldsToPage(
    pageId: string,
    metafields: ShopifyMetafield[]
  ): Promise<void> {
    console.log(`[ShopifyPages] Adding ${metafields.length} metafields to page ${pageId}`);

    for (const metafield of metafields) {
      const metafieldData = {
        namespace: metafield.namespace,
        key: metafield.key,
        value: metafield.value,
        type: metafield.type || 'json_string',
      };

      if (metafield.description) {
        (metafieldData as any).description = metafield.description;
      }

      await this.executeRequest<{ metafield: ShopifyMetafield }>(
        'POST',
        `/pages/${pageId}/metafields.json`,
        { metafield: metafieldData },
        'addMetafield'
      );
    }

    console.log(`[ShopifyPages] Added metafields to page ${pageId}`);
  }

  /**
   * Get metafields for a page
   */
  async getPageMetafields(pageId: string): Promise<ShopifyMetafield[]> {
    const response = await this.executeRequest<{ metafields: ShopifyMetafield[] }>(
      'GET',
      `/pages/${pageId}/metafields.json`,
      undefined,
      'getPageMetafields'
    );

    return response.metafields || [];
  }

  /**
   * Update a metafield
   */
  async updateMetafield(
    metafieldId: string,
    value: string,
    type?: string
  ): Promise<ShopifyMetafield> {
    const updateData: any = { value };
    if (type) updateData.type = type;

    const response = await this.executeRequest<{ metafield: ShopifyMetafield }>(
      'PUT',
      `/metafields/${metafieldId}.json`,
      { metafield: updateData },
      'updateMetafield'
    );

    return response.metafield;
  }

  /**
   * Delete a metafield
   */
  async deleteMetafield(metafieldId: string): Promise<void> {
    await this.executeRequest<void>(
      'DELETE',
      `/metafields/${metafieldId}.json`,
      undefined,
      'deleteMetafield'
    );
  }

  // ============================================================================
  // BATCH OPERATIONS
  // ============================================================================

  /**
   * Get all pages (handles pagination automatically)
   */
  async getAllPages(): Promise<ShopifyPage[]> {
    console.log('[ShopifyPages] Fetching all pages (with pagination)');

    let allPages: ShopifyPage[] = [];
    let lastId: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const pages = await this.getPages({
        limit: 250,
        sinceId: lastId,
      });

      allPages = allPages.concat(pages);

      if (pages.length < 250) {
        hasMore = false;
      } else {
        lastId = pages[pages.length - 1].id;
      }
    }

    console.log(`[ShopifyPages] Fetched ${allPages.length} total pages`);

    return allPages;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Generate URL-friendly handle (slug) from title
   */
  private generateHandle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Remove consecutive hyphens
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Setup rate limit handling interceptor
   */
  private setupRateLimitInterceptor(): void {
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 429) {
          const retryAfter = parseInt(error.response.headers['retry-after'] || '2', 10);
          console.warn(`[ShopifyPages] Rate limited. Retry after ${retryAfter}s`);
          throw new RateLimitError('shopify', retryAfter * 1000, error);
        }
        return Promise.reject(error);
      }
    );
  }

  // ============================================================================
  // REQUEST EXECUTION
  // ============================================================================

  private async executeRequest<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    operationName?: string,
    params?: any
  ): Promise<T> {
    return this.retryHelper.executeWithRetry(
      async () => {
        try {
          const config: any = { method, url: endpoint };

          if (params) config.params = params;
          if (data) config.data = data;

          const response = await this.client.request<T>(config);

          return response.data;
        } catch (error: any) {
          if (axios.isAxiosError(error)) {
            const status = error.response?.status || 500;

            if (status === 401 || status === 403) {
              throw new AuthenticationError('shopify', error);
            }

            if (status === 429) {
              throw new RateLimitError(
                'shopify',
                parseInt(error.response?.headers['retry-after'] || '2', 10) * 1000,
                error
              );
            }

            throw new APIError(
              error.response?.data?.errors || error.message,
              status,
              'shopify',
              error
            );
          }

          throw error;
        }
      },
      `ShopifyPages.${operationName || method}`,
      this.circuitBreaker
    );
  }

  /**
   * Get circuit breaker stats
   */
  getCircuitBreakerStats() {
    return this.circuitBreaker.getStats();
  }
}

/**
 * Factory function to create Shopify Pages service
 */
export function createShopifyPagesService(config: {
  shopDomain: string;
  accessToken: string;
}): ShopifyPagesService {
  return new ShopifyPagesService(config);
}
