# Tuya Zigbee DP Reference v5.5.140

> **Source:** Tuya Official Documentation, Zigbee2MQTT, ZHA, Community Research
> **Last Updated:** December 2024

---

## Standard Sensors (Official Tuya Documentation)

### PIR Motion Sensor (TS0202, etc.)
| DP | Function | Values | Capability |
|----|----------|--------|------------|
| 1 | Motion alarm | 0=no, 1=alarm | `alarm_motion` |
| 4 | Battery level | 0-100% | `measure_battery` |
| 5 | Tamper alarm | 0=no, 1=alarm | `alarm_tamper` |
| 9 | Sensitivity | 0-10 | setting |
| 10 | Keep time | seconds | setting |
| 12 | Illuminance | lux | `measure_luminance` |

### Contact Sensor (Door/Window) (TS0203, etc.)
| DP | Function | Values | Capability |
|----|----------|--------|------------|
| 1 | Contact state | 0=closed, 1=open | `alarm_contact` |
| 2 | Battery level | 0-100% | `measure_battery` |
| 4 | Tamper alarm | 0=no, 1=alarm | `alarm_tamper` |

### Water Leak Sensor (TS0207, etc.)
| DP | Function | Values | Capability |
|----|----------|--------|------------|
| 1 | Water leak | 0=no, 1=leak | `alarm_water` |
| 4 | Battery level | 0-100% | `measure_battery` |
| 5 | Tamper alarm | 0=no, 1=alarm | `alarm_tamper` |

### Temperature & Humidity Sensor (TS0201, etc.)
| DP | Function | Values | Capability |
|----|----------|--------|------------|
| 1 | Temperature | value/10 = °C | `measure_temperature` |
| 2 | Humidity | 0-100% | `measure_humidity` |
| 4 | Humidity (alt) | 0-100% | `measure_humidity` |
| 5 | Battery level | 0-100% | `measure_battery` |

### Smoke Detector (TS0205, etc.)
| DP | Function | Values | Capability |
|----|----------|--------|------------|
| 1 | Smoke alarm | 0=no, 1=alarm | `alarm_smoke` |
| 14 | Battery state | 0=low, 1=mid, 2=full | `measure_battery` |
| 15 | Battery level | 0-100% | `measure_battery` |

---

## Radar / Presence Sensors

### ZG-204ZM (24GHz mmWave Radar)
**ManufacturerNames:** `_TZE200_2aaelwxk`, `_TZE200_kb5noeto`, `_TZE200_5b5noeto`

| DP | Function | Values | Capability/Setting |
|----|----------|--------|-------------------|
| 1 | Presence | boolean | `alarm_motion` |
| 2 | Large motion sensitivity | 0-10 | setting |
| 4 | Large motion distance | /100 = meters | setting / `measure_battery` (some) |
| 101 | Motion state | 0=none, 1=large, 2=medium, 3=small | `alarm_motion` |
| 102 | Fading time | seconds | setting |
| 104 | Medium motion distance | /100 = meters | setting |
| 105 | Medium motion sensitivity | 0-10 | setting |
| **106** | **Illuminance** | lux | **`measure_luminance`** |
| 107 | LED indicator | boolean | setting |
| 108 | Small detection distance | /100 = meters | setting |
| 109 | Small detection sensitivity | 0-10 | setting |

### ZY-M100 / TS0601 Presence Sensors
| DP | Function | Values | Capability |
|----|----------|--------|------------|
| 1 | Presence | boolean | `alarm_motion` |
| 9 | Sensitivity | 0-10 | setting |
| 10 | Keep time | 10-1800s | setting |
| 12 | Illuminance | lux | `measure_luminance` |
| 101 | Motion state | 0-3 | `alarm_motion` |
| 102 | Fading time / Distance | seconds/cm | setting |

---

## Thermostats / TRV

### TV02 / TS0601 Thermostat
| DP | Function | Values | Capability |
|----|----------|--------|------------|
| 1 | State | on/off | `onoff` |
| 2 | System mode | 0=cool, 1=heat, 2=fan | setting |
| 4 | Preset | manual/auto | setting |
| 16 | Target temperature | /10 = °C | `target_temperature` |
| 19 | Max temperature | /10 = °C | setting |
| 24 | Local temperature | /10 = °C | `measure_temperature` |

---

## Smart Plugs / Sockets

### TS011F / Energy Monitoring
| DP | Function | Values | Capability |
|----|----------|--------|------------|
| 1 | On/Off | boolean | `onoff` |
| 17 | Current | /1000 = A | `measure_current` |
| 18 | Power | /10 = W | `measure_power` |
| 19 | Voltage | /10 = V | `measure_voltage` |
| 20 | Energy | /100 = kWh | `meter_power` |

### Alternative Energy DPs
| DP | Function | Values | Capability |
|----|----------|--------|------------|
| 132 | Power | /10 = W | `measure_power` |
| 133 | Current | /1000 = A | `measure_current` |
| 134 | Energy | /100 = kWh | `meter_power` |

---

## Siren / Alarm

### TS0601 Siren
| DP | Function | Values | Capability |
|----|----------|--------|------------|
| 101 | Power mode | 0=battery, 4=DC | setting |
| 102 | Alarm melody | 0-18 | setting |
| 103 | Alarm duration | seconds | setting |
| 104 | Alarm on/off | boolean | setting |
| 105 | Temperature | °C | `measure_temperature` |
| 106 | Humidity | % | `measure_humidity` |
| 108 | Max alarm temp | °C | setting |
| 112 | Temperature unit | C/F | setting |

---

## Air Quality Sensors

### TS0601 Air Quality
| DP | Function | Values | Capability |
|----|----------|--------|------------|
| 20 | PM2.5 | µg/m³ | `measure_pm25` |
| 21 | Formaldehyde | /100 = mg/m³ | `measure_formaldehyde` |
| 22 | CO2 | ppm | `measure_co2` |
| 23 | VOC | ppb | `measure_voc` |

---

## Fantem / Multi-Sensors

### Fantem 4-in-1 Sensor
| DP | Function | Values | Capability |
|----|----------|--------|------------|
| 101 | Motion | boolean | `alarm_motion` |
| 102 | Illuminance | lux | `measure_luminance` |
| 103 | Temperature | /10 = °C | `measure_temperature` |
| 104 | Humidity | % | `measure_humidity` |
| 105 | Battery | 0=low, 1=mid, 2=full | `measure_battery` |

---

## Notes

1. **DP1 is context-dependent** - It can be motion, contact, water leak, smoke, temperature, or on/off depending on device type.

2. **Battery DP varies** - Can be DP2, DP4, DP5, DP14, DP15, or DP101 depending on device.

3. **Illuminance DP varies** - Can be DP7, DP9, DP12, DP102, DP103, or DP106 depending on device.

4. **Multi-use DPs** - Some DPs have different meanings based on device type. The driver should define specific mappings to override universal patterns.

---

## Resources

- [Tuya Developer Docs - Zigbee Sensors](https://developer.tuya.com/en/docs/connect-subdevices-to-gateways)
- [Zigbee2MQTT Device Converters](https://github.com/Koenkk/zigbee-herdsman-converters/blob/master/src/devices/tuya.ts)
- [ZHA Device Handlers](https://github.com/zigpy/zha-device-handlers)
- [Zigbee for Domoticz - Tuya 0xEF00](https://github.com/zigbeefordomoticz/wiki/blob/master/en-eng/Technical/Tuya-0xEF00.md)
