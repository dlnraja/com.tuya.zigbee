# T140352 deep treat — 2026-10-14 (P2817)

Silent code/CI only. No forum POST.

| Post | User | Couple / signal | Action |
|------|------|-----------------|--------|
| #2255 | VicHY | Advanced Flow lag / presence cards | Tip-lag / host UI — no driver lock; soak ≥9.0.1462 |
| #2256 | dlnraja | ack | — |
| #2257 | meter91 | `_TZ3000_7y90pany`+`ZG-106Z` | Already `illuminance_sensor`; sacred-keep pin P2817 |
| #2258 | EdP | `AOYAN`+`AY-303Z` soil | P2815 lock; **P2817** strip AOYAN from `water_leak` (cartesian AOYAN×TS0601) |
| #2259 | Peter | crash @9.0.1330 diag c05db40d | Tip-lag — fixed on tip ≥9.0.1433 (#2260 confirms) |
| #2260 | Peter | OK again | Closed by tip |
| #2261 | marosk | `_TZE200_fl8cuafl`+`TS0601` TRV | P2813 `device_radiator_valve` + EF00 clusters; re-pair |
| #2262 | Istvan_Mag | `_TZE284_gnpflcoq`+`TS0601` 4in1 | FP was locked (P2812) but **compose required ZCL** → virtual socket. **P2817** lean clusters `[0]` |

## Root causes fixed

1. **#2262 pairing**: `motion_sensor_radar_mmwave` required `[0,3,4,5,1024,1280,16384,57346,61184]` — EF00 MCU interview lacks ZCL lux/IAS/0xE002 → Homey no-match → virtual socket. Softened to Basic `[0]` + soft EF00 bind.
2. **#2258 cartesian**: `water_leak_sensor` listed AOYAN + TS0601 → false couple vs soil `AOYAN`+`AY-303Z`. AOYAN removed from water_leak.

## Gates

- `npm run check:p2812` / `check:p2817` / `check:p2815`
- Dual-app: **BOTH** (pairing reliability)

## User ask (silent)

- Update Universal Test ≥**9.0.1462**, remove+re-pair gnpflcoq / AOYAN / fl8cuafl if still virtual.
