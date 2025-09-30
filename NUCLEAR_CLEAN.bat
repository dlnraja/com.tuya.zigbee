@echo off
echo 🚀 NUCLEAR_CLEAN - Suppression force ultime du .homeybuild
echo.

echo 🔄 Kill TOUS les processus...
taskkill /f /im homey.exe 2>nul
taskkill /f /im node.exe 2>nul
taskkill /f /im cmd.exe /fi "WINDOWTITLE eq Administrator*" 2>nul
echo.

echo 🔧 Réparation permissions ULTRA...
takeown /r /f .homeybuild /d y 2>nul
icacls .homeybuild /reset /t /c /q 2>nul
icacls .homeybuild /grant %username%:(OI)(CI)F /t /c /q 2>nul
echo.

echo 🗑️ Suppression NUCLEAR...
REM Méthode 1: rmdir classique
rmdir /s /q .homeybuild 2>nul

REM Méthode 2: forfiles pour vider récursivement
forfiles /p .homeybuild /m *.* /s /c "cmd /c del /f /q @path" 2>nul
forfiles /p .homeybuild /m *.* /s /c "cmd /c rd /q @path" 2>nul

REM Méthode 3: rd avec force
rd /s /q .homeybuild 2>nul

REM Méthode 4: robocopy pour vider
mkdir empty_temp 2>nul
robocopy empty_temp .homeybuild /mir /w:1 /r:1 2>nul
rmdir /s /q empty_temp 2>nul
rmdir /s /q .homeybuild 2>nul

echo.
if exist .homeybuild (
    echo ❌ Répertoire résistant - Méthode PowerShell...
    powershell -Command "Get-ChildItem -Path '.homeybuild' -Recurse -Force | Remove-Item -Force -Recurse; Remove-Item '.homeybuild' -Force"
) else (
    echo ✅ RÉPERTOIRE .homeybuild SUPPRIMÉ !
)

echo.
echo 📤 Commit avant publication...
git add .
git commit -m "🎯 Nuclear clean .homeybuild - ready for final publication"

echo.
echo 🔍 Validation propre...
homey app validate

echo.
echo 🚀 PUBLICATION FINALE (environnement PROPRE)...
echo ⚠️ RÉPONDEZ MAINTENANT:
echo    Update version? → y
echo    Version type? → patch  
echo    Changelog? → Ultimate Zigbee Hub v2.1.7 - Nuclear clean publication
echo.
homey app publish

echo.
echo 📤 Push final...
git push origin master

echo.
echo 🎉 MISSION ACCOMPLIE !
echo 📊 GitHub Actions: https://github.com/dlnraja/com.tuya.zigbee/actions
echo 📱 Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.ultimate.zigbee.hub
pause
