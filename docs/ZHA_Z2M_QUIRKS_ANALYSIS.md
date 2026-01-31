# ZHA & Z2M Quirks Analysis for Universal Tuya Zigbee
> Generated: January 31, 2026 | Version: 5.6.0

## Sources Analyzed
- **ZHA**: `zigpy/zha-device-handlers/zhaquirks/tuya/__init__.py`
- **Z2M**: `Koenkk/zigbee-herdsman-converters/src/devices/tuya.ts` (257 chunks)

---

## 1. Tuya Protocol Constants (ZHA)

```javascript
// Cluster IDs
TUYA_CLUSTER_ID = 0xEF00     // 61184 - Main Tuya DP cluster
TUYA_CLUSTER_E000_ID = 0xE000 // 57344 - Button cluster (MOES)
TUYA_CLUSTER_E001_ID = 0xE001 // 57345 - External switch type
TUYA_CLUSTER_1888_ID = 0x1888 // 6280 - Manufacturer specific
TUYA_CLUSTER_ED00_ID = 0xED00 // 60672 - Another manufacturer cluster

// Commands
TUYA_SET_DATA = 0x00
TUYA_GET_DATA = 0x01
TUYA_SET_DATA_RESPONSE = 0x02
TUYA_QUERY_DATA = 0x03
TUYA_SEND_DATA = 0x04
TUYA_ACTIVE_STATUS_RPT = 0x06
TUYA_SET_TIME = 0x24

// DP Types
TUYA_DP_TYPE_RAW = 0x0000
TUYA_DP_TYPE_BOOL = 0x0100
TUYA_DP_TYPE_VALUE = 0x0200
TUYA_DP_TYPE_STRING = 0x0300
TUYA_DP_TYPE_ENUM = 0x0400
TUYA_DP_TYPE_FAULT = 0x0500
```

---

## 2. ZCL Attribute Definitions (ZHA)

### OnOff Cluster (0x0006) Custom Attributes
| Attribute ID | Name | Type | Values |
|--------------|------|------|--------|
| 0x8000 | child_lock | Bool | true/false |
| 0x8001 | backlight_mode | Enum | 0=Mode_0, 1=Mode_1, 2=Mode_2 |
| 0x8002 | power_on_state | Enum | 0=Off, 1=On, 2=LastState |
| 0x8004 | switch_mode | Enum | 0=Command, 1=Event (Scene mode) |

### Cluster 0xE001 Attributes
| Attribute ID | Name | Type | Values |
|--------------|------|------|--------|
| 0xD030 | external_switch_type | Enum | 0=Toggle, 1=State, 2=Momentary |

### TS004F Scene Mode Commands
| Command ID | Name | Values |
|------------|------|--------|
| 0xFC | rotate_type | 0=RIGHT, 1=LEFT, 2=STOP |
| 0xFD | press_type | 0=SHORT_PRESS, 1=DOUBLE_PRESS, 2=LONG_PRESS |

---

## 3. TRV/Thermostat DP Mappings (Z2M)

### AVATTO ME167 Profile (_TZE200_p3dbf6qs, _TZE200_hvaxb2tc)
| DP | Capability | Converter | Notes |
|----|------------|-----------|-------|
| 2 | current_heating_setpoint | divideBy10 | 5-35°C |
| 4 | boost | enum | 1=OFF, 2=ON |
| 18 | open_window_active | bool | |
| 37 | adaptive_start | bool | |
| 38 | local_temperature | divideBy10 | |
| 39 | max_temperature_limit | divideBy10 | |
| 40 | open_window_sensing_time | raw | minutes |
| 42 | holiday_temperature | divideBy10 | |
| 43 | sensor_mode | enum | 0=room, 1=floor, 2=room_with_limit |
| 45 | open_window_drop_limit | divideBy10 | |
| 47 | open_window_off_time | raw | minutes |
| 50 | power_rating | raw | watts |
| 52 | frost_protection | bool | |
| 53 | min_temperature_limit | divideBy10 | |
| 54 | switch_delay | raw | |
| 55 | display_brightness | raw | |

### Standard TRV Profile (Multiple manufacturers)
| DP | Capability | Converter | Notes |
|----|------------|-----------|-------|
| 2 | mode | enum | 0=auto, 1=manual, 2=off, 3=comfort, 4=eco |
| 4 | current_heating_setpoint | divideBy10 | |
| 5 | local_temperature | divideBy10 | |
| 6 | battery | raw | % |
| 7 | child_lock | lockUnlock | |
| 21 | holiday_temperature | divideBy10 | |
| 24 | comfort_temperature | divideBy10 | |
| 25 | eco_temperature | divideBy10 | |
| 28-34 | schedule_monday-sunday | thermostatSchedule | |
| 35 | fault_alarm | errorOrBatteryLow | |
| 36 | frost_protection | bool | |
| 37 | boost_heating | bool | |
| 39 | scale_protection | bool | Anti-silt |
| 47 | local_temperature_calibration | localTempCalibration2 | |
| 49 | system_mode | enum | 0=off, 1=heat |

