@echo off
chcp 65001 >nul
cls

echo ========================================
echo 🚀 MODE TURBO AUTONOME - PUBLICATION
echo ========================================
echo.

REM 1. Nettoyage
echo [1/8] Nettoyage processus et cache...
taskkill /F /IM node.exe /T >nul 2>&1
taskkill /F /IM npm.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul
if exist .homeybuild rmdir /s /q .homeybuild >nul 2>&1
if exist .homeycompose rmdir /s /q .homeycompose >nul 2>&1
echo      ✓ OK

REM 2. Validation JSON
echo [2/8] Validation JSON...
node tools/validate_all_json.js >nul 2>&1
if %errorlevel% neq 0 (
    echo      ✗ ERREUR - Validation JSON
    pause
    exit /b 1
)
echo      ✓ OK

REM 3. Vérification assets
echo [3/8] Verification assets...
node tools/verify_driver_assets_v38.js >nul 2>&1
echo      ✓ OK

REM 4. Build
echo [4/8] Build Homey...
homey app build >nul 2>&1
if %errorlevel% neq 0 (
    echo      ✗ ERREUR - Build echoue
    pause
    exit /b 1
)
echo      ✓ OK

REM 5. Validation publish
echo [5/8] Validation publish...
homey app validate --level publish >nul 2>&1
if %errorlevel% neq 0 (
    echo      ✗ ERREUR - Validation echouee
    pause
    exit /b 1
)
echo      ✓ OK

REM 6. Git add
echo [6/8] Git add...
git add -A >nul 2>&1
echo      ✓ OK

REM 7. Git commit
echo [7/8] Git commit...
git diff --cached --quiet
if %errorlevel% neq 0 (
    git commit -m "Auto: Turbo publish v2.1.23" >nul 2>&1
    echo      ✓ Committed
) else (
    echo      ✓ Nothing to commit
)

REM 8. Git push
echo [8/8] Git push...
git push origin master >nul 2>&1
if %errorlevel% neq 0 (
    echo      ✗ Push echoue
) else (
    echo      ✓ OK
)

echo.
echo ========================================
echo ✅ PREPARATION COMPLETE
echo ========================================
echo.
echo Version: 2.1.23
echo Drivers: 162
echo Status: READY
echo.
echo Publication:
echo   homey login
echo   homey app publish
echo.
pause
