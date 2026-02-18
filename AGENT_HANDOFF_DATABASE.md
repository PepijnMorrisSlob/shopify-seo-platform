# Database Agent Handoff - Q&A Content Engine

**From:** Database/Backend Specialist
**To:** All Other Agents
**Date:** 2026-01-19
**Status:** COMPLETED

---

## What Was Built

The database foundation for the customizable Q&A content engine is now complete.

### 8 New Tables Created:

1. **business_profiles** - Business customization (industry, brand voice, content strategy)
2. **custom_question_templates** - AI-generated question templates per business
3. **qa_pages** - Generated Q&A content pages with full SEO metadata
4. **internal_links** - Internal linking graph between pages
5. **content_performance** - Daily performance tracking per page
6. **ab_tests** - A/B testing experiments for optimization
7. **automation_rules** - Business-specific automation settings
8. **competitors** - Competitor tracking and gap analysis

### 3 Repository Services Created:

1. **BusinessProfileRepository** - CRUD operations for business profiles
2. **QAPageRepository** - Full Q&A page lifecycle management
3. **InternalLinkRepository** - Link graph operations and optimization

---

## File Locations

### Schema & Types
```
backend/prisma/schema.prisma              - Updated with 8 new models
backend/src/types/database.types.ts       - All TypeScript interfaces
```

### Repositories
```
backend/src/repositories/
├── business-profile.repository.ts        - Business profile operations
├── qa-page.repository.ts                 - Q&A page operations
├── internal-link.repository.ts           - Internal linking operations
└── index.ts                              - Repository exports
```

### Documentation
```
DATABASE_SCHEMA_UPDATE.md                 - Complete schema documentation
backend/MIGRATION_INSTRUCTIONS.md         - How to run migration
AGENT_HANDOFF_DATABASE.md                 - This file
```

---

## How to Use These Repositories

### Import Repositories

```typescript
import { PrismaClient } from '@prisma/client';
import {
  BusinessProfileRepository,
  QAPageRepository,
  InternalLinkRepository,
} from './repositories';

const prisma = new PrismaClient();

const businessProfileRepo = new BusinessProfileRepository(prisma);
const qaPageRepo = new QAPageRepository(prisma);
const internalLinkRepo = new InternalLinkRepository(prisma);
```

### Example: Create Business Profile

```typescript
const profile = await businessProfileRepo.create({
  organizationId: org.id,
  businessName: 'Premium Coffee Co.',
  industry: 'ecommerce',
  productTypes: ['physical'],
  targetAudience: {
    demographics: '25-45 year old coffee enthusiasts',
    expertiseLevel: 'intermediate',
    painPoints: ['finding quality coffee', 'learning brewing methods'],
    searchBehavior: 'asking questions on Google',
  },
  brandVoice: {
    tone: 'friendly',
    personality: ['educational', 'passionate', 'approachable'],
    avoidWords: ['cheap', 'budget', 'basic'],
    preferredWords: ['artisan', 'craft', 'premium', 'quality'],
    exampleContent: 'Our coffee beans are carefully sourced...',
  },
  contentStrategy: {
    primaryGoal: 'traffic',
    contentTypes: ['how-to', 'educational', 'comparison'],
    postLength: 'long',
    publishingFrequency: 3, // per week
  },
  seoStrategy: {
    targetKeywords: ['coffee brewing', 'best coffee beans', 'how to make coffee'],
    avoidKeywords: ['instant coffee', 'cheap coffee'],
    targetLocations: ['United States', 'Canada'],
    languagePreference: 'en-US',
  },
  productStrategy: {
    productMentionFrequency: 'moderate',
    ctaStyle: 'educational',
    preferredCTAs: ['Learn More', 'Shop Now', 'Discover'],
  },
  advancedSettings: {
    factCheckingLevel: 'thorough',
    externalLinkingPolicy: 'moderate',
    imageStyle: 'realistic',
    schemaPreferences: ['FAQ', 'HowTo', 'Article'],
  },
});
```

