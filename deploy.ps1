# Shopify SEO Platform - One-Click Deploy Script
# Run this in PowerShell: .\deploy.ps1

Write-Host "=== Shopify SEO Platform Deployment ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: GitHub Authentication
Write-Host "Step 1: GitHub Authentication" -ForegroundColor Yellow
$ghPath = "$HOME\scoop\shims\gh.exe"

$authStatus = & $ghPath auth status 2>&1
if ($authStatus -like "*not logged*") {
    Write-Host "Please authenticate with GitHub..." -ForegroundColor White
    & $ghPath auth login --hostname github.com --git-protocol https --web
}

# Check auth again
$authStatus = & $ghPath auth status 2>&1
if ($authStatus -like "*not logged*") {
    Write-Host "GitHub authentication failed. Please try again." -ForegroundColor Red
    exit 1
}
Write-Host "GitHub authenticated!" -ForegroundColor Green

# Step 2: Create and push to GitHub
Write-Host ""
Write-Host "Step 2: Creating GitHub repository..." -ForegroundColor Yellow
Set-Location "C:\Users\pepij\shopify-seo-platform"

# Check if repo exists
$repoCheck = & $ghPath repo view pepijnfs/shopify-seo-platform 2>&1
if ($repoCheck -like "*Could not resolve*") {
    & $ghPath repo create shopify-seo-platform --public --source=. --push
    Write-Host "Repository created and pushed!" -ForegroundColor Green
} else {
    Write-Host "Repository already exists. Pushing..." -ForegroundColor Yellow
    git push -u origin master
    Write-Host "Pushed to existing repository!" -ForegroundColor Green
}

# Step 3: Deploy Backend to Railway
Write-Host ""
Write-Host "Step 3: Deploying backend to Railway..." -ForegroundColor Yellow
Set-Location "C:\Users\pepij\shopify-seo-platform\backend"
railway up

# Step 4: Deploy Frontend to Vercel
Write-Host ""
Write-Host "Step 4: Deploying frontend to Vercel..." -ForegroundColor Yellow
Set-Location "C:\Users\pepij\shopify-seo-platform\frontend"
npx vercel --prod

Write-Host ""
Write-Host "=== Deployment Complete ===" -ForegroundColor Green
Write-Host "Check Railway and Vercel dashboards for your URLs."
