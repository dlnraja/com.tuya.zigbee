@echo off
echo 🚀 PUBLICATION HOMEY APP - Manuel simple
echo.

echo 📤 Commit changements...
git add .
git commit -m "🎯 v2.1.5 - Ready for publication"
echo.

echo 🔍 Validation...
homey app validate
if errorlevel 1 (
    echo ❌ Validation échouée
    pause
    exit /b 1
)
echo ✅ Validation OK
echo.

echo 📱 Publication... (suivez les prompts)
homey app publish

echo.
echo 📤 Push vers GitHub...
git push origin master

echo.
echo 🎉 PUBLICATION TERMINÉE !
echo 📊 GitHub Actions: https://github.com/dlnraja/com.tuya.zigbee/actions
echo 📱 Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.ultimate.zigbee.hub
echo.
pause
