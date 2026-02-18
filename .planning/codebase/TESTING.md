# Testing Documentation - Shopify SEO Platform

## Overview

This document describes the testing setup, frameworks, patterns, and strategies used in the Shopify SEO Platform.

---

## Testing Frameworks

### Backend Testing Stack

| Framework | Version | Purpose |
|-----------|---------|---------|
| **Jest** | ^29.7.0 | Primary test runner |
| **ts-jest** | ^29.1.1 | TypeScript preprocessor for Jest |
| **@nestjs/testing** | ^10.3.0 | NestJS testing utilities |
| **supertest** | ^6.3.4 | HTTP assertions for E2E tests |

### Frontend Testing Stack

Currently, the frontend does not have an explicit testing setup in `package.json`. Testing infrastructure would need to be added.

**Recommended Stack for Frontend:**
- Vitest (integrates with Vite)
- React Testing Library
- MSW (Mock Service Worker) for API mocking

---

## Test Configuration

### Backend Jest Configuration

**From package.json scripts:**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  }
}
```

### Expected Jest Configuration (jest.config.js)

Based on NestJS conventions, the expected configuration would be:

```javascript
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
```

### E2E Test Configuration (test/jest-e2e.json)

Expected structure:
```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  }
}
```

---

## Test File Organization

### Current State

The project currently has **no test files** in the `backend/src` directory. Test infrastructure is set up but tests need to be implemented.

### Recommended File Structure

```
backend/
├── src/
│   ├── services/
│   │   ├── ai-content-service.ts
│   │   └── ai-content-service.spec.ts    # Unit tests
│   ├── controllers/
│   │   ├── products.controller.ts
│   │   └── products.controller.spec.ts   # Unit tests
│   └── ...
├── test/
│   ├── jest-e2e.json                     # E2E config
│   ├── app.e2e-spec.ts                   # App E2E tests
│   └── fixtures/                         # Test fixtures
│       ├── products.fixture.ts
│       └── organizations.fixture.ts
└── coverage/                             # Generated coverage reports
```

### Naming Conventions

| Test Type | File Pattern | Location |
|-----------|--------------|----------|
| Unit Tests | `*.spec.ts` | Same directory as source |
| Integration Tests | `*.integration.spec.ts` | Same directory or `/test` |
| E2E Tests | `*.e2e-spec.ts` | `/test` directory |

---

## Testing Patterns

### Unit Test Pattern (Services)

```typescript
// ai-content-service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AIContentService } from './ai-content-service';

describe('AIContentService', () => {
  let service: AIContentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AIContentService],
    }).compile();

    service = module.get<AIContentService>(AIContentService);
  });

  describe('generateContent', () => {
    it('should generate content for product_meta type', async () => {
      // Arrange
      const contentType = 'product_meta';
      const input = { keywords: ['test'], title: 'Test Product' };
      const organizationId = 'org-123';

      // Act
      const result = await service.generateContent(contentType, input, organizationId);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('scoreContent', () => {
    it('should score content readability', async () => {
      const content = 'This is a test sentence. It has simple words.';
      const criteria = { enableReadability: true };

      const score = await service.scoreContent(content, criteria);

      expect(score.readability).toBeDefined();
      expect(score.readability.score).toBeGreaterThanOrEqual(0);
      expect(score.readability.score).toBeLessThanOrEqual(100);
    });
  });
});
```

### Unit Test Pattern (Controllers)

```typescript
// products.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { PrismaClient } from '@prisma/client';

describe('ProductsController', () => {
  let controller: ProductsController;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(async () => {
    mockPrisma = {
      product: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaClient>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    (controller as any).prisma = mockPrisma;
  });

  describe('getProducts', () => {
    it('should return array of products', async () => {
      const mockProducts = [
        { id: '1', title: 'Product 1' },
        { id: '2', title: 'Product 2' },
      ];
      mockPrisma.product.findMany.mockResolvedValue(mockProducts);

      const result = await controller.getProducts();

      expect(result).toEqual(mockProducts);
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        take: 50,
        orderBy: { updatedAt: 'desc' },
      });
    });
  });
});
```

### E2E Test Pattern

```typescript
// test/app.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/health (GET)', () => {
    it('should return health status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.service).toBe('shopify-seo-backend');
        });
    });
  });

  describe('/products (GET)', () => {
    it('should return products array', () => {
      return request(app.getHttpServer())
        .get('/products')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });
});
```

---

## Mocking Strategies

### Mocking External Services

```typescript
// Mock OpenAI client
jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: 'Generated content' } }],
            usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
          }),
        },
      },
    })),
  };
});
```

### Mocking Prisma Client

```typescript
// __mocks__/prisma.ts
export const mockPrismaClient = {
  product: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  organization: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $queryRaw: jest.fn(),
};

