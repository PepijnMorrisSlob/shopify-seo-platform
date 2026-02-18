# Quick Reference Guide

**Shopify SEO Automation Platform - Windows Development**

---

## Daily Commands

### Start Development

```powershell
# Quick start (starts everything)
.\start-dev.ps1

# Manual start
docker-compose up -d
cd backend && npm run dev      # Terminal 1
cd frontend && npm run dev     # Terminal 2
```

### Stop Development

```powershell
# Quick stop
.\stop-dev.ps1

# Manual stop
docker-compose down
# Close terminal windows running dev servers
```

---

## Common Tasks

### Environment Setup

```powershell
# Validate configuration
.\check-env.ps1

# Generate secure keys (Git Bash)
openssl rand -base64 64    # JWT_SECRET
openssl rand -base64 32    # ENCRYPTION_KEY
openssl rand -base64 64    # SESSION_SECRET
```

### Database Operations

```powershell
cd backend

# Open database GUI
npx prisma studio
# Opens at: http://localhost:5555

# Create new migration
npx prisma migrate dev --name migration_name

# Reset database (WARNING: Deletes all data)
npx prisma migrate reset

# Regenerate Prisma client
npx prisma generate

# View migration status
npx prisma migrate status
```

### Docker Services

```powershell
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d postgres
docker-compose up -d redis

# View logs
docker-compose logs -f
docker-compose logs -f postgres
docker-compose logs -f redis

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# View running containers
docker ps

# Restart service
docker-compose restart postgres
```

### Dependencies

```powershell
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd frontend
npm install

# Install new package
npm install package-name
npm install --save-dev package-name  # Dev dependency

# Update all dependencies
npm update

# Check for outdated packages
npm outdated
```

---

## Testing

### Backend Tests

```powershell
cd backend

# Run all tests
npm test

# Run with coverage
npm run test:cov
# Report at: coverage/lcov-report/index.html

# Run specific test file
npm test -- auth.service.spec.ts

# Watch mode (re-runs on changes)
npm run test:watch

# E2E tests
npm run test:e2e

# Debug tests
npm run test:debug
# Then attach debugger at chrome://inspect
```

### Frontend Tests

```powershell
cd frontend

# Run tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

---

## Code Quality

### Linting

```powershell
# Backend
cd backend
npm run lint
npm run lint -- --fix  # Auto-fix issues

# Frontend
cd frontend
npm run lint
npm run lint -- --fix
```

### Formatting

```powershell
# Backend
cd backend
npm run format

# Frontend
cd frontend
npm run format
```

### Type Checking

```powershell
# Frontend
cd frontend
npm run type-check
```

---

## Git Workflow

### Daily Workflow

```powershell
# Pull latest changes
git pull origin develop

# Create feature branch
git checkout -b feature/your-feature-name

# Stage changes
git add .
git add path/to/specific/file

# Commit
git commit -m "feat: your feature description"

# Push
git push origin feature/your-feature-name

# Update branch with latest develop
git checkout develop
git pull
git checkout feature/your-feature-name
git merge develop
```

### Commit Message Format

```
type(scope): subject

body (optional)

footer (optional)
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Code style (formatting, semicolons)
- `refactor` - Code refactoring
- `test` - Adding tests
- `chore` - Maintenance tasks

**Examples:**
```
feat(auth): implement Shopify OAuth flow
fix(content): resolve AI generation timeout
docs(setup): update Windows installation guide
refactor(database): optimize product query performance
```

---

## API Testing

### Using Postman

1. Import collection from `docs/postman-collection.json`
2. Set environment variables:
   - `BASE_URL`: http://localhost:3000
   - `ACCESS_TOKEN`: (obtain from login endpoint)

### Using curl (PowerShell)

```powershell
# Health check
curl http://localhost:3000/health

# Login
$body = @{
    email = "admin@example.com"
    password = "password"
} | ConvertTo-Json

curl -Method POST `
  -Uri "http://localhost:3000/api/auth/login" `
  -ContentType "application/json" `
  -Body $body

