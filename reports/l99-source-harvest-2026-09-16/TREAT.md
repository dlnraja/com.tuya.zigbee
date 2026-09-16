# L99 source harvest — 2026-09-16 (P2538)

Silent enrich only. Dual-app: **BOTH** (reliability). No forum POST. No invent pid.

## External / alt sources reviewed

| Source | Signal | App action |
|--------|--------|------------|
| CSA Zigbee 4.0 / Suzi / Zigbee Direct | Awareness; Homey stays 2.4 GHz ZCL+EF00 | Already P2537 SSOT; kept |
| Tuya MCU UART docs | v3.1–v3.5 time/seq | Already TuyaTimeSyncFormats |
| Z2M `TS0601_airbox` (`_TZE284_8b9zpaav`) | Official DP2/18/19/21/22 | **Locked** → `air_quality_co2`; fixed wrong DP1–4 map |
| Z2M `PM2.5_airbox` (`_TZE284_it9utkro`) | Sibling airbox | **Locked** → `air_quality_co2`; stripped from `climate_sensor` |
| ZHA #4971 | Same couple; community DP guess differed from Z2M | Prefer **Z2M herdsman** meta |
| Homey forum Tuya TX flood | Mesh starved by aggressive polls/reporting | Soft diag tip + SSOT `operationalRisks` |
| Z2M #28655 | 0x10 version spam / pack drain | Already MCUVersionHelper; reinforced in SSOT tip |
| Smoke `_TZE284_n4ttsck2` / garage `_TZE608_lapuuoke` | Already locked | No change (no degrade) |

## Contre quoi shipped

- `test/critical/p2538-l99-airbox-mesh-flood.test.js`
- Registry forbid climate for airbox couples
- `npm run check:p2538`

## Do not degrade

- Union mfr on `air_quality_co2` only
- Surgical strip of same couples from `climate_sensor` only (wrong driver)
- No compose cluster invent for Suzi/GP
- Soft diagnostics tips only
