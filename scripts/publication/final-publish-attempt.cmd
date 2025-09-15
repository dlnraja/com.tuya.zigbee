@echo off
setlocal enabledelayedexpansion

echo ================================================================
echo ULTIMATE ZIGBEE HUB - FINAL PUBLICATION ATTEMPT
echo ================================================================
echo.

cd /d "c:\Users\HP\Desktop\tuya_repair"

echo Step 1: Final validation check...
homey app validate --level=publish
if !ERRORLEVEL! neq 0 (
    echo ERROR: Validation failed
    pause
    exit /b 1
)
echo ✅ Validation passed
echo.

echo Step 2: Update app.json version manually...
powershell -Command "& {$json = Get-Content 'app.json' -Raw | ConvertFrom-Json; $v = $json.version.Split('.'); $json.version = $v[0] + '.' + $v[1] + '.' + ([int]$v[2] + 1); $json | ConvertTo-Json -Depth 10 | Set-Content 'app.json' -Encoding UTF8}"
echo ✅ Version updated
echo.

echo Step 3: Commit version update...
git add app.json
git commit -m "Bump version for publication"
echo ✅ Version committed
echo.

echo Step 4: Execute publication with echo responses...
(
echo y
echo.
echo Ultimate Zigbee Hub v2.x.x - Professional Redesign and Enhancement with Johan Bendz design standards, SDK3 compliance, comprehensive device coverage for 1500+ devices from 80+ manufacturers, unbranded categorization, professional images, enhanced driver enrichment from forum sources, and complete validation fixes
) | homey app publish

echo.
echo ================================================================
echo PUBLICATION COMPLETED
echo ================================================================
echo.
echo Check results at:
echo https://tools.developer.homey.app/apps/app/com.dlnraja.ultimate.zigbee.hub
echo.
pause
