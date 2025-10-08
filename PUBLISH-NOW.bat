@echo off
echo ========================================
echo PUBLICATION HOMEY APP STORE
echo ========================================
echo.

cd /d "%~dp0"

REM Cleanup
echo Nettoyage...
if exist .homeybuild rmdir /s /q .homeybuild 2>nul
if exist .homeycompose rmdir /s /q .homeycompose 2>nul

REM Validate
echo Validation...
call homey app validate --level publish
if errorlevel 1 (
    echo ERREUR validation
    pause
    exit /b 1
)

REM Build
echo Build...
call homey app build
if errorlevel 1 (
    echo ERREUR build
    pause
    exit /b 1
)

echo.
echo ========================================
echo PUBLICATION INTERACTIVE
echo ========================================
echo.
echo REPONDEZ:
echo   1. Update version? -^> Y
echo   2. Version? -^> ENTREE (Patch)
echo   3. What's new? -^> Publication Homey Dashboard
echo   4. Commit? -^> Y
echo   5. Push? -^> N
echo.
pause
echo.

REM Publication
call homey app publish

echo.
if errorlevel 1 (
    echo ECHEC
) else (
    echo.
    echo ========================================
    echo SUCCESS - APP PUBLIEE!
    echo ========================================
    echo.
    echo Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee
    echo.
)
pause
