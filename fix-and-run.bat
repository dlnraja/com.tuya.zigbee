@echo off
setlocal enabledelayedexpansion

echo === Résolution des problèmes de dépendances ===

:: Vérification de Node.js et npm
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Erreur: Node.js n'est pas installé ou n'est pas dans le PATH
    echo Veuillez installer Node.js depuis https://nodejs.org/
    pause
    exit /b 1
)

npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Erreur: npm n'est pas installé ou n'est pas dans le PATH
    echo Veuillez installer Node.js (qui inclut npm) depuis https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo Nettoyage des dépendances existantes...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del /f /q package-lock.json

:: Aller dans le dossier scripts
cd scripts

:: Vérifier si le fichier package.json existe
if not exist package.json (
    echo Création d'un fichier package.json minimal...
    echo {
    echo   "name": "tuya-zigbee-scripts",
    echo   "version": "1.0.0",
    echo   "private": true,
    echo   "type": "module"
    echo } > package.json
)

echo.
echo Installation des dépendances requises...
call npm install uuid@9.0.0 axios@1.6.2 chalk@5.3.0 fs-extra@11.1.1 glob@10.3.3 --save

if %errorlevel% neq 0 (
    echo.
    echo Erreur lors de l'installation des dépendances
    pause
    exit /b 1
)

echo.
echo === Exécution du script update-drivers.js ===
call node update-drivers.js

if %errorlevel% neq 0 (
    echo.
    echo Le script a rencontré une erreur (code: %errorlevel%)
    echo Veuillez vérifier les messages d'erreur ci-dessus.
) else (
    echo.
    echo Script exécuté avec succès
)

:: Revenir au dossier parent
cd ..

pause
