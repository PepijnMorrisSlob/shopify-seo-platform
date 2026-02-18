# Code Conventions - Shopify SEO Platform

## Overview

This document outlines the coding conventions and patterns used across the Shopify SEO Platform codebase.

---

## File Naming Conventions

### Backend (NestJS/TypeScript)

| Type | Pattern | Example |
|------|---------|---------|
| Controllers | `kebab-case.controller.ts` | `products.controller.ts`, `business-profile.controller.ts` |
| Services | `kebab-case-service.ts` | `ai-content-service.ts`, `encryption-service.ts` |
| Types | `kebab-case.types.ts` | `auth.types.ts`, `ai.types.ts` |
| Guards | `kebab-case-guard.ts` | `rbac-guard.ts`, `shopify-auth-guard.ts` |
| Middleware | `kebab-case-middleware.ts` | `auth-middleware.ts`, `rate-limiter-middleware.ts` |
| Repositories | `kebab-case.repository.ts` | `qa-page.repository.ts` |
| Workflows | `kebab-case-workflow.ts` | `content-generation-workflow.ts` |
| Utils | `kebab-case.ts` | `retry-helper.ts`, `hmac-validator.ts` |
| Config | `kebab-case.config.ts` | `redis.config.ts` |
| Queues | `kebab-case-queue.ts` | `optimization-queue.ts` |
| Workers | `kebab-case-worker.ts` | `content-generation-worker.ts` |

### Frontend (React/TypeScript)

| Type | Pattern | Example |
|------|---------|---------|
| Pages | `PascalCase.tsx` | `Dashboard.tsx`, `ContentGeneration.tsx` |
| Components | `PascalCase.tsx` | `ProductList.tsx`, `SEOScoreCard.tsx` |
| Hooks | `use-camelCase.ts` or `useCamelCase.ts` | `useProducts.ts`, `useBusinessProfile.ts` |
| Store | `kebab-case.ts` | `app-store.ts` |
| Types | `kebab-case.types.ts` | `api.types.ts` |

---

## Code Style and Formatting

### General Rules

1. **Indentation**: 2 spaces
2. **Quotes**: Single quotes for strings
3. **Semicolons**: Required
4. **Trailing commas**: Used in multi-line arrays and objects
5. **Max line length**: No strict limit, but keep readable (~100-120 chars)

### TypeScript Patterns

#### Backend (tsconfig.json)
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2021",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "strictNullChecks": false,
    "noImplicitAny": false,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  }
}
```

**Note**: Backend uses relaxed TypeScript settings (strictNullChecks: false, noImplicitAny: false) for development flexibility.

#### Frontend (tsconfig.app.json)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "jsx": "react-jsx",
    "moduleResolution": "bundler"
  }
}
```

**Note**: Frontend uses strict TypeScript settings for better type safety in React components.

---

## Import Organization

### Backend Pattern
```typescript
// 1. External library imports
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

// 2. Internal type imports
import { EncryptedData } from '../types/auth.types';
import { AIModel, ContentType } from '../types/ai.types';

// 3. Internal service/utility imports
import { buildPrompt, getSystemMessage } from '../utils/prompt-library';
import { getShopifyService } from '../services/shopify-service';
```

### Frontend Pattern
```typescript
// 1. React core imports
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// 2. External library imports
import { Page, Layout, Card, Text, Button } from '@shopify/polaris';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// 3. Internal imports (pages, components, hooks, stores)
import { Dashboard } from './pages/Dashboard';
import { ProductList } from '../components/ProductList';
import { useSyncProducts } from '../hooks/useProducts';
import { useAppStore } from '../store/app-store';

// 4. Type imports
import type { Product } from '../types/api.types';
```

---

## Naming Conventions

### Classes and Interfaces
- **PascalCase** for class names: `AIContentService`, `EncryptionService`
- **PascalCase** for interface names: `ShopifyOAuthCallbackQuery`, `JWTPayload`
- **PascalCase** with prefix for type definitions: `ContentType`, `ResourceType`

### Functions and Methods
- **camelCase** for function names: `generateContent`, `encryptAccessToken`
- **Private methods** use same convention: `private buildPrompt()`, `private selectModel()`
- **Async functions** clearly named: `async onModuleInit()`, `async syncProducts()`

### Variables and Constants
- **camelCase** for variables: `accessToken`, `organizationId`
- **UPPER_SNAKE_CASE** for module-level constants: `AI_MODEL_ROUTING`, `MODEL_PRICING`
- **PascalCase** for enums: `UserRole`, `SecurityEventType`, `ConsentType`

### React Components
- **PascalCase** for component names: `Dashboard`, `ProductList`
- **Named exports** for pages: `export function Dashboard()`
- **Default export** for App: `export default App`

---

## Error Handling Patterns

### Backend Pattern
```typescript
try {
  const result = await this.someAsyncOperation();
  return result;
} catch (error) {
  console.error('[ServiceName] Operation failed:', error);
  throw new HttpException(
    {
      success: false,
      message: 'Human readable message',
      error: error.message,
    },
    HttpStatus.INTERNAL_SERVER_ERROR
  );
}
```

### Custom Error Classes
```typescript
export class AIServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public model?: string,
    public retryable: boolean = false
  ) {
    super(message);
  }
}
```

