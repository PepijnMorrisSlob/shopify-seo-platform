# Shopify SEO Platform - Architecture Documentation

## Overall Architecture Pattern

The Shopify SEO Platform follows a **Layered Monolith Architecture** with clear separation of concerns and queue-based async processing. The system is designed as a Shopify embedded app with multi-tenant isolation.

### Architecture Style
- **Backend**: NestJS-based layered monolith (Controllers -> Services -> Repositories -> Database)
- **Frontend**: React SPA with Shopify Polaris UI components
- **Database**: PostgreSQL with Prisma ORM (multi-tenant by organizationId)
- **Queue System**: BullMQ with Redis for async job processing
- **Caching**: Redis for session management and job queues

```
+-------------------+     +-------------------+     +-------------------+
|    Frontend       |     |     Backend       |     |   External APIs   |
|   (React/Vite)    |<--->|    (NestJS)       |<--->|                   |
|  Shopify Polaris  |     |                   |     | - Shopify API     |
|  React Query      |     | Controllers       |     | - OpenAI/Claude   |
|  Zustand Store    |     | Services          |     | - DataForSEO      |
+-------------------+     | Repositories      |     | - SEMrush         |
                          | Workflows         |     | - Perplexity      |
                          +--------+----------+     | - Google SC       |
                                   |                +-------------------+
                          +--------v----------+
                          |   PostgreSQL      |
                          |   (Prisma ORM)    |
                          +-------------------+
                                   ^
                          +--------+----------+
                          |      Redis        |
                          |  BullMQ Queues    |
                          +-------------------+
```

---

## Key Modules and Responsibilities

### 1. Controllers Layer (`/backend/src/controllers/`)
HTTP request handlers that define API endpoints:

| Controller | Responsibility |
|------------|----------------|
| `health.controller.ts` | Health check endpoints for monitoring |
| `auth.controller.ts` | Shopify OAuth and session management |
| `products.controller.ts` | Product CRUD and SEO optimization |
| `business-profile.controller.ts` | Business profile management |
| `webhook.controller.ts` | Shopify webhook handling |
| `questions.controller.ts` | Q&A question discovery |
| `qa-pages.controller.ts` | Q&A content page management |
| `analytics.controller.ts` | Performance analytics endpoints |

### 2. Services Layer (`/backend/src/services/`)
Business logic and external API integrations:

#### AI/Content Services
| Service | Responsibility |
|---------|----------------|
| `ai-content-service.ts` | Multi-model AI orchestration (GPT-4, Claude, Perplexity) |
| `perplexity-service.ts` | Research and fact-checking via Perplexity API |
| `question-discovery-service.ts` | Automated question finding for Q&A content |

#### SEO Services
| Service | Responsibility |
|---------|----------------|
| `seo-validator-service.ts` | Content SEO scoring (readability, keyword density, etc.) |
| `schema-service.ts` | JSON-LD schema markup generation |
| `advanced-internal-linking-service.ts` | AI-powered internal link suggestions |
| `content-gap-analysis-service.ts` | Competitor content gap identification |

#### External API Services
| Service | Responsibility |
|---------|----------------|
| `shopify-integration-service.ts` | Core Shopify Admin API integration |
| `shopify-blog-service.ts` | Shopify Blog/Article API operations |
| `shopify-pages-service.ts` | Shopify Pages API operations |
| `google-search-console-service.ts` | GSC data fetching |
| `dataforseo-service.ts` | DataForSEO keyword/SERP data |
| `semrush-service.ts` | SEMrush competitor analysis |

#### Infrastructure Services
| Service | Responsibility |
|---------|----------------|
| `auth-service.ts` | Authentication and session handling |
| `encryption-service.ts` | AES-256 encryption for tokens |
| `rbac-service.ts` | Role-based access control |
| `gdpr-service.ts` | GDPR compliance (data export/deletion) |
| `webhook-handler-service.ts` | Shopify webhook validation and routing |
| `ab-testing-service.ts` | A/B test management |
| `publishing-service.ts` | Content publishing to Shopify |
| `bulk-operations-service.ts` | Bulk content operations |
| `auto-optimization-service.ts` | Automated content refresh |

### 3. Repositories Layer (`/backend/src/repositories/`)
Data access abstraction using Prisma:

| Repository | Responsibility |
|------------|----------------|
| `qa-page.repository.ts` | Q&A page CRUD with performance queries |
| `internal-link.repository.ts` | Internal link management |
| `business-profile.repository.ts` | Business profile data access |

### 4. Workflows Layer (`/backend/src/workflows/`)
Complex multi-step business processes:

| Workflow | Responsibility |
|----------|----------------|
| `content-generation-workflow.ts` | Full content pipeline: Research -> Generate -> Link -> Validate -> Publish |
| `internal-linking-workflow.ts` | Automated internal link creation |
| `auto-optimization-workflow.ts` | Scheduled content refresh |
| `batch-processing-workflow.ts` | Bulk operations orchestration |

### 5. Queue System (`/backend/src/queues/`)
Asynchronous job processing with BullMQ:

