# Shopify SEO Platform - Directory Structure Documentation

## Root Directory Structure

```
shopify-seo-platform/
|-- backend/                     # NestJS backend application
|-- frontend/                    # React + Vite frontend application
|-- docker/                      # Docker configuration files
|-- infrastructure/              # Infrastructure scripts and configs
|-- scripts/                     # Utility scripts
|-- docs/                        # Documentation
|-- .planning/                   # Planning and architecture docs
|-- docker-compose.yml           # Docker orchestration
|-- README.md                    # Project README
|-- CLAUDE.md                    # AI assistant instructions
|-- *.md                         # Various implementation guides
```

---

## Backend Directory Structure (`/backend/src/`)

```
backend/
|-- prisma/
|   |-- schema.prisma           # Database schema definition
|   |-- migrations/             # Database migrations
|
|-- src/
|   |-- main.ts                 # NestJS application entry point
|   |-- app.module.ts           # Root module configuration
|   |
|   |-- config/
|   |   |-- redis.config.ts     # Redis connection configuration
|   |
|   |-- controllers/            # HTTP request handlers
|   |   |-- health.controller.ts
|   |   |-- auth.controller.ts
|   |   |-- products.controller.ts
|   |   |-- business-profile.controller.ts
|   |   |-- webhook.controller.ts
|   |   |-- questions.controller.ts
|   |   |-- qa-pages.controller.ts
|   |   |-- analytics.controller.ts
|   |
|   |-- services/               # Business logic layer
|   |   |-- index.ts            # Service exports
|   |   |-- ai-content-service.ts
|   |   |-- perplexity-service.ts
|   |   |-- seo-validator-service.ts
|   |   |-- schema-service.ts
|   |   |-- advanced-internal-linking-service.ts
|   |   |-- content-gap-analysis-service.ts
|   |   |-- question-discovery-service.ts
|   |   |-- shopify-integration-service.ts
|   |   |-- shopify-service.ts
|   |   |-- shopify-blog-service.ts
|   |   |-- shopify-pages-service.ts
|   |   |-- google-search-console-service.ts
|   |   |-- dataforseo-service.ts
|   |   |-- semrush-service.ts
|   |   |-- auth-service.ts
|   |   |-- encryption-service.ts
|   |   |-- rbac-service.ts
|   |   |-- gdpr-service.ts
|   |   |-- webhook-handler-service.ts
|   |   |-- webhook-processor-service.ts
|   |   |-- ab-testing-service.ts
|   |   |-- publishing-service.ts
|   |   |-- bulk-operations-service.ts
|   |   |-- auto-optimization-service.ts
|   |   |-- business-intelligence-service.ts
|   |   |-- content-calendar-service.ts
|   |   |-- session-token-validator.ts
|   |   |-- API_INTEGRATION_GUIDE.md
|   |   |-- QUICK_START.md
|   |   |-- README_AI_SERVICES.md
|   |   |-- __tests__/          # Service tests
|   |
|   |-- repositories/           # Data access layer
|   |   |-- index.ts
|   |   |-- qa-page.repository.ts
|   |   |-- internal-link.repository.ts
|   |   |-- business-profile.repository.ts
|   |
|   |-- workflows/              # Complex business processes
|   |   |-- index.ts
|   |   |-- content-generation-workflow.ts
|   |   |-- internal-linking-workflow.ts
|   |   |-- auto-optimization-workflow.ts
|   |   |-- batch-processing-workflow.ts
|   |   |-- README.md
|   |
|   |-- queues/                 # Async job processing
|   |   |-- content-generation-queue.ts
|   |   |-- optimization-queue.ts
|   |   |-- publishing-queue.ts
|   |   |-- webhook-processing-queue.ts
|   |   |-- workers/
|   |       |-- index.ts
|   |       |-- content-generation-worker.ts
|   |       |-- optimization-worker.ts
|   |       |-- publishing-worker.ts
|   |       |-- webhook-processing-worker.ts
|   |       |-- batch-processing-worker.ts
|   |
|   |-- cron/                   # Scheduled jobs
|   |   |-- index.ts
|   |   |-- daily-optimization-job.ts
|   |   |-- weekly-linking-job.ts
|   |
|   |-- database/               # Database utilities
|   |   |-- database.module.ts
|   |   |-- database-connection.service.ts
|   |   |-- audit-logger.service.ts
|   |   |-- multi-tenant-interceptor.ts
|   |
|   |-- guards/                 # Authentication guards
|   |   |-- rbac-guard.ts
|   |   |-- shopify-auth-guard.ts
|   |
|   |-- middleware/             # Express middleware
|   |   |-- auth-middleware.ts
|   |   |-- rate-limiter-middleware.ts
|   |
|   |-- types/                  # TypeScript type definitions
|   |   |-- ai.types.ts
|   |   |-- auth.types.ts
|   |   |-- automation.types.ts
|   |   |-- database.types.ts
|   |   |-- external-apis.types.ts
|   |   |-- qa-content.types.ts
|   |   |-- security.types.ts
|   |
|   |-- utils/                  # Utility functions
|   |   |-- index.ts
|   |   |-- api-cost-tracker.ts
|   |   |-- hmac-validator.ts
|   |   |-- prompt-library.ts
|   |   |-- rate-limiter.ts
|   |   |-- retry-helper.ts
|   |
|   |-- examples/               # Code examples
|       |-- api-integration-examples.ts
```

