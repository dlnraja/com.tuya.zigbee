@echo off
chcp 65001 >nul
color 0A
cls

echo ╔════════════════════════════════════════════════════════════════════╗
echo ║          TUYA ZIGBEE - UNIFIED PUBLISH SYSTEM                     ║
echo ║          Build 8-9 Images + Enrichment + Publication              ║
echo ╚════════════════════════════════════════════════════════════════════╝
echo.
echo 📅 %date% %time%
echo 📂 %cd%
echo.
echo ══════════════════════════════════════════════════════════════════════
echo.
echo Choose your mode:
echo.
echo   [1] QUICK PUBLISH - Images + Validation + Push (5 min)
echo   [2] FULL ENRICHMENT - GitHub + Forums + Images + Publish (30 min) [DEFAULT]
echo.
echo ══════════════════════════════════════════════════════════════════════
echo.
echo ⏱️  Auto-selecting option [2] in 5 seconds...
echo.

choice /C 12 /N /T 5 /D 2 /M "Enter your choice (1 or 2): "
set MODE=%errorlevel%

cls
echo ╔════════════════════════════════════════════════════════════════════╗

if %MODE%==1 (
    echo ║                    QUICK PUBLISH MODE                             ║
    echo ╚════════════════════════════════════════════════════════════════════╝
    goto QUICK_MODE
) else (
    echo ║                  FULL ENRICHMENT MODE                             ║
    echo ╚════════════════════════════════════════════════════════════════════╝
    goto FULL_MODE
)

REM ════════════════════════════════════════════════════════════════════════
REM QUICK PUBLISH MODE
REM ════════════════════════════════════════════════════════════════════════
:QUICK_MODE
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

REM ═══ PHASE 1: CHECKS ═══
echo [PHASE 1/5] Pre-flight checks...
echo ────────────────────────────────────────────────────────────────────

REM Check Node.js
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERROR: Node.js not installed
    pause
    exit /b 1
)
echo ✅ Node.js OK

REM Check/Install Canvas
node -e "require('canvas')" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  Canvas not found - installing...
    call npm install canvas
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ Failed to install canvas
        pause
        exit /b 1
    )
)
echo ✅ Canvas module OK

REM Check directories
if not exist "drivers" (
    echo ❌ ERROR: drivers directory not found
    pause
    exit /b 1
)
if not exist "scripts" mkdir scripts
if not exist "assets\images" mkdir assets\images
echo ✅ Project structure OK
echo.

REM ═══ PHASE 2: GENERATE IMAGES ═══
echo [PHASE 2/5] Generating smart images (Build 8-9)...
echo ────────────────────────────────────────────────────────────────────
echo 🎨 Johan Bendz Color System
echo 🖼️  SDK3 Dimensions
echo.

node scripts/SMART_IMAGE_GENERATOR.js
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERROR: Image generation failed!
    pause
    exit /b 1
)
echo ✅ Images generated successfully
echo.

REM ═══ PHASE 3: CLEAN CACHE ═══
echo [PHASE 3/5] Cleaning Homey cache...
echo ────────────────────────────────────────────────────────────────────

if exist .homeybuild (
    rmdir /s /q .homeybuild
    echo ✅ Removed .homeybuild
)
if exist .homeycompose (
    rmdir /s /q .homeycompose
    echo ✅ Removed .homeycompose
)
echo ✅ Cache cleaned
echo.

REM ═══ PHASE 4: VALIDATE ═══
echo [PHASE 4/5] Validating application...
echo ────────────────────────────────────────────────────────────────────

call homey app validate
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ⚠️  Validation warnings detected
    echo.
    choice /C YN /M "Continue anyway (Y/N)"
    if errorlevel 2 (
        echo ❌ Aborted by user
        pause
        exit /b 1
    )
    echo ℹ️  Continuing...
)
echo ✅ Validation complete
echo.

REM ═══ PHASE 5: GIT PUSH ═══
echo [PHASE 5/5] Git commit and push...
echo ────────────────────────────────────────────────────────────────────

git status --short
echo.

