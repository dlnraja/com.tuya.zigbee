# Native vs non-native Zigbee clusters

Generated from `data/native-matrix.json` (`node scripts/gen/native-matrix.js`). Native = class in athombv zigbee-clusters; capabilities = homey-zigbeedriver system mappings. Interviews scanned: 122.

Rules (constitution D1/D2): native first; non-native clusters are additive fallbacks and never mandatory for pairing. Gate: `npm run validate:native-matrix`.

| Cluster | Name | Native | Homey system capabilities | Interviews | Drivers (endpoint manifest) |
|---|---|---|---|---|---|
| 0x0000 | basic | yes | — | 122 | 381 |
| 0x0001 | powerConfiguration | yes | alarm_battery, measure_battery | 45 | 87 |
| 0x0002 | deviceTemperature | yes | measure_temperature | 0 | 1 |
| 0x0003 | identify | yes | — | 66 | 125 |
| 0x0004 | groups | yes | — | 85 | 161 |
| 0x0005 | scenes | yes | — | 81 | 158 |
| 0x0006 | onOff | yes | onoff | 53 | 186 |
| 0x0007 | onOffSwitch | yes | — | 1 | 1 |
| 0x0008 | levelControl | yes | dim | 11 | 55 |
| 0x0009 | alarms | yes | — | 0 | 0 |
| 0x000A | time | yes | — | 93 | 2 |
| 0x000C | analogInput | yes | — | 0 | 0 |
| 0x000D | analogOutput | yes | — | 0 | 0 |
| 0x000E | analogValue | yes | — | 0 | 0 |
| 0x000F | binaryInput | yes | alarm_contact, alarm_heat, alarm_motion, alarm_smoke, alarm_water | 0 | 0 |
| 0x0010 | binaryOutput | yes | — | 0 | 0 |
| 0x0011 | binaryValue | yes | — | 0 | 0 |
| 0x0012 | multistateInput | yes | — | 0 | 9 |
| 0x0013 | multistateOutput | yes | — | 0 | 0 |
| 0x0014 | multistateValue | yes | — | 0 | 0 |
| 0x0019 | ota | yes | — | 102 | 1 |
| 0x001A | powerProfile | yes | — | 0 | 0 |
| 0x0020 | pollControl | yes | — | 2 | 4 |
| 0x0021 | Green Power proxy (ZCL standard; not in zigbee-clusters 2.6.0) | **no** | — | 32 | 0 |
| 0x0100 | shadeConfiguration | yes | — | 0 | 0 |
| 0x0101 | doorLock | yes | — | 0 | 2 |
| 0x0102 | windowCovering | yes | windowcoverings_set, windowcoverings_state, windowcoverings_tilt_set | 3 | 9 |
| 0x0200 | pumpConfigurationAndControl | yes | — | 0 | 0 |
| 0x0201 | thermostat | yes | — | 0 | 8 |
| 0x0202 | fanControl | yes | — | 0 | 0 |
| 0x0300 | colorControl | yes | light_hue, light_mode, light_saturation, light_temperature | 4 | 34 |
| 0x0301 | ballastConfiguration | yes | — | 0 | 0 |
| 0x0400 | illuminanceMeasurement | yes | measure_luminance | 6 | 14 |
| 0x0401 | illuminanceLevelSensing | yes | — | 0 | 0 |
| 0x0402 | temperatureMeasurement | yes | measure_temperature | 10 | 18 |
| 0x0403 | pressureMeasurement | yes | measure_pressure | 0 | 0 |
| 0x0404 | flowMeasurement | yes | measure_water | 0 | 0 |
| 0x0405 | relativeHumidity | yes | measure_humidity | 10 | 15 |
| 0x0406 | occupancySensing | yes | alarm_contact, alarm_motion | 0 | 6 |
| 0x0500 | iasZone | yes | — | 25 | 38 |
| 0x0501 | iasACE | yes | — | 3 | 5 |
| 0x0502 | iasWD | yes | — | 1 | 1 |
| 0x0702 | metering | yes | meter_power | 14 | 19 |
| 0x0B04 | electricalMeasurement | yes | measure_current, measure_power, measure_voltage | 14 | 19 |
| 0x0B05 | diagnostics | yes | — | 5 | 0 |
| 0x1000 | touchlink | yes | — | 13 | 13 |
| 0x1888 | unknown (seen on Zbeacon TS0001) | **no** | — | 1 | 0 |
| 0x4000 | unknown | **no** | — | 2 | 1 |
| 0xE000 | Tuya private (E000) | **no** | — | 30 | 29 |
| 0xE001 | Tuya private (E001) | **no** | — | 27 | 14 |
| 0xE002 | Tuya private (E002) | **no** | — | 2 | 3 |
| 0xE004 | unknown | **no** | — | 1 | 1 |
| 0xED00 | unknown | **no** | — | 21 | 3 |
| 0xEE00 | unknown | **no** | — | 0 | 1 |
| 0xEF00 | Tuya DP (private) | **no** | — | 51 | 169 |
| 0xEF01 | Tuya private | **no** | — | 0 | 0 |
| 0xFC00 | Philips/Signify manufacturer-specific (Hue buttons: RWL022, RDM001) | **no** | — | 2 | 0 |
| 0xFC01 | manufacturer-specific (seen on Zbeacon TS0505B) | **no** | — | 1 | 0 |
| 0xFC03 | manufacturer-specific (seen on Zbeacon TS0505B) | **no** | — | 1 | 0 |
| 0xFC11 | manufacturer-specific | **no** | — | 1 | 1 |
| 0xFC57 | SONOFF manufacturer-specific (MINI-ZBRBS) | **no** | — | 1 | 0 |
