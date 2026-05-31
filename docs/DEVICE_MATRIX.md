# Device Support Matrix

| Driver | Manufacturers | Products | Capabilities |
|--------|---------------|----------|-------------|
| air_purifier | 5 | TS0601_air_purifier, TS0601 | onoff, dim, measure_pm25 |
| air_purifier_motion | 9 | TS0601, TS0225, Excellux | onoff, dim, measure_pm25... |
| air_purifier_presence | 20 | TS0601_air_purifier, TS0601 | alarm_motion, measure_luminance, measure_temperature... |
| air_purifier_sensor | 3 | TS0601 | alarm_motion, measure_luminance.distance, measure_temperature... |
| air_purifier_switch | 20 | TS0601_air_purifier, TS0601 | onoff, measure_battery, measure_power... |
| air_quality_co2 | 28 | TS0601_co2, TS0601 | measure_co2, measure_temperature, measure_humidity... |
| air_quality_comprehensive | 39 | TS0005, TS0006, TS0601 | measure_co2, measure_pm25, measure_temperature... |
| bed_sensor | 302 | TS0202, TS0225, ZG-204Z, MS01, RH3040, IH012-RT01, TY0202, lumi.sensor_motion, lumi.sensor_motion.aq2, lumi.motion.ac02, lumi.motion.agl04, TRADFRI motion sensor, E1745, E1525/E1745, SML001, SML002, SML003, SML004, 3326-L, 3305-S, 3325-S, SNZB-03, TS0601, SNZB-03P, MSO1, CK-TLSR8656-SS5-01(7002), SNZB-03R2 | alarm_contact, measure_battery, alarm_battery |
| bulb_dimmable | 634 | TS0501A, LED1623G12, LED1649C5, LED1836G9, LWB004, LWB006, LWB010, LWB014, Plug 01, A19 W 10 year, BR30 W 10 year, PAR38 W 10 year, GL-B-001Z, RS 125, RB 165, RB 175 W, ZBT-DimmableLight, TS0501B, TS110E, TS110F, TS0052, TS1101 | dim, light_hue, light_saturation... |
| bulb_dimmable_dimmer | 632 | TS0501A, LED1623G12, LED1649C5, LED1836G9, LWB004, LWB006, LWB010, LWB014, Plug 01, A19 W 10 year, BR30 W 10 year, PAR38 W 10 year, GL-B-001Z, RS 125, RB 165, RB 175 W, ZBT-DimmableLight, TS0501B, TS110E, TS110F | dim, light_hue, light_saturation... |
| bulb_rgb | 25 | TS0503A, TS0503B, LCT001, LCT002, LCT003, LCT007, LCT010, LCT011, LCT012, LCT014, LCT015, LCT016, GL-C-006, RB 185 C, RB 285 C, E11-G13, E11-G14, E11-G23, ZBT-ColorLight, TS0505A, TS0505B, ZB-CL01, TS0504B | dim, light_hue, light_saturation... |
| bulb_rgb_led | 4 | TS0505B | dim, light_hue, light_saturation... |
| bulb_rgbw | 243 | generic, TS0504A, TS0504B, TS0505A, TS0505B, Classic A60 RGBW, Flex RGBW, GL-C-008, GL-B-008Z, TS1002, FE-GU10-5W, SMD9300, CK-BL702-AL-01(7009_Z102LG03-1) | onoff, dim, light_hue... |
| bulb_rgbw_universal | 14 | TS0505B, TS0504B, TS0503B | onoff, dim, measure_temperature... |
| bulb_tunable_white | 58 | TS0502A, TS0502B, LED1545G12, LED1546G12, LTW001, LTW004, LTW010, LTW012, LTW013, LTW015, Classic A60 TW, GL-C-007, GL-B-007Z, RS 128 T, RB 178 T, E11-N13, E11-N14, E12-N13, E12-N14, ZBT-CCTLight | dim, light_hue, light_saturation... |
| bulb_white | 6 | TS0501 | dim, light_hue, light_saturation... |
| button_emergency_sos | 80 | ZBPB10BK, TS0218, TS0601, TS0215, TS0215A, ts0215a | alarm_generic, measure_battery, alarm_battery |
| button_wireless | 20 | TS0040, SNZB-01, SNZB-01P, SNZB-01M, WB01, WB-01, CK-TLSR8656-SS5-01(7000), TS0041 | measure_battery, alarm_battery |
| button_wireless_1 | 91 | TS0041, ZG-101ZL, WXKG01LM, WXKG02LM, WXKG03LM, WXKG11LM, WXKG12LM, WXKG06LM, WXKG07LM, lumi.sensor_switch, lumi.sensor_switch.aq2, lumi.sensor_switch.aq3, lumi.remote.b1acn01, E1524/E1810, E1743, E1812, E1744, E2001/E2002, E2123, RWL020, RWL021, RWL022, ROM001, 3450-L, TS0041A, TS0001, SNZB-01, SNZB-01P, TS0003, TS011F, TS0011, TS000F, TS0012, TS0002, TS0013, TS0042, TS0043 | button.1, measure_battery, alarm_battery |
| button_wireless_2 | 91 | TS0042, TS0043, TS0044, TS0041, TS0002, TS0012, TS0003, TS0013, TS0014, TS0011, TS0001, TS0111 | button.1, button.2, measure_battery... |
| button_wireless_3 | 23 | TS0043, TS0013 | button.1, button.2, button.3... |
| button_wireless_4 | 37 | TS0044, TS0014, SNZB-01M, TS004F | button.1, button.2, button.3... |
| button_wireless_6 | 6 | TS0046, TS0601 | button.1, button.2, button.3... |
| button_wireless_8 | 3 | TS0048 | button.1, button.2, button.3... |
| button_wireless_plug | 10 | TS011F, TS0121, TSO121, TS0003, TS0011, TS000F, TS0001, TS0012, TS0002, TS0013, TS0111 | measure_power, meter_power, measure_voltage... |
| button_wireless_scene | 3 | TS0601, TS0041, TS0042, TS0043, TS0044 | button.1, button.2, measure_battery... |
| button_wireless_smart | 7 | TS0041, TS0042 | button.1, measure_battery, alarm_battery |
| button_wireless_switch | 3 | TS0601 | onoff, onoff.gang2, measure_power... |
| button_wireless_wall | 3 | TS0041, TS0042 | button.1, button.2, measure_battery... |
| ceiling_fan | 6 | TS0601_fan, TS0601 | dim, onoff, dim.speed |
| christmas_lights | 9 | TS0601, TS0504B | onoff, dim, light_hue... |
| climate_sensor | 2146 | TS0201, TH01, WSDCGQ01LM, WSDCGQ11LM, WSDCGQ12LM, lumi.sensor_ht, lumi.sensor_ht.agl02, lumi.weather, SM0201, SNZB-02, SNZB-02D, SNZB-02P, TS0601, ZG-227Z, ZG-227ZL, CK-TLSR8656-SS5-01(7014), SNZB-02DR2, SNZB-02LD, SNZB-02WD, THS317-ET, TY0201, RH3052, Excellux, TS0222, TS1201, ZG-303Z | measure_temperature, measure_humidity, measure_battery... |
| climate_sensor_device | 3 | TS0601 | target_temperature, measure_temperature, thermostat_mode... |
| climate_sensor_energy | 2127 | TS0201, TH01, WSDCGQ01LM, WSDCGQ11LM, WSDCGQ12LM, lumi.sensor_ht, lumi.sensor_ht.agl02, lumi.weather, SM0201, SNZB-02, SNZB-02D, SNZB-02P, TS0601, ZG-227Z, ZG-227ZL, CK-TLSR8656-SS5-01(7014), SNZB-02DR2, SNZB-02LD, SNZB-02WD, THS317-ET, TY0201, RH3052, Excellux, TS0222, TS1201, ZG-303Z | measure_power, meter_power, measure_voltage... |
| climate_sensor_presence | 3 | TS0601 | alarm_motion, measure_luminance, measure_temperature... |
| co_sensor | 13 | TS0601_co, TS0601 | alarm_co, measure_battery, measure_co... |
| contact_sensor | 173 | TS0203, ZG-102Z, ZG-102ZL, DS01, RH3001, MCCGQ01LM, MCCGQ11LM, MCCGQ12LM, MCCGQ14LM, lumi.sensor_magnet, lumi.sensor_magnet.aq2, lumi.magnet.ac01, lumi.magnet.agl02, E1603/E1702, TRADFRI open/close remote, 3300-S, 3320-L, SNZB-04, TS0601, SNZB-04P, SNZB-04PR2, CK-TLSR8656-SS5-01(7003), SNZB-04R2, TS0021, DoorWindow-Sensor-ZB3.0, MCT-340 E, TS0207, q9mpfhw | alarm_contact, measure_battery, alarm_generic... |
| curtain_module | 423 | TS0302, ZC-LS02, TS130F, DS82, DS421, lumi.curtain, lumi.curtain.hagl04, lumi.curtain.acn002, E1757, KADRILJ, FYRTUR, AM02, AM43-0.45/40-ES-EZ, AM43-0.45/40-ES-EB, TS0601, TS0301, ZBCurtain, TS030F, TS0105 | windowcoverings_set, windowcoverings_state |
| curtain_module_2_gang | 1 | TS130F, TS0601 | windowcoverings_set, windowcoverings_state |
| curtain_motor | 423 | TS0302, ZC-LS02, TS130F, DS82, DS421, lumi.curtain, lumi.curtain.hagl04, lumi.curtain.acn002, E1757, KADRILJ, FYRTUR, AM02, AM43-0.45/40-ES-EZ, AM43-0.45/40-ES-EB, TS0601, TS0301, ZBCurtain, TS030F, TS0105 | windowcoverings_state, windowcoverings_set, windowcoverings_tilt_set... |
| curtain_motor_shutter | 2 | TS0601, TS0301 | windowcoverings_state, windowcoverings_set, windowcoverings_tilt_set... |
| curtain_motor_tilt | 52 | TS0601_curtain_tilt, TS0601 | windowcoverings_state, windowcoverings_set, windowcoverings_tilt_set... |
| curtain_motor_wall | 24 | TS130F | windowcoverings_state, windowcoverings_set, windowcoverings_tilt_set... |
| device_air_purifier | 20 | TS0601_air_purifier, TS0601 | target_temperature, measure_temperature, thermostat_mode... |
| device_air_purifier_climate | 1 | TS0601_air_purifier, TS0601 | onoff, dim, measure_pm25... |
| device_air_purifier_din | 1 | TS0601_air_purifier, TS0601 | measure_power, meter_power, measure_voltage... |
| device_air_purifier_floor | 1 | TS0601_air_purifier, TS0601 | target_temperature, measure_temperature, measure_temperature.floor... |
| device_air_purifier_humidifier | 1 | TS0601_air_purifier, TS0601 | onoff, dim, measure_humidity... |
| device_air_purifier_led | 1 | TS0601_air_purifier, TS0601 | dim, measure_battery, onoff... |
| device_air_purifier_plug | 6 | TS011F | measure_power, meter_power, measure_voltage... |
| device_air_purifier_presence | 1 | TS0601_air_purifier, TS0601 | alarm_motion, measure_luminance, measure_temperature... |
| device_air_purifier_quality | 1 | TS0601_air_purifier, TS0601 | measure_co2, measure_pm25, measure_temperature... |
| device_air_purifier_radiator | 20 | TS0601_air_purifier, TS0601 | target_temperature, measure_temperature, thermostat_mode... |
| device_air_purifier_siren | 20 | TS0601_air_purifier, TS0601 | alarm_motion, measure_battery, alarm_generic... |
| device_air_purifier_smart | 20 | TS0601_air_purifier, TS0601 | target_temperature, measure_temperature, measure_humidity... |
| device_air_purifier_smoke | 20 | TS0601_air_purifier, TS0601 | alarm_smoke, measure_battery, measure_temperature... |
| device_air_purifier_soil | 20 | TS0601_air_purifier, TS0601 | measure_humidity.soil, measure_temperature, measure_humidity... |
| device_air_purifier_thermostat | 20 | TS0601_air_purifier, TS0601 | target_temperature, measure_temperature, thermostat_mode... |
| device_air_purifier_water | 20 | TS0601_air_purifier, TS0601 | measure_humidity, alarm_water, alarm_battery... |
| device_din_rail | 15 | TS0601, TS0001, TS0002 | alarm_motion, alarm_contact, measure_battery... |
| device_din_rail_meter | 15 | TS0601, TS0001, TS0002 | alarm_motion, alarm_contact, alarm_generic... |
| device_floor_heating | 1 | TS0601 | target_temperature, measure_temperature, measure_temperature.floor... |
| device_floor_heating_thermostat | 1 | TS0601 | target_temperature, measure_temperature, measure_temperature.floor... |
| device_generic_tuya | 9 | TS0601 | onoff, dim, measure_temperature... |
| device_generic_tuya_universal | 46 | TS0203, TS0601 | measure_battery, measure_temperature, measure_humidity... |
| device_plug_energy | 3 | TS0002, TS0121 | onoff, measure_power, meter_power... |
| device_plug_smart | 3 | TS0601 | onoff, measure_power, meter_power... |
| device_plug_smart_water | 3 | TS0601, TS0207 | onoff, measure_power, meter_power... |
| device_radiator_valve | 107 | TS0601 | target_temperature, measure_temperature, thermostat_mode... |
| device_radiator_valve_smart | 3 | TS0601 | target_temperature, measure_temperature, thermostat_mode... |
| dimmable_led_strip | 3 | TS0502B | onoff, dim |
| dimmable_recessed_led | 3 | TS0502B | onoff |
| dimmer_1_gang | 213 | TS0601_dim1, TS0601, ZBMINI-DIM, ZBMINID, TS110E, TS110F, TS1101, TS0052, TS0011 | onoff, dim |
| dimmer_1_gang_2 | 3 | TS0601 | onoff, dim |
| dimmer_1_gang_tuya | 5 | TS110F, TS110E, TS0052 | onoff, dim |
| dimmer_2_gang | 1 | TS110F, TS110E | onoff, dim |
| dimmer_2_gang_tuya | 5 | TS110F, TS110E | onoff, dim |
| dimmer_3gang | 6 | TS0601_dimmer3, TS0601 | onoff, dim, onoff.gang2... |
| dimmer_air_purifier | 1 | TS0601 | dim, onoff, measure_power... |
| dimmer_bulb_dimmable | 9 | TS0601 | dim, light_hue, light_saturation... |
| dimmer_dual_channel | 14 | TS1101, TS0601 | onoff, dim, onoff.channel2... |
| dimmer_ts110e | 207 | TS0601 | onoff, dim |
| dimmer_wall_1gang | 213 | TS0601_dim1, TS0601, ZBMINI-DIM, ZBMINID, TS110E, TS110F, TS1101, TS0052, TS0011 | dim, onoff, measure_power |
| din_rail_meter | 56 | SPM01-1Z2, SDM01-3Z1, SDM02-2Z1, SPM02-3Z3, TS0601 | measure_power, meter_power, measure_voltage... |
| din_rail_switch | 32 | TS0001_din, TS0601 | onoff, measure_power, meter_power... |
| door_controller | 6 | TS0601_door, TS0601 | alarm_motion, alarm_contact, measure_battery... |
| door_controller_garage | 1 | TS0601, TS0603 | alarm_motion, alarm_contact, measure_battery... |
| doorbell | 24 | TS0211, TS0601 | alarm_motion, alarm_contact, measure_battery... |
| doorwindowsensor | 159 | TS0203, ZG-102Z, ZG-102ZL, DS01, RH3001, MCCGQ01LM, MCCGQ11LM, MCCGQ12LM, MCCGQ14LM, lumi.sensor_magnet, lumi.sensor_magnet.aq2, lumi.magnet.ac01, lumi.magnet.agl02, E1603/E1702, TRADFRI open/close remote, 3300-S, 3320-L, SNZB-04, TS0601, SNZB-04P, SNZB-04PR2, CK-TLSR8656-SS5-01(7003), SNZB-04R2, TS0021, DoorWindow-Sensor-ZB3.0, MCT-340 E, TS0207 | alarm_contact, alarm_battery, measure_battery |
| doorwindowsensor_2 | 159 | TS0203, ZG-102Z, ZG-102ZL, DS01, RH3001, MCCGQ01LM, MCCGQ11LM, MCCGQ12LM, MCCGQ14LM, lumi.sensor_magnet, lumi.sensor_magnet.aq2, lumi.magnet.ac01, lumi.magnet.agl02, E1603/E1702, TRADFRI open/close remote, 3300-S, 3320-L, SNZB-04, TS0601, SNZB-04P, SNZB-04PR2, CK-TLSR8656-SS5-01(7003), SNZB-04R2, TS0021, DoorWindow-Sensor-ZB3.0, MCT-340 E, TS0207 | alarm_contact, alarm_generic, alarm_battery... |
| doorwindowsensor_3 | 3 | TS0203 | alarm_contact, alarm_battery, measure_battery |
| doorwindowsensor_4 | 3 | DS01, TS0203 | alarm_contact, alarm_battery, measure_battery |
| double_power_point | 83 | TS0111, TS0101, TS0601, TS011F, S26R2ZB, S31 Lite zb, S40LITE, S60ZBTPF, S60ZBTPG | onoff, measure_power, meter_power... |
| double_power_point_2 | 1 | TS0601 | onoff, measure_power, meter_power... |
| energy_meter_3phase | 42 | TS0601, TS0601_3phase | measure_power, meter_power, measure_voltage... |
| fan_controller | 47 | TS0601_fanctrl, TS0601 | onoff, dim |
| fingerbot | 12 | TS0001, TS0001_fingerbot, TS0003, TS011F, TS0011, TS000F | onoff, button.push, measure_battery... |
| fingerbot_switch | 3 | TS0001, TS0601 | onoff, measure_battery, measure_power... |
| fingerprint_lock | 27 | TS0601_lock, TS0601 | locked, alarm_generic, measure_battery... |
| flood_sensor | 1 | RH3001, TS0207 | alarm_water, alarm_battery, measure_battery |
| floor_heating_thermostat | 6 | TS0601 | target_temperature, measure_temperature, measure_temperature.floor... |
| formaldehyde_sensor | 3 | TS0601_hcho, TS0601 | measure_co2, measure_temperature, measure_humidity... |
| garage_door | 15 | TS0601_garage, TS0601 | garagedoor_closed, alarm_contact |
| garage_door_opener | 24 | TS0601, TS0603 | garagedoor_closed, alarm_contact |
| gas_detector | 32 | TS0204, TS0601 | alarm_generic, alarm_co, alarm_co2... |
| gas_sensor | 20 | TS0601_gas, TS0601, TS0225 | alarm_co, alarm_co2, alarm_contact... |
| gas_sensor_switch | 1 | TS0601 | onoff, onoff.gang2, onoff.gang3... |
| gateway_zigbee_bridge | 3 | TS0601_gw | alarm_generic, measure_battery, onoff... |
| generic_diy | 195 | BUTTON, CC2530, CC2531, CC2652, CUSTOM, DIY, EFEKTA, ESP32, MAKER, PTVO, RELAY, ROUTER, SENSOR, SWITCH, SNZB-01, SNZB-02, SNZB-01P, SNZB-02P, SNZB-06P, S31ZB, S40ZBTPB, ZBMINI, ZBMINIL2, BASICZBR3, eTRV0100, eTRV0101, eTRV0103, eT093WRO, eT093WRG, TRV001, TRV003, 0x8040, BSP-FZ2, BSP-EZ2, Battery switch, 1 button, Battery switch, 2 buttons, ZIGSTAR, TS0041A, TS0026, TS0224, TS0901 |  |
| generic_tuya | 398 | TS0203, TS0601, TS0601_generic | measure_battery, measure_temperature, measure_humidity... |
| handheld_remote_4_buttons | 85 | TS0044, TS004F, SNZB-01M, TS0014 | onoff, measure_battery, alarm_battery |
| humidifier | 18 | TS0601_humid, TS0601 | onoff, dim, measure_humidity... |
| hvac_air_conditioner | 3 | TS0601_ac, TS0601 | target_temperature, measure_temperature, thermostat_mode... |
| hvac_controller | 6 | TS0601 | onoff, target_temperature, measure_temperature... |
| hvac_dehumidifier | 21 | TS0601_dehum, TS0601 | dim.humidity, measure_humidity, measure_temperature... |
| illuminance_sensor | 12 | TS0222, TS0225, TS0601 | measure_luminance, measure_battery, alarm_battery |
| ir_blaster | 92 | TS1201, TS0601 | onoff, volume_up, volume_down... |
| lcdtemphumidluxsensor | 9 | TS0201, TS0222, TS0601, Excellux | measure_luminance, measure_temperature, measure_humidity... |
| lcdtemphumidsensor | 6 | TS0601_lcd, TS0601, TS0201, TY0201 | measure_temperature, measure_humidity, measure_battery... |
| lcdtemphumidsensor_2 | 2127 | TS0201, TH01, WSDCGQ01LM, WSDCGQ11LM, WSDCGQ12LM, lumi.sensor_ht, lumi.sensor_ht.agl02, lumi.weather, SM0201, SNZB-02, SNZB-02D, SNZB-02P, TS0601, ZG-227Z, ZG-227ZL, CK-TLSR8656-SS5-01(7014), SNZB-02DR2, SNZB-02LD, SNZB-02WD, THS317-ET, TY0201, RH3052, Excellux, TS0222, TS1201, ZG-303Z | measure_temperature, measure_humidity, measure_battery... |
| lcdtemphumidsensor_3 | 1 | TS0601, TS0201, Excellux | measure_temperature, measure_humidity, measure_battery... |
| lcdtemphumidsensor_plug_energy | 2 | TS0601 | measure_power, meter_power, measure_voltage... |
| led_controller_cct | 21 | TS0502 | onoff, dim, light_temperature... |
| led_controller_dimmable | 6 | TS0601_led, TS0501B, TRI-C1ZR, TRI-K1ZR | onoff, dim |
| led_controller_rgb | 3 | TS0503, TS0504 | onoff, dim, light_hue... |
| led_strip | 15 | TS0601_strip, TS0505B | dim, onoff, light_hue... |
| led_strip_advanced | 6 | TS0601_strip_adv | dim, light_hue, light_saturation... |
| led_strip_rgbw | 33 | TS0601_strip_rgbw | light_hue, light_saturation, light_temperature... |
| light_bulb_dimmable_tunable | 126 | TS0502A, TS0502B, LED1545G12, LED1546G12, LTW001, LTW004, LTW010, LTW012, LTW013, LTW015, Classic A60 TW, GL-C-007, GL-B-007Z, RS 128 T, RB 178 T, E11-N13, E11-N14, E12-N13, E12-N14, ZBT-CCTLight | dim, light_hue, light_mode... |
| light_bulb_rgb | 68 | TS0503A, TS0503B, LCT001, LCT002, LCT003, LCT007, LCT010, LCT011, LCT012, LCT014, LCT015, LCT016, GL-C-006, RB 185 C, RB 285 C, E11-G13, E11-G14, E11-G23, ZBT-ColorLight, TS0505A, TS0505B, ZB-CL01, TS0504B | dim, light_hue, light_saturation... |
| light_bulb_rgb_led | 3 | TS0505B | dim, light_hue, light_saturation... |
| light_bulb_rgb_rgbw | 87 | TS0505A, TS0505B | dim, light_hue, light_saturation... |
| light_bulb_tunable_white | 11 | TS0502A, TS0502B, TS0504A | dim, light_hue, light_saturation... |
| light_sensor_outdoor | 3 | TS0601, TS0222 | measure_luminance, measure_battery, alarm_battery |
| lock_smart | 36 | TS0601_smartlock, TS0601 | locked, lock_mode, measure_battery... |
| module_mini_switch | 22 | ZBMINI, ZBMINI-L, ZBMINIL2, ZBMINIR2, 01MINIZB, ZBM5-1C-120, ZBMINIR, ZBMINIL2-R2, ZBMINIR2-R2 | alarm_generic, measure_power, measure_voltage... |
| motion_sensor | 290 | TS0202, TS0225, ZG-204Z, MS01, RH3040, IH012-RT01, TY0202, lumi.sensor_motion, lumi.sensor_motion.aq2, lumi.motion.ac02, lumi.motion.agl04, TRADFRI motion sensor, E1745, E1525/E1745, SML001, SML002, SML003, SML004, 3326-L, 3305-S, 3325-S, SNZB-03, TS0601, SNZB-03P, MSO1, CK-TLSR8656-SS5-01(7002), SNZB-03R2 | alarm_motion, measure_luminance, measure_temperature... |
| motion_sensor_2 | 9 | TS0601 | measure_battery, measure_luminance, alarm_motion... |
| motion_sensor_radar_mmwave | 28 | TS0601_mmwave, TS0601 | alarm_motion, measure_luminance.distance, measure_temperature... |
| motion_sensor_switch | 2 | TS0601, TS0225, Excellux | onoff, measure_battery, measure_power... |
| outdoor_2_socket | 1 | TS0601 | onoff, meter_power, measure_power... |
| outdoor_plug | 3 | TS0101 | onoff |
| pet_feeder | 15 | TS0601_feeder, TS0601 | button.feed, alarm_generic |
| pet_feeder_zigbee | 9 | TS0601 | onoff, measure_weight, alarm_generic |
| pir_mmwave_sensor | 6 | TS0225, CK-BL702-MWS-01(7016), ZP-301Z | alarm_motion, measure_battery, alarm_battery... |
| pir_sensor_2 | 9 | TS0202 | alarm_motion, alarm_battery, measure_battery |
| pirsensor | 6 | RH3040 | alarm_motion, alarm_battery, measure_battery |
| plug | 3 | TS011F | onoff |
| plug_energy_monitor | 160 | TS0121, TS011F, A7Z, A11Z, SP-EUC01, SP-EUC02, SP 120, SP 220, SP 222, S60ZBTPF, S60ZBTPG, S60ZBTPE, S31ZB, S31 Lite zb, S26R2ZB, S40ZBTPB, LSPA9, HY0105, HY0104, JZ-ZB-005, ZBMINIL2, lumi.plug.maeu01, lumi.plug.macn01, lumi.plug.mmeu01, E1603/E1702/E1708, TRADFRI control outlet, TS0601, CK-BL702-SWP-01(7020), S40LITE, SA-029-1, SA-028-1, Z111PL0H-1JX, SNZB-06P, SPM01, SPMZBR2, S40ZBTPF, S40ZBTPG, S60ZBTPF-R2, TSO121 | measure_power, meter_power, measure_voltage... |
| plug_smart | 83 | TS0111, TS0101, TS0601, TS011F, S26R2ZB, S31 Lite zb, S40LITE, S60ZBTPF, S60ZBTPG | onoff, measure_power, meter_power... |
| pool_pump | 12 | TS0601_pool, TS0601 | onoff, measure_power, meter_power |
| power_clamp_meter | 21 | TS0601_clamp, TS0601 | measure_power, meter_power, measure_current.phase2... |
| power_meter | 104 | TS0601, TS0601_meter, PJ-1203A, pj-1203a, Pj-1203A | measure_power, meter_power, measure_voltage... |
| presence_sensor_ceiling | 12 | TS0601_ceiling, TS0601, TS0225, CK-BL702-MWS-01(7016), ZP-301Z | alarm_motion, onoff, measure_luminance... |
| presence_sensor_radar | 432 | CK-BL702-MWS-01, CK-BL702-MWS-01(7016), MG1_5RZ, SZLMR10, TS0203, TS0225, TS0601, ZG-204ZH, ZG-204ZK, ZG-204ZL, ZG-204ZM, ZG-204ZV, ZG-205Z, ZP-301Z, SNZB-06P, ZG-204ZE, ZG-204ZQ, ZG-205ZL, ZG-302ZL, ZG-302ZM | alarm_motion, measure_luminance, measure_temperature... |
| radar_sensor | 15 | TS0601 | measure_luminance, alarm_motion |
| radar_sensor_2 | 290 | TS0202, TS0225, ZG-204Z, MS01, RH3040, IH012-RT01, TY0202, lumi.sensor_motion, lumi.sensor_motion.aq2, lumi.motion.ac02, lumi.motion.agl04, TRADFRI motion sensor, E1745, E1525/E1745, SML001, SML002, SML003, SML004, 3326-L, 3305-S, 3325-S, SNZB-03, TS0601, SNZB-03P, MSO1, CK-TLSR8656-SS5-01(7002), SNZB-03R2 | measure_luminance, alarm_motion |
| radar_sensor_ceiling | 290 | TS0202, TS0225, ZG-204Z, MS01, RH3040, IH012-RT01, TY0202, lumi.sensor_motion, lumi.sensor_motion.aq2, lumi.motion.ac02, lumi.motion.agl04, TRADFRI motion sensor, E1745, E1525/E1745, SML001, SML002, SML003, SML004, 3326-L, 3305-S, 3325-S, SNZB-03, TS0601, SNZB-03P, MSO1, CK-TLSR8656-SS5-01(7002), SNZB-03R2 | measure_luminance, alarm_motion |
| radiator_controller | 12 | TS0601_rad, TS0601 | onoff, target_temperature, measure_temperature... |
| radiator_valve | 416 | TV01-ZB, TV02-ZB, TRV601, TRV602, SEA801-Zigbee, eTRV0100, SPZB0001, SPZB0003, lumi.airrtc.agl001, lumi.airrtc.vrfegl01, 014G2461, 014G2463, STZB402, STZB403, Zen-01, TS0601, TRVZB | target_temperature, measure_temperature, thermostat_mode... |
| radiator_valve_zigbee | 7 | TS0601 | target_temperature, measure_temperature, thermostat_mode... |
| rain_sensor | 15 | TS0207_rain, TS0601, TS0207, ZG-223Z, ZG-222Z | alarm_water, measure_humidity, measure_battery... |
| relay_board_1_channel | 1293 | TS0001_power, TS0001_switch, TS0001_switch_module, ZBMINI, ZBMINIL2, BASICZBR3, S31ZB, 01MINIZB, ZBMINIR2, ZBM5-1C-120, ZBMINIR, ZBMINIL2-R2, ZBMINIR2-R2, ZG-301Z, ZG-302Z1, TS0101, TS4100, ZBM5-2C-120, ZBM5-3C-120 | onoff |
| relay_board_2_channel | 6 | TS0002, TS011F | onoff |
| relay_board_4_channel | 6 | TS0004 | onoff |
| remote_button_emergency_sos | 2 | TS0040, SNZB-01, SNZB-01P, SNZB-01M, WB01, WB-01, CK-TLSR8656-SS5-01(7000), TS0041 | button.1, button.2, button.3... |
| remote_button_wireless | 20 | TS0043, TS011F, TS0121, TSO121, TS0601 | button.1, button.2, button.3... |
| remote_button_wireless_handheld | 1 | TS0044 | button.1, button.2, button.3... |
| remote_button_wireless_plug | 3 | TS0121, TSO121 | measure_power, meter_power, measure_voltage... |
| remote_button_wireless_smart | 3 | TS0601 | button.1, measure_battery, alarm_battery |
| remote_button_wireless_wall | 42 | TS0041, TS0043, TS004F, TS0044, TS0046, TS0042 | button.1, measure_battery, alarm_battery |
| remote_dimmer | 2 | TS1001 | measure_battery, alarm_battery |
| rgb_bulb_E14 | 3 | TS0505A | onoff, dim |
| rgb_bulb_E27 | 15 | TS0505A, TS0505B, ZB-CL01 | onoff, dim |
| rgb_ceiling_led_light | 3 | TS0505B | onoff, dim |
| rgb_floor_led_light | 3 | TS0502A | onoff, dim, light_temperature |
| rgb_led_light_bar | 6 | TS0505A, TS0505B | onoff, dim, light_temperature |
| rgb_led_strip | 3 | TS0505A | onoff, dim |
| rgb_led_strip_controller | 15 | TS0503A, TS0503B, TS0505B, TS0504B | onoff, dim |
| rgb_mood_light | 6 | TS0505A, TS0505B | onoff, dim, light_temperature |
| rgb_spot_GardenLight | 3 | TS0505A | onoff, dim |
| rgb_spot_GU10 | 6 | TS0505A, TS0505B | onoff, dim |
| rgb_wall_led_light | 6 | TS0505A | onoff, dim, light_temperature |
| scene_switch_1 | 9 | TS0601_scene1, TS0601, TS004F, TS0041 | button.1, measure_battery, alarm_battery |
| scene_switch_2 | 6 | TS0601_scene2, TS0726, TS0042, TS0601 | button.1, button.2, measure_battery... |
| scene_switch_3 | 12 | TS0601_scene3, TS0726, TS0601, TS0044, TS0043 | button.1, button.2, button.3... |
| scene_switch_4 | 21 | TS0601, ZG-101ZS, ERS-10TZBVK-AA | button.1, button.2, button.3... |
| scene_switch_6 | 3 | TS0601_scene6 | button.1, button.2, button.3... |
| scene_switch_wall | 3 | TS0042, TS0043 | button.1, button.2, measure_battery... |
| sensor_climate_contact | 2 | TS0601 | measure_temperature, measure_temperature.probe, measure_humidity... |
| sensor_climate_temphumidsensor | 2127 | TS0201, TH01, WSDCGQ01LM, WSDCGQ11LM, WSDCGQ12LM, lumi.sensor_ht, lumi.sensor_ht.agl02, lumi.weather, SM0201, SNZB-02, SNZB-02D, SNZB-02P, TS0601, ZG-227Z, ZG-227ZL, CK-TLSR8656-SS5-01(7014), SNZB-02DR2, SNZB-02LD, SNZB-02WD, THS317-ET, TY0201, RH3052, Excellux, TS0222, TS1201, ZG-303Z | measure_temperature, measure_humidity, measure_battery... |
| sensor_contact_motion | 2 | TS0601 | alarm_motion, measure_luminance, measure_temperature... |
| sensor_contact_plug | 3 | TS0601, Excellux | onoff, measure_power, meter_power... |
| sensor_contact_presence | 2 | ZG-227Z | alarm_motion, measure_luminance, measure_temperature... |
| sensor_contact_water | 24 | TS0601, TS0207, q9mpfhw, Excellux | alarm_contact, measure_battery, alarm_generic... |
| sensor_contact_zigbee | 191 | ZG-102Z, ZG-102ZL, DS01, RH3001, MCCGQ01LM, MCCGQ11LM, MCCGQ12LM, MCCGQ14LM, lumi.sensor_magnet, lumi.sensor_magnet.aq2, lumi.magnet.ac01, lumi.magnet.agl02, E1603/E1702, TRADFRI open/close remote, 3300-S, 3320-L, SNZB-04, SNZB-04P, SNZB-04PR2, CK-TLSR8656-SS5-01(7003), SNZB-04R2, DoorWindow-Sensor-ZB3.0, MCT-340 E, q9mpfhw | alarm_contact, alarm_generic, measure_battery... |
| sensor_gas_presence | 57 | TS0601_gas, TS0601, TS0225, ZG-225Z, TS0301 | alarm_motion, measure_luminance, measure_temperature... |
| sensor_illuminance_presence | 15 | ZG-106Z, TS0225, TS0601 | alarm_motion, measure_luminance, measure_temperature... |
| sensor_lcdtemphumidsensor_temphumidsensor | 12 | TS0601_lcd, TS0601, TS0201, TY0201 | measure_temperature, measure_humidity, measure_battery... |
| sensor_motion_presence | 3 | TS0225, TS0601, Excellux | alarm_motion, measure_luminance, measure_temperature... |
| sensor_motion_radar | 3 | TS0601 | alarm_motion, measure_luminance.distance, measure_temperature... |
| sensor_presence_radar | 1 | TS0203, TS0601, ZG-204ZL, ZG-204ZM, ZG-204ZV, TS0225, CK-BL702-MWS-01(7016), ZP-301Z | alarm_motion, measure_luminance, measure_temperature... |
| shutter_roller_controller | 1 | TS0601_shutter, TS0601 | alarm_generic, windowcoverings_state, measure_battery... |
| siren | 81 | TS0216, TS0219, TS0601 | alarm_motion, measure_battery, alarm_generic... |
| siren_sirentemphumidsensor | 3 | TS0601 | onoff, measure_temperature, measure_humidity... |
| sirentemphumidsensor | 1 | TS0601 | onoff, measure_temperature, measure_humidity... |
| slim_motion_sensor | 3 | TS0202 | alarm_motion, alarm_battery, measure_battery |
| smart_air_detection_box | 20 | TS0601_air_purifier, TS0601 | measure_co2, measure_temperature, measure_humidity |
| smart_breaker | 3 | TS0601_breaker, TS0601 | onoff, alarm_generic, measure_power... |
| smart_button_switch | 23 | TS0040, SNZB-01, SNZB-01P, SNZB-01M, WB01, WB-01, CK-TLSR8656-SS5-01(7000), TS0041 | button.1 |
| smart_door_window_sensor | 6 | TY0203, TS0203 | measure_battery, alarm_contact, alarm_battery... |
| smart_garden_irrigation_control | 6 | TS0101, TS0049 | onoff, alarm_battery, measure_battery |
| smart_heater | 6 | TS0601_heater, TS0601 | onoff, target_temperature, thermostat_mode... |
| smart_heater_controller | 12 | TS0601_heatctrl, TS0601 | onoff, target_temperature, measure_temperature... |
| smart_knob | 12 | TS004F, ERS-10TZBVK-AA | onoff, dim, measure_battery... |
| smart_knob_rotary | 18 | TS004F, ERS-10TZBVK-AA, ZG-101ZD | button.rotate_left, button.rotate_right, button.press... |
| smart_knob_switch | 12 | TS004F, ERS-10TZBVK-AA | dim, measure_battery, alarm_battery |
| smart_lcd_thermostat | 9 | TS0601 | target_temperature, measure_temperature, measure_humidity... |
| smart_motion_sensor | 3 | TY0202 | measure_battery, alarm_motion, alarm_battery... |
| smart_rcbo | 3 | TS0601_rcbo, TS0601 | onoff, alarm_generic, measure_power... |
| smart_remote_1_button | 6 | TS004F | measure_battery, alarm_battery |
| smart_remote_1_button_2 | 3 | TS004F | button.1, measure_battery, alarm_battery |
| smart_remote_4_buttons | 1 | TS0215A, TS0601 | button.1, button.2, button.3... |
| smart_scene_panel | 6 | TS0601 | onoff.gang1, onoff.gang2, onoff.gang3... |
| smart_switch | 1293 | TS0001_power, TS0001_switch, TS0001_switch_module, ZBMINI, ZBMINIL2, BASICZBR3, S31ZB, 01MINIZB, ZBMINIR2, ZBM5-1C-120, ZBMINIR, ZBMINIL2-R2, ZBMINIR2-R2, ZG-301Z, ZG-302Z1, TS0101, TS4100, ZBM5-2C-120, ZBM5-3C-120 | onoff |
| smartplug | 78 | TS0121, TSO121 | onoff, measure_power, meter_power... |
| smartplug_2_socket | 3 | TS011F, TS0601 | onoff, measure_power, meter_power... |
| smartPlug_DinRail | 3 | TS0121, TSO121, TS011F | onoff, measure_power, meter_power... |
| smoke_detector_advanced | 32 | TS0205, PG-S11Z, YG400A, SA12IZL, SD8SC_00.00.03.12TC, GS361A-H04, HS1SA, HS3SA, SMSZB-120, lumi.sensor_smoke, JTYJ-GD-01LM/BW, SSSQS01LM, NAS-SD02B0, TS0601 | alarm_smoke, measure_temperature, measure_humidity... |
| smoke_sensor | 6 | TS0205, TS0601 | alarm_smoke, alarm_battery, measure_battery |
| smoke_sensor2 | 77 | PG-S11Z, YG400A, SA12IZL, SD8SC_00.00.03.12TC, GS361A-H04, HS1SA, HS3SA, SMSZB-120, lumi.sensor_smoke, JTYJ-GD-01LM/BW, SSSQS01LM, NAS-SD02B0 | measure_battery, alarm_smoke, alarm_generic... |
| smoke_sensor3 | 3 | TS0205, TS0601 | measure_battery, alarm_smoke, alarm_battery... |
| socket_power_strip | 13 | TS0601, TS0115 | onoff |
| socket_power_strip_four | 6 | TS0115, TS0601, TS011F | onoff |
| socket_power_strip_four_three | 42 | JZ-ZB-004, TS0601 | onoff |
| socket_power_strip_four_two | 3 | TS0111, TS0101, TS0601 | onoff |
| soil_sensor | 130 | ZG-303Z, CS-201Z, TS0601, Arteco | measure_humidity.soil, measure_temperature, measure_humidity... |
| soilsensor | 9 | TS0601 | measure_temperature, measure_humidity, measure_battery... |
| soilsensor_2 | 6 | TS0601 | measure_temperature, measure_humidity, measure_battery... |
| sr_zs_switch | 1293 | TS0001_power, TS0001_switch, TS0001_switch_module, ZBMINI, ZBMINIL2, BASICZBR3, S31ZB, 01MINIZB, ZBMINIR2, ZBM5-1C-120, ZBMINIR, ZBMINIL2-R2, ZBMINIR2-R2, ZG-301Z, ZG-302Z1, TS0101, TS4100, ZBM5-2C-120, ZBM5-3C-120 | onoff |
| switch | 3 | TS0601, TS011F, TS0726 | onoff, onoff.gang2, measure_power... |
| switch_1_gang | 183 | TS0003, TS011F, TS0011, TS000F, TS0001, TS0601 | onoff |
| switch_1_gang_metering | 1 | TS0001, TS0601 | onoff, measure_power, meter_power... |
| switch_1gang | 1293 | TS0001_power, TS0001_switch, TS0001_switch_module, ZBMINI, ZBMINIL2, BASICZBR3, S31ZB, 01MINIZB, ZBMINIR2, ZBM5-1C-120, ZBMINIR, ZBMINIL2-R2, ZBMINIR2-R2, ZG-301Z, ZG-302Z1, TS0101, TS4100, ZBM5-2C-120, ZBM5-3C-120 | onoff, measure_power, meter_power... |
| switch_2_gang | 191 | TS0002, TS0012, TS0002_power, TS0002_switch_module, TS0601, ZG-302Z2, ZG-305Z, TS0003, TS0013, TS0726 | onoff |
| switch_2_gang_metering | 191 | TS0002, TS0012, TS0002_power, TS0002_switch_module, TS0601, ZG-302Z2, ZG-305Z, TS0003, TS0013, TS0726 | onoff, measure_power, meter_power... |
| switch_2gang | 191 | TS0002, TS0012, TS0002_power, TS0002_switch_module, TS0601, ZG-302Z2, ZG-305Z, TS0003, TS0013, TS0726 | onoff, onoff.gang2, measure_power... |
| switch_3_gang | 3 | TS0003, TS0013 | onoff |
| switch_3gang | 131 | TS0003, TS0013, TS0003_power, TS0003_switch_module, TS0601, ZG-302Z3, TS0043, TS0040 | onoff, onoff.gang2, onoff.gang3... |
| switch_4_gang_metering | 78 | TS0004, TS0601 | onoff, measure_power, meter_power... |
| switch_4gang | 198 | TS0004, TS0014, TS0004_power, TS0004_switch_module, TS0601, TS0726, JZ-ZB-004 | onoff, onoff.gang2, onoff.gang3... |
| switch_dimmer_1gang | 8 | TS0601 | onoff, dim |
| switch_plug_1 | 3 | TS0601_sp1 | onoff, measure_power, meter_power |
| switch_plug_2 | 3 | TS0122 | onoff, onoff.outlet2, measure_power... |
| switch_temp_sensor | 3 | TS0601_tempswitch | onoff |
| switch_usb_dongle | 3 | TS0002 | onoff, onoff.l2, measure_power... |
| switch_wall_5gang | 3 | TS0015, TS0601 | onoff, onoff.gang2, onoff.gang3... |
| switch_wall_6gang | 24 | TS0016, TS0601, TS0726 | onoff, onoff.gang2, onoff.gang3... |
| switch_wall_7gang | 5 | TS0007 | onoff, onoff.gang2, onoff.gang3... |
| switch_wall_8gang | 15 | TS0601_8gang, TS0601 | onoff, onoff.gang2, onoff.gang3... |
| switch_wireless | 81 | TS0601_wirelesssw | alarm_generic |
| temphumidsensor | 1 | TY0201, SNTZ003, CK-TLSR8656-SS5-01(7014), ZG-227Z, RH3052, TS0201 | measure_temperature, measure_humidity, measure_battery... |
| temphumidsensor2 | 8 | RH3052, TS0201 | measure_temperature, measure_humidity, measure_battery... |
| temphumidsensor3 | 1 | TY0201, SNTZ003, CK-TLSR8656-SS5-01(7014), ZG-227Z, RH3052, TS0201 | measure_battery, alarm_battery, measure_humidity... |
| temphumidsensor4 | 1 | TS0601, TS0201 | measure_temperature, measure_humidity, measure_battery... |
| temphumidsensor5 | 6 | TY0201, SNTZ003, CK-TLSR8656-SS5-01(7014), ZG-227Z, RH3052, TS0201 | measure_temperature, measure_humidity, measure_battery... |
| thermostat_4ch | 156 | TS0601_thermo4ch, TS0601 | onoff, onoff.ch2, onoff.ch3... |
| thermostat_tuya_dp | 195 | TS0601_thermo, TS0601 | target_temperature, measure_temperature, thermostat_mode... |
| thermostatic_radiator_valve | 3 | TS0601 | alarm_battery, target_temperature, alarm_contact... |
| tunable_bulb_E14 | 3 | TS0502A | onoff, dim, light_temperature |
| tunable_bulb_E27 | 3 | TS0502A | onoff, dim, light_temperature |
| tunable_spot_GU10 | 3 | TS0502A | onoff, dim, light_temperature |
| tuya_dummy_device | 3 | TS0601 |  |
| universal_zigbee | 38 | TS0001, TS0002, TS0003, TS0004, TS0005, TS0006, TS0011, TS0012, TS0013, TS0014, TS0015, TS0041, TS0042, TS0043, TS0044, TS0045, TS0046, TS0047, TS0048, TS004F, TS0101, TS0111, TS011F, TS0121, TS0201, TS0203, TS0204, TS0205, TS0206, TS0207, TS0208, TS0209, TS0210, TS0211, TS0212, TS0215, TS0215A, TS0216, TS0216A, TS0218, TS0222, TS0225, TS0301, TS0302, TS0303, TS0304, TS0401, TS0402, TS0501, TS0501A, TS0501B, TS0502, TS0502A, TS0502B, TS0503, TS0503A, TS0503B, TS0504, TS0504A, TS0504B, TS0505, TS0505A, TS0505B, TS0601, TS110E, TS110F, TS130F, q9mpfhw | onoff, dim, measure_temperature... |
| usb_dongle_dual_repeater | 9 | TS0207, TS0601_repeater, TS0002 | onoff, onoff.usb2, measure_power... |
| usb_dongle_triple | 75 | TS011F, S26R2ZB, S31 Lite zb, S40LITE, S60ZBTPF, S60ZBTPG | onoff, onoff.usb2, onoff.usb3... |
| usb_outlet_advanced | 45 | TS0115, TS0601 | onoff, onoff.socket2, onoff.usb1... |
| valve_dual_irrigation | 1 | TS0601 | onoff.valve_1, onoff.valve_2, measure_battery... |
| valve_irrigation | 99 | TS0601_irrigation, TS0601, TS0049 | dim.valve_1, dim.valve_2, dim.valve_3... |
| valve_single | 6 | TS0601_valve, TS0601, TS0001 | onoff, dim.valve, measure_battery... |
| valvecontroller | 3 | TS0111, TS0001, TS011F | onoff |
| vibration_sensor | 90 | TS0209, TS0210, ZG-102ZM, TS0601, ZG-103ZL, ZG-103Z | alarm_motion, measure_temperature, measure_battery... |
| wall_curtain_switch | 3 | TS130F | windowcoverings_set, windowcoverings_state |
| wall_dimmer_1gang_1way | 6 | TS004F, TS0501B, TRI-C1ZR, TRI-K1ZR, EDM-1ZBA-EU | onoff, dim |
| wall_dimmer_tuya | 285 | TS0601_dim1, ZBMINI-DIM, ZBMINID, TS110E, TS110F, TS1101, TS0052 | onoff, dim |
| wall_remote_1_gang | 3 | TS0041 | button.1, measure_battery, alarm_battery |
| wall_remote_2_gang | 9 | TS0042 | button.1, button.2, measure_battery... |
| wall_remote_3_gang | 15 | TS0043 | button.1, button.2, button.3... |
| wall_remote_4_gang | 12 | TS0043 | button.1, button.2, button.3... |
| wall_remote_4_gang_2 | 3 | TS0043 | button.1, button.2, button.3... |
| wall_remote_4_gang_3 | 6 | TS0043 | button.1, button.2, button.3... |
| wall_remote_6_gang | 30 | TS0046, TS0601 | button.1, button.2, button.3... |
| wall_socket | 9 | - | onoff, measure_power, meter_power... |
| wall_switch_1_gang | 5 | TS0001, TS0011, TS0601 | onoff |
| wall_switch_1_gang_tuya | 1293 | TS0001_power, TS0001_switch, TS0001_switch_module, ZBMINI, ZBMINIL2, BASICZBR3, S31ZB, 01MINIZB, ZBMINIR2, ZBM5-1C-120, ZBMINIR, ZBMINIL2-R2, ZBMINIR2-R2, ZG-301Z, ZG-302Z1, TS0101, TS4100, ZBM5-2C-120, ZBM5-3C-120 | onoff |
| wall_switch_1gang_1way | 21 | TS0001, TS0011 | onoff |
| wall_switch_2_gang | 15 | TS0002, TS0012, TS0042 | onoff |
| wall_switch_2gang_1way | 48 | TS0002, TS0012, TS0042 | onoff, onoff.gang2 |
| wall_switch_3_gang | 12 | TS0003, TS0013, TS0043 | onoff |
| wall_switch_3gang_1way | 66 | TS0003, TS0013, TS0043 | onoff, onoff.gang2, onoff.gang3 |
| wall_switch_4_gang | 15 | TS0014, TS0044, TS0004 | onoff |
| wall_switch_4_gang_tuya | 3 | TS0601 | onoff |
| wall_switch_4gang_1way | 9 | TS0726, TS0004, TS0014 | onoff, onoff.gang2, onoff.gang3... |
| wall_switch_5_gang_tuya | 1293 | TS0001_power, TS0001_switch, TS0001_switch_module, ZBMINI, ZBMINIL2, BASICZBR3, S31ZB, 01MINIZB, ZBMINIR2, ZBM5-1C-120, ZBMINIR, ZBMINIL2-R2, ZBMINIR2-R2, ZG-301Z, ZG-302Z1, TS0101, TS4100, ZBM5-2C-120, ZBM5-3C-120 | onoff |
| wall_switch_6_gang_tuya | 6 | TS0601 | onoff |
| wall_thermostat | 9 | TS0601 | onoff, measure_temperature, target_temperature |
| water_detector | 8 | TS0207, q9mpfhw | alarm_contact, alarm_water, alarm_battery... |
| water_leak_sensor | 45 | TS0207, q9mpfhw, ZG-222Z, ZG-223Z, LS21001, _tz3000_eit6l5, _tz3000_k4ej3ww2, _tz3000_kyb656no, lumi.sensor_wleak.aq1, SJCGQ11LM, SJCGQ12LM, SJCGQ13LM, HS1WL, SNZB-05, 3315-S, 3315-Seu, TS0601, SQ510A, SNZB-05P, CK-TLSR8656-SS5-01(7019) | alarm_water, measure_battery, alarm_generic... |
| water_leak_sensor_tuya | 112 | q9mpfhw, ZG-222Z, ZG-223Z, LS21001, _tz3000_eit6l5, _tz3000_k4ej3ww2, _tz3000_kyb656no, lumi.sensor_wleak.aq1, SJCGQ11LM, SJCGQ12LM, SJCGQ13LM, HS1WL, SNZB-05, 3315-S, 3315-Seu, SQ510A, SNZB-05P, CK-TLSR8656-SS5-01(7019) | alarm_water, measure_battery, alarm_battery |
| water_tank_monitor | 30 | TS0601, TS0601_tank | measure_humidity, alarm_water, measure_battery... |
| water_valve_garden | 18 | TS0049 | onoff, measure_battery, alarm_battery |
| water_valve_smart | 37 | TS0601_watervalve, TS0601, SWV-ZN, SWV-ZNE, SWV-ZFE, SWV-ZNU, SWV-ZFU | onoff, meter_water, measure_temperature... |
| weather_station_outdoor | 6 | TS0601_weather, TS0601 | measure_temperature, measure_humidity, measure_pressure... |
| zigbee_repeater | 39 | TS0207 |  |

---
**Total:** 314 drivers, 29323 manufacturer IDs

*Generated: 2026-05-31T19:11:06.665Z*
