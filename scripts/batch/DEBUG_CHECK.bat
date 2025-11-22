@echo off
echo.
echo ===================================================================
echo    HOMEY DEBUG - Diagnostic Automatique
echo ===================================================================
echo.

echo [1/6] Verifying build...
call homey app build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed
    pause
    exit /b 1
)
echo [OK] Build successful
echo.

echo [2/6] Checking .homeybuild...
if exist .homeybuild\app.json (
    echo [OK] .homeybuild\app.json exists
) else (
    echo [ERROR] .homeybuild\app.json missing
    pause
    exit /b 1
)
echo.

echo [3/6] Listing available Homeys...
call homey list
echo.

echo [4/6] Checking selected Homey...
call homey info
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [WARNING] Cannot connect to Homey
    echo.
    echo Please check:
    echo   - Same WiFi network
    echo   - Homey is powered on
    echo   - Firewall allows connection
    echo.
    pause
)
echo.

echo [5/6] Validating app...
call homey app validate
echo.

echo ===================================================================
echo [6/6] Diagnostic Complete - Choose Action
echo ===================================================================
echo.
echo Available Options:
echo   1. Run debug mode (homey app run)
echo   2. Install app permanently (homey app install)
echo   3. Open test version URL
echo   4. Exit
echo.
set /p choice="Enter choice (1-4): "

if "%choice%"=="1" (
    echo.
    echo Starting debug mode...
    echo Note: This may timeout if Homey is not accessible
    echo.
    call homey app run
) else if "%choice%"=="2" (
    echo.
    echo Installing app permanently...
    call homey app install
) else if "%choice%"=="3" (
    echo.
    echo Opening test version in browser...
    start https://homey.app/app/com.dlnraja.tuya.zigbee/test/
    echo.
    echo Install the app from the browser page
) else (
    echo.
    echo Exiting...
)

echo.
pause
