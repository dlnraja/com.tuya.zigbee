# GitHub Responses v5.11.16 — Feb 19, 2026

## PRs: All responded Feb 18

## Issues Needing Response

### #1347 azkysmarthome — All 7 supported
Response:
Hi! All your devices are supported in dlnraja fork (v5.11.16):
_TZE284_6ycgarab→smoke_detector_advanced, HOBEIAN ZG-222Z→water_leak_sensor,
_TZE200_u6x1zyv2→rain_sensor, _TZE204_gkfbdvyx→presence_sensor_radar,
_TZE204_dwcarsat/_TZE200_vrcfo4i0→climate_sensor, _TZ3000_zutizvyk→contact_sensor
Install: https://homey.app/a/com.dlnraja.tuya.zigbee/test/ — Remove and re-pair.
### #1348 electronickPL — _TZ3210_xzhnra8x → plug_energy_monitor
Supported. Install test, remove & re-pair.

### #1344 fjvs1467 — BUG: TS0201 stopped (v5.5.811)
Frame-drop bug fixed v5.8.96. Update to latest test version.

### #1345 Nono-3ric — _TZE284_xnbkhhdr → thermostat_tuya_dp
Supported. Install test, remove & re-pair.

### #1341 proisland — _TZE284_aao3yzhs → soil_sensor
Supported. Install test, remove & re-pair.

### #1342 geertvanelslander — Zbeacon DS01 → contact_sensor
Supported. Install test, remove & re-pair.

### #1343 cvh1111 — _TZE200_rhgsbacq → presence_sensor_radar
Supported. Install test, remove & re-pair.

### #1270 NoroddH — _TZ321C_fkzihax8 / TS0225 → motion_sensor (IAS-only PIR)
Response:
Hi! Your device `_TZ321C_fkzihax8` / `TS0225` is already supported in the dlnraja fork (v5.11.16) as a **motion_sensor** driver.
Note: Despite the "5.8G Radar" marketing name, your device interview confirms it uses **IAS Zone only** (cluster 1280, no Tuya EF00 cluster), so it operates as a PIR motion sensor.
It is mains-powered (router device) with IAS enrollment fixes applied (v5.5.538).
Install: https://homey.app/a/com.dlnraja.tuya.zigbee/test/
Remove and re-pair after installing.
Forum: https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352

### #1331 MF-ITuser — _TZ3290_ot6ewjvmejq5ekhl / TS1201 → ir_blaster (Moes UFO-R11)
Response:
Hi! Your Moes UFO-R11 (`_TZ3290_ot6ewjvmejq5ekhl` / `TS1201`) is already supported in the dlnraja fork (v5.11.16) as an **ir_blaster** driver.
Install: https://homey.app/a/com.dlnraja.tuya.zigbee/test/
Remove and re-pair after installing.
Forum: https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352

## Template for all "Supported" issues:
Hi! 👋 Your device is already supported in the dlnraja fork.
Install: https://homey.app/a/com.dlnraja.tuya.zigbee/test/
Remove and re-pair after installing.
Forum: https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352
