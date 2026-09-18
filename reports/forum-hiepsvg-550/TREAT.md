# L99 residual treat — 2026-09-18 (silent)

## Live open (code)
| ID | Couple | Symptom | Fix |
|----|--------|---------|-----|
| GH **#550** / #547 HiepSVG | `_TZE204_gkfbdvyx`+`TS0601` | OCR: lux OK, motion/presence No, distance `-`, phantom Channel 1 | **P2600** (+ prior P2595/97) |
| VicHY #2252 | `_TZE204_clrdrnya`+`TS0601` | distance `[object Object]`, phantoms | **P2599** tip ≥1079 |
| Michaelp #2253 | `_TZE284_ogx8u5z6`+`TS0601` | empty caps / datapoint TX | **P2593–98** tip ≥1076 |

## OCR GH#550 (`reports/forum-hiepsvg-550/ocr/`)
- Motion alarm **No** / Human presence **No** / Detection Distance **-** / Luminance **751 lx** dynamic
- Phantom power Channel 1 (compose onoff)

## P2600 root causes
1. Anti-FP treated DP9-never-seen as empty → blocked presence while find_switch cold
2. DP104 motion_state clear wiped lux/DP1 presence
3. Native `tuya.dataQuery` alone — need EF00 `requestDPs` + `forceActiveTuyaMode`
4. Lux tiny deltas — cadence soft-present while distance cold

## Also
- Synced 11 uncovered DP couples into `data/dp_couple_knowledge.json` (incl. gkfbdvyx)

## User action (no forum POST)
Update Test **≥ tip this publish** → Repair radar / TRV / MTG bathrooms.

## Dual-app
BOTH · Silent (T157628)
