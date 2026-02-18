# Backend API Requirements for Q&A Content Frontend

**From:** Frontend/React Specialist
**To:** Backend/Database Specialist, API Integration Specialist, Documentation Specialist
**Date:** 2026-01-19

---

## Overview

The frontend Q&A Content Management system is complete and requires the following backend API endpoints to function. All endpoints should follow RESTful conventions and return JSON.

---

## Authentication

All endpoints require session token authentication via Shopify App Bridge:

```
Authorization: Bearer {session_token}
```

---

## Required API Endpoints

### 1. Business Profile Management

#### **GET** `/api/business-profile`

Get the business profile for the authenticated organization.

**Response:**
```typescript
{
  id: string;
  organizationId: string;
  businessName: string;
  industry: 'ecommerce' | 'saas' | 'services' | 'health' | 'fashion' | 'food' | 'home_garden' | 'b2b';
  productTypes: ('physical' | 'digital' | 'services')[];
  targetAudience: {
    demographics: string;
    expertiseLevel: 'beginner' | 'intermediate' | 'expert';
    painPoints: string[];
    searchBehavior: string;
  };
  brandVoice: {
    tone: 'professional' | 'casual' | 'technical' | 'friendly' | 'authoritative' | 'conversational';
    personality: string[];
    avoidWords: string[];
    preferredWords: string[];
    exampleContent: string;
  };
  contentStrategy: {
    primaryGoal: 'traffic' | 'conversions' | 'brand_awareness' | 'education';
    contentTypes: ('how-to' | 'comparison' | 'educational' | 'troubleshooting' | 'guide')[];
    postLength: 'short' | 'medium' | 'long';
    publishingFrequency: number;
    competitorUrls: string[];
  };
  seoStrategy: {
    targetKeywords: string[];
    avoidKeywords: string[];
    targetLocations: string[];
    languagePreference: 'en-US' | 'en-GB' | 'es' | 'fr' | 'de';
  };
  productStrategy: {
    productMentionFrequency: 'minimal' | 'moderate' | 'aggressive';
    ctaStyle: 'soft' | 'direct' | 'educational';
    preferredCTAs: string[];
  };
  advancedSettings: {
    factCheckingLevel: 'basic' | 'thorough' | 'expert';
    externalLinkingPolicy: 'minimal' | 'moderate' | 'generous';
    imageStyle: 'realistic' | 'illustrated' | 'minimal';
    schemaPreferences: string[];
  };
  createdAt: string;
  updatedAt: string;
}
```

