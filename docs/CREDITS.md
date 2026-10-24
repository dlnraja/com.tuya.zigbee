# Credits & Contributors

> Auto-generated from fork scanning and PR analysis.
> Last updated: 2026-08-17

| Contributor | Fingerprints | PRs | Source |
|------------|-------------|-----|--------|
| gpmachado | TS011F plugs (`okaz9tjs`, `fgwhjm9j`), strip `cfnprab5`, ZCL 4-gang `lwthnp7j` | study of com.gpm.homesuite | GitHub |

Studied (GPL-3.0, no code copied): https://github.com/gpmachado/com.gpm.homesuite — onUninit teardown, Poll Control skip. Canonical credits: `/CREDITS.md`.

## New Fingerprints by Contributor


## P3017 — unknown commands and method chains (2026-10-24)

- Reporter of [JohanBendz/com.tuya.zigbee#619](https://github.com/JohanBendz/com.tuya.zigbee/issues/619): DP101/DP102 of `_TZ3210_cwamkvua` TS0202.
- Reporter of [dlnraja/com.tuya.zigbee#560](https://github.com/dlnraja/com.tuya.zigbee/issues/560): TRV06 logs with "unknown cmd" EF00 frames.
- Koenkk and contributors (zigbee-herdsman-converters, zigbee-herdsman, Zigbee2MQTT), zigpy/ZHA contributors, dresden elektronik (deCONZ), make-all (tuya-local), rospogrigio and xZetsubou (localtuya), jasonacox (tinytuya), kkossev (Hubitat drivers, ideas only), SmartThings Edge drivers, ioBroker.zigbee, Domoticz-Zigbee, Tasmota, ESPHome. Methods were studied and rewritten; see docs/knowledge/KB/CROSS_APP_METHODS.md.

## P3019 — coverage review (2026-10-24)

- Koenkk and contributors (zigbee-herdsman-converters `tuya.ts`): ZS-SF00 DP map, TS004F operation mode.
- YoshiWalsh (Tuya schema) and wiwill61 in [Koenkk/zigbee2mqtt#31445](https://github.com/Koenkk/zigbee2mqtt/issues/31445): sinxpbrl DPs.
- martinheie-ui in [JohanBendz/com.tuya.zigbee#1504](https://github.com/JohanBendz/com.tuya.zigbee/issues/1504): sinxpbrl MC101Z.
- TheJulianJES and zigpy contributors ([zha-device-handlers PR #2592](https://github.com/zigpy/zha-device-handlers/pull/2592)): `TuyaZB1888Cluster`.

## P3021c — `_TZ3000_amal63is` TS0002 dedicated driver (2026-10-24)

- Reporter of [JohanBendz/com.tuya.zigbee#128](https://github.com/JohanBendz/com.tuya.zigbee/issues/128) (batch 105): 2-gang wall switch reported as `_TZ3000_amal63is` / TS0002. New driver `switch_2gang_ts0002` (TS0002 only, runtime of `wall_switch_2gang_1way`) so the couple lives on exactly one driver; `switch_1gang` keeps its existing amal63is entry.

## P3021c — forum #2134 / #2093 / #2092 (2026-10-24)

- HOBEIAN `ZG-102ZL` DP1 contact polarity (`valueConverter.inverse`) and soil DP layouts
  (DP5 temperature scale, DP9 temperature_unit, DP14 battery_state, DP15 battery) — facts from
  Koenkk/zigbee-herdsman-converters `src/devices/hobeian.ts` and `src/devices/tuya.ts`
  (TS0601_soil, TS0601_soil_3, SGS02Z, HZ-SL10, ZS-SF00). Rewritten, no code copied.
- Field evidence: forum users Peter (#2134, diag f1e5b12d), blutch32 (#2093, diags 3690dfdb /
  1b2109ab) and Lucas360 (#2092, power shown as energy).
