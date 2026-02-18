# Agent Coordination Document

**PURPOSE:** Shared context for all parallel agents working on the Shopify SEO Platform rebuild.
Read this ENTIRE document before writing any code.

---

## Project Structure

```
frontend/src/
├── App.tsx                          # Router - all routes defined here
├── globals.css                      # CSS variables (light theme)
├── pages/                           # Page components (one per route)
├── components/
│   ├── layout/                      # AppShell, Sidebar, Header, PageHeader, CommandPalette
│   ├── dashboard/                   # Dashboard widgets (StatCard, ActivityFeed, etc.)
│   ├── ui/                          # shadcn/ui primitives (Card, Button, Dialog, Badge, etc.)
│   └── Calendar/                    # Calendar-specific components
├── hooks/                           # React Query hooks (data fetching)
├── types/                           # TypeScript type definitions
└── utils/
    └── api-client.ts                # APIClient class for HTTP calls

backend/src/
├── main.ts                          # NestJS entry (port 3003, prefix /api)
├── app.module.ts                    # Module registration
├── controllers/                     # Route handlers
├── services/                        # Business logic
├── database/                        # Prisma client
├── types/                           # Backend types
└── queues/                          # BullMQ workers
```

---

## Design System: shadcn/ui + Tailwind (Light Theme)

**DO NOT use Shopify Polaris.** All pages use shadcn/ui + Tailwind CSS.

