@echo off
echo Setting up Git configuration...

:: Set Git user information
git config --global user.name "dlnraja"
git config --global user.email "dylan.rajasekaram@gmail.com"

:: Initialize Git repository if not already initialized
if not exist .git (
    echo Initializing new Git repository...
    git init
)

:: Add all files to Git
echo Adding files to Git...
git add .

:: Create initial commit
echo Creating initial commit...
git commit -m "Initial commit: Tuya Zigbee project setup"

:: Show Git status
git status

echo.
echo 1. Create a new repository on GitHub at: https://github.com/new

:repo_url
set /p GITHUB_REPO=Enter your GitHub repository URL (e.g., https://github.com/dlnraja/tuya_repair.git): 

if "%GITHUB_REPO%"=="" (
    echo Please enter a valid GitHub repository URL
    goto repo_url
)

:: Add the remote repository
echo Adding remote repository...
git remote add origin %GITHUB_REPO%

:: Push to GitHub
echo Pushing to GitHub...
git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Success! Your code has been pushed to GitHub.
    echo Repository: %GITHUB_REPO%
) else (
    echo.
    echo Failed to push to GitHub. Please check your repository URL and try again.
)

pause
