# Shopify SEO Automation Platform - Implementation Guide

**Project Name:** Shopify SEO Automation SaaS
**Timeline:** 12 months to full production launch
**Architecture:** Microservices (AWS ECS Fargate + Lambda)
**Team:** 8 specialized development agents working in parallel

---

## Agent Coordination & File Naming Protocol

### CRITICAL: File Naming Conventions (ALL AGENTS MUST FOLLOW)

**Backend Services:**
- Pattern: `[feature]-service.ts`
- Location: `backend/src/services/`
- Examples: `shopify-integration-service.ts`, `ai-content-service.ts`

**Frontend Components:**
- Pattern: `[Feature][Type].tsx`
- Location: `frontend/src/pages/` or `frontend/src/components/`
- Examples: `Dashboard.tsx`, `ContentGeneration.tsx`

**Types/Interfaces:**
- Pattern: `[feature].types.ts`
- Location: `backend/src/types/` or `frontend/src/types/`
- Examples: `shopify.types.ts`, `seo.types.ts`

**API Routes:**
- Pattern: `/api/[feature]/[action]`
- Examples: `/api/products/sync`, `/api/content/generate`

---

## Agent File Manifests (COORDINATE DEPENDENCIES)

### Agent 1: Windows System Specialist
**CREATES:**
- `/setup-windows-dev.ps1` (PowerShell setup script)
- `/setup-env.bat` (Environment variable setup)
- `/.env.example` (Template for all required env vars)
- `/docs/WINDOWS_SETUP.md`

**EXPORTS:**
- Windows-compatible path helpers
- PowerShell automation scripts

**EXPECTS:**
- None (foundational agent)

---

### Agent 2: Database/Backend Specialist
**CREATES:**
- `/backend/prisma/schema.prisma`
- `/backend/prisma/migrations/` (initial migration)
- `/backend/src/database/`
  - `database-connection.service.ts`
  - `multi-tenant-interceptor.ts`
  - `audit-logger.service.ts`
- `/backend/src/types/database.types.ts`

**EXPORTS:**
- PrismaClient instance (singleton)
- Database entity types (Product, Organization, User, etc.)
- Audit logging functions

**EXPECTS:**
- None (foundational agent)

**IMPORTS USED BY OTHER AGENTS:**
```typescript
import { PrismaClient } from '@prisma/client';
import { Product, Organization, User } from '../types/database.types';
```

---

### Agent 3: Frontend/React Specialist
**CREATES:**
- `/frontend/src/pages/`
  - `Dashboard.tsx`
  - `ContentGeneration.tsx`
  - `Analytics.tsx`
  - `Settings.tsx`
- `/frontend/src/components/`
  - `ProductList.tsx`
  - `ContentPreview.tsx`
  - `SEOScore.tsx`
- `/frontend/src/hooks/`
  - `useShopifyAuth.ts`
  - `useProducts.ts`
  - `useContentGeneration.ts`

**EXPORTS:**
- React components
- Custom hooks
- Type definitions for component props

**EXPECTS:**
- API endpoints from Backend Specialist: `/api/products/*`, `/api/content/*`
- Auth context from Security Specialist: `AuthContext`, `useAuth()`

**IMPORTS:**
```typescript
import { useAuth } from '../contexts/AuthContext'; // From Security Agent
import { Product } from '../types/api.types'; // From Backend Agent
```

---

### Agent 4: API Integration Specialist
**CREATES:**
- `/backend/src/services/`
  - `shopify-integration-service.ts`
  - `google-search-console-service.ts`
  - `dataforseo-service.ts`
  - `semrush-service.ts`
  - `ahrefs-service.ts`
- `/backend/src/types/external-apis.types.ts`

**EXPORTS:**
- ShopifyIntegrationService class
- GoogleSearchConsoleService class
- DataForSEOService class
- API client instances

**EXPECTS:**
- Database models from Database Specialist: `Product`, `Organization`
- Auth tokens from Security Specialist: `getShopifyAccessToken()`

**IMPORTS:**
```typescript
import { Product } from '../types/database.types'; // From Database Agent
import { decryptAccessToken } from './encryption-service'; // From Security Agent
```

---

### Agent 5: Workflow/Automation Specialist
**CREATES:**
- `/backend/src/services/`
  - `publishing-service.ts`
  - `content-calendar-service.ts`
  - `bulk-operations-service.ts`
  - `webhook-processor-service.ts`
- `/backend/src/queues/`
  - `content-generation-queue.ts`
  - `webhook-processing-queue.ts`

