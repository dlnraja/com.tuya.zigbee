@echo off
echo === Test Node.js ===
echo.

echo 1. Vérification de Node.js...
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ ERREUR: Node.js n'est pas installé ou n'est pas dans le PATH
    pause
    exit /b 1
)

for /f "tokens=*" %%a in ('node -v') do set NODE_VERSION=%%a
echo ✅ Node.js version: %NODE_VERSION%

echo.
echo 2. Vérification de l'accès au système de fichiers...
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
echo 3. Exécution d'un script simple...
echo console.log('Test réussi!'); > test-script.js
node test-script.js > output.txt 2>&1
set EXIT_CODE=%ERRORLEVEL%

type output.txt
if %EXIT_CODE% equ 0 (
    echo ✅ Script exécuté avec succès
) else (
    echo ❌ Erreur lors de l'exécution du script (code: %EXIT_CODE%)
)

del test-script.js output.txt >nul 2>&1

echo.
pause
