@echo off
cls
type EXECUTIVE_SUMMARY.txt
echo.
echo ===================================================================
echo.
echo Press any key to open monitoring links in browser...
pause >nul

start https://github.com/dlnraja/com.tuya.zigbee/actions/runs/19077180920
start https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee/build/575
start https://homey.app/app/com.dlnraja.tuya.zigbee

echo.
echo Links opened in browser!
echo.
pause
