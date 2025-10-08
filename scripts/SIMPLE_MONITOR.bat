@echo off
REM Simple Real-Time Monitor
echo ========================================
echo MONITORING GITHUB ACTIONS
echo ========================================
echo.

:LOOP
cls
echo ========================================
echo GITHUB ACTIONS STATUS - %TIME%
echo ========================================
echo.

gh run list --limit 3

echo.
echo ========================================
echo Checking again in 15 seconds...
echo Press Ctrl+C to stop
echo ========================================

timeout /t 15 /nobreak > nul
goto LOOP
