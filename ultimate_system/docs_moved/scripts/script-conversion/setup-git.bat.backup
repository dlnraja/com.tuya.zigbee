@echo off
echo Setting up Git configuration...

echo Setting user name to dlnraja
git config --global user.name "dlnraja"

if %ERRORLEVEL% NEQ 0 (
    echo Failed to set user name
    exit /b %ERRORLEVEL%
)

echo Setting user email to dylan.rajasekaram@gmail.com
git config --global user.email "dylan.rajasekaram@gmail.com"

if %ERRORLEVEL% NEQ 0 (
    echo Failed to set user email
    exit /b %ERRORLEVEL%
)

echo.
echo Git configuration updated successfully:
echo --------------------------------
git config --global user.name
git config --global user.email

echo.
echo Initializing Git repository if needed...
if not exist .git (
    git init
    if %ERRORLEVEL% NEQ 0 (
        echo Failed to initialize Git repository
        exit /b %ERRORLEVEL%
    )
)

echo.
echo Adding files to Git...
git add .

if %ERRORLEVEL% NEQ 0 (
    echo Failed to add files to Git
    exit /b %ERRORLEVEL%
)

echo.
echo Creating initial commit...
git commit -m "Initial commit: Set up project with dlnraja as author"

if %ERRORLEVEL% NEQ 0 (
    echo Failed to create initial commit
    exit /b %ERRORLEVEL%
)

echo.
echo Git setup completed successfully!
