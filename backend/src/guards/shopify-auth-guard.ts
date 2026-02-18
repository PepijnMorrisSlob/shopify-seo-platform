/**
 * Shopify Auth Guard (NestJS)
 * Shopify SEO Automation Platform
 *
 * NestJS guard for protecting routes with Shopify authentication
 *
 * USAGE:
 * @UseGuards(ShopifyAuthGuard)
 * @Get('protected')
 * async getProtectedResource() { ... }
 *
 * WHAT IT DOES:
 * 1. Validates session token from Authorization header
 * 2. Loads organization and user from database
 * 3. Attaches user and organization to request
 * 4. Denies access if invalid or missing token
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  validateSessionToken,
  extractBearerToken,
} from '../services/session-token-validator';
import { getEncryptionService } from '../services/encryption-service';
import { UserRole } from '../types/auth.types';

@Injectable()
export class ShopifyAuthGuard implements CanActivate {
  private readonly prisma = new PrismaClient();
  private readonly encryptionService = getEncryptionService();

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    try {
      // Extract token
      const authHeader = request.headers.authorization;
      const token = extractBearerToken(authHeader);

      if (!token) {
        throw new UnauthorizedException('Missing authorization token');
      }

      // Validate session token
      const sessionContext = await validateSessionToken(token);

      // Load organization
      const organization = await this.prisma.organization.findUnique({
        where: { shopifyDomain: sessionContext.shop },
        select: {
          id: true,
          shopifyDomain: true,
          planTier: true,
          accessTokenEncrypted: true,
          uninstalledAt: true,
        },
      });

      if (!organization) {
        throw new UnauthorizedException(
          `Organization not found for shop: ${sessionContext.shop}`
        );
      }

      if (organization.uninstalledAt) {
        throw new UnauthorizedException('App has been uninstalled');
      }

      // Decrypt access token
      const decryptedAccessToken = this.encryptionService.decryptAccessToken(
        JSON.parse(organization.accessTokenEncrypted) as any
      );

      // Load or create user
      let user = await this.prisma.user.findFirst({
        where: {
          email: `user-${sessionContext.userId}@${sessionContext.shop}`, // Match by email since shopifyUserId field not in schema
          organizationId: organization.id,
        },
        select: {
          id: true,
          email: true,
          role: true,
          organizationId: true,
        },
      });

      if (!user) {
        // Auto-create user
        const userCount = await this.prisma.user.count({
          where: { organizationId: organization.id },
        });

        user = await this.prisma.user.create({
          data: {
            organizationId: organization.id,
            email: `user-${sessionContext.userId}@${sessionContext.shop}`,
            role: userCount === 0 ? 'OWNER' : 'MEMBER',
            permissions: [],
          },
          select: {
            id: true,
            email: true,
            role: true,
            organizationId: true,
          },
        });
      }

      // Update last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Attach to request
      request.user = {
        id: user.id,
        email: user.email,
        organizationId: user.organizationId,
        role: user.role as UserRole,
        shopDomain: sessionContext.shop,
      };

      request.organization = {
        id: organization.id,
        shopDomain: organization.shopifyDomain,
        planTier: organization.planTier,
        accessToken: decryptedAccessToken,
      };

      return true;
    } catch (error) {
      console.error('Shopify auth guard error:', error);

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Authentication failed');
    }
  }
}

/**
 * Optional Auth Guard
 *
 * Attempts authentication but doesn't fail if no token
 */
@Injectable()
export class OptionalShopifyAuthGuard implements CanActivate {
  private readonly shopifyAuthGuard = new ShopifyAuthGuard();

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return await this.shopifyAuthGuard.canActivate(context);
    } catch (error) {
      // On error, allow access but without authentication
      return true;
    }
  }
}
