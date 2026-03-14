# Forum Issues Analysis - Comprehensive Report

**Analysis Date**: 2026-02-17 (Updated v5.11.13)
**Forum Thread**: https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352
**Messages Analyzed**: p1-72 (latest scan: p70-72 on 2026-02-17)
**Git Commits Analyzed**: 2025-01-15 to present

---

## 🚨 CRITICAL ISSUES

### 1. **Smart Buttons - No Flow Response** (Cam - #1160)
**Device**: 1-Button Wireless Controller
**Version**: 5.5.759
**Diagnostic**: 4d7b45a5-082f-4f1e-a787-a439eac5257a
**Status**: ⚠️ INVESTIGATING

**Symptoms**:
- ✅ Pairs correctly as 1-Buttons Wireless controller
- ✅ No ghost triggers every hour (previous bug fixed)
- ❌ No GUI button in device settings
- ❌ No response through flows
- ❌ No battery readout

**Code Analysis**:
- ✅ `button.1` capability defined in driver.compose.json
- ✅ `measure_battery` capability defined
- ✅ Flow triggers present in driver.flow.compose.json
- ✅ Battery reporting code in device.js
- ⚠️ "No GUI button" suggests capability not visible in Homey UI

**Hypothesis**:
- Button capability with `maintenanceAction: true` makes it hidden in main UI
- User expects visible button widget but it's event-only
- Battery might not be reporting due to sleepy device timing
- Flow triggers should work but may need re-pairing

**Fix Strategy**:
1. Document that button.1 is intentionally hidden (maintenance action)
2. Enhance battery wake detection for initial read
3. Add diagnostic logging for flow trigger execution
4. Consider adding visible capability option in settings

---

### 2. **Contact Sensor - No Response** (Lasse_K - Page 42)
**Device**: Contact/Door sensor
**Status**: ⚠️ NEEDS USER DIAGNOSTIC

**Symptoms**:
- Device completely unresponsive
- No indication when magnet removed/attached
- Was working before recent update

**Code Analysis**:
- ✅ Contact sensor driver has extensive v5.5.344 fixes for IAS Zone keep-alive
- ✅ Debouncing implemented (500ms-3000ms depending on problematic sensor detection)
- ✅ Invert contact setting available for inverted sensors
- ✅ HybridSensorBase handles IAS Zone + Tuya DP + ZCL listeners
- ⚠️ No IAS Zone listener code visible in contact_sensor/device.js

**Hypothesis**:
- User may have inverted sensor (needs invert_contact setting)
- Debounce timeout too long blocking legitimate state changes
- IAS Zone listener may not be properly initialized in HybridSensorBase
- Need diagnostic report to see actual DP/ZCL traffic

**Fix Strategy**:
1. Request diagnostic report from Lasse_K
2. Check if HybridSensorBase properly registers IAS Zone listeners
3. Add logging to contact sensor for all state changes
4. Verify debounce is not blocking all updates

---

### 3. **Scene Switches - No Button Selection** (Eftychis_Georgilas - Page 42)
**Diagnostic**: 7fc451ca-ed9a-4997-a070-979118b8e6c2
**Status**: ⚠️ INVESTIGATING

**Symptoms**:
- Switches moved to scene driver
- No option to choose buttons in GUI
- Error message displayed
- Motion sensor has same issue

**Code Analysis**:
- ✅ Scene switches have `button.1` capability (same as wireless buttons)
- ✅ `maintenanceAction: true` makes button hidden in main UI
- ⚠️ Same design as button_wireless_1 - button is event-only, not visible widget

**Hypothesis**:
- Same as button_wireless_1 issue - user expects visible button widget
- Button capability is intentionally hidden for event-based triggers
- "No option to choose buttons" = no GUI widget (by design)
- Flow cards should work for button press events

**Fix Strategy**:
- Same as button_wireless_1 - document that buttons are event-only
- Ensure flow triggers are properly registered
- Consider adding setting to show/hide button widget if users demand it

---

