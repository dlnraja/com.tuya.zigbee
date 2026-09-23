# Couple profile ÔÇö `_TZE204_clrdrnya+TS0601`


- Driver: **presence_sensor_radar**
- Case: presence-radar-clrdrnya
- Sources: registry; auto-seed-p2247

## DPs

| DP | Name | Type | Direction | Capability |
|---:|---|---|---|
| 1 | presence | ÔÇö | rx | ÔÇö |
| 2 | radar_sensitivity | ÔÇö | rx | ÔÇö |
| 3 | shield_range | ÔÇö | rx | ÔÇö |
| 4 | detection_range | ÔÇö | rx | ÔÇö |
| 6 | equipment_status | ÔÇö | rx | ÔÇö |
| 9 | target_distance | ÔÇö | rx | ÔÇö |
| 101 | entry_filter_time | ÔÇö | rx | ÔÇö |
| 102 | departure_delay | ÔÇö | rx | ÔÇö |
| 103 | cline | ÔÇö | rx | ÔÇö |
| 104 | illuminance | ÔÇö | rx | ÔÇö |
| 105 | entry_sensitivity | ÔÇö | rx | ÔÇö |
| 106 | entry_distance_indentation | ÔÇö | rx | ÔÇö |
| 107 | breaker_mode | ÔÇö | rx | ÔÇö |
| 108 | breaker_status | ÔÇö | rx | ÔÇö |
| 109 | status_indication | ÔÇö | rx | ÔÇö |
| 110 | illuminance_threshold | ÔÇö | rx | ÔÇö |
| 111 | breaker_polarity | ÔÇö | rx | ÔÇö |
| 112 | block_time | ÔÇö | rx | ÔÇö |
| 113 | parameter_setting_result | ÔÇö | rx | ÔÇö |
| 114 | factory_parameters | ÔÇö | rx | ÔÇö |
| 115 | sensor | ÔÇö | rx | ÔÇö |

---
See `docs/guides/DP_INTERPRETATION.md`

## Known bugs (P2579 ÔÇö MTG075 / MTG235)

- **occupied** sensor mode can stick true (false presence) ÔÇö soft-clear + healForcedOccupiedOnSoftClear on tip.
- Distance is **quantized** (~2.8 m steps) ÔÇö quantizedDistanceSoftClear avoids thrash.
- Retail SKUs **MTG075** / **MTG235** share couple `_TZE204_clrdrnya`+`TS0601` (mains, no phantom battery).
- antiFalsePositive: sticky DP1 needs distance corroboration before alarm_motion paints.

