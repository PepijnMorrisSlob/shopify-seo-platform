# Prisma Migration Instructions - Q&A Content Engine

**Date:** 2026-01-19
**Migration Name:** `add_qa_content_engine`

---

## Prerequisites

1. Database connection configured in Prisma config
2. PostgreSQL database accessible
3. Backup of existing database

---

## Migration Steps

### Step 1: Verify Schema

Review the updated schema:
```bash
cat prisma/schema.prisma
```

Verify all 8 new tables are present:
- `business_profiles`
- `custom_question_templates`
- `qa_pages`
- `internal_links`
- `content_performance`
- `ab_tests`
- `automation_rules`
- `competitors`

---

### Step 2: Create Migration (Prisma 7)

Due to Prisma 7 configuration changes, create the migration manually:

```bash
# Navigate to backend directory
cd backend

# Create migration with Prisma
npx prisma migrate dev --name add_qa_content_engine
```

**If using Prisma 7 with new config:**
1. Ensure `prisma.config.ts` is configured with database connection
2. Update datasource configuration as per Prisma 7 requirements
3. Run migration command

**Alternative (Manual SQL Migration):**
If automatic migration fails, use the SQL script below.

---

### Step 3: Manual SQL Migration (If Needed)

If Prisma migration doesn't work, run this SQL directly:

```sql
-- ============================================================================
-- Q&A CONTENT ENGINE: Business Profiles
-- ============================================================================
CREATE TABLE business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,

  -- Basic Info
  business_name VARCHAR(255) NOT NULL,
  industry VARCHAR(50) NOT NULL,
  product_types JSONB NOT NULL,

  -- Customization (JSONB fields)
  target_audience JSONB NOT NULL,
  brand_voice JSONB NOT NULL,
  content_strategy JSONB NOT NULL,
  seo_strategy JSONB NOT NULL,
  product_strategy JSONB NOT NULL,
  advanced_settings JSONB NOT NULL,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_business_profiles_org ON business_profiles(organization_id);
CREATE INDEX idx_business_profiles_industry ON business_profiles(industry);

-- ============================================================================
-- Q&A CONTENT ENGINE: Custom Question Templates
-- ============================================================================
CREATE TABLE custom_question_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,

  template TEXT NOT NULL,
  category VARCHAR(100),
  priority INTEGER DEFAULT 0,
  variables JSONB,
  usage_count INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_templates_org ON custom_question_templates(organization_id);
CREATE INDEX idx_templates_profile ON custom_question_templates(business_profile_id);
CREATE INDEX idx_templates_priority ON custom_question_templates(organization_id, priority DESC);
CREATE INDEX idx_templates_category ON custom_question_templates(category);

-- ============================================================================
-- Q&A CONTENT ENGINE: Q&A Pages
-- ============================================================================
CREATE TABLE qa_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Content
  question TEXT NOT NULL,
  answer_content TEXT,
  answer_markdown TEXT,
  featured_image_url VARCHAR(500),

  -- Shopify Integration
  shopify_blog_id VARCHAR(255),
  shopify_blog_post_id VARCHAR(255),
  shopify_page_id VARCHAR(255),
  shopify_url VARCHAR(500),

  -- SEO
  target_keyword VARCHAR(255),
  meta_title VARCHAR(255),
  meta_description TEXT,
  h1 VARCHAR(500),
  schema_markup JSONB,

  -- Performance Tracking
  current_position INTEGER,
  best_position INTEGER,
  monthly_impressions INTEGER DEFAULT 0,
  monthly_clicks INTEGER DEFAULT 0,
  monthly_traffic INTEGER DEFAULT 0,
  ctr DECIMAL(5,2),
  seo_score INTEGER,

  -- Status
  status VARCHAR(50) DEFAULT 'draft',
  published_at TIMESTAMP,
  last_optimized_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_qa_org ON qa_pages(organization_id);
CREATE INDEX idx_qa_status ON qa_pages(organization_id, status);
CREATE INDEX idx_qa_keyword ON qa_pages(target_keyword);
CREATE INDEX idx_qa_performance ON qa_pages(organization_id, monthly_traffic DESC);
CREATE INDEX idx_qa_shopify ON qa_pages(shopify_blog_post_id);

-- ============================================================================
-- Q&A CONTENT ENGINE: Internal Links
-- ============================================================================
CREATE TABLE internal_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Source
  source_page_type VARCHAR(50) NOT NULL,
  source_page_id VARCHAR(255),
  source_url VARCHAR(500) NOT NULL,

  -- Target
  target_page_type VARCHAR(50) NOT NULL,
  target_page_id VARCHAR(255),
  target_url VARCHAR(500) NOT NULL,

  -- Link Details
  anchor_text VARCHAR(255) NOT NULL,
  context TEXT,
  link_type VARCHAR(50) NOT NULL,
  relevance_score DECIMAL(3,2),

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(organization_id, source_url, target_url, anchor_text)
);

CREATE INDEX idx_links_org ON internal_links(organization_id);
CREATE INDEX idx_links_source ON internal_links(source_url);
CREATE INDEX idx_links_target ON internal_links(target_url);
CREATE INDEX idx_links_source_id ON internal_links(source_page_id);

-- ============================================================================
-- Q&A CONTENT ENGINE: Content Performance
-- ============================================================================
CREATE TABLE content_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES qa_pages(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Google Search Console Metrics
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr DECIMAL(5,2),
  avg_position DECIMAL(5,2),

  -- Analytics Metrics
  pageviews INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  avg_time_on_page INTEGER,
  bounce_rate DECIMAL(5,2),

  -- Conversion Tracking
  conversions INTEGER DEFAULT 0,
  revenue DECIMAL(10,2),

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(page_id, date)
);

CREATE INDEX idx_performance_page ON content_performance(page_id, date DESC);
CREATE INDEX idx_performance_date ON content_performance(date);

-- ============================================================================
-- Q&A CONTENT ENGINE: A/B Tests
-- ============================================================================
CREATE TABLE ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  page_id UUID REFERENCES qa_pages(id) ON DELETE CASCADE,

  element_type VARCHAR(50) NOT NULL,

  -- Variations
  control_value TEXT NOT NULL,
  variant_a_value TEXT,
  variant_b_value TEXT,

  -- Configuration & Results
  traffic_split JSONB NOT NULL,
  results JSONB,
  winner VARCHAR(50),
  confidence DECIMAL(5,2),

  status VARCHAR(50) DEFAULT 'running',

  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tests_org ON ab_tests(organization_id);
CREATE INDEX idx_tests_page ON ab_tests(page_id);
CREATE INDEX idx_tests_status ON ab_tests(status);

-- ============================================================================
-- Q&A CONTENT ENGINE: Automation Rules
-- ============================================================================
CREATE TABLE automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  rule_type VARCHAR(50) NOT NULL,
  configuration JSONB NOT NULL,
  enabled BOOLEAN DEFAULT true,

  last_executed_at TIMESTAMP,
  execution_count INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rules_org ON automation_rules(organization_id);
CREATE INDEX idx_rules_type ON automation_rules(organization_id, rule_type);
CREATE INDEX idx_rules_enabled ON automation_rules(enabled);

-- ============================================================================
-- Q&A CONTENT ENGINE: Competitor Tracking
-- ============================================================================
CREATE TABLE competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  competitor_url VARCHAR(500) NOT NULL,
  competitor_name VARCHAR(255),

  -- Analysis
  content_topics JSONB,
  keywords_they_rank_for JSONB,
  content_gaps JSONB,

  last_analyzed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(organization_id, competitor_url)
);

CREATE INDEX idx_competitors_org ON competitors(organization_id);
```

