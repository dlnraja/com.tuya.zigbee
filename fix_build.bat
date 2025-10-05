@echo off
echo ========================================
echo FIX BUILD HOMEY - METHODE ULTIME
echo ========================================

REM 1. Tuer tous les processus
echo.
echo 1. Arret processus...
taskkill /F /IM node.exe /T >nul 2>&1
taskkill /F /IM npm.exe /T >nul 2>&1
timeout /t 3 /nobreak >nul

REM 2. Supprimer caches
echo 2. Suppression caches...
if exist .homeybuild (
    rmdir /s /q .homeybuild
)
if exist .homeycompose (
    rmdir /s /q .homeycompose
)
timeout /t 2 /nobreak >nul

REM 3. Verification
echo 3. Verification...
if exist .homeybuild (
    echo    [ERREUR] .homeybuild existe encore
    exit /b 1
) else (
    echo    [OK] Caches supprimes
)

REM 4. Build
echo 4. Build...
homey app build
if %errorlevel% neq 0 (
    echo    [ERREUR] Build echoue
    exit /b 1
)

REM 5. Verification app.json
echo 5. Verification app.json...
if exist .homeybuild\app.json (
    echo    [OK] app.json existe
) else (
    echo    [ERREUR] app.json manquant
    exit /b 1
)

REM 6. Validation
echo 6. Validation publish...
homey app validate --level publish
if %errorlevel% neq 0 (
    echo    [ERREUR] Validation echouee
    exit /b 1
)

echo.
echo ========================================
echo SUCCESS - PRET POUR PUBLICATION
echo ========================================
echo.
echo Commandes suivantes:
echo   homey login
echo   homey app publish
echo.
