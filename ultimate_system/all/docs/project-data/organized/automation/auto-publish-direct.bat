@echo off
echo Starting Ultimate Zigbee Hub Publication...
cd /d "%~dp0"

echo Fixing app.json encoding...
node -e "const fs = require('fs'); const content = fs.readFileSync('.homeycompose/app.json', 'utf8'); fs.writeFileSync('app.json', content, 'utf8');"

echo Validating app...
homey app validate --level=publish
if %errorlevel% neq 0 (
    echo Validation failed, exiting
    pause
    exit /b 1
)

echo Starting publication with automated responses...
(
echo y
echo y
echo.
echo Ultimate Zigbee Hub v1.1.2 - AUTOMATED PUBLICATION SUCCESS - Publication automation system implemented with full automation. Support etendu pour 1500+ appareils Zigbee de 80+ fabricants avec SDK3 complet.
) | homey app publish

echo Publication process completed
pause
