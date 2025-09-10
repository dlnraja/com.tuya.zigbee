#!/usr/bin/env node
'use strict';

@echo off
echo ===================================================
echo  ANALYSE DES DRIVERS TUYA ZIGBEE
echo ===================================================
echo.

setlocal enabledelayedexpansion

:: Définir les chemins
set "DRIVERS_DIR=drivers"
set "REPORT_FILE=driver-analysis-report.txt"
set "TEMP_FILE=%TEMP%\driver-temp.txt"

:: Vérifier si le dossier des drivers existe
if not exist "%DRIVERS_DIR%" (
    echo ERREUR: Le dossier des drivers est introuvable: %DRIVERS_DIR%
    pause
    exit /b 1
)

echo Analyse en cours...
echo.

:: Créer le fichier de rapport
echo =================================================== > "%REPORT_FILE%"
echo  RAPPORT D'ANALYSE DES DRIVERS - %date% %time% >> "%REPORT_FILE%"
echo =================================================== >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"

:: Compter les dossiers de drivers
set /a TOTAL_DRIVERS=0
set /a VALID_DRIVERS=0
set /a MISSING_CONFIG=0
set /a MISSING_ICONS=0

:: Parcourir les dossiers de drivers
for /d %%d in ("%DRIVERS_DIR%\*") do (
    set /a TOTAL_DRIVERS+=1
    set "DRIVER_NAME=%%~nxd"
    set "IS_VALID=1"
    
    echo Analyse de: !DRIVER_NAME!
    echo !DRIVER_NAME! >> "%REPORT_FILE%"
    
    :: Vérifier le fichier de configuration
    if exist "%%~fd\driver.compose.json" (
        echo   - Configuration: OK >> "%REPORT_FILE%"
    ) else (
        echo   - Configuration: MANQUANT >> "%REPORT_FILE%"
        set /a MISSING_CONFIG+=1
        set "IS_VALID=0"
    )
    
    :: Vérifier les icônes
    set "HAS_ICONS=0"
    if exist "%%~fd\assets\icon.svg" set /a HAS_ICONS+=1
    if exist "%%~fd\assets\images\large.png" set /a HAS_ICONS+=1
    
    if !HAS_ICONS! equ 2 (
        echo   - Icônes: OK >> "%REPORT_FILE%"
    ) else (
        echo   - Icônes: MANQUANTES >> "%REPORT_FILE%"
        set /a MISSING_ICONS+=1
        set "IS_VALID=0"
    )
    
    if !IS_VALID! equ 1 set /a VALID_DRIVERS+=1
    
    echo. >> "%REPORT_FILE%"
done

:: Calculer les pourcentages
set /a PERCENT_VALID=(VALID_DRIVERS * 100) / TOTAL_DRIVERS
set /a PERCENT_INVALID=100 - PERCENT_VALID

:: Générer le résumé
echo. >> "%REPORT_FILE%"
echo =================================================== >> "%REPORT_FILE%"
echo  RESUME >> "%REPORT_FILE%"
echo =================================================== >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"
echo Nombre total de drivers: %TOTAL_DRIVERS% >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"
echo Drivers valides: %VALID_DRIVERS% (%PERCENT_VALID%%) >> "%REPORT_FILE%"
echo Drivers avec problemes: %PERCENT_INVALID%%% >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"
echo Fichiers de configuration manquants: %MISSING_CONFIG% >> "%REPORT_FILE%"
echo Icônes manquantes: %MISSING_ICONS% >> "%REPORT_FILE%"

:: Afficher le résumé
echo.
echo ===================================================
echo  RESUME DE L'ANALYSE
echo ===================================================
echo.
type "%REPORT_FILE%" | findstr /i "RESUME"
echo.
echo ===================================================
echo.
echo Le rapport complet a ete enregistre dans: %REPORT_FILE%

:: Essayer d'ouvrir le rapport
start "" "%REPORT_FILE%"

endlocal

pause
