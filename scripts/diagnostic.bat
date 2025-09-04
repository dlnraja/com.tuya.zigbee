@echo off
echo === Diagnostic du système ===
echo Date: %date% %time%
echo.

echo [1/4] Informations système:
systeminfo | findstr /B /C:"Nom d" /C:"Système d" /C:"Version" /C:"Fabricant" /C:"Modèle" /C:"Type" /C:"Processeur"
echo.

echo [2/4] Variables d'environnement:
echo PATH=%PATH%
echo.

echo [3/4] Vérification de Node.js:
where node >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Node.js est installé
    echo Version: %node_version%
    for /f "tokens=*" %%a in ('node -v') do set node_version=%%a
    echo Version: %node_version%
) else (
    echo ❌ Node.js n'est pas installé ou n'est pas dans le PATH
)
echo.

echo [4/4] Vérification de npm:
where npm >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ npm est installé
    for /f "tokens=*" %%a in ('npm -v') do set npm_version=%%a
    echo Version: %npm_version%
) else (
    echo ❌ npm n'est pas installé ou n'est pas dans le PATH
)

echo.
echo === Fin du diagnostic ===
pause
