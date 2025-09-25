@echo off
echo === Vérification de base ===
echo.

echo 1. Vérification de Node.js...
where node >nul 2>&1
if %ERRORLEVEL% equ 0 (
    for /f "tokens=*" %%a in ('node -v') do echo Node.js version: %%a
) else (
    echo ❌ Node.js n'est pas installé ou n'est pas dans le PATH
    echo Téléchargez-le depuis https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo 2. Test d'écriture...
echo Test > test-file.txt
if exist test-file.txt (
    echo ✅ Test d'écriture réussi
    del test-file.txt >nul 2>&1
) else (
    echo ❌ Impossible d'écrire dans le répertoire courant
    pause
    exit /b 1
)

echo.
echo 3. Vérification des fichiers...
if exist package.json (
    echo ✅ package.json trouvé
) else (
    echo ❌ package.json est manquant
)

if exist scripts\scout.js (
    echo ✅ scripts\scout.js trouvé
) else (
    echo ❌ scripts\scout.js est manquant
)

echo.
pause
