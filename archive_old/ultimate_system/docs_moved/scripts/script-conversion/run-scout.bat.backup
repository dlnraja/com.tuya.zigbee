@echo off
setlocal enabledelayedexpansion

echo === Exécution de l'analyse Scout ===
echo Date: %date% %time%
echo.

:: Vérifier Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Erreur: Node.js n'est pas installé ou n'est pas dans le PATH
    pause
    exit /b 1
)

:: Vérifier le script
if not exist "scripts\scout.js" (
    echo ❌ Erreur: Le fichier scripts\scout.js est introuvable
    pause
    exit /b 1
)

:: Créer le dossier de sortie
if not exist "analysis" mkdir analysis

:: Exécuter l'analyse
echo Exécution de l'analyse des datapoints...
node scripts/scout.js > analysis\scout-output.txt 2> analysis\scout-errors.txt
set "exit_code=!ERRORLEVEL!"

:: Afficher les résultats
echo.
echo === Résultats ===
if !exit_code! equ 0 (
    echo ✅ Analyse terminée avec succès
    echo Résultats enregistrés dans analysis\scout-output.txt
) else (
    echo ❌ Erreur lors de l'analyse (code: !exit_code!)
    echo.
    echo Dernières erreurs :
    type analysis\scout-errors.txt
)

echo.
pause
