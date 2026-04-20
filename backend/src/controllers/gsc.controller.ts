/**
 * Google Search Console Controller
 *
 * Handles OAuth flow for connecting GSC to a Shopify store organization,
 * and exposes endpoints for fetching real search analytics data.
 *
 * OAuth flow:
 * 1. Frontend calls GET /api/gsc/auth-url → gets Google OAuth URL
 * 2. User approves in browser → Google redirects to GET /api/gsc/callback
 * 3. Backend exchanges code for tokens → stores in Organization
 * 4. Frontend calls GET /api/gsc/sites → user picks which site to track
 * 5. POST /api/gsc/select-site → saves chosen siteUrl
 */

import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  GoogleSearchConsoleService,
  GSCClientConfig,
} from '../services/google-search-console-service';

@Controller('gsc')
export class GSCController {
  private readonly prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  private createGSCService(): GoogleSearchConsoleService {
    const clientId = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET;
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3003';

    if (!clientId || !clientSecret) {
      throw new HttpException(
        'Google Search Console is not configured. Set GOOGLE_SEARCH_CONSOLE_CLIENT_ID and GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return new GoogleSearchConsoleService({
      clientId,
      clientSecret,
      redirectUri: `${backendUrl}/api/gsc/callback`,
    });
  }

  private async getGSCServiceForOrg(organizationId: string): Promise<GoogleSearchConsoleService> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new HttpException('Organization not found', HttpStatus.NOT_FOUND);
    }

    if (!org.gscRefreshToken) {
      throw new HttpException(
        'Google Search Console is not connected for this organization.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const service = this.createGSCService();
    service.setTokens({
      access_token: org.gscAccessToken || '',
      refresh_token: org.gscRefreshToken,
      scope: 'https://www.googleapis.com/auth/webmasters.readonly',
      token_type: 'Bearer',
      expiry_date: org.gscTokenExpiry?.getTime() || 0,
    });

    // Refresh token if expired
    if (!org.gscTokenExpiry || org.gscTokenExpiry.getTime() < Date.now()) {
      try {
        const newTokens = await service.refreshAccessToken();
        await this.prisma.organization.update({
          where: { id: organizationId },
          data: {
            gscAccessToken: newTokens.access_token,
            gscTokenExpiry: new Date(newTokens.expiry_date),
          },
        });
      } catch (error: any) {
        console.error(`[GSC] Token refresh failed for org ${organizationId}:`, error.message);
        throw new HttpException(
          'Failed to refresh GSC access. Please reconnect Google Search Console.',
          HttpStatus.UNAUTHORIZED,
        );
      }
    }

    return service;
  }

  /**
   * GET /api/gsc/auth-url
   * Returns the Google OAuth URL for the user to click.
   * State parameter carries the organizationId for the callback.
   */
  @Get('auth-url')
  getAuthUrl(
    @Query('organizationId') organizationId: string,
  ): { url: string } {
    if (!organizationId) {
      throw new HttpException('organizationId is required', HttpStatus.BAD_REQUEST);
    }

    const service = this.createGSCService();
    const baseUrl = service.getAuthUrl();

    // Append organizationId as state parameter for the callback
    const url = `${baseUrl}&state=${encodeURIComponent(organizationId)}`;

    return { url };
  }

  /**
   * GET /api/gsc/callback
   * Google redirects here after user approves.
   * Exchanges code for tokens, stores them, redirects to frontend.
   */
  @Get('callback')
  async handleCallback(
    @Query('code') code: string,
    @Query('state') organizationId: string,
    @Res() res: Response,
  ): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4173';

    if (!code || !organizationId) {
      res.redirect(`${frontendUrl}/settings?gsc=error&reason=missing_params`);
      return;
    }

    try {
      const service = this.createGSCService();
      const tokens = await service.authenticate(code);

      // Store tokens in the organization record
      await this.prisma.organization.update({
        where: { id: organizationId },
        data: {
          gscAccessToken: tokens.access_token,
          gscRefreshToken: tokens.refresh_token,
          gscTokenExpiry: new Date(tokens.expiry_date),
          gscConnectedAt: new Date(),
        },
      });

      console.log(`[GSC] Connected for organization ${organizationId}`);

      // Redirect to frontend settings page with success
      res.redirect(`${frontendUrl}/settings?gsc=connected`);
    } catch (error: any) {
      console.error(`[GSC] OAuth callback failed:`, error.message);
      res.redirect(`${frontendUrl}/settings?gsc=error&reason=${encodeURIComponent(error.message)}`);
    }
  }

  /**
   * GET /api/gsc/status
   * Returns the GSC connection status for an organization.
   */
  @Get('status')
  async getStatus(
    @Query('organizationId') organizationId: string,
  ): Promise<{ connected: boolean; siteUrl?: string; connectedAt?: Date }> {
    if (!organizationId) {
      throw new HttpException('organizationId is required', HttpStatus.BAD_REQUEST);
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        gscRefreshToken: true,
        gscSiteUrl: true,
        gscConnectedAt: true,
      },
    });

    if (!org) {
      throw new HttpException('Organization not found', HttpStatus.NOT_FOUND);
    }

    return {
      connected: !!org.gscRefreshToken,
      siteUrl: org.gscSiteUrl || undefined,
      connectedAt: org.gscConnectedAt || undefined,
    };
  }

  /**
   * POST /api/gsc/disconnect
   * Removes GSC connection for an organization.
   */
  @Post('disconnect')
  async disconnect(
    @Query('organizationId') organizationId: string,
  ): Promise<{ success: boolean }> {
    if (!organizationId) {
      throw new HttpException('organizationId is required', HttpStatus.BAD_REQUEST);
    }

    await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        gscAccessToken: null,
        gscRefreshToken: null,
        gscTokenExpiry: null,
        gscSiteUrl: null,
        gscConnectedAt: null,
      },
    });

    console.log(`[GSC] Disconnected for organization ${organizationId}`);

    return { success: true };
  }

  /**
   * GET /api/gsc/sites
   * Lists all verified sites in the user's GSC account.
   * User picks which one to track after connecting.
   */
  @Get('sites')
  async listSites(
    @Query('organizationId') organizationId: string,
  ) {
    if (!organizationId) {
      throw new HttpException('organizationId is required', HttpStatus.BAD_REQUEST);
    }

    const service = await this.getGSCServiceForOrg(organizationId);
    const sites = await service.listSites();

    return { sites };
  }

  /**
   * POST /api/gsc/select-site
   * After listing sites, user picks which one to track.
   * Stores the siteUrl in the organization record.
   */
  @Post('select-site')
  async selectSite(
    @Body() body: { organizationId: string; siteUrl: string },
  ): Promise<{ success: boolean }> {
    if (!body.organizationId || !body.siteUrl) {
      throw new HttpException(
        'organizationId and siteUrl are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.prisma.organization.update({
      where: { id: body.organizationId },
      data: { gscSiteUrl: body.siteUrl },
    });

    console.log(`[GSC] Site selected for org ${body.organizationId}: ${body.siteUrl}`);

    return { success: true };
  }

  /**
   * GET /api/gsc/performance
   * Fetch search performance data for a connected site.
   * Returns real impressions, clicks, CTR, position data from Google.
   */
  @Get('performance')
  async getPerformance(
    @Query('organizationId') organizationId: string,
    @Query('days') daysStr?: string,
  ) {
    if (!organizationId) {
      throw new HttpException('organizationId is required', HttpStatus.BAD_REQUEST);
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org?.gscSiteUrl) {
      throw new HttpException(
        'No GSC site selected. Connect GSC and select a site first.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const service = await this.getGSCServiceForOrg(organizationId);
    const days = parseInt(daysStr || '30', 10);

    const [topQueries, topPages] = await Promise.all([
      service.getTopQueries(org.gscSiteUrl, 100, days),
      service.getTopPages(org.gscSiteUrl, 100, days),
    ]);

    return {
      topQueries,
      topPages,
      period: `${days} days`,
      siteUrl: org.gscSiteUrl,
    };
  }
}
