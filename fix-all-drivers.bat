@echo off
REM Fix ALL drivers with commented code - Windows Batch Script
echo ========================================
echo FIX ALL COMMENTED DRIVERS
echo ========================================
echo.

REM Change to script directory
cd /d "%~dp0"

REM Run Node.js script
node fix-drivers.js

echo.
echo Done!
pause
