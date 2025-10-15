@echo off
cd /d "c:\Users\HP\Desktop\homey app\tuya_repair"
git add -A
git commit -m "feat: Ultimate project organization and complete validation - SDK + Guidelines + Forum"
git push origin master
del "%~f0"
