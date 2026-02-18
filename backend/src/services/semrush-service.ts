/**
 * SEMrush API Integration Service
 *
 * $549/month subscription (Business plan required for API access)
 *
 * Features:
 * - Domain overview analytics
 * - Competitor keyword analysis
 * - Organic keyword rankings
 * - Backlink analysis
 * - Topical maps
 * - Position tracking
 *
 * API Limits:
 * - 10,000 API units per month (Business plan)
 * - Different endpoints have different costs
 * - Rate limit: 10 requests per second
 */

import axios, { AxiosInstance } from 'axios';
import {
  SEMrushCredentials,
  SEMrushDomainOverview,
  SEMrushKeyword,
  SEMrushCompetitorKeyword,
  SEMrushBacklink,
  SEMrushTopicalMap,
  APIError,
  AuthenticationError,
} from '../types/external-apis.types';
import { RetryHelper, CircuitBreaker } from '../utils/retry-helper';

export interface SEMrushClientConfig {
  apiKey: string;
  baseUrl?: string;
}

export class SEMrushService {
  private readonly client: AxiosInstance;
  private readonly credentials: SEMrushCredentials;
  private readonly retryHelper: RetryHelper;
  private readonly circuitBreaker: CircuitBreaker;
  private requestCount: number = 0;

  constructor(config: SEMrushClientConfig) {
    this.credentials = {
      apiKey: config.apiKey,
    };

    const baseUrl = config.baseUrl || 'https://api.semrush.com';

    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 60000, // 60 seconds
      params: {
        key: this.credentials.apiKey,
      },
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
  // DOMAIN OVERVIEW
  // ============================================================================

  /**
   * Get domain overview (organic & paid metrics)
   */
  async getDomainOverview(
    domain: string,
    database: string = 'us' // us, uk, ca, au, etc.
  ): Promise<SEMrushDomainOverview> {
    console.log(`[SEMrush] Fetching domain overview for: ${domain}`);

    const response = await this.executeRequest<string>(
      '/analytics/v1/',
      {
        type: 'domain_overview',
        domain,
        database,
        export_columns:
          'Or,Ot,Oc,Ad,At,Ac', // Organic keywords, traffic, cost, AdWords keywords, traffic, cost
      },
      'getDomainOverview'
    );

    return this.parseDomainOverview(response);
  }

  // ============================================================================
  // KEYWORD RESEARCH
  // ============================================================================

  /**
   * Get organic keywords for a domain
   */
  async getDomainKeywords(
    domain: string,
    database: string = 'us',
    limit: number = 100,
    positionFilter?: { from: number; to: number }
  ): Promise<SEMrushKeyword[]> {
    console.log(`[SEMrush] Fetching organic keywords for: ${domain}`);

    const params: any = {
      type: 'domain_organic',
      domain,
      database,
      display_limit: limit,
      export_columns:
        'Ph,Po,Pp,Pd,Nq,Cp,Ur,Tr,Tc,Co,Nr,Td', // Keyword, position, prev position, difficulty, volume, CPC, URL, traffic, etc.
    };

    if (positionFilter) {
      params.display_filter = `+|Po|Lt|${positionFilter.to}|Po|Gt|${positionFilter.from}`;
    }

    const response = await this.executeRequest<string>(
      '/analytics/v1/',
      params,
      'getDomainKeywords'
    );

    return this.parseKeywords(response);
  }

  /**
   * Get top ranking keywords for a domain
   */
  async getTopRankingKeywords(
    domain: string,
    database: string = 'us',
    topN: number = 3
  ): Promise<SEMrushKeyword[]> {
    return this.getDomainKeywords(domain, database, 1000, { from: 1, to: topN });
  }

  /**
   * Get keyword difficulty and metrics
   */
  async getKeywordMetrics(
    keyword: string,
    database: string = 'us'
  ): Promise<{
    keyword: string;
    search_volume: number;
    cpc: number;
    competition: number;
    number_of_results: number;
    keyword_difficulty: number;
  }> {
    console.log(`[SEMrush] Fetching keyword metrics for: "${keyword}"`);

    const response = await this.executeRequest<string>(
      '/analytics/v1/',
      {
        type: 'phrase_this',
        phrase: keyword,
        database,
        export_columns: 'Ph,Nq,Cp,Co,Nr,Td',
      },
      'getKeywordMetrics'
    );

    const lines = response.trim().split('\n');
    if (lines.length < 2) {
      throw new APIError('No data returned for keyword', 404, 'semrush');
    }

    const values = lines[1].split(';');

    return {
      keyword: values[0] || keyword,
      search_volume: parseInt(values[1]) || 0,
      cpc: parseFloat(values[2]) || 0,
      competition: parseFloat(values[3]) || 0,
      number_of_results: parseInt(values[4]) || 0,
      keyword_difficulty: parseFloat(values[5]) || 0,
    };
  }

  // ============================================================================
  // COMPETITOR ANALYSIS
  // ============================================================================

  /**
   * Get competitor domains
   */
  async getCompetitors(
    domain: string,
    database: string = 'us',
    limit: number = 10
  ): Promise<
    Array<{
      domain: string;
      commonKeywords: number;
      relevance: number;
      organicKeywords: number;
      organicTraffic: number;
    }>
  > {
    console.log(`[SEMrush] Fetching competitors for: ${domain}`);

    const response = await this.executeRequest<string>(
      '/analytics/v1/',
      {
        type: 'domain_organic_organic',
        domain,
        database,
        display_limit: limit,
        export_columns: 'Dn,Cr,Np,Or,Ot',
      },
      'getCompetitors'
    );

    const lines = response.trim().split('\n');
    const competitors = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(';');
      competitors.push({
        domain: values[0],
        relevance: parseFloat(values[1]) || 0,
        commonKeywords: parseInt(values[2]) || 0,
        organicKeywords: parseInt(values[3]) || 0,
        organicTraffic: parseInt(values[4]) || 0,
      });
    }

    return competitors;
  }

