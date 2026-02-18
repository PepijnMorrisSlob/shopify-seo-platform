/**
 * Authentication Service
 * Shopify SEO Automation Platform
 *
 * Handles Shopify OAuth 2.0 flow and JWT token management:
 * - OAuth installation flow (generate URL → validate callback → exchange code for token)
 * - HMAC validation for all OAuth callbacks
 * - Encrypted storage of Shopify access tokens
 * - JWT generation and verification for internal auth
 * - Refresh token management
 *
 * CRITICAL SECURITY:
 * - All OAuth callbacks MUST be HMAC validated
 * - Access tokens stored encrypted (AES-256-GCM)
 * - State parameter validated to prevent CSRF
 * - Shop domain validated against *.myshopify.com pattern
 * - Nonce tracking to prevent replay attacks
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import {
  ShopifyOAuthCallbackQuery,
  ShopifyAccessTokenResponse,
  SessionContext,
  JWTPayload,
  JWTTokenPair,
  RefreshTokenPayload,
  UserRole,
  SecurityEventType,
  EncryptedData,
} from '../types/auth.types';
import { HMACValidator } from '../utils/hmac-validator';
import { getEncryptionService } from './encryption-service';
import { PrismaClient } from '@prisma/client';

export class AuthService {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly scopes: string[];
  private readonly redirectUri: string;
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string = '15m'; // Short-lived access tokens
  private readonly refreshTokenExpiresIn: string = '7d'; // Longer refresh tokens
  private readonly encryptionService = getEncryptionService();
  private readonly prisma: PrismaClient;

  // Nonce storage (in production, use Redis)
  private readonly nonceStore = new Map<string, { expiresAt: Date; used: boolean }>();

  constructor(prisma: PrismaClient) {
    // Load configuration from environment
    this.apiKey = process.env.SHOPIFY_API_KEY || '';
    this.apiSecret = process.env.SHOPIFY_API_SECRET || '';
    this.scopes = (process.env.SHOPIFY_SCOPES || '').split(',');
    this.redirectUri = process.env.SHOPIFY_REDIRECT_URI || '';
    this.jwtSecret = process.env.JWT_SECRET || '';

    if (!this.apiKey || !this.apiSecret) {
      throw new Error('SHOPIFY_API_KEY and SHOPIFY_API_SECRET must be set');
    }

    if (!this.jwtSecret) {
      throw new Error('JWT_SECRET must be set');
    }

    this.prisma = prisma;
  }

  /**
   * Step 1: Generate OAuth Installation URL
   *
   * Redirect merchant to this URL to start OAuth flow
   *
   * @param shop - Shopify shop domain (e.g., example.myshopify.com)
   * @param redirectUri - Optional custom redirect URI
   * @returns OAuth installation URL
   */
  async generateOAuthUrl(shop: string, redirectUri?: string): Promise<string> {
    // Validate shop domain
    if (!HMACValidator.isValidShopDomain(shop)) {
      throw new Error(`Invalid shop domain: ${shop}`);
    }

    // Generate state parameter (CSRF protection)
    const state = this.generateNonce();

    // Store state with expiration (5 minutes)
    this.nonceStore.set(state, {
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      used: false,
    });

    // Build OAuth URL
    const redirect = redirectUri || this.redirectUri;
    const scopeString = this.scopes.join(',');

    const authUrl = new URL(`https://${shop}/admin/oauth/authorize`);
    authUrl.searchParams.set('client_id', this.apiKey);
    authUrl.searchParams.set('scope', scopeString);
    authUrl.searchParams.set('redirect_uri', redirect);
    authUrl.searchParams.set('state', state);

    // Log security event
    await this.logSecurityEvent({
      type: SecurityEventType.OAUTH_INSTALL_START,
      metadata: { shop, scopes: this.scopes },
      severity: 'low',
    });

    return authUrl.toString();
  }

  /**
   * Step 2: Validate OAuth Callback
   *
   * Validates HMAC, state, and other security checks
   * CRITICAL: This MUST be called before exchanging code for token
   *
   * @param query - Query parameters from OAuth callback
   * @returns Validation result
   */
  async validateCallback(query: ShopifyOAuthCallbackQuery): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    // 1. Validate HMAC
    const hmacResult = HMACValidator.validateOAuthCallback(
      query as any,
      this.apiSecret
    );

    if (!hmacResult.valid) {
      await this.logSecurityEvent({
        type: SecurityEventType.OAUTH_CALLBACK_INVALID_HMAC,
        metadata: { shop: query.shop, reason: hmacResult.reason },
        severity: 'critical',
      });

      return {
        valid: false,
        reason: `HMAC validation failed: ${hmacResult.reason}`,
      };
    }

    // 2. Validate shop domain
    if (!HMACValidator.isValidShopDomain(query.shop)) {
      return {
        valid: false,
        reason: `Invalid shop domain: ${query.shop}`,
      };
    }

    // 3. Validate state (CSRF protection)
    const stateRecord = this.nonceStore.get(query.state);

    if (!stateRecord) {
      return {
        valid: false,
        reason: 'Invalid state parameter (not found)',
      };
    }

    if (stateRecord.used) {
      return {
        valid: false,
        reason: 'State parameter already used (replay attack)',
      };
    }

    if (stateRecord.expiresAt < new Date()) {
      return {
        valid: false,
        reason: 'State parameter expired',
      };
    }

    // Mark state as used
    stateRecord.used = true;

    // 4. Validate timestamp (prevent replay attacks)
    if (!HMACValidator.isTimestampValid(query.timestamp, 300)) {
      // 5 minutes
      return {
        valid: false,
        reason: 'Timestamp is invalid or too old',
      };
    }

    return { valid: true };
  }

  /**
   * Step 3: Exchange Authorization Code for Access Token
   *
   * Makes POST request to Shopify to get access token
   *
   * @param shop - Shopify shop domain
   * @param code - Authorization code from callback
   * @returns Access token
   */
  async exchangeCodeForToken(shop: string, code: string): Promise<string> {
    try {
      const response = await axios.post<ShopifyAccessTokenResponse>(
        `https://${shop}/admin/oauth/access_token`,
        {
          client_id: this.apiKey,
          client_secret: this.apiSecret,
          code,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000, // 10 seconds
        }
      );

      const { access_token, scope } = response.data;

      // Verify scopes match what we requested
      const grantedScopes = scope.split(',').sort();
      const requestedScopes = this.scopes.sort();

      const scopesMatch = JSON.stringify(grantedScopes) === JSON.stringify(requestedScopes);

      if (!scopesMatch) {
        console.warn('Granted scopes do not match requested scopes', {
          granted: grantedScopes,
          requested: requestedScopes,
        });
      }

      // Log success
      await this.logSecurityEvent({
        type: SecurityEventType.OAUTH_INSTALL_SUCCESS,
        metadata: { shop, scopes: grantedScopes },
        severity: 'low',
      });

      return access_token;
    } catch (error) {
      console.error('Failed to exchange code for token:', error.message);

      await this.logSecurityEvent({
        type: SecurityEventType.OAUTH_INSTALL_FAILURE,
        metadata: { shop, error: error.message },
        severity: 'high',
      });

      throw new Error('Failed to obtain access token from Shopify');
    }
  }

  /**
   * Step 4: Store Access Token (Encrypted)
   *
   * Stores Shopify access token in database with AES-256 encryption
   * Also creates or updates organization record
   *
   * @param shop - Shopify shop domain
   * @param accessToken - Shopify access token
   * @returns Organization ID
   */
  async storeAccessToken(shop: string, accessToken: string): Promise<string> {
    // Encrypt access token
    const encryptedToken = this.encryptionService.encryptAccessToken(accessToken);

    // Store in database (upsert organization)
    const organization = await this.prisma.organization.upsert({
      where: { shopifyDomain: shop },
      update: {
        accessTokenEncrypted: JSON.stringify(encryptedToken),
        installedAt: new Date(),
      },
      create: {
        shopifyDomain: shop,
        shopifyShopId: `shop_${Date.now()}`, // TODO: Get actual shop ID from Shopify API
        accessTokenEncrypted: JSON.stringify(encryptedToken),
        shopifyScopes: 'read_products,write_products', // TODO: Get actual scopes from OAuth
        installedAt: new Date(),
        planTier: 'FREE', // Default plan
      },
    });

    // Log sensitive data access
    await this.logSecurityEvent({
      type: SecurityEventType.SENSITIVE_DATA_ACCESS,
      organizationId: organization.id,
      metadata: { action: 'store_access_token', shop },
      severity: 'medium',
    });

    return organization.id;
  }

  /**
   * Retrieve and Decrypt Access Token
   *
   * Loads access token from database and decrypts it
   *
   * @param organizationId - Organization ID
   * @returns Decrypted access token
   */
  async getAccessToken(organizationId: string): Promise<string> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        accessTokenEncrypted: true,
      },
    });

    if (!organization || !organization.accessTokenEncrypted) {
      throw new Error('Access token not found for organization');
    }

    // Decrypt
    const decrypted = this.encryptionService.decryptAccessToken(JSON.parse(organization.accessTokenEncrypted) as EncryptedData);

    // Log access (audit trail)
    await this.logSecurityEvent({
      type: SecurityEventType.SENSITIVE_DATA_ACCESS,
      organizationId,
      metadata: { action: 'retrieve_access_token' },
      severity: 'low',
    });

    return decrypted;
  }

  /**
   * Generate JWT Token Pair
   *
   * Creates access token and refresh token for internal auth
   *
   * @param userId - User ID
   * @param organizationId - Organization ID
   * @param email - User email
   * @param role - User role
   * @returns Token pair
   */
  async generateJWT(
    userId: string,
    organizationId: string,
    email: string,
    role: UserRole
  ): Promise<JWTTokenPair> {
    // Access token payload
    const accessPayload: JWTPayload = {
      userId,
      organizationId,
      email,
      role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 15 * 60, // 15 minutes
    };

    // Refresh token payload
    const refreshPayload: RefreshTokenPayload = {
      userId,
      organizationId,
      tokenVersion: 1, // TODO: Get from user record when tokenVersion field added to schema
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
    };

    const accessToken = jwt.sign(accessPayload, this.jwtSecret, {
      algorithm: 'HS256',
    });

    const refreshToken = jwt.sign(refreshPayload, this.jwtSecret, {
      algorithm: 'HS256',
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  /**
   * Verify JWT Token
   *
   * Validates and decodes JWT token
   *
   * @param token - JWT token
   * @returns Decoded payload
   */
  async verifyJWT(token: string): Promise<JWTPayload> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        algorithms: ['HS256'],
      }) as JWTPayload;

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        await this.logSecurityEvent({
          type: SecurityEventType.TOKEN_EXPIRED,
          metadata: { error: error.message },
          severity: 'low',
        });
      }

      throw new Error(`JWT verification failed: ${error.message}`);
    }
  }

  /**
   * Refresh JWT Token
   *
   * Issues new access token using refresh token
   *
   * @param refreshToken - Refresh token
   * @returns New token pair
   */
  async refreshJWT(refreshToken: string): Promise<JWTTokenPair> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.jwtSecret, {
        algorithms: ['HS256'],
      }) as RefreshTokenPayload;

      // Load user to get current token version and role
      const user = await this.prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          organizationId: true,
          role: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // TODO: Check token version (invalidates old tokens on password change)
      // tokenVersion field not in User schema
      // if (user.tokenVersion !== decoded.tokenVersion) {
      //   throw new Error('Refresh token has been invalidated');
      // }

      // Generate new token pair
      const newTokens = await this.generateJWT(
        user.id,
        user.organizationId,
        user.email,
        user.role as UserRole
      );

      // Log token refresh
      await this.logSecurityEvent({
        type: SecurityEventType.TOKEN_REFRESH,
        userId: user.id,
        organizationId: user.organizationId,
        metadata: {},
        severity: 'low',
      });

      return newTokens;
    } catch (error) {
      console.error('Token refresh failed:', error.message);
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Revoke All User Tokens
   *
   * Increments token version to invalidate all existing tokens
   * Use this on password change, logout, or security breach
   *
   * @param userId - User ID
   */
  async revokeAllTokens(userId: string): Promise<void> {
    // TODO: Increment token version - tokenVersion field not in schema
    // await this.prisma.user.update({
    //   where: { id: userId },
    //   data: {
    //     tokenVersion: { increment: 1 },
    //   },
    // });

    await this.logSecurityEvent({
      type: SecurityEventType.LOGOUT,
      userId,
      metadata: { action: 'revoke_all_tokens' },
      severity: 'medium',
    });
  }

  /**
   * Generate Nonce
   *
   * For CSRF protection and replay attack prevention
   *
   * @returns Random nonce
   */
  private generateNonce(): string {
    return this.encryptionService.generateNonce();
  }

  /**
   * Log Security Event
   *
   * Records security events for audit trail
   * In production, this would write to database and monitoring system
   *
   * @param event - Security event details
   */
  private async logSecurityEvent(event: {
    type: SecurityEventType;
    userId?: string;
    organizationId?: string;
    metadata: Record<string, any>;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<void> {
    // TODO: Implement database logging
    console.log('[SECURITY EVENT]', {
      ...event,
      timestamp: new Date().toISOString(),
    });

    // In production:
    // - Store in audit_logs table
    // - Send to monitoring system (DataDog, Sentry)
    // - Alert on critical events
  }

  /**
   * Cleanup Expired Nonces
   *
   * Removes expired nonces from memory
   * Should be called periodically (e.g., every hour)
   */
  cleanupExpiredNonces(): void {
    const now = new Date();
    for (const [nonce, record] of this.nonceStore.entries()) {
      if (record.expiresAt < now) {
        this.nonceStore.delete(nonce);
      }
    }
  }
}

// Singleton instance
let authServiceInstance: AuthService | null = null;

/**
 * Get Auth Service Instance
 *
 * @param prisma - Prisma client
 * @returns Auth service instance
 */
export function getAuthService(prisma: PrismaClient): AuthService {
  if (!authServiceInstance) {
    authServiceInstance = new AuthService(prisma);
  }
  return authServiceInstance;
}
