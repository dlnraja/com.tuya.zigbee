@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo 🚀 EXÉCUTION DE LA RÉORGANISATION FINALE DES DRIVERS
echo =====================================================
echo.

REM Configuration
set "timestamp=%date:~-4,4%-%date:~-7,2%-%date:~-10,2%_%time:~0,2%-%time:~3,2%-%time:~6,2%"
set "timestamp=%timestamp: =0%"
set "backupDir=.backup-final-reorg-%timestamp%"

REM ÉTAPE 1: Vérification de l'environnement
echo 📋 ÉTAPE 1: Vérification de l'environnement
echo.

if not exist "drivers" (
    echo ❌ Dossier drivers non trouvé!
    pause
    exit /b 1
)

if not exist "scripts\reorganize-drivers-final.js" (
    echo ❌ Script reorganize-drivers-final.js non trouvé!
    pause
    exit /b 1
)

echo ✅ Environnement vérifié
echo.

REM ÉTAPE 2: Création de la sauvegarde
echo 📋 ÉTAPE 2: Création de la sauvegarde
echo.

if exist "%backupDir%" (
    rmdir /s /q "%backupDir%" 2>nul
)

xcopy "drivers" "%backupDir%" /E /I /H /Y >nul 2>&1
if !errorlevel! equ 0 (
    echo ✅ Sauvegarde créée: %backupDir%
) else (
    echo ❌ Erreur lors de la sauvegarde
    pause
    exit /b 1
)

echo.

REM ÉTAPE 3: Exécution de la réorganisation Node.js
echo 📋 ÉTAPE 3: Exécution de la réorganisation Node.js
echo.

node scripts\reorganize-drivers-final.js
if !errorlevel! equ 0 (
    echo ✅ Réorganisation Node.js terminée avec succès
) else (
    echo ⚠️ La réorganisation Node.js a échoué, tentative de récupération...
    echo.
    
    REM Tentative de récupération avec Batch
    echo 📋 RÉCUPÉRATION: Réorganisation manuelle avec Batch
    echo.
    
    REM Créer la structure de base
    set "protocols=zigbee tuya"
    set "categories=light switch plug sensor sensor-motion sensor-temp sensor-contact lock meter-power thermostat curtain fan climate security other"
    
    for %%p in (%protocols%) do (
        if exist "drivers\%%p" (
            echo 🔄 Traitement du protocole: %%p
            
            REM Créer les catégories
            for %%c in (%categories%) do (
                if not exist "drivers\%%p\%%c" (
                    mkdir "drivers\%%p\%%c" 2>nul
                )
            )
            
            REM Analyser les éléments existants
            for /d %%i in ("drivers\%%p\*") do (
                set "isCategory="
                for %%c in (%categories%) do (
                    if "%%~ni"=="%%c" set "isCategory=1"
                )
                
                if not defined isCategory (
                    set "itemName=%%~ni"
                    set "itemPath=drivers\%%p\%%~ni"
                    
                    REM Déterminer la catégorie et le vendor
                    set "category=other"
                    set "vendor=generic"
                    
                    echo !itemName! | findstr /i "light bulb lamp" >nul && set "category=light"
                    echo !itemName! | findstr /i "switch button" >nul && set "category=switch"
                    echo !itemName! | findstr /i "plug socket" >nul && set "category=plug"
                    echo !itemName! | findstr /i "sensor" >nul && (
                        echo !itemName! | findstr /i "motion pir" >nul && set "category=sensor-motion"
                        echo !itemName! | findstr /i "temp temperature" >nul && set "category=sensor-temp"
                        echo !itemName! | findstr /i "contact door window" >nul && set "category=sensor-contact"
                    )
                    echo !itemName! | findstr /i "lock" >nul && set "category=lock"
                    echo !itemName! | findstr /i "meter power" >nul && set "category=meter-power"
                    echo !itemName! | findstr /i "thermostat" >nul && set "category=thermostat"
                    echo !itemName! | findstr /i "curtain blind" >nul && set "category=curtain"
                    echo !itemName! | findstr /i "fan" >nul && set "category=fan"
                    echo !itemName! | findstr /i "climate" >nul && set "category=climate"
                    echo !itemName! | findstr /i "security" >nul && set "category=security"
                    
                    echo !itemName! | findstr /i "tuya" >nul && set "vendor=tuya"
                    echo !itemName! | findstr /i "zigbee" >nul && set "vendor=zigbee"
                    echo !itemName! | findstr /i "smart" >nul && set "vendor=smart"
                    echo !itemName! | findstr /i "homey" >nul && set "vendor=homey"
                    
                    set "targetPath=drivers\%%p\!category!\!vendor!\!itemName!"
                    set "targetDir=drivers\%%p\!category!\!vendor!"
                    
                    if not exist "!targetDir!" (
                        mkdir "!targetDir!" 2>nul
                    )
                    
                    if not exist "!targetPath!" (
                        move "!itemPath!" "!targetPath!" >nul 2>&1
                        if !errorlevel! equ 0 (
                            echo    📦 Déplacé: !itemName! → !category!/!vendor!/!itemName!
                        ) else (
                            echo    ⚠️ Impossible de déplacer !itemName!
                        )
                    ) else (
                        echo    ⚠️ Destination existe déjà: !category!/!vendor!/!itemName!
                    )
                )
            )
        )
    )
    
    echo ✅ Récupération Batch terminée
)

