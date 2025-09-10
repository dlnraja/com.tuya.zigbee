#!/usr/bin/env node
'use strict';

@echo off
setlocal enabledelayedexpansion

echo ===========================================
echo  GENERATEUR DE RAPPORT D'INTEGRATION TUYA   
echo ===========================================

echo [%date% %time%] Démarrage de la génération du rapport...

REM Créer le dossier des rapports s'il n'existe pas
if not exist "reports" mkdir reports

REM Fichier de sortie
set "REPORT_FILE=reports\integration-report-simple.md"

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

for /d %%i in (drivers\*) do (
    set /a DRIVER_COUNT+=1
    set "DRIVER_NAME=%%~nxi"
    set "HAS_CONFIG=0"
    
    REM Vérifier le fichier de configuration
    if exist "%%i\driver.compose.json" (
        set /a HAS_CONFIG=1
        set /a VALID_DRIVERS+=1
    ) else (
        set /a MISSING_CONFIG+=1
    )
    
    REM Ajouter une ligne au rapport
    set "STATUS=✅"
    if !HAS_CONFIG!==0 set "STATUS=❌"
    
    if !DRIVER_COUNT!==1 (
        echo ^| Nom ^| Statut ^| >> "%REPORT_FILE%"
        echo ^|-----^|--------^| >> "%REPORT_FILE%"
    )
    
    echo ^| !DRIVER_NAME! ^| !STATUS! ^| >> "%REPORT_FILE%"
)

REM Générer le résumé
echo. >> "%REPORT_FILE%"
echo "## 📊 Statistiques" >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"
echo "- **Nombre total de drivers:** !DRIVER_COUNT!" >> "%REPORT_FILE%"
echo "- **Drivers valides:** !VALID_DRIVERS!" >> "%REPORT_FILE%"
echo "- **Fichiers de configuration manquants:** !MISSING_CONFIG!" >> "%REPORT_FILE%"

REM Ajouter les recommandations
echo. >> "%REPORT_FILE%"
echo "## 🚀 Recommandations" >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"
echo "1. **Corriger les problèmes critiques**" >> "%REPORT_FILE%"
echo "   - !MISSING_CONFIG! drivers nécessitent une attention immédiate" >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"
echo "2. **Gestion des icônes**" >> "%REPORT_FILE%"
echo "   - Standardiser le format des icônes (PNG recommandé)" >> "%REPORT_FILE%"

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

endlocal
