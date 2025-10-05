@echo off
echo Nettoyage cache Homey...

REM Tuer tous les processus node
taskkill /F /IM node.exe /T >nul 2>&1
taskkill /F /IM npm.exe /T >nul 2>&1

REM Attendre 3 secondes
timeout /t 3 /nobreak >nul

REM Supprimer .homeybuild
if exist .homeybuild (
    echo Suppression .homeybuild...
    rmdir /s /q .homeybuild
    if exist .homeybuild (
        echo AVERTISSEMENT: .homeybuild existe encore
    ) else (
        echo OK: .homeybuild supprime
    )
)

REM Supprimer .homeycompose
if exist .homeycompose (
    echo Suppression .homeycompose...
    rmdir /s /q .homeycompose
)

echo.
echo Cache nettoye. Vous pouvez maintenant executer:
echo   homey app build
echo.
