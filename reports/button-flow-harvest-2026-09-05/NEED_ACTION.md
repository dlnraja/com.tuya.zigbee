# Button Flow Harvest — NEED_ACTION

Generated: 2026-09-05T07:55:37.973Z

## Exempt (not button-flow scope)

- `ir_remote` — IR remote, 0 button triggers expected
- `wifi_ir_remote` — IR remote, 0 button triggers expected

## Known false positives (runtime OK)

CI harvest tries generic patterns first; `FlowCardHeuristics` + `ButtonDevice` resolve Ngang/hashed/socket cards at runtime.

- `button_emergency_sos` (button) — 3 CI-only misses; socket hybrid — runtime PhysicalButtonMixin + switch_1gang/physical_on
- `button_wireless_fingerbot` (socket) — 2 CI-only misses; socket hybrid — runtime PhysicalButtonMixin + switch_1gang/physical_on
- `button_wireless_plug` (socket) — 3 CI-only misses; socket hybrid — runtime PhysicalButtonMixin + switch_1gang/physical_on
- `button_wireless_switch` (socket) — 6 CI-only misses; socket hybrid — runtime PhysicalButtonMixin + switch_1gang/physical_on
- `button_wireless_usb` (socket) — 12 CI-only misses; Ngang cards declared — CI tries generic patterns first; runtime resolves
- `button_wireless_valve` (socket) — 12 CI-only misses; Ngang cards declared — CI tries generic patterns first; runtime resolves
- `remote_button_wireless_fingerbot` (socket) — 3 CI-only misses; socket hybrid — runtime PhysicalButtonMixin + switch_1gang/physical_on
- `remote_button_wireless_plug` (socket) — 3 CI-only misses; socket hybrid — runtime PhysicalButtonMixin + switch_1gang/physical_on
- `remote_button_wireless_scene` (button) — 12 CI-only misses; hashed Ngang cards — runtime ButtonDevice/FlowCardHeuristics resolves
- `remote_button_wireless_usb` (socket) — 3 CI-only misses; socket hybrid — runtime PhysicalButtonMixin + switch_1gang/physical_on
- `remote_button_wireless_valve` (socket) — 12 CI-only misses; hashed Ngang cards — runtime ButtonDevice/FlowCardHeuristics resolves
- `smart_knob_rotary` (button) — 3 CI-only misses; optional press type not declared

## Open issues

### blaster_remote (other, 2 triggers)
- **app_json_drift** (high) — 2 hits
  - `blaster_remote_ir_remote_code_learned`
  - `blaster_remote_ir_code_received`

### button_emergency_sos (button, 6 triggers)
- **app_json_drift** (high) — 6 hits
  - `button_emergency_sos_pressed`
  - `button_emergency_sos_double_pressed`
  - `button_emergency_sos_long_pressed`
  - `button_emergency_sos_battery_low`
  - `button_emergency_sos_physical_on`

### button_wireless (button, 5 triggers)
- **app_json_drift** (high) — 5 hits
  - `button_wireless_button_pressed`
  - `button_wireless_button_double_press`
  - `button_wireless_button_long_press`
  - `button_wireless_button_release`
  - `button_wireless_battery_low`

### button_wireless_1 (button, 11 triggers)
- **app_json_drift** (high) — 11 hits
  - `button_wireless_1_button_1gang_button_pressed`
  - `button_wireless_1_button_1gang_button_double_press`
  - `button_wireless_1_button_1gang_button_long_press`
  - `button_wireless_1_button_1gang_button_multi_press`
  - `button_wireless_1_button_1gang_button_1_pressed`

### button_wireless_2 (button, 16 triggers)
- **app_json_drift** (high) — 16 hits
  - `button_wireless_2_button_2gang_button_pressed`
  - `button_wireless_2_button_2gang_button_double_press`
  - `button_wireless_2_button_2gang_button_long_press`
  - `button_wireless_2_button_2gang_button_multi_press`
  - `button_wireless_2_button_2gang_button_1_pressed`