## ⚠️ DEVICE-SPECIFIC ISSUES

### 4. **_TZE284_iadro9bf - Motion Alarm Stuck** (Page 39)
**Device**: Presence radar sensor (router)
**Diagnostic**: d8820bc1-7646-411b-8158-2132ea45a1ac
**Status**: ⚠️ HIGH PRIORITY

**Interview Data**:
```json
{
  "modelId": "TS0601",
  "manufacturerName": "_TZE284_iadro9bf",
  "inputClusters": [4, 5, 61184, 0, 60672],
  "deviceType": "router"
}
```

**Symptoms**:
- Motion alarm ALWAYS YES
- Updates every 20 seconds even with no movement
- Human presence works correctly
- Illuminance jumps: 30 lux → 1000-1100 lux (with same lighting)

**Root Cause Analysis**:
- ✅ Device config exists: `TZE284_IADRO9BF` with extensive fixes
- ✅ `_throttleMotionSpam()` blocks duplicate motion updates (60s throttle)
- ✅ Lux smoothing implemented (120s window, oscillation lock)
- ⚠️ Config has `invertPresence: false` - may need to be `true`
- ⚠️ Motion spam throttle only blocks SAME values, not constant YES

**Issue**: User reports "motion alarm ALWAYS YES every 20s"
- Current throttle blocks repeated values within 60s
- But if device alternates YES→NO→YES rapidly, throttle won't catch it
- Or if firmware genuinely reports YES constantly (stuck state)