// Usage in tests
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrismaClient),
}));
```

### Mocking Environment Variables

```typescript
describe('EncryptionService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      ENCRYPTION_KEY: 'a'.repeat(64), // 64 hex characters
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should initialize with valid encryption key', () => {
    const service = new EncryptionService();
    expect(service).toBeDefined();
  });
});
```

---

## Coverage Requirements

### Current Configuration

Coverage is collected via `npm run test:cov` which runs `jest --coverage`.

### Recommended Coverage Thresholds

```javascript
// jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/*.d.ts$/',
    '/test/',
    '/examples/',
  ],
};
```

### Priority Files for Coverage

1. **Critical Services** (target: 90%+)
   - `encryption-service.ts` - Security critical
   - `auth-service.ts` - Authentication logic
   - `shopify-service.ts` - Core integration

2. **Business Logic** (target: 80%+)
   - `ai-content-service.ts` - Content generation
   - `question-discovery-service.ts` - Q&A logic
   - `seo-validator-service.ts` - SEO scoring

3. **Controllers** (target: 70%+)
   - All controllers should have basic endpoint tests

4. **Utils** (target: 80%+)
   - `hmac-validator.ts`
   - `retry-helper.ts`
   - `rate-limiter.ts`

---

## Test Commands Reference

### Running Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode (development)
npm run test:watch

# Run tests with coverage report
npm run test:cov

# Run E2E tests
npm run test:e2e

# Run specific test file
npm test -- ai-content-service.spec.ts

# Run tests matching pattern
npm test -- --testPathPattern=service

# Debug tests
npm run test:debug
```

### CI/CD Integration

```yaml
# Example GitHub Actions workflow
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '20'
    - run: npm ci
    - run: npm run test:cov
    - uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
```

---

## Frontend Testing (To Be Implemented)

### Recommended Setup

```bash
# Install testing dependencies
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom msw
```

### Vitest Configuration (vite.config.ts)

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

### React Component Test Pattern

```typescript
// Dashboard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { AppProvider } from '@shopify/polaris';
import { Dashboard } from './Dashboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <AppProvider i18n={{}}>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </AppProvider>
    </QueryClientProvider>
  );
};

describe('Dashboard', () => {
  it('renders page title', () => {
    renderWithProviders(<Dashboard />);
    expect(screen.getByText('SEO Dashboard')).toBeInTheDocument();
  });

  it('shows sync button', () => {
    renderWithProviders(<Dashboard />);
    expect(screen.getByText('Sync Products')).toBeInTheDocument();
  });
});
```

---

## Test Data Management

### Fixtures Pattern

```typescript
// test/fixtures/products.fixture.ts
export const mockProduct = {
  id: 'prod-123',
  title: 'Test Product',
  description: 'A test product description',
  handle: 'test-product',
  shopifyId: 'gid://shopify/Product/123',
  organizationId: 'org-456',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockProducts = [
  mockProduct,
  { ...mockProduct, id: 'prod-456', title: 'Second Product' },
];
```

### Factory Pattern

```typescript
// test/factories/product.factory.ts
import { faker } from '@faker-js/faker';

export const createMockProduct = (overrides = {}) => ({
  id: faker.string.uuid(),
  title: faker.commerce.productName(),
  description: faker.commerce.productDescription(),
  handle: faker.helpers.slugify(faker.commerce.productName()),
  shopifyId: `gid://shopify/Product/${faker.number.int()}`,
  organizationId: faker.string.uuid(),
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  ...overrides,
});
```

---

## Testing Best Practices

### Do's

1. **Isolate tests** - Each test should be independent
2. **Use descriptive names** - `it('should return 401 when token is expired')`
3. **Follow AAA pattern** - Arrange, Act, Assert
4. **Mock external dependencies** - APIs, databases, file system
5. **Test edge cases** - Empty arrays, null values, error states
6. **Keep tests fast** - Avoid real network calls, use mocks

### Don'ts

1. **Don't test implementation details** - Test behavior, not internals
2. **Don't share state between tests** - Reset in beforeEach
3. **Don't ignore flaky tests** - Fix or remove them
4. **Don't over-mock** - If mocking everything, test may be worthless
5. **Don't skip assertions** - Every test should assert something

---

## Current Testing Gaps

### High Priority (Security Critical)

- [ ] `encryption-service.ts` - AES encryption, key rotation
- [ ] `auth-service.ts` - Token validation, HMAC verification
- [ ] `rbac-guard.ts` - Permission checks
- [ ] `hmac-validator.ts` - Shopify webhook validation

### Medium Priority (Business Logic)

- [ ] `ai-content-service.ts` - Content generation, scoring
- [ ] `shopify-service.ts` - Product sync, API integration
- [ ] `question-discovery-service.ts` - Q&A discovery logic
- [ ] All controllers - Basic endpoint tests

### Lower Priority

- [ ] `utils/*.ts` - Helper functions
- [ ] `workflows/*.ts` - Workflow orchestration
- [ ] Frontend components - Once Vitest is set up
