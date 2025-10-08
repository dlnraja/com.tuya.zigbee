@echo off
setlocal enabledelayedexpansion

:: Configuration
set "SCAN_DIR=%~dp0"
set "OUTPUT_DIR=%SCAN_DIR%scan-results"
set "SCRIPTS=scout architect optimizer validator"

:: Créer le dossier de sortie
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

:: Fonction pour formater la date/heure
:GetTimestamp
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "timestamp=%dt:~0,4%-%dt:~4,2%-%dt:~6,2%_%dt:~8,2%-%dt:~10,2%-%dt:~12,2%"
goto :eof

:: Fonction pour exécuter un script
:RunScript
set "script=%~1"
set "script_path=%SCAN_DIR%scripts\%script%.js"
set "output_file=%OUTPUT_DIR%\%script%-%timestamp%.txt"

echo.
echo =======================================
echo EXÉCUTION: %script%
echo =======================================

echo Script: %script% > "%output_file%"
echo Chemin: %script_path% >> "%output_file%"
echo Date: %date% %time% >> "%output_file%"
echo. >> "%output_file%"

:: Vérifier si le script existe
if not exist "%script_path%" (
    echo ❌ ERREUR: Le script %script%.js est introuvable >> "%output_file%"
    echo ❌ ERREUR: Le script %script%.js est introuvable
    exit /b 1
)

echo Vérification de Node.js...
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ ERREUR: Node.js n'est pas installé ou n'est pas dans le PATH >> "%output_file%"
    echo ❌ ERREUR: Node.js n'est pas installé ou n'est pas dans le PATH
    exit /b 1
)

echo Exécution de %script%.js...
node "%script_path%" >> "%output_file%" 2>&1
set "exit_code=!ERRORLEVEL!"

echo. >> "%output_file%"
echo ======================================= >> "%output_file%"
echo Terminé avec le code de sortie: !exit_code! >> "%output_file%"
echo Date: %date% %time% >> "%output_file%"

if !exit_code! equ 0 (
    echo ✅ %script% terminé avec succès
    echo   Résultats dans: %output_file%
) else (
    echo ❌ %script% a échoué avec le code !exit_code!
    echo   Voir les erreurs dans: %output_file%
    echo.
    echo Dernières lignes de sortie:
    type "%output_file%" | findstr /n /i "error fail warning" | findstr /i /v "no errors no warnings" || echo Aucune erreur ou avertissement trouvé
)

goto :eof

:: Démarrer le processus
call :GetTimestamp

:: Exécuter chaque script
for %%s in (%SCRIPTS%) do (
    call :RunScript %%s
    if !ERRORLEVEL! neq 0 (
        echo.
        echo ❌ Arrêt du processus en raison d'une erreur
        pause
        exit /b 1
    )
)

echo.
echo =======================================
echo TOUTES LES ANALYSES SONT TERMINÉES
cd /d %~dp0
echo Dossier de travail: %CD%
echo Résultats enregistrés dans: %OUTPUT_DIR%
echo =======================================
dir /b "%OUTPUT_DIR%\*%timestamp%*"
pause
