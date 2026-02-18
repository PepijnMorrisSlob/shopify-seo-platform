# Shopify SEO Automation Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-red.svg)](https://nestjs.com/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-Proprietary-yellow.svg)]()

AI-powered SaaS platform for automating SEO optimization of Shopify product catalogs.

---

## Features

- 🤖 **AI Content Generation** - Multi-model AI (OpenAI, Claude, Perplexity) for SEO-optimized content
- 🛍️ **Shopify Integration** - Seamless OAuth, product sync, and publishing via GraphQL API
- 📊 **SEO Analytics** - Google Search Console integration for performance tracking
- 🔍 **Keyword Research** - DataForSEO, SEMrush, and Ahrefs integration
- ⚡ **Bulk Operations** - Process thousands of products with queue-based architecture
- 🔒 **Enterprise Security** - AES-256 encryption, RBAC, GDPR compliance
- 📈 **Scalable Architecture** - Built for 50+ concurrent users, 1M+ products

---

## Quick Start

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Git** ([Download](https://git-scm.com/))
- **Docker Desktop** ([Download](https://www.docker.com/products/docker-desktop)) - Recommended

### Installation

```powershell
# 1. Clone repository
git clone https://github.com/your-org/shopify-seo-platform.git
cd shopify-seo-platform

# 2. Run automated setup (as Administrator)
.\setup-env.bat

# 3. Restart terminal, then run:
powershell -ExecutionPolicy Bypass -File .\setup-windows-dev.ps1

# 4. Configure environment
copy .env.example backend\.env
# Edit backend\.env with your API keys

# 5. Start services
docker-compose up -d

# 6. Install dependencies
cd backend && npm install && npx prisma generate
cd ..\frontend && npm install

# 7. Start development servers
.\start-dev.ps1
```

**Access the application:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Documentation: http://localhost:3000/api/docs

---

## Project Structure

```
shopify-seo-platform/
├── backend/                 # NestJS backend API
│   ├── src/
│   │   ├── services/       # Business logic services
│   │   ├── controllers/    # API route controllers
│   │   ├── middleware/     # Custom middleware
│   │   ├── guards/         # Auth & permission guards
│   │   ├── types/          # TypeScript type definitions
│   │   └── database/       # Database connection & utilities
│   ├── prisma/             # Database schema & migrations
│   └── test/               # Unit & E2E tests
│
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── contexts/      # React context providers
│   │   ├── types/         # TypeScript types
│   │   └── utils/         # Utility functions
│   └── public/            # Static assets
│
├── infrastructure/         # Infrastructure as Code
│   ├── terraform/         # AWS Terraform configs
│   └── docker/            # Docker configurations
│
├── docs/                  # Documentation
│   ├── WINDOWS_SETUP.md   # Windows setup guide
│   ├── ARCHITECTURE.md    # System architecture
│   └── API_DOCUMENTATION.md
│
├── .env.example           # Environment variables template
├── docker-compose.yml     # Local development services
├── setup-windows-dev.ps1  # Automated setup script
├── start-dev.ps1          # Start development servers
└── stop-dev.ps1           # Stop development servers
```

---

## Technology Stack

### Backend
- **Framework:** NestJS 10 + TypeScript 5.3
- **Database:** PostgreSQL 16 (Prisma ORM)
- **Cache:** Redis 7 (ioredis)
- **Queue:** BullMQ
- **Testing:** Jest + Supertest

### Frontend
- **Framework:** React 18 + TypeScript 5.3
- **UI Library:** Shopify Polaris
- **Auth:** @shopify/app-bridge 4.x
- **State Management:** Zustand + React Query 5
- **Build Tool:** Vite 5

### Infrastructure
- **Cloud:** AWS (ECS Fargate, RDS Aurora, ElastiCache)
- **IaC:** Terraform
- **CI/CD:** GitHub Actions
- **Monitoring:** DataDog + Sentry + CloudWatch

---

## Development

### Available Scripts

```powershell
# Start all services
.\start-dev.ps1

# Stop all services
.\stop-dev.ps1

# Validate environment configuration
.\check-env.ps1

# Backend commands
cd backend
npm run dev          # Start development server
npm run build        # Build for production
npm test             # Run tests
npm run lint         # Lint code
npx prisma studio    # Open database GUI
npx prisma migrate dev  # Create migration

# Frontend commands
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Lint code
```

### Environment Variables

Copy `.env.example` to `backend\.env` and configure:

**Required:**
- `SHOPIFY_API_KEY` - From Shopify Partners dashboard
- `SHOPIFY_API_SECRET` - From Shopify Partners dashboard
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `OPENAI_API_KEY` - From OpenAI platform
- `JWT_SECRET` - Generate with `openssl rand -base64 64`
- `ENCRYPTION_KEY` - Generate with `openssl rand -base64 32`
- `SESSION_SECRET` - Generate with `openssl rand -base64 64`

**Optional (for full features):**
- `ANTHROPIC_API_KEY` - For Claude AI
- `GOOGLE_SEARCH_CONSOLE_CLIENT_ID` - For GSC integration
- `DATAFORSEO_LOGIN` - For keyword research
- `SEMRUSH_API_KEY` - For competitive analysis

See [docs/WINDOWS_SETUP.md](docs/WINDOWS_SETUP.md) for detailed configuration.

---

## Testing

### Unit Tests

```powershell
# Backend
cd backend
npm test

# With coverage
npm run test:cov

# Watch mode
npm run test:watch
```

### Integration Tests

```powershell
cd backend
npm run test:e2e
```

### Manual Testing

1. Install app on test Shopify store
2. Sync products from Shopify
3. Generate AI content for products
4. Review and publish to Shopify
5. Verify changes in Shopify admin

---

## Deployment

### Development

```powershell
# Deploy to dev environment
git push origin develop
# GitHub Actions will deploy automatically
```

### Staging

```powershell
# Deploy to staging
git push origin staging
# Manual approval required in GitHub Actions
```

### Production

```powershell
# Deploy to production
git checkout main
git merge develop
git push origin main
# Manual approval + smoke tests required
```

See [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) for detailed procedures.

---

## Documentation

- **[Windows Setup Guide](docs/WINDOWS_SETUP.md)** - Complete setup instructions for Windows 11
- **[Architecture Overview](docs/ARCHITECTURE.md)** - System design and architecture
- **[API Documentation](docs/API_DOCUMENTATION.md)** - REST API reference
- **[Development Guide](docs/DEVELOPMENT_GUIDE.md)** - Contributing guidelines
- **[Security Policy](docs/SECURITY.md)** - Security best practices

---

## Troubleshooting

### Common Issues

**Port already in use:**
```powershell
netstat -ano | findstr :3000
taskkill /F /PID <PID>
```

**Docker not starting:**
1. Open Docker Desktop
2. Wait for whale icon in system tray
3. Run `docker ps` to verify

**Database connection failed:**
```powershell
docker-compose up -d postgres
docker logs shopify-seo-postgres
```

**Prisma client errors:**
```powershell
cd backend
npx prisma generate
npm install
```

See [docs/WINDOWS_SETUP.md#troubleshooting](docs/WINDOWS_SETUP.md#troubleshooting) for more solutions.

---

## Performance

### Targets

- **API Latency:** <500ms P95
- **Uptime:** 99.9% SLA
- **Concurrent Users:** 50+ supported
- **Product Capacity:** 1M+ products
- **Bulk Processing:** 1000+ products/minute

### Optimization

- Connection pooling (20 connections)
- Redis caching (24-hour TTL)
- Queue-based background processing
- CDN for static assets (CloudFront)
- Database indexing on high-traffic queries

---

## Security

- ✅ AES-256 encryption for sensitive data
- ✅ JWT-based authentication with refresh tokens
- ✅ RBAC (Role-Based Access Control)
- ✅ HMAC verification for Shopify webhooks
- ✅ Rate limiting (100 requests/minute per user)
- ✅ CORS protection
- ✅ SQL injection prevention (Prisma ORM)
- ✅ XSS protection (React + Content Security Policy)
- ✅ GDPR compliance (data export, deletion, consent)
- ✅ Audit logging for all sensitive operations

---

## Monitoring & Observability

- **DataDog** - APM, infrastructure metrics, custom dashboards
- **Sentry** - Error tracking, performance monitoring
- **CloudWatch** - AWS infrastructure logs and metrics
- **Prisma** - Database query performance
- **Custom Metrics** - Business KPIs, feature adoption

---

## Support

- **Documentation:** [docs/](docs/)
- **Email:** dev-support@example.com
- **Slack:** #shopify-seo-dev
- **Issues:** [GitHub Issues](https://github.com/your-org/shopify-seo-platform/issues)

---

## License

Proprietary - All Rights Reserved

Copyright © 2026 Your Company Name

---

## Contributors

Built by the 8-agent development team:
- Windows System Specialist
- Database/Backend Specialist
- Frontend/React Specialist
- API Integration Specialist
- Workflow/Automation Specialist
- Security/Authentication Specialist
- DevOps/Deployment Specialist
- Documentation/Architecture Specialist

---

**Last Updated:** January 2026
