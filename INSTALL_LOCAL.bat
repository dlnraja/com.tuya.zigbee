@echo off
echo.
echo ===================================================================
echo    INSTALL APP LOCALLY - Alternative to Debug Mode
echo ===================================================================
echo.
echo This will INSTALL the app on your Homey instead of running
echo in debug mode. This avoids timeout issues.
echo.
echo The app will be permanently installed until you uninstall it.
echo.
pause
echo.

echo [1/3] Building app...
call homey app build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Build failed!
    pause
    exit /b 1
)
echo [OK] Build successful
echo.

echo [2/3] Checking Homey connection...
call homey info
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Cannot connect to Homey!
    echo.
    echo Possible solutions:
    echo   1. Run: homey select
    echo   2. Check WiFi connection
    echo   3. Restart Homey
    echo   4. Use test version instead: https://homey.app/app/com.dlnraja.tuya.zigbee/test/
    echo.
    pause
    exit /b 1
)
echo [OK] Homey connection verified
echo.

echo [3/3] Installing app on Homey...
echo This may take 30-60 seconds...
echo.
call homey app install
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ===================================================================
    echo [SUCCESS] App installed on Homey!
    echo ===================================================================
    echo.
    echo You can now:
    echo   - Open Homey app on smartphone
    echo   - Go to Settings -^> Apps
    echo   - Find "Universal Tuya Zigbee"
    echo   - Start pairing devices!
    echo.
) else (
    echo.
    echo [ERROR] Installation failed
    echo.
    echo Try alternative:
    echo   https://homey.app/app/com.dlnraja.tuya.zigbee/test/
    echo.
)

pause
