# Backend TypeScript Error Fixes - Progress Report
**Date:** 2026-01-22
**Status:** Backend not running - 17 TypeScript errors preventing startup

---

## Problem Diagnosis

### Root Cause
The backend is crashing in a **memory exhaustion loop**:
- TypeScript watch mode continuously recompiles due to 17 compilation errors
- Each recompilation accumulates memory until hitting Node.js 2GB heap limit
- Container crashes, Docker restarts it, cycle repeats

### Key Finding
**This is NOT a memory leak** - the codebase is small:
- Only 75 TypeScript files
- No circular dependencies (verified with madge)
- Watch mode accumulating memory due to compilation errors

---

## Current Error Count: 17 Errors

### Error Breakdown

#### 1. GDPR Service - SecurityEventType Enum (8 errors)
**File:** `backend/src/services/gdpr-service.ts`

Using string literals instead of enum values:
```typescript
// WRONG (current):
type: 'DATA_EXPORT',
type: 'DATA_DELETION',
type: 'CONSENT_RECORDED',
type: 'CONSENT_REVOKED',
type: 'DATA_BREACH',
type: 'DELETION_SCHEDULED',
type: 'DELETION_CANCELLED',

// CORRECT (needed):
type: SecurityEventType.DATA_EXPORT,
type: SecurityEventType.DATA_DELETION,
type: SecurityEventType.CONSENT_RECORDED,
type: SecurityEventType.CONSENT_REVOKED,
type: SecurityEventType.DATA_BREACH,
type: SecurityEventType.DELETION_SCHEDULED,
type: SecurityEventType.DELETION_CANCELLED,
```

**Lines affected:** 81, 110, 136, 159, 180, 237, 252

---

#### 2. GDPR Service - Missing Type Properties (2 errors)

**Error A:** UserDataExport missing properties (line 66)
```typescript
// Missing: products, contentGenerations, analytics
data: {
  profile: { ... },
  organizations: user.organizations,
  auditLogs: user.auditLogs,
  // ADD THESE:
  products: [],
  contentGenerations: [],
  analytics: [],
}
```

**Error B:** UserConsent missing properties (line 128)
```typescript
const consent: UserConsent = {
  userId,
  consentType,
  granted,
  timestamp: new Date(),
  // ADD THESE:
  ipAddress: 'system', // or actual IP
  version: '1.0', // privacy policy version
};
```

---

#### 3. Shopify Integration - Wrong Organization Type (2 errors)

**File:** `backend/src/services/shopify-integration-service.ts`

**Line 38:** Importing from wrong location
```typescript
// WRONG:
import { Product, Organization } from '../types/database.types';

// CORRECT:
import { Organization } from '@prisma/client';
import { Product } from '../types/database.types';
```

**Lines 631, 634:** Using camelCase properties on snake_case type
```typescript
// After fixing import, properties will be:
organization.access_token (not accessTokenEncrypted)
organization.shop_domain (not shopifyDomain)
```

---

#### 4. Multi-tenant Interceptor - Missing Prisma Type (1 error)

**File:** `backend/src/database/multi-tenant-interceptor.ts`
**Line 81:** `Prisma.MiddlewareParams` doesn't exist in Prisma 5