### button_wireless_3 (button, 21 triggers)
- **app_json_drift** (high) — 21 hits
  - `button_wireless_3_button_3gang_button_pressed`
  - `button_wireless_3_button_3gang_button_double_press`
  - `button_wireless_3_button_3gang_button_long_press`
  - `button_wireless_3_button_3gang_button_multi_press`
  - `button_wireless_3_button_3gang_button_1_pressed`

### button_wireless_4 (button, 28 triggers)
- **app_json_drift** (high) — 28 hits
  - `button_wireless_4_button_4gang_button_pressed`
  - `button_wireless_4_button_4gang_button_double_press`
  - `button_wireless_4_button_4gang_button_long_press`
  - `button_wireless_4_button_4gang_button_multi_press`
  - `button_wireless_4_button_4gang_button_1_pressed`

### button_wireless_4_ts0041 (button, 25 triggers)
- **app_json_drift** (high) — 25 hits
  - `button_wireless_4_ts0041_button_4gang_button_52f48`
  - `button_wireless_4_ts0041_button_4gang_button_505b8`
  - `button_wireless_4_ts0041_button_4gang_button_fabd0`
  - `button_wireless_4_ts0041_button_4gang_button_0d242`
  - `button_wireless_4_ts0041_button_4gang_button_eeba2`

### button_wireless_6 (button, 35 triggers)
- **app_json_drift** (high) — 35 hits
  - `button_wireless_6_button_6gang_button_pressed`
  - `button_wireless_6_button_6gang_button_double_press`
  - `button_wireless_6_button_6gang_button_long_press`
  - `button_wireless_6_button_6gang_button_multi_press`
  - `button_wireless_6_button_6gang_button_1_pressed`

### button_wireless_8 (button, 45 triggers)
- **app_json_drift** (high) — 45 hits
  - `button_wireless_8_button_8gang_button_pressed`
  - `button_wireless_8_button_8gang_button_double_press`
  - `button_wireless_8_button_8gang_button_long_press`
  - `button_wireless_8_button_8gang_button_multi_press`
  - `button_wireless_8_button_8gang_button_1_pressed`

### button_wireless_fingerbot (socket, 16 triggers)
- **app_json_drift** (high) — 16 hits
  - `button_wireless_fingerbot_switch_1gang_turned_on`
  - `button_wireless_fingerbot_switch_1gang_turned_off`
  - `button_wireless_fingerbot_switch_1gang_physical_on`
  - `button_wireless_fingerbot_switch_1gang_physical_off`
  - `button_wireless_fingerbot_switch_1gang_physical_single`

### button_wireless_plug (socket, 10 triggers)
- **app_json_drift** (high) — 10 hits
  - `button_wireless_plug_turned_on`
  - `button_wireless_plug_turned_off`
  - `button_wireless_plug_measure_power_changed`
  - `button_wireless_plug_measure_voltage_changed`
  - `button_wireless_plug_measure_current_changed`

### button_wireless_scene (button, 15 triggers)
- **app_json_drift** (high) — 15 hits
  - `button_wireless_scene_button_2gang_button_pressed`
  - `button_wireless_scene_button_2gang_button_do_fd794`
  - `button_wireless_scene_button_2gang_button_lo_d6f2d`
  - `button_wireless_scene_button_2gang_button_mu_8e6dd`
  - `button_wireless_scene_button_2gang_button_1__5809e`

### button_wireless_smart (button, 29 triggers)
- **app_json_drift** (high) — 29 hits
  - `button_wireless_smart_button_1gang_button_pressed`
  - `button_wireless_smart_button_1gang_button_do_2c981`
  - `button_wireless_smart_button_1gang_button_lo_8a4e2`
  - `button_wireless_smart_button_1gang_button_mu_55088`
  - `button_wireless_smart_button_1gang_button_1__96a5e`

