# Shopify SEO Automation Platform - Development Guide

**Version:** 1.0
**Last Updated:** 2026-01-19

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Environment](#development-environment)
3. [Project Structure](#project-structure)
4. [Development Workflow](#development-workflow)
5. [Code Style & Standards](#code-style--standards)
6. [Testing](#testing)
7. [Debugging](#debugging)
8. [Database Development](#database-development)
9. [API Development](#api-development)
10. [Frontend Development](#frontend-development)
11. [Common Tasks](#common-tasks)

---

## Getting Started

### Prerequisites

- **Node.js:** v20.x LTS
- **npm:** v10.x or **pnpm:** v8.x (recommended)
- **Docker & Docker Compose:** Latest
- **Git:** v2.40+
- **VS Code** (recommended) or your preferred IDE

### First-Time Setup

```bash
# Clone repository
git clone https://github.com/your-org/shopify-seo-platform.git
cd shopify-seo-platform

# Install dependencies (use pnpm for faster installs)
pnpm install

# Copy environment files
cp .env.example .env

# Start local services (PostgreSQL, Redis)
docker compose up -d

# Run database migrations
cd backend && npx prisma migrate dev

# Seed database with test data
npx prisma db seed

# Start development servers
pnpm run dev
```

Access local services:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000
- **API Docs:** http://localhost:3000/api-docs
- **pgAdmin:** http://localhost:5050 (admin@shopify-seo.local / admin)
- **Redis Commander:** http://localhost:8081

---

## Development Environment

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "ms-azuretools.vscode-docker",
    "formulahendry.auto-rename-tag",
    "streetsidesoftware.code-spell-checker",
    "eamodio.gitlens",
    "usernamehw.errorlens"
  ]
}
```

### VS Code Settings

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "files.associations": {
    "*.css": "tailwindcss"
  }
}
```

### Environment Variables (.env)

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/shopify_seo_dev"
DATABASE_POOL_SIZE=10

# Redis
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD=""

# Shopify (use test store for development)
SHOPIFY_API_KEY="your_test_api_key"
SHOPIFY_API_SECRET="your_test_api_secret"
SHOPIFY_SCOPES="read_products,write_products,read_content,write_content"
SHOPIFY_APP_URL="http://localhost:3000"

# AI APIs (use development keys)
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
PERPLEXITY_API_KEY="pplx-..."

# Security (generate new secrets for local dev)
JWT_SECRET="local-dev-secret-change-in-production"
ENCRYPTION_KEY="local-dev-encryption-key-32char"
SESSION_SECRET="local-dev-session-secret"

# Development
NODE_ENV="development"
LOG_LEVEL="debug"
PORT=3000
```

---

## Project Structure

```
shopify-seo-platform/
├── backend/                 # NestJS backend
│   ├── src/
│   │   ├── controllers/     # API controllers
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Express middleware
│   │   ├── guards/          # Auth guards
│   │   ├── types/           # TypeScript types
│   │   ├── utils/           # Helper functions
│   │   └── main.ts          # Application entry point
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   ├── migrations/      # Database migrations
│   │   └── seed.ts          # Seed data
│   ├── test/                # E2E tests
│   └── package.json
├── frontend/                # React frontend
│   ├── src/
│   │   ├── pages/           # Page components
│   │   ├── components/      # Reusable components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── contexts/        # React contexts
│   │   ├── types/           # TypeScript types
│   │   ├── utils/           # Helper functions
│   │   └── App.tsx          # Root component
│   ├── public/              # Static assets
│   └── package.json
├── infrastructure/          # Terraform & deployment
│   ├── terraform/           # Infrastructure as Code
│   └── ecs/                 # ECS task definitions
├── docker/                  # Dockerfiles
│   ├── Dockerfile.backend
│   └── Dockerfile.frontend
├── docs/                    # Documentation
├── .github/                 # GitHub Actions workflows
└── docker-compose.yml       # Local development services
```

---

## Development Workflow

### Git Workflow

```bash
# Create feature branch
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name

# Make changes
# ... code ...

# Commit changes
git add .
git commit -m "feat(scope): description"

# Push to remote
git push origin feature/your-feature-name

# Create Pull Request on GitHub
```

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject

body (optional)

footer (optional)
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(content): add multi-model AI content generation
fix(auth): resolve session token validation issue
docs(api): update API documentation for /products endpoint
refactor(database): optimize product query performance
test(content): add unit tests for content scoring
```

### Pull Request Process

1. **Create PR** from feature branch to `develop`
2. **Fill PR template** with description, testing, checklist
3. **Request review** from 2 team members
4. **Address feedback** and push updates
5. **Merge** after approval (squash and merge)

---

## Code Style & Standards

### TypeScript

```typescript
// Use explicit types
function calculateScore(content: string, keywords: string[]): number {
  // ...
}

// Use interfaces for objects
interface Product {
  id: string;
  title: string;
  seoScore: number;
}

// Use const assertions
const STATUS = {
  ACTIVE: 'active',
  DRAFT: 'draft',
} as const;

// Use async/await (not .then())
async function fetchProducts(): Promise<Product[]> {
  const response = await axios.get('/api/products');
  return response.data;
}
```

### Naming Conventions

- **Files:** kebab-case (`product-service.ts`, `use-products.ts`)
- **Components:** PascalCase (`ProductList.tsx`, `ContentPreview.tsx`)
- **Functions:** camelCase (`calculateScore`, `fetchProducts`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_RETRIES`, `API_BASE_URL`)
- **Types/Interfaces:** PascalCase (`Product`, `ContentGenerationInput`)

### ESLint & Prettier

```bash
# Lint code
pnpm run lint

# Fix linting issues
pnpm run lint:fix

# Format code
pnpm run format

# Check formatting
pnpm run format:check
```

---

## Testing

### Unit Tests (Jest)

```typescript
// Example: services/__tests__/content-service.test.ts
import { AIContentService } from '../ai-content-service';

describe('AIContentService', () => {
  let service: AIContentService;

  beforeEach(() => {
    service = new AIContentService();
  });

  it('should generate 3 content variants', async () => {
    const result = await service.generateContent(
      'product_meta',
      { productTitle: 'Test Product' },
      'org_123',
      3
    );

    expect(result).toHaveLength(3);
    expect(result[0]).toHaveProperty('qualityScore');
  });

  it('should select GPT-3.5 for product_meta', () => {
    const model = service['selectModel']('product_meta');
    expect(model).toBe('gpt-3.5-turbo');
  });
});
```

**Run tests:**
```bash
# Unit tests
cd backend && pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:cov
```

### Integration Tests

```typescript
// Example: test/products.e2e-spec.ts
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Products (e2e)', () => {
  let app;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  it('/api/products (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/products')
      .set('Authorization', 'Bearer test-token')
      .expect(200)
      .expect((res) => {
        expect(res.body.data).toBeInstanceOf(Array);
      });
  });
});
```

**Run E2E tests:**
```bash
cd backend && pnpm test:e2e
```

### Frontend Tests (Vitest + Testing Library)

```typescript
// Example: components/__tests__/ProductList.test.tsx
import { render, screen } from '@testing-library/react';
import { ProductList } from '../ProductList';

describe('ProductList', () => {
  it('renders product list', () => {
    const products = [
      { id: '1', title: 'Product 1', seoScore: 85 },
      { id: '2', title: 'Product 2', seoScore: 90 },
    ];

    render(<ProductList products={products} />);

    expect(screen.getByText('Product 1')).toBeInTheDocument();
    expect(screen.getByText('Product 2')).toBeInTheDocument();
  });
});
```

**Run frontend tests:**
```bash
cd frontend && pnpm test
```

---

## Debugging

### Backend Debugging (VS Code)

**launch.json:**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["run", "start:debug"],
      "cwd": "${workspaceFolder}/backend",
      "console": "integratedTerminal",
      "restart": true,
      "protocol": "inspector"
    }
  ]
}
```

### Frontend Debugging (Chrome DevTools)

1. Open Chrome DevTools
2. Go to Sources → Add folder to workspace
3. Set breakpoints in TypeScript files
4. Reload page

### Database Queries

```typescript
// Enable Prisma query logging
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

### API Debugging

```bash
# Use httpie for API testing
http GET localhost:3000/api/products Authorization:"Bearer token"

# Use curl
curl -H "Authorization: Bearer token" http://localhost:3000/api/products
```

---

## Database Development

### Creating Migrations

```bash
cd backend

# Create migration
npx prisma migrate dev --name add_seo_score_to_products

# Apply migration
npx prisma migrate deploy

# Reset database (⚠️ deletes all data)
npx prisma migrate reset
```

### Prisma Studio

```bash
# Open Prisma Studio (database GUI)
npx prisma studio
```

### Seeding Data

```bash
# Run seed script
npx prisma db seed
```

**Example seed script:**
```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.organization.create({
    data: {
      shopDomain: 'test-store.myshopify.com',
      name: 'Test Store',
      plan: 'professional',
      products: {
        create: [
          {
            shopifyProductId: 'gid://shopify/Product/1',
            title: 'Premium Wireless Headphones',
            seoScore: 85,
          },
        ],
      },
    },
  });
}

main();
```

---

## API Development

### Creating New Endpoint

1. **Create controller:**
```typescript
// controllers/example.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ExampleService } from '../services/example-service';

@Controller('api/example')
export class ExampleController {
  constructor(private exampleService: ExampleService) {}

  @Get()
  async getExamples() {
    return this.exampleService.findAll();
  }
}
```

2. **Create service:**
```typescript
// services/example-service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class ExampleService {
  async findAll() {
    return [];
  }
}
```

3. **Register in module:**
```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ExampleController } from './controllers/example.controller';
import { ExampleService } from './services/example-service';

@Module({
  controllers: [ExampleController],
  providers: [ExampleService],
})
export class AppModule {}
```

### API Documentation (Swagger)

```typescript
// Add Swagger decorators
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('example')
@Controller('api/example')
export class ExampleController {
  @Get()
  @ApiOperation({ summary: 'Get all examples' })
  @ApiResponse({ status: 200, description: 'Success' })
  async getExamples() {
    return this.exampleService.findAll();
  }
}
```

Access Swagger UI: http://localhost:3000/api-docs

---

## Frontend Development

### Creating New Page

```typescript
// pages/Example.tsx
import { Page, Layout, Card } from '@shopify/polaris';

export function ExamplePage() {
  return (
    <Page title="Example Page">
      <Layout>
        <Layout.Section>
          <Card>
            <p>Example content</p>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
```

### Creating Custom Hook

```typescript
// hooks/useExample.ts
import { useState, useEffect } from 'react';
import { fetchExamples } from '../api/example-api';

export function useExample() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const result = await fetchExamples();
        setData(result);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { data, loading, error };
}
```

### State Management (Zustand)

```typescript
// stores/productStore.ts
import { create } from 'zustand';

interface ProductStore {
  products: Product[];
  setProducts: (products: Product[]) => void;
  addProduct: (product: Product) => void;
}

export const useProductStore = create<ProductStore>((set) => ({
  products: [],
  setProducts: (products) => set({ products }),
  addProduct: (product) => set((state) => ({
    products: [...state.products, product]
  })),
}));
```

---

## Common Tasks

### Adding New AI Model

1. Update types:
```typescript
// types/ai.types.ts
export type AIModel =
  | 'gpt-3.5-turbo'
  | 'gpt-4-turbo'
  | 'claude-sonnet-4'
  | 'perplexity-sonar-pro'
  | 'new-model'; // Add here
```

2. Add model routing:
```typescript
// services/ai-content-service.ts
const AI_MODEL_ROUTING = {
  // ...
  new_content_type: {
    primary: 'new-model',
    fallbacks: ['gpt-4-turbo'],
  },
};
```

3. Add integration:
```typescript
async generateWithNewModel(input) {
  // Implementation
}
```

### Adding New Prompt Template

```typescript
// utils/prompt-library.ts
export const PROMPT_TEMPLATES = {
  // ...
  new_template: {
    id: 'new_template',
    name: 'New Template',
    contentType: 'blog_post',
    template: `Your prompt here with {variables}`,
    variables: ['variable1', 'variable2'],
    temperature: 0.7,
    maxTokens: 1000,
    bestModel: 'gpt-4-turbo',
  },
};
```

### Running Background Jobs

```bash
# Start BullMQ worker
cd backend && pnpm run worker

# View queue dashboard
open http://localhost:3000/queues
```

---

**Document Version:** 1.0
**Last Updated:** 2026-01-19
