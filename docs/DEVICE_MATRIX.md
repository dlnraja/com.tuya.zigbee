# Device Support Matrix

| Driver | Manufacturers | Products | Capabilities |
|--------|---------------|----------|-------------|
| air_purifier | 329 | RH3052, TS0201, TS0222, TS0601, TS0601_AIR_PURIFIER, TS0601_air_purifier, TY0201, rh3052, ts0201, ts0222, ts0601, ts0601_air_purifier, ty0201 | dim, measure_pm25, onoff |
| air_purifier_climate_hybrid | 83 | TS0601, ts0601, RH3052, TS0201, TS0222, TY0201, rh3052, ts0201, ts0222, ty0201 | onoff, dim, measure_pm25... |
| air_purifier_contact_hybrid | 1 | TS0601, ts0601 | alarm_contact, alarm_tamper, measure_battery... |
| air_purifier_curtain_hybrid | 45 | TS0601, ts0601 | windowcoverings_state, windowcoverings_set, windowcoverings_tilt_set... |
| air_purifier_dimmer_hybrid | 29 | TS0601, ts0601 | dim, onoff, measure_power... |
| air_purifier_din_hybrid | 2 | - | onoff, measure_power, meter_power... |
| air_purifier_lcdtemphumidsensor_hybrid | 0 | TS0201, TS0601, ts0201, ts0601 | onoff, dim, measure_pm25... |
| air_purifier_motion_hybrid | 0 | TS0601, ts0601 | onoff, dim, measure_pm25... |
| air_purifier_presence_hybrid | 0 | TS0601, ts0601 | alarm_motion, measure_luminance, measure_temperature... |
| air_purifier_quality_hybrid | 6 | - | measure_co2, measure_temperature, measure_humidity... |
| air_purifier_sensor_hybrid | 0 | - | alarm_motion, measure_luminance.distance, measure_temperature... |
| air_purifier_siren_hybrid | 0 | TS0601, ts0601 | onoff, measure_temperature, measure_humidity... |
| air_purifier_soil_hybrid | 0 | TS0601, ts0601 | measure_humidity.soil, measure_temperature, measure_humidity... |
| air_purifier_switch_hybrid | 0 | TS0601, ts0601 | onoff, measure_battery, measure_power... |
| air_quality_co2 | 8 | TS0601, TS0601_CO2, TS0601_co2, ts0601, ts0601_co2 | measure_co2, measure_temperature, measure_humidity... |
| air_quality_comprehensive | 28 | TS0005, TS0006, TS0601, ts0005, ts0006, ts0601 | measure_co2, measure_pm25, measure_pm10... |
| air_quality_comprehensive_hybrid | 0 | TS0601, ts0601 | measure_co2, measure_pm25, measure_pm10... |
| blaster_remote_hybrid | 2 | TS1201, ts1201 | button.learn_ir, ir_learned_code, ir_send_code... |
| bulb_dimmable | 42 | A19 W 10 YEAR, A19 W 10 year, BR30 W 10 YEAR, BR30 W 10 year, GL-B-001Z, LED1623G12, LED1649C5, LED1836G9, LWB004, LWB006, LWB010, LWB014, PAR38 W 10 YEAR, PAR38 W 10 year, PLUG 01, Plug 01, RB 165, RB 175 W, RS 125, TS0052, TS0501A, TS0501B, TS1101, TS110E, TS110F, ZBT-DIMMABLELIGHT, ZBT-DimmableLight, a19 w 10 year, br30 w 10 year, gl-b-001z, led1623g12, led1649c5, led1836g9, lwb004, lwb006, lwb010, lwb014, par38 w 10 year, plug 01, rb 165, rb 175 w, rs 125, ts0052, ts0501a, ts0501b, ts1101, ts110e, ts110f, zbt-dimmablelight, TS0501, TS0502B | dim, light_hue, light_mode... |
| bulb_dimmable_dimmer_hybrid | 22 | TS0052, TS1101, TS110E, TS110F, ts0052, ts1101, ts110e, ts110f | dim, light_hue, light_saturation... |
| bulb_rgb | 120 | E11-G13, E11-G14, E11-G23, GL-C-006, LCT001, LCT002, LCT003, LCT007, LCT010, LCT011, LCT012, LCT014, LCT015, LCT016, RB 185 C, RB 285 C, TS0503A, TS0503B, TS0504B, TS0505A, TS0505B, ZB-CL01, ZBT-COLORLIGHT, ZBT-ColorLight, e11-g13, e11-g14, e11-g23, gl-c-006, lct001, lct002, lct003, lct007, lct010, lct011, lct012, lct014, lct015, lct016, rb 185 c, rb 285 c, ts0503a, ts0503b, ts0504b, ts0505a, ts0505b, zb-cl01, zbt-colorlight, TS0505 | dim, light_hue, light_saturation... |
| bulb_rgb_led_hybrid | 0 | TS0505B, ts0505b | dim, light_hue, light_saturation... |
| bulb_rgb_rgbw_hybrid | 2 | - | dim, light_hue, light_saturation... |
| bulb_rgbw | 88 | CK-BL702-AL-01(7009_Z102LG03-1), CLASSIC A60 RGBW, Classic A60 RGBW, FE-GU10-5W, FLEX RGBW, Flex RGBW, GENERIC, GL-B-008Z, GL-C-008, SMD9300, TS0504A, TS0504B, TS0505A, TS0505B, TS1002, ck-bl702-al-01(7009_z102lg03-1), classic a60 rgbw, fe-gu10-5w, flex rgbw, generic, gl-b-008z, gl-c-008, smd9300, ts0504a, ts0504b, ts0505a, ts0505b, ts1002 | onoff, dim, light_hue... |
| bulb_tunable_white | 48 | CLASSIC A60 TW, Classic A60 TW, E11-N13, E11-N14, E12-N13, E12-N14, GL-B-007Z, GL-C-007, LED1545G12, LED1546G12, LTW001, LTW004, LTW010, LTW012, LTW013, LTW015, RB 178 T, RS 128 T, TS0502A, TS0502B, ZBT-CCTLIGHT, ZBT-CCTLight, classic a60 tw, e11-n13, e11-n14, e12-n13, e12-n14, gl-b-007z, gl-c-007, led1545g12, led1546g12, ltw001, ltw004, ltw010, ltw012, ltw013, ltw015, rb 178 t, rs 128 t, ts0502a, ts0502b, zbt-cctlight, TS0502 | dim, light_hue, light_saturation... |
| bulb_tunable_white_hybrid | 2 | TS0502B | dim, light_hue, light_saturation... |
| bulb_white | 4 | TS0501, ts0501 | dim, light_hue, light_saturation... |
| button_emergency_sos | 81 | TS0215, TS0215A, TS0218, TS0601, ZBPB10BK, ts0215, ts0215a, ts0218, ts0601, zbpb10bk | alarm_generic, measure_battery, measure_radio_stability... |
| button_wireless | 8 | CK-TLSR8656-SS5-01(7000), SNZB-01, SNZB-01M, SNZB-01P, TS0040, WB-01, WB01, ck-tlsr8656-ss5-01(7000), snzb-01, snzb-01m, snzb-01p, ts0040, wb-01, wb01 | measure_battery, measure_radio_stability, measure_maintenance_score |
| button_wireless_1 | 82 | 3450-L, 3450-l, E1524/E1810, E1743, E1744, E1812, E2001/E2002, E2123, LUMI.REMOTE.B1ACN01, LUMI.SENSOR_SWITCH, LUMI.SENSOR_SWITCH.AQ2, LUMI.SENSOR_SWITCH.AQ3, ROM001, RWL020, RWL021, RWL022, WXKG01LM, WXKG02LM, WXKG03LM, WXKG06LM, WXKG07LM, WXKG11LM, WXKG12LM, ZG-101ZL, e1524/e1810, e1743, e1744, e1812, e2001/e2002, e2123, lumi.remote.b1acn01, lumi.sensor_switch, lumi.sensor_switch.aq2, lumi.sensor_switch.aq3, rom001, rwl020, rwl021, rwl022, wxkg01lm, wxkg02lm, wxkg03lm, wxkg06lm, wxkg07lm, wxkg11lm, wxkg12lm, zg-101zl | button.1, measure_battery, measure_radio_stability... |
| button_wireless_2 | 407 | TS0001, TS0001_FINGERBOT, TS0001_fingerbot, TS0002, TS0003, TS000F, TS0011, TS0012, TS0013, TS0042, TS0043, TS0111, ts0001, ts0001_fingerbot, ts0002, ts0003, ts000f, ts0011, ts0012, ts0013, ts0042, ts0043, ts0111, TS011F, TS0121, TSO121 | button.1, button.2, measure_battery... |
| button_wireless_3 | 20 | TS0043, ts0043 | button.1, button.2, button.3... |
| button_wireless_4 | 122 | SNZB-01M, TS0014, TS0044, TS004F, snzb-01m, ts0014, ts0044, ts004f | button.1, button.2, button.3... |
| button_wireless_6 | 6 | TS0046, TS0601, ts0046, ts0601 | button.1, button.2, button.3... |
| button_wireless_8 | 2 | TS0048, ts0048 | button.1, button.2, button.3... |
| button_wireless_fingerbot_hybrid | 13 | TS0001, ts0001, TS0001_FINGERBOT, TS0001_fingerbot, ts0001_fingerbot | onoff, measure_battery, measure_power... |
| button_wireless_plug_hybrid | 0 | TS011F, TS0121, TSO121, ts011f, ts0121, tso121, TS0111, ts0111 | measure_power, meter_power, measure_voltage... |
| button_wireless_scene_hybrid | 2 | TS0042, TS0043, ts0042, ts0043 | button.1, button.2, measure_battery... |
| button_wireless_smart_hybrid | 6 | TS0041, ts0041, TS004F, ts004f | button.1, measure_battery, measure_radio_stability... |
| button_wireless_switch_hybrid | 10 | TS0002, TS0003, TS0012, TS0013, TS011F, ts0002, ts0003, ts0012, ts0013, ts011f, TS0001, TS000F, TS0011, ts0001, ts000f, ts0011, TS0014, ts0014 | onoff, onoff.gang2, measure_power... |
| button_wireless_usb_hybrid | 2 | - | onoff, onoff.usb2, measure_power... |
| button_wireless_valve_hybrid | 2 | - | button.1, button.2, measure_battery... |
| button_wireless_wall_hybrid | 0 | TS0003, TS0013, TS0043, ts0003, ts0013, ts0043, TS0001, TS0011, ts0001, ts0011, TS0002, TS0012, TS0042, ts0002, ts0012, ts0042 | button.1, button.2, measure_battery... |
| ceiling_fan | 4 | TS0601, TS0601_FAN, TS0601_fan, ts0601, ts0601_fan | dim, onoff, dim.speed... |
| climate_sensor | 1427 | CK-TLSR8656-SS5-01(7014), LUMI.SENSOR_HT, LUMI.SENSOR_HT.AGL02, LUMI.WEATHER, RH3052, SM0201, SNZB-02, SNZB-02D, SNZB-02DR2, SNZB-02LD, SNZB-02P, SNZB-02WD, TH01, THS317-ET, TS0201, TS0222, TS0601, TY0201, WSDCGQ01LM, WSDCGQ11LM, WSDCGQ12LM, ZG-227Z, ZG-227ZL, ZG-303Z, ck-tlsr8656-ss5-01(7014), lumi.sensor_ht, lumi.sensor_ht.agl02, lumi.weather, rh3052, sm0201, snzb-02, snzb-02d, snzb-02dr2, snzb-02ld, snzb-02p, snzb-02wd, th01, ths317-et, ts0201, ts0222, ts0601, ty0201, wsdcgq01lm, wsdcgq11lm, wsdcgq12lm, zg-227z, zg-227zl, zg-303z | measure_battery, measure_humidity, measure_temperature... |
| climate_sensor_dimmer_hybrid | 2 | - | dim, onoff, measure_power... |
| climate_sensor_gas_hybrid | 0 | TS0601, ts0601 | alarm_generic, alarm_co, alarm_co2... |
| climate_sensor_plug_hybrid | 0 | TS0601, ts0601 | onoff, measure_power, meter_power... |
| climate_sensor_presence_hybrid | 0 | ts0601 | alarm_motion, measure_luminance, measure_temperature... |
| climate_sensor_smart_hybrid | 2 | - | onoff.gang1, onoff.gang2, onoff.gang3... |
| climate_sensor_switch_hybrid | 3 | TS0601, ts0601 | onoff, measure_battery, measure_power... |
| co_sensor | 8 | TS0601, TS0601_CO, TS0601_co, ts0601, ts0601_co | alarm_co, measure_battery, measure_co... |
| contact_sensor | 294 | 3300-S, 3300-s, 3320-L, 3320-l, CK-TLSR8656-SS5-01(7003), DOORWINDOW-SENSOR-ZB3.0, DS01, DoorWindow-Sensor-ZB3.0, E1603/E1702, LUMI.MAGNET.AC01, LUMI.MAGNET.AGL02, LUMI.SENSOR_MAGNET, LUMI.SENSOR_MAGNET.AQ2, MCCGQ01LM, MCCGQ11LM, MCCGQ12LM, MCCGQ14LM, MCT-340 E, Q9MPFHW, RH3001, SNZB-04, SNZB-04P, SNZB-04PR2, SNZB-04R2, TRADFRI OPEN/CLOSE REMOTE, TRADFRI open/close remote, TS0021, TS0203, TS0207, TS0601, TY0203, ZG-102Z, ZG-102ZL, ck-tlsr8656-ss5-01(7003), doorwindow-sensor-zb3.0, ds01, e1603/e1702, lumi.magnet.ac01, lumi.magnet.agl02, lumi.sensor_magnet, lumi.sensor_magnet.aq2, mccgq01lm, mccgq11lm, mccgq12lm, mccgq14lm, mct-340 e, q9mpfhw, rh3001, snzb-04, snzb-04p, snzb-04pr2, snzb-04r2, tradfri open/close remote, ts0021, ts0203, ts0207, ts0601, ty0203, zg-102z, zg-102zl | alarm_contact, alarm_tamper, measure_battery... |
| contact_sensor_curtain_hybrid | 2 | - | windowcoverings_state, windowcoverings_set, windowcoverings_tilt_set... |
| contact_sensor_dimmer_hybrid | 2 | - | alarm_contact, measure_battery, alarm_tamper... |
| contact_sensor_plug_hybrid | 0 | TS0601, ts0601 | onoff, measure_power, meter_power... |
| contact_sensor_switch_hybrid | 3 | TS0601, ts0601 | onoff, measure_battery, measure_power... |
| contact_sensor_zigbee_hybrid | 0 | TS0207, ts0207 | alarm_contact, measure_battery, alarm_tamper... |
| curtain_motor | 295 | AM02, AM43-0.45/40-ES-EB, AM43-0.45/40-ES-EZ, DS421, DS82, E1757, FYRTUR, KADRILJ, LUMI.CURTAIN, LUMI.CURTAIN.ACN002, LUMI.CURTAIN.HAGL04, TS0105, TS0301, TS0302, TS030F, TS0601, TS130F, ZBCURTAIN, ZBCurtain, ZC-LS02, am02, am43-0.45/40-es-eb, am43-0.45/40-es-ez, ds421, ds82, e1757, fyrtur, kadrilj, lumi.curtain, lumi.curtain.acn002, lumi.curtain.hagl04, ts0105, ts0301, ts0302, ts030f, ts0601, ts130f, zbcurtain, zc-ls02 | windowcoverings_state, windowcoverings_set, windowcoverings_tilt_set... |
| curtain_motor_shutter_hybrid | 2 | TS0601, ts0601 | windowcoverings_state, windowcoverings_set, windowcoverings_tilt_set... |
| curtain_motor_tilt | 18 | TS0601, TS0601_CURTAIN_TILT, TS0601_curtain_tilt, ts0601, ts0601_curtain_tilt | windowcoverings_state, windowcoverings_set, windowcoverings_tilt_set... |
| curtain_motor_tilt_hybrid | 12 | TS0601, ts0601 | windowcoverings_state, windowcoverings_set, windowcoverings_tilt_set... |
| curtain_motor_wall_hybrid | 2 | - | windowcoverings_state, windowcoverings_set, windowcoverings_tilt_set... |
| device_air_purifier_climate_hybrid | 18 | TS0601, ts0601 | onoff, dim, measure_pm25... |
| device_air_purifier_din_hybrid | 4 | - | measure_power, meter_power, measure_voltage... |
| device_air_purifier_floor_hybrid | 0 | TS0601, ts0601 | target_temperature, measure_temperature, measure_temperature.floor... |
| device_air_purifier_humidifier_hybrid | 2 | - | onoff, dim, measure_humidity... |
| device_air_purifier_hybrid | 99 | TS0601, ts0601 | target_temperature, measure_temperature, thermostat_mode... |
| device_air_purifier_led_hybrid | 2 | TS0601 | dim, measure_battery, onoff... |
| device_air_purifier_motion_hybrid | 22 | TS0601, ts0601 | onoff, dim, measure_pm25... |
| device_air_purifier_plug_hybrid | 0 | TS0601, ts0601 | measure_power, meter_power, measure_voltage... |
| device_air_purifier_presence_hybrid | 18 | TS0601, ts0601 | alarm_motion, measure_luminance, measure_temperature... |
| device_air_purifier_quality_hybrid | 2 | TS0601, ts0601 | measure_co2, measure_pm25, measure_pm10... |
| device_air_purifier_radiator_hybrid | 0 | TS0601, ts0601 | target_temperature, measure_temperature, thermostat_mode... |
| device_air_purifier_siren_hybrid | 6 | - | alarm_motion, measure_battery, alarm_generic... |
| device_air_purifier_smart_hybrid | 2 | - | target_temperature, measure_temperature, measure_humidity... |
| device_air_purifier_smoke_hybrid | 0 | TS0601, ts0601 | alarm_smoke, measure_battery, measure_temperature... |
| device_air_purifier_soil_hybrid | 12 | TS0601, ts0601 | measure_humidity.soil, measure_temperature, measure_humidity... |
| device_air_purifier_thermostat_hybrid | 0 | TS0601, ts0601 | target_temperature, measure_temperature, thermostat_mode... |
| device_air_purifier_water_hybrid | 2 | - | measure_water_level, measure_water_percentage, alarm_water_low... |
| device_din_rail_meter_hybrid | 4 | TS0601, ts0601 | dim.humidity, measure_humidity, measure_temperature... |
| device_floor_heating_hybrid | 2 | TS0601, ts0601 | target_temperature, measure_temperature, measure_temperature.floor... |
| device_floor_heating_thermostat_hybrid | 0 | TS0601, ts0601 | target_temperature, measure_temperature, measure_temperature.floor... |
| device_generic_tuya_universal_hybrid | 24 | TS0601, ts0601 | measure_battery, measure_temperature, measure_humidity... |
| device_plug_energy_hybrid | 1 | S26R2ZB, S31 LITE ZB, S31 Lite zb, S40LITE, S60ZBTPF, S60ZBTPG, TS011F, s26r2zb, s31 lite zb, s40lite, s60zbtpf, s60zbtpg, ts011f, TS0601, ts0601, s31zb, zbminil2 | onoff, measure_power, meter_power... |
| device_plug_energy_monitor_hybrid | 1 | - | onoff, measure_power, meter_power... |
| device_plug_smart_hybrid | 10 | TS0049, ts0049, TS0101 | onoff, measure_power, meter_power... |
| device_plug_smart_water_hybrid | 0 | TS0049, ts0049 | onoff, measure_power, meter_power... |
| device_radiator_valve_hybrid | 4 | TS0601, ts0601 | target_temperature, measure_temperature, thermostat_mode... |
| device_radiator_valve_smart_hybrid | 0 | TS0601, ts0601 | target_temperature, measure_temperature, thermostat_mode... |
| device_radiator_valve_thermostat_hybrid | 1 | TS0601, ts0601 | target_temperature, measure_temperature, thermostat_mode... |
| dimmer_3gang | 4 | TS0601, TS0601_DIMMER3, TS0601_dimmer3, ts0601, ts0601_dimmer3 | onoff, dim, onoff.channel2... |
| dimmer_air_purifier_hybrid | 2 | TS0601, ts0601 | dim, onoff, measure_power... |
| dimmer_bulb_dimmable_hybrid | 2 | TS0052, TS1101, TS110E, TS110F, ts0052, ts1101, ts110e, ts110f | dim, light_hue, light_saturation... |
| dimmer_dual_channel | 10 | TS0601, TS1101, ts0601, ts1101, TS110F, TS110E | onoff, dim, onoff.channel2... |
| dimmer_dual_channel_hybrid | 4 | TS0601, TS1101, ts0601, ts1101 | onoff, dim, onoff.channel2... |
| dimmer_ts110e | 0 | TS110E, ts110e | onoff, dim, measure_radio_stability... |
| dimmer_wall_1gang | 218 | TS0052, TS0601, TS0601_DIM1, TS0601_dim1, TS1101, TS110E, TS110F, ZBMINI-DIM, ZBMINID, ts0052, ts0601, ts0601_dim1, ts1101, ts110e, ts110f, zbmini-dim, zbminid | dim, onoff, measure_power... |
| dimmer_wall_plug_hybrid | 8 | TS0601, ts0601 | measure_power, meter_power, measure_voltage... |
| dimmer_wall_switch_hybrid | 6 | TS0601, ts0601 | onoff, onoff.gang2, measure_power... |
| dimmer_wall_water_hybrid | 4 | TS0601, ts0601 | dim, onoff, measure_power... |
| din_rail_meter | 50 | SDM01-3Z1, SDM02-2Z1, SPM01-1Z2, SPM02-3Z3, TS0601, sdm01-3z1, sdm02-2z1, spm01-1z2, spm02-3z3, ts0601 | measure_power, meter_power, measure_voltage... |
| din_rail_switch | 26 | TS0001_DIN, TS0001_din, TS0601, ts0001_din, ts0601 | onoff, measure_power, meter_power... |
| diy_custom_zigbee | 103 | ARDUINO_ZIGBEE, BUTTON, CC1352P_DEV, CC1352_DEV, CC2530_ROUTER, CC2530_SENSOR, CC2530_SWITCH, CC2531_ROUTER, CC2531_USB, CC2652P_DEV, CC2652RB_DEV, CC2652R_DEV, CC2652_DEV, COD.M, CONBEE, CONBEE II, CONBEE III, CUSTOM, DEBUG, DEMO, DIMMER, DIY-01, DIY-02, DIY-03, DIY-04, DIY-08, DIY-LIGHT, DIY-ROUTER, DIY-SENSOR, DIY-SWITCH, DIYRUZ, DIYRUZ_AIRSENSE, DIYRUZ_CONTACT, DIYRUZ_FLOWER, DIYRUZ_GEIGER, DIYRUZ_MOTION, EFR32MG_DEV, EFR32_DEV, ESP32-C6, ESP32-H2, ESP32C6_DEV, ESP32H2_DEV, HUE_BRIDGE, LIGHT, PHOSCON_GATEWAY, PLATFORMIO_ZIGBEE, PROTOTYPE, PTVO.DIMMER, PTVO.LIGHT, PTVO.ROUTER, PTVO.SENSOR, PTVO.SWITCH, RASPBEE, RASPBEE II, ROUTER, SAMPLE, SENSOR, SLZB-06, SLZB-07, SONOFF_ZBBRIDGE, SWITCH, TASMOTA, TEST, TUBE, Z2T, ZBBRIDGE, ZIGBEE_DEV_KIT, ZIGSTAR, ZIGSTAR_LAN, ZIGSTAR_POE, ZIGSTAR_STICK, ZZH, ZZH!, arduino_zigbee, button, cc1352_dev, cc1352p_dev, cc2530_router, cc2530_sensor, cc2530_switch, cc2531_router, cc2531_usb, cc2652_dev, cc2652p_dev, cc2652r_dev, cc2652rb_dev, cod.m, conbee, conbee ii, conbee iii, custom, debug, demo, dimmer, diy-01, diy-02, diy-03, diy-04, diy-08, diy-light, diy-router, diy-sensor, diy-switch, diyruz, diyruz_airsense, diyruz_contact, diyruz_flower, diyruz_geiger, diyruz_motion, efr32_dev, efr32mg_dev, esp32-c6, esp32-h2, esp32c6_dev, esp32h2_dev, hue_bridge, light, phoscon_gateway, platformio_zigbee, prototype, ptvo.dimmer, ptvo.light, ptvo.router, ptvo.sensor, ptvo.switch, raspbee, raspbee ii, router, sample, sensor, slzb-06, slzb-07, sonoff_zbbridge, switch, tasmota, test, tube, z2t, zbbridge, zigbee_dev_kit, zigstar, zigstar_lan, zigstar_poe, zigstar_stick, zzh, zzh! | onoff, measure_temperature, measure_humidity... |
| door_controller | 4 | TS0601, TS0601_DOOR, TS0601_door, ts0601, ts0601_door | alarm_motion, alarm_contact, measure_battery... |
| door_controller_garage_hybrid | 2 | TS0601, ts0601 | alarm_motion, alarm_contact, measure_battery... |
| doorbell | 16 | TS0211, TS0601, ts0211, ts0601 | alarm_motion, alarm_contact, measure_battery... |
| energy_meter_3phase | 26 | TS0601, TS0601_3PHASE, TS0601_3phase, ts0601, ts0601_3phase | measure_power, meter_power, measure_voltage... |
| fan_controller | 32 | TS0601, TS0601_FANCTRL, TS0601_fanctrl, ts0601, ts0601_fanctrl | onoff, dim, measure_radio_stability... |
| fingerbot | 4 | TS0001, TS0001_FINGERBOT, TS0001_fingerbot, ts0001, ts0001_fingerbot, TS0001_FINGER | onoff, button.push, finger_bot_mode... |
| fingerbot_switch_hybrid | 0 | TS0001, ts0001 | onoff, measure_battery, measure_power... |
| fingerprint_lock | 16 | TS0601, TS0601_LOCK, TS0601_lock, ts0601, ts0601_lock | locked, alarm_tamper, measure_battery... |
| floor_heating_thermostat | 4 | TS0601, ts0601 | target_temperature, measure_temperature, measure_temperature.floor... |
| formaldehyde_sensor | 2 | TS0601, TS0601_HCHO, TS0601_hcho, ts0601, ts0601_hcho | measure_co2, measure_temperature, measure_humidity... |
| garage_door | 15 | TS0601, TS0601_GARAGE, TS0601_garage, ts0601, ts0601_garage | garagedoor_closed, alarm_contact, measure_radio_stability... |
| garage_door_opener | 10 | TS0601, TS0603, ts0601, ts0603 | garagedoor_closed, alarm_contact, measure_radio_stability... |
| gas_detector | 22 | TS0204, TS0601, ts0204, ts0601 | alarm_generic, alarm_co, alarm_co2... |
| gas_sensor | 56 | TS0225, TS0301, TS0601, TS0601_GAS, TS0601_gas, ZG-225Z, ts0225, ts0301, ts0601, ts0601_gas, zg-225z | alarm_co, alarm_co2, alarm_contact... |
| gas_sensor_switch_hybrid | 1 | TS0601, ts0601 | onoff, onoff.gang2, onoff.gang3... |
| gateway_zigbee_bridge | 2 | TS0601_GW, TS0601_gw, ts0601_gw | alarm_generic, measure_battery, onoff... |
| generic_diy | 24 | 0X8040, 0x8040, BASICZBR3, BATTERY SWITCH, 1 BUTTON, BATTERY SWITCH, 2 BUTTONS, BSP-EZ2, BSP-FZ2, BUTTON, Battery switch, 1 button, Battery switch, 2 buttons, CC2530, CC2531, CC2652, CUSTOM, DIY, EFEKTA, ESP32, ET093WRG, ET093WRO, ETRV0100, ETRV0101, ETRV0103, MAKER, PTVO, RELAY, ROUTER, S26R2ZB, S31ZB, S40ZBTPB, SENSOR, SNZB-01, SNZB-01P, SNZB-02, SNZB-02P, SNZB-03, SNZB-03P, SNZB-04, SNZB-04P, SNZB-06P, SWITCH, TRV001, TRV003, TS0026, TS0041A, TS0052, TS0105, TS0224, TS0901, ZBMINI, ZBMINIL2, ZIGSTAR, basiczbr3, battery switch, 1 button, battery switch, 2 buttons, bsp-ez2, bsp-fz2, button, cc2530, cc2531, cc2652, custom, diy, eT093WRG, eT093WRO, eTRV0100, eTRV0101, eTRV0103, efekta, esp32, et093wrg, et093wro, etrv0100, etrv0101, etrv0103, maker, ptvo, relay, router, s26r2zb, s31zb, s40zbtpb, sensor, snzb-01, snzb-01p, snzb-02, snzb-02p, snzb-03, snzb-03p, snzb-04, snzb-04p, snzb-06p, switch, trv001, trv003, ts0026, ts0041a, ts0052, ts0105, ts0224, ts0901, zbmini, zbminil2, zigstar | measure_battery, measure_radio_stability, measure_maintenance_score |
| generic_tuya | 175 | TS0203, TS0601, TS0601_GENERIC, TS0601_generic, ts0203, ts0601, ts0601_generic | measure_battery, measure_temperature, measure_humidity... |
| handheld_remote_4_buttons | 0 | TS0044, ts0044 | button, alarm_battery, measure_radio_stability... |
| humidifier | 12 | TS0601, TS0601_HUMID, TS0601_humid, ts0601, ts0601_humid | onoff, dim, measure_humidity... |
| hvac_air_conditioner | 2 | TS0601, TS0601_AC, TS0601_ac, ts0601, ts0601_ac | target_temperature, measure_temperature, thermostat_mode... |
| hvac_controller | 8 | TS0601, ts0601 | onoff, target_temperature, measure_temperature... |
| hvac_dehumidifier | 14 | TS0601, TS0601_DEHUM, TS0601_dehum, ts0601, ts0601_dehum | dim.humidity, measure_humidity, measure_temperature... |
| illuminance_sensor | 9 | TS0222, ZG-106Z, ts0222, zg-106z | measure_luminance, measure_battery, measure_radio_stability... |
| ir_blaster | 58 | TS0601, TS1201, ts0601, ts1201 | button.learn_ir, onoff, measure_battery... |
| ir_remote | 12 | TS1201, ts1201 | button.learn_ir, ir_learned_code, ir_send_code... |
| lcdtemphumidsensor | 22 | TS0201, TS0601, TS0601_LCD, TS0601_lcd, TY0201, ts0201, ts0601, ts0601_lcd, ty0201 | measure_temperature, measure_humidity, measure_battery... |
| lcdtemphumidsensor_plug_energy_hybrid | 2 | TS0601, ts0601 | measure_power, meter_power, measure_voltage... |
| led_controller_cct | 14 | TS0502, ts0502 | onoff, dim, light_temperature... |
| led_controller_dimmable | 4 | TRI-C1ZR, TRI-K1ZR, TS0501B, TS0601_LED, TS0601_led, tri-c1zr, tri-k1zr, ts0501b, ts0601_led, TS0502B | onoff, dim, measure_radio_stability... |
| led_controller_rgb | 2 | TS0503, TS0504, ts0503, ts0504 | onoff, dim, light_hue... |
| led_strip | 6 | TS0505B, TS0601_STRIP, TS0601_strip, ts0505b, ts0601_strip, TS0601 | dim, measure_battery, onoff... |
| led_strip_advanced | 4 | TS0601_STRIP_ADV, TS0601_strip_adv, ts0601_strip_adv | dim, light_hue, light_saturation... |
| led_strip_rgbw | 22 | TS0601_STRIP_RGBW, TS0601_strip_rgbw, ts0601_strip_rgbw | light_hue, light_saturation, light_temperature... |
| light_bulb_dimmable_tunable_hybrid | 52 | TS0502B | dim, light_hue, light_mode... |
| light_bulb_rgb_hybrid | 22 | TS0505A, TS0505B, ts0505a, ts0505b, TS0504B, ts0504b | dim, light_hue, light_saturation... |
| light_bulb_rgb_led_hybrid | 16 | TS0505B, ts0505b | dim, light_hue, light_saturation... |
| light_bulb_rgb_rgbw_hybrid | 126 | TS0505A, TS0505B, ts0505a, ts0505b, TS0504B, ts0504b | dim, light_hue, light_saturation... |
| light_bulb_tunable_white_hybrid | 2 | TS0502B | dim, light_hue, light_saturation... |
| light_sensor_outdoor | 2 | TS0222, TS0601, ts0222, ts0601 | measure_luminance, measure_battery, measure_radio_stability... |
| lock_smart | 24 | TS0601, TS0601_SMARTLOCK, TS0601_smartlock, ts0601, ts0601_smartlock | locked, lock_mode, measure_battery... |
| module_mini_switch | 10 | 01MINIZB, 01minizb, ZBM5-1C-120, ZBMINI, ZBMINI-L, ZBMINIL2, ZBMINIL2-R2, ZBMINIR, ZBMINIR2, ZBMINIR2-R2, zbm5-1c-120, zbmini, zbmini-l, zbminil2, zbminil2-r2, zbminir, zbminir2, zbminir2-r2 | measure_battery, alarm_generic, measure_power... |
| module_mini_switch_hybrid | 2 | ZBMINIL2, zbminil2 | measure_battery, alarm_generic, measure_power... |
| motion_sensor | 197 | 3305-S, 3305-s, 3325-S, 3325-s, 3326-L, 3326-l, CK-TLSR8656-SS5-01(7002), E1525/E1745, E1745, IH012-RT01, LUMI.MOTION.AC02, LUMI.MOTION.AGL04, LUMI.SENSOR_MOTION, LUMI.SENSOR_MOTION.AQ2, MS01, MSO1, RH3040, SML001, SML002, SML003, SML004, SNZB-03, SNZB-03P, SNZB-03R2, TRADFRI MOTION SENSOR, TRADFRI motion sensor, TS0202, TS0225, TS0601, TY0202, ZG-204Z, ck-tlsr8656-ss5-01(7002), e1525/e1745, e1745, ih012-rt01, lumi.motion.ac02, lumi.motion.agl04, lumi.sensor_motion, lumi.sensor_motion.aq2, ms01, mso1, rh3040, sml001, sml002, sml003, sml004, snzb-03, snzb-03p, snzb-03r2, tradfri motion sensor, ts0202, ts0225, ts0601, ty0202, zg-204z | alarm_motion, measure_battery, measure_luminance... |
| motion_sensor_2 | 0 | TS0601, ts0601 | measure_battery, measure_luminance, alarm_motion... |
| motion_sensor_radar_mmwave | 29 | TS0601_MMWAVE, TS0601_mmwave, ts0601_mmwave | alarm_motion, measure_luminance.distance, measure_temperature... |
| motion_sensor_switch_hybrid | 2 | - | onoff, measure_battery, measure_power... |
| pet_feeder | 12 | TS0601, TS0601_FEEDER, TS0601_feeder, ts0601, ts0601_feeder | button.feed, alarm_generic, measure_radio_stability... |
| pet_feeder_zigbee | 8 | TS0601, ts0601 | button, measure_weight, alarm_generic... |
| plug_energy_monitor | 187 | A11Z, A7Z, CK-BL702-SWP-01(7020), E1603/E1702/E1708, HY0104, HY0105, JZ-ZB-005, LSPA9, LUMI.PLUG.MACN01, LUMI.PLUG.MAEU01, LUMI.PLUG.MMEU01, S31ZB, S40ZBTPB, S40ZBTPF, S40ZBTPG, S60ZBTPE, S60ZBTPF-R2, SA-028-1, SA-029-1, SNZB-06P, SP 120, SP 220, SP 222, SP-EUC01, SP-EUC02, SPM01, SPMZBR2, TRADFRI CONTROL OUTLET, TRADFRI control outlet, TS0121, TSO121, Z111PL0H-1JX, ZBMINIL2, a11z, a7z, ck-bl702-swp-01(7020), e1603/e1702/e1708, hy0104, hy0105, jz-zb-005, lspa9, lumi.plug.macn01, lumi.plug.maeu01, lumi.plug.mmeu01, s31zb, s40zbtpb, s40zbtpf, s40zbtpg, s60zbtpe, s60zbtpf-r2, sa-028-1, sa-029-1, snzb-06p, sp 120, sp 220, sp 222, sp-euc01, sp-euc02, spm01, spmzbr2, tradfri control outlet, ts0121, tso121, z111pl0h-1jx, zbminil2 | measure_power, meter_power, measure_voltage... |
| plug_energy_monitor_hybrid | 3 | TS0601, ts0601, S26R2ZB, S31ZB, TS011F, ZBMINIL2, s26r2zb, s31zb, ts011f, zbminil2 | measure_temperature, measure_humidity, measure_battery... |
| plug_smart | 56 | S26R2ZB, S31 LITE ZB, S31 Lite zb, S40LITE, S60ZBTPF, S60ZBTPG, TS0049, TS0101, TS0111, TS011F, TS0601, s26r2zb, s31 lite zb, s40lite, s60zbtpf, s60zbtpg, ts0049, ts0101, ts0111, ts011f, ts0601 | measure_battery, measure_current, measure_power... |
| plug_smart_switch_hybrid | 2 | - | onoff, measure_battery, measure_power... |
| pool_pump | 8 | TS0601, TS0601_POOL, TS0601_pool, ts0601, ts0601_pool | onoff, measure_power, meter_power... |
| power_clamp_meter | 14 | TS0601, TS0601_CLAMP, TS0601_clamp, ts0601, ts0601_clamp | measure_power, meter_power, measure_current... |
| power_meter | 10 | TS0601, TS0601_METER, TS0601_meter, ts0601, ts0601_meter | measure_power, meter_power, measure_voltage... |
| presence_sensor_ceiling | 10 | TS0601, TS0601_CEILING, TS0601_ceiling, ts0601, ts0601_ceiling | alarm_motion, onoff, measure_luminance... |
| presence_sensor_radar | 177 | CK-BL702-MWS-01, CK-BL702-MWS-01(7016), MG1_5RZ, SNZB-06P, SZLMR10, TS0225, TS0601, ZG-204ZE, ZG-204ZH, ZG-204ZK, ZG-204ZL, ZG-204ZM, ZG-204ZQ, ZG-204ZV, ZG-205Z, ZG-205ZL, ZG-302ZL, ZG-302ZM, ZP-301Z, ck-bl702-mws-01, ck-bl702-mws-01(7016), mg1_5rz, snzb-06p, szlmr10, ts0601, ts0225, zg-204ze, zg-204zh, zg-204zk, zg-204zl, zg-204zm, zg-204zq, zg-204zv, zg-205z, zg-205zl, zg-302zl, zg-302zm, zp-301z | alarm_motion, measure_luminance, measure_temperature... |
| radiator_controller | 10 | TS0601, TS0601_RAD, TS0601_rad, ts0601, ts0601_rad | onoff, target_temperature, measure_temperature... |
| radiator_valve | 340 | 014G2461, 014G2463, 014g2461, 014g2463, ETRV0100, LUMI.AIRRTC.AGL001, LUMI.AIRRTC.VRFEGL01, SEA801-ZIGBEE, SEA801-Zigbee, SPZB0001, SPZB0003, STZB402, STZB403, TRV601, TRV602, TRVZB, TS0601, TV01-ZB, TV02-ZB, ZEN-01, Zen-01, eTRV0100, etrv0100, lumi.airrtc.agl001, lumi.airrtc.vrfegl01, sea801-zigbee, spzb0001, spzb0003, stzb402, stzb403, trv601, trv602, trvzb, ts0601, tv01-zb, tv02-zb, zen-01 | target_temperature, measure_temperature, thermostat_mode... |
| radiator_valve_zigbee | 6 | TS0601, ts0601 | target_temperature, measure_temperature, thermostat_mode... |
| rain_sensor | 16 | TS0207, TS0207_RAIN, TS0207_rain, TS0601, ZG-222Z, ZG-223Z, ts0207, ts0207_rain, ts0601, zg-222z, zg-223z | alarm_water, measure_humidity, measure_battery... |
| remote_button_emergency_sos_hybrid | 2 | - | button.1, button.2, button.3... |
| remote_button_wireless_fingerbot_hybrid | 5 | TS0001, TS0001_FINGERBOT, TS0001_fingerbot, ts0001, ts0001_fingerbot | onoff, measure_battery, measure_power... |
| remote_button_wireless_handheld_hybrid | 2 | - | button.1, button.2, button.3... |
| remote_button_wireless_hybrid | 120 | TS004F, ts004f, TS0041, ts0041, TS0043, ts0043, TS0044, ts0044, TS0046, ts0046, SNZB-01, SNZB-01P, snzb-01, snzb-01p, SNZB-01M, snzb-01m, TS0042, ts0042, TS0111, ts0111, TS0002, ts0002, TS0001, ts0001, TS0003, TS0011, TS0012, TS0013, ts0003, ts0011, ts0012, ts0013 | button.rotate_left, button.rotate_right, button.press... |
| remote_button_wireless_plug_hybrid | 96 | TS0111, ts0111 | measure_power, meter_power, measure_voltage... |
| remote_button_wireless_scene_hybrid | 3 | TS0042, TS0043, ts0042, ts0043 | button.1, button.2, measure_battery... |
| remote_button_wireless_smart_hybrid | 4 | TS0041, ts0041, TS004F, ts004f | button.1, measure_battery, measure_radio_stability... |
| remote_button_wireless_usb_hybrid | 2 | TS0002, ts0002 | onoff, onoff.usb2, measure_power... |
| remote_button_wireless_valve_hybrid | 2 | TS0001, ts0001 | button.1, button.2, measure_battery... |
| remote_button_wireless_wall_hybrid | 57 | TS0041, TS0043, TS0044, TS0046, TS004F, ts0041, ts0043, ts0044, ts0046, ts004f, TS0042, ts0042, TS0001, TS0002, TS0003, TS0011, TS0012, TS0013, ts0001, ts0002, ts0003, ts0011, ts0012, ts0013 | button.1, measure_battery, measure_radio_stability... |
| remote_dimmer | 2 | TS1001, ts1001 | measure_battery, measure_radio_stability, measure_maintenance_score |
| scene_switch_1 | 6 | TS0601_SCENE1, TS0601_scene1, ts0601_scene1 | button.1, measure_battery, measure_radio_stability... |
| scene_switch_2 | 2 | TS0042, TS0601_SCENE2, TS0601_scene2, TS0726, ts0042, ts0601_scene2, ts0726 | button.1, button.2, measure_battery... |
| scene_switch_3 | 4 | TS0043, TS0601_SCENE3, TS0601_scene3, TS0726, ts0043, ts0601_scene3, ts0726 | button.1, button.2, button.3... |
| scene_switch_4 | 20 | ERS-10TZBVK-AA, TS0601, ZG-101ZS, ers-10tzbvk-aa, ts0601, zg-101zs | button.1, button.2, button.3... |
| scene_switch_6 | 2 | TS0601_SCENE6, TS0601_scene6, ts0601_scene6 | button.1, button.2, button.3... |
| scene_switch_wall_hybrid | 0 | TS0042, TS0043, ts0042, ts0043 | button.1, button.2, measure_battery... |
| sensor_climate_contact_hybrid | 14 | ZG-227Z, zg-227z, TS0601, ts0601 | measure_temperature, measure_humidity, measure_battery... |
| sensor_climate_lcdtemphumidsensor_hybrid | 4 | TS0201, TS0601, TY0201, ts0201, ts0601, ty0201 | measure_temperature, measure_humidity, measure_battery... |
| sensor_climate_motion_hybrid | 2 | - | alarm_motion, measure_battery, measure_luminance... |
| sensor_climate_presence_hybrid | 1 | - | alarm_motion, measure_luminance, measure_temperature... |
| sensor_climate_smart_hybrid | 2 | TS0601, ts0601 | onoff.gang1, onoff.gang2, onoff.gang3... |
| sensor_climate_temphumidsensor_hybrid | 28 | CK-TLSR8656-SS5-01(7014), ZG-227Z, ck-tlsr8656-ss5-01(7014), zg-227z | measure_temperature, measure_humidity, measure_battery... |
| sensor_contact_climate_hybrid | 7 | TS0601, ts0601 | measure_temperature, measure_humidity, measure_battery... |
| sensor_contact_motion_hybrid | 2 | - | alarm_motion, measure_battery, measure_luminance... |
| sensor_contact_plug_hybrid | 2 | TS0601, ts0601 | onoff, measure_power, meter_power... |
| sensor_contact_presence_hybrid | 1 | - | alarm_motion, measure_luminance, measure_temperature... |
| sensor_contact_rain_hybrid | 2 | ts0207, ts0601 | alarm_contact, measure_battery, alarm_tamper... |
| sensor_contact_water_hybrid | 0 | Q9MPFHW, TS0207, TS0601, q9mpfhw, ts0207, ts0601 | alarm_contact, measure_battery, alarm_tamper... |
| sensor_contact_zigbee_hybrid | 16 | TS0207, ts0207 | alarm_contact, alarm_tamper, measure_battery... |
| sensor_gas_presence_hybrid | 2 | - | alarm_motion, measure_luminance, measure_temperature... |
| sensor_lcdtemphumidsensor_soil_hybrid | 4 | TS0601, ts0601 | measure_humidity.soil, measure_temperature, measure_humidity... |
| sensor_lcdtemphumidsensor_temphumidsensor_hybrid | 2 | TS0201, TY0201, ts0201, ty0201 | measure_temperature, measure_humidity, measure_battery... |
| sensor_motion_presence_hybrid | 4 | TS0225, ts0225 | alarm_motion, measure_luminance, measure_temperature... |
| sensor_motion_radar_hybrid | 2 | - | alarm_motion, measure_luminance.distance, measure_temperature... |
| sensor_presence_radar_hybrid | 2 | ts0203, zg-204zl, zg-204zm, zg-204zv, TS0225, ts0225 | alarm_motion, measure_luminance, measure_temperature... |
| shutter_roller_controller | 2 | TS0601_SHUTTER, TS0601_shutter, ts0601_shutter | alarm_generic, windowcoverings_state, measure_battery... |
| siren | 50 | TS0216, TS0219, TS0601, ts0216, ts0219, ts0601 | alarm_motion, measure_battery, alarm_generic... |
| siren_sirentemphumidsensor_hybrid | 0 | TS0601, ts0601 | onoff, measure_temperature, measure_humidity... |
| sirentemphumidsensor | 0 | TS0601, ts0601 | onoff, measure_temperature, measure_humidity... |
| smart_breaker | 8 | TS0601, TS0601_BREAKER, TS0601_breaker, ts0601, ts0601_breaker | onoff, alarm_generic, measure_power... |
| smart_button_switch | 0 | TS0041, ts0041 | button.1, measure_battery, measure_radio_stability... |
| smart_heater | 4 | TS0601, TS0601_HEATER, TS0601_heater, ts0601, ts0601_heater | onoff, target_temperature, thermostat_mode... |
| smart_heater_controller | 10 | TS0601, TS0601_HEATCTRL, TS0601_heatctrl, ts0601, ts0601_heatctrl | onoff, target_temperature, measure_temperature... |
| smart_knob | 9 | ERS-10TZBVK-AA, TS004F, ers-10tzbvk-aa, ts004f | button, dim, measure_battery... |
| smart_knob_rotary | 6 | ERS-10TZBVK-AA, TS004F, ZG-101ZD, ers-10tzbvk-aa, ts004f, zg-101zd | button.rotate_left, button.rotate_right, button.press... |
| smart_knob_rotary_hybrid | 0 | TS004F, ts004f | button.rotate_left, button.rotate_right, button.press... |
| smart_knob_switch | 0 | TS004F, ts004f | dim, alarm_battery, measure_radio_stability... |
| smart_knob_switch_hybrid | 0 | TS004F, ts004f | button, dim, measure_battery... |
| smart_lcd_thermostat | 6 | TS0601, ts0601 | target_temperature, measure_temperature, measure_humidity... |
| smart_rcbo | 4 | TS0601, TS0601_RCBO, TS0601_rcbo, ts0601, ts0601_rcbo | onoff, alarm_generic, measure_power... |
| smart_remote_1_button | 0 | TS004F, ts004f | measure_battery, measure_radio_stability, measure_maintenance_score |
| smart_remote_1_button_2 | 2 | - | button.1, measure_battery, measure_radio_stability... |
| smart_remote_4_buttons | 1 | - | button.1, button.2, button.3... |
| smart_scene_panel | 4 | TS0601, ts0601 | onoff.gang1, onoff.gang2, onoff.gang3... |
| smoke_detector_advanced | 67 | GS361A-H04, HS1SA, HS3SA, JTYJ-GD-01LM/BW, LUMI.SENSOR_SMOKE, NAS-SD02B0, PG-S11Z, SA12IZL, SD8SC_00.00.03.12TC, SMSZB-120, SSSQS01LM, TS0205, TS0601, YG400A, gs361a-h04, hs1sa, hs3sa, jtyj-gd-01lm/bw, lumi.sensor_smoke, nas-sd02b0, pg-s11z, sa12izl, sd8sc_00.00.03.12tc, smszb-120, sssqs01lm, ts0205, ts0601, yg400a | alarm_smoke, measure_battery, measure_temperature... |
| soil_sensor | 49 | ARTECO, Arteco, CS-201Z, TS0601, ZG-303Z, arteco, cs-201z, ts0601, zg-303z | measure_humidity.soil, measure_temperature, measure_humidity... |
| switch_1gang | 523 | 01MINIZB, 01minizb, BASICZBR3, S26R2ZB, S31ZB, TS0001, TS0001_POWER, TS0001_SWITCH, TS0001_SWITCH_MODULE, TS0001_power, TS0001_switch, TS0001_switch_module, TS000F, TS0011, TS0101, TS011F, TS0601, TS0726, TS4100, ZBM5-1C-120, ZBM5-2C-120, ZBM5-3C-120, ZBMINI, ZBMINIL2, ZBMINIL2-R2, ZBMINIR, ZBMINIR2, ZBMINIR2-R2, ZG-301Z, ZG-302Z1, basiczbr3, s26r2zb, s31zb, ts0001, ts0001_power, ts0001_switch, ts0001_switch_module, ts000f, ts0011, ts0101, ts011f, ts0601, ts0726, ts4100, zbm5-1c-120, zbm5-2c-120, zbm5-3c-120, zbmini, zbminil2, zbminil2-r2, zbminir, zbminir2, zbminir2-r2, zg-301z, zg-302z1 | onoff, measure_battery, measure_power... |
| switch_2gang | 137 | TS0002, TS0002_POWER, TS0002_SWITCH_MODULE, TS0002_power, TS0002_switch_module, TS0003, TS0012, TS0013, ZG-302Z2, ZG-305Z, ts0002, ts0002_power, ts0002_switch_module, ts0003, ts0012, ts0013, zg-302z2, zg-305z | onoff, onoff.gang2, measure_power... |
| switch_3gang | 122 | TS0003, TS0003_POWER, TS0003_SWITCH_MODULE, TS0003_power, TS0003_switch_module, TS0013, TS0601, ZG-302Z3, ts0003, ts0003_power, ts0003_switch_module, ts0013, ts0601, zg-302z3 | onoff, onoff.gang2, onoff.gang3... |
| switch_4gang | 157 | JZ-ZB-004, TS0004, TS0004_POWER, TS0004_SWITCH_MODULE, TS0004_power, TS0004_switch_module, TS0014, TS0601, jz-zb-004, ts0004, ts0004_power, ts0004_switch_module, ts0014, ts0601 | onoff, onoff.gang2, onoff.gang3... |
| switch_dimmer_1gang | 4 | TS0601, ts0601 | onoff, dim, measure_radio_stability... |
| switch_hybrid | 4 | TS011F, TS0601, TS0726, ts011f, ts0601, ts0726 | onoff, onoff.gang2, measure_power... |
| switch_plug_1 | 2 | TS0601_SP1, TS0601_sp1, ts0601_sp1 | onoff, measure_power, meter_power... |
| switch_plug_2 | 2 | TS0122, ts0122 | onoff, onoff.outlet2, measure_power... |
| switch_temp_sensor | 2 | TS0601_TEMPSWITCH, TS0601_tempswitch, ts0601_tempswitch | onoff, measure_temperature, measure_humidity... |
| switch_wall_5gang | 2 | TS0015, TS0601, ts0015, ts0601 | onoff, onoff.gang2, onoff.gang3... |
| switch_wall_6gang | 16 | TS0016, TS0601, TS0726, ts0016, ts0601, ts0726 | onoff, onoff.gang2, onoff.gang3... |
| switch_wall_7gang | 4 | TS0007, ts0007 | onoff, onoff.gang2, onoff.gang3... |
| switch_wall_8gang | 10 | TS0601, TS0601_8GANG, TS0601_8gang, ts0601, ts0601_8gang | onoff, onoff.gang2, onoff.gang3... |
| switch_wall_hybrid | 1 | TS0001, TS0011, ts0001, ts0011 | onoff, measure_battery, measure_power... |
| switch_wireless | 4 | TS0601_WIRELESSSW, TS0601_wirelesssw, ts0601_wirelesssw | alarm_generic, measure_battery, measure_radio_stability... |
| temphumidsensor | 2 | CK-TLSR8656-SS5-01(7014), RH3052, SNTZ003, TS0201, TY0201, ZG-227Z, ck-tlsr8656-ss5-01(7014), rh3052, sntz003, ts0201, ty0201, zg-227z | measure_temperature, measure_humidity, measure_battery... |
| thermostat_4ch | 2 | TS0601, TS0601_THERMO4CH, TS0601_thermo4ch, ts0601, ts0601_thermo4ch | onoff, onoff.ch2, onoff.ch3... |
| thermostat_tuya_dp | 126 | TS0601, TS0601_THERMO, TS0601_thermo, ts0601, ts0601_thermo | target_temperature, measure_temperature, thermostat_mode... |
| universal_fallback | 34 | Q9MPFHW, TS0001, TS0002, TS0003, TS0004, TS0005, TS0006, TS0011, TS0012, TS0013, TS0014, TS0015, TS0041, TS0042, TS0043, TS0044, TS0045, TS0046, TS0047, TS0048, TS004F, TS0101, TS0111, TS011F, TS0121, TS0201, TS0204, TS0205, TS0206, TS0207, TS0208, TS0209, TS0210, TS0211, TS0212, TS0215, TS0215A, TS0216, TS0216A, TS0218, TS0222, TS0225, TS0301, TS0302, TS0303, TS0304, TS0401, TS0402, TS0501, TS0501A, TS0501B, TS0502, TS0502A, TS0502B, TS0503, TS0503A, TS0503B, TS0504, TS0504A, TS0504B, TS0505, TS0505A, TS0505B, TS0601, TS110E, TS110F, TS130F, q9mpfhw, ts0001, ts0002, ts0003, ts0004, ts0005, ts0006, ts0011, ts0012, ts0013, ts0014, ts0015, ts0041, ts0042, ts0043, ts0044, ts0045, ts0046, ts0047, ts0048, ts004f, ts0101, ts0111, ts011f, ts0121, ts0201, ts0204, ts0205, ts0206, ts0207, ts0208, ts0209, ts0210, ts0211, ts0212, ts0215, ts0215a, ts0216, ts0216a, ts0218, ts0222, ts0225, ts0301, ts0302, ts0303, ts0304, ts0401, ts0402, ts0501, ts0501a, ts0501b, ts0502, ts0502a, ts0502b, ts0503, ts0503a, ts0503b, ts0504, ts0504a, ts0504b, ts0505, ts0505a, ts0505b, ts0601, ts110e, ts110f, ts130f | measure_battery, measure_radio_stability, measure_maintenance_score |
| universal_zigbee | 40 | 005f0c3b, 5p1vj8r, 6dfgetq, CK-BL702-AL-01, CK-BL702-AL-01(7009_Z102LG03-1), CK-BL702-AL-01(7009_Z102LG04-1), CK-BL702-AL-01(7009_Z102LG04-2), D3-DPWK-TY, E220-KR4N0Z0-HA, ERS-10TZBVK-AA, FNB54-WTS08ML1.0, HY0017, HY0080, IH012-RT01, JZ-ZB-004, RH3040, RH3052, SM0001, SM0202, SM0212, SNTZ003, SNTZ009, TS0001, TS0002, TS0003, TS0004, TS0006, TS0011, TS0012, TS0013, TS0014, TS0026, TS0041, TS0041A, TS0042, TS0043, TS0044, TS0046, TS0049, TS0052, TS0105, TS0111, TS0115, TS011E, TS011F, TS0201, TS0202, TS0203, TS0204, TS0205, TS0207, TS0207_water_leak_detector, TS020C, TS0210, TS0216, TS0218, TS0224, TS0301, TS030F, TS0501, TS0502A, TS0502B, TS0503A, TS0503B, TS0504A, TS0504B, TS0505, TS0505A, TS0505B, TS0505B_1, TS0601, TS0601_cover_1, TS0601_smoke_4, TS0601_switch, TS0601_switch_1_gang, TS0601_switch_2_gang, TS0601_switch_3_gang, TS0901, TS130F, TT001ZAV20, TY0201, TYZS1L, U86KCJ-ZP, U86KWF-ZPSJ, ZG-101ZD, ZG-102Z, ZG-102ZL, ZG-103Z, ZG-204Z, ZG-204ZL, ZG-204ZM, ZG-222Z, ZG-225Z, ZG-227Z, ZG-227ZL, ZG-302Z1, ZG-302Z2, ZG-302Z3, aabybja, gq8b1uv, kjintbl, mcdj3aq, mcdj3aq\u0000, owvfni3, owvfni3\u0000, q9mpfhw, qnazj70, u1rkty3 | onoff, dim, measure_temperature... |
| usb_dongle_dual_repeater | 2 | TS0002, TS0207, TS0601_REPEATER, TS0601_repeater, ts0002, ts0207, ts0601_repeater | onoff, onoff.usb2, measure_power... |
| usb_dongle_triple | 2 | TS0003, ts0003 | onoff, onoff.usb2, onoff.usb3... |
| usb_outlet_advanced | 27 | TS0115, TS0601, ts0115, ts0601 | onoff, onoff.socket2, onoff.usb1... |
| valve_irrigation | 66 | TS0049, TS0601, TS0601_IRRIGATION, TS0601_irrigation, ts0049, ts0601, ts0601_irrigation | dim.valve_1, dim.valve_2, dim.valve_3... |
| valve_single | 4 | TS0001, TS0601, TS0601_VALVE, TS0601_valve, ts0001, ts0601, ts0601_valve | onoff, dim.valve, measure_battery... |
| vibration_sensor | 46 | TS0209, TS0210, TS0601, ZG-102ZM, ZG-103Z, ZG-103ZL, ts0209, ts0210, ts0601, zg-102zm, zg-103z, zg-103zl | alarm_vibration, measure_temperature, measure_battery... |
| wall_curtain_switch | 2 | - | windowcoverings_set, windowcoverings_state, measure_radio_stability... |
| wall_dimmer_1gang_1way | 4 | EDM-1ZBA-EU, TRI-C1ZR, TRI-K1ZR, TS004F, TS0501B, edm-1zba-eu, tri-c1zr, tri-k1zr, ts004f, ts0501b | onoff, dim, measure_radio_stability... |
| wall_remote_1_gang | 2 | - | button.1, measure_battery, measure_radio_stability... |
| wall_remote_2_gang | 2 | TS0042, ts0042 | button.1, button.2, measure_battery... |
| wall_remote_3_gang | 2 | TS0043, ts0043 | button.1, button.2, button.3... |
| wall_remote_4_gang | 2 | TS0044, ts0044 | button.1, button.2, button.3... |
| wall_remote_4_gang_2 | 0 | TS004F, ts004f | button.1, button.2, button.3... |
| wall_remote_4_gang_3 | 0 | TS0044, ts0044 | button.1, button.2, button.3... |
| wall_remote_6_gang | 0 | TS0046, ts0046 | button.1, button.2, button.3... |
| wall_switch_1gang_1way | 8 | TS0001, TS0011, ts0001, ts0011 | onoff, measure_radio_stability, measure_maintenance_score |
| wall_switch_2gang_1way | 8 | TS0002, TS0012, TS0042, ts0002, ts0012, ts0042 | onoff, measure_radio_stability, measure_maintenance_score |
| wall_switch_3gang_1way | 14 | TS0003, TS0013, TS0043, ts0003, ts0013, ts0043 | onoff, measure_radio_stability, measure_maintenance_score |
| wall_switch_4gang_1way | 4 | TS0726, ts0726 | onoff, measure_radio_stability, measure_maintenance_score |
| water_leak_sensor | 63 | 3315-S, 3315-SEU, 3315-Seu, 3315-s, 3315-seu, CK-TLSR8656-SS5-01(7019), HS1WL, LS21001, LUMI.SENSOR_WLEAK.AQ1, Q9MPFHW, SJCGQ11LM, SJCGQ12LM, SJCGQ13LM, SNZB-05, SNZB-05P, SQ510A, TS0207, TS0601, ZG-222Z, ZG-223Z, _TZ3000_EIT6L5, _TZ3000_K4EJ3WW2, _TZ3000_KYB656NO, _TZ3000_eit6l5, _TZ3000_k4ej3ww2, _TZ3000_kyb656no, _tz3000_eit6l5, _tz3000_k4ej3ww2, _tz3000_kyb656no, ck-tlsr8656-ss5-01(7019), hs1wl, ls21001, lumi.sensor_wleak.aq1, q9mpfhw, sjcgq11lm, sjcgq12lm, sjcgq13lm, snzb-05, snzb-05p, sq510a, ts0207, ts0601, zg-222z, zg-223z | alarm_water, measure_battery, alarm_tamper... |
| water_tank_monitor | 18 | TS0601, TS0601_TANK, TS0601_tank, ts0601, ts0601_tank | measure_water_level, measure_water_percentage, alarm_water_low... |
| water_valve_garden | 8 | TS0049, ts0049 | onoff, measure_battery, measure_radio_stability... |
| water_valve_smart | 12 | SWV-ZFE, SWV-ZFU, SWV-ZN, SWV-ZNE, SWV-ZNU, TS0601, TS0601_WATERVALVE, TS0601_watervalve, swv-zfe, swv-zfu, swv-zn, swv-zne, swv-znu, ts0601, ts0601_watervalve | onoff, meter_water, measure_temperature... |
| weather_station_outdoor | 4 | TS0601, TS0601_WEATHER, TS0601_weather, ts0601, ts0601_weather | measure_temperature, measure_humidity, measure_pressure... |
| zigbee_repeater | 10 | TS0207, ts0207 | measure_radio_stability, measure_maintenance_score |

---
**Total:** 268 drivers, 8470 manufacturer IDs

*Generated: 2026-04-13T07:47:32.660Z*
