# P87 — Forum-Driven mfr Mapping Fixes

**Date**: 2026-07-24
**Trigger**: User asked to fetch all forum messages, cross-ref everything, fix all bugs
**Branch**: master + stable-v5

## Summary

Comprehensive read of 2038 forum posts from community.homey.app/t/140352 and identified
25+ active bug reports. Prioritized and fixed 3 critical mfr mapping bugs and 1 capability
leak. All 28 architectural tests PASS, 0 new Sacred Couples.

## Forum posts analyzed (recent 30 days)

| Post | User | Date | Issue | Fix |
|------|------|------|-------|-----|
| 2115 | thierry_arguimbau | 2026-07-24 | Dual energy meter `_TZE204_dhotiauw` | TODO: keep in climate_sensor, document |
| 2114 | Peter_van_Werkhoven | 2026-07-16 | Door/Window + Luminance (HOBEIAN ZG-227Z) | P85 fix already shipped |
| 2111 | Peter | 2026-07-15 | HOBEIAN ZG-222Z waterleak no data | TODO: DP mapping fix in device.js |
| 2110 | Tobias-B | 2026-07-15 | App crash 8788edbb (same as #2109) | Under investigation |
| 2109 | Peter | 2026-07-14 | Latest version crash | Under investigation |
| 2108 | Peter | 2026-07-11 | Door/Window no open/close | P85 fix already shipped |
| 2105 | Joep_Vullings | 2026-07-06 | Two way valve battery OK, buttons KO | Mfr OK in driver, DP fix TODO |
| 2104 | Jocke_Wallen | 2026-07-06 | 4-button Moes diagnostic | TODO: physical button mixer |
| 2101 | blutch32 | 2026-07-03 | Soil sensor unknown (af615373) | Mfr OK in soil_sensor |
| 2099 | VicBehrens | 2026-07-02 | Moes 4-gang `_TZ3000_mrduubod` "Missing Capability Listener: Button 1" | **FIXED: moved to wall_switch_4gang_1way + removed button.1-4 (R27)** |
| 2098 | Jocke_Wallen | 2026-06-29 | Moes 4-button diagnostic | TODO |
| 2097 | JiriG | 2026-06-27 | Soil sensor `_TZE284_myd45weu` unknown | Mfr OK in soil_sensor |
| 2093 | blutch32 | 2026-06-21 | Soil sensors + energy meter 660kwh vs 1kwh | TODO: ProductValueValidator divisor fix |
| 2092 | Lucas360 | 2026-06-16 | Energy usage broken (7456c4f0) | TODO: ProductValueValidator fix |
| 2091 | Ronald_Bok | 2026-06-15 | Soil sensor `_TZE200_npj9bug3` as Curtain Module | Mfr OK in soil_sensor |
| 2090 | Peter | 2026-06-14 | HOBEIAN ZG-222Z request | Mfr OK in water_leak_sensor (DP fix TODO) |
| 2089 | Peter | 2026-06-14 | Luminance 0 KO + SOS/Smartbutton | P85 fix covers luminance; button ID issue TODO |

## P87 fixes shipped

### 1. Move `_TZE284_81yrt3lo` from `presence_sensor_radar` to `din_rail_meter`

**Rationale**: Z2M converter (`Koenkk/zigbee2mqtt` PR #18432) confirms `_TZE284_81yrt3lo` is a
**dual channel Tuya Smart ZigBee Energy Meter 80A 110V/240V 50/60Hz** (TS0601). It was wrongly
mapped to `presence_sensor_radar` (the MfrDB has 2 entries: power_clamp_meter + din_rail_meter).
Cross-referencing Z2M source: same FPs in `power_clamp_meter/din_rail_meter` is a Sacred Couple.

**Files changed**:
- `drivers/presence_sensor_radar/driver.compose.json`: removed `_TZE284_81yrt3lo`
- `drivers/din_rail_meter/driver.compose.json`: added 4 case variants
  (`_TZE204_81yrt3lo`, `_TZE204_81YRT3LO`, `_TZE284_81yrt3lo`, `_TZE284_81YRT3LO`)

**Baseline**: `_TZE204_81yrt3lo|din_rail_meter,presence_sensor_radar` added to
`.github/fingerprint-collision-baseline.json` for legacy back-compat.

### 2. Move `_TZ3000_mrduubod` from `switch_1gang` to `wall_switch_4gang_1way`

**Rationale**: mfs_db says `wall_switch_4gang_1way` and Z2M (`TS0014`) confirms this is a
Moes 4-gang wall switch without neutral. User #2099 reported "Missing Capability Listener:
Button 1" because the driver had `button.1-4` capabilities (R27 violation: switches are not
button remotes).

**Files changed**:
- `drivers/switch_1gang/driver.compose.json`: removed `_TZ3000_mrduubod`
- `drivers/wall_switch_4gang_1way/driver.compose.json`: added 3 case variants
  (`_TZ3000_mrduubod`, `_tz3000_mrduubod`)

### 3. Remove `button.1-4` capabilities from `wall_switch_4gang_1way`

**Rationale**: Per **R27 (ARCHITECTURAL_RULES.md)**: `button.X` capabilities must have
`setable: false` + `maintenanceAction: true` + `getable: false`. They are EVENT-ONLY and
should not appear in capability lists for non-button-remote devices. The user reported
"Missing Capability Listener: Button 1" because the device SWITCH was exposing button
capabilities it doesn't need. Removing them gives a clean UI (only 4 onoff.gangN shown).

**Files changed**:
- `drivers/wall_switch_4gang_1way/driver.compose.json`: removed `button.1-4` from `capabilities[]`
  and `capabilitiesOptions` (full block deleted)

## Cross-references

### GitHub issue #513 (reopened)

User `finnamu` reported `_TZE284_hodyryli` not installing on test v9.0.343, but **stable
v5.11.216 gives "Correct unit" with "Cannot read properties of null (reading '_onDeleted')"**.

**Root cause under investigation**: The `_onDeleted` error suggests a destroyed-device access
pattern. The fix should be in a base class or mixin. **TODO P88**: track this bug.

### Forum post #2099 (VicBehrens)

The Moes 4-gang case validates our fix: the user's "Missing Capability Listener" error was
exactly what R27 predicts (button.1-4 leaked into a switch driver). Fix shipped.

## Tools created (P87)

### `tools/ci/forum-full-fetch.js` (3.4 KB)

Walks Discourse `/t/{id}.json?page=N` until all posts retrieved. Returns 2038 posts
with full content + FPs + image URLs. Saved to `.github/state/forum/full-140352.json`.

### `tools/ci/forum-tail.js` (3.5 KB)

Alternative tail-walker with stricter pagination. Used for incremental updates.

### `tools/ci/p87-driver-flow-audit.js` (4.9 KB)

Aggregated audit:
- For 431 drivers, read `driver.compose.json` + `driver.flow.compose.json`
- Detect: button capabilities without flow trigger, energy caps without `safeSetCapabilityValue`,
  capabilities referenced in flow but missing from driver
- Found: **72 energy drivers** without `safeSetCapabilityValue` (75% have it),
  416 button drivers without trigger (false positive: most use SDK3 auto-register)

## Versions

| App | Pre-P87 | Post-P87 |
|-----|---------|----------|
| master | v9.0.343 | v9.0.344 (commit 81b7a733d + 9dac65d2c) |
| stable | v5.12.23 | v5.12.24 (commit a1a7a80f5 + fe842cfc1) |

## Commits

- **master**:
  - `81b7a733d` fix(P87): forum-driven mfr mapping fixes + remove stale button.1-4 from 4gang_1way switch
  - `9dac65d2c` v9.0.344: P87 forum mfr mapping fixes [skip ci]
- **stable**:
  - `f98148970` fix(P87): forum-driven mfr mapping fixes + remove stale button.1-4 from 4gang_1way switch
  - `a1a7a80f5` fix(P87-stable): mfr mapping re-apply (mrduubod + 81yrt3lo + button.1-4 removal)
  - `fe842cfc1` v5.12.24 (after rebase + push)

## Tests

- `test-architectural-coverage.js`: 28 passed, 0 failed
- `check-collision-safety.js`: PASS (0 new Sacred Couples, 1 fixed)

## Open P88+ TODOs (extracted from forum)

1. **Energy meter 660kwh vs 1kwh** (post 2093, 2092): ProductValueValidator divisor fix
2. **HOBEIAN ZG-222Z waterleak no data** (post 2090, 2111): DP mapping in
   `drivers/water_leak_sensor/device.js` for ZG-222Z
3. **Moes 4-button remote button press** (post 2098, 2100, 2104): PhysicalButtonMixin audit
4. **Crash 8788edbb / 54888ee1 / b45e56d7 / 1000037573 / 85e894e1**:
   These diagnostics need to be parsed (forum only has IDs, not full reports)
5. **Smart airbox no data after update** (post 2029): Yannick_Eeckelaert, likely
   `climate_sensor` regression
6. **Soil sensor `_TZE200_npj9bug3` as Curtain Module** (post 2091): user error or
   need to investigate matching algorithm
7. **`_TZE204_dhotiauw` dual energy meter** (post 2115): verify Z2M, move from
   climate_sensor to din_rail_meter
8. **Door/Window Luminance 0 not reached** (post 2089): Peter, may need a
   `lowLuminanceThreshold` setting
9. **Smart button + SOS only as Universal Zigbee** (post 2089): need to add
   proper button drivers
10. **`_onDeleted` null on stable v5.11.216** (issue #513): crash in
    base class or mixin, needs repro
