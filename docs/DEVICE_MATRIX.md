# Device Support Matrix

| Driver | Manufacturers | Products | Capabilities |
|--------|---------------|----------|-------------|
| air_purifier | 214 | TS0601_air_purifier, TS0601 | onoff, dim, measure_pm25 |
| air_quality_co2 | 228 | TS0601_co2, TS0601 | measure_co2, measure_temperature, measure_humidity... |
| air_quality_comprehensive | 234 | TS0005, TS0006, TS0601 | measure_co2, measure_pm25, measure_pm10... |
| bulb_dimmable | 250 | TS0501A, TS0501B, TS110E, TS110F, LED1623G12, LED1649C5, LED1836G9, LWB004, LWB006, LWB010, LWB014, Plug 01, A19 W 10 year, BR30 W 10 year, PAR38 W 10 year, GL-B-001Z, RS 125, RB 165, RB 175 W, ZBT-DimmableLight | dim, light_hue, light_saturation... |
| bulb_rgb | 411 | TS0503A, TS0503B, LCT001, LCT002, LCT003, LCT007, LCT010, LCT011, LCT012, LCT014, LCT015, LCT016, GL-C-006, RB 185 C, RB 285 C, E11-G13, E11-G14, E11-G23, ZBT-ColorLight | dim, light_hue, light_saturation... |
| bulb_rgbw | 289 | generic, TS0504A, TS0504B, TS0505A, TS0505B, Classic A60 RGBW, Flex RGBW, GL-C-008, GL-B-008Z | onoff, dim, light_hue... |
| bulb_tunable_white | 260 | TS0502A, TS0502B, LED1545G12, LED1546G12, LTW001, LTW004, LTW010, LTW012, LTW013, LTW015, Classic A60 TW, GL-C-007, GL-B-007Z, RS 128 T, RB 178 T, E11-N13, E11-N14, E12-N13, E12-N14, ZBT-CCTLight | dim, light_hue, light_saturation... |
| bulb_white | 215 | TS0501 | dim, light_hue, light_saturation... |
| button_emergency_sos | 37 | TS0218, TS0601, TS0215, TS0215A | alarm_generic, measure_battery |
| button_wireless | 222 | TS0040 | measure_battery |
| button_wireless_1 | 293 | TS0041, ZG-101ZL, WXKG01LM, WXKG02LM, WXKG03LM, WXKG11LM, WXKG12LM, WXKG06LM, WXKG07LM, lumi.sensor_switch, lumi.sensor_switch.aq2, lumi.sensor_switch.aq3, lumi.remote.b1acn01, E1524/E1810, E1743, E1812, E1744, E2001/E2002, E2123, RWL020, RWL021, RWL022, ROM001, 3450-L, SNZB-01, SNZB-01P | button.1, measure_battery |
| button_wireless_2 | 219 | TS0042 | button.1, button.2, measure_battery |
| button_wireless_3 | 230 | TS0043 | button.1, button.2, button.3... |
| button_wireless_4 | 292 | TS0044, TS004F, SNZB-01M | button.1, button.2, button.3... |
| button_wireless_6 | 215 | TS0046, TS0601 | button.1, button.2, button.3... |
| button_wireless_8 | 214 | TS0048 | button.1, button.2, button.3... |
| ceiling_fan | 218 | TS0601_fan, TS0601 | dim, measure_battery, onoff... |
| climate_sensor | 2467 | TS0201, TS0222, TH01, WSDCGQ01LM, WSDCGQ11LM, WSDCGQ12LM, lumi.sensor_ht, lumi.sensor_ht.agl02, lumi.weather, SNZB-02, SNZB-02D, SNZB-02P, TS0601, ZG-227Z, CK-TLSR8656-SS5-01(7014), SNZB-02DR2, SNZB-02LD, SNZB-02WD | measure_temperature, measure_humidity, measure_battery |
| co_sensor | 221 | TS0601_co, TS0601 | alarm_co, measure_battery, measure_co |
| contact_sensor | 541 | TS0203, ZG-102Z, ZG-102ZL, DS01, RH3001, MCCGQ01LM, MCCGQ11LM, MCCGQ12LM, MCCGQ14LM, lumi.sensor_magnet, lumi.sensor_magnet.aq2, lumi.magnet.ac01, lumi.magnet.agl02, E1603/E1702, TRADFRI open/close remote, 3300-S, 3320-L, SNZB-04, TS0601, SNZB-04P | alarm_contact, measure_battery |
| curtain_motor | 551 | TS0302, ZC-LS02, TS130F, DS82, DS421, lumi.curtain, lumi.curtain.hagl04, lumi.curtain.acn002, E1757, KADRILJ, FYRTUR, AM02, AM43-0.45/40-ES-EZ, AM43-0.45/40-ES-EB, TS0601 | windowcoverings_state, windowcoverings_set, windowcoverings_tilt_set... |
| curtain_motor_tilt | 245 | TS0601_curtain_tilt, TS0601 | windowcoverings_state, windowcoverings_set, windowcoverings_tilt_set... |
| dimmer_3gang | 216 | TS0601_dimmer3, TS0601 | onoff, dim, onoff.channel2... |
| dimmer_dual_channel | 253 | TS1101, TS0601 | onoff, dim, onoff.channel2... |
| dimmer_wall_1gang | 538 | TS0601_dim1, TS0601 | dim, onoff, measure_power |
| din_rail_meter | 252 | SPM01-1Z2, SDM01-3Z1, SDM02-2Z1, SPM02-3Z3, TS0601 | measure_power, meter_power, measure_voltage... |
| din_rail_switch | 238 | TS0001_din, TS0601 | onoff, measure_power, meter_power... |
| diy_custom_zigbee | 180 | ptvo.switch, ptvo.router, ptvo.sensor, ptvo.light, ptvo.dimmer, DIY-01, DIY-02, DIY-03, DIY-04, DIY-08, DIY-SWITCH, DIY-SENSOR, DIY-LIGHT, DIY-ROUTER, DIYRUZ, DIYRuZ_Geiger, DIYRuZ_AirSense, DIYRuZ_Flower, DIYRuZ_Motion, DIYRuZ_Contact, ESP32-H2, ESP32-C6, ESP32H2_DEV, ESP32C6_DEV, CC2530_ROUTER, CC2530_SWITCH, CC2530_SENSOR, CC2531_ROUTER, CC2531_USB, CC2652_DEV, CC2652R_DEV, CC2652RB_DEV, CC2652P_DEV, CC1352_DEV, CC1352P_DEV, EFR32_DEV, EFR32MG_DEV, ROUTER, Router, SWITCH, Switch, SENSOR, Sensor, LIGHT, Light, DIMMER, Dimmer, BUTTON, Button, CUSTOM, Custom, TEST, Test, DEBUG, Debug, SAMPLE, Sample, DEMO, Demo, PROTOTYPE, Prototype, zzh, zzh!, Tube, SLZB-06, SLZB-07, Cod.m, ZigStar, ZigStar_Stick, ZigStar_LAN, ZigStar_PoE, SONOFF_ZBBridge, ZBBridge, ZbBridge, Tasmota, Z2T, ConBee, ConBee II, ConBee III, RaspBee, RaspBee II, Hue_Bridge, Phoscon_Gateway, Arduino_Zigbee, PlatformIO_Zigbee, Zigbee_Dev_Kit | onoff, measure_temperature, measure_humidity... |
| door_controller | 216 | TS0601_door, TS0601 | alarm_motion, alarm_contact, measure_battery... |
| doorbell | 230 | TS0211, TS0601 | alarm_motion, alarm_contact, measure_battery... |
| energy_meter_3phase | 226 | TS0601_3phase, TS0601 | measure_power, meter_power, measure_voltage... |
| fan_controller | 234 | TS0601_fanctrl, TS0601 | onoff, dim |
| fingerbot | 8 | TS0001, TS0001_fingerbot | onoff, measure_battery, button.push |
| fingerprint_lock | 221 | TS0601_lock, TS0601 | locked, alarm_tamper, measure_battery |
| formaldehyde_sensor | 214 | TS0601_hcho, TS0601 | measure_co2, measure_temperature, measure_humidity... |
| garage_door | 220 | TS0601_garage, TS0601 | garagedoor_closed, alarm_contact |
| gas_detector | 231 | TS0204, TS0601 | alarm_generic, alarm_co, alarm_co2... |
| gas_sensor | 265 | TS0601_gas, TS0601 | alarm_co, alarm_co2, measure_battery... |
| gateway_zigbee_bridge | 214 | TS0601_gw | alarm_generic, measure_battery, onoff |
| generic_diy | 56 | DIY, diy, ESP32, esp32, PTVO, ptvo, Router, router, ROUTER, Sensor, sensor, Switch, switch, Button, button, Relay, relay, CC2530, CC2531, CC2652, efekta, EFEKTA, zigstar, custom, CUSTOM, maker |  |
| generic_tuya | 278 | TS0601_generic | measure_battery, measure_temperature, measure_humidity |
| humidifier | 222 | TS0601_humid, TS0601 | onoff, dim, measure_humidity... |
| hvac_air_conditioner | 219 | TS0601_ac, TS0601 | target_temperature, measure_temperature, thermostat_mode... |
| hvac_dehumidifier | 229 | TS0601_dehum, TS0601 | target_humidity, measure_humidity, measure_temperature... |
| ir_blaster | 241 | TS1201, TS0601 | button.learn_ir, onoff |
| lcdtemphumidsensor | 219 | TS0601_lcd | measure_temperature, measure_humidity, measure_battery |
| led_controller_cct | 233 | TS0502 | onoff, dim, light_temperature... |
| led_controller_dimmable | 227 | TS0601_led, TS0501B, TRI-C1ZR, TRI-K1ZR | onoff, dim |
| led_controller_rgb | 225 | TS0503, TS0504 | onoff, dim, light_hue... |
| led_strip | 243 | TS0601_strip, TS0505B | dim, measure_battery, onoff... |
| led_strip_advanced | 223 | TS0601_strip_adv | dim, light_hue, light_saturation... |
| led_strip_rgbw | 239 | TS0601_strip_rgbw | light_hue, light_saturation, light_temperature... |
| lock_smart | 234 | TS0601_smartlock, TS0601 | locked, lock_mode, measure_battery... |
| module_mini_switch | 234 | ZBMINI, ZBMINI-L, ZBMINIL2, ZBMINIR2, 01MINIZB | measure_battery, alarm_generic, measure_power... |
| motion_sensor | 532 | TS0202, ZG-204Z, MS01, RH3040, IH012-RT01, TY0202, lumi.sensor_motion, lumi.sensor_motion.aq2, lumi.motion.ac02, lumi.motion.agl04, TRADFRI motion sensor, E1745, E1525/E1745, SML001, SML002, SML003, SML004, 3326-L, 3305-S, 3325-S, SNZB-03, TS0601, ZG-204ZM, SNZB-03P | alarm_motion, measure_battery, measure_luminance |
| motion_sensor_radar_mmwave | 301 | TS0601_mmwave, TS0601 | alarm_motion, measure_distance, measure_temperature... |
| pet_feeder | 217 | TS0601_feeder, TS0601 | button.feed, alarm_generic |
| plug_energy_monitor | 422 | TS0121, TS011F, A7Z, A11Z, SP-EUC01, SP-EUC02, SP 120, SP 220, SP 222, S60ZBTPF, S60ZBTPG, S60ZBTPE, S31ZB, S31 Lite zb, S26R2ZB, S40ZBTPB, LSPA9, HY0105, HY0104, JZ-ZB-005, ZBMINIL2, lumi.plug.maeu01, lumi.plug.macn01, lumi.plug.mmeu01, E1603/E1702/E1708, TRADFRI control outlet, TS0601, CK-BL702-SWP-01(7020) | measure_power, meter_power, measure_voltage... |
| plug_smart | 408 | TS0111, TS0101, TS0601, TS011F | onoff, measure_power, meter_power... |
| pool_pump | 217 | TS0601_pool, TS0601 | onoff, measure_power, meter_power |
| power_clamp_meter | 233 | TS0601_clamp, TS0601 | measure_power, meter_power, measure_current... |
| power_meter | 220 | TS0601_meter, TS0601 | measure_power, meter_power, measure_voltage... |
| presence_sensor_ceiling | 232 | TS0601_ceiling, TS0601 | alarm_motion, onoff, measure_luminance... |
| presence_sensor_radar | 374 | TS0225, ZG-204ZL, ZG-204ZV, ZG-204ZH, ZG-204ZK, ZG-204ZM, ZG-205Z, CK-BL702-MWS-01(7016), CK-BL702-MWS-01, SZLMR10, TS0601, ZG-227Z | alarm_motion, measure_luminance, measure_battery... |
| radiator_controller | 214 | TS0601_rad, TS0601 | onoff, target_temperature, measure_temperature... |
| radiator_valve | 505 | TV01-ZB, TV02-ZB, TRV601, TRV602, SEA801-Zigbee, eTRV0100, SPZB0001, SPZB0003, lumi.airrtc.agl001, lumi.airrtc.vrfegl01, 014G2461, 014G2463, STZB402, STZB403, Zen-01, TS0601 | target_temperature, measure_temperature, thermostat_mode... |
| rain_sensor | 234 | TS0207_rain, TS0601, TS0207 | alarm_water, measure_humidity, measure_battery |
| scene_switch_1 | 215 | TS0601_scene1 | button.1, measure_battery |
| scene_switch_2 | 214 | TS0601_scene2 | button.1, button.2, measure_battery |
| scene_switch_3 | 214 | TS0601_scene3 | button.1, button.2, button.3... |
| scene_switch_4 | 226 | TS0601, ZG-101ZS, ERS-10TZBVK-AA | button.1, button.2, button.3... |
| scene_switch_6 | 214 | TS0601_scene6 | button.1, button.2, button.3... |
| shutter_roller_controller | 215 | TS0601_shutter, TS0601 | alarm_generic, windowcoverings_state, measure_battery... |
| siren | 250 | TS0216, TS0219, TS0601 | alarm_motion, measure_battery, alarm_generic... |
| smart_breaker | 231 | TS0601_breaker, TS0601 | onoff, alarm_generic, measure_power... |
| smart_heater | 215 | TS0601_heater, TS0601 | onoff, target_temperature, thermostat_mode... |
| smart_heater_controller | 224 | TS0601_heatctrl, TS0601 | onoff, target_temperature, measure_temperature... |
| smart_knob_rotary | 21 | TS004F, ERS-10TZBVK-AA | button.rotate_left, button.rotate_right, button.press... |
| smart_rcbo | 216 | TS0601_rcbo, TS0601 | onoff, alarm_generic, measure_power... |
| smoke_detector_advanced | 299 | TS0205, PG-S11Z, YG400A, SA12IZL, SD8SC_00.00.03.12TC, GS361A-H04, HS1SA, HS3SA, SMSZB-120, lumi.sensor_smoke, JTYJ-GD-01LM/BW, SSSQS01LM, NAS-SD02B0, TS0601 | alarm_smoke, measure_battery, measure_temperature... |
| soil_sensor | 283 | ZG-303Z, CS-201Z, TS0601 | measure_soil_moisture, measure_temperature, measure_humidity... |
| switch_1gang | 728 | TS0001, TS0011, TS0001_power, TS0001_switch, TS0001_switch_module, TS0601 | onoff, measure_battery, measure_power... |
| switch_2gang | 480 | TS0002, TS0003, TS0012, TS0002_power, TS0002_switch_module, TS0601 | onoff, onoff.gang2, measure_power... |
| switch_3gang | 412 | TS0003, TS0013, TS0003_power, TS0003_switch_module, TS0601 | onoff, onoff.gang2, onoff.gang3... |
| switch_4gang | 407 | TS0004, TS0014, TS0004_power, TS0004_switch_module, TS0601, TS0726 | onoff, onoff.gang2, onoff.gang3... |
| switch_dimmer_1gang | 24 | TS0601 | onoff, dim |
| switch_plug_1 | 213 | TS0601_sp1 | onoff, measure_power, meter_power... |
| switch_plug_2 | 214 | TS0122 | onoff, onoff.outlet2, measure_power... |
| switch_temp_sensor | 214 | TS0601_tempswitch | onoff, measure_temperature, measure_humidity |
| switch_wall_5gang | 214 | TS0015, TS0601 | onoff, onoff.gang2, onoff.gang3... |
| switch_wall_6gang | 224 | TS0016, TS0601, TS0726 | onoff, onoff.gang2, onoff.gang3... |
| switch_wall_7gang | 215 | TS0007 | onoff, onoff.gang2, onoff.gang3... |
| switch_wall_8gang | 222 | TS0601_8gang, TS0601 | onoff, onoff.gang2, onoff.gang3... |
| switch_wireless | 214 | TS0601_wirelesssw | alarm_generic, measure_battery |
| temphumidsensor | 226 | TY0201, SNTZ003, CK-TLSR8656-SS5-01(7014) | measure_temperature, measure_humidity, measure_battery |
| thermostat_4ch | 214 | TS0601_thermo4ch, TS0601 | onoff, onoff.ch2, onoff.ch3... |
| thermostat_tuya_dp | 434 | TS0601_thermo, TS0601 | target_temperature, measure_temperature, thermostat_mode... |
| universal_fallback | 70 | TS0601, TS0001, TS0002, TS0003, TS0004, TS0005, TS0006, TS0011, TS0012, TS0013, TS0014, TS0015, TS0041, TS0042, TS0043, TS0044, TS0045, TS0046, TS0047, TS0048, TS0121, TS0201, TS0202, TS0203, TS0204, TS0205, TS0206, TS0207, TS0208, TS0209, TS0210, TS0211, TS0212, TS0215, TS0215A, TS0216, TS0216A, TS0218, TS0501, TS0501A, TS0501B, TS0502, TS0502A, TS0502B, TS0503, TS0503A, TS0503B, TS0504, TS0504A, TS0504B, TS0505, TS0505A, TS0505B, TS011F, TS004F, TS110E, TS110F, TS130F, TS0101, TS0111, TS0222, TS0225, TS0301, TS0302, TS0303, TS0304, TS0401, TS0402, TS0601 |  |
| usb_dongle_dual_repeater | 214 | TS0601_repeater | onoff, onoff.usb2, measure_power... |
| usb_outlet_advanced | 243 | TS0115, TS0601 | onoff, onoff.socket2, onoff.usb1... |
| valve_irrigation | 239 | TS0601_irrigation, TS0601, TS0049 | valve_position.1, valve_position.2, valve_position.3... |
| valve_single | 244 | TS0601_valve, TS0601, TS0001 | onoff, valve_position, measure_battery |
| vibration_sensor | 255 | TS0209, TS0210, ZG-102ZM, TS0601, ZG-103ZL | alarm_vibration, measure_battery, alarm_tamper |
| wall_dimmer_1gang_1way | 9 | TS004F, TS0501B, TRI-C1ZR, TRI-K1ZR, EDM-1ZBA-EU | onoff, dim |
| wall_switch_1gang_1way | 6 | TS0001 | onoff |
| water_leak_sensor | 365 | TS0207, q9mpfhw, ZG-222Z, ZG-223Z, LS21001, _TZ3000_eit6l5, _TZ3000_k4ej3ww2, _TZ3000_kyb656no, lumi.sensor_wleak.aq1, SJCGQ11LM, SJCGQ12LM, SJCGQ13LM, HS1WL, SNZB-05, 3315-S, 3315-Seu, TS0601 | alarm_water, measure_battery |
| water_tank_monitor | 232 | TS0601_tank, TS0601 | measure_water_level, measure_water_percentage, alarm_water_low... |
| water_valve_smart | 236 | TS0601_watervalve, TS0601 | alarm_motion, measure_temperature, alarm_water... |
| weather_station_outdoor | 214 | TS0601_weather, TS0601 | measure_temperature, measure_humidity, measure_pressure... |

---
**Total:** 109 drivers, 29472 manufacturer IDs

*Generated: 2026-02-01T03:59:38.795Z*