**Fix:** Use `any` type or remove middleware (Prisma 5 doesn't support middleware)
```typescript
// OPTION 1: Type as any
this.prisma.$use(async (params: any, next: any) => {

// OPTION 2: Comment out entire middleware section if not critical
```

---

#### 5. Minor Errors (4 errors)

**A. api-integration-examples.ts** (line 37, 357)
- Test file using wrong Organization type format
- **Fix:** Update to use Prisma Organization type

**B. rbac-guard.ts** (line 309)
- Property visibility issue in decorator
- **Fix:** Make `requiredTier` public

**C. qa-content-integration.test.ts** (line 15)
- Wrong import name
- **Fix:** Change `createPerplexityService` to `PerplexityService`

**D. content-calendar-service.ts** (line 57)
- Missing `id` property on GeneratedContent
- **Fix:** Check actual Prisma type or make property optional

---

## Quick Fix Commands (Copy-Paste Ready)

### Fix 1: GDPR Service Enum Values
```bash
docker exec shopify-seo-backend sed -i "s/type: 'DATA_EXPORT'/type: SecurityEventType.DATA_EXPORT/g" /app/src/services/gdpr-service.ts
docker exec shopify-seo-backend sed -i "s/type: 'DATA_DELETION'/type: SecurityEventType.DATA_DELETION/g" /app/src/services/gdpr-service.ts
docker exec shopify-seo-backend sed -i "s/type: 'CONSENT_RECORDED'/type: SecurityEventType.CONSENT_RECORDED/g" /app/src/services/gdpr-service.ts
docker exec shopify-seo-backend sed -i "s/type: 'CONSENT_REVOKED'/type: SecurityEventType.CONSENT_REVOKED/g" /app/src/services/gdpr-service.ts
docker exec shopify-seo-backend sed -i "s/type: 'DATA_BREACH'/type: SecurityEventType.DATA_BREACH/g" /app/src/services/gdpr-service.ts
docker exec shopify-seo-backend sed -i "s/type: 'DELETION_SCHEDULED'/type: SecurityEventType.DELETION_SCHEDULED/g" /app/src/services/gdpr-service.ts
docker exec shopify-seo-backend sed -i "s/type: 'DELETION_CANCELLED'/type: SecurityEventType.DELETION_CANCELLED/g" /app/src/services/gdpr-service.ts
```

### Fix 2: Shopify Integration Organization Import
```bash
docker exec shopify-seo-backend sed -i "38s/.*/import { Organization } from '@prisma\/client';/" /app/src/services/shopify-integration-service.ts
docker exec shopify-seo-backend sed -i "39i import { Product } from '../types/database.types';" /app/src/services/shopify-integration-service.ts
```

### Fix 3: Multi-tenant Interceptor Type
```bash
docker exec shopify-seo-backend sed -i "81s/Prisma.MiddlewareParams/any/g" /app/src/database/multi-tenant-interceptor.ts
docker exec shopify-seo-backend sed -i "81s/, next)/, next: any)/g" /app/src/database/multi-tenant-interceptor.ts
```

---

## Expected Result After Fixes

**Error count progression:**
- Started: 118+ errors
- After queue fixes: 74 errors
- After Organization type fix: 17 errors
- **After these fixes: ~5-8 errors** (minor test/example file issues)

**Backend should:**
1. Compile successfully with 0 critical errors
2. Start NestJS server
3. Respond to HTTP requests on port 3003
4. Serve `/health` endpoint

---

## What's Already Working

### ✅ Infrastructure
- Docker containers running (PostgreSQL, Redis, Backend)
- Node.js packages installed (googleapis, google-auth-library, graphql-request)
- Prisma client generated
- BullMQ queue event listeners fixed
- ioredis version compatibility resolved

### ✅ Codebase Quality
- No circular dependencies
- Small codebase (75 files)
- Proper project structure
- All major services implemented

---

## Next Steps After Backend Starts

### 1. Test Backend Health
```bash
curl http://localhost:3003/health
# Expected: {"status":"ok","timestamp":"..."}
```

### 2. Test Shopify OAuth Flow
- Frontend → Backend OAuth endpoint
- Verify HMAC validation
- Test token exchange
- Check database organization record created

### 3. Build Week 1-2 Features (from plan)

**Priority 1: AI Image Generation (DALL-E 3)**
- Create `image-generation-service.ts`
- Integrate with OpenAI DALL-E 3 API
- Auto-generate featured images for blog posts
- Upload to Shopify CDN
- Add to content generation workflow

**Priority 2: Topical Map Generator UI**
- Create `TopicalMapGenerator.tsx` frontend page
- Use existing DataForSEO backend service
- Visualize keyword clusters (React Flow or D3.js)
- Save maps to database

### 4. Test End-to-End Content Workflow
Complete workflow: Question → Article → Image → Publish → Monitor
- Use Question Discovery to find topics
- Generate article with AI
- Auto-generate featured image
- Publish to Shopify blog
- Track performance in analytics

---

## Key Architecture Decisions Made

### DataForSEO as Primary SEO API
**Why:** Cost-effective pay-per-use (~$0.01-0.10/request) vs. SEMrush $549/month
**Impact:** Core platform remains affordable, SEMrush/Ahrefs are optional enterprise add-ons

### Prisma Auto-Generated Types
**Why:** Avoid manual type definition drift
**Impact:** Always use `@prisma/client` imports, never manual database.types.ts

### No Memory Increase Needed
**Why:** Problem is compilation errors, not actual memory usage
**Impact:** Fix errors instead of masking with larger heap

---

## Critical Files Reference

### Files That Need Changes
1. `backend/src/services/gdpr-service.ts` - Enum values, missing properties
2. `backend/src/services/shopify-integration-service.ts` - Organization import
3. `backend/src/database/multi-tenant-interceptor.ts` - Prisma type
4. `backend/src/examples/api-integration-examples.ts` - Test file Organization type
5. `backend/src/services/content-calendar-service.ts` - GeneratedContent.id property

### Files Already Fixed (Previous Session)
1. `backend/src/queues/content-generation-queue.ts` - Queue event listeners ✅
2. `backend/src/queues/optimization-queue.ts` - Queue event listeners ✅
3. `backend/src/queues/publishing-queue.ts` - Queue event listeners ✅
4. `backend/src/config/redis.config.ts` - ioredis version cast ✅

---

## Resources & Context

**Project:** Shopify SEO Automation Platform
**Goal:** "WP SEO AI for Shopify" - complete feature parity + enhancements
**Status:** 16/20 features already implemented, backend needs stability fixes

**Plan File:** `C:\Users\pepij\.claude\plans\indexed-exploring-hinton.md`
**Docker Compose:** `C:\Users\pepij\shopify-seo-platform\docker-compose.yml`
**Backend Path:** `C:\Users\pepij\shopify-seo-platform\backend\`

---

## How to Resume Work

1. **Copy-paste the Quick Fix Commands** above into terminal
2. **Wait for watch mode to detect changes** (check Docker logs)
3. **Verify error count drops** to ~5-8 errors
4. **Fix remaining minor errors** (test files, examples)
5. **Test backend health endpoint**
6. **Begin Week 1-2 feature development**

---

## Contact & Support
- **User:** Wants DataForSEO (not expensive SEMrush)
- **Priority:** Complete end-to-end content workflow with image generation
- **Timeline:** Week 1-2 focuses on Image Generation + Topical Map UI
