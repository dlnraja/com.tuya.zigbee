# Tuya Datapoints Database

**Auto-généré le:** 2025-10-16T20:18:47.219Z

## 📊 Statistiques

- **Device Types:** 23
- **Total Datapoints:** 135
- **New Datapoints:** 17
- **Updated Datapoints:** 8

## 📚 Device Types

### COMMON (8 datapoints)

| DP | Name | Type | Capability | Parser |
|----|------|------|------------|--------|
| 1 | motion | bool | alarm_motion | - |
| 2 | battery | value | measure_battery | - |
| 4 | temperature | value | measure_temperature | - |
| 5 | humidity | value | measure_humidity | - |
| 9 | illuminance | value | measure_luminance | - |
| 13 | button | enum | alarm_button | - |
| 14 | battery_low | bool | alarm_battery | - |
| 15 | battery_state | enum | alarm_battery | - |

### MOTION_SENSOR (6 datapoints)

| DP | Name | Type | Capability | Parser |
|----|------|------|------------|--------|
| 1 | occupancy | bool | alarm_motion | - |
| 2 | battery | value | measure_battery | - |
| 9 | illuminance | value | measure_luminance | - |
| 101 | illuminance_lux | value | measure_luminance | - |
| 102 | occupancy_timeout | value | - | - |
| 103 | sensitivity | enum | - | - |

### PIR_RADAR (7 datapoints)

| DP | Name | Type | Capability | Parser |
|----|------|------|------------|--------|
| 1 | presence | bool | alarm_motion | - |
| 2 | battery | value | measure_battery | - |
| 9 | illuminance | value | measure_luminance | - |
| 101 | presence_state | enum | - | - |
| 102 | radar_sensitivity | value | - | - |
| 104 | detection_distance | value | - | - |
| 105 | fading_time | value | - | - |

### MULTI_SENSOR (10 datapoints)

| DP | Name | Type | Capability | Parser |
|----|------|------|------------|--------|
| 1 | motion | bool | alarm_motion | - |
| 2 | battery | value | measure_battery | - |
| 4 | temperature | value | measure_temperature | ÷10 |
| 5 | humidity | value | measure_humidity | - |
| 9 | illuminance | value | measure_luminance | - |
| 101 | tamper | bool | alarm_tamper | ÷10 |
| 102 | humidity | value | measure_humidity | - |
| 103 | battery | value | measure_battery | - |
| 104 | illuminance | value | measure_luminance | - |
| 105 | motion | bool | alarm_motion | - |

### SMOKE_DETECTOR (7 datapoints)

| DP | Name | Type | Capability | Parser |
|----|------|------|------------|--------|
| 1 | smoke | bool | alarm_smoke | - |
| 2 | battery | value | measure_battery | - |
| 11 | smoke_value | value | measure_smoke | - |
| 14 | battery_low | bool | alarm_battery | - |
| 15 | self_test | bool | alarm_tamper | - |
| 16 | silence | bool | - | - |
| 101 | fault_alarm | bool | alarm_fault | - |

### GAS_DETECTOR (5 datapoints)

| DP | Name | Type | Capability | Parser |
|----|------|------|------------|--------|
| 1 | gas | bool | alarm_co | - |
| 2 | battery | value | measure_battery | - |
| 11 | gas_value | value | - | - |
| 13 | self_test | bool | alarm_co | - |
| 14 | mute | bool | - | - |

### WATER_LEAK (4 datapoints)

| DP | Name | Type | Capability | Parser |
|----|------|------|------------|--------|
| 1 | water_leak | bool | alarm_water | - |
| 2 | battery | value | measure_battery | - |
| 14 | battery_low | bool | alarm_battery | - |
| 15 | water_leak | bool | alarm_water | - |

### DOOR_WINDOW (4 datapoints)

| DP | Name | Type | Capability | Parser |
|----|------|------|------------|--------|
| 1 | contact | bool | alarm_contact | - |
| 2 | battery | value | measure_battery | - |
| 3 | tamper | bool | alarm_tamper | - |
| 14 | battery_low | bool | alarm_battery | - |

### BUTTON (3 datapoints)

| DP | Name | Type | Capability | Parser |
|----|------|------|------------|--------|
| 1 | action | enum | alarm_button | - |
| 2 | battery | value | measure_battery | - |
| 3 | button_number | value | - | - |

### SOS_BUTTON (3 datapoints)

| DP | Name | Type | Capability | Parser |
|----|------|------|------------|--------|
| 1 | sos | bool | alarm_generic | - |
| 2 | battery | value | measure_battery | - |
| 13 | action | enum | - | - |

### TEMPERATURE (5 datapoints)

| DP | Name | Type | Capability | Parser |
|----|------|------|------------|--------|
| 1 | temperature | value | measure_temperature | ÷10 |
| 2 | battery | value | measure_battery | - |
| 3 | min_temperature | value | - | ÷10 |
| 4 | max_temperature | value | - | ÷10 |
| 9 | temperature_alarm | enum | - | - |

### HUMIDITY (3 datapoints)

