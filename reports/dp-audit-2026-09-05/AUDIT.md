# Sacred couple DP audit — 2026-09-05

Cases: **171** | Issues: **1107** | RAW unparsed: **0**

## How to read

- **type 0 (RAW)**: byte_array — never auto-map globally; lock parser per couple.
- **missing_in_driver**: Z2M/knowledge has DP, driver does not.
- **raw_unparsed**: needs `DpByteArrayProfiles` + `_handleDP` override.

| Case | Driver | DP | Z2M | Driver | Status | Notes |
|------|--------|----|-----|--------|--------|-------|
| hobeian-aubess-k4ej3ww2-ias | water_leak_sensor | 2 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| hobeian-aubess-k4ej3ww2-ias | water_leak_sensor | 3 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| hobeian-aubess-k4ej3ww2-ias | water_leak_sensor | 5 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| hobeian-aubess-k4ej3ww2-ias | water_leak_sensor | 6 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| hobeian-aubess-k4ej3ww2-ias | water_leak_sensor | 9 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| hobeian-aubess-k4ej3ww2-ias | water_leak_sensor | 14 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| hobeian-aubess-k4ej3ww2-ias | water_leak_sensor | 15 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| hobeian-aubess-k4ej3ww2-ias | water_leak_sensor | 19 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| presentsky-bseed-dimmer-m1cvyneb | wall_dimmer_tuya | 1 | state | — | missing_in_driver | knowledge documents DP — not in driver compose/device; TX path undocumented in driver |
| presentsky-bseed-dimmer-m1cvyneb | wall_dimmer_tuya | 2 | brightness | — | missing_in_driver | knowledge documents DP — not in driver compose/device; TX path undocumented in driver |
| presentsky-bseed-dimmer-m1cvyneb | wall_dimmer_tuya | 6 | countdown | — | missing_in_driver | knowledge documents DP — not in driver compose/device; TX path undocumented in driver |
| presentsky-bseed-dimmer-m1cvyneb | wall_dimmer_tuya | 21 | backlight_mode | — | missing_in_driver | knowledge documents DP — not in driver compose/device; TX path undocumented in driver |
| soil-nt4pquef | soil_sensor | 3 | soil_moisture | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| soil-nt4pquef | soil_sensor | 5 | temperature | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| soil-nt4pquef | soil_sensor | 15 | battery | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| presence-radar-clrdrnya | presence_sensor_radar | 1 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| presence-radar-clrdrnya | presence_sensor_radar | 2 | radar_sensitivity | — | missing_in_driver | Z2M defines radar_sensitivity — no driver dpMapping |
| presence-radar-clrdrnya | presence_sensor_radar | 3 | shield_range | — | missing_in_driver | Z2M defines shield_range — no driver dpMapping |
| presence-radar-clrdrnya | presence_sensor_radar | 4 | detection_range | — | missing_in_driver | Z2M defines detection_range — no driver dpMapping |
| presence-radar-clrdrnya | presence_sensor_radar | 6 | equipment_status | — | missing_in_driver | Z2M defines equipment_status — no driver dpMapping |
| presence-radar-clrdrnya | presence_sensor_radar | 9 | target_distance | — | missing_in_driver | Z2M defines target_distance — no driver dpMapping |
| presence-radar-clrdrnya | presence_sensor_radar | 101 | entry_filter_time | — | missing_in_driver | Z2M defines entry_filter_time — no driver dpMapping |
| presence-radar-clrdrnya | presence_sensor_radar | 102 | departure_delay | — | missing_in_driver | Z2M defines departure_delay — no driver dpMapping |
| presence-radar-clrdrnya | presence_sensor_radar | 103 | cline | — | missing_in_driver | Z2M defines cline — no driver dpMapping |
| presence-radar-clrdrnya | presence_sensor_radar | 104 | illuminance | — | missing_in_driver | Z2M defines illuminance — no driver dpMapping |
| presence-radar-clrdrnya | presence_sensor_radar | 105 | entry_sensitivity | — | missing_in_driver | Z2M defines entry_sensitivity — no driver dpMapping |
| presence-radar-clrdrnya | presence_sensor_radar | 106 | entry_distance_indentation | — | missing_in_driver | Z2M defines entry_distance_indentation — no driver dpMapping |
| presence-radar-clrdrnya | presence_sensor_radar | 107 | breaker_mode | — | missing_in_driver | Z2M defines breaker_mode — no driver dpMapping |
| presence-radar-clrdrnya | presence_sensor_radar | 108 | breaker_status | — | missing_in_driver | Z2M defines breaker_status — no driver dpMapping |
| presence-radar-clrdrnya | presence_sensor_radar | 109 | status_indication | — | missing_in_driver | Z2M defines status_indication — no driver dpMapping |
| presence-radar-clrdrnya | presence_sensor_radar | 110 | illuminance_threshold | — | missing_in_driver | Z2M defines illuminance_threshold — no driver dpMapping |
| presence-radar-clrdrnya | presence_sensor_radar | 111 | breaker_polarity | — | missing_in_driver | Z2M defines breaker_polarity — no driver dpMapping |
| presence-radar-clrdrnya | presence_sensor_radar | 112 | block_time | — | missing_in_driver | Z2M defines block_time — no driver dpMapping |
| presence-radar-clrdrnya | presence_sensor_radar | 113 | parameter_setting_result | — | missing_in_driver | Z2M defines parameter_setting_result — no driver dpMapping |
| presence-radar-clrdrnya | presence_sensor_radar | 114 | factory_parameters | — | missing_in_driver | Z2M defines factory_parameters — no driver dpMapping |
| presence-radar-clrdrnya | presence_sensor_radar | 115 | sensor | — | missing_in_driver | Z2M defines sensor — no driver dpMapping |
| usb-switch-mvtclclq | usb_outlet_advanced | 3 | state_plug_1 | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| usb-switch-mvtclclq | usb_outlet_advanced | 4 | state_plug_2 | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| usb-switch-mvtclclq | usb_outlet_advanced | 7 | countdown_usb_a | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| usb-switch-mvtclclq | usb_outlet_advanced | 9 | countdown_plug_1 | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| usb-switch-mvtclclq | usb_outlet_advanced | 10 | countdown_plug_2 | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| usb-switch-mvtclclq | usb_outlet_advanced | 11 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| usb-switch-mvtclclq | usb_outlet_advanced | 12 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| usb-switch-mvtclclq | usb_outlet_advanced | 13 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| usb-switch-mvtclclq | usb_outlet_advanced | 16 | switch_backlight | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| usb-switch-mvtclclq | usb_outlet_advanced | 17 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| usb-switch-mvtclclq | usb_outlet_advanced | 18 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| usb-switch-mvtclclq | usb_outlet_advanced | 19 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| usb-switch-mvtclclq | usb_outlet_advanced | 101 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| usb-switch-mvtclclq | usb_outlet_advanced | 102 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| usb-switch-mvtclclq | usb_outlet_advanced | 103 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| usb-switch-mvtclclq | usb_outlet_advanced | 104 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| usb-switch-mvtclclq | usb_outlet_advanced | 105 | produced_energy | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| usb-switch-mvtclclq | usb_outlet_advanced | 106 | child_lock | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| usb-switch-mvtclclq | usb_outlet_advanced | 121 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| curtain-r0jdjrvi-tilt | curtain_motor_tilt | 1 | state | — | missing_in_driver | Z2M defines state — no driver dpMapping |
| curtain-r0jdjrvi-tilt | curtain_motor_tilt | 2 | position | — | missing_in_driver | Z2M defines position — no driver dpMapping |
| curtain-r0jdjrvi-tilt | curtain_motor_tilt | 3 | position | — | missing_in_driver | Z2M defines position — no driver dpMapping |
| curtain-r0jdjrvi-tilt | curtain_motor_tilt | 5 | reverse_direction | — | missing_in_driver | Z2M defines reverse_direction — no driver dpMapping |
| curtain-r0jdjrvi-tilt | curtain_motor_tilt | 12 | motor_fault | — | missing_in_driver | Z2M defines motor_fault — no driver dpMapping |
| curtain-r0jdjrvi-tilt | curtain_motor_tilt | 103 | upper_stroke_limit | — | missing_in_driver | Z2M defines upper_stroke_limit — no driver dpMapping |
| curtain-r0jdjrvi-tilt | curtain_motor_tilt | 104 | middle_stroke_limit | — | missing_in_driver | Z2M defines middle_stroke_limit — no driver dpMapping |
| curtain-r0jdjrvi-tilt | curtain_motor_tilt | 105 | lower_stroke_limit | — | missing_in_driver | Z2M defines lower_stroke_limit — no driver dpMapping |
| curtain-r0jdjrvi-tilt | curtain_motor_tilt | 106 | motor_working_mode | — | missing_in_driver | Z2M defines motor_working_mode — no driver dpMapping |
| zemismart-ts0601-6gang-r731zlxk | wall_switch_6_gang_tuya | 1 | state_l1 | — | missing_in_driver | Z2M defines state_l1 — no driver dpMapping |
| zemismart-ts0601-6gang-r731zlxk | wall_switch_6_gang_tuya | 2 | state_l2 | — | missing_in_driver | Z2M defines state_l2 — no driver dpMapping |
| zemismart-ts0601-6gang-r731zlxk | wall_switch_6_gang_tuya | 3 | state_l3 | — | missing_in_driver | Z2M defines state_l3 — no driver dpMapping |
| zemismart-ts0601-6gang-r731zlxk | wall_switch_6_gang_tuya | 4 | state_l4 | — | missing_in_driver | Z2M defines state_l4 — no driver dpMapping |
| zemismart-ts0601-6gang-r731zlxk | wall_switch_6_gang_tuya | 5 | state_l5 | — | missing_in_driver | Z2M defines state_l5 — no driver dpMapping |
| zemismart-ts0601-6gang-r731zlxk | wall_switch_6_gang_tuya | 6 | state_l6 | — | missing_in_driver | Z2M defines state_l6 — no driver dpMapping |
| zemismart-ts0601-6gang-r731zlxk | wall_switch_6_gang_tuya | 14 | power_on_behavior | — | missing_in_driver | Z2M defines power_on_behavior — no driver dpMapping |
| zemismart-ts0601-6gang-r731zlxk | wall_switch_6_gang_tuya | 15 | indicator_mode | — | missing_in_driver | Z2M defines indicator_mode — no driver dpMapping |
| p2261-ihseno-debczeci-presence | presence_sensor_radar | 1 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| p2261-ihseno-debczeci-presence | presence_sensor_radar | 4 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| p2261-ihseno-debczeci-presence | presence_sensor_radar | 9 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| p2261-ihseno-debczeci-presence | presence_sensor_radar | 10 | delay_time | — | missing_in_driver | Z2M defines delay_time — no driver dpMapping |
| p2261-ihseno-debczeci-presence | presence_sensor_radar | 1 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| p2261-ihseno-debczeci-presence | presence_sensor_radar | 4 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| p2261-ihseno-debczeci-presence | presence_sensor_radar | 9 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| p2261-ihseno-debczeci-presence | presence_sensor_radar | 10 | delay_time | — | missing_in_driver | Z2M defines delay_time — no driver dpMapping |
| p2201-pay2byax-zg102zl-contact | contact_sensor_zigbee | 2 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| p2201-pay2byax-zg102zl-contact | contact_sensor_zigbee | 101 | illuminance | — | missing_in_driver | Z2M defines illuminance — no driver dpMapping |
| p2201-pay2byax-zg102zl-contact | contact_sensor_zigbee | 102 | illuminance_interval | — | missing_in_driver | Z2M defines illuminance_interval — no driver dpMapping |
| p2201-pay2byax-zg102zl-contact | contact_sensor_zigbee | 2 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| p2201-pay2byax-zg102zl-contact | contact_sensor_zigbee | 101 | illuminance | — | missing_in_driver | Z2M defines illuminance — no driver dpMapping |
| p2201-pay2byax-zg102zl-contact | contact_sensor_zigbee | 102 | illuminance_interval | — | missing_in_driver | Z2M defines illuminance_interval — no driver dpMapping |
| p2234b-tze200_7upwjcca | curtain_motor | 2 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2234b-tze200_7upwjcca | curtain_motor | 3 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2234b-tze200_7upwjcca | curtain_motor | 4 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2234b-tze200_7upwjcca | curtain_motor | 5 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2234b-tze200_7upwjcca | curtain_motor | 6 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2234b-tze200_7upwjcca | curtain_motor | 7 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2234b-tze200_7upwjcca | curtain_motor | 8 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2234b-tze200_7upwjcca | curtain_motor | 9 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2234b-tze200_7upwjcca | curtain_motor | 10 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2234b-tze200_7upwjcca | curtain_motor | 12 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2234b-tze200_7upwjcca | curtain_motor | 13 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2234b-tze200_7upwjcca | curtain_motor | 14 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2234b-tze200_7upwjcca | curtain_motor | 15 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2234b-tze200_7upwjcca | curtain_motor | 16 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2234b-tze200_7upwjcca | curtain_motor | 101 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2234b-tze200_7upwjcca | curtain_motor | 102 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2234b-tze200_7upwjcca | curtain_motor | 104 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2234b-tze200_7upwjcca | curtain_motor | 105 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2234b-tze204_pkpfn9hc | air_quality_co2 | 1 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2234b-tze204_pkpfn9hc | air_quality_co2 | 3 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2234b-tze204_pkpfn9hc | air_quality_co2 | 4 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2260-upgcbody-ts0207-water | water_leak_sensor | 2 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2260-upgcbody-ts0207-water | water_leak_sensor | 3 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2260-upgcbody-ts0207-water | water_leak_sensor | 5 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2260-upgcbody-ts0207-water | water_leak_sensor | 6 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2260-upgcbody-ts0207-water | water_leak_sensor | 9 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2260-upgcbody-ts0207-water | water_leak_sensor | 14 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2260-upgcbody-ts0207-water | water_leak_sensor | 15 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2260-upgcbody-ts0207-water | water_leak_sensor | 19 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2268-cjbofhxw-clamp-not-smoke | power_clamp_meter | 18 | current | — | missing_in_driver | Z2M defines current — no driver dpMapping |
| p2268-cjbofhxw-clamp-not-smoke | power_clamp_meter | 19 | power | — | missing_in_driver | Z2M defines power — no driver dpMapping |
| p2268-cjbofhxw-clamp-not-smoke | power_clamp_meter | 20 | voltage | — | missing_in_driver | Z2M defines voltage — no driver dpMapping |
| p2268-cjbofhxw-clamp-not-smoke | power_clamp_meter | 101 | energy | — | missing_in_driver | Z2M defines energy — no driver dpMapping |
| p2273-guvc7pdy-curtain-not-1gang | curtain_motor | 2 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2273-guvc7pdy-curtain-not-1gang | curtain_motor | 3 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2273-guvc7pdy-curtain-not-1gang | curtain_motor | 4 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2273-guvc7pdy-curtain-not-1gang | curtain_motor | 5 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2273-guvc7pdy-curtain-not-1gang | curtain_motor | 6 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2273-guvc7pdy-curtain-not-1gang | curtain_motor | 7 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2273-guvc7pdy-curtain-not-1gang | curtain_motor | 8 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2273-guvc7pdy-curtain-not-1gang | curtain_motor | 9 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2273-guvc7pdy-curtain-not-1gang | curtain_motor | 10 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2273-guvc7pdy-curtain-not-1gang | curtain_motor | 12 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2273-guvc7pdy-curtain-not-1gang | curtain_motor | 13 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2273-guvc7pdy-curtain-not-1gang | curtain_motor | 14 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2273-guvc7pdy-curtain-not-1gang | curtain_motor | 15 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2273-guvc7pdy-curtain-not-1gang | curtain_motor | 16 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2273-guvc7pdy-curtain-not-1gang | curtain_motor | 101 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2273-guvc7pdy-curtain-not-1gang | curtain_motor | 102 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2273-guvc7pdy-curtain-not-1gang | curtain_motor | 104 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2273-guvc7pdy-curtain-not-1gang | curtain_motor | 105 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2273-hdml1aav-soil-zs300tf | soil_sensor | 3 | soil_moisture | — | missing_in_driver | Z2M defines soil_moisture — no driver dpMapping |
| p2273-hdml1aav-soil-zs300tf | soil_sensor | 5 | temperature | — | missing_in_driver | Z2M defines temperature — no driver dpMapping |
| p2273-hdml1aav-soil-zs300tf | soil_sensor | 15 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| p2273-hdml1aav-soil-zs300tf | soil_sensor | 101 | humidity | — | missing_in_driver | Z2M defines humidity — no driver dpMapping |
| p2273-hdml1aav-soil-zs300tf | soil_sensor | 102 | illuminance | — | missing_in_driver | Z2M defines illuminance — no driver dpMapping |
| p2273-hdml1aav-soil-zs300tf | soil_sensor | 103 | report_period | — | missing_in_driver | Z2M defines report_period — no driver dpMapping |
| p2273-hdml1aav-soil-zs300tf | soil_sensor | 104 | soil_calibration | — | missing_in_driver | Z2M defines soil_calibration — no driver dpMapping |
| p2273-hdml1aav-soil-zs300tf | soil_sensor | 105 | humidity_calibration | — | missing_in_driver | Z2M defines humidity_calibration — no driver dpMapping |
| p2273-hdml1aav-soil-zs300tf | soil_sensor | 106 | illuminance_calibration | — | missing_in_driver | Z2M defines illuminance_calibration — no driver dpMapping |
| p2273-hdml1aav-soil-zs300tf | soil_sensor | 107 | temperature_calibration | — | missing_in_driver | Z2M defines temperature_calibration — no driver dpMapping |
| p2273-hdml1aav-soil-zs300tf | soil_sensor | 110 | soil_warning | — | missing_in_driver | Z2M defines soil_warning — no driver dpMapping |
| p2273-hdml1aav-soil-zs300tf | soil_sensor | 111 | water_warning | — | missing_in_driver | Z2M defines water_warning — no driver dpMapping |
| p2273-hdml1aav-soil-zs300tf | soil_sensor | 112 | soil_fertility | — | missing_in_driver | Z2M defines soil_fertility — no driver dpMapping |
| p2273-hdml1aav-soil-zs300tf | soil_sensor | 113 | soil_fertility_calibration | — | missing_in_driver | Z2M defines soil_fertility_calibration — no driver dpMapping |
| p2273-hdml1aav-soil-zs300tf | soil_sensor | 114 | soil_fertility_set_v0 | — | missing_in_driver | Z2M defines soil_fertility_set_v0 — no driver dpMapping |
| p2273-hdml1aav-soil-zs300tf | soil_sensor | 115 | soil_fertility_set_v1 | — | missing_in_driver | Z2M defines soil_fertility_set_v1 — no driver dpMapping |
| p2273-hdml1aav-soil-zs300tf | soil_sensor | 116 | soil_fertility_warning | — | missing_in_driver | Z2M defines soil_fertility_warning — no driver dpMapping |
| p2276-rccxox8p-smoke-not-climate | smoke_sensor2 | 1 | smoke | — | missing_in_driver | Z2M defines smoke — no driver dpMapping |
| p2276-rccxox8p-smoke-not-climate | smoke_sensor2 | 2 | smoke_concentration | — | missing_in_driver | Z2M defines smoke_concentration — no driver dpMapping |
| p2276-rccxox8p-smoke-not-climate | smoke_sensor2 | 11 | device_fault | — | missing_in_driver | Z2M defines device_fault — no driver dpMapping |
| p2276-rccxox8p-smoke-not-climate | smoke_sensor2 | 15 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| p2276-rccxox8p-smoke-not-climate | smoke_sensor2 | 16 | silence | — | missing_in_driver | Z2M defines silence — no driver dpMapping |
| p2276-rccxox8p-smoke-not-climate | smoke_sensor2 | 101 | test | — | missing_in_driver | Z2M defines test — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 1 | energy | — | missing_in_driver | Z2M defines energy — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 32 | ac_frequency | — | missing_in_driver | Z2M defines ac_frequency — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 50 | power_factor | — | missing_in_driver | Z2M defines power_factor — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 102 | update_frequency | — | missing_in_driver | Z2M defines update_frequency — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 103 | voltage_a | — | missing_in_driver | Z2M defines voltage_a — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 104 | current_a | — | missing_in_driver | Z2M defines current_a — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 105 | power_a | — | missing_in_driver | Z2M defines power_a — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 108 | power_factor_a | — | missing_in_driver | Z2M defines power_factor_a — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 109 | energy_a | — | missing_in_driver | Z2M defines energy_a — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 110 | energy_produced_a | — | missing_in_driver | Z2M defines energy_produced_a — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 112 | voltage_b | — | missing_in_driver | Z2M defines voltage_b — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 113 | current_b | — | missing_in_driver | Z2M defines current_b — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 114 | power_b | — | missing_in_driver | Z2M defines power_b — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 117 | power_factor_b | — | missing_in_driver | Z2M defines power_factor_b — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 118 | energy_b | — | missing_in_driver | Z2M defines energy_b — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 119 | energy_produced_b | — | missing_in_driver | Z2M defines energy_produced_b — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 121 | voltage_c | — | missing_in_driver | Z2M defines voltage_c — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 122 | current_c | — | missing_in_driver | Z2M defines current_c — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 123 | power_c | — | missing_in_driver | Z2M defines power_c — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 126 | power_factor_c | — | missing_in_driver | Z2M defines power_factor_c — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 127 | energy_c | — | missing_in_driver | Z2M defines energy_c — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 128 | energy_produced_c | — | missing_in_driver | Z2M defines energy_produced_c — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 1 | energy | — | missing_in_driver | Z2M defines energy — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 32 | ac_frequency | — | missing_in_driver | Z2M defines ac_frequency — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 50 | power_factor | — | missing_in_driver | Z2M defines power_factor — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 102 | update_frequency | — | missing_in_driver | Z2M defines update_frequency — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 103 | voltage_a | — | missing_in_driver | Z2M defines voltage_a — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 104 | current_a | — | missing_in_driver | Z2M defines current_a — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 105 | power_a | — | missing_in_driver | Z2M defines power_a — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 108 | power_factor_a | — | missing_in_driver | Z2M defines power_factor_a — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 109 | energy_a | — | missing_in_driver | Z2M defines energy_a — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 110 | energy_produced_a | — | missing_in_driver | Z2M defines energy_produced_a — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 112 | voltage_b | — | missing_in_driver | Z2M defines voltage_b — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 113 | current_b | — | missing_in_driver | Z2M defines current_b — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 114 | power_b | — | missing_in_driver | Z2M defines power_b — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 117 | power_factor_b | — | missing_in_driver | Z2M defines power_factor_b — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 118 | energy_b | — | missing_in_driver | Z2M defines energy_b — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 119 | energy_produced_b | — | missing_in_driver | Z2M defines energy_produced_b — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 121 | voltage_c | — | missing_in_driver | Z2M defines voltage_c — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 122 | current_c | — | missing_in_driver | Z2M defines current_c — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 123 | power_c | — | missing_in_driver | Z2M defines power_c — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 126 | power_factor_c | — | missing_in_driver | Z2M defines power_factor_c — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 127 | energy_c | — | missing_in_driver | Z2M defines energy_c — no driver dpMapping |
| p2276-dikb3dp6-3phase-not-climate | energy_meter_3phase | 128 | energy_produced_c | — | missing_in_driver | Z2M defines energy_produced_c — no driver dpMapping |
| p2278-ogx8u5z6-trv-cal-tenths | device_radiator_valve | 28 | schedule_monday | — | missing_in_driver | Z2M defines schedule_monday — no driver dpMapping |
| p2278-ogx8u5z6-trv-cal-tenths | device_radiator_valve | 29 | schedule_tuesday | — | missing_in_driver | Z2M defines schedule_tuesday — no driver dpMapping |
| p2278-ogx8u5z6-trv-cal-tenths | device_radiator_valve | 30 | schedule_wednesday | — | missing_in_driver | Z2M defines schedule_wednesday — no driver dpMapping |
| p2278-ogx8u5z6-trv-cal-tenths | device_radiator_valve | 31 | schedule_thursday | — | missing_in_driver | Z2M defines schedule_thursday — no driver dpMapping |
| p2278-ogx8u5z6-trv-cal-tenths | device_radiator_valve | 32 | schedule_friday | — | missing_in_driver | Z2M defines schedule_friday — no driver dpMapping |
| p2278-ogx8u5z6-trv-cal-tenths | device_radiator_valve | 33 | schedule_saturday | — | missing_in_driver | Z2M defines schedule_saturday — no driver dpMapping |
| p2278-ogx8u5z6-trv-cal-tenths | device_radiator_valve | 34 | schedule_sunday | — | missing_in_driver | Z2M defines schedule_sunday — no driver dpMapping |
| p2278-ogx8u5z6-trv-cal-tenths | device_radiator_valve | 101 | pi_heating_demand | — | missing_in_driver | Z2M defines pi_heating_demand — no driver dpMapping |
| p2279-1fuxihti-cover-not-climate | curtain_motor | 2 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2279-1fuxihti-cover-not-climate | curtain_motor | 3 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2279-1fuxihti-cover-not-climate | curtain_motor | 4 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2279-1fuxihti-cover-not-climate | curtain_motor | 5 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2279-1fuxihti-cover-not-climate | curtain_motor | 6 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2279-1fuxihti-cover-not-climate | curtain_motor | 7 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2279-1fuxihti-cover-not-climate | curtain_motor | 8 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2279-1fuxihti-cover-not-climate | curtain_motor | 9 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2279-1fuxihti-cover-not-climate | curtain_motor | 10 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2279-1fuxihti-cover-not-climate | curtain_motor | 12 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2279-1fuxihti-cover-not-climate | curtain_motor | 13 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2279-1fuxihti-cover-not-climate | curtain_motor | 14 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2279-1fuxihti-cover-not-climate | curtain_motor | 15 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2279-1fuxihti-cover-not-climate | curtain_motor | 16 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2279-1fuxihti-cover-not-climate | curtain_motor | 101 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2279-1fuxihti-cover-not-climate | curtain_motor | 102 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2279-1fuxihti-cover-not-climate | curtain_motor | 104 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2279-1fuxihti-cover-not-climate | curtain_motor | 105 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2279-mvtclclq-usb-not-dimmer | usb_outlet_advanced | 3 | state_plug_1 | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2279-mvtclclq-usb-not-dimmer | usb_outlet_advanced | 4 | state_plug_2 | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2279-mvtclclq-usb-not-dimmer | usb_outlet_advanced | 7 | countdown_usb_a | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2279-mvtclclq-usb-not-dimmer | usb_outlet_advanced | 9 | countdown_plug_1 | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2279-mvtclclq-usb-not-dimmer | usb_outlet_advanced | 10 | countdown_plug_2 | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2279-mvtclclq-usb-not-dimmer | usb_outlet_advanced | 11 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2279-mvtclclq-usb-not-dimmer | usb_outlet_advanced | 12 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2279-mvtclclq-usb-not-dimmer | usb_outlet_advanced | 13 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2279-mvtclclq-usb-not-dimmer | usb_outlet_advanced | 16 | switch_backlight | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2279-mvtclclq-usb-not-dimmer | usb_outlet_advanced | 17 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2279-mvtclclq-usb-not-dimmer | usb_outlet_advanced | 18 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2279-mvtclclq-usb-not-dimmer | usb_outlet_advanced | 19 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2279-mvtclclq-usb-not-dimmer | usb_outlet_advanced | 101 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2279-mvtclclq-usb-not-dimmer | usb_outlet_advanced | 102 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2279-mvtclclq-usb-not-dimmer | usb_outlet_advanced | 103 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2279-mvtclclq-usb-not-dimmer | usb_outlet_advanced | 104 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2279-mvtclclq-usb-not-dimmer | usb_outlet_advanced | 105 | produced_energy | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2279-mvtclclq-usb-not-dimmer | usb_outlet_advanced | 106 | child_lock | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2279-mvtclclq-usb-not-dimmer | usb_outlet_advanced | 121 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2293-zemismart-68nvbio9-curtain-not-trv | curtain_motor | 2 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2293-zemismart-68nvbio9-curtain-not-trv | curtain_motor | 3 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2293-zemismart-68nvbio9-curtain-not-trv | curtain_motor | 4 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2293-zemismart-68nvbio9-curtain-not-trv | curtain_motor | 5 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2293-zemismart-68nvbio9-curtain-not-trv | curtain_motor | 6 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2293-zemismart-68nvbio9-curtain-not-trv | curtain_motor | 7 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2293-zemismart-68nvbio9-curtain-not-trv | curtain_motor | 8 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2293-zemismart-68nvbio9-curtain-not-trv | curtain_motor | 9 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2293-zemismart-68nvbio9-curtain-not-trv | curtain_motor | 10 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2293-zemismart-68nvbio9-curtain-not-trv | curtain_motor | 12 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2293-zemismart-68nvbio9-curtain-not-trv | curtain_motor | 13 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2293-zemismart-68nvbio9-curtain-not-trv | curtain_motor | 14 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2293-zemismart-68nvbio9-curtain-not-trv | curtain_motor | 15 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2293-zemismart-68nvbio9-curtain-not-trv | curtain_motor | 16 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2293-zemismart-68nvbio9-curtain-not-trv | curtain_motor | 101 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2293-zemismart-68nvbio9-curtain-not-trv | curtain_motor | 102 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2293-zemismart-68nvbio9-curtain-not-trv | curtain_motor | 104 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2293-zemismart-68nvbio9-curtain-not-trv | curtain_motor | 105 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2293-zemismart-68nvbio9-curtain-not-trv | curtain_motor | 2 | position | — | missing_in_driver | Z2M defines position — no driver dpMapping |
| p2293-zemismart-68nvbio9-curtain-not-trv | curtain_motor | 3 | position | — | missing_in_driver | Z2M defines position — no driver dpMapping |
| p2293-zemismart-68nvbio9-curtain-not-trv | curtain_motor | 5 | reverse_direction | — | missing_in_driver | Z2M defines reverse_direction — no driver dpMapping |
| p2293-zemismart-68nvbio9-curtain-not-trv | curtain_motor | 12 | motor_fault | — | missing_in_driver | Z2M defines motor_fault — no driver dpMapping |
| p2293-zemismart-68nvbio9-curtain-not-trv | curtain_motor | 13 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| p2293-zemismart-68nvbio9-curtain-not-trv | curtain_motor | 16 | border | — | missing_in_driver | Z2M defines border — no driver dpMapping |
| p2293-zemismart-68nvbio9-curtain-not-trv | curtain_motor | 20 | click_control | — | missing_in_driver | Z2M defines click_control — no driver dpMapping |
| p2293-zemismart-cf1sl3tj-curtain-not-trv | curtain_motor | 2 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2293-zemismart-cf1sl3tj-curtain-not-trv | curtain_motor | 3 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2293-zemismart-cf1sl3tj-curtain-not-trv | curtain_motor | 4 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2293-zemismart-cf1sl3tj-curtain-not-trv | curtain_motor | 5 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2293-zemismart-cf1sl3tj-curtain-not-trv | curtain_motor | 6 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2293-zemismart-cf1sl3tj-curtain-not-trv | curtain_motor | 7 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2293-zemismart-cf1sl3tj-curtain-not-trv | curtain_motor | 8 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2293-zemismart-cf1sl3tj-curtain-not-trv | curtain_motor | 9 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2293-zemismart-cf1sl3tj-curtain-not-trv | curtain_motor | 10 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2293-zemismart-cf1sl3tj-curtain-not-trv | curtain_motor | 12 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2293-zemismart-cf1sl3tj-curtain-not-trv | curtain_motor | 13 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2293-zemismart-cf1sl3tj-curtain-not-trv | curtain_motor | 14 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2293-zemismart-cf1sl3tj-curtain-not-trv | curtain_motor | 15 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2293-zemismart-cf1sl3tj-curtain-not-trv | curtain_motor | 16 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2293-zemismart-cf1sl3tj-curtain-not-trv | curtain_motor | 101 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2293-zemismart-cf1sl3tj-curtain-not-trv | curtain_motor | 102 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2293-zemismart-cf1sl3tj-curtain-not-trv | curtain_motor | 104 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2293-zemismart-cf1sl3tj-curtain-not-trv | curtain_motor | 105 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2293-zemismart-cf1sl3tj-curtain-not-trv | curtain_motor | 2 | position | — | missing_in_driver | Z2M defines position — no driver dpMapping |
| p2293-zemismart-cf1sl3tj-curtain-not-trv | curtain_motor | 3 | position | — | missing_in_driver | Z2M defines position — no driver dpMapping |
| p2293-zemismart-cf1sl3tj-curtain-not-trv | curtain_motor | 5 | reverse_direction | — | missing_in_driver | Z2M defines reverse_direction — no driver dpMapping |
| p2293-zemismart-cf1sl3tj-curtain-not-trv | curtain_motor | 12 | motor_fault | — | missing_in_driver | Z2M defines motor_fault — no driver dpMapping |
| p2293-zemismart-cf1sl3tj-curtain-not-trv | curtain_motor | 13 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| p2293-zemismart-cf1sl3tj-curtain-not-trv | curtain_motor | 16 | border | — | missing_in_driver | Z2M defines border — no driver dpMapping |
| p2293-zemismart-cf1sl3tj-curtain-not-trv | curtain_motor | 20 | click_control | — | missing_in_driver | Z2M defines click_control — no driver dpMapping |
| p2295-zemismart-68nvbi09-typo-curtain | curtain_motor | 2 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2295-zemismart-68nvbi09-typo-curtain | curtain_motor | 3 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2295-zemismart-68nvbi09-typo-curtain | curtain_motor | 4 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2295-zemismart-68nvbi09-typo-curtain | curtain_motor | 5 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2295-zemismart-68nvbi09-typo-curtain | curtain_motor | 6 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2295-zemismart-68nvbi09-typo-curtain | curtain_motor | 7 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2295-zemismart-68nvbi09-typo-curtain | curtain_motor | 8 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2295-zemismart-68nvbi09-typo-curtain | curtain_motor | 9 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2295-zemismart-68nvbi09-typo-curtain | curtain_motor | 10 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2295-zemismart-68nvbi09-typo-curtain | curtain_motor | 12 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2295-zemismart-68nvbi09-typo-curtain | curtain_motor | 13 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2295-zemismart-68nvbi09-typo-curtain | curtain_motor | 14 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2295-zemismart-68nvbi09-typo-curtain | curtain_motor | 15 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2295-zemismart-68nvbi09-typo-curtain | curtain_motor | 16 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2295-zemismart-68nvbi09-typo-curtain | curtain_motor | 101 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2295-zemismart-68nvbi09-typo-curtain | curtain_motor | 102 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2295-zemismart-68nvbi09-typo-curtain | curtain_motor | 104 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2295-zemismart-68nvbi09-typo-curtain | curtain_motor | 105 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2295-zemismart-68nvbi09-typo-curtain | curtain_motor | 2 | position | — | missing_in_driver | Z2M defines position — no driver dpMapping |
| p2295-zemismart-68nvbi09-typo-curtain | curtain_motor | 3 | position | — | missing_in_driver | Z2M defines position — no driver dpMapping |
| p2295-zemismart-68nvbi09-typo-curtain | curtain_motor | 5 | reverse_direction | — | missing_in_driver | Z2M defines reverse_direction — no driver dpMapping |
| p2295-zemismart-68nvbi09-typo-curtain | curtain_motor | 12 | motor_fault | — | missing_in_driver | Z2M defines motor_fault — no driver dpMapping |
| p2295-zemismart-68nvbi09-typo-curtain | curtain_motor | 13 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| p2295-zemismart-68nvbi09-typo-curtain | curtain_motor | 16 | border | — | missing_in_driver | Z2M defines border — no driver dpMapping |
| p2295-zemismart-68nvbi09-typo-curtain | curtain_motor | 20 | click_control | — | missing_in_driver | Z2M defines click_control — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 2 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2295-zemismart-cover-siblings | curtain_motor | 3 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2295-zemismart-cover-siblings | curtain_motor | 4 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2295-zemismart-cover-siblings | curtain_motor | 5 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2295-zemismart-cover-siblings | curtain_motor | 6 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2295-zemismart-cover-siblings | curtain_motor | 7 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2295-zemismart-cover-siblings | curtain_motor | 8 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2295-zemismart-cover-siblings | curtain_motor | 9 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2295-zemismart-cover-siblings | curtain_motor | 10 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2295-zemismart-cover-siblings | curtain_motor | 12 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2295-zemismart-cover-siblings | curtain_motor | 13 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2295-zemismart-cover-siblings | curtain_motor | 14 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2295-zemismart-cover-siblings | curtain_motor | 15 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2295-zemismart-cover-siblings | curtain_motor | 16 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2295-zemismart-cover-siblings | curtain_motor | 101 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2295-zemismart-cover-siblings | curtain_motor | 102 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2295-zemismart-cover-siblings | curtain_motor | 104 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2295-zemismart-cover-siblings | curtain_motor | 105 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2295-zemismart-cover-siblings | curtain_motor | 2 | position | — | missing_in_driver | Z2M defines position — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 3 | position | — | missing_in_driver | Z2M defines position — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 5 | reverse_direction | — | missing_in_driver | Z2M defines reverse_direction — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 12 | motor_fault | — | missing_in_driver | Z2M defines motor_fault — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 13 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 16 | border | — | missing_in_driver | Z2M defines border — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 20 | click_control | — | missing_in_driver | Z2M defines click_control — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 2 | position | — | missing_in_driver | Z2M defines position — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 3 | position | — | missing_in_driver | Z2M defines position — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 5 | reverse_direction | — | missing_in_driver | Z2M defines reverse_direction — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 12 | motor_fault | — | missing_in_driver | Z2M defines motor_fault — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 13 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 16 | border | — | missing_in_driver | Z2M defines border — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 20 | click_control | — | missing_in_driver | Z2M defines click_control — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 2 | position | — | missing_in_driver | Z2M defines position — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 3 | position | — | missing_in_driver | Z2M defines position — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 5 | reverse_direction | — | missing_in_driver | Z2M defines reverse_direction — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 12 | motor_fault | — | missing_in_driver | Z2M defines motor_fault — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 13 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 16 | border | — | missing_in_driver | Z2M defines border — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 20 | click_control | — | missing_in_driver | Z2M defines click_control — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 2 | position | — | missing_in_driver | Z2M defines position — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 3 | position | — | missing_in_driver | Z2M defines position — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 5 | reverse_direction | — | missing_in_driver | Z2M defines reverse_direction — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 12 | motor_fault | — | missing_in_driver | Z2M defines motor_fault — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 13 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 16 | border | — | missing_in_driver | Z2M defines border — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 20 | click_control | — | missing_in_driver | Z2M defines click_control — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 2 | position | — | missing_in_driver | Z2M defines position — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 3 | position | — | missing_in_driver | Z2M defines position — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 5 | reverse_direction | — | missing_in_driver | Z2M defines reverse_direction — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 12 | motor_fault | — | missing_in_driver | Z2M defines motor_fault — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 13 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 16 | border | — | missing_in_driver | Z2M defines border — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 20 | click_control | — | missing_in_driver | Z2M defines click_control — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 2 | position | — | missing_in_driver | Z2M defines position — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 3 | position | — | missing_in_driver | Z2M defines position — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 5 | reverse_direction | — | missing_in_driver | Z2M defines reverse_direction — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 12 | motor_fault | — | missing_in_driver | Z2M defines motor_fault — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 13 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 16 | border | — | missing_in_driver | Z2M defines border — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 20 | click_control | — | missing_in_driver | Z2M defines click_control — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 2 | position | — | missing_in_driver | Z2M defines position — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 3 | position | — | missing_in_driver | Z2M defines position — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 5 | reverse_direction | — | missing_in_driver | Z2M defines reverse_direction — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 12 | motor_fault | — | missing_in_driver | Z2M defines motor_fault — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 13 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 16 | border | — | missing_in_driver | Z2M defines border — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 20 | click_control | — | missing_in_driver | Z2M defines click_control — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 2 | position | — | missing_in_driver | Z2M defines position — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 3 | position | — | missing_in_driver | Z2M defines position — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 5 | reverse_direction | — | missing_in_driver | Z2M defines reverse_direction — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 12 | motor_fault | — | missing_in_driver | Z2M defines motor_fault — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 13 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 16 | border | — | missing_in_driver | Z2M defines border — no driver dpMapping |
| p2295-zemismart-cover-siblings | curtain_motor | 20 | click_control | — | missing_in_driver | Z2M defines click_control — no driver dpMapping |
| p2297-m6lwazh9-tze210-ts0301-curtain | curtain_motor | 2 | position | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2297-m6lwazh9-tze210-ts0301-curtain | curtain_motor | 3 | position | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2297-m6lwazh9-tze210-ts0301-curtain | curtain_motor | 4 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2297-m6lwazh9-tze210-ts0301-curtain | curtain_motor | 5 | reverse_direction | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2297-m6lwazh9-tze210-ts0301-curtain | curtain_motor | 6 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2297-m6lwazh9-tze210-ts0301-curtain | curtain_motor | 7 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2297-m6lwazh9-tze210-ts0301-curtain | curtain_motor | 8 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2297-m6lwazh9-tze210-ts0301-curtain | curtain_motor | 9 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2297-m6lwazh9-tze210-ts0301-curtain | curtain_motor | 10 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2297-m6lwazh9-tze210-ts0301-curtain | curtain_motor | 12 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2297-m6lwazh9-tze210-ts0301-curtain | curtain_motor | 13 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2297-m6lwazh9-tze210-ts0301-curtain | curtain_motor | 14 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2297-m6lwazh9-tze210-ts0301-curtain | curtain_motor | 15 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2297-m6lwazh9-tze210-ts0301-curtain | curtain_motor | 16 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2297-m6lwazh9-tze210-ts0301-curtain | curtain_motor | 101 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2297-m6lwazh9-tze210-ts0301-curtain | curtain_motor | 102 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2297-m6lwazh9-tze210-ts0301-curtain | curtain_motor | 104 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2297-m6lwazh9-tze210-ts0301-curtain | curtain_motor | 105 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2297-m6lwazh9-tze200-ts0601-curtain | curtain_motor | 2 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2297-m6lwazh9-tze200-ts0601-curtain | curtain_motor | 3 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2297-m6lwazh9-tze200-ts0601-curtain | curtain_motor | 4 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2297-m6lwazh9-tze200-ts0601-curtain | curtain_motor | 5 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2297-m6lwazh9-tze200-ts0601-curtain | curtain_motor | 6 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2297-m6lwazh9-tze200-ts0601-curtain | curtain_motor | 7 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2297-m6lwazh9-tze200-ts0601-curtain | curtain_motor | 8 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2297-m6lwazh9-tze200-ts0601-curtain | curtain_motor | 9 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2297-m6lwazh9-tze200-ts0601-curtain | curtain_motor | 10 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2297-m6lwazh9-tze200-ts0601-curtain | curtain_motor | 12 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2297-m6lwazh9-tze200-ts0601-curtain | curtain_motor | 13 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2297-m6lwazh9-tze200-ts0601-curtain | curtain_motor | 14 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2297-m6lwazh9-tze200-ts0601-curtain | curtain_motor | 15 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2297-m6lwazh9-tze200-ts0601-curtain | curtain_motor | 16 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2297-m6lwazh9-tze200-ts0601-curtain | curtain_motor | 101 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2297-m6lwazh9-tze200-ts0601-curtain | curtain_motor | 102 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2297-m6lwazh9-tze200-ts0601-curtain | curtain_motor | 104 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2297-m6lwazh9-tze200-ts0601-curtain | curtain_motor | 105 | — | — | missing_in_driver | knowledge documents DP — not in driver compose/device |
| p2363-curtain-ef00-hybrid-timeout | curtain_motor | 2 | position | — | missing_in_driver | Z2M defines position — no driver dpMapping |
| p2363-curtain-ef00-hybrid-timeout | curtain_motor | 3 | position | — | missing_in_driver | Z2M defines position — no driver dpMapping |
| p2363-curtain-ef00-hybrid-timeout | curtain_motor | 4 | opening_mode | — | missing_in_driver | Z2M defines opening_mode — no driver dpMapping |
| p2363-curtain-ef00-hybrid-timeout | curtain_motor | 7 | work_state | — | missing_in_driver | Z2M defines work_state — no driver dpMapping |
| p2363-curtain-ef00-hybrid-timeout | curtain_motor | 13 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| p2363-curtain-ef00-hybrid-timeout | curtain_motor | 101 | motor_direction | — | missing_in_driver | Z2M defines motor_direction — no driver dpMapping |
| p2363-curtain-ef00-hybrid-timeout | curtain_motor | 102 | set_upper_limit | — | missing_in_driver | Z2M defines set_upper_limit — no driver dpMapping |
| p2363-curtain-ef00-hybrid-timeout | curtain_motor | 104 | illuminance | — | missing_in_driver | Z2M defines illuminance — no driver dpMapping |
| p2363-curtain-ef00-hybrid-timeout | curtain_motor | 107 | factory_reset | — | missing_in_driver | Z2M defines factory_reset — no driver dpMapping |
| p2363-curtain-ef00-hybrid-timeout | curtain_motor | 2 | position | — | missing_in_driver | Z2M defines position — no driver dpMapping |
| p2363-curtain-ef00-hybrid-timeout | curtain_motor | 3 | position | — | missing_in_driver | Z2M defines position — no driver dpMapping |
| p2363-curtain-ef00-hybrid-timeout | curtain_motor | 4 | opening_mode | — | missing_in_driver | Z2M defines opening_mode — no driver dpMapping |
| p2363-curtain-ef00-hybrid-timeout | curtain_motor | 7 | work_state | — | missing_in_driver | Z2M defines work_state — no driver dpMapping |
| p2363-curtain-ef00-hybrid-timeout | curtain_motor | 13 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| p2363-curtain-ef00-hybrid-timeout | curtain_motor | 101 | motor_direction | — | missing_in_driver | Z2M defines motor_direction — no driver dpMapping |
| p2363-curtain-ef00-hybrid-timeout | curtain_motor | 102 | set_upper_limit | — | missing_in_driver | Z2M defines set_upper_limit — no driver dpMapping |
| p2363-curtain-ef00-hybrid-timeout | curtain_motor | 104 | illuminance | — | missing_in_driver | Z2M defines illuminance — no driver dpMapping |
| p2363-curtain-ef00-hybrid-timeout | curtain_motor | 107 | factory_reset | — | missing_in_driver | Z2M defines factory_reset — no driver dpMapping |
| p2363-curtain-ef00-hybrid-timeout | curtain_motor | 8 | position | — | missing_in_driver | Z2M defines position — no driver dpMapping |
| p2363-curtain-ef00-hybrid-timeout | curtain_motor | 9 | position | — | missing_in_driver | Z2M defines position — no driver dpMapping |
| p2363-curtain-ef00-hybrid-timeout | curtain_motor | 11 | control_back_mode | — | missing_in_driver | Z2M defines control_back_mode — no driver dpMapping |
| p2363-curtain-ef00-hybrid-timeout | curtain_motor | 19 | position_best | — | missing_in_driver | Z2M defines position_best — no driver dpMapping |
| p2363-curtain-ef00-hybrid-timeout | curtain_motor | 20 | click_control | — | missing_in_driver | Z2M defines click_control — no driver dpMapping |
| p2385-lerlink-r32ctezx-fan-switch | fan_controller | 1 | state | — | missing_in_driver | Z2M defines state — no driver dpMapping |
| p2385-lerlink-r32ctezx-fan-switch | fan_controller | 2 | countdown | — | missing_in_driver | Z2M defines countdown — no driver dpMapping |
| p2385-lerlink-r32ctezx-fan-switch | fan_controller | 3 | fan_speed | — | missing_in_driver | Z2M defines fan_speed — no driver dpMapping |
| p2385-lerlink-r32ctezx-fan-switch | fan_controller | 11 | power_on_behavior | — | missing_in_driver | Z2M defines power_on_behavior — no driver dpMapping |
| p2385-lerlink-r32ctezx-fan-switch | fan_controller | 1 | state | — | missing_in_driver | Z2M defines state — no driver dpMapping |
| p2385-lerlink-r32ctezx-fan-switch | fan_controller | 2 | countdown | — | missing_in_driver | Z2M defines countdown — no driver dpMapping |
| p2385-lerlink-r32ctezx-fan-switch | fan_controller | 3 | fan_speed | — | missing_in_driver | Z2M defines fan_speed — no driver dpMapping |
| p2385-lerlink-r32ctezx-fan-switch | fan_controller | 11 | power_on_behavior | — | missing_in_driver | Z2M defines power_on_behavior — no driver dpMapping |
| p2405-0ints6wl-soil-not-curtain | soil_sensor | 3 | soil_moisture | — | missing_in_driver | Z2M defines soil_moisture — no driver dpMapping |
| p2405-0ints6wl-soil-not-curtain | soil_sensor | 5 | temperature | — | missing_in_driver | Z2M defines temperature — no driver dpMapping |
| p2405-0ints6wl-soil-not-curtain | soil_sensor | 14 | battery_state | — | missing_in_driver | Z2M defines battery_state — no driver dpMapping |
| p2405-0ints6wl-soil-not-curtain | soil_sensor | 101 | humidity | — | missing_in_driver | Z2M defines humidity — no driver dpMapping |
| p2405-0ints6wl-soil-not-curtain | soil_sensor | 102 | illuminance | — | missing_in_driver | Z2M defines illuminance — no driver dpMapping |
| p2405-0ints6wl-soil-not-curtain | soil_sensor | 103 | soil_sampling | — | missing_in_driver | Z2M defines soil_sampling — no driver dpMapping |
| p2405-0ints6wl-soil-not-curtain | soil_sensor | 104 | soil_calibration | — | missing_in_driver | Z2M defines soil_calibration — no driver dpMapping |
| p2405-0ints6wl-soil-not-curtain | soil_sensor | 105 | humidity_calibration | — | missing_in_driver | Z2M defines humidity_calibration — no driver dpMapping |
| p2405-0ints6wl-soil-not-curtain | soil_sensor | 106 | illuminance_calibration | — | missing_in_driver | Z2M defines illuminance_calibration — no driver dpMapping |
| p2405-0ints6wl-soil-not-curtain | soil_sensor | 107 | temperature_calibration | — | missing_in_driver | Z2M defines temperature_calibration — no driver dpMapping |
| p2405-0ints6wl-soil-not-curtain | soil_sensor | 110 | soil_warning | — | missing_in_driver | Z2M defines soil_warning — no driver dpMapping |
| p2405-0ints6wl-soil-not-curtain | soil_sensor | 111 | water_warning | — | missing_in_driver | Z2M defines water_warning — no driver dpMapping |
| p2405-81yrt3lo-power-clamp | power_clamp_meter | 111 | ac_frequency | — | missing_in_driver | Z2M defines ac_frequency — no driver dpMapping |
| p2405-81yrt3lo-power-clamp | power_clamp_meter | 112 | voltage | — | missing_in_driver | Z2M defines voltage — no driver dpMapping |
| p2405-81yrt3lo-power-clamp | power_clamp_meter | 129 | update_frequency | — | missing_in_driver | Z2M defines update_frequency — no driver dpMapping |
| p2405-tgvtvdoc-rain-sensor | rain_sensor | 103 | illuminance_maximum_today | — | missing_in_driver | Z2M defines illuminance_maximum_today — no driver dpMapping |
| p2405-tgvtvdoc-rain-sensor | rain_sensor | 105 | rain_intensity | — | missing_in_driver | Z2M defines rain_intensity — no driver dpMapping |
| p2405-tgvtvdoc-rain-sensor | rain_sensor | 103 | illuminance_maximum_today | — | missing_in_driver | Z2M defines illuminance_maximum_today — no driver dpMapping |
| p2405-tgvtvdoc-rain-sensor | rain_sensor | 105 | rain_intensity | — | missing_in_driver | Z2M defines rain_intensity — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 1 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 2 | static_detection_sensitivity | — | missing_in_driver | Z2M defines static_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 4 | static_detection_distance | — | missing_in_driver | Z2M defines static_detection_distance — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 101 | humidity | — | missing_in_driver | Z2M defines humidity — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 102 | fading_time | — | missing_in_driver | Z2M defines fading_time — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 103 | motion_state | — | missing_in_driver | Z2M defines motion_state — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 104 | humidity_calibration | — | missing_in_driver | Z2M defines humidity_calibration — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 105 | temperature_calibration | — | missing_in_driver | Z2M defines temperature_calibration — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 106 | illuminance | — | missing_in_driver | Z2M defines illuminance — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 107 | illuminance_interval | — | missing_in_driver | Z2M defines illuminance_interval — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 108 | indicator | — | missing_in_driver | Z2M defines indicator — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 109 | temperature_unit | — | missing_in_driver | Z2M defines temperature_unit — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 110 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 111 | temperature | — | missing_in_driver | Z2M defines temperature — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 112 | motion_detection_mode | — | missing_in_driver | Z2M defines motion_detection_mode — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 123 | motion_detection_sensitivity | — | missing_in_driver | Z2M defines motion_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 1 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 2 | static_detection_sensitivity | — | missing_in_driver | Z2M defines static_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 4 | static_detection_distance | — | missing_in_driver | Z2M defines static_detection_distance — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 101 | humidity | — | missing_in_driver | Z2M defines humidity — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 102 | fading_time | — | missing_in_driver | Z2M defines fading_time — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 103 | motion_state | — | missing_in_driver | Z2M defines motion_state — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 104 | humidity_calibration | — | missing_in_driver | Z2M defines humidity_calibration — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 105 | temperature_calibration | — | missing_in_driver | Z2M defines temperature_calibration — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 106 | illuminance | — | missing_in_driver | Z2M defines illuminance — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 107 | illuminance_interval | — | missing_in_driver | Z2M defines illuminance_interval — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 108 | indicator | — | missing_in_driver | Z2M defines indicator — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 109 | temperature_unit | — | missing_in_driver | Z2M defines temperature_unit — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 110 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 111 | temperature | — | missing_in_driver | Z2M defines temperature — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 112 | motion_detection_mode | — | missing_in_driver | Z2M defines motion_detection_mode — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 123 | motion_detection_sensitivity | — | missing_in_driver | Z2M defines motion_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 1 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 2 | static_detection_sensitivity | — | missing_in_driver | Z2M defines static_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 4 | static_detection_distance | — | missing_in_driver | Z2M defines static_detection_distance — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 101 | humidity | — | missing_in_driver | Z2M defines humidity — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 102 | fading_time | — | missing_in_driver | Z2M defines fading_time — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 103 | motion_state | — | missing_in_driver | Z2M defines motion_state — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 104 | humidity_calibration | — | missing_in_driver | Z2M defines humidity_calibration — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 105 | temperature_calibration | — | missing_in_driver | Z2M defines temperature_calibration — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 106 | illuminance | — | missing_in_driver | Z2M defines illuminance — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 107 | illuminance_interval | — | missing_in_driver | Z2M defines illuminance_interval — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 108 | indicator | — | missing_in_driver | Z2M defines indicator — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 109 | temperature_unit | — | missing_in_driver | Z2M defines temperature_unit — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 110 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 111 | temperature | — | missing_in_driver | Z2M defines temperature — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 112 | motion_detection_mode | — | missing_in_driver | Z2M defines motion_detection_mode — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 123 | motion_detection_sensitivity | — | missing_in_driver | Z2M defines motion_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 1 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 2 | static_detection_sensitivity | — | missing_in_driver | Z2M defines static_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 4 | static_detection_distance | — | missing_in_driver | Z2M defines static_detection_distance — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 101 | humidity | — | missing_in_driver | Z2M defines humidity — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 102 | fading_time | — | missing_in_driver | Z2M defines fading_time — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 103 | motion_state | — | missing_in_driver | Z2M defines motion_state — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 104 | humidity_calibration | — | missing_in_driver | Z2M defines humidity_calibration — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 105 | temperature_calibration | — | missing_in_driver | Z2M defines temperature_calibration — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 106 | illuminance | — | missing_in_driver | Z2M defines illuminance — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 107 | illuminance_interval | — | missing_in_driver | Z2M defines illuminance_interval — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 108 | indicator | — | missing_in_driver | Z2M defines indicator — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 109 | temperature_unit | — | missing_in_driver | Z2M defines temperature_unit — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 110 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 111 | temperature | — | missing_in_driver | Z2M defines temperature — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 112 | motion_detection_mode | — | missing_in_driver | Z2M defines motion_detection_mode — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 123 | motion_detection_sensitivity | — | missing_in_driver | Z2M defines motion_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 1 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 2 | static_detection_sensitivity | — | missing_in_driver | Z2M defines static_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 4 | static_detection_distance | — | missing_in_driver | Z2M defines static_detection_distance — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 101 | humidity | — | missing_in_driver | Z2M defines humidity — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 102 | fading_time | — | missing_in_driver | Z2M defines fading_time — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 103 | motion_state | — | missing_in_driver | Z2M defines motion_state — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 104 | humidity_calibration | — | missing_in_driver | Z2M defines humidity_calibration — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 105 | temperature_calibration | — | missing_in_driver | Z2M defines temperature_calibration — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 106 | illuminance | — | missing_in_driver | Z2M defines illuminance — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 107 | illuminance_interval | — | missing_in_driver | Z2M defines illuminance_interval — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 108 | indicator | — | missing_in_driver | Z2M defines indicator — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 109 | temperature_unit | — | missing_in_driver | Z2M defines temperature_unit — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 110 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 111 | temperature | — | missing_in_driver | Z2M defines temperature — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 112 | motion_detection_mode | — | missing_in_driver | Z2M defines motion_detection_mode — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 123 | motion_detection_sensitivity | — | missing_in_driver | Z2M defines motion_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 1 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 2 | static_detection_sensitivity | — | missing_in_driver | Z2M defines static_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 4 | static_detection_distance | — | missing_in_driver | Z2M defines static_detection_distance — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 101 | humidity | — | missing_in_driver | Z2M defines humidity — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 102 | fading_time | — | missing_in_driver | Z2M defines fading_time — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 103 | motion_state | — | missing_in_driver | Z2M defines motion_state — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 104 | humidity_calibration | — | missing_in_driver | Z2M defines humidity_calibration — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 105 | temperature_calibration | — | missing_in_driver | Z2M defines temperature_calibration — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 106 | illuminance | — | missing_in_driver | Z2M defines illuminance — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 107 | illuminance_interval | — | missing_in_driver | Z2M defines illuminance_interval — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 108 | indicator | — | missing_in_driver | Z2M defines indicator — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 109 | temperature_unit | — | missing_in_driver | Z2M defines temperature_unit — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 110 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 111 | temperature | — | missing_in_driver | Z2M defines temperature — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 112 | motion_detection_mode | — | missing_in_driver | Z2M defines motion_detection_mode — no driver dpMapping |
| hobeian-zg204zh-tze | presence_sensor_radar | 123 | motion_detection_sensitivity | — | missing_in_driver | Z2M defines motion_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 1 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 2 | static_detection_sensitivity | — | missing_in_driver | Z2M defines static_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 3 | mov_minimum_distance | — | missing_in_driver | Z2M defines mov_minimum_distance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 4 | static_detection_distance | — | missing_in_driver | Z2M defines static_detection_distance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 101 | motion_state | — | missing_in_driver | Z2M defines motion_state — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 102 | fading_time | — | missing_in_driver | Z2M defines fading_time — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 103 | motion_false_detection | — | missing_in_driver | Z2M defines motion_false_detection — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 104 | medium_motion_detection_distance | — | missing_in_driver | Z2M defines medium_motion_detection_distance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 105 | medium_motion_detection_sensitivity | — | missing_in_driver | Z2M defines medium_motion_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 106 | illuminance | — | missing_in_driver | Z2M defines illuminance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 107 | indicator | — | missing_in_driver | Z2M defines indicator — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 108 | small_detection_distance | — | missing_in_driver | Z2M defines small_detection_distance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 109 | small_detection_sensitivity | — | missing_in_driver | Z2M defines small_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 110 | micro_minimum_distance | — | missing_in_driver | Z2M defines micro_minimum_distance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 111 | motionless_minimum_distance | — | missing_in_driver | Z2M defines motionless_minimum_distance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 112 | reset_setting | — | missing_in_driver | Z2M defines reset_setting — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 113 | breathe_false_detection | — | missing_in_driver | Z2M defines breathe_false_detection — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 114 | time | — | missing_in_driver | Z2M defines time — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 115 | alarm_time | — | missing_in_driver | Z2M defines alarm_time — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 116 | alarm_volume | — | missing_in_driver | Z2M defines alarm_volume — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 117 | working_mode | — | missing_in_driver | Z2M defines working_mode — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 118 | auto1 | — | missing_in_driver | Z2M defines auto1 — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 119 | auto2 | — | missing_in_driver | Z2M defines auto2 — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 120 | auto3 | — | missing_in_driver | Z2M defines auto3 — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 121 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 122 | motion_detection_mode | — | missing_in_driver | Z2M defines motion_detection_mode — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 123 | motion_detection_sensitivity | — | missing_in_driver | Z2M defines motion_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 1 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 2 | static_detection_sensitivity | — | missing_in_driver | Z2M defines static_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 4 | static_detection_distance | — | missing_in_driver | Z2M defines static_detection_distance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 101 | motion_state | — | missing_in_driver | Z2M defines motion_state — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 102 | fading_time | — | missing_in_driver | Z2M defines fading_time — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 106 | illuminance | — | missing_in_driver | Z2M defines illuminance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 107 | indicator | — | missing_in_driver | Z2M defines indicator — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 121 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 122 | motion_detection_mode | — | missing_in_driver | Z2M defines motion_detection_mode — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 123 | motion_detection_sensitivity | — | missing_in_driver | Z2M defines motion_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 1 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 2 | static_detection_sensitivity | — | missing_in_driver | Z2M defines static_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 3 | mov_minimum_distance | — | missing_in_driver | Z2M defines mov_minimum_distance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 4 | static_detection_distance | — | missing_in_driver | Z2M defines static_detection_distance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 101 | motion_state | — | missing_in_driver | Z2M defines motion_state — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 102 | fading_time | — | missing_in_driver | Z2M defines fading_time — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 103 | motion_false_detection | — | missing_in_driver | Z2M defines motion_false_detection — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 104 | medium_motion_detection_distance | — | missing_in_driver | Z2M defines medium_motion_detection_distance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 105 | medium_motion_detection_sensitivity | — | missing_in_driver | Z2M defines medium_motion_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 106 | illuminance | — | missing_in_driver | Z2M defines illuminance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 107 | indicator | — | missing_in_driver | Z2M defines indicator — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 108 | small_detection_distance | — | missing_in_driver | Z2M defines small_detection_distance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 109 | small_detection_sensitivity | — | missing_in_driver | Z2M defines small_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 110 | micro_minimum_distance | — | missing_in_driver | Z2M defines micro_minimum_distance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 111 | motionless_minimum_distance | — | missing_in_driver | Z2M defines motionless_minimum_distance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 112 | reset_setting | — | missing_in_driver | Z2M defines reset_setting — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 113 | breathe_false_detection | — | missing_in_driver | Z2M defines breathe_false_detection — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 114 | time | — | missing_in_driver | Z2M defines time — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 115 | alarm_time | — | missing_in_driver | Z2M defines alarm_time — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 116 | alarm_volume | — | missing_in_driver | Z2M defines alarm_volume — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 117 | working_mode | — | missing_in_driver | Z2M defines working_mode — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 118 | auto1 | — | missing_in_driver | Z2M defines auto1 — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 119 | auto2 | — | missing_in_driver | Z2M defines auto2 — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 120 | auto3 | — | missing_in_driver | Z2M defines auto3 — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 121 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 122 | motion_detection_mode | — | missing_in_driver | Z2M defines motion_detection_mode — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 123 | motion_detection_sensitivity | — | missing_in_driver | Z2M defines motion_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 1 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 2 | static_detection_sensitivity | — | missing_in_driver | Z2M defines static_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 3 | mov_minimum_distance | — | missing_in_driver | Z2M defines mov_minimum_distance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 4 | static_detection_distance | — | missing_in_driver | Z2M defines static_detection_distance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 101 | motion_state | — | missing_in_driver | Z2M defines motion_state — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 102 | fading_time | — | missing_in_driver | Z2M defines fading_time — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 103 | motion_false_detection | — | missing_in_driver | Z2M defines motion_false_detection — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 104 | medium_motion_detection_distance | — | missing_in_driver | Z2M defines medium_motion_detection_distance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 105 | medium_motion_detection_sensitivity | — | missing_in_driver | Z2M defines medium_motion_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 106 | illuminance | — | missing_in_driver | Z2M defines illuminance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 107 | indicator | — | missing_in_driver | Z2M defines indicator — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 108 | small_detection_distance | — | missing_in_driver | Z2M defines small_detection_distance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 109 | small_detection_sensitivity | — | missing_in_driver | Z2M defines small_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 110 | micro_minimum_distance | — | missing_in_driver | Z2M defines micro_minimum_distance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 111 | motionless_minimum_distance | — | missing_in_driver | Z2M defines motionless_minimum_distance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 112 | reset_setting | — | missing_in_driver | Z2M defines reset_setting — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 113 | breathe_false_detection | — | missing_in_driver | Z2M defines breathe_false_detection — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 114 | time | — | missing_in_driver | Z2M defines time — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 115 | alarm_time | — | missing_in_driver | Z2M defines alarm_time — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 116 | alarm_volume | — | missing_in_driver | Z2M defines alarm_volume — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 117 | working_mode | — | missing_in_driver | Z2M defines working_mode — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 118 | auto1 | — | missing_in_driver | Z2M defines auto1 — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 119 | auto2 | — | missing_in_driver | Z2M defines auto2 — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 120 | auto3 | — | missing_in_driver | Z2M defines auto3 — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 121 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 122 | motion_detection_mode | — | missing_in_driver | Z2M defines motion_detection_mode — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 123 | motion_detection_sensitivity | — | missing_in_driver | Z2M defines motion_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 1 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 2 | static_detection_sensitivity | — | missing_in_driver | Z2M defines static_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 4 | static_detection_distance | — | missing_in_driver | Z2M defines static_detection_distance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 101 | motion_state | — | missing_in_driver | Z2M defines motion_state — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 102 | fading_time | — | missing_in_driver | Z2M defines fading_time — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 106 | illuminance | — | missing_in_driver | Z2M defines illuminance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 107 | indicator | — | missing_in_driver | Z2M defines indicator — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 121 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 122 | motion_detection_mode | — | missing_in_driver | Z2M defines motion_detection_mode — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 123 | motion_detection_sensitivity | — | missing_in_driver | Z2M defines motion_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 1 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 2 | static_detection_sensitivity | — | missing_in_driver | Z2M defines static_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 4 | static_detection_distance | — | missing_in_driver | Z2M defines static_detection_distance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 101 | motion_state | — | missing_in_driver | Z2M defines motion_state — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 102 | fading_time | — | missing_in_driver | Z2M defines fading_time — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 106 | illuminance | — | missing_in_driver | Z2M defines illuminance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 107 | indicator | — | missing_in_driver | Z2M defines indicator — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 121 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 122 | motion_detection_mode | — | missing_in_driver | Z2M defines motion_detection_mode — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 123 | motion_detection_sensitivity | — | missing_in_driver | Z2M defines motion_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 1 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 2 | static_detection_sensitivity | — | missing_in_driver | Z2M defines static_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 4 | static_detection_distance | — | missing_in_driver | Z2M defines static_detection_distance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 101 | motion_state | — | missing_in_driver | Z2M defines motion_state — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 102 | fading_time | — | missing_in_driver | Z2M defines fading_time — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 106 | illuminance | — | missing_in_driver | Z2M defines illuminance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 107 | indicator | — | missing_in_driver | Z2M defines indicator — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 121 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 122 | motion_detection_mode | — | missing_in_driver | Z2M defines motion_detection_mode — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 123 | motion_detection_sensitivity | — | missing_in_driver | Z2M defines motion_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 1 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 2 | static_detection_sensitivity | — | missing_in_driver | Z2M defines static_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 4 | static_detection_distance | — | missing_in_driver | Z2M defines static_detection_distance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 101 | motion_state | — | missing_in_driver | Z2M defines motion_state — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 102 | fading_time | — | missing_in_driver | Z2M defines fading_time — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 106 | illuminance | — | missing_in_driver | Z2M defines illuminance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 107 | indicator | — | missing_in_driver | Z2M defines indicator — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 121 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 122 | motion_detection_mode | — | missing_in_driver | Z2M defines motion_detection_mode — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 123 | motion_detection_sensitivity | — | missing_in_driver | Z2M defines motion_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 1 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 2 | static_detection_sensitivity | — | missing_in_driver | Z2M defines static_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 4 | static_detection_distance | — | missing_in_driver | Z2M defines static_detection_distance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 101 | motion_state | — | missing_in_driver | Z2M defines motion_state — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 102 | fading_time | — | missing_in_driver | Z2M defines fading_time — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 106 | illuminance | — | missing_in_driver | Z2M defines illuminance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 107 | indicator | — | missing_in_driver | Z2M defines indicator — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 121 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 122 | motion_detection_mode | — | missing_in_driver | Z2M defines motion_detection_mode — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 123 | motion_detection_sensitivity | — | missing_in_driver | Z2M defines motion_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 1 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 2 | static_detection_sensitivity | — | missing_in_driver | Z2M defines static_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 4 | static_detection_distance | — | missing_in_driver | Z2M defines static_detection_distance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 101 | motion_state | — | missing_in_driver | Z2M defines motion_state — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 102 | fading_time | — | missing_in_driver | Z2M defines fading_time — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 106 | illuminance | — | missing_in_driver | Z2M defines illuminance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 107 | indicator | — | missing_in_driver | Z2M defines indicator — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 121 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 122 | motion_detection_mode | — | missing_in_driver | Z2M defines motion_detection_mode — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 123 | motion_detection_sensitivity | — | missing_in_driver | Z2M defines motion_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 1 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 2 | static_detection_sensitivity | — | missing_in_driver | Z2M defines static_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 4 | static_detection_distance | — | missing_in_driver | Z2M defines static_detection_distance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 101 | motion_state | — | missing_in_driver | Z2M defines motion_state — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 102 | fading_time | — | missing_in_driver | Z2M defines fading_time — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 106 | illuminance | — | missing_in_driver | Z2M defines illuminance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 107 | indicator | — | missing_in_driver | Z2M defines indicator — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 121 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 122 | motion_detection_mode | — | missing_in_driver | Z2M defines motion_detection_mode — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 123 | motion_detection_sensitivity | — | missing_in_driver | Z2M defines motion_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 1 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 2 | static_detection_sensitivity | — | missing_in_driver | Z2M defines static_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 4 | static_detection_distance | — | missing_in_driver | Z2M defines static_detection_distance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 101 | motion_state | — | missing_in_driver | Z2M defines motion_state — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 102 | fading_time | — | missing_in_driver | Z2M defines fading_time — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 106 | illuminance | — | missing_in_driver | Z2M defines illuminance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 107 | indicator | — | missing_in_driver | Z2M defines indicator — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 121 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 122 | motion_detection_mode | — | missing_in_driver | Z2M defines motion_detection_mode — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 123 | motion_detection_sensitivity | — | missing_in_driver | Z2M defines motion_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 1 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 2 | static_detection_sensitivity | — | missing_in_driver | Z2M defines static_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 4 | static_detection_distance | — | missing_in_driver | Z2M defines static_detection_distance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 101 | motion_state | — | missing_in_driver | Z2M defines motion_state — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 102 | fading_time | — | missing_in_driver | Z2M defines fading_time — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 106 | illuminance | — | missing_in_driver | Z2M defines illuminance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 107 | indicator | — | missing_in_driver | Z2M defines indicator — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 121 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 122 | motion_detection_mode | — | missing_in_driver | Z2M defines motion_detection_mode — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 123 | motion_detection_sensitivity | — | missing_in_driver | Z2M defines motion_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 1 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 2 | static_detection_sensitivity | — | missing_in_driver | Z2M defines static_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 4 | static_detection_distance | — | missing_in_driver | Z2M defines static_detection_distance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 101 | motion_state | — | missing_in_driver | Z2M defines motion_state — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 102 | fading_time | — | missing_in_driver | Z2M defines fading_time — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 106 | illuminance | — | missing_in_driver | Z2M defines illuminance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 107 | indicator | — | missing_in_driver | Z2M defines indicator — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 121 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 122 | motion_detection_mode | — | missing_in_driver | Z2M defines motion_detection_mode — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 123 | motion_detection_sensitivity | — | missing_in_driver | Z2M defines motion_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 1 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 2 | static_detection_sensitivity | — | missing_in_driver | Z2M defines static_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 4 | static_detection_distance | — | missing_in_driver | Z2M defines static_detection_distance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 101 | motion_state | — | missing_in_driver | Z2M defines motion_state — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 102 | fading_time | — | missing_in_driver | Z2M defines fading_time — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 106 | illuminance | — | missing_in_driver | Z2M defines illuminance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 107 | indicator | — | missing_in_driver | Z2M defines indicator — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 121 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 122 | motion_detection_mode | — | missing_in_driver | Z2M defines motion_detection_mode — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 123 | motion_detection_sensitivity | — | missing_in_driver | Z2M defines motion_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 1 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 2 | static_detection_sensitivity | — | missing_in_driver | Z2M defines static_detection_sensitivity — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 4 | static_detection_distance | — | missing_in_driver | Z2M defines static_detection_distance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 101 | motion_state | — | missing_in_driver | Z2M defines motion_state — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 102 | fading_time | — | missing_in_driver | Z2M defines fading_time — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 106 | illuminance | — | missing_in_driver | Z2M defines illuminance — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 107 | indicator | — | missing_in_driver | Z2M defines indicator — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 121 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 122 | motion_detection_mode | — | missing_in_driver | Z2M defines motion_detection_mode — no driver dpMapping |
| hobeian-zg204zm-tze | presence_sensor_radar | 123 | motion_detection_sensitivity | — | missing_in_driver | Z2M defines motion_detection_sensitivity — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 1 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 2 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 4 | distance | — | missing_in_driver | Z2M defines distance — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 101 | switch1 | — | missing_in_driver | Z2M defines switch1 — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 102 | switch2 | — | missing_in_driver | Z2M defines switch2 — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 103 | switch3 | — | missing_in_driver | Z2M defines switch3 — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 108 | trigger_switch | — | missing_in_driver | Z2M defines trigger_switch — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 111 | backlight | — | missing_in_driver | Z2M defines backlight — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 112 | power_outage_memory | — | missing_in_driver | Z2M defines power_outage_memory — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 113 | auto_on | — | missing_in_driver | Z2M defines auto_on — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 114 | trigger_hold | — | missing_in_driver | Z2M defines trigger_hold — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 115 | auto_off | — | missing_in_driver | Z2M defines auto_off — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 1 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 2 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 4 | distance | — | missing_in_driver | Z2M defines distance — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 101 | switch1 | — | missing_in_driver | Z2M defines switch1 — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 102 | switch2 | — | missing_in_driver | Z2M defines switch2 — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 103 | switch3 | — | missing_in_driver | Z2M defines switch3 — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 108 | trigger_switch | — | missing_in_driver | Z2M defines trigger_switch — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 111 | backlight | — | missing_in_driver | Z2M defines backlight — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 112 | power_outage_memory | — | missing_in_driver | Z2M defines power_outage_memory — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 113 | auto_on | — | missing_in_driver | Z2M defines auto_on — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 114 | trigger_hold | — | missing_in_driver | Z2M defines trigger_hold — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 115 | auto_off | — | missing_in_driver | Z2M defines auto_off — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 1 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 2 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 4 | distance | — | missing_in_driver | Z2M defines distance — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 101 | switch1 | — | missing_in_driver | Z2M defines switch1 — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 102 | switch2 | — | missing_in_driver | Z2M defines switch2 — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 103 | switch3 | — | missing_in_driver | Z2M defines switch3 — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 108 | trigger_switch | — | missing_in_driver | Z2M defines trigger_switch — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 111 | backlight | — | missing_in_driver | Z2M defines backlight — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 112 | power_outage_memory | — | missing_in_driver | Z2M defines power_outage_memory — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 113 | auto_on | — | missing_in_driver | Z2M defines auto_on — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 114 | trigger_hold | — | missing_in_driver | Z2M defines trigger_hold — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 115 | auto_off | — | missing_in_driver | Z2M defines auto_off — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 1 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 2 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 4 | distance | — | missing_in_driver | Z2M defines distance — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 101 | switch1 | — | missing_in_driver | Z2M defines switch1 — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 102 | switch2 | — | missing_in_driver | Z2M defines switch2 — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 103 | switch3 | — | missing_in_driver | Z2M defines switch3 — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 108 | trigger_switch | — | missing_in_driver | Z2M defines trigger_switch — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 111 | backlight | — | missing_in_driver | Z2M defines backlight — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 112 | power_outage_memory | — | missing_in_driver | Z2M defines power_outage_memory — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 113 | auto_on | — | missing_in_driver | Z2M defines auto_on — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 114 | trigger_hold | — | missing_in_driver | Z2M defines trigger_hold — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 115 | auto_off | — | missing_in_driver | Z2M defines auto_off — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 1 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 2 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 4 | distance | — | missing_in_driver | Z2M defines distance — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 101 | switch1 | — | missing_in_driver | Z2M defines switch1 — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 102 | switch2 | — | missing_in_driver | Z2M defines switch2 — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 103 | switch3 | — | missing_in_driver | Z2M defines switch3 — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 108 | trigger_switch | — | missing_in_driver | Z2M defines trigger_switch — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 111 | backlight | — | missing_in_driver | Z2M defines backlight — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 112 | power_outage_memory | — | missing_in_driver | Z2M defines power_outage_memory — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 113 | auto_on | — | missing_in_driver | Z2M defines auto_on — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 114 | trigger_hold | — | missing_in_driver | Z2M defines trigger_hold — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 115 | auto_off | — | missing_in_driver | Z2M defines auto_off — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 1 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 2 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 4 | distance | — | missing_in_driver | Z2M defines distance — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 101 | switch1 | — | missing_in_driver | Z2M defines switch1 — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 102 | switch2 | — | missing_in_driver | Z2M defines switch2 — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 103 | switch3 | — | missing_in_driver | Z2M defines switch3 — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 108 | trigger_switch | — | missing_in_driver | Z2M defines trigger_switch — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 111 | backlight | — | missing_in_driver | Z2M defines backlight — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 112 | power_outage_memory | — | missing_in_driver | Z2M defines power_outage_memory — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 113 | auto_on | — | missing_in_driver | Z2M defines auto_on — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 114 | trigger_hold | — | missing_in_driver | Z2M defines trigger_hold — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 115 | auto_off | — | missing_in_driver | Z2M defines auto_off — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 1 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 2 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 4 | distance | — | missing_in_driver | Z2M defines distance — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 101 | switch1 | — | missing_in_driver | Z2M defines switch1 — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 102 | switch2 | — | missing_in_driver | Z2M defines switch2 — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 103 | switch3 | — | missing_in_driver | Z2M defines switch3 — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 108 | trigger_switch | — | missing_in_driver | Z2M defines trigger_switch — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 111 | backlight | — | missing_in_driver | Z2M defines backlight — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 112 | power_outage_memory | — | missing_in_driver | Z2M defines power_outage_memory — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 113 | auto_on | — | missing_in_driver | Z2M defines auto_on — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 114 | trigger_hold | — | missing_in_driver | Z2M defines trigger_hold — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 115 | auto_off | — | missing_in_driver | Z2M defines auto_off — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 1 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 2 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 4 | distance | — | missing_in_driver | Z2M defines distance — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 101 | switch1 | — | missing_in_driver | Z2M defines switch1 — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 102 | switch2 | — | missing_in_driver | Z2M defines switch2 — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 103 | switch3 | — | missing_in_driver | Z2M defines switch3 — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 108 | trigger_switch | — | missing_in_driver | Z2M defines trigger_switch — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 111 | backlight | — | missing_in_driver | Z2M defines backlight — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 112 | power_outage_memory | — | missing_in_driver | Z2M defines power_outage_memory — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 113 | auto_on | — | missing_in_driver | Z2M defines auto_on — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 114 | trigger_hold | — | missing_in_driver | Z2M defines trigger_hold — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 115 | auto_off | — | missing_in_driver | Z2M defines auto_off — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 1 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 2 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 4 | distance | — | missing_in_driver | Z2M defines distance — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 101 | switch1 | — | missing_in_driver | Z2M defines switch1 — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 102 | switch2 | — | missing_in_driver | Z2M defines switch2 — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 103 | switch3 | — | missing_in_driver | Z2M defines switch3 — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 108 | trigger_switch | — | missing_in_driver | Z2M defines trigger_switch — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 111 | backlight | — | missing_in_driver | Z2M defines backlight — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 112 | power_outage_memory | — | missing_in_driver | Z2M defines power_outage_memory — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 113 | auto_on | — | missing_in_driver | Z2M defines auto_on — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 114 | trigger_hold | — | missing_in_driver | Z2M defines trigger_hold — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 115 | auto_off | — | missing_in_driver | Z2M defines auto_off — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 1 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 2 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 4 | distance | — | missing_in_driver | Z2M defines distance — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 101 | switch1 | — | missing_in_driver | Z2M defines switch1 — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 102 | switch2 | — | missing_in_driver | Z2M defines switch2 — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 103 | switch3 | — | missing_in_driver | Z2M defines switch3 — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 108 | trigger_switch | — | missing_in_driver | Z2M defines trigger_switch — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 111 | backlight | — | missing_in_driver | Z2M defines backlight — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 112 | power_outage_memory | — | missing_in_driver | Z2M defines power_outage_memory — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 113 | auto_on | — | missing_in_driver | Z2M defines auto_on — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 114 | trigger_hold | — | missing_in_driver | Z2M defines trigger_hold — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 115 | auto_off | — | missing_in_driver | Z2M defines auto_off — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 1 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 2 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 4 | distance | — | missing_in_driver | Z2M defines distance — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 101 | switch1 | — | missing_in_driver | Z2M defines switch1 — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 102 | switch2 | — | missing_in_driver | Z2M defines switch2 — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 103 | switch3 | — | missing_in_driver | Z2M defines switch3 — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 108 | trigger_switch | — | missing_in_driver | Z2M defines trigger_switch — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 111 | backlight | — | missing_in_driver | Z2M defines backlight — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 112 | power_outage_memory | — | missing_in_driver | Z2M defines power_outage_memory — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 113 | auto_on | — | missing_in_driver | Z2M defines auto_on — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 114 | trigger_hold | — | missing_in_driver | Z2M defines trigger_hold — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 115 | auto_off | — | missing_in_driver | Z2M defines auto_off — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 1 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 2 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 4 | distance | — | missing_in_driver | Z2M defines distance — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 101 | switch1 | — | missing_in_driver | Z2M defines switch1 — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 102 | switch2 | — | missing_in_driver | Z2M defines switch2 — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 103 | switch3 | — | missing_in_driver | Z2M defines switch3 — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 108 | trigger_switch | — | missing_in_driver | Z2M defines trigger_switch — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 111 | backlight | — | missing_in_driver | Z2M defines backlight — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 112 | power_outage_memory | — | missing_in_driver | Z2M defines power_outage_memory — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 113 | auto_on | — | missing_in_driver | Z2M defines auto_on — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 114 | trigger_hold | — | missing_in_driver | Z2M defines trigger_hold — no driver dpMapping |
| hobeian-zg302zm-sensing-switch | presence_sensor_radar | 115 | auto_off | — | missing_in_driver | Z2M defines auto_off — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 1 | switch_1 | — | missing_in_driver | Z2M defines switch_1 — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 2 | switch_2 | — | missing_in_driver | Z2M defines switch_2 — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 3 | switch_3 | — | missing_in_driver | Z2M defines switch_3 — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 14 | power_outage_memory | — | missing_in_driver | Z2M defines power_outage_memory — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 16 | backlight | — | missing_in_driver | Z2M defines backlight — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 101 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 102 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 103 | trigger_hold | — | missing_in_driver | Z2M defines trigger_hold — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 104 | auto_on | — | missing_in_driver | Z2M defines auto_on — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 105 | auto_off | — | missing_in_driver | Z2M defines auto_off — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 1 | switch_1 | — | missing_in_driver | Z2M defines switch_1 — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 2 | switch_2 | — | missing_in_driver | Z2M defines switch_2 — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 3 | switch_3 | — | missing_in_driver | Z2M defines switch_3 — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 14 | power_outage_memory | — | missing_in_driver | Z2M defines power_outage_memory — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 16 | backlight | — | missing_in_driver | Z2M defines backlight — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 101 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 102 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 103 | trigger_hold | — | missing_in_driver | Z2M defines trigger_hold — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 104 | auto_on | — | missing_in_driver | Z2M defines auto_on — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 105 | auto_off | — | missing_in_driver | Z2M defines auto_off — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 1 | switch_1 | — | missing_in_driver | Z2M defines switch_1 — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 2 | switch_2 | — | missing_in_driver | Z2M defines switch_2 — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 3 | switch_3 | — | missing_in_driver | Z2M defines switch_3 — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 14 | power_outage_memory | — | missing_in_driver | Z2M defines power_outage_memory — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 16 | backlight | — | missing_in_driver | Z2M defines backlight — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 101 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 102 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 103 | trigger_hold | — | missing_in_driver | Z2M defines trigger_hold — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 104 | auto_on | — | missing_in_driver | Z2M defines auto_on — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 105 | auto_off | — | missing_in_driver | Z2M defines auto_off — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 1 | switch_1 | — | missing_in_driver | Z2M defines switch_1 — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 2 | switch_2 | — | missing_in_driver | Z2M defines switch_2 — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 3 | switch_3 | — | missing_in_driver | Z2M defines switch_3 — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 14 | power_outage_memory | — | missing_in_driver | Z2M defines power_outage_memory — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 16 | backlight | — | missing_in_driver | Z2M defines backlight — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 101 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 102 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 103 | trigger_hold | — | missing_in_driver | Z2M defines trigger_hold — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 104 | auto_on | — | missing_in_driver | Z2M defines auto_on — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 105 | auto_off | — | missing_in_driver | Z2M defines auto_off — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 1 | switch_1 | — | missing_in_driver | Z2M defines switch_1 — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 2 | switch_2 | — | missing_in_driver | Z2M defines switch_2 — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 3 | switch_3 | — | missing_in_driver | Z2M defines switch_3 — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 14 | power_outage_memory | — | missing_in_driver | Z2M defines power_outage_memory — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 16 | backlight | — | missing_in_driver | Z2M defines backlight — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 101 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 102 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 103 | trigger_hold | — | missing_in_driver | Z2M defines trigger_hold — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 104 | auto_on | — | missing_in_driver | Z2M defines auto_on — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 105 | auto_off | — | missing_in_driver | Z2M defines auto_off — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 1 | switch_1 | — | missing_in_driver | Z2M defines switch_1 — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 2 | switch_2 | — | missing_in_driver | Z2M defines switch_2 — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 3 | switch_3 | — | missing_in_driver | Z2M defines switch_3 — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 14 | power_outage_memory | — | missing_in_driver | Z2M defines power_outage_memory — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 16 | backlight | — | missing_in_driver | Z2M defines backlight — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 101 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 102 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 103 | trigger_hold | — | missing_in_driver | Z2M defines trigger_hold — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 104 | auto_on | — | missing_in_driver | Z2M defines auto_on — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 105 | auto_off | — | missing_in_driver | Z2M defines auto_off — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 1 | switch_1 | — | missing_in_driver | Z2M defines switch_1 — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 2 | switch_2 | — | missing_in_driver | Z2M defines switch_2 — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 3 | switch_3 | — | missing_in_driver | Z2M defines switch_3 — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 14 | power_outage_memory | — | missing_in_driver | Z2M defines power_outage_memory — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 16 | backlight | — | missing_in_driver | Z2M defines backlight — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 101 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 102 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 103 | trigger_hold | — | missing_in_driver | Z2M defines trigger_hold — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 104 | auto_on | — | missing_in_driver | Z2M defines auto_on — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 105 | auto_off | — | missing_in_driver | Z2M defines auto_off — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 1 | switch_1 | — | missing_in_driver | Z2M defines switch_1 — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 2 | switch_2 | — | missing_in_driver | Z2M defines switch_2 — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 3 | switch_3 | — | missing_in_driver | Z2M defines switch_3 — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 14 | power_outage_memory | — | missing_in_driver | Z2M defines power_outage_memory — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 16 | backlight | — | missing_in_driver | Z2M defines backlight — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 101 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 102 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 103 | trigger_hold | — | missing_in_driver | Z2M defines trigger_hold — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 104 | auto_on | — | missing_in_driver | Z2M defines auto_on — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 105 | auto_off | — | missing_in_driver | Z2M defines auto_off — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 1 | switch_1 | — | missing_in_driver | Z2M defines switch_1 — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 2 | switch_2 | — | missing_in_driver | Z2M defines switch_2 — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 3 | switch_3 | — | missing_in_driver | Z2M defines switch_3 — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 14 | power_outage_memory | — | missing_in_driver | Z2M defines power_outage_memory — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 16 | backlight | — | missing_in_driver | Z2M defines backlight — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 101 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 102 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 103 | trigger_hold | — | missing_in_driver | Z2M defines trigger_hold — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 104 | auto_on | — | missing_in_driver | Z2M defines auto_on — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 105 | auto_off | — | missing_in_driver | Z2M defines auto_off — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 1 | switch_1 | — | missing_in_driver | Z2M defines switch_1 — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 2 | switch_2 | — | missing_in_driver | Z2M defines switch_2 — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 3 | switch_3 | — | missing_in_driver | Z2M defines switch_3 — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 14 | power_outage_memory | — | missing_in_driver | Z2M defines power_outage_memory — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 16 | backlight | — | missing_in_driver | Z2M defines backlight — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 101 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 102 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 103 | trigger_hold | — | missing_in_driver | Z2M defines trigger_hold — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 104 | auto_on | — | missing_in_driver | Z2M defines auto_on — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 105 | auto_off | — | missing_in_driver | Z2M defines auto_off — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 1 | switch_1 | — | missing_in_driver | Z2M defines switch_1 — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 2 | switch_2 | — | missing_in_driver | Z2M defines switch_2 — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 3 | switch_3 | — | missing_in_driver | Z2M defines switch_3 — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 14 | power_outage_memory | — | missing_in_driver | Z2M defines power_outage_memory — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 16 | backlight | — | missing_in_driver | Z2M defines backlight — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 101 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 102 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 103 | trigger_hold | — | missing_in_driver | Z2M defines trigger_hold — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 104 | auto_on | — | missing_in_driver | Z2M defines auto_on — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 105 | auto_off | — | missing_in_driver | Z2M defines auto_off — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 1 | switch_1 | — | missing_in_driver | Z2M defines switch_1 — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 2 | switch_2 | — | missing_in_driver | Z2M defines switch_2 — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 3 | switch_3 | — | missing_in_driver | Z2M defines switch_3 — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 14 | power_outage_memory | — | missing_in_driver | Z2M defines power_outage_memory — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 16 | backlight | — | missing_in_driver | Z2M defines backlight — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 101 | presence | — | missing_in_driver | Z2M defines presence — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 102 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 103 | trigger_hold | — | missing_in_driver | Z2M defines trigger_hold — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 104 | auto_on | — | missing_in_driver | Z2M defines auto_on — no driver dpMapping |
| hobeian-zg302zl-sensing-switch | presence_sensor_radar | 105 | auto_off | — | missing_in_driver | Z2M defines auto_off — no driver dpMapping |
| hobeian-zg102zm-vibration-contact | vibration_sensor | 4 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| hobeian-zg102zm-vibration-contact | vibration_sensor | 6 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| hobeian-zg102zm-vibration-contact | vibration_sensor | 4 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| hobeian-zg102zm-vibration-contact | vibration_sensor | 6 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| hobeian-zg102zm-vibration-contact | vibration_sensor | 4 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| hobeian-zg102zm-vibration-contact | vibration_sensor | 6 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| hobeian-zg102zm-vibration-contact | vibration_sensor | 4 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| hobeian-zg102zm-vibration-contact | vibration_sensor | 6 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| hobeian-zg102zm-vibration-contact | vibration_sensor | 4 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| hobeian-zg102zm-vibration-contact | vibration_sensor | 6 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| hobeian-zg102zm-vibration-contact | vibration_sensor | 4 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| hobeian-zg102zm-vibration-contact | vibration_sensor | 6 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 7 | tilt | — | missing_in_driver | Z2M defines tilt — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 102 | y | — | missing_in_driver | Z2M defines y — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 103 | z | — | missing_in_driver | Z2M defines z — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 104 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 105 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 7 | tilt | — | missing_in_driver | Z2M defines tilt — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 102 | y | — | missing_in_driver | Z2M defines y — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 103 | z | — | missing_in_driver | Z2M defines z — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 104 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 105 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 7 | tilt | — | missing_in_driver | Z2M defines tilt — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 102 | y | — | missing_in_driver | Z2M defines y — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 103 | z | — | missing_in_driver | Z2M defines z — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 104 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 105 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 7 | tilt | — | missing_in_driver | Z2M defines tilt — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 102 | y | — | missing_in_driver | Z2M defines y — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 103 | z | — | missing_in_driver | Z2M defines z — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 104 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 105 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 7 | tilt | — | missing_in_driver | Z2M defines tilt — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 102 | y | — | missing_in_driver | Z2M defines y — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 103 | z | — | missing_in_driver | Z2M defines z — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 104 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 105 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 7 | tilt | — | missing_in_driver | Z2M defines tilt — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 102 | y | — | missing_in_driver | Z2M defines y — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 103 | z | — | missing_in_driver | Z2M defines z — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 104 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 105 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 7 | tilt | — | missing_in_driver | Z2M defines tilt — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 102 | y | — | missing_in_driver | Z2M defines y — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 103 | z | — | missing_in_driver | Z2M defines z — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 104 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 105 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 7 | tilt | — | missing_in_driver | Z2M defines tilt — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 102 | y | — | missing_in_driver | Z2M defines y — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 103 | z | — | missing_in_driver | Z2M defines z — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 104 | sensitivity | — | missing_in_driver | Z2M defines sensitivity — no driver dpMapping |
| hobeian-zg103z-vibration-tilt | vibration_sensor | 105 | battery | — | missing_in_driver | Z2M defines battery — no driver dpMapping |

