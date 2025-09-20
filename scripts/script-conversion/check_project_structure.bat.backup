@echo off
echo === Project Structure Check ===
echo.

REM Check Node.js and npm
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    exit /b 1
) else (
    echo [OK] Node.js is installed
    node -v
)

where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] npm is not in PATH
) else (
    echo [OK] npm is installed
    npm -v
)

echo.
echo === Project Directories ===

REM Check required directories
set "required_dirs=drivers scripts .github\workflows"

for %%d in (%required_dirs%) do (
    if exist "%%~d" (
        echo [OK] Directory exists: %%~d
    ) else (
        echo [MISSING] Directory not found: %%~d
    )
)

echo.
echo === Required Files ===

REM Check required files
set "required_files=package.json app.json README.md"

for %%f in (%required_files%) do (
    if exist "%%~f" (
        echo [OK] File exists: %%~f
    ) else (
        echo [MISSING] File not found: %%~f
    )
)

echo.
echo === Node Modules ===

if exist "node_modules" (
    echo [OK] node_modules directory exists
) else (
    echo [WARNING] node_modules directory not found. Run 'npm install' to install dependencies.
)

echo.
echo === Checking Drivers ===

if exist "drivers" (
    set /a count=0
    for /d %%d in (drivers\*) do set /a count+=1
    echo Found %count% driver directories
    
    REM Check a sample of drivers
    echo.
    echo Sample driver check (first 5):
    setlocal enabledelayedexpansion
    set "i=0"
    for /d %%d in (drivers\*) do (
        if !i! lss 5 (
            echo --- %%d ---
            if exist "%%d\device.js" (echo   [OK] device.js) else (echo   [MISSING] device.js)
            if exist "%%d\driver.js" (echo   [OK] driver.js) else (echo   [MISSING] driver.js)
            if exist "%%d\driver.compose.json" (echo   [OK] driver.compose.json) else (echo   [MISSING] driver.compose.json)
            if exist "%%d\README.md" (echo   [OK] README.md) else (echo   [MISSING] README.md)
            echo.
            set /a i+=1
        )
    )
    endlocal
) else (
    echo [ERROR] drivers directory not found
)

echo.
echo === Check Complete ===
pause
