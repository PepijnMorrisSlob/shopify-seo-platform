<#
.SYNOPSIS
    Shopify SEO Automation Platform - Windows Development Environment Setup
.DESCRIPTION
    This script sets up the complete development environment on Windows 11.
    It checks prerequisites, installs dependencies, and configures the environment.
.NOTES
    Author: Windows System Specialist Agent
    Version: 1.0.0
    Requires: PowerShell 5.1 or higher, Administrator privileges
#>

#Requires -RunAsAdministrator

# Script configuration
$ErrorActionPreference = "Stop"
$ProgressPreference = "Continue"

# Color output functions
function Write-Success { Write-Host "✓ $args" -ForegroundColor Green }
function Write-Info { Write-Host "ℹ $args" -ForegroundColor Cyan }
function Write-Warning { Write-Host "⚠ $args" -ForegroundColor Yellow }
function Write-Error { Write-Host "✗ $args" -ForegroundColor Red }

# Project paths
$ProjectRoot = $PSScriptRoot
$BackendPath = Join-Path $ProjectRoot "backend"
$FrontendPath = Join-Path $ProjectRoot "frontend"
$InfrastructurePath = Join-Path $ProjectRoot "infrastructure"
$DocsPath = Join-Path $ProjectRoot "docs"

Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "  Shopify SEO Platform - Setup Script" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

# Step 1: Check prerequisites
Write-Info "Step 1/8: Checking prerequisites..."

# Check Node.js
try {
    $nodeVersion = & "C:\Program Files\nodejs\node.exe" --version 2>$null
    if ($nodeVersion -match "v(\d+)\.") {
        $nodeMajor = [int]$matches[1]
        if ($nodeMajor -ge 18) {
            Write-Success "Node.js $nodeVersion detected"
        } else {
            Write-Error "Node.js version must be 18 or higher. Current: $nodeVersion"
            exit 1
        }
    }
} catch {
    Write-Error "Node.js not found at C:\Program Files\nodejs\node.exe"
    Write-Warning "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
}

# Check npm
try {
    $npmVersion = & "C:\Program Files\nodejs\npm.cmd" --version 2>$null
    Write-Success "npm $npmVersion detected"
} catch {
    Write-Error "npm not found"
    exit 1
}

# Check Python
try {
    $pythonVersion = & "C:\Program Files\Python313\python.exe" --version 2>$null
    Write-Success "$pythonVersion detected"
} catch {
    Write-Warning "Python 3.13 not found (optional for some features)"
}

# Check Git
try {
    $gitVersion = & "C:\Program Files\Git\cmd\git.exe" --version 2>$null
    Write-Success "$gitVersion detected"
} catch {
    Write-Error "Git not found at C:\Program Files\Git\cmd\git.exe"
    Write-Warning "Please install Git from https://git-scm.com/download/win"
    exit 1
}

# Step 2: Check Docker Desktop (optional for local development)
Write-Info "`nStep 2/8: Checking Docker Desktop..."
try {
    $dockerVersion = & docker --version 2>$null
    Write-Success "$dockerVersion detected"
    $dockerAvailable = $true
} catch {
    Write-Warning "Docker Desktop not found (optional, but recommended)"
    Write-Info "Install from: https://www.docker.com/products/docker-desktop"
    $dockerAvailable = $false
}

# Step 3: Install global npm packages
Write-Info "`nStep 3/8: Installing global npm packages..."

$globalPackages = @(
    "@nestjs/cli@10",
    "prisma@5",
    "typescript@5.3",
    "ts-node@10",
    "nodemon@3",
    "eslint@8",
    "prettier@3"
)

foreach ($package in $globalPackages) {
    Write-Info "Installing $package..."
    try {
        & "C:\Program Files\nodejs\npm.cmd" install -g $package --quiet 2>&1 | Out-Null
        Write-Success "$package installed"
    } catch {
        Write-Warning "Failed to install $package (may already be installed)"
    }
}

# Step 4: Create project structure
Write-Info "`nStep 4/8: Creating project directory structure..."

