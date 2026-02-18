# Database Schema Update - Q&A Content Engine

**Date:** 2026-01-19
**Agent:** Database/Backend Specialist
**Status:** COMPLETED

---

## Overview

Added 8 new tables to support the customizable Q&A content engine for the Shopify SEO Platform. These tables enable businesses to create AI-powered question-based content with full customization, performance tracking, and automation.

---

## New Tables Added

### 1. business_profiles
**Purpose:** Store business customization data (industry, brand voice, content strategy)

**Key Fields:**
- `organization_id` (unique) - Links to organization
- `industry` - Business industry category
- `product_types` (JSONB) - Array of product types
- `target_audience` (JSONB) - Demographics, expertise level, pain points
- `brand_voice` (JSONB) - Tone, personality, preferred/avoid words
- `content_strategy` (JSONB) - Goals, content types, publishing frequency
- `seo_strategy` (JSONB) - Target keywords, locations, language
- `product_strategy` (JSONB) - Product mention frequency, CTA style
- `advanced_settings` (JSONB) - Fact-checking level, linking policy, image style

**Indexes:**
- `organization_id` (unique)
- `industry`

---

### 2. custom_question_templates
**Purpose:** AI-generated question templates customized per business

**Key Fields:**
- `organization_id` - Organization reference
- `business_profile_id` - Foreign key to business profile
- `template` - Question template text
- `category` - Template category
- `priority` - Template priority (higher = more important)
- `variables` (JSONB) - Template variables
- `usage_count` - How many times used

**Indexes:**
- `organization_id`
- `business_profile_id`
- `organization_id, priority DESC`
- `category`

---

### 3. qa_pages
**Purpose:** Generated Q&A content pages

**Key Fields:**
- `organization_id` - Organization reference
- `question` - The question being answered
- `answer_content` - Full HTML content
- `answer_markdown` - Markdown version for editing
- `featured_image_url` - Featured image URL
- `shopify_blog_id` - Shopify blog ID
- `shopify_blog_post_id` - Shopify blog post ID
- `shopify_page_id` - Shopify page ID
- `shopify_url` - Published URL
- `target_keyword` - Primary SEO keyword
- `meta_title`, `meta_description`, `h1` - SEO metadata
- `schema_markup` (JSONB) - FAQ/Article schema
- `current_position` - Current Google ranking
- `best_position` - Best ranking achieved
- `monthly_impressions`, `monthly_clicks`, `monthly_traffic` - Performance metrics
- `ctr` - Click-through rate
- `seo_score` - SEO quality score (0-100)
- `status` - draft, pending_review, published, archived
- `published_at` - Publication timestamp
- `last_optimized_at` - Last optimization timestamp

**Indexes:**
- `organization_id`
- `organization_id, status`
- `target_keyword`
- `organization_id, monthly_traffic DESC`
- `shopify_blog_post_id`

**Performance Optimization:**
- Indexes on traffic metrics for fast sorting
- Composite indexes for filtered queries

---

### 4. internal_links
**Purpose:** Track internal linking graph between pages

**Key Fields:**
- `organization_id` - Organization reference
- `source_page_type` - Type of source page (qa_page, product, collection)
- `source_page_id` - ID of source page
- `source_url` - URL of source page
- `target_page_type` - Type of target page
- `target_page_id` - ID of target page
- `target_url` - URL of target page
- `anchor_text` - Link anchor text
- `context` - Surrounding text context
- `link_type` - contextual, cta, navigation
- `relevance_score` - AI-calculated relevance (0.00-1.00)

**Indexes:**
- `organization_id`
- `source_url`
- `target_url`
- `source_page_id`

**Unique Constraint:**
- `organization_id, source_url, target_url, anchor_text`

**Use Cases:**
- Find orphan pages (no inbound links)
- Optimize link graph
- Suggest linking opportunities
- Track link relevance

---

### 5. content_performance
**Purpose:** Daily performance tracking per Q&A page

**Key Fields:**
- `page_id` - Foreign key to qa_pages
- `date` - Date of metrics
- `impressions`, `clicks`, `ctr`, `avg_position` - Google Search Console metrics
- `pageviews`, `unique_visitors`, `avg_time_on_page`, `bounce_rate` - Analytics metrics
- `conversions`, `revenue` - Conversion tracking

**Indexes:**
- `page_id, date DESC`
- `date`

**Unique Constraint:**
- `page_id, date` (one record per page per day)

**Use Cases:**
- Track performance trends over time
- Identify declining content
- Calculate ROI per page

