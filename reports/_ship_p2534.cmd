@echo off
cd /d C:\Users\Dell\Documents\homey\stable
node reports\_bp_p2534.js
if errorlevel 1 exit /b 1
git add drivers/presence_sensor_radar/configs.js drivers/presence_sensor_radar/driver.js lib/data/SensorConfigs.js lib/tuya/TuyaSensorDatabase.js test/critical/p2534-vichy-mtg075-presence-dp1.test.js test/critical/p2511-vichy-clrdrnya-mtg-residual.test.js package.json app.json .homeycompose/app.json .homeychangelog.json
git commit -m "fix(P2534): VicHY MTG075 presence DP1 ownership tip 5.12.213"
git pull --rebase origin stable-v5
git push origin stable-v5
git log -1 --oneline
