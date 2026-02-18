# Frontend Implementation Guide - Q&A Content Engine

## Overview

This guide documents the complete frontend implementation for the Q&A Content Management system. All components follow Shopify Polaris design patterns and integrate with the backend API.

---

## File Structure

```
frontend/src/
├── pages/
│   ├── Dashboard.tsx                 (UPDATED - Added Q&A metrics)
│   ├── Onboarding.tsx                (NEW - 6-step business setup)
│   ├── QuestionDiscovery.tsx         (NEW - Browse and select questions)
│   ├── ContentQueue.tsx              (NEW - Generation progress tracking)
│   ├── ContentReview.tsx             (NEW - Approve generated content)
│   ├── PublishedContent.tsx          (NEW - Published Q&A pages)
│   ├── QAAnalytics.tsx               (NEW - Performance analytics)
│   └── [existing Product SEO pages...]
├── components/
│   ├── SEOScoreCard.tsx              (NEW - SEO score visualization)
│   ├── PerformanceChart.tsx          (NEW - Traffic/performance charts)
│   ├── ContentPreviewModal.tsx       (NEW - Content preview modal)
│   └── [existing components...]
├── hooks/
│   ├── useBusinessProfile.ts         (NEW - Business profile CRUD)
│   ├── useQuestions.ts               (NEW - Question discovery)
│   ├── useQAPages.ts                 (NEW - Q&A page management)
│   ├── usePerformance.ts             (NEW - Performance analytics)
│   ├── useABTesting.ts               (NEW - A/B testing)
│   └── [existing hooks...]
├── types/
│   ├── qa-content.types.ts           (NEW - All Q&A type definitions)
│   └── [existing types...]
└── App.tsx                           (UPDATED - New routes & navigation)
```

---

## New Pages

### 1. **Onboarding Page** (`/onboarding`)

**Purpose:** Multi-step form for business customization

**Features:**
- 6-step wizard with progress indicator
- Collects business info, target audience, brand voice, content strategy
- Validates each step before proceeding
- Creates `BusinessProfile` on completion

**Steps:**
1. Basic Info (industry, business type, product types)
2. Target Audience (demographics, expertise level, pain points)
3. Brand Voice (tone, preferred/avoid words, example content)
4. Content Strategy (goals, content types, post length, frequency)
5. Competitors (up to 5 competitor URLs for analysis)
6. Review & Confirm

**Usage:**
```tsx
// Redirects to /content/discover on completion
navigate('/onboarding')
```

---

### 2. **Question Discovery** (`/content/discover`)

**Purpose:** Browse AI-suggested questions and add them to generation queue

**Features:**
- Filter by source (PAA, competitors, AI suggestions, templates)
- Filter by category, priority, search volume
- Multi-select questions
- Add selected questions to queue
- Shows search volume, difficulty, competitor coverage

**Filters:**
- Source: PAA, Competitor, AI Suggestion, Template
- Category: Dynamic list from backend
- Priority: High, Medium, Low
- Search Volume range

**Usage:**
```tsx
// Navigate to discover questions
navigate('/content/discover')

// Add questions to queue
const { mutate: addToQueue } = useAddToQueue();
addToQueue({ questionIds: ['q1', 'q2', 'q3'] });
```

---

### 3. **Content Queue** (`/content/queue`)

**Purpose:** Track Q&A content generation progress

**Features:**
- Real-time progress tracking
- ETA for completion
- Status badges (generating, pending_review, completed)
- Progress bars for each item

**Auto-refreshes:** Yes (via React Query polling)

**Usage:**
```tsx
// View items in queue
const { data } = useQAPages('generating');
```

---

### 4. **Content Review** (`/content/review`)

**Purpose:** Review generated Q&A content before publishing

**Features:**
- List of pages pending review
- SEO score visualization
- Preview modal with full content
- Approve & publish or save as draft
- Edit capability

**Modal Features:**
- SEO score breakdown
- Meta tags preview (title, description, keyword)
- Full HTML content preview
- Internal links list
- Schema markup preview

**Usage:**
```tsx
// Approve and publish
const { mutate: approveQAPage } = useApproveQAPage();
approveQAPage({ pageId: 'page-id', publish: true });

// Save as draft
approveQAPage({ pageId: 'page-id', publish: false });
```

