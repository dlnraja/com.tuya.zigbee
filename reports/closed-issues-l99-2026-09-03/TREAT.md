# L99 closed-issues pass 2026-09-03 (P2405)

375 closed issues audited. Human gaps with real dual-home / wrong-driver locks fixed.

## Tip-soaked (verify OK)
| Issue | Couple | Driver |
|-------|--------|--------|
| #536 | `_TZE200_r32ctezx`+TS0601 | fan_controller |
| #533 | `_TZE204_5slehgeo`+TS0601 | curtain_motor |
| #532 | `_TZE204_mpbki2zm`+TS0601 | wall_thermostat |
| #531 | `_TZE204_ogkdpgy2`+TS0601 | air_quality_co2 |
| #511 | `_TZE284_awepdiwi`+TS0601 | soil_sensor |
| #513 | `_TZE284_hodyryli`+TS0601 | climate_sensor_zt08 |
| #506 | `_TZ3000_fllyghyj`+TS0201 | temphumidsensor3 |
| #388 | `_TZ3210_tgvtvdoc`+TS0207 | rain_sensor |

## Fixed this pass (BOTH)
| Issue | Gap | Fix |
|-------|-----|-----|
| #428 | `_TZE284_0ints6wl` on curtain_motor | → soil_sensor |
| #88 | e3oitdyu dual wall_dimmer | → dimmer_2_gang_tuya only |
| #79 | uj3f4wr5 dual shutter | → curtain_motor only |
| #76 | u3nv1jwk dual handheld | → button_wireless_4 only |
| #164 | otvn3lne dual PIR | → motion_sensor +TS0202 |
| #318/#323 | truncated 81yrt3l on power_meter | removed; clamp keeps 81yrt3lo |
| #388 | truncated tgvtvdo | left dead (never matches full); rain locked |

## User
Update Test after Auto-Publish. Re-pair if wrong driver (esp. soil #428, 2-gang dimmer #88).

Local only (not committed): issues-full.json / issues-meta.json

