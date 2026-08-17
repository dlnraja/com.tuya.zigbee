# P2138 — BSEED Click wall dimmer (`_TZE284_m1cvyneb`)

**Date:** 2026-08-17 · **Silent forum** (#2133/#2138 PresentSky) · **Tracks:** BOTH (catalog + clamp); no forum post

## Sacred couple (matrix — not mfr alone)

| mfr | pid | Driver | Notes |
|-----|-----|--------|-------|
| `_TZE284_m1cvyneb` | `TS0601` | `wall_dimmer_tuya` | Z2M only documents this pid |
| `_TZE204_m1cvyneb` | `TS0601` | `wall_dimmer_tuya` | TZE prefix sibling (unverified field, same DP map) |
| `_TZE200_m1cvyneb` | `TS0601` | `wall_dimmer_tuya` | TZE prefix sibling |
| `_TZE284_m1cvyneb` | `TS0201` | **none** | Fake historic pollution — **deleted**. Do not invent. |

**Doctrine:** one manufacturer can own many productIds / variants / marketing names. Never route by mfr alone when pid is known. Never invent a second pid to clear a collision.

## Interview (#2138)

- EP1: basic(0), groups(4), scenes(5), Tuya EF00(61184), proprietary 0xED00(60672)
- EP242: Green Power — ignore
- Router, mains, `appVersion` 78
- Product: BSEED Click Series smart Zigbee switch **socket insert** (dimmer), not a climate sensor

## Z2M / external

- Converter: `TS0601_dimmer_1_gang_1`
- DP1 bool on/off · DP2 value brightness (MCU 0–1000) · DP6 countdown · DP21 backlight enum
- MCU reboot if brightness write >1000 (Z2M #32305) → Homey must clamp via `TuyaBrightnessScale`

## Root causes of “temperature sensor + dead controls”

1. **Stale pairing** on `climate_sensor` (Homey cannot swap drivers at runtime) — diag `f20dc4f0` @ 9.0.491
2. **Polluted catalogs** routing the couple to climate / soil / `zigbee_universal` (`mfs_db`, `new_fingerprints.json`)
3. **Driver gaps**: no `super.onNodeInit`, unclamped `Math.floor(value*1000)`, no battery strip

## Fixes (master 9.0.583 / stable 5.12.85)

- Compose already owned by `wall_dimmer_tuya`; climate/soil must not claim
- Compound keys in `lib/DeviceFingerprintDB.js`
- Catalogs: `mfs_db`, `new_fingerprints.json`, `lib/tuya/fingerprints.json`, `data/fingerprints.json`
- Registry forbidden: climate*, soil, zigbee_universal, generic_tuya, ir_blaster
- `drivers/wall_dimmer_tuya/device.js` harden
- Anti-bot: `p94-m1cvyneb-not-{climate,generic,soil,universal}`
- Test: `test/critical/p2138-bseed-wall-dimmer.test.js`

## User guidance (generic wording)

Remove the wrongly paired device → update Test app → re-add; expect **Wall Dimmer**. Do not bind or declare 0xED00 in compose.

## Classification

| Change | Tag |
|--------|-----|
| FP lock / mfs_db / registry / brightness clamp / super.onNodeInit | BOTH |
| Availability last-seen / rejoin flow / command pacer | MASTER_ONLY (HomeSuite-derived) |
