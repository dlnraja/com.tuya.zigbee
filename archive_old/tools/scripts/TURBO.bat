@echo off
echo TURBO MODE...
taskkill /F /IM node.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul
if exist .homeybuild rmdir /s /q .homeybuild
if exist .homeycompose rmdir /s /q .homeycompose
node tools/validate_all_json.js >nul
node tools/verify_driver_assets_v38.js >nul
homey app build >nul
homey app validate --level publish
git add -A
git commit -m "Auto: v2.1.23"
git push origin master
echo DONE - Ready: homey login + homey app publish
pause
