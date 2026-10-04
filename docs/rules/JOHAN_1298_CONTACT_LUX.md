# Contact + illuminance door sensors (JohanBendz #1298 deep read)

Sources (links only, no copied text):
- https://github.com/JohanBendz/com.tuya.zigbee/issues/1298 (all comments, read 2026-10-03)
- https://github.com/JohanBendz/com.tuya.zigbee/pull/1508 (develop-0.4 profiles `contact_lux_hobeian`, `contact_lux_pay2byax`)
- Related interviews: JohanBendz #414, #1486, #1315. Explicitly NOT this family: #1013 (plain IAS contact, no lux), zbeacon DS01, #1403 (bed pressure).
- Z2M `src/devices/hobeian.ts` model ZG-102ZL (DP 1 contact inverted, 101 lux raw, 2 battery, 102 lux interval).

## Structured facts
| identity | transport seen | contact | lux | battery |
|---|---|---|---|---|
| HOBEIAN / ZG-102ZL | ZCL EP1 0,1,3,0x0400,0x0500 (+0xEF00 declared, unused in Johan interview); sleepy | IAS zone alarm1 | 0x0400 measuredValue, log-encoded | 0x0001 percentage /2 |
| _TZE200_pay2byax / TS0601 | newer interviews ZCL EP1 0,1,3,0x0400,0x0500 without 0xEF00; Z2M treats it as DP device | IAS alarm1 or DP1 (inverted) | 0x0400 or DP101 raw | 0x0001 or DP2 |

## Our rules
1. Native first: IAS zone + 0x0400 + powerConfiguration via UnifiedSensorBase. Lux decode is adaptive (`_decodeIlluminanceRaw`: values ≥5000 use 10^((v-1)/10000), smaller values are treated as linear lux). The Johan sample 33273 decodes to ~2100 lx.
2. Tuya DP path (1/2/101) stays as an additive fallback for firmwares that expose 0xEF00; it never overrides an IAS-originated value (ContactSourceLatch).
3. Exact pairs only: HOBEIAN|ZG-102ZL is served by `contact_sensor` alone (pid removed from `sensor_contact_zigbee`, 2026-10-03). `_TZE200_pay2byax|TS0601` stays on `contact_sensor_zigbee`.
4. Resolved 2026-10-04: `_TZE200_ijey4q29`, `_TZE200_ykglasuj`, `_TZE200_kf2hbko4` moved from climate_sensor to `contact_sensor_zigbee` (sources: Z2M ZG-102ZL, SmartThings Edge ef00 safety family, z4d certified 'Luminance Door', zigpy/zha test device); HOBEIAN ZG-102Z/ZG-102ZA now only on `contact_sensor` (same runtime family, battery %). Paired devices keep their driver.
5. Previously deferred leads (single source, need a second): `_TZE200_ijey4q29`, `_TZE200_ykglasuj`, `_TZE200_kf2hbko4` are listed by Z2M under ZG-102ZL but currently live on `climate_sensor`; DP102 lux-interval setting not exposed yet. ZG-102Z / ZG-102ZA (no lux) still dual on contact_sensor + sensor_contact_zigbee (HOBEIAN, not counted by the Tuya-style gate).
