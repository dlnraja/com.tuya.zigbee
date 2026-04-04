# Device Support Matrix

| Driver | Manufacturers | Products | Capabilities |
|--------|---------------|----------|-------------|
| air_purifier | 5 | TS0601_air_purifier, TS0601 | onoff, dim, measure_pm25 |
| air_quality_co2 | 7 | TS0601_co2, TS0601 | measure_co2, measure_temperature, measure_humidity... |
| air_quality_comprehensive | 17 | TS0005, TS0006, TS0601 | measure_co2, measure_pm25, measure_pm10... |
| bulb_dimmable | 40 | TS0501A, TS0501B, TS110E, TS110F, LED1623G12, LED1649C5, LED1836G9, LWB004, LWB006, LWB010, LWB014, Plug 01, A19 W 10 year, BR30 W 10 year, PAR38 W 10 year, GL-B-001Z, RS 125, RB 165, RB 175 W, ZBT-DimmableLight | dim, light_hue, light_saturation... |
| bulb_rgb | 55 | TS0503A, TS0503B, LCT001, LCT002, LCT003, LCT007, LCT010, LCT011, LCT012, LCT014, LCT015, LCT016, GL-C-006, RB 185 C, RB 285 C, E11-G13, E11-G14, E11-G23, ZBT-ColorLight, TS0505A, TS0505B, ZB-CL01 | dim, light_hue, light_saturation... |
| bulb_rgbw | 118 | generic, TS0504A, TS0504B, TS0505A, TS0505B, Classic A60 RGBW, Flex RGBW, GL-C-008, GL-B-008Z, TS1002, FE-GU10-5W, SMD9300, CK-BL702-AL-01(7009_Z102LG03-1) | onoff, dim, light_hue... |
| bulb_tunable_white | 46 | TS0502A, TS0502B, LED1545G12, LED1546G12, LTW001, LTW004, LTW010, LTW012, LTW013, LTW015, Classic A60 TW, GL-C-007, GL-B-007Z, RS 128 T, RB 178 T, E11-N13, E11-N14, E12-N13, E12-N14, ZBT-CCTLight | dim, light_hue, light_saturation... |
| bulb_white | 2 | TS0501 | dim, light_hue, light_saturation... |
| button_emergency_sos | 37 | ZBPB10BK, TS0218, TS0601, TS0215, TS0215A | alarm_generic, measure_battery |
| button_wireless | 5 | TS0040, SNZB-01, SNZB-01P, SNZB-01M, WB01, WB-01, CK-TLSR8656-SS5-01(7000) | measure_battery |
| button_wireless_1 | 40 | TS0041, ZG-101ZL, WXKG01LM, WXKG02LM, WXKG03LM, WXKG11LM, WXKG12LM, WXKG06LM, WXKG07LM, lumi.sensor_switch, lumi.sensor_switch.aq2, lumi.sensor_switch.aq3, lumi.remote.b1acn01, E1524/E1810, E1743, E1812, E1744, E2001/E2002, E2123, RWL020, RWL021, RWL022, ROM001, 3450-L, SNZB-01, SNZB-01P, TS0041A | button.1, measure_battery |
| button_wireless_2 | 9 | TS0042, TS0002, TS0012 | button.1, button.2, measure_battery |
| button_wireless_3 | 14 | TS0043 | button.1, button.2, button.3... |
| button_wireless_4 | 40 | TS0044, TS004F, SNZB-01M | button.1, button.2, button.3... |
| button_wireless_6 | 3 | TS0046, TS0601 | button.1, button.2, button.3... |
| button_wireless_8 | 1 | TS0048 | button.1, button.2, button.3... |
| ceiling_fan | 2 | TS0601_fan, TS0601 | dim, onoff, dim.speed... |
| climate_sensor | 988 | TS0201, TS0222, TH01, WSDCGQ01LM, WSDCGQ11LM, WSDCGQ12LM, lumi.sensor_ht, lumi.sensor_ht.agl02, lumi.weather, SM0201, SNZB-02, SNZB-02D, SNZB-02P, TS0601, ZG-227Z, ZG-227ZL, CK-TLSR8656-SS5-01(7014), SNZB-02DR2, SNZB-02LD, SNZB-02WD, THS317-ET, ZG-303Z, TY0201, TS1201, RH3052 | measure_temperature, measure_temperature.probe, measure_humidity... |
| co_sensor | 4 | TS0601_co, TS0601 | alarm_co, measure_battery, measure_co... |
| contact_sensor | 109 | TS0203, ZG-102Z, ZG-102ZL, DS01, RH3001, MCCGQ01LM, MCCGQ11LM, MCCGQ12LM, MCCGQ14LM, lumi.sensor_magnet, lumi.sensor_magnet.aq2, lumi.magnet.ac01, lumi.magnet.agl02, E1603/E1702, TRADFRI open/close remote, 3300-S, 3320-L, SNZB-04, TS0601, SNZB-04P, SNZB-04PR2, CK-TLSR8656-SS5-01(7003), SNZB-04R2, TS0021, DoorWindow-Sensor-ZB3.0, MCT-340 E | alarm_contact, measure_battery, alarm_tamper... |
| curtain_motor | 130 | TS0302, ZC-LS02, TS130F, DS82, DS421, lumi.curtain, lumi.curtain.hagl04, lumi.curtain.acn002, E1757, KADRILJ, FYRTUR, AM02, AM43-0.45/40-ES-EZ, AM43-0.45/40-ES-EB, TS0601, TS0301, ZBCurtain, TS030F, TS0105 | windowcoverings_state, windowcoverings_set, windowcoverings_tilt_set... |
| curtain_motor_tilt | 28 | TS0601_curtain_tilt, TS0601 | windowcoverings_state, windowcoverings_set, windowcoverings_tilt_set... |
| dimmer_3gang | 2 | TS0601_dimmer3, TS0601 | onoff, dim, onoff.channel2... |
| dimmer_dual_channel | 11 | TS1101, TS0601 | onoff, dim, onoff.channel2... |
| dimmer_wall_1gang | 132 | TS0601_dim1, TS0601, ZBMINI-DIM, ZBMINID, TS110E, TS110F, TS1101, TS0052 | dim, onoff, measure_power... |
| din_rail_meter | 28 | SPM01-1Z2, SDM01-3Z1, SDM02-2Z1, SPM02-3Z3, TS0601 | measure_power, meter_power, measure_voltage... |
| din_rail_switch | 14 | TS0001_din, TS0601 | onoff, measure_power, meter_power... |
| diy_custom_zigbee | 103 | ARDUINO_ZIGBEE, BUTTON, CC1352P_DEV, CC1352_DEV, CC2530_ROUTER, CC2530_SENSOR, CC2530_SWITCH, CC2531_ROUTER, CC2531_USB, CC2652P_DEV, CC2652RB_DEV, CC2652R_DEV, CC2652_DEV, COD.M, CONBEE, CONBEE II, CONBEE III, CUSTOM, DEBUG, DEMO, DIMMER, DIY-01, DIY-02, DIY-03, DIY-04, DIY-08, DIY-LIGHT, DIY-ROUTER, DIY-SENSOR, DIY-SWITCH, DIYRUZ, DIYRUZ_AIRSENSE, DIYRUZ_CONTACT, DIYRUZ_FLOWER, DIYRUZ_GEIGER, DIYRUZ_MOTION, EFR32MG_DEV, EFR32_DEV, ESP32-C6, ESP32-H2, ESP32C6_DEV, ESP32H2_DEV, HUE_BRIDGE, LIGHT, PHOSCON_GATEWAY, PLATFORMIO_ZIGBEE, PROTOTYPE, PTVO.DIMMER, PTVO.LIGHT, PTVO.ROUTER, PTVO.SENSOR, PTVO.SWITCH, RASPBEE, RASPBEE II, ROUTER, SAMPLE, SENSOR, SLZB-06, SLZB-07, SONOFF_ZBBRIDGE, SWITCH, TASMOTA, TEST, TUBE, Z2T, ZBBRIDGE, ZIGBEE_DEV_KIT, ZIGSTAR, ZIGSTAR_LAN, ZIGSTAR_POE, ZIGSTAR_STICK, ZZH, ZZH! | onoff, measure_temperature, measure_humidity... |
| door_controller | 2 | TS0601_door, TS0601 | alarm_motion, alarm_contact, measure_battery... |
| doorbell | 8 | TS0211, TS0601 | alarm_motion, alarm_contact, measure_battery... |
| energy_meter_3phase | 13 | TS0601, TS0601_3phase | measure_power, meter_power, measure_voltage... |
| fan_controller | 16 | TS0601_fanctrl, TS0601 | onoff, dim |
| fingerbot | 4 | TS0001, TS0001_fingerbot | onoff, button.push, finger_bot_mode... |
| fingerprint_lock | 8 | TS0601_lock, TS0601 | locked, alarm_tamper, measure_battery |
| floor_heating_thermostat | 6 | TS0601 | target_temperature, measure_temperature, measure_temperature.floor... |
| formaldehyde_sensor | 1 | TS0601_hcho, TS0601 | measure_co2, measure_temperature, measure_humidity... |
| garage_door | 8 | TS0601_garage, TS0601 | garagedoor_closed, alarm_contact |
| garage_door_opener | 5 | TS0601, TS0603 | garagedoor_closed, alarm_contact |
| gas_detector | 13 | TS0204, TS0601 | alarm_generic, alarm_co, alarm_co2... |
| gas_sensor | 20 | TS0601_gas, TS0601, TS0225, ZG-225Z, TS0301 | alarm_co, alarm_co2, alarm_contact... |
| gateway_zigbee_bridge | 1 | TS0601_gw | alarm_generic, measure_battery, onoff |
| generic_diy | 27 | BUTTON, CC2530, CC2531, CC2652, CUSTOM, DIY, EFEKTA, ESP32, MAKER, PTVO, RELAY, ROUTER, SENSOR, SWITCH, SNZB-01, SNZB-02, SNZB-03, SNZB-04, SNZB-01P, SNZB-02P, SNZB-03P, SNZB-04P, SNZB-06P, S26R2ZB, S31ZB, S40ZBTPB, ZBMINI, ZBMINIL2, BASICZBR3, eTRV0100, eTRV0101, eTRV0103, eT093WRO, eT093WRG, TRV001, TRV003, 0x8040, BSP-FZ2, BSP-EZ2, Battery switch, 1 button, Battery switch, 2 buttons, ZIGSTAR, TS0041A, TS0026, TS0052, TS0224, TS0105, TS0901 | measure_battery |
| generic_tuya | 200 | TS0203, TS0601, TS0601_generic | measure_battery, measure_temperature, measure_humidity |
| handheld_remote_4_buttons | 1 | TS0044 | button, alarm_battery |
| humidifier | 7 | TS0601_humid, TS0601 | onoff, dim, measure_humidity... |
| hvac_air_conditioner | 1 | TS0601_ac, TS0601 | target_temperature, measure_temperature, thermostat_mode... |
| hvac_controller | 4 | TS0601 | onoff, target_temperature, measure_temperature... |
| hvac_dehumidifier | 7 | TS0601_dehum, TS0601 | dim.humidity, measure_humidity, measure_temperature... |
| illuminance_sensor | 5 | TS0222, ZG-106Z | measure_luminance, measure_battery |
| ir_blaster | 31 | TS1201, TS0601 | button.learn_ir, onoff, measure_battery |
| ir_remote | 6 | TS1201 | button.learn_ir, ir_learned_code, ir_send_code... |
| lcdtemphumidsensor | 13 | TS0601_lcd, TS0601, TS0201, TY0201 | measure_temperature, measure_humidity, measure_battery |
| led_controller_cct | 3 | TS0502 | onoff, dim, light_temperature... |
| led_controller_dimmable | 2 | TS0601_led, TS0501B, TRI-C1ZR, TRI-K1ZR | onoff, dim |
| led_controller_rgb | 1 | TS0503, TS0504 | onoff, dim, light_hue... |
| led_strip | 12 | TS0601_strip, TS0505B | dim, measure_battery, onoff... |
| led_strip_advanced | 2 | TS0601_strip_adv | dim, light_hue, light_saturation... |
| led_strip_rgbw | 11 | TS0601_strip_rgbw | light_hue, light_saturation, light_temperature... |
| light_sensor_outdoor | 1 | TS0601, TS0222 | measure_luminance, measure_battery |
| lock_smart | 12 | TS0601_smartlock, TS0601 | locked, lock_mode, measure_battery... |
| module_mini_switch | 8 | ZBMINI, ZBMINI-L, ZBMINIL2, ZBMINIR2, 01MINIZB, ZBM5-1C-120, ZBMINIR, ZBMINIL2-R2, ZBMINIR2-R2 | measure_battery, alarm_generic, measure_power... |
| motion_sensor | 102 | TS0202, TS0225, ZG-204Z, MS01, RH3040, IH012-RT01, TY0202, lumi.sensor_motion, lumi.sensor_motion.aq2, lumi.motion.ac02, lumi.motion.agl04, TRADFRI motion sensor, E1745, E1525/E1745, SML001, SML002, SML003, SML004, 3326-L, 3305-S, 3325-S, SNZB-03, TS0601, SNZB-03P, MSO1, CK-TLSR8656-SS5-01(7002), SNZB-03R2 | alarm_motion, measure_battery, measure_luminance... |
| motion_sensor_2 | 3 | TS0601 | measure_battery, measure_luminance, alarm_motion |
| motion_sensor_radar_mmwave | 23 | TS0601_mmwave, TS0601 | alarm_motion, measure_luminance.distance, measure_temperature... |
| pet_feeder | 6 | TS0601_feeder, TS0601 | button.feed, alarm_generic |
| pet_feeder_zigbee | 4 | TS0601 | button, measure_weight, alarm_generic |
| plug_energy_monitor | 148 | TS0121, TS011F, A7Z, A11Z, SP-EUC01, SP-EUC02, SP 120, SP 220, SP 222, S60ZBTPF, S60ZBTPG, S60ZBTPE, S31ZB, S31 Lite zb, S26R2ZB, S40ZBTPB, LSPA9, HY0105, HY0104, JZ-ZB-005, ZBMINIL2, lumi.plug.maeu01, lumi.plug.macn01, lumi.plug.mmeu01, E1603/E1702/E1708, TRADFRI control outlet, TS0601, CK-BL702-SWP-01(7020), S40LITE, SA-029-1, SA-028-1, Z111PL0H-1JX, SNZB-06P, SPM01, SPMZBR2, S40ZBTPF, S40ZBTPG, S60ZBTPF-R2 | measure_power, meter_power, measure_voltage... |
| plug_smart | 31 | TS0111, TS0101, TS0601, TS011F, S26R2ZB, S31 Lite zb, S40LITE, S60ZBTPF, S60ZBTPG | onoff, measure_power, meter_power... |
| pool_pump | 4 | TS0601_pool, TS0601 | onoff, measure_power, meter_power |
| power_clamp_meter | 7 | TS0601_clamp, TS0601 | measure_power, meter_power, measure_current... |
| power_meter | 5 | TS0601, TS0601_meter | measure_power, meter_power, measure_voltage... |
| presence_sensor_ceiling | 5 | TS0601_ceiling, TS0601 | alarm_motion, onoff, measure_luminance... |
| presence_sensor_radar | 101 | CK-BL702-MWS-01, CK-BL702-MWS-01(7016), MG1_5RZ, SZLMR10, TS0203, TS0225, TS0601, ZG-204ZH, ZG-204ZK, ZG-204ZL, ZG-204ZM, ZG-204ZV, ZG-205Z, ZP-301Z, SNZB-06P, ZG-204ZE, ZG-204ZQ, ZG-205ZL, ZG-302ZL, ZG-302ZM | alarm_motion, measure_luminance, measure_temperature... |
| radiator_controller | 5 | TS0601_rad, TS0601 | onoff, target_temperature, measure_temperature... |
| radiator_valve | 224 | TV01-ZB, TV02-ZB, TRV601, TRV602, SEA801-Zigbee, eTRV0100, SPZB0001, SPZB0003, lumi.airrtc.agl001, lumi.airrtc.vrfegl01, 014G2461, 014G2463, STZB402, STZB403, Zen-01, TS0601, TRVZB | target_temperature, measure_temperature, thermostat_mode... |
| radiator_valve_zigbee | 3 | TS0601 | target_temperature, measure_temperature, thermostat_mode... |
| rain_sensor | 11 | TS0207_rain, TS0601, TS0207, ZG-223Z, ZG-222Z | alarm_water, measure_humidity, measure_battery |
| remote_dimmer | 1 | TS1001 | measure_battery |
| scene_switch_1 | 3 | TS0601_scene1 | button.1, measure_battery |
| scene_switch_2 | 3 | TS0601_scene2, TS0726, TS0042 | button.1, button.2, measure_battery |
| scene_switch_3 | 3 | TS0601_scene3, TS0726, TS0043 | button.1, button.2, button.3... |
| scene_switch_4 | 11 | TS0601, ZG-101ZS, ERS-10TZBVK-AA | button.1, button.2, button.3... |
| scene_switch_6 | 1 | TS0601_scene6 | button.1, button.2, button.3... |
| shutter_roller_controller | 3 | TS0601_shutter, TS0601 | alarm_generic, windowcoverings_state, measure_battery... |
| siren | 28 | TS0216, TS0219, TS0601 | alarm_motion, measure_battery, alarm_generic... |
| sirentemphumidsensor | 2 | TS0601 | onoff, measure_temperature, measure_humidity... |
| smart_breaker | 4 | TS0601_breaker, TS0601 | onoff, alarm_generic, measure_power... |
| smart_button_switch | 3 | TS0041 | button.1, measure_battery |
| smart_heater | 2 | TS0601_heater, TS0601 | onoff, target_temperature, thermostat_mode... |
| smart_heater_controller | 5 | TS0601_heatctrl, TS0601 | onoff, target_temperature, measure_temperature... |
| smart_knob | 8 | TS004F, ERS-10TZBVK-AA | button, dim, measure_battery |
| smart_knob_rotary | 11 | TS004F, ERS-10TZBVK-AA, ZG-101ZD | button.rotate_left, button.rotate_right, button.press... |
| smart_knob_switch | 5 | TS004F | dim, alarm_battery |
| smart_lcd_thermostat | 6 | TS0601 | target_temperature, measure_temperature, measure_humidity... |
| smart_rcbo | 2 | TS0601_rcbo, TS0601 | onoff, alarm_generic, measure_power... |
| smart_remote_1_button | 3 | TS004F | measure_battery |
| smart_remote_1_button_2 | 1 | TS004F | button.1, measure_battery |
| smart_remote_4_buttons | 1 | TS0215A | button.1, button.2, button.3... |
| smart_scene_panel | 3 | TS0601 | onoff.gang1, onoff.gang2, onoff.gang3... |
| smoke_detector_advanced | 38 | TS0205, PG-S11Z, YG400A, SA12IZL, SD8SC_00.00.03.12TC, GS361A-H04, HS1SA, HS3SA, SMSZB-120, lumi.sensor_smoke, JTYJ-GD-01LM/BW, SSSQS01LM, NAS-SD02B0, TS0601 | alarm_smoke, measure_battery, measure_temperature... |
| soil_sensor | 32 | ZG-303Z, CS-201Z, TS0601, Arteco | measure_humidity.soil, measure_temperature, measure_humidity... |
| switch_1gang | 347 | TS0001, TS0011, TS0001_power, TS0001_switch, TS0001_switch_module, TS0601, TS000F, ZBMINI, ZBMINIL2, BASICZBR3, S31ZB, S26R2ZB, 01MINIZB, ZBMINIR2, ZBM5-1C-120, ZBMINIR, ZBMINIL2-R2, ZBMINIR2-R2, ZG-301Z, ZG-302Z1, TS0101, TS4100, TS011F, ZBM5-2C-120, ZBM5-3C-120, TS0726 | onoff, measure_battery, measure_power... |
| switch_2gang | 92 | TS0002, TS0012, TS0002_power, TS0002_switch_module, TS0601, ZG-302Z2, TS011F, ZG-305Z, TS0003, TS0013, TS0726 | onoff, onoff.gang2, measure_power... |
| switch_3gang | 65 | TS0003, TS0013, TS0003_power, TS0003_switch_module, TS0601, ZG-302Z3 | onoff, onoff.gang2, onoff.gang3... |
| switch_4gang | 80 | TS0004, TS0014, TS0004_power, TS0004_switch_module, TS0601, TS0726, JZ-ZB-004 | onoff, onoff.gang2, onoff.gang3... |
| switch_dimmer_1gang | 3 | TS0601 | onoff, dim |
| switch_plug_1 | 1 | TS0601_sp1 | onoff, measure_power, meter_power... |
| switch_plug_2 | 1 | TS0122 | onoff, onoff.outlet2, measure_power... |
| switch_temp_sensor | 1 | TS0601_tempswitch | onoff, measure_temperature, measure_humidity |
| switch_wall_5gang | 1 | TS0015, TS0601 | onoff, onoff.gang2, onoff.gang3... |
| switch_wall_6gang | 8 | TS0016, TS0601, TS0726 | onoff, onoff.gang2, onoff.gang3... |
| switch_wall_7gang | 2 | TS0007 | onoff, onoff.gang2, onoff.gang3... |
| switch_wall_8gang | 5 | TS0601_8gang, TS0601 | onoff, onoff.gang2, onoff.gang3... |
| switch_wireless | 2 | TS0601_wirelesssw | alarm_generic, measure_battery |
| temphumidsensor | 30 | TY0201, SNTZ003, CK-TLSR8656-SS5-01(7014), ZG-227Z, RH3052, TS0201 | measure_temperature, measure_humidity, measure_battery |
| thermostat_4ch | 1 | TS0601_thermo4ch, TS0601 | onoff, onoff.ch2, onoff.ch3... |
| thermostat_tuya_dp | 67 | TS0601_thermo, TS0601 | target_temperature, measure_temperature, thermostat_mode... |
| universal_fallback | 43 | TS0001, TS0002, TS0003, TS0004, TS0005, TS0006, TS0011, TS0012, TS0013, TS0014, TS0015, TS0041, TS0042, TS0043, TS0044, TS0045, TS0046, TS0047, TS0048, TS004F, TS0101, TS0111, TS011F, TS0121, TS0201, TS0203, TS0204, TS0205, TS0206, TS0207, TS0208, TS0209, TS0210, TS0211, TS0212, TS0215, TS0215A, TS0216, TS0216A, TS0218, TS0222, TS0225, TS0301, TS0302, TS0303, TS0304, TS0401, TS0402, TS0501, TS0501A, TS0501B, TS0502, TS0502A, TS0502B, TS0503, TS0503A, TS0503B, TS0504, TS0504A, TS0504B, TS0505, TS0505A, TS0505B, TS0601, TS110E, TS110F, TS130F, q9mpfhw | measure_battery |
| usb_dongle_dual_repeater | 2 | TS0207, TS0601_repeater, TS0002 | onoff, onoff.usb2, measure_power... |
| usb_dongle_triple | 1 | TS0003 | onoff, onoff.usb2, onoff.usb3... |
| usb_outlet_advanced | 13 | TS0115, TS0601 | onoff, onoff.socket2, onoff.usb1... |
| valve_irrigation | 33 | TS0601_irrigation, TS0601, TS0049 | dim.valve_1, dim.valve_2, dim.valve_3... |
| valve_single | 3 | TS0601_valve, TS0601, TS0001 | onoff, dim.valve, measure_battery |
| vibration_sensor | 23 | TS0209, TS0210, ZG-102ZM, TS0601, ZG-103ZL, ZG-103Z | alarm_vibration, measure_temperature, measure_battery... |
| wall_curtain_switch | 9 | TS130F | windowcoverings_set, windowcoverings_state |
| wall_dimmer_1gang_1way | 2 | TS004F, TS0501B, TRI-C1ZR, TRI-K1ZR, EDM-1ZBA-EU | onoff, dim |
| wall_remote_1_gang | 12 | TS0041 | button.1, measure_battery |
| wall_remote_2_gang | 9 | TS0042 | button.1, button.2, measure_battery |
| wall_remote_3_gang | 9 | TS0043 | button.1, button.2, button.3... |
| wall_remote_4_gang | 4 | TS0044 | button.1, button.2, button.3... |
| wall_remote_4_gang_2 | 7 | TS004F | button.1, button.2, button.3... |
| wall_remote_4_gang_3 | 3 | TS0044 | button.1, button.2, button.3... |
| wall_remote_6_gang | 1 | TS0046 | button.1, button.2, button.3... |
| wall_switch_1gang_1way | 7 | TS0001, TS0011 | onoff |
| wall_switch_2gang_1way | 16 | TS0002, TS0012, TS0042 | onoff |
| wall_switch_3gang_1way | 22 | TS0003, TS0013, TS0043 | onoff |
| wall_switch_4gang_1way | 2 | TS0726 | onoff |
| water_leak_sensor | 52 | TS0207, q9mpfhw, ZG-222Z, ZG-223Z, LS21001, _TZ3000_eit6l5, _TZ3000_k4ej3ww2, _TZ3000_kyb656no, lumi.sensor_wleak.aq1, SJCGQ11LM, SJCGQ12LM, SJCGQ13LM, HS1WL, SNZB-05, 3315-S, 3315-Seu, TS0601, SQ510A, SNZB-05P, CK-TLSR8656-SS5-01(7019) | alarm_water, measure_battery, alarm_tamper |
| water_tank_monitor | 10 | TS0601, TS0601_tank | measure_water_level, measure_water_percentage, alarm_water_low... |
| water_valve_garden | 6 | TS0049 | onoff, measure_battery |
| water_valve_smart | 6 | TS0601_watervalve, TS0601, SWV-ZN, SWV-ZNE, SWV-ZFE, SWV-ZNU, SWV-ZFU | onoff, meter_water, measure_temperature... |
| weather_station_outdoor | 2 | TS0601_weather, TS0601 | measure_temperature, measure_humidity, measure_pressure... |
| zigbee_repeater | 13 | TS0207 |  |

---
**Total:** 143 drivers, 4326 manufacturer IDs

*Generated: 2026-04-04T22:37:54.031Z*
