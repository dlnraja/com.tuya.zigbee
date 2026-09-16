@echo off
cd /d C:\Users\Dell\Documents\homey\stable
git add lib/tuya/Ef00MultiGangProfiles.js lib/tuya/TuyaEF00Manager.js drivers/wall_switch_4_gang_tuya/device.js drivers/wall_switch_4_gang_tuya/driver.compose.json drivers/switch_3gang/device.js drivers/switch_3gang/driver.compose.json drivers/curtain_motor/driver.compose.json drivers/sensor_illuminance_presence/driver.compose.json drivers/dimmer_wall_1gang/driver.compose.json data/user-misattribution-registry.json test/critical/p2505-p2485-ef00-multigang-rehome.test.js package.json .homeycompose/app.json app.json .homeychangelog.json
echo fix(P2505): BOTH P2485 multi-gang rehome + P2486b launchOnce — tip 5.12.182> .git\COMMIT_MSG_P2505
git commit -F .git\COMMIT_MSG_P2505
if errorlevel 1 exit /b 1
git pull --rebase origin stable-v5
if errorlevel 1 exit /b 1
git push origin stable-v5
git log -1 --oneline
git status -sb
