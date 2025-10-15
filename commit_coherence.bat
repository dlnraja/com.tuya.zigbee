@echo off
cd /d "c:\Users\HP\Desktop\homey app\tuya_repair"
git add -A
git commit -m "feat: Project coherence checker and syntax fixes"
git push origin master
del "%~f0"
