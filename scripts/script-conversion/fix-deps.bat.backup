@echo off
echo === Installation des dépendances manquantes ===
echo.

echo 1. Nettoyage du cache npm...
call npm cache clean --force

if exist node_modules (
    echo 2. Suppression du dossier node_modules...
    rmdir /s /q node_modules
) else (
    echo 2. Pas de node_modules à supprimer.
)

echo.
echo 3. Installation des dépendances principales...
call npm install --save axios@1.6.2 uuid@9.0.0 chalk@5.3.0

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Erreur lors de l'installation des dépendances principales.
    pause
    exit /b 1
)

echo.
echo 4. Installation des dépendances de développement...
call npm install --save-dev eslint@8.55.0 eslint-config-airbnb-base@15.0.0 eslint-plugin-import@2.29.0

if %ERRORLEVEL% NEQ 0 (
    echo ⚠ Erreur lors de l'installation des dépendances de développement.
    echo Poursuite malgré tout...
)

echo.
echo 5. Installation des dépendances optionnelles...
call npm install --save fs-extra@11.1.1 glob@10.3.3

echo.
echo === Vérification de l'installation ===
call npm list --depth=0

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Les dépendances ont été installées avec succès !
    echo Vous pouvez maintenant essayer de lancer le script principal.
) else (
    echo.
    echo ⚠ Il y a eu des problèmes avec l'installation des dépendances.
    echo Essayez de réinstaller manuellement avec: npm install
)

echo.
pause
