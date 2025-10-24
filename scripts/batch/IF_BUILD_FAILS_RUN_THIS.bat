@echo off
echo.
echo ========================================
echo AUTO FIX IF BUILD FAILED
echo ========================================
echo.
echo Running auto-fix script...
echo.

node scripts/monitor/AUTO_FIX_IF_FAIL.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Fix applied! Now validating...
    echo ========================================
    echo.
    
    homey app validate --level publish
    
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo ========================================
        echo Validation PASS! Committing...
        echo ========================================
        echo.
        
        git add app.json
        git commit -m "fix: Auto-correction after build failure"
        git push origin master --force
        
        echo.
        echo ========================================
        echo PUSHED! Monitor GitHub Actions again:
        echo https://github.com/dlnraja/com.tuya.zigbee/actions
        echo ========================================
        echo.
    ) else (
        echo.
        echo Validation failed! Manual intervention needed.
        echo.
    )
) else (
    echo.
    echo Auto-fix failed! Check error above.
    echo.
)

pause