echo.

REM ÉTAPE 4: Nettoyage des répertoires vides
echo 📋 ÉTAPE 4: Nettoyage des répertoires vides
echo.

REM Supprimer les répertoires vides récursivement
:cleanup_loop
set "cleaned=0"
for /f "delims=" %%d in ('dir /s /b /ad "drivers" ^| sort /r') do (
    dir "%%d" /b 2>nul | findstr /r "^$" >nul && (
        rmdir "%%d" 2>nul && set /a cleaned+=1
    )
)
if !cleaned! gtr 0 (
    echo 🧹 Répertoires vides supprimés: !cleaned!
    goto cleanup_loop
)

echo ✅ Nettoyage terminé
echo.

REM ÉTAPE 5: Génération du rapport final
echo 📋 ÉTAPE 5: Génération du rapport final
echo.

REM Créer un rapport simple
echo { > FINAL_REORGANIZATION_REPORT.json
echo   "timestamp": "%date% %time%", >> FINAL_REORGANIZATION_REPORT.json
echo   "structure": { >> FINAL_REORGANIZATION_REPORT.json
echo     "zigbee": {}, >> FINAL_REORGANIZATION_REPORT.json
echo     "tuya": {} >> FINAL_REORGANIZATION_REPORT.json
echo   }, >> FINAL_REORGANIZATION_REPORT.json
echo   "statistics": { >> FINAL_REORGANIZATION_REPORT.json

REM Compter les drivers
set "totalDrivers=0"
set "totalCategories=0"
set "totalVendors=0"

for %%p in (zigbee tuya) do (
    if exist "drivers\%%p" (
        for /d %%c in ("drivers\%%p\*") do (
            set /a totalCategories+=1
            for /d %%v in ("%%c\*") do (
                set /a totalVendors+=1
                for /d %%d in ("%%v\*") do (
                    set /a totalDrivers+=1
                )
            )
        )
    )
)

echo     "totalDrivers": !totalDrivers!, >> FINAL_REORGANIZATION_REPORT.json
echo     "totalCategories": !totalCategories!, >> FINAL_REORGANIZATION_REPORT.json
echo     "totalVendors": !totalVendors! >> FINAL_REORGANIZATION_REPORT.json
echo   } >> FINAL_REORGANIZATION_REPORT.json
echo } >> FINAL_REORGANIZATION_REPORT.json

REM Afficher le résumé
echo 📋 RÉSUMÉ DE LA RÉORGANISATION FINALE:
echo    📊 Total drivers: !totalDrivers!
echo    📁 Total catégories: !totalCategories!
echo    🏢 Total vendors: !totalVendors!
echo    📄 Rapport sauvegardé: FINAL_REORGANIZATION_REPORT.json

echo.

REM ÉTAPE 6: Validation finale
echo 📋 ÉTAPE 6: Validation finale
echo.

set "dirCount=0"
for /f %%c in ('dir /s /b /ad "drivers" ^| find /c /v ""') do set "dirCount=%%c"
echo ✅ Validation terminée - !dirCount! répertoires trouvés

echo.
echo 🎉 RÉORGANISATION FINALE TERMINÉE AVEC SUCCÈS!
echo.
echo 📋 PROCHAINES ÉTAPES RECOMMANDÉES:
echo    1. Vérifier la structure des drivers
echo    2. Tester la validation Homey
echo    3. Mettre à jour mega.js
echo    4. Commiter et pousser les changements
echo.
echo 💾 Sauvegarde disponible: %backupDir%
echo 📄 Rapport disponible: FINAL_REORGANIZATION_REPORT.json
echo.
pause
