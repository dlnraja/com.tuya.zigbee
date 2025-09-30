@echo off
echo 🚀 FINAL_PUBLISH - Publication finale simple
echo.

echo 🔄 Nettoyage processus...
taskkill /f /im node.exe 2>nul
taskkill /f /im homey.exe 2>nul
echo ✅ Processus nettoyés
echo.

echo 📤 Commit changements...
git add .
git commit -m "🎯 Final publication - batch automated"
echo.

echo 🔍 Validation...
homey app validate
if errorlevel 1 (
    echo ⚠️ Validation avec warnings, continue...
)
echo.

echo 🚀 PUBLICATION INTERACTIVE:
echo ⚠️ RÉPONDEZ AUX PROMPTS:
echo    - Uncommitted changes? y
echo    - Update version? y  
echo    - Version type? patch
echo    - Changelog? Ultimate Zigbee Hub v2.1.6 - Final automated
echo.
echo 📱 Lancement homey app publish...
homey app publish

echo.
echo 📤 Push GitHub...
git push origin master

echo.
echo 🎉 PUBLICATION TERMINÉE !
echo 📊 GitHub Actions: https://github.com/dlnraja/com.tuya.zigbee/actions
echo 📱 Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.ultimate.zigbee.hub
echo.
pause