---

### 5. **Published Content** (`/content/published`)

**Purpose:** View all published Q&A pages with performance metrics

**Features:**
- Sortable list (by date, SEO score, traffic, position)
- Performance metrics per page
- Quick edit/update options
- View on store link
- Filter by status

**Sorting Options:**
- Newest First (createdAt)
- SEO Score
- Traffic
- Position

**Usage:**
```tsx
const { data } = useQAPages('published', 20, 0, 'traffic', 'desc');
```

---

### 6. **Q&A Analytics** (`/content/analytics`)

**Purpose:** Comprehensive performance analytics and insights

**Features:**
- Overview metrics (total pages, avg SEO score, traffic, revenue)
- Traffic trend chart (last 30 days)
- Conversion trend chart
- Top performing pages
- Pages needing optimization
- Content opportunities (gaps)
- Internal linking opportunities

**Charts:**
- Traffic Trend (LineChart)
- Conversions Trend (BarChart)
- Both powered by recharts

**Usage:**
```tsx
const { data: analytics } = useQAAnalytics();

// Individual page analytics
navigate(`/content/analytics/${pageId}`);
```

---

### 7. **Dashboard** (UPDATED)

**New Features:**
- Business profile onboarding prompt
- Q&A content performance overview
- Content opportunities widget
- Quick action buttons
- Top Q&A pages widget

**Conditional Display:**
- Shows onboarding banner if no business profile
- Shows Q&A metrics if profile exists
- Shows content gaps if available

---

## New Components

### 1. **SEOScoreCard**

**Purpose:** Display SEO score with visual indicator

**Props:**
```tsx
interface SEOScoreCardProps {
  score: number;                  // 0-100
  breakdown?: {                   // Optional breakdown
    label: string;
    score: number;
    max: number;
  }[];
  showBreakdown?: boolean;        // Show detailed breakdown
}
```

**Features:**
- Color-coded progress bar (green: 85+, yellow: 70-84, red: <70)
- Badge with score label (Excellent, Good, Needs Improvement, Poor)
- Optional score breakdown

**Usage:**
```tsx
<SEOScoreCard
  score={92}
  breakdown={[
    { label: 'Keyword Usage', score: 18, max: 20 },
    { label: 'Content Length', score: 25, max: 25 },
  ]}
  showBreakdown={true}
/>
```

---

### 2. **PerformanceChart**

**Purpose:** Line chart for Q&A page performance over time

**Props:**
```tsx
interface PerformanceChartProps {
  pageId?: string;               // Specific page or all pages
  title?: string;                // Chart title
}
```

**Features:**
- Metric selector (Traffic, Clicks, Impressions, Position)
- Date range selector (7, 30, 90 days)
- Responsive chart using recharts
- Auto-fetches data based on selections

**Usage:**
```tsx
<PerformanceChart pageId="page-123" title="Traffic Over Time" />
```

---

### 3. **ContentPreviewModal**

**Purpose:** Full-featured modal for previewing Q&A content

**Props:**
```tsx
interface ContentPreviewModalProps {
  page: QAPage | null;
  open: boolean;
  onClose: () => void;
  onApprove: (pageId: string, publish: boolean) => void;
  isApproving?: boolean;
}
```

**Features:**
- SEO score card
- Meta tags with length validation
- HTML content preview with scrolling
- Internal links list with relevance scores
- Schema markup JSON preview

**Usage:**
```tsx
<ContentPreviewModal
  page={selectedPage}
  open={isOpen}
  onClose={() => setIsOpen(false)}
  onApprove={(pageId, publish) => handleApprove(pageId, publish)}
  isApproving={isApproving}
/>
```

---

## Custom Hooks

### 1. **useBusinessProfile**

**Purpose:** Manage business profile

**Exports:**
```tsx
useBusinessProfile()              // Get profile
useCreateBusinessProfile()        // Create profile
useUpdateBusinessProfile()        // Update profile
```

**Example:**
```tsx
const { data: profile } = useBusinessProfile();
const { mutate: createProfile } = useCreateBusinessProfile();

createProfile({
  businessName: 'My Store',
  industry: 'ecommerce',
  // ... other fields
});
```

---

### 2. **useQuestions**