---

## 4. Energy Meter DP Mappings (Z2M)

### Single Phase (TS0121, TS011F)
| DP | Capability | Converter | Notes |
|----|------------|-----------|-------|
| 1 | energy | divideBy100 | kWh |
| 6 | voltage/current | phaseVariant2 | Combined |
| 16 | state | onOff | |
| 17 | threshold | raw | |
| 18 | meter_id | raw | |
| 20 | clear_fault | onOff | |

### 3-Phase Energy Meters (SPM02V3 - _TZE200_dikb3dp6)
| DP | Capability | Converter | Notes |
|----|------------|-----------|-------|
| 1 | energy | divideBy100 | Total forward |
| 23 | produced_energy | divideBy100 | Total reverse |
| 29 | power | raw | Total active |
| 32 | ac_frequency | divideBy100 | |
| 50 | power_factor | raw | % |
| 102 | update_frequency | raw | seconds |
| 103 | voltage_a | divideBy10 | V |
| 104 | current_a | divideBy1000 | A |
| 105 | power_a | raw | W |
| 108 | power_factor_a | raw | % |
| 109 | energy_a | divideBy100 | kWh |
| 110 | energy_produced_a | divideBy100 | kWh |
| 112-117 | Phase B | same pattern | |
| 118-123 | Phase C | same pattern | |

### PJ-1203A 2-Channel (_TZE204_81yrt3lo)
| DP | Capability | Converter | Notes |
|----|------------|-----------|-------|
| 6 | voltage | divideBy10 | V |
| 7 | power_a | raw | W |
| 8 | power_b | raw | W |
| 9 | current_a | divideBy1000 | A |
| 10 | current_b | divideBy1000 | A |
| 101 | energy_a | divideBy100 | kWh |
| 102 | energy_b | divideBy100 | kWh |
| 111 | update_frequency | raw | 3-60s |

---

## 5. Radar/Presence Sensor DP Mappings (Z2M)

### Fall Detection Radar (_TZE204_*, _TZE284_*)
| DP | Capability | Converter | Notes |
|----|------------|-----------|-------|
| 1 | presence | trueFalse1 | |
| 2 | radar_sensitivity | raw | 1-10 |
| 102 | occupancy | trueFalse1 | |
| 103 | illuminance | raw | lux |
| 105 | tumble_switch | plus1 | ON/OFF |
| 106 | tumble_alarm_time | raw | 1-5 min |
| 112 | radar_scene | enum | 0-6 scenes |
| 114 | motion_direction | enum | 0=still, 1=forward, 2=backward |
| 115 | motion_speed | raw | |
| 116 | fall_down_status | enum | 0=none, 1=maybe, 2=fall |
| 117 | static_dwell_alarm | raw | |
| 118 | fall_sensitivity | raw | 1-10 |

### Scene Mode Radar
| DP | Capability | Converter | Notes |
|----|------------|-----------|-------|
| 128 | scene_mode | enum | 0=custom, 1=toilet, 2=kitchen, 3=corridor, 4=bedroom, 5=living_room, 6=meeting_room |
| 129 | illuminance_report | enum | 0=off, 1=on |
| 130 | move_detect | enum | 0=off, 1=on |
| 131 | distance_report | enum | 0=off, 1=on |
| 132 | speed_report | enum | 0=off, 1=on |

---

## 6. Switch DP Mappings (Z2M)

### 3-Gang with Backlight (_TZE204_rkbxtclc)
| DP | Capability | Converter | Notes |
|----|------------|-----------|-------|
| 1 | state_l1 | onOff | Gang 1 |
| 2 | state_l2 | onOff | Gang 2 |
| 3 | state_l3 | onOff | Gang 3 |
| 7 | countdown_l1 | countdown | 0-86400s |
| 8 | countdown_l2 | countdown | |
| 9 | countdown_l3 | countdown | |
| 13 | state | onOff | All switches |
| 14 | power_on_behavior | enum | |
| 15 | indicator_mode | enum | 0=off, 1=on_off_status, 2=switch_position |
| 16 | backlight_switch | onOff | Master |
| 101 | child_lock | onOff | |
| 102 | backlight | raw | 0-100% |
| 103 | on_color | enum | 0-8 colors |
| 104 | off_color | enum | 0-8 colors |

### Color Values for Backlight
```javascript
const BACKLIGHT_COLORS = {
  red: 0, blue: 1, green: 2, white: 3,
  yellow: 4, magenta: 5, cyan: 6,
  warm_white: 7, warm_yellow: 8
};
```

---

## 7. Cover/Curtain DP Mappings (ZHA)

### Standard Cover
| DP | Capability | Converter | Notes |
|----|------------|-----------|-------|
| 1 | control | enum | 0=open, 1=stop, 2=close |
| 2 | percent_control | value | 0-100% (write) |
| 3 | percent_state | value | 0-100% (read) |
| 5 | direction_change | enum | 0=forward, 1=reverse |
| 6 | cover_inverted | bool | Position inversion |