### Logging Pattern
```typescript
// Using NestJS Logger
private readonly logger = new Logger(DatabaseService.name);

this.logger.log('Operation completed');
this.logger.error('Operation failed', error.stack);
this.logger.warn('Warning message');
this.logger.debug('Debug info');

// Using console (simpler services)
console.log('[ServiceName] Message');
console.error('[ServiceName] Error:', error);
```

---

## Class Structure Pattern

### Service Class Structure
```typescript
/**
 * Service Description
 * Multi-line JSDoc comment explaining purpose
 */
export class ServiceName {
  // 1. Private readonly properties
  private readonly logger = new Logger(ServiceName.name);
  private readonly someConfig: ConfigType;

  // 2. Private static properties (singletons)
  private static instance: ServiceName;

  // 3. Constructor
  constructor() {
    // Initialize dependencies
  }

  // 4. Lifecycle methods (NestJS)
  async onModuleInit() {}
  async onModuleDestroy() {}

  // 5. Public methods (main API)
  async publicMethod(): Promise<ReturnType> {}

  // 6. Private helper methods
  private helperMethod(): void {}

  // 7. Static methods
  static staticHelper(): ReturnType {}
}

// Export singleton accessor
export function getServiceInstance(): ServiceName {}

// Export convenience functions
export const utilityFunction = () => {};
```

### Controller Class Structure
```typescript
/**
 * Controller Description
 */
@Controller('route-prefix')
export class SomeController {
  private prisma = new PrismaClient();
  private someService = getServiceInstance();

  @Get()
  async getAll() {}

  @Get(':id')
  async getById(@Param('id') id: string) {}

  @Post()
  async create(@Body() body: CreateDto) {}

  @Post('action')
  async performAction(@Body() body: ActionDto) {}
}
```

---

## Documentation Patterns

### JSDoc Comments
```typescript
/**
 * Brief description of the function
 *
 * @param paramName - Description of parameter
 * @param anotherParam - Description of another parameter
 * @returns Description of return value
 * @throws Description of errors that may be thrown
 */
```

### File Header Comments
```typescript
/**
 * Service/Module Name
 * Project Name
 *
 * Detailed description of what this file does.
 *
 * Features:
 * - Feature 1
 * - Feature 2
 *
 * EXPORTS FOR OTHER AGENTS:
 * - ExportedClass
 * - exportedFunction
 */
```

### Section Separators (for long files)
```typescript
// ============================================================================
// SECTION NAME
// ============================================================================
```

---

## React Component Patterns

### Functional Component Structure
```typescript
// Page Component
export function PageName() {
  // 1. Router hooks
  const navigate = useNavigate();
  const location = useLocation();

  // 2. State hooks
  const [localState, setLocalState] = useState(false);

  // 3. Custom hooks (queries, stores)
  const { data, isLoading } = useQuery();
  const { storeValue } = useAppStore();

  // 4. Event handlers
  const handleAction = () => {};

  // 5. Render
  return (
    <Page title="Page Title">
      {/* Content */}
    </Page>
  );
}
```

### Props Interface Pattern
```typescript
interface ComponentProps {
  propName: string;
  optionalProp?: number;
  onAction: (param: string) => void;
}

export function Component({ propName, optionalProp, onAction }: ComponentProps) {}
```

---

## Constants and Configuration

### Type-Safe Constants
```typescript
const AI_MODEL_ROUTING: Record<ContentType, { primary: AIModel; fallbacks: AIModel[] }> = {
  product_meta: {
    primary: 'gpt-3.5-turbo',
    fallbacks: ['gpt-4-turbo', 'claude-sonnet-4'],
  },
};
```

### Permission Mappings
```typescript
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.OWNER]: [
    { resource: 'products', action: 'create' },
    { resource: 'products', action: 'read' },
  ],
};
```

---

## ESLint Configuration

### Frontend (eslint.config.js)
```javascript
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
]);
```

**Key Rules**:
- TypeScript recommended rules
- React Hooks rules enforced
- React Refresh rules for Vite HMR
- ECMAScript 2020 features

### Backend (via package.json scripts)
```json
"lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix"
```

Uses ESLint with TypeScript parser and Prettier integration.

---

## Async/Await Patterns

### Promise.all for Parallel Operations
```typescript
const [result1, result2] = await Promise.all([
  this.operation1(),
  this.operation2(),
]);
```

### Promise.all with Filtering
```typescript
const results = await Promise.all(promises);
return results.filter((r): r is ValidType => r !== null);
```

### Sequential with Error Handling
```typescript
for (const item of items) {
  try {
    await this.processItem(item);
  } catch (error) {
    this.logger.error(`Failed to process ${item.id}`, error);
    continue; // Continue with next item
  }
}
```

---

## API Response Patterns

### Success Response
```typescript
return {
  success: true,
  message: 'Operation completed successfully',
  data: result,
};
```

### Error Response
```typescript
throw new HttpException(
  {
    success: false,
    message: 'Human readable error message',
    error: error.message,
  },
  HttpStatus.BAD_REQUEST // or appropriate status
);
```

### Paginated Response
```typescript
return {
  data: items,
  pagination: {
    page: currentPage,
    limit: pageSize,
    total: totalCount,
  },
};
```
