@echo off
echo 🎯 COMMIT_AND_PUBLISH - Commit puis publication
echo.

echo 🔄 Kill processus...
taskkill /f /im homey.exe 2>nul
taskkill /f /im node.exe 2>nul
echo.

echo 📤 Commit tous changements...
git add .
git commit -m "🎯 Clean .homeybuild and ready for final publication"
echo ✅ Changements committés
echo.

echo 🔍 Validation finale...
homey app validate
echo.

echo 🚀 PUBLICATION FINALE (sans changements non committés)...
echo ⚠️ RÉPONDEZ AUX PROMPTS:
echo    - Update version? → y (pour incrémenter)
echo    - Version type? → patch
echo    - Changelog? → Ultimate Zigbee Hub v2.1.7 - Final clean publication
echo.
homey app publish

echo.
echo 📤 Push final...
git push origin master

echo.
echo 🎉 TERMINÉ !
pause
