/**
 * Authentication Controller
 * Handles Shopify OAuth flow
 */

import { Controller, Get, Query, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getAuthService } from '../services/auth-service';

@Controller('auth')
export class AuthController {
  private prisma = new PrismaClient();
  private authService = getAuthService(this.prisma);

  /**
   * Step 1: Initiate Shopify OAuth
   * GET /api/auth/shopify?shop=test-shop.myshopify.com
   */
  @Get('shopify')
  async initiateOAuth(@Query('shop') shop: string, @Res() res: Response) {
    try {
      if (!shop) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: 'Missing shop parameter',
          message: 'Please provide shop domain (e.g., ?shop=example.myshopify.com)',
        });
      }

      // Generate OAuth URL
      const authUrl = await this.authService.generateOAuthUrl(shop);

      // Redirect to Shopify for installation
      return res.redirect(authUrl);
    } catch (error: any) {
      console.error('[AuthController] OAuth initiation failed:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'OAuth initiation failed',
        message: error.message,
      });
    }
  }

  /**
   * Step 2: Handle Shopify OAuth Callback
   * GET /api/auth/shopify/callback?code=xxx&hmac=xxx&shop=xxx&state=xxx
   */
  @Get('shopify/callback')
  async handleCallback(@Query() query: any, @Res() res: Response) {
    try {
      console.log('[AuthController] OAuth callback received:', {
        shop: query.shop,
        hasCode: !!query.code,
        hasHmac: !!query.hmac,
      });

      // Validate callback
      const validation = await this.authService.validateCallback(query);

      if (!validation.valid) {
        console.error('[AuthController] Invalid callback:', validation.reason);
        return res.status(HttpStatus.FORBIDDEN).json({
          error: 'Invalid OAuth callback',
          message: validation.reason,
        });
      }

      // Exchange code for access token
      const accessToken = await this.authService.exchangeCodeForToken(
        query.shop,
        query.code
      );

      // Store encrypted access token
      const organizationId = await this.authService.storeAccessToken(
        query.shop,
        accessToken
      );

      console.log('[AuthController] OAuth successful:', {
        shop: query.shop,
        organizationId,
      });

      // Redirect to frontend dashboard
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4173';
      return res.redirect(`${frontendUrl}/dashboard?installed=true&shop=${query.shop}`);
    } catch (error: any) {
      console.error('[AuthController] OAuth callback failed:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'OAuth callback failed',
        message: error.message,
      });
    }
  }

  /**
   * Get current session info
   * GET /api/auth/session
   */
  @Get('session')
  async getSession(@Query('shop') shop: string) {
    if (!shop) {
      return { authenticated: false };
    }

    const organization = await this.prisma.organization.findUnique({
      where: { shopifyDomain: shop },
      select: {
        id: true,
        shopifyDomain: true,
        planTier: true,
        installedAt: true,
        uninstalledAt: true,
      },
    });

    if (!organization || organization.uninstalledAt) {
      return { authenticated: false };
    }

    return {
      authenticated: true,
      organization: {
        id: organization.id,
        shop: organization.shopifyDomain,
        plan: organization.planTier,
        installedAt: organization.installedAt,
      },
    };
  }
}
