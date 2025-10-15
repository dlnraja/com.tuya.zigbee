@echo off
cd /d "c:\Users\HP\Desktop\homey app\tuya_repair"
git add -A
git commit -m "feat: Auto-organize reports - Clean root directory"
git push origin master
del "%~f0"