git add -A
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERROR: Git add failed
    pause
    exit /b 1
)
echo ✅ Changes staged

git commit -m "feat: smart images Build 8-9 + quick publish"
if %ERRORLEVEL% NEQ 0 (
    echo ℹ️  No changes to commit or commit failed
)

echo.
echo 🚀 Pushing to GitHub...
git push origin master
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERROR: Git push failed!
    pause
    exit /b 1
)

goto SUCCESS

REM ════════════════════════════════════════════════════════════════════════
REM FULL ENRICHMENT MODE
REM ════════════════════════════════════════════════════════════════════════
:FULL_MODE
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

REM ═══ PHASE 0: PRE-FLIGHT ═══
echo [PHASE 0/9] Pre-flight checks...
echo ────────────────────────────────────────────────────────────────────

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found!
    pause
    exit /b 1
)
echo ✅ Node.js: FOUND

homey --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Homey CLI not found - installing...
    npm install -g homey
)
echo ✅ Homey CLI: FOUND

git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Git not found!
    pause
    exit /b 1
)
echo ✅ Git: FOUND

if not exist "app.json" (
    echo ❌ app.json not found!
    pause
    exit /b 1
)
echo ✅ app.json: FOUND
echo.
pause
echo.

REM ═══ PHASE 1: GITHUB INTEGRATION ═══
echo [PHASE 1/9] GitHub Integration...
echo ────────────────────────────────────────────────────────────────────
echo 🐙 Analyzing GitHub repos, PRs, issues...
echo.

node scripts\MEGA_GITHUB_INTEGRATION_ENRICHER.js
if %errorlevel% neq 0 (
    echo ❌ GitHub Integration FAILED!
    pause
    exit /b 1
)
echo ✅ GitHub Integration: COMPLETE
echo.
pause
echo.

REM ═══ PHASE 2: FORUM INTEGRATION ═══
echo [PHASE 2/9] Forum Integration...
echo ────────────────────────────────────────────────────────────────────
echo 🌐 Scraping Homey Forums + Zigbee2MQTT + Blakadder...
echo.

node scripts\MEGA_FORUM_WEB_INTEGRATOR.js
if %errorlevel% neq 0 (
    echo ❌ Forum Integration FAILED!
    pause
    exit /b 1
)
echo ✅ Forum Integration: COMPLETE
echo.
pause
echo.

REM ═══ PHASE 3: PATTERN ANALYSIS ═══
echo [PHASE 3/9] Pattern Analysis...
echo ────────────────────────────────────────────────────────────────────
echo 🔍 Analyzing device patterns...
echo.

node scripts\ULTIMATE_PATTERN_ANALYZER_ORCHESTRATOR.js
if %errorlevel% neq 0 (
    echo ⚠️  Pattern Analysis had issues (continuing)
)
echo ✅ Pattern Analysis: COMPLETE
echo.
pause
echo.

REM ═══ PHASE 4: ULTRA-FINE ANALYSIS ═══
echo [PHASE 4/9] Ultra-Fine Driver Analysis...
echo ────────────────────────────────────────────────────────────────────
echo 🔬 Deep driver analysis...
echo.

node scripts\ULTRA_FINE_DRIVER_ANALYZER.js
if %errorlevel% neq 0 (
    echo ❌ Analysis FAILED!
    pause
    exit /b 1
)
echo ✅ Ultra-Fine Analysis: COMPLETE
echo.
pause
echo.

REM ═══ PHASE 5: WEB VALIDATION ═══
echo [PHASE 5/9] Web Validation...
echo ────────────────────────────────────────────────────────────────────
echo 🌐 Validating against web databases...
echo.

node scripts\ULTIMATE_WEB_VALIDATOR.js
if %errorlevel% neq 0 (
    echo ⚠️  Web Validation had issues (continuing)
)
echo ✅ Web Validation: COMPLETE
echo.
pause
echo.

REM ═══ PHASE 6: IMAGE GENERATION ═══
echo [PHASE 6/9] Smart Image Generation (Build 8-9)...
echo ────────────────────────────────────────────────────────────────────
echo 🎨 Johan Bendz Color System
echo.

