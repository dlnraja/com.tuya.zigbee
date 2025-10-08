@echo off
REM ============================================================================
REM RECURSIVE MONITOR - GITHUB ACTIONS UNTIL SUCCESS
REM ============================================================================

echo ========================================
echo STARTING RECURSIVE MONITOR
echo ========================================
echo.

cd /d "%~dp0"

REM Check if Node.js is available
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if gh CLI is available
where gh >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] GitHub CLI (gh) not found
    echo Install with: winget install --id GitHub.cli
    echo.
    echo Attempting to continue without gh CLI...
)

echo [INFO] Starting recursive monitor...
echo [INFO] This will run until all workflows succeed
echo [INFO] Press Ctrl+C to stop
echo.

node scripts\RECURSIVE_MONITOR_UNTIL_SUCCESS.js

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo SUCCESS - All workflows completed!
    echo ========================================
) else (
    echo.
    echo ========================================
    echo STOPPED - Check logs for details
    echo ========================================
)

pause
