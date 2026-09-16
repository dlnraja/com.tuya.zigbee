@echo off
cd /d C:\Users\Dell\Documents\homey\stable
git add package.json app.json .homeycompose/app.json .homeychangelog.json data/user-misattribution-registry.json scripts/data/current-fps.json lib/tuya/TuyaZigbeeDevice.js lib/UniversalZigbeeDevice.js lib/devices/BaseUnifiedDevice.js drivers/button_wireless_1/device.js drivers/button_wireless_1/driver.compose.json test/critical/p2499-peter-77394256-smartbutton-battery-ui.test.js test/critical/p2502-smart-adapt-bootbudget.test.js test/critical/p2503-gh533-5slehgeo-curtain.test.js
git commit -F .git\COMMIT_MSG_BOTH
if errorlevel 1 exit /b 1
git pull --rebase origin stable-v5
if errorlevel 1 exit /b 1
git push origin stable-v5
echo EXIT=%ERRORLEVEL%
exit /b %ERRORLEVEL%