### button_wireless_switch (socket, 20 triggers)
- **app_json_drift** (high) — 20 hits
  - `button_wireless_switch_2gang_gang1_turned_on`
  - `button_wireless_switch_2gang_gang1_turned_off`
  - `button_wireless_switch_2gang_gang2_turned_on`
  - `button_wireless_switch_2gang_gang2_turned_off`
  - `button_wireless_switch_2gang_physical_gang1_on`

### button_wireless_usb (socket, 8 triggers)
- **app_json_drift** (high) — 8 hits
  - `button_wireless_usb_dongle_dual_repeater_turned_on`
  - `button_wireless_usb_dongle_dual_repeater_tur_67093`
  - `button_wireless_usb_dongle_dual_repeater_pow_4d1a5`
  - `button_wireless_usb_button_1gang_button_scen_1252c`
  - `button_wireless_usb_measure_power_changed`

### button_wireless_valve (socket, 15 triggers)
- **app_json_drift** (high) — 15 hits
  - `button_wireless_valve_button_2gang_button_pressed`
  - `button_wireless_valve_button_2gang_button_do_8575b`
  - `button_wireless_valve_button_2gang_button_lo_4c9c3`
  - `button_wireless_valve_button_2gang_button_mu_89f39`
  - `button_wireless_valve_button_2gang_button_1__6a71a`

### button_wireless_wall (button, 15 triggers)
- **app_json_drift** (high) — 15 hits
  - `button_wireless_wall_button_2gang_button_pressed`
  - `button_wireless_wall_button_2gang_button_dou_708f9`
  - `button_wireless_wall_button_2gang_button_lon_061fd`
  - `button_wireless_wall_button_2gang_button_mul_63a3a`
  - `button_wireless_wall_button_2gang_button_1_pressed`

### fingerbot (button, 4 triggers)
- **app_json_drift** (high) — 4 hits
  - `fingerbot_button_pressed`
  - `fingerbot_turned_on`
  - `fingerbot_turned_off`
  - `fingerbot_battery_low`

### handheld_remote_4_buttons (remote, 20 triggers)
- **app_json_drift** (high) — 20 hits
  - `handheld_remote_4_buttons_button_4gang_butto_5b2bb`
  - `handheld_remote_4_buttons_button_4gang_butto_7a536`
  - `handheld_remote_4_buttons_button_4gang_butto_5fe38`
  - `handheld_remote_4_buttons_button_4gang_butto_e53cd`
  - `handheld_remote_4_buttons_button_4gang_butto_c3e7c`

### remote_button_emergency_sos (remote, 20 triggers)
- **app_json_drift** (high) — 20 hits
  - `remote_button_emergency_sos_button_4gang_but_5cf0a`
  - `remote_button_emergency_sos_button_4gang_but_dd980`
  - `remote_button_emergency_sos_button_4gang_but_d7435`
  - `remote_button_emergency_sos_button_4gang_but_1ebba`
  - `remote_button_emergency_sos_button_4gang_but_f8621`

### remote_button_wireless (button, 20 triggers)
- **app_json_drift** (high) — 20 hits
  - `remote_button_wireless_button_3gang_button_pressed`
  - `remote_button_wireless_button_3gang_button_d_59d9b`
  - `remote_button_wireless_button_3gang_button_l_a002e`
  - `remote_button_wireless_button_3gang_button_m_80c37`
  - `remote_button_wireless_button_3gang_button_1_cf25e`

### remote_button_wireless_fingerbot (socket, 17 triggers)
- **app_json_drift** (high) — 17 hits
  - `remote_button_wireless_fingerbot_button_wire_c8def`
  - `remote_button_wireless_fingerbot_button_wire_a5c3a`
  - `remote_button_wireless_fingerbot_button_wire_208e1`
  - `remote_button_wireless_fingerbot_button_wire_5bcb0`
  - `remote_button_wireless_fingerbot_button_wire_2095c`

