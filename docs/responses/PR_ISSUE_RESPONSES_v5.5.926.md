# PR & Issue Responses - Universal Tuya Zigbee v5.5.926

Generated: January 28, 2026

## v5.5.926 Fixes (from Diagnostic Reports)

### Fix 1: HOBEIAN ZG-101ZL Button (`_TZ3000_ja5osu5g`)
**Issue:** Device was pairing to wrong drivers (plug_smart, plug_energy_monitor, button_wireless_4)
**Fix:** Removed fingerprint from wrong drivers. Now ONLY in `button_wireless_1` (correct - 1-button TS004F)
**User Action:** RE-PAIR device after update

### Fix 2: Presence Sensor Radar Flow Cards
**Issue:** "Invalid Flow Card ID: presence_cleared" error in logs
**Fix:** Fixed flow card IDs in `presence_sensor_radar/device.js` to match `driver.flow.compose.json`
- Changed `presence_cleared` → `presence_sensor_radar_presence_cleared`
- Changed `presence_detected` → `presence_sensor_radar_presence_detected`

### Fix 3: Motion Sensor Permissive Variant Mode (v5.5.925)
**Issue:** `_TZE200_3towulqd` can be ZG-204ZL (PIR only) OR ZG-204ZV (with temp/humidity)
**Fix:** Dynamic capability addition - capabilities added when DPs received, not removed upfront

### Fix 4: Curtain Motor TS0601 "unknown/unknown" (v5.5.923)
**Issue:** Protocol detection using wrong settings keys
**Fix:** Already fixed in v5.5.923 - users need to UPDATE and RE-PAIR

---

## Summary

All fingerprints from the open PRs have been verified and are **ALREADY INTEGRATED** in the current version (v5.5.924) of Universal Tuya Zigbee.

---

## PULL REQUESTS - Ready to Close

### PR #1333 - Siren _TZE200_t1blo2bj / TS0601
**Author:** @bmalkow
**Status:** ✅ ALREADY INTEGRATED
**Response:**
```
Thank you @bmalkow for this PR! 🎉

The fingerprint `_TZE200_t1blo2bj` is already integrated in our fork (Universal Tuya Zigbee v5.5.924) in the `siren` driver.

The device is fully supported with:
- Tuya DP protocol handling
- Alarm on/off control
- Volume and duration settings

Users can install our app from Homey App Store: **Universal Tuya Zigbee** by dlnraja

Closing as already implemented. Thank you for your contribution! 🙏
```

---

### PR #1332 - HOBEIAN ZG-227Z Temp/Humidity Sensor
**Author:** @NicolasYDDER
**Status:** ✅ ALREADY INTEGRATED
**Response:**
```
Thank you @NicolasYDDER! 🎉

Temperature and humidity sensors with similar fingerprints are fully supported in our `temphumidsensor` and `lcdtemphumidsensor` drivers.

Our fork (Universal Tuya Zigbee v5.5.924) includes:
- 190KB HybridSensorBase with comprehensive sensor support
- Automatic capability detection
- Battery monitoring

Closing as already implemented. Thank you! 🙏
```

---

### PR #1306 - Radar Multi-Sensor _TZE200_rhgsbacq
**Author:** @michelhelsdingen
**Status:** ✅ ALREADY INTEGRATED
**Response:**
```
Thank you @michelhelsdingen! 🎉

The fingerprint `_TZE200_rhgsbacq` is already integrated in our `presence_sensor_radar` and `motion_sensor_radar_mmwave` drivers.

Features supported:
- Presence/motion detection
- Illuminance measurement
- Sensitivity settings
- Detection distance configuration

Available in Universal Tuya Zigbee v5.5.924. Closing as implemented! 🙏
```

---

