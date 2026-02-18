/**
 * HMAC Validator Utility
 * Shopify SEO Automation Platform
 *
 * Validates HMAC signatures for:
 * - OAuth callbacks
 * - Webhook requests
 * - App proxy requests
 *
 * CRITICAL SECURITY:
 * - Uses timing-safe comparison to prevent timing attacks
 * - Validates ALL query parameters except 'hmac' and 'signature'
 * - Parameters must be sorted alphabetically
 * - Uses SHA-256 HMAC
 */

import crypto from 'crypto';
import { HMACValidationResult } from '../types/auth.types';

export class HMACValidator {
  /**
   * Validate Shopify OAuth Callback HMAC
   *
   * Shopify sends HMAC in query params:
   * ?code=xxx&hmac=yyy&shop=example.myshopify.com&state=zzz&timestamp=123456
   *
   * HMAC is calculated on all params EXCEPT 'hmac' and 'signature'
   *
   * @param query - Query parameters object
   * @param secret - Shopify API secret
   * @returns Validation result
   */
  static validateOAuthCallback(
    query: Record<string, string>,
    secret: string
  ): HMACValidationResult {
    try {
      const { hmac, signature, ...params } = query;

      if (!hmac) {
        return {
          valid: false,
          reason: 'HMAC parameter is missing',
        };
      }

      // Build message string
      const message = this.buildMessageString(params);

      // Calculate expected HMAC
      const expectedHmac = crypto
        .createHmac('sha256', secret)
        .update(message)
        .digest('hex');

      // Timing-safe comparison
      const valid = this.timingSafeEqual(hmac, expectedHmac);

      return {
        valid,
        reason: valid ? undefined : 'HMAC signature does not match',
      };
    } catch (error) {
      console.error('HMAC validation error:', error);
      return {
        valid: false,
        reason: `Validation error: ${error.message}`,
      };
    }
  }

  /**
   * Validate Shopify Webhook HMAC
   *
   * Webhooks send HMAC in header: X-Shopify-Hmac-Sha256
   * HMAC is calculated on the raw request body
   *
   * @param body - Raw request body (string or Buffer)
   * @param hmacHeader - X-Shopify-Hmac-Sha256 header value
   * @param secret - Shopify API secret
   * @returns Validation result
   */
  static validateWebhook(
    body: string | Buffer,
    hmacHeader: string,
    secret: string
  ): HMACValidationResult {
    try {
      if (!hmacHeader) {
        return {
          valid: false,
          reason: 'X-Shopify-Hmac-Sha256 header is missing',
        };
      }

      // Ensure body is a Buffer
      const bodyBuffer = typeof body === 'string' ? Buffer.from(body) : body;

      // Calculate expected HMAC (base64-encoded)
      const expectedHmac = crypto
        .createHmac('sha256', secret)
        .update(bodyBuffer)
        .digest('base64');

      // Timing-safe comparison
      const valid = this.timingSafeEqual(hmacHeader, expectedHmac);

      return {
        valid,
        reason: valid ? undefined : 'Webhook HMAC signature does not match',
      };
    } catch (error) {
      console.error('Webhook HMAC validation error:', error);
      return {
        valid: false,
        reason: `Validation error: ${error.message}`,
      };
    }
  }

  /**
   * Validate Shopify App Proxy HMAC
   *
   * App proxy requests include signature parameter
   * Signature is calculated on query string
   *
   * @param query - Query parameters object
   * @param secret - Shopify API secret
   * @returns Validation result
   */
  static validateAppProxy(
    query: Record<string, string>,
    secret: string
  ): HMACValidationResult {
    try {
      const { signature, ...params } = query;

      if (!signature) {
        return {
          valid: false,
          reason: 'Signature parameter is missing',
        };
      }

      // Build message string
      const message = this.buildMessageString(params);

      // Calculate expected signature
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(message)
        .digest('hex');

      // Timing-safe comparison
      const valid = this.timingSafeEqual(signature, expectedSignature);

      return {
        valid,
        reason: valid ? undefined : 'App proxy signature does not match',
      };
    } catch (error) {
      console.error('App proxy validation error:', error);
      return {
        valid: false,
        reason: `Validation error: ${error.message}`,
      };
    }
  }

