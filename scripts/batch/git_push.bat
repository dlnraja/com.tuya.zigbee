@echo off
cd /d "%~dp0"

echo ================================
echo GIT PUSH WITH AUTO-PUBLISH
echo ================================
echo.

git add .

git commit -m "feat: ABSOLUTE - Auto-publish via GitHub Actions"

echo.
echo ================================
echo Ready to push to GitHub
echo This will trigger auto-publish!
echo ================================
echo.

git push origin master

pause
