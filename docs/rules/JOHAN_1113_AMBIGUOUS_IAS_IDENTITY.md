# Ambiguous IAS identities: one mfr/model, several physical products (JohanBendz #1113 deep read)

Sources (links only, no copied text), read 2026-10-04:
- https://github.com/JohanBendz/com.tuya.zigbee/issues/1113 (all comments; key: #issuecomment-5967014223, #issuecomment-5974581011, #issuecomment-5919531092)
- https://github.com/JohanBendz/com.tuya.zigbee/issues/1475 (SQ510A water detector, same public identity)
- https://github.com/JohanBendz/com.tuya.zigbee/issues/1008 (closed into #1113; Z2M evidence for the PIR)
- https://github.com/JohanBendz/com.tuya.zigbee/issues/925 (iHorn LH02121, deferred)
- https://github.com/JohanBendz/com.tuya.zigbee/issues/1481 and PR #1510 (separate exact IAS PIR + illuminance identities — different family)

## Structured facts
| identity | EP1 in / out | IAS zoneType | power | note |
|---|---|---|---|---|
| eWeLink / SNZB-03 (EZ-P1 PIR, #1113) | 0,3,1,0x0500,0x0020 / 0x0019 | motionSensor (0x000D) | battery, sleepy | swBuildId 0122052017 |
| eWeLink / SNZB-03 (SQ510A water, #1475) | same clusters | water (0x002A) expected | battery | same static identity as the PIR |
| iHorn / LH02121 (#925) | 0,3,0x0500 / – | not readable in the interview | sleepy | app scope unconfirmed |

## Our rules
1. A manufacturer/model couple that is known to ship as different physical products gets ONE dedicated driver whose alarm capability is chosen from the device's own IAS `zoneType` (`lib/sensors/IasZoneTypeRouter.js`), stored once in the device store. Never from the couple, never from driver-type tables.
2. Unknown or unreadable zoneType → no alarm capability yet, retry on the next wake/report; never default to motion or contact.
3. Water/smoke/CO zones accept alarm1 OR alarm2; motion/contact use alarm1.
4. The compose file carries no static alarm capability (the pairing card must not lie). Battery type stays `OTHER` (no invented cell type).
5. eWeLink|SNZB-03 → `sensor_ias_zonetype_ewelink` only (regression test `test/critical/johan-1113-ias-zonetype.test.js`). SNZB-03 under other manufacturers (e.g. SONOFF) is untouched.
6. Deferred: iHorn|LH02121 (scope + zoneType proof needed, no fingerprint added). Not merged with standard IAS+lux PIRs (#1481) or EF00 PIRs (#1321).
7. Leads noted (not acted on): pid SNZB-03 also sits on radiator_valve / device_radiator_valve_smart / device_air_purifier_plug / generic_diy cross-products (Tuya-style mfrs only, no real couple known).
