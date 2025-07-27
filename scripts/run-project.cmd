@echo off
echo ==========================================
echo TUYA ZIGBEE PROJECT - BUILD AND RUN
echo ==========================================
echo.
echo Starting project build...
echo.

REM Validation des drivers
echo [1/4] Validating all drivers...
powershell -ExecutionPolicy Bypass -File scripts/validate-all-drivers.ps1
if %errorlevel% neq 0 (
    echo ERROR: Driver validation failed
    pause
    exit /b 1
)

REM Enhancement des drivers
echo [2/4] Enhancing all drivers...
powershell -ExecutionPolicy Bypass -File scripts/enhance-all-drivers.ps1
if %errorlevel% neq 0 (
    echo ERROR: Driver enhancement failed
    pause
    exit /b 1
)

REM Test des workflows
echo [3/4] Testing workflows...
powershell -ExecutionPolicy Bypass -File scripts/test-workflows.ps1
if %errorlevel% neq 0 (
    echo ERROR: Workflow testing failed
    pause
    exit /b 1
)

REM Build final
echo [4/4] Final build...
npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed
    pause
    exit /b 1
)

echo.
echo ==========================================
echo PROJECT BUILD COMPLETED SUCCESSFULLY!
echo ==========================================
echo.
echo Ready to deploy to Homey!
echo.
pause
