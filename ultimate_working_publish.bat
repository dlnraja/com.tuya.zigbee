@echo off
chcp 65001 >nul
echo PUBLICATION ULTIMATE WORKING VERSION
echo ====================================

echo Mise a jour version 1.0.26...
powershell -Command "(Get-Content '.homeycompose\app.json' -Raw | ConvertFrom-Json) | ForEach-Object { $_.version = '1.0.26'; $_ } | ConvertTo-Json -Depth 10 | Set-Content '.homeycompose\app.json' -Encoding UTF8"

echo Nettoyage cache...
if exist .homeybuild rmdir /s /q .homeybuild

echo Creation des reponses automatiques...
(
echo y
echo n
echo v1.0.26: Professional Device Categorization Complete
echo.
echo DEVICE REORGANIZATION:
echo - All drivers renamed to professional categories without brand prefixes
echo - motion_sensor, contact_sensor, smart_light, smart_plug, etc.
echo - Organized by device function following Johan Benz standards
echo - SDK3 compliant architecture with proper endpoints
echo.
echo DEVICE CATEGORIES:
echo SENSORS: motion_sensor, contact_sensor, temperature_humidity_sensor, presence_sensor, multisensor
echo DETECTORS: air_quality_sensor, co_detector, smoke_detector, water_leak_detector  
echo LIGHTS: smart_light, rgb_light, light_switch, dimmer_switch
echo PLUGS: smart_plug, energy_plug
echo MOTORS: curtain_motor
echo CLIMATE: thermostat
echo SWITCHES: scene_switch
echo.
echo TECHNICAL FEATURES:
echo - 850+ device models from 50+ manufacturers supported
echo - Local Zigbee 3.0 operation, zero cloud dependencies
echo - Multilingual support and enhanced metadata
echo - Comprehensive manufacturer compatibility matrix
echo.
echo BRAND SUPPORT:
echo Tuya, Aqara, IKEA TRADFRI, Philips Hue, Xiaomi, Sonoff, Blitzwolf, Lidl, and 40+ more
echo.
echo Professional unbranded structure ready for App Store
echo.
echo.
echo y
echo yes
echo Y
) > auto_responses.txt

echo Execution publication avec reponses automatiques...
type auto_responses.txt | homey app publish

echo Verification du statut...
homey app manage

echo Nettoyage...
del auto_responses.txt

echo Publication terminee!
pause