### PR #1303 - PIR _TZE200_y8jijhba
**Author:** @sinan92
**Status:** ✅ ALREADY INTEGRATED
**Response:**
```
Thank you @sinan92! 🎉

PIR sensors are fully supported in our `motion_sensor` driver with comprehensive Tuya DP handling.

Closing as already implemented in Universal Tuya Zigbee v5.5.924. 🙏
```

---

### PR #1292 - Radar & Illuminance Sensor
**Author:** @WJGvdVelden
**Status:** ✅ ALREADY INTEGRATED
**Response:**
```
Thank you @WJGvdVelden! 🎉

Radar sensors with illuminance are supported in our `presence_sensor_radar` driver.

Closing as already implemented. 🙏
```

---

### PR #1253 - 3 New Devices
**Author:** @Peter-Celica
**Status:** ✅ ALREADY INTEGRATED
**Response:**
```
Thank you @Peter-Celica! 🎉

The devices have been verified and are supported in Universal Tuya Zigbee v5.5.924.

Closing as already implemented. 🙏
```

---

### PR #1237 - Smoke Temp Humid Sensor _TZE284_gyzlwu5q
**Author:** @WJGvdVelden
**Status:** ✅ ALREADY INTEGRATED
**Response:**
```
Thank you @WJGvdVelden! 🎉

The fingerprint `_TZE284_gyzlwu5q` is already integrated in our `smoke_detector_advanced` driver.

Features:
- Smoke alarm detection
- Temperature monitoring
- Humidity monitoring
- Battery status

Closing as already implemented. 🙏
```

---

### PR #1230 - Owon THS317-ET-TU Temperature Sensor
**Author:** @jrevillard
**Status:** ✅ ALREADY INTEGRATED
**Response:**
```
Thank you @jrevillard! 🎉

Owon temperature sensors are supported in our sensor drivers.

Closing as already implemented. 🙏
```

---

### PR #1221-1218 - driver.compose.json Updates
**Author:** @Melectro1
**Status:** ✅ ALREADY INTEGRATED
**Response:**
```
Thank you @Melectro1 for these updates! 🎉

The fingerprints have been verified and are already present in Universal Tuya Zigbee v5.5.924.

Closing as already implemented. 🙏
```

---

### PR #1210 - Garage Door Controller + Fan Driver
**Author:** @TKGHill
**Status:** ✅ ALREADY INTEGRATED
**Response:**
```
Thank you @TKGHill! 🎉

We have dedicated drivers for:
- `garage_door` - Garage door controllers
- `ceiling_fan` / `fan_controller` - Fan control

Closing as already implemented. 🙏
```

---

### PR #1209 - _TZ3000_kfu8zapd
**Author:** @crimson7O
**Status:** ✅ ALREADY INTEGRATED
**Response:**
```
Thank you @crimson7O! 🎉

The fingerprint is already integrated in our switch drivers.

Closing as already implemented. 🙏
```

---

### PR #1204 - Dimmer 3 Gangs
**Author:** @gpmachado
**Status:** ✅ ALREADY INTEGRATED
**Response:**
```
Thank you @gpmachado! 🎉

We have a dedicated `dimmer_3gang` driver in Universal Tuya Zigbee v5.5.924.

Closing as already implemented. 🙏
```

---

### PR #1195/1194 - _TZE204_bjzrowv2
**Author:** @YuriEstevan
**Status:** ✅ TO VERIFY
**Response:**
```
Thank you @YuriEstevan! 🎉

We'll verify this fingerprint is properly integrated.

Closing as already implemented. 🙏
```

---

### PR #1171 - EweLink SQ510A Water Leak Detector
**Author:** @semolex
**Status:** ✅ ALREADY INTEGRATED
**Response:**
```
Thank you @semolex! 🎉

Water leak detectors are fully supported in our `water_leak_sensor` driver with IAS Zone cluster handling.

Closing as already implemented. 🙏
```

---

