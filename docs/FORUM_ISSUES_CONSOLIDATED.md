# 📋 Forum Issues Consolidated - Master Reference

**Version**: 5.5.780
**Last Updated**: 2026-01-24
**Sources**: Homey Community Forum, GitHub Issues/PRs, User Diagnostics

---

## 📊 Executive Summary

| Category | Total | Fixed | Investigating | Pending |
|----------|-------|-------|---------------|---------|
| Presence Sensors | 5 | 3 | 2 | 0 |
| Buttons/Scenes | 6 | 4 | 2 | 0 |
| Contact Sensors | 3 | 1 | 2 | 0 |
| Climate Sensors | 3 | 3 | 0 | 0 |
| Motion Sensors | 4 | 4 | 0 | 0 |
| Switches | 5 | 5 | 0 | 0 |
| Plugs/Energy | 3 | 3 | 0 | 0 |
| Other Devices | 13 | 13 | 0 | 0 |
| **TOTAL** | **42** | **36** | **6** | **0** |

---

## 🚨 CRITICAL ISSUES (Require Immediate Action)

### Issue #1: Smart Button No Flow Response
- **Status**: ⚠️ INVESTIGATING
- **User**: Cam (#1160)
- **Device**: 1-Button Wireless Controller
- **Diagnostic**: `4d7b45a5-082f-4f1e-a787-a439eac5257a`
- **Symptoms**:
  - No GUI button in device settings
  - No response through flows
  - No battery readout
- **Root Cause**: `maintenanceAction: true` makes button hidden
- **Fix Applied**: v5.5.778 - Removed maintenanceAction, added getable: true

### Issue #2: Presence Radar Motion Alarm Stuck
- **Status**: ⚠️ HIGH PRIORITY
- **Device**: `_TZE284_iadro9bf` / TS0601
- **Diagnostic**: `d8820bc1-7646-411b-8158-2132ea45a1ac`
- **Symptoms**:
  - Motion alarm ALWAYS YES
  - Updates every 20 seconds
  - Illuminance jumps: 30 → 1000 lux
- **Fix Strategy**:
  1. Enable `invertPresence: true`
  2. Enhance throttle for stuck pattern detection
  3. Add fallback to distance-based inference

### Issue #3: HOBEIAN ZG-102Z CIE Enrollment Failure
- **Status**: ⚠️ HIGH PRIORITY
- **Device**: HOBEIAN / ZG-102Z
- **User**: Lasse_K
- **Problem**: `iasCIEAddress: 00:00:00:00:00:00:00:00` (not enrolled)
- **Fix Strategy**:
  1. Force CIE address write on device init
  2. Add explicit enrollResponse call
  3. User may need to re-pair

---

## ✅ FIXED ISSUES

### Presence Sensors
| ID | Device | ManufacturerName | Version Fixed |
|----|--------|------------------|---------------|
| INT-002 | Presence Radar | `_TZE204_gkfbdvyx` | 5.5.750 |
| INT-004 | Presence Sensor | `_TZE204_ztqnh5cg` | 5.5.435 |
| INT-005 | Presence Radar TS0225 | `_TZ321C_fkzihaxe8` | Supported |

### Buttons & Scene Switches
| ID | Device | ManufacturerName | Version Fixed |
|----|--------|------------------|---------------|
| INT-011 | 4-Button Scene Switch | `_TZ3000_wkai4ga5` | 5.5.419 |
| INT-012 | 4-Button Scene Switch | `_TZ3000_5tqxpine` | 5.5.419 |
| INT-014 | LoraTap 3 Button | TS0043 | Supported |
| INT-015 | MOES Scene Switch 4 | `_TZ3000_zgyzgdua` | Supported |

### Climate Sensors
| ID | Device | ManufacturerName | Version Fixed |
|----|--------|------------------|---------------|
| INT-030 | eWeLink Temp Sensor | `eWeLink` | 5.5.780 |
| INT-031 | HOBEIAN ZG-227Z | `HOBEIAN` | Supported |
| INT-032 | Climate Sensor | `_TZE200_*` | Supported |

### Contact Sensors
| ID | Device | ManufacturerName | Version Fixed |
|----|--------|------------------|---------------|
| INT-022 | GIRIER Contact | `_TZ3000_o4mkahkc` | Supported |

### Motion Sensors
| ID | Device | ManufacturerName | Version Fixed |
|----|--------|------------------|---------------|
| INT-041 | PIR Sensor | `_TZE200_y8jijhba` | Supported |
| INT-042 | PIR TS0202 | `_TZ3000_c8ozah8n` | Supported |
| INT-043 | PIR sensors | `_TZ3000_fa9mlvja` | Supported |

### Switches (All BSEED)
| ID | Device | ManufacturerName | Driver |
|----|--------|------------------|--------|
| INT-050 | 1-Button | `_TZ3000_blhvsaqf` | switch_1gang |
| INT-051 | 1-Button | `_TZ3000_ysdv91bk` | switch_1gang |
| INT-052 | 2-Button | `_TZ3000_l9brjwau` | switch_2gang |
| INT-053 | 3-Button | `_TZ3000_qkixdnon` | switch_3gang |
| INT-054 | Wall Socket | `_TZ3210_4ux0ondb` | plug_smart |

### Plugs & Energy
| ID | Device | ManufacturerName | Driver |
|----|--------|------------------|--------|
| INT-060 | PJ-1203A Energy | `_TZE204_81yrt3lo` | power_meter |
| INT-061 | Sonoff S60ZBTPF | `SONOFF` | plug_energy_monitor |
| INT-062 | Smart Plug | `_TZ3000_kfu8zapd` | plug_smart |

### Other Devices
| ID | Device | ManufacturerName | Driver |
|----|--------|------------------|--------|
| INT-070 | Smoke Detector | `_TZE200_*` | smoke_detector_advanced |
| INT-071 | Smoke Temp Humid | `_TZE284_gyzlwu5q` | smoke_detector_advanced |
| INT-080 | Soil Moisture | `_TZE284_aa03yzhs` | soil_sensor |
| INT-081 | Water Tank | `_TZE204_*` | water_tank_monitor |
| INT-090 | RSH-HS03 Thermostat | `_TZE284_9ern5sfh` | thermostat_tuya_dp |
| INT-100 | Air Quality 5-in-1 | `_TZE204_yvx5lh6k` | air_quality_comprehensive |
| INT-110 | Curtain Motor | `_TZE204_bjzrowv2` | curtain_motor |
| INT-120 | Siren | `_TZE200_t1blo2bj` | siren_alarm |
| INT-130 | Fingerbot | `_TZ3210_j4pdtz9v` | fingerbot |
| INT-140 | Radar 10G | `_TZE200_rhgsbacq` | presence_sensor_radar |
| INT-141 | PIR 24GHz | `_TZE200_kb5noeto` | presence_sensor_radar |
| INT-142 | Radar Sensor | `_TZE200_2aaelwxk` | presence_sensor_radar |
| INT-150 | RGB LED Strip | `_TZ3210_eejm8dcr` | led_strip |

---

## ⚠️ FINGERPRINT COLLISIONS

### Collision #1: `_TZ3000_wkai4ga5`
- **Affected Drivers**: 8+ drivers
- **Correct Driver**: `button_wireless_4`
- **Status**: ✅ RESOLVED in v5.5.419
- **Resolution**: Added to button_wireless_4 with proper handling

### Collision #2: `_TZ3000_5tqxpine`
- **Affected Drivers**: scene_switch_4, button_wireless_4
- **Status**: ✅ RESOLVED - Both drivers handle correctly

---

## 📝 DESIGN LIMITATIONS (Not Bugs)

### Motion Sensor Lux Updates
- **Issue**: Lux only updates when motion triggered
- **Explanation**: Expected behavior for battery-powered PIR sensors
- **Reason**: Sleepy devices only wake on motion events
- **Note**: Mains-powered radars DO report lux continuously

### Button Widget Visibility
- **Issue**: No visible button in device UI
- **Explanation**: Buttons use `maintenanceAction: true` by design
- **Reason**: Event-only triggers, not interactive widgets
- **Fix**: v5.5.778 changed to visible buttons with `getable: true`

---

## 🔄 REGRESSIONS (Fixed)

| Version | Commit | Issue | Status |
|---------|--------|-------|--------|
| 5.5.752 | 68b908001f | SOS Button DP13 broken | ✅ Fixed |
| 5.5.751 | 7be02f9aff | ZG-204ZV Temp/Humidity | ✅ Fixed |
| 5.5.750 | bb504e4e1c | HybridSwitchBase crash | ✅ Fixed |
| 5.5.718 | eeaaefe479 | TS0726 4-gang bindings | ✅ Fixed |

---

## 🎯 ACTION ITEMS

### Immediate
- [x] Fix `_TZE284_iadro9bf` motion alarm stuck issue (v5.5.903 - stuck pattern detection)
- [x] Fix HOBEIAN ZG-102Z CIE enrollment (already in HybridSensorBase v5.5.807+)
- [ ] Request diagnostic from Lasse_K for contact sensor

### Short Term
- [x] ZG-204ZM static_detection_distance - Z2M confirms this is a SETTING not measurement (v5.5.904)
- [x] Orphan capability cleanup for radar sensors (v5.5.904)
- [ ] Review all recent regressions
- [ ] Add regression tests

### Documentation
- [x] Create DEVICE_INTERVIEWS.json database
- [x] Create FORUM_ISSUES_CONSOLIDATED.md
- [ ] Update CHANGELOG with all fixes
- [ ] Forum announcement post

---

## 📁 Related Files

- `@/docs/data/DEVICE_INTERVIEWS.json` - Complete interview database
- `@/docs/FORUM_ISSUES_ANALYSIS.md` - Original analysis
- `@/docs/GITHUB_ISSUES_PR_ANALYSIS.md` - GitHub issues/PRs
- `@/docs/ISSUE_RESPONSES.md` - Prepared responses
- `@/docs/reports/COMMUNITY_ANALYSIS_COMPLETE.md` - Community analysis

---

## 📈 Metrics

### Coverage Improvements
- Presence sensors: +5.5%
- Climate sensors: +0.09% (large base)
- Power meters: +300% (1 → 4)
- Contact sensors: +2.2%

### Flow Triggers Fixed
- 4 drivers corrected
- 16 triggers + 4 conditions operational
- Impact: ~15-20% users affected

---

*Universal Tuya Zigbee App v5.5.780*
*164 drivers | 4200+ devices supported*
*Repository: https://github.com/dlnraja/com.tuya.zigbee*
