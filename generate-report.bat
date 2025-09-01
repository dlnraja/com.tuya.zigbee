@echo off
setlocal enabledelayedexpansion

echo ===========================================
echo  GENERATEUR DE RAPPORT D'INTEGRATION TUYA   
echo ===========================================

echo [%date% %time%] Démarrage de la génération du rapport...

REM Créer le dossier des rapports s'il n'existe pas
if not exist "reports" mkdir reports

REM Fichier de sortie
set "REPORT_FILE=reports\integration-report_%date:/=-%_%time::=-%.md"

echo # Rapport d'Integration Tuya Zigbee > "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"
echo **Date de génération:** %date% %time% >> "%REPORT_FILE%"
echo **Dépôt:** [dlnraja/com.tuya.zigbee](https://github.com/dlnraja/com.tuya.zigbee) >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"

echo ## 📊 Résumé >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"

REM Analyser les dossiers de drivers
set DRIVER_COUNT=0
set VALID_DRIVERS=0
set MISSING_CONFIG=0
set MISSING_ICONS=0

echo [%date% %time%] Analyse des drivers...

echo ## 📋 Liste des Drivers >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"
echo "| Nom | Statut | Fichier Config | Icônes |" >> "%REPORT_FILE%"
echo "|-----|--------|----------------|--------|" >> "%REPORT_FILE%"

for /d %%i in (drivers\*) do (
    set /a DRIVER_COUNT+=1
    set "DRIVER_NAME=%%~nxi"
    set "HAS_CONFIG=0"
    set "HAS_ICONS=0"
    
    REM Vérifier le fichier de configuration
    if exist "%%i\driver.compose.json" (
        set /a HAS_CONFIG=1
        
        REM Vérifier les icônes
        for /f "usebackq tokens=*" %%j in (`powershell -Command "(Get-Content '%%i\driver.compose.json' | ConvertFrom-Json).images.small" 2^>nul`) do set "SMALL_ICON=%%~j"
        for /f "usebackq tokens=*" %%k in (`powershell -Command "(Get-Content '%%i\driver.compose.json' | ConvertFrom-Json).images.large" 2^>nul`) do set "LARGE_ICON=%%~k"
        
        if exist "%%i\!SMALL_ICON!" if exist "%%i\!LARGE_ICON!" set /a HAS_ICONS=1
    )
    
    REM Mettre à jour les compteurs
    if !HAS_CONFIG!==1 set /a VALID_DRIVERS+=1
    if !HAS_CONFIG!==0 set /a MISSING_CONFIG+=1
    if !HAS_ICONS!==0 set /a MISSING_ICONS+=1
    
    REM Ajouter une ligne au rapport
    set "STATUS=✅"
    if !HAS_CONFIG!==0 set "STATUS=❌"
    
    set "ICON_STATUS=✅"
    if !HAS_ICONS!==0 set "ICON_STATUS=❌"
    
    echo ^| !DRIVER_NAME! ^| !STATUS! ^| !HAS_CONFIG! ^| !ICON_STATUS! ^|>> "%REPORT_FILE%"
)

REM Générer le résumé
echo. >> "%REPORT_FILE%"
echo "## 📊 Statistiques" >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"
echo "- **Nombre total de drivers:** !DRIVER_COUNT!" >> "%REPORT_FILE%"
echo "- **Drivers valides:** !VALID_DRIVERS!" >> "%REPORT_FILE%"
echo "- **Fichiers de configuration manquants:** !MISSING_CONFIG!" >> "%REPORT_FILE%"
echo "- **Icônes manquantes:** !MISSING_ICONS!" >> "%REPORT_FILE%"

REM Ajouter les recommandations
echo. >> "%REPORT_FILE%"
echo "## 🚀 Recommandations" >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"
echo "1. **Corriger les problèmes critiques**" >> "%REPORT_FILE%"
echo "   - !MISSING_CONFIG! drivers nécessitent une attention immédiate" >> "%REPORT_FILE%"
echo "   - Mettre à jour les configurations manquantes ou invalides" >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"
echo "2. **Gestion des icônes**" >> "%REPORT_FILE%"
echo "   - Standardiser le format des icônes (PNG recommandé)" >> "%REPORT_FILE%"
echo "   - S'assurer que tous les drivers ont des icônes aux bonnes tailles" >> "%REPORT_FILE%"

echo. >> "%REPORT_FILE%"
echo "---" >> "%REPORT_FILE%"
echo "*Rapport généré automatiquement - Tuya Zigbee Integration*" >> "%REPORT_FILE%"

echo.
echo ===========================================
echo  RAPPORT GENERE AVEC SUCCES
echo  Fichier: %REPORT_FILE%
echo ===========================================

REM Ouvrir le rapport dans l'éditeur par défaut
start "" "%REPORT_FILE%"

endlocalecho off
echo Génération du rapport d'intégration...

set "report=integration-report.txt"
echo. > %report%

echo ===== RAPPORT D'INTÉGRATION ===== >> %report%
echo Date: %date% %time% >> %report%
echo. >> %report%

echo === STRUCTURE DU PROJET === >> %report%
echo. >> %report%

echo Dossiers principaux: >> %report%
for /d %%i in (*) do (
    if not "%%i"=="node_modules" (
        echo - %%i >> %report%
    )
)

echo. >> %report%
echo === DRIVERS === >> %report%
cd drivers
set count=0
set valid=0

for /d %%i in (*) do (
    set /a count+=1
    echo [%%i] >> ..\%report%
    
    if exist "%%i\driver.compose.json" (
        echo - Configuration: OUI >> ..\%report%
        
        for /f "tokens=2 delims=:" %%a in ('findstr /i "\"name\"" "%%i\driver.compose.json"') do (
            set name=%%a
            set name=!name:\"=!
            echo - Nom: !name! >> ..\%report%
        )
        
        for /f "tokens=2 delims=:" %%a in ('findstr /i "\"class\"" "%%i\driver.compose.json"') do (
            set class=%%a
            set class=!class:\"=!
            echo - Classe: !class! >> ..\%report%
        )
        
        set /a valid+=1
    ) else (
        echo - Configuration: NON >> ..\%report%
    )
    
    echo. >> ..\%report%
)
cd ..

echo. >> %report%
echo === RÉSUMÉ === >> %report%
echo Nombre total de drivers: %count% >> %report%
echo Nombre de drivers valides: %valid% >> %report%

if %valid% LSS %count% (
    echo. >> %report%
    echo === DRIVERS INCOMPLETS === >> %report%
    findstr /s /i /n /c:"Configuration: NON" %report% >> %report%
)

echo. >> %report%
echo ===== FIN DU RAPPORT ===== >> %report%

type %report%
echo.
echo Rapport généré: %report%
