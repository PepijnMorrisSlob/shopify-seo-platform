/**
 * Session Token Validator
 * Shopify SEO Automation Platform
 *
 * Validates Shopify App Bridge session tokens for embedded apps
 *
 * SHOPIFY APP BRIDGE FLOW:
 * 1. Frontend (embedded in Shopify admin) gets session token from App Bridge
 * 2. Frontend includes token in Authorization header: "Bearer <token>"
 * 3. Backend validates token using this service
 * 4. Extract shop domain and user info from token payload
 *
 * SESSION TOKEN STRUCTURE (JWT):
 * {
 *   "iss": "https://example.myshopify.com/admin",
 *   "dest": "https://example.myshopify.com",
 *   "aud": "api-key-from-shopify-partners",
 *   "sub": "1234567890",
 *   "exp": 1234567890,
 *   "nbf": 1234567890,
 *   "iat": 1234567890,
 *   "jti": "unique-token-id",
 *   "sid": "session-id"
 * }
 *
 * CRITICAL SECURITY:
 * - Verify signature using Shopify's public key
 * - Check expiration (tokens expire after 1 minute by default)
 * - Validate audience (must match our API key)
 * - Extract shop domain from 'dest' claim (NOT from client)
 */

import jwt from 'jsonwebtoken';
import axios from 'axios';
import {
  SessionTokenPayload,
  SessionContext,
  SecurityEventType,
} from '../types/auth.types';

export class SessionTokenValidator {
  private readonly apiKey: string;
  private publicKey: string | null = null;
  private publicKeyFetchedAt: Date | null = null;
  private readonly publicKeyTTL = 3600000; // 1 hour in milliseconds

  constructor() {
    this.apiKey = process.env.SHOPIFY_API_KEY || '';

    if (!this.apiKey) {
      throw new Error('SHOPIFY_API_KEY environment variable is not set');
    }
  }

  /**
   * Validate Session Token
   *
   * Validates Shopify App Bridge session token
   *
   * @param token - Session token from Authorization header
   * @returns Session context with shop domain and user ID
   */
  async validate(token: string): Promise<SessionContext> {
    try {
      // 1. Fetch Shopify public key if needed
      await this.ensurePublicKey();

      if (!this.publicKey) {
        throw new Error('Failed to fetch Shopify public key');
      }

      // 2. Verify and decode token
      const payload = jwt.verify(token, this.publicKey, {
        algorithms: ['RS256'],
        audience: this.apiKey, // Must match our API key
      }) as SessionTokenPayload;

      // 3. Validate payload structure
      this.validatePayload(payload);

      // 4. Extract shop domain from 'dest' claim
      const shop = this.extractShopDomain(payload.dest);

      if (!shop) {
        throw new Error('Invalid dest claim in session token');
      }

      // 5. Build session context
      const context: SessionContext = {
        shop,
        userId: payload.sub,
        sessionId: payload.sid,
        isOnlineToken: true, // App Bridge tokens are online tokens
      };

      return context;
    } catch (error) {
      console.error('Session token validation failed:', error.message);

      // Log security event
      await this.logSecurityEvent({
        type: SecurityEventType.INVALID_SESSION_TOKEN,
        metadata: { error: error.message },
        severity: 'high',
      });

      throw new Error(`Invalid session token: ${error.message}`);
    }
  }

