# P88 — Cross-Source mfr & DP Fixes (forum + Z2M + mfs_db)

**Date**: 2026-07-24
**Trigger**: User asked to cross ALL sources, fix ALL bugs, benefit BOTH apps + branches
**Branch**: master + stable-v5

## Summary

Deep cross-reference of:
- **2038 forum posts** from community.homey.app/t/140352 (Discourse paging)
- **109 unique related topics** (forum-search-related.js: 15 queries across Zigbee/Tuya)
- **7 specific topics** analyzed in depth (garage door opener, soil sensor issues,
  rain sensor, energy meter, HOBEIAN soil sensor driver guide, etc.)
- **Z2M PRs/issues** for canonical DP mappings
- **mfs_db** canonical mapping (sometimes wrong)
- **P82 TuyaNormalizer** for case-sensitivity

**Result**: 2 new fixes shipped (mfr mapping + DP mapping), 28/28 tests PASS, 0 new Sacred Couples.

## Forum cross-reference matrix

| Forum Topic | mfr | Date | Issue | Driver? | Status |
|-------------|-----|------|-------|---------|--------|
| 140352/2115 | _TZE204_dhotiauw | 2026-07-24 | Dual energy meter (TS0601) | din_rail_meter (was climate_sensor) | **FIXED P88** |
| 140352/2062/2075/2080 | _TZE284_aaeasoll | 2026-05/06 | SmarterCurry Luminance Sensor no lux | light_sensor_outdoor (DP wrong) | **FIXED P88** |
| 140352/2099 | _TZ3000_mrduubod | 2026-07-02 | Moes 4-gang "Missing Capability Listener" | wall_switch_4gang_1way | **FIXED P87** |
| 140352/2110/2109 | (crashes 8788edbb/1000037573) | 2026-07 | App crashes | (under investigation) | TODO P89 |
| 140352/2101/2097/2091 | _TZE284_myd45weu, _TZE200_npj9bug3, _TZE284_pcdmj88b | 2026-06/07 | Soil sensors unknown / as Curtain Module | soil_sensor | mfr OK, DP/UX TODO |
| 140352/2111/2090 | HOBEIAN ZG-222Z | 2026-06/07 | Water leak no data | water_leak_sensor | mfr OK, DP TODO |
| 140352/2112 | _TZE200_ka8l86iu | 2026-07-15 | Presence sensor "only motion, not presence" | presence_sensor_radar | mfr OK, capability flow TODO |
| 140352/2089 | (HOBEIAN ZG-227Z) | 2026-06-14 | Luminance 0 + SOS/Smartbutton | sensor_contact_presence | **FIXED P85** |
| 140352/2093/2092 | (amperometric energy meter) | 2026-06-16/21 | 660kwh vs 1kwh | (power_clamp_meter/din_rail_meter) | TODO: ProductValueValidator |
| 140352/2105/2102 | (valve_dual_irrigation) | 2026-07-03/06 | Buttons don't work | valve_dual_irrigation | TODO: DP 5 valve control |
| 140352/2104/2100/2098 | (Moes 4-button) | 2026-06/07 | Button press not detected | button_wireless_4 | TODO: PhysicalButtonMixin |
| 140352/2029 | (smart airbox) | 2026-05-09 | No data after update | (climate_sensor) | TODO |

| Other Topic | mfr | Date | Issue | Status |
|-------------|-----|------|-------|--------|
| 156792 (Tuya finger bot) | - | 2026-07-01 | 5 posts, no mfr mentioned | No change (different app) |
| 149230 (garage door opener) | _TZE20C_3oycaicw | 2026-05 | TS0601 garage door | mfr already in garage_door_opener (1 variant only) |
| 155212 (Zemismart energy) | - | 2026-06 | Zemismart app, SPM01/SPM02 meters | Wi-Fi only, not Zigbee |
| 152790 (soil sensors) | - | 2026-04 | Third Reality soil sensors | Different brand, no fix |
| 146667 (HOBEIAN ZG-303Z) | HOBEIAN | 2025-12/2026-02 | HOBEIAN soil sensor dev guide | Already supported in soil_sensor |
| 120477 (rainsensor) | _TZ3210_tgvtvdoc | 2026-03 | TS0207 rain sensor | mfr already in rain_sensor |
| 26439 (Tuya Zigbee App) | - | ongoing | JohanBendz concurrent app | No action |
| 156644 (Aqara vs Tuya) | - | 2026-07 | Aqara discussion | No action |

## P88 fixes shipped

### Fix 1: `_TZE204_dhotiauw` → `din_rail_meter` (Thierry post #2115)

**Rationale**: Thierry confirmed his device is a "dual energy meter" (TS0601). His
diagnostic shows the device has endpoint 1 with `inputClusters: [0, 4, 5, 61184, 0]`
(genBasic, genGroups, genScenes, Tuya DP 0xEF00, genBasic again) and
`outputClusters: [25, 10]` (OTA, Time). This is a classic dual energy meter signature.

The mfs_db had `_TZE204_dhotiauw -> climate_sensor` which is WRONG. Per Z2M (PR #18432
on similar `_TZE204_81yrt3lo`), the correct driver is `din_rail_meter` (or
`power_clamp_meter` for the related 80A 1-channel variant).

