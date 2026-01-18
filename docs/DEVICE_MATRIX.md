# Device Support Matrix

| Driver | Manufacturers | Products | Capabilities |
|--------|---------------|----------|-------------|
| air_purifier | 10 | TS0601 | onoff, dim, measure_pm25 |
| air_quality_co2 | 10 | TS0201, TS0601 | measure_co2, measure_temperature, measure_humidity... |
| air_quality_comprehensive | 14 | TS0005, TS0006, TS0501, TS0601 | measure_co2, measure_pm25, measure_pm10... |
| bulb_dimmable | 8 | TS0502A, TS0502B, TS0501A, TS0501B | dim, light_hue, light_saturation... |
| bulb_rgb | 176 | TS0503A, TS0503B, TS0504A, TS0504B | dim, light_hue, light_saturation... |
| bulb_rgbw | 40 | generic | onoff, dim, light_hue... |
| bulb_tunable_white | 5 | TS0502A, TS0502B | dim, light_hue, light_saturation... |
| bulb_white | 3 | TS0501A, TS0501B | dim, light_hue, light_saturation... |
| button_emergency_sos | 25 | TS0218 | alarm_generic, measure_battery |
| button_wireless | 10 | TS0041, TS0042, TS0043, TS0044, TS0601 | measure_battery |
| button_wireless_1 | 69 | TS0041, TS0601, ZG-101ZL | button.1, measure_battery |
| button_wireless_2 | 7 | TS0042, TS0601 | button.1, button.2, measure_battery |
| button_wireless_3 | 13 | TS0043, TS0601 | button.1, button.2, button.3... |
| button_wireless_4 | 74 | TS0041, TS0044, TS004F, TS0601 | button.1, button.2, button.3... |
| button_wireless_6 | 3 | TS0046 | button.1, button.2, button.3... |
| button_wireless_8 | 2 | TS0044, TS004F | button.1, button.2, button.3... |
| ceiling_fan | 3 | TS0601 | dim, measure_battery, onoff... |
| climate_sensor | 2132 | TS0201, TS0222, TS0225, TS0601 | measure_temperature, measure_humidity, measure_battery |
| co_sensor | 2 | TS0601 | alarm_co, measure_battery, measure_co |
| contact_sensor | 183 | TS0203, TS0210, TS0601, ZG-102Z, ZG-102ZL, ZG-102ZM | alarm_contact, measure_battery |
| curtain_motor | 229 | TS0302, TS0601, ZC-LS02 | windowcoverings_state, windowcoverings_set, windowcoverings_tilt_set... |
| curtain_motor_tilt | 2 | TS0601 | windowcoverings_state, windowcoverings_set, windowcoverings_tilt_set... |
| dimmer_3gang | 4 | TS0601 | onoff, dim, onoff.channel2... |
| dimmer_dual_channel | 17 | TS0601, TS1101 | onoff, dim, onoff.channel2... |
| dimmer_wall_1gang | 223 | TS0101, TS0111, TS0601 | dim, onoff, measure_power |
| din_rail_meter | 27 | TS0601, TS011F, SPM01-1Z2, SDM01-3Z1, SDM02-2Z1, SPM02-3Z3 | measure_power, meter_power, measure_voltage... |
| din_rail_switch | 18 | TS0001, TS0011, TS0601, TS011F | onoff, measure_power, meter_power... |
| door_controller | 4 | TS0601 | alarm_motion, alarm_contact, measure_battery... |
| doorbell | 14 | TS0211, TS0601 | alarm_motion, alarm_contact, measure_battery... |
| energy_meter_3phase | 2 | TS0601 | measure_power, meter_power, measure_voltage... |
| fan_controller | 16 | TS0601, TS0501A, TS0501B | onoff, dim |
| fingerprint_lock | 10 | TS0601 | locked, alarm_tamper, measure_battery |
| formaldehyde_sensor | 3 | TS0601 | measure_co2, measure_temperature, measure_humidity... |
| garage_door | 10 | TS0601, TS0001 | garagedoor_closed, alarm_contact |
| gas_detector | 8 | TS0204, TS0601 | alarm_generic, alarm_co, alarm_co2... |
| gas_sensor | 44 | TS0601 | alarm_co, alarm_co2, measure_battery... |
| gateway_zigbee_bridge | 2 | TS0601 | alarm_generic, measure_battery, onoff |
| generic_tuya | 8 | TS0601 | measure_battery, measure_temperature, measure_humidity |
| humidifier | 12 | TS0601 | onoff, dim, measure_humidity... |
| hvac_air_conditioner | 2 | TS0601 | target_temperature, measure_temperature, thermostat_mode... |
| hvac_dehumidifier | 12 | TS0601 | target_humidity, measure_humidity, measure_temperature... |
| ir_blaster | 27 | TS1201, TS0601 | button.learn_ir, onoff |
| lcdtemphumidsensor | 6 | TS0201 | measure_temperature, measure_humidity, measure_battery |
| led_controller_cct | 12 | TS0502 | onoff, dim, light_temperature... |
| led_controller_dimmable | 2 | TS1101 | onoff, dim |
| led_controller_rgb | 5 | TS0503, TS0504 | onoff, dim, light_hue... |
| led_strip | 24 | TS0601 | dim, measure_battery, onoff... |
| led_strip_advanced | 3 | TS0601 | dim, light_hue, light_saturation... |
| led_strip_rgbw | 19 | TS0601 | light_hue, light_saturation, light_temperature... |
| lock_smart | 18 | TS0601 | locked, lock_mode, measure_battery... |
| module_mini_switch | 26 | TS0001, TS0011 | measure_battery, alarm_generic, measure_power... |
| motion_sensor | 154 | TS0202, TS0210, TS0222, TS0225, TS0601, ZG-204Z | alarm_motion, measure_battery, measure_luminance |
| motion_sensor_radar_mmwave | 89 | TS0202, TS0225, TS0601 | alarm_motion, measure_distance, measure_temperature... |
| pet_feeder | 7 | TS0601 | button.feed, alarm_generic |
| plug_energy_monitor | 165 | TS0121, TS0201, TS0601, TS011F, A7Z, A11Z | measure_power, meter_power, measure_voltage... |
| plug_smart | 69 | TS0001, TS0111, TS0115, TS0121, TS0218, TS0601, S60ZBTPF, S60ZBTPG | onoff, measure_power, meter_power... |
| pool_pump | 7 | TS0601, TS011F, TS0001 | onoff, measure_power, meter_power |
| power_clamp_meter | 16 | TS0601 | measure_power, meter_power, measure_current... |
| power_meter | 8 | TS0601 | measure_power, meter_power, measure_voltage... |
| presence_sensor_ceiling | 20 | TS0601 | alarm_motion, onoff, measure_luminance... |
| presence_sensor_radar | 155 | TS0225, TS0601, ZG-204ZL, ZG-204ZV, ZG-204ZH, ZG-204ZK, ZG-204ZM, ZG-205Z, CK-BL702-MWS-01(7016), CK-BL702-MWS-01, SZLMR10 | alarm_motion, measure_luminance, measure_battery... |
| radiator_controller | 2 | TS0001, TS0002, TS0011, TS0012, TS0601 | onoff, target_temperature, measure_temperature... |
| radiator_valve | 141 | TS0601 | target_temperature, measure_temperature, thermostat_mode... |
| rain_sensor | 17 | TS0207, TS0601 | alarm_water, measure_humidity, measure_battery |
| scene_switch_1 | 3 | TS0203 | button.1, measure_battery |
| scene_switch_2 | 2 | TS0012 | button.1, button.2, measure_battery |
| scene_switch_3 | 2 | TS0013 | button.1, button.2, button.3... |
| scene_switch_4 | 12 | TS0044, TS0601, ZG-101ZS | button.1, button.2, button.3... |
| scene_switch_6 | 2 | TS0046 | button.1, button.2, button.3... |
| shutter_roller_controller | 3 | TS0601 | alarm_generic, windowcoverings_state, measure_battery... |
| siren | 39 | TS0216, TS0219, TS0601 | alarm_motion, measure_battery, alarm_generic... |
| smart_breaker | 19 | TS0601, TS0001, TS011F | onoff, alarm_generic, measure_power... |
| smart_heater | 3 | TS0601 | onoff, target_temperature, thermostat_mode... |
| smart_heater_controller | 12 | TS0601 | onoff, target_temperature, measure_temperature... |
| smart_rcbo | 4 | TS0601 | onoff, alarm_generic, measure_power... |
| smoke_detector_advanced | 78 | TS0205, TS0601 | alarm_smoke, measure_battery, measure_temperature... |
| soil_sensor | 63 | TS0601, ZG-303Z, CS-201Z | measure_soil_moisture, measure_temperature, measure_humidity... |
| switch_1gang | 324 | TS0001, TS0002, TS0003, TS0004, TS0006, TS0011, TS0012, TS0013, TS0014, TS0041, TS0046, TS0112, TS0302, TS0601 | onoff, measure_battery, measure_power... |
| switch_2gang | 105 | TS0002, TS0003, TS0012, TS0601 | onoff, onoff.gang2, measure_power... |
| switch_3gang | 23 | TS0003, TS0004, TS0013, TS0601 | onoff, onoff.gang2, onoff.gang3... |
| switch_4gang | 32 | TS0004, TS0005, TS0006, TS0014, TS0601, TS0726 | onoff, onoff.gang2, onoff.gang3... |
| switch_plug_1 | 2 | TS011F | onoff, measure_power, meter_power... |
| switch_plug_2 | 2 | TS011F | onoff, onoff.outlet2, measure_power... |
| switch_temp_sensor | 2 | TS0001, TS0011 | onoff, measure_temperature, measure_humidity |
| switch_wall_5gang | 2 | TS0015 | onoff, onoff.gang2, onoff.gang3... |
| switch_wall_6gang | 3 | TS0016, TS0601 | onoff, onoff.gang2, onoff.gang3... |
| switch_wall_7gang | 3 | TS0007 | onoff, onoff.gang2, onoff.gang3... |
| switch_wall_8gang | 3 | TS0008 | onoff, onoff.gang2, onoff.gang3... |
| switch_wireless | 2 | TS0041, TS0042, TS0043, TS0044 | alarm_generic, measure_battery |
| temphumidsensor | 13 | TS0201, TY0201, SNTZ003, CK-TLSR8656-SS5-01(7014) | measure_temperature, measure_humidity, measure_battery |
| thermostat_4ch | 2 | TS0601 | onoff, onoff.ch2, onoff.ch3... |
| thermostat_tuya_dp | 67 | TS0011, TS0601 | target_temperature, measure_temperature, thermostat_mode... |
| usb_dongle_dual_repeater | 2 | TS0002 | onoff, onoff.usb2, measure_power... |
| usb_outlet_advanced | 31 | TS0115, TS0121, TS0601 | onoff, onoff.socket2, onoff.usb1... |
| valve_irrigation | 2 | TS0601 | valve_position.1, valve_position.2, valve_position.3... |
| valve_single | 2 | TS0601 | onoff, valve_position, measure_battery |
| vibration_sensor | 40 | TS0209, TS0210, TS0601, ZG-102ZM | alarm_vibration, measure_battery, alarm_tamper |
| water_leak_sensor | 78 | TS0207, TS0601, q9mpfhw, ZG-222Z, ZG-223Z | alarm_water, measure_battery |
| water_tank_monitor | 20 | TS0601 | measure_water_level, measure_water_percentage, alarm_water_low... |
| water_valve_smart | 16 | TS0601 | alarm_motion, measure_temperature, alarm_water... |
| weather_station_outdoor | 2 | TS0601 | measure_temperature, measure_humidity, measure_pressure... |

---
**Total:** 101 drivers, 5468 manufacturer IDs

*Generated: 2026-01-18T02:09:18.963Z*
