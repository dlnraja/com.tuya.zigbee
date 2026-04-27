# Device Support Matrix

| Driver | Manufacturers | Products | Capabilities |
|--------|---------------|----------|-------------|
| air_purifier | 206 | RH3052, TS0201, TS0222, TS0601, TS0601_AIR_PURIFIER, TY0201 | dim, measure_pm25, onoff... |
| air_purifier_climate_hybrid | 0 | RH3052, TS0201, TS0222, TS0601, TY0201 | onoff, dim, measure_pm25... |
| air_purifier_contact_hybrid | 0 | TS0601 | alarm_contact, alarm_tamper, measure_battery... |
| air_purifier_curtain_hybrid | 0 | TS0601 | windowcoverings_state, windowcoverings_set, windowcoverings_tilt_set... |
| air_purifier_dimmer_hybrid | 0 | TS0601 | dim, onoff, measure_power... |
| air_purifier_din_hybrid | 0 | - | onoff, measure_power, meter_power... |
| air_purifier_lcdtemphumidsensor_hybrid | 0 | TS0201, TS0601 | onoff, dim, measure_pm25... |
| air_purifier_motion_hybrid | 0 | TS0601 | onoff, dim, measure_pm25... |
| air_purifier_presence_hybrid | 0 | TS0601 | alarm_motion, measure_luminance, measure_temperature... |
| air_purifier_quality_hybrid | 0 | - | measure_co2, measure_temperature, measure_humidity... |
| air_purifier_sensor_hybrid | 0 | - | alarm_motion, measure_luminance.distance, measure_temperature... |
| air_purifier_siren_hybrid | 0 | TS0601 | onoff, measure_temperature, measure_humidity... |
| air_purifier_soil_hybrid | 0 | TS0601 | measure_humidity.soil, measure_temperature, measure_humidity... |
| air_purifier_switch_hybrid | 0 | TS0601 | onoff, measure_battery, measure_power... |
| air_quality_co2 | 11 | TS0601, TS0601_CO2 | measure_co2, measure_temperature, measure_humidity... |
| air_quality_comprehensive | 13 | TS0005, TS0006, TS0601 | measure_co2, measure_pm25, measure_pm10... |
| air_quality_comprehensive_hybrid | 0 | TS0601 | measure_co2, measure_pm25, measure_pm10... |
| blaster_remote_hybrid | 1 | TS1201 | button.learn_ir, ir_learned_code, ir_send_code... |
| bulb_dimmable | 22 | A19 W 10 YEAR, BR30 W 10 YEAR, GL-B-001Z, LED1623G12, LED1649C5, LED1836G9, LWB004, LWB006, LWB010, LWB014, PAR38 W 10 YEAR, PLUG 01, RB 165, RB 175 W, RS 125, TS0501, TS0501A, TS0501B, TS0502B, ZBT-DIMMABLELIGHT | dim, light_hue, light_mode... |
| bulb_dimmable_dimmer_hybrid | 0 | TS0052, TS1101, TS110E, TS110F | dim, light_hue, light_saturation... |
| bulb_rgb | 42 | E11-G13, E11-G14, E11-G23, GL-C-006, LCT001, LCT002, LCT003, LCT007, LCT010, LCT011, LCT012, LCT014, LCT015, LCT016, RB 185 C, RB 285 C, TS0503A, TS0503B, TS0504B, TS0505, TS0505A, TS0505B, ZB-CL01, ZBT-COLORLIGHT | dim, light_hue, light_saturation... |
| bulb_rgb_led_hybrid | 0 | TS0505B | dim, light_hue, light_saturation... |
| bulb_rgb_rgbw_hybrid | 0 | - | dim, light_hue, light_saturation... |
| bulb_rgbw | 23 | CK-BL702-AL-01(7009_Z102LG03-1), CLASSIC A60 RGBW, FE-GU10-5W, FLEX RGBW, GENERIC, GL-B-008Z, GL-C-008, SMD9300, TS0504A, TS0504B, TS0505A, TS0505B, TS1002 | onoff, dim, light_hue... |
| bulb_rgbw_universal_hybrid | 1 | CK-BL702-AL-01(7009_Z102LG03-1), TS0504A, TS0504B, TS0505A, TS0505B | onoff, dim, measure_temperature... |
| bulb_tunable_white | 10 | CLASSIC A60 TW, E11-N13, E11-N14, E12-N13, E12-N14, GL-B-007Z, GL-C-007, LED1545G12, LED1546G12, LTW001, LTW004, LTW010, LTW012, LTW013, LTW015, RB 178 T, RS 128 T, TS0502, TS0502A, TS0502B, ZBT-CCTLIGHT | dim, light_hue, light_saturation... |
| bulb_tunable_white_hybrid | 0 | TS0502B | dim, light_hue, light_saturation... |
| bulb_white | 2 | TS0501 | dim, light_hue, light_saturation... |
| button_emergency_sos | 26 | TS0215, TS0215A, TS0218, TS0601, ZBPB10BK | alarm_generic, measure_battery, measure_radio_stability... |
| button_wireless | 4 | CK-TLSR8656-SS5-01(7000), SNZB-01, SNZB-01M, SNZB-01P, TS0040, WB-01, WB01 | measure_battery, measure_radio_stability, measure_maintenance_score |
| button_wireless_1 | 29 | 3450-L, E1524/E1810, E1743, E1744, E1812, E2001/E2002, E2123, LUMI.REMOTE.B1ACN01, LUMI.SENSOR_SWITCH, LUMI.SENSOR_SWITCH.AQ2, LUMI.SENSOR_SWITCH.AQ3, ROM001, RWL020, RWL021, RWL022, WXKG01LM, WXKG02LM, WXKG03LM, WXKG06LM, WXKG07LM, WXKG11LM, WXKG12LM, ZG-101ZL | button.1, measure_battery, measure_radio_stability... |
| button_wireless_2 | 240 | TS0001, TS0001_FINGERBOT, TS0002, TS0003, TS000F, TS0011, TS0012, TS0013, TS0042, TS0001_fingerbot, TS011F, TS0043 | button.1, button.2, measure_battery... |
| button_wireless_3 | 8 | TS0043 | button.1, button.2, button.3... |
| button_wireless_4 | 57 | SNZB-01M, TS0014, TS0044, TS004F | button.1, button.2, button.3... |
| button_wireless_6 | 4 | TS0046, TS0601 | button.1, button.2, button.3... |
| button_wireless_8 | 1 | TS0048 | button.1, button.2, button.3... |
| button_wireless_fingerbot_hybrid | 5 | - | onoff, measure_battery, measure_power... |
| button_wireless_plug_hybrid | 17 | TS0111, TS011F, TS0121, TS0121, TSO121 | measure_power, meter_power, measure_voltage... |
| button_wireless_scene_hybrid | 0 | - | button.1, button.2, measure_battery... |
| button_wireless_smart_hybrid | 15 | TS0041, TS004F | button.1, measure_battery, measure_radio_stability... |
| button_wireless_switch_hybrid | 1 | TS0001, TS0002, TS0003, TS000F, TS0011, TS0012, TS0013, TS0014, TS011F | onoff, onoff.gang2, measure_power... |
| button_wireless_usb_hybrid | 0 | - | onoff, onoff.usb2, measure_power... |
| button_wireless_valve_hybrid | 0 | - | button.1, button.2, measure_battery... |
| button_wireless_wall_hybrid | 0 | TS0001, TS0002, TS0003, TS0011, TS0012, TS0013, TS0042, TS0043 | button.1, button.2, measure_battery... |
| ceiling_fan | 2 | TS0601, TS0601_FAN | dim, onoff, dim.speed... |
| climate_sensor | 331 | CK-TLSR8656-SS5-01(7014), EXCELLUX, LUMI.SENSOR_HT, LUMI.SENSOR_HT.AGL02, LUMI.WEATHER, RH3052, SM0201, SNZB-02, SNZB-02D, SNZB-02DR2, SNZB-02LD, SNZB-02P, SNZB-02WD, TH01, THS317-ET, TS0201, TS0222, TS0601, TY0201, WSDCGQ01LM, WSDCGQ11LM, WSDCGQ12LM, ZG-227Z, ZG-227ZL, ZG-303Z | measure_battery, measure_humidity, measure_temperature... |
| climate_sensor_dimmer_hybrid | 0 | - | dim, onoff, measure_power... |
| climate_sensor_gas_hybrid | 0 | TS0601 | alarm_generic, alarm_co, alarm_co2... |
| climate_sensor_plug_hybrid | 0 | TS0601 | onoff, measure_power, meter_power... |
| climate_sensor_presence_hybrid | 0 | TS0601 | alarm_motion, measure_luminance, measure_temperature... |
| climate_sensor_smart_hybrid | 0 | - | onoff.gang1, onoff.gang2, onoff.gang3... |
| climate_sensor_switch_hybrid | 0 | TS0601 | onoff, measure_battery, measure_power... |
| co_sensor | 4 | TS0601, TS0601_CO | alarm_co, measure_battery, measure_co... |
| contact_sensor | 213 | 3300-S, 3320-L, CK-TLSR8656-SS5-01(7003), DOORWINDOW-SENSOR-ZB3.0, DS01, E1603/E1702, EXCELLUX, LUMI.MAGNET.AC01, LUMI.MAGNET.AGL02, LUMI.SENSOR_MAGNET, LUMI.SENSOR_MAGNET.AQ2, MCCGQ01LM, MCCGQ11LM, MCCGQ12LM, MCCGQ14LM, MCT-340 E, Q9MPFHW, RH3001, SNZB-04, SNZB-04P, SNZB-04PR2, SNZB-04R2, TRADFRI OPEN/CLOSE REMOTE, TS0021, TS0203, TS0207, TS0601, TY0203, ZG-102Z, ZG-102ZL, DoorWindow-Sensor-ZB3.0, q9mpfhw | alarm_contact, alarm_tamper, measure_battery... |
| contact_sensor_curtain_hybrid | 0 | - | windowcoverings_state, windowcoverings_set, windowcoverings_tilt_set... |
| contact_sensor_dimmer_hybrid | 0 | - | alarm_contact, measure_battery, alarm_tamper... |
| contact_sensor_plug_hybrid | 0 | TS0601 | onoff, measure_power, meter_power... |
| contact_sensor_switch_hybrid | 0 | TS0601 | onoff, measure_battery, measure_power... |
| contact_sensor_zigbee_hybrid | 0 | TS0207 | alarm_contact, measure_battery, alarm_tamper... |
| curtain_motor | 79 | AM02, AM43-0.45/40-ES-EB, AM43-0.45/40-ES-EZ, DS421, DS82, E1757, FYRTUR, KADRILJ, LUMI.CURTAIN, LUMI.CURTAIN.ACN002, LUMI.CURTAIN.HAGL04, TS0105, TS0301, TS0302, TS030F, TS0601, TS130F, ZBCURTAIN, ZC-LS02 | windowcoverings_state, windowcoverings_set, windowcoverings_tilt_set... |
| curtain_motor_shutter_hybrid | 0 | TS0601 | windowcoverings_state, windowcoverings_set, windowcoverings_tilt_set... |
| curtain_motor_tilt | 6 | TS0601, TS0601_CURTAIN_TILT | windowcoverings_state, windowcoverings_set, windowcoverings_tilt_set... |
| curtain_motor_tilt_hybrid | 1 | TS0601 | windowcoverings_state, windowcoverings_set, windowcoverings_tilt_set... |
| curtain_motor_wall_hybrid | 0 | - | windowcoverings_state, windowcoverings_set, windowcoverings_tilt_set... |
| device_air_purifier_climate_hybrid | 0 | RH3052, TS0201, TS0222, TS0601, TY0201 | onoff, dim, measure_pm25... |
| device_air_purifier_din_hybrid | 0 | - | measure_power, meter_power, measure_voltage... |
| device_air_purifier_floor_hybrid | 0 | TS0601 | target_temperature, measure_temperature, measure_temperature.floor... |
| device_air_purifier_humidifier_hybrid | 0 | - | onoff, dim, measure_humidity... |
| device_air_purifier_hybrid | 0 | TS0601 | target_temperature, measure_temperature, thermostat_mode... |
| device_air_purifier_led_hybrid | 0 | TS0601 | dim, measure_battery, onoff... |
| device_air_purifier_motion_hybrid | 0 | TS0601 | onoff, dim, measure_pm25... |
| device_air_purifier_plug_hybrid | 0 | TS0601 | measure_power, meter_power, measure_voltage... |
| device_air_purifier_presence_hybrid | 0 | TS0601 | alarm_motion, measure_luminance, measure_temperature... |
| device_air_purifier_quality_hybrid | 0 | TS0601 | measure_co2, measure_pm25, measure_pm10... |
| device_air_purifier_radiator_hybrid | 1 | TS0601 | target_temperature, measure_temperature, thermostat_mode... |
| device_air_purifier_siren_hybrid | 0 | - | alarm_motion, measure_battery, alarm_generic... |
| device_air_purifier_smart_hybrid | 0 | - | target_temperature, measure_temperature, measure_humidity... |
| device_air_purifier_smoke_hybrid | 0 | TS0601 | alarm_smoke, measure_battery, measure_temperature... |
| device_air_purifier_soil_hybrid | 0 | TS0601 | measure_humidity.soil, measure_temperature, measure_humidity... |
| device_air_purifier_thermostat_hybrid | 0 | TS0601 | target_temperature, measure_temperature, thermostat_mode... |
| device_air_purifier_water_hybrid | 0 | - | measure_water_level, measure_water_percentage, alarm_water_low... |
| device_din_rail_meter_hybrid | 2 | TS0601 | dim.humidity, measure_humidity, measure_temperature... |
| device_floor_heating_hybrid | 0 | TS0601 | target_temperature, measure_temperature, measure_temperature.floor... |
| device_floor_heating_thermostat_hybrid | 0 | TS0601 | target_temperature, measure_temperature, measure_temperature.floor... |
| device_generic_diy_universal_hybrid | 3 | TS0026, TS0041A, TS0052, TS0105, TS0224, TS0901 | onoff, dim, measure_temperature... |
| device_generic_tuya_hybrid | 9 | TS0601 | onoff, dim, measure_temperature... |
| device_generic_tuya_universal_hybrid | 23 | TS0203, TS0601 | measure_battery, measure_temperature, measure_humidity... |
| device_plug_energy_hybrid | 1 | S26R2ZB, S31 LITE ZB, S40LITE, S60ZBTPF, S60ZBTPG | onoff, measure_power, meter_power... |
| device_plug_energy_monitor_hybrid | 0 | - | onoff, measure_power, meter_power... |
| device_plug_smart_hybrid | 9 | TS0049, TS0101 | onoff, measure_power, meter_power... |
| device_plug_smart_water_hybrid | 0 | TS0049 | onoff, measure_power, meter_power... |
| device_radiator_valve_hybrid | 0 | TS0601 | target_temperature, measure_temperature, thermostat_mode... |
| device_radiator_valve_smart_hybrid | 0 | TS0601 | target_temperature, measure_temperature, thermostat_mode... |
| device_radiator_valve_thermostat_hybrid | 0 | TS0601 | target_temperature, measure_temperature, thermostat_mode... |
| dimmer_3gang | 2 | TS0601, TS0601_DIMMER3 | onoff, dim, onoff.channel2... |
| dimmer_air_purifier_hybrid | 0 | TS0601 | dim, onoff, measure_power... |
| dimmer_bulb_dimmable_hybrid | 0 | TS0052, TS1101, TS110E, TS110F | dim, light_hue, light_saturation... |
| dimmer_dual_channel | 1 | TS0601, TS1101, TS110E, TS110F | onoff, dim, onoff.channel2... |
| dimmer_dual_channel_hybrid | 2 | TS0601, TS1101 | onoff, dim, onoff.channel2... |
| dimmer_ts110e | 0 | TS110E | onoff, dim, measure_radio_stability... |
| dimmer_wall_1gang | 74 | TS0052, TS0601, TS0601_DIM1, TS1101, TS110E, TS110F, ZBMINI-DIM, ZBMINID | dim, onoff, measure_power... |
| dimmer_wall_plug_hybrid | 0 | TS0601 | measure_power, meter_power, measure_voltage... |
| dimmer_wall_switch_hybrid | 0 | TS0601 | onoff, onoff.gang2, measure_power... |
| dimmer_wall_water_hybrid | 0 | TS0601 | dim, onoff, measure_power... |
| din_rail_meter | 13 | SDM01-3Z1, SDM02-2Z1, SPM01-1Z2, SPM02-3Z3, TS0601 | measure_power, meter_power, measure_voltage... |
| din_rail_switch | 8 | TS0001_DIN, TS0601 | onoff, measure_power, meter_power... |
| diy_custom_zigbee | 103 | ARDUINO_ZIGBEE, BUTTON, CC1352P_DEV, CC1352_DEV, CC2530_ROUTER, CC2530_SENSOR, CC2530_SWITCH, CC2531_ROUTER, CC2531_USB, CC2652P_DEV, CC2652RB_DEV, CC2652R_DEV, CC2652_DEV, COD.M, CONBEE, CONBEE II, CONBEE III, CUSTOM, DEBUG, DEMO, DIMMER, DIY-01, DIY-02, DIY-03, DIY-04, DIY-08, DIY-LIGHT, DIY-ROUTER, DIY-SENSOR, DIY-SWITCH, DIYRUZ, DIYRUZ_AIRSENSE, DIYRUZ_CONTACT, DIYRUZ_FLOWER, DIYRUZ_GEIGER, DIYRUZ_MOTION, EFR32MG_DEV, EFR32_DEV, ESP32-C6, ESP32-H2, ESP32C6_DEV, ESP32H2_DEV, HUE_BRIDGE, LIGHT, PHOSCON_GATEWAY, PLATFORMIO_ZIGBEE, PROTOTYPE, PTVO.DIMMER, PTVO.LIGHT, PTVO.ROUTER, PTVO.SENSOR, PTVO.SWITCH, RASPBEE, RASPBEE II, ROUTER, SAMPLE, SENSOR, SLZB-06, SLZB-07, SONOFF_ZBBRIDGE, SWITCH, TASMOTA, TEST, TUBE, Z2T, ZBBRIDGE, ZIGBEE_DEV_KIT, ZIGSTAR, ZIGSTAR_LAN, ZIGSTAR_POE, ZIGSTAR_STICK, ZZH, ZZH! | onoff, measure_temperature, measure_humidity... |
| door_controller | 2 | TS0601, TS0601_DOOR | alarm_motion, alarm_contact, measure_battery... |
| door_controller_garage_hybrid | 0 | TS0601 | alarm_motion, alarm_contact, measure_battery... |
| doorbell | 8 | TS0211, TS0601 | alarm_motion, alarm_contact, measure_battery... |
| energy_meter_3phase | 13 | TS0601, TS0601_3PHASE | measure_power, meter_power, measure_voltage... |
| fan_controller | 16 | TS0601, TS0601_FANCTRL | onoff, dim, measure_radio_stability... |
| fingerbot | 2 | TS0001, TS0001_FINGER, TS0001_FINGERBOT | onoff, button.push, finger_bot_mode... |
| fingerbot_switch_hybrid | 0 | TS0001 | onoff, measure_battery, measure_power... |
| fingerprint_lock | 8 | TS0601, TS0601_LOCK | locked, alarm_tamper, measure_battery... |
| floor_heating_thermostat | 1 | TS0601 | target_temperature, measure_temperature, measure_temperature.floor... |
| formaldehyde_sensor | 1 | TS0601, TS0601_HCHO | measure_co2, measure_temperature, measure_humidity... |
| garage_door | 4 | TS0601, TS0601_GARAGE | garagedoor_closed, alarm_contact, measure_radio_stability... |
| garage_door_opener | 1 | TS0601, TS0603 | garagedoor_closed, alarm_contact, measure_radio_stability... |
| gas_detector | 8 | TS0204, TS0601 | alarm_generic, alarm_co, alarm_co2... |
| gas_sensor | 36 | TS0225, TS0301, TS0601, TS0601_GAS, ZG-225Z | alarm_co, alarm_co2, alarm_contact... |
| gas_sensor_switch_hybrid | 0 | TS0601 | onoff, onoff.gang2, onoff.gang3... |
| gateway_zigbee_bridge | 0 | TS0601_GW | alarm_generic, measure_battery, onoff... |
| generic_diy | 21 | 0X8040, BASICZBR3, BATTERY SWITCH, 1 BUTTON, BATTERY SWITCH, 2 BUTTONS, BSP-EZ2, BSP-FZ2, BUTTON, CC2530, CC2531, CC2652, CUSTOM, DIY, EFEKTA, ESP32, ET093WRG, ET093WRO, ETRV0100, ETRV0101, ETRV0103, MAKER, PTVO, RELAY, ROUTER, S26R2ZB, S31ZB, S40ZBTPB, SENSOR, SNZB-01, SNZB-01P, SNZB-02, SNZB-02P, SNZB-03, SNZB-03P, SNZB-04, SNZB-04P, SNZB-06P, SWITCH, TRV001, TRV003, ZBMINI, ZBMINIL2, ZIGSTAR | measure_battery, measure_radio_stability, measure_maintenance_score |
| generic_tuya | 170 | TS0203, TS0601_GENERIC | measure_battery, measure_temperature, measure_humidity... |
| handheld_remote_4_buttons | 0 | TS0044 | button, alarm_battery, measure_radio_stability... |
| humidifier | 6 | TS0601, TS0601_HUMID | onoff, dim, measure_humidity... |
| hvac_air_conditioner | 1 | TS0601, TS0601_AC | target_temperature, measure_temperature, thermostat_mode... |
| hvac_controller | 2 | TS0601 | onoff, target_temperature, measure_temperature... |
| hvac_dehumidifier | 7 | TS0601, TS0601_DEHUM | dim.humidity, measure_humidity, measure_temperature... |
| illuminance_sensor | 1 | TS0222, ZG-106Z | measure_luminance, measure_battery, measure_radio_stability... |
| ir_blaster | 31 | TS0601, TS1201 | button.learn_ir, onoff, measure_battery... |
| ir_remote | 5 | TS1201 | button.learn_ir, ir_learned_code, ir_send_code... |
| lcdtemphumidsensor | 7 | TS0201, TS0601_LCD, TY0201 | measure_temperature, measure_humidity, measure_battery... |
| lcdtemphumidsensor_plug_energy_hybrid | 1 | TS0601 | measure_power, meter_power, measure_voltage... |
| led_controller_cct | 1 | TS0502 | onoff, dim, light_temperature... |
| led_controller_dimmable | 1 | TRI-C1ZR, TRI-K1ZR, TS0501B, TS0502B, TS0601_LED | onoff, dim, measure_radio_stability... |
| led_controller_rgb | 0 | TS0503, TS0504 | onoff, dim, light_hue... |
| led_strip | 3 | TS0505B, TS0601, TS0601_STRIP | dim, measure_battery, onoff... |
| led_strip_advanced | 1 | TS0601_STRIP_ADV | dim, light_hue, light_saturation... |
| led_strip_rgbw | 10 | TS0601_STRIP_RGBW | light_hue, light_saturation, light_temperature... |
| light_bulb_dimmable_tunable_hybrid | 24 | TS0502B | dim, light_hue, light_mode... |
| light_bulb_rgb_hybrid | 0 | TS0504B, TS0505A, TS0505B | dim, light_hue, light_saturation... |
| light_bulb_rgb_led_hybrid | 2 | TS0505B | dim, light_hue, light_saturation... |
| light_bulb_rgb_rgbw_hybrid | 28 | TS0504B, TS0505A, TS0505B | dim, light_hue, light_saturation... |
| light_bulb_tunable_white_hybrid | 0 | TS0502B | dim, light_hue, light_saturation... |
| light_sensor_outdoor | 1 | TS0222, TS0601 | measure_luminance, measure_battery, measure_radio_stability... |
| lock_smart | 12 | TS0601, TS0601_SMARTLOCK | locked, lock_mode, measure_battery... |
| module_mini_switch | 5 | 01MINIZB, ZBM5-1C-120, ZBMINI, ZBMINI-L, ZBMINIL2, ZBMINIL2-R2, ZBMINIR, ZBMINIR2, ZBMINIR2-R2 | measure_battery, alarm_generic, measure_power... |
| module_mini_switch_hybrid | 1 | ZBMINIL2 | measure_battery, alarm_generic, measure_power... |
| motion_sensor | 143 | 3305-S, 3325-S, 3326-L, CK-TLSR8656-SS5-01(7002), E1525/E1745, E1745, EXCELLUX, IH012-RT01, LUMI.MOTION.AC02, LUMI.MOTION.AGL04, LUMI.SENSOR_MOTION, LUMI.SENSOR_MOTION.AQ2, MS01, MSO1, RH3040, SML001, SML002, SML003, SML004, SNZB-03, SNZB-03P, SNZB-03R2, TRADFRI MOTION SENSOR, TS0202, TS0225, TS0601, TY0202, ZG-204Z | alarm_motion, measure_battery, measure_luminance... |
| motion_sensor_2 | 0 | TS0601 | measure_battery, measure_luminance, alarm_motion... |
| motion_sensor_radar_mmwave | 6 | TS0601, TS0601_MMWAVE | alarm_motion, measure_luminance.distance, measure_temperature... |
| motion_sensor_switch_hybrid | 0 | - | onoff, measure_battery, measure_power... |
| pet_feeder | 5 | TS0601, TS0601_FEEDER | button.feed, alarm_generic, measure_radio_stability... |
| pet_feeder_zigbee | 4 | TS0601 | button, measure_weight, alarm_generic... |
| plug_energy_monitor | 40 | A11Z, A7Z, CK-BL702-SWP-01(7020), E1603/E1702/E1708, HY0104, HY0105, JZ-ZB-005, LSPA9, LUMI.PLUG.MACN01, LUMI.PLUG.MAEU01, LUMI.PLUG.MMEU01, S31ZB, S40ZBTPB, S40ZBTPF, S40ZBTPG, S60ZBTPE, S60ZBTPF-R2, SA-028-1, SA-029-1, SNZB-06P, SP 120, SP 220, SP 222, SP-EUC01, SP-EUC02, SPM01, SPMZBR2, TRADFRI CONTROL OUTLET, TS0121, TS0121, Z111PL0H-1JX, ZBMINIL2, TS011F | measure_power, meter_power, measure_voltage... |
| plug_energy_monitor_hybrid | 1 | S26R2ZB, S31ZB, TS011F, TS0601, ZBMINIL2 | measure_temperature, measure_humidity, measure_battery... |
| plug_smart | 34 | S26R2ZB, S31 LITE ZB, S40LITE, S60ZBTPF, S60ZBTPG, TS0049, TS0101, TS0111, TS011F, TS0121, TS0601 | measure_battery, measure_current, measure_power... |
| plug_smart_switch_hybrid | 0 | - | onoff, measure_battery, measure_power... |
| pool_pump | 3 | TS0601, TS0601_POOL | onoff, measure_power, meter_power... |
| power_clamp_meter | 4 | TS0601, TS0601_CLAMP | measure_power, meter_power, measure_current... |
| power_meter | 5 | TS0601, TS0601_METER | measure_power, meter_power, measure_voltage... |
| presence_sensor_ceiling | 2 | TS0601, TS0601_CEILING | alarm_motion, onoff, measure_luminance... |
| presence_sensor_radar | 140 | CK-BL702-MWS-01, CK-BL702-MWS-01(7016), MG1_5RZ, SNZB-06P, SZLMR10, TS0225, TS0601, ZG-204ZE, ZG-204ZH, ZG-204ZK, ZG-204ZL, ZG-204ZM, ZG-204ZQ, ZG-204ZV, ZG-205Z, ZG-205ZL, ZG-302ZL, ZG-302ZM, ZP-301Z | alarm_motion, measure_luminance, measure_temperature... |
| radiator_controller | 4 | TS0601, TS0601_RAD | onoff, target_temperature, measure_temperature... |
| radiator_valve | 134 | 014G2461, 014G2463, ETRV0100, LUMI.AIRRTC.AGL001, LUMI.AIRRTC.VRFEGL01, SEA801-ZIGBEE, SPZB0001, SPZB0003, STZB402, STZB403, TRV601, TRV602, TRVZB, TS0601, TV01-ZB, TV02-ZB, ZEN-01 | target_temperature, measure_temperature, thermostat_mode... |
| radiator_valve_zigbee | 3 | TS0601 | target_temperature, measure_temperature, thermostat_mode... |
| rain_sensor | 3 | TS0207, TS0207_RAIN, TS0601, ZG-222Z, ZG-223Z | alarm_water, measure_humidity, measure_battery... |
| remote_button_emergency_sos_hybrid | 0 | - | button.1, button.2, button.3... |
| remote_button_wireless_fingerbot_hybrid | 0 | TS0001, TS0001_FINGERBOT | onoff, measure_battery, measure_power... |
| remote_button_wireless_handheld_hybrid | 0 | - | button.1, button.2, button.3... |
| remote_button_wireless_hybrid | 4 | SNZB-01, SNZB-01M, SNZB-01P, TS0001, TS0002, TS0003, TS0011, TS0012, TS0013, TS0042, TS0043, TS0044, TS0046, TS0111 | button.rotate_left, button.rotate_right, button.press... |
| remote_button_wireless_plug_hybrid | 0 | TS0111 | measure_power, meter_power, measure_voltage... |
| remote_button_wireless_scene_hybrid | 0 | TS0042, TS0043 | button.1, button.2, measure_battery... |
| remote_button_wireless_smart_hybrid | 1 | TS0041, TS004F | button.1, measure_battery, measure_radio_stability... |
| remote_button_wireless_usb_hybrid | 0 | TS0002 | onoff, onoff.usb2, measure_power... |
| remote_button_wireless_valve_hybrid | 0 | TS0001 | button.1, button.2, measure_battery... |
| remote_button_wireless_wall_hybrid | 0 | TS0001, TS0002, TS0003, TS0011, TS0012, TS0013, TS0041, TS0042, TS0043, TS0044, TS0046, TS004F | button.1, measure_battery, measure_radio_stability... |
| remote_dimmer | 1 | TS1001 | measure_battery, measure_radio_stability, measure_maintenance_score |
| scene_switch_1 | 3 | TS0601_SCENE1 | button.1, measure_battery, measure_radio_stability... |
| scene_switch_2 | 0 | TS0042, TS0601_SCENE2, TS0726 | button.1, button.2, measure_battery... |
| scene_switch_3 | 2 | TS0043, TS0601_SCENE3, TS0726 | button.1, button.2, button.3... |
| scene_switch_4 | 6 | ERS-10TZBVK-AA, TS0601, ZG-101ZS | button.1, button.2, button.3... |
| scene_switch_6 | 1 | TS0601_SCENE6 | button.1, button.2, button.3... |
| scene_switch_wall_hybrid | 0 | TS0042, TS0043 | button.1, button.2, measure_battery... |
| sensor_climate_contact_hybrid | 0 | TS0601, ZG-227Z | measure_temperature, measure_humidity, measure_battery... |
| sensor_climate_lcdtemphumidsensor_hybrid | 0 | TS0201, TS0601, TY0201 | measure_temperature, measure_humidity, measure_battery... |
| sensor_climate_motion_hybrid | 0 | - | alarm_motion, measure_battery, measure_luminance... |
| sensor_climate_presence_hybrid | 0 | - | alarm_motion, measure_luminance, measure_temperature... |
| sensor_climate_smart_hybrid | 0 | TS0601 | onoff.gang1, onoff.gang2, onoff.gang3... |
| sensor_climate_temphumidsensor_hybrid | 17 | CK-TLSR8656-SS5-01(7014), ZG-227Z | measure_temperature, measure_humidity, measure_battery... |
| sensor_contact_climate_hybrid | 0 | TS0601 | measure_temperature, measure_humidity, measure_battery... |
| sensor_contact_motion_hybrid | 0 | - | alarm_motion, measure_battery, measure_luminance... |
| sensor_contact_plug_hybrid | 1 | TS0601 | onoff, measure_power, meter_power... |
| sensor_contact_presence_hybrid | 0 | - | alarm_motion, measure_luminance, measure_temperature... |
| sensor_contact_rain_hybrid | 0 | TS0207, TS0601 | alarm_contact, measure_battery, alarm_tamper... |
| sensor_contact_water_hybrid | 0 | Q9MPFHW, TS0207, TS0601 | alarm_contact, measure_battery, alarm_tamper... |
| sensor_contact_zigbee_hybrid | 0 | TS0207 | alarm_contact, alarm_tamper, measure_battery... |
| sensor_gas_presence_hybrid | 0 | - | alarm_motion, measure_luminance, measure_temperature... |
| sensor_lcdtemphumidsensor_soil_hybrid | 0 | TS0601 | measure_humidity.soil, measure_temperature, measure_humidity... |
| sensor_lcdtemphumidsensor_temphumidsensor_hybrid | 0 | TS0201, TY0201 | measure_temperature, measure_humidity, measure_battery... |
| sensor_motion_presence_hybrid | 1 | TS0225 | alarm_motion, measure_luminance, measure_temperature... |
| sensor_motion_radar_hybrid | 0 | - | alarm_motion, measure_luminance.distance, measure_temperature... |
| sensor_presence_radar_hybrid | 1 | TS0203, TS0225, ZG-204ZL, ZG-204ZM, ZG-204ZV | alarm_motion, measure_luminance, measure_temperature... |
| shutter_roller_controller | 0 | TS0601_SHUTTER | alarm_generic, windowcoverings_state, measure_battery... |
| siren | 24 | TS0216, TS0219, TS0601 | alarm_motion, measure_battery, alarm_generic... |
| siren_sirentemphumidsensor_hybrid | 0 | TS0601 | onoff, measure_temperature, measure_humidity... |
| sirentemphumidsensor | 0 | TS0601 | onoff, measure_temperature, measure_humidity... |
| smart_breaker | 1 | TS0601, TS0601_BREAKER | onoff, alarm_generic, measure_power... |
| smart_button_switch | 0 | TS0041 | button.1, measure_battery, measure_radio_stability... |
| smart_heater | 1 | TS0601, TS0601_HEATER | onoff, target_temperature, thermostat_mode... |
| smart_heater_controller | 4 | TS0601, TS0601_HEATCTRL | onoff, target_temperature, measure_temperature... |
| smart_knob | 1 | ERS-10TZBVK-AA, TS004F | button, dim, measure_battery... |
| smart_knob_rotary | 1 | ERS-10TZBVK-AA, TS004F, ZG-101ZD | button.rotate_left, button.rotate_right, button.press... |
| smart_knob_rotary_hybrid | 0 | TS004F | button.rotate_left, button.rotate_right, button.press... |
| smart_knob_switch | 0 | TS004F | dim, alarm_battery, measure_radio_stability... |
| smart_knob_switch_hybrid | 0 | TS004F | button, dim, measure_battery... |
| smart_lcd_thermostat | 3 | TS0601 | target_temperature, measure_temperature, measure_humidity... |
| smart_rcbo | 1 | TS0601, TS0601_RCBO | onoff, alarm_generic, measure_power... |
| smart_remote_1_button | 0 | TS004F | measure_battery, measure_radio_stability, measure_maintenance_score |
| smart_remote_1_button_2 | 0 | - | button.1, measure_battery, measure_radio_stability... |
| smart_remote_4_buttons | 0 | - | button.1, button.2, button.3... |
| smart_scene_panel | 2 | TS0601 | onoff.gang1, onoff.gang2, onoff.gang3... |
| smoke_detector_advanced | 42 | GS361A-H04, HS1SA, HS3SA, JTYJ-GD-01LM/BW, LUMI.SENSOR_SMOKE, NAS-SD02B0, PG-S11Z, SA12IZL, SD8SC_00.00.03.12TC, SMSZB-120, SSSQS01LM, TS0205, TS0601, YG400A | alarm_smoke, measure_battery, measure_temperature... |
| soil_sensor | 36 | ARTECO, CS-201Z, TS0601, ZG-303Z | measure_humidity.soil, measure_temperature, measure_humidity... |
| switch_1gang | 349 | 01MINIZB, BASICZBR3, S26R2ZB, S31ZB, TS0001, TS0001_POWER, TS0001_SWITCH, TS0001_SWITCH_MODULE, TS000F, TS0011, TS0101, TS011F, TS0601, TS0726, TS4100, ZBM5-1C-120, ZBM5-2C-120, ZBM5-3C-120, ZBMINI, ZBMINIL2, ZBMINIL2-R2, ZBMINIR, ZBMINIR2, ZBMINIR2-R2, ZG-301Z, ZG-302Z1 | onoff, measure_battery, measure_power... |
| switch_2gang | 32 | TS0002, TS0002_POWER, TS0002_SWITCH_MODULE, TS0003, TS0012, TS0013, ZG-302Z2, ZG-305Z | onoff, onoff.gang2, measure_power... |
| switch_3gang | 27 | TS0003, TS0003_POWER, TS0003_SWITCH_MODULE, TS0013, TS0601, ZG-302Z3 | onoff, onoff.gang2, onoff.gang3... |
| switch_4gang | 49 | JZ-ZB-004, TS0004, TS0004_POWER, TS0004_SWITCH_MODULE, TS0014, TS0601 | onoff, onoff.gang2, onoff.gang3... |
| switch_dimmer_1gang | 2 | TS0601 | onoff, dim, measure_radio_stability... |
| switch_hybrid | 0 | TS011F, TS0601, TS0726 | onoff, onoff.gang2, measure_power... |
| switch_plug_1 | 0 | TS0601_SP1 | onoff, measure_power, meter_power... |
| switch_plug_2 | 1 | TS0122 | onoff, onoff.outlet2, measure_power... |
| switch_temp_sensor | 0 | TS0601_TEMPSWITCH | onoff, measure_temperature, measure_humidity... |
| switch_wall_5gang | 1 | TS0015, TS0601 | onoff, onoff.gang2, onoff.gang3... |
| switch_wall_6gang | 8 | TS0016, TS0601, TS0726 | onoff, onoff.gang2, onoff.gang3... |
| switch_wall_7gang | 2 | TS0007 | onoff, onoff.gang2, onoff.gang3... |
| switch_wall_8gang | 5 | TS0601, TS0601_8GANG | onoff, onoff.gang2, onoff.gang3... |
| switch_wall_hybrid | 0 | - | onoff, measure_battery, measure_power... |
| switch_wireless | 17 | TS0601, TS0601_WIRELESSSW | alarm_generic, measure_battery, measure_radio_stability... |
| temphumidsensor | 3 | CK-TLSR8656-SS5-01(7014), RH3052, SNTZ003, TS0201, TY0201, ZG-227Z | measure_temperature, measure_humidity, measure_battery... |
| thermostat_4ch | 1 | TS0601, TS0601_THERMO4CH | onoff, onoff.ch2, onoff.ch3... |
| thermostat_tuya_dp | 36 | TS0601, TS0601_THERMO | target_temperature, measure_temperature, thermostat_mode... |
| universal_fallback | 19 | Q9MPFHW, TS0001, TS0002, TS0003, TS0004, TS0005, TS0006, TS0011, TS0012, TS0013, TS0014, TS0015, TS0041, TS0042, TS0043, TS0044, TS0045, TS0046, TS0047, TS0048, TS004F, TS0101, TS0111, TS011F, TS0121, TS0201, TS0204, TS0205, TS0206, TS0207, TS0208, TS0209, TS0210, TS0211, TS0212, TS0215, TS0215A, TS0216, TS0216A, TS0218, TS0222, TS0225, TS0301, TS0302, TS0303, TS0304, TS0401, TS0402, TS0501, TS0501A, TS0501B, TS0502, TS0502A, TS0502B, TS0503, TS0503A, TS0503B, TS0504, TS0504A, TS0504B, TS0505, TS0505A, TS0505B, TS0601, TS110E, TS110F, TS130F | measure_battery, measure_radio_stability, measure_maintenance_score |
| universal_zigbee | 14 | 005F0C3B, 5P1VJ8R, 6DFGETQ, AABYBJA, CK-BL702-AL-01, CK-BL702-AL-01(7009_Z102LG03-1), CK-BL702-AL-01(7009_Z102LG04-1), CK-BL702-AL-01(7009_Z102LG04-2), D3-DPWK-TY, E220-KR4N0Z0-HA, ERS-10TZBVK-AA, FNB54-WTS08ML1.0, GQ8B1UV, HY0017, HY0080, IH012-RT01, JZ-ZB-004, KJINTBL, MCDJ3AQ, MCDJ3AQ\U0000, OWVFNI3, OWVFNI3\U0000, Q9MPFHW, QNAZJ70, RH3040, RH3052, SM0001, SM0202, SM0212, SNTZ003, SNTZ009, TS0001, TS0002, TS0003, TS0004, TS0006, TS0011, TS0012, TS0013, TS0014, TS0026, TS0041, TS0041A, TS0042, TS0043, TS0044, TS0046, TS0049, TS0052, TS0105, TS0111, TS0115, TS011E, TS011F, TS0201, TS0202, TS0203, TS0204, TS0205, TS0207, TS0207_WATER_LEAK_DETECTOR, TS020C, TS0210, TS0216, TS0218, TS0224, TS0301, TS030F, TS0501, TS0502A, TS0502B, TS0503A, TS0503B, TS0504A, TS0504B, TS0505, TS0505A, TS0505B, TS0505B_1, TS0601, TS0601_COVER_1, TS0601_SMOKE_4, TS0601_SWITCH, TS0601_SWITCH_1_GANG, TS0601_SWITCH_2_GANG, TS0601_SWITCH_3_GANG, TS0901, TS130F, TT001ZAV20, TY0201, TYZS1L, U1RKTY3, U86KCJ-ZP, U86KWF-ZPSJ, ZG-101ZD, ZG-102Z, ZG-102ZL, ZG-103Z, ZG-204Z, ZG-204ZL, ZG-204ZM, ZG-222Z, ZG-225Z, ZG-227Z, ZG-227ZL, ZG-302Z1, ZG-302Z2, ZG-302Z3 | onoff, dim, measure_temperature... |
| usb_dongle_dual_repeater | 1 | TS0002, TS0207, TS0601_REPEATER | onoff, onoff.usb2, measure_power... |
| usb_dongle_triple | 0 | TS0003 | onoff, onoff.usb2, onoff.usb3... |
| usb_outlet_advanced | 14 | TS0115, TS011F, TS0601 | onoff, onoff.socket2, onoff.usb1... |
| valve_dual_irrigation | 3 | TS0601 | onoff.valve_1, onoff.valve_2, measure_battery... |
| valve_irrigation | 19 | TS0049, TS0601, TS0601_IRRIGATION | dim.valve_1, dim.valve_2, dim.valve_3... |
| valve_single | 2 | TS0001, TS0601, TS0601_VALVE | onoff, dim.valve, measure_battery... |
| vibration_sensor | 35 | TS0209, TS0210, TS0601, ZG-102ZM, ZG-103Z, ZG-103ZL | alarm_vibration, measure_temperature, measure_battery... |
| wall_curtain_switch | 0 | - | windowcoverings_set, windowcoverings_state, measure_radio_stability... |
| wall_dimmer_1gang_1way | 1 | EDM-1ZBA-EU, TRI-C1ZR, TRI-K1ZR, TS004F, TS0501B | onoff, dim, measure_radio_stability... |
| wall_remote_1_gang | 0 | - | button.1, measure_battery, measure_radio_stability... |
| wall_remote_2_gang | 0 | TS0042 | button.1, button.2, measure_battery... |
| wall_remote_3_gang | 1 | TS0043 | button.1, button.2, button.3... |
| wall_remote_4_gang | 0 | TS0044 | button.1, button.2, button.3... |
| wall_remote_4_gang_2 | 0 | TS004F | button.1, button.2, button.3... |
| wall_remote_4_gang_3 | 0 | TS0044 | button.1, button.2, button.3... |
| wall_remote_6_gang | 0 | TS0046 | button.1, button.2, button.3... |
| wall_switch_1gang_1way | 3 | TS0001, TS0011 | onoff, measure_radio_stability, measure_maintenance_score |
| wall_switch_2gang_1way | 4 | TS0002, TS0012, TS0042 | onoff, measure_radio_stability, measure_maintenance_score |
| wall_switch_3gang_1way | 7 | TS0003, TS0013, TS0043 | onoff, measure_radio_stability, measure_maintenance_score |
| wall_switch_4gang_1way | 1 | TS0726 | onoff, measure_radio_stability, measure_maintenance_score |
| water_leak_sensor | 47 | 3315-S, 3315-SEU, CK-TLSR8656-SS5-01(7019), HS1WL, LS21001, LUMI.SENSOR_WLEAK.AQ1, Q9MPFHW, SJCGQ11LM, SJCGQ12LM, SJCGQ13LM, SNZB-05, SNZB-05P, SQ510A, TS0207, TS0601, ZG-222Z, ZG-223Z, _TZ3000_EIT6L5, _TZ3000_K4EJ3WW2, _TZ3000_KYB656NO | alarm_water, measure_battery, alarm_tamper... |
| water_tank_monitor | 8 | TS0601, TS0601_TANK | measure_water_level, measure_water_percentage, alarm_water_low... |
| water_valve_garden | 3 | TS0049 | onoff, measure_battery, measure_radio_stability... |
| water_valve_smart | 15 | SWV-ZFE, SWV-ZFU, SWV-ZN, SWV-ZNE, SWV-ZNU, TS0601, TS0601_WATERVALVE | onoff, meter_water, measure_temperature... |
| weather_station_outdoor | 2 | TS0601, TS0601_WEATHER | measure_temperature, measure_humidity, measure_pressure... |
| zigbee_repeater | 5 | TS0207 | measure_radio_stability, measure_maintenance_score |

---
**Total:** 272 drivers, 3488 manufacturer IDs

*Generated: 2026-04-27T07:20:51.196Z*
