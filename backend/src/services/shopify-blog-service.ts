/**
 * Shopify Blog API Service
 *
 * Comprehensive service for managing Shopify blog posts via GraphQL Admin API 2026-01
 *
 * Features:
 * - Create blog posts with full metadata
 * - Update existing blog posts
 * - Get all blog posts with filtering
 * - Delete blog posts
 * - Add metafields (schema markup, custom data)
 * - Handle blog post images
 * - Automatic slug generation (handle)
 * - Rate limit handling (Shopify GraphQL cost-based)
 *
 * Cost Tracking:
 * - Blog post creation: ~10 points
 * - Blog post update: ~10 points
 * - Blog post query: ~5 points
 * - Metafield operations: ~2 points each
 *
 * Shopify Blog API uses REST Admin API, not GraphQL
 */

import axios, { AxiosInstance } from 'axios';
import {
  ShopifyBlog,
  ShopifyBlogPost,
  ShopifyMetafield,
  CreateBlogPostInput,
  UpdateBlogPostInput,
  APIError,
  AuthenticationError,
  RateLimitError,
} from '../types/external-apis.types';
import { RetryHelper, CircuitBreaker } from '../utils/retry-helper';

export interface ShopifyBlogServiceConfig {
  shopDomain: string;
  accessToken: string;
  apiVersion?: string;
}

export interface BlogPostFilters {
  status?: 'published' | 'draft' | 'any';
  limit?: number;
  sinceId?: string;
  createdAtMin?: string;
  createdAtMax?: string;
  updatedAtMin?: string;
  updatedAtMax?: string;
  publishedAtMin?: string;
  publishedAtMax?: string;
  tags?: string;
}