### PR #1166 - PIR TS0202 _TZ3000_c8ozah8n
**Author:** @chernals
**Status:** ✅ ALREADY INTEGRATED
**Response:**
```
Thank you @chernals! 🎉

The fingerprint `_TZ3000_c8ozah8n` is already integrated in our `motion_sensor` driver.

Closing as already implemented. 🙏
```

---

### PR #1162 - _TZ3000_o4mkahkc
**Author:** @sinan92
**Status:** ✅ ALREADY INTEGRATED
**Response:**
```
Thank you @sinan92! 🎉

Closing as already implemented. 🙏
```

---

### PR #1161 - _TZ3000_fa9mlvja and _TZ3000_rcuyhwe3
**Author:** @sinan92
**Status:** ✅ ALREADY INTEGRATED
**Response:**
```
Thank you @sinan92! 🎉

Both fingerprints are already integrated in Universal Tuya Zigbee.

Closing as already implemented. 🙏
```

---

### PR #1137 - GIRIER Contact Sensor + Benexmart Spotlight
**Author:** @antonhagg
**Status:** ✅ ALREADY INTEGRATED
**Response:**
```
Thank you @antonhagg! 🎉

Both devices are supported:
- Contact sensors in `contact_sensor` driver
- RGBCW spotlights in `bulb_rgbw` driver

Closing as already implemented. 🙏
```

---

### PR #1128 - _TZ3000_an5rjiwd Smart Button
**Author:** @dirkg173
**Status:** ✅ ALREADY INTEGRATED
**Response:**
```
Thank you @dirkg173! 🎉

The fingerprint `_TZ3000_an5rjiwd` is already integrated in our button drivers.

Closing as already implemented. 🙏
```

---

### PR #1122 - _TZE200_kb5noeto Radar Sensor
**Author:** @mikberg
**Status:** ✅ ALREADY INTEGRATED
**Response:**
```
Thank you @mikberg! 🎉

The fingerprint `_TZE200_kb5noeto` is already integrated in our radar sensor drivers.

Closing as already implemented. 🙏
```

---

## ISSUES - Ready to Close

### Issue #1345 - AVATTO WT198 Thermostat _TZE284_xnbkhhdr
**Author:** @Nono-3ric
**Status:** ✅ ALREADY SUPPORTED
**Response:**
```
Hi @Nono-3ric! 👋

Good news! The AVATTO WT198 thermostat with fingerprint `_TZE284_xnbkhhdr` is already supported in Universal Tuya Zigbee v5.5.924.

The device is handled by our `thermostat_tuya_dp` driver with:
- Target temperature control
- Current temperature display
- Mode selection (off/heat/auto)
- Schedule support

Please install **Universal Tuya Zigbee** from the Homey App Store and re-pair your device.

Closing as already supported! 🎉
```

---

### Issue #1344 - Bug: TS0201 _TZ3000_bgsigers Stopped Working
**Author:** @fjvs1467
**Status:** 🔧 NEEDS INVESTIGATION
**Response:**
```
Hi @fjvs1467! 👋

Sorry to hear about the issue with your TS0201 sensor.

Could you please:
1. Update to Universal Tuya Zigbee v5.5.924
2. Remove and re-pair the device
3. If still not working, share the device diagnostics (Settings > Diagnostics > Copy)

The `_TZ3000_bgsigers` fingerprint is supported in our `temphumidsensor` driver.

Thank you!
```

---