| DP | Name | Type | Capability | Parser |
|----|------|------|------------|--------|
| 1 | humidity | value | measure_humidity | - |
| 2 | battery | value | measure_battery | - |
| 5 | temperature | value | measure_temperature | ÷10 |

### CO2_SENSOR (5 datapoints)

| DP | Name | Type | Capability | Parser |
|----|------|------|------------|--------|
| 1 | co2 | value | measure_co2 | - |
| 2 | battery | value | measure_battery | - |
| 4 | temperature | value | measure_temperature | ÷10 |
| 5 | humidity | value | measure_humidity | - |
| 18 | co2_alarm | bool | alarm_co2 | - |

### AIR_QUALITY (9 datapoints)

| DP | Name | Type | Capability | Parser |
|----|------|------|------------|--------|
| 1 | voc | value | measure_voc | - |
| 2 | pm25 | value | measure_pm25 | - |
| 4 | temperature | value | measure_temperature | ÷10 |
| 5 | humidity | value | measure_humidity | - |
| 13 | formaldehyde | value | - | - |
| 15 | co2 | value | measure_co2 | - |
| 18 | co2 | value | measure_co2 | - |
| 19 | voc | value | measure_voc | - |
| 22 | formaldehyde | value | measure_formaldehyde | ÷1000 |

### VIBRATION (3 datapoints)

| DP | Name | Type | Capability | Parser |
|----|------|------|------------|--------|
| 1 | vibration | bool | alarm_motion | - |
| 2 | battery | value | measure_battery | - |
| 13 | sensitivity | enum | - | - |

### THERMOSTAT (10 datapoints)

| DP | Name | Type | Capability | Parser |
|----|------|------|------------|--------|
| 2 | target_temperature | value | target_temperature | ÷10 |
| 3 | current_temperature | value | measure_temperature | ÷10 |
| 4 | mode | enum | thermostat_mode | - |
| 5 | valve_position | value | - | - |
| 7 | battery | value | measure_battery | - |
| 8 | child_lock | bool | - | - |
| 16 | target_temperature | value | target_temperature | ÷10 |
| 24 | current_temperature | value | measure_temperature | ÷10 |
| 45 | fault | bitmap | alarm_fault | - |
| 107 | child_lock | bool | lock_child | - |

### SWITCH (10 datapoints)

| DP | Name | Type | Capability | Parser |
|----|------|------|------------|--------|
| 1 | state_l1 | bool | onoff | - |
| 2 | state_l2 | bool | onoff.2 | - |
| 3 | state_l3 | bool | onoff.3 | - |
| 4 | state_l4 | bool | onoff.4 | - |
| 5 | state_l5 | bool | onoff.5 | - |
| 6 | state_l6 | bool | onoff.6 | - |
| 9 | countdown_1 | value | - | - |
| 10 | countdown_2 | value | - | - |
| 11 | countdown_3 | value | - | - |
| 12 | countdown_4 | value | - | - |

### DIMMER (5 datapoints)

| DP | Name | Type | Capability | Parser |
|----|------|------|------------|--------|
| 1 | state | bool | onoff | - |
| 2 | brightness | value | dim | ÷1000 |
| 3 | min_brightness | value | - | - |
| 4 | countdown | value | - | - |
| 6 | light_mode | enum | - | - |

### RGB_LIGHT (10 datapoints)

| DP | Name | Type | Capability | Parser |
|----|------|------|------------|--------|
| 1 | state | bool | onoff | - |
| 2 | mode | enum | - | - |
| 3 | brightness | value | dim | ÷1000 |
| 5 | color_data | hex_color | light_hue | - |
| 8 | scene | enum | - | - |
| 20 | onoff | bool | onoff | - |
| 21 | mode | enum | - | - |
| 22 | brightness | value | dim | /1000 |
| 24 | color | hex_color | light_hue | - |
| 25 | color_temp | value | light_temperature | - |

### CURTAIN (5 datapoints)

| DP | Name | Type | Capability | Parser |
|----|------|------|------------|--------|
| 1 | position | value | windowcoverings_set | ÷100 |
| 2 | state | enum | windowcoverings_set | /100 |
| 3 | mode | enum | - | - |
| 5 | motor_direction | enum | - | - |
| 7 | work_state | enum | - | - |

### VALVE (3 datapoints)

| DP | Name | Type | Capability | Parser |
|----|------|------|------------|--------|
| 1 | state | bool | onoff | - |
| 5 | battery | value | measure_battery | - |
| 11 | water_consumed | value | meter_water | - |

### LOCK (6 datapoints)

| DP | Name | Type | Capability | Parser |
|----|------|------|------------|--------|
| 1 | state | bool | locked | - |
| 2 | battery | value | measure_battery | - |
| 6 | unlock_method | enum | - | - |
| 10 | wrong_finger | value | - | - |
| 11 | wrong_password | value | - | - |
| 12 | wrong_card | value | - | - |

### SIREN (4 datapoints)

| DP | Name | Type | Capability | Parser |
|----|------|------|------------|--------|
| 1 | alarm | bool | alarm_generic | - |
| 5 | duration | value | - | - |
| 7 | volume | enum | - | - |
| 13 | melody | value | - | - |

