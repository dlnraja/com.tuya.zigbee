@echo off
echo === Environment Information ===
echo Node.js Version: 
node --version
echo.

echo === Directory Structure ===
dir /b /ad "drivers" | find /c /v ""
echo.

echo === Running Simple Analysis ===
node scripts/simple-driver-report.js

echo.
echo === Analysis Complete ===
pause