### Available shadcn/ui Components (in `src/components/ui/`)
- `Button` (variants: default, destructive, outline, secondary, ghost, link)
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`
- `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuTrigger`, `DropdownMenuSeparator`, `DropdownMenuLabel`
- `Badge` (variants: default, secondary, destructive, outline)
- `Input`, `Label`
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- `Separator`
- `ScrollArea`
- `Skeleton`
- `Tooltip`, `TooltipTrigger`, `TooltipContent`
- `Avatar`, `AvatarImage`, `AvatarFallback`
- `Command` (cmdk-based command palette)

### Layout Components (in `src/components/layout/`)
- `PageHeader` - Use on every page. Props: `title`, `description`, `children` (action buttons slot), `breadcrumbs`
- `PrimaryButton` - Emerald CTA button (icon prop supported)
- `SecondaryButton` - Light outlined button
- `GhostButton` - Text-only button

### Light Theme Color Palette
```
Background:     bg-zinc-50       (#fafafa)
Cards:          bg-white         (#ffffff)
Card borders:   border-zinc-200  (#e4e4e7)
Primary text:   text-zinc-900    (#18181b)
Secondary text: text-zinc-500    (#71717a)
Muted text:     text-zinc-400    (#a1a1aa)
Primary accent: text-emerald-500 (#10b981)  / bg-emerald-500
Hover bg:       hover:bg-zinc-50 or hover:bg-zinc-100
Dividers:       border-zinc-200
```

### Icons
Use `lucide-react` for all icons. Common ones used:
`Plus, Filter, FileText, Calendar, Clock, Edit, Trash2, Send, ChevronRight, AlertCircle, Loader2, Search, BarChart3, Eye, Check, X, RefreshCw, ExternalLink, Package, Home, Settings, BarChart3`

### Charts
Use `recharts` for any charts (LineChart, BarChart, AreaChart, PieChart).

---

## API Client Pattern

All data fetching uses `APIClient` (in `src/utils/api-client.ts`):
```typescript
import { APIClient } from '../utils/api-client';

// GET request
APIClient.get<ResponseType>(null, '/endpoint?param=value');

// POST request
APIClient.post<ResponseType>(null, '/endpoint', { body: data });

// PUT request
APIClient.put<ResponseType>(null, '/endpoint', { body: data });

// DELETE request
APIClient.delete<ResponseType>(null, '/endpoint');
```

**Base URL:** `http://localhost:3003/api` (from VITE_API_BASE_URL env var)
**First argument** is always `null` (App Bridge placeholder, unused in dev mode).

---

## React Query Hook Pattern

All hooks are in `src/hooks/`. Follow this pattern:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { APIClient } from '../utils/api-client';
import type { ... } from '../types/...';

export function useMyData(param: string) {
  return useQuery<ResponseType>({
    queryKey: ['myData', param],
    queryFn: async () => {
      return APIClient.get<ResponseType>(null, `/my-endpoint?param=${param}`);
    },
    enabled: !!param,
  });
}
```

---

## Existing Hooks (DO NOT recreate - use as-is)

| Hook | File | API Endpoint | Purpose |
|------|------|-------------|---------|
| `useQuestions(filters, limit, offset)` | useQuestions.ts | `GET /questions/discover` | Discover questions |
| `useQuestionCategories()` | useQuestions.ts | `GET /questions/categories` | Get filter categories |
| `useAddToQueue()` | useQuestions.ts | `POST /questions/add-to-queue` | Add questions to gen queue |
| `useQAPages(status, limit, offset, sortBy, sortOrder)` | useQAPages.ts | `GET /qa-pages` | List Q&A pages by status |
| `useQAPage(pageId)` | useQAPages.ts | `GET /qa-pages/:id` | Get single page |
| `useApproveQAPage()` | useQAPages.ts | `POST /qa-pages/:id/approve` | Approve & publish |
| `useUpdateQAPage()` | useQAPages.ts | `PUT /qa-pages/:id` | Update page content |
| `useDeleteQAPage()` | useQAPages.ts | `DELETE /qa-pages/:id` | Delete page |
| `useRegenerateQAPage()` | useQAPages.ts | `POST /qa-pages/:id/regenerate` | Regenerate AI content |
| `useCalendar(start, end, filters)` | useCalendar.ts | `GET /calendar` | Calendar items |
| `useProducts()` | useProducts.ts | `GET /products` | List products |
| `useSyncProducts()` | useProducts.ts | `POST /products/sync` | Sync from Shopify |
| `useAnalytics()` | useAnalytics.ts | `GET /analytics` | Analytics data |
| `useQAAnalytics()` | useAnalytics.ts | `GET /analytics/qa-overview` | QA overview metrics |
| `useBusinessProfile()` | useBusinessProfile.ts | `GET /business-profile` | Get business profile |

---

## Existing Types (DO NOT recreate)

### `src/types/qa-content.types.ts`
- `Question`, `QuestionFilters`, `QuestionSource`
- `QAPage`, `QAPageStatus` ('draft' | 'generating' | 'pending_review' | 'published' | 'archived')
- `ContentGap`, `TrendData`, `QAAnalytics`
- `BusinessProfile`, `Industry`, `BrandVoice`, etc.
- All request/response types: `DiscoverQuestionsResponse`, `GetQAPagesResponse`, `ApproveQAPageResponse`, etc.

### `src/types/api.types.ts`
- `Product`, `ProductVariant`, `ProductImage`
- `ContentGeneration`, `ContentVariant`, `AIModel`
- `AnalyticsData`, `TimeSeriesDataPoint`
- `Organization`, `User`, `UserRole`
- All request/response types for products, content generation, analytics

### `src/types/calendar.types.ts`
- `CalendarItem`, `CalendarEvent`, `CalendarContentStatus`
- `ContentType` ('blog_post' | 'custom_page')
- Calendar filter and request/response types

---

## Backend API Endpoints (Full Registry)

### Working Endpoints
| Method | Path | Returns |
|--------|------|---------|
| GET | `/api/health` | `{ status, timestamp }` |
| GET | `/api/auth/shopify?shop=xxx` | Redirects to Shopify OAuth |
| GET | `/api/auth/shopify/callback` | Handles OAuth callback |
| GET | `/api/auth/session?shop=xxx` | Session info |
| GET | `/api/calendar?start=&end=&type=&status=` | `{ items[], total }` |
| GET | `/api/calendar/:id` | Single calendar item |
| POST | `/api/calendar` | Create calendar item |
| PATCH | `/api/calendar/:id/reschedule` | Reschedule item |
| PATCH | `/api/calendar/:id/status` | Update status |
| DELETE | `/api/calendar/:id` | Delete item |
| POST | `/api/products/sync` | Sync products from Shopify |

### Endpoints That Need Implementation (return empty/stubbed data)
| Method | Path | Expected Return |
|--------|------|----------------|
| GET | `/api/products` | `Product[]` |
| GET | `/api/questions/discover` | `{ questions[], total, hasMore }` |
| GET | `/api/questions/categories` | `string[]` |
| POST | `/api/questions/add-to-queue` | `{ queued, qaPageIds[] }` |
| GET | `/api/qa-pages?status=&limit=&offset=&sortBy=&sortOrder=` | `{ pages[], total, hasMore }` |
| GET | `/api/qa-pages/:id` | `QAPage` |
| POST | `/api/qa-pages/:id/approve` | `{ success, shopifyUrl? }` |
| PUT | `/api/qa-pages/:id` | `QAPage` |
| DELETE | `/api/qa-pages/:id` | `{ success }` |
| POST | `/api/qa-pages/:id/regenerate` | `QAPage` |
| GET | `/api/analytics/qa-overview` | `QAAnalytics` |
| GET | `/api/analytics` | `{ analytics[] }` |

---

## Page Component Template

Every page should follow this structure:
```tsx
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, PrimaryButton } from '../components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
// ... other shadcn/ui imports
import { Plus, Filter } from 'lucide-react'; // icons
import { useMyHook } from '../hooks/useMyHook';
import type { MyType } from '../types/my-types';

export function MyPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useMyHook();

  if (isLoading) {
    return (
      <div>
        <PageHeader title="My Page" description="Page description" />
        {/* Skeleton loading state */}
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="My Page" description="Page description">
        <PrimaryButton icon={Plus} onClick={() => {}}>Action</PrimaryButton>
      </PageHeader>
      {/* Page content using Card, Badge, etc. */}
    </div>
  );
}

export default MyPage;
```

---

## Sidebar Navigation (Current)
```typescript
const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/' },
  { id: 'products', label: 'Products', icon: Package, path: '/products' },
  { id: 'content', label: 'Content', icon: FileText, path: '/content/discover' },
  { id: 'calendar', label: 'Calendar', icon: Calendar, path: '/content/calendar' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
];
```

---

## File Naming Rules
- Pages: `PascalCase.tsx` in `src/pages/` (e.g., `QuestionDiscovery.tsx`)
- Hooks: `camelCase.ts` in `src/hooks/` (e.g., `useQuestions.ts`)
- Components: `PascalCase.tsx` in component dirs
- Types: `kebab-case.types.ts` in `src/types/`
- Backend controllers: `kebab-case.controller.ts`
- Backend services: `kebab-case-service.ts`

---

## Critical Rules
1. **NO Shopify Polaris** - Use only shadcn/ui + Tailwind
2. **DO NOT modify** existing hooks, types, api-client, or layout components
3. **DO NOT modify** globals.css, AppShell.tsx, Sidebar.tsx, Header.tsx, CommandPalette.tsx
4. **Use existing hooks** - They already call correct API endpoints
5. **Follow light theme** - White cards, zinc borders, emerald accents
6. **Export default AND named** from page files: `export function MyPage()` + `export default MyPage`
7. **Backend returns realistic mock data** when real integrations aren't ready
