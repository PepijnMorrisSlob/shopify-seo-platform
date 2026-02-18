/**
 * RBAC Guard (NestJS)
 * Shopify SEO Automation Platform
 *
 * NestJS guard for role-based access control
 *
 * USAGE:
 * @UseGuards(ShopifyAuthGuard, RBACGuard)
 * @RequirePermission({ resource: 'products', action: 'create' })
 * @Post('products')
 * async createProduct() { ... }
 *
 * OR:
 * @UseGuards(ShopifyAuthGuard, RBACGuard)
 * @RequireRole(UserRole.OWNER)
 * @Delete('organization')
 * async deleteOrganization() { ... }
 *
 * WHAT IT DOES:
 * 1. Checks if user has required permission or role
 * 2. Denies access if insufficient permissions
 * 3. Logs permission denials for audit
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';
import { getRBACService } from '../services/rbac-service';
import { ResourceType, ActionType, UserRole, Permission } from '../types/auth.types';

// Metadata keys
export const PERMISSION_KEY = 'permission';
export const ROLE_KEY = 'role';
export const ROLES_KEY = 'roles';

/**
 * Decorator to require specific permission
 *
 * @param permission - Required permission
 */
export const RequirePermission = (permission: Permission) =>
  SetMetadata(PERMISSION_KEY, permission);

/**
 * Decorator to require specific role
 *
 * @param role - Required role
 */
export const RequireRole = (role: UserRole) => SetMetadata(ROLE_KEY, role);

/**
 * Decorator to require any of specified roles
 *
 * @param roles - Array of allowed roles
 */
export const RequireAnyRole = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

/**
 * RBAC Guard
 *
 * Validates user has required permissions or roles
 */
@Injectable()
export class RBACGuard implements CanActivate {
  private readonly prisma = new PrismaClient();
  private readonly rbacService = getRBACService(this.prisma);

  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Ensure user is authenticated
    if (!request.user) {
      throw new ForbiddenException('User not authenticated');
    }

    const userId = request.user.id;

    // Check for permission requirement
    const permission = this.reflector.get<Permission>(
      PERMISSION_KEY,
      context.getHandler()
    );

    if (permission) {
      const hasPermission = await this.rbacService.hasPermission(
        userId,
        permission.resource,
        permission.action
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          `Insufficient permissions: ${permission.action} on ${permission.resource}`
        );
      }

      return true;
    }

    // Check for single role requirement
    const requiredRole = this.reflector.get<UserRole>(ROLE_KEY, context.getHandler());

    if (requiredRole) {
      const userRole = await this.rbacService.getUserRole(userId);

      if (userRole !== requiredRole) {
        throw new ForbiddenException(`Required role: ${requiredRole}`);
      }

      return true;
    }

    // Check for multiple roles requirement
    const requiredRoles = this.reflector.get<UserRole[]>(
      ROLES_KEY,
      context.getHandler()
    );

    if (requiredRoles && requiredRoles.length > 0) {
      const userRole = await this.rbacService.getUserRole(userId);

      if (!userRole || !requiredRoles.includes(userRole)) {
        throw new ForbiddenException(
          `Required one of roles: ${requiredRoles.join(', ')}`
        );
      }

      return true;
    }

    // No permission or role requirement specified, allow access
    return true;
  }
}

/**
 * Owner Only Guard
 *
 * Ensures only organization owners can access
 */
@Injectable()
export class OwnerOnlyGuard implements CanActivate {
  private readonly prisma = new PrismaClient();
  private readonly rbacService = getRBACService(this.prisma);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    if (!request.user) {
      throw new ForbiddenException('User not authenticated');
    }

    const isOwner = await this.rbacService.isOwner(request.user.id);

    if (!isOwner) {
      throw new ForbiddenException('This action requires owner role');
    }

    return true;
  }
}

/**
 * Admin or Owner Guard
 *
 * Ensures user is admin or owner
 */
@Injectable()
export class AdminOrOwnerGuard implements CanActivate {
  private readonly prisma = new PrismaClient();
  private readonly rbacService = getRBACService(this.prisma);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    if (!request.user) {
      throw new ForbiddenException('User not authenticated');
    }

    const isAdminOrOwner = await this.rbacService.isAdminOrOwner(request.user.id);

    if (!isAdminOrOwner) {
      throw new ForbiddenException('This action requires admin or owner role');
    }

    return true;
  }
}

/**
 * Resource Owner Guard
 *
 * Ensures user owns the resource being accessed
 * Use with @Param('id') to check ownership
 */
@Injectable()
export class ResourceOwnerGuard implements CanActivate {
  private readonly prisma = new PrismaClient();
  private readonly rbacService = getRBACService(this.prisma);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    if (!request.user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get resource ID from params
    const resourceId = request.params.id;

    if (!resourceId) {
      throw new ForbiddenException('Resource ID not provided');
    }

    // Determine resource type from route (simplified)
    // In production, you'd use a decorator or metadata
    const resourceType = this.getResourceTypeFromRoute(request.route?.path);

    if (!resourceType) {
      // Can't determine resource type, allow owner/admin
      const isAdminOrOwner = await this.rbacService.isAdminOrOwner(request.user.id);
      return isAdminOrOwner;
    }

    // Check if user owns the resource
    const isOwner = await this.rbacService.isResourceOwner(
      request.user.id,
      resourceType,
      resourceId
    );

    // If not owner, check if admin/owner (they can access any resource)
    if (!isOwner) {
      const isAdminOrOwner = await this.rbacService.isAdminOrOwner(request.user.id);

      if (!isAdminOrOwner) {
        throw new ForbiddenException('You do not own this resource');
      }
    }

    return true;
  }

  /**
   * Extract resource type from route path
   * Example: /api/content/:id → 'content'
   */
  private getResourceTypeFromRoute(routePath?: string): string | null {
    if (!routePath) return null;

    const match = routePath.match(/\/api\/([^/]+)\//);
    return match ? match[1] : null;
  }
}

/**
 * Plan Tier Guard
 *
 * Ensures organization has required plan tier
 */
@Injectable()
export class PlanTierGuard implements CanActivate {
  constructor(private readonly requiredTier: string) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    if (!request.organization) {
      throw new ForbiddenException('Organization not found');
    }

    const planTier = request.organization.planTier;

    // Define plan hierarchy
    const planHierarchy = {
      free: 0,
      starter: 1,
      professional: 2,
      enterprise: 3,
    };

    const currentTierLevel = planHierarchy[planTier as keyof typeof planHierarchy] || 0;
    const requiredTierLevel =
      planHierarchy[this.requiredTier as keyof typeof planHierarchy] || 0;

    if (currentTierLevel < requiredTierLevel) {
      throw new ForbiddenException(
        `This feature requires ${this.requiredTier} plan or higher`
      );
    }

    return true;
  }
}

/**
 * Factory function to create plan tier guard
 *
 * @param requiredTier - Required plan tier
 */
export function RequirePlanTier(requiredTier: string) {
  @Injectable()
  class PlanTierGuardClass extends PlanTierGuard {
    constructor() {
      super(requiredTier);
    }
  }

  return PlanTierGuardClass;
}
