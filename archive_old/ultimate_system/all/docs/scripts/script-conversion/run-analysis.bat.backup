@echo off
echo === Démontage du projet ===
echo.
echo 1. Nettoyage du cache npm...
call npm cache clean --force

echo.
echo 2. Installation des dépendances...
call npm install

echo.
echo 3. Exécution des analyses...
echo.

echo === Analyse des datapoints ===
node scripts/scout.js > analysis-scout.txt 2>&1
if %errorlevel% equ 0 (
    echo ✅ Analyse des datapoints terminée (voir analysis-scout.txt)
) else (
    echo ❌ Erreur lors de l'analyse des datapoints
)

echo.
echo === Analyse de l'architecture ===
node scripts/architect.js > analysis-architect.txt 2>&1
if %errorlevel% equ 0 (
    echo ✅ Analyse de l'architecture terminée (voir analysis-architect.txt)
) else (
    echo ❌ Erreur lors de l'analyse de l'architecture
)

echo.
echo === Optimisation du code ===
node scripts/optimizer.js > analysis-optimizer.txt 2>&1
if %errorlevel% equ 0 (
    echo ✅ Optimisation du code terminée (voir analysis-optimizer.txt)
) else (
    echo ❌ Erreur lors de l'optimisation du code
)

echo.
echo === Validation du projet ===
node scripts/validator.js > analysis-validator.txt 2>&1
if %errorlevel% equ 0 (
    echo ✅ Validation du projet terminée (voir analysis-validator.txt)
) else (
    echo ❌ Erreur lors de la validation du projet
)

echo.
echo === Analyse terminée ===
echo.
echo Fichiers générés :
dir analysis-*.txt
pause
