# Forum fleet silent treat — 2026-10-14 (P2821)

Silent code/CI only. **No forum POST** (T157628).

## Scan

| Pass | Result |
|------|--------|
| `forum:silent-scan` | 23 topics · actionable posts across T140352…T146667 |
| `forum:process` | 218 posts · **57** need-action · 75 with couples |
| `enrich:investigate` | 57 investigated · MISSING_PID resolved via mfs/registry |
| T26439 P2571 | harvest #5534 · 8 locks already in compose (addedM=0) |
| `forum:media` | gaps **0** · collisions = same-driver duplicates (OK) |

## Verdict matrix (no invent pid)

| Class | Count | Action |
|-------|-------|--------|
| `ROUTED_OK` / `alreadyInCatalog` | majority | tip ≥**9.0.1468** + re-pair if stale tile |
| `fixShipped` (battery/button/TRV/presence) | ~40 | tip-lag — P2488/P2689/P2593/P2555 already on tip |
| `MISSING_PID` in post text | 14 | resolved soft→hard with verified pid (Z2M/mfs) — **not** invented |
| `NOT_IN_CATALOG` cartesians | 4 | **forbid** (P2821) — do not lock |

### Cartesians forbidden (P2821)

| Couple | Why |
|--------|-----|
| `_TZ3000_zgyzgdua`+`TS0043` | Z2M = TS0044_2 only |
| `_TZ3000_wkai4ga5`+`TS0043` | verified TS0044 / TS0042 only |
| `_TZ3000_4upl1fcj`+`TS0505B` | Z2M Push_LE = TS0041 button |
| `_TZ3000_qd7hej8u`+`TS0041` | Z2M Lidl = TS0505B bulb |

### Sacred-keep pinned this pass

`dtzziy1e`, `npj9bug3`, `nqqylykc` (+TZE200/204/284), `qja6nq5z`+TS004F, `tgvtvdoc`+TS0207, `ne4pikwm` TRV siblings.

## Live T140352 (highest #2262)

| Post | Status |
|------|--------|
| #2261 fl8cuafl TRV | P2813 locked |
| #2262 gnpflcoq 4in1 | P2812/P2817/P2818 locked |
| #2258 AOYAN soil | P2815/P2817 |
| #2257 ZG-106Z lux | P2817 sacred-keep |
| #2253/#2244 ogx8u5z6 | P2569–P2598 datapoint TX |
| VicHY presence | P2490/P2555+ family — tip + Repair |

## Dual-app

**BOTH** — sacred-keep + cartesian forbids + registry.

## Gates

`npm run check:p2821` · `check:p2495` (publish keep) when wired.