**Purpose:** Question discovery and queue management

**Exports:**
```tsx
useQuestions(filters?, limit?, offset?)    // Get questions
useAddToQueue()                            // Add to queue
useQuestionCategories()                    // Get categories
```

**Example:**
```tsx
const { data } = useQuestions({ source: 'paa', priority: 'high' }, 50);
const { mutate: addToQueue } = useAddToQueue();

addToQueue({ questionIds: ['q1', 'q2'] });
```

---

### 3. **useQAPages**

**Purpose:** Q&A page CRUD operations

**Exports:**
```tsx
useQAPages(status?, limit?, offset?, sortBy?, sortOrder?)  // List pages
useQAPage(pageId)                                          // Get single page
useApproveQAPage()                                         // Approve page
useUpdateQAPage()                                          // Update page
useDeleteQAPage()                                          // Delete page
useRegenerateQAPage()                                      // Regenerate content
```

**Example:**
```tsx
const { data } = useQAPages('published', 20, 0, 'traffic', 'desc');
const { mutate: approve } = useApproveQAPage();

approve({ pageId: 'page-123', publish: true });
```

---

### 4. **usePerformance**

**Purpose:** Performance analytics

**Exports:**
```tsx
usePerformance(pageId?, startDate?, endDate?)  // Get performance data
useQAAnalytics()                               // Get analytics dashboard
useContentGaps()                               // Get content opportunities
useInternalLinkingOpportunities()              // Get linking suggestions
```

**Example:**
```tsx
const { data } = usePerformance('page-123', '2024-01-01', '2024-01-31');
const { data: analytics } = useQAAnalytics();
```

---

### 5. **useABTesting**

**Purpose:** A/B testing management

**Exports:**
```tsx
useABTests(status?)         // Get all tests
useABTest(testId)           // Get single test
useCreateABTest()           // Create test
useApplyWinner()            // Apply winning variation
useCancelABTest()           // Cancel test
```

**Example:**
```tsx
const { mutate: createTest } = useCreateABTest();

createTest({
  pageId: 'page-123',
  elementType: 'title',
  controlValue: 'Original Title',
  variantAValue: 'Test Title A',
  variantBValue: 'Test Title B',
});
```

---

## Type Definitions

All types are defined in `types/qa-content.types.ts`:

### Core Types

```typescript
BusinessProfile        // Business customization data
Question              // Discovered question
QAPage                // Generated Q&A content page
ContentPerformance    // Performance metrics
ABTest                // A/B test
```

### Request/Response Types

```typescript
CreateBusinessProfileRequest
UpdateBusinessProfileRequest
DiscoverQuestionsRequest
DiscoverQuestionsResponse
AddToQueueRequest
GetQAPagesRequest
GetQAPagesResponse
ApproveQAPageRequest
GetPerformanceRequest
CreateABTestRequest
// ... and more
```

---

## Navigation Structure

```
Dashboard (/)
│
├── Q&A Content
│   ├── Discover Questions (/content/discover)
│   ├── Content Queue (/content/queue)
│   ├── Review Content (/content/review)
│   ├── Published Content (/content/published)
│   └── Analytics (/content/analytics)
│
├── Product SEO
│   ├── Content Generation (/content-generation)
│   └── Analytics (/analytics)
│
└── Settings (/settings)
```

---

## API Endpoints Required

The frontend expects these backend endpoints:

### Business Profile
- `GET /api/business-profile`
- `POST /api/business-profile`
- `PUT /api/business-profile`

### Questions
- `GET /api/questions/discover?filters...`
- `POST /api/questions/add-to-queue`
- `GET /api/questions/categories`

### Q&A Pages
- `GET /api/qa-pages?status=...&sortBy=...`
- `GET /api/qa-pages/:id`
- `POST /api/qa-pages/:id/approve`
- `PUT /api/qa-pages/:id`
- `DELETE /api/qa-pages/:id`
- `POST /api/qa-pages/:id/regenerate`

### Analytics
- `GET /api/analytics/performance?pageId=...&startDate=...&endDate=...`
- `GET /api/analytics/qa-overview`
- `GET /api/analytics/content-gaps`
- `GET /api/analytics/linking-opportunities`

