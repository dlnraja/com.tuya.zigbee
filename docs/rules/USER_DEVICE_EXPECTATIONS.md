# User Device Expectations & Diagnostic Summary

This document summarizes user-reported devices and their expected behavior based on diagnostic logs and community feedback.

---

## 📊 Recent Diagnostic Reports (v5.5.7xx)

### 1. Scene Switch Flow Cards (v5.5.707-708)
**Device**: scene_switch_1, scene_switch_2, scene_switch_3, scene_switch_6
**Issue**: "Invalid Flow Card ID" errors
**Root Cause**: Flow cards not compiled into app.json
**Fix Applied**: v5.5.708 - Added 13 missing flow triggers to app.json
**Status**: ✅ FIXED

### 2. Smoke Detector Advanced (v5.5.684)
**Device**: `_TZE284_rccxox8p` TS0601
**Driver**: smoke_detector_advanced
**Issue**: User reports "broke" - no data after pairing
**Root Cause**: Sleepy battery device uses passive mode
**Expected Behavior**: 
- First report may take up to 24 hours
- Battery/temperature report on wake cycle
- Smoke alarm triggers immediately on detection
**Status**: ✅ EXPECTED BEHAVIOR (documented)

### 3. 2-Gang Switch (v5.5.684)
**Device**: `_TZ3000_l9brjwau` TS0002
**Driver**: switch_2gang
**Issue**: User reports pairing failure
**Verification**: ManufacturerName IS in switch_2gang driver
**Recommended Actions**:
1. Factory reset device (hold button 5-10s)
2. Re-pair within 2m of Homey
3. Check Zigbee mesh health
**Status**: ✅ SUPPORTED (pairing issue user-side)

### 4. Presence Sensor (v5.5.707)
**Device**: Various presence_sensor_radar devices
**Issue**: User reports not working
**Driver Status**: 100+ manufacturer IDs supported
**Intelligent inference** implemented for firmware bugs
**Recommended**: Send diagnostic with specific manufacturerName
**Status**: ⚠️ NEEDS MORE INFO

### 5. HOBEIAN Temperature & Humidity Sensor (v5.5.710)
**Device**: HOBEIAN temp/humidity sensors
**Issue**: Device not updating temperature/humidity values since v5.5.677
**Root Cause**: 
1. HOBEIAN was only in motion_sensor driver (wrong driver for temp/humidity)
2. DP101 was mapped to `null` (presence_time) instead of battery
**Fix Applied**: v5.5.710
1. Added HOBEIAN to climate_sensor driver
2. Fixed DP101 mapping to intelligently detect battery (0-100) vs presence_time (>100)
**User Action**: Re-pair device to use correct driver (climate_sensor)
**Status**: ✅ FIXED

### 6. button_wireless_1 Cluster Detection (v5.5.710)
**Device**: Various wireless buttons (TS0041, ZG-101ZL, etc.)
**Issue**: "No button clusters found on endpoint 1"
**Root Cause**: Zigbee interview issue - device didn't report clusters during pairing
**Recommended Actions**:
1. Factory reset button (remove battery 10s, then hold button while inserting)
2. Re-pair within 1m of Homey
3. Ensure no interference during pairing
**Status**: ⚠️ DEVICE INTERVIEW ISSUE (user re-pair required)

---

## 📱 Device Categories & Expectations

### Battery Devices (Sleepy)
**Expected Behavior**:
- Use passive DP listener mode
- Reports delayed until wake cycle
- Battery binding at pairing time
- Re-pair required after driver updates

**Devices in this category**:
- smoke_detector_advanced
- door_window_sensor
- motion_sensor_battery
- scene_switch_1/2/3/6
- sos_button
- water_leak_sensor

### Mains-Powered Devices
**Expected Behavior**:
- Immediate cluster binding
- Real-time status updates
- Act as Zigbee routers (mesh repeaters)

**Devices in this category**:
- switch_1gang/2gang/3gang/4gang
- smart_plug_energy
- din_rail_meter
- dimmer devices
- RGB lights

### Radar/mmWave Sensors
**Expected Behavior**:
- Continuous presence detection
- Distance reporting (0-6m typical)
- Illuminance (lux) reporting
- Sensitivity adjustable via settings

**Known firmware issues**:
- appVersion 74 vs 78 differences
- DP1 presence=null bug (intelligent inference handles this)

---

## 🔧 Common User Issues

### "Device pairs but shows offline"
1. Check Zigbee mesh (add routers)
2. Device too far from Homey
3. Interference (WiFi channel overlap)

### "Values are wrong/erratic"
1. Check power/scale settings
2. Verify correct driver matched
3. Send diagnostic for analysis

### "Battery always null/unknown"
1. Re-pair device (bindings apply at pairing)
2. Wait for wake cycle (up to 4 hours)
3. Press button to force wake

### "Flow cards not working"
1. Update app to latest version
2. Check flow card exists in driver
3. Recreate flow after app update

---

## 📝 User Feedback Integration

### Requested Features (from diagnostics)
- [x] Bidirectional energy metering (solar)
- [x] Scene switch multi-button support
- [x] Presence sensor intelligent inference
- [ ] EV charger support (research needed)
- [ ] Heat pump controls (research needed)

### ManufacturerIDs from User Reports
```
_TZE284_rccxox8p  → smoke_detector_advanced
_TZ3000_l9brjwau  → switch_2gang
_TZE284_iadro9bf  → presence_sensor_radar (DP102=LUX)
_TZE204_ac0fhfiq  → din_rail_meter (bidirectional, 150A clamp)
_TZE200_ves1ycwx  → energy_meter_3phase
_TZE200_ywbltqzw  → energy_meter_3phase
```

---

## 🌍 Regional Device Variations

### Europe (EU)
- 230V mains devices
- Schuko plugs (Type F)
- DIN rail meters common

### US/Canada
- 120V/240V split phase
- NEMA plugs
- Different safety certifications

### Asia-Pacific
- Various plug types
- Higher manufacturer variety
- More _TZE200/_TZE204 variants

---

## 📅 Version History Summary

| Version | Key Changes |
|---------|-------------|
| 5.5.708 | scene_switch flow cards fix |
| 5.5.707 | ir_send_ac_command fix, TS0002 verify |
| 5.5.706 | Troubleshooting documentation |
| 5.5.705 | soil_sensor, usb_outlet flow fixes |
| 5.5.704 | Sync fix, 53 stale IDs removed |
| 5.5.703 | 48 duplicate IDs removed |
| 5.5.700 | Universal permissive solution |
