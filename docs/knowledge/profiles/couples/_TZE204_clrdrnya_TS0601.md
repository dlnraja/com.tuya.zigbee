# Couple profile — `_TZE204_clrdrnya+TS0601`


- Driver: **presence_sensor_radar**
- Case: presence-radar-clrdrnya
- Sources: registry; auto-seed-p2247

## DPs

| DP | Name | Type | Direction | Capability |
|---:|---|---|---|
| 1 | presence | — | rx | — |
| 2 | radar_sensitivity | — | rx | — |
| 3 | shield_range | — | rx | — |
| 4 | detection_range | — | rx | — |
| 6 | equipment_status | — | rx | — |
| 9 | target_distance | — | rx | — |
| 101 | entry_filter_time | — | rx | — |
| 102 | departure_delay | — | rx | — |
| 103 | cline | — | rx | — |
| 104 | illuminance | — | rx | — |
| 105 | entry_sensitivity | — | rx | — |
| 106 | entry_distance_indentation | — | rx | — |
| 107 | breaker_mode | — | rx | — |
| 108 | breaker_status | — | rx | — |
| 109 | status_indication | — | rx | — |
| 110 | illuminance_threshold | — | rx | — |
| 111 | breaker_polarity | — | rx | — |
| 112 | block_time | — | rx | — |
| 113 | parameter_setting_result | — | rx | — |
| 114 | factory_parameters | — | rx | — |
| 115 | sensor | — | rx | — |

## Known bugs (P2579 / VicHY MTG075 / MTG235)

- Z2M **sensor=occupied** can force permanent presence — heal DP115→on on soft-clear (`healForcedOccupiedOnSoftClear`).
- Target **distance** often **quantized** (e.g. ~2.8 m steps) — soft-clear when distance idle (`quantizedDistanceSoftClear`).
- Retail: VicHY **MTG075** / **MTG235**-ZB-RL mmWave+relay; 220V AC; never curtain phantom.

---
See `docs/guides/DP_INTERPRETATION.md`

