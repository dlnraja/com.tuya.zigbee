@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo 🚀 RÉORGANISATION DIRECTE DES DRIVERS
echo 📅 Date: %date% %time%
echo.

REM Configuration
set "driversDir=drivers"
set "backupDir=backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "backupDir=%backupDir: =0%"

REM ÉTAPE 1: Vérification de l'environnement
echo 📁 Dossier drivers: %driversDir%
echo 💾 Dossier backup: %backupDir%
echo.

if not exist "%driversDir%" (
    echo ❌ Dossier drivers introuvable!
    pause
    exit /b 1
)

REM ÉTAPE 2: Création du backup
echo 💾 Création du backup...
if exist "%backupDir%" rmdir /s /q "%backupDir%" 2>nul
mkdir "%backupDir%" 2>nul

xcopy "%driversDir%" "%backupDir%" /E /I /H /Y >nul 2>&1
if !errorlevel! equ 0 (
    echo ✅ Backup créé: %backupDir%
) else (
    echo ❌ Erreur lors de la création du backup
    pause
    exit /b 1
)
echo.

REM ÉTAPE 3: Analyse de la structure actuelle
echo 📊 Analyse de la structure actuelle...
if exist "%driversDir%\zigbee" (
    echo    📁 Protocol: zigbee
    for /d %%i in ("%driversDir%\zigbee\*") do (
        echo       📦 %%~ni
    )
)
if exist "%driversDir%\tuya" (
    echo    📁 Protocol: tuya
    for /d %%i in ("%driversDir%\tuya\*") do (
        echo       📦 %%~ni
    )
)
echo.

REM ÉTAPE 4: Réorganisation selon la structure protocol/category/vendor
echo 📋 Réorganisation selon la structure protocol/category/vendor...

REM Créer les catégories standard
set "categories=light switch sensor cover climate security other"
set "protocols=zigbee tuya"

for %%p in (%protocols%) do (
    if exist "%driversDir%\%%p" (
        echo    📁 Protocol: %%p
        for %%c in (%categories%) do (
            if not exist "%driversDir%\%%p\%%c" (
                mkdir "%driversDir%\%%p\%%c" 2>nul
                echo       📁 Catégorie créée: %%p\%%c
            )
        )
        
        REM Traiter chaque élément
        for /d %%i in ("%driversDir%\%%p\*") do (
            set "isCategory=0"
            for %%c in (%categories%) do (
                if "%%~ni"=="%%c" set "isCategory=1"
            )
            
            if !isCategory! equ 0 (
                set "itemName=%%~ni"
                set "category=other"
                set "vendor=generic"
                
                REM Logique de catégorisation
                echo !itemName! | findstr /i "light bulb lamp led" >nul && set "category=light"
                echo !itemName! | findstr /i "switch relay outlet" >nul && set "category=switch"
                echo !itemName! | findstr /i "sensor motion temp humidity" >nul && set "category=sensor"
                echo !itemName! | findstr /i "cover curtain blind shutter" >nul && set "category=cover"
                echo !itemName! | findstr /i "climate thermostat ac heater" >nul && set "category=climate"
                echo !itemName! | findstr /i "security camera lock alarm" >nul && set "category=security"
                
                REM Logique de vendor
                echo !itemName! | findstr /i "tuya smart" >nul && set "vendor=tuya"
                echo !itemName! | findstr /i "zigbee z2m" >nul && set "vendor=zigbee"
                echo !itemName! | findstr /i "wifi wlan" >nul && set "vendor=wifi"
                
                set "targetPath=%driversDir%\%%p\!category!\!vendor!\!itemName!"
                set "targetDir=%driversDir%\%%p\!category!\!vendor!"
                
                if not exist "!targetDir!" mkdir "!targetDir!" 2>nul
                
                if not exist "!targetPath!" (
                    move "%%i" "!targetPath!" >nul 2>&1
                    if !errorlevel! equ 0 (
                        echo       📦 Déplacé: !itemName! → !category!\!vendor!\!itemName!
                    ) else (
                        echo       ⚠️ Impossible de déplacer !itemName!
                    )
                ) else (
                    echo       ⚠️ Destination existe: !category!\!vendor!\!itemName!
                )
            )
        )
    )
)
echo.

REM ÉTAPE 5: Nettoyage des dossiers vides
echo 🧹 Nettoyage des dossiers vides...
for /f "delims=" %%d in ('dir /s /b /ad "%driversDir%" ^| sort /r') do (
    if exist "%%d" (
        dir "%%d" /b 2>nul | findstr /r "^" >nul || (
            rmdir "%%d" 2>nul && echo    🗑️ Dossier supprimé (vide): %%d
        )
    )
)
echo.

REM ÉTAPE 6: Rapport final
echo 📊 RAPPORT FINAL
echo 💾 Backup créé: %backupDir%
echo.

for %%p in (%protocols%) do (
    if exist "%driversDir%\%%p" (
        echo 📁 Protocol: %%p
        for %%c in (%categories%) do (
            if exist "%driversDir%\%%p\%%c" (
                for /d %%v in ("%driversDir%\%%p\%%c\*") do (
                    set "driverCount=0"
                    for /d %%d in ("%%v\*") do set /a driverCount+=1
                    if !driverCount! gtr 0 (
                        echo    📂 %%c\!%%~nv: !driverCount! drivers
                    )
                )
            )
        )
    )
)

echo.
echo 🎉 RÉORGANISATION TERMINÉE!
echo 📁 Structure finale: drivers\{protocol}\{category}\{vendor}\{driver_name}
echo.
pause
