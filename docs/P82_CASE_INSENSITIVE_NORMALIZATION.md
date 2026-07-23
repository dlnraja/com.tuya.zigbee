# P82 — ULTIMATE Case-Insensitive Normalization

**Date**: 2026-07-23
**Scope**: Master + Stable (both apps)
**Trigger**: Issue #513 (climate_sensor not installing) + user request "etudie tout les anciennes version et ancienne gestions des case insensitives... et fait la verison ultime"

## 🎯 Problem Statement

Tuya devices report `manufacturerName` with **inconsistent casing** depending on firmware version:
- `_TZ3000_zgyzgdua` (lowercase)
- `_TZ3000_ZGYZGDUA` (uppercase)
- `_TZ3000_Zgyzgdua` (mixed)

**Homey runtime is CASE-SENSITIVE** in mfr matching. A device with lowercase mfr cannot match a driver with uppercase mfr → "Unknown Zigbee unit" error.

### Real-world impact (issue #513)
- User `finnamu` had a climate sensor reporting `_TZE284_hodyryli` (lowercase)
- Driver `climate_sensor` had only `_TZE284_HODYRYLI` (uppercase)
- Sensor failed to install despite being "supported" in v9.0.328

## 📚 Historical Implementations (chronology)

| Date | Version | Module | Status |
|------|---------|--------|--------|
| 2026-07-05 | v5.5.688 | `lib/Util.js` v1 (toLowerCase + trim) | ✅ Active |
| 2026-07-05 | v5.5.697 | `lib/utils/CaseInsensitiveMatcher.js` (NFKD + accents) | ❌ **UNUSED** |
| 2026-07-05 | v5.5.700 | `lib/pairing/PermissiveMatchingEngine.js` (uses Util.js) | ✅ Active |
| 2026-07-22 | v4 | `enrich-orphan-drivers.js` v4 (mfr+pid cross-orphan safe) | ✅ Used P80.3 |
| 2026-07-22 | v7 | `enrich-orphan-drivers.js` v7 (case-insens + variants) | ✅ Used P80.5 |
| **2026-07-23** | **v10.0.0** | **`lib/utils/TuyaNormalizer.js` ULTIMATE** | ✅ **CURRENT** |

**3 different implementations** for the same problem → unified in P82.

## 🧬 TuyaNormalizer v10.0.0 ULTIMATE

**Single source of truth** at `lib/utils/TuyaNormalizer.js`.

### Pipeline (R24 NFKD compliant)
1. NFKD Unicode decomposition (separates accents)
2. Strip diacritics (U+0300-U+036F)
3. Strip emojis (surrogate-safe, U+D800-U+DFFF)
4. Strip control chars (except tab/newline/CR)
5. Lowercase + trim

### Public API
```js
// Core
normalize(str)                 // NFKD + accents + lowercase
normalizeTuyaID(id)            // Tuya ID specific
normalizeDeviceName(name)      // strips brand prefixes
normalizeArray(array)

// Comparison
equalsIgnoreCase(s1, s2)
includesCI(array, value)
findCI(array, value)
filterCI(array, value)
startsWithCI(str, prefix)
endsWithCI(str, suffix)
containsCI(str, substring)

// Tuya-specific
matchesManufacturer(mfr, list)
matchesProductId(pid, list)
matchesManufacturerPrefix(mfr, prefixes)

// Multi-PID and multi-variant
generateCaseVariants(id)       // [original, lower, upper]
matchMultiPid(devicePid, entries)  // handles [pid1, pid2]
matchMultiVariant(deviceMfr, mfrs) // handles variants

// Scoring (gamification)
scoreMatch({sources, matchLevel, hasMultiPid, hasMultiVariant})
findBestDriverMatch(device, drivers)
```

### Scoring logic
| Match level | Base | +sources | +multi-PID | -variant |
|-------------|------|----------|------------|----------|
| exact (mfr+pid) | 100 | +5 each, max +20 | +5 | -10 |
| manufacturer | 80 | +5 each, max +20 | - | -10 |
| productId | 60 | +5 each, max +20 | - | -10 |
| fuzzy | 40 | +5 each, max +20 | - | -10 |

## ♻️ Refactor (backward-compat)

| File | Before | After | Diff |
|------|--------|-------|------|
| `lib/Util.js` | 30+ local fns | Delegates to TuyaNormalizer | -33 lines |
| `lib/utils/CaseInsensitiveMatcher.js` | 175 lines (standalone) | 27 lines (shim) | -148 lines |
| `lib/pairing/PermissiveMatchingEngine.js` | Uses Util.js | Uses TU.* directly | -1 line |

**All existing imports keep working** — backward-compat shims.

## 🔧 Issue #513 fix

**Root cause**: device interview reported `_TZE284_hodyryli` (lowercase) but driver had only `_TZE284_HODYRYLI` (uppercase).

**Fix applied**: `drivers/climate_sensor/driver.compose.json` now has BOTH case variants.

**Test verification**:
```js
findBestDriverMatch(
  {manufacturerName:'_TZE284_hodyryli', productId:'TS0601'},
  [{id:'climate_sensor', manufacturerNames:['_TZE284_HODYRYLI'],
    productIds:['TS0601'], sources:new Set(['mfs_db','johan'])}]
)
// → {driverId:'climate_sensor', matchLevel:'exact', confidence:100}
```

## 📊 Scope of case-mismatches (master)

| Metric | Value |
|--------|-------|
| mfr case-mismatches detected | 1760 |
| PID case-mismatches | 0 (PIDs already normalized) |
| mfrs now with case-variant siblings | 1536 |
| Drivers touched | 39 |
| New Sacred Couple collisions | 0 |
| Architectural tests | 28/28 PASS |