**Status Codes:**
- `200` - Success
- `404` - Profile not found (user hasn't completed onboarding)
- `401` - Unauthorized

---

#### **POST** `/api/business-profile`

Create a new business profile (called from onboarding flow).

**Request Body:** (Same structure as GET response, minus `id`, `organizationId`, `createdAt`, `updatedAt`)

**Response:**
```typescript
{
  // Same as GET response
}
```

**Status Codes:**
- `201` - Profile created successfully
- `400` - Validation error
- `409` - Profile already exists (use PUT to update)
- `401` - Unauthorized

---

#### **PUT** `/api/business-profile`

Update existing business profile.

**Request Body:**
```typescript
{
  id: string;
  // Any fields from BusinessProfile (partial update supported)
}
```

**Response:**
```typescript
{
  // Updated profile (same as GET response)
}
```

**Status Codes:**
- `200` - Updated successfully
- `400` - Validation error
- `404` - Profile not found
- `401` - Unauthorized

---

### 2. Question Discovery

#### **GET** `/api/questions/discover`

Get discovered questions with filtering and pagination.

**Query Parameters:**
- `source` (optional): `'paa' | 'competitor' | 'ai_suggestion' | 'template' | 'manual'`
- `category` (optional): string
- `priority` (optional): `'low' | 'medium' | 'high'`
- `minSearchVolume` (optional): number
- `maxSearchVolume` (optional): number
- `status` (optional): `'discovered' | 'queued' | 'generating' | 'completed' | 'rejected'`
- `limit` (default: 50): number
- `offset` (default: 0): number

**Response:**
```typescript
{
  questions: [
    {
      id: string;
      organizationId: string;
      text: string;
      source: 'paa' | 'competitor' | 'ai_suggestion' | 'template' | 'manual';
      category: string;
      priority: 'low' | 'medium' | 'high';
      searchVolume?: number;
      difficulty?: number;
      competitorsCovering?: number;
      status: 'discovered' | 'queued' | 'generating' | 'completed' | 'rejected';
      createdAt: string;
    }
  ];
  total: number;
  hasMore: boolean;
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid query parameters
- `401` - Unauthorized

---

#### **POST** `/api/questions/add-to-queue`

Add selected questions to the content generation queue.

**Request Body:**
```typescript
{
  questionIds: string[];
}
```

**Response:**
```typescript
{
  queued: number;
  qaPageIds: string[];
}
```

**Status Codes:**
- `200` - Questions added to queue
- `400` - Invalid request
- `401` - Unauthorized

**Behavior:**
- Creates Q&A page records with status `'generating'`
- Triggers background content generation workflow
- Updates question status to `'queued'`

---

#### **GET** `/api/questions/categories`

Get list of available question categories for filtering.

**Response:**
```typescript
string[]  // e.g., ["Product Information", "How-To Guides", "Troubleshooting", ...]
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized

---

### 3. Q&A Page Management

#### **GET** `/api/qa-pages`

Get list of Q&A pages with filtering, sorting, and pagination.

**Query Parameters:**
- `status` (optional): `'draft' | 'generating' | 'pending_review' | 'published' | 'archived'`
- `limit` (default: 20): number
- `offset` (default: 0): number
- `sortBy` (default: 'createdAt'): `'createdAt' | 'seoScore' | 'traffic' | 'position'`
- `sortOrder` (default: 'desc'): `'asc' | 'desc'`

**Response:**
```typescript
{
  pages: QAPage[];
  total: number;
  hasMore: boolean;
}

// QAPage structure:
{
  id: string;
  organizationId: string;
  question: string;
  answerContent: string;
  answerMarkdown: string;
  featuredImageUrl?: string;
  shopifyBlogId?: string;
  shopifyBlogPostId?: string;
  shopifyPageId?: string;
  shopifyUrl?: string;
  targetKeyword: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  schemaMarkup: {
    '@context': string;
    '@type': string;
    mainEntity?: any;
  };
  currentPosition?: number;
  bestPosition?: number;
  monthlyImpressions: number;
  monthlyClicks: number;
  monthlyTraffic: number;
  ctr: number;
  seoScore: number;
  internalLinks: [
    {
      id: string;
      sourcePageId: string;
      sourceUrl: string;
      targetPageType: 'qa_page' | 'product' | 'collection';
      targetPageId: string;
      targetUrl: string;
      anchorText: string;
      context: string;
      relevanceScore: number;
    }
  ];
  status: 'draft' | 'generating' | 'pending_review' | 'published' | 'archived';
  publishedAt?: string;
  lastOptimizedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid query parameters
- `401` - Unauthorized

---

#### **GET** `/api/qa-pages/:id`

Get a single Q&A page by ID.

**Response:**
```typescript
QAPage  // Same structure as above
```

**Status Codes:**
- `200` - Success
- `404` - Page not found
- `401` - Unauthorized

---

#### **POST** `/api/qa-pages/:id/approve`

Approve a Q&A page (and optionally publish to Shopify).

**Request Body:**
```typescript
{
  publish: boolean;  // true = publish to Shopify, false = save as draft
}
```

**Response:**
```typescript
{
  success: boolean;
  pageId: string;
  shopifyUrl?: string;  // If published
  publishedAt?: string;  // If published
}
```

**Status Codes:**
- `200` - Approved successfully
- `400` - Validation error
- `404` - Page not found
- `401` - Unauthorized

**Behavior:**
- If `publish: true`, creates Shopify blog post or page
- Updates Q&A page status to `'published'`
- Saves `shopifyUrl` and `publishedAt`

---

#### **PUT** `/api/qa-pages/:id`

Update a Q&A page (edit content, meta tags, etc.).

**Request Body:**
```typescript
{
  // Any fields from QAPage (partial update)
  answerContent?: string;
  metaTitle?: string;
  metaDescription?: string;
  // etc.
}
```

**Response:**
```typescript
QAPage  // Updated page
```

**Status Codes:**
- `200` - Updated successfully
- `400` - Validation error
- `404` - Page not found
- `401` - Unauthorized

---

#### **DELETE** `/api/qa-pages/:id`

Delete a Q&A page (also removes from Shopify if published).

**Response:**
```typescript
{
  success: boolean;
  message: string;
}
```

**Status Codes:**
- `200` - Deleted successfully
- `404` - Page not found
- `401` - Unauthorized

**Behavior:**
- If published, removes from Shopify
- Soft deletes from database (status = 'archived')

---

#### **POST** `/api/qa-pages/:id/regenerate`

Regenerate content for an existing Q&A page.

**Request Body:**
```typescript
{}  // Empty body
```

**Response:**
```typescript
QAPage  // Page with status 'generating'
```

**Status Codes:**
- `200` - Regeneration started
- `404` - Page not found
- `401` - Unauthorized

**Behavior:**
- Sets status to `'generating'`
- Triggers background content generation
- Preserves original question

---

### 4. Analytics & Performance

#### **GET** `/api/analytics/performance`

Get performance data for Q&A pages over time.

**Query Parameters:**
- `pageId` (optional): string - If omitted, returns data for all pages
- `startDate`: string (YYYY-MM-DD)
- `endDate`: string (YYYY-MM-DD)

**Response:**
```typescript
{
  performance: [
    {
      id: string;
      pageId: string;
      date: string;
      impressions: number;
      clicks: number;
      ctr: number;
      avgPosition: number;
      pageviews: number;
      uniqueVisitors: number;
      avgTimeOnPage: number;
      bounceRate: number;
      conversions: number;
      revenue: number;
    }
  ];
  summary: [
    {
      pageId: string;
      question: string;
      totalImpressions: number;
      totalClicks: number;
      avgCtr: number;
      avgPosition: number;
      totalRevenue: number;
      trend: 'up' | 'down' | 'stable';
      trendPercentage: number;
    }
  ];
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid date range
- `401` - Unauthorized

---

#### **GET** `/api/analytics/qa-overview`

Get overview analytics for Q&A content dashboard.

**Response:**
```typescript
{
  totalPages: number;
  publishedPages: number;
  avgSeoScore: number;
  totalTraffic: number;
  totalConversions: number;
  totalRevenue: number;

  topPerformers: QAPage[];  // Top 10 by traffic
  needsOptimization: QAPage[];  // Bottom 10 by SEO score or declining traffic

  contentGaps: [
    {
      question: string;
      searchVolume: number;
      difficulty: number;
      competitorsCovering: number;
      estimatedTraffic: number;
      priority: 'low' | 'medium' | 'high';
    }
  ];

  trafficTrend: [
    { date: string, value: number }
  ];

  conversionTrend: [
    { date: string, value: number }
  ];
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized

---

#### **GET** `/api/analytics/content-gaps`

Get high-potential questions not yet answered (competitor analysis + PAA).

**Response:**
```typescript
[
  {
    question: string;
    searchVolume: number;
    difficulty: number;
    competitorsCovering: number;
    estimatedTraffic: number;
    priority: 'low' | 'medium' | 'high';
  }
]
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized

---

#### **GET** `/api/analytics/linking-opportunities`

Get AI-suggested internal linking opportunities.

**Response:**
```typescript
[
  {
    id: string;
    sourceTitle: string;
    sourceUrl: string;
    targetTitle: string;
    targetUrl: string;
    anchorText: string;
    relevanceScore: number;
  }
]
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized

---

### 5. A/B Testing

#### **GET** `/api/ab-tests`

Get list of A/B tests.

**Query Parameters:**
- `status` (optional): `'running' | 'completed' | 'winner_applied' | 'cancelled'`

**Response:**
```typescript
[
  {
    id: string;
    organizationId: string;
    pageId: string;
    elementType: 'title' | 'meta_description' | 'h2s' | 'cta' | 'intro';
    controlValue: string;
    variantAValue: string;
    variantBValue: string;
    trafficSplit: {
      control: number;
      variant_a: number;
      variant_b: number;
    };
    results: {
      control: { impressions: number, clicks: number, ctr: number, conversions: number, revenue: number };
      variant_a: { impressions: number, clicks: number, ctr: number, conversions: number, revenue: number };
      variant_b: { impressions: number, clicks: number, ctr: number, conversions: number, revenue: number };
    };
    winner?: 'control' | 'variant_a' | 'variant_b';
    confidence?: number;
    status: 'running' | 'completed' | 'winner_applied' | 'cancelled';
    startedAt: string;
    endedAt?: string;
    createdAt: string;
  }
]
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized

---

#### **GET** `/api/ab-tests/:id`

Get a single A/B test.

**Response:**
```typescript
ABTest  // Same structure as above
```

**Status Codes:**
- `200` - Success
- `404` - Test not found
- `401` - Unauthorized

---

#### **POST** `/api/ab-tests`

Create a new A/B test.

**Request Body:**
```typescript
{
  pageId: string;
  elementType: 'title' | 'meta_description' | 'h2s' | 'cta' | 'intro';
  controlValue: string;
  variantAValue: string;
  variantBValue: string;
  trafficSplit?: {
    control: number;
    variant_a: number;
    variant_b: number;
  };  // Default: {control: 33, variant_a: 33, variant_b: 34}
}
```

**Response:**
```typescript
{
  test: ABTest;
}
```

**Status Codes:**
- `201` - Test created successfully
- `400` - Validation error
- `401` - Unauthorized

---

#### **POST** `/api/ab-tests/:id/apply-winner`

Apply the winning variation to the Q&A page.

**Request Body:**
```typescript
{}  // Empty body
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
  appliedVariation: 'control' | 'variant_a' | 'variant_b';
}
```

**Status Codes:**
- `200` - Winner applied successfully
- `400` - Test not completed or no clear winner
- `404` - Test not found
- `401` - Unauthorized

**Behavior:**
- Updates Q&A page with winning variation
- Sets test status to `'winner_applied'`
- Publishes update to Shopify

---

#### **POST** `/api/ab-tests/:id/cancel`

Cancel a running A/B test.

**Request Body:**
```typescript
{}  // Empty body
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
}
```

**Status Codes:**
- `200` - Test cancelled successfully
- `400` - Test already completed
- `404` - Test not found
- `401` - Unauthorized

---

## Error Response Format

All error responses should follow this format:

```typescript
{
  statusCode: number;
  message: string;
  error: string;
  details?: {
    field?: string;
    constraint?: string;
    // ... other error-specific details
  };
}
```

**Examples:**

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": {
    "field": "businessName",
    "constraint": "businessName must not be empty"
  }
}
```

```json
{
  "statusCode": 404,
  "message": "Business profile not found",
  "error": "Not Found"
}
```

```json
{
  "statusCode": 401,
  "message": "Invalid session token",
  "error": "Unauthorized"
}
```

---

## Rate Limiting

Recommended rate limits:
- **General endpoints:** 100 requests/minute per organization
- **Analytics endpoints:** 20 requests/minute per organization
- **Content generation:** 10 requests/minute per organization

---

## Pagination

All list endpoints support pagination:
- `limit`: Number of items per page (max 100)
- `offset`: Number of items to skip
- Response includes `total` and `hasMore` fields

---

## Sorting

List endpoints that support sorting:
- `sortBy`: Field to sort by
- `sortOrder`: `'asc'` or `'desc'`

---

## Background Jobs

These operations should run in background workers:

1. **Content Generation:** Q&A page generation (triggered by `POST /api/questions/add-to-queue`)
2. **Performance Updates:** Daily update of traffic/ranking data
3. **Content Gap Analysis:** Weekly analysis of competitor content
4. **Internal Linking:** Weekly optimization of link graph
5. **A/B Test Evaluation:** Daily evaluation of running tests

---

## WebSocket Events (Future)

For real-time updates (not required for MVP):

```typescript
// Client subscribes to organization-specific channel
ws://api/ws/{organizationId}

