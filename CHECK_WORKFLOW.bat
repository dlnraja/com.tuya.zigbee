@echo off
chcp 65001 >nul
color 0E
cls

echo ╔════════════════════════════════════════════════════════════════════╗
echo ║            MONITORING GITHUB ACTIONS WORKFLOW                      ║
echo ╚════════════════════════════════════════════════════════════════════╝
echo.

echo 🔍 Vérification GitHub CLI...
where gh >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ GitHub CLI (gh) non installé
    echo.
    echo 📦 Installation:
    echo    winget install --id GitHub.cli
    echo.
    echo 🌐 Ou visitez:
    echo    https://github.com/dlnraja/com.tuya.zigbee/actions
    echo.
    pause
    exit /b 1
)

echo ✅ GitHub CLI installé
echo.

echo ════════════════════════════════════════════════════════════════════
echo 📊 WORKFLOWS ACTIFS
echo ════════════════════════════════════════════════════════════════════
echo.

gh run list --repo dlnraja/com.tuya.zigbee --limit 10

echo.
echo ════════════════════════════════════════════════════════════════════
echo.

choice /C YN /M "Voir les détails d'un workflow"
if %ERRORLEVEL%==1 (
    echo.
    echo 🔍 Monitoring du dernier workflow...
    echo.
    gh run view --repo dlnraja/com.tuya.zigbee
    echo.
    
    choice /C YN /M "Voir les logs"
    if %ERRORLEVEL%==1 (
        gh run view --repo dlnraja/com.tuya.zigbee --log
    )
)

echo.
echo ════════════════════════════════════════════════════════════════════
echo 🔗 LIENS UTILES
echo ════════════════════════════════════════════════════════════════════
echo.
echo GitHub Actions:
echo https://github.com/dlnraja/com.tuya.zigbee/actions
echo.
echo Homey Dashboard:
echo https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee
echo.
echo ════════════════════════════════════════════════════════════════════
echo.
pause
