# KB sources (P-KB)

Mirrors live outside the repo (/workspace/kb/<source>, shallow git clones). The repo keeps only ids + facts + commit-pinned links (data/kb/couples.json, docs/knowledge/KB/). No upstream prose is copied.

| source | link | licence | used for |
|---|---|---|---|
| Zigbee2MQTT docs | https://github.com/Koenkk/zigbee2mqtt.io | GPL-3.0 | device pages (model, vendor, exposes, options), guide outline |
| zigbee-herdsman-converters | https://github.com/Koenkk/zigbee-herdsman-converters | MIT | fingerprints (tuya.fingerprint / zigbeeModel) |
| ZHA device handlers | https://github.com/zigpy/zha-device-handlers | Apache-2.0 | quirk fingerprints, DP ids |
| deCONZ DDF | https://github.com/dresden-elektronik/deconz-rest-plugin | BSD-3-Clause | DDF fingerprints, items |
| Blakadder templates | https://github.com/blakadder/zigbee | MIT | white-label models |
| tuya-local | https://github.com/make-all/tuya-local | MIT | Wi-Fi product ids, DP ids, entities |
| tinytuya | https://github.com/jasonacox/tinytuya | MIT | LAN protocol versions/constants |
| localtuya | https://github.com/rospogrigio/localtuya | GPL-3.0 | LAN protocol notes (ideas only) |
| Johan Bendz Tuya Zigbee | https://github.com/JohanBendz/com.tuya.zigbee | GPL-3.0 | driver couples |
| Athom zigbee-clusters | https://github.com/athombv/node-zigbee-clusters | MIT | cluster/attribute ids |
| Koenkk zigbee-OTA | https://github.com/Koenkk/zigbee-OTA | see repo | OTA image index (code, type, version, sha512) |
| Homey Apps SDK docs | https://apps.developer.homey.app (the old GitHub repo athombv/homey-apps-sdk-v3-docs is gone, 404 since 2026-10-24) | Athom | SDK rules (links only) |
| Tuya developer docs (MCU/Zigbee serial) | https://developer.tuya.com/en/docs/iot | Tuya | EF00 command semantics (links only) |

Refresh: `scripts/kb/refresh.sh` (git fetch per mirror; rebuild only when HEAD changed; outputs byte-identical when unchanged).

## Alternative projects (P3017)

Scanned 2026-10-24 (Europe/Paris) for how they handle unknown commands, fallbacks, polling, magic packets, time sync and reporting. Incremental scan pointer = the commit or push date below; next scan starts from there.

