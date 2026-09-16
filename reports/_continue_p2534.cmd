@echo off
cd /d C:\Users\Dell\Documents\homey\stable
node reports\_resolve_p2534.js
git add app.json package.json .homeycompose/app.json .homeychangelog.json drivers/presence_sensor_radar/configs.js drivers/presence_sensor_radar/driver.js lib/data/SensorConfigs.js lib/tuya/TuyaSensorDatabase.js test/critical/p2534-vichy-mtg075-presence-dp1.test.js test/critical/p2511-vichy-clrdrnya-mtg-residual.test.js
set GIT_EDITOR=true
git -c core.editor=true rebase --continue
git push origin stable-v5
git log -1 --oneline
git status -sb