  /**
   * Build Message String from Query Parameters
   *
   * Shopify HMAC calculation:
   * 1. Remove 'hmac' and 'signature' parameters
   * 2. Sort parameters alphabetically
   * 3. Join with '&' in key=value format
   *
   * Example: code=123&shop=example.myshopify.com&state=abc&timestamp=456
   *
   * @param params - Query parameters (without hmac/signature)
   * @returns Message string
   */
  private static buildMessageString(params: Record<string, string>): string {
    // Sort keys alphabetically
    const sortedKeys = Object.keys(params).sort();

    // Build key=value pairs
    const pairs = sortedKeys.map((key) => {
      const value = params[key];
      return `${key}=${value}`;
    });

    // Join with '&'
    return pairs.join('&');
  }

  /**
   * Timing-Safe String Comparison
   *
   * Prevents timing attacks by comparing strings in constant time
   *
   * @param a - First string
   * @param b - Second string
   * @returns True if strings are equal
   */
  private static timingSafeEqual(a: string, b: string): boolean {
    try {
      const bufferA = Buffer.from(a);
      const bufferB = Buffer.from(b);

      if (bufferA.length !== bufferB.length) {
        return false;
      }

      return crypto.timingSafeEqual(bufferA, bufferB);
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate Shop Domain
   *
   * Ensures shop domain is a valid Shopify domain
   * Prevents domain hijacking attacks
   *
   * Valid formats:
   * - example.myshopify.com
   * - example-dev.myshopify.com
   *
   * @param shop - Shop domain
   * @returns True if valid
   */
  static isValidShopDomain(shop: string): boolean {
    if (!shop) return false;

    // Shopify domain pattern
    const shopifyDomainRegex = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i;

    return shopifyDomainRegex.test(shop);
  }

  /**
   * Extract Shop Domain from URL
   *
   * Extracts shop domain from various URL formats:
   * - https://example.myshopify.com/admin
   * - example.myshopify.com
   *
   * @param url - URL or domain string
   * @returns Normalized shop domain
   */
  static extractShopDomain(url: string): string | null {
    try {
      // Remove protocol if present
      let domain = url.replace(/^https?:\/\//, '');

      // Remove path if present
      domain = domain.split('/')[0];

      // Validate
      if (this.isValidShopDomain(domain)) {
        return domain;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate Timestamp
   *
   * Ensures timestamp is recent (within 24 hours)
   * Prevents replay attacks
   *
   * @param timestamp - Unix timestamp (seconds)
   * @param maxAgeSeconds - Maximum age in seconds (default: 24 hours)
   * @returns True if timestamp is valid
   */
  static isTimestampValid(
    timestamp: string | number,
    maxAgeSeconds: number = 86400
  ): boolean {
    try {
      const ts = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;

      if (isNaN(ts)) {
        return false;
      }

      const now = Math.floor(Date.now() / 1000);
      const age = now - ts;

      // Check if timestamp is in the future (allow 5 min clock skew)
      if (age < -300) {
        return false;
      }

      // Check if timestamp is too old
      if (age > maxAgeSeconds) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate HMAC
   *
   * Utility method to generate HMAC for testing
   *
   * @param data - Data to sign
   * @param secret - Secret key
   * @returns HMAC (hex-encoded)
   */
  static generateHMAC(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * Generate Webhook HMAC
   *
   * Utility method to generate webhook HMAC for testing
   *
   * @param body - Request body
   * @param secret - Secret key
   * @returns HMAC (base64-encoded)
   */
  static generateWebhookHMAC(body: string | Buffer, secret: string): string {
    const bodyBuffer = typeof body === 'string' ? Buffer.from(body) : body;
    return crypto.createHmac('sha256', secret).update(bodyBuffer).digest('base64');
  }
}

// Export convenience functions
export const validateOAuthCallback = (
  query: Record<string, string>,
  secret: string
): HMACValidationResult => {
  return HMACValidator.validateOAuthCallback(query, secret);
};

export const validateWebhook = (
  body: string | Buffer,
  hmacHeader: string,
  secret: string
): HMACValidationResult => {
  return HMACValidator.validateWebhook(body, hmacHeader, secret);
};

export const isValidShopDomain = (shop: string): boolean => {
  return HMACValidator.isValidShopDomain(shop);
};

export const extractShopDomain = (url: string): string | null => {
  return HMACValidator.extractShopDomain(url);
};
