# User Experience Tracker - Universal Tuya Zigbee

> ⚠️ **IMPORTANT**: This file MUST be read and updated at EVERY Windsurf AI session.
> It tracks user feedback, known issues, and fixes for each driver.

---

## 📊 Quick Stats (Updated: 2026-01-24)

| Metric | Value |
|--------|-------|
| App Version | 5.5.767 |
| Total Drivers | 105 |
| Known Issues | 8 |
| Fixed This Session | 3 |

---

## 🔴 CRITICAL ISSUES (User Reported)

### 1. Button Devices Not Responding After Update
- **Affected Drivers**: `button_wireless_4`, `button_wireless_1/2/3/6/8`, `button_emergency_sos`
- **Root Cause**: Cluster bindings only applied during pairing
- **Solution**: Users must **RE-PAIR** devices after updating
- **Status**: ✅ Fixed in v5.5.763+ (documentation added)
- **Forum Reports**: Cam (Jan 2026), multiple users

### 2. SOS Button "No IAS Zone cluster found"
- **Affected Drivers**: `button_emergency_sos`
- **Root Cause**: Missing cluster bindings in driver.compose.json
- **Solution**: Added IAS Zone (1280), IAS ACE (1281), Tuya (61184) bindings
- **Status**: ✅ Fixed in v5.5.767
- **Forum Reports**: Peter_van_Werkhoven, Cam

### 3. TS0044 MOES 4-Button No Response
- **Affected Drivers**: `button_wireless_4`
- **Manufacturer IDs**: `_TZ3000_zgyzgdua`, `_TZ3000_wkai4ga5`, `_TZ3000_5tqxpine`
- **Root Cause**: E000 BoundCluster not configured on first pairing
- **Solution**: Always setup cluster 57344 binding
- **Status**: ✅ Fixed in v5.5.762+
- **Z2M Reference**: https://www.zigbee2mqtt.io/devices/TS0044.html

### 4. Smart Button Paired as Wrong Driver
- **Issue**: Devices pairing to motion_sensor instead of button driver
- **Root Cause**: Manufacturer ID overlap or user selection error
- **Solution**: Delete device, RE-PAIR with correct driver
- **Status**: ⚠️ User action required

---

## 🟡 KNOWN ISSUES (Monitoring)

### 5. Battery Reporting Delayed (24h)
- **Affected Drivers**: All battery-powered devices
- **Behavior**: Battery % takes up to 24 hours to report
- **Root Cause**: Tuya devices report battery on heartbeat (4h intervals)
- **Solution**: Normal behavior, documented
- **Z2M Reference**: Confirmed in Z2M docs

### 6. IAS Zone Enrollment Fails on Sleepy Devices
- **Affected Drivers**: `motion_sensor`, `contact_sensor`, `water_leak_sensor`
- **Behavior**: Enrollment timeout when device is asleep
- **Solution**: Press device button/trigger sensor, then enrollment completes
- **Status**: ⚠️ Expected behavior for sleepy devices

### 7. Curtain Motor Position Not Updating
- **Affected Drivers**: `curtain_motor`, `curtain_motor_tilt`
- **Manufacturer IDs**: `_TZ3000_bs93npae` (TS130F)
- **Root Cause**: Missing windowCovering cluster binding
- **Solution**: Added cluster 258 binding in v5.5.763
- **Status**: ✅ Fixed (RE-PAIR required)

### 8. driver-mapping-database.json Not Found
- **Error**: `[DRIVER-MAPPING] Database file not found: /app/driver-mapping-database.json`
- **Source**: External system, NOT this app
- **Status**: ⚠️ Not our issue - ignore

---

## 🟢 RECENTLY FIXED

| Version | Driver | Issue | Fix |
|---------|--------|-------|-----|
| 5.5.767 | button_emergency_sos | No IAS Zone cluster | Added cluster bindings |
| 5.5.766 | switch_dimmer_1gang | Missing from app.json | Added to manifest |
| 5.5.763 | button_wireless_4 | No button response | Added E000 cluster binding |
| 5.5.763 | curtain_motor | Position not updating | Added windowCovering binding |
| 5.5.762 | button_wireless_4 | E000 not setup on first pair | Always setup fallback |
| 5.5.757 | button_emergency_sos | Error log spam | Changed to info log |

---

## 📚 DRIVER REFERENCE (Z2M/ZHA Sources)

### Button Devices

| Driver | Model | Protocol | Actions | Z2M Link |
|--------|-------|----------|---------|----------|
| button_wireless_4 | TS0044 | scenes/onOff/multistateInput | 1-4_single/double/hold | [Z2M](https://www.zigbee2mqtt.io/devices/TS0044.html) |
| button_emergency_sos | TS0215A | IAS ACE/Zone | emergency | [Z2M](https://www.zigbee2mqtt.io/devices/TS0215A_sos.html) |
| button_wireless_1 | TS0041 | scenes/onOff | single/double/hold | [Z2M](https://www.zigbee2mqtt.io/devices/TS0041.html) |

### Sensor Devices

| Driver | Model | Clusters | Events |
|--------|-------|----------|--------|
| motion_sensor | TS0202 | IAS Zone (1280) | occupancy |
| contact_sensor | TS0203 | IAS Zone (1280) | contact |
| water_leak_sensor | TS0207 | IAS Zone (1280) | water_leak |

### Switches

| Driver | Model | Clusters | Capabilities |
|--------|-------|----------|--------------|
| switch_1gang | TS0001 | onOff (6) | onoff |
| switch_2gang | TS0002 | onOff (6) x2 | onoff.1, onoff.2 |
| plug_smart | TS011F | onOff (6), metering (2820) | onoff, power |

---

## 🔧 CLUSTER REFERENCE

| Cluster ID | Name | Usage |
|------------|------|-------|
| 0 | basic | Device info |
| 1 | powerConfiguration | Battery |
| 5 | scenes | Button scenes |
| 6 | onOff | Switches, buttons |
| 18 | multistateInput | Button actions |
| 258 | windowCovering | Curtains |
| 1280 (0x500) | iasZone | Sensors |
| 1281 (0x501) | iasAce | SOS buttons |
| 57344 (0xE000) | tuyaE000 | Tuya buttons |
| 61184 (0xEF00) | tuyaEF00 | Tuya DP |

---

## 📝 USER ACTION CHECKLIST

When users report issues, ask for:

1. **Manufacturer ID**: `_TZ3000_xxxxx`
2. **Product ID**: `TS0044`, `TS0215A`, etc.
3. **App Version**: Settings > Apps > Universal Tuya Zigbee
4. **Diagnostic Report**: Settings > Experimental > Diagnostics
5. **LED Behavior**: Does it blink when pressed?
6. **Pairing Date**: Before or after recent update?

---

## 🔄 SESSION LOG

### 2026-01-24 Session
- [x] Fixed button_emergency_sos cluster bindings
- [x] Analyzed Cam's diagnostics reports
- [x] Researched Z2M TS0044 and TS0215A docs
- [x] Created this user experience tracker
- [ ] Publish v5.5.767

---

## 📌 IMPORTANT LINKS

- **Forum**: https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352
- **GitHub**: https://github.com/dlnraja/com.tuya.zigbee
- **Z2M Devices**: https://www.zigbee2mqtt.io/supported-devices/
- **Tuya DP Docs**: https://developer.tuya.com/en/docs/iot/
