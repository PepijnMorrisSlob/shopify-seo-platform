# Database Setup Guide

## Production-Ready Database Foundation

This document outlines the database schema, setup instructions, and usage guidelines for the Shopify SEO Automation Platform.

---

## Database Architecture

### Technology Stack
- **Database:** PostgreSQL 16
- **ORM:** Prisma 5
- **Connection Pooling:** 20 connections (configurable)
- **Multi-Tenancy:** Organization-level isolation

### Core Entities

1. **Organizations** - Shopify stores (tenants)
   - Stores Shopify credentials (encrypted)
   - Billing and plan information
   - Usage tracking

2. **Users** - Team members within organizations
   - Role-based access control (OWNER, ADMIN, MEMBER, VIEWER)
   - Authentication and permissions

3. **Products** - Shopify products with SEO optimization
   - Current and AI-generated SEO fields
   - Performance metrics (impressions, clicks, CTR)
   - SEO scoring

4. **ContentGenerations** - AI-generated content
   - Multiple AI models support
   - Quality scoring
   - Approval workflow

5. **Keywords** - SEO keywords and rankings
   - Search volume and difficulty
   - Position tracking
   - Performance metrics

6. **AuditLogs** - GDPR-compliant audit trail
   - All data operations
   - User actions
   - Change tracking

7. **WebhookEvents** - Shopify webhook processing
   - Event queue
   - Retry logic
   - HMAC validation

8. **AnalyticsSnapshots** - Performance snapshots
   - Daily/weekly/monthly aggregations
   - Historical data

---

## Setup Instructions

### 1. Prerequisites
```bash
# Ensure PostgreSQL 16 is installed
# Windows: Download from https://www.postgresql.org/download/windows/
# Verify installation:
psql --version
```

### 2. Create Database
```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create database
CREATE DATABASE shopify_seo_dev;

-- Create user (optional)
CREATE USER shopify_seo_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE shopify_seo_dev TO shopify_seo_user;

-- Exit psql
\q
```

### 3. Configure Environment Variables
```bash
# Copy .env.example to .env
copy .env.example .env

# Edit .env and set DATABASE_URL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/shopify_seo_dev?schema=public
```

### 4. Generate Prisma Client
```bash
npm install
npx prisma generate
```

### 5. Run Initial Migration
```bash
# Create and apply migration
npx prisma migrate dev --name init

# Or for production
npx prisma migrate deploy
```

### 6. Verify Setup
```bash
# Open Prisma Studio to view database
npx prisma studio
```

---

## Database Services

### DatabaseService
Singleton Prisma client with connection pooling.

**Usage:**
```typescript
import { DatabaseService } from './database/database-connection.service';

@Injectable()
export class YourService {
  constructor(private readonly prisma: DatabaseService) {}

  async getProducts(organizationId: string) {
    return this.prisma.product.findMany({
      where: { organizationId },
    });
  }
}
```

### AuditLoggerService
GDPR-compliant audit logging.

**Usage:**
```typescript
import { AuditLoggerService, AuditAction } from './database/audit-logger.service';

@Injectable()
export class YourService {
  constructor(private readonly auditLogger: AuditLoggerService) {}

  async updateProduct(organizationId: string, userId: string, productId: string, data: any) {
    const oldProduct = await this.prisma.product.findUnique({ where: { id: productId } });

    await this.prisma.product.update({
      where: { id: productId },
      data,
    });

    // Log the change
    await this.auditLogger.logDataModification(
      organizationId,
      userId,
      AuditAction.UPDATE,
      'Product',
      productId,
      { before: oldProduct, after: data },
    );
  }
}
```

### MultiTenantInterceptor
Automatic organization_id scoping.

**Usage:**
```typescript
import { MultiTenantInterceptor } from './database/multi-tenant-interceptor';

@Controller('products')
@UseInterceptors(MultiTenantInterceptor)
export class ProductsController {
  // All routes automatically scoped to organization
}
```

---

## Multi-Tenant Isolation

### Automatic Scoping
All queries are automatically scoped to the current organization:

