# Windows Development Setup Guide

**Shopify SEO Automation Platform**
**Version:** 1.0.0
**Last Updated:** January 2026
**Platform:** Windows 11

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Detailed Setup Instructions](#detailed-setup-instructions)
4. [Environment Configuration](#environment-configuration)
5. [Running the Application](#running-the-application)
6. [Troubleshooting](#troubleshooting)
7. [Windows-Specific Considerations](#windows-specific-considerations)
8. [Development Workflow](#development-workflow)

---

## Prerequisites

### Required Software

| Software | Version | Download Link | Notes |
|----------|---------|---------------|-------|
| **Node.js** | 18.x or higher | [nodejs.org](https://nodejs.org/) | Install to `C:\Program Files\nodejs` |
| **Git** | Latest | [git-scm.com](https://git-scm.com/download/win) | Install to `C:\Program Files\Git` |
| **Python** | 3.13.x | [python.org](https://www.python.org/) | Optional, for some features |
| **Docker Desktop** | Latest | [docker.com](https://www.docker.com/products/docker-desktop) | Recommended for local DB |

### Recommended Software

| Software | Purpose | Download Link |
|----------|---------|---------------|
| **Visual Studio Code** | Code editor | [code.visualstudio.com](https://code.visualstudio.com/) |
| **Windows Terminal** | Modern terminal | Microsoft Store |
| **PowerShell 7+** | Enhanced PowerShell | [github.com/PowerShell](https://github.com/PowerShell/PowerShell) |
| **Postman** | API testing | [postman.com](https://www.postman.com/) |

### System Requirements

- **OS:** Windows 11 (Windows 10 21H2+ also supported)
- **RAM:** 8GB minimum, 16GB recommended
- **Storage:** 10GB free space
- **CPU:** 64-bit processor, 2+ cores

---

## Quick Start

### Option 1: Automated Setup (Recommended)

```powershell
# 1. Clone the repository (if not already done)
git clone https://github.com/your-org/shopify-seo-platform.git
cd shopify-seo-platform

# 2. Run environment setup (as Administrator)
.\setup-env.bat

# 3. Restart your terminal, then run:
powershell -ExecutionPolicy Bypass -File .\setup-windows-dev.ps1

# 4. Copy and configure environment variables
copy .env.example backend\.env
# Edit backend\.env with your API keys

# 5. Start Docker services
docker-compose up -d

# 6. Install dependencies
cd backend
npm install
npx prisma generate

cd ..\frontend
npm install

# 7. Start development servers
# Terminal 1 (Backend):
cd backend
npm run dev

# Terminal 2 (Frontend):
cd frontend
npm run dev
```

### Option 2: Manual Setup

Follow the [Detailed Setup Instructions](#detailed-setup-instructions) below.

---

## Detailed Setup Instructions

### Step 1: Install Prerequisites

#### Node.js Installation

1. Download Node.js LTS from [nodejs.org](https://nodejs.org/)
2. Run the installer: `node-v18.x.x-x64.msi`
3. **Important:** Check "Add to PATH" during installation
4. Verify installation:

```powershell
node --version
# Should show: v18.x.x or higher

npm --version
# Should show: 9.x.x or higher
```

#### Git Installation

1. Download Git from [git-scm.com](https://git-scm.com/download/win)
2. Run installer with recommended settings
3. Select "Git from the command line and also from 3rd-party software"
4. Verify installation:

```powershell
git --version
# Should show: git version 2.x.x
```

#### Docker Desktop Installation (Recommended)

1. Download Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop)
2. Run installer and restart computer when prompted
3. Start Docker Desktop
4. Verify installation:

```powershell
docker --version
# Should show: Docker version 20.x.x or higher

docker-compose --version
# Should show: Docker Compose version 2.x.x or higher
```

### Step 2: Clone Repository

```powershell
# Navigate to your development directory
cd C:\Users\YourUsername\Development

# Clone the repository
git clone https://github.com/your-org/shopify-seo-platform.git

# Navigate to project directory
cd shopify-seo-platform
```

### Step 3: Environment Setup

#### Run Setup Scripts

```powershell
# 1. Run environment variable setup (as Administrator)
# Right-click PowerShell/Terminal → "Run as Administrator"
.\setup-env.bat

# 2. Restart your terminal to apply PATH changes

# 3. Run development environment setup
powershell -ExecutionPolicy Bypass -File .\setup-windows-dev.ps1
```

#### Configure Environment Variables

```powershell
# Copy environment template
copy .env.example backend\.env

# Open in your editor (VS Code example)
code backend\.env
```

**Required variables to fill in:**

```env
# Shopify (from Shopify Partners dashboard)
SHOPIFY_API_KEY=your_actual_key_here
SHOPIFY_API_SECRET=your_actual_secret_here

# Database (use default for local development)
DATABASE_URL=postgresql://postgres:password@localhost:5432/shopify_seo_dev

# Redis (use default for local development)
REDIS_URL=redis://localhost:6379

# OpenAI (from platform.openai.com)
OPENAI_API_KEY=sk-your_actual_key_here

# Security (generate with: openssl rand -base64 64)
JWT_SECRET=your_generated_secret_here
ENCRYPTION_KEY=your_generated_key_here
SESSION_SECRET=your_generated_session_secret_here
```

**Generate secure keys (using Git Bash):**

```bash
# Generate JWT secret
openssl rand -base64 64

# Generate encryption key
openssl rand -base64 32

# Generate session secret
openssl rand -base64 64
```

### Step 4: Start Local Services

#### Using Docker (Recommended)

```powershell
# Start PostgreSQL and Redis
docker-compose up -d

# Verify services are running
docker ps
# Should show: shopify-seo-postgres, shopify-seo-redis

# View logs
docker-compose logs -f
```

#### Manual Installation (Alternative)

**PostgreSQL:**
1. Download from [postgresql.org](https://www.postgresql.org/download/windows/)
2. Install with default settings
3. Set password to `password` (for development)
4. Create database: `CREATE DATABASE shopify_seo_dev;`

**Redis:**
1. Download from [github.com/microsoftarchive/redis](https://github.com/microsoftarchive/redis/releases)
2. Extract to `C:\Redis`
3. Run `redis-server.exe`

### Step 5: Install Dependencies

```powershell
# Install backend dependencies
cd backend
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Install frontend dependencies
cd ..\frontend
npm install
```

### Step 6: Verify Setup

```powershell
# Check backend
cd backend
npm run build
# Should complete without errors

# Check frontend
cd ..\frontend
npm run build
# Should complete without errors
```

---

## Environment Configuration

### Database Configuration

**Connection String Format:**
```
postgresql://[user]:[password]@[host]:[port]/[database]?schema=public
```

**Example configurations:**

```env
# Local Docker
DATABASE_URL=postgresql://postgres:password@localhost:5432/shopify_seo_dev

# Local PostgreSQL installation
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/shopify_seo_dev

# Production (AWS RDS)
DATABASE_URL=postgresql://admin:securepass@shopify-seo-db.abc.us-east-1.rds.amazonaws.com:5432/shopify_seo_prod
```

### Redis Configuration

```env
# Local Docker
REDIS_URL=redis://localhost:6379

# With password
REDIS_URL=redis://:yourpassword@localhost:6379

# Production (AWS ElastiCache)
REDIS_URL=redis://shopify-seo-cache.abc.cache.amazonaws.com:6379
```

### API Keys Setup

#### Shopify App Configuration

1. Go to [Shopify Partners](https://partners.shopify.com/)
2. Create new app or select existing app
3. Navigate to "App setup" → "Client credentials"
4. Copy API Key and API Secret

```env
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_SCOPES=read_products,write_products,read_content,write_content
```

#### OpenAI Configuration

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create new secret key
3. Copy and save immediately (shown only once)

```env
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=1000
```

#### Google Search Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable "Google Search Console API"
4. Create OAuth 2.0 credentials
5. Configure authorized redirect URIs

```env
GOOGLE_SEARCH_CONSOLE_CLIENT_ID=123456789.apps.googleusercontent.com
GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET=your_client_secret
GOOGLE_SEARCH_CONSOLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

---

## Running the Application

### Development Mode

**Option 1: Separate Terminals**

```powershell
# Terminal 1 - Backend
cd C:\Users\YourUsername\Development\shopify-seo-platform\backend
npm run dev
# Backend runs on: http://localhost:3000
# API docs: http://localhost:3000/api/docs

# Terminal 2 - Frontend
cd C:\Users\YourUsername\Development\shopify-seo-platform\frontend
npm run dev
# Frontend runs on: http://localhost:5173
```

**Option 2: PowerShell Script (Run Both)**

Create `start-dev.ps1`:

```powershell
# Start backend in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev"

# Wait 5 seconds for backend to start
Start-Sleep -Seconds 5

# Start frontend in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "Development servers starting..."
Write-Host "Backend: http://localhost:3000"
Write-Host "Frontend: http://localhost:5173"
```

Run with: `powershell -File start-dev.ps1`

### Production Build

```powershell
# Build backend
cd backend
npm run build
npm run start:prod

# Build frontend
cd ..\frontend
npm run build
npm run preview
```

### Database Management

```powershell
cd backend

# Open Prisma Studio (Database GUI)
npx prisma studio
# Opens at: http://localhost:5555

# Create new migration
npx prisma migrate dev --name your_migration_name

# Reset database (WARNING: Deletes all data)
npx prisma migrate reset

# Seed database with test data
npx prisma db seed
```

### Redis Management

```powershell
# Using Redis Commander (if Docker Compose is running)
# Open browser: http://localhost:8081

# Using redis-cli (if Redis CLI is installed)
redis-cli
> PING
# Should return: PONG
> KEYS *
# List all keys
> FLUSHALL
# Clear all data (development only)
```

---

## Troubleshooting

### Common Issues

#### Issue 1: "npm is not recognized"

**Cause:** Node.js not in PATH

**Solution:**
```powershell
# Verify Node.js installation path
where.exe node
# Should show: C:\Program Files\nodejs\node.exe

# If not found, add to PATH manually:
$env:Path += ";C:\Program Files\nodejs"

# Make permanent (as Administrator):
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\nodejs", "Machine")

# Restart terminal
```

#### Issue 2: "Docker daemon is not running"

**Cause:** Docker Desktop not started

**Solution:**
1. Open Docker Desktop application
2. Wait for Docker to fully start (whale icon in system tray)
3. Verify: `docker ps` should not show error

#### Issue 3: Prisma errors - "Cannot find module '@prisma/client'"

**Cause:** Prisma client not generated

**Solution:**
```powershell
cd backend
npx prisma generate
npm install
```

#### Issue 4: Port already in use

**Cause:** Another process using port 3000 or 5173

**Solution:**
```powershell
# Find process using port 3000
netstat -ano | findstr :3000
# Note the PID (last column)

# Kill the process (replace <PID> with actual number)
taskkill /F /PID <PID>

# Or change port in .env
# For backend: PORT=3001
# For frontend: edit vite.config.ts → server.port = 5174
```

#### Issue 5: Database connection failed

**Cause:** PostgreSQL not running or wrong credentials

**Solution:**
```powershell
# Check if Docker container is running
docker ps | findstr postgres

# If not running, start Docker Compose
docker-compose up -d postgres

# Check logs
docker logs shopify-seo-postgres

# Verify connection string in .env
# DATABASE_URL=postgresql://postgres:password@localhost:5432/shopify_seo_dev
```

#### Issue 6: "execution of scripts is disabled"

**Cause:** PowerShell execution policy

**Solution:**
```powershell
# Check current policy
Get-ExecutionPolicy

# Set policy to allow scripts (as Administrator)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Or run script with bypass
powershell -ExecutionPolicy Bypass -File .\setup-windows-dev.ps1
```

#### Issue 7: TypeScript compilation errors

**Cause:** Version mismatch or missing dependencies

**Solution:**
```powershell
# Clear node_modules and reinstall
cd backend
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install

# Verify TypeScript version
npx tsc --version
# Should be 5.3.x
```

#### Issue 8: CORS errors in browser

**Cause:** Frontend and backend on different origins

**Solution:**

Check `backend/.env`:
```env
CORS_ORIGIN=http://localhost:5173
```

Or update in `backend/src/main.ts`:
```typescript
app.enableCors({
  origin: 'http://localhost:5173',
  credentials: true,
});
```

---

## Windows-Specific Considerations

### File Paths

**Always use backslashes in Windows:**
```powershell
# Correct
cd C:\Users\YourUsername\shopify-seo-platform\backend

# Incorrect (will work in PowerShell but inconsistent)
cd C:/Users/YourUsername/shopify-seo-platform/backend
```

**In code, use path module:**
```typescript
// Correct (cross-platform)
import path from 'path';
const filePath = path.join(__dirname, 'uploads', 'file.txt');

// Incorrect (Unix-only)
const filePath = __dirname + '/uploads/file.txt';
```

### Line Endings

Configure Git to handle Windows line endings:

```powershell
# Set globally (recommended)
git config --global core.autocrlf true

# Verify
git config --get core.autocrlf
# Should return: true
```

Add `.gitattributes` to project root:
```
* text=auto
*.js text eol=lf
*.ts text eol=lf
*.json text eol=lf
*.md text eol=lf
*.sh text eol=lf
*.bat text eol=crlf
*.ps1 text eol=crlf
```

### Environment Variables

**PowerShell syntax:**
```powershell
# Temporary (current session)
$env:NODE_ENV = "development"

# Permanent (current user)
[Environment]::SetEnvironmentVariable("NODE_ENV", "development", "User")

# Permanent (system-wide, requires Administrator)
[Environment]::SetEnvironmentVariable("NODE_ENV", "development", "Machine")
```

**Command Prompt syntax:**
```cmd
REM Temporary
set NODE_ENV=development

REM Permanent
setx NODE_ENV "development"
```

### Windows Defender / Antivirus

Add exclusions to improve performance:

1. Open Windows Security
2. Go to "Virus & threat protection"
3. Click "Manage settings" → "Add or remove exclusions"
4. Add these folders:
   - `C:\Users\YourUsername\shopify-seo-platform`
   - `C:\Users\YourUsername\AppData\Roaming\npm`
   - `C:\Program Files\nodejs`

### Performance Optimization

**Disable Windows Search indexing for node_modules:**

```powershell
# Run as Administrator
Add-MpPreference -ExclusionPath "C:\Users\YourUsername\shopify-seo-platform\backend\node_modules"
Add-MpPreference -ExclusionPath "C:\Users\YourUsername\shopify-seo-platform\frontend\node_modules"
```

**Use npm ci instead of npm install in CI/CD:**
```powershell
# Faster, uses package-lock.json exactly
npm ci
```

---

## Development Workflow

### Daily Workflow

```powershell
# 1. Pull latest changes
git pull origin develop

# 2. Install new dependencies (if package.json changed)
cd backend && npm install
cd ..\frontend && npm install

# 3. Run database migrations (if schema changed)
cd backend
npx prisma migrate dev

# 4. Start Docker services
docker-compose up -d

# 5. Start development servers
# Terminal 1: cd backend && npm run dev
# Terminal 2: cd frontend && npm run dev

# 6. Make changes and test

# 7. Run tests before committing
cd backend && npm test
cd ..\frontend && npm test

# 8. Commit and push
git add .
git commit -m "feat: your feature description"
git push origin your-branch-name
```

### Testing

```powershell
# Backend tests
cd backend

# Run all tests
npm test

# Run with coverage
npm run test:cov

# Run specific test file
npm test -- auth.service.spec.ts

# Watch mode
npm run test:watch

# E2E tests
npm run test:e2e
```

```powershell
# Frontend tests (when configured)
cd frontend

# Run all tests
npm test

# Watch mode
npm test -- --watch
```

### Debugging

**VS Code Launch Configuration** (`.vscode/launch.json`):

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "start:debug"],
      "cwd": "${workspaceFolder}\\backend",
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "type": "chrome",
      "request": "launch",
      "name": "Debug Frontend",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}\\frontend\\src"
    }
  ]
}
```

### Code Quality

```powershell
# Lint code
cd backend
npm run lint

# Format code
npm run format

# Type check
cd ..\frontend
npm run type-check
```

---

## Additional Resources

### Documentation
- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [React Documentation](https://react.dev/)
- [Shopify API Documentation](https://shopify.dev/docs/api)

### Tools
- [Prisma Studio](https://www.prisma.io/studio) - Database GUI
- [Redis Commander](http://joeferner.github.io/redis-commander/) - Redis GUI
- [Postman](https://www.postman.com/) - API testing
- [TablePlus](https://tableplus.com/) - Database client

### Support
- Internal Wiki: [Coming Soon]
- Slack Channel: #shopify-seo-dev
- Email: dev-support@example.com

---

**Last Updated:** January 2026
**Maintained by:** Windows System Specialist Agent