**EXPORTS:**
- PublishingService class
- BulkOperationsService class
- Queue definitions (BullMQ)

**EXPECTS:**
- AI content from AI Content Service: `generateContent()`
- Shopify API from Integration Specialist: `ShopifyIntegrationService`
- Database models: `Product`, `ContentGeneration`

**IMPORTS:**
```typescript
import { ShopifyIntegrationService } from './shopify-integration-service'; // From API Agent
import { AIContentService } from './ai-content-service'; // From API Agent
import { Product } from '../types/database.types'; // From Database Agent
```

---

### Agent 6: Security/Authentication Specialist
**CREATES:**
- `/backend/src/services/`
  - `auth-service.ts` (OAuth 2.0 flow)
  - `encryption-service.ts` (AES-256)
  - `session-token-validator.ts` (Shopify App Bridge)
  - `rbac-service.ts` (Role-based access control)
- `/backend/src/middleware/`
  - `auth-middleware.ts`
  - `rate-limiter-middleware.ts`
- `/backend/src/guards/`
  - `shopify-auth-guard.ts`
  - `rbac-guard.ts`

**EXPORTS:**
- AuthService class
- encryptAccessToken(), decryptAccessToken()
- validateSessionToken()
- @RequireRole() decorator

**EXPECTS:**
- Database models: `Organization`, `User`
- None for encryption (foundational)

**IMPORTS:**
```typescript
import { Organization, User } from '../types/database.types'; // From Database Agent
```

---

### Agent 7: DevOps/Deployment Specialist
**CREATES:**
- `/infrastructure/terraform/`
  - `main.tf` (AWS VPC, ECS, RDS, ElastiCache)
  - `monitoring.tf` (CloudWatch, DataDog)
  - `variables.tf`
  - `outputs.tf`
- `/.github/workflows/`
  - `deploy.yml` (CI/CD pipeline)
  - `test.yml`
- `/docker/`
  - `Dockerfile.backend`
  - `Dockerfile.frontend`
  - `docker-compose.yml` (local development)

**EXPORTS:**
- Infrastructure as Code (Terraform)
- CI/CD pipelines
- Docker configurations

**EXPECTS:**
- All backend services from other agents
- Frontend build from React Specialist
- Environment variables from Windows Specialist

---

### Agent 8: Documentation/Architecture Specialist
**CREATES:**
- `/docs/`
  - `ARCHITECTURE.md` (System architecture overview)
  - `API_DOCUMENTATION.md` (REST + GraphQL endpoints)
  - `DEPLOYMENT_GUIDE.md` (Step-by-step deployment)
  - `DEVELOPMENT_GUIDE.md` (Local setup for developers)
  - `SECURITY.md` (Security policies and procedures)
  - `GDPR_COMPLIANCE.md` (Data privacy documentation)
- `/backend/src/services/ai-content-service.ts` (AI orchestration)
- Diagrams (architecture, data flow, sequence diagrams)

**EXPORTS:**
- AIContentService class (multi-model AI)
- Documentation for all systems
- Architecture diagrams

**EXPECTS:**
- All services from other agents (to document)
- Database schema from Database Specialist
- API contracts from API Integration Specialist

**IMPORTS:**
```typescript
import { Product } from '../types/database.types'; // From Database Agent
```

---

## Technology Stack Reference

### Backend
- **Framework:** NestJS 10 + TypeScript 5.3
- **Database:** PostgreSQL 16 (via Prisma 5)
- **Cache:** Redis 7 (ioredis)
- **Queue:** BullMQ
- **Testing:** Jest + Supertest

### Frontend
- **Framework:** React 18 + TypeScript 5.3
- **UI Library:** Shopify Polaris
- **Auth:** @shopify/app-bridge 4.x
- **State:** Zustand + React Query 5
- **Build:** Vite 5

### Infrastructure
- **Cloud:** AWS (ECS Fargate, RDS Aurora, ElastiCache, S3, CloudFront)
- **IaC:** Terraform
- **CI/CD:** GitHub Actions
- **Monitoring:** DataDog + Sentry + CloudWatch

---

## Phase 1: MVP Implementation (Months 1-3)

### Week 1-2: Foundation Setup

**Windows System Specialist:**
- [ ] Create PowerShell setup script for local development
- [ ] Configure Windows paths for Node.js, Python, Git
- [ ] Create `.env.example` with all required variables
- [ ] Document Windows-specific setup procedures

