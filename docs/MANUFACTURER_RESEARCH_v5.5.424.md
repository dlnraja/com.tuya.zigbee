# ManufacturerName Research Analysis v5.5.424

## Research Sources Used (10+)
1. Zigbee2MQTT GitHub (zigbee-herdsman-converters/tuya.ts)
2. ZHA Device Handlers (zigpy/zha-device-handlers)
3. Zigbee2MQTT Issues & Discussions
4. Home Assistant Community Forum
5. Hubitat Community Forum
6. Blakadder Zigbee Device Database
7. SmartThings Community
8. Phoscon/deCONZ Forum
9. Homey Community Forum
10. AliExpress Product Listings
11. Tuya IoT Platform Documentation

---

## ManufacturerName Analysis

### 1. _TZE204_mudxchsu
| Attribute | Value |
|-----------|-------|
| **ProductId** | TS0601 |
| **Device Type** | Thermostatic Radiator Valve (TRV) |
| **Brand** | Foluu TV05, Moes |
| **Correct Driver** | `radiator_valve` ✅ |
| **Sources** | ZHA ts0601_trv.py, Z2M discussions |
| **Status** | CORRECT MAPPING |

### 2. _TZE204_lvkk0hdg
| Attribute | Value |
|-----------|-------|
| **ProductId** | TS0601 |
| **Device Type** | Ultrasonic Water Tank Level Monitor |
| **Brand** | EPTTECH TLC2206-ZB |
| **Correct Driver** | `water_tank_monitor` ✅ |
| **Sources** | Z2M #21015, ZHA #3397, Hubitat |
| **DPs** | 1=liquid_state, 2=liquid_depth, 22=liquid_level_percent |
| **Status** | CORRECT MAPPING |

### 3. _TZE200_pcdmj88b / _TZE204_pcdmj88b
| Attribute | Value |
|-----------|-------|
| **ProductId** | TS0601 |
| **Device Type** | Thermostat / TRV |
| **Brand** | Generic Tuya Thermostat |
| **Correct Driver** | `radiator_valve` (NOT climate_sensor!) |
| **Sources** | Z2M #19462, ZHA |
| **DPs** | 1=mode, 2=setpoint, 3=local_temp, 4=boost, 13=battery |
| **Status** | ⚠️ NEEDS VERIFICATION - may need to move to radiator_valve |

### 4. _TZE200_ac0fhfiq / _TZE204_ac0fhfiq
| Attribute | Value |
|-----------|-------|
| **ProductId** | TS0601 |
| **Device Type** | 3-Phase Energy Meter (Clamp) |
| **Brand** | Zemismart, Generic |
| **Correct Driver** | `plug_energy_monitor` ✅ |
| **Sources** | Z2M TS0601_3_phase_clamp_meter, ZHA #2757 |
| **Status** | CORRECT MAPPING |

### 5. _TZE204_xuzcvlku
| Attribute | Value |
|-----------|-------|
| **ProductId** | TS0601 |
| **Device Type** | Curtain Motor |
| **Brand** | Zemismart, Generic |
| **Correct Driver** | `curtain_motor` ✅ |
| **Sources** | Z2M #17518, ZHA #2753 |
| **Status** | CORRECT MAPPING |

### 6. _TZ3000_gn91mcmz
| Attribute | Value |
|-----------|-------|
| **ProductId** | TS0505B / TS0504B |
| **Device Type** | RGB/RGBW LED Controller/Bulb |
| **Brand** | Generic Tuya |
| **Correct Driver** | `bulb_rgb` ✅ |
| **Sources** | Blakadder, Hubitat, SmartThings |
| **Status** | CORRECT MAPPING |

### 7. _TZ3000_f3xka28j
| Attribute | Value |
|-----------|-------|
| **ProductId** | TS110E / TS110F |
| **Device Type** | Dimmer Module (1-gang, no neutral) |
| **Brand** | Lonsonho, Girier, Moes |
| **Correct Driver** | `dimmer_wall_1gang` ✅ |
| **Sources** | Hubitat kkossev driver, Z2M |
| **Status** | CORRECT MAPPING |

### 8. _TZ3000_jvzvulen
| Attribute | Value |
|-----------|-------|
| **ProductId** | TS011F |
| **Device Type** | Smart Plug with Energy Monitoring |
| **Brand** | Generic Tuya |
| **Correct Driver** | `plug_energy_monitor` ✅ (FIXED) |
| **Sources** | Z2M #8020 |
| **Status** | ✅ FIXED - Was incorrectly in switch_1gang |

### 9. _TZ3000_nhhklsxw
| Attribute | Value |
|-----------|-------|
| **ProductId** | TS011F (likely) |
| **Device Type** | Smart Plug |
| **Brand** | Generic Tuya |
| **Correct Driver** | `plug_energy_monitor` or `plug_smart` |
| **Sources** | SmartThings Edge driver |
| **Status** | ⚠️ REMOVED from switch_1gang - needs verification |

### 10. _TZ3000_hhiodez3
| Attribute | Value |
|-----------|-------|
| **ProductId** | TS011F |
| **Device Type** | Smart Plug with Energy Monitoring |
| **Brand** | Mercator Ikuü |
| **Correct Driver** | `plug_energy_monitor` ✅ |
| **Sources** | Z2M, Home Assistant |
| **Status** | CORRECT MAPPING |

### 11. _TZE204_ye5jkfsb
| Attribute | Value |
|-----------|-------|
| **ProductId** | TS0601 |
| **Device Type** | Thermostat / TRV |
| **Brand** | Moes |
| **Correct Driver** | `radiator_valve` (NOT climate_sensor!) |
| **Sources** | Z2M #25034, ZHA #2433 |
| **Status** | ⚠️ NEEDS MOVE - Currently in climate_sensor, should be in radiator_valve |

---

## Corrections Applied

### Fixed Errors:
1. **_TZ3000_jvzvulen**: Moved from `switch_1gang` → `plug_energy_monitor`
2. **_TZ3000_nhhklsxw**: Removed from `switch_1gang` (needs proper driver)

### Pending Corrections:
1. **_TZE200_pcdmj88b**: May need to move from `climate_sensor` → `radiator_valve`
2. **_TZE204_ye5jkfsb**: May need to move from `climate_sensor` → `radiator_valve`

---

## ProductId Summary

| ManufacturerName | ProductId | Device Type |
|-----------------|-----------|-------------|
| _TZE204_mudxchsu | TS0601 | TRV |
| _TZE204_lvkk0hdg | TS0601 | Water Tank |
| _TZE200_pcdmj88b | TS0601 | Thermostat |
| _TZE200_ac0fhfiq | TS0601 | 3-Phase Meter |
| _TZE204_xuzcvlku | TS0601 | Curtain Motor |
| _TZ3000_gn91mcmz | TS0505B | RGB Bulb |
| _TZ3000_f3xka28j | TS110E/F | Dimmer |
| _TZ3000_jvzvulen | TS011F | Plug |
| _TZ3000_nhhklsxw | TS011F | Plug |
| _TZ3000_hhiodez3 | TS011F | Plug |
| _TZE204_ye5jkfsb | TS0601 | TRV |

---

*Generated: 2026-01-09*
*Version: 5.5.424*
