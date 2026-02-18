/**
 * DataForSEO API Integration Service
 *
 * Pay-as-you-go pricing model
 *
 * Features:
 * - Keyword research (search volume, difficulty, CPC)
 * - SERP analysis (top 100 positions)
 * - Keyword suggestions (related keywords)
 * - Multiple location support
 * - Historical search volume data
 * - Cost tracking
 *
 * API Costs:
 * - Keyword data: $0.15 per 100 keywords
 * - SERP data: $0.30 per request
 * - Keyword suggestions: $0.05 per request
 *
 * No hard rate limits but costs add up quickly
 */

import axios, { AxiosInstance } from 'axios';
import {
  DataForSEOCredentials,
  DataForSEOKeywordData,
  DataForSEOKeywordRequest,
  DataForSEOSERPRequest,
  DataForSEOSERPResult,
  DataForSEOKeywordSuggestion,
  DataForSEOResponse,
  DataForSEOPAAQuestion,
  DataForSEORelatedSearch,
  DataForSEOCompetitorContent,
  APIError,
  AuthenticationError,
} from '../types/external-apis.types';
import { RetryHelper, CircuitBreaker } from '../utils/retry-helper';

export interface DataForSEOClientConfig {
  login: string;
  password: string;
  baseUrl?: string;
}

export class DataForSEOService {
  private readonly client: AxiosInstance;
  private readonly credentials: DataForSEOCredentials;
  private readonly retryHelper: RetryHelper;
  private readonly circuitBreaker: CircuitBreaker;
  private totalCost: number = 0;

