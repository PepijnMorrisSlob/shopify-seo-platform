/**
 * Database Module
 *
 * Centralized module for all database-related services.
 * Import this module into other NestJS modules to access database services.
 *
 * USAGE BY OTHER AGENTS:
 * ```typescript
 * import { DatabaseModule } from '../database/database.module';
 *
 * @Module({
 *   imports: [DatabaseModule],
 *   // ...
 * })
 * export class YourModule {}
 * ```
 */

import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database-connection.service';
import { AuditLoggerService } from './audit-logger.service';
import { MultiTenantInterceptor } from './multi-tenant-interceptor';

@Global()
@Module({
  providers: [DatabaseService, AuditLoggerService, MultiTenantInterceptor],
  exports: [DatabaseService, AuditLoggerService, MultiTenantInterceptor],
})
export class DatabaseModule {}
