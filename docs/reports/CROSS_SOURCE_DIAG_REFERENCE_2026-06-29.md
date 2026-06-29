# Stable v5 cross-source diagnostic reference

Generated: 2026-06-29 08:18 Europe/Paris

Privacy rule: this file summarizes private diagnostics and emails without copying raw mail bodies, crash dumps, tokens, device addresses, or secrets.

## Latest correlated signals

| Date/Time | Source | Signal | Fix |
| --- | --- | --- | --- |
| 2026-06-20 15:28 Europe/Paris | Private stable diagnostic, app v5.11.216 | Invalid `_hybrid_` flow card IDs and `smart_knob_rotary` class-load crash. | Silenced stale `_hybrid_` lookups behind debug guards; smart knob driver already extends `ZigBeeDriver` correctly in this tree. |
| 2026-06-28 21:11-21:12 Europe/Paris | Private crash emails from related app builds | Motion holdoff timer path can fire after device teardown and hit `_destroyed`/context failures. | Replaced bare motion holdoff timeout with Homey-bound scheduler fallback and `_destroyed` guard. |
| 2026-06-29 morning Europe/Paris | Latest forum + diagnostics correlation | Moes/TS004x buttons and rotary devices still risk wrong routing in stable if old broad fingerprints win. | Moved `_TZ3000_b4awzgct` to `button_wireless_4_ts0041`; moved `_TZ3000_qja6nq5z` to `smart_knob_rotary`; kept `_TZ3000_kfu8zapd` in `button_wireless_4`. |
| 2026-06-29 morning Europe/Paris | Battery diagnostics and interviews | ZCL `batteryPercentageRemaining=200` is valid 100% for TS004x, not unknown. | Added explicit TS004x battery profiles and fixed direct read paths so `200 => 100%`. |
| 2026-06-29 morning Europe/Paris | Forum/GitHub soil reports | `_TZE284_0ints6wl` and HOBEIAN `ZG-303Z` must route to soil, not climate fallback. | Removed the soil identifiers from `climate_sensor`; kept them on `soil_sensor`; removed dynamic `alarm_battery` from soil sensor capabilities. |

## Verification target

The stable regression test is [test/critical/cross-source-routing.test.js](../../test/critical/cross-source-routing.test.js). It checks soil routing, TS0041 4-button routing, TS004F rotary routing, and TS004x battery normalization.