**Database/Backend Specialist:**
- [ ] Create Prisma schema with core entities (organizations, users, products, keywords)
- [ ] Set up multi-tenant isolation (organization_id on all tables)
- [ ] Create initial migration
- [ ] Add indexes for performance
- [ ] Set up database connection pooling

**DevOps/Deployment Specialist:**
- [ ] Initialize Terraform project
- [ ] Create local Docker Compose setup (PostgreSQL, Redis)
- [ ] Set up GitHub Actions workflow (basic CI)
- [ ] Create Dockerfiles for backend/frontend

---

### Week 3-4: Authentication & Shopify Integration

**Security/Authentication Specialist:**
- [ ] Implement Shopify OAuth 2.0 flow
- [ ] Session token validation (App Bridge)
- [ ] HMAC verification
- [ ] Access token encryption (AES-256)
- [ ] JWT generation + refresh token logic
- [ ] RBAC implementation (roles: owner, admin, member)

**API Integration Specialist:**
- [ ] Shopify GraphQL Admin API client (2026-01)
- [ ] Product sync (bulk import via GraphQL)
- [ ] Webhook subscription setup (products/create, products/update, app/uninstalled)
- [ ] Webhook HMAC validation
- [ ] Rate limiting (cost-based, 50 points/sec)

**Workflow/Automation Specialist:**
- [ ] SQS queue setup for webhooks (FIFO)
- [ ] Webhook processor service (idempotent handling)
- [ ] Background worker for product sync
- [ ] Retry logic + DLQ

---

### Week 5-6: Frontend Foundation

**Frontend/React Specialist:**
- [ ] React + TypeScript + Vite project setup
- [ ] Shopify Polaris integration
- [ ] App Bridge setup (session tokens)
- [ ] OAuth installation flow UI
- [ ] Dashboard layout (product list)
- [ ] Product detail view
- [ ] Loading states + error handling

---

### Week 7-8: AI Content Generation MVP

**Documentation/Architecture Specialist (AI Service):**
- [ ] AIContentService class (multi-model orchestration)
- [ ] OpenAI GPT-3.5 integration (meta titles/descriptions)
- [ ] Prompt engineering library (templates)
- [ ] Content quality scoring (basic version)
- [ ] Content variant generation (3 variants)

**Frontend/React Specialist:**
- [ ] Content generation page
- [ ] Product selection UI
- [ ] AI model selection dropdown
- [ ] Content preview component (3 variants)
- [ ] Approve/reject buttons
- [ ] Publish to Shopify action

**Workflow/Automation Specialist:**
- [ ] Publishing service (GraphQL mutations to Shopify)
- [ ] Content generation queue (BullMQ)
- [ ] Progress tracking
- [ ] Success/failure notifications

---

### Week 9-10: Analytics & Testing

**API Integration Specialist:**
- [ ] Google Search Console API integration
- [ ] GSC data fetching (queries, pages, devices)
- [ ] Data caching strategy (24-hour TTL)

**Frontend/React Specialist:**
- [ ] Analytics dashboard
- [ ] Charts (Recharts: line charts, bar charts)
- [ ] SEO score display
- [ ] Keyword position tracking

**All Agents:**
- [ ] Integration testing
- [ ] End-to-end testing (Playwright)
- [ ] Load testing (JMeter: 100 concurrent users)
- [ ] Bug fixes

---

### Week 11-12: MVP Launch

**Security/Authentication Specialist:**
- [ ] Security audit (OWASP Top 10)
- [ ] Penetration testing preparation
- [ ] GDPR compliance checklist

**DevOps/Deployment Specialist:**
- [ ] Provision AWS infrastructure (dev + staging)
- [ ] Deploy to staging environment
- [ ] Smoke tests
- [ ] Deploy to production
- [ ] Monitoring dashboards

**Documentation/Architecture Specialist:**
- [ ] API documentation (Swagger/OpenAPI)
- [ ] User guide
- [ ] Troubleshooting guide
- [ ] Shopify App Store listing materials

**All Agents:**
- [ ] Beta customer onboarding (50 customers)
- [ ] Feedback collection
- [ ] Bug fixes
- [ ] Performance optimization

---

## Critical Success Criteria

### Technical Requirements
- ✅ API latency <500ms P95
- ✅ Uptime >99%
- ✅ Zero security vulnerabilities (OWASP Top 10)
- ✅ All data encrypted (transit + rest)
- ✅ Multi-tenant isolation (organization-level)
- ✅ GDPR compliant (consent, export, deletion)

