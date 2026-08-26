# P2268 — Parallel projects shadow investigation (ZHA / Z2M / ZHC)

Date: 2026-08-26 · Mode: SHADOW (no forum posts) · Track: MASTER first (BOTH for couple locks)

## Method
- GitHub search: open Tuya issues on `zigpy/zha-device-handlers`, `Koenkk/zigbee2mqtt`, open PRs on `zigbee-herdsman-converters`
- Z2M raw `tuya.ts` fingerprint cross-ref
- Local compose + `DeviceFingerprintDB` couple scan
- Silent pipeline: wire mega-crawler Z2M/ZHA into `config/enrichment/phases.json` sync (softFail)

## Actionable findings → code

| Couple | Source | Was | Now |
|--------|--------|-----|-----|
| `_TZE204/284_cjbofhxw`+TS0601 | Z2M PJ-MGW1203 | `smoke_sensor3` | `power_clamp_meter` |
| `_TZE284_a14rjslz`+TS0601 | Z2M ATMS10013Z3 | `climate_sensor` | `energy_meter_3phase` |
| `_TZ3000_tonrapsk`+TS0002 | ZHA #5260 | MISSING | `switch_2gang` (+ existing magic packet) |
| `_TZE284_cf4b5ktf`+TS0601 | ZHA #5117 | MISSING | soft → `energy_meter_3phase` (no invented DPs) |

## Also observed (watch / no invent)
- Z2M #32931 TRV `_TZE284_fqm2sfpe` — not in app yet
- Z2M #31244 curtain `_TZE284_kq1l5eu5` — not in app yet
- ZHC PR #12990 TH05-z — pending merge
- Multi-gang “both switch together” = missing Tuya magic — already fixed in `UnifiedSwitchBase`

## Pipeline upgrades
- `phases.json` sync: `mega-crawler --only=z2m|zha` softFail
- npm: `apply:parallel-couples`, `check:sacred-couple`, `apply:mfr-pid`

## User action
Update Homey Test after Auto-Publish; **re-pair** devices that were on wrong drivers (smoke/climate steal).
