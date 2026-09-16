@echo off
cd /d C:\Users\Dell\Documents\homey\stable
node reports\_bump_p2528.js
git add lib/tuya/TuyaEF00Manager.js drivers/presence_sensor_radar/device.js package.json .homeycompose/app.json app.json .homeychangelog.json
git commit -m "fix(P2528): honor radar dpMap.cap in EF00 + presence human edge tip 5.12.204"
if errorlevel 1 exit /b 1
git pull --rebase origin stable-v5
if errorlevel 1 exit /b 1
git push origin stable-v5
if errorlevel 1 exit /b 1
echo STABLE_SHIP_OK