### remote_button_wireless_handheld (button, 25 triggers)
- **app_json_drift** (high) — 25 hits
  - `remote_button_wireless_handheld_button_4gang_89a72`
  - `remote_button_wireless_handheld_button_4gang_38dd2`
  - `remote_button_wireless_handheld_button_4gang_74277`
  - `remote_button_wireless_handheld_button_4gang_31d6f`
  - `remote_button_wireless_handheld_button_4gang_10c50`

### remote_button_wireless_plug (socket, 10 triggers)
- **app_json_drift** (high) — 10 hits
  - `remote_button_wireless_plug_turned_on`
  - `remote_button_wireless_plug_turned_off`
  - `remote_button_wireless_plug_measure_power_changed`
  - `remote_button_wireless_plug_measure_voltage__6eb92`
  - `remote_button_wireless_plug_measure_current__8295c`

### remote_button_wireless_scene (button, 15 triggers)
- **app_json_drift** (high) — 15 hits
  - `remote_button_wireless_scene_button_wireless_b4e6e`
  - `remote_button_wireless_scene_button_wireless_c17ed`
  - `remote_button_wireless_scene_button_wireless_266ac`
  - `remote_button_wireless_scene_button_wireless_05645`
  - `remote_button_wireless_scene_button_wireless_02c7a`

### remote_button_wireless_smart (button, 10 triggers)
- **app_json_drift** (high) — 10 hits
  - `remote_button_wireless_smart_button_1gang_button_28b43`
  - `remote_button_wireless_smart_button_1gang_button_8c5c8`
  - `remote_button_wireless_smart_button_1gang_button_96943`
  - `remote_button_wireless_smart_button_1gang_button_28283`
  - `remote_button_wireless_smart_button_1gang_button_3e544`

### remote_button_wireless_usb (socket, 9 triggers)
- **app_json_drift** (high) — 9 hits
  - `remote_button_wireless_usb_button_wireless_u_53adf`
  - `remote_button_wireless_usb_button_wireless_u_82732`
  - `remote_button_wireless_usb_button_wireless_u_dbb38`
  - `remote_button_wireless_usb_physical_on`
  - `remote_button_wireless_usb_physical_off`

### remote_button_wireless_valve (socket, 15 triggers)
- **app_json_drift** (high) — 15 hits
  - `remote_button_wireless_valve_button_wireless_b8fc9`
  - `remote_button_wireless_valve_button_wireless_a8cb2`
  - `remote_button_wireless_valve_button_wireless_e34aa`
  - `remote_button_wireless_valve_button_wireless_68e9c`
  - `remote_button_wireless_valve_button_wireless_9a60f`

### remote_button_wireless_wall (button, 10 triggers)
- **app_json_drift** (high) — 10 hits
  - `remote_button_wireless_wall_button_1gang_but_189a9`
  - `remote_button_wireless_wall_button_1gang_but_fd16a`
  - `remote_button_wireless_wall_button_1gang_but_d1caa`
  - `remote_button_wireless_wall_button_1gang_but_7e06c`
  - `remote_button_wireless_wall_button_1gang_but_105b9`

### remote_dimmer (remote, 10 triggers)
- **app_json_drift** (high) — 10 hits
  - `remote_dimmer_button_on`
  - `remote_dimmer_button_off`
  - `remote_dimmer_button_toggle`
  - `remote_dimmer_brightness_up`
  - `remote_dimmer_brightness_down`

### scene_switch_1 (button, 10 triggers)
- **app_json_drift** (high) — 10 hits
  - `scene_switch_1_button_pressed`
  - `scene_switch_1_button_double_press`
  - `scene_switch_1_button_long_press`
  - `scene_switch_1_battery_changed`
  - `scene_switch_1_battery_low`

