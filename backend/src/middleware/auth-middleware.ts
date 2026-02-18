/**
 * Authentication Middleware
 * Shopify SEO Automation Platform
 *
 * Express/NestJS middleware for validating authentication
 *
 * AUTHENTICATION FLOW:
 * 1. Extract session token from Authorization header
 * 2. Validate session token (Shopify App Bridge)
 * 3. Extract shop domain from token
 * 4. Load organization from database
 * 5. Load user from database
 * 6. Attach user and organization to request
 *
 * USAGE:
 * app.use(authMiddleware);
 * or
 * app.get('/protected', authMiddleware, handler);
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  validateSessionToken,
  extractBearerToken,
} from '../services/session-token-validator';
import { AuthenticatedRequest, UserRole } from '../types/auth.types';
import { getEncryptionService } from '../services/encryption-service';

const prisma = new PrismaClient();
const encryptionService = getEncryptionService();

/**
 * Authentication Middleware
 *
 * Validates session token and loads user/organization context
 */
export async function authMiddleware(
  req: Request & Partial<AuthenticatedRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 1. Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = extractBearerToken(authHeader);

    if (!token) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing authorization token',
      });
      return;
    }

    // 2. Validate session token
    const sessionContext = await validateSessionToken(token);

    // 3. Load organization by shop domain
    const organization = await prisma.organization.findUnique({
      where: { shopifyDomain: sessionContext.shop },
      select: {
        id: true,
        shopifyDomain: true,
        shopifyShopId: true,
        accessTokenEncrypted: true,
        shopifyScopes: true,
        planTier: true,
        billingStatus: true,
        trialEndsAt: true,
        subscriptionId: true,
        mrr: true,
        storeName: true,
        storeOwnerEmail: true,
        country: true,
        currency: true,
        timezone: true,
        installedAt: true,
        uninstalledAt: true,
        isActive: true,
        monthlyApiCalls: true,
        monthlyContentGens: true,
        lastSyncAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!organization) {
      res.status(404).json({
        error: 'Organization not found',
        message: `No organization found for shop: ${sessionContext.shop}`,
      });
      return;
    }

    // Check if app is uninstalled
    if (organization.uninstalledAt) {
      res.status(403).json({
        error: 'App uninstalled',
        message: 'This app has been uninstalled. Please reinstall to continue.',
      });
      return;
    }

    // 4. Decrypt access token
    const decryptedAccessToken = encryptionService.decryptAccessToken(JSON.parse(organization.accessTokenEncrypted) as any);

    // 5. Load user by Shopify user ID
    // Note: For first-time users, you may need to create the user record
    let user = await prisma.user.findFirst({
      where: {
        email: `user-${sessionContext.userId}@${sessionContext.shop}`, // Match by email since we don't have shopifyUserId field
        organizationId: organization.id,
      },
      select: {
        id: true,
        email: true,
        role: true,
        organizationId: true,
      },
    });

    // Auto-create user if not exists (first login)
    if (!user) {
      // Check if this is the first user in the organization (make them owner)
      const userCount = await prisma.user.count({
        where: { organizationId: organization.id },
      });

      const isFirstUser = userCount === 0;

      user = await prisma.user.create({
        data: {
          organizationId: organization.id,
          email: `user-${sessionContext.userId}@${sessionContext.shop}`, // Placeholder
          role: isFirstUser ? 'OWNER' : 'MEMBER',
          permissions: [],
        },
        select: {
          id: true,
          email: true,
          role: true,
          organizationId: true,
        },
      });

      console.log(`Auto-created user: ${user.id} with role: ${user.role}`);
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 6. Attach user and organization to request
    req.user = {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role as UserRole,
      shopDomain: sessionContext.shop,
    };

    req.organization = {
      id: organization.id,
      shopDomain: organization.shopifyDomain,
      planTier: organization.planTier,
      accessToken: decryptedAccessToken,
    };

    // Continue to next middleware
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);

    // Determine error type
    if (error.message.includes('Invalid session token')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired session token',
      });
      return;
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication failed',
    });
  }
}

/**
 * Optional Authentication Middleware
 *
 * Attempts to authenticate but doesn't fail if no token
 * Useful for routes that work both authenticated and unauthenticated
 */
export async function optionalAuthMiddleware(
  req: Request & Partial<AuthenticatedRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = extractBearerToken(authHeader);

    if (!token) {
      // No token provided, continue without auth
      next();
      return;
    }

    // If token is provided, validate it
    await authMiddleware(req, res, next);
  } catch (error) {
    // On error, continue without auth
    console.warn('Optional auth failed:', error.message);
    next();
  }
}

/**
 * Webhook Authentication Middleware
 *
 * Validates Shopify webhook HMAC
 */
export async function webhookAuthMiddleware(
  req: Request & { rawBody?: Buffer },
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const hmacHeader = req.headers['x-shopify-hmac-sha256'] as string;
    const shopDomain = req.headers['x-shopify-shop-domain'] as string;

    if (!hmacHeader) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing HMAC header',
      });
      return;
    }

    // Get raw body (must be set up in Express with bodyParser.raw())
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));

    // Validate HMAC
    const { HMACValidator } = await import('../utils/hmac-validator');
    const apiSecret = process.env.SHOPIFY_API_SECRET || '';

    const result = HMACValidator.validateWebhook(rawBody, hmacHeader, apiSecret);

    if (!result.valid) {
      console.error('Webhook HMAC validation failed:', result.reason);
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid webhook HMAC',
      });
      return;
    }

    // Attach shop domain to request
    (req as any).shopDomain = shopDomain;

    next();
  } catch (error) {
    console.error('Webhook auth middleware error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Webhook authentication failed',
    });
  }
}

/**
 * API Key Authentication Middleware
 *
 * For REST API access using API keys
 */
export async function apiKeyAuthMiddleware(
  req: Request & Partial<AuthenticatedRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract API key from header
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing API key',
      });
      return;
    }

    // TODO: Validate API key - apiKey model not in schema
    // For now, return error since model doesn't exist
    res.status(501).json({
      error: 'Not Implemented',
      message: 'API key authentication not yet implemented - apiKey model missing from schema',
    });
    return;

  } catch (error) {
    console.error('API key auth middleware error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'API key authentication failed',
    });
  }
}
