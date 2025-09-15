@echo off
echo PUBLICATION FORCEE ULTIMATE ZIGBEE HUB
echo.

REM Fix app.json
copy /Y .homeycompose\app.json app.json > nul 2>&1

REM Create responses
echo y> pub.txt
echo y>> pub.txt
echo.>> pub.txt
echo Ultimate Zigbee Hub v1.1.8 - Full automation. 1500+ devices from 80+ manufacturers. SDK3.>> pub.txt

echo Publication en cours...
type pub.txt | homey app publish

del pub.txt > nul 2>&1
echo.
echo Termine! Verifier: https://tools.developer.homey.app/apps/app/com.dlnraja.ultimate.zigbee.hub
