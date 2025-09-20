@echo off
setlocal enabledelayedexpansion

echo === Diagnostic du système ===
echo Date: %date% %time%
echo.

echo 1. Vérification de Node.js...
where node >nul 2>&1
if %ERRORLEVEL% equ 0 (
    for /f "tokens=*" %%a in ('node -v') do set NODE_VERSION=%%a
    echo ✅ Node.js est installé (version: !NODE_VERSION!)
) else (
    echo ❌ Node.js n'est pas installé ou n'est pas dans le PATH
    echo Téléchargez-le depuis https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo 2. Vérification de npm...
where npm >nul 2>&1
if %ERRORLEVEL% equ 0 (
    for /f "tokens=*" %%a in ('npm -v') do set NPM_VERSION=%%a
    echo ✅ npm est installé (version: !NPM_VERSION!)
) else (
    echo ❌ npm n'est pas installé ou n'est pas dans le PATH
    pause
    exit /b 1
)

echo.
echo 3. Test d'accès au système de fichiers...
echo Test d'écriture... > test-file.txt
if exist test-file.txt (
    echo ✅ Test d'écriture réussi
    del test-file.txt >nul 2>&1
) else (
    echo ❌ Impossible d'écrire dans le répertoire courant
    pause
    exit /b 1
)

echo.
echo 4. Vérification des fichiers du projet...
set "MISSING_FILES=0"

if exist package.json (
    echo ✅ package.json trouvé
) else (
    echo ❌ package.json est manquant
    set /a MISSING_FILES+=1
)

if exist app.json (
    echo ✅ app.json trouvé
) else (
    echo ❌ app.json est manquant
    set /a MISSING_FILES+=1
)

if exist scripts\scout.js (
    echo ✅ scripts\scout.js trouvé
) else (
    echo ❌ scripts\scout.js est manquant
    set /a MISSING_FILES+=1
)

if %MISSING_FILES% gtr 0 (
    echo.
    echo ⚠️  Des fichiers importants sont manquants
)

echo.
echo 5. Test d'exécution d'un script simple...
echo console.log('Test réussi!'); > test-script.js
node test-script.js > test-output.txt 2>&1
set EXIT_CODE=%ERRORLEVEL%

type test-output.txt
if %EXIT_CODE% equ 0 (
    echo ✅ Script exécuté avec succès
) else (
    echo ❌ Erreur lors de l'exécution du script (code: %EXIT_CODE%)
)

del test-script.js test-output.txt >nul 2>&1

echo.
echo === Diagnostic terminé ===
pause
