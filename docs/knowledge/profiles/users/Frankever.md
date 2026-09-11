# FrankEver (Gmail diags 2026-09-11)

## Status
**NEED_INTERVIEW** — diags `e96f52aa` / `d6245ab2` / `d9f86fed` @ tip **9.0.874** contain **no** `manufacturerName`+`productId` and no `water_valve_smart` device init (boot/FLOW-GUARD noise only).

Do **not** invent a live couple from the retail name alone. FrankEver changes `_TZE200_*` suffixes often (Z2M #16406).

## Soft hypotheses (Z2M/ZHA locked family — not live diag identity)
| Couple | Retail | Driver |
|--------|--------|--------|
| `_TZE200_wt9agwf3`+`TS0601` | FK_V02 | `water_valve_smart` |
| `_TZE200_5uodvhgc`+`TS0601` | FK_V02 sibling | `water_valve_smart` |
| `_TZE200_1n2zev06`+`TS0601` | FK_V02 / ZHA#2633 | `water_valve_smart` |
| `_TZE200_nbqnmkee`+`TS0601` | FK-BV05 (flow+temp) | `water_valve_smart` |

## Expected interview fields
- `zb_manufacturer_name` / `zb_model_id`
- EP1 clusters (FK_V02 typically `0,4,5,6,61184`)
- Driver tile name after pair

## User action
1. Update Universal Tuya Test ≥ tip with P2468
2. Remove Unknown tile
3. Add device → **Water Valve Smart**
4. Reply with interview JSON or Diagnostic ID showing mfr+pid

## Code
- P2464: forbid thermostat for `1n2zev06`
- P2468: FK_V02 DP1/9/101 vs FK-BV05 DP1/2/3/5/6/22; sacred-keep all four couples