## 🚀 Releases

| App | Version | Commit | Status |
|-----|---------|--------|--------|
| master | v9.0.333 | e60134d42 | ✅ Test channel |
| stable | v5.12.16 | e427fc57f | ✅ Test channel |

## 🔍 Key learnings

1. **Homey IS case-SENSITIVE** in mfr matching (confirmed via issue #513)
2. **Tuya devices report inconsistent casing** depending on firmware version
3. The fix is to include ALL case variants in driver.compose.json (can't modify Homey runtime)
4. **3 implementations existed**, each used in different places. P82 unified them all.
5. **Master has 479 mfrs** in switch_1gang catch-all, **stable has 555**. The 76 extra on stable
   caused Sacred Couple collisions when cherry-picking master mfr additions verbatim.
   Solution: selective sync (lib/ + tools/ only on stable, not driver.compose.json).
6. `normalizeDeviceName` strips brand prefixes (tuya, moes, lonsono, avatto, beca, bseed, zemismart, sengled, sonoff, lumi, aqara, ikea, osram, philips, signify, innr) for better device matching.
7. **Scoring gamification** rewards multiple sources (johan + blakadder + mfs_db = higher score) for routing confidence.

## 📁 Files created/modified

**Created:**
- `lib/utils/TuyaNormalizer.js` (v10.0.0 ULTIMATE, 11kB)
- `tools/ci/find-case-mismatch-mfrs.js` (audit + apply)

**Refactored:**
- `lib/Util.js` (backward-compat shim)
- `lib/utils/CaseInsensitiveMatcher.js` (175→27 lines)
- `lib/pairing/PermissiveMatchingEngine.js` (uses TU.* directly)

**Touched (drivers with newline + case variants):**
- bulb_dimmable, switch_usb_dongle, light_bulb_rgb, rgb_spot_GU10, light_bulb_rgb_rgbw,
  rgb_ceiling_led_light, led_controller_cct, bulb_rgbw, bulb_rgb, sensor_motion_presence,
  usb_dongle_triple, led_strip_rgbw, smart_irrigation_valve, motion_sensor,
  bulb_tunable_white, wall_dimmer_tuya, button_wireless_2, valvecontroller, switch_2_gang,
  relay_board_4_channel, wall_switch_5_gang_tuya, button_wireless_4, radiator_valve,
  scene_switch_4, water_valve_garden, remote_button_wireless, switch_1gang, power_meter,
  button_wireless_plug, switch_4_gang_metering, **climate_sensor** (issue #513),
  temphumidsensor3, soil_sensor, device_air_purifier_radiator, wall_switch_3gang_1way,
  smart_knob_rotary, switch_wireless, temphumidsensor5, device_air_purifier_plug,
  smart_air_detection_box, device_din_rail, device_radiator_valve_smart, wall_thermostat,
  smart_lcd_thermostat, dimmer_wall_1gang, tunable_bulb_E27, hybrid_fan_sensor,
  temphumidsensor, flood_sensor, gateway_zigbee_bridge, vibration_sensor,
  usb_outlet_advanced, thermostatic_radiator_valve, thermostat_tuya_dp,
  water_valve_smart, smart_motion_sensor, switch_2gang, plug_energy_monitor,
  scene_switch_1, hybrid_light_windowcoverings, switch_4gang, switch_3gang,
  light_bulb_dimmable_tunable, sensor_contact_zigbee, water_leak_sensor_tuya,
  switch_wall_7gang, switch_wall_6gang, sensor_illuminance_presence,
  sensor_climate_temphumidsensor, scene_switch_2, pir_sensor_2, sensor_gas_presence,
  led_strip_advanced, switch_temp_sensor, presence_sensor_radar, ir_remote,
  wall_dimmer_1gang_1way, valve_irrigation, pool_pump, led_controller_dimmable,
  led_controller_rgb, motion_sensor_switch, wall_switch_4gang_1way,
  remote_button_emergency_sos, smart_remote_4_buttons, remote_button_wireless_usb,
  zigbee_repeater, remote_button_wireless_wall, rgb_spot_GardenLight,
  scene_switch_6, sensor_contact_presence, switch_plug_1, switch_plug_2,
  wall_curtain_switch, wall_switch_2gang_1way, smart_knob, soilsensor,
  water_leak_sensor

## 🔗 Commits

- master:
  - fce463139 feat(P82): ULTIMATE TuyaNormalizer v10.0.0 + case-mismatch audit/fix
  - e60134d42 v9.0.333: P82 ULTIMATE normalizer
- stable:
  - 8fdc155a9 feat(P82-stable): TuyaNormalizer v10.0.0 ULTIMATE - backward-compat shims
  - e427fc57f v5.12.16: P82-stable ULTIMATE normalizer

## 🌐 Forum / GitHub

- Issue #513: Bug report - Zigbee Climate sensor not installing (CLOSED with fix)
- User `finnamu` notified in issue comment
- Test channel: https://homey.app/a/com.dlnraja.tuya.zigbee/test/

## 📚 Related docs

- [`P76_DEEP_ARCHITECTURAL_COVERAGE.md`](./P76_DEEP_ARCHITECTURAL_COVERAGE.md) — coverage tool + false-positive fixes
- [`P77_P78_P79_BATTERY_BUTTON_REFRESH.md`](./P77_P78_P79_BATTERY_BUTTON_REFRESH.md) — battery/button audit + mega-crawler resilience
- [`P80_ISSUE_439_ORPHAN_DRIVERS.md`](./P80_ISSUE_439_ORPHAN_DRIVERS.md) — issue #439 + PR #512 orphan driver enrichment
