/**
 * Google Search Console API Integration Service
 *
 * FREE API with 100,000 requests per day quota
 *
 * Features:
 * - OAuth 2.0 authentication flow
 * - Search performance data (clicks, impressions, CTR, position)
 * - Query-level analytics
 * - Page-level analytics
 * - Device/country dimensions
 * - Token refresh management
 * - Rate limiting (95% threshold)
 * - Automatic retry with exponential backoff
 *
 * API Limits:
 * - 100,000 requests per day
 * - ~1.16 requests per second sustained
 * - OAuth token expires after 1 hour (use refresh token)
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import {
  GSCAuthTokens,
  GSCPerformanceRequest,
  GSCPerformanceData,
  GSCPerformanceRow,
  GSCTopQuery,
  GSCTopPage,
  GSCSiteInfo,
  APIError,
  AuthenticationError,
} from '../types/external-apis.types';
import { RateLimiter, createGoogleRateLimiter } from '../utils/rate-limiter';
import { RetryHelper, CircuitBreaker } from '../utils/retry-helper';
import { subDays, format } from 'date-fns';

export interface GSCClientConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  rateLimiter?: RateLimiter;
}

export class GoogleSearchConsoleService {
  private readonly oauth2Client: OAuth2Client;
  private readonly searchConsole;
  private readonly rateLimiter: RateLimiter;
  private readonly retryHelper: RetryHelper;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(config: GSCClientConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.redirectUri = config.redirectUri;

    this.oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.redirectUri
    );

    this.searchConsole = google.searchconsole({
      version: 'v1',
      auth: this.oauth2Client,
    });

    this.rateLimiter = config.rateLimiter || createGoogleRateLimiter();
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
  }

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  /**
   * Generate OAuth URL for user authorization
   */
  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/webmasters.readonly', // Read-only access to GSC data
      'https://www.googleapis.com/auth/webmasters', // Full access (for future write operations)
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // Get refresh token
      prompt: 'consent', // Force consent screen to get refresh token
      scope: scopes,
    });
  }

  /**
   * Exchange authorization code for access tokens
   */
  async authenticate(code: string): Promise<GSCAuthTokens> {
    console.log('[GoogleSearchConsole] Authenticating with authorization code');

    try {
      const { tokens } = await this.oauth2Client.getToken(code);

      if (!tokens.access_token || !tokens.refresh_token) {
        throw new AuthenticationError('google', new Error('Missing tokens in response'));
      }

      this.oauth2Client.setCredentials(tokens);

      console.log('[GoogleSearchConsole] Authentication successful');

      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token!,
        scope: tokens.scope || '',
        token_type: tokens.token_type || 'Bearer',
        expiry_date: tokens.expiry_date || Date.now() + 3600000, // Default 1 hour
      };
    } catch (error: any) {
      console.error('[GoogleSearchConsole] Authentication failed:', error);
      throw new AuthenticationError('google', error);
    }
  }

  /**
   * Set existing tokens (from database)
   */
  setTokens(tokens: GSCAuthTokens): void {
    this.oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      scope: tokens.scope,
      token_type: tokens.token_type,
      expiry_date: tokens.expiry_date,
    });
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<GSCAuthTokens> {
    console.log('[GoogleSearchConsole] Refreshing access token');

    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();

      this.oauth2Client.setCredentials(credentials);

      return {
        access_token: credentials.access_token!,
        refresh_token: credentials.refresh_token!,
        scope: credentials.scope || '',
        token_type: credentials.token_type || 'Bearer',
        expiry_date: credentials.expiry_date || Date.now() + 3600000,
      };
    } catch (error: any) {
      console.error('[GoogleSearchConsole] Token refresh failed:', error);
      throw new AuthenticationError('google', error);
    }
  }

  // ============================================================================
  // PERFORMANCE DATA
  // ============================================================================

  /**
   * Get search performance data for a date range
   */
  async getPerformanceData(
    siteUrl: string,
    startDate: string,
    endDate: string,
    dimensions?: Array<'query' | 'page' | 'country' | 'device' | 'searchAppearance' | 'date'>
  ): Promise<GSCPerformanceData> {
    console.log(
      `[GoogleSearchConsole] Fetching performance data for ${siteUrl} (${startDate} to ${endDate})`
    );

    const request: GSCPerformanceRequest = {
      startDate,
      endDate,
      dimensions: dimensions || ['query', 'page'],
      rowLimit: 25000, // Max allowed by API
      startRow: 0,
    };

    return this.executeWithRateLimit(async () => {
      try {
        const response = await this.searchConsole.searchanalytics.query({
          siteUrl,
          requestBody: request,
        });

        return response.data as GSCPerformanceData;
      } catch (error: any) {
        throw this.handleGoogleAPIError(error);
      }
    }, 'getPerformanceData');
  }

  /**
   * Get top queries for a site
   */
  async getTopQueries(
    siteUrl: string,
    limit: number = 100,
    days: number = 30
  ): Promise<GSCTopQuery[]> {
    const endDate = format(new Date(), 'yyyy-MM-dd');
    const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

    console.log(`[GoogleSearchConsole] Fetching top ${limit} queries for ${siteUrl}`);

    const request: GSCPerformanceRequest = {
      startDate,
      endDate,
      dimensions: ['query'],
      rowLimit: limit,
      startRow: 0,
    };

    return this.executeWithRateLimit(async () => {
      try {
        const response = await this.searchConsole.searchanalytics.query({
          siteUrl,
          requestBody: request,
        });

        const data = response.data as GSCPerformanceData;

        return (data.rows || []).map(
          (row): GSCTopQuery => ({
            query: row.keys?.[0] || '',
            clicks: row.clicks,
            impressions: row.impressions,
            ctr: row.ctr,
            position: row.position,
          })
        );
      } catch (error: any) {
        throw this.handleGoogleAPIError(error);
      }
    }, 'getTopQueries');
  }

  /**
   * Get top pages for a site
   */
  async getTopPages(
    siteUrl: string,
    limit: number = 100,
    days: number = 30
  ): Promise<GSCTopPage[]> {
    const endDate = format(new Date(), 'yyyy-MM-dd');
    const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

    console.log(`[GoogleSearchConsole] Fetching top ${limit} pages for ${siteUrl}`);

    const request: GSCPerformanceRequest = {
      startDate,
      endDate,
      dimensions: ['page'],
      rowLimit: limit,
      startRow: 0,
    };

    return this.executeWithRateLimit(async () => {
      try {
        const response = await this.searchConsole.searchanalytics.query({
          siteUrl,
          requestBody: request,
        });

        const data = response.data as GSCPerformanceData;

        return (data.rows || []).map(
          (row): GSCTopPage => ({
            page: row.keys?.[0] || '',
            clicks: row.clicks,
            impressions: row.impressions,
            ctr: row.ctr,
            position: row.position,
          })
        );
      } catch (error: any) {
        throw this.handleGoogleAPIError(error);
      }
    }, 'getTopPages');
  }

  /**
   * Get performance data for a specific page
   */
  async getPagePerformance(
    siteUrl: string,
    pageUrl: string,
    days: number = 30
  ): Promise<GSCPerformanceData> {
    const endDate = format(new Date(), 'yyyy-MM-dd');
    const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

    console.log(`[GoogleSearchConsole] Fetching performance for page: ${pageUrl}`);

    const request: GSCPerformanceRequest = {
      startDate,
      endDate,
      dimensions: ['query'],
      dimensionFilterGroups: [
        {
          filters: [
            {
              dimension: 'page',
              operator: 'equals',
              expression: pageUrl,
            },
          ],
        },
      ],
      rowLimit: 25000,
      startRow: 0,
    };

    return this.executeWithRateLimit(async () => {
      try {
        const response = await this.searchConsole.searchanalytics.query({
          siteUrl,
          requestBody: request,
        });

        return response.data as GSCPerformanceData;
      } catch (error: any) {
        throw this.handleGoogleAPIError(error);
      }
    }, 'getPagePerformance');
  }

  /**
   * Get performance data for a specific query
   */
  async getQueryPerformance(
    siteUrl: string,
    query: string,
    days: number = 30
  ): Promise<GSCPerformanceData> {
    const endDate = format(new Date(), 'yyyy-MM-dd');
    const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

    console.log(`[GoogleSearchConsole] Fetching performance for query: ${query}`);

    const request: GSCPerformanceRequest = {
      startDate,
      endDate,
      dimensions: ['page', 'date'],
      dimensionFilterGroups: [
        {
          filters: [
            {
              dimension: 'query',
              operator: 'equals',
              expression: query,
            },
          ],
        },
      ],
      rowLimit: 25000,
      startRow: 0,
    };

    return this.executeWithRateLimit(async () => {
      try {
        const response = await this.searchConsole.searchanalytics.query({
          siteUrl,
          requestBody: request,
        });

        return response.data as GSCPerformanceData;
      } catch (error: any) {
        throw this.handleGoogleAPIError(error);
      }
    }, 'getQueryPerformance');
  }

  // ============================================================================
  // SITE MANAGEMENT
  // ============================================================================

  /**
   * List all sites the user has access to
   */
  async listSites(): Promise<GSCSiteInfo[]> {
    console.log('[GoogleSearchConsole] Listing accessible sites');

    return this.executeWithRateLimit(async () => {
      try {
        const response = await this.searchConsole.sites.list();

        return (response.data.siteEntry || []).map(
          (site): GSCSiteInfo => ({
            siteUrl: site.siteUrl || '',
            permissionLevel: site.permissionLevel as any,
          })
        );
      } catch (error: any) {
        throw this.handleGoogleAPIError(error);
      }
    }, 'listSites');
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private async executeWithRateLimit<T>(
    fn: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    return this.retryHelper.executeWithRetry(
      async () => {
        // Wait for rate limiter (1 request cost)
        await this.rateLimiter.waitAndConsume(1, 'google_search_console');

        return await fn();
      },
      `GoogleSearchConsole.${operationName}`,
      this.circuitBreaker
    );
  }

  private handleGoogleAPIError(error: any): Error {
    const status = error.response?.status || error.code || 500;
    const message = error.message || 'Google API request failed';

    if (status === 401 || status === 403) {
      return new AuthenticationError('google', error);
    }

    return new APIError(message, status, 'google', error);
  }

  /**
   * Get rate limit status
   */
  async getRateLimitStatus() {
    return this.rateLimiter.getStatus('google_search_console');
  }

  /**
   * Get circuit breaker stats
   */
  getCircuitBreakerStats() {
    return this.circuitBreaker.getStats();
  }
}

/**
 * Factory function to create GSC client
 */
export function createGoogleSearchConsoleClient(config: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  tokens?: GSCAuthTokens;
  rateLimiter?: RateLimiter;
}): GoogleSearchConsoleService {
  const client = new GoogleSearchConsoleService({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUri: config.redirectUri,
    rateLimiter: config.rateLimiter,
  });

  if (config.tokens) {
    client.setTokens(config.tokens);
  }

  return client;
}