  /**
   * Get keywords that competitors rank for but you don't
   */
  async getCompetitorKeywords(
    domain: string,
    competitorDomain: string,
    database: string = 'us',
    limit: number = 100
  ): Promise<SEMrushCompetitorKeyword[]> {
    console.log(
      `[SEMrush] Fetching competitor keywords: ${domain} vs ${competitorDomain}`
    );

    const response = await this.executeRequest<string>(
      '/analytics/v1/',
      {
        type: 'domain_organic_organic_unique',
        domain,
        domain_target: competitorDomain,
        database,
        display_limit: limit,
        export_columns: 'Ph,Nq,Cp,Co,Nr,Td,Dn,Po',
      },
      'getCompetitorKeywords'
    );

    const lines = response.trim().split('\n');
    const keywords: SEMrushCompetitorKeyword[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(';');
      keywords.push({
        keyword: values[0],
        search_volume: parseInt(values[1]) || 0,
        cpc: parseFloat(values[2]) || 0,
        competition_level: parseFloat(values[3]) || 0,
        number_of_results: parseInt(values[4]) || 0,
        keyword_difficulty: parseFloat(values[5]) || 0,
        domain: values[6],
        position: parseInt(values[7]) || 0,
        trends: '',
      });
    }

    return keywords;
  }

  // ============================================================================
  // BACKLINK ANALYSIS
  // ============================================================================

  /**
   * Get backlinks for a domain or URL
   */
  async getBacklinks(
    target: string,
    targetType: 'root_domain' | 'domain' | 'url' = 'root_domain',
    limit: number = 100
  ): Promise<SEMrushBacklink[]> {
    console.log(`[SEMrush] Fetching backlinks for: ${target}`);

    const response = await this.executeRequest<string>(
      '/analytics/v1/',
      {
        type: 'backlinks',
        target,
        target_type: targetType,
        display_limit: limit,
        export_columns:
          'source_url,target_url,anchor,external_num,internal_num,source_title,last_seen,first_seen,image,redirect,form,frame',
      },
      'getBacklinks'
    );

    const lines = response.trim().split('\n');
    const backlinks: SEMrushBacklink[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(';');
      backlinks.push({
        source_url: values[0],
        target_url: values[1],
        anchor: values[2],
        external_links: parseInt(values[3]) || 0,
        internal_links: parseInt(values[4]) || 0,
        source_title: values[5],
        last_seen: values[6],
        first_seen: values[7],
        link_type: this.determineLinkType(values[8], values[9], values[10]),
        is_new: this.isRecentBacklink(values[7]),
        is_lost: false,
      });
    }

    return backlinks;
  }

  /**
   * Get backlink overview statistics
   */
  async getBacklinkOverview(
    target: string,
    targetType: 'root_domain' | 'domain' | 'url' = 'root_domain'
  ): Promise<{
    total_backlinks: number;
    referring_domains: number;
    referring_ips: number;
    dofollow_backlinks: number;
    gov_backlinks: number;
    edu_backlinks: number;
  }> {
    console.log(`[SEMrush] Fetching backlink overview for: ${target}`);

    const response = await this.executeRequest<string>(
      '/analytics/v1/',
      {
        type: 'backlinks_overview',
        target,
        target_type: targetType,
      },
      'getBacklinkOverview'
    );

    const lines = response.trim().split('\n');
    if (lines.length < 2) {
      throw new APIError('No backlink data available', 404, 'semrush');
    }

    const values = lines[1].split(';');

    return {
      total_backlinks: parseInt(values[0]) || 0,
      referring_domains: parseInt(values[1]) || 0,
      referring_ips: parseInt(values[2]) || 0,
      dofollow_backlinks: parseInt(values[3]) || 0,
      gov_backlinks: parseInt(values[4]) || 0,
      edu_backlinks: parseInt(values[5]) || 0,
    };
  }

  // ============================================================================
  // TOPICAL MAPS (USING KEYWORD SUGGESTIONS)
  // ============================================================================

