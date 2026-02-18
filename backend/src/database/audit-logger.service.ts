/**
 * Audit Logger Service
 *
 * GDPR-compliant audit logging for all data operations.
 *
 * CRITICAL FOR COMPLIANCE:
 * - Tracks all data access, modifications, and deletions
 * - Records user actions for accountability
 * - Enables data export and deletion requests (GDPR Article 15, 17)
 * - Maintains immutable audit trail
 *
 * USAGE BY OTHER AGENTS:
 * - Call auditLogger.log() after any sensitive operation
 * - Use decorators @AuditLog() on controller methods
 * - Export audit logs via auditLogger.exportUserData()
 *
 * EXPORTS:
 * - AuditLoggerService class
 * - @AuditLog() decorator
 * - Audit log types and interfaces
 */

import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from './database-connection.service';

export enum AuditAction {
  // User actions
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',

  // CRUD operations
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  BULK_UPDATE = 'BULK_UPDATE',
  BULK_DELETE = 'BULK_DELETE',

  // GDPR operations
  EXPORT_DATA = 'EXPORT_DATA',
  DELETE_DATA = 'DELETE_DATA',
  CONSENT_GRANTED = 'CONSENT_GRANTED',
  CONSENT_REVOKED = 'CONSENT_REVOKED',

  // Shopify operations
  SHOPIFY_INSTALL = 'SHOPIFY_INSTALL',
  SHOPIFY_UNINSTALL = 'SHOPIFY_UNINSTALL',
  SHOPIFY_SYNC = 'SHOPIFY_SYNC',
  SHOPIFY_PUBLISH = 'SHOPIFY_PUBLISH',

  // AI operations
  AI_GENERATION = 'AI_GENERATION',
  AI_APPROVAL = 'AI_APPROVAL',
  AI_REJECTION = 'AI_REJECTION',

  // Billing operations
  SUBSCRIPTION_CREATED = 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_UPDATED = 'SUBSCRIPTION_UPDATED',
  SUBSCRIPTION_CANCELED = 'SUBSCRIPTION_CANCELED',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',

  // Security operations
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PERMISSIONS_CHANGED = 'PERMISSIONS_CHANGED',
  API_KEY_CREATED = 'API_KEY_CREATED',
  API_KEY_REVOKED = 'API_KEY_REVOKED',
}

export interface AuditLogEntry {
  organizationId: string;
  userId?: string;
  action: AuditAction | string;
  resourceType: string;
  resourceId?: string;
  changes?: any;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

@Injectable()
export class AuditLoggerService {
  private readonly logger = new Logger(AuditLoggerService.name);

  constructor(private readonly prisma: DatabaseService) {}

  /**
   * Log an audit entry
   * This is the primary method used throughout the application
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: entry.organizationId,
          userId: entry.userId,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          changes: entry.changes || {},
          metadata: entry.metadata || {},
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          requestId: entry.requestId,
        },
      });

      this.logger.debug(
        `Audit log created: ${entry.action} on ${entry.resourceType}${entry.resourceId ? `:${entry.resourceId}` : ''} by user ${entry.userId || 'system'}`,
      );
    } catch (error) {
      // CRITICAL: Never let audit logging failures break the main operation
      this.logger.error('Failed to create audit log', error);
      // In production, send this to monitoring (DataDog, Sentry)
    }
  }

  /**
   * Log a login attempt
   */
  async logLogin(
    organizationId: string,
    userId: string,
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.log({
      organizationId,
      userId,
      action: success ? AuditAction.LOGIN : AuditAction.LOGIN_FAILED,
      resourceType: 'User',
      resourceId: userId,
      ipAddress,
      userAgent,
      metadata: { success },
    });
  }

  /**
   * Log a data access (READ operation)
   */
  async logDataAccess(
    organizationId: string,
    userId: string,
    resourceType: string,
    resourceId: string,
    metadata?: any,
  ): Promise<void> {
    await this.log({
      organizationId,
      userId,
      action: AuditAction.READ,
      resourceType,
      resourceId,
      metadata,
    });
  }

  /**
   * Log a data modification (CREATE, UPDATE, DELETE)
   */
  async logDataModification(
    organizationId: string,
    userId: string,
    action: AuditAction,
    resourceType: string,
    resourceId: string,
    changes: { before?: any; after?: any },
    metadata?: any,
  ): Promise<void> {
    await this.log({
      organizationId,
      userId,
      action,
      resourceType,
      resourceId,
      changes,
      metadata,
    });
  }

  /**
   * Log GDPR data export request
   */
  async logDataExport(organizationId: string, userId: string, requestedBy: string): Promise<void> {
    await this.log({
      organizationId,
      userId,
      action: AuditAction.EXPORT_DATA,
      resourceType: 'User',
      resourceId: userId,
      metadata: { requestedBy },
    });
  }

