# Cross-Platform Comparison

> Last updated: 2026-06-15

Comparison of device support across Zigbee2MQTT (Z2M), ZHA (Home Assistant), deCONZ (Phoscon), and Homey (this app).

---

## 1. `_TZE200_seq9cm6u` - Bed Sensor (Pressure Occupancy Belt)

### Zigbee2MQTT
- **Status**: Fully supported
- **Converter**: `tuya.ts` - `fatech_presence_sensor`
- **Capabilities**: presence, battery, sensitivity, illuminance, presence_delay, presence_time, interval_time
- **DPs**: DP1 (presence bool), DP4 (battery), DP9 (sensitivity), DP12 (illuminance), DP101-DP103 (settings)
- **Notes**: Well-tested, community-verified

### ZHA (Home Assistant)
- **Status**: Supported via quirks
- **Quirk**: `tuya.ts` - Uses Tuya custom device handler
- **Capabilities**: presence, battery, illuminance
- **Notes**: May require manual quirk assignment for some firmware versions

### deCONZ (Phoscon)
- **Status**: Limited support
- **Notes**: May appear as generic Zigbee device. DDF (deCONZ Device Description) may be needed for full support.

### Homey (This App)
- **Status**: Partially working
- **Driver**: `bed_sensor`
- **Issues**: Pairs as Unknown (#424), battery shows 0% (#383), settings missing
- **Gap vs Z2M**: Missing DP101-DP103 settings (interval, delays), battery binary handling

### Compatibility Gap
| Feature | Z2M | ZHA | deCONZ | Homey |
|---------|-----|-----|--------|-------|
| Presence detection | Full | Full | Partial | Partial |
| Battery reporting | Full | Full | Partial | Broken (binary) |
| Illuminance | Full | Full | No | Full |
| Sensitivity setting | Full | Partial | No | Yes |
| Delay settings | Full | No | No | No |
| Interval setting | Full | No | No | No |

---

## 2. `_TZ3000_yj6k7vfo` - Wireless Button (TS0041)

### Zigbee2MQTT
- **Status**: Fully supported
- **Converter**: Standard TS0041 OnOff toggle
- **Capabilities**: action (single, double, hold)
- **Notes**: Standard Zigbee button behavior

### ZHA (Home Assistant)
- **Status**: Fully supported
- **Quirk**: Standard ZHA zigbee device
- **Capabilities**: single, double, hold actions

### deCONZ (Phoscon)
- **Status**: Fully supported
- **DDF**: Standard 1-gang remote

### Homey (This App)
- **Status**: FIXED (v9.0.1)
- **Driver**: `button_wireless_1`
- **Issues**: Was incorrectly matched to `gas_sensor_switch`, now resolved
- **Capabilities**: `button.1`, `measure_battery`, `alarm_battery`

### Compatibility Gap
| Feature | Z2M | ZHA | deCONZ | Homey |
|---------|-----|-----|--------|-------|
| Single press | Full | Full | Full | Full |
| Double press | Full | Full | Full | Full |
| Long press | Full | Full | Full | Full |
| Battery | Full | Full | Full | Full |

---

## 3. `_TZ3210_p68kms0l` / `_TZ3210_tgvtvdoc` - Rain Sensor (TS0207)

### Zigbee2MQTT
- **Status**: Fully supported
- **Converter**: `tuya.ts` - `RB-SRAIN01` / `_TZ3210_tgvtvdoc`
- **Capabilities**: rain, illuminance, battery, solar_voltage, cleaning_reminder
- **Notes**: Uses IAS Zone for rain + Tuya DP for solar/battery data. Z2M handles both protocols.

### ZHA (Home Assistant)
- **Status**: Supported via quirks
- **Quirk**: `tuya_rain.py` - IAS Zone rain detection
- **Capabilities**: rain (binary), battery
- **Notes**: ZHA quirk handles IAS Zone enrollment

### deCONZ (Phoscon)
- **Status**: Partial
- **Notes**: IAS Zone support exists but may need manual DDF for solar voltage data

### Homey (This App)
- **Status**: Partially working
- **Driver**: `rain_sensor`
- **Issues**: 
  - `_TZ3210_p68kms0l`: Water alarm not triggering (#417)
  - `_TZ3210_tgvtvdoc`: Misclassified as water leak sensor (#388)
- **Gap vs Z2M**: IAS Zone enrollment may fail, DP solar data not mapped for all variants

### Compatibility Gap
| Feature | Z2M | ZHA | deCONZ | Homey |
|---------|-----|-----|--------|-------|
| Rain detection | Full | Full | Partial | Partial |
| Rain level | Full | No | No | Full |
| Illuminance | Full | No | No | Full |
| Solar voltage | Full | No | No | Partial |
| Battery | Full | Full | Partial | Full |
| Cleaning reminder | Full | No | No | Partial |

---

## 4. `_TZE204_clrdrnya` - mmWave Radar (Wenzhi MTG235-ZB-RL)

### Zigbee2MQTT
- **Status**: Fully supported
- **Converter**: `tuya.ts` - `MTG235-ZB-RL`
- **Capabilities**: presence, illuminance, target_distance, radar_sensitivity, detection_range, shield_range, entry_sensitivity, entry_distance_indentation, entry_filter_time, departure_delay, block_time, breaker_status, breaker_mode, illuminance_threshold, status_indication
- **Notes**: 16 DPs, comprehensive support. Mains-powered router.

### ZHA (Home Assistant)
- **Status**: Partial
- **Quirk**: Custom Tuya DP handler may be needed
- **Capabilities**: presence, illuminance (basic)
- **Notes**: Full DP set may not be available without custom quirk

### deCONZ (Phoscon)
- **Status**: Limited
- **Notes**: Basic presence detection only

### Homey (This App)
- **Status**: BROKEN (Issue #420)
- **Driver**: `motion_sensor_radar_mmwave` / `presence_sensor_radar`
- **Issues**: Pairs but all capabilities null, settings write fails
- **Gap vs Z2M**: None of the 16 DPs are being received

### Compatibility Gap
| Feature | Z2M | ZHA | deCONZ | Homey |
|---------|-----|-----|--------|-------|
| Presence | Full | Partial | Partial | None |
| Illuminance | Full | Partial | No | None |
| Target distance | Full | No | No | None |
| Radar settings | Full | No | No | None |
| Breaker (relay) | Full | No | No | None |
| Entry/exit config | Full | No | No | None |

---

## 5. `_TZ3002_pzao9ls1` - BSEED 4-Gang Switch (TS0726)

### Zigbee2MQTT
- **Status**: Supported (as generic 4-gang)
- **Converter**: Multi-endpoint OnOff
- **Capabilities**: 4x on/off
- **Notes**: Standard ZCL multi-endpoint switch

### ZHA (Home Assistant)
- **Status**: Supported
- **Quirk**: Standard multi-endpoint device
- **Capabilities**: 4x on/off

### deCONZ (Phoscon)
- **Status**: Supported
- **DDF**: 4-gang switch

### Homey (This App)
- **Status**: NOT SUPPORTED (Issue #1401)
- **Driver**: None
- **Gap**: TS0726 modelId not in any switch driver

### Compatibility Gap
| Feature | Z2M | ZHA | deCONZ | Homey |
|---------|-----|-----|--------|-------|
| Gang 1 on/off | Full | Full | Full | None |
| Gang 2 on/off | Full | Full | Full | None |
| Gang 3 on/off | Full | Full | Full | None |
| Gang 4 on/off | Full | Full | Full | None |

---

## 6. `_TZ3000_wzmuk9ai` - Smart Plug Energy (TS011F)

### Zigbee2MQTT
- **Status**: Fully supported
- **Converter**: Standard TS011F
- **Capabilities**: on/off, power, voltage, current, energy

### ZHA (Home Assistant)
- **Status**: Fully supported
- **Quirk**: Standard ZCL electrical measurement

### deCONZ (Phoscon)
- **Status**: Fully supported
- **DDF**: Standard smart plug with metering

### Homey (This App)
- **Status**: FIXED (v9.0.1)
- **Driver**: `plug_energy_monitor`
- **Protocol**: ZCL Electrical Measurement (0x0B04) + Metering (0x0702)

### Compatibility Gap
| Feature | Z2M | ZHA | deCONZ | Homey |
|---------|-----|-----|--------|-------|
| On/off | Full | Full | Full | Full |
| Power (W) | Full | Full | Full | Full |
| Voltage (V) | Full | Full | Full | Full |
| Current (A) | Full | Full | Full | Full |
| Energy (kWh) | Full | Full | Full | Full |

---

## 7. `_TZE284_hdml1aav` - Soil Sensor EC (TS0601)

### Zigbee2MQTT
- **Status**: Fully supported
- **Converter**: `tuya.ts` - Soil sensor with EC
- **Capabilities**: soil_moisture, temperature, battery, EC (electrical conductivity), illuminance
- **DPs**: DP3 (moisture), DP5 (temperature), DP15 (battery), DP20/DP22 (EC)

### ZHA (Home Assistant)
- **Status**: Partial
- **Quirk**: Tuya soil sensor quirk
- **Capabilities**: soil_moisture, temperature, battery
- **Notes**: EC may not be available without custom quirk

### deCONZ (Phoscon)
- **Status**: Limited
- **Notes**: Basic soil moisture only

### Homey (This App)
- **Status**: Partially working
- **Driver**: `soil_sensor`
- **Issues**: EC readings erratic (#376, #398)
- **DPs mapped**: DP1, DP2, DP3, DP4, DP5, DP14, DP15, DP20, DP22, DP101-DP114

### Compatibility Gap
| Feature | Z2M | ZHA | deCONZ | Homey |
|---------|-----|-----|--------|-------|
| Soil moisture | Full | Full | Partial | Full |
| Temperature | Full | Full | No | Full |
| Battery | Full | Full | Partial | Full |
| EC (fertilizer) | Full | Partial | No | Partial |
| Illuminance | Full | Partial | No | Full |
| Ambient humidity | Full | No | No | Full |

---

## 8. `_TZE200_9xfjixap` - Radiator Valve (TRV) (TS0601)

### Zigbee2MQTT
- **Status**: Fully supported
- **Converter**: `tuya.ts` - ME167/AVATTO TRV
- **Capabilities**: system_mode, current_heating_setpoint, local_temperature, battery, child_lock, window_open, frost_protection, etc.
- **DPs**: DP2 (mode), DP3 (running_state), DP4 (target_temp), DP5 (local_temp), DP7 (child_lock), DP14 (window), DP35 (battery alarm), DP36 (frost), DP39 (anti_scaling), DP47 (calibration), DP101 (dim/valve_position), DP102 (battery_low)

### ZHA (Home Assistant)
- **Status**: Supported via quirks
- **Quirk**: `tuya_trv.py`
- **Capabilities**: Basic thermostat mode + temperature

### deCONZ (Phoscon)
- **Status**: Limited
- **Notes**: Basic thermostat support only

### Homey (This App)
- **Status**: FIXED (v9.0.1)
- **Driver**: `radiator_valve`
- **DP Profile**: ME167 (Profile B) - detected via manufacturerName

### Compatibility Gap
| Feature | Z2M | ZHA | deCONZ | Homey |
|---------|-----|-----|--------|-------|
| Thermostat mode | Full | Full | Partial | Full |
| Target temperature | Full | Full | Partial | Full |
| Local temperature | Full | Full | Partial | Full |
| Battery | Full | Full | Partial | Full |
| Child lock | Full | Partial | No | Full |
| Window detection | Full | Partial | No | Internal |
| Frost protection | Full | No | No | Internal |
| Valve position | Full | No | No | Internal |

---

## Platform Capability Summary

### Z2M Advantages
- Most comprehensive Tuya DP support
- Active community maintenance
- 16+ DPs per device supported
- Custom converters for edge cases

### ZHA Advantages
- Tight Home Assistant integration
- Standard ZCL support excellent
- Quirk system for Tuya devices
- Good IAS Zone support

### deCONZ Advantages
- Good standard Zigbee support
- DDF system for customization
- Mature IAS Zone handling

### Homey (This App) Advantages
- Tuya DP + ZCL hybrid support
- Physical/Virtual button mixin system
- Dynamic capability manager
- Intelligence sensor inference engine
- 412+ drivers with 3,300+ fingerprints

### Homey Gaps vs Other Platforms
1. TS0207 rain/water classification ambiguity
2. Some TS0601 devices with non-standard DP layouts
3. IAS Zone enrollment reliability
4. Multi-gang TS0726 support
5. Complex radar/mmWave DP handling

---

*Generated by Claude Code - 15 June 2026*