export class ShopifyBlogService {
  private readonly client: AxiosInstance;
  private readonly shopDomain: string;
  private readonly accessToken: string;
  private readonly apiVersion: string;
  private readonly retryHelper: RetryHelper;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(config: ShopifyBlogServiceConfig) {
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
  // BLOG MANAGEMENT
  // ============================================================================

  /**
   * Get all blogs (a shop can have multiple blogs)
   */
  async getBlogs(): Promise<ShopifyBlog[]> {
    console.log('[ShopifyBlog] Fetching all blogs');

    const response = await this.executeRequest<{ blogs: ShopifyBlog[] }>(
      'GET',
      '/blogs.json',
      undefined,
      'getBlogs'
    );

    return response.blogs;
  }

  /**
   * Get default blog (usually "News" or first blog)
   */
  async getDefaultBlog(): Promise<ShopifyBlog> {
    const blogs = await this.getBlogs();

    if (blogs.length === 0) {
      throw new APIError('No blogs found in this Shopify store', 404, 'shopify');
    }

    // Return first blog as default
    return blogs[0];
  }

  /**
   * Get blog by ID
   */
  async getBlogById(blogId: string): Promise<ShopifyBlog> {
    console.log(`[ShopifyBlog] Fetching blog ${blogId}`);

    const response = await this.executeRequest<{ blog: ShopifyBlog }>(
      'GET',
      `/blogs/${blogId}.json`,
      undefined,
      'getBlogById'
    );

    return response.blog;
  }

  // ============================================================================
  // BLOG POST CRUD OPERATIONS
  // ============================================================================

  /**
   * Create a new blog post
   */
  async createBlogPost(
    blogId: string,
    input: CreateBlogPostInput
  ): Promise<ShopifyBlogPost> {
    console.log(`[ShopifyBlog] Creating blog post: "${input.title}"`);

    // Generate handle (slug) from title if not provided
    const handle = input.handle || this.generateHandle(input.title);

    const blogPost = {
      title: input.title,
      body_html: input.bodyHtml,
      author: input.author || 'Shopify SEO Platform',
      tags: input.tags ? input.tags.join(', ') : '',
      published: input.published !== false, // Default to true
      handle,
      summary_html: input.summary,
    };

    // Add published_at if specified
    if (input.publishedAt) {
      (blogPost as any).published_at = input.publishedAt;
    }

    // Add image if provided
    if (input.image) {
      (blogPost as any).image = input.image;
    }

    const response = await this.executeRequest<{ article: ShopifyBlogPost }>(
      'POST',
      `/blogs/${blogId}/articles.json`,
      { article: blogPost },
      'createBlogPost'
    );

    const createdPost = response.article;

    // Add metafields if provided
    if (input.metafields && input.metafields.length > 0) {
      await this.addMetafieldsToBlogPost(createdPost.id, input.metafields);
    }

    console.log(`[ShopifyBlog] Created blog post: ${createdPost.id} - "${createdPost.title}"`);

    return createdPost;
  }

  /**
   * Update an existing blog post
   */
  async updateBlogPost(
    blogId: string,
    articleId: string,
    input: UpdateBlogPostInput
  ): Promise<ShopifyBlogPost> {
    console.log(`[ShopifyBlog] Updating blog post ${articleId}`);

    const updateData: any = {};

    if (input.title) updateData.title = input.title;
    if (input.bodyHtml) updateData.body_html = input.bodyHtml;
    if (input.author) updateData.author = input.author;
    if (input.tags) updateData.tags = input.tags.join(', ');
    if (input.published !== undefined) updateData.published = input.published;
    if (input.publishedAt) updateData.published_at = input.publishedAt;
    if (input.handle) updateData.handle = input.handle;
    if (input.summary) updateData.summary_html = input.summary;
    if (input.image) updateData.image = input.image;

    const response = await this.executeRequest<{ article: ShopifyBlogPost }>(
      'PUT',
      `/blogs/${blogId}/articles/${articleId}.json`,
      { article: updateData },
      'updateBlogPost'
    );

    const updatedPost = response.article;

    // Update metafields if provided
    if (input.metafields && input.metafields.length > 0) {
      await this.addMetafieldsToBlogPost(articleId, input.metafields);
    }

    console.log(`[ShopifyBlog] Updated blog post: ${updatedPost.id}`);

    return updatedPost;
  }

  /**
   * Get all blog posts for a blog
   */
  async getBlogPosts(
    blogId: string,
    filters?: BlogPostFilters
  ): Promise<ShopifyBlogPost[]> {
    console.log(`[ShopifyBlog] Fetching blog posts for blog ${blogId}`);

    const params: any = {
      limit: filters?.limit || 250, // Max 250
    };

    if (filters?.status) params.status = filters.status;
    if (filters?.sinceId) params.since_id = filters.sinceId;
    if (filters?.createdAtMin) params.created_at_min = filters.createdAtMin;
    if (filters?.createdAtMax) params.created_at_max = filters.createdAtMax;
    if (filters?.updatedAtMin) params.updated_at_min = filters.updatedAtMin;
    if (filters?.updatedAtMax) params.updated_at_max = filters.updatedAtMax;
    if (filters?.publishedAtMin) params.published_at_min = filters.publishedAtMin;
    if (filters?.publishedAtMax) params.published_at_max = filters.publishedAtMax;
    if (filters?.tags) params.tags = filters.tags;

    const response = await this.executeRequest<{ articles: ShopifyBlogPost[] }>(
      'GET',
      `/blogs/${blogId}/articles.json`,
      undefined,
      'getBlogPosts',
      params
    );

    return response.articles || [];
  }

  /**
   * Get a single blog post by ID
   */
  async getBlogPostById(
    blogId: string,
    articleId: string
  ): Promise<ShopifyBlogPost> {
    console.log(`[ShopifyBlog] Fetching blog post ${articleId}`);

    const response = await this.executeRequest<{ article: ShopifyBlogPost }>(
      'GET',
      `/blogs/${blogId}/articles/${articleId}.json`,
      undefined,
      'getBlogPostById'
    );

    return response.article;
  }

  /**
   * Delete a blog post
   */
  async deleteBlogPost(blogId: string, articleId: string): Promise<void> {
    console.log(`[ShopifyBlog] Deleting blog post ${articleId}`);

    await this.executeRequest<void>(
      'DELETE',
      `/blogs/${blogId}/articles/${articleId}.json`,
      undefined,
      'deleteBlogPost'
    );

    console.log(`[ShopifyBlog] Deleted blog post ${articleId}`);
  }

  /**
   * Get blog post count
   */
  async getBlogPostCount(blogId: string, filters?: BlogPostFilters): Promise<number> {
    const params: any = {};

    if (filters?.status) params.status = filters.status;
    if (filters?.createdAtMin) params.created_at_min = filters.createdAtMin;
    if (filters?.createdAtMax) params.created_at_max = filters.createdAtMax;
    if (filters?.updatedAtMin) params.updated_at_min = filters.updatedAtMin;
    if (filters?.updatedAtMax) params.updated_at_max = filters.updatedAtMax;
    if (filters?.publishedAtMin) params.published_at_min = filters.publishedAtMin;
    if (filters?.publishedAtMax) params.published_at_max = filters.publishedAtMax;

    const response = await this.executeRequest<{ count: number }>(
      'GET',
      `/blogs/${blogId}/articles/count.json`,
      undefined,
      'getBlogPostCount',
      params
    );

    return response.count;
  }

  // ============================================================================
  // METAFIELDS (SCHEMA MARKUP, CUSTOM DATA)
  // ============================================================================

  /**
   * Add metafields to a blog post (for schema markup, etc.)
   */
  async addMetafieldsToBlogPost(
    articleId: string,
    metafields: ShopifyMetafield[]
  ): Promise<void> {
    console.log(`[ShopifyBlog] Adding ${metafields.length} metafields to blog post ${articleId}`);

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
        `/articles/${articleId}/metafields.json`,
        { metafield: metafieldData },
        'addMetafield'
      );
    }

    console.log(`[ShopifyBlog] Added metafields to blog post ${articleId}`);
  }

  /**
   * Get metafields for a blog post
   */
  async getBlogPostMetafields(articleId: string): Promise<ShopifyMetafield[]> {
    const response = await this.executeRequest<{ metafields: ShopifyMetafield[] }>(
      'GET',
      `/articles/${articleId}/metafields.json`,
      undefined,
      'getBlogPostMetafields'
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
          console.warn(`[ShopifyBlog] Rate limited. Retry after ${retryAfter}s`);
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
      `ShopifyBlog.${operationName || method}`,
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
 * Factory function to create Shopify Blog service
 */
export function createShopifyBlogService(config: {
  shopDomain: string;
  accessToken: string;
}): ShopifyBlogService {
  return new ShopifyBlogService(config);
}