**Fix Strategy**:
1. Enable `invertPresence: true` for this device (test if it's inverted firmware)
2. Enhance throttle to detect "stuck in YES" pattern
3. Add fallback to use distance-based inference when DP1 is unreliable
4. Log diagnostic data to understand actual DP1 behavior

---

### 5. **_TZE204_gkfbdvyx - Similar Radar Issue** (Page 39)
**Device**: Presence radar sensor (router)
**Status**: ⚠️ HIGH PRIORITY

**Interview Data**:
```json
{
  "modelId": "TS0601",
  "manufacturerName": "_TZE204_gkfbdvyx",
  "inputClusters": [4, 5, 61184, 0],
  "deviceType": "router"
}
```

**Symptoms**:
- Now working with movement detection (was broken before)
- Need to verify if motion alarm stuck issue exists

---

### 6. **eWeLink CK-TLSR8656-SS5-01(7014) - Not Pairing** (Page 42)
**Device**: Temperature & Humidity Sensor
**Status**: ✅ FIXED

**Interview Data**:
```json
{
  "modelId": "CK-TLSR8656-SS5-01(7014)",
  "manufacturerName": "eWeLink",
  "inputClusters": [0, 1, 3, 4, 32, 1026, 1029, 64529],
  "deviceType": "enddevice",
  "receiveWhenIdle": false
}
```

**Clusters**:
- 0: basic
- 1: powerConfiguration (battery: 3.2V, 100%)
- 1026: temperatureMeasurement (26.5°C)
- 1029: relativeHumidity (62.3%)
- 32: pollControl (checkIn: 14400s = 4h)
- 64529: Unknown (0xFC11) - eWeLink proprietary?

**Analysis**:
- Pure ZCL device (no Tuya cluster 61184)
- Should pair to climate_sensor driver
- ✅ Added "eWeLink" to climate_sensor manufacturerName list

**Fix Applied**:
- Added "eWeLink" manufacturer name to `@/c:/Users/HP/Desktop/homey app/tuya_repair/drivers/climate_sensor/driver.compose.json:2480-2481`
- Device will now pair correctly to climate_sensor driver

---

### 7. **_TZ3000_wkai4ga5 / _TZ3000_5tqxpine - Fingerprint Collision** (Eftychis - Page 41)
**Devices**: 4-button scene switches
**Diagnostic**: 63cacdf6-10d0-4873-8fd8-7b75affd4786
**Status**: ⚠️ FINGERPRINT COLLISION

**Symptoms**:
- Buttons don't respond with physical press
- Virtual buttons work
- Device pairs as "wireless controller" instead of "4 scene switch"
- Buttons labeled "button 1,2,3,4" instead of "upper left, upper right" etc.
- Battery not showing on _TZ3000_5tqxpine

**Code Analysis**:
- ⚠️ `_TZ3000_wkai4ga5` is in 8+ drivers (COLLISION!):
  - water_leak_sensor, switch_3gang, switch_2gang, switch_4gang, switch_1gang
  - scene_switch_4, motion_sensor, contact_sensor, climate_sensor
  - button_wireless_4 (CORRECT ONE)
- ⚠️ `_TZ3000_5tqxpine` is in scene_switch_4 AND button_wireless_4
- Device matches wrong driver during pairing

**Root Cause**: Manufacturer ID in too many drivers causes unpredictable pairing

**Fix Strategy**:
1. Remove from all wrong drivers (keep ONLY in button_wireless_4 and scene_switch_4)
2. These are 4-button wireless switches, NOT wall switches or sensors
3. Consider merging button_wireless_4 and scene_switch_4 since they're same hardware

---

### 8. **HOBEIAN ZG-102Z - IAS Zone CIE Enrollment** (Lasse_K - Page 40)
**Device**: Contact sensor
**Status**: ⚠️ CIE ENROLLMENT FAILURE

**Interview Data**:
```json
{
  "modelId": "ZG-102Z",
  "manufacturerName": "HOBEIAN",
  "iasZone.zoneType": "contactSwitch",
  "iasZone.iasCIEAddress": "00:00:00:00:00:00:00:00",
  "inputClusters": [0, 3, 1280, 61184, 1]
}
```

**Critical Issue**: `iasCIEAddress: 00:00:00:00:00:00:00:00`
- Device is NOT enrolled to Homey's coordinator
- IAS Zone notifications will NOT be sent to Homey
- This explains why Lasse_K sees "no indication" from the sensor

**Code Analysis**:
- ✅ HybridSensorBase has CIE enrollment code (v5.5.646)
- ✅ Handles zoneEnrollRequest and attempts CIE write
- ⚠️ CIE write may be failing silently
- ⚠️ May need explicit enrollment trigger on wake

**Fix Strategy**:
1. Force CIE address write on device init (even if device shows enrolled)
2. Add explicit enrollResponse call after CIE write
3. Log enrollment success/failure clearly for debugging
4. May need user to re-pair device after fix

---

### 9. **Motion Sensor - Lux Only Updates on Motion** (Eftychis - Page 41)
**Status**: ⚠️ DESIGN LIMITATION

**Symptom**: Lux level only updates when motion is triggered, not continuously

**Analysis**:
- This is EXPECTED behavior for battery-powered PIR sensors
- Sleepy devices only wake on motion detection
- Lux is read when device wakes for motion event
- Continuous lux reporting would drain battery quickly

**Note**: Mains-powered presence radars (mmWave) DO report lux continuously

---

## 📋 RECENT REGRESSIONS (Git Analysis)

### Commits Since 2025-01-15:

1. **v5.5.752 - SOS Button DP13 Regression** (68b908001f)
   - Forum issue #267
   - Button action handler broken

2. **v5.5.751 - ZG-204ZV Temp/Humidity Regression** (7be02f9aff)
   - Forum issue #267
   - DP4=temp, DP5=humidity mapping broken

3. **v5.5.750 - HybridSwitchBase Constructor Crash** (bb504e4e1c)
   - Hartmut_Dunker report
   - Constructor crash affecting switches

4. **v5.5.718 - TS0726 4-gang Fix** (eeaaefe479)
   - Hartmut_Dunker
   - OnOff cluster and bindings added

---

## 🔍 CROSS-REFERENCE ACTIONS

### Zigbee2MQTT Research Needed:
1. ✅ _TZE284_iadro9bf - Motion alarm DP mapping
2. ✅ _TZE204_gkfbdvyx - Presence radar configuration
3. ✅ eWeLink sensors - Device definition
4. ✅ Button flow card patterns
5. ✅ Contact sensor IAS Zone handling

### ZHA Research Needed:
1. ✅ eWeLink quirks
2. ✅ Presence radar motion detection logic

### Git History Analysis:
1. ✅ Recent button driver changes
2. ✅ Contact sensor modifications
3. ✅ Scene switch driver updates
4. ✅ Presence radar DP mappings changes

---

## ACTION PLAN

### Priority 1 - Critical Fixes:
- [x] Fix smart button flow triggers (Cam) → Fixed v5.9.14
- [x] Fix contact sensor response (Lasse_K) → Fixed v5.8.85
- [x] Fix scene switch button selection → Documented as design

### Priority 2 - Device-Specific:
- [x] Fix _TZE284_iadro9bf motion alarm stuck → Throttle+lux smoothing
- [x] Add eWeLink CK-TLSR8656-SS5-01(7014) → Added to climate_sensor
- [x] Verify _TZE204_gkfbdvyx fixes → Working per user report

### Priority 3 - Research & Prevention:
- [ ] Review all recent regressions
- [ ] Add regression tests
- [ ] Update documentation

---

## 📝 NOTES

**Pattern Detected**: Multiple issues appeared after v5.5.750-759 releases
**Hypothesis**: Rapid updates may have introduced regressions in core base classes
**Recommendation**: Comprehensive base class audit before next release

## Forum p68-70 Scan (2026-02-09)
RESOLVED: DutchDuke soil v5.8.87, Lasse_K water/contact v5.8.85+88, blutch32 v5.8.85, Hartmut v5.8.87, FinnKje v5.8.40, Karsten v5.8.38, Patrick v5.8.11, Tbao v5.8.41, FrankP IR in code.
PERSISTENT: Freddyboy TS0044 + Cam TS0041 — need diag on v5.8.88.
NEEDS INFO: Ricardo_Lenior presence wrong caps — needs fingerprint.

## Forum p70-72 Scan (2026-02-17)
RESOLVED: Cam button OK v5.9.14. Tividor TS0044 single OK.
PERSISTENT: Hartmut TS0726 4-gang virtual=all. Lasse_K contact regression v5.9.x.
NEW: Tividor double/long press NOT working. Piotr TS0002 _TZ3000_cauq1okq 2-gang=1. lemon TS0203 _TZ3000_okohwwap+Zbeacon=generic. JJ10 presence distance=humidity + WiFi settings blank (diag:32709eaf, log spam fixed v5.11.13). H_van_Barneveld WiFi liquid level request.

## GitHub Issues (2026-02-17)
GH#124: _TZ3000_fllyghyj+b4awzgct case — ALREADY FIXED.
GH#126: _TZ3000_zutizvyk TS0203 — ALREADY in contact_sensor (v5.9.4).
GH#127: _TZE204_e5m9c5hl radar — FIXED v5.8.97.
JohanBendz PRs: #1346 time sync LCD, #1333 siren, #1332 HOBEIAN — all already integrated.


## Nightly Forum Scan (2026-02-20 v5.11.17)
- **Topic 140352 #1450** @Hartmut_Dunker: `_TZ3002_pzao9ls1` (template)
- **Topic 140352 #1462** @SkiMattie: `_TZ3000_mrpevh8p`, `_TZE204_9mjy74mp` (template)
- **Topic 26439 #5388** @Trey_Rogerson: `_TZE284_c8ipbljq` (template)
- **Topic 26439 #5389** @Willy: `_TZ3000_pjb1ua0m` (template)
- **Topic 26439 #5391** @Ons: `_TZ3000_ww6drja5` (template)
- **Topic 26439 #5396** @Hogar_Otal_Scridon: `_TZE284_tgeqdjgk` (template)


## Nightly Forum Scan (2026-02-21 v5.11.19)
- **Topic 140352 #1465** @ManuelKugler: `_TZE284_aao3yzhs` (template)


## Nightly Forum Scan (2026-02-22 v5.11.19)
- **Topic 140352 #1467** @Slawek_Pe: `_TZ3210_xzhnra8x` (template)

## JohanBendz Issues Triage (2026-02-22)

All 12 fingerprints from 20 open issues **already supported** in v5.11.19:

| # | Fingerprint | Driver(s) |
|---|------------|-----------|
| 1345 | _TZE284_xnbkhhdr | thermostat_tuya_dp |
| 1344 | _TZ3000_bgsigers | climate_sensor |
| 1343 | _TZE200_rhgsbacq | presence_sensor_radar |
| 1341 | _TZE284_aao3yzhs | soil_sensor |
| 1339 | _TZ3000_blhvsaqf | wall_switch_1-4gang |
| 1338 | _TZ3000_qkixdnon | wall_switch_3-4gang |
| 1337 | _TZ3000_l9brjwau | wall_switch_2gang |
| 1336 | _TZE284_aa03yzhs | soil_sensor |
| 1328 | _TZE284_9ern5sfh | climate_sensor |
| 1327 | _TZ3000_zgyzgdua | button_wireless_4 |
| 1326 | _TZ3210_4ux0ondb | plug_energy_monitor |
| 1325 | _TZ3210_s8lvbbu | bulb_rgbw |

**Forum topics now scanned**: 140352, 26439, 146735, 89271, 54018


## Nightly Forum Scan (2026-02-23 v5.11.22)
- **Topic 89271 #659** @Marcel_Visser: `_TZE204_sxm7l9xa` (gh-gpt-4o-mini)
- **Topic 89271 #660** @Ferenc_Szasz: `_TZE200_3p5ydos3` (gh-gpt-4o-mini)
- **Topic 89271 #661** @Anders_Lim: `_TZE204_hlx9tnzb` (gh-gpt-4o-mini)
- **Topic 89271 #662** @radiothieves: `_TZB210_rkgngb5o` (gh-gpt-4o-mini)
- **Topic 89271 #663** @Janderek: `_TZE200_3towulqd` (gh-Meta-Llama-3.1-8B-Instruct)
- **Topic 89271 #664** @MBrandt: `_TZ3210_iystcadi` (gh-Meta-Llama-3.1-8B-Instruct)
- **Topic 89271 #665** @Johan_Rossouw: `_TYZB01_6g8b7at8` (gh-Meta-Llama-3.1-8B-Instruct)
- **Topic 89271 #666** @RezaRose: `_TZ3210_0zabbfax` (gh-Meta-Llama-3.1-8B-Instruct)
- **Topic 89271 #667** @late4marshmellow: `_TZ3210_3lbtuxgp` (gh-Meta-Llama-3.1-8B-Instruct)
- **Topic 89271 #668** @Peter_N: `_TZE200_myd45weu` (gh-gpt-4o-mini)
- **Topic 89271 #669** @Erwin3: `_TZ3000_qeuvnohg` (gh-gpt-4o-mini)
- **Topic 89271 #670** @Trond_Sandland: `_TZ3000_wkr3jqmr` (gh-gpt-4o-mini)
- **Topic 89271 #671** @Henk_de_Boom: `_TZE200_p0gzbqct` (gh-gpt-4o-mini)


## Nightly Forum Scan (2026-02-24 v5.11.22)
- **Topic 140352 #1477** @FrankP: `_TZ3000_itb0omhv` (gh-gpt-4o-mini)


## Nightly Forum Scan (2026-02-25 v5.11.24)
- **Topic 140352 #1479** @Jocke_Wallen: `_TZ3000_u3nv1jwk` (gh-gpt-4o-mini)


## Nightly Forum Scan (2026-02-26 v5.11.25)
- **Topic 140352 #1481** @JJ10: `_TZE200_crq3r3la`, `_TZE200_gkfbdvyx` (gh-gpt-4o-mini)
- **Topic 140352 #1482** @7Hills: `_TZE204_clrdrnya` (gh-gpt-4o-mini)


## Nightly Forum Scan (2026-02-27 v5.11.25)
- **Topic 140352 #1520** @Hartmut_Dunker: `_TZ3002_pzao9ls1` (gh-Mistral-small-2503)


## Nightly Forum Scan (2026-02-28 v5.11.26)
- **Topic 140352 #1551** @OH2TH: `dlnraja` (template)


## Nightly Forum Scan (2026-03-02 v5.11.46)
- **Topic 140352 #1559** @Nicolas: `dlnraja` (gh-gpt-4o-mini)
- **Topic 140352 #1561** @Nicolas: no FPs (gh-Mistral-small-2503)


## Nightly Forum Scan (2026-03-03 v5.11.57)
- **Topic 140352 #1563** @Nicolas: `dlnraja` (gh-Mistral-small-2503)
- **Topic 140352 #1566** @Peter_van_Werkhoven: `_TZE200_vvmbj46n`, `development` (gh-Mistral-small-2503)
- **Topic 140352 #1567** @Peter_van_Werkhoven: `_TZE200_pay2byax`, `_TZ3000_0dumfk2z`, `HOBEIAN` (gh-Mistral-small-2503)
- **Topic 140352 #1568** @Peter_van_Werkhoven: `_TZE200_pay2byax`, `_TZ3000_mrpevh8p`, `test` (gh-Mistral-small-2503)


## Nightly Forum Scan (2026-03-04 v5.11.87)
- **Topic 140352 #1579** @Hartmut_Dunker: `_TZ3002_pzao9ls1`, `dlnraja` (gh-gpt-4o-mini)
- **Topic 140352 #1580** @Peter_Kawa: no FPs (gh-gpt-4o-mini)


## Nightly Forum Scan (2026-03-06 v5.11.101)
- **Topic 140352 #1594** @DomLAJO: `eWeLink`, `vision` (gh-gpt-4o-mini)
- **Topic 140352 #1603** @Peter_van_Werkhoven: `_TZ3000_0dumfk2z`, `_TZE200_vvmbj46n`, `_TZE200_pay2byax` (gh-Mistral-small-2503)


## Nightly Forum Scan (2026-03-07 v5.11.101)
- **Topic 140352 #1604** @Olivier_VE: `HOBEIAN` (gh-gpt-4o-mini)
- **Topic 140352 #1606** @FinnKje: `_TZ3210_jic09i9a`, `_TZ3210_ogx8u9it`, `zigbee2mqtt` (gh-gpt-4o-mini)
- **Topic 140352 #1607** @blutch32: `dlnraja` (gh-Mistral-small-2503)


## Nightly Forum Scan (2026-03-09 v5.11.101)
- **Topic 140352 #1610** @ManuelKugler: `_TZE200_u6x1zyv2` (gh-gpt-4o-mini)
- **Topic 140352 #1611** @ManuelKugler: `_TZE284_hdml1aav`, `vision` (gh-gpt-4o-mini)
- **Topic 140352 #1613** @DomLAJO: `dlnraja` (gh-gpt-4o-mini)
- **Topic 140352 #1615** @DomLAJO: `_TZE200_gjldowol`, `zigbee2mqtt` (gh-gpt-4o-mini)
- **Topic 140352 #1618** @Ronald_Bok: `test` (gh-gpt-4o-mini)
- **Topic 140352 #1619** @Jocke_Wallen: `thread` (gh-gpt-4o-mini)


## Nightly Forum Scan (2026-03-10 v5.11.101)
- **Topic 140352 #1624** @Peter_van_Werkhoven: `development` (template)


## Nightly Forum Scan (2026-03-13 v5.11.110)
- **Topic 140352 #1626** @ManuelKugler: `_TZ3000_wzmuk9ai`, `router` (gh-gpt-4o-mini)


## Nightly Forum Scan (2026-03-14 v5.11.116)
- **Topic 140352 #1629** @Bjorn_Snijders: no FPs (gh-gpt-4o-mini)
