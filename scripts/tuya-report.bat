@echo off
setlocal enabledelayedexpansion

:: Configuration
set "REPORT_FILE=tuya-report.txt"
set "DRIVERS_DIR=drivers"

:: Vérifier si le dossier des drivers existe
if not exist "%DRIVERS_DIR%" (
    echo ERREUR: Le dossier "%DRIVERS_DIR%" n'existe pas
    pause
    exit /b 1
)

:: Initialiser le rapport
echo ======================== > "%REPORT_FILE%"
echo  RAPPORT TUYA ZIGBEE    >> "%REPORT_FILE%"
echo ======================== >> "%REPORT_FILE%"
echo Date: %date% %time% >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"

:: Initialiser les compteurs
set /a TOTAL_DRIVERS=0
set /a VALID_DRIVERS=0
set /a HAS_ICONS=0

:: Analyser chaque dossier de driver
echo Analyse des dossiers dans %DRIVERS_DIR%...
for /d %%i in ("%DRIVERS_DIR%\*") do (
    set /a TOTAL_DRIVERS+=1
    set "DRIVER_NAME=%%~nxi"
    set "HAS_CONFIG=0"
    
    echo [%date% %time%] Vérification de !DRIVER_NAME!...
    
    :: Vérifier le fichier de configuration
    if exist "%%i\driver.compose.json" (
        set /a HAS_CONFIG=1
        set /a VALID_DRIVERS+=1
        echo !DRIVER_NAME! - CONFIG: OK >> "%REPORT_FILE%"
        
        :: Vérifier les icônes
        dir /b "%%i\*.png" >nul 2>&1
        if !ERRORLEVEL! EQU 0 (
            set /a HAS_ICONS+=1
            echo !DRIVER_NAME! - ICONES: OK >> "%REPORT_FILE%"
        ) else (
            echo !DRIVER_NAME! - ICONES: MANQUANTES >> "%REPORT_FILE%"
        )
    ) else (
        echo !DRIVER_NAME! - ERREUR: Fichier de configuration manquant >> "%REPORT_FILE%"
    )
    
    echo. >> "%REPORT_FILE%"
)

:: Générer le résumé
echo ========= RESUME ========= >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"
echo Nombre total de drivers: !TOTAL_DRIVERS! >> "%REPORT_FILE%"
echo Nombre de drivers valides: !VALID_DRIVERS! >> "%REPORT_FILE%"
echo Nombre de drivers avec icônes: !HAS_ICONS! >> "%REPORT_FILE%"

if !TOTAL_DRIVERS! GTR 0 (
    set /a PERCENT_VALID=(VALID_DRIVERS * 100) / TOTAL_DRIVERS
    echo Taux de réussite: !PERCENT_VALID!%% >> "%REPORT_FILE%"
)

:: Afficher le chemin du rapport
echo.
echo ==============================
echo  ANALYSE TERMINEE
echo  Rapport généré: %REPORT_FILE%
echo ==============================

:: Ouvrir le rapport
start "" "%REPORT_FILE%"

endlocal
