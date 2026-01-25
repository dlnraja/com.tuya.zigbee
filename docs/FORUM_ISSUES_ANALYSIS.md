# Forum Issues Analysis - Comprehensive Report

**Analysis Date**: 2026-01-24
**Forum Thread**: https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352
**Messages Analyzed**: ~1160-1180 (latest)
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

## 🎯 ACTION PLAN

### Priority 1 - Critical Fixes:
- [ ] Fix smart button flow triggers (Cam issue)
- [ ] Fix contact sensor response (Lasse_K issue)
- [ ] Fix scene switch button selection (Eftychis issue)

### Priority 2 - Device-Specific:
- [ ] Fix _TZE284_iadro9bf motion alarm stuck
- [ ] Add eWeLink CK-TLSR8656-SS5-01(7014) support
- [ ] Verify _TZE204_gkfbdvyx fixes

### Priority 3 - Research & Prevention:
- [ ] Review all recent regressions
- [ ] Add regression tests
- [ ] Update documentation

---

## 📝 NOTES

**Pattern Detected**: Multiple issues appeared after v5.5.750-759 releases
**Hypothesis**: Rapid updates may have introduced regressions in core base classes
**Recommendation**: Comprehensive base class audit before next release

