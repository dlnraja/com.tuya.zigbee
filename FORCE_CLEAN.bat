@echo off
echo 🧹 FORCE_CLEAN - Nettoyage force du répertoire .homeybuild
echo.

echo 🔄 Kill processus homey/node...
taskkill /f /im homey.exe 2>nul
taskkill /f /im node.exe 2>nul
echo.

echo 🔧 Prise de possession...
takeown /r /f .homeybuild 2>nul
icacls .homeybuild /grant %username%:F /t 2>nul
echo.

echo 🗑️ Suppression forcée...
rmdir /s /q .homeybuild 2>nul
if exist .homeybuild (
    echo ⚠️ Répertoire encore présent, nettoyage fichier par fichier...
    forfiles /p .homeybuild /m *.* /s /c "cmd /c del /f /q @path" 2>nul
    rmdir /s /q .homeybuild 2>nul
)

if not exist .homeybuild (
    echo ✅ Répertoire .homeybuild supprimé !
) else (
    echo ❌ Répertoire résistant, redémarrage requis
)

echo.
echo 🚀 Relance publication...
homey app publish
echo.
pause
