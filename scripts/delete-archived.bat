@echo off
cd /d "%~dp0..\drivers"

echo Suppression des drivers archives...
echo.

rmdir /S /Q ".bulb_rgb_innr.archived" 2>nul
rmdir /S /Q ".bulb_rgb_lsc.archived" 2>nul
rmdir /S /Q ".bulb_rgb_philips.archived" 2>nul
rmdir /S /Q ".bulb_tunable_white_innr.archived" 2>nul
rmdir /S /Q ".bulb_tunable_white_lsc.archived" 2>nul
rmdir /S /Q ".bulb_tunable_white_osram.archived" 2>nul
rmdir /S /Q ".bulb_tunable_white_philips.archived" 2>nul
rmdir /S /Q ".bulb_white_innr.archived" 2>nul
rmdir /S /Q ".bulb_white_lsc.archived" 2>nul
rmdir /S /Q ".bulb_white_osram.archived" 2>nul
rmdir /S /Q ".bulb_white_philips.archived" 2>nul
rmdir /S /Q ".button_wireless_2gang.archived" 2>nul
rmdir /S /Q ".button_wireless_samsung.archived" 2>nul
rmdir /S /Q ".button_wireless_sonoff.archived" 2>nul
rmdir /S /Q ".contact_sensor_sonoff.archived" 2>nul
rmdir /S /Q ".dimmer_wireless_philips.archived" 2>nul
rmdir /S /Q ".led_strip_sonoff.archived" 2>nul
rmdir /S /Q ".motion_sensor_outdoor_samsung.archived" 2>nul
rmdir /S /Q ".motion_sensor_samsung.archived" 2>nul
rmdir /S /Q ".motion_sensor_sonoff.archived" 2>nul
rmdir /S /Q ".plug_smart_innr.archived" 2>nul
rmdir /S /Q ".plug_smart_osram.archived" 2>nul
rmdir /S /Q ".plug_smart_philips.archived" 2>nul
rmdir /S /Q ".plug_smart_samsung.archived" 2>nul
rmdir /S /Q ".plug_smart_sonoff.archived" 2>nul
rmdir /S /Q ".switch_wireless_4button.archived" 2>nul
rmdir /S /Q ".water_leak_sensor_samsung.archived" 2>nul

echo.
echo Done! 27 dossiers archives supprimes.