---

### Step 4: Verify Migration

After running the migration:

```bash
# Check database schema
npx prisma db pull

# Generate Prisma Client
npx prisma generate

# Verify tables exist
psql $DATABASE_URL -c "\dt"
```

Expected output should show:
- `business_profiles`
- `custom_question_templates`
- `qa_pages`
- `internal_links`
- `content_performance`
- `ab_tests`
- `automation_rules`
- `competitors`

---

### Step 5: Test Database Operations

Create a test script to verify repositories work:

```typescript
// test/database-test.ts
import { PrismaClient } from '@prisma/client';
import { BusinessProfileRepository } from '../src/repositories/business-profile.repository';

const prisma = new PrismaClient();
const repo = new BusinessProfileRepository(prisma);

// Test create
const profile = await repo.create({
  organizationId: 'test-org-id',
  businessName: 'Test Business',
  industry: 'ecommerce',
  productTypes: ['physical'],
  targetAudience: {
    demographics: '25-45 year old professionals',
    expertiseLevel: 'intermediate',
    painPoints: ['finding quality products'],
    searchBehavior: 'asking questions on Google',
  },
  // ... other required fields
});

console.log('Created business profile:', profile.id);

// Test retrieve
const retrieved = await repo.getByOrganizationId('test-org-id');
console.log('Retrieved profile:', retrieved?.business_name);

// Cleanup
await repo.delete('test-org-id');
console.log('Test completed successfully!');
```

Run test:
```bash
npx tsx test/database-test.ts
```

---

### Step 6: Backup & Rollback Plan

**Before migrating production:**

```bash
# Backup database
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore if needed
psql $DATABASE_URL < backup-YYYYMMDD.sql
```

**Rollback migration:**
```bash
npx prisma migrate resolve --rolled-back add_qa_content_engine
```

---

## Troubleshooting

### Error: "url is no longer supported in datasource"
**Solution:** Update to Prisma 7 config format or downgrade to Prisma 6

### Error: "relation already exists"
**Solution:** Tables already exist. Drop them or use `--force` flag

### Error: "insufficient privilege"
**Solution:** Ensure database user has CREATE TABLE permission

---

## Post-Migration Checklist

- [ ] All 8 tables created
- [ ] All indexes created
- [ ] Foreign key constraints working
- [ ] Cascade deletes configured
- [ ] Repository methods tested
- [ ] TypeScript types generated
- [ ] No breaking changes to existing code

---

## Next Steps After Migration

1. Update other agents about completed schema
2. Implement business profile onboarding
3. Build Q&A content generation workflow
4. Create frontend components
5. Test end-to-end flow

---

**Migration Status:** READY TO EXECUTE
