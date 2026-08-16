# Sacred Couple Deep Investigation — 2026-08-16

One-by-one investigation of recent forum/GH sacred couples (mfr + pid), with Z2M/ZHA/internet cross-ref and local code actions.

## 1. `_TYZB01_6g8b7at8` + `TS0012`

| Field | Finding |
|-------|---------|
| Product | 2-gang wall switch (Oz Smart Things / white-label) |
| Protocol | **ZCL multi-EP OnOff** (clusters 0,4,5,6) — **no** 0xEF00, **no** electricalMeasurement |
| Exposes (Z2M) | state left/right, power_on_behavior, backlight_mode |
| Role | **EndDevice** even with neutral wired (TS001x ≠ TS000x routers) |
| Known bugs | Not a mesh router; power-loss rejoin flaky on some firmware; simultaneous physical presses may delay ~0.5s |
| Sources | [Z2M TS0012](https://www.zigbee2mqtt.io/devices/TS0012.html), [Z2M #11314](https://github.com/Koenkk/zigbee2mqtt/discussions/11314), [Z2M #4886](https://github.com/Koenkk/zigbee2mqtt/issues/4886) |

**Action (P141):** Routed to `switch_2gang` compose + added to `ZCL_ONLY_MANUFACTURERS_2G` + strip phantom `measure_power`/`voltage`/`current`/`meter_power`.

---

## 2. `_TYZB01_vzrytttn` + `TS0012`

| Field | Finding |
|-------|---------|
| Product | 2-gang Lonsonho/Moes L+N family (same TS0012 profile) |
| Protocol | Same as above — ZCL OnOff EP1+EP2 |
| Role | EndDevice |
| Known bugs | Same TS001x class (no router; rejoin quirks) |
| Sources | Z2M #4886 interview fingerprint; Johan lists as MOES TS0012 |

**Action (P141):** Same as couple #1 — ZCL-only + phantom energy strip on `switch_2gang`.

---

## 3. `_TYZB01_mqel1whf` + `TS0013`

| Field | Finding |
|-------|---------|
| Product | 3-gang Lonsonho L+N (interviewed as EndDevice; may report powerSource Battery wrongly) |
| Protocol | ZCL OnOff EP1–3; no power metering |
| Exposes (Z2M) | state left/center/right, power_on_behavior, backlight_mode |
| Known bugs | Sibling `_TZ3000_*` TS0013 can sync all gangs if endpoints not bound correctly; TYZB01 needs multi-EP ZCL path |
| Sources | [Z2M TS0013](https://www.zigbee2mqtt.io/devices/TS0013.html), Z2M #4886, Z2M #13322 (gang sync class) |

**Action (P141):** `switch_3gang` compose FP + `ZCL_ONLY_MANUFACTURERS_3G` + phantom energy strip.

---

## 4. `_TYZB01_bagt1e4o` + `TS0014`

| Field | Finding |
|-------|---------|
| Product | 4-gang Oz Smart Things / white-label |
| Protocol | ZCL OnOff EP1–4; EndDevice even with neutral |
| Exposes (Z2M) | 4× switch + power_on_behavior + backlight_mode |
| Known bugs | Same TS001x “not a router” expectation mismatch |
| Sources | [Z2M TS0014](https://www.zigbee2mqtt.io/devices/TS0014.html), Z2M #11314 |

**Action (P141):** `switch_4gang` compose FP + `ZCL_ONLY_MANUFACTURERS_4G` + phantom energy strip.

---

## 5. Forum / recent couples (verify-only)

### `_TZE284_m1cvyneb` + `TS0601` → `wall_dimmer_tuya`
- Z2M: `TS0601_dimmer_1_gang_1` (BSEED dimmer; MCU 0xEF00). Router. Issue [#28658](https://github.com/Koenkk/zigbee2mqtt/issues/28658).
- **Verdict:** FP present. PresentSky re-pair advice still valid if paired before FP land. No code change.

### `_TZE204_clrdrnya` / `_TZE284_clrdrnya` + `TS0601` → `presence_sensor_radar`
- Config `MTG075_ZB_RL_RELAY`: mainsPowered, strip phantom battery/climate, DP108 relay.
- **Verdict:** Correct. No change.

### `_TZE28C1000000_jtbgusdc` (+ `_TZE204/284/200_jtbgusdc`) + `TS0601` → `dimmer_2_gang_tuya`
- Avatto 2-gang dimmer family in compose.
- **Verdict:** FP present. No change.

### `_TZE284_hodyryli` + `TS0601` → `climate_sensor_zt08`
- ZT08 LCD weather station. **Must** Unix-1970 `mcuSyncTime` then **DP17=false ~500ms** or temp/clock stuck (Z2M #29627 / converters #12180).
- **Verdict:** P140 already shipped. Await Homey Test retest (>9.0.531) for GH #513.

### `_TZE284_nt4pquef` + `TS0601` → `soil_sensor`
- Soil moisture (SG502Z / SGS02Z / Haozee HZ-SL09Z). Battery MCU. Not climate.
- Z2M DPs: **2=illuminance enum**, 3=soil_moisture, 5=temp/10, 9=temp_unit, 15=battery.
- **Bug found:** our DP2 was mapped to `measure_humidity.soil` (wrong for this mfr).
- **Action (P141):** DP2 transform routes nt4pquef → `measure_luminance` approx, skips soil %.

### `_TZE284_myd45weu` + `TS0601` → `soil_sensor`
- ZG-303Z DP map path (`isZG303ZVariant`).
- **Verdict:** Correct.

### `_TZ3210_imaccztn` + `TS0004` → `relay_board_4_channel`
- Forum TBoy #2131. Already routed.
- **Verdict:** OK.

### `_TZ3000_w5xztuy7` + `TS0002` → `switch_2gang` ZCL-only
- Already in `ZCL_ONLY_MANUFACTURERS_2G` (P139 Kanbros).
- **Verdict:** OK.

---

## Code changes this session (P141)

| File | Change |
|------|--------|
| `drivers/switch_2gang/device.js` | +`_TYZB01_6g8b7at8`, `_TYZB01_vzrytttn` ZCL-only; strip phantom energy |
| `drivers/switch_3gang/device.js` | +`_TYZB01_mqel1whf` ZCL-only; strip phantom energy |
| `drivers/switch_4gang/device.js` | +`_TYZB01_bagt1e4o` ZCL-only; strip phantom energy |
| `drivers/soil_sensor/device.js` | nt4pquef DP2 → luminance (not soil %) |
| `reports/SACRED_COUPLE_DEEP_INVESTIGATION_2026-08-16.md` | full per-couple report |

---

## Open / follow-ups

1. GH #513 ZT08 — user retest after next Test build with P140.
2. Optional: `_TYZB01_8ppvdbpz`+`TS0011` same Oz family — confirm `switch_1gang` ZCL-only if users report wireless-button misroute.
3. Do **not** forum-post (T157628 silent).
