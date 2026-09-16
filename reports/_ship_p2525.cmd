@echo off
cd /d C:\Users\Dell\Documents\homey\stable
git add lib/wifi/LocalCredentialPersist.js lib/tuya-local/TuyaLocalDevice.js config/architecture/t146735-local-first-lessons.json test/critical/p2525-t146735-local-first.test.js tools/ci/p2525-t146735-local-first-gate.js package.json .homeycompose/app.json app.json .homeychangelog.json
git commit -m "fix(P2525): T146735 local-first LAN credential persist across Homey reboot tip 5.12.200"
if errorlevel 1 exit /b 1
git status -sb
git push origin stable-v5