---

## Frontend Directory Structure (`/frontend/src/`)

```
frontend/
|-- src/
|   |-- main.tsx                # React entry point
|   |-- App.tsx                 # Root component with routing
|   |-- App.css                 # Global styles
|   |-- index.css               # Base styles
|   |
|   |-- pages/                  # Page components (routes)
|   |   |-- Dashboard.tsx       # Main dashboard
|   |   |-- Onboarding.tsx      # Business profile setup
|   |   |-- QuestionDiscovery.tsx
|   |   |-- ContentQueue.tsx
|   |   |-- ContentReview.tsx
|   |   |-- PublishedContent.tsx
|   |   |-- QAAnalytics.tsx
|   |   |-- ContentGeneration.tsx
|   |   |-- Analytics.tsx
|   |   |-- Settings.tsx
|   |
|   |-- components/             # Reusable UI components
|   |   |-- SEOScore.tsx
|   |   |-- SEOScoreCard.tsx
|   |   |-- ContentPreview.tsx
|   |   |-- ContentPreviewModal.tsx
|   |   |-- PerformanceChart.tsx
|   |   |-- ProductList.tsx
|   |
|   |-- hooks/                  # Custom React hooks
|   |   |-- useShopifyAuth.ts
|   |   |-- useProducts.ts
|   |   |-- useContentGeneration.ts
|   |   |-- useBusinessProfile.ts
|   |   |-- useQuestions.ts
|   |   |-- useQAPages.ts
|   |   |-- useAnalytics.ts
|   |   |-- usePerformance.ts
|   |   |-- useABTesting.ts
|   |
|   |-- store/                  # State management
|   |   |-- app-store.ts        # Zustand global store
|   |
|   |-- types/                  # TypeScript types
|   |   |-- api.types.ts
|   |   |-- qa-content.types.ts
|   |
|   |-- utils/                  # Utilities
|   |   |-- api-client.ts       # HTTP client wrapper
|   |
|   |-- assets/                 # Static assets
|       |-- react.svg
```

---

## Key Files and Their Purposes

### Backend Core Files

| File | Purpose |
|------|---------|
| `main.ts` | NestJS bootstrap with CORS, validation pipes, and global prefix |
| `app.module.ts` | Root module importing ConfigModule, ScheduleModule, ThrottlerModule |
| `schema.prisma` | Complete database schema with 15+ models and enums |

### Backend Services (Key)

| File | Purpose |
|------|---------|
| `ai-content-service.ts` | Multi-model AI orchestration with quality scoring (1000+ lines) |
| `content-generation-workflow.ts` | 8-step content pipeline from research to publish |
| `shopify-integration-service.ts` | Core Shopify GraphQL/REST API wrapper |
| `qa-page.repository.ts` | Q&A page data access with performance queries |

### Frontend Core Files

| File | Purpose |
|------|---------|
| `App.tsx` | React Router setup with Polaris Frame navigation |
| `main.tsx` | React Query client and Polaris provider setup |
| `app-store.ts` | Zustand store for organization, user, and UI state |
| `api-client.ts` | Fetch wrapper with auth headers and error handling |

---

## Naming Conventions

### Backend Naming

| Type | Convention | Example |
|------|------------|---------|
| Services | `kebab-case-service.ts` | `ai-content-service.ts` |
| Controllers | `kebab-case.controller.ts` | `webhook.controller.ts` |
| Repositories | `kebab-case.repository.ts` | `qa-page.repository.ts` |
| Workflows | `kebab-case-workflow.ts` | `content-generation-workflow.ts` |
| Queues | `kebab-case-queue.ts` | `content-generation-queue.ts` |
| Workers | `kebab-case-worker.ts` | `content-generation-worker.ts` |
| Types | `kebab-case.types.ts` | `automation.types.ts` |
| Guards | `kebab-case-guard.ts` | `rbac-guard.ts` |

