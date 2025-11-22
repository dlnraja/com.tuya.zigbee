@echo off
cls
echo.
echo ===================================================================
echo    HOMEY APP RUN - Mode Debug Temps Reel
echo ===================================================================
echo.
echo Ce mode permet:
echo   ✓ Voir TOUS les logs en temps reel
echo   ✓ Recharge automatique a chaque modification
echo   ✓ Debug interactif
echo.
echo Note: Peut timeout si Homey pas accessible localement
echo Alternative: Utiliser LIVE_DEBUG.bat
echo.
pause
echo.

echo Verification connexion...
call homey info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Homey non accessible - Le debug run va probablement timeout
    echo.
    echo Voulez-vous utiliser LIVE_DEBUG.bat a la place? (Y/N)
    choice /C YN /N /M "Choix: "
    if %ERRORLEVEL% EQU 1 (
        call LIVE_DEBUG.bat
        exit /b
    )
)

echo.
echo Starting homey app run...
echo.
echo ===================================================================
call homey app run
