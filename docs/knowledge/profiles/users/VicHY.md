# User profile — VicHY

Forum topic: **T140352** · Posts: 2208, 2211, 2219, 2222, 2224, 2225, 2226, 2227, **2231** (deleted), **2232**

## Couple
`_TZE204_clrdrnya` + `TS0601` → **`presence_sensor_radar`** (MTG075 / Wenzhi 220V mmWave)
Siblings: `_TZE200_clrdrnya`, `_TZE284_clrdrnya`

## Interview
EP1 EF00-only style Tuya radar (see forum #2224 interview). Mains 220V — **no battery**.

## Thread
| Post | Symptom | Fix |
|------|---------|-----|
| #2222/#2224 | Curtain UI + flood + low-battery | P2379/P2386/P2389/P2391 |
| #2227 | Curtain again after tip + battery warning `c5165a37` | P2420/P2459 refuse phantom battery + setEnergy |
| **#2232** | “can you see that?” (image missing; #2231 deleted) — soft: still battery / tip lag | **P2468** 10min phantom re-heal; **P2477** DCM ZCL battery block; update Test ≥**9.0.892** + restart |

## Screenshot OCR (#2222/#2224/#2227)
- Timeline: tip auto-update → **low battery** flap on mains “Presencia …” → Zigbee **rate limited ~196 msg/min** (Tuya FW class + phantom Energy).
- Tip lag common; code ≥9.0.887 (P2459/P2468).

## User action
1. Update Universal Tuya Test to **≥9.0.892** (P2472a compose + P2477 DynCap ZCL battery block)
2. Restart app (or Homey); re-pair only if curtain UI persists
3. Confirm no low-battery timeline / no curtain UI
4. New Diagnostic ID only if still wrong on that tip — `c5165a37` was **9.0.797** (pre-fix)

## Docs
- PECULIARITIES `vichy-clrdrnya-presence` / `presence-radar-clrdrnya`
- Fleet: `reports/forum-l99-2026-09-12/FLEET_L99.md`
- Changelog: v9.0.889 P2472a · v9.0.892 P2477 DynCap residual
