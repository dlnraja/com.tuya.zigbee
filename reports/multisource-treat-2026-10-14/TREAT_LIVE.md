# Multi-source L99 treat — 2026-10-14

Silent only. No forum POST (T157628).

## Sources scanned
| Source | Result |
|--------|--------|
| Forum silent (23 topics) | #2261/#2262 already locked P2812/P2813; processor 57 need-action |
| GitHub open | #571 #570 #560 #550 #559 (+ bot digest) |
| Gmail / diag | `011f7c0d` (#571); Configure hang + Unknown |
| Z2M/ZHA | QT-07S myd45weu soil; AOYAN AY-303Z = CS-201Z WL; TRV06 ME167; TS011F_plug_3 w0qqde0g |

## Root cause (#571 / #570)
`soil_sensor` productId list had **97 junk entries** (TRV/ZBMINI/`Battery switch, 1 button`/lumi…) → Athom cartesian ~28k → compact stress + Homey may reject driver match → **Unknown despite FP in Device Finder**. Clusters `[0,61184]` were already correct.

## Fixes (P2814)
| Item | Action |
|------|--------|
| soil productId | Pruned to **14 soil-only** (TS0601, ZG-303Z, AY-303*, CS-201Z, SGS02Z/SG502Z) |
| Compact sim | 1500 combos @ budget; sacred myd45weu/AOYAN/HOBEIAN **kept** |
| Settings Configure | 2.5s `Homey.ready()` fallback if bridge never calls `onHomeyReady` |
| #559 | sacred-keep `_TZ3210/_TZ3000_w0qqde0g`+TS011F → `plug_energy_monitor` |
| #560 | ME167 already on tip (rxq4iti9 DP4/5/6) — tip-lag 9.0.1331 |
| #550 | gkfbdvyx presence locks already on tip ≥9.0.1259 |

## Contre quoi
- `node --test test/critical/p2811-soil-qt07s-aoyan-clusters.test.js`
- Dual-app: **BOTH** (pairing reliability)

## User action (no forum reply)
Update Universal / Bastien / Stable Test tip → remove + re-pair soil / TRV / plug.
