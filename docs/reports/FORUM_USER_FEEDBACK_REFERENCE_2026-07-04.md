# Forum User Feedback Reference - 2026-07-04

Scope: Homey Community forum feedback processed on 2026-07-04, focused on recent user-visible regressions and support findings.

## Sources reviewed

- 2026-07-02 16:13 UTC, Universal TUYA Zigbee Device App test, post #2099: Moes TS0014 `_TZ3000_mrduubod` is recognized as Wall Switch 4-gang 1-way, but Homey shows one device with four buttons and each UI button raises `Missing Capability Listener: Button 1`.
- 2026-06-29, Universal TUYA Zigbee Device App test, post #2098: Moes/Tuya 4-button remote diagnostic `5f9e3d94-cb21-4a02-a85a-772b71e51bd1`; buttons and flows not firing.
- 2026-06-15 to 2026-07-03, Universal TUYA Zigbee Device App test, posts #2091-#2102: soil sensor routes for `_TZE200_npj9bug3` and `_TZE284_myd45weu`, energy values too high, and water valve flow actions visible but ineffective.
- 2026-07 latest posts, legacy Tuya Zigbee app topic: soil `_TZE284_myd45weu`, door `_TZ3000_996rpfy6`, and boiler switch `_TZE28C100000_rzdkn5rx` require exact manufacturer/product routing.
- 2026-07 latest posts, official Tuya Smart Life topic: cloud-only generic mappings confirm why this Zigbee app should stay local-first and interpret DP/ZCL locally when possible.

## Corrections applied

- TS0014 `_TZ3000_mrduubod` stays routed to `wall_switch_4gang_1way`; CI now rejects future generic `switch_4gang` claims for that exact manufacturer/product pair.
- `UnifiedSwitchBase` retains `button.N` capability listener checks, preventing Homey SDK3 `Missing Capability Listener` regressions.
- ZCL metering `currentSummationDelivered` conversions no longer multiply by 1000 on the affected generated/wrapper drivers; values are parsed as kWh through the standard smaller unit path.
- `water_valve_smart` action card now calls the real outbound control path via `_setOnOff()` before updating Homey state, so flows do not only change the UI.
- `UnifiedPlugBase._setOnOff()` now falls back to Tuya DP1 when ZCL on/off is unavailable or fails, improving TS0601/EF00 local-first control.
- Soil TS0601 `_TZE200_npj9bug3` and `_TZE284_myd45weu` are locked to the modern `soil_sensor` driver; `_TZE284_myd45weu` was migrated away from legacy `soilsensor_2` pairing so it gains the richer DP, battery, EC, and flow handling.

## CI locks added

- `scripts/ci/check-button-flow-routing.js` guards the forum #2099 TS0014 route and the `button.N` listener fallback.
- Wall switch drivers declaring `button.N` are verified to inherit `UnifiedSwitchBase`.
- The same script rejects future `climate_sensor` or legacy `soilsensor_2` claims for the forum TS0601 soil fingerprints.

## Remaining support notes

- Forum diagnostics IDs expire quickly; ask users to submit fresh diagnostics immediately after reproducing button/valve events.
- For soil sensors, exact fingerprints now route `_TZE200_npj9bug3` and `_TZE284_myd45weu` to `soil_sensor`; if a device still appears as unknown, request the full interview, not only a diagnostic ID.
- For energy reports, collect raw `currentSummationDelivered`, multiplier/divisor attributes, and current app version before changing divisors again.
