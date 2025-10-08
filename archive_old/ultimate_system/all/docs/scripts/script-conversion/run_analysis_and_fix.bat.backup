@echo off
echo =======================================
echo Tuya Zigbee Project Analysis and Fix Tool
echo =======================================
echo.

echo [1/6] Checking system requirements...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not installed or not in PATH
    pause
    exit /b 1
)

echo [2/6] Installing dependencies...
call npm install --force
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo [3/6] Running project validation...
call npm run validate:all
if %errorlevel% neq 0 (
    echo WARNING: Project validation found issues
) else (
    echo Project validation completed successfully
)

echo [4/6] Running driver analysis...
if not exist "analysis-results" mkdir analysis-results
node scripts/analyze-drivers.js > analysis-results\driver-analysis.log 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Driver analysis encountered issues
    type analysis-results\driver-analysis.log
) else (
    echo Driver analysis completed successfully
)

echo [5/6] Running tests...
call npm test > analysis-results\test-results.log 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Some tests failed
    type analysis-results\test-results.log | findstr /i "fail"
) else (
    echo All tests passed successfully
)

echo [6/6] Generating final report...
echo Analysis completed at %date% %time% > analysis-results\final-report.txt
echo ======================================= >> analysis-results\final-report.txt
echo.

echo.
echo =======================================
echo ANALYSIS COMPLETE
echo =======================================
echo Check the following files for results:
echo - analysis-results\driver-analysis.log
echo - analysis-results\test-results.log
echo - analysis-results\final-report.txt
echo.
pause
