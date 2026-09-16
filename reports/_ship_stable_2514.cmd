@echo off
cd /d C:\Users\Dell\Documents\homey\stable
git commit -F reports\_commit_msg_2514.txt
if errorlevel 1 exit /b 1
git push origin stable-v5
echo PUSH=%ERRORLEVEL%
gh workflow run 270256834 --repo dlnraja/com.tuya.zigbee -f force_publish=true -f force_test=true
echo DISPATCH=%ERRORLEVEL%
git log -1 --oneline
