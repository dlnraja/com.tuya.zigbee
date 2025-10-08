@echo off
echo === Vérification de l'environnement de développement ===
echo.

echo [1/5] Vérification de Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERREUR: Node.js n'est pas installé ou n'est pas dans le PATH
    echo Veuillez installer Node.js depuis https://nodejs.org/
    pause
    exit /b 1
) else (
    echo ✅ Node.js est installé
    node -v
)

echo.
echo [2/5] Vérification de npm...
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERREUR: npm n'est pas installé ou n'est pas dans le PATH
) else (
    echo ✅ npm est installé
    npm -v
)

echo.
echo [3/5] Vérification des fichiers du projet...
if not exist package.json (
    echo ❌ ERREUR: Le fichier package.json est introuvable
) else (
    echo ✅ package.json trouvé
)

if not exist app.json (
    echo ⚠️  ATTENTION: Le fichier app.json est introuvable
) else (
    echo ✅ app.json trouvé
)

if not exist drivers (
    echo ⚠️  ATTENTION: Le dossier drivers est introuvable
) else (
    echo ✅ Dossier drivers trouvé
)

echo.
echo [4/5] Vérification des dépendances...
if exist node_modules (
    echo ✅ Le dossier node_modules existe
) else (
    echo ⚠️  Le dossier node_modules est manquant
    echo Installation des dépendances...
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ ERREUR: Échec de l'installation des dépendances
        pause
        exit /b 1
    )
)

echo.
echo [5/5] Test d'exécution...
echo console.log('Test réussi!'); > test.js
node test.js
if %errorlevel% neq 0 (
    echo ❌ ERREUR: Impossible d'exécuter un script Node.js simple
    del test.js
    pause
    exit /b 1
)
del test.js

echo.
echo === Vérification terminée avec succès ===
pause
