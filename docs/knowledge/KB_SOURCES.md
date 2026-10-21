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
