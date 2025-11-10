@echo off
echo.
echo ===================================================================
echo    HOMEY APP PUBLISH - GitHub Actions Trigger
echo ===================================================================
echo.

REM Check if gh CLI is available
where gh >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] GitHub CLI detected
    echo.
    echo Triggering publish workflow...
    echo.
    
    gh workflow run publish.yml --ref master
    
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo [SUCCESS] Workflow triggered!
        echo.
        echo Monitor progress at:
        echo https://github.com/dlnraja/com.tuya.zigbee/actions
        echo.
    ) else (
        echo.
        echo [ERROR] Failed to trigger workflow
        echo Try: gh auth login
        echo.
    )
) else (
    echo [INFO] GitHub CLI not found
    echo.
    echo INSTALL GITHUB CLI:
    echo   winget install GitHub.cli
    echo.
    echo OR USE MANUAL METHOD:
    echo   1. Go to: https://github.com/dlnraja/com.tuya.zigbee/actions
    echo   2. Click "Homey App Publish"
    echo   3. Click "Run workflow"
    echo   4. Select branch: master
    echo   5. Click green "Run workflow" button
    echo.
)

echo ===================================================================
echo.
pause