  /**
   * Get topical map for a keyword (related keywords organized by topic)
   * Note: SEMrush doesn't have a direct "topical map" endpoint,
   * so we use related keywords and organize them by similarity
   */
  async getTopicalMap(
    keyword: string,
    database: string = 'us',
    limit: number = 100
  ): Promise<SEMrushTopicalMap[]> {
    console.log(`[SEMrush] Building topical map for: "${keyword}"`);

    const response = await this.executeRequest<string>(
      '/analytics/v1/',
      {
        type: 'phrase_related',
        phrase: keyword,
        database,
        display_limit: limit,
        export_columns: 'Ph,Nq,Td',
      },
      'getTopicalMap'
    );

    const lines = response.trim().split('\n');
    const topics: SEMrushTopicalMap[] = [];

    // Main topic (seed keyword)
    topics.push({
      topic: keyword,
      parent_topic: null,
      level: 0,
      keyword_volume: 0,
      keyword_difficulty: 0,
      related_keywords: [],
    });

    // Related topics
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(';');
      const relatedKeyword = values[0];

      topics.push({
        topic: relatedKeyword,
        parent_topic: keyword,
        level: 1,
        keyword_volume: parseInt(values[1]) || 0,
        keyword_difficulty: parseFloat(values[2]) || 0,
        related_keywords: [],
      });

      // Add to main topic's related keywords
      topics[0].related_keywords.push(relatedKeyword);
    }

    return topics;
  }

  // ============================================================================
  // REQUEST EXECUTION
  // ============================================================================

  private async executeRequest<T = any>(
    endpoint: string,
    params: any,
    operationName: string
  ): Promise<T> {
    return this.retryHelper.executeWithRetry(
      async () => {
        try {
          this.requestCount++;

          const response = await this.client.get<T>(endpoint, { params });

          console.log(
            `[SEMrush] Request successful (Total requests: ${this.requestCount})`
          );

          return response.data;
        } catch (error: any) {
          if (axios.isAxiosError(error)) {
            const status = error.response?.status || 500;

            if (status === 401 || status === 403) {
              throw new AuthenticationError('semrush', error);
            }

            // SEMrush returns 400 with error message in body
            if (status === 400 && error.response?.data) {
              throw new APIError(
                error.response.data.toString(),
                status,
                'semrush',
                error
              );
            }

            throw new APIError(
              error.message || 'SEMrush API request failed',
              status,
              'semrush',
              error
            );
          }

          throw error;
        }
      },
      `SEMrush.${operationName}`,
      this.circuitBreaker
    );
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private parseDomainOverview(csvData: string): SEMrushDomainOverview {
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) {
      throw new APIError('Invalid domain overview data', 500, 'semrush');
    }

    const values = lines[1].split(';');

    return {
      domain: '',
      organic_keywords: parseInt(values[0]) || 0,
      organic_traffic: parseInt(values[1]) || 0,
      organic_cost: parseFloat(values[2]) || 0,
      adwords_keywords: parseInt(values[3]) || 0,
      adwords_traffic: parseInt(values[4]) || 0,
      adwords_cost: parseFloat(values[5]) || 0,
    };
  }

  private parseKeywords(csvData: string): SEMrushKeyword[] {
    const lines = csvData.trim().split('\n');
    const keywords: SEMrushKeyword[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(';');
      keywords.push({
        keyword: values[0],
        position: parseInt(values[1]) || 0,
        previous_position: parseInt(values[2]) || 0,
        search_volume: parseInt(values[4]) || 0,
        cpc: parseFloat(values[5]) || 0,
        url: values[6],
        traffic: parseFloat(values[7]) || 0,
        traffic_cost: parseFloat(values[8]) || 0,
        competition: parseFloat(values[9]) || 0,
        number_of_results: parseInt(values[10]) || 0,
        trends: values[11] || '',
        serp_features: [],
      });
    }

    return keywords;
  }

  private determineLinkType(
    image: string,
    redirect: string,
    form: string
  ): 'text' | 'image' | 'redirect' | 'form' {
    if (image === '1') return 'image';
    if (redirect === '1') return 'redirect';
    if (form === '1') return 'form';
    return 'text';
  }

  private isRecentBacklink(firstSeen: string): boolean {
    const firstSeenDate = new Date(firstSeen);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return firstSeenDate > thirtyDaysAgo;
  }

  /**
   * Get total request count
   */
  getRequestCount(): number {
    return this.requestCount;
  }

  /**
   * Reset request counter
   */
  resetRequestCounter(): void {
    this.requestCount = 0;
  }

  /**
   * Get circuit breaker stats
   */
  getCircuitBreakerStats() {
    return this.circuitBreaker.getStats();
  }
}

/**
 * Factory function to create SEMrush client
 */
export function createSEMrushClient(apiKey: string): SEMrushService {
  return new SEMrushService({ apiKey });
}

/**
 * Database codes reference (most common)
 */
export const SEMRUSH_DATABASES = {
  UNITED_STATES: 'us',
  UNITED_KINGDOM: 'uk',
  CANADA: 'ca',
  AUSTRALIA: 'au',
  GERMANY: 'de',
  FRANCE: 'fr',
  SPAIN: 'es',
  ITALY: 'it',
  NETHERLANDS: 'nl',
  INDIA: 'in',
} as const;
