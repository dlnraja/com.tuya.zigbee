@echo off
cd /d C:\Users\Dell\Documents\homey\stable
git add drivers/presence_sensor_radar/device.js drivers/presence_sensor_radar/driver.js test/critical/p2526-vichy-presence-flow-edge.test.js package.json .homeycompose/app.json app.json .homeychangelog.json
git commit -m "fix(P2526): VicHY presence WHEN edge-fire + motion_active conditions tip 5.12.201"
echo COMMIT_EXIT=%ERRORLEVEL%
if errorlevel 1 exit /b 1
git push origin stable-v5
echo PUSH_EXIT=%ERRORLEVEL%