### A/B Testing
- `GET /api/ab-tests?status=...`
- `GET /api/ab-tests/:id`
- `POST /api/ab-tests`
- `POST /api/ab-tests/:id/apply-winner`
- `POST /api/ab-tests/:id/cancel`

---

## User Flows

### 1. **New User Onboarding**

1. User lands on Dashboard
2. Sees banner prompting to complete business profile
3. Clicks "Start Onboarding"
4. Completes 6-step wizard
5. Profile created, redirected to Question Discovery

### 2. **Content Generation Flow**

1. User navigates to Question Discovery
2. Filters and selects questions
3. Adds questions to queue
4. Redirected to Content Queue
5. Watches generation progress
6. When complete, goes to Content Review
7. Reviews content, approves and publishes
8. Content appears in Published Content and on Shopify store

### 3. **Performance Monitoring Flow**

1. User navigates to Analytics
2. Views overview metrics
3. Identifies top performers and underperformers
4. Sees content opportunities
5. Adds new questions from gaps
6. Applies internal linking suggestions

---

## Styling Notes

All components use **Shopify Polaris** components exclusively:
- No custom CSS files
- All styling via Polaris props
- Consistent with Shopify Admin design
- Mobile-responsive by default
- Dark mode support (via Polaris)

**Color Palette:**
- Primary: `#008060` (Shopify green)
- Success: `#008060`
- Warning/Attention: `#FFC453`
- Critical: `#D72C0D`
- Subdued text: `#6D7175`

---

## State Management

- **React Query** for server state (data fetching, caching, mutations)
- **Zustand** (`app-store.ts`) for local UI state
- **React Router** for navigation state
- **Local useState** for component-level state

---

## Error Handling

All hooks use React Query's error handling:

```tsx
const { data, error, isLoading, isError } = useQAPages('published');

if (isError) {
  // Show error banner
  <Banner tone="critical">{error.message}</Banner>
}
```

---

## Loading States

All data-fetching components show loading states:

```tsx
if (isLoading) {
  return <Spinner size="large" />;
}
```

---

## Empty States

All list pages use Polaris EmptyState component:

```tsx
<EmptyState
  heading="No content to review"
  image="https://cdn.shopify.com/s/files/1/..."
  action={{ content: 'Discover Questions', onAction: () => {} }}
>
  <Text as="p">Start generating Q&A content...</Text>
</EmptyState>
```

---

## Testing Strategy

### Unit Tests
- Hook tests (React Testing Library + MSW)
- Component tests (Vitest + Testing Library)

### Integration Tests
- User flow tests (Cypress or Playwright)
- API integration tests

### E2E Tests
- Full onboarding flow
- Content generation flow
- Analytics viewing

---

## Performance Considerations

1. **React Query Caching:** All API calls cached for 5 minutes
2. **Pagination:** Large lists use pagination (20 items default)
3. **Lazy Loading:** Charts only render when visible
4. **Debouncing:** Search inputs debounced (300ms)
5. **Optimistic Updates:** Mutations update cache optimistically

---

## Accessibility

All components follow WCAG 2.1 Level AA:
- Keyboard navigation support
- ARIA labels on all interactive elements
- Focus management in modals
- Screen reader announcements for dynamic content
- Color contrast meets standards

---

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## Development Workflow

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Type checking
npm run type-check

# Linting
npm run lint
```

---

## Environment Variables

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

---

## Deployment

Built files output to `dist/` directory. Deploy to:
- Vercel
- Netlify
- AWS S3 + CloudFront
- Or serve from NestJS backend (production recommended)

---

## Future Enhancements

1. **Real-time Updates:** WebSocket for live generation progress
2. **Bulk Operations:** Select multiple pages for bulk actions
3. **Content Templates:** Reusable content templates
4. **Advanced Filters:** More granular filtering options
5. **Export Reports:** Download analytics as PDF/CSV
6. **Collaboration:** Multi-user collaboration features
7. **Content Calendar:** Scheduled publishing
8. **AI Chat:** Ask AI about content performance

---

## Support

For issues or questions:
1. Check this guide
2. Review type definitions in `qa-content.types.ts`
3. Check API documentation
4. Contact backend team for API issues

---

**Last Updated:** 2026-01-19
**Version:** 1.0.0
**Maintainer:** Frontend/React Specialist
