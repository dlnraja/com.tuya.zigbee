# P2585 — Z2M / herdsman / Homey sacred-couple research (2026-09-18)

Silent enrich only. **Never** invent pid. Complementary union (P2520).

## Sources
- Zigbee2MQTT / zigbee-herdsman-converters `src/devices/tuya.ts` (live dump)
- Local `data/z2m_herdsman_cache.json` + `npm run market:couples:check`
- `tools/ci/z2m-gap-audit.js` (29 Z2M-only brand labels; 1356 covered mfrs)

## Metrics
| Metric | Value |
|--------|------:|
| Z2M fingerprint couples parsed | 1259 |
| Homey cartesian hit | 1185 |
| Z2M-only (mfr+_T*) | 74 |
| Surgical apply-safe verified | 25 couples |

## Applied (Homey tip 9.0.1055)
- Climate: `ksz749x8`, `qf5mzewi` 1000000 batch → `climate_sensor`
- Dimmer: `da26abzz`+TS0601 → `wall_dimmer_tuya` (MG-DIM02Z)
- Motion: `o4mkahkc`+TS0202 → `motion_sensor` (forbid contact)
- SOS: `nxdziqzc` / `irwuzilv` / `gjiggmio`+TS0215A
- Switches / plugs / curtain: TS0001/2 + TS011F + `xgzzuerd`+TS0301
- Radar config: `ya4ft0w4` on ZY_M100 profile (compose already had FP)

## Contre quoi
- `test/critical/p2585-*.test.js` · `npm run check:p2585`
- Misattribution registry couple locks for motion + climate

## Tools
- `tools/ci/p2585-z2m-herdsman-couple-diff.js`
- `tools/ci/p2585-z2m-surgical-enrich.js` (`--apply`)