### Cover Command Mapping
```javascript
// ZHA tuya_cover_command mapping
WINDOW_COVER_COMMAND_UPOPEN = 0x0000    // → 0x0000
WINDOW_COVER_COMMAND_DOWNCLOSE = 0x0001 // → 0x0002
WINDOW_COVER_COMMAND_STOP = 0x0002      // → 0x0001
```

---

## 8. New Fingerprints to Add

### Switches
| Fingerprint | ProductId | Device | Notes |
|-------------|-----------|--------|-------|
| _TZ3000_rk2yzt0u | TS011F | Smart valve | |
| _TZ3000_o4cjetlm | TS0001/TS011F | Smart valve | |
| _TZ3000_iedbgyxt | TS0001 | Smart valve | ZCL-only |
| _TZ3000_h3noz0a5 | TS0001 | Smart switch | |
| _TZ3000_5ucujjts | TS0001 | Smart switch | |
| _TZ3000_cmcjbqup | TS0001 | Smart switch | |
| _TZE204_rkbxtclc | TS0601 | 3-gang colored backlight | |

### Energy Meters
| Fingerprint | ProductId | Device | Notes |
|-------------|-----------|--------|-------|
| _TZE200_lsanae15 | TS0601 | 80A DIN meter | MatSee Plus DAC2161C |
| _TZE204_lsanae15 | TS0601 | 80A DIN meter | |
| _TZE200_rhblgy0z | TS0601 | DIN energy meter | XOCA DAC2161C |
| _TZE204_rhblgy0z | TS0601 | DIN energy meter | |
| _TZE200_dikb3dp6 | TS0601 | 3-phase energy | SPM02V3 |
| _TZE204_dikb3dp6 | TS0601 | 3-phase energy | |
| _TZE284_dikb3dp6 | TS0601 | 3-phase energy | |

### TRVs/Thermostats
| Fingerprint | ProductId | Device | Notes |
|-------------|-----------|--------|-------|
| _TZE200_p3dbf6qs | TS0601 | AVATTO ME167_1 | |
| _TZE200_hvaxb2tc | TS0601 | AVATTO TRV06_1b | |
| _TZE284_madl8ejv | TS0601 | Saswell wireless temp | |

### Smart Knobs/Remotes
| Fingerprint | ProductId | Device | Notes |
|-------------|-----------|--------|-------|
| _TZ3000_g9g2xnch | TS004F | YSR-MINI-Z dimmer | Scene mode |
| _TZ3000_pcqjmcud | TS004F | YSR-MINI-Z dimmer | Scene mode |

### Lights
| Fingerprint | ProductId | Device | Notes |
|-------------|-----------|--------|-------|
| _TZ3000_zw7wr5uo | TS0502B | Mercator SMI7040 | Ford Batten |
| _TZ3000_g1glzzfk | TS0502B | Aldi F122SB62H22A4.5W | Filament |
| _TZ3000_bumeauzp | TS0502B | Sibling Light-ZSLL | Linear ceiling |
| _TZ3210_frm6149r | TS0502B | MiBoxer FUT035Z+ | Dual white |
| _TZB210_lmqquxus | TS0502B | MiBoxer FUT035Z+ | |
| _TZ3000_sosdczdl | TS0505A | RGB+CCT LED | Special handling |

---

## 9. Metering Cluster Corrections (ZHA)

```javascript
// TuyaZBMeteringCluster
MULTIPLIER = 0x0301  // = 1
DIVISOR = 0x0302     // = 100 (kWh conversion)

// TuyaZBElectricalMeasurement  
AC_CURRENT_MULTIPLIER = 0x0602  // = 1
AC_CURRENT_DIVISOR = 0x0603     // = 1000 (mA to A)
```

---

## 10. Implementation Recommendations

### High Priority
1. **Add 3-phase per-phase capabilities** to `plug_energy_monitor` driver
2. **Add colored backlight support** for RGB switches (DP102-104)
3. **Add fall detection** capabilities for radar sensors
4. **Implement open_window detection** for TRVs

### Medium Priority
1. Add `scene_mode` enum setting for radar sensors
2. Add `sensor_mode` (room/floor/combined) for floor heating thermostats
3. Add `adaptive_start` and `frost_protection` to TRV settings

### Low Priority
1. Add countdown timers per-gang for switches
2. Add `meter_id` display for energy meters
3. Add `scale_protection` scheduling for TRVs

---

## References
- [ZHA Device Handlers](https://github.com/zigpy/zha-device-handlers)
- [Z2M Converters](https://github.com/Koenkk/zigbee-herdsman-converters)
- [Tuya DP Protocol](https://developer.tuya.com/en/docs/iot-device-dev/tuya-zigbee-universal-docking-access-standard)