$directories = @(
    $BackendPath,
    "$BackendPath\src",
    "$BackendPath\src\services",
    "$BackendPath\src\controllers",
    "$BackendPath\src\middleware",
    "$BackendPath\src\guards",
    "$BackendPath\src\types",
    "$BackendPath\src\database",
    "$BackendPath\src\queues",
    "$BackendPath\prisma",
    "$BackendPath\prisma\migrations",
    "$BackendPath\test",
    $FrontendPath,
    "$FrontendPath\src",
    "$FrontendPath\src\pages",
    "$FrontendPath\src\components",
    "$FrontendPath\src\hooks",
    "$FrontendPath\src\contexts",
    "$FrontendPath\src\types",
    "$FrontendPath\src\utils",
    "$FrontendPath\public",
    $InfrastructurePath,
    "$InfrastructurePath\terraform",
    "$InfrastructurePath\docker",
    "$DocsPath"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Success "Created: $dir"
    } else {
        Write-Info "Already exists: $dir"
    }
}

# Step 5: Create .env.example file
Write-Info "`nStep 5/8: Creating environment template (.env.example)..."

$envTemplate = @"
# ========================================
# Shopify SEO Automation Platform
# Environment Variables Template
# ========================================
# INSTRUCTIONS:
# 1. Copy this file to .env in the backend directory
# 2. Fill in all required values
# 3. NEVER commit .env to version control
# ========================================

# ----------------------------------------
# Shopify Configuration
# ----------------------------------------
# Get these from: https://partners.shopify.com/
SHOPIFY_API_KEY=your_shopify_api_key_here
SHOPIFY_API_SECRET=your_shopify_api_secret_here
SHOPIFY_SCOPES=read_products,write_products,read_content,write_content
SHOPIFY_APP_URL=https://your-app.example.com

# ----------------------------------------
# Database Configuration (PostgreSQL)
# ----------------------------------------
# Production: Use AWS RDS Aurora PostgreSQL
# Development: Use Docker (see docker-compose.yml)
DATABASE_URL=postgresql://postgres:password@localhost:5432/shopify_seo_dev
DATABASE_POOL_SIZE=20
DATABASE_TIMEOUT=30000

# ----------------------------------------
# Redis Configuration (Cache & Queues)
# ----------------------------------------
# Production: Use AWS ElastiCache
# Development: Use Docker
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_TTL=86400

# ----------------------------------------
# AI Services Configuration
# ----------------------------------------
# OpenAI (Primary for content generation)
# Get from: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your_openai_key_here
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.7

# Anthropic Claude (Secondary AI model)
# Get from: https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-your_anthropic_key_here

# Perplexity AI (Research & fact-checking)
# Get from: https://www.perplexity.ai/settings/api
PERPLEXITY_API_KEY=pplx-your_perplexity_key_here

# ----------------------------------------
# SEO Tools Integration
# ----------------------------------------
# Google Search Console
# Setup: https://console.cloud.google.com/
GOOGLE_SEARCH_CONSOLE_CLIENT_ID=your_gsc_client_id.apps.googleusercontent.com
GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET=your_gsc_client_secret
GOOGLE_SEARCH_CONSOLE_REDIRECT_URI=https://your-app.example.com/api/auth/google/callback

# DataForSEO (Keyword research, SERP analysis)
# Get from: https://dataforseo.com/
DATAFORSEO_LOGIN=your_dataforseo_login
DATAFORSEO_PASSWORD=your_dataforseo_password
DATAFORSEO_API_ENDPOINT=https://api.dataforseo.com/v3

# SEMrush (Competitive analysis)
# Get from: https://www.semrush.com/api-documentation/
SEMRUSH_API_KEY=your_semrush_api_key

# Ahrefs (Backlink analysis)
# Get from: https://ahrefs.com/api
AHREFS_API_KEY=your_ahrefs_api_key

# ----------------------------------------
# AWS Configuration
# ----------------------------------------
# Required for production deployment
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=your_aws_secret_key

# S3 (Content storage)
S3_BUCKET_NAME=shopify-seo-content-prod
S3_REGION=us-east-1

# SQS (Webhook queue)
SQS_WEBHOOK_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789/shopify-webhooks

# CloudWatch (Logging)
CLOUDWATCH_LOG_GROUP=/aws/ecs/shopify-seo-platform
CLOUDWATCH_LOG_STREAM=backend

# ----------------------------------------
# Security Configuration
# ----------------------------------------
# Generate with: openssl rand -base64 64
JWT_SECRET=your_jwt_secret_64_chars_minimum_here
JWT_EXPIRATION=7d
JWT_REFRESH_EXPIRATION=30d

# Generate with: openssl rand -base64 32
ENCRYPTION_KEY=your_encryption_key_32_bytes_here

# Generate with: openssl rand -base64 64
SESSION_SECRET=your_session_secret_64_chars_minimum_here

