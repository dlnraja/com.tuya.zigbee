@echo off
setlocal enabledelayedexpansion

:: Configuration
set "REPORT_FILE=reports\integration-report.txt"
set "DRIVERS_DIR=drivers"

:: Créer le dossier des rapports s'il n'existe pas
if not exist "reports" mkdir reports

echo ===========================================
echo  RAPPORT D'INTEGRATION TUYA ZIGBEE
echo  Date: %date% %time%
echo ===========================================

echo [%date% %time%] Démarrage de l'analyse...

:: Initialiser les compteurs
set TOTAL_DRIVERS=0
set VALID_DRIVERS=0
set INVALID_DRIVERS=0
set HAS_ICONS=0

:: Créer un nouveau rapport
echo. > "%REPORT_FILE%"
echo ===== RAPPORT D'INTEGRATION TUYA ZIGBEE ===== >> "%REPORT_FILE%"
echo Date: %date% %time% >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"

echo === DRIVERS ANALYSES === >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"

:: Vérifier si le dossier des drivers existe
if not exist "%DRIVERS_DIR%" (
    echo ERREUR: Le dossier "%DRIVERS_DIR%" n'existe pas >> "%REPORT_FILE%"
    goto :end_script
)

:: Analyser chaque dossier de driver
for /d %%i in (%DRIVERS_DIR%\*) do (
    set /a TOTAL_DRIVERS+=1
    set "DRIVER_NAME=%%~nxi"
    set "HAS_CONFIG=0"
    set "DRIVER_HAS_ICONS=0"
    
    echo [%date% %time%] Analyse de !DRIVER_NAME!...
    
    :: Vérifier le fichier de configuration
    if exist "%%i\driver.compose.json" (
        set /a HAS_CONFIG=1
        
        :: Vérifier les icônes (méthode simple)
        dir /b "%%i\*.png" >nul 2>&1
        if !ERRORLEVEL! EQU 0 (
            set /a HAS_ICONS+=1
            set DRIVER_HAS_ICONS=1
        )
    )
    
    :: Mettre à jour les compteurs
    if !HAS_CONFIG! EQU 1 (
        set /a VALID_DRIVERS+=1
    ) else (
        set /a INVALID_DRIVERS+=1
    )
    
    :: Ajouter les informations au rapport
    set "STATUS=OK"
    if !HAS_CONFIG! EQU 0 set "STATUS=ERREUR: Fichier de configuration manquant"
    
    echo !DRIVER_NAME! - !STATUS! >> "%REPORT_FILE%"
    if !HAS_CONFIG! EQU 1 if !DRIVER_HAS_ICONS! EQU 0 (
        echo "  ATTENTION: Aucune icône PNG trouvée" >> "%REPORT_FILE%"
    )
    echo. >> "%REPORT_FILE%"
)

:: Générer le résumé
echo. >> "%REPORT_FILE%"
echo === RESUME === >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"
echo Nombre total de drivers: !TOTAL_DRIVERS! >> "%REPORT_FILE%"
echo Nombre de drivers valides: !VALID_DRIVERS! >> "%REPORT_FILE%"
echo Nombre de drivers avec erreurs: !INVALID_DRIVERS! >> "%REPORT_FILE%"
if !TOTAL_DRIVERS! GTR 0 (
    set /a PERCENT_VALID=(VALID_DRIVERS * 100) / TOTAL_DRIVERS
    echo Taux de réussite: !PERCENT_VALID!%% >> "%REPORT_FILE%"
)
echo. >> "%REPORT_FILE%"

:: Ajouter des recommandations
echo === RECOMMANDATIONS === >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"

if !INVALID_DRIVERS! GTR 0 (
    echo 1. Corriger les !INVALID_DRIVERS! drivers avec des erreurs de configuration >> "%REPORT_FILE%"
) else (
    echo 1. Tous les drivers ont un fichier de configuration valide >> "%REPORT_FILE%"
)

if !HAS_ICONS! EQU 0 (
    echo 2. Aucune icône PNG trouvée dans les dossiers de drivers >> "%REPORT_FILE%"
) else (
    echo 2. Vérifier que tous les drivers ont des icônes aux bonnes dimensions >> "%REPORT_FILE%"
)

echo 3. Vérifier les traductions pour chaque driver >> "%REPORT_FILE%"
echo 4. Tester les fonctionnalités de chaque driver >> "%REPORT_FILE%"

:end_script
:: Afficher le chemin du rapport
echo.
echo ===========================================
echo  ANALYSE TERMINEE
echo  Rapport généré: %REPORT_FILE%
echo ===========================================

:: Attendre une touche avant de quitter
pause

:: Ouvrir le rapport
start "" "%REPORT_FILE%"

endlocal
    set "dir=%%i"
    if not "!dir!"=="node_modules" (
        echo - %%i >> %report%
    )
)

echo. >> %report%
echo Fichiers racine: >> %report%
for %%i in (*.*) do (
    set "file=%%i"
    if not "!file!"=="%report%" (
        echo - %%i >> %report%
    )
)

echo. >> %report%
echo === DRIVERS === >> %report%
cd drivers
set count=0
for /d %%i in (*) do (
    set /a count+=1
    echo [%%i] >> ..\%report%
    
    if exist "%%i\driver.compose.json" (
        echo - Configuration: OUI >> ..\%report%
        
        for /f "tokens=*" %%a in ('type "%%i\driver.compose.json" ^| findstr /i "\"name\""') do (
            echo - !%%a >> ..\%report%
        )
    else
        echo - Configuration: NON >> ..\%report%
    fi
    
    echo. >> ..\%report%
)
cd ..

echo. >> %report%
echo === RÉSUMÉ === >> %report%
echo Nombre total de drivers: %count% >> %report%

echo. >> %report%
echo ===== FIN DU RAPPORT ===== >> %report%

type %report% | more
echo.
echo Rapport généré: %report%
