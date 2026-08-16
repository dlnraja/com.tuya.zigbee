# P146 — Sacred couple `_TZ3000_k4ej3ww2` (2026-08-16)

## Verdict
Canonical Homey driver = **`water_leak_sensor`** (IAS Zone).  
Zigbee **productId / modelId** = **`TS0207` only**.  
Retail labels (not Zigbee modelId): HOBEIAN **ZG-222ZA** / ZG-222Z, Aubess **IH-K665** / IH-1218.

## Real configurations (cross-ref)

| Source | mfr | modelId | Clusters | Notes |
|--------|-----|---------|----------|-------|
| Z2M #17685 | `_TZ3000_k4ej3ww2` | `TS0207` | 0,1,3,1280 | Aubess IH-K665; batteryPercentageRemaining 200 |
| Z2M #28181 | same | `TS0207` | 0,1,3,1280 | HOBEIAN ZG-222ZA; sleepy / INVALID_EP bind quirks |
| Z2M #19308 | same | `TS0207` | IAS | Reports mainly on wet/dry change |
| Custom FW repo | same HW family | — | — | 512K vs 1M flash variants of same mfr |
| Johan enriched | same | `TS0207` (+ noisy `q9mpfhw`) | — | `q9mpfhw` is **not** this device (belongs to `_TZE200_qq9mpfhw` EF00) |

**No second Zigbee productId** is proven for this mfr. Do not treat `TS0601` / `q9mpfhw` as sacred partners of `k4ej3ww2`.

## Removals / conflicts fixed

| Where | Was | Now |
|-------|-----|-----|
| `water_leak_sensor_tuya` | dual-claimed mfr (+ bogus pid `_tz3000_k4ej3ww2`) | **removed** (P144) |
| `gas_sensor_switch` productId | had mfr as productId | **removed** (P143) |
| `data/mfs_db.json` | `driverId: water_leak_sensor_tuya` + polluted modelIds | **`water_leak_sensor` + `TS0207` only** (P146) |
| Compose dual-claim | both water drivers | **IAS only** |

## Static + dynamic (dual-app)

| Track | Static | Dynamic |
|-------|--------|---------|
| **master** | compose mfr case variants + `TS0207` / `ZG-222ZA` aliases + clusters 0,1,3,1280 | `UserMisattributionRegistry` → fingerprint-matcher force score 1.0 |
| **stable-v5** | same static couple when backported | **no** dynamic registry required |

Registry file: `data/user-misattribution-registry.json`  
Loader: `lib/pairing/UserMisattributionRegistry.js`

## Energy / battery

- Chemistry: CR2032 (typical); compose also lists CR2450/AAA for sibling IAS leaks.
- ZCL `batteryPercentageRemaining` 0–200 → use `BatteryMasterEngine.normalizeZigbeeValue` / `tuyaDpToPercent` paths (not raw).
- Device is **passive**: long silence is normal until wet/dry or button.

## Pairing UX

1. Pair as **Water Leak Sensor** (not Tuya DP water / contact / climate).
2. If already on wrong driver: delete + re-pair after tip with P146.
3. Case variants `_TZ3000_k4ej3ww2` / `_tz3000_…` / `_TZ3000_K4EJ3WW2` all listed statically.

## Retest

```text
mfr=_TZ3000_k4ej3ww2 + pid=TS0207 → water_leak_sensor only
wet probe → alarm_water
battery % sane (not 200 raw)
```
