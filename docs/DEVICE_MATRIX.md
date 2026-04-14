# Device Support Matrix

| Driver | Manufacturers | Products | Capabilities |
|--------|---------------|----------|-------------|
| air_purifier | 22 | rh3052, ts0201, ts0222, ts0601, ts0601_air_purifier, ty0201 | dim, measure_pm25, onoff |
| air_purifier_climate_hybrid | 1 | ts0601, rh3052, ts0201, ts0222, ty0201 | onoff, dim, measure_pm25... |
| air_purifier_contact_hybrid | 0 | ts0601 | alarm_contact, alarm_tamper, measure_battery... |
| air_purifier_curtain_hybrid | 5 | ts0601 | windowcoverings_state, windowcoverings_set, windowcoverings_tilt_set... |
| air_purifier_dimmer_hybrid | 3 | ts0601 | dim, onoff, measure_power... |
| air_purifier_din_hybrid | 1 | - | onoff, measure_power, meter_power... |
| air_purifier_lcdtemphumidsensor_hybrid | 0 | ts0201, ts0601 | onoff, dim, measure_pm25... |
| air_purifier_motion_hybrid | 0 | ts0601 | onoff, dim, measure_pm25... |
| air_purifier_presence_hybrid | 0 | ts0601 | alarm_motion, measure_luminance, measure_temperature... |
| air_purifier_quality_hybrid | 3 | - | measure_co2, measure_temperature, measure_humidity... |
| air_purifier_sensor_hybrid | 0 | - | alarm_motion, measure_luminance.distance, measure_temperature... |
| air_purifier_siren_hybrid | 0 | ts0601 | onoff, measure_temperature, measure_humidity... |
| air_purifier_soil_hybrid | 0 | ts0601 | measure_humidity.soil, measure_temperature, measure_humidity... |
| air_purifier_switch_hybrid | 0 | ts0601 | onoff, measure_battery, measure_power... |
| air_quality_co2 | 4 | ts0601, ts0601_co2 | measure_co2, measure_temperature, measure_humidity... |
| air_quality_comprehensive | 15 | ts0005, ts0006, ts0601 | measure_co2, measure_pm25, measure_pm10... |
| air_quality_comprehensive_hybrid | 0 | ts0601 | measure_co2, measure_pm25, measure_pm10... |
| blaster_remote_hybrid | 1 | ts1201 | button.learn_ir, ir_learned_code, ir_send_code... |
| bulb_dimmable | 15 | a19 w 10 year, br30 w 10 year, gl-b-001z, led1623g12, led1649c5, led1836g9, lwb004, lwb006, lwb010, lwb014, par38 w 10 year, plug 01, rb 165, rb 175 w, rs 125, ts0052, ts0501a, ts0501b, ts1101, ts110e, ts110f, zbt-dimmablelight, ts0501, ts0502b | dim, light_hue, light_mode... |
| bulb_dimmable_dimmer_hybrid | 6 | ts0052, ts1101, ts110e, ts110f | dim, light_hue, light_saturation... |
| bulb_rgb | 42 | e11-g13, e11-g14, e11-g23, gl-c-006, lct001, lct002, lct003, lct007, lct010, lct011, lct012, lct014, lct015, lct016, rb 185 c, rb 285 c, ts0503a, ts0503b, ts0504b, ts0505a, ts0505b, zb-cl01, zbt-colorlight, ts0505 | dim, light_hue, light_saturation... |
| bulb_rgb_led_hybrid | 0 | ts0505b | dim, light_hue, light_saturation... |
| bulb_rgb_rgbw_hybrid | 1 | - | dim, light_hue, light_saturation... |
| bulb_rgbw | 44 | ck-bl702-al-01(7009_z102lg03-1), classic a60 rgbw, fe-gu10-5w, flex rgbw, generic, gl-b-008z, gl-c-008, smd9300, ts0504a, ts0504b, ts0505a, ts0505b, ts1002 | onoff, dim, light_hue... |
| bulb_rgbw_universal_hybrid | 1 | ck-bl702-al-01(7009_z102lg03-1), ts0504a, ts0504b, ts0505a, ts0505b | onoff, dim, measure_temperature... |
| bulb_tunable_white | 20 | classic a60 tw, e11-n13, e11-n14, e12-n13, e12-n14, gl-b-007z, gl-c-007, led1545g12, led1546g12, ltw001, ltw004, ltw010, ltw012, ltw013, ltw015, rb 178 t, rs 128 t, ts0502a, ts0502b, zbt-cctlight, ts0502 | dim, light_hue, light_saturation... |
| bulb_tunable_white_hybrid | 0 | ts0502b | dim, light_hue, light_saturation... |
| bulb_white | 2 | ts0501 | dim, light_hue, light_saturation... |
| button_emergency_sos | 39 | ts0215, ts0215a, ts0218, ts0601, zbpb10bk | alarm_generic, measure_battery, measure_radio_stability... |
| button_wireless | 4 | ck-tlsr8656-ss5-01(7000), snzb-01, snzb-01m, snzb-01p, ts0040, wb-01, wb01 | measure_battery, measure_radio_stability, measure_maintenance_score |
| button_wireless_1 | 38 | 3450-l, e1524/e1810, e1743, e1744, e1812, e2001/e2002, e2123, lumi.remote.b1acn01, lumi.sensor_switch, lumi.sensor_switch.aq2, lumi.sensor_switch.aq3, rom001, rwl020, rwl021, rwl022, wxkg01lm, wxkg02lm, wxkg03lm, wxkg06lm, wxkg07lm, wxkg11lm, wxkg12lm, zg-101zl | button.1, measure_battery, measure_radio_stability... |
| button_wireless_2 | 98 | ts0001, ts0001_fingerbot, ts0002, ts0003, ts000f, ts0011, ts0012, ts0013, ts0042, ts0043, ts0111, ts011f, ts0121, tso121 | button.1, button.2, measure_battery... |
| button_wireless_3 | 9 | ts0043 | button.1, button.2, button.3... |
| button_wireless_4 | 49 | snzb-01m, ts0014, ts0044, ts004f | button.1, button.2, button.3... |
| button_wireless_6 | 3 | ts0046, ts0601 | button.1, button.2, button.3... |
| button_wireless_8 | 1 | ts0048 | button.1, button.2, button.3... |
| button_wireless_fingerbot_hybrid | 1 | ts0001, ts0001_fingerbot | onoff, measure_battery, measure_power... |
| button_wireless_plug_hybrid | 0 | ts011f, ts0121, tso121, ts0111 | measure_power, meter_power, measure_voltage... |
| button_wireless_scene_hybrid | 1 | - | button.1, button.2, measure_battery... |
| button_wireless_smart_hybrid | 2 | ts0041, ts004f | button.1, measure_battery, measure_radio_stability... |
| button_wireless_switch_hybrid | 1 | ts0002, ts0003, ts0012, ts0013, ts011f, ts0001, ts000f, ts0011, ts0014 | onoff, onoff.gang2, measure_power... |
| button_wireless_usb_hybrid | 1 | - | onoff, onoff.usb2, measure_power... |
| button_wireless_valve_hybrid | 1 | - | button.1, button.2, measure_battery... |
| button_wireless_wall_hybrid | 0 | ts0003, ts0013, ts0043, ts0001, ts0011, ts0002, ts0012, ts0042 | button.1, button.2, measure_battery... |
| ceiling_fan | 2 | ts0601, ts0601_fan | dim, onoff, dim.speed... |
| climate_sensor | 658 | ck-tlsr8656-ss5-01(7014), lumi.sensor_ht, lumi.sensor_ht.agl02, lumi.weather, rh3052, sm0201, snzb-02, snzb-02d, snzb-02dr2, snzb-02ld, snzb-02p, snzb-02wd, th01, ths317-et, ts0201, ts0222, ts0601, ty0201, wsdcgq01lm, wsdcgq11lm, wsdcgq12lm, zg-227z, zg-227zl, zg-303z | measure_battery, measure_humidity, measure_temperature... |
| climate_sensor_dimmer_hybrid | 1 | - | dim, onoff, measure_power... |
| climate_sensor_gas_hybrid | 0 | ts0601 | alarm_generic, alarm_co, alarm_co2... |
| climate_sensor_plug_hybrid | 0 | ts0601 | onoff, measure_power, meter_power... |
| climate_sensor_presence_hybrid | 0 | ts0601 | alarm_motion, measure_luminance, measure_temperature... |
| climate_sensor_smart_hybrid | 1 | - | onoff.gang1, onoff.gang2, onoff.gang3... |
| climate_sensor_switch_hybrid | 0 | ts0601 | onoff, measure_battery, measure_power... |
| co_sensor | 4 | ts0601, ts0601_co | alarm_co, measure_battery, measure_co... |
| contact_sensor | 119 | 3300-s, 3320-l, ck-tlsr8656-ss5-01(7003), doorwindow-sensor-zb3.0, ds01, e1603/e1702, lumi.magnet.ac01, lumi.magnet.agl02, lumi.sensor_magnet, lumi.sensor_magnet.aq2, mccgq01lm, mccgq11lm, mccgq12lm, mccgq14lm, mct-340 e, q9mpfhw, rh3001, snzb-04, snzb-04p, snzb-04pr2, snzb-04r2, tradfri open/close remote, ts0021, ts0203, ts0207, ts0601, ty0203, zg-102z, zg-102zl | alarm_contact, alarm_tamper, measure_battery... |
| contact_sensor_curtain_hybrid | 1 | - | windowcoverings_state, windowcoverings_set, windowcoverings_tilt_set... |
| contact_sensor_dimmer_hybrid | 1 | - | alarm_contact, measure_battery, alarm_tamper... |
| contact_sensor_plug_hybrid | 0 | ts0601 | onoff, measure_power, meter_power... |
| contact_sensor_switch_hybrid | 0 | ts0601 | onoff, measure_battery, measure_power... |
| contact_sensor_zigbee_hybrid | 0 | ts0207 | alarm_contact, measure_battery, alarm_tamper... |
| curtain_motor | 121 | am02, am43-0.45/40-es-eb, am43-0.45/40-es-ez, ds421, ds82, e1757, fyrtur, kadrilj, lumi.curtain, lumi.curtain.acn002, lumi.curtain.hagl04, ts0105, ts0301, ts0302, ts030f, ts0601, ts130f, zbcurtain, zc-ls02 | windowcoverings_state, windowcoverings_set, windowcoverings_tilt_set... |
| curtain_motor_shutter_hybrid | 1 | ts0601 | windowcoverings_state, windowcoverings_set, windowcoverings_tilt_set... |
| curtain_motor_tilt | 8 | ts0601, ts0601_curtain_tilt | windowcoverings_state, windowcoverings_set, windowcoverings_tilt_set... |
| curtain_motor_tilt_hybrid | 6 | ts0601 | windowcoverings_state, windowcoverings_set, windowcoverings_tilt_set... |
| curtain_motor_wall_hybrid | 1 | - | windowcoverings_state, windowcoverings_set, windowcoverings_tilt_set... |
| device_air_purifier_climate_hybrid | 15 | ts0601, rh3052, ts0201, ts0222, ty0201 | onoff, dim, measure_pm25... |
| device_air_purifier_din_hybrid | 2 | - | measure_power, meter_power, measure_voltage... |
| device_air_purifier_floor_hybrid | 0 | ts0601 | target_temperature, measure_temperature, measure_temperature.floor... |
| device_air_purifier_humidifier_hybrid | 1 | - | onoff, dim, measure_humidity... |
| device_air_purifier_hybrid | 0 | ts0601 | target_temperature, measure_temperature, thermostat_mode... |
| device_air_purifier_led_hybrid | 0 | ts0601 | dim, measure_battery, onoff... |
| device_air_purifier_motion_hybrid | 0 | ts0601 | onoff, dim, measure_pm25... |
| device_air_purifier_plug_hybrid | 0 | ts0601 | measure_power, meter_power, measure_voltage... |
| device_air_purifier_presence_hybrid | 0 | ts0601 | alarm_motion, measure_luminance, measure_temperature... |
| device_air_purifier_quality_hybrid | 1 | ts0601 | measure_co2, measure_pm25, measure_pm10... |
| device_air_purifier_radiator_hybrid | 1 | ts0601 | target_temperature, measure_temperature, thermostat_mode... |
| device_air_purifier_siren_hybrid | 3 | - | alarm_motion, measure_battery, alarm_generic... |
| device_air_purifier_smart_hybrid | 1 | - | target_temperature, measure_temperature, measure_humidity... |
| device_air_purifier_smoke_hybrid | 0 | ts0601 | alarm_smoke, measure_battery, measure_temperature... |
| device_air_purifier_soil_hybrid | 0 | ts0601 | measure_humidity.soil, measure_temperature, measure_humidity... |
| device_air_purifier_thermostat_hybrid | 0 | ts0601 | target_temperature, measure_temperature, thermostat_mode... |
| device_air_purifier_water_hybrid | 1 | - | measure_water_level, measure_water_percentage, alarm_water_low... |
| device_din_rail_meter_hybrid | 2 | ts0601 | dim.humidity, measure_humidity, measure_temperature... |
| device_floor_heating_hybrid | 1 | ts0601 | target_temperature, measure_temperature, measure_temperature.floor... |
| device_floor_heating_thermostat_hybrid | 0 | ts0601 | target_temperature, measure_temperature, measure_temperature.floor... |
| device_generic_diy_universal_hybrid | 3 | ts0026, ts0041a, ts0052, ts0105, ts0224, ts0901 | onoff, dim, measure_temperature... |
| device_generic_tuya_hybrid | 9 | ts0601 | onoff, dim, measure_temperature... |
| device_generic_tuya_universal_hybrid | 23 | ts0601, ts0203 | measure_battery, measure_temperature, measure_humidity... |
| device_plug_energy_hybrid | 1 | s26r2zb, s31 lite zb, s40lite, s60zbtpf, s60zbtpg | onoff, measure_power, meter_power... |
| device_plug_energy_monitor_hybrid | 1 | - | onoff, measure_power, meter_power... |
| device_plug_smart_hybrid | 4 | ts0049, ts0101 | onoff, measure_power, meter_power... |
| device_plug_smart_water_hybrid | 0 | ts0049 | onoff, measure_power, meter_power... |
| device_radiator_valve_hybrid | 3 | ts0601 | target_temperature, measure_temperature, thermostat_mode... |
| device_radiator_valve_smart_hybrid | 0 | ts0601 | target_temperature, measure_temperature, thermostat_mode... |
| device_radiator_valve_thermostat_hybrid | 0 | ts0601 | target_temperature, measure_temperature, thermostat_mode... |
| dimmer_3gang | 2 | ts0601, ts0601_dimmer3 | onoff, dim, onoff.channel2... |
| dimmer_air_purifier_hybrid | 0 | ts0601 | dim, onoff, measure_power... |
| dimmer_bulb_dimmable_hybrid | 0 | ts0052, ts1101, ts110e, ts110f | dim, light_hue, light_saturation... |
| dimmer_dual_channel | 1 | ts0601, ts1101, ts110f, ts110e | onoff, dim, onoff.channel2... |
| dimmer_dual_channel_hybrid | 2 | ts0601, ts1101 | onoff, dim, onoff.channel2... |
| dimmer_ts110e | 0 | ts110e | onoff, dim, measure_radio_stability... |
| dimmer_wall_1gang | 98 | ts0052, ts0601, ts0601_dim1, ts1101, ts110e, ts110f, zbmini-dim, zbminid | dim, onoff, measure_power... |
| dimmer_wall_plug_hybrid | 4 | ts0601 | measure_power, meter_power, measure_voltage... |
| dimmer_wall_switch_hybrid | 3 | ts0601 | onoff, onoff.gang2, measure_power... |
| dimmer_wall_water_hybrid | 2 | ts0601 | dim, onoff, measure_power... |
| din_rail_meter | 25 | sdm01-3z1, sdm02-2z1, spm01-1z2, spm02-3z3, ts0601 | measure_power, meter_power, measure_voltage... |
| din_rail_switch | 13 | ts0001_din, ts0601 | onoff, measure_power, meter_power... |
| diy_custom_zigbee | 103 | arduino_zigbee, button, cc1352p_dev, cc1352_dev, cc2530_router, cc2530_sensor, cc2530_switch, cc2531_router, cc2531_usb, cc2652p_dev, cc2652rb_dev, cc2652r_dev, cc2652_dev, cod.m, conbee, conbee ii, conbee iii, custom, debug, demo, dimmer, diy-01, diy-02, diy-03, diy-04, diy-08, diy-light, diy-router, diy-sensor, diy-switch, diyruz, diyruz_airsense, diyruz_contact, diyruz_flower, diyruz_geiger, diyruz_motion, efr32mg_dev, efr32_dev, esp32-c6, esp32-h2, esp32c6_dev, esp32h2_dev, hue_bridge, light, phoscon_gateway, platformio_zigbee, prototype, ptvo.dimmer, ptvo.light, ptvo.router, ptvo.sensor, ptvo.switch, raspbee, raspbee ii, router, sample, sensor, slzb-06, slzb-07, sonoff_zbbridge, switch, tasmota, test, tube, z2t, zbbridge, zigbee_dev_kit, zigstar, zigstar_lan, zigstar_poe, zigstar_stick, zzh, zzh! | onoff, measure_temperature, measure_humidity... |
| door_controller | 2 | ts0601, ts0601_door | alarm_motion, alarm_contact, measure_battery... |
| door_controller_garage_hybrid | 1 | ts0601 | alarm_motion, alarm_contact, measure_battery... |
| doorbell | 8 | ts0211, ts0601 | alarm_motion, alarm_contact, measure_battery... |
| energy_meter_3phase | 13 | ts0601, ts0601_3phase | measure_power, meter_power, measure_voltage... |
| fan_controller | 16 | ts0601, ts0601_fanctrl | onoff, dim, measure_radio_stability... |
| fingerbot | 2 | ts0001, ts0001_fingerbot, ts0001_finger | onoff, button.push, finger_bot_mode... |
| fingerbot_switch_hybrid | 0 | ts0001 | onoff, measure_battery, measure_power... |
| fingerprint_lock | 8 | ts0601, ts0601_lock | locked, alarm_tamper, measure_battery... |
| floor_heating_thermostat | 2 | ts0601 | target_temperature, measure_temperature, measure_temperature.floor... |
| formaldehyde_sensor | 1 | ts0601, ts0601_hcho | measure_co2, measure_temperature, measure_humidity... |
| garage_door | 7 | ts0601, ts0601_garage | garagedoor_closed, alarm_contact, measure_radio_stability... |
| garage_door_opener | 5 | ts0601, ts0603 | garagedoor_closed, alarm_contact, measure_radio_stability... |
| gas_detector | 11 | ts0204, ts0601 | alarm_generic, alarm_co, alarm_co2... |
| gas_sensor | 27 | ts0225, ts0301, ts0601, ts0601_gas, zg-225z | alarm_co, alarm_co2, alarm_contact... |
| gas_sensor_switch_hybrid | 0 | ts0601 | onoff, onoff.gang2, onoff.gang3... |
| gateway_zigbee_bridge | 1 | ts0601_gw | alarm_generic, measure_battery, onoff... |
| generic_diy | 21 | 0x8040, basiczbr3, battery switch, 1 button, battery switch, 2 buttons, bsp-ez2, bsp-fz2, button, cc2530, cc2531, cc2652, custom, diy, efekta, esp32, et093wrg, et093wro, etrv0100, etrv0101, etrv0103, maker, ptvo, relay, router, s26r2zb, s31zb, s40zbtpb, sensor, snzb-01, snzb-01p, snzb-02, snzb-02p, snzb-03, snzb-03p, snzb-04, snzb-04p, snzb-06p, switch, trv001, trv003, ts0026, ts0041a, ts0052, ts0105, ts0224, ts0901, zbmini, zbminil2, zigstar | measure_battery, measure_radio_stability, measure_maintenance_score |
| generic_tuya | 167 | ts0203, ts0601, ts0601_generic | measure_battery, measure_temperature, measure_humidity... |
| handheld_remote_4_buttons | 0 | ts0044 | button, alarm_battery, measure_radio_stability... |
| humidifier | 6 | ts0601, ts0601_humid | onoff, dim, measure_humidity... |
| hvac_air_conditioner | 1 | ts0601, ts0601_ac | target_temperature, measure_temperature, thermostat_mode... |
| hvac_controller | 4 | ts0601 | onoff, target_temperature, measure_temperature... |
| hvac_dehumidifier | 7 | ts0601, ts0601_dehum | dim.humidity, measure_humidity, measure_temperature... |
| illuminance_sensor | 5 | ts0222, zg-106z | measure_luminance, measure_battery, measure_radio_stability... |
| ir_blaster | 29 | ts0601, ts1201 | button.learn_ir, onoff, measure_battery... |
| ir_remote | 6 | ts1201 | button.learn_ir, ir_learned_code, ir_send_code... |
| lcdtemphumidsensor | 7 | ts0201, ts0601, ts0601_lcd, ty0201 | measure_temperature, measure_humidity, measure_battery... |
| lcdtemphumidsensor_plug_energy_hybrid | 1 | ts0601 | measure_power, meter_power, measure_voltage... |
| led_controller_cct | 7 | ts0502 | onoff, dim, light_temperature... |
| led_controller_dimmable | 2 | tri-c1zr, tri-k1zr, ts0501b, ts0601_led, ts0502b | onoff, dim, measure_radio_stability... |
| led_controller_rgb | 1 | ts0503, ts0504 | onoff, dim, light_hue... |
| led_strip | 3 | ts0505b, ts0601_strip, ts0601 | dim, measure_battery, onoff... |
| led_strip_advanced | 2 | ts0601_strip_adv | dim, light_hue, light_saturation... |
| led_strip_rgbw | 11 | ts0601_strip_rgbw | light_hue, light_saturation, light_temperature... |
| light_bulb_dimmable_tunable_hybrid | 25 | ts0502b | dim, light_hue, light_mode... |
| light_bulb_rgb_hybrid | 0 | ts0505a, ts0505b, ts0504b | dim, light_hue, light_saturation... |
| light_bulb_rgb_led_hybrid | 2 | ts0505b | dim, light_hue, light_saturation... |
| light_bulb_rgb_rgbw_hybrid | 63 | ts0505a, ts0505b, ts0504b | dim, light_hue, light_saturation... |
| light_bulb_tunable_white_hybrid | 0 | ts0502b | dim, light_hue, light_saturation... |
| light_sensor_outdoor | 1 | ts0222, ts0601 | measure_luminance, measure_battery, measure_radio_stability... |
| lock_smart | 12 | ts0601, ts0601_smartlock | locked, lock_mode, measure_battery... |
| module_mini_switch | 5 | 01minizb, zbm5-1c-120, zbmini, zbmini-l, zbminil2, zbminil2-r2, zbminir, zbminir2, zbminir2-r2 | measure_battery, alarm_generic, measure_power... |
| module_mini_switch_hybrid | 1 | zbminil2 | measure_battery, alarm_generic, measure_power... |
| motion_sensor | 90 | 3305-s, 3325-s, 3326-l, ck-tlsr8656-ss5-01(7002), e1525/e1745, e1745, ih012-rt01, lumi.motion.ac02, lumi.motion.agl04, lumi.sensor_motion, lumi.sensor_motion.aq2, ms01, mso1, rh3040, sml001, sml002, sml003, sml004, snzb-03, snzb-03p, snzb-03r2, tradfri motion sensor, ts0202, ts0225, ts0601, ty0202, zg-204z | alarm_motion, measure_battery, measure_luminance... |
| motion_sensor_2 | 0 | ts0601 | measure_battery, measure_luminance, alarm_motion... |
| motion_sensor_radar_mmwave | 14 | ts0601_mmwave | alarm_motion, measure_luminance.distance, measure_temperature... |
| motion_sensor_switch_hybrid | 1 | - | onoff, measure_battery, measure_power... |
| pet_feeder | 6 | ts0601, ts0601_feeder | button.feed, alarm_generic, measure_radio_stability... |
| pet_feeder_zigbee | 4 | ts0601 | button, measure_weight, alarm_generic... |
| plug_energy_monitor | 92 | a11z, a7z, ck-bl702-swp-01(7020), e1603/e1702/e1708, hy0104, hy0105, jz-zb-005, lspa9, lumi.plug.macn01, lumi.plug.maeu01, lumi.plug.mmeu01, s31zb, s40zbtpb, s40zbtpf, s40zbtpg, s60zbtpe, s60zbtpf-r2, sa-028-1, sa-029-1, snzb-06p, sp 120, sp 220, sp 222, sp-euc01, sp-euc02, spm01, spmzbr2, tradfri control outlet, ts0121, tso121, z111pl0h-1jx, zbminil2 | measure_power, meter_power, measure_voltage... |
| plug_energy_monitor_hybrid | 1 | ts0601, s26r2zb, s31zb, ts011f, zbminil2 | measure_temperature, measure_humidity, measure_battery... |
| plug_smart | 28 | s26r2zb, s31 lite zb, s40lite, s60zbtpf, s60zbtpg, ts0049, ts0101, ts0111, ts011f, ts0601 | measure_battery, measure_current, measure_power... |
| plug_smart_switch_hybrid | 1 | - | onoff, measure_battery, measure_power... |
| pool_pump | 4 | ts0601, ts0601_pool | onoff, measure_power, meter_power... |
| power_clamp_meter | 7 | ts0601, ts0601_clamp | measure_power, meter_power, measure_current... |
| power_meter | 5 | ts0601, ts0601_meter | measure_power, meter_power, measure_voltage... |
| presence_sensor_ceiling | 5 | ts0601, ts0601_ceiling | alarm_motion, onoff, measure_luminance... |
| presence_sensor_radar | 88 | ck-bl702-mws-01, ck-bl702-mws-01(7016), mg1_5rz, snzb-06p, szlmr10, ts0225, ts0601, zg-204ze, zg-204zh, zg-204zk, zg-204zl, zg-204zm, zg-204zq, zg-204zv, zg-205z, zg-205zl, zg-302zl, zg-302zm, zp-301z | alarm_motion, measure_luminance, measure_temperature... |
| radiator_controller | 5 | ts0601, ts0601_rad | onoff, target_temperature, measure_temperature... |
| radiator_valve | 168 | 014g2461, 014g2463, etrv0100, lumi.airrtc.agl001, lumi.airrtc.vrfegl01, sea801-zigbee, spzb0001, spzb0003, stzb402, stzb403, trv601, trv602, trvzb, ts0601, tv01-zb, tv02-zb, zen-01 | target_temperature, measure_temperature, thermostat_mode... |
| radiator_valve_zigbee | 3 | ts0601 | target_temperature, measure_temperature, thermostat_mode... |
| rain_sensor | 8 | ts0207, ts0207_rain, ts0601, zg-222z, zg-223z | alarm_water, measure_humidity, measure_battery... |
| remote_button_emergency_sos_hybrid | 1 | - | button.1, button.2, button.3... |
| remote_button_wireless_fingerbot_hybrid | 0 | ts0001, ts0001_fingerbot | onoff, measure_battery, measure_power... |
| remote_button_wireless_handheld_hybrid | 1 | - | button.1, button.2, button.3... |
| remote_button_wireless_hybrid | 7 | ts004f, ts0041, ts0043, ts0044, ts0046, snzb-01, snzb-01p, snzb-01m, ts0042, ts0111, ts0002, ts0001, ts0003, ts0011, ts0012, ts0013 | button.rotate_left, button.rotate_right, button.press... |
| remote_button_wireless_plug_hybrid | 0 | ts0111 | measure_power, meter_power, measure_voltage... |
| remote_button_wireless_scene_hybrid | 0 | ts0042, ts0043 | button.1, button.2, measure_battery... |
| remote_button_wireless_smart_hybrid | 1 | ts0041, ts004f | button.1, measure_battery, measure_radio_stability... |
| remote_button_wireless_usb_hybrid | 0 | ts0002 | onoff, onoff.usb2, measure_power... |
| remote_button_wireless_valve_hybrid | 0 | ts0001 | button.1, button.2, measure_battery... |
| remote_button_wireless_wall_hybrid | 0 | ts0041, ts0043, ts0044, ts0046, ts004f, ts0042, ts0001, ts0002, ts0003, ts0011, ts0012, ts0013 | button.1, measure_battery, measure_radio_stability... |
| remote_dimmer | 1 | ts1001 | measure_battery, measure_radio_stability, measure_maintenance_score |
| scene_switch_1 | 3 | ts0601_scene1 | button.1, measure_battery, measure_radio_stability... |
| scene_switch_2 | 1 | ts0042, ts0601_scene2, ts0726 | button.1, button.2, measure_battery... |
| scene_switch_3 | 2 | ts0043, ts0601_scene3, ts0726 | button.1, button.2, button.3... |
| scene_switch_4 | 11 | ers-10tzbvk-aa, ts0601, zg-101zs | button.1, button.2, button.3... |
| scene_switch_6 | 1 | ts0601_scene6 | button.1, button.2, button.3... |
| scene_switch_wall_hybrid | 0 | ts0042, ts0043 | button.1, button.2, measure_battery... |
| sensor_climate_contact_hybrid | 0 | zg-227z, ts0601 | measure_temperature, measure_humidity, measure_battery... |
| sensor_climate_lcdtemphumidsensor_hybrid | 0 | ts0201, ts0601, ty0201 | measure_temperature, measure_humidity, measure_battery... |
| sensor_climate_motion_hybrid | 1 | - | alarm_motion, measure_battery, measure_luminance... |
| sensor_climate_presence_hybrid | 1 | - | alarm_motion, measure_luminance, measure_temperature... |
| sensor_climate_smart_hybrid | 1 | ts0601 | onoff.gang1, onoff.gang2, onoff.gang3... |
| sensor_climate_temphumidsensor_hybrid | 22 | ck-tlsr8656-ss5-01(7014), zg-227z | measure_temperature, measure_humidity, measure_battery... |
| sensor_contact_climate_hybrid | 0 | ts0601 | measure_temperature, measure_humidity, measure_battery... |
| sensor_contact_motion_hybrid | 1 | - | alarm_motion, measure_battery, measure_luminance... |
| sensor_contact_plug_hybrid | 1 | ts0601 | onoff, measure_power, meter_power... |
| sensor_contact_presence_hybrid | 1 | - | alarm_motion, measure_luminance, measure_temperature... |
| sensor_contact_rain_hybrid | 1 | ts0207, ts0601 | alarm_contact, measure_battery, alarm_tamper... |
| sensor_contact_water_hybrid | 0 | q9mpfhw, ts0207, ts0601 | alarm_contact, measure_battery, alarm_tamper... |
| sensor_contact_zigbee_hybrid | 0 | ts0207 | alarm_contact, alarm_tamper, measure_battery... |
| sensor_gas_presence_hybrid | 1 | - | alarm_motion, measure_luminance, measure_temperature... |
| sensor_lcdtemphumidsensor_soil_hybrid | 1 | ts0601 | measure_humidity.soil, measure_temperature, measure_humidity... |
| sensor_lcdtemphumidsensor_temphumidsensor_hybrid | 1 | ts0201, ty0201 | measure_temperature, measure_humidity, measure_battery... |
| sensor_motion_presence_hybrid | 1 | ts0225 | alarm_motion, measure_luminance, measure_temperature... |
| sensor_motion_radar_hybrid | 1 | - | alarm_motion, measure_luminance.distance, measure_temperature... |
| sensor_presence_radar_hybrid | 1 | ts0203, zg-204zl, zg-204zm, zg-204zv, ts0225 | alarm_motion, measure_luminance, measure_temperature... |
| shutter_roller_controller | 1 | ts0601_shutter | alarm_generic, windowcoverings_state, measure_battery... |
| siren | 25 | ts0216, ts0219, ts0601 | alarm_motion, measure_battery, alarm_generic... |
| siren_sirentemphumidsensor_hybrid | 0 | ts0601 | onoff, measure_temperature, measure_humidity... |
| sirentemphumidsensor | 0 | ts0601 | onoff, measure_temperature, measure_humidity... |
| smart_breaker | 4 | ts0601, ts0601_breaker | onoff, alarm_generic, measure_power... |
| smart_button_switch | 0 | ts0041 | button.1, measure_battery, measure_radio_stability... |
| smart_heater | 2 | ts0601, ts0601_heater | onoff, target_temperature, thermostat_mode... |
| smart_heater_controller | 5 | ts0601, ts0601_heatctrl | onoff, target_temperature, measure_temperature... |
| smart_knob | 4 | ers-10tzbvk-aa, ts004f | button, dim, measure_battery... |
| smart_knob_rotary | 3 | ers-10tzbvk-aa, ts004f, zg-101zd | button.rotate_left, button.rotate_right, button.press... |
| smart_knob_rotary_hybrid | 0 | ts004f | button.rotate_left, button.rotate_right, button.press... |
| smart_knob_switch | 0 | ts004f | dim, alarm_battery, measure_radio_stability... |
| smart_knob_switch_hybrid | 0 | ts004f | button, dim, measure_battery... |
| smart_lcd_thermostat | 3 | ts0601 | target_temperature, measure_temperature, measure_humidity... |
| smart_rcbo | 2 | ts0601, ts0601_rcbo | onoff, alarm_generic, measure_power... |
| smart_remote_1_button | 0 | ts004f | measure_battery, measure_radio_stability, measure_maintenance_score |
| smart_remote_1_button_2 | 1 | - | button.1, measure_battery, measure_radio_stability... |
| smart_remote_4_buttons | 1 | - | button.1, button.2, button.3... |
| smart_scene_panel | 2 | ts0601 | onoff.gang1, onoff.gang2, onoff.gang3... |
| smoke_detector_advanced | 32 | gs361a-h04, hs1sa, hs3sa, jtyj-gd-01lm/bw, lumi.sensor_smoke, nas-sd02b0, pg-s11z, sa12izl, sd8sc_00.00.03.12tc, smszb-120, sssqs01lm, ts0205, ts0601, yg400a | alarm_smoke, measure_battery, measure_temperature... |
| soil_sensor | 25 | arteco, cs-201z, ts0601, zg-303z | measure_humidity.soil, measure_temperature, measure_humidity... |
| switch_1gang | 255 | 01minizb, basiczbr3, s26r2zb, s31zb, ts0001, ts0001_power, ts0001_switch, ts0001_switch_module, ts000f, ts0011, ts0101, ts011f, ts0601, ts0726, ts4100, zbm5-1c-120, zbm5-2c-120, zbm5-3c-120, zbmini, zbminil2, zbminil2-r2, zbminir, zbminir2, zbminir2-r2, zg-301z, zg-302z1 | onoff, measure_battery, measure_power... |
| switch_2gang | 68 | ts0002, ts0002_power, ts0002_switch_module, ts0003, ts0012, ts0013, zg-302z2, zg-305z | onoff, onoff.gang2, measure_power... |
| switch_3gang | 60 | ts0003, ts0003_power, ts0003_switch_module, ts0013, ts0601, zg-302z3 | onoff, onoff.gang2, onoff.gang3... |
| switch_4gang | 76 | jz-zb-004, ts0004, ts0004_power, ts0004_switch_module, ts0014, ts0601 | onoff, onoff.gang2, onoff.gang3... |
| switch_dimmer_1gang | 2 | ts0601 | onoff, dim, measure_radio_stability... |
| switch_hybrid | 1 | ts011f, ts0601, ts0726 | onoff, onoff.gang2, measure_power... |
| switch_plug_1 | 1 | ts0601_sp1 | onoff, measure_power, meter_power... |
| switch_plug_2 | 1 | ts0122 | onoff, onoff.outlet2, measure_power... |
| switch_temp_sensor | 1 | ts0601_tempswitch | onoff, measure_temperature, measure_humidity... |
| switch_wall_5gang | 1 | ts0015, ts0601 | onoff, onoff.gang2, onoff.gang3... |
| switch_wall_6gang | 8 | ts0016, ts0601, ts0726 | onoff, onoff.gang2, onoff.gang3... |
| switch_wall_7gang | 2 | ts0007 | onoff, onoff.gang2, onoff.gang3... |
| switch_wall_8gang | 5 | ts0601, ts0601_8gang | onoff, onoff.gang2, onoff.gang3... |
| switch_wall_hybrid | 1 | - | onoff, measure_battery, measure_power... |
| switch_wireless | 2 | ts0601_wirelesssw | alarm_generic, measure_battery, measure_radio_stability... |
| temphumidsensor | 1 | ck-tlsr8656-ss5-01(7014), rh3052, sntz003, ts0201, ty0201, zg-227z | measure_temperature, measure_humidity, measure_battery... |
| thermostat_4ch | 1 | ts0601, ts0601_thermo4ch | onoff, onoff.ch2, onoff.ch3... |
| thermostat_tuya_dp | 62 | ts0601, ts0601_thermo | target_temperature, measure_temperature, thermostat_mode... |
| universal_fallback | 19 | q9mpfhw, ts0001, ts0002, ts0003, ts0004, ts0005, ts0006, ts0011, ts0012, ts0013, ts0014, ts0015, ts0041, ts0042, ts0043, ts0044, ts0045, ts0046, ts0047, ts0048, ts004f, ts0101, ts0111, ts011f, ts0121, ts0201, ts0204, ts0205, ts0206, ts0207, ts0208, ts0209, ts0210, ts0211, ts0212, ts0215, ts0215a, ts0216, ts0216a, ts0218, ts0222, ts0225, ts0301, ts0302, ts0303, ts0304, ts0401, ts0402, ts0501, ts0501a, ts0501b, ts0502, ts0502a, ts0502b, ts0503, ts0503a, ts0503b, ts0504, ts0504a, ts0504b, ts0505, ts0505a, ts0505b, ts0601, ts110e, ts110f, ts130f | measure_battery, measure_radio_stability, measure_maintenance_score |
| universal_zigbee | 13 | 005f0c3b, 5p1vj8r, 6dfgetq, ck-bl702-al-01, ck-bl702-al-01(7009_z102lg03-1), ck-bl702-al-01(7009_z102lg04-1), ck-bl702-al-01(7009_z102lg04-2), d3-dpwk-ty, e220-kr4n0z0-ha, ers-10tzbvk-aa, fnb54-wts08ml1.0, hy0017, hy0080, ih012-rt01, jz-zb-004, rh3040, rh3052, sm0001, sm0202, sm0212, sntz003, sntz009, ts0001, ts0002, ts0003, ts0004, ts0006, ts0011, ts0012, ts0013, ts0014, ts0026, ts0041, ts0041a, ts0042, ts0043, ts0044, ts0046, ts0049, ts0052, ts0105, ts0111, ts0115, ts011e, ts011f, ts0201, ts0202, ts0203, ts0204, ts0205, ts0207, ts0207_water_leak_detector, ts020c, ts0210, ts0216, ts0218, ts0224, ts0301, ts030f, ts0501, ts0502a, ts0502b, ts0503a, ts0503b, ts0504a, ts0504b, ts0505, ts0505a, ts0505b, ts0505b_1, ts0601, ts0601_cover_1, ts0601_smoke_4, ts0601_switch, ts0601_switch_1_gang, ts0601_switch_2_gang, ts0601_switch_3_gang, ts0901, ts130f, tt001zav20, ty0201, tyzs1l, u86kcj-zp, u86kwf-zpsj, zg-101zd, zg-102z, zg-102zl, zg-103z, zg-204z, zg-204zl, zg-204zm, zg-222z, zg-225z, zg-227z, zg-227zl, zg-302z1, zg-302z2, zg-302z3, aabybja, gq8b1uv, kjintbl, mcdj3aq, mcdj3aq\u0000, owvfni3, owvfni3\u0000, q9mpfhw, qnazj70, u1rkty3 | onoff, dim, measure_temperature... |
| usb_dongle_dual_repeater | 1 | ts0002, ts0207, ts0601_repeater | onoff, onoff.usb2, measure_power... |
| usb_dongle_triple | 1 | ts0003 | onoff, onoff.usb2, onoff.usb3... |
| usb_outlet_advanced | 13 | ts0115, ts0601 | onoff, onoff.socket2, onoff.usb1... |
| valve_irrigation | 33 | ts0049, ts0601, ts0601_irrigation | dim.valve_1, dim.valve_2, dim.valve_3... |
| valve_single | 2 | ts0001, ts0601, ts0601_valve | onoff, dim.valve, measure_battery... |
| vibration_sensor | 23 | ts0209, ts0210, ts0601, zg-102zm, zg-103z, zg-103zl | alarm_vibration, measure_temperature, measure_battery... |
| wall_curtain_switch | 1 | - | windowcoverings_set, windowcoverings_state, measure_radio_stability... |
| wall_dimmer_1gang_1way | 2 | edm-1zba-eu, tri-c1zr, tri-k1zr, ts004f, ts0501b | onoff, dim, measure_radio_stability... |
| wall_remote_1_gang | 1 | - | button.1, measure_battery, measure_radio_stability... |
| wall_remote_2_gang | 0 | ts0042 | button.1, button.2, measure_battery... |
| wall_remote_3_gang | 1 | ts0043 | button.1, button.2, button.3... |
| wall_remote_4_gang | 1 | ts0044 | button.1, button.2, button.3... |
| wall_remote_4_gang_2 | 0 | ts004f | button.1, button.2, button.3... |
| wall_remote_4_gang_3 | 0 | ts0044 | button.1, button.2, button.3... |
| wall_remote_6_gang | 0 | ts0046 | button.1, button.2, button.3... |
| wall_switch_1gang_1way | 3 | ts0001, ts0011 | onoff, measure_radio_stability, measure_maintenance_score |
| wall_switch_2gang_1way | 4 | ts0002, ts0012, ts0042 | onoff, measure_radio_stability, measure_maintenance_score |
| wall_switch_3gang_1way | 7 | ts0003, ts0013, ts0043 | onoff, measure_radio_stability, measure_maintenance_score |
| wall_switch_4gang_1way | 2 | ts0726 | onoff, measure_radio_stability, measure_maintenance_score |
| water_leak_sensor | 33 | 3315-s, 3315-seu, ck-tlsr8656-ss5-01(7019), hs1wl, ls21001, lumi.sensor_wleak.aq1, q9mpfhw, sjcgq11lm, sjcgq12lm, sjcgq13lm, snzb-05, snzb-05p, sq510a, ts0207, ts0601, zg-222z, zg-223z, _tz3000_eit6l5, _tz3000_k4ej3ww2, _tz3000_kyb656no | alarm_water, measure_battery, alarm_tamper... |
| water_tank_monitor | 9 | ts0601, ts0601_tank | measure_water_level, measure_water_percentage, alarm_water_low... |
| water_valve_garden | 4 | ts0049 | onoff, measure_battery, measure_radio_stability... |
| water_valve_smart | 6 | swv-zfe, swv-zfu, swv-zn, swv-zne, swv-znu, ts0601, ts0601_watervalve | onoff, meter_water, measure_temperature... |
| weather_station_outdoor | 2 | ts0601, ts0601_weather | measure_temperature, measure_humidity, measure_pressure... |
| zigbee_repeater | 5 | ts0207 | measure_radio_stability, measure_maintenance_score |

---
**Total:** 271 drivers, 3614 manufacturer IDs

*Generated: 2026-04-14T17:40:56.767Z*
