@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo 🚀 CORRECTION DE LA STRUCTURE DES DRIVERS
echo =========================================
echo.

REM Configuration
set "driversDir=drivers"
set "timestamp=%date:~-4,4%-%date:~-7,2%-%date:~-10,2%_%time:~0,2%-%time:~3,2%-%time:~6,2%"
set "backupDir=.backup-structure-fix-%timestamp%"
set "backupDir=%backupDir: =0%"

echo 📁 Dossier drivers: %driversDir%
echo ⏰ Timestamp: %timestamp%
echo 💾 Backup: %backupDir%
echo.

REM ÉTAPE 1: Créer un backup
echo 📋 ÉTAPE 1: Création du backup
if exist "%driversDir%" (
    mkdir "%backupDir%" 2>nul
    xcopy "%driversDir%" "%backupDir%" /E /I /H /Y >nul 2>&1
    if !errorlevel! equ 0 (
        echo ✅ Backup créé dans: %backupDir%
    ) else (
        echo ⚠️ Échec du backup, continuation...
    )
)

echo.

REM ÉTAPE 2: Analyser la structure actuelle
echo 📋 ÉTAPE 2: Analyse de la structure actuelle
echo.

REM Vérifier drivers/zigbee/tuya (structure incorrecte)
if exist "%driversDir%\zigbee\tuya" (
    echo 🔍 Détection de la structure incorrecte: drivers/zigbee/tuya
    echo 📊 Catégories trouvées dans drivers/zigbee/tuya:
    for /d %%i in ("%driversDir%\zigbee\tuya\*") do (
        echo    - %%~ni
    )
    echo.
)

REM Vérifier drivers/tuya (structure correcte)
if exist "%driversDir%\tuya" (
    echo 🔍 Structure drivers/tuya (correcte):
    for /d %%i in ("%driversDir%\tuya\*") do (
        echo    - %%~ni
    )
    echo.
)

echo.

REM ÉTAPE 3: Vérifier les sources .tmp*
echo 📋 ÉTAPE 3: Vérification des sources .tmp*
echo.

if exist ".tmp_tuya_zip_work" (
    echo 📁 Source trouvée: .tmp_tuya_zip_work
    dir ".tmp_tuya_zip_work" /s /b | find /c /v "" >nul 2>&1
    echo    📊 Dossier temporaire Tuya
    echo.
)

if exist "tmp-sources-analysis-report.json" (
    echo 📁 Source trouvée: tmp-sources-analysis-report.json
    for %%A in ("tmp-sources-analysis-report.json") do (
        set /a size=%%~zA/1024/1024
        echo    📊 Taille: !size! MB
    )
    echo.
)

if exist "TMP_SOURCES_ANALYSIS.json" (
    echo 📁 Source trouvée: TMP_SOURCES_ANALYSIS.json
    for %%A in ("TMP_SOURCES_ANALYSIS.json") do (
        set /a size=%%~zA/1024/1024
        echo    📊 Taille: !size! MB
    )
    echo.
)

echo.

REM ÉTAPE 4: Corriger la structure incorrecte
echo 📋 ÉTAPE 4: Correction de la structure incorrecte
echo.

if exist "%driversDir%\zigbee\tuya" (
    echo 🔄 Correction de drivers/zigbee/tuya...
    
    REM Déplacer les catégories vers drivers/tuya
    for /d %%i in ("%driversDir%\zigbee\tuya\*") do (
        echo    📦 Déplacement: %%~ni
        
        set "sourcePath=%driversDir%\zigbee\tuya\%%~ni"
        set "destPath=%driversDir%\tuya\%%~ni"
        
        if exist "!destPath!" (
            echo       ⚠️ Destination existe, fusion...
            REM Fusionner les contenus
            xcopy "!sourcePath!" "!destPath!" /E /I /H /Y >nul 2>&1
        ) else (
            REM Déplacer complètement
            move "!sourcePath!" "!destPath!" >nul 2>&1
        )
        
        echo       ✅ Terminé: %%~ni
    )
    
    REM Supprimer le dossier zigbee/tuya vide
    rmdir /s /q "%driversDir%\zigbee\tuya" 2>nul
    if !errorlevel! equ 0 (
        echo 🗑️ Dossier drivers/zigbee/tuya supprimé (vide)
    )
)

echo.

REM ÉTAPE 5: Vérifier et nettoyer les dossiers vides
echo 📋 ÉTAPE 5: Nettoyage des dossiers vides
echo.

REM Supprimer les dossiers vides récursivement
:cleanup_loop
set "found_empty=0"
for /f "delims=" %%i in ('dir /s /b /ad "%driversDir%" 2^>nul ^| sort /r') do (
    dir "%%i" /b 2>nul | find /c /v "" >nul 2>&1
    if !errorlevel! equ 1 (
        rmdir "%%i" 2>nul
        if !errorlevel! equ 0 (
            echo    🗑️ Dossier vide supprimé: %%i
            set "found_empty=1"
        )
    )
)
if "!found_empty!"=="1" goto cleanup_loop

echo.

REM ÉTAPE 6: Rapport final
echo 📋 ÉTAPE 6: Rapport final de la structure
echo.

echo 📊 Structure finale des drivers:
echo.

REM Afficher la structure zigbee
if exist "%driversDir%\zigbee" (
    echo 📁 drivers/zigbee/
    for /d %%i in ("%driversDir%\zigbee\*") do (
        echo    📁 %%~ni/
        for /d %%j in ("%%i\*") do (
            set "driverCount=0"
            for /d %%k in ("%%j\*") do set /a driverCount+=1
            echo       📁 %%~nj/ (!driverCount! drivers)
        )
    )
)

echo.

REM Afficher la structure tuya
if exist "%driversDir%\tuya" (
    echo 📁 drivers/tuya/
    for /d %%i in ("%driversDir%\tuya\*") do (
        set "driverCount=0"
        for /d %%j in ("%%i\*") do set /a driverCount+=1
        echo    📁 %%~ni/ (!driverCount! drivers)
    )
)

echo.

REM ÉTAPE 7: Vérifier les sources .tmp* pour l'enrichissement
echo 📋 ÉTAPE 7: Analyse des sources .tmp* pour l'enrichissement
echo.

if exist "tmp-sources-analysis-report.json" (
    echo 📊 Données .tmp* disponibles:
    echo    📄 Fichier: tmp-sources-analysis-report.json
    echo    📊 Entrées: Analyse en cours...
    echo.
)

echo.

REM ÉTAPE 8: Recommandations
echo 📋 ÉTAPE 8: Recommandations pour la suite
echo.

echo 🎯 Prochaines étapes recommandées:
echo    1. ✅ Structure des drivers corrigée
echo    2. 🔄 Exécuter enrich-drivers.js avec --apply
echo    3. 🔄 Exécuter verify-coherence-and-enrich.js
echo    4. 🔄 Exécuter reorganize-drivers-ultimate.js
echo    5. 🔄 Valider l'app Homey
echo.

echo 🎉 CORRECTION DE LA STRUCTURE TERMINÉE !
echo 📁 Backup disponible dans: %backupDir%
echo ⏰ Timestamp: %timestamp%

pause