# CORS Configuration
CORS_ORIGIN=https://your-app.example.com,http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100

# ----------------------------------------
# Monitoring & Observability
# ----------------------------------------
# DataDog (APM & Infrastructure monitoring)
# Get from: https://app.datadoghq.com/
DATADOG_API_KEY=your_datadog_api_key
DATADOG_APP_KEY=your_datadog_app_key
DATADOG_SITE=datadoghq.com

# Sentry (Error tracking)
# Get from: https://sentry.io/
SENTRY_DSN=https://your_sentry_dsn@sentry.io/123456
SENTRY_ENVIRONMENT=development
SENTRY_TRACES_SAMPLE_RATE=0.1

# ----------------------------------------
# Application Configuration
# ----------------------------------------
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000

# Logging
LOG_LEVEL=debug
LOG_FORMAT=json

# Worker Configuration
WORKER_CONCURRENCY=5
WEBHOOK_RETRY_ATTEMPTS=3
WEBHOOK_RETRY_DELAY=5000

# ----------------------------------------
# Email Configuration (Optional)
# ----------------------------------------
# For notifications and alerts
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_specific_password
EMAIL_FROM=noreply@your-app.example.com

# ----------------------------------------
# Feature Flags (Development)
# ----------------------------------------
ENABLE_AI_CONTENT_GENERATION=true
ENABLE_BULK_OPERATIONS=true
ENABLE_ANALYTICS=true
ENABLE_WEBHOOK_PROCESSING=true
ENABLE_DEBUG_MODE=false
"@

$envExamplePath = Join-Path $ProjectRoot ".env.example"
Set-Content -Path $envExamplePath -Value $envTemplate -Encoding UTF8
Write-Success "Created: .env.example"

# Step 6: Create backend package.json
Write-Info "`nStep 6/8: Creating backend package.json..."

$backendPackageJson = @"
{
  "name": "shopify-seo-backend",
  "version": "1.0.0",
  "description": "Shopify SEO Automation Platform - Backend API",
  "author": "Shopify SEO Team",
  "private": true,
  "license": "UNLICENSED",
  "scripts": {
    "build": "nest build",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "start": "nest start",
    "dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "prisma:seed": "ts-node prisma/seed.ts"
  },
  "dependencies": {
    "@nestjs/common": "^10.3.0",
    "@nestjs/core": "^10.3.0",
    "@nestjs/platform-express": "^10.3.0",
    "@nestjs/config": "^3.1.1",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/passport": "^10.0.3",
    "@nestjs/swagger": "^7.2.0",
    "@prisma/client": "^5.8.1",
    "@shopify/shopify-api": "^9.0.1",
    "axios": "^1.6.5",
    "bcrypt": "^5.1.1",
    "bullmq": "^5.1.5",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.1",
    "dotenv": "^16.3.1",
    "ioredis": "^5.3.2",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "reflect-metadata": "^0.2.1",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.3.0",
    "@nestjs/schematics": "^10.1.0",
    "@nestjs/testing": "^10.3.0",
    "@types/bcrypt": "^5.0.2",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.11",
    "@types/node": "^20.11.5",
    "@types/passport-jwt": "^4.0.0",
    "@types/supertest": "^6.0.2",
    "@typescript-eslint/eslint-plugin": "^6.19.1",
    "@typescript-eslint/parser": "^6.19.1",
    "eslint": "^8.56.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-prettier": "^5.1.3",
    "jest": "^29.7.0",
    "prettier": "^3.2.4",
    "prisma": "^5.8.1",
    "source-map-support": "^0.5.21",
    "supertest": "^6.3.4",
    "ts-jest": "^29.1.1",
    "ts-loader": "^9.5.1",
    "ts-node": "^10.9.2",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.3.3"
  },
  "jest": {
    "moduleFileExtensions": [
      "js",
      "json",
      "ts"
    ],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "collectCoverageFrom": [
      "**/*.(t|j)s"
    ],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}
"@

$backendPackagePath = Join-Path $BackendPath "package.json"
Set-Content -Path $backendPackagePath -Value $backendPackageJson -Encoding UTF8
Write-Success "Created: backend/package.json"

# Step 7: Create frontend package.json
Write-Info "`nStep 7/8: Creating frontend package.json..."

$frontendPackageJson = @"
{
  "name": "shopify-seo-frontend",
  "version": "1.0.0",
  "type": "module",
  "description": "Shopify SEO Automation Platform - Frontend App",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@shopify/polaris": "^12.23.0",
    "@shopify/app-bridge": "^4.1.2",
    "@shopify/app-bridge-react": "^4.1.2",
    "@tanstack/react-query": "^5.17.19",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.3",
    "recharts": "^2.10.4",
    "zustand": "^4.5.0",
    "axios": "^1.6.5"
  },
  "devDependencies": {
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "@typescript-eslint/eslint-plugin": "^6.19.1",
    "@typescript-eslint/parser": "^6.19.1",
    "@vitejs/plugin-react": "^4.2.1",
    "eslint": "^8.56.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.5",
    "typescript": "^5.3.3",
    "vite": "^5.0.11"
  }
}
"@

