<#
.SYNOPSIS
    Start both backend and frontend development servers
.DESCRIPTION
    This script starts the backend and frontend in separate windows for easy development
#>

$ProjectRoot = $PSScriptRoot
$BackendPath = Join-Path $ProjectRoot "backend"
$FrontendPath = Join-Path $ProjectRoot "frontend"

Write-Host "Starting Shopify SEO Platform development servers..." -ForegroundColor Cyan
Write-Host ""

# Check if Docker services are running
Write-Host "Checking Docker services..." -ForegroundColor Yellow
try {
    $dockerStatus = docker ps --filter "name=shopify-seo-" --format "{{.Names}}" 2>$null
    if ($dockerStatus) {
        Write-Host "✓ Docker services are running:" -ForegroundColor Green
        $dockerStatus | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }
    } else {
        Write-Host "⚠ Docker services not detected. Starting..." -ForegroundColor Yellow
        docker-compose up -d
        Start-Sleep -Seconds 5
    }
} catch {
    Write-Host "⚠ Docker not available. Make sure PostgreSQL and Redis are running manually." -ForegroundColor Yellow
}

Write-Host ""

# Check if .env exists
if (-not (Test-Path "$BackendPath\.env")) {
    Write-Host "⚠ Warning: backend\.env not found!" -ForegroundColor Yellow
    Write-Host "  Copy .env.example to backend\.env and configure it" -ForegroundColor Yellow
    Write-Host ""
    $response = Read-Host "Continue anyway? (y/n)"
    if ($response -ne 'y') {
        exit 0
    }
}

# Start backend in new window
Write-Host "Starting backend server..." -ForegroundColor Cyan
$backendScript = @"
Set-Location '$BackendPath'
Write-Host 'Backend Development Server' -ForegroundColor Magenta
Write-Host '=========================' -ForegroundColor Magenta
Write-Host ''
Write-Host 'API: http://localhost:3000' -ForegroundColor Green
Write-Host 'Docs: http://localhost:3000/api/docs' -ForegroundColor Green
Write-Host ''
npm run dev
"@

$backendScriptPath = Join-Path $env:TEMP "shopify-backend-start.ps1"
Set-Content -Path $backendScriptPath -Value $backendScript

Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", $backendScriptPath

# Wait for backend to initialize
Write-Host "Waiting for backend to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 8

# Start frontend in new window
Write-Host "Starting frontend server..." -ForegroundColor Cyan
$frontendScript = @"
Set-Location '$FrontendPath'
Write-Host 'Frontend Development Server' -ForegroundColor Magenta
Write-Host '===========================' -ForegroundColor Magenta
Write-Host ''
Write-Host 'App: http://localhost:5173' -ForegroundColor Green
Write-Host ''
npm run dev
"@

$frontendScriptPath = Join-Path $env:TEMP "shopify-frontend-start.ps1"
Set-Content -Path $frontendScriptPath -Value $frontendScript

Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", $frontendScriptPath

Write-Host ""
Write-Host "✓ Development servers starting in separate windows" -ForegroundColor Green
Write-Host ""
Write-Host "URLs:" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "  Backend:  http://localhost:3000" -ForegroundColor White
Write-Host "  API Docs: http://localhost:3000/api/docs" -ForegroundColor White
Write-Host "  Prisma:   http://localhost:5555 (run 'npx prisma studio' in backend)" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C in each window to stop the servers" -ForegroundColor Yellow