  constructor(config: DataForSEOClientConfig) {
    this.credentials = {
      login: config.login,
      password: config.password,
    };

    const baseUrl = config.baseUrl || 'https://api.dataforseo.com';

    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      auth: {
        username: this.credentials.login,
        password: this.credentials.password,
      },
      timeout: 60000, // 60 seconds
    });

    this.retryHelper = new RetryHelper({
      maxAttempts: 3,
      initialDelayMs: 2000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      retryableStatusCodes: [408, 429, 500, 502, 503, 504],
    });

    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeoutMs: 60000,
    });
  }

  // ============================================================================
  // KEYWORD RESEARCH
  // ============================================================================

  /**
   * Get keyword data (search volume, CPC, competition)
   */
  async getKeywordData(
    keywords: string[],
    locationCode: number = 2840, // USA by default
    languageCode: string = 'en'
  ): Promise<DataForSEOKeywordData[]> {
    console.log(
      `[DataForSEO] Fetching keyword data for ${keywords.length} keywords (location: ${locationCode})`
    );

    const request: DataForSEOKeywordRequest = {
      keywords,
      location_code: locationCode,
      language_code: languageCode,
      include_serp_info: true,
      include_clickstream_data: false,
    };

    const response = await this.executeRequest<DataForSEOKeywordData[]>(
      '/v3/keywords_data/google_ads/search_volume/live',
      [request],
      'getKeywordData'
    );

    return response;
  }

  /**
   * Get keyword data for a single keyword
   */
  async getSingleKeywordData(
    keyword: string,
    locationCode: number = 2840,
    languageCode: string = 'en'
  ): Promise<DataForSEOKeywordData | null> {
    const results = await this.getKeywordData([keyword], locationCode, languageCode);
    return results[0] || null;
  }

  /**
   * Batch keyword data requests (optimized for large volumes)
   */
  async batchGetKeywordData(
    keywords: string[],
    locationCode: number = 2840,
    languageCode: string = 'en',
    batchSize: number = 100
  ): Promise<DataForSEOKeywordData[]> {
    console.log(
      `[DataForSEO] Batch fetching keyword data for ${keywords.length} keywords in batches of ${batchSize}`
    );

    const allResults: DataForSEOKeywordData[] = [];
    const batches: string[][] = [];

    // Split into batches
    for (let i = 0; i < keywords.length; i += batchSize) {
      batches.push(keywords.slice(i, i + batchSize));
    }

    // Process batches sequentially to avoid overwhelming the API
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(
        `[DataForSEO] Processing batch ${i + 1}/${batches.length} (${batch.length} keywords)`
      );

      const results = await this.getKeywordData(batch, locationCode, languageCode);
      allResults.push(...results);

      // Add delay between batches to be respectful of API
      if (i < batches.length - 1) {
        await this.sleep(1000); // 1 second delay
      }
    }

    return allResults;
  }

  // ============================================================================
  // SERP ANALYSIS
  // ============================================================================

  /**
   * Get SERP results for a keyword
   */
  async getSERPData(
    keyword: string,
    locationCode: number = 2840,
    languageCode: string = 'en',
    device: 'desktop' | 'mobile' = 'desktop',
    depth: number = 100
  ): Promise<DataForSEOSERPResult> {
    console.log(`[DataForSEO] Fetching SERP data for keyword: "${keyword}"`);

    const request: DataForSEOSERPRequest = {
      keyword,
      location_code: locationCode,
      language_code: languageCode,
      device,
      depth: Math.min(depth, 700), // Max 700
    };

    const response = await this.executeRequest<DataForSEOSERPResult[]>(
      '/v3/serp/google/organic/live/advanced',
      [request],
      'getSERPData'
    );

    return response[0];
  }

  /**
   * Get top ranking URLs for a keyword
   */
  async getTopRankingURLs(
    keyword: string,
    limit: number = 10,
    locationCode: number = 2840
  ): Promise<
    Array<{
      position: number;
      url: string;
      title: string;
      domain: string;
    }>
  > {
    const serpData = await this.getSERPData(keyword, locationCode, 'en', 'desktop', limit);

    return serpData.items
      .filter((item) => item.type === 'organic')
      .slice(0, limit)
      .map((item) => ({
        position: item.rank_absolute,
        url: item.url,
        title: item.title,
        domain: item.domain,
      }));
  }

  // ============================================================================
  // KEYWORD SUGGESTIONS
  // ============================================================================

  /**
   * Get keyword suggestions (related keywords)
   */
  async getKeywordSuggestions(
    seed: string,
    locationCode: number = 2840,
    languageCode: string = 'en',
    limit: number = 100
  ): Promise<DataForSEOKeywordSuggestion[]> {
    console.log(`[DataForSEO] Getting keyword suggestions for: "${seed}"`);

    const request = {
      keyword: seed,
      location_code: locationCode,
      language_code: languageCode,
      include_seed_keyword: false,
      limit,
    };

    const response = await this.executeRequest<any[]>(
      '/v3/keywords_data/google_ads/keywords_for_keywords/live',
      [request],
      'getKeywordSuggestions'
    );

    const result = response[0];

    if (!result || !result.items) {
      return [];
    }

    return result.items.map(
      (item: any): DataForSEOKeywordSuggestion => ({
        keyword: item.keyword,
        search_volume: item.keyword_info?.search_volume || 0,
        competition: item.keyword_info?.competition || 0,
        cpc: item.keyword_info?.cpc || 0,
      })
    );
  }

  /**
   * Get related keywords with search volume
   */
  async getRelatedKeywords(
    keyword: string,
    locationCode: number = 2840,
    minSearchVolume: number = 100
  ): Promise<DataForSEOKeywordSuggestion[]> {
    const suggestions = await this.getKeywordSuggestions(keyword, locationCode, 'en', 1000);

    // Filter by minimum search volume and sort by volume descending
    return suggestions
      .filter((s) => s.search_volume >= minSearchVolume)
      .sort((a, b) => b.search_volume - a.search_volume);
  }

  // ============================================================================
  // PEOPLE ALSO ASK (PAA) - NEW FOR Q&A CONTENT ENGINE
  // ============================================================================

  /**
   * Get "People Also Ask" questions from Google SERP
   */
  async getPeopleAlsoAsk(
    keyword: string,
    locationCode: number = 2840,
    languageCode: string = 'en'
  ): Promise<DataForSEOPAAQuestion[]> {
    console.log(`[DataForSEO] Getting People Also Ask questions for: "${keyword}"`);

    const serpData = await this.getSERPData(keyword, locationCode, languageCode, 'desktop', 100);

    // Extract PAA questions from SERP items
    const paaItems = serpData.items.filter((item) => item.type === 'people_also_ask');

    if (paaItems.length === 0) {
      console.log(`[DataForSEO] No PAA questions found for: "${keyword}"`);
      return [];
    }

    const paaQuestions: DataForSEOPAAQuestion[] = [];

    for (const paaItem of paaItems) {
      // PAA items contain nested questions
      if ((paaItem as any).items && Array.isArray((paaItem as any).items)) {
        for (const question of (paaItem as any).items) {
          paaQuestions.push({
            question: question.title || question.question || '',
            answer: question.expanded_element?.[0]?.description || question.answer,
            url: question.url,
            domain: question.domain,
            position: question.rank_absolute || paaQuestions.length + 1,
          });
        }
      }
    }

    console.log(`[DataForSEO] Found ${paaQuestions.length} PAA questions for: "${keyword}"`);

    return paaQuestions;
  }

  /**
   * Get related searches from Google SERP
   */
  async getRelatedSearches(
    keyword: string,
    locationCode: number = 2840,
    languageCode: string = 'en'
  ): Promise<DataForSEORelatedSearch[]> {
    console.log(`[DataForSEO] Getting related searches for: "${keyword}"`);

    const serpData = await this.getSERPData(keyword, locationCode, languageCode, 'desktop', 100);

    // Extract related searches
    const relatedItems = serpData.items.filter(
      (item) => item.type === 'related_searches' || item.type === 'people_also_search'
    );

    const relatedSearches: DataForSEORelatedSearch[] = [];

    for (const item of relatedItems) {
      if ((item as any).items && Array.isArray((item as any).items)) {
        for (const search of (item as any).items) {
          relatedSearches.push({
            keyword: search.title || search.keyword || '',
            position: search.rank_absolute || relatedSearches.length + 1,
          });
        }
      }
    }

    console.log(
      `[DataForSEO] Found ${relatedSearches.length} related searches for: "${keyword}"`
    );

    return relatedSearches;
  }

  /**
   * Batch get PAA questions for multiple keywords
   */
  async batchGetPeopleAlsoAsk(
    keywords: string[],
    locationCode: number = 2840
  ): Promise<Map<string, DataForSEOPAAQuestion[]>> {
    console.log(`[DataForSEO] Batch getting PAA questions for ${keywords.length} keywords`);

    const results = new Map<string, DataForSEOPAAQuestion[]>();

    for (let i = 0; i < keywords.length; i++) {
      const keyword = keywords[i];
      console.log(`[DataForSEO] Processing keyword ${i + 1}/${keywords.length}: "${keyword}"`);

      const paaQuestions = await this.getPeopleAlsoAsk(keyword, locationCode);
      results.set(keyword, paaQuestions);

      // Add delay to be respectful of API
      if (i < keywords.length - 1) {
        await this.sleep(1500); // 1.5 second delay between requests
      }
    }

    return results;
  }

  // ============================================================================
  // COMPETITOR CONTENT ANALYSIS - NEW FOR Q&A CONTENT ENGINE
  // ============================================================================

  /**
   * Get comprehensive competitor content analysis
   */
  async getCompetitorContent(
    domain: string,
    locationCode: number = 2840
  ): Promise<DataForSEOCompetitorContent> {
    console.log(`[DataForSEO] Analyzing competitor content for domain: ${domain}`);

    // Get keywords the domain ranks for
    const keywords = await this.getDomainKeywords(domain, locationCode, 100);

    // Get top pages
    const request = {
      target: domain,
      location_code: locationCode,
      language_code: 'en',
      limit: 50,
    };

    const response = await this.executeRequest<any[]>(
      '/v3/dataforseo_labs/google/top_pages/live',
      [request],
      'getCompetitorTopPages'
    );

    const result = response[0];

    const topPages =
      result?.items?.map((item: any) => ({
        url: item.url || '',
        title: item.title || '',
        position: item.avgPosition || 0,
        traffic: item.etv || 0,
        keywords: item.keywords_count || 0,
      })) || [];

    const topKeywords = keywords.slice(0, 50).map((kw) => ({
      keyword: kw.keyword,
      position: kw.position,
      searchVolume: kw.search_volume,
      traffic: Math.round((kw.search_volume * (100 - kw.position * 2)) / 100), // Estimated traffic
    }));

    // Analyze content types from URLs
    const contentTypes = this.analyzeContentTypes(topPages.map((p: any) => p.url));

    const totalKeywords = keywords.length;
    const totalTraffic = topPages.reduce((sum: number, page: any) => sum + page.traffic, 0);

    console.log(
      `[DataForSEO] Competitor analysis complete: ${totalKeywords} keywords, ${topPages.length} pages`
    );

    return {
      domain,
      topPages,
      topKeywords,
      contentTypes,
      totalKeywords,
      totalTraffic,
    };
  }

  /**
   * Analyze content types from URLs
   */
  private analyzeContentTypes(urls: string[]): string[] {
    const contentTypes = new Set<string>();

    for (const url of urls) {
      const urlLower = url.toLowerCase();

      if (urlLower.includes('/blog/')) contentTypes.add('blog');
      if (urlLower.includes('/article/')) contentTypes.add('article');
      if (urlLower.includes('/guide/')) contentTypes.add('guide');
      if (urlLower.includes('/how-to/')) contentTypes.add('how-to');
      if (urlLower.includes('/tutorial/')) contentTypes.add('tutorial');
      if (urlLower.includes('/faq/')) contentTypes.add('faq');
      if (urlLower.includes('/product/')) contentTypes.add('product');
      if (urlLower.includes('/category/')) contentTypes.add('category');
      if (urlLower.includes('/page/')) contentTypes.add('page');
    }

    return Array.from(contentTypes);
  }

  // ============================================================================
  // COMPETITOR ANALYSIS
  // ============================================================================

  /**
   * Analyze which keywords a domain ranks for
   */
  async getDomainKeywords(
    domain: string,
    locationCode: number = 2840,
    limit: number = 100
  ): Promise<
    Array<{
      keyword: string;
      position: number;
      search_volume: number;
      url: string;
    }>
  > {
    console.log(`[DataForSEO] Getting keywords for domain: ${domain}`);

    const request = {
      target: domain,
      location_code: locationCode,
      language_code: 'en',
      limit,
    };

    const response = await this.executeRequest<any[]>(
      '/v3/dataforseo_labs/google/ranked_keywords/live',
      [request],
      'getDomainKeywords'
    );

    const result = response[0];

    if (!result || !result.items) {
      return [];
    }

    return result.items.map((item: any) => ({
      keyword: item.keyword_data?.keyword || '',
      position: item.ranked_serp_element?.serp_item?.rank_absolute || 0,
      search_volume: item.keyword_data?.keyword_info?.search_volume || 0,
      url: item.ranked_serp_element?.serp_item?.url || '',
    }));
  }

  // ============================================================================
  // REQUEST EXECUTION
  // ============================================================================

  private async executeRequest<T = any>(
    endpoint: string,
    data: any[],
    operationName: string
  ): Promise<T> {
    return this.retryHelper.executeWithRetry(
      async () => {
        try {
          const response = await this.client.post<DataForSEOResponse<T>>(endpoint, data);

          const apiResponse = response.data;

          // Track costs
          if (apiResponse.cost) {
            this.totalCost += apiResponse.cost;
            console.log(
              `[DataForSEO] Request cost: $${apiResponse.cost.toFixed(4)} (Total: $${this.totalCost.toFixed(4)})`
            );
          }

          // Check for errors
          if (apiResponse.status_code !== 20000) {
            throw new APIError(
              apiResponse.status_message || 'DataForSEO API request failed',
              apiResponse.status_code,
              'dataforseo'
            );
          }

          // Check task-level errors
          if (apiResponse.tasks && apiResponse.tasks.length > 0) {
            const task = apiResponse.tasks[0];

            if (task.status_code !== 20000) {
              throw new APIError(
                task.status_message || 'DataForSEO task failed',
                task.status_code,
                'dataforseo'
              );
            }

            return task.result as T;
          }

          throw new APIError('No tasks in DataForSEO response', 500, 'dataforseo');
        } catch (error: any) {
          if (axios.isAxiosError(error)) {
            const status = error.response?.status || 500;

            if (status === 401 || status === 403) {
              throw new AuthenticationError('dataforseo', error);
            }

            throw new APIError(
              error.response?.data?.status_message || error.message,
              status,
              'dataforseo',
              error
            );
          }

          throw error;
        }
      },
      `DataForSEO.${operationName}`,
      this.circuitBreaker
    );
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get total API cost for this session
   */
  getTotalCost(): number {
    return this.totalCost;
  }

  /**
   * Reset cost counter
   */
  resetCostCounter(): void {
    this.totalCost = 0;
  }

  /**
   * Get circuit breaker stats
   */
  getCircuitBreakerStats() {
    return this.circuitBreaker.getStats();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create DataForSEO client
 */
export function createDataForSEOClient(config: {
  login: string;
  password: string;
}): DataForSEOService {
  return new DataForSEOService(config);
}

/**
 * Location codes reference (most common)
 */
export const DATAFORSEO_LOCATIONS = {
  UNITED_STATES: 2840,
  UNITED_KINGDOM: 2826,
  CANADA: 2124,
  AUSTRALIA: 2036,
  GERMANY: 2276,
  FRANCE: 2250,
  SPAIN: 2724,
  ITALY: 2380,
  NETHERLANDS: 2528,
  INDIA: 2356,
} as const;