## DP6 collision reminder

| Couple | DP6 meaning |
|--------|-------------|
| _TZE284_6ocnqlhn|TS0601 | electricity_composite_raw |
| _TZE284_m1cvyneb|TS0601 | countdown |
| _TZ3000_k4ej3ww2|TS0207 | battery_voltage |
| _TZ3000_mwd3c2at|TS0202 | countdown_remaining |
| _TZE204_clrdrnya|TS0601 | equipment_status |
| _TZ3210_jaap6jeb|TS0505B | scene_data |
| _TZ3210_iystcadi|TS0505B | dp_6 |
| _TZE200_a4bpgplm|TS0601 | running_state |
| _TZE200_itp8dt7f|TS0601 | countdown |
| _TZE200_7upwjcca|TS0601 | border |
| _TZ3000_upgcbody|TS0207 | battery_voltage |
| _TZ3210_3lbtuxgp|TS0505B | dp_6 |
| _TZE204_hlx9tnzb|TS0601 | countdown |
| _TZE204_guvc7pdy|TS0601 | border |
| _TZE200_1fuxihti|TS0601 | border |
| _tze200_68nvbio9|TS0601 | border |
| _tze200_cf1sl3tj|TS0601 | border |
| _tze200_68nvbi09|TS0601 | border |
| _tze200_9p5xmj5r|TS0601 | border |
| _TZE210_m6lwazh9|TS0301 | border |
| _TZE200_m6lwazh9|TS0601 | border |

Regenerate: `node tools/ci/audit-sacred-couple-dps.js`

