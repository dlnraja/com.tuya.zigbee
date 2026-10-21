# Protocols (summary in our words)

## Tuya EF00 over the air (Zigbee cluster 0xEF00, fact-checked 2026-10-21)
- Coordinator → device: 0x00 dataRequest (set DPs), 0x03 dataQuery (ask all DPs), 0x04 sendData, 0x10 mcuVersionRequest, 0x12/0x14 MCU OTA notify/block response, 0x24 mcuSyncTime (time answer), 0x25 gateway connection status, 0x61 weather sync. Source: [zigbee-herdsman cluster.ts](https://github.com/Koenkk/zigbee-herdsman/blob/master/src/zspec/zcl/definition/cluster.ts).
- Device → coordinator: 0x01 dataResponse, 0x02 dataReport, 0x05/0x06 activeStatusReport(Alt), 0x11 mcuVersionResponse, 0x13/0x15 MCU OTA block request/result, 0x24 mcuSyncTime (time request), 0x25 gateway status request, 0x60 weather request. Same source.
- Time answer = 8 bytes: 4-byte big-endian UTC seconds then 4-byte local seconds (UTC + zone + DST). Most devices use the 1970 epoch; some expect a 2000 epoch (Z2M option time_start: 1970/2000/off). Sources: [zhc tuya.ts](https://github.com/Koenkk/zigbee-herdsman-converters/blob/master/src/lib/tuya.ts), [Tuya Zigbee UART protocol](https://developer.tuya.com/en/docs/iot/tuya-zigbee-module-uart-communication-protocol?id=K9ear5khsqoty).
- DP datatypes: 0 raw, 1 bool, 2 value (4-byte BE), 3 string, 4 enum, 5 bitmap (1/2/4 bytes). Source: zhc tuya.ts dataTypes.
- Some devices only start reporting after a dataQuery on announce/rejoin (zhc onEvent). Sleepy devices: queue writes, flush on wake.

## Tuya module ↔ MCU serial (UART) protocol — not the same id space
- Frames 55 AA, version, 2-byte seq, command, 2-byte length, data, checksum = sum of all previous bytes mod 256. UART ids differ from EF00 ids: e.g. 0x04 module→MCU DP data, 0x05 MCU response, 0x06 MCU report (with linkage), 0x2C report without linkage, 0x28 query DP, 0x0B–0x0E MCU OTA, 0x24 time sync, 0x3A/0x3B weather, 0x2B low-power wake window. Source: [Tuya MCU standard protocol (Zigbee)](https://developer.tuya.com/en/docs/mcu-standard-protocol/mcusdk-zigbee-uart-protocol?id=Kdg17v4544p37).
- Locks use version byte 0x03 with the same 0x24 time layout. Source: [Tuya Zigbee lock MCU protocol](https://developer.tuya.com/en/docs/iot/zigbee-door-lock-universal-docking-agreement?id=K9bjcnh616mg5).

## Wi-Fi LAN 3.1–3.5 (fact-checked against tinytuya core)
- 3.1–3.4 frames start with prefix 0x000055AA; 3.5 uses prefix 0x00006699 with AES-GCM (auth tag; bad tag = frame dropped). Source: [tinytuya header.py / Monitor.py](https://github.com/jasonacox/tinytuya/tree/master/tinytuya/core).
- 3.1: AES-ECB with the local key, only on control payloads, plus an MD5-based signature; 3.2/3.3: AES-ECB on the payload behind a version header, CRC32 trailer; 3.4: session-key negotiation before use and HMAC-SHA256 trailer instead of CRC; 3.5: session key + GCM. Sources: tinytuya XenonDevice.py, [tuya-local](https://github.com/make-all/tuya-local), [localtuya](https://github.com/rospogrigio/localtuya).

## ZCL clusters & bound clusters
- Remotes send commands (onOff, levelControl, scenes, 0xE000/0xE001 Tuya) to the coordinator; Homey needs a BoundCluster to receive them. TS004F switches between command (dimmer) and event (scene) mode via manufacturer attribute 0x8004 tuyaOperationMode (enum8, 0=command, 1=event) on genOnOff (zhc tuya.ts). Source: [Athom zigbee-clusters](https://github.com/athombv/node-zigbee-clusters).

## OTA
- Images indexed by manufacturerCode + imageType + fileVersion, with sha512. Homey performs OTA itself; we only read queryNextImage requests. Source: [Koenkk zigbee-OTA](https://github.com/Koenkk/zigbee-OTA).
