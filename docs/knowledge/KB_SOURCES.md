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
| Homey Apps SDK docs | https://apps.developer.homey.app | Athom | SDK rules (links only) |
| Tuya developer docs (MCU/Zigbee serial) | https://developer.tuya.com/en/docs/iot | Tuya | EF00 command semantics (links only) |

Refresh: `scripts/kb/refresh.sh` (git fetch per mirror; rebuild only when HEAD changed; outputs byte-identical when unchanged).

## Alternative projects (P3017)

Scanned 2026-10-24 (Europe/Paris) for how they handle unknown commands, fallbacks, polling, magic packets, time sync and reporting. Incremental scan pointer = the commit or push date below; next scan starts from there.

| project | branch | licence | pointer | used for |
|---|---|---|---|---|
| [Koenkk/zigbee-herdsman-converters](https://github.com/Koenkk/zigbee-herdsman-converters) | master | MIT | eb823146c7 (2026-10-24) | tuya.ts private commands, tuyaDatapoints names, magic packet, mcuSyncTime |
| [Koenkk/zigbee-herdsman](https://github.com/Koenkk/zigbee-herdsman) | master | MIT | c1dcb1155e | manuSpecificTuya cluster commands |
| [Koenkk/zigbee2mqtt](https://github.com/Koenkk/zigbee2mqtt) | master | GPL-3.0 | pushed 2026-10-24 | ideas only |
| [zigpy/zha-device-handlers](https://github.com/zigpy/zha-device-handlers) | dev | Apache-2.0 | 1d6598c32a (2026-10-11) | Tuya private clusters, TSN dedup, rotate_type |
| [zigpy/zha](https://github.com/zigpy/zha) | dev | Apache-2.0 | — | quirks v2 behaviour |
| [dresden-elektronik/deconz-rest-plugin](https://github.com/dresden-elektronik/deconz-rest-plugin) | master | BSD-3-Clause | pushed 2026-09-10 | DDF read functions, refresh.interval |
| [make-all/tuya-local](https://github.com/make-all/tuya-local) | main | MIT | — | unknown DP exposure, DP refresh |
| [rospogrigio/localtuya](https://github.com/rospogrigio/localtuya) | master | GPL-3.0 | pushed 2026-01-29 | ideas only |
| [xZetsubou/hass-localtuya](https://github.com/xZetsubou/hass-localtuya) | master | GPL-3.0 | pushed 2026-10-21 | ideas only |
| [jasonacox/tinytuya](https://github.com/jasonacox/tinytuya) | master | MIT | pushed 2026-10-13 | DP_QUERY / UPDATEDPS |
| [kkossev/Hubitat](https://github.com/kkossev/Hubitat) | development | none stated | pushed 2026-10-20 | ideas only (no licence: nothing reused) |
| [SmartThingsCommunity/SmartThingsEdgeDrivers](https://github.com/SmartThingsCommunity/SmartThingsEdgeDrivers) | main | Apache-2.0 | pushed 2026-10-23 | sub-driver chain, health check |
| [ioBroker/ioBroker.zigbee](https://github.com/ioBroker/ioBroker.zigbee) | master | MIT | pushed 2026-10-16 | polling option |
| [domoticz/domoticz](https://github.com/domoticz/domoticz) | development | GPL-3.0 | — | ideas only |
| [zigbeefordomoticz/Domoticz-Zigbee](https://github.com/zigbeefordomoticz/Domoticz-Zigbee) | stable9 | GPL-3.0 | — | ideas only |
| [arendst/Tasmota](https://github.com/arendst/Tasmota) | development | GPL-3.0 | — | raw unknown attribute logging (idea) |
| [esphome/esphome](https://github.com/esphome/esphome) | dev | see repo | — | Tuya DP query at boot (idea) |
| [Koenkk/zigbee-OTA](https://github.com/Koenkk/zigbee-OTA) | master | GPL-3.0 | — | OTA index |
| [blakadder/zigbee](https://github.com/blakadder/zigbee) | master | MIT | — | white-label models |
| [JohanBendz/com.tuya.zigbee](https://github.com/JohanBendz/com.tuya.zigbee) | SDK3 | see repo | pushed 2026-10-08 | issue #619 DP101/DP102 |

Forum topics scanned for unknown commands: Homey Community 140352 and 26439 (anonymised, facts only).

## P3019 sources (2026-10-24)

| source | pointer | used for |
|---|---|---|
| [Koenkk/zigbee-herdsman-converters](https://github.com/Koenkk/zigbee-herdsman-converters) `src/devices/tuya.ts` | 1c90116 | ZS-SF00 DP map; HZ-WT02 TS0049 0xE001/0xFE countdown; TS004F 0x8004 mode |
| [Koenkk/zigbee2mqtt#31445](https://github.com/Koenkk/zigbee2mqtt/issues/31445) | issue | sinxpbrl Tuya schema (DP2, DP6, DP7, DP101, DP102) |
| [JohanBendz/com.tuya.zigbee#1504](https://github.com/JohanBendz/com.tuya.zigbee/issues/1504) | issue | sinxpbrl MC101Z report |
| [zigpy/zha-device-handlers PR #2592](https://github.com/zigpy/zha-device-handlers/pull/2592) | PR | `TuyaZB1888Cluster` (empty: 0x1888 stays open) |
| make-all/tuya-local | main | checked for TS0726 DP18–20: Wi-Fi only, not used |