### Example: Create Q&A Page

```typescript
const qaPage = await qaPageRepo.create({
  organizationId: org.id,
  question: 'How to brew the perfect cup of coffee?',
  answerContent: '<h2>Step 1: Choose Quality Beans</h2>...',
  answerMarkdown: '## Step 1: Choose Quality Beans\n\n...',
  featuredImageUrl: 'https://example.com/image.jpg',
  targetKeyword: 'how to brew coffee',
  metaTitle: 'How to Brew the Perfect Cup of Coffee - Complete Guide',
  metaDescription: 'Learn the expert techniques for brewing perfect coffee...',
  h1: 'How to Brew the Perfect Cup of Coffee',
  schemaMarkup: {
    '@type': 'HowTo',
    name: 'How to brew coffee',
    // ... schema data
  },
  seoScore: 92,
  status: 'published',
});
```

### Example: Track Internal Links

```typescript
// Create internal link
await internalLinkRepo.create({
  organizationId: org.id,
  sourcePageType: 'qa_page',
  sourcePageId: qaPage1.id,
  sourceUrl: qaPage1.shopify_url,
  targetPageType: 'product',
  targetPageId: product.shopify_product_id,
  targetUrl: product.shopify_url,
  anchorText: 'premium coffee beans',
  context: 'To achieve the best results, use our premium coffee beans...',
  linkType: 'contextual',
  relevanceScore: 0.85,
});

// Find orphan pages
const orphans = await internalLinkRepo.findOrphanPages(org.id);

// Get linking opportunities
const opportunities = await internalLinkRepo.findLinkingOpportunities(
  org.id,
  targetPage.shopify_url,
  10
);
```

---

## What Each Agent Needs to Do

### API Integration Agent

**Your Tasks:**
1. Create controllers using these repositories
2. Build REST endpoints:
   - `POST /api/business-profile` - Create/update profile
   - `GET /api/business-profile` - Get profile
   - `GET /api/qa-pages` - List Q&A pages
   - `POST /api/qa-pages` - Create Q&A page
   - `GET /api/qa-pages/:id` - Get page details
   - `PUT /api/qa-pages/:id` - Update page
   - `POST /api/qa-pages/:id/publish` - Publish to Shopify
   - `GET /api/internal-links/orphans` - Find orphan pages
   - `GET /api/internal-links/opportunities` - Get linking suggestions
3. Integrate with Shopify Blog API
4. Integrate with Shopify Pages API

**Repository Methods You'll Use:**
```typescript
// Business Profile
businessProfileRepo.create()
businessProfileRepo.getByOrganizationId()
businessProfileRepo.update()

// Q&A Pages
qaPageRepo.create()
qaPageRepo.getByOrganization()
qaPageRepo.update()
qaPageRepo.publish()
qaPageRepo.updateMetrics()

// Internal Links
internalLinkRepo.create()
internalLinkRepo.findOrphanPages()
internalLinkRepo.findLinkingOpportunities()
```

---

### Workflow Agent

**Your Tasks:**
1. Build content generation workflow using `qaPageRepo`
2. Build auto-optimization workflow
3. Build internal linking workflow using `internalLinkRepo`
4. Build A/B testing workflow

**Repository Methods You'll Use:**
```typescript
// Content Generation
qaPageRepo.create()
qaPageRepo.publish()

// Auto-Optimization
qaPageRepo.getUnderperformers()
qaPageRepo.update()
qaPageRepo.markOptimized()

// Internal Linking
internalLinkRepo.findOrphanPages()
internalLinkRepo.getPagesNeedingLinks()
internalLinkRepo.createMany()

// Performance Tracking
qaPageRepo.updateMetrics()
```

---

### Frontend Agent

**Your Tasks:**
1. Build business onboarding form (uses `businessProfileRepo`)
2. Build Q&A content manager (uses `qaPageRepo`)
3. Build performance dashboard
4. Build link graph visualization (uses `internalLinkRepo`)

