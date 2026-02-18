# Frontend Dependencies for Q&A Content Engine

## Required npm Packages

Add these dependencies to `package.json`:

### Core Dependencies (Already Installed)
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "@shopify/polaris": "^12.0.0",
    "@tanstack/react-query": "^5.17.0"
  }
}
```

### Additional Dependencies Required

```bash
# Chart library for analytics
npm install recharts

# Or add to package.json:
```

```json
{
  "dependencies": {
    "recharts": "^2.10.0"
  }
}
```

### DevDependencies (Optional but Recommended)

```bash
# TypeScript
npm install -D typescript @types/react @types/react-dom

# Testing
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event

# E2E Testing
npm install -D cypress

# Linting
npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser

# Type checking
npm install -D @types/node
```

---

## Polaris Tokens

If using Polaris v12+, ensure these are in your `package.json`:

```json
{
  "dependencies": {
    "@shopify/polaris": "^12.0.0",
    "@shopify/polaris-tokens": "^8.0.0"
  }
}
```

---

## Polaris Locales

English translations are imported from:

```typescript
import enTranslations from '@shopify/polaris/locales/en.json';
```

For additional languages, add:

```bash
npm install @shopify/polaris-translations
```

---

## Chart Library (Recharts) Configuration

No additional configuration needed. Import and use:

```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
```

---

## React Query Configuration

Already configured in `App.tsx`:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});
```

---

## TypeScript Configuration

Ensure `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

## Vite Configuration

Ensure `vite.config.ts` includes:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

---

## Environment Variables

Create `.env` file:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

For production:

```env
VITE_API_BASE_URL=https://api.yourapp.com/api
```

---

## Shopify App Bridge (Future)

When integrating with Shopify Admin:

```bash
npm install @shopify/app-bridge @shopify/app-bridge-react
```

Update `App.tsx`:

```typescript
import { Provider as AppBridgeProvider } from '@shopify/app-bridge-react';

const config = {
  apiKey: import.meta.env.VITE_SHOPIFY_API_KEY,
  host: new URLSearchParams(location.search).get('host') || '',
};

// Wrap app with AppBridgeProvider
```

---

## Full package.json Example

```json
{
  "name": "shopify-seo-platform-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:e2e": "cypress open"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "@shopify/polaris": "^12.0.0",
    "@shopify/polaris-tokens": "^8.0.0",
    "@tanstack/react-query": "^5.17.0",
    "recharts": "^2.10.0",
    "zustand": "^4.4.7"
  },
  "devDependencies": {
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "@types/node": "^20.11.5",
    "@typescript-eslint/eslint-plugin": "^6.19.0",
    "@typescript-eslint/parser": "^6.19.0",
    "@vitejs/plugin-react": "^4.2.1",
    "@testing-library/react": "^14.1.2",
    "@testing-library/jest-dom": "^6.2.0",
    "@testing-library/user-event": "^14.5.2",
    "eslint": "^8.56.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.5",
    "typescript": "^5.3.3",
    "vite": "^5.0.11",
    "vitest": "^1.2.0",
    "cypress": "^13.6.3"
  }
}
```

---

## Installation Commands

```bash
# Install all dependencies
npm install

# Install chart library
npm install recharts

# Install dev dependencies
npm install -D @types/react @types/react-dom @types/node

# Install testing libraries
npm install -D vitest @testing-library/react @testing-library/jest-dom

# Install linting
npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

---

## Build Commands

```bash
# Development server
npm run dev

# Type checking
npm run type-check

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm run test

# Run E2E tests
npm run test:e2e

# Lint code
npm run lint
```

---

## Browser Requirements

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## Polaris Styles Import

Ensure this is in your main entry file (`main.tsx` or `App.tsx`):

```typescript
import '@shopify/polaris/build/esm/styles.css';
```

---

## Known Issues & Solutions

### Issue: Recharts SSR Warning
**Solution:** Recharts works client-side only. If using SSR, wrap charts in dynamic imports.

### Issue: Polaris Modal Focus Lock
**Solution:** Use latest Polaris version (12.0+) which has improved focus management.

### Issue: React Query Devtools
**Solution:** Add devtools for debugging:

```bash
npm install @tanstack/react-query-devtools
```

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// In App.tsx
<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

---

## Performance Optimization

### Code Splitting

Use React.lazy for route-based code splitting:

```typescript
const Onboarding = lazy(() => import('./pages/Onboarding'));
const QuestionDiscovery = lazy(() => import('./pages/QuestionDiscovery'));

<Suspense fallback={<Spinner />}>
  <Routes>
    <Route path="/onboarding" element={<Onboarding />} />
    {/* ... */}
  </Routes>
</Suspense>
```

### Chart Lazy Loading

```typescript
const PerformanceChart = lazy(() => import('./components/PerformanceChart'));
```

---

## Accessibility

All Polaris components are WCAG 2.1 Level AA compliant by default.

Additional packages for accessibility testing:

```bash
npm install -D @axe-core/react
```

---

## Internationalization (Future)

For multi-language support:

```bash
npm install react-i18next i18next
```

---

## Analytics Integration (Future)

For tracking user interactions:

```bash
npm install @shopify/app-bridge-utils
```

---

**Last Updated:** 2026-01-19
**Version:** 1.0.0
