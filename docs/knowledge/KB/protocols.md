# Protocols (summary in our words)

## Tuya EF00 / MCU (Zigbee)
- Cluster 0xEF00 carries datapoints (DP id, type, length, value). Commands seen: 0x00 set, 0x01/0x02 report, 0x03 query, 0x10/0x11 MCU version, 0x24 time request (we answer UTC + local, 4+4 bytes), 0x25 gateway status. Sources: [zhc tuya.ts](https://github.com/Koenkk/zigbee-herdsman-converters/blob/master/src/lib/tuya.ts), [deCONZ DPs](https://github.com/dresden-elektronik/deconz-rest-plugin/wiki/Tuya-Data-Point-Protocol), [Tuya MCU serial protocol](https://developer.tuya.com/en/docs/iot/tuya-zigbee-module-uart-communication-protocol?id=K9ear5khsqoty).
- DP types: 0 raw, 1 bool, 2 value (4-byte BE), 3 string, 4 enum, 5 bitmap.
- Sleepy devices: queue writes, flush on wake; send time at most every 30 min.

## Wi-Fi LAN 3.1–3.5
- 3.1 AES-ECB on payload with MD5 signature; 3.3 AES-ECB whole payload with version header; 3.4 adds session-key negotiation and HMAC-SHA256; 3.5 uses AES-GCM with a new 0x6699 frame prefix. Sources: [tinytuya](https://github.com/jasonacox/tinytuya), [tuya-local](https://github.com/make-all/tuya-local), [localtuya](https://github.com/rospogrigio/localtuya).

## ZCL clusters & bound clusters
- Remotes send commands (onOff, levelControl, scenes, 0xE000/0xE001 Tuya) to the coordinator; Homey needs a BoundCluster to receive them. TS004F switches between dimmer and scene mode via attribute 0x8004 on onOff. Source: [Athom zigbee-clusters](https://github.com/athombv/node-zigbee-clusters).

## OTA
- Images indexed by manufacturerCode + imageType + fileVersion, with sha512. Homey performs OTA itself; we only read queryNextImage requests. Source: [Koenkk zigbee-OTA](https://github.com/Koenkk/zigbee-OTA).
