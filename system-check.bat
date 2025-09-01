@echo off
setlocal enabledelayedexpansion

:: Configuration
set "LOGFILE=system-check.log"
set "NODE_SCRIPT=test-node.js"

:: Initialisation
echo === Début du diagnostic système === > "%LOGFILE%"
echo Date: %date% %time% >> "%LOGFILE%"
echo. >> "%LOGFILE%"

echo === Vérification du système ===
echo Vérification du système...

echo. >> "%LOGFILE%"
echo === Informations système === >> "%LOGFILE%"
systeminfo | findstr /B /C:"Nom d" /C:"Système d" /C:"Version" /C:"Fabricant" /C:"Modèle" /C:"Type" /C:"Processeur" >> "%LOGFILE%"

echo. >> "%LOGFILE%"
echo === Variables d'environnement === >> "%LOGFILE%"
echo PATH=%PATH% >> "%LOGFILE%"
echo. >> "%LOGFILE%"

echo Vérification de Node.js...
echo === Node.js === >> "%LOGFILE%"
where node >nul 2>&1
if %ERRORLEVEL% equ 0 (
    for /f "tokens=*" %%a in ('node -v') do set NODE_VERSION=%%a
    echo Node.js version: !NODE_VERSION! >> "%LOGFILE%"
    echo ✅ Node.js est installé (version: !NODE_VERSION!)
) else (
    echo ❌ Node.js n'est pas installé ou n'est pas dans le PATH >> "%LOGFILE%"
    echo ❌ Node.js n'est pas installé ou n'est pas dans le PATH
    goto :end
)

echo. >> "%LOGFILE%"
echo === npm === >> "%LOGFILE%"
where npm >nul 2>&1
if %ERRORLEVEL% equ 0 (
    for /f "tokens=*" %%a in ('npm -v') do set NPM_VERSION=%%a
    echo npm version: !NPM_VERSION! >> "%LOGFILE%"
    echo ✅ npm est installé (version: !NPM_VERSION!)
) else (
    echo ❌ npm n'est pas installé ou n'est pas dans le PATH >> "%LOGFILE%"
    echo ❌ npm n'est pas installé ou n'est pas dans le PATH
    goto :end
)

echo. >> "%LOGFILE%"
echo === Test d'accès au système de fichiers === >> "%LOGFILE%"
echo Test d'accès au système de fichiers...

echo Création d'un fichier de test... >> "%LOGFILE%"
echo Ceci est un test > test-file.txt 2>> "%LOGFILE%"
if exist test-file.txt (
    echo ✅ Test d'écriture réussi >> "%LOGFILE%"
    echo ✅ Test d'écriture réussi
    del test-file.txt >nul 2>&1
) else (
    echo ❌ Impossible d'écrire dans le répertoire courant >> "%LOGFILE%"
    echo ❌ Impossible d'écrire dans le répertoire courant
    goto :end
)

echo. >> "%LOGFILE%"
echo === Test d'exécution Node.js === >> "%LOGFILE%"
echo Test d'exécution Node.js...

echo console.log('Test réussi!'); > %NODE_SCRIPT%
echo console.log('Node.js version:', process.version); >> %NODE_SCRIPT%
echo console.log('Répertoire:', process.cwd()); >> %NODE_SCRIPT%

node %NODE_SCRIPT% >> "%LOGFILE%" 2>&1
if %ERRORLEVEL% equ 0 (
    echo ✅ Test d'exécution Node.js réussi
) else (
    echo ❌ Erreur lors de l'exécution du script Node.js >> "%LOGFILE%"
    echo ❌ Erreur lors de l'exécution du script Node.js
    goto :cleanup
)

:cleanup
if exist %NODE_SCRIPT% del %NODE_SCRIPT% >nul 2>&1

:end
echo. >> "%LOGFILE%"
echo === Fin du diagnostic === >> "%LOGFILE%"
echo Date: %date% %time% >> "%LOGFILE%"

echo.
echo === Résumé du diagnostic ===
type "%LOGFILE%" | findstr /B /C:"✅" /C:"❌"
echo.
echo Le rapport complet a été enregistré dans: %LOGFILE%
pause
