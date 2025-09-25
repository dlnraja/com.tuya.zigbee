@echo off
echo 🔄 SMART RETRY PUBLISH SYSTEM
set attempt=1

:retry
echo.
echo 🔄 ATTEMPT %attempt%
echo 🧹 Cleaning cache...
if exist .homeycompose rmdir /s /q .homeycompose 2>nul

echo 🔧 Committing changes...
git add -A 2>nul
git commit -m "🔧 Auto-fix attempt %attempt%" 2>nul

echo 🚀 Running homey app publish...
echo n | echo "Complete IDs + UNBRANDED structure" | echo y | npx homey app publish

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed attempt %attempt%, retrying...
    set /a attempt=%attempt%+1
    if %attempt% LEQ 10 (
        timeout /t 3 /nobreak >nul
        goto retry
    ) else (
        echo ❌ Max attempts reached
        exit /b 1
    )
)

echo ✅ SUCCESS!
git add -A
git commit -m "🎉 Published v2.2.0 successfully"
git push origin master
echo 🎉 Published and pushed to repo!
