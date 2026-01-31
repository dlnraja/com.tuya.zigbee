# User Device Expectations & Diagnostic Summary

This document summarizes user-reported devices and their expected behavior based on diagnostic logs and community feedback.
**Last Updated**: 2026-01-31 (v5.5.999)

> ⚠️ **CRITICAL RULE**: manufacturerName CAN appear in MULTIPLE drivers - this is NORMAL!
> Fingerprint = manufacturerName + productId (COMBINED). Only remove if SAME mfr + SAME productId causes WRONG driver match.

> ⚠️ **WORKFLOW**: This document must be updated at each prompt/session in Windsurf AI to stay synchronized with code changes.

---

## 📊 FORUM ISSUES TRACKER (Pages 53-56, Last 50 Messages)

### ✅ FIXED ISSUES

| # | User | Device | ManufacturerID | Issue | Fix Version | Status |
|---|------|--------|----------------|-------|-------------|--------|
| 1 | Peter (DutchDuke) | HOBEIAN Temp/Hum | `HOBEIAN` | Not updating since v5.5.677 | v5.5.710 | ✅ FIXED |
| 2 | Peter (DutchDuke) | SOS Button | TS0215A | Can't pair after factory reset | v5.5.712 | ✅ FIXED |
| 3 | Lasse_K | Water Leak Sensor | various | No alarm, reversed polarity | v5.5.973 | ✅ FIXED (XOR logic) |
| 4 | Lasse_K | Contact Sensors | various | Reversed indication after upgrades | v5.5.973 | ✅ FIXED (XOR logic) |
| 5 | Multiple | Scene Switches | scene_switch_1/2/3/6 | Invalid Flow Card ID | v5.5.708 | ✅ FIXED |

### ⚠️ PENDING INVESTIGATION (v5.5.840)

| # | User | Device | ManufacturerID | ProductID | Issue | Code Status | Action |
|---|------|--------|----------------|-----------|-------|-------------|--------|
| 6 | Freddyboy | Moes Scene Switch | `_TZ3000_zgyzgdua` | TS0044 | Physical/app buttons don't work | ✅ v5.5.714 cluster 0xE000 | **RE-PAIR REQUIRED** |
| 7 | Ronny_M | HOBEIAN Button | `HOBEIAN` | ZG-101ZL | Flow cards exist but nothing works | ✅ v5.5.715 onOff binding | **RE-PAIR REQUIRED** |
| 8 | Eftychis_Georgilas | 4-gang Switch | `_TZ3000_wkai4ga5` | TS004F | Unknown device | ✅ IN CODE (button_wireless_4, scene_switch_4) | **RE-PAIR REQUIRED** |
| 9 | Eftychis_Georgilas | 4-gang Switch | `_TZ3000_5tqxpine` | TS004F | Unknown device | ✅ IN CODE (button_wireless_4, scene_switch_4) | **RE-PAIR REQUIRED** |
| 10 | Attilla | Touch Dimmer | `_TZE200_3p5ydos3` | TS0601 | Not working since v5.5.690 | ✅ IN CODE (dimmer_wall_1gang) | **RE-PAIR REQUIRED** |
| 11 | Attilla | Touch Dimmer | `_TZE204_n9ctkb6j` | TS0601 | Pairs as generic Zigbee | ✅ IN CODE (dimmer_wall_1gang) | **RE-PAIR REQUIRED** |
| 12 | Hartmut_Dunker | 4-gang Switch | `_TZ3002_vaq2bfcu` | TS0726 | Buttons don't work bidirectionally | ✅ v5.5.718 FIXED | **RE-PAIR REQUIRED** |
| 13 | JJ10 | Presence Sensor | unknown | TS0601 | Not working | ⚠️ NEEDS DIAG | Send diagnostic |
| 14 | FrankP | IR Blaster | unknown | TS1201 | Errors in latest version | ✅ v5.5.565 Flow cards verified | Check flow setup |
| 15 | ManuelKugler | Valve | `_TZE284_o3x45p96` | TS0601 | Request to add | ✅ v5.5.827 fingerprint added | **RE-PAIR REQUIRED** |
| 16 | Cam | HOBEIAN ZG-204ZL | `HOBEIAN` | ZG-204ZL | Motion always active | ✅ v5.5.840 invert_presence fix | Enable "Invert Motion" setting |
| 17 | Peter_van_Werkhoven | HOBEIAN ZG-204ZV | `HOBEIAN` | ZG-204ZV | SOS button triggers app not Flow, no Temp/Hum | ✅ v5.5.841 FIXED | **RE-PAIR REQUIRED** |
| 18 | Hartmut_Dunker | switch_4gang | `_TZ3002_*` | TS0726 | Buttons still don't work v718 | ⚠️ Diag 8cbd94dd | Check onOff bindings |
| 19 | DVMasters | LoraTap 3-Button | unknown | TS0043 | Not working v5.5.820 | ✅ IN CODE button_wireless_3 | **RE-PAIR REQUIRED** |
| 20 | csmobiel | Soil Sensor | `_TZE284_aao3yzhs` | TS0601 | Pairs as unknown | ✅ IN CODE soil_sensor | **RE-PAIR REQUIRED** |
| 21 | Pollepa | Energy Meter | unknown | TS0601 | W/A/V not visible, KWH=0 | ⚠️ Issue #110 | Need full diagnostic |
| 22 | eskilask-maker | Climate Sensor | `Zbeacon` | TH01 | Pairs to wrong app | ✅ IN CODE climate_sensor | **RE-PAIR as Climate Sensor** |
| 23 | Jolink (PM) | Smoke Detector | unknown | TS0601 | Flow cards don't control device | ✅ IN CODE smoke_detector_advanced | Check sleepy device behavior |
| 24 | Lars-Arne Kvien | Smart Button | unknown | unknown | Pairs as generic zigbee | ⚠️ Need interview | Post interview to forum |
| 25 | Lars-Arne Kvien | Temp/Humidity | unknown | unknown | Pairs as generic zigbee | ⚠️ Need interview | Post interview to forum |

