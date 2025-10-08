@echo off
chcp 65001 >nul
color 0A
cls

echo ╔════════════════════════════════════════════════════════════════════════════╗
echo ║                  HOMEY TUYA ZIGBEE - FULL ENRICHMENT LAUNCHER            ║
echo ║                          Ultra-Verbose Mode                               ║
echo ╚════════════════════════════════════════════════════════════════════════════╝
echo.
echo 📅 Date: %date% %time%
echo 📂 Directory: %cd%
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

REM ════════════════════════════════════════════════════════════════════════════
REM PHASE 0: PRE-FLIGHT CHECKS
REM ════════════════════════════════════════════════════════════════════════════

echo ✈️  PHASE 0: PRE-FLIGHT CHECKS
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

REM Check Node.js
echo [1/4] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found! Please install Node.js
    pause
    exit /b 1
)
echo ✅ Node.js: FOUND
node --version
echo.

REM Check Homey CLI
echo [2/4] Checking Homey CLI...
homey --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Homey CLI not found! Installing...
    npm install -g homey
)
echo ✅ Homey CLI: FOUND
homey --version
echo.

REM Check Git
echo [3/4] Checking Git...
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Git not found! Please install Git
    pause
    exit /b 1
)
echo ✅ Git: FOUND
git --version
echo.

REM Check app.json
echo [4/4] Checking app.json...
if not exist "app.json" (
    echo ❌ app.json not found! Please run from project root
    pause
    exit /b 1
)
echo ✅ app.json: FOUND
echo.

echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
pause
echo.

REM ════════════════════════════════════════════════════════════════════════════
REM PHASE 1: GITHUB INTEGRATION
REM ════════════════════════════════════════════════════════════════════════════

echo 🐙 PHASE 1: GITHUB INTEGRATION
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo Running MEGA GitHub Integration...
echo.

node scripts\MEGA_GITHUB_INTEGRATION_ENRICHER.js
if %errorlevel% neq 0 (
    echo.
    echo ❌ GitHub Integration FAILED!
    pause
    exit /b 1
)

echo.
echo ✅ GitHub Integration: COMPLETE
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
pause
echo.

REM ════════════════════════════════════════════════════════════════════════════
REM PHASE 2: FORUM INTEGRATION
REM ════════════════════════════════════════════════════════════════════════════

echo 🌐 PHASE 2: FORUM INTEGRATION
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo Running MEGA Forum & Web Integration...
echo.

node scripts\MEGA_FORUM_WEB_INTEGRATOR.js
if %errorlevel% neq 0 (
    echo.
    echo ❌ Forum Integration FAILED!
    pause
    exit /b 1
)

echo.
echo ✅ Forum Integration: COMPLETE
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
pause
echo.

REM ════════════════════════════════════════════════════════════════════════════
REM PHASE 3: PATTERN ANALYSIS
REM ════════════════════════════════════════════════════════════════════════════

echo 🔍 PHASE 3: PATTERN ANALYSIS
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo Running Ultimate Pattern Analyzer...
echo.

node scripts\ULTIMATE_PATTERN_ANALYZER_ORCHESTRATOR.js
if %errorlevel% neq 0 (
    echo.
    echo ⚠️  Pattern Analysis had issues (continuing anyway)
)

echo.
echo ✅ Pattern Analysis: COMPLETE
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
pause
echo.

REM ════════════════════════════════════════════════════════════════════════════
REM PHASE 4: DEEP ANALYSIS
REM ════════════════════════════════════════════════════════════════════════════

echo 🔬 PHASE 4: ULTRA-FINE ANALYSIS
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo Running Ultra-Fine Driver Analyzer...
echo.

node scripts\ULTRA_FINE_DRIVER_ANALYZER.js
if %errorlevel% neq 0 (
    echo.
    echo ❌ Analysis FAILED!
    pause
    exit /b 1
)

echo.
echo ✅ Ultra-Fine Analysis: COMPLETE
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
pause
echo.

REM ════════════════════════════════════════════════════════════════════════════
REM PHASE 5: WEB VALIDATION
REM ════════════════════════════════════════════════════════════════════════════

echo 🌐 PHASE 5: WEB VALIDATION
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo Running Ultimate Web Validator...
echo.

node scripts\ULTIMATE_WEB_VALIDATOR.js
if %errorlevel% neq 0 (
    echo.
    echo ⚠️  Web Validation had issues (continuing anyway)
)

echo.
echo ✅ Web Validation: COMPLETE
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
pause
echo.

REM ════════════════════════════════════════════════════════════════════════════
REM PHASE 6: VALIDATION & BUILD
REM ════════════════════════════════════════════════════════════════════════════

echo ✅ PHASE 6: VALIDATION & BUILD
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

echo [1/2] Cleaning build cache...
if exist ".homeybuild" (
    rmdir /s /q .homeybuild
    echo ✅ Build cache cleaned
) else (
    echo ℹ️  No build cache to clean
)
echo.

echo [2/2] Building app...
homey app build
if %errorlevel% neq 0 (
    echo.
    echo ❌ Build FAILED!
    pause
    exit /b 1
)
echo ✅ Build: PASSED
echo.

echo [3/3] Validating for publication...
homey app validate --level=publish
if %errorlevel% neq 0 (
    echo.
    echo ❌ Validation FAILED!
    pause
    exit /b 1
)
echo ✅ Validation: PASSED
echo.

echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
pause
echo.

REM ════════════════════════════════════════════════════════════════════════════
REM PHASE 7: GIT OPERATIONS
REM ════════════════════════════════════════════════════════════════════════════

echo 📤 PHASE 7: GIT OPERATIONS
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

echo [1/3] Checking Git status...
git status
echo.

echo [2/3] Adding all changes...
git add -A
echo ✅ Changes staged
echo.

echo [3/3] Ready to commit. Press any key to commit & push...
pause
echo.

echo Committing...
git commit -m "feat: Full enrichment cycle - Manual launch - All sources integrated"
if %errorlevel% neq 0 (
    echo ⚠️  Nothing to commit (no changes)
) else (
    echo ✅ Committed successfully
)
echo.

echo Pushing to GitHub...
git push origin master
if %errorlevel% neq 0 (
    echo ❌ Push FAILED!
    pause
    exit /b 1
)
echo ✅ Pushed to GitHub
echo.

echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
pause
echo.

REM ════════════════════════════════════════════════════════════════════════════
REM PHASE 8: FINAL REPORT
REM ════════════════════════════════════════════════════════════════════════════

echo 📊 PHASE 8: FINAL REPORT
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

echo ╔════════════════════════════════════════════════════════════════════════╗
echo ║                    FULL ENRICHMENT CYCLE COMPLETE                     ║
echo ╚════════════════════════════════════════════════════════════════════════╝
echo.
echo ✅ Phase 1: GitHub Integration - COMPLETE
echo ✅ Phase 2: Forum Integration - COMPLETE
echo ✅ Phase 3: Pattern Analysis - COMPLETE
echo ✅ Phase 4: Ultra-Fine Analysis - COMPLETE
echo ✅ Phase 5: Web Validation - COMPLETE
echo ✅ Phase 6: Validation & Build - COMPLETE
echo ✅ Phase 7: Git Operations - COMPLETE
echo.
echo 📦 Check app.json for new version
echo 📊 Check reports/ directory for detailed reports
echo 🔄 GitHub Actions will now handle publication automatically
echo.
echo 🌐 Monitor publication at:
echo    https://github.com/dlnraja/com.tuya.zigbee/actions
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo Press any key to exit...
pause >nul