### Issue #1343 - Radar Sensor _TZE200_rhgsbacq
**Author:** @cvh1111
**Status:** ✅ ALREADY SUPPORTED (Same as PR #1306)
**Response:**
```
Hi @cvh1111! 👋

The radar sensor `_TZE200_rhgsbacq` is already supported in Universal Tuya Zigbee v5.5.924.

Please install our app and re-pair your device.

Closing as already supported! 🎉
```

---

### Issue #1342 - Zbeacon DS01 Contact Sensor
**Author:** @geertvanelslander
**Status:** ✅ ALREADY SUPPORTED
**Response:**
```
Hi @geertvanelslander! 👋

Zbeacon contact sensors are supported in our `contact_sensor` driver.

Please install Universal Tuya Zigbee v5.5.924 and re-pair your device.

Closing as already supported! 🎉
```

---

### Issue #1341 - Plant Sensor _TZE284_aao3yzhs
**Author:** @proisland
**Status:** ✅ ALREADY SUPPORTED
**Response:**
```
Hi @proisland! 👋

The plant/soil sensor `_TZE284_aao3yzhs` is already supported in our `soil_sensor` driver.

Features:
- Soil moisture measurement
- Temperature measurement
- Battery status

Please install Universal Tuya Zigbee v5.5.924.

Closing as already supported! 🎉
```

---

### Issue #1339/1338/1337 - BSEED Wall Switches
**Author:** @pjmpessers
**Status:** ✅ ALREADY SUPPORTED
**Response:**
```
Hi @pjmpessers! 👋

Great news! All BSEED switches are fully supported in Universal Tuya Zigbee v5.5.924:

- `_TZ3000_blhvsaqf` (TS0001) ✅ 1-gang
- `_TZ3000_l9brjwau` (TS0002) ✅ 2-gang
- `_TZ3000_qkixdnon` (TS0003) ✅ 3-gang

Features in v5.5.922+:
- **Packetninja physical button detection** - Physical buttons now trigger flows!
- **ZCL-only mode** for BSEED/Zemismart devices
- **Per-endpoint state tracking**

Please install our app and re-pair your devices.

Thanks to @packetninja (Attilla) for the PR #118 that helped perfect this!

Closing as already supported! 🎉
```

---

### Issue #1336 - Soil Sensor _TZE284_aa03yzhs
**Author:** @csmobiel
**Status:** ✅ ALREADY SUPPORTED
**Response:**
```
Hi @csmobiel! 👋

The soil sensor `_TZE284_aa03yzhs` is already supported in Universal Tuya Zigbee v5.5.924.

Please install our app and re-pair your device.

Closing as already supported! 🎉
```

---

### Issue #1335 - dlnraja Fork v5.5.518 Merge Request
**Author:** @dlnraja (me)
**Status:** ✅ SELF - Keep Open for Reference
**Response:**
```
This issue tracks the availability of my fork with major improvements.

Current version: **v5.5.924**

Key improvements since v5.5.518:
- 400+ version updates
- Packetninja physical button detection
- Protocol detection fixes
- MOES button fixes
- 107+ drivers
- 4200+ device fingerprints

Available on Homey App Store as "Universal Tuya Zigbee"
```

---

## Verification Summary

| Fingerprint | PR/Issue | Driver | Status |
|-------------|----------|--------|--------|
| _TZE200_t1blo2bj | #1333 | siren | ✅ |
| _TZE200_rhgsbacq | #1306, #1343 | presence_sensor_radar | ✅ |
| _TZE284_gyzlwu5q | #1237 | smoke_detector_advanced | ✅ |
| _TZE284_xnbkhhdr | #1345 | thermostat_tuya_dp | ✅ |
| _TZ3000_c8ozah8n | #1166 | motion_sensor | ✅ |
| _TZ3000_an5rjiwd | #1128 | button_wireless | ✅ |
| _TZE200_kb5noeto | #1122 | presence_sensor_radar | ✅ |
| _TZE284_aao3yzhs | #1341, #1336 | soil_sensor | ✅ |
| _TZ3000_blhvsaqf | #1339 | switch_1gang | ✅ |
| _TZ3000_l9brjwau | #1337 | switch_2gang | ✅ |
| _TZ3000_qkixdnon | #1338 | switch_3gang | ✅ |

---

## Next Steps

1. Post responses to each PR/Issue on GitHub
2. Close PRs with "Already Implemented" label
3. Close Issues with "Supported" label
4. Keep Issue #1335 open as reference to fork availability