### 📧 GITHUB PRs & ISSUES (Jan 2026)

| # | Type | Author | Description | Status |
|---|------|--------|-------------|--------|
| #122 | Issue | elgato7 | Longsam Mini M3 curtain motor _TZE204_xu4a5rhj | ✅ FIXED v5.5.998 - Position inverted |
| #121 | Issue | DAVID9SE | _TZ3000_an5rjiwd button not working | ⚠️ Moved to 1-button driver |
| #120 | PR | packetninja | Physical button flow cards - remove manual device selection | ✅ MERGED |
| #119 | PR | packetninja | Replace ZCL-only with flexible HybridSwitchBase | ✅ MERGED |
| #111 | PR | packetninja | Separate driver for Tuya/Bseed touch dimmer | ✅ MERGED |
| #112 | PR | packetninja | Physical button flows + improved logging | ✅ Closed |

### � NEW DIAGNOSTICS (Jan 31, 2026)

| Diag ID | Device | ManufacturerID | Issue | Status |
|---------|--------|----------------|-------|--------|
| c33007b0 | BSEED 4-Gang Switch | `_TZ3002_*` TS0726 | Missing Capability Listener gang2-4, virtual toggle fails | ✅ FIXED v5.5.999 |
| a6932404 | Curtain Motor | `_TZE204_xu4a5rhj` | Commands sent but motor doesn't respond | ⚠️ Investigating |
| e1010895 | Longsam Curtain | `_TZE204_xu4a5rhj` | Same as above, network issue suspected | ⚠️ Investigating |
| 33677378 | Radar Sensor | unknown | Distance/temp/battery not working, measure_distance missing | ⚠️ Investigating |
| e8f3e458 | TRV Radiator Valve | `_TZE284_o3x45p96` | "Taster geht nicht" (Button doesn't work) | ⚠️ Investigating |

### �💥 APP CRASH REPORTS

| Version | Error | Root Cause | Status |
|---------|-------|------------|--------|
| v5.5.811 | `Could not get device by id` in PlugSmartDriver | Device deleted during flow execution | ✅ FIXED in later versions |

---

## � RECURRING USER PATTERNS (Most Frequent Issues)

### 👤 Peter_van_Werkhoven (20+ fixes, v5.5.841-v5.5.987)
**Devices**: HOBEIAN ZG-204ZV (5-in-1 Multisensor)
**Forum Posts**: #1203, #1204, #1211, #1225, #1253, #1265, #1282

| Issue | Root Cause | Fix Version | Solution |
|-------|------------|-------------|----------|
| Humidity 9% instead of 90% | Raw value needs ×10 multiplier | v5.5.953, v5.5.987 | Added humidity multiplier |
| Lux disco lights | Rapid illuminance changes trigger flows | v5.5.985-986 | 15% smoothing + 30s throttle |
| Missing temp/humidity | PIR-only vs multisensor variants | v5.5.919, v5.5.984 | Permissive variant mode + modelId fix |
| Distance wrong (8 vs 1.5m) | OEM uses cm/dm/m with same mfr | v5.5.927-929 | Smart divisor auto-detection |
| SOS button not triggering | DP17/18 not mapped | v5.5.841 | Added SOS button DP mapping |
| ZCL temp/humidity | Some variants use ZCL, not Tuya DP | v5.5.912 | Added cluster 0x0402/0x0405 listeners |
| Battery capability | Not auto-added | v5.5.907 | Auto-add battery from DP mapping |

**Cross-References**: Z2M docs ZG-204ZV, ZHA #4452, #4517, #4268

### 👤 4x4_Pete (10+ fixes, v5.5.329-v5.5.983)
**Devices**: HOBEIAN ZG-204ZM (PIR+24GHz Radar), ZG-204ZL (PIR-only)
**Forum Posts**: #788, #810, #848, #851

| Issue | Root Cause | Fix Version | Solution |
|-------|------------|-------------|----------|
| Wrong driver pairing | Duplicate productIds in motion_sensor | v5.5.364 | Removed duplicates, radar-only in presence_sensor_radar |
| Battery spam (100%↔1-2%) | Duplicate DP15 + no throttle | v5.5.366, v5.5.983 | Throttling + removed dup DP15 |
| False temp/humidity | PIR-only device showing temp/humidity | v5.5.329, v5.5.335 | PIR_ONLY_MANUFACTURERS list |
| ZCL+Tuya hybrid | Not detected properly | v5.5.511-512 | Hybrid detection + HOBEIAN mfr list |
| PIR+Radar settings | Missing settings for motion mode | v5.5.394-395 | Full Z2M settings (sensitivity, fading, LED) |

**Cross-References**: SmartHomeScene ZG-204ZM Review, Z2M Discussion #28529, HA Community

### 👤 Peter-Celica (Credited Contributor)
**Type**: Code contributor credited in v5.5.931

### 👤 Lasse_K (8+ fixes, v5.5.645-v5.5.973)
**Devices**: Water leak sensor, Contact sensor, HOBEIAN ZG-222Z, ZG-102Z
**Forum Posts**: #800, #1052, #1166, #1274, #1700

| Issue | Root Cause | Fix Version | Solution |
|-------|------------|-------------|----------|
| Water alarm always on/off | Sensor polarity inverted | v5.5.713 | invert_alarm setting |
| Contact shows reversed | IAS Zone default inversion | v5.5.918 | Auto-invert for known mfrs |
| IAS Zone no alarm | Buffer/object parsing | v5.5.645 | Robust numeric conversion |
| User can't override | Fixed logic | v5.5.973 | XOR logic for user override |
| Water sensor no alarm | IAS Zone fallback disabled | v5.5.803 | Force initial alarm state read |

### 👤 Pieter_Pessers (7+ fixes, v5.5.811-v5.5.970)
**Devices**: BSEED 1/2/3-gang switches (_TZ3000_l9brjwau, _TZ3000_qkixdnon)

| Issue | Root Cause | Fix Version | Solution |
|-------|------------|-------------|----------|
| Unknown zigbee device | Fingerprint conflicts | v5.5.970 | Exclusive driver assignment |
| Wrong driver | Same mfr in multiple drivers | v5.5.951 | productId-specific routing |
| No response | Tuya DP sent to ZCL device | v5.5.919 | ZCL-only mode |

### 👤 packetninja/Attilla (12+ PRs)
**Type**: Code contributor

| PR | Contribution | Impact |
|----|--------------|--------|
| #118 | BSEED ZCL-only switch | Pure ZCL, no Tuya DP |
| #119 | HybridSwitchBase refactor | Cleaner architecture |
| #120 | Physical button flow fix | Remove titleFormatted [[device]] |
| - | PhysicalButtonMixin | 2000ms app command window |

### 🔍 CROSS-REFERENCE VERIFICATION

**Devices confirmed IN CODE but users report not working:**

1. **`_TZ3000_zgyzgdua`** (Freddyboy) - ✅ FIXED v5.5.924
   - Found in: `button_wireless_4/driver.compose.json` ✅
   - Issue: Cluster 0xE000 (57344) instead of standard scenes
   - Fix: Raw frame interceptor for unknown cluster frames

2. **`_TZ3000_wkai4ga5` / `_TZ3000_5tqxpine`** (Eftychis_Georgilas) - ✅ IN CODE
   - Found in: `button_wireless_4/driver.compose.json` ✅
   - Action: Verify productId matching (TS004F)

3. **HOBEIAN ZG-101ZL** (_TZ3000_ja5osu5g) - ✅ FIXED v5.5.926
   - Removed from wrong drivers (plug, energy_monitor, button_4gang)
   - Now ONLY in button_wireless_1

4. **`_TZE200_3p5ydos3` / `_TZE204_n9ctkb6j`** (Attilla) - ✅ PR #118 MERGED
   - Dedicated wall_dimmer_1gang_1way driver
   - DP36/37 backlight support

---

## 📧 GMAIL DIAGNOSTIC REPORTS (Jan 2026)

### Report 0 (v5.5.820) - HOBEIAN ZG-204ZV Multisensor
**User Message**: "Readded the HOBEIAN Multisensor, no Temp and Humidity data and SOS button flow not triggering"
**Device**: HOBEIAN ZG-204ZV (presence_sensor_radar)
**Issues**:
- Missing measure_temperature and measure_distance after recovery
- SOS button flow not triggering
**Root Cause**: Wrong DP profile used (radar DPs instead of PIR+temp/humidity)
**Fix**: v5.5.826/v5.5.831 - Created dedicated ZG_204ZV_MULTISENSOR config
**Status**: ✅ FIXED

### Report 1 (v5.5.794) - BSEED Wall Switch & Water Valve
**User Message**: "Bseed wallswitches seen as unknown zigbee devices and water valve control seen as 1 gang smart switch"
**Devices**: 
- _TZ3000_iedbgyxt / TS0001 (switch_1gang) - Working correctly
- Water valve - Misidentified as switch
**Issues**: Flow card ID errors for water_valve_smart
**Root Cause**: Flow card IDs mismatch in driver vs app.json
**Fix**: v5.5.794+ - Flow cards corrected
**Status**: ✅ FIXED

### Report 2 (v5.5.769) - AVATTO TRV
**User Message**: "TS0601 _TZE284_o3x45p96"
**Device**: AVATTO Smart Radiator Valve
**Issues**: Invalid Flow Card ID: switch_dimmer_1gang_turned_on
**Root Cause**: Flow card registration error in switch_dimmer_1gang driver
**Fix**: v5.5.827 - Added fingerprint to thermostat driver
**Status**: ✅ FIXED

### Report 3 (v5.5.759) - Smart Button
**User Message**: "Smart button not registering any button presses nor does it have a GUI button"
**Device**: motion_sensor receiving Tuya frames (wrong driver pairing)
**Root Cause**: Device paired to wrong driver
**Fix**: User needs to re-pair as button_wireless device
**Status**: ⚠️ USER ACTION REQUIRED

### Report 4 (v5.5.759) - TS0726 4-Gang Switch
**User Message**: "TS0726 / _TZ3002_pzao9ls1"
**Device**: BSEED 4-gang switch (switch_4gang)
**Status**: ✅ Working correctly with special handling

### Report 5 (v5.5.718) - Presence Sensor
**User Message**: "Presence Sensor"
**Status**: ℹ️ General initialization log, no specific error

### Report 6 (v5.5.718) - BSEED 4 Gang Button
**User Message**: "BSEED Zigbee 4 Gang Button Switch"
**Issues**: Partial initialization, no capabilities discovered
**Root Cause**: Protocol learning phase - device needs interaction
**Status**: ✅ Expected behavior during learning

### Report 7 & 9 (v5.5.708) - Button Not Working
**User Message**: "Button not working"
**Device**: button_wireless_1
**Issues**: "Invalid capabilities in manifest: button.1"
**Root Cause**: Manifest configuration issue
**Fix**: Later versions corrected button capability definitions
**Status**: ✅ FIXED in newer versions

### Report 8 (v5.5.654) - BSEED 4 Gang TypeError
**User Message**: "BSEED 4 Gang Button Switch"
**Issues**: TypeError: Cannot read properties of undefined (reading 'name') in HybridSwitchBase.js
**Root Cause**: Null reference in device initialization
**Fix**: Fixed in v5.5.700+
**Status**: ✅ FIXED

---

## 📊 HISTORICAL DIAGNOSTIC REPORTS

### Scene Switch Flow Cards (v5.5.707-708)
**Device**: scene_switch_1, scene_switch_2, scene_switch_3, scene_switch_6
**Issue**: "Invalid Flow Card ID" errors
**Root Cause**: Flow cards not compiled into app.json
**Fix Applied**: v5.5.708 - Added 13 missing flow triggers to app.json
**Status**: ✅ FIXED

### Smoke Detector Advanced (v5.5.684)
**Device**: `_TZE284_rccxox8p` TS0601
**Driver**: smoke_detector_advanced
**Issue**: User reports "broke" - no data after pairing
**Root Cause**: Sleepy battery device uses passive mode
**Expected Behavior**: 
- First report may take up to 24 hours
- Battery/temperature report on wake cycle
- Smoke alarm triggers immediately on detection
**Status**: ✅ EXPECTED BEHAVIOR (documented)

### 2-Gang Switch (v5.5.684)
**Device**: `_TZ3000_l9brjwau` TS0002
**Driver**: switch_2gang
**Issue**: User reports pairing failure
**Verification**: ManufacturerName IS in switch_2gang driver
**Status**: ✅ SUPPORTED

### Presence Sensor (v5.5.707)
**Device**: Various presence_sensor_radar devices
**Issue**: User reports not working
**Driver Status**: 100+ manufacturer IDs supported
**Status**: ⚠️ NEEDS DIAGNOSTIC

### Water Leak Sensor Polarity (v5.5.713 → v5.5.973)
**Device**: Various water leak sensors
**User**: Lasse_K (forum #1274)
**Issue**: Alarm shows when dry, no alarm when wet
**Fix History**:
- v5.5.713: Added `invert_alarm` setting
- v5.5.971: Added setting to driver.compose.json
- v5.5.972: Made setting work for IAS Zone sensors
- v5.5.973: **XOR logic** - user setting can override manufacturer default
**User Action**: Enable "Invert Water Alarm" in device settings
**Pending**: Need Lasse_K's `manufacturerName` to add to auto-invert list
**Status**: ✅ FIXED (manual setting works, auto-invert ready for known IDs)

### Contact Sensor Polarity (v5.5.713 → v5.5.973)
**Device**: Various _TZ3000_* contact sensors
**User**: Lasse_K
**Issue**: Reversed indication after app upgrades
**Fix History**:
- v5.5.713: Added auto-inversion for known IDs + manual setting
- v5.5.973: **XOR logic** - user setting can override manufacturer default
**Known Inverted Manufacturers** (auto-invert):
```
_TZ3000_26fmupbb, _TZ3000_n2egfsli, _TZ3000_oxslv1c9,
_TZ3000_402jjyro, _TZ3000_2mbfxlzr, _TZ3000_bzxloft2,
_TZ3000_yxqnffam, _TZ3000_996rpfy6
```
**User Action**: Toggle "Invert Contact State" in device settings if needed
**Status**: ✅ FIXED

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

### ManufacturerIDs from User Reports (Pages 53-56)
```
_TZE284_rccxox8p  → smoke_detector_advanced
_TZ3000_l9brjwau  → switch_2gang
_TZE284_iadro9bf  → presence_sensor_radar (DP102=LUX)
_TZE204_ac0fhfiq  → din_rail_meter (bidirectional, 150A clamp)
_TZE200_ves1ycwx  → energy_meter_3phase
_TZE200_ywbltqzw  → energy_meter_3phase
_TZ3000_zgyzgdua  → button_wireless_4 (Moes scene switch)
_TZ3000_wkai4ga5  → button_wireless_4 (4-gang scene switch)
_TZ3000_5tqxpine  → button_wireless_4 (4-gang scene switch)
_TZE200_3p5ydos3  → dimmer_wall_1gang (touch dimmer)
_TZE204_n9ctkb6j  → dimmer_wall_1gang (touch dimmer)
_TZE284_o3x45p96  → radiator_valve (smart valve)
HOBEIAN ZG-101ZL  → button_wireless_1 (wireless button)
_TZE200_a8sdabtg  → climate_sensor (temp/humidity)
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
| 5.5.905 | Enhanced diagnostics for ALL sensors (HybridSensorBase DP logging with type/interval/count) |
| 5.5.904 | Orphan capability cleanup for radar sensors - ZG-204ZV Distance fix (Z2M: static_detection_distance is SETTING not measurement) |
| 5.5.903 | _TZE284_iadro9bf stuck pattern detection (5+ consecutive same values → distance inference) |
| 5.5.902 | Diagnostic logs cleanup - removed verbose ID DATABASE logging, enhanced DP/ZCL stats |
| 5.5.901 | BSEED manufacturer detection with 4 fallback sources, +5 new BSEED IDs |
| 5.5.840 | FORUM FIX: HOBEIAN ZG-204ZL motion sensor "always active" - invert_presence now applied to IAS Zone + Tuya DP. +4 new motion sensor fingerprints from Z2M |
| 5.5.719 | NEW: DIY Custom Zigbee driver (PTVO, ESP32-H2, CC2530, DIYRuZ, Tasmota) |
| 5.5.718 | TS0726 bidirectional fix - onOff cluster bindings (Hartmut_Dunker) |
| 5.5.717 | Enrichment update - +7 IDs, DP mappings enhanced |
| 5.5.716 | Driver overlap fix - TS0726 wall switches (Hartmut_Dunker) |
| 5.5.715 | HOBEIAN ZG-101ZL onOff binding fix (Ronny_M) |
| 5.5.714 | Moes _TZ3000_zgyzgdua cluster 0xE000 fix (Freddyboy) |
| 5.5.713 | Contact/water sensor polarity inversion fix (Lasse_K) |
| 5.5.712 | Forum issues cross-reference update |
| 5.5.708 | scene_switch flow cards fix |
| 5.5.707 | ir_send_ac_command fix, TS0002 verify |
| 5.5.706 | Troubleshooting documentation |
| 5.5.705 | soil_sensor, usb_outlet flow fixes |
| 5.5.704 | Sync fix, 53 stale IDs removed |
| 5.5.703 | 48 duplicate IDs removed |
| 5.5.700 | Universal permissive solution |
| 5.5.617 | TS004F intelligent mode switching |
| 5.5.504 | HOBEIAN ZG-101ZL periodic report filtering |
| 5.5.500 | HOBEIAN dual mode support (EVENT/COMMAND) |

---

## 🔬 Forum Issues Tracking (Pages 55-56, Jan 2026)

### ✅ FIXED Issues

| User | Device | ManufacturerID | Issue | Fix Version | Notes |
|------|--------|----------------|-------|-------------|-------|
| Peter_van_Werkhoven | ZG-204ZV | `HOBEIAN` | Distance capability showing (orphan) | ✅ v5.5.904 | Orphan capability auto-cleanup |
| Forum | _TZE284_iadro9bf | `_TZE284_iadro9bf` | Motion alarm stuck YES | ✅ v5.5.903 | Stuck pattern detection |
| Forum | BSEED switches | Multiple | Unknown device | ✅ v5.5.901 | 4 fallback manufacturer sources |
| Freddyboy | Moes 4-button | `_TZ3000_zgyzgdua` | Buttons not responding | ✅ v5.5.714 | TS0044 uses cluster 0xE000, not TS004F |
| Ronny_M | HOBEIAN ZG-101ZL | `HOBEIAN` | Button not working | ✅ v5.5.715 | Added onOff binding + dual mode support |
| Lasse_K | Contact sensors | Multiple | Inverted indication | ✅ v5.5.713 | Auto-inversion for known IDs |
| Lasse_K | Water leak sensor | Multiple | No alarm | ✅ v5.5.713 | Added `invert_alarm` setting |
| Peter_van_Werkhoven | HOBEIAN Multisensor | `HOBEIAN` | Temp/humidity not updating | ✅ v5.5.710 | Added HOBEIAN to climate_sensor |
| Peter_van_Werkhoven | SOS Button | TS0215A | Can't re-add | ✅ v5.5.712 | Fixed corrupted manufacturer list |
| Multiple | Scene switches | scene_switch_1/2/3/6 | Invalid Flow Card ID | ✅ v5.5.708 | Added 13 missing flow triggers |
| Pieter_Pessers | BSEED wall switch | `_TZ3000_l9brjwau` | Unknown device | ✅ Already supported | TS0002 in switch_2gang |

### ⏳ PENDING Issues (Need Investigation)

| User | Device | ManufacturerID | Issue | Diag Code | Status |
|------|--------|----------------|-------|-----------|--------|
| JJ10 | Presence sensor | Unknown | Connected as unknown device | `999de772-5ce2-4674-86c3-c267c7e3a3f0` | ⏳ Need mfr ID - ask user to send diagnostic |
| Lalla80111 | Smart Button TS0041 | `_TZ3000_b4awzgct` | Unknown zigbee v5.5.897 | GitHub #114 | ✅ ID in driver - USER NEEDS RE-PAIR + UPDATE to v5.5.907 |
| ManuelKugler | Radiator Valve ME167 | `_TZE284_o3x45p96` | Not working #1223 | f089e2e7 | ✅ ID in driver (ME167 profile) - USER NEEDS RE-PAIR |
| Peter_van_Werkhoven | HOBEIAN ZG-204ZV | `HOBEIAN` | Temp/Humidity no data #1225 | Forum | ✅ v5.5.907 - USER MUST RE-PAIR to get temp/hum/battery + remove Distance |
| Pieter_Pessers | BSEED 1-gang TS0001 | `_TZ3000_ysdv91bk` | Unknown device #1219 | Forum | ✅ In switch_1gang - USER MUST RE-PAIR |
| blutch32 | Contact Sensor TS0203 | `_TZ3000_996rpfy6` | Alarm always "no" #1011 | Forum | ✅ v5.5.908 - Added to inverted list - USER MUST RE-PAIR |
| FrankP | IR Blaster | Unknown | Flow card errors | `89e408fe-d0ba-4216-95be-951824dac2b8` | ✅ v5.5.565 Flow cards verified working (sendEnhancedIRCode, sendACCommand exist) |

### ✅ RECENTLY FIXED (Moved from Pending)

| User | Device | ManufacturerID | Issue | Fix Version | Notes |
|------|--------|----------------|-------|-------------|-------|
| Hartmut_Dunker | 4-Gang Smart Switch | `_TZ3002_vaq2bfcu` | Buttons don't work bidirectionally | ✅ v5.5.718 | Added onOff cluster bindings to all 4 endpoints |
| AlbertQ | HOBEIAN ZG-227Z | `_TZE200_a8sdabtg` | Pairs as generic Zigbee | ✅ Already supported | In climate_sensor driver |
| Attilla | Touch dimmers | `_TZE200_3p5ydos3`, `_TZE204_n9ctkb6j` | Pairs as generic since v690 | ✅ Already supported | In dimmer_wall_1gang driver |

### 📋 Forum ManufacturerIDs Summary (Pages 55-56)

```
Already Supported:
✅ _TZ3000_zgyzgdua  → button_wireless_4 (v5.5.714 cluster 0xE000 fix)
✅ _TZ3000_l9brjwau  → switch_2gang (TS0002)
✅ _TZ3000_wkai4ga5  → button_wireless_4 (4-gang scene)
✅ _TZ3000_5tqxpine  → button_wireless_4 (4-gang scene)
✅ _TZE200_3p5ydos3  → dimmer_wall_1gang (touch dimmer)
✅ _TZE204_n9ctkb6j  → dimmer_wall_1gang (touch dimmer)
✅ _TZE200_a8sdabtg  → climate_sensor (HOBEIAN ZG-227Z)
✅ HOBEIAN           → button_wireless_1 (v5.5.715 binding fix)
```

### 🔄 User Action Required

**For RE-PAIR Required fixes (v5.5.714, v5.5.715):**
1. Update app to latest version
2. Delete device from Homey
3. Factory reset device (hold button 5+ seconds)
4. Re-pair device

**For HOBEIAN ZG-101ZL (triple-click mode switch):**
- EVENT mode: commandOn=single, commandOff=double, commandToggle=hold
- COMMAND mode: toggle=single, on=double, off=long
- Triple-click to switch between modes

**For devices showing as "Unknown Zigbee":**
1. Send diagnostic code via app settings
2. Check if manufacturerName is in driver's driver.compose.json
3. If missing, report on forum with interview data
