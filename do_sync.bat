@echo off
cd /d "c:\Users\HP\Desktop\homey app\tuya_repair"
git add -A
git commit -m "chore: Update gitignore rules"
git pull origin master
git push origin master
del "%~f0"