// Events:
{
  event: 'qa-page-generated',
  data: { pageId: string, status: 'pending_review' }
}

{
  event: 'qa-page-published',
  data: { pageId: string, shopifyUrl: string }
}

{
  event: 'ab-test-completed',
  data: { testId: string, winner: 'variant_a' }
}
```

---

## Data Validation

### Business Profile
- `businessName`: 1-255 characters
- `industry`: Valid enum value
- `targetAudience.demographics`: Max 500 characters
- `brandVoice.exampleContent`: Max 5000 characters
- `contentStrategy.competitorUrls`: Max 5 URLs, must be valid URLs

### Questions
- `text`: 10-500 characters
- `priority`: Valid enum value

### Q&A Pages
- `question`: 10-500 characters
- `answerContent`: 100-10000 characters
- `metaTitle`: 30-60 characters (recommended)
- `metaDescription`: 120-160 characters (recommended)
- `seoScore`: 0-100

---

## Database Indexes

Recommended indexes for performance:

```sql
-- qa_pages
CREATE INDEX idx_qa_org_status ON qa_pages(organization_id, status);
CREATE INDEX idx_qa_traffic ON qa_pages(organization_id, monthly_traffic DESC);
CREATE INDEX idx_qa_seo_score ON qa_pages(organization_id, seo_score DESC);