---

### 6. ab_tests
**Purpose:** A/B testing experiments for content optimization

**Key Fields:**
- `organization_id` - Organization reference
- `page_id` - Foreign key to qa_pages
- `element_type` - What's being tested (title, meta_description, h2s, cta, intro)
- `control_value`, `variant_a_value`, `variant_b_value` - Test variations
- `traffic_split` (JSONB) - Traffic distribution (e.g., {control: 33, variant_a: 33, variant_b: 34})
- `results` (JSONB) - Test results per variation
- `winner` - Winning variation
- `confidence` - Statistical confidence (0.00-1.00)
- `status` - running, completed, winner_applied, cancelled
- `started_at`, `ended_at` - Test duration

**Indexes:**
- `organization_id`
- `page_id`
- `status`

**Use Cases:**
- Test different titles/meta descriptions
- Optimize CTR
- Improve conversion rates

---

### 7. automation_rules
**Purpose:** Business-specific automation settings

**Key Fields:**
- `organization_id` - Organization reference
- `rule_type` - Type of rule (content_refresh, auto_publish, internal_linking, ab_testing)
- `configuration` (JSONB) - Rule configuration
- `enabled` - Whether rule is active
- `last_executed_at` - Last execution timestamp
- `execution_count` - Number of times executed

**Indexes:**
- `organization_id`
- `organization_id, rule_type`
- `enabled`

**Use Cases:**
- Auto-publish content above SEO threshold
- Auto-refresh underperforming pages
- Auto-optimize internal linking
- Auto-start A/B tests

---

### 8. competitors
**Purpose:** Track competitor content strategy

**Key Fields:**
- `organization_id` - Organization reference
- `competitor_url` - Competitor website URL
- `competitor_name` - Competitor business name
- `content_topics` (JSONB) - Topics they cover
- `keywords_they_rank_for` (JSONB) - Keywords to target
- `content_gaps` (JSONB) - Questions they answer that we don't
- `last_analyzed_at` - Last analysis timestamp

**Indexes:**
- `organization_id`

**Unique Constraint:**
- `organization_id, competitor_url`

**Use Cases:**
- Identify content gaps
- Find keyword opportunities
- Competitive intelligence

---

## Database Relations

```
Organization (1) ---> (1) BusinessProfile
BusinessProfile (1) ---> (*) CustomQuestionTemplate
BusinessProfile (1) ---> (*) AutomationRule
Organization (1) ---> (*) QAPage
Organization (1) ---> (*) Competitor
QAPage (1) ---> (*) ContentPerformance
QAPage (1) ---> (*) ABTest
QAPage (1) ---> (*) InternalLink (as source)
```

---

## Multi-Tenant Isolation

**CRITICAL:** All tables include `organization_id` for multi-tenant data isolation.

**Security Rules:**
- Every query MUST filter by `organization_id`
- No cross-organization data access
- Cascade deletes when organization is removed

---

## Performance Considerations

### Indexes
- All foreign keys have indexes
- Performance-critical fields indexed (monthly_traffic, status, date)
- Composite indexes for common query patterns

### Scalability
- JSONB fields for flexible schema evolution
- Efficient indexes for 10,000+ Q&A pages per organization
- Optimized for time-series queries (performance tracking)

### Expected Load
- 50+ concurrent businesses
- 10,000+ Q&A pages per business
- Daily performance metrics updates
- Real-time link graph queries

---

## Migration Status

### Schema Updated
- ✅ Prisma schema updated with 8 new models
- ✅ Relations configured
- ✅ Indexes defined
- ✅ Cascade rules set

### Migration File
- ⚠️ Migration file needs to be created manually
- Prisma 7 requires different configuration approach
- Run migration when database connection is configured

### TypeScript Types
- ✅ All new entity types added to `database.types.ts`
- ✅ JSONB field interfaces defined
- ✅ PrismaClient interface updated

---

## Repositories Created

### BusinessProfileRepository
**Location:** `backend/src/repositories/business-profile.repository.ts`

**Key Methods:**
- `create()` - Create business profile
- `getByOrganizationId()` - Get profile
- `update()` - Update profile
- `updateBrandVoice()` - Update brand voice
- `updateContentStrategy()` - Update content strategy
- `getByIndustry()` - Get profiles by industry (benchmarking)
- `getWithTemplates()` - Get with question templates
- `getWithAutomationRules()` - Get with automation rules

### QAPageRepository
**Location:** `backend/src/repositories/qa-page.repository.ts`

