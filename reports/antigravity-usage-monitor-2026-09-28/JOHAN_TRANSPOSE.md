# Johan Bendz transpose (silent) — 2026-09-28 (P2758 refresh)

Never forum POST. Ideas only → our sacred couples. Multi-pid / OEM / white-label per mfr is NORMAL.

| Johan | State | Our mapping (no invent pid) | Action |
|-------|-------|------------------------------|--------|
| PR #1248 Tuya battery reporting | closed | P2689/P2685/**P2757** listen-only coin | BOTH shipped |
| #1041 TS0207 IAS water-leak battery | open | `water_leak_sensor` + PowerClusterPolicy skip | keep |
| #1481 `_TZE200_kb5noeto` IAS motion+batt+lux | open | `presence_sensor_radar` (ZG-204ZM family) | keep couple |
| #1483 `_TZE200_mgxy2d9f` DP1/DP4 | open | `motion_sensor` | keep |
| #1482 HOBEIAN `_TZE200_y8jijhba` radar | open | `presence_sensor_radar` | keep (multi-pid HOBEIAN OK) |
| #1488 HOBEIAN ZG-222Z leak | open | `water_leak_sensor` ZG-222* | NEED interview pid if blank |
| #1480 `_TZE284_gyzlwu5q` smoke+TH | open | listed on `climate_sensor` (mfr, no TS0601 yet) | soft — do not invent TS0601 onto smoke |
| #1487 `_TZE284_6ycgarab` smoke+CO | open | **`smoke_sensor`+TS0601** | **P2758 removed from radar** |
| #1486 `_TZE200_pay2byax` door+lux | open | **`contact_sensor_zigbee`+TS0601** | **P2758 removed from IAS contact_sensor** |
| #1485 `_TZ3000_air9m6af`+TS011F strip | open | `usb_dongle_triple` already has TS011F | leave (no invent strip driver) |
| #1489 `_TZE200_vrcfo4i0` air-monitor | open | `gas_sensor` has TS0601 | soft verify DPs later |
| #366 Neo siren `_TZE200_t1blo2bj`+TS0601 | historic | siren path if present | battery+USB = mains strip phantom |

## Antigravity Usage Monitor

Clone `tuckiestudio/antigravity-usage-monitor` = **VS Code IDE quota extension**.  
**Do not integrate into Homey.** Report-only: `VERDICT.md`.
