@echo off
REM Quick Git Push Script - No Rebase/Fetch Errors

echo === QUICK GIT PUSH ===
echo.

cd /d "c:\Users\HP\Desktop\homey app\tuya_repair"

REM Get commit message from argument or use default
set MESSAGE=%~1
if "%MESSAGE%"=="" set MESSAGE=Auto-commit: Session complete - All fixes deployed

echo [1/4] Adding files...
git add .
if errorlevel 1 goto :error

echo.
echo [2/4] Committing...
git commit -m "%MESSAGE%"

echo.
echo [3/4] Pulling with merge...
git pull origin master --no-rebase --no-edit
if errorlevel 1 (
    echo WARNING: Pull had issues, continuing with push...
)

echo.
echo [4/4] Pushing to GitHub...
git push origin master
if errorlevel 1 (
    echo.
    echo Normal push failed, trying FORCE PUSH...
    echo WARNING: This will overwrite remote!
    timeout /t 3
    git push origin master --force
    if errorlevel 1 goto :error
)

echo.
echo ========================================
echo     SUCCESS! Changes pushed to GitHub
echo ========================================
goto :end

:error
echo.
echo ========================================
echo     ERROR! Push failed
echo ========================================
echo.
echo Try manually:
echo   git status
echo   git push origin master --force
pause
exit /b 1

:end
pause
