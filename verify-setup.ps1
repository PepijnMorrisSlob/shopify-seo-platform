<#
.SYNOPSIS
    Verify Windows development environment setup
.DESCRIPTION
    Comprehensive verification of all setup components
#>

$ErrorActionPreference = "Continue"
$ProjectRoot = $PSScriptRoot

function Write-Success { param($msg) Write-Host "✓ $msg" -ForegroundColor Green }
function Write-Fail { param($msg) Write-Host "✗ $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "ℹ $msg" -ForegroundColor Cyan }
function Write-Warn { param($msg) Write-Host "⚠ $msg" -ForegroundColor Yellow }

$script:passCount = 0
$script:failCount = 0
$script:warnCount = 0

function Test-Item {
    param(
        [string]$Name,
        [scriptblock]$Test,
        [string]$ErrorMessage,
        [bool]$Required = $true
    )

    try {
        $result = & $Test
        if ($result) {
            Write-Success $Name
            $script:passCount++
            return $true
        } else {
            if ($Required) {
                Write-Fail "$Name - $ErrorMessage"
                $script:failCount++
            } else {
                Write-Warn "$Name - $ErrorMessage (optional)"
                $script:warnCount++
            }
            return $false
        }
    } catch {
        if ($Required) {
            Write-Fail "$Name - $($_.Exception.Message)"
            $script:failCount++
        } else {
            Write-Warn "$Name - $($_.Exception.Message) (optional)"
            $script:warnCount++
        }
        return $false
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  Setup Verification" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

# ========================================
# Section 1: Prerequisites
# ========================================
Write-Info "Section 1: Prerequisites"
Write-Host ""

Test-Item "Node.js installed" {
    $null -ne (Get-Command node -ErrorAction SilentlyContinue)
} "Node.js not found in PATH"

Test-Item "Node.js version >= 18" {
    $version = & node --version 2>$null
    if ($version -match "v(\d+)\.") {
        [int]$matches[1] -ge 18
    } else { $false }
} "Node.js version must be 18 or higher"

Test-Item "npm installed" {
    $null -ne (Get-Command npm -ErrorAction SilentlyContinue)
} "npm not found in PATH"

Test-Item "Git installed" {
    $null -ne (Get-Command git -ErrorAction SilentlyContinue)
} "Git not found in PATH"

Test-Item "Docker available" {
    $null -ne (Get-Command docker -ErrorAction SilentlyContinue)
} "Docker Desktop not installed" -Required $false

Test-Item "Docker running" {
    if (Get-Command docker -ErrorAction SilentlyContinue) {
        $null -ne (docker ps 2>$null)
    } else { $false }
} "Docker Desktop not running" -Required $false

# ========================================
# Section 2: Project Structure
# ========================================
Write-Host ""
Write-Info "Section 2: Project Structure"
Write-Host ""

Test-Item "Project root exists" {
    Test-Path $ProjectRoot
} "Project directory not found"

Test-Item "Backend directory exists" {
    Test-Path "$ProjectRoot\backend"
} "Backend directory missing"

Test-Item "Frontend directory exists" {
    Test-Path "$ProjectRoot\frontend"
} "Frontend directory missing"

Test-Item "Infrastructure directory exists" {
    Test-Path "$ProjectRoot\infrastructure"
} "Infrastructure directory missing"

Test-Item "Docs directory exists" {
    Test-Path "$ProjectRoot\docs"
} "Docs directory missing"

Test-Item "Backend src directory structure" {
    $dirs = @('services', 'controllers', 'middleware', 'guards', 'types', 'database', 'queues')
    $allExist = $true
    foreach ($dir in $dirs) {
        if (-not (Test-Path "$ProjectRoot\backend\src\$dir")) {
            $allExist = $false
        }
    }
    $allExist
} "Some backend src directories missing"

Test-Item "Frontend src directory structure" {
    $dirs = @('pages', 'components', 'hooks', 'contexts', 'types', 'utils')
    $allExist = $true
    foreach ($dir in $dirs) {
        if (-not (Test-Path "$ProjectRoot\frontend\src\$dir")) {
            $allExist = $false
        }
    }
    $allExist
} "Some frontend src directories missing"

# ========================================
# Section 3: Configuration Files
# ========================================
Write-Host ""
Write-Info "Section 3: Configuration Files"
Write-Host ""

Test-Item ".env.example exists" {
    Test-Path "$ProjectRoot\.env.example"
} ".env.example not found"

Test-Item ".gitignore exists" {
    Test-Path "$ProjectRoot\.gitignore"
} ".gitignore not found"

Test-Item "docker-compose.yml exists" {
    Test-Path "$ProjectRoot\docker-compose.yml"
} "docker-compose.yml not found"

Test-Item "backend/package.json exists" {
    Test-Path "$ProjectRoot\backend\package.json"
} "backend/package.json not found"

Test-Item "frontend/package.json exists" {
    Test-Path "$ProjectRoot\frontend\package.json"
} "frontend/package.json not found"

Test-Item "backend/.env configured" {
    Test-Path "$ProjectRoot\backend\.env"
} "backend/.env not configured (copy from .env.example)" -Required $false

# ========================================
# Section 4: Setup Scripts
# ========================================
Write-Host ""
Write-Info "Section 4: Setup Scripts"
Write-Host ""

Test-Item "setup-windows-dev.ps1 exists" {
    Test-Path "$ProjectRoot\setup-windows-dev.ps1"
} "setup-windows-dev.ps1 not found"

Test-Item "setup-env.bat exists" {
    Test-Path "$ProjectRoot\setup-env.bat"
} "setup-env.bat not found"

Test-Item "start-dev.ps1 exists" {
    Test-Path "$ProjectRoot\start-dev.ps1"
} "start-dev.ps1 not found"

Test-Item "stop-dev.ps1 exists" {
    Test-Path "$ProjectRoot\stop-dev.ps1"
} "stop-dev.ps1 not found"

Test-Item "check-env.ps1 exists" {
    Test-Path "$ProjectRoot\check-env.ps1"
} "check-env.ps1 not found"

# ========================================
# Section 5: Documentation
# ========================================
Write-Host ""
Write-Info "Section 5: Documentation"
Write-Host ""

Test-Item "README.md exists" {
    Test-Path "$ProjectRoot\README.md"
} "README.md not found"

Test-Item "WINDOWS_SETUP.md exists" {
    Test-Path "$ProjectRoot\docs\WINDOWS_SETUP.md"
} "docs/WINDOWS_SETUP.md not found"

Test-Item "QUICK_REFERENCE.md exists" {
    Test-Path "$ProjectRoot\docs\QUICK_REFERENCE.md"
} "docs/QUICK_REFERENCE.md not found"

Test-Item "AGENT_MANIFEST exists" {
    Test-Path "$ProjectRoot\AGENT_MANIFEST_WINDOWS_SPECIALIST.md"
} "AGENT_MANIFEST_WINDOWS_SPECIALIST.md not found"

# ========================================
# Section 6: Dependencies
# ========================================
Write-Host ""
Write-Info "Section 6: Dependencies"
Write-Host ""

Test-Item "Backend node_modules" {
    Test-Path "$ProjectRoot\backend\node_modules"
} "Backend dependencies not installed (run: cd backend && npm install)" -Required $false

Test-Item "Frontend node_modules" {
    Test-Path "$ProjectRoot\frontend\node_modules"
} "Frontend dependencies not installed (run: cd frontend && npm install)" -Required $false

# ========================================
# Section 7: Global npm Packages
# ========================================
Write-Host ""
Write-Info "Section 7: Global npm Packages"
Write-Host ""

$globalPackages = @('nest', 'prisma', 'typescript')
foreach ($pkg in $globalPackages) {
    Test-Item "Global package: $pkg" {
        $null -ne (Get-Command $pkg -ErrorAction SilentlyContinue)
    } "$pkg not installed globally" -Required $false
}

# ========================================
# Section 8: Docker Services
# ========================================
if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host ""
    Write-Info "Section 8: Docker Services"
    Write-Host ""

    Test-Item "PostgreSQL container" {
        $null -ne (docker ps --filter "name=shopify-seo-postgres" --format "{{.Names}}" 2>$null)
    } "PostgreSQL container not running (run: docker-compose up -d)" -Required $false

    Test-Item "Redis container" {
        $null -ne (docker ps --filter "name=shopify-seo-redis" --format "{{.Names}}" 2>$null)
    } "Redis container not running (run: docker-compose up -d)" -Required $false
}

# ========================================
# Summary
# ========================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  Verification Summary" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

Write-Host "Passed:   " -NoNewline
Write-Host $script:passCount -ForegroundColor Green

if ($script:failCount -gt 0) {
    Write-Host "Failed:   " -NoNewline
    Write-Host $script:failCount -ForegroundColor Red
}

if ($script:warnCount -gt 0) {
    Write-Host "Warnings: " -NoNewline
    Write-Host $script:warnCount -ForegroundColor Yellow
}

$total = $script:passCount + $script:failCount
if ($total -gt 0) {
    $percentage = [math]::Round(($script:passCount / $total) * 100, 1)
    Write-Host ""
    Write-Host "Score: $percentage%" -ForegroundColor $(if ($percentage -eq 100) { "Green" } elseif ($percentage -ge 80) { "Yellow" } else { "Red" })
}

Write-Host ""

if ($script:failCount -eq 0) {
    Write-Success "All required checks passed!"
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Copy .env.example to backend\.env and configure" -ForegroundColor White
    Write-Host "  2. Start Docker: docker-compose up -d" -ForegroundColor White
    Write-Host "  3. Install dependencies: cd backend && npm install" -ForegroundColor White
    Write-Host "  4. Install dependencies: cd frontend && npm install" -ForegroundColor White
    Write-Host "  5. Start development: .\start-dev.ps1" -ForegroundColor White
} else {
    Write-Fail "Some required checks failed. Please fix the issues above."
    Write-Host ""
    Write-Host "See docs\WINDOWS_SETUP.md for detailed setup instructions." -ForegroundColor Yellow
}

Write-Host ""
