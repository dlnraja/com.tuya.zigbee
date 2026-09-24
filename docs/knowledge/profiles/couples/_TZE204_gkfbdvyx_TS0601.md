# Couple profile — `_TZE204_gkfbdvyx+TS0601`


- Driver: **presence_sensor_radar**
- Case: p2583-gkfbdvyx-radar-not-socket / P2715 GH#550
- Sources: registry; Z2M ZY-M100-24GV3; GH#550 HiepSVG

## DPs

| DP | Name | Type | Direction | Capability |
|---:|---|---|---|
| 2 | move_sensitivity | — | rx | — (ignore bogus 0) |
| 3 | detection_distance_min | — | rx | — (÷100 dual-scale) |
| 4 | detection_distance_max | — | rx | — (never battery) |
| 9 | distance | — | rx | measure_luminance.distance (÷10 / cm dual) |
| 101 | find_switch | — | rx | — (never battery) |
| 102 | presence_sensitivity | — | rx | — (ignore bogus 0) |
| 103 | illuminance | — | rx | measure_luminance |
| 105 | presence_timeout | — | rx | — |

## Notes (P2715)
- Mains ceiling — no measure_battery / zones / button phantoms
- Lux cold re-arm ≤45s; settings→MCU for range/sensitivity/delay

---
See `docs/guides/DP_INTERPRETATION.md`

