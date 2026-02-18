@echo off
REM ========================================
REM Shopify SEO Automation Platform
REM Environment Variable Setup (Windows)
REM ========================================
REM This script sets up Windows environment variables
REM for the Shopify SEO Automation Platform
REM ========================================

echo.
echo ========================================
echo  Environment Variable Setup
echo ========================================
echo.

REM Check for administrator privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: This script requires Administrator privileges.
    echo Please right-click and select "Run as Administrator"
    pause
    exit /b 1
)

REM Set project root
set "PROJECT_ROOT=%~dp0"
set "BACKEND_PATH=%PROJECT_ROOT%backend"
set "FRONTEND_PATH=%PROJECT_ROOT%frontend"

echo [INFO] Project Root: %PROJECT_ROOT%
echo.

REM ========================================
REM System PATH Configuration
REM ========================================

echo [STEP 1/4] Configuring System PATH...

REM Add Node.js to PATH (if not already present)
set "NODE_PATH=C:\Program Files\nodejs"
echo %PATH% | find /i "%NODE_PATH%" >nul
if errorlevel 1 (
    setx /M PATH "%PATH%;%NODE_PATH%" >nul
    echo [OK] Added Node.js to PATH
) else (
    echo [OK] Node.js already in PATH
)

REM Add npm global packages to PATH
set "NPM_GLOBAL=%APPDATA%\npm"
echo %PATH% | find /i "%NPM_GLOBAL%" >nul
if errorlevel 1 (
    setx /M PATH "%PATH%;%NPM_GLOBAL%" >nul
    echo [OK] Added npm global packages to PATH
) else (
    echo [OK] npm global packages already in PATH
)

REM Add Git to PATH (if not already present)
set "GIT_PATH=C:\Program Files\Git\cmd"
echo %PATH% | find /i "%GIT_PATH%" >nul
if errorlevel 1 (
    setx /M PATH "%PATH%;%GIT_PATH%" >nul
    echo [OK] Added Git to PATH
) else (
    echo [OK] Git already in PATH
)

REM Add Python to PATH (if not already present)
set "PYTHON_PATH=C:\Program Files\Python313"
echo %PATH% | find /i "%PYTHON_PATH%" >nul
if errorlevel 1 (
    setx /M PATH "%PATH%;%PYTHON_PATH%" >nul
    echo [OK] Added Python to PATH
) else (
    echo [OK] Python already in PATH
)

echo.

REM ========================================
REM Project-Specific Environment Variables
REM ========================================

echo [STEP 2/4] Setting project environment variables...

REM Set project root variable
setx SHOPIFY_SEO_PROJECT_ROOT "%PROJECT_ROOT%" >nul
echo [OK] SHOPIFY_SEO_PROJECT_ROOT set

REM Set Node environment
setx NODE_ENV "development" >nul
echo [OK] NODE_ENV set to development

REM Set default ports
setx SHOPIFY_SEO_BACKEND_PORT "3000" >nul
setx SHOPIFY_SEO_FRONTEND_PORT "5173" >nul
echo [OK] Default ports configured

echo.

REM ========================================
REM Development Tool Configuration
REM ========================================

echo [STEP 3/4] Configuring development tools...

REM Set default editor (VSCode)
setx EDITOR "code" >nul
echo [OK] Default editor set to VS Code

REM Configure npm to use faster install
call npm config set prefer-offline true 2>nul
call npm config set progress false 2>nul
echo [OK] npm configuration optimized

REM Set Git configuration (if not already set)
git config --global core.autocrlf true 2>nul
git config --global init.defaultBranch main 2>nul
echo [OK] Git configuration set

echo.

REM ========================================
REM Verify Installation
REM ========================================

echo [STEP 4/4] Verifying installation...
echo.

REM Check Node.js
where node >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('node --version 2^>nul') do set NODE_VERSION=%%i
    echo [OK] Node.js %NODE_VERSION% found
) else (
    echo [ERROR] Node.js not found in PATH
)

REM Check npm
where npm >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('npm --version 2^>nul') do set NPM_VERSION=%%i
    echo [OK] npm %NPM_VERSION% found
) else (
    echo [ERROR] npm not found in PATH
)

REM Check Git
where git >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('git --version 2^>nul') do set GIT_VERSION=%%i
    echo [OK] %GIT_VERSION% found
) else (
    echo [ERROR] Git not found in PATH
)

REM Check Python (optional)
where python >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('python --version 2^>nul') do set PYTHON_VERSION=%%i
    echo [OK] %PYTHON_VERSION% found
) else (
    echo [WARN] Python not found (optional)
)

REM Check Docker (optional)
where docker >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('docker --version 2^>nul') do set DOCKER_VERSION=%%i
    echo [OK] %DOCKER_VERSION% found
) else (
    echo [WARN] Docker not found (optional, but recommended)
)

echo.
echo ========================================
echo  Setup Complete!
echo ========================================
echo.
echo Environment variables have been set successfully.
echo.
echo IMPORTANT: You must restart your terminal/IDE for changes to take effect.
echo.
echo Next steps:
echo   1. Restart your terminal or IDE
echo   2. Run: setup-windows-dev.ps1
echo   3. Follow the instructions in docs\WINDOWS_SETUP.md
echo.

pause
