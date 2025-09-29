@echo off
echo Initializing Git repository...

:: Initialize Git repository if not already initialized
if not exist .git (
    git init
    if %ERRORLEVEL% NEQ 0 (
        echo Failed to initialize Git repository
        pause
        exit /b %ERRORLEVEL%
    )
)

echo Adding files to Git...
git add .

if %ERRORLEVEL% NEQ 0 (
    echo Failed to add files to Git
    pause
    exit /b %ERRORLEVEL%
)

echo Creating initial commit...
git commit -m "Initial commit: Tuya Zigbee project setup"

if %ERRORLEVEL% NEQ 0 (
    echo Failed to create initial commit
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo Repository initialized and changes committed successfully!
echo.

echo Next steps:
echo 1. Create a new repository on GitHub
pause