### Business Requirements
- ✅ 50 beta customers onboarded
- ✅ <5 minutes from install to first optimization
- ✅ >30% trial-to-paid conversion
- ✅ <5% monthly churn
- ✅ NPS score >50

### Product Requirements
- ✅ Shopify OAuth installation works flawlessly
- ✅ Product sync (bulk import + webhooks)
- ✅ AI content generation (3 variants, quality scoring)
- ✅ Publish to Shopify (meta titles/descriptions)
- ✅ Google Search Console integration
- ✅ Basic analytics dashboard

---

## Environment Variables Required

```bash
# Shopify
SHOPIFY_API_KEY=<from Shopify Partners>
SHOPIFY_API_SECRET=<from Shopify Partners>
SHOPIFY_SCOPES=read_products,write_products,read_content,write_content

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/shopify_seo
DATABASE_POOL_SIZE=20

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# AI APIs
OPENAI_API_KEY=<from OpenAI>
ANTHROPIC_API_KEY=<from Anthropic>
PERPLEXITY_API_KEY=<from Perplexity>

# SEO APIs
GOOGLE_SEARCH_CONSOLE_CLIENT_ID=<from GCP>
GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET=<from GCP>
DATAFORSEO_LOGIN=<from DataForSEO>
DATAFORSEO_PASSWORD=<from DataForSEO>
SEMRUSH_API_KEY=<from SEMrush>
AHREFS_API_KEY=<from Ahrefs>

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<from AWS IAM>
AWS_SECRET_ACCESS_KEY=<from AWS IAM>
S3_BUCKET_NAME=shopify-seo-content
SQS_WEBHOOK_QUEUE_URL=<from AWS SQS>

# Security
JWT_SECRET=<generate random 64-char string>
ENCRYPTION_KEY=<generate random 32-byte key>
SESSION_SECRET=<generate random 64-char string>

# Monitoring
DATADOG_API_KEY=<from DataDog>
SENTRY_DSN=<from Sentry>

# Application
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000
```

---

## Testing Strategy

### Unit Tests (Jest)
- All services: 80%+ coverage
- Business logic: 100% coverage
- Critical paths (auth, payment): 100% coverage

### Integration Tests (Supertest)
- API endpoints: All routes tested
- Database operations: CRUD + complex queries
- External API mocks: Shopify, OpenAI, GSC

### End-to-End Tests (Playwright)
- User journeys:
  1. Install app → OAuth → Dashboard
  2. Select product → Generate content → Approve → Publish
  3. View analytics
- Browser coverage: Chrome, Firefox, Safari

### Load Tests (JMeter)
- Scenarios:
  - 100 concurrent users browsing dashboard
  - 50 concurrent content generations
  - 1,000 webhooks/minute
- Targets:
  - <500ms P95 latency
  - 0% error rate
  - Graceful degradation under load

### Security Tests
- OWASP ZAP automated scan
- Manual penetration testing
- SQL injection testing
- XSS testing
- CSRF testing
- Auth bypass attempts

---

## Monitoring & Alerting

### Critical Alerts (Immediate Action Required)
- API error rate >1% (5-minute window)
- API latency >500ms P95 (5-minute window)
- Database CPU >90% (5-minute window)
- Redis memory >95% (1-minute window)
- Failed webhooks >10 (1-minute window)
- Shopify API rate limit >90%

### Warning Alerts (Investigate Within 1 Hour)
- API latency >300ms P95 (15-minute window)
- Database CPU >70% (15-minute window)
- Redis memory >80% (5-minute window)
- Error rate >0.5% (15-minute window)

### Dashboards
1. **Operations Dashboard:**
   - API latency (P50, P95, P99)
   - Request rate (requests/second)
   - Error rate (4xx, 5xx)
   - Active users

2. **Infrastructure Dashboard:**
   - CPU usage (ECS tasks)
   - Memory usage
   - Database connections
   - Redis hit rate

3. **Business Dashboard:**
   - New customers (daily, weekly, monthly)
   - MRR (Monthly Recurring Revenue)
   - Churn rate
   - Feature adoption

---

## Git Workflow

### Branch Strategy
- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - Feature branches
- `hotfix/*` - Emergency fixes

### Commit Convention
```
type(scope): subject

body (optional)

footer (optional)
```

**Types:** feat, fix, docs, style, refactor, test, chore

**Example:**
```
feat(auth): implement Shopify OAuth 2.0 flow

- Add OAuth callback endpoint
- Implement HMAC validation
- Store encrypted access tokens
- Add session token validation

Closes #123
```

