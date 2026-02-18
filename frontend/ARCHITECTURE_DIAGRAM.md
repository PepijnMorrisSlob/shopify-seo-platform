# Frontend Architecture Diagram - Q&A Content Engine

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SHOPIFY SEO PLATFORM                             │
│                           Q&A Content Management UI                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                                USER INTERFACE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  Dashboard   │  │  Onboarding  │  │   Question   │  │   Content    │   │
│  │     (/)      │  │ (/onboarding)│  │  Discovery   │  │    Queue     │   │
│  └──────────────┘  └──────────────┘  │  (/content/  │  │  (/content/  │   │
│                                       │   discover)  │  │    queue)    │   │
│  ┌──────────────┐  ┌──────────────┐  └──────────────┘  └──────────────┘   │
│  │   Content    │  │  Published   │                                         │
│  │    Review    │  │   Content    │  ┌──────────────┐  ┌──────────────┐   │
│  │  (/content/  │  │  (/content/  │  │      QA      │  │   Settings   │   │
│  │    review)   │  │  published)  │  │  Analytics   │  │  (/settings) │   │
│  └──────────────┘  └──────────────┘  │  (/content/  │  └──────────────┘   │
│                                       │  analytics)  │                       │
│                                       └──────────────┘                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ React Router
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             ROUTING LAYER (App.tsx)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Navigation Sections:                                                        │
│  • Dashboard                                                                 │
│  • Q&A Content (5 pages)                                                    │
│  • Product SEO (2 pages)                                                    │
│  • Settings                                                                  │
│                                                                               │
│  Providers:                                                                  │
│  • Polaris AppProvider                                                      │
│  • React Query Provider                                                     │
│  • Router                                                                    │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            COMPONENT LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Shared Components:                                                          │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐               │
│  │ SEOScoreCard   │  │ Performance    │  │ ContentPreview │               │
│  │                │  │     Chart      │  │     Modal      │               │
│  │ • Score badge  │  │ • Line charts  │  │ • Meta tags    │               │
│  │ • Progress bar │  │ • Bar charts   │  │ • Content HTML │               │
│  │ • Breakdown    │  │ • Date range   │  │ • Links list   │               │
│  └────────────────┘  └────────────────┘  └────────────────┘               │
│                                                                               │
│  Polaris Components:                                                         │
│  Card, Page, Layout, Modal, Banner, ResourceList, Filters, Select,          │
│  TextField, Button, Badge, ProgressBar, Spinner, EmptyState, etc.           │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              HOOKS LAYER                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │useBusinessProfile│  │  useQuestions    │  │   useQAPages     │         │
│  │                  │  │                  │  │                  │         │
│  │ • Get profile    │  │ • Discover       │  │ • List pages     │         │
│  │ • Create         │  │ • Add to queue   │  │ • Get single     │         │
│  │ • Update         │  │ • Get categories │  │ • Approve        │         │
│  │                  │  │                  │  │ • Update/Delete  │         │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘         │
│                                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                                │
│  │ usePerformance   │  │  useABTesting    │                                │
│  │                  │  │                  │                                │
│  │ • Get metrics    │  │ • Create test    │                                │
│  │ • QA analytics   │  │ • Get tests      │                                │
│  │ • Content gaps   │  │ • Apply winner   │                                │
│  │ • Link opps      │  │ • Cancel test    │                                │
│  └──────────────────┘  └──────────────────┘                                │
│                                                                               │
│  All hooks use @tanstack/react-query for:                                   │
│  • Automatic caching (5 min stale time)                                     │
│  • Optimistic updates                                                       │
│  • Error handling                                                           │
│  • Loading states                                                           │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API CLIENT LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  api-client.ts                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                                                                   │       │
│  │  class APIClient {                                                │       │
│  │    static async get<T>(app, endpoint)                            │       │
│  │    static async post<T>(app, endpoint, data)                     │       │
│  │    static async put<T>(app, endpoint, data)                      │       │
│  │    static async delete<T>(app, endpoint)                         │       │
│  │  }                                                                │       │
│  │                                                                   │       │
│  │  Features:                                                        │       │
│  │  • Session token auth (Shopify App Bridge)                       │       │
│  │  • JSON content type                                             │       │
│  │  • Error handling                                                │       │
│  │  • Type-safe responses                                           │       │
│  │                                                                   │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                               │
│  Base URL: import.meta.env.VITE_API_BASE_URL                                │
│  Default: http://localhost:3000/api                                         │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTP Requests
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND API LAYER                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Endpoints Required:                                                         │
│                                                                               │
│  Business Profile:                                                           │
│  • GET    /api/business-profile                                             │
│  • POST   /api/business-profile                                             │
│  • PUT    /api/business-profile                                             │
│                                                                               │
│  Questions:                                                                  │
│  • GET    /api/questions/discover?filters...                                │
│  • POST   /api/questions/add-to-queue                                       │
│  • GET    /api/questions/categories                                         │
│                                                                               │
│  Q&A Pages:                                                                  │
│  • GET    /api/qa-pages?status=...&sortBy=...                               │
│  • GET    /api/qa-pages/:id                                                 │
│  • POST   /api/qa-pages/:id/approve                                         │
│  • PUT    /api/qa-pages/:id                                                 │
│  • DELETE /api/qa-pages/:id                                                 │
│  • POST   /api/qa-pages/:id/regenerate                                      │
│                                                                               │
│  Analytics:                                                                  │
│  • GET    /api/analytics/performance?pageId=...                             │
│  • GET    /api/analytics/qa-overview                                        │
│  • GET    /api/analytics/content-gaps                                       │
│  • GET    /api/analytics/linking-opportunities                              │
│                                                                               │
│  A/B Testing:                                                                │
│  • GET    /api/ab-tests?status=...                                          │
│  • POST   /api/ab-tests                                                     │
│  • POST   /api/ab-tests/:id/apply-winner                                    │
│  • POST   /api/ab-tests/:id/cancel                                          │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            TYPE SYSTEM                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  qa-content.types.ts (50+ interfaces)                                       │
│                                                                               │
│  Core Types:                Request/Response:              Enums:            │
│  • BusinessProfile         • CreateBusinessProfile...     • Industry         │
│  • Question                • DiscoverQuestions...          • ProductType     │
│  • QAPage                  • GetQAPages...                 • QAPageStatus    │
│  • ContentPerformance      • ApproveQAPage...              • QuestionSource  │
│  • ABTest                  • GetPerformance...             • ABTestElement   │
│  • InternalLink            • CreateABTest...               • Priority        │
│  • SchemaMarkup                                                              │
│  • ContentGap                                                                │
│  • PerformanceSummary                                                        │
│                                                                               │
│  All types match backend database schema and API contracts                   │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          STATE MANAGEMENT                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Server State (React Query):                                                 │
│  • All API data                                                              │
│  • 5-minute cache                                                            │
│  • Automatic refetching                                                      │
│  • Optimistic updates                                                        │
│                                                                               │
│  Local State (Zustand - app-store.ts):                                      │
│  • Selected products                                                         │
│  • UI preferences                                                            │
│  • Selection state                                                           │
│                                                                               │
│  Component State (useState):                                                 │
│  • Form inputs                                                               │
│  • Modal visibility                                                          │
│  • Filters                                                                   │
│  • UI interactions                                                           │
│                                                                               │
│  URL State (React Router):                                                  │
│  • Current route                                                             │
│  • Route parameters                                                          │
│  • Navigation history                                                        │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA FLOW DIAGRAM                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  User Action (Click/Submit)                                                  │
│         │                                                                     │
│         ▼                                                                     │
│  Component Event Handler                                                     │
│         │                                                                     │
│         ▼                                                                     │
│  Hook Function Call (e.g., addToQueue())                                    │
│         │                                                                     │
│         ▼                                                                     │
│  React Query Mutation                                                        │
│         │                                                                     │
│         ▼                                                                     │
│  API Client Request                                                          │
│         │                                                                     │
│         ▼                                                                     │
│  Backend API (POST /api/questions/add-to-queue)                             │
│         │                                                                     │
│         ▼                                                                     │
│  Response (Success/Error)                                                    │
│         │                                                                     │
│         ▼                                                                     │
│  React Query Cache Update                                                    │
│         │                                                                     │
│         ▼                                                                     │
│  UI Re-render (Automatic)                                                    │
│         │                                                                     │
│         ▼                                                                     │
│  User Sees Updated State                                                     │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXAMPLE: QUESTION TO PUBLISHED                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Step 1: Question Discovery                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │ User selects questions → Clicks "Add to Queue"                   │       │
│  │   ↓                                                               │       │
│  │ useAddToQueue() mutation                                          │       │
│  │   ↓                                                               │       │
│  │ POST /api/questions/add-to-queue                                  │       │
│  │   ↓                                                               │       │
│  │ Backend creates Q&A pages with status 'generating'                │       │
│  │   ↓                                                               │       │
│  │ Navigate to Content Queue                                         │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                               │
│  Step 2: Content Queue (Monitoring)                                         │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │ useQAPages('generating') fetches pages                           │       │
│  │   ↓                                                               │       │
│  │ Shows progress bars, ETAs                                         │       │
│  │   ↓                                                               │       │
│  │ React Query polls every 5 seconds                                │       │
│  │   ↓                                                               │       │
│  │ When status changes to 'pending_review', navigate to Review       │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                               │
│  Step 3: Content Review                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │ useQAPages('pending_review') fetches pages                       │       │
│  │   ↓                                                               │       │
│  │ User clicks "Review" → Opens ContentPreviewModal                  │       │
│  │   ↓                                                               │       │
│  │ Shows SEO score, content, meta tags, links                        │       │
│  │   ↓                                                               │       │
│  │ User clicks "Approve & Publish"                                   │       │
│  │   ↓                                                               │       │
│  │ useApproveQAPage({ pageId, publish: true })                      │       │
│  │   ↓                                                               │       │
│  │ POST /api/qa-pages/:id/approve                                    │       │
│  │   ↓                                                               │       │
│  │ Backend publishes to Shopify, returns shopifyUrl                  │       │
│  │   ↓                                                               │       │
│  │ Cache updated, modal closes                                       │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                               │
│  Step 4: Published Content                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │ useQAPages('published') fetches published pages                  │       │
│  │   ↓                                                               │       │
│  │ Shows list with performance metrics                               │       │
│  │   ↓                                                               │       │
│  │ User clicks "View Performance"                                    │       │
│  │   ↓                                                               │       │
│  │ Navigate to /content/analytics/:pageId                            │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                               │
│  Step 5: Analytics                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │ usePerformance(pageId) fetches metrics                           │       │
│  │   ↓                                                               │       │
│  │ PerformanceChart renders traffic/clicks/position                  │       │
│  │   ↓                                                               │       │
│  │ User monitors performance over time                               │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           TECHNOLOGY STACK                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Frontend Framework:      React 18.2                                         │
│  UI Library:              Shopify Polaris 12.0                               │
│  Routing:                 React Router 6.22                                  │
│  State Management:        React Query 5.17 + Zustand 4.4                    │
│  Charts:                  Recharts 2.10                                      │
│  Type System:             TypeScript 5.3                                     │
│  Build Tool:              Vite 5.0                                           │
│  Package Manager:         npm                                                │
│                                                                               │
│  Code Quality:                                                               │
│  • ESLint (TypeScript rules)                                                │
│  • Prettier (formatting)                                                    │
│  • TypeScript strict mode                                                   │
│                                                                               │
│  Testing (Future):                                                           │
│  • Vitest (unit tests)                                                      │
│  • Testing Library (component tests)                                        │
│  • Cypress (E2E tests)                                                      │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         PERFORMANCE OPTIMIZATIONS                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  1. React Query Caching                                                      │
│     • 5-minute stale time (configurable)                                    │
│     • Automatic background refetching                                       │
│     • Deduplication of identical requests                                   │
│                                                                               │
│  2. Code Splitting (Future)                                                 │
│     • Route-based lazy loading                                              │
│     • Component-level lazy loading for charts                               │
│     • Vendor bundle separation                                              │
│                                                                               │
│  3. Pagination                                                               │
│     • Default 20 items per page                                             │
│     • Infinite scroll support (future)                                      │
│     • Offset-based pagination                                               │
│                                                                               │
│  4. Debouncing                                                               │
│     • Search inputs debounced (300ms)                                       │
│     • Filter changes debounced                                              │
│                                                                               │
│  5. Memoization                                                              │
│     • React.memo on heavy components                                        │
│     • useMemo for expensive calculations                                    │
│     • useCallback for stable function references                            │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                      SECURITY & ERROR HANDLING                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Authentication:                                                             │
│  • Shopify App Bridge session tokens                                        │
│  • Authorization header on all requests                                     │
│  • Automatic token refresh                                                  │
│                                                                               │
│  Input Validation:                                                           │
│  • Client-side validation (forms)                                           │
│  • TypeScript type checking                                                 │
│  • Server-side validation (backend)                                         │
│                                                                               │
│  Error Handling:                                                             │
│  • Network errors → Retry with exponential backoff                          │
│  • 401 Unauthorized → Redirect to auth                                      │
│  • 404 Not Found → Show empty state                                         │
│  • 400 Bad Request → Show validation errors                                 │
│  • 500 Server Error → Show error banner with retry                          │
│                                                                               │
│  XSS Prevention:                                                             │
│  • HTML sanitization (backend)                                              │
│  • dangerouslySetInnerHTML only for trusted content                         │
│  • Content Security Policy headers                                          │
│                                                                               │
│  CORS:                                                                       │
│  • Restricted to Shopify domains                                            │
│  • Credentials included in requests                                         │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           DEPLOYMENT ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Development:                                                                │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                                                                   │       │
│  │  Vite Dev Server (localhost:5173)                                │       │
│  │         │                                                         │       │
│  │         │ Proxy /api requests                                    │       │
│  │         ▼                                                         │       │
│  │  Backend API (localhost:3000)                                     │       │
│  │                                                                   │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                               │
│  Production (Option 1 - Separate Frontend):                                 │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                                                                   │       │
│  │  Vercel/Netlify/S3 (Static Assets)                               │       │
│  │         │                                                         │       │
│  │         │ API calls                                              │       │
│  │         ▼                                                         │       │
│  │  Backend API (AWS ECS/EC2)                                        │       │
│  │                                                                   │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                               │
│  Production (Option 2 - Monolithic):                                        │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                                                                   │       │
│  │  NestJS Backend (AWS ECS/EC2)                                     │       │
│  │    │                                                              │       │
│  │    ├─ Serves static frontend from /public                        │       │
│  │    └─ Handles API requests on /api                               │       │
│  │                                                                   │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          MONITORING & ANALYTICS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Error Tracking:                                                             │
│  • Sentry (future)                                                           │
│  • Console errors logged                                                    │
│  • API error responses tracked                                              │
│                                                                               │
│  Performance Monitoring:                                                     │
│  • Core Web Vitals                                                           │
│  • Page load times                                                           │
│  • API response times                                                        │
│  • Chart render times                                                        │
│                                                                               │
│  User Analytics:                                                             │
│  • Shopify Analytics (built-in)                                             │
│  • Custom event tracking (future)                                           │
│  • User journey tracking                                                    │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────┐
                              │  STATUS: ✅      │
                              │  COMPLETE       │
                              │  READY FOR      │
                              │  INTEGRATION    │
                              └─────────────────┘
```

---

**Last Updated:** 2026-01-19
**Version:** 1.0.0
**Maintainer:** Frontend/React Specialist
