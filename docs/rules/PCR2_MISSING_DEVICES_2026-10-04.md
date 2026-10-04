# PC harvest r2, item 1: missing devices (per couple)

| Couple | Verdict | Placement | Evidence |
|---|---|---|---|
| `_TZ3210_2uollq9d` / TS011F (+ `_TZ3000_2uollq9d`) | added | plug_energy_monitor | BSEED metering socket: [zhc #11994](https://github.com/Koenkk/zigbee-herdsman-converters/issues/11994), [Z2M #28785](https://github.com/Koenkk/zigbee2mqtt/issues/28785); interview OnOff + 0x0702 + 0x0B04. Removed from sensor_gas_presence (wrong family; both drivers list TS0601, so it became a real collision). |
| `_TZ3210_nuenzetq` / TS0002, `_TZ3000_nuenzetq` / TS0002 | added / moved | switch_2gang | Scimagic ZG-2002-RF 2-relay board: [zhc #12494](https://github.com/Koenkk/zigbee-herdsman-converters/issues/12494), [romasku device_db](https://github.com/romasku/tuya-zigbee-switch/blob/main/device_db.yaml). `_TZ3000_nuenzetq` left button_wireless_2 (a real couple collision on TS0002; paired devices keep their driver). |
| `Zbeacon` / TS0001 | new exact driver | switch_zbeacon_ts0001 | Interview in [zha-device-handlers #4406](https://github.com/zigpy/zha-device-handlers/issues/4406) (on/off relay, 0x1888, 0xE000/0xE001), [pvvx notes](https://pvvx.github.io/Zbeacon-TS0001/). Brand-wide mfr, so an exact driver avoids cartesian collisions (Zbeacon is also a TS011F plug, DS01 contact, TH01 sensor). |
| `Zbeacon` / TS0505B | new exact driver | bulb_zbeacon_ts0505b | [Z2S supported devices](https://github.com/lsroka76/Z2S_Library/blob/main/supported-devices.md) (RGBW bulb); interview 0x0300 color control. |
| `eWeLight` / TS0502B | deferred (R11) | — | the harvested interview has the same signature as eWeLight ZB-CL01/TS0205 from the same forum page: likely misattributed. Needs a real interview. |
| `HEIMAN` / RC-EF-3.0, `iHorn` / LH02121, `SONOFF` / MINI-ZBRBS, `Signify Netherlands B.V.` / RDM001 | pending | — | real interviews (IAS ACE remote, IAS zone, 0x0102 window covering + 0xFC57/0xFC11, Hue 0xFC00 buttons); each needs an exact driver with its own runtime; queued in master_queue. |

Credits: Zigbee2MQTT / zigbee-herdsman-converters, zigpy, romasku/tuya-zigbee-switch, pvvx, Z2S library contributors (CREDITS.md).