| project | branch | licence | pointer | used for |
|---|---|---|---|---|
| [Koenkk/zigbee-herdsman-converters](https://github.com/Koenkk/zigbee-herdsman-converters) | master | MIT | 7462b54 (2026-10-25) | tuya.ts private commands, tuyaDatapoints names, magic packet, mcuSyncTime |
| [Koenkk/zigbee-herdsman](https://github.com/Koenkk/zigbee-herdsman) | master | MIT | 6764136 (2026-10-25) | manuSpecificTuya cluster commands |
| [Koenkk/zigbee2mqtt](https://github.com/Koenkk/zigbee2mqtt) | master | GPL-3.0 | pushed 2026-10-24 (checked 2026-10-25) | ideas only |
| [zigpy/zha-device-handlers](https://github.com/zigpy/zha-device-handlers) | dev | Apache-2.0 | 2b1abce (2026-10-26) | Tuya private clusters, TSN dedup, rotate_type |
| [zigpy/zha](https://github.com/zigpy/zha) | dev | Apache-2.0 | 6decce1ed4 (2026-10-24, deps only) | quirks v2 behaviour |
| [dresden-elektronik/deconz-rest-plugin](https://github.com/dresden-elektronik/deconz-rest-plugin) | master | BSD-3-Clause | pushed 2026-09-10 | DDF read functions, refresh.interval |
| [make-all/tuya-local](https://github.com/make-all/tuya-local) | main | MIT | 2454696 (2026-10-26) | unknown DP exposure, DP refresh |
| [rospogrigio/localtuya](https://github.com/rospogrigio/localtuya) | master | GPL-3.0 | pushed 2026-01-29 | ideas only |
| [xZetsubou/hass-localtuya](https://github.com/xZetsubou/hass-localtuya) | master | GPL-3.0 | pushed 2026-10-21 | ideas only |
| [jasonacox/tinytuya](https://github.com/jasonacox/tinytuya) | master | MIT | pushed 2026-10-13 | DP_QUERY / UPDATEDPS |
| [kkossev/Hubitat](https://github.com/kkossev/Hubitat) | development | none stated | pushed 2026-10-20 | ideas only (no licence: nothing reused) |
| [SmartThingsCommunity/SmartThingsEdgeDrivers](https://github.com/SmartThingsCommunity/SmartThingsEdgeDrivers) | main | Apache-2.0 | 3a48d3d84f (2026-10-26) | sub-driver chain, health check |
| [ioBroker/ioBroker.zigbee](https://github.com/ioBroker/ioBroker.zigbee) | master | MIT | pushed 2026-10-16 | polling option |
| [domoticz/domoticz](https://github.com/domoticz/domoticz) | development | GPL-3.0 | pushed 2026-10-19 | ideas only |
| [zigbeefordomoticz/Domoticz-Zigbee](https://github.com/zigbeefordomoticz/Domoticz-Zigbee) | stable9 | GPL-3.0 | pushed 2026-10-24 (no stable9 commit) | ideas only |
| [arendst/Tasmota](https://github.com/arendst/Tasmota) | development | GPL-3.0 | pushed 2026-10-24 (no Zigbee file change) | raw unknown attribute logging (idea) |
| [esphome/esphome](https://github.com/esphome/esphome) | dev | see repo | b90e1e43a3 (2026-10-24, components/tuya) | Tuya DP query at boot (idea) |
| [Koenkk/zigbee-OTA](https://github.com/Koenkk/zigbee-OTA) | master | GPL-3.0 | df5e8e13f0 (2026-10-25, index.json unchanged) | OTA index |
| [blakadder/zigbee](https://github.com/blakadder/zigbee) | master | MIT | d96e8aaf72 | white-label models |
| [JohanBendz/com.tuya.zigbee](https://github.com/JohanBendz/com.tuya.zigbee) | SDK3 | see repo | 328d24e (v0.2.76); issues updated to 2026-10-26 read | issue #619 DP101/DP102; #1534 `_TZ3000_pd9mpyh4` TS0044 interview |

Forum topics scanned for unknown commands: Homey Community 140352 and 26439 (anonymised, facts only).

## P3019 sources (2026-10-24)

| source | pointer | used for |
|---|---|---|
| [Koenkk/zigbee-herdsman-converters](https://github.com/Koenkk/zigbee-herdsman-converters) `src/devices/tuya.ts` | 1c90116 | ZS-SF00 DP map; HZ-WT02 TS0049 0xE001/0xFE countdown; TS004F 0x8004 mode |
| [Koenkk/zigbee2mqtt#31445](https://github.com/Koenkk/zigbee2mqtt/issues/31445) | issue | sinxpbrl Tuya schema (DP2, DP6, DP7, DP101, DP102) |
| [JohanBendz/com.tuya.zigbee#1504](https://github.com/JohanBendz/com.tuya.zigbee/issues/1504) | issue | sinxpbrl MC101Z report |
| [zigpy/zha-device-handlers PR #2592](https://github.com/zigpy/zha-device-handlers/pull/2592) | PR | `TuyaZB1888Cluster` (empty: 0x1888 stays open) |
| make-all/tuya-local | main | checked for TS0726 DP18–20: Wi-Fi only, not used |
## DP + endpoint coverage (P3018)

| data | upstream | licence | pointer | used for |
|---|---|---|---|---|
| `scripts/data/z2m-tuya-dps.json` | [Koenkk/zigbee-herdsman-converters](https://github.com/Koenkk/zigbee-herdsman-converters) `src/devices/*.ts` tuyaDatapoints | MIT | cff1de4731 | exact couple → DP name + converter token (facts only, rebuilt daily by scripts/kb/refresh.sh) |
| `scripts/data/zha-tuya-dps.json` | [zigpy/zha-device-handlers](https://github.com/zigpy/zha-device-handlers) Tuya quirks (KB index) | Apache-2.0 | 1d6598c32a | DP numbers per couple (coverage audit) |
| `scripts/data/zha-quirk-dps.json` | [zigpy/zha-device-handlers](https://github.com/zigpy/zha-device-handlers) `zhaquirks/**` (QuirkBuilder v2 chains + v1 `dp_to_attribute`) | Apache-2.0 | 1d6598c32a | P3018b: exact per-quirk couple → DP + attribute name + scaling (ZCL centi-units converted); fill-only into the catalogue |
| `scripts/data/deconz-tuya-dps.json` | [dresden-elektronik/deconz-rest-plugin](https://github.com/dresden-elektronik/deconz-rest-plugin) `devices/**/*.json` DDF (`fn: tuya` items) | BSD-3-Clause | a4c17adfa0 | P3018b: exact couple → dpid + item + scaling (deCONZ 0.01 units converted); fill-only into the catalogue |
| `lib/zigbee/data/inferred-dp-family.json` | derived from the catalogue rows above (no new upstream) | — | — | P3018b: optional **inferred** family candidates (pid+driver / driver / name+DP id), confirmed per device at runtime by `lib/zigbee/InferredDpLayer.js` (master) |
| `lib/zigbee/EndpointCoverage.js` | ZCL specification (cluster ids, measuredValue scaling) | — | — | passive per-endpoint routing |


## One couple = one driver (P3018b)

| couple(s) | owner | upstream pointer (Koenkk/zigbee-herdsman-converters @cff1de4731) |
|---|---|---|
| `_TZE200_2pddnnrk`, `_TZE200_jsaqgakf` | rain_sensor | `src/devices/hobeian.ts` ZG-223Z |
| `_TZE200_4mh6tyyo`, `_TZE204_dcnsggvz`, `_TZE204_9qhuzgo0`, `_TZE204_5cuocqty` | dimmer_1_gang_tuya | `src/devices/tuya.ts`, `src/devices/avatto.ts` ZDMS16-1 |
| `_TZE200_bjzrowv2`, `_TZE284_r3szw0xr`, `_TZE200_eqpaxqdv` | curtain_motor | `src/devices/tuya.ts` covers, KnockautX PIMS3028 |
| `_TZE200_locansqn` | lcdtemphumidsensor | `src/devices/nous.ts` SZ-T04 |
| `_TZE200_ntcy3xu1` | smoke_sensor2 | `src/devices/tuya.ts` smoke (smoke/tamper/battery) |
| `_TZE200_rgeapp2c` | panel_switch_cover_tuya | `src/devices/tuya.ts` Semicom panel |
| `_TZE200_zl1kmjqx` | lcdtemphumidsensor_3 | `src/devices/tuya.ts` temp/humidity |
| `_TZE204_6fk3gewc`, `_TZE284_6fk3gewc` | wall_switch_1gang_1way | `src/devices/weten.ts` PCI E |
| `_TZE204_mrffaamu`, `_TZE284_mrffaamu`, `_TZE284_9xstqowh` | smart_breaker | `src/devices/tuya.ts` Tongou TOQCB2-80 |
| `_TZE204_loejka0i`, `_TZE284_loejka0i` | energy_meter_3phase | `src/devices/nous.ts` D4Z |
| HOBEIAN `CK-BL702-MWS-01(7016)` | presence (not vibration_sensor) | `src/devices/hobeian.ts` ZG-205Z/A; zigpy/zha-device-handlers `tuya_motion.py` |
| `_TYST11_jeaxp72v` / `eaxp72v` | device_radiator_valve | `src/devices/siterwell.ts` GS361A-H04 |
| `_TZ3000_cet6ch1r` TS130F EP2 0x0102 | curtain_motor_wall (passive EP2 info) | `src/lib/tuya.ts` cover_options: EP2 = calibration "to_close", moesCalibrationTime ÷10 s |
| `_TZE200_9cqcpkgb` | soil_sensor | `src/devices/tuya.ts` TS0601_soil |
| `_TZE284_33bwcga2`, `_TZE284_3urschql`, `_TZE284_ap9owrsa`, `_TZE284_nhgdf6qr`, `_TZE284_wckqztdq` | soil_sensor | `src/devices/tuya.ts` TS0601_soil_3 (GIEX GX04/GX06) |
| `_TZE284_k7p2q5d9`, `_TZE284_65gzcss7`, `_TZE284_yzr43ayq` | soil_sensor | `src/devices/tuya.ts` Arteco ZS-300Z/302Z/304Z |

## Daily refresh log

- 2026-10-27: changed = ZHA quirks 2b1abce, tuya-local 2454696 (Wi-Fi only), SmartThings 3a48d3d84f (non-Tuya), Johan 328d24e. Unchanged = zhc 7462b54, deCONZ, Blakadder, tinytuya, localtuya, zigbee-clusters, zigbee-OTA, Hubitat, ioBroker, Tasmota, Domoticz. Notes: [UPSTREAM_DAILY_2026-10-27.md](UPSTREAM_DAILY_2026-10-27.md).
- 2026-10-26: changed = zhc 7462b54, herdsman 6764136, ZHA quirks d54cf9e, tuya-local 8de6b3c (Wi-Fi only), zigbee-OTA 7798da2 (index.json changed), z2m docs f39694b, Tasmota 63c3861. Unchanged = blakadder, deCONZ, domoticz, hubitat, ioBroker, Johan, localtuya, SmartThings, tinytuya, zigbee-clusters. Notes: [UPSTREAM_DAILY_2026-10-26.md](UPSTREAM_DAILY_2026-10-26.md).
- 2026-10-25: changed = tuya-local (c6ea7984d6), zigbee-OTA (df5e8e13f0, index.json unchanged), esphome Tuya (b90e1e43a3), zha deps. Unchanged = zhc eb823146c7, herdsman c1dcb11, z2m docs 2d9af8d, ZHA quirks 1d6598c, deCONZ a4c17ad, Blakadder d96e8aa, tinytuya 3c0a687, localtuya 59c95cd, Johan code 328d24e, zigbee-clusters b859be7. Notes: [UPSTREAM_DAILY_2026-10-25.md](UPSTREAM_DAILY_2026-10-25.md).
