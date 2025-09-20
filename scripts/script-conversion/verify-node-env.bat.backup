@echo off
echo === Vérification de l'environnement Node.js ===
echo.

echo 1. Vérification de la version de Node.js...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js n'est pas installé ou n'est pas dans le PATH.
    echo Veuillez installer Node.js depuis https://nodejs.org/
    pause
    exit /b 1
)

node -v
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Erreur lors de la vérification de la version de Node.js.
    pause
    exit /b 1
)

echo.
echo 2. Vérification de l'accès au système de fichiers...
echo Test d'écriture dans le répertoire courant...> test-file.txt
if exist test-file.txt (
    echo ✅ Écriture de fichier réussie
    del /q test-file.txt >nul 2>&1
) else (
    echo ❌ Impossible d'écrire dans le répertoire courant.
    echo Vérifiez les permissions du dossier: %CD%
    pause
    exit /b 1
)

echo.
echo 3. Vérification de l'accès réseau...
ping -n 1 www.google.com >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✅ Connexion Internet fonctionnelle
) else (
    echo ⚠ Impossible de se connecter à Internet. Certaines fonctionnalités pourraient ne pas fonctionner.
)

echo.
echo 4. Vérification des dépendances...
call npm list --depth=0
if %ERRORLEVEL% NEQ 0 (
    echo ⚠ Des problèmes ont été détectés avec les dépendances.
    echo Essayez d'exécuter: npm install
) else (
    echo ✅ Les dépendances semblent correctement installées
)

echo.
echo === Vérification terminée ===
pause