-- questions
CREATE INDEX idx_questions_org_status ON custom_question_templates(organization_id, status);
CREATE INDEX idx_questions_priority ON custom_question_templates(organization_id, priority DESC);

-- content_performance
CREATE INDEX idx_performance_page_date ON content_performance(page_id, date DESC);
```

---

## Security Considerations

1. **Input Validation:** Sanitize all user inputs
2. **SQL Injection:** Use parameterized queries
3. **XSS Prevention:** Sanitize HTML content before storing
4. **Rate Limiting:** Prevent abuse
5. **Session Management:** Validate Shopify session tokens
6. **CORS:** Restrict to Shopify domains

---

## Testing Checklist

- [ ] All endpoints return correct status codes
- [ ] Validation errors return clear messages
- [ ] Pagination works correctly
- [ ] Sorting works correctly
- [ ] Filtering works correctly
- [ ] Background jobs execute successfully
- [ ] Database transactions are atomic
- [ ] Error handling is comprehensive
- [ ] Performance is acceptable (<200ms for most endpoints)
- [ ] Security measures are in place

---

## Priority Order

### Must Have (MVP):
1. Business Profile endpoints
2. Question Discovery endpoints
3. Q&A Pages endpoints (CRUD)
4. Basic Analytics (qa-overview)

### Should Have (Phase 2):
5. Performance tracking endpoints
6. Content gaps analysis
7. Internal linking opportunities

### Nice to Have (Phase 3):
8. A/B Testing endpoints
9. WebSocket real-time updates
10. Advanced analytics

---

**Questions?** Contact Frontend Specialist for clarifications on expected data formats or behavior.

---

**Last Updated:** 2026-01-19
**Version:** 1.0.0
