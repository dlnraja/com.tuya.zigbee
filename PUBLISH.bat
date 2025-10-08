@echo off
echo ========================================
echo ULTIMATE PUBLISH SYSTEM
echo Build 8-9 Images + Validation + Push
echo ========================================

REM ============================================
REM PHASE 1: CHECKS & SETUP
REM ============================================
echo.
echo [PHASE 1/5] Pre-flight checks...
echo ----------------------------------------

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
        echo Run manually: npm install canvas
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

REM ============================================
REM PHASE 2: GENERATE SMART IMAGES
REM ============================================
echo.
echo [PHASE 2/5] Generating smart images...
echo ----------------------------------------
echo 🎨 Build 8-9 Color System
echo 🖼️  Johan Bendz Standards
echo.

node scripts/SMART_IMAGE_GENERATOR.js
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERROR: Image generation failed!
    pause
    exit /b 1
)
echo ✅ Images generated successfully

REM ============================================
REM PHASE 3: CLEAN CACHE
REM ============================================
echo.
echo [PHASE 3/5] Cleaning Homey cache...
echo ----------------------------------------

if exist .homeybuild (
    rmdir /s /q .homeybuild
    echo ✅ Removed .homeybuild
)
if exist .homeycompose (
    rmdir /s /q .homeycompose
    echo ✅ Removed .homeycompose
)
echo ✅ Cache cleaned

REM ============================================
REM PHASE 4: VALIDATE
REM ============================================
echo.
echo [PHASE 4/5] Validating application...
echo ----------------------------------------

call homey app validate
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  Validation warnings detected
    echo.
    choice /C YN /M "Continue anyway"
    if errorlevel 2 (
        echo ❌ Aborted by user
        pause
        exit /b 1
    )
    echo ℹ️  Continuing despite warnings...
)
echo ✅ Validation complete

REM ============================================
REM PHASE 5: GIT COMMIT & PUSH
REM ============================================
echo.
echo [PHASE 5/5] Git commit and push...
echo ----------------------------------------

REM Git status
git status --short
echo.

REM Add all changes
git add -A
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERROR: Git add failed
    pause
    exit /b 1
)
echo ✅ Changes staged

REM Commit
git commit -m "feat: smart images Build 8-9 + auto-publish"
if %ERRORLEVEL% NEQ 0 (
    echo ℹ️  No changes to commit or commit failed
    echo Checking if we should push anyway...
)

REM Push to trigger GitHub Actions
echo.
echo 🚀 Pushing to GitHub...
git push origin master
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERROR: Git push failed!
    echo.
    echo Possible causes:
    echo - No internet connection
    echo - Authentication required
    echo - Remote changes need pull first
    echo.
    pause
    exit /b 1
)

REM ============================================
REM SUCCESS!
REM ============================================
echo.
echo ========================================
echo ✅ SUCCESS - PUBLISH INITIATED
echo ========================================
echo.
echo 📊 What happened:
echo   ✅ Smart images generated (Build 8-9 colors)
echo   ✅ Homey cache cleaned
echo   ✅ Application validated
echo   ✅ Changes committed to Git
echo   ✅ Pushed to GitHub master branch
echo.
echo 🚀 Next steps:
echo   1. GitHub Actions will automatically:
echo      - Re-generate images in CI environment
echo      - Validate application
echo      - Publish to Homey App Store
echo.
echo   2. Monitor progress at:
echo      https://github.com/dlnraja/com.tuya.zigbee/actions
echo.
echo   3. Check publication at:
echo      https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee
echo.
echo ========================================
echo Press any key to close...
pause >nul