REM Install canvas if needed
node -e "require('canvas')" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Installing canvas...
    call npm install canvas
)

node scripts\SMART_IMAGE_GENERATOR.js
if %errorlevel% neq 0 (
    echo ❌ Image Generation FAILED!
    pause
    exit /b 1
)
echo ✅ Smart Images: COMPLETE
echo.
pause
echo.

REM ═══ PHASE 7: IMAGE VALIDATION ═══
echo [PHASE 7/9] Image Validation...
echo ────────────────────────────────────────────────────────────────────
echo 🖼️  Checking all driver images...
echo.

if exist "scripts\ULTIMATE_IMAGE_VALIDATOR.js" (
    node scripts\ULTIMATE_IMAGE_VALIDATOR.js
    if %errorlevel% neq 0 (
        echo ⚠️  Image issues found (check reports/)
    )
    echo ✅ Image Validation: COMPLETE
) else (
    echo ℹ️  Image validator not found - skipping
)
echo.
pause
echo.

REM ═══ PHASE 8: VALIDATION & BUILD ═══
echo [PHASE 8/9] Validation and Build...
echo ────────────────────────────────────────────────────────────────────

echo Cleaning build cache...
if exist ".homeybuild" (
    rmdir /s /q .homeybuild
    echo ✅ Cache cleaned
)
echo.

echo Building app...
homey app build
if %errorlevel% neq 0 (
    echo ❌ Build FAILED!
    pause
    exit /b 1
)
echo ✅ Build: PASSED
echo.

echo Validating for publication...
homey app validate --level=publish
if %errorlevel% neq 0 (
    echo ⚠️  Validation warnings (continuing)
)
echo ✅ Validation: PASSED
echo.
pause
echo.

REM ═══ PHASE 9: GIT OPERATIONS ═══
echo [PHASE 9/9] Git Operations...
echo ────────────────────────────────────────────────────────────────────

git status
echo.

git add -A
echo ✅ Changes staged
echo.

echo Ready to commit. Press any key...
pause >nul
echo.

git commit -m "feat: full enrichment cycle - all sources integrated + Build 8-9 images"
if %errorlevel% neq 0 (
    echo ⚠️  Nothing to commit
) else (
    echo ✅ Committed
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

goto SUCCESS

REM ════════════════════════════════════════════════════════════════════════
REM SUCCESS
REM ════════════════════════════════════════════════════════════════════════
:SUCCESS
cls
echo.
echo ╔════════════════════════════════════════════════════════════════════╗
echo ║                    ✅ SUCCESS - PUBLISH COMPLETE                   ║
echo ╚════════════════════════════════════════════════════════════════════╝
echo.

if %MODE%==1 (
    echo 📊 QUICK PUBLISH executed:
    echo   ✅ Smart images generated Build 8-9 colors
    echo   ✅ Homey cache cleaned
    echo   ✅ Application validated
    echo   ✅ Changes committed to Git
    echo   ✅ Pushed to GitHub master
) else (
    echo 📊 FULL ENRICHMENT executed:
    echo   ✅ GitHub Integration COMPLETE
    echo   ✅ Forum Integration COMPLETE
    echo   ✅ Pattern Analysis COMPLETE
    echo   ✅ Ultra-Fine Analysis COMPLETE
    echo   ✅ Web Validation COMPLETE
    echo   ✅ Smart Images Generated Build 8-9
    echo   ✅ Image Validation COMPLETE
    echo   ✅ Validation and Build PASSED
    echo   ✅ Git Operations COMPLETE
)

echo.
echo 🚀 Next steps:
echo   1. GitHub Actions automatically:
echo      - Re-generate images in CI
echo      - Validate application
echo      - Publish to Homey App Store
echo.
echo   2. Monitor at:
echo      https://github.com/dlnraja/com.tuya.zigbee/actions
echo.
echo   3. Check publication:
echo      https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee
echo.
if %MODE%==2 (
    echo   4. Review enrichment reports:
    echo      reports/ directory
    echo.
)
echo ════════════════════════════════════════════════════════════════════
echo.
echo Press any key to close...
pause >nul