### Frontend Naming

| Type | Convention | Example |
|------|------------|---------|
| Pages | `PascalCase.tsx` | `QuestionDiscovery.tsx` |
| Components | `PascalCase.tsx` | `SEOScoreCard.tsx` |
| Hooks | `usePascalCase.ts` | `useContentGeneration.ts` |
| Stores | `kebab-case-store.ts` | `app-store.ts` |
| Types | `kebab-case.types.ts` | `api.types.ts` |
| Utils | `kebab-case.ts` | `api-client.ts` |

### Database Naming (Prisma)

| Type | Convention | Example |
|------|------------|---------|
| Models | `PascalCase` | `BusinessProfile`, `QAPage` |
| Table names | `snake_case` (via @@map) | `business_profiles`, `qa_pages` |
| Column names | `snake_case` (via @map) | `organization_id`, `created_at` |
| Enums | `UPPER_CASE` values | `PENDING`, `PUBLISHED` |

---

## Module Organization

### Feature-Based Organization

The codebase is organized by feature domain:

```
Backend Features:
- Authentication (auth-service, shopify-auth-guard, auth-middleware)
- Products (products.controller, shopify-integration-service)
- Q&A Content (qa-pages.controller, qa-page.repository, content-generation-workflow)
- Analytics (analytics.controller, content-performance model)
- Webhooks (webhook.controller, webhook-handler-service, webhook-processing-queue)
- AI/Content (ai-content-service, perplexity-service, seo-validator-service)
```

### Layered Organization

Each feature follows the layered pattern:

```
Controller (HTTP) -> Service (Business Logic) -> Repository (Data Access) -> Prisma (ORM)
                           |
                           v
                     Queue (Async) -> Worker (Processing)
```

---

## Configuration Files

### Root Level

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Multi-container orchestration |
| `CLAUDE.md` | AI assistant development instructions |
| `*.md` implementation guides | Feature implementation documentation |

### Backend Configuration

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Database schema |
| `src/config/redis.config.ts` | Redis connection settings |
| `.env` (not committed) | Environment variables |

### Frontend Configuration

| File | Purpose |
|------|---------|
| `vite.config.ts` | Vite build configuration |
| `tsconfig.json` | TypeScript configuration |
| `.env` (not committed) | Frontend environment variables |

---

## Import Patterns

### Backend Imports

```typescript
// Relative imports within same feature
import { QAPageRepository } from '../repositories/qa-page.repository';

// Type imports
import type { ContentGenerationJobData } from '../types/automation.types';

// Service barrel exports
import { ShopifyIntegrationService, DataForSEOService } from '../services';
```

### Frontend Imports

```typescript
// Pages
import { Dashboard } from './pages/Dashboard';

// Hooks
import { useContentGeneration } from './hooks/useContentGeneration';

// Types
import type { ContentGeneration } from './types/api.types';

// Utils
import { APIClient } from './utils/api-client';
```

---

## Database Models Summary

| Model | Purpose | Key Relations |
|-------|---------|---------------|
| `Organization` | Multi-tenant root (Shopify stores) | Has many Users, Products, QAPages |
| `User` | Organization members | Belongs to Organization |
| `Product` | Shopify products with SEO data | Belongs to Organization |
| `ContentGeneration` | AI-generated content history | Belongs to Organization, Product |
| `Keyword` | SEO keyword tracking | Belongs to Organization, Product |
| `QAPage` | Q&A content pages | Belongs to Organization |
| `BusinessProfile` | Business context for AI | 1:1 with Organization |
| `InternalLink` | Content interlinking | Source -> Target QAPage |
| `ContentPerformance` | Daily performance metrics | Belongs to QAPage |
| `ABTest` | A/B test configurations | Belongs to QAPage |
| `AutomationRule` | Automation configurations | Belongs to BusinessProfile |
| `Competitor` | Competitor tracking | Belongs to Organization |
| `AuditLog` | GDPR compliance logging | Belongs to Organization, User |
| `WebhookEvent` | Shopify webhook history | Belongs to Organization |
| `AnalyticsSnapshot` | Periodic analytics snapshots | Belongs to Organization |
