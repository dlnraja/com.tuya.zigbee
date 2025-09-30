@echo off
echo ======================================================================
echo FINAL BUILD AND PUBLISH v2.0.0
echo ======================================================================

echo.
echo [1/5] Killing processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2/5] Cleaning cache...
rmdir /s /q .homeybuild 2>nul
rmdir /s /q node_modules\.cache 2>nul

echo [3/5] Validating...
homey app validate

echo [4/5] Building...
homey app build

IF %ERRORLEVEL% EQU 0 (
    echo.
    echo ======================================================================
    echo BUILD SUCCESS!
    echo ======================================================================
    echo.
    echo Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.ultimate.zigbee.hub
    echo.
    echo Next: Click "Publish to App Store" on Dashboard
    echo.
) ELSE (
    echo.
    echo ======================================================================
    echo BUILD FAILED - Check errors above
    echo ======================================================================
)

pause
