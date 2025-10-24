@echo off
REM GIT COMMIT HELPER - Résout problèmes PowerShell
REM Usage: GIT_COMMIT_HELPER.bat "message"

setlocal enabledelayedexpansion

if "%~1"=="" (
    echo Usage: GIT_COMMIT_HELPER.bat "message"
    exit /b 1
)

echo.
echo ========================================
echo   GIT COMMIT HELPER
echo ========================================
echo.

REM Git add all
echo [1/4] Git add -A...
git add -A
if errorlevel 1 goto :error

REM Git commit
echo [2/4] Git commit...
git commit -m "%~1"
if errorlevel 1 (
    echo Nothing to commit or commit failed
    echo Trying push anyway...
)

REM Git status
echo [3/4] Git status...
git status --short

REM Git push
echo [4/4] Git push...
git push origin master
if errorlevel 1 goto :error

echo.
echo ========================================
echo   SUCCESS!
echo ========================================
echo.
exit /b 0

:error
echo.
echo ========================================
echo   ERROR!
echo ========================================
echo.
exit /b 1