# With authentication
$token = "your_jwt_token"
curl -Headers @{"Authorization"="Bearer $token"} `
  http://localhost:3000/api/products
```

---

## Debugging

### Backend Debugging (VS Code)

1. Open VS Code in backend folder
2. Press F5 or go to Run & Debug
3. Select "Debug Backend"
4. Set breakpoints in code
5. Request API endpoint to trigger breakpoint

### Frontend Debugging (Browser)

1. Open http://localhost:5173
2. Open browser DevTools (F12)
3. Go to Sources tab
4. Set breakpoints in source code
5. Trigger the code path

### Database Debugging

```powershell
# View raw SQL queries (enable in Prisma)
# Add to schema.prisma:
# generator client {
#   provider = "prisma-client-js"
#   previewFeatures = ["tracing"]
# }

# Then set env variable:
$env:DEBUG = "prisma:query"

# Start backend to see SQL queries
npm run dev
```

---

## Performance Profiling

### Backend Performance

```powershell
# Start with profiling
node --inspect backend/dist/main.js

# Open Chrome DevTools
# Go to: chrome://inspect
# Click "Open dedicated DevTools for Node"
# Use Profiler tab
```

### Frontend Performance

1. Open http://localhost:5173
2. Open DevTools (F12)
3. Go to Performance tab
4. Click Record
5. Interact with app
6. Stop recording
7. Analyze flame graph

---

## Troubleshooting Quick Fixes

### Port Already in Use

```powershell
# Find process on port 3000
netstat -ano | findstr :3000

# Kill process (replace <PID>)
taskkill /F /PID <PID>
```

### Docker Issues

```powershell
# Restart Docker Desktop
# Wait for whale icon in system tray

# Reset Docker
docker system prune -a
docker volume prune
docker-compose up -d
```

### npm Issues

```powershell
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### Prisma Issues

```powershell
cd backend

# Regenerate client
npx prisma generate

# Reset and regenerate
npx prisma migrate reset
npx prisma generate
```

### Build Errors

```powershell
# Backend
cd backend
Remove-Item -Recurse -Force dist
npm run build

# Frontend
cd frontend
Remove-Item -Recurse -Force dist
npm run build
```

---

## Useful URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:5173 | React application |
| Backend | http://localhost:3000 | API server |
| API Docs | http://localhost:3000/api/docs | Swagger documentation |
| Prisma Studio | http://localhost:5555 | Database GUI |
| Redis Commander | http://localhost:8081 | Redis GUI |
| PostgreSQL | localhost:5432 | Database connection |
| Redis | localhost:6379 | Cache connection |

---

## File Locations

```
Project Root: C:\Users\YourUsername\shopify-seo-platform

Important Files:
├── .env.example              # Environment template
├── backend\.env              # Backend config (create from .env.example)
├── docker-compose.yml        # Local services config
├── setup-windows-dev.ps1     # Setup script
├── start-dev.ps1             # Start script
├── stop-dev.ps1              # Stop script
├── check-env.ps1             # Env validator
└── docs\WINDOWS_SETUP.md     # Full setup guide
```

---

## Environment Variables Cheat Sheet

### Required
```env
SHOPIFY_API_KEY=            # From Shopify Partners
SHOPIFY_API_SECRET=         # From Shopify Partners
DATABASE_URL=               # PostgreSQL connection
REDIS_URL=                  # Redis connection
OPENAI_API_KEY=            # From OpenAI
JWT_SECRET=                # Generate with openssl
ENCRYPTION_KEY=            # Generate with openssl
SESSION_SECRET=            # Generate with openssl
```

### Development Defaults
```env
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/shopify_seo_dev
REDIS_URL=redis://localhost:6379
```

---

## Support Resources

- **Full Setup Guide:** `docs\WINDOWS_SETUP.md`
- **Architecture:** `docs\ARCHITECTURE.md`
- **API Docs:** `docs\API_DOCUMENTATION.md`
- **Troubleshooting:** `docs\WINDOWS_SETUP.md#troubleshooting`

---

**Last Updated:** January 2026
