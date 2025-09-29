@echo off
echo ===================================
echo = Configuration et Analyse Complète =
echo ===================================
echo.

:: Vérification de Node.js
echo [1/6] Vérification de Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERREUR: Node.js n'est pas installé ou n'est pas dans le PATH
    echo Veuillez installer Node.js depuis https://nodejs.org/
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%a in ('node -v') do set node_version=%%a
    echo ✅ Node.js est installé (version: %node_version%)
)

:: Vérification de npm
echo.
echo [2/6] Vérification de npm...
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERREUR: npm n'est pas installé ou n'est pas dans le PATH
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%a in ('npm -v') do set npm_version=%%a
    echo ✅ npm est installé (version: %npm_version%)
)

:: Nettoyage et mise à jour de npm
echo.
echo [3/6] Nettoyage et mise à jour de npm...
call npm cache clean --force
if %errorlevel% neq 0 (
    echo ⚠️  Impossible de nettoyer le cache npm, continuation...
) else (
    echo ✅ Cache npm nettoyé
)

call npm install -g npm@latest
if %errorlevel% neq 0 (
    echo ⚠️  Impossible de mettre à jour npm, continuation...
) else (
    echo ✅ npm mis à jour avec succès
)

:: Installation des dépendances
echo.
echo [4/6] Installation des dépendances...
if exist node_modules (
    echo Suppression de l'ancien dossier node_modules...
    rmdir /s /q node_modules
)

if exist package-lock.json (
    echo Suppression de l'ancien package-lock.json...
    del package-lock.json
)

call npm install
if %errorlevel% neq 0 (
    echo ❌ ERREUR: Échec de l'installation des dépendances
    pause
    exit /b 1
) else (
    echo ✅ Dépendances installées avec succès
)

:: Création du dossier de sortie pour les rapports
if not exist reports (
    mkdir reports
    echo ✅ Dossier 'reports' créé
)

:: Exécution des analyses
echo.
echo [5/6] Exécution des analyses...

echo.
echo === Analyse des datapoints (scout.js) ===
node scripts/scout.js > reports/scout-report.txt 2>&1
if %errorlevel% equ 0 (
    echo ✅ Analyse des datapoints terminée (voir reports/scout-report.txt)
) else (
    echo ⚠️  L'analyse des datapoints a rencontré des erreurs (voir reports/scout-report.txt)
)

echo.
echo === Analyse de l'architecture (architect.js) ===
node scripts/architect.js > reports/architect-report.txt 2>&1
if %errorlevel% equ 0 (
    echo ✅ Analyse de l'architecture terminée (voir reports/architect-report.txt)
) else (
    echo ⚠️  L'analyse de l'architecture a rencontré des erreurs (voir reports/architect-report.txt)
)

echo.
echo === Optimisation du code (optimizer.js) ===
node scripts/optimizer.js > reports/optimizer-report.txt 2>&1
if %errorlevel% equ 0 (
    echo ✅ Optimisation du code terminée (voir reports/optimizer-report.txt)
) else (
    echo ⚠️  L'optimisation du code a rencontré des erreurs (voir reports/optimizer-report.txt)
)

echo.
echo === Validation du projet (validator.js) ===
node scripts/validator.js > reports/validator-report.txt 2>&1
if %errorlevel% equ 0 (
    echo ✅ Validation du projet terminée (voir reports/validator-report.txt)
) else (
    echo ⚠️  La validation du projet a rencontré des erreurs (voir reports/validator-report.txt)
)

:: Génération du rapport final
echo.
echo [6/6] Génération du rapport final...

echo =============================== > reports/final-report.txt
echo == RAPPORT D'ANALYSE COMPLÈTE == >> reports/final-report.txt
echo =============================== >> reports/final-report.txt
date /t >> reports/final-report.txt
time /t >> reports/final-report.txt
echo. >> reports/final-report.txt

echo === Résumé des analyses === >> reports/final-report.txt
echo. >> reports/final-report.txt

type reports/scout-report.txt >> reports/final-report.txt 2>nul
echo. >> reports/final-report.txt
echo ======================== >> reports/final-report.txt
echo. >> reports/final-report.txt

type reports/architect-report.txt >> reports/final-report.txt 2>nul
echo. >> reports/final-report.txt
echo ========================== >> reports/final-report.txt
echo. >> reports/final-report.txt

type reports/optimizer-report.txt >> reports/final-report.txt 2>nul
echo. >> reports/final-report.txt
echo ========================== >> reports/final-report.txt
echo. >> reports/final-report.txt

type reports/validator-report.txt >> reports/final-report.txt 2>nul
echo. >> reports/final-report.txt
echo ========================= >> reports/final-report.txt

echo.
echo ===================================
echo = Analyse terminée avec succès !   =
echo = Voir le rapport complet dans le dossier 'reports' =
echo ===================================

:: Ouvrir le rapport final dans l'éditeur par défaut
start "" "reports\final-report.txt"

pause
