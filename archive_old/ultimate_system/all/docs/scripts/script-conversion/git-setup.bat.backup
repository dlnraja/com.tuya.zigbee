@echo off
echo Setting up Git configuration...

:: Set global Git configuration
echo Setting global Git user name to dlnraja
call git config --global user.name "dlnraja"

if %ERRORLEVEL% NEQ 0 (
    echo Failed to set global user name
    pause
    exit /b %ERRORLEVEL%
)

echo Setting global Git email to dylan.rajasekaram@gmail.com
call git config --global user.email "dylan.rajasekaram@gmail.com"

if %ERRORLEVEL% NEQ 0 (
    echo Failed to set global email
    pause
    exit /b %ERRORLEVEL%
)

:: Initialize Git repository if needed
if not exist .git (
    echo Initializing new Git repository...
    call git init
    
    if %ERRORLEVEL% NEQ 0 (
        echo Failed to initialize Git repository
        pause
        exit /b %ERRORLEVEL%
    )
)

:: Set local Git configuration
echo Setting local Git user name to dlnraja
call git config user.name "dlnraja"

echo Setting local Git email to dylan.rajasekaram@gmail.com
call git config user.email "dylan.rajasekaram@gmail.com"

echo.
echo Git configuration completed successfully!
echo.

echo Verifying Git configuration...
echo -----------------------------
call git config --list

echo.
pause
