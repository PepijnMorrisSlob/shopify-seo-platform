# Shopify SEO Platform - Technology Stack

## Backend Stack

### Core Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| **NestJS** | ^10.3.0 | Enterprise Node.js framework |
| **TypeScript** | ^5.3.3 | Static typing |
| **Express** | ^4.18.2 | HTTP server (via NestJS platform) |
| **Prisma** | ^5.22.0 | Database ORM with type safety |

### Database & Caching
| Technology | Version | Purpose |
|------------|---------|---------|
| **PostgreSQL** | 16-alpine | Primary database |
| **Redis** | 7-alpine | Caching & job queues |
| **ioredis** | 5.9.1 | Redis client |
| **BullMQ** | ^5.1.5 | Background job processing |

### AI/ML Services
| Technology | Version | Purpose |
|------------|---------|---------|
| **OpenAI SDK** | ^4.24.1 | GPT-3.5/GPT-4 content generation |
| **Anthropic SDK** | ^0.28.0 | Claude Sonnet 4 content generation |
| **Perplexity API** | N/A | Research & fact-checking |

### Authentication & Security
| Technology | Version | Purpose |
|------------|---------|---------|
| **jsonwebtoken** | ^9.0.2 | JWT token management |
| **bcrypt** | ^5.1.1 | Password hashing |
| **@nestjs/throttler** | ^5.1.1 | Rate limiting |
| **class-validator** | ^0.14.1 | Input validation |
| **class-transformer** | ^0.5.1 | DTO transformation |

### External Integrations
| Technology | Version | Purpose |
|------------|---------|---------|
| **@shopify/shopify-api** | ^10.0.0 | Shopify Admin API |
| **googleapis** | ^131.0.0 | Google Search Console |
| **google-auth-library** | ^9.15.1 | Google OAuth |
| **axios** | ^1.6.5 | HTTP client |
| **graphql-request** | ^6.1.0 | GraphQL queries |

### Cloud & Infrastructure
| Technology | Version | Purpose |
|------------|---------|---------|
| **aws-sdk** | ^2.1534.0 | S3, SQS, SES services |

### Utilities
| Technology | Version | Purpose |
|------------|---------|---------|
| **winston** | ^3.11.0 | Logging |
| **date-fns** | ^3.0.6 | Date manipulation |
| **uuid** | ^9.0.1 | UUID generation |
| **dotenv** | ^16.3.1 | Environment variables |
| **reflect-metadata** | ^0.2.1 | Decorators support |

### Development & Testing
| Technology | Version | Purpose |
|------------|---------|---------|
| **Jest** | ^29.7.0 | Unit/E2E testing |
| **supertest** | ^6.3.4 | HTTP testing |
| **ts-jest** | ^29.1.1 | TypeScript Jest support |
| **ESLint** | ^8.56.0 | Linting |
| **Prettier** | ^3.2.4 | Code formatting |

---

## Frontend Stack

### Core Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | ^18.3.1 | UI library |
| **TypeScript** | ~5.9.3 | Static typing |
| **Vite** | ^7.2.4 | Build tool & dev server |

### Shopify Integration
| Technology | Version | Purpose |
|------------|---------|---------|
| **@shopify/polaris** | ^13.9.5 | Shopify design system |
| **@shopify/app-bridge** | ^3.7.11 | Shopify app integration |
| **@shopify/app-bridge-react** | ^4.2.8 | React bindings for App Bridge |

### State & Data Management
| Technology | Version | Purpose |
|------------|---------|---------|
| **@tanstack/react-query** | ^5.90.19 | Server state management |
| **zustand** | ^5.0.10 | Client state management |

### Routing & Visualization
| Technology | Version | Purpose |
|------------|---------|---------|
| **react-router-dom** | ^7.12.0 | Client-side routing |
| **recharts** | ^3.6.0 | Data visualization |

### Development
| Technology | Version | Purpose |
|------------|---------|---------|
| **ESLint** | ^9.39.1 | Linting |
| **@vitejs/plugin-react** | ^5.1.1 | React Vite plugin |

---

## Infrastructure

### Containerization
| Technology | Version | Purpose |
|------------|---------|---------|
| **Docker Compose** | 3.8 | Container orchestration |
| **PostgreSQL Image** | 16-alpine | Database container |
| **Redis Image** | 7-alpine | Cache container |
| **pgAdmin** | latest | Database management UI |
| **Redis Commander** | latest | Redis management UI |

### AWS Services (Production)
| Service | Purpose |
|---------|---------|
| **S3** | Content & image storage |
| **SQS** | Webhook & content generation queues |
| **SES** | Email delivery (alternative to SendGrid) |
| **CloudFront** | CDN for static assets |
| **Secrets Manager** | Production secrets storage |

### Monitoring & Observability
| Service | Purpose |
|---------|---------|
| **DataDog** | APM, logging, metrics |
| **Sentry** | Error tracking & profiling |
| **SendGrid** | Transactional email |

### Optional Services
| Service | Purpose |
|---------|---------|
| **Stripe** | Billing & subscriptions |
| **Intercom** | Customer support |
| **Mixpanel** | Product analytics |

---

## Database Schema Overview

### Primary Models (Prisma)
- **Organization** - Multi-tenant Shopify stores
- **User** - Store members with RBAC
- **Product** - Synced Shopify products with SEO fields
- **ContentGeneration** - AI-generated content tracking
- **Keyword** - SEO keyword research data
- **QAPage** - Question/answer content pages
- **AuditLog** - GDPR compliance audit trail
- **WebhookEvent** - Shopify webhook processing
- **AnalyticsSnapshot** - Daily/weekly performance metrics

### Schema Features
- Full-text search support
- JSONB fields for flexible metadata
- Comprehensive indexing strategy
- Multi-tenant isolation via organizationId
- Encrypted access token storage (AES-256)

---

## API Versions

| API | Version |
|-----|---------|
| Shopify Admin API | 2026-01 |
| Google Search Console | v1 |
| DataForSEO | v3 |
| SEMrush | v1 |
| OpenAI | Chat Completions |
| Anthropic | Messages API |
| Perplexity | Chat Completions |

---

## Key Architectural Decisions

1. **NestJS over Express** - Enterprise-grade structure, dependency injection, decorators
2. **Prisma over TypeORM** - Superior TypeScript support, migrations, Prisma Studio
3. **BullMQ over Bull** - Better TypeScript support, advanced features
4. **React Query + Zustand** - Server vs client state separation
5. **Polaris Design System** - Native Shopify look and feel
6. **Multi-model AI** - Intelligent routing based on content type
7. **JWT + Refresh Tokens** - Secure session management
8. **AES-256 Encryption** - Secure credential storage