```typescript
// BAD: Don't do this - security risk!
await prisma.product.findMany(); // Returns ALL products across ALL organizations

// GOOD: Always pass organizationId
await prisma.product.findMany({
  where: { organizationId: request.organizationId },
});
```

### Prisma Middleware
The `MultiTenantInterceptor` automatically adds `organizationId` filters to all queries.

---

## Performance Optimization

### Indexes
All tables have indexes on:
- `organizationId` - Fast tenant filtering
- Frequently queried fields (status, created_at, etc.)
- Unique constraints

### Connection Pooling
Default pool size: 20 connections
Configure via `DATABASE_POOL_SIZE` environment variable.

### Query Optimization
```typescript
// Use select to fetch only needed fields
await prisma.product.findMany({
  where: { organizationId },
  select: {
    id: true,
    title: true,
    seoScore: true,
  },
});

// Use pagination
await prisma.product.findMany({
  where: { organizationId },
  take: 50,
  skip: page * 50,
});
```

---

## GDPR Compliance

### Audit Logging
All sensitive operations are logged:
- Data access (READ)
- Data modifications (CREATE, UPDATE, DELETE)
- User logins
- Export/deletion requests

### Data Export
```typescript
const userData = await auditLogger.exportUserData(organizationId, userId);
// Returns all personal data in portable format
```

### Data Deletion
```typescript
await auditLogger.deleteUserData(organizationId, userId);
// Deletes user data (audit logs retained for 7 years)
```

---

## Migrations

### Development
```bash
# Create new migration
npx prisma migrate dev --name add_new_field

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

### Production
```bash
# Apply migrations
npx prisma migrate deploy

# Verify migration status
npx prisma migrate status
```

---

## Troubleshooting

### Connection Issues
```bash
# Test connection
psql -U postgres -h localhost -d shopify_seo_dev

# Check if database exists
psql -U postgres -l
```

### Migration Errors
```bash
# Check migration status
npx prisma migrate status

# Resolve migration conflicts
npx prisma migrate resolve --applied <migration_name>
```

### Performance Issues
```bash
# Enable query logging
# In .env: Add log level
NODE_ENV=development

# Analyze slow queries
# Check logs for queries taking > 100ms
```

---

## File Exports for Other Agents

### Imports
```typescript
// Database types
import {
  Product,
  Organization,
  User,
  ContentGeneration,
  PlanTier,
  BillingStatus,
  UserRole
} from '../types/database.types';

// Services
import { DatabaseService } from '../database/database-connection.service';
import { AuditLoggerService, AuditAction } from '../database/audit-logger.service';
import { MultiTenantInterceptor } from '../database/multi-tenant-interceptor';

// Module
import { DatabaseModule } from '../database/database.module';
```

### Usage in Other Modules
```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  // Now you can inject DatabaseService and AuditLoggerService
})
export class YourModule {}
```

---

## Production Checklist

- [ ] PostgreSQL 16 installed and configured
- [ ] Database created with proper user permissions
- [ ] Environment variables set (use secure values)
- [ ] Migrations applied (`prisma migrate deploy`)
- [ ] Connection pooling configured (20+ connections)
- [ ] Indexes verified (`EXPLAIN ANALYZE` on common queries)
- [ ] Backup strategy implemented (daily automated backups)
- [ ] Monitoring enabled (slow query logs, connection count)
- [ ] GDPR compliance verified (audit logs, data export/deletion)
- [ ] Multi-tenant isolation tested

---

## Next Steps

1. **API Integration Specialist**: Use `DatabaseService` to store Shopify product data
2. **Security Specialist**: Implement access token encryption using `Organization.accessTokenEncrypted`
3. **Workflow Specialist**: Use `AuditLoggerService` to track all operations
4. **Frontend Specialist**: Query products via API endpoints that use these database services

---

## Contact

For database-related questions or issues:
- Database/Backend Specialist Agent
- See: `IMPLEMENTATION_SHOPIFY_SEO_GUIDE.md` for architecture details
