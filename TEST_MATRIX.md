# Universal Tuya Zigbee - Test Matrix

## Version 5.1.0 - Critical Fixes

### Issue Tracker

| Issue | Device | Problem | Status | Fix |
|-------|--------|---------|--------|-----|
| #75 | ZG-204ZL motion sensor | Generic device | ✅ Fixed | Added to motion_sensor_multi productIds |
| #76 | TS0044 _TZ3000_u3nv1jwk | Missing fingerprint | ✅ Fixed | Added manufacturer ID + 10 more |
| #77 | Avatto TRV06 _TZE200_hvaxb2tc | Missing fingerprint | ✅ Fixed | Already in thermostat_trv_tuya + 20 more added |
| #78 | _TZE200_9yapgbuv | Wrong driver (sound controller) | ✅ Fixed | Removed from sound_controller, in climate_monitor |

### Forum Reports

| User | Device | Problem | Status | Fix |
|------|--------|---------|--------|-----|
| Cam | TS0041/TS0044 buttons | No flow triggers | ✅ Fixed v5.0.9 | Rewrote ZCL command listeners |
| Peter | SOS emergency button | Not responding | ✅ Fixed | IAS Zone retry + flow triggers |
| Forum | ZG-204ZM, ZG-204ZV | Generic pairing | ✅ Fixed | Added productIds |
| Forum | _TZE200_rhgsbacq radar | Not working | ✅ Fixed v5.0.6 | In presence_sensor_radar |
| Forum | _TZE204_mvtclclq | Unknown switch | ⚠️ Pending | Needs device info |

### Diagnostic Fixes (v4.11.0 / v5.0.5)

| Problem | Fix Applied |
|---------|-------------|
| "tuyaEF00Manager not initialized" | TuyaEF00Manager robust init in app.js |
| "Tuya cluster not available" spam | BatteryManagerV4 `_tuyaDPDisabled` flag |
| DP4/DP15 requestDP spam | One-shot fail detection stops polling |
| Battery always 100% | Proper ZCL fallback, no "new_device_assumption" |
| IAS Zone crash on startup | Try/catch with 5s retry |

### Device Test Matrix

| Driver | Device | Capabilities | Flows | Battery |
|--------|--------|--------------|-------|---------|
| button_ts0041 | TS0041 1-button | measure_battery | ✅ remote_button_pressed | ✅ ZCL |
| button_ts0043 | TS0043 3-button | measure_battery | ✅ remote_button_pressed | ✅ ZCL |
| button_ts0044 | TS0044 4-button | measure_battery | ✅ remote_button_pressed | ✅ ZCL |
| presence_sensor_radar | _TZE200_rhgsbacq | alarm_motion, measure_luminance | ✅ motion | ✅ DP/ZCL |
| climate_sensor_soil | Soil tester | temp, humidity, soil | N/A | ✅ DP/ZCL |
| climate_monitor_temp_humidity | Temp/Humidity | temp, humidity | N/A | ✅ DP/ZCL |
| motion_sensor_multi | ZG-204ZL/ZM/ZV | motion, temp, humidity, lux | ✅ motion | ✅ ZCL |
| thermostat_trv_tuya | TRV Avatto/Moes | target_temp, measure_temp | N/A | ✅ DP |
| button_emergency_sos | SOS button | alarm_generic | ✅ SOS triggered | ✅ ZCL |
| smoke_detector_advanced | Smoke sensor | alarm_smoke | ✅ smoke alarm | ✅ ZCL |
| plug_energy_monitor | TS011F/TS0121 | onoff, power, voltage | ✅ on/off | N/A (AC) |
| contact_sensor | TS0203/RH3001 | alarm_contact | ✅ contact | ✅ ZCL |
| water_leak_sensor | TS0207 | alarm_water | ✅ water leak | ✅ ZCL |

### Key Architecture Fixes (v5.0.9)

1. **TuyaEF00Manager.requestDP()** - Returns null instead of throwing when cluster missing
2. **TuyaDeviceHelper** - Separates protocol detection from cluster availability
3. **BatteryManagerV4** - `useTuyaDP` option, `_tuyaDPDisabled` flag
4. **Button drivers** - Proper `onOffCluster.on('command', ...)` listeners
5. **Flow card filter** - TS004x added to `remote_button_pressed`

### Changelog Summary

- v5.0.9: Major Tuya DP spam fix + button flow triggers
- v5.1.0: Driver enrichment + remaining issues