**API Endpoints You'll Call:**
```typescript
// Onboarding
POST /api/business-profile
GET /api/business-profile

// Q&A Management
GET /api/qa-pages?status=draft
GET /api/qa-pages/:id
PUT /api/qa-pages/:id
POST /api/qa-pages/:id/publish

// Performance
GET /api/qa-pages/:id/performance?days=30
GET /api/qa-pages/top-performers

// Internal Linking
GET /api/internal-links/orphans
GET /api/internal-links/opportunities
```

---

### Documentation Agent

**Your Tasks:**
1. Document business profile onboarding flow
2. Document Q&A content lifecycle
3. Document internal linking strategy
4. Create user guides

**Key Concepts to Document:**
- Business customization options
- Content generation workflow
- SEO optimization process
- Internal linking best practices
- Performance tracking metrics

---

## Data Flow Overview

```
1. ONBOARDING
   User completes onboarding
   → BusinessProfileRepository.create()
   → business_profiles table

2. QUESTION DISCOVERY
   AI generates custom questions
   → CustomQuestionTemplate created
   → custom_question_templates table

3. CONTENT GENERATION
   AI generates Q&A content
   → QAPageRepository.create()
   → qa_pages table (status: draft)

4. REVIEW & PUBLISH
   User reviews content
   → QAPageRepository.publish()
   → Shopify Blog API
   → qa_pages (status: published)

5. INTERNAL LINKING
   AI finds linking opportunities
   → InternalLinkRepository.create()
   → internal_links table

6. PERFORMANCE TRACKING
   Daily metrics update
   → ContentPerformance created
   → content_performance table
   → QAPageRepository.updateMetrics()

7. AUTO-OPTIMIZATION
   Workflow checks performance
   → QAPageRepository.getUnderperformers()
   → AI refreshes content
   → QAPageRepository.update()
```

---

## Testing the Database

Before building on top of this:

1. **Run migration** (see `backend/MIGRATION_INSTRUCTIONS.md`)
2. **Test repositories** with sample data
3. **Verify multi-tenant isolation**
4. **Check cascade deletes work**
5. **Test performance with 1000+ records**

---

## Important Notes

### Multi-Tenant Security
**CRITICAL:** Every query MUST filter by `organization_id`

```typescript
// CORRECT
const pages = await qaPageRepo.getByOrganization(org.id);

// WRONG - Security violation!
const pages = await prisma.qaPage.findMany();
```

### JSONB Field Validation
Validate JSONB fields match the TypeScript interfaces:

```typescript
import { BrandVoice, ContentStrategy } from './types/database.types';

// Type-safe
const brandVoice: BrandVoice = {
  tone: 'friendly',
  personality: ['educational'],
  // ... TypeScript will enforce structure
};
```

### Performance Considerations
- Use indexes for filtering/sorting
- Limit query results (pagination)
- Use `select` to fetch only needed fields
- Use `include` carefully (can create N+1 queries)

---

## Questions or Issues?

**Database Schema:** See `DATABASE_SCHEMA_UPDATE.md`
**Migration Help:** See `backend/MIGRATION_INSTRUCTIONS.md`
**Code Examples:** See repository files

---

## Next Integration Points

1. **Business Intelligence Service** needs `businessProfileRepo`
2. **Question Discovery Service** needs `customQuestionTemplateRepo` (TODO: create this)
3. **Content Generation Service** needs `qaPageRepo`
4. **Auto-Optimization Service** needs `qaPageRepo` + `contentPerformanceRepo` (TODO: create this)
5. **Internal Linking Service** needs `internalLinkRepo`
6. **A/B Testing Service** needs `abTestRepo` (TODO: create this)

---

**STATUS:** Database foundation complete. Ready for service layer implementation!

**Database Specialist signing off. Good luck agents!**
