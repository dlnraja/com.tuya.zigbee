# L99 multi-source treat — 2026-09-15 (P2509)

Silent only. Never forum POST. Never invent pid.

## Sources scanned

| Channel | Result |
|---------|--------|
| Forum T140352 | Highest **#2238** (Peter) — no newer posts |
| GH open | #533 / #547 / #548 still OPEN (tip-lag / re-pair) |
| Gmail diags | Peter battery + crash tip-lag (P2481/P2488/P2507 already on tip ≥9.0.939) |
| NEED_ACTION | Mostly `fixShipped` / invent junk Stefan |
| Z2M/ZHA | 5slehgeo curtain · gkfbdvyx sticky · npj9bug3 soil |

## Code root-cause fixed this pass (BOTH)

**P2509 — gkfbdvyx sticky presence** (Z2M#30785 / GH#547 “no function” after wrong pair):
- TYPE B DP1/DP104: `unreliable: true` + `useInference: true` (P2453 was only on iadro9bf)
- `clearPresenceOnZeroDistance` + paint `alarm_motion=false` when DP9 ≤0.05m
- Inference: `updateDistance(≈0)` forces clear even if sticky DP1 still true

**Registry:**
- Invent junk `_TZE2841000000_*` / ABC123 → `doNotLock` (Stefan T154092)
- `_TZE200_npj9bug3`+`TS0601` → `soil_sensor` (forbid climate / invent CK-TLSR pid)

## Already locked (no code gap — tip + re-pair)

| ID | Couple | Action |
|----|--------|--------|
| GH#533 | `5slehgeo`+TS0601 | `curtain_motor` + P2503 forbid TRV/climate |
| GH#547 | `gkfbdvyx`+TS0601 | compose + sacred-keep + **P2509 sticky** |
| GH#548 | crash @ 9.0.908 | P2481/P2484 tip ≥9.0.914 |
| Peter #2238 | `mrpevh8p`+TS0041 | P2507 tip ≥9.0.939 + press once |
| VicHY/Eduard/MIAMO | clrdrnya / fodv6bkr / icka1clh | LOCKED on tip |

## User action (silent)

Update Universal Test **≥9.0.939** (and Stable ≥5.12.185). For #547/#533: remove Unknown/wrong tile → re-pair after update. No forum reply.

## Gates

```bash
npm run check:p2509
npm run check:p2484
npm run check:p2503
```
