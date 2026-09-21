# Couple profile — `_TZE204_clrdrnya+TS0601`

- Driver: **presence_sensor_radar**
- Retail: **MTG075-ZB-RL** / sibling **MTG235-ZB-RL** (mains mmWave + relay)
- Case: presence-radar-clrdrnya
- Sources: registry; Z2M#18677; VicHY bathrooms; auto-seed-p2247

## Known bugs (P2579 / P2584)

- **sensor_mode=`occupied` (DP115)** forces permanent presence — heal to `on` on soft-clear; optional auto-unlock setting.
- **target_distance** often **quantized** (jumps 0↔~2.8 m) — soft-clear when stagnant.
- 24G **detection_range** avoid &lt;2.5 m (unstable / dead radar).
- Departure delay hint ≥15 s; bathroom anti-FP settings.
- Smart presence under Occupied: Homey may drive `alarm_motion` from distance/lux while firmware stays Occupied.

## DPs

| DP | Name | Type | Direction | Capability |
|---:|---|---|---|
| 1 | presence | — | rx | alarm_motion |
| 2 | radar_sensitivity | — | rx | — |
| 3 | shield_range | — | rx | — |
| 4 | detection_range | — | rx | — |
| 6 | equipment_status | — | rx | — |
| 9 | target_distance | — | rx | measure_distance |
| 101 | entry_filter_time | — | rx | — |
| 102 | departure_delay | — | rx | — |
| 103 | cline | — | rx | — |
| 104 | illuminance | — | rx | measure_luminance |
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
| 115 | sensor_mode | enum | rx/tx | (occupied = permanent presence) |

---
See `docs/guides/DP_INTERPRETATION.md`
