@echo off
chcp 65001 >nul
echo 🚀 NETTOYAGE DES DRIVERS PROBLÉMATIQUES
echo ======================================
echo.

set "drivers_dir=drivers"
set "timestamp=%date:~-4,4%-%date:~-7,2%-%date:~-10,2%_%time:~0,2%-%time:~3,2%-%time:~6,2%"
set "timestamp=%timestamp: =0%"

echo 📁 Dossier drivers: %drivers_dir%
echo ⏰ Timestamp: %timestamp%
echo.

if not exist "%drivers_dir%" (
    echo ❌ Dossier drivers non trouvé
    pause
    exit /b 1
)

echo 🧹 ÉTAPE 1: Nettoyage des dossiers problématiques...
echo.

set "cleaned_count=0"

REM Nettoyer le dossier undefined
if exist "%drivers_dir%\zigbee\undefined" (
    echo 🗑️  Suppression du dossier undefined...
    rmdir /s /q "%drivers_dir%\zigbee\undefined" 2>nul
    if not exist "%drivers_dir%\zigbee\undefined" (
        echo ✅ Dossier undefined supprimé
        set /a cleaned_count+=1
    ) else (
        echo ❌ Erreur suppression dossier undefined
    )
)

REM Nettoyer les dossiers _tz*
for /d %%i in ("%drivers_dir%\zigbee\_tz*") do (
    echo 🗑️  Suppression du dossier problématique: %%~nxi
    rmdir /s /q "%%i" 2>nul
    if not exist "%%i" (
        echo ✅ Dossier %%~nxi supprimé
        set /a cleaned_count+=1
    ) else (
        echo ❌ Erreur suppression dossier %%~nxi
    )
)

REM Nettoyer les dossiers _tze*
for /d %%i in ("%drivers_dir%\zigbee\_tze*") do (
    echo 🗑️  Suppression du dossier problématique: %%~nxi
    rmdir /s /q "%%i" 2>nul
    if not exist "%%i" (
        echo ✅ Dossier %%~nxi supprimé
        set /a cleaned_count+=1
    ) else (
        echo ❌ Erreur suppression dossier %%~nxi
    )
)

echo.
echo ✅ Nettoyage terminé: %cleaned_count% dossiers problématiques supprimés
echo.

echo 🔍 ÉTAPE 2: Vérification de la structure...
echo.

REM Créer la structure de base
if not exist "%drivers_dir%\zigbee" mkdir "%drivers_dir%\zigbee"
if not exist "%drivers_dir%\tuya" mkdir "%drivers_dir%\tuya"

REM Créer les catégories de base
set "categories=light plug switch sensor cover lock other"
set "vendors=tuya aqara ikea philips sonoff ledvance generic"

for %%p in (zigbee tuya) do (
    for %%v in (%vendors%) do (
        if not exist "%drivers_dir%\%%p\%%v" mkdir "%drivers_dir%\%%p\%%v"
        for %%c in (%categories%) do (
            if not exist "%drivers_dir%\%%p\%%v\%%c" mkdir "%drivers_dir%\%%p\%%v\%%c"
        )
    )
)

echo ✅ Structure de base créée
echo.

echo 📊 ÉTAPE 3: Analyse des drivers restants...
echo.

set "driver_count=0"
for /r "%drivers_dir%" %%f in (driver.compose.json driver.json) do (
    set /a driver_count+=1
    if %driver_count% leq 10 (
        echo   - %%~dpf
    )
)

if %driver_count% gtr 10 (
    echo   ... et %driver_count% autres drivers
)

echo.
echo 📊 Drivers restants: %driver_count%
echo.

echo 📋 RAPPORT FINAL
echo ================
echo.
echo 🗑️  Dossiers problématiques supprimés: %cleaned_count%
echo 📁 Drivers restants: %driver_count%
echo 📁 Structure créée: zigbee/tuya avec vendors et catégories
echo.
echo 🎉 NETTOYAGE ET RÉORGANISATION TERMINÉS !
echo.

REM Sauvegarder le rapport
set "report_file=CLEANUP_REPORT_%timestamp%.txt"
echo Rapport de Nettoyage et Réorganisation > "%report_file%"
echo Date: %timestamp% >> "%report_file%"
echo Dossier: %drivers_dir% >> "%report_file%"
echo. >> "%report_file%"
echo Résumé: >> "%report_file%"
echo - Dossiers problématiques supprimés: %cleaned_count% >> "%report_file%"
echo - Drivers restants: %driver_count% >> "%report_file%"
echo - Structure créée: zigbee/tuya avec vendors et catégories >> "%report_file%"

echo 📄 Rapport sauvegardé: %report_file%
echo.
pause