**Key Methods:**
- `create()` - Create Q&A page
- `getById()` - Get page by ID
- `getByOrganization()` - Get all pages for org
- `getByStatus()` - Get pages by status
- `getTopPerformers()` - Get high-traffic pages
- `getUnderperformers()` - Get low-performing pages
- `update()` - Update page
- `publish()` - Publish to Shopify
- `updateMetrics()` - Update performance metrics
- `markOptimized()` - Mark as optimized
- `getNeedingOptimization()` - Get pages needing refresh
- `searchByKeyword()` - Search pages
- `getWithPerformance()` - Get with performance data
- `getWithLinks()` - Get with internal links
- `getWithABTests()` - Get with A/B tests
- `getCountByStatus()` - Count by status
- `getTotalTraffic()` - Get total traffic

### InternalLinkRepository
**Location:** `backend/src/repositories/internal-link.repository.ts`

**Key Methods:**
- `create()` - Create internal link
- `createMany()` - Bulk create links
- `getOutboundLinks()` - Get links from page
- `getInboundLinks()` - Get links to page
- `getByOrganization()` - Get all links
- `findOrphanPages()` - Find pages without inbound links
- `getPageLinkStats()` - Get link statistics
- `findLinkingOpportunities()` - AI-suggested links
- `updateRelevanceScore()` - Update relevance
- `deleteLinksForPage()` - Delete all links for page
- `getLinkGraph()` - Get graph visualization data
- `getPagesNeedingLinks()` - Pages below minimum links
- `linkExists()` - Check if link exists

---

## Next Steps for Other Agents

### API Integration Agent
- Create controllers for business profile CRUD
- Create controllers for Q&A content management
- Implement Shopify Blog API integration
- Implement Shopify Pages API integration

### Workflow Agent
- Implement content generation workflow
- Implement auto-optimization workflow
- Implement internal linking workflow
- Implement A/B testing workflow

### Frontend Agent
- Build business onboarding UI
- Build Q&A content manager
- Build analytics dashboard
- Build link graph visualization

---

## Testing Checklist

- [ ] Test multi-tenant isolation
- [ ] Test cascade deletes
- [ ] Test query performance with 10,000+ records
- [ ] Test JSONB field validation
- [ ] Test unique constraints
- [ ] Test index usage
- [ ] Test repository methods
- [ ] Load test with concurrent queries

---

## Documentation

**Files Updated:**
- `backend/prisma/schema.prisma` - Schema definitions
- `backend/src/types/database.types.ts` - TypeScript types
- `backend/src/repositories/business-profile.repository.ts` - Business profile repo
- `backend/src/repositories/qa-page.repository.ts` - Q&A page repo
- `backend/src/repositories/internal-link.repository.ts` - Internal link repo
- `backend/src/repositories/index.ts` - Repository exports

**New Documentation:**
- `DATABASE_SCHEMA_UPDATE.md` - This file

---

## Schema Validation

**JSONB Field Structures:**

```typescript
// target_audience
{
  demographics: string;
  expertiseLevel: 'beginner' | 'intermediate' | 'expert';
  painPoints: string[];
  searchBehavior: string;
}

// brand_voice
{
  tone: 'professional' | 'casual' | 'technical' | 'friendly' | 'authoritative' | 'conversational';
  personality: string[];
  avoidWords: string[];
  preferredWords: string[];
  exampleContent: string;
}

// content_strategy
{
  primaryGoal: 'traffic' | 'conversions' | 'brand_awareness' | 'education';
  contentTypes: string[];
  postLength: 'short' | 'medium' | 'long';
  publishingFrequency: number;
  competitorUrls?: string[];
}

// seo_strategy
{
  targetKeywords: string[];
  avoidKeywords: string[];
  targetLocations: string[];
  languagePreference: 'en-US' | 'en-GB' | 'es' | 'fr' | 'de';
}

// product_strategy
{
  productMentionFrequency: 'minimal' | 'moderate' | 'aggressive';
  ctaStyle: 'soft' | 'direct' | 'educational';
  preferredCTAs: string[];
}

// advanced_settings
{
  factCheckingLevel: 'basic' | 'thorough' | 'expert';
  externalLinkingPolicy: 'minimal' | 'moderate' | 'generous';
  imageStyle: 'realistic' | 'illustrated' | 'minimal';
  schemaPreferences: string[];
}
```

---

## Database Implementation COMPLETED

All schema changes, type definitions, and repository services are ready for integration with the Q&A Content Engine!

**Status:** READY FOR MIGRATION AND TESTING
