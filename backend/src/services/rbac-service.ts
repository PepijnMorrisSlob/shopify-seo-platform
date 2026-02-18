/**
 * RBAC Service (Role-Based Access Control)
 * Shopify SEO Automation Platform
 *
 * Manages role-based permissions:
 * - Owner: Full access (can delete organization, manage billing)
 * - Admin: Manage products, content, view analytics
 * - Member: Create content, view analytics (read-only)
 *
 * PERMISSION MODEL:
 * - Resource-based (products, content, analytics, settings, etc.)
 * - Action-based (create, read, update, delete)
 * - Role hierarchy (owner > admin > member)
 *
 * CRITICAL SECURITY:
 * - All protected routes must check permissions
 * - Deny by default (must explicitly grant permission)
 * - Log all permission denials for audit
 * - Support resource-level permissions (e.g., own content only)
 */

import {
  UserRole,
  ResourceType,
  ActionType,
  Permission,
  ROLE_PERMISSIONS,
  SecurityEventType,
} from '../types/auth.types';
import { PrismaClient } from '@prisma/client';

export class RBACService {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Check if User Has Permission
   *
   * Verifies user has permission to perform action on resource
   *
   * @param userId - User ID
   * @param resource - Resource type
   * @param action - Action type
   * @param resourceOwnerId - Optional: Check if user owns the resource
   * @returns True if user has permission
   */
  async hasPermission(
    userId: string,
    resource: ResourceType,
    action: ActionType,
    resourceOwnerId?: string
  ): Promise<boolean> {
    try {
      // Load user with role
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          role: true,
          organizationId: true,
        },
      });

      if (!user) {
        await this.logPermissionDenied(userId, resource, action, 'User not found');
        return false;
      }

      const role = user.role as UserRole;

      // Check role-based permissions
      const rolePermissions = ROLE_PERMISSIONS[role];

      if (!rolePermissions) {
        await this.logPermissionDenied(userId, resource, action, 'Invalid role');
        return false;
      }

      // Check if user has permission for this resource and action
      const hasPermission = rolePermissions.some(
        (p) => p.resource === resource && p.action === action
      );

      if (!hasPermission) {
        await this.logPermissionDenied(
          userId,
          resource,
          action,
          'Insufficient permissions'
        );
        return false;
      }

      // Resource ownership check (optional)
      if (resourceOwnerId) {
        // Members can only access their own resources for certain actions
        if (role === UserRole.MEMBER && action !== 'read') {
          if (userId !== resourceOwnerId) {
            await this.logPermissionDenied(
              userId,
              resource,
              action,
              'Not resource owner'
            );
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Permission check failed:', error);
      return false; // Deny by default on error
    }
  }

  /**
   * Check Multiple Permissions
   *
   * Checks if user has ALL specified permissions
   *
   * @param userId - User ID
   * @param permissions - Array of permissions to check
   * @returns True if user has all permissions
   */
  async hasAllPermissions(
    userId: string,
    permissions: Permission[]
  ): Promise<boolean> {
    for (const permission of permissions) {
      const hasPermission = await this.hasPermission(
        userId,
        permission.resource,
        permission.action
      );

      if (!hasPermission) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check Any Permission
   *
   * Checks if user has AT LEAST ONE of the specified permissions
   *
   * @param userId - User ID
   * @param permissions - Array of permissions to check
   * @returns True if user has any permission
   */
  async hasAnyPermission(
    userId: string,
    permissions: Permission[]
  ): Promise<boolean> {
    for (const permission of permissions) {
      const hasPermission = await this.hasPermission(
        userId,
        permission.resource,
        permission.action
      );

      if (hasPermission) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get User Role
   *
   * Retrieves user's role from database
   *
   * @param userId - User ID
   * @returns User role
   */
  async getUserRole(userId: string): Promise<UserRole | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    return user ? (user.role as UserRole) : null;
  }

  /**
   * Assign Role to User
   *
   * Changes user's role
   * CRITICAL: Only owners should be able to assign roles
   *
   * @param userId - User ID to update
   * @param role - New role
   * @param assignedBy - User ID of person assigning role
   */
  async assignRole(
    userId: string,
    role: UserRole,
    assignedBy: string
  ): Promise<void> {
    // Verify assignedBy has permission to assign roles
    const canAssign = await this.hasPermission(assignedBy, 'users', 'update');

    if (!canAssign) {
      throw new Error('Insufficient permissions to assign roles');
    }

    // Prevent self-demotion for owners
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, organizationId: true },
    });

    if (user?.role === 'OWNER' && userId === assignedBy) {
      // Check if there are other owners in the organization
      const ownerCount = await this.prisma.user.count({
        where: {
          organizationId: user.organizationId,
          role: 'OWNER',
        },
      });

      if (ownerCount <= 1) {
        throw new Error(
          'Cannot remove owner role. Organization must have at least one owner.'
        );
      }
    }

    // Update role
    await this.prisma.user.update({
      where: { id: userId },
      data: { role: role as any },
    });

    // Log role change
    await this.logSecurityEvent({
      type: SecurityEventType.ROLE_CHANGED,
      userId,
      metadata: {
        newRole: role,
        assignedBy,
      },
      severity: 'high',
    });
  }

  /**
   * Get User Permissions
   *
   * Returns all permissions for a user's role
   *
   * @param userId - User ID
   * @returns Array of permissions
   */
  async getUserPermissions(userId: string): Promise<Permission[]> {
    const role = await this.getUserRole(userId);

    if (!role) {
      return [];
    }

    return ROLE_PERMISSIONS[role] || [];
  }

  /**
   * Check if User is Owner
   *
   * @param userId - User ID
   * @returns True if user is owner
   */
  async isOwner(userId: string): Promise<boolean> {
    const role = await this.getUserRole(userId);
    return role === UserRole.OWNER;
  }

  /**
   * Check if User is Admin or Owner
   *
   * @param userId - User ID
   * @returns True if user is admin or owner
   */
  async isAdminOrOwner(userId: string): Promise<boolean> {
    const role = await this.getUserRole(userId);
    return role === UserRole.OWNER || role === UserRole.ADMIN;
  }

  /**
   * Get Organization Members with Roles
   *
   * Lists all members of an organization with their roles
   *
   * @param organizationId - Organization ID
   * @returns Array of users with roles
   */
  async getOrganizationMembers(organizationId: string): Promise<
    Array<{
      id: string;
      email: string;
      role: UserRole;
      createdAt: Date;
    }>
  > {
    const users = await this.prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });

    return users.map((user) => ({
      ...user,
      role: user.role as UserRole,
    }));
  }

  /**
   * Check Resource Ownership
   *
   * Verifies if user owns a specific resource
   *
   * @param userId - User ID
   * @param resourceType - Type of resource (e.g., 'content')
   * @param resourceId - Resource ID
   * @returns True if user owns the resource
   */
  async isResourceOwner(
    userId: string,
    resourceType: string,
    resourceId: string
  ): Promise<boolean> {
    // This would check the specific resource table
    // Example for content:
    if (resourceType === 'content') {
      // TODO: createdBy field not in schema
      // For now, check if content exists in user's organization
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { organizationId: true },
      });

      const content = await this.prisma.contentGeneration.findFirst({
        where: {
          id: resourceId,
          organizationId: user?.organizationId,
        },
      });

      return !!content;
    }

    // Add other resource types as needed
    return false;
  }

  /**
   * Require Permission
   *
   * Throws error if user doesn't have permission
   * Useful for API endpoints
   *
   * @param userId - User ID
   * @param resource - Resource type
   * @param action - Action type
   * @throws Error if permission denied
   */
  async requirePermission(
    userId: string,
    resource: ResourceType,
    action: ActionType
  ): Promise<void> {
    const hasPermission = await this.hasPermission(userId, resource, action);

    if (!hasPermission) {
      throw new Error(
        `Permission denied: ${action} on ${resource}. User ID: ${userId}`
      );
    }
  }

  /**
   * Require Owner Role
   *
   * Throws error if user is not owner
   *
   * @param userId - User ID
   * @throws Error if not owner
   */
  async requireOwner(userId: string): Promise<void> {
    const isOwner = await this.isOwner(userId);

    if (!isOwner) {
      throw new Error('This action requires owner role');
    }
  }

  /**
   * Log Permission Denied Event
   *
   * Records permission denial for audit trail
   */
  private async logPermissionDenied(
    userId: string,
    resource: ResourceType,
    action: ActionType,
    reason: string
  ): Promise<void> {
    await this.logSecurityEvent({
      type: SecurityEventType.PERMISSION_DENIED,
      userId,
      metadata: {
        resource,
        action,
        reason,
      },
      severity: 'medium',
    });
  }

  /**
   * Log Security Event
   *
   * Records security events for audit trail
   */
  private async logSecurityEvent(event: {
    type: SecurityEventType;
    userId?: string;
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
let rbacServiceInstance: RBACService | null = null;

/**
 * Get RBAC Service Instance
 *
 * @param prisma - Prisma client
 * @returns RBAC service instance
 */
export function getRBACService(prisma: PrismaClient): RBACService {
  if (!rbacServiceInstance) {
    rbacServiceInstance = new RBACService(prisma);
  }
  return rbacServiceInstance;
}
