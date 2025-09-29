@echo off
setlocal enabledelayedexpansion

echo === Exécution des analyses ===
echo Date: %date% %time%
echo.

:: Créer le dossier de sortie
if not exist "analysis" mkdir analysis

:: Fonction pour exécuter un script
:run_script
set "script=%~1"
set "output_file=analysis\%script%-output.txt"
set "error_file=analysis\%script%-errors.txt"

echo.
echo ===== Exécution de %script% =====
echo Fichier de sortie: %output_file%

:: Vérifier si le script existe
if not exist "scripts\%script%.js" (
    echo ❌ Le script scripts\%script%.js est introuvable
    goto :next_script
)

:: Exécuter le script
echo Exécution en cours...
node "scripts\%script%.js" > "%output_file%" 2> "%error_file%"
set "exit_code=!ERRORLEVEL!"

:: Afficher les résultats
if !exit_code! equ 0 (
    echo ✅ Analyse terminée avec succès
) else (
    echo ❌ Erreur lors de l'analyse (code: !exit_code!)
    echo Dernières erreurs :
    type "%error_file%"
)

:next_script
shift
if not "%~1"=="" goto run_script

echo.
echo === Toutes les analyses sont terminées ===
echo Les résultats sont disponibles dans le dossier 'analysis'
pause