  /**
   * Log GDPR data deletion request
   */
  async logDataDeletion(
    organizationId: string,
    userId: string,
    requestedBy: string,
  ): Promise<void> {
    await this.log({
      organizationId,
      userId,
      action: AuditAction.DELETE_DATA,
      resourceType: 'User',
      resourceId: userId,
      metadata: { requestedBy },
    });
  }

  /**
   * Get audit logs for a specific user (GDPR compliance)
   * Used for data export requests
   */
  async getUserAuditLogs(organizationId: string, userId: string) {
    return this.prisma.auditLog.findMany({
      where: {
        organizationId,
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get audit logs for a specific organization
   * Used for compliance audits and security reviews
   */
  async getOrganizationAuditLogs(
    organizationId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      action?: string;
      resourceType?: string;
      limit?: number;
    },
  ) {
    const where: any = { organizationId };

    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        where.createdAt.gte = options.startDate;
      }
      if (options.endDate) {
        where.createdAt.lte = options.endDate;
      }
    }

    if (options?.action) {
      where.action = options.action;
    }

    if (options?.resourceType) {
      where.resourceType = options.resourceType;
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: options?.limit || 1000,
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Export all data for a user (GDPR Article 15)
   * Returns all personal data in a portable format
   */
  async exportUserData(organizationId: string, userId: string) {
    // Log the export request
    await this.logDataExport(organizationId, userId, userId);

    // Get all user data
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        organization: {
          select: {
            shopifyDomain: true,
            storeName: true,
          },
        },
      },
    });

    // Get user's audit logs
    const auditLogs = await this.getUserAuditLogs(organizationId, userId);

    return {
      exportDate: new Date().toISOString(),
      user: {
        id: user?.id,
        email: user?.email,
        firstName: user?.firstName,
        lastName: user?.lastName,
        role: user?.role,
        createdAt: user?.createdAt,
      },
      organization: user?.organization,
      auditLogs: auditLogs.map((log) => ({
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        timestamp: log.createdAt,
        metadata: log.metadata,
      })),
    };
  }

  /**
   * Delete all user data (GDPR Article 17 - Right to be forgotten)
   * CRITICAL: This is irreversible
   */
  async deleteUserData(organizationId: string, userId: string): Promise<void> {
    // Log the deletion request BEFORE deleting
    await this.logDataDeletion(organizationId, userId, userId);

    // Delete user data
    // Note: Audit logs are kept for compliance (7 years retention)
    await this.prisma.user.delete({
      where: {
        id: userId,
      },
    });

    this.logger.warn(`User data deleted for user ${userId} in organization ${organizationId}`);
  }

  /**
   * Get audit log statistics
   * Useful for compliance reporting
   */
  async getAuditStatistics(organizationId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.prisma.auditLog.groupBy({
      by: ['action'],
      where: {
        organizationId,
        createdAt: {
          gte: startDate,
        },
      },
      _count: {
        action: true,
      },
    });

    return {
      period: `Last ${days} days`,
      statistics: logs.map((log) => ({
        action: log.action,
        count: log._count.action,
      })),
    };
  }

  /**
   * Detect suspicious activity
   * Used for security monitoring
   */
  async detectSuspiciousActivity(organizationId: string) {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    // Check for excessive failed login attempts
    const failedLogins = await this.prisma.auditLog.count({
      where: {
        organizationId,
        action: AuditAction.LOGIN_FAILED,
        createdAt: {
          gte: oneHourAgo,
        },
      },
    });

    // Check for bulk deletion operations
    const bulkDeletions = await this.prisma.auditLog.count({
      where: {
        organizationId,
        action: AuditAction.BULK_DELETE,
        createdAt: {
          gte: oneHourAgo,
        },
      },
    });

    return {
      failedLogins,
      bulkDeletions,
      isSuspicious: failedLogins > 10 || bulkDeletions > 5,
    };
  }
}

/**
 * Decorator to automatically log controller method calls
 * Usage: @AuditLog('Product', AuditAction.UPDATE)
 */
export function AuditLog(resourceType: string, action: AuditAction) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);

      // Extract organizationId and userId from request (first argument)
      const request = args[0];
      if (request && request.organizationId && this.auditLogger) {
        await this.auditLogger.log({
          organizationId: request.organizationId,
          userId: request.user?.id,
          action,
          resourceType,
          resourceId: result?.id,
          metadata: {
            method: propertyKey,
            timestamp: new Date().toISOString(),
          },
        });
      }

      return result;
    };

    return descriptor;
  };
}
