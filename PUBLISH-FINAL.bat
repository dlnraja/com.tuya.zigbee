@echo off
echo ========================================
echo PUBLICATION HOMEY SANS ERREUR GIT
echo ========================================
echo.

cd /d "%~dp0"

REM Cleanup
echo Nettoyage cache...
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
echo IMPORTANT: Quand on vous demande
echo "Do you want to commit... ?" -> Repondez N (NON)
echo.
echo On fera le commit apres manuellement
echo.
pause

REM Publication SANS commit auto
call homey app publish

echo.
echo ========================================
echo COMMIT MANUEL
echo ========================================
echo.
echo Maintenant on commit manuellement...
echo.

git add app.json .homeychangelog.json
git commit -m "Version update via PUBLISH-FINAL.bat"
git push origin master

if errorlevel 0 (
    echo.
    echo ========================================
    echo SUCCESS COMPLET!
    echo ========================================
    echo.
    echo Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee
    echo.
) else (
    echo.
    echo Erreur Git - mais publication Homey OK
    echo.
)

pause
