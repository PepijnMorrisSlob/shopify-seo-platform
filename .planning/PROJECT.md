# Shopify SEO Automation Platform

**Vision:** AI-powered SaaS platform for automating SEO optimization of Shopify product catalogs.

**Core Value:** Enable Shopify merchants to generate, schedule, and publish SEO-optimized content at scale with minimal manual effort.

---

## Current Milestone: v1.1 Content Calendar & Publishing

**Goal:** Build a comprehensive content calendar and automated publishing system that allows users to plan, schedule, review, and mass-publish SEO content to their Shopify stores.

**Target Features:**
- Content Calendar with drag-and-drop scheduling
- Mass content review and editing capabilities
- Auto-scheduling based on optimal publishing times
- Bulk publishing to Shopify
- Publication status tracking and history

**Inspiration:** WPSEOAI Publish workflow features

---

## Validated Requirements (Already Built - v1.0)

### Authentication & Security
- [x] Shopify OAuth 2.0 flow
- [x] Session token validation (App Bridge)
- [x] HMAC verification for webhooks
- [x] Access token encryption (AES-256)
- [x] JWT authentication with refresh tokens
- [x] RBAC implementation (roles: owner, admin, member)

### Shopify Integration
- [x] GraphQL Admin API client (2026-01)
- [x] Product sync (bulk import)
- [x] Webhook subscriptions setup
- [x] Rate limiting (cost-based)

### AI Content Generation
- [x] Multi-model AI (OpenAI GPT-3.5/4, Claude Sonnet, Perplexity)
- [x] Prompt engineering library
- [x] Content variant generation
- [x] Basic quality scoring

### SEO Research
- [x] Google Search Console integration
- [x] DataForSEO keyword research
- [x] SEMrush competitive analysis
- [x] Question discovery service

### Infrastructure
- [x] PostgreSQL database with Prisma
- [x] Redis caching
- [x] BullMQ queue processing
- [x] Docker development environment

---

## Technical Stack

**Backend:** NestJS 10 + TypeScript 5.3 + Prisma 5 + PostgreSQL 16 + Redis 7 + BullMQ
**Frontend:** React 18 + TypeScript + Vite + Shopify Polaris + React Query + Zustand
**AI:** OpenAI SDK, Anthropic SDK, Perplexity API
**Infrastructure:** Docker, AWS (S3, SQS, SES), DataDog, Sentry

---

## Known Constraints

1. **Shopify API Rate Limits:** 50 points/second cost-based limits
2. **AI Costs:** Balance quality vs cost for content generation
3. **Multi-tenant:** All data must be organization-scoped
4. **Security:** All tokens/secrets encrypted at rest

---

*Last updated: 2026-02-04 - Milestone v1.1 started*
