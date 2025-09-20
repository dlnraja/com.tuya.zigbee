@echo off
echo ===================================================
echo  ANALYSE DU PROJET TUYA ZIGBEE
echo ===================================================
echo.

setlocal enabledelayedexpansion

:: Vérifier la structure de base
echo Vérification de la structure du projet...
echo.

set "ERRORS=0"

:: Vérifier les dossiers principaux
for %%d in (drivers docs scripts tests) do (
    if exist "%%~d" (
        echo [OK] Dossier trouvé: %%~d
    ) else (
        echo [ERREUR] Dossier manquant: %%~d
        set /a ERRORS+=1
    )
)

:: Vérifier les fichiers principaux
for %%f in (package.json app.js app.json README.md) do (
    if exist "%%~f" (
        echo [OK] Fichier trouvé: %%~f
    ) else (
        echo [ATTENTION] Fichier manquant: %%~f
    )
)

echo.
echo ===================================================
echo  VÉRIFICATION DES DRIVERS
echo ===================================================
echo.

:: Compter les dossiers de drivers
set /a TOTAL_DRIVERS=0
set /a DRIVERS_WITH_CONFIG=0
set /a DRIVERS_WITH_ICONS=0

if exist "drivers" (
    for /d %%d in (drivers\*) do (
        set /a TOTAL_DRIVERS+=1
        
        :: Vérifier le fichier de configuration
        if exist "%%~fd\driver.compose.json" (
            set /a DRIVERS_WITH_CONFIG+=1
        )
        
        :: Vérifier les icônes
        if exist "%%~fd\assets\icon.svg" if exist "%%~fd\assets\images\large.png" (
            set /a DRIVERS_WITH_ICONS+=1
        )
    )
)

:: Afficher les statistiques
echo Nombre total de dossiers de drivers: !TOTAL_DRIVERS!
echo Drivers avec configuration: !DRIVERS_WITH_CONFIG! / !TOTAL_DRIVERS!
echo Drivers avec icônes: !DRIVERS_WITH_ICONS! / !TOTAL_DRIVERS!

:: Calculer les pourcentages
if !TOTAL_DRIVERS! gtr 0 (
    set /a PERCENT_CONFIG=(DRIVERS_WITH_CONFIG * 100) / TOTAL_DRIVERS
    set /a PERCENT_ICONS=(DRIVERS_WITH_ICONS * 100) / TOTAL_DRIVERS
    
    echo.
    echo Pourcentage de drivers avec configuration: !PERCENT_CONFIG!%%
    echo Pourcentage de drivers avec icônes: !PERCENT_ICONS!%%
)

echo.
echo ===================================================
echo  VÉRIFICATION DES DÉPENDANCES
echo ===================================================
echo.

:: Vérifier si Node.js est installé
where node >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] Node.js est installé
    node --version
) else (
    echo [ERREUR] Node.js n'est pas installé ou n'est pas dans le PATH
    set /a ERRORS+=1
)

echo.
:: Vérifier si npm est installé
where npm >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] npm est installé
    npm --version
) else (
    echo [ERREUR] npm n'est pas installé ou n'est pas dans le PATH
    set /a ERRORS+=1
)

if exist "package.json" (
    echo.
    echo Détection des dépendances manquantes...
    
    :: Vérifier les dépendances requises
    for %%d in (homey homey-meshdriver homey-zigbeedriver) do (
        npm list %%d >nul 2>&1
        if !ERRORLEVEL! equ 0 (
            echo [OK] Package trouvé: %%~d
        ) else (
            echo [ATTENTION] Package manquant: %%~d
        )
    )
)

echo.
echo ===================================================
echo  RÉSUMÉ
echo ===================================================
echo.

if %ERRORS% equ 0 (
    echo ✅ Le projet semble correctement configuré.
) else (
    echo ❗ %ERRORS% erreur(s) critique(s) détectée(s).
)

echo.
echo Pour plus de détails, consultez les rapports ci-dessus.
echo.
pause