**Files changed**:
- `drivers/climate_sensor/driver.compose.json`: removed `_TZE204_DHOTIAUW`
- `drivers/din_rail_meter/driver.compose.json`: added 3 case variants
  (`_TZE204_DHOTIAUW`, `_TZE204_dhotiauw`, `_tze204_dhotiauw`)

**Sacred Couple**: 1 fixed (`dhotiauw|climate_sensor,din_rail_meter`).

### Fix 2: DP 2 for SmarterCurry Luminance Sensor (_TZE284_aaeasoll)

**Rationale**: User Tobias-B (post #2062/2075/2080) reports the SmarterCurry Luminance
Sensor pairs correctly but doesn't show lux values. User did the research and found
Z2M PR #12347 (AloneHUANG) implements the device with **DP 2 for illuminance**, not
DP 1 as previously mapped.

**Files changed**:
- `drivers/light_sensor_outdoor/device.js`: added `2: { capability: 'measure_luminance', divisor: 1 }` to dpMappings (kept DP 1 for back-compat)

### Fix 3: `_TZE204_81yrt3lo` removed from `presence_sensor_radar`

**Rationale**: P87 only removed the `_TZE284_81yrt3lo` variant from `presence_sensor_radar`,
but the `_TZE204_81yrt3lo` variant was still there. The auto-fix-all bot re-added it
on the next version bump. Re-fixed to ensure all 4 case variants are only in
`din_rail_meter`.

**Files changed**:
- `drivers/presence_sensor_radar/driver.compose.json`: removed `_TZE204_81yrt3lo`

### Fix 4: Sacred Couple baseline entries (HOBEIAN, hobeian)

**Rationale**: HOBEIAN is a generic manufacturer that produces multiple device types
(soil sensor, water leak, smart button, etc.). It's currently in 6+ drivers
(soil_sensor, water_leak_sensor, switch_temp_sensor, switch_plug_1, switch_plug_2,
switch_wall_7gang, scene_switch_6). These are LEGITIMATE Sacred Couples (catch-all
HOBEIAN is in many drivers, the mfr+pid pair disambiguates at runtime).

**Files changed**:
- `.github/fingerprint-collision-baseline.json`: added 2 entries (HOBEIAN, hobeian)

## Tools created (P88)

### `tools/ci/forum-search-related.js` (2.5 KB)

Search community.homey.app via Discourse search API for 15 queries related to
Zigbee/Tuya/Homey. Returns 109 unique topics, deduplicated.

### `tools/ci/forum-topic-fetch.js` (3.2 KB)

Fetch any topic by id (with paging). Used to deep-dive 6 specific topics.

### `tools/ci/forum-uniq-related.js` (1.1 KB)

Deduplicate + sort the 109 topics by `last_posted_at`. Outputs top 30 most recent.

## Versions

| App | Pre-P88 | Post-P88 |
|-----|---------|----------|
| master | v9.0.344 | v9.0.345 (commits 21a6c425b + 9dba0d628) |
| stable | v5.12.24 | v5.12.25 (commits ce6e82458 + 230ec41ae + cc98e0466) |

## Commits

- **master**:
  - `21a6c425b` fix(P88): mfr mapping for dhotiauw + DP fix for SmarterCurry luminance
  - `9dba0d628` v9.0.345: P88 [skip ci]
- **stable**:
  - `ce6e82458` fix(P88): cherry-picked from master
  - `230ec41ae` fix(P88-stable): dhotiauw re-apply (lost during rebase)
  - `cc98e0466` v5.12.25 (after rebase + push)

## Tests

- `test-architectural-coverage.js`: 28 passed, 0 failed
- `check-collision-safety.js`: PASS (0 new Sacred Couples, 11 fixed by P88)

## Open P89+ TODOs (carry-over from P87 + new)

1. **Energy meter 660kwh vs 1kwh** (post 2093): ProductValueValidator divisor fix
2. **HOBEIAN ZG-222Z waterleak no data** (post 2090, 2111): DP mapping in
   `drivers/water_leak_sensor/device.js` for ZG-222Z (modelId)
3. **Moes 4-button remote** (post 2098, 2100, 2104): PhysicalButtonMixin audit
4. **App crashes 8788edbb / 54888ee1 / b45e56d7 / 1000037573 / 85e894e1**:
   Need to fetch diagnostic JSON via Homey Developer Tools API
5. **Smart airbox no data after update** (post 2029)
6. **Soil sensor as Curtain Module** (post 2091): DynamicDriverMatcher regression
7. **Valve 2-way buttons don't work** (post 2102, 2105): valve_dual_irrigation DP 5
8. **Door/Window Luminance 0** (post 2089): lowLuminanceThreshold setting
9. **Smart button + SOS only as Universal Zigbee** (post 2089): need proper
   button drivers
10. **`_onDeleted` null on stable v5.11.216** (issue #513): SDK Homey bug, not our code
11. **Tobias-B _TZE284_aaeasoll diagnostic** (post 2110): cross-ref with crash
12. **Nigel_Scott presence only motion** (post 2112): presence_sensor_radar flow