$frontendPackagePath = Join-Path $FrontendPath "package.json"
Set-Content -Path $frontendPackagePath -Value $frontendPackageJson -Encoding UTF8
Write-Success "Created: frontend/package.json"

# Step 8: Create docker-compose.yml for local development
Write-Info "`nStep 8/8: Creating docker-compose.yml..."

if ($dockerAvailable) {
    $dockerCompose = @"
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: shopify-seo-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: shopify_seo_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: shopify-seo-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  # Optional: Redis Commander (GUI for Redis)
  redis-commander:
    image: rediscommander/redis-commander:latest
    container_name: shopify-seo-redis-commander
    environment:
      - REDIS_HOSTS=local:redis:6379
    ports:
      - "8081:8081"
    depends_on:
      - redis

volumes:
  postgres_data:
  redis_data:
"@

    $dockerComposePath = Join-Path $ProjectRoot "docker-compose.yml"
    Set-Content -Path $dockerComposePath -Value $dockerCompose -Encoding UTF8
    Write-Success "Created: docker-compose.yml"
} else {
    Write-Warning "Skipped docker-compose.yml (Docker not available)"
}

# Create .gitignore
Write-Info "`nCreating .gitignore..."

$gitignore = @"
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
package-lock.json
yarn.lock

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build outputs
dist/
build/
*.tsbuildinfo

# IDE
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store

# Testing
coverage/
*.coverage
.nyc_output

# Logs
logs/
*.log

# OS
Thumbs.db
desktop.ini

# Database
*.db
*.sqlite
*.sqlite3

# Prisma
prisma/.env

# Terraform
*.tfstate
*.tfstate.*
.terraform/
.terraform.lock.hcl

# AWS
.aws-sam/

# Temporary files
tmp/
temp/
*.tmp
"@

$gitignorePath = Join-Path $ProjectRoot ".gitignore"
Set-Content -Path $gitignorePath -Value $gitignore -Encoding UTF8
Write-Success "Created: .gitignore"

# Summary
Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Magenta

Write-Success "Project structure created successfully"
Write-Success "Environment template (.env.example) created"
Write-Success "Package configuration files created"
if ($dockerAvailable) {
    Write-Success "Docker Compose configuration created"
}

Write-Host "`n📋 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Copy .env.example to backend\.env and fill in your API keys" -ForegroundColor White
Write-Host "  2. Start Docker services: docker-compose up -d" -ForegroundColor White
Write-Host "  3. Install backend dependencies: cd backend && npm install" -ForegroundColor White
Write-Host "  4. Install frontend dependencies: cd frontend && npm install" -ForegroundColor White
Write-Host "  5. Set up Prisma: cd backend && npx prisma generate" -ForegroundColor White
Write-Host "  6. Read the documentation: docs\WINDOWS_SETUP.md" -ForegroundColor White

Write-Host "`n🔧 Useful Commands:" -ForegroundColor Cyan
Write-Host "  Start backend:  cd backend && npm run dev" -ForegroundColor White
Write-Host "  Start frontend: cd frontend && npm run dev" -ForegroundColor White
Write-Host "  Prisma Studio:  cd backend && npx prisma studio" -ForegroundColor White
Write-Host "  Redis GUI:      http://localhost:8081" -ForegroundColor White

Write-Host "`n📚 Documentation:" -ForegroundColor Cyan
Write-Host "  Architecture:   docs\ARCHITECTURE.md" -ForegroundColor White
Write-Host "  API Docs:       http://localhost:3000/api/docs (after backend start)" -ForegroundColor White
Write-Host "  Windows Setup:  docs\WINDOWS_SETUP.md" -ForegroundColor White

Write-Host "`n✨ Happy coding!" -ForegroundColor Magenta
