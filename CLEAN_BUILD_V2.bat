@echo off
echo Clean Build v2.0.0

REM Kill processes
taskkill /F /IM node.exe 2>nul

REM Clean cache
rmdir /s /q .homeybuild 2>nul
rmdir /s /q node_modules\.cache 2>nul

REM Wait
timeout /t 2 /nobreak >nul

REM Build
echo Building...
homey app build

echo Done!
