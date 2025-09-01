@echo off
echo === Test d'environnement de base ===
echo.
echo 1. Vérification de Node.js...
node --version
if %errorlevel% neq 0 (
    echo ❌ Node.js n'est pas installé ou n'est pas dans le PATH
    pause
    exit /b 1
)

echo.
echo 2. Vérification de npm...
npm --version
if %errorlevel% neq 0 (
    echo ❌ npm n'est pas installé ou n'est pas dans le PATH
    pause
    exit /b 1
)

echo.
echo 3. Vérification des fichiers du projet...
if not exist package.json (
    echo ❌ Fichier package.json introuvable
    pause
    exit /b 1
) else (
    echo ✅ package.json trouvé
)

if not exist app.json (
    echo ⚠️  Fichier app.json introuvable
) else (
    echo ✅ app.json trouvé
)

if not exist drivers (
    echo ⚠️  Dossier drivers introuvable
) else (
    echo ✅ Dossier drivers trouvé
)

echo.
echo 4. Installation des dépendances...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Erreur lors de l'installation des dépendances
    pause
    exit /b 1
)

echo.
echo 5. Exécution d'un test simple...
echo console.log('Test réussi!'); > test.js
node test.js
if %errorlevel% neq 0 (
    echo ❌ Erreur lors de l'exécution du test
    del test.js
    pause
    exit /b 1
)
del test.js

echo.
echo === Test réussi! ===
pause
