# Native vs non-native Zigbee clusters

Generated from `data/native-matrix.json` (`node scripts/gen/native-matrix.js`). Native = class in athombv zigbee-clusters; capabilities = homey-zigbeedriver system mappings. Interviews scanned: 19.

Rules (constitution D1/D2): native first; non-native clusters are additive fallbacks and never mandatory for pairing. Gate: `npm run validate:native-matrix`.

| Cluster | Name | Native | Homey system capabilities | Interviews | Drivers (endpoint manifest) |
|---|---|---|---|---|---|
| 0x0000 | basic | yes | — | 19 | 369 |
| 0x0001 | powerConfiguration | yes | alarm_battery, measure_battery | 10 | 84 |
| 0x0002 | deviceTemperature | yes | measure_temperature | 0 | 1 |
| 0x0003 | identify | yes | — | 7 | 118 |
| 0x0004 | groups | yes | — | 8 | 152 |
| 0x0005 | scenes | yes | — | 8 | 149 |
| 0x0006 | onOff | yes | onoff | 5 | 181 |
| 0x0007 | onOffSwitch | yes | — | 0 | 1 |
| 0x0008 | levelControl | yes | dim | 0 | 51 |
| 0x0009 | alarms | yes | — | 0 | 0 |
| 0x000A | time | yes | — | 8 | 2 |
| 0x000C | analogInput | yes | — | 0 | 0 |
| 0x000D | analogOutput | yes | — | 0 | 0 |
| 0x000E | analogValue | yes | — | 0 | 0 |
| 0x000F | binaryInput | yes | alarm_contact, alarm_heat, alarm_motion, alarm_smoke, alarm_water | 0 | 0 |
| 0x0010 | binaryOutput | yes | — | 0 | 0 |
| 0x0011 | binaryValue | yes | — | 0 | 0 |
| 0x0012 | multistateInput | yes | — | 0 | 9 |
| 0x0013 | multistateOutput | yes | — | 0 | 0 |
| 0x0014 | multistateValue | yes | — | 0 | 0 |
| 0x0019 | ota | yes | — | 8 | 1 |
| 0x001A | powerProfile | yes | — | 0 | 0 |
| 0x0020 | pollControl | yes | — | 0 | 2 |
| 0x0100 | shadeConfiguration | yes | — | 0 | 0 |
| 0x0101 | doorLock | yes | — | 0 | 2 |
| 0x0102 | windowCovering | yes | windowcoverings_set, windowcoverings_state, windowcoverings_tilt_set | 0 | 9 |
| 0x0200 | pumpConfigurationAndControl | yes | — | 0 | 0 |
| 0x0201 | thermostat | yes | — | 0 | 8 |
| 0x0202 | fanControl | yes | — | 0 | 0 |
| 0x0300 | colorControl | yes | light_hue, light_mode, light_saturation, light_temperature | 0 | 31 |
| 0x0301 | ballastConfiguration | yes | — | 0 | 0 |
| 0x0400 | illuminanceMeasurement | yes | measure_luminance | 4 | 14 |
| 0x0401 | illuminanceLevelSensing | yes | — | 0 | 0 |
| 0x0402 | temperatureMeasurement | yes | measure_temperature | 3 | 16 |
| 0x0403 | pressureMeasurement | yes | measure_pressure | 0 | 0 |
| 0x0404 | flowMeasurement | yes | measure_water | 0 | 0 |
| 0x0405 | relativeHumidity | yes | measure_humidity | 3 | 13 |
| 0x0406 | occupancySensing | yes | alarm_contact, alarm_motion | 0 | 6 |
| 0x0500 | iasZone | yes | — | 6 | 37 |
| 0x0501 | iasACE | yes | — | 1 | 5 |
| 0x0502 | iasWD | yes | — | 0 | 1 |
| 0x0702 | metering | yes | meter_power | 2 | 19 |
| 0x0B04 | electricalMeasurement | yes | measure_current, measure_power, measure_voltage | 2 | 19 |
| 0x0B05 | diagnostics | yes | — | 0 | 0 |
| 0x1000 | touchlink | yes | — | 0 | 13 |
| 0x4000 | unknown | **no** | — | 0 | 1 |
| 0xE000 | Tuya private (E000) | **no** | — | 2 | 29 |
| 0xE001 | Tuya private (E001) | **no** | — | 0 | 14 |
| 0xE002 | Tuya private (E002) | **no** | — | 0 | 3 |
| 0xE004 | unknown | **no** | — | 0 | 1 |
| 0xED00 | unknown | **no** | — | 4 | 3 |
| 0xEE00 | unknown | **no** | — | 0 | 1 |
| 0xEF00 | Tuya DP (private) | **no** | — | 11 | 169 |
| 0xEF01 | Tuya private | **no** | — | 0 | 0 |
| 0xFC11 | manufacturer-specific | **no** | — | 0 | 1 |
