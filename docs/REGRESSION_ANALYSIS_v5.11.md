# Regression Analysis — v5.11.x Series

**Date**: 2026-02-17 | **Versions**: v5.11.5 — v5.11.13

## 1. Case-Duplicate Manufacturer Names (Fixed v5.11.11)
- **Severity**: Medium | **Scope**: 113 drivers, 5,450 duplicates removed
- **Cause**: Both `_TZ3000_abc` and `_tz3000_abc` in same driver
- **Fix**: Global case-insensitive dedup

## 2. plug_energy_monitor vs plug_smart TS011F Collision (Fixed v5.11.11)
- **Severity**: High (duplicate pairing)
- **Cause**: 41 mfrs in BOTH drivers with shared PID TS011F
- **Fix**: Removed 82 overlapping mfrs from plug_smart (energy variants stay in plug_energy_monitor)

## 3. BSEED switch_3gang vs wall_switch_3gang_1way Collision (Fixed v5.11.11)
- **Severity**: High (wrong driver match for BSEED ZCL-only devices)
- **Cause**: `_TZ3000_qkixdnon` in both drivers with shared TS0003/TS0013
- **Fix**: Removed BSEED ZCL-only mfrs from switch_3gang, deduped wall_switch_3gang_1way (16->8)

## 4. Excellux PID Collision (Fixed v5.11.11)
- **Severity**: Critical (129 mfrs colliding across 3 drivers)
- **Cause**: "Excellux" brand name added as PID to contact_sensor, motion_sensor, AND climate_sensor
- **Fix**: Removed "Excellux" PID from all 3 drivers — devices still match via standard PIDs (TS0201/TS0202/TS0203)

## 5. button_wireless_4 Wrong PID TS0041 (Fixed v5.11.11)
- **Severity**: High (6 mfrs showing as 4-button when they're 1-button)
- **Cause**: TS0041 (1-button PID) incorrectly in button_wireless_4 driver
- **Fix**: Removed TS0041 from button_wireless_4 PIDs + removed 6 mfrs that are 1-button-only

## 6. v5.11.10 Fingerprint Additions — No Regressions
- Added 117 mfrs + 4 PIDs across 19 drivers
- **Collision check**: 0 new cross-driver collisions
- Reclassified 5 mismatched fingerprints before adding
- Skipped 1 misclassified (TS0505B as contact_sensor)

## 7. Pre-existing Collisions (Acceptable — 13 groups, 74 mfrs)
These are by-design or low-risk:
- motion_sensor vs presence_sensor_radar (TS0225) — multi-sensor devices
- rain_sensor vs water_leak_sensor (TS0207) — similar device types
- valve_irrigation vs water_tank_monitor (TS0601) — TS0601 expected overlap
- diy_custom_zigbee vs generic_diy — intentional overlap

## 8. Documentation Gaps (Fixed v5.11.11)
- GITHUB_ISSUES_PR_ANALYSIS.md was outdated (v5.8.88 era)
- FORUM_ISSUES_CONSOLIDATED.md was at v5.5.780
- Both updated with current status

## 9. Lowercase Manufacturer Names — CRITICAL (Fixed v5.11.12)
- **Severity**: Critical | **Scope**: 5,004 fingerprints, 111 drivers
- **Cause**: v5.11.11 dedup kept lowercase `_tz3000_*`, removed uppercase; Homey matching is case-sensitive
- **Fix**: All prefixes uppercased: `_tz`→`_TZ` (4906), `_tyzb`→`_TYZB` (90), `_tyst`→`_TYST` (8)

## 10. _TZE200_t1blo2bj Misclassification (Fixed v5.11.12)
- **Severity**: Medium | Siren in thermostat_tuya_dp (JohanBendz PR#1333)
- **Fix**: Removed from thermostat_tuya_dp (already in siren)

## 11. WiFi Tuya Local Bugs (Fixed v5.11.12)
- **Bug 1**: wifi_generic double dp-update listener → use _processDPUpdate override
- **Bug 2**: onSettings client leak → null client after destroy
- **Bug 3**: UDP discovery race → late device-found listener
- **Bug 4**: configure.html missing error callback in manual mode → all 22 drivers fixed

## 12. presence_sensor_radar Log Spam — ~52K lines/day (Fixed v5.11.13)
- **Severity**: High (fills Homey log buffer, masks real events)
- **Cause**: DP106 lux fires every 5s → 3 log lines each: (a) `[RADAR-BATTERY] Tuya response received`, (b) `static mapping` log, (c) `[RADAR-LUX] 0 lux (change: 100.0%)`
- **Root causes**: (1) No same-value dedup — 0→0 always processed, (2) Change calc `currentLux > 0 ? ... : 100` returns 100% when both are 0, (3) Static mapping logged on every DP, (4) Per-event Tuya listener log
- **Fix**: Same-value dedup, fix change formula `(finalLux > 0 ? 100 : 0)`, throttle static log to first occurrence, remove per-event log
- **Diagnostic**: hcaron@synchrone.fr, Log ID 32709eaf
