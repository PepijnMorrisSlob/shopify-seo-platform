# Shopify SEO Platform - Frontend

Production-ready React frontend for the Shopify SEO Automation Platform.

## Technology Stack

- **Framework:** React 18 + TypeScript 5.3
- **UI Library:** Shopify Polaris 13.9
- **Build Tool:** Vite 5
- **State Management:** Zustand
- **Data Fetching:** TanStack React Query 5
- **Auth:** Shopify App Bridge 4.x
- **Charts:** Recharts
- **Routing:** React Router DOM

## Project Structure

```
frontend/
├── src/
│   ├── pages/               # Main application pages
│   │   ├── Dashboard.tsx    # Product list with SEO scores
│   │   ├── ContentGeneration.tsx  # AI content creation
│   │   ├── Analytics.tsx    # Google Search Console data
│   │   └── Settings.tsx     # App configuration
│   ├── components/          # Reusable UI components
│   │   ├── ProductList.tsx
│   │   ├── ContentPreview.tsx
│   │   └── SEOScore.tsx
│   ├── hooks/               # Custom React hooks
│   │   ├── useShopifyAuth.ts
│   │   ├── useProducts.ts
│   │   ├── useContentGeneration.ts
│   │   └── useAnalytics.ts
│   ├── store/               # Zustand global state
│   │   └── app-store.ts
│   ├── types/               # TypeScript definitions
│   │   └── api.types.ts
│   ├── utils/               # Utility functions
│   │   └── api-client.ts
│   ├── App.tsx              # Main app component
│   └── main.tsx             # Entry point
├── package.json
├── vite.config.ts
├── tsconfig.json
└── .env.example
```

## Setup Instructions

### Prerequisites

- Node.js 18+ installed
- Backend API running on port 3000
- Shopify Partner account with API credentials

### Installation

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`:
```env
VITE_SHOPIFY_API_KEY=your_shopify_api_key_here
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_ENV=development
```

### Development

Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## Key Features

### 1. Dashboard
- Product list with SEO scores
- Bulk product selection
- Quick optimize actions
- Product sync from Shopify

### 2. Content Generation
- AI model selection (GPT-3.5, GPT-4, Claude)
- Generate 3 content variants
- Quality scoring
- Preview and approve
- Publish to Shopify

### 3. Analytics
- Google Search Console integration
- Impressions, clicks, CTR, position tracking
- Interactive charts (Recharts)
- Date range filtering
- Per-product analytics

### 4. Settings
- Google Search Console connection
- AI model preferences
- Plan information

## Shopify App Bridge Integration

The app uses Shopify App Bridge 4.x for:
- Session token authentication (no cookies)
- Embedded app experience
- Native Shopify Admin integration

### Authentication Flow

1. App loads within Shopify Admin iframe
2. App Bridge initializes with API key and host
3. Session tokens are automatically generated and refreshed
4. All API requests include session token in Authorization header

## State Management

### Zustand Store
Global state for:
- Current organization
- Current user
- Selected products (bulk operations)
- UI state (sidebar, loading)

### React Query
Server state management for:
- Products fetching
- Content generation
- Analytics data
- Automatic caching and refetching
- Optimistic updates

## API Integration

All API calls use the `APIClient` utility:

```typescript
import { APIClient } from '../utils/api-client';

// GET request
const products = await APIClient.get(app, '/products');

// POST request
const result = await APIClient.post(app, '/content/generate', data);
```

Session tokens are automatically included in all requests.

## Type Safety

All API types are defined in `src/types/api.types.ts` and coordinated with backend types.

Example:
```typescript
import type { Product, ContentGeneration, AIModel } from '../types/api.types';
```

## Custom Hooks

### useProducts
Fetch and sync Shopify products:
```typescript
const { data: products, isLoading, error } = useProducts();
const { mutate: syncProducts } = useSyncProducts();
```

### useContentGeneration
Generate and publish AI content:
```typescript
const { mutate: generateContent } = useGenerateContent();
const { mutate: publishContent } = usePublishContent();
```

### useAnalytics
Fetch Google Search Console data:
```typescript
const { data: analytics } = useAnalytics({
  startDate: '2026-01-01',
  endDate: '2026-01-31',
  productIds: ['product-id'],
});
```

## UI/UX Standards

- **Design System:** Shopify Polaris only (no custom components)
- **Loading States:** Polaris Spinner for all async operations
- **Error Handling:** Polaris Banner for errors
- **Empty States:** Polaris EmptyState component
- **Accessibility:** WCAG 2.1 AA compliant
- **Responsive:** Mobile-first design

## Performance Optimization

- React Query caching (5-minute stale time)
- Lazy loading for charts
- Optimistic updates for mutations
- Image lazy loading with Thumbnail component

## Security

- Session token authentication (no cookies)
- HTTPS only in production
- Content Security Policy headers
- XSS protection via React

## Dependencies with Other Agents

### Backend Specialist
- API endpoints: `/api/products/*`, `/api/content/*`, `/api/analytics/*`
- Type definitions: `Product`, `ContentGeneration`, `AnalyticsData`

### Security Specialist
- OAuth flow (redirect to `/auth` if not authenticated)
- Session token validation
- RBAC for user permissions

## Production Deployment

1. Set production environment variables
2. Build: `npm run build`
3. Deploy `dist/` folder to CDN (CloudFront)
4. Configure backend CORS for production domain
5. Update Shopify app URLs in Partner dashboard

## Troubleshooting

### App Bridge not initializing
- Check `VITE_SHOPIFY_API_KEY` is set correctly
- Ensure `host` parameter is in URL query string
- Verify app is loaded within Shopify Admin iframe

### API requests failing
- Check backend is running on port 3000
- Verify CORS configuration allows frontend domain
- Check session token is being generated

### Charts not rendering
- Ensure analytics data has correct format
- Check Recharts is properly installed
- Verify ResponsiveContainer parent has height

## Contributing

Follow the file naming conventions:
- Pages: PascalCase (Dashboard.tsx)
- Components: PascalCase (ProductList.tsx)
- Hooks: camelCase with "use" prefix (useProducts.ts)
- Utils: kebab-case (api-client.ts)

## License

Proprietary - Shopify SEO Platform
