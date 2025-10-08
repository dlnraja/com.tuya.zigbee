@echo off
setlocal enabledelayedexpansion

:: Créer un dossier pour les résultats
if not exist scan-results mkdir scan-results
set "timestamp=%date:/=-%_%time::=-%"
set "timestamp=!timestamp: =0!"
set "timestamp=!timestamp:,=!"
set "timestamp=!timestamp:/=-!"
set "timestamp=!timestamp:.=-!"

:: Fonction pour exécuter un script et capturer la sortie
:RunScript
set "script=%~1"
set "output_file=scan-results\%script%-!timestamp!.txt"

echo.
echo =======================================
echo Exécution de: %script%
echo =======================================
echo.

echo Exécution de %script%... > "%output_file%"
echo Date: %date% %time% >> "%output_file%"
echo. >> "%output_file%"

:: Exécuter le script et capturer la sortie
node "scripts\%script%.js" >> "%output_file%" 2>&1
set "exit_code=!ERRORLEVEL!"

echo. >> "%output_file%"
echo. >> "%output_file%"
echo ======================================= >> "%output_file%"
echo Terminé avec le code de sortie: !exit_code! >> "%output_file%"
echo Date: %date% %time% >> "%output_file%"

if !exit_code! equ 0 (
    echo ✅ %script% terminé avec succès
    echo   Voir les résultats dans: %output_file%
) else (
    echo ❌ %script% a échoué avec le code !exit_code!
    echo   Voir les erreurs dans: %output_file%
    echo.
    echo Dernières lignes de sortie:
    type "%output_file%" | findstr /n /i "error fail warning" | findstr /i /v "no errors no warnings" || echo Aucune erreur ou avertissement trouvé
)

goto :eof

:: Exécuter les analyses
call :RunScript scout
call :RunScript architect
call :RunScript optimizer
call :RunScript validator

:: Afficher un résumé
echo.
echo =======================================
echo ANALYSE TERMINÉE
echo =======================================
echo.
echo Résultats enregistrés dans le dossier 'scan-results':
dir /b scan-results\*-!timestamp!.txt
echo.
pause
