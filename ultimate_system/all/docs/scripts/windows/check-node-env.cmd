@echo off
setlocal enabledelayedexpansion

echo === Vérification de l'environnement Node.js ===
echo Date: %date% %time%
echo.

echo 1. Vérification de Node.js...
where node >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%a in ('node -v') do set NODE_VERSION=%%a
    echo ✅ Node.js est installé (version: !NODE_VERSION!)
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
echo 3. Création d'un script de test...
echo console.log('Test réussi!'); > test-script.js

if not exist test-script.js (
    echo ❌ Impossible de créer le script de test
    pause
    exit /b 1
)

echo 4. Exécution du script de test...
node test-script.js > test-output.txt 2>&1
set EXIT_CODE=!ERRORLEVEL!

type test-output.txt
if !EXIT_CODE! equ 0 (
    echo ✅ Script exécuté avec succès
) else (
    echo ❌ Erreur lors de l'exécution du script (code: !EXIT_CODE!)
)

del test-script.js test-output.txt >nul 2>&1

echo.
echo === Vérification terminée ===
pause