### Pull Request Template
```markdown
## Description
[Brief description of changes]

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Security
- [ ] No new vulnerabilities introduced
- [ ] OWASP Top 10 considered
- [ ] Sensitive data encrypted

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console.log statements
```

---

## Deployment Procedures

### Development Environment
```bash
# Start local services (PostgreSQL, Redis)
docker-compose up -d

# Install dependencies
cd backend && npm install
cd frontend && npm install

# Run migrations
cd backend && npx prisma migrate dev

# Start backend (port 3000)
cd backend && npm run dev

# Start frontend (port 5173)
cd frontend && npm run dev
```

### Staging Deployment (via GitHub Actions)
```bash
# Push to develop branch
git push origin develop

# GitHub Actions will:
# 1. Run tests
# 2. Build Docker images
# 3. Push to ECR
# 4. Deploy to ECS staging cluster
# 5. Run smoke tests
```

### Production Deployment (via GitHub Actions)
```bash
# Merge develop → main
git checkout main
git merge develop
git push origin main

# GitHub Actions will:
# 1. Run full test suite
# 2. Build production Docker images
# 3. Push to ECR
# 4. Deploy to ECS production cluster (blue-green)
# 5. Run smoke tests
# 6. Switch traffic to new version
# 7. Monitor for errors (auto-rollback if >1% error rate)
```

---

## Troubleshooting Common Issues

### Issue: Shopify OAuth fails with "invalid_request"
**Cause:** Incorrect redirect URI or HMAC validation failure
**Solution:**
1. Verify `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` are correct
2. Check redirect URI matches Shopify app settings exactly
3. Verify HMAC calculation includes all query params except `hmac`

### Issue: Webhooks not being received
**Cause:** Webhook subscription not created or endpoint not accessible
**Solution:**
1. Check webhook subscriptions: `GET /admin/api/2026-01/webhooks.json`
2. Verify endpoint is publicly accessible (use ngrok for local dev)
3. Check HMAC validation is correct
4. Review CloudWatch logs for SQS queue

### Issue: AI content generation times out
**Cause:** OpenAI API slow response or token limit exceeded
**Solution:**
1. Increase timeout to 60 seconds
2. Check prompt length (max 4096 tokens for GPT-3.5)
3. Implement retry logic with exponential backoff
4. Monitor OpenAI API status page

### Issue: Database connection pool exhausted
**Cause:** Too many concurrent connections or long-running queries
**Solution:**
1. Increase pool size: `DATABASE_POOL_SIZE=50`
2. Optimize slow queries (use `EXPLAIN ANALYZE`)
3. Add read replicas for read-heavy operations
4. Implement connection timeout (30 seconds)

---

## Next Steps After Agent Deployment

1. **Agent Coordination Meeting (Day 1):**
   - Each agent presents file manifest
   - Identify cross-agent dependencies
   - Agree on shared types and interfaces
   - Set up communication channels

2. **Weekly Sync (Every Monday):**
   - Progress updates from each agent
   - Blocker resolution
   - Integration testing status
   - Adjust priorities

3. **Code Reviews:**
   - All PRs reviewed by at least 2 agents
   - Security-critical code reviewed by Security Specialist
   - Database schema changes reviewed by Database Specialist

4. **Integration Testing (End of Each Week):**
   - Merge all agent branches to `develop`
   - Run full integration test suite
   - Fix integration issues
   - Deploy to staging environment

---

## Success Metrics (Phase 1 MVP)

### Technical Metrics
- ✅ All tests passing (100% critical paths)
- ✅ API latency <500ms P95
- ✅ Zero critical security vulnerabilities
- ✅ Database queries optimized (<50ms P95)
- ✅ 99% uptime (staging + production)

### Business Metrics
- ✅ 50 beta customers onboarded
- ✅ 30% trial-to-paid conversion
- ✅ <5% monthly churn
- ✅ NPS score >50
- ✅ Time to first value <5 minutes

### Product Metrics
- ✅ AI content quality score >80% (auto-approved)
- ✅ Shopify App Store rating >4.0 (after 20+ reviews)
- ✅ Feature adoption >60% (weekly AI usage)
- ✅ Customer support tickets <10/week

---

**READY FOR AGENT DEPLOYMENT**

All 8 agents should now begin working in parallel according to their assigned domains. Coordinate file names and dependencies according to the manifests above.

**CRITICAL:** Before creating any file, verify the exact file name and path with the manifest to prevent broken imports.

Let's build this! 🚀
