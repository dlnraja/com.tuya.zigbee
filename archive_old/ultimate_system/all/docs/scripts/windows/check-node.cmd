@echo off
echo === Vérification de Node.js et npm ===
echo.

:: Vérifier si Node.js est installé
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ ERREUR: Node.js n'est pas installé ou n'est pas dans le PATH
    echo Veuillez installer Node.js depuis https://nodejs.org/
    pause
    exit /b 1
)

:: Afficher la version de Node.js
for /f "tokens=*" %%a in ('node -v') do set NODE_VERSION=%%a
echo ✅ Node.js est installé (version: %NODE_VERSION%)

:: Vérifier si npm est installé
where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ ERREUR: npm n'est pas installé ou n'est pas dans le PATH
    pause
    exit /b 1
)

:: Afficher la version de npm
for /f "tokens=*" %%a in ('npm -v') do set NPM_VERSION=%%a
echo ✅ npm est installé (version: %NPM_VERSION%)

:: Vérifier l'accès au système de fichiers
echo.
echo === Test d'accès au système de fichiers ===
echo Test d'écriture... > test-file.txt
if exist test-file.txt (
    echo ✅ Test d'écriture réussi
    del test-file.txt >nul 2>&1
) else (
    echo ❌ Impossible d'écrire dans le répertoire courant
    pause
    exit /b 1
)

:: Vérifier les dépendances
echo.
echo === Vérification des dépendances ===

if not exist package.json (
    echo ❌ ERREUR: Le fichier package.json est introuvable
    pause
    exit /b 1
)

echo ✅ package.json trouvé

if not exist node_modules (
    echo Installation des dépendances...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo ❌ ERREUR: Échec de l'installation des dépendances
        pause
        exit /b 1
    )
    echo ✅ Dépendances installées avec succès
) else (
    echo ✅ Le dossier node_modules existe déjà
)

echo.
echo === Vérification terminée avec succès ===
pause
