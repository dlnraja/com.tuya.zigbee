@echo off
cls
echo.
echo ===================================================================
echo    LIVE DEBUG SESSION - Homey App Real-Time
echo ===================================================================
echo.
echo Ce script va:
echo   1. Verifier la connexion Homey
echo   2. Builder l'app
echo   3. Installer sur Homey
echo   4. Afficher les logs en temps reel
echo.
pause
echo.

echo [1/4] Verification connexion Homey...
call homey info
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Impossible de se connecter a Homey!
    echo.
    echo Solutions:
    echo   1. Verifier que Homey est allume
    echo   2. Verifier connexion WiFi
    echo   3. Lancer: homey select
    echo.
    pause
    exit /b 1
)
echo [OK] Homey connecte
echo.

echo [2/4] Building app...
call homey app build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Build failed!
    pause
    exit /b 1
)
echo [OK] App built
echo.

echo [3/4] Installing on Homey...
call homey app install
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Install failed!
    pause
    exit /b 1
)
echo [OK] App installed
echo.

echo [4/4] Starting live logs...
echo.
echo ===================================================================
echo    LOGS EN TEMPS REEL (Ctrl+C pour arreter)
echo ===================================================================
echo.
call homey app log com.dlnraja.tuya.zigbee