### scene_switch_2 (button, 14 triggers)
- **app_json_drift** (high) — 14 hits
  - `scene_switch_2_button_pressed`
  - `scene_switch_2_button_double_press`
  - `scene_switch_2_button_long_press`
  - `scene_switch_2_battery_low`
  - `scene_switch_2_button_2gang_button_1_pressed`

### scene_switch_3 (button, 19 triggers)
- **app_json_drift** (high) — 19 hits
  - `scene_switch_3_button_pressed`
  - `scene_switch_3_button_double_press`
  - `scene_switch_3_button_long_press`
  - `scene_switch_3_battery_low`
  - `scene_switch_3_button_3gang_button_1_pressed`

### scene_switch_4 (button, 47 triggers)
- **app_json_drift** (high) — 47 hits
  - `scene_switch_4_button_pressed`
  - `scene_switch_4_button_double_press`
  - `scene_switch_4_button_long_press`
  - `scene_switch_4_button_1_pressed`
  - `scene_switch_4_button_1_double`

### scene_switch_6 (button, 34 triggers)
- **app_json_drift** (high) — 34 hits
  - `scene_switch_6_button_pressed`
  - `scene_switch_6_button_double_press`
  - `scene_switch_6_button_long_press`
  - `scene_switch_6_battery_low`
  - `scene_switch_6_button_6gang_button_1_pressed`

### scene_switch_6ch (remote, 40 triggers)
- **app_json_drift** (high) — 40 hits
  - `scene_switch_6ch_button_pressed`
  - `scene_switch_6ch_button_double_press`
  - `scene_switch_6ch_button_long_press`
  - `scene_switch_6ch_battery_low`
  - `scene_switch_6ch_button_6gang_button_1_pressed`

### scene_switch_wall (button, 10 triggers)
- **app_json_drift** (high) — 10 hits
  - `scene_switch_wall_button_pressed`
  - `scene_switch_wall_button_double_press`
  - `scene_switch_wall_button_long_press`
  - `scene_switch_wall_battery_low`
  - `scene_switch_wall_button_2gang_button_1_pressed`

### smart_button_switch (remote, 7 triggers)
- **app_json_drift** (high) — 7 hits
  - `smart_button_switch_button_1gang_button_1_pressed`
  - `smart_button_switch_button_1gang_button_1_double`
  - `smart_button_switch_button_1gang_button_1_long`
  - `smart_button_switch_button_1gang_button_1_triple`
  - `smart_button_switch_button_1gang_button_1_release`

### smart_knob (button, 11 triggers)
- **app_json_drift** (high) — 11 hits
  - `smart_knob_button_1gang_button_pressed`
  - `smart_knob_button_1gang_button_double_press`
  - `smart_knob_button_1gang_button_long_press`
  - `smart_knob_button_1gang_button_multi_press`
  - `smart_knob_button_1gang_button_1_pressed`

### smart_knob_rotary (button, 11 triggers)
- **app_json_drift** (high) — 11 hits
  - `smart_knob_rotary_rotate_left`
  - `smart_knob_rotary_rotate_right`
  - `smart_knob_rotary_pressed`
  - `smart_knob_rotary_single_press`
  - `smart_knob_rotary_double_press`

### smart_knob_switch (remote, 6 triggers)
- **app_json_drift** (high) — 6 hits
  - `smart_knob_switch_button_1gang_button_1_pressed`
  - `smart_knob_switch_button_1gang_button_1_double`
  - `smart_knob_switch_button_1gang_button_1_long`
  - `smart_knob_switch_button_1gang_button_1_triple`
  - `smart_knob_switch_button_1gang_button_1_release`

### smart_remote_1_button (remote, 5 triggers)
- **app_json_drift** (high) — 5 hits
  - `smart_remote_1_button_1gang_button_1_pressed`
  - `smart_remote_1_button_1gang_button_1_double`
  - `smart_remote_1_button_1gang_button_1_long`
  - `smart_remote_1_button_1gang_button_1_triple`
  - `smart_remote_1_button_1gang_button_1_release`

