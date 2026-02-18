<#
.SYNOPSIS
    Validate environment configuration
.DESCRIPTION
    Checks if all required environment variables are properly configured
#>

$ProjectRoot = $PSScriptRoot
$BackendEnvPath = Join-Path $ProjectRoot "backend\.env"
$EnvExamplePath = Join-Path $ProjectRoot ".env.example"

Write-Host "Environment Configuration Validator" -ForegroundColor Magenta
Write-Host "====================================" -ForegroundColor Magenta
Write-Host ""

# Check if .env exists
if (-not (Test-Path $BackendEnvPath)) {
    Write-Host "✗ backend\.env not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Solution:" -ForegroundColor Yellow
    Write-Host "  1. Copy .env.example to backend\.env" -ForegroundColor White
    Write-Host "  2. Fill in all required values" -ForegroundColor White
    Write-Host ""
    Write-Host "Command:" -ForegroundColor Cyan
    Write-Host "  copy .env.example backend\.env" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✓ backend\.env file exists" -ForegroundColor Green
Write-Host ""

# Read .env file
$envContent = Get-Content $BackendEnvPath

# Required variables (critical for functionality)
$requiredVars = @(
    'SHOPIFY_API_KEY',
    'SHOPIFY_API_SECRET',
    'DATABASE_URL',
    'REDIS_URL',
    'OPENAI_API_KEY',
    'JWT_SECRET',
    'ENCRYPTION_KEY',
    'SESSION_SECRET'
)

# Optional variables (for full functionality)
$optionalVars = @(
    'ANTHROPIC_API_KEY',
    'PERPLEXITY_API_KEY',
    'GOOGLE_SEARCH_CONSOLE_CLIENT_ID',
    'DATAFORSEO_LOGIN',
    'SEMRUSH_API_KEY',
    'AHREFS_API_KEY',
    'AWS_ACCESS_KEY_ID',
    'DATADOG_API_KEY',
    'SENTRY_DSN'
)

$missingRequired = @()
$missingOptional = @()
$unconfigured = @()

# Check required variables
Write-Host "Checking required variables..." -ForegroundColor Cyan
foreach ($var in $requiredVars) {
    $found = $envContent | Select-String "^$var=" | Select-Object -First 1

    if (-not $found) {
        $missingRequired += $var
        Write-Host "  ✗ $var - MISSING" -ForegroundColor Red
    } else {
        $value = ($found.ToString() -split '=', 2)[1]
        if ($value -match '(your_|<from|here$)' -or $value.Trim() -eq '') {
            $unconfigured += $var
            Write-Host "  ⚠ $var - NOT CONFIGURED" -ForegroundColor Yellow
        } else {
            $maskedValue = if ($value.Length -gt 20) { $value.Substring(0, 20) + "..." } else { $value }
            Write-Host "  ✓ $var - configured" -ForegroundColor Green
        }
    }
}

Write-Host ""

# Check optional variables
Write-Host "Checking optional variables..." -ForegroundColor Cyan
foreach ($var in $optionalVars) {
    $found = $envContent | Select-String "^$var=" | Select-Object -First 1

    if (-not $found) {
        $missingOptional += $var
        Write-Host "  - $var - not set (optional)" -ForegroundColor Gray
    } else {
        $value = ($found.ToString() -split '=', 2)[1]
        if ($value -match '(your_|<from|here$)' -or $value.Trim() -eq '') {
            Write-Host "  - $var - not configured (optional)" -ForegroundColor Gray
        } else {
            Write-Host "  ✓ $var - configured" -ForegroundColor Green
        }
    }
}

Write-Host ""
Write-Host "Summary" -ForegroundColor Magenta
Write-Host "=======" -ForegroundColor Magenta

if ($missingRequired.Count -gt 0) {
    Write-Host ""
    Write-Host "✗ MISSING REQUIRED VARIABLES:" -ForegroundColor Red
    $missingRequired | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    Write-Host ""
    Write-Host "These variables must be added to backend\.env" -ForegroundColor Yellow
}

if ($unconfigured.Count -gt 0) {
    Write-Host ""
    Write-Host "⚠ UNCONFIGURED REQUIRED VARIABLES:" -ForegroundColor Yellow
    $unconfigured | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
    Write-Host ""
    Write-Host "These variables must be properly configured in backend\.env" -ForegroundColor Yellow
}

if ($missingRequired.Count -eq 0 -and $unconfigured.Count -eq 0) {
    Write-Host ""
    Write-Host "✓ All required variables are properly configured!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can start the development servers:" -ForegroundColor Cyan
    Write-Host "  .\start-dev.ps1" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "Please configure the missing/unconfigured variables before starting." -ForegroundColor Yellow
    Write-Host "Refer to .env.example for guidance on each variable." -ForegroundColor Yellow
}

Write-Host ""
