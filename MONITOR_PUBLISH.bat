@echo off
echo.
echo ===================================================================
echo    MONITOR GITHUB ACTIONS - Homey App Publish
echo ===================================================================
echo.

REM Check if gh CLI is available
where gh >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Fetching latest workflow runs...
    echo.
    
    gh run list --workflow=publish.yml --limit 5
    
    echo.
    echo ===================================================================
    echo.
    echo To view detailed logs of a specific run:
    echo   gh run view [RUN_ID]
    echo.
    echo To watch a run in real-time:
    echo   gh run watch [RUN_ID]
    echo.
    echo To open in browser:
    echo   gh run view [RUN_ID] --web
    echo.
    echo Or visit:
    echo   https://github.com/dlnraja/com.tuya.zigbee/actions
    echo.
) else (
    echo [INFO] GitHub CLI not installed
    echo.
    echo MANUAL MONITORING:
    echo   https://github.com/dlnraja/com.tuya.zigbee/actions
    echo.
    echo INSTALL GITHUB CLI:
    echo   winget install GitHub.cli
    echo.
)

echo ===================================================================
echo.
pause