### smart_remote_1_button_2 (remote, 5 triggers)
- **app_json_drift** (high) — 5 hits
  - `smart_remote_1_button_2_button_1gang_button__76f3b`
  - `smart_remote_1_button_2_button_1gang_button__ca977`
  - `smart_remote_1_button_2_button_1gang_button_1_long`
  - `smart_remote_1_button_2_button_1gang_button__71271`
  - `smart_remote_1_button_2_button_1gang_button__04888`

### smart_remote_4_buttons (remote, 20 triggers)
- **app_json_drift** (high) — 20 hits
  - `smart_remote_4_buttons_button_4gang_button_1_efa4c`
  - `smart_remote_4_buttons_button_4gang_button_1_b36a2`
  - `smart_remote_4_buttons_button_4gang_button_1_long`
  - `smart_remote_4_buttons_button_4gang_button_1_710b8`
  - `smart_remote_4_buttons_button_4gang_button_1_2f398`

### wall_remote_1_gang (remote, 5 triggers)
- **app_json_drift** (high) — 5 hits
  - `wall_remote_1_gang_button_1gang_button_1_pressed`
  - `wall_remote_1_gang_button_1gang_button_1_double`
  - `wall_remote_1_gang_button_1gang_button_1_long`
  - `wall_remote_1_gang_button_1gang_button_1_triple`
  - `wall_remote_1_gang_button_1gang_button_1_release`

### wall_remote_2_gang (remote, 1 triggers)
- **app_json_drift** (high) — 1 hits
  - `wall_remote_2_gang_buttons`

### wall_remote_3_gang (remote, 15 triggers)
- **app_json_drift** (high) — 15 hits
  - `wall_remote_3_gang_button_3gang_button_1_pressed`
  - `wall_remote_3_gang_button_3gang_button_1_double`
  - `wall_remote_3_gang_button_3gang_button_1_long`
  - `wall_remote_3_gang_button_3gang_button_1_triple`
  - `wall_remote_3_gang_button_3gang_button_1_release`

### wall_remote_4_gang (remote, 20 triggers)
- **app_json_drift** (high) — 20 hits
  - `wall_remote_4_gang_button_4gang_button_1_pressed`
  - `wall_remote_4_gang_button_4gang_button_1_double`
  - `wall_remote_4_gang_button_4gang_button_1_long`
  - `wall_remote_4_gang_button_4gang_button_1_triple`
  - `wall_remote_4_gang_button_4gang_button_1_release`

### wall_remote_4_gang_2 (remote, 3 triggers)
- **app_json_drift** (high) — 3 hits
  - `wall_remote_4_gang_2_wall_remote_4_gang_buttons_2`
  - `wall_remote_4_gang_2_physical_on`
  - `wall_remote_4_gang_2_physical_off`

### wall_remote_4_gang_3 (remote, 20 triggers)
- **app_json_drift** (high) — 20 hits
  - `wall_remote_4_gang_3_button_4gang_button_1_pressed`
  - `wall_remote_4_gang_3_button_4gang_button_1_double`
  - `wall_remote_4_gang_3_button_4gang_button_1_long`
  - `wall_remote_4_gang_3_button_4gang_button_1_triple`
  - `wall_remote_4_gang_3_button_4gang_button_1_release`

### wall_remote_6_gang (remote, 30 triggers)
- **app_json_drift** (high) — 30 hits
  - `wall_remote_6_gang_button_6gang_button_1_pressed`
  - `wall_remote_6_gang_button_6gang_button_1_double`
  - `wall_remote_6_gang_button_6gang_button_1_long`
  - `wall_remote_6_gang_button_6gang_button_1_triple`
  - `wall_remote_6_gang_button_6gang_button_1_release`
