# Johan L99 recursive harvest → OUR apps (2026-09-28 / P2759)

Silent only. Never forum POST. Never invent pid. Multi-pid/OEM/white-label per mfr = NORMAL.

## Sources scanned

| Source | Note |
|--------|------|
| JohanBendz/com.tuya.zigbee issues #1041–#1491 | open + closed |
| PRs #1372–#1490 (+ draft #1470 backlog) | adopted list |
| Forks (top fresh): bertvm, oskarirauta, tecnicohome360-dev, … | tips only |
| JohanBendz/com.lidl, tech.sonoff, Hue zigbee | adjacent inspiration, not wholesale copy |

## Transpose (verified couples)

| Couple | Johan ref | OUR driver | Action |
|--------|-----------|------------|--------|
| `_TZE200_pay2byax`+TS0601 | #1486 | `contact_sensor_zigbee` | already P2758 |
| `_TZE284_6ycgarab`+TS0601 | #1487 | `smoke_sensor` | already P2758 |
| `_TZE200_vrcfo4i0`+TS0601 | #1489 air-monitor | `gas_sensor` | **P2759 strip IAS contact** |
| `_TZ3002_vaq2bfcu`+TS0726 | #1478 Moes SR-ZS | `switch_3gang` | **P2759 move off 1gang** |
| TS0207 leak family | #1041 | `water_leak_sensor` | **P2759 union mfrs** |
| `_TZE200_locansqn` LCD | #1474 | `lcdtemphumidsensor_3` | response+reporting already |
| `_TZE200_mgxy2d9f`+TS0601 | #1483/#1490 | `motion_sensor` | covered |
| `_TZ3210_ddigca5n`+TS011F | #1452 | `plug_energy_monitor` | covered |
| HOBEIAN ZG-305Z | #1435 | `switch_2gang` | covered |
| HOBEIAN ZG-222Z | #1488 | `water_leak_sensor` | covered |
| `_TZ3000_b4awzgct`+TS0041 | #1463 | `button_wireless_1` | covered |
| `_TZE608_lapuuoke`+TS0603 | #1468 | `garage_door_opener` | covered |

## Soft / NEED_INTERVIEW (no invent)

- `_TZE284_gyzlwu5q` smoke+TH (#1480) — currently on `climate_sensor`+TS0601; smoke DPs need interview before move
- Moes SR-ZS scene/mode DP18–20 — TX mode writes timeout (Johan); keep OnOff 3-EP path only for now
- Capability post-12.2 alarms (#1491) — MASTER_ONLY strategy later

## Antigravity usage monitor

Still **report-only** (IDE quota). Not Homey.

## Dual-app

BOTH reliability locks → master + Bastien + Stable surgical backport.

## P2760 wave2 (same day)

| Couple | Johan | OUR | Action |
|--------|-------|-----|--------|
| TS0207 leak mfrs (#1041) | water_leak_sensor | keep IAS; strip tuya twin | collision heal |
| `_TZE200_kb5noeto`+TS0601 | #1481 IAS motion | `pir_sensor_2` | off radar EF00 |
| `_TZ3000_air9m6af`+TS011F | #1485 4-socket | `socket_power_strip_four_two` | off usb_dongle |


## P2761 — latest Johan comments (2026-09-28 evening UTC)

| Couple | Johan | Action |
|--------|-------|--------|
| Fantem `_TZ3210_*`+TS0202 ZB003-X | #207 | `motion_sensor`; strip `wall_dimmer_tuya` |
| `_TZ3000_0hkmcrza`+TS0203 | #1155 | `contact_sensor`; strip climate |
| `_TZ1800_ladpngdx`+TS0211 | #161 | `doorbell`; strip climate |
| `_TZ3000_hgu1dlak`+TS0202 | #613 | `pir_sensor_2`; strip climate |
| tank DP2 cm / DP19-21 mm | #1477 | already correct; WHY lock |
| `_TZ3000_5k5vh43t`+TS0207 | #1206 | soft NEED_INTERVIEW — keep `zigbee_repeater` |
| `_TZ3000_x8q36xwf` false-closed | #1143 | already zoneStatus-command path; no invent |