  /**
   * Extract Shop Domain from Token
   *
   * Extracts shop domain from 'dest' or 'iss' claim
   *
   * @param token - Session token
   * @returns Shop domain (e.g., example.myshopify.com)
   */
  extractShopDomain(dest: string): string | null {
    try {
      // dest format: "https://example.myshopify.com"
      const url = new URL(dest);
      const hostname = url.hostname;

      // Validate it's a Shopify domain
      if (!hostname.endsWith('.myshopify.com')) {
        return null;
      }

      return hostname;
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate Token Payload
   *
   * Checks required claims are present
   *
   * @param payload - Decoded token payload
   */
  private validatePayload(payload: SessionTokenPayload): void {
    // Check required claims
    const requiredClaims = ['iss', 'dest', 'aud', 'sub', 'exp', 'nbf', 'iat'];

    for (const claim of requiredClaims) {
      if (!(claim in payload)) {
        throw new Error(`Missing required claim: ${claim}`);
      }
    }

    // Validate audience matches our API key
    if (payload.aud !== this.apiKey) {
      throw new Error(
        `Invalid audience. Expected: ${this.apiKey}, Got: ${payload.aud}`
      );
    }

    // Validate issuer format
    if (!payload.iss.includes('.myshopify.com')) {
      throw new Error('Invalid issuer format');
    }

    // Validate destination format
    if (!payload.dest.includes('.myshopify.com')) {
      throw new Error('Invalid destination format');
    }

    // Check expiration (additional check, jwt.verify already checks this)
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      throw new Error('Token has expired');
    }

    // Check not-before time
    if (payload.nbf > now) {
      throw new Error('Token is not yet valid');
    }
  }

  /**
   * Ensure Public Key is Loaded
   *
   * Fetches Shopify's public key from their server
   * Caches key for 1 hour to reduce API calls
   */
  private async ensurePublicKey(): Promise<void> {
    const now = new Date();

    // Check if we need to fetch (first time or expired)
    if (
      !this.publicKey ||
      !this.publicKeyFetchedAt ||
      now.getTime() - this.publicKeyFetchedAt.getTime() > this.publicKeyTTL
    ) {
      await this.fetchPublicKey();
    }
  }

  /**
   * Fetch Shopify Public Key
   *
   * Retrieves public key from Shopify's JWKS endpoint
   * Uses RS256 algorithm for JWT verification
   */
  private async fetchPublicKey(): Promise<void> {
    try {
      // Shopify's public key endpoint
      const jwksUrl = 'https://shopify.dev/.well-known/shopify-oauth-public-keys';

      const response = await axios.get(jwksUrl, {
        timeout: 5000,
      });

      const { keys } = response.data;

      if (!keys || keys.length === 0) {
        throw new Error('No keys found in JWKS response');
      }

      // Get the first key (Shopify typically has one active key)
      const key = keys[0];

      // Convert JWK to PEM format
      this.publicKey = this.jwkToPem(key);
      this.publicKeyFetchedAt = new Date();

      console.log('Shopify public key fetched successfully');
    } catch (error) {
      console.error('Failed to fetch Shopify public key:', error.message);
      throw new Error('Could not fetch Shopify public key');
    }
  }

  /**
   * Convert JWK to PEM
   *
   * Converts JSON Web Key to PEM format for use with jwt.verify
   *
   * @param jwk - JSON Web Key
   * @returns PEM-formatted public key
   */
  private jwkToPem(jwk: any): string {
    // For production, use a library like 'jwk-to-pem'
    // This is a simplified version

    // In production, install: npm install jwk-to-pem
    // import jwkToPem from 'jwk-to-pem';
    // return jwkToPem(jwk);

    // For now, we'll use a placeholder
    // The actual implementation requires proper JWK to PEM conversion
    console.warn('Using placeholder JWK to PEM conversion');

    // NOTE: In production, replace this with actual jwk-to-pem library
    // This is just a placeholder that won't work in production
    return jwk.x5c?.[0]
      ? `-----BEGIN CERTIFICATE-----\n${jwk.x5c[0]}\n-----END CERTIFICATE-----`
      : '';
  }

  /**
   * Verify Token Without Full Validation
   *
   * Decodes token without verification (for debugging only)
   * DO NOT USE IN PRODUCTION AUTHENTICATION
   *
   * @param token - Session token
   * @returns Decoded payload (unverified)
   */
  decodeWithoutVerification(token: string): SessionTokenPayload {
    return jwt.decode(token) as SessionTokenPayload;
  }

  /**
   * Check Token Expiration
   *
   * Checks if token is about to expire
   *
   * @param token - Session token
   * @param bufferSeconds - Consider expired if less than this many seconds remain
   * @returns True if token is expired or about to expire
   */
  isTokenExpiringSoon(token: string, bufferSeconds: number = 30): boolean {
    try {
      const payload = this.decodeWithoutVerification(token);
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = payload.exp - now;

      return expiresIn < bufferSeconds;
    } catch (error) {
      return true; // Consider invalid tokens as expired
    }
  }

  /**
   * Log Security Event
   *
   * Records security events for audit trail
   *
   * @param event - Security event details
   */
  private async logSecurityEvent(event: {
    type: SecurityEventType;
    metadata: Record<string, any>;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<void> {
    // TODO: Implement database logging
    console.log('[SECURITY EVENT]', {
      ...event,
      timestamp: new Date().toISOString(),
    });
  }
}

// Singleton instance
let sessionTokenValidatorInstance: SessionTokenValidator | null = null;

/**
 * Get Session Token Validator Instance
 */
export function getSessionTokenValidator(): SessionTokenValidator {
  if (!sessionTokenValidatorInstance) {
    sessionTokenValidatorInstance = new SessionTokenValidator();
  }
  return sessionTokenValidatorInstance;
}

/**
 * Validate Session Token (Convenience Function)
 *
 * @param token - Session token from Authorization header
 * @returns Session context
 */
export async function validateSessionToken(token: string): Promise<SessionContext> {
  return getSessionTokenValidator().validate(token);
}

/**
 * Extract Bearer Token from Authorization Header
 *
 * @param authHeader - Authorization header value
 * @returns Bearer token
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}
