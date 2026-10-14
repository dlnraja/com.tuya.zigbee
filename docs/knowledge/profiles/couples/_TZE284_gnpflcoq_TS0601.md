# Couple profile — `_TZE284_gnpflcoq+TS0601`

- Driver: **motion_sensor_radar_mmwave**
- Case: p2270-gnpflcoq-4in1-mmwave / P2818
- Sources: ZHA#5252/#5286; Z2M TS0601_TZE284_gnpflcoq; forum T140352 #2262

## DPs (ZHA#5286 corrected — prefer over older Z2M DP2/102 fading map)

| DP | Name | Type | Direction | Capability / note |
|---:|---|---|---|---|
| 1 | pir_state | enum 0=pir / 1=none | rx | alarm_motion (**inverted** — 0=occupied) |
| 4 | battery | value % | rx | measure_battery |
| 7 | temperature | value /10 | rx | measure_temperature |
| 8 | humidity | value % | rx | measure_humidity |
| 9 | pir_sensitivity | enum low/mid/high | tx/rx | settings / Flow (NOT DP2) |
| 11 | illuminance | lux | rx | measure_luminance |
| 12 | pir_delay | 10–180 s | tx | fading_time setting (NOT DP102) |
| 101 | sensor_sampling | 1–60 min | tx | optional |
| 102 | temp_compensate | °C offset | tx | temperature_calibration (NOT fading) |
| 103 | humidity_compensation | % | tx | humidity_calibration |

## Contre quoi

- Writing **DP102 as fading_time** corrupts temperature offset (ZHA#5286 / Z2M#32750 class).
- Compose clusters must stay lean (`[0]`) so EF00 MCU pairs (P2817).

---
See `docs/guides/DP_INTERPRETATION.md`