#### Queues
| Queue | Purpose |
|-------|---------|
| `content-generation-queue.ts` | AI content generation jobs |
| `optimization-queue.ts` | SEO optimization jobs |
| `publishing-queue.ts` | Shopify publishing jobs |
| `webhook-processing-queue.ts` | Webhook event processing |

#### Workers (`/backend/src/queues/workers/`)
| Worker | Responsibility |
|--------|----------------|
| `content-generation-worker.ts` | Process content generation jobs |
| `optimization-worker.ts` | Process optimization jobs |
| `publishing-worker.ts` | Process publishing jobs |
| `webhook-processing-worker.ts` | Process webhook events |
| `batch-processing-worker.ts` | Process bulk operation jobs |

### 6. Cron Jobs (`/backend/src/cron/`)
Scheduled background tasks:

| Job | Schedule | Responsibility |
|-----|----------|----------------|
| `daily-optimization-job.ts` | 2 AM UTC daily | Scan and queue underperforming content for optimization |
| `weekly-linking-job.ts` | Weekly | Update internal linking structure |

---

## Data Flow Patterns

### 1. Content Generation Flow
```
User Request -> Controller -> ContentGenerationWorkflow
                                    |
                                    v
                              Perplexity (Research)
                                    |
                                    v
                              AIContentService (Generate with Claude/GPT)
                                    |
                                    v
                              AdvancedInternalLinkingService (Add Links)
                                    |
                                    v
                              SchemaService (Generate JSON-LD)
                                    |
                                    v
                              SEOValidatorService (Score Content)
                                    |
                                    v
                              QAPageRepository (Save to DB)
                                    |
                                    v
                              ShopifyBlogService (Publish if score >= 85)
```

### 2. Webhook Processing Flow
```
Shopify Webhook -> WebhookController -> HMAC Validation
                                              |
                                              v
                                    WebhookProcessingQueue.add()
                                              |
                                              v
                                    WebhookProcessingWorker
                                              |
                                              v
                                    WebhookHandlerService (Route by topic)
                                              |
                                    +---------+---------+
                                    |         |         |
                                    v         v         v
                              Products   App         Orders
                              Update     Uninstall   Update
```

### 3. Frontend Data Flow
```
React Component -> useXXX Hook (React Query) -> APIClient -> Backend API
                          |
                          v
                   QueryClient Cache
                          |
                          v
                   Zustand Store (Global UI State)
```

---

## Queue/Worker Patterns

### Job Configuration
All queues use consistent configuration:
- **Retry Strategy**: 3 attempts with exponential backoff (2s, 4s, 8s)
- **Job Retention**: Completed jobs kept 24 hours, failed jobs kept 7 days
- **Concurrency**: Configured per worker based on resource requirements

### Queue Priority System
| Priority | Use Case |
|----------|----------|
| 1 (High) | Real-time user requests |
| 5 (Medium) | Scheduled optimizations |
| 10 (Low) | Bulk batch operations |

### Worker Scaling Pattern
```
Redis <-> BullMQ Queue <-> Worker Pool
              |                |
              |                +-> Worker 1
              |                +-> Worker 2
              |                +-> Worker N
              v
         Job Dashboard (Bull Board)
```

---

## Multi-Tenant Architecture

### Tenant Isolation
- Every database table includes `organizationId` as a foreign key
- All queries are filtered by organizationId
- `MultiTenantInterceptor` automatically injects tenant context

### Data Partitioning Strategy
```
Organization (Tenant)
    |
    +-- Users (scoped)
    +-- Products (scoped)
    +-- QAPages (scoped)
    +-- Keywords (scoped)
    +-- ContentGenerations (scoped)
    +-- AuditLogs (scoped)
    +-- BusinessProfile (1:1)
```

---

## Security Architecture

### Authentication Flow
1. Shopify OAuth 2.0 for initial app installation
2. Session tokens validated via `ShopifyAuthGuard`
3. JWT for API authentication
4. Role-based access via `RBACGuard`

### Data Protection
- Access tokens encrypted with AES-256
- HMAC validation for all webhooks
- Audit logging for GDPR compliance
- Rate limiting per organization (100 req/min)

---

## AI Model Routing Strategy

The system intelligently routes requests to optimal AI models:

| Content Type | Primary Model | Fallbacks |
|--------------|---------------|-----------|
| Product Meta | GPT-3.5 Turbo | GPT-4, Claude |
| Product Description | GPT-4 Turbo | Claude, GPT-3.5 |
| Blog Post | Claude Sonnet 4 | GPT-4, GPT-3.5 |
| Research | Perplexity Sonar Pro | GPT-4, Claude |
| Schema | Claude Sonnet 4 | GPT-4 |

---

## Infrastructure Components

### Docker Services
| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL 16 | 5432 | Primary database |
| Redis 7 | 6379 | Queue backend + caching |
| Backend (NestJS) | 3003 | API server |
| Frontend (Vite) | 4173 | React SPA |
| Redis Commander | 8081 | Redis GUI |
| pgAdmin | 5050 | PostgreSQL GUI |

### Health Monitoring
- `/api/health` endpoint for container health checks
- PostgreSQL health check: `pg_isready`
- Redis health check: `redis-cli ping`
