# Recursive diag + interview treat — 2026-09-02

Silent enrichment only. Same methodology as manual `f647d35b` paste analysis.
**Never invent** manufacturerName+productId. Couple ABSENT stays ABSENT.

Sources scanned: **1048** · Unique cases: **391** · Actionable: **126** · Interview couples: **90** · Gmail bodies ingested: **845**

## Signal tally

| Signal | Count |
|--------|------:|
| `invalid_flow_card` | 59 |
| `flow_guard_spam` | 58 |
| `scene_mode_unsupported` | 19 |
| `wrong_driver_hint` | 15 |
| `physical_vs_virtual_button` | 14 |
| `ef00_on_ias_only` | 13 |
| `ef00_leftover_ias` | 13 |
| `ias_storm_button` | 10 |
| `dp_adapt_not_found` | 10 |
| `scene_0x8004` | 9 |
| `bind_fail_sleepy` | 7 |
| `dcm_audit_crash` | 6 |
| `battery_health_token` | 4 |
| `athom_socket_hang` | 3 |
| `athom_processing_failed` | 2 |
| `wrong_smart_rcbo` | 2 |
| `processing_failed` | 2 |
| `heap_oom` | 2 |
| `ias_zone_object_coerce` | 2 |
| `battery_spike_sos` | 2 |
| `ias_object_coerce` | 2 |
| `battery_spike` | 2 |
| `d102_no_pid` | 2 |
| `dyn_cap_humidity_on_meter` | 2 |
| `missing_capability_listener` | 1 |
| `sos_no_press_flow` | 1 |

## Actionable cases (deep root cause)

### f647d35b (gmail_treat)

- **Source:** `reports/gmail-diags-2026-08-24/SUMMARY.json`
- **Couples:** `_TZE284_6ocnqlhn+TS0601` → din_rail_meter (in_log); `_TZ3000_xffhmvhv+TS004F` → button_wireless_4 (in_log)
  - Forbidden: smart_rcbo, climate_sensor, soil_sensor, generic_tuya, zigbee_universal
  - Forbidden: scene_switch_4, smart_knob, wall_switch_4_gang, button_wireless_1
- **Root causes:**
  - `scene_mode_unsupported` [medium/BOTH] — scene_switch / TS0044 profile
  - `wrong_driver_hint` [medium/BOTH] — Lock sacred couple in compose + registry
  - `athom_socket_hang` [high/BOTH] — P139/P2323: wait Athom; no bump-loop; dashboard $timeout 60s; combo budget P2252
  - `athom_processing_failed` [high/BOTH] — Check Homey developer tools stateMeta; soft-expect if Test healthy
  - `wrong_smart_rcbo` [critical/BOTH] — Tongou DIN meter stolen by smart_rcbo (6ocnqlhn / OCR 60cnqlhn)
    - Fix: Lock _TZE284_6ocnqlhn+TS0601 → din_rail_meter; user update+re-pair
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit
  - `processing_failed` [low/CI] — Athom publish transient (P139)
    - Fix: Do not spam republish; wait cooldown
  - `scene_0x8004` [medium/BOTH] — TS004x scene mode attribute probe
    - Fix: Skip 0x8004 for known scene/button mfrs

### f1e5b12d (homey_app_diag)

- **Source:** `.github/state/homey-app-diag/f1e5b12d-5f69-4311-aaa7-b8bef967667c.raw-stack.txt`
- **User:** After reinstall the device's SOS and Smartbutton and Door/Window and waterdetector sensor they still not working right.
- **Drivers:** contact_sensor, button_emergency_sos, button_wireless_1
- **Couples:** `_TZ3000_o4mkahkc+TS0203` → contact_sensor (derived_interview_soft); `_TZ3000_996rpfy6+TS0203` → contact_sensor (derived_interview_soft); `HOBEIAN+ZG-102Z` → contact_sensor (derived_interview_soft); `_TZ3000_0dumfk2z+TS0215A` → button_emergency_sos (derived_interview)
- **Root causes:**
  - `ef00_on_ias_only` [medium/BOTH] — shouldSkipIasOnlyEf00Tx
  - `dcm_audit_crash` [critical/BOTH] — DCM method missing on BaseUnifiedDevice path (stable-era crash)
    - Fix: Guard dynamicCapabilityManager calls; ensure DCM init
  - `ef00_leftover_ias` [medium/BOTH] — Leftover EF00 TX on IAS-only sleepy
    - Fix: shouldSkipIasOnlyEf00Tx

### c8afb22d (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/1a00487ffaa5d0f9.txt`
- **App:** 5.12.70
- **User:** App crashed
- **Drivers:** water_leak_sensor, contact_sensor, button_wireless_1, button_emergency_sos
- **Couples:** `_TZ3000_0CXTPYLT+TS0041` → ? (in_log)
- **Root causes:**
  - `scene_mode_unsupported` [medium/BOTH] — scene_switch / TS0044 profile
  - `ias_storm_button` [high/BOTH] — Skip proactive IAS on wireless buttons
  - `ias_storm_button` [high/BOTH] — Proactive IAS enroll on sleepy wireless button
    - Fix: Skip proactive IAS for wireless button/remote drivers
  - `dcm_audit_crash` [critical/BOTH] — DCM method missing on BaseUnifiedDevice path (stable-era crash)
    - Fix: Guard dynamicCapabilityManager calls; ensure DCM init
  - `bind_fail_sleepy` [medium/BOTH] — Sleepy end-device bind/IEEE noise
    - Fix: Skip genPowerCfg bind on IAS-only; wake-on-press

### 96c19859 (homey_app_diag)

- **Source:** `.github/state/homey-app-diag/96c19859-c46b-44cb-a137-1d57b5d17d83.json`
- **User:** App crashes again
- **Drivers:** water_leak_sensor, button_wireless_1, button_emergency_sos
- **Couples:** `TZ3210_p68kms0l+TS0207` → water_leak_sensor (derived_interview); `_TZ3000_0dumfk2z+TS0215A` → button_emergency_sos (derived_interview)
- **Root causes:**
  - `heap_oom` [critical/BOTH] — LiveData caps / buffer JSON load
  - `ias_storm_button` [high/BOTH] — Skip proactive IAS on wireless buttons
  - `ias_storm_button` [high/BOTH] — Proactive IAS enroll on sleepy wireless button
    - Fix: Skip proactive IAS for wireless button/remote drivers
  - `bind_fail_sleepy` [medium/BOTH] — Sleepy end-device bind/IEEE noise
    - Fix: Skip genPowerCfg bind on IAS-only; wake-on-press
  - `heap_oom` [critical/BOTH] — Homey 64MB heap OOM
    - Fix: Buffer JSON load + LiveData caps

### 80fb9ea3 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19e9287632ed11de.txt`
- **User:** Pressing the button is not registered.
- **Drivers:** soil_sensor, button_wireless
- **Couples:** `_TZE284_aa03yzhs+TS0601` → soil_sensor (derived_interview_soft); `_TZE284_oitavov2+TS0601` → soil_sensor (derived_interview_soft)
- **Root causes:**
  - `dcm_audit_crash` [critical/BOTH] — DCM method missing on BaseUnifiedDevice path (stable-era crash)
    - Fix: Guard dynamicCapabilityManager calls; ensure DCM init
  - `physical_vs_virtual_button` [high/BOTH] — Physical button path silent; virtual/UI works
    - Fix: 0xFD/0xFC PhysicalButtonMixin; re-pair while pressing

### 634f7b19 (homey_app_diag)

- **Source:** `.github/state/homey-app-diag/634f7b19-6909-4485-b35c-dd199d3a09d2.sanitized.json`
- **User:** \n App crashes all the time\n\n
- **Drivers:** contact_sensor, button_emergency_sos, button_wireless_1
- **Couples:** `_TZ3000_o4mkahkc+TS0203` → contact_sensor (derived_interview_soft); `_TZ3000_996rpfy6+TS0203` → contact_sensor (derived_interview_soft); `HOBEIAN+ZG-102Z` → contact_sensor (derived_interview_soft); `_TZ3000_0dumfk2z+TS0215A` → button_emergency_sos (derived_interview)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `ef00_on_ias_only` [medium/BOTH] — shouldSkipIasOnlyEf00Tx
  - `dp_adapt_not_found` [low/BOTH] — Soft-log DP-ADAPT after device delete
  - `dp_adapt_not_found` [low/BOTH] — DPAdaptationEngine store race after device delete
    - Fix: Soft-log DP-ADAPT Not Found (no stderr spam)
  - `dcm_audit_crash` [critical/BOTH] — DCM method missing on BaseUnifiedDevice path (stable-era crash)
    - Fix: Guard dynamicCapabilityManager calls; ensure DCM init
  - `ef00_leftover_ias` [medium/BOTH] — Leftover EF00 TX on IAS-only sleepy
    - Fix: shouldSkipIasOnlyEf00Tx

### 37f88e53 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19fe0741b03c531e.txt`
- **Drivers:** contact_sensor, button_emergency_sos, button_wireless_1
- **Couples:** `_TZ3000_o4mkahkc+TS0203` → contact_sensor (derived_interview_soft); `_TZ3000_996rpfy6+TS0203` → contact_sensor (derived_interview_soft); `HOBEIAN+ZG-102Z` → contact_sensor (derived_interview_soft); `_TZ3000_0dumfk2z+TS0215A` → button_emergency_sos (derived_interview)
- **Root causes:**
  - `ef00_on_ias_only` [medium/BOTH] — shouldSkipIasOnlyEf00Tx
  - `dcm_audit_crash` [critical/BOTH] — DCM method missing on BaseUnifiedDevice path (stable-era crash)
    - Fix: Guard dynamicCapabilityManager calls; ensure DCM init
  - `ef00_leftover_ias` [medium/BOTH] — Leftover EF00 TX on IAS-only sleepy
    - Fix: shouldSkipIasOnlyEf00Tx

### 26179877 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19e96b9b7ccf39a8.txt`
- **User:** No Button Press detected
- **Drivers:** presence_sensor_radar, soil_sensor, button_wireless
- **Couples:** `_TZ321C_fkzihaxe8+TS0225` → presence_sensor_radar (derived_interview_soft); `_TZE200_rhgsbacq+TS0601` → presence_sensor_radar (derived_interview_soft); `HOBEIAN+ZG-204ZV` → presence_sensor_radar (derived_interview_soft); `_TZE200_3towulqd+TS0601` → presence_sensor_radar (derived_interview_soft); `_TZE200_2aaelwxk+TS0601` → presence_sensor_radar (derived_interview_soft); `_TZE200_kb5noeto+TS0601` → presence_sensor_radar (derived_interview_soft)
- **Root causes:**
  - `dcm_audit_crash` [critical/BOTH] — DCM method missing on BaseUnifiedDevice path (stable-era crash)
    - Fix: Guard dynamicCapabilityManager calls; ensure DCM init

### DIAG_FIXES.md (local_report)

- **Source:** `reports/gmail-diags-2026-08-23/DIAG_FIXES.md`
- **Couple:** none in text
- **Root causes:**
  - `wrong_driver_hint` [medium/BOTH] — Lock sacred couple in compose + registry
  - `athom_socket_hang` [high/BOTH] — P139/P2323: wait Athom; no bump-loop; dashboard $timeout 60s; combo budget P2252
  - `athom_processing_failed` [high/BOTH] — Check Homey developer tools stateMeta; soft-expect if Test healthy
  - `wrong_smart_rcbo` [critical/BOTH] — Tongou DIN meter stolen by smart_rcbo (6ocnqlhn / OCR 60cnqlhn)
    - Fix: Lock _TZE284_6ocnqlhn+TS0601 → din_rail_meter; user update+re-pair
  - `processing_failed` [low/CI] — Athom publish transient (P139)
    - Fix: Do not spam republish; wait cooldown

### ec94cae4 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19ec5cd59db8f7c4.txt`
- **Drivers:** contact_sensor, button_wireless_1, button_emergency_sos, motion_sensor_switch, dimmer_wall_plug, remote_button_wireless_fingerbot, sensor_climate_presence, sensor_climate_smart, sensor_contact_presence, sensor_contact_water, sensor_contact_rain, sensor_gas_presence, sensor_motion_presence, sensor_motion_radar, switch_1gang, switch_temp_sensor, switch_wall, water_valve_smart
- **Couples:** `_TZ3000_o4mkahkc+TS0203` → contact_sensor (derived_interview_soft); `_TZ3000_996rpfy6+TS0203` → contact_sensor (derived_interview_soft); `HOBEIAN+ZG-102Z` → contact_sensor (derived_interview_soft); `_TZ3000_0dumfk2z+TS0215A` → button_emergency_sos (derived_interview); `_TZ3000_blhvsaqf+TS0001` → switch_1gang (derived_interview_soft); `_TZ3000_ysdv91bk+TS0001` → switch_1gang (derived_interview_soft)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `ef00_on_ias_only` [medium/BOTH] — shouldSkipIasOnlyEf00Tx
  - `physical_vs_virtual_button` [high/BOTH] — Physical button path silent; virtual/UI works
    - Fix: 0xFD/0xFC PhysicalButtonMixin; re-pair while pressing
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit
  - `ef00_leftover_ias` [medium/BOTH] — Leftover EF00 TX on IAS-only sleepy
    - Fix: shouldSkipIasOnlyEf00Tx

### ec514112 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/1a00c5ae7695564e.txt`
- **App:** 9.0.558
- **User:** Waterdetector sensor is not responding anymore
- **Drivers:** water_leak_sensor, button_emergency_sos, button_wireless_1
- **Couples:** `TZ3210_p68kms0l+TS0207` → water_leak_sensor (derived_interview); `_TZ3000_0dumfk2z+TS0215A` → button_emergency_sos (derived_interview)
- **Root causes:**
  - `ias_zone_object_coerce` [high/BOTH] — IASZoneEnhanced coerce (≥9.0.621)
  - `battery_spike_sos` [high/BOTH] — SOS battery debounce (button_emergency_sos)
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `ias_storm_button` [high/BOTH] — Skip proactive IAS on wireless buttons
  - `dp_adapt_not_found` [low/BOTH] — Soft-log DP-ADAPT after device delete
  - `ias_storm_button` [high/BOTH] — Proactive IAS enroll on sleepy wireless button
    - Fix: Skip proactive IAS for wireless button/remote drivers
  - `dp_adapt_not_found` [low/BOTH] — DPAdaptationEngine store race after device delete
    - Fix: Soft-log DP-ADAPT Not Found (no stderr spam)
  - `battery_health_token` [medium/BOTH] — battery_health_changed flow token missing number
    - Fix: Guard health_score before flow trigger
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit
  - `ias_object_coerce` [high/BOTH] — zoneStatus Buffer/object not coerced
    - Fix: IASZoneEnhanced coerce
  - `battery_spike` [medium/BOTH] — Battery % flip spam
    - Fix: UnifiedBatteryHandler anti-flood / SOS debounce

### e5d19878 (homey_app_diag)

- **Source:** `.github/state/homey-app-diag/e5d19878-d2fc-4bc6-ab0f-cf3d760c5c23.json`
- **User:** Detected as Zigbee device.
- **Drivers:** wifi_sonoff_thr316d, wifi_sonoff_tx_2ch, wifi_sonoff_tx_3ch, wifi_switch, wifi_switch_2gang, wifi_switch_3gang, wifi_switch_4gang, wifi_thermostat, wifi_water_valve, wifi_water_tank_monitor, zigbee_repeater
- **Couple:** none in text
- **Root causes:**
  - `physical_vs_virtual_button` [high/BOTH] — Physical button path silent; virtual/UI works
    - Fix: 0xFD/0xFC PhysicalButtonMixin; re-pair while pressing

### cfbf687f (homey_app_diag)

- **Source:** `.github/state/homey-app-diag/cfbf687f-fcce-4cbe-b5ea-d7d245e6eee6.json`
- **User:** Smartbutton still no response
- **Drivers:** button_wireless_1, button_emergency_sos, water_leak_sensor, contact_sensor
- **Couples:** `_TZ3000_mrpevh8p+TS0041` → button_wireless_1 (in_log)
  - Forbidden: button_wireless, button_wireless_4, button_wireless_4_ts0041, climate_sensor, scene_switch_4, switch_1gang, wall_switch_1gang_1way
- **Root causes:**
  - `scene_mode_unsupported` [medium/BOTH] — scene_switch / TS0044 profile
  - `ias_storm_button` [high/BOTH] — Skip proactive IAS on wireless buttons
  - `ias_storm_button` [high/BOTH] — Proactive IAS enroll on sleepy wireless button
    - Fix: Skip proactive IAS for wireless button/remote drivers
  - `scene_0x8004` [medium/BOTH] — TS004x scene mode attribute probe
    - Fix: Skip 0x8004 for known scene/button mfrs

### c33007b0 (interview)

- **Source:** `docs/data/DEVICE_INTERVIEWS.json#INT-146`
- **Couples:** `_TZ3002_*+TS0726` → switch_4gang (interview_locked); `_TZ3002_+TS0726` → ? (interview_locked)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `missing_capability_listener` [high/BOTH] — Register listener in onNodeInit
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit

### c137a5d7 (homey_app_diag)

- **Source:** `.github/state/homey-app-diag/b3bd114a-4861-43a0-8201-6a9f4bc547e8.json`
- **User:** Still detected as Zigbee Device.
- **Drivers:** device_radiator_valve
- **Couple:** none in text
- **Root causes:**
  - `scene_mode_unsupported` [medium/BOTH] — scene_switch / TS0044 profile
  - `physical_vs_virtual_button` [high/BOTH] — Physical button path silent; virtual/UI works
    - Fix: 0xFD/0xFC PhysicalButtonMixin; re-pair while pressing
  - `scene_0x8004` [medium/BOTH] — TS004x scene mode attribute probe
    - Fix: Skip 0x8004 for known scene/button mfrs

### b3bd114a (homey_app_diag)

- **Source:** `.github/state/homey-app-diag/b3bd114a-4861-43a0-8201-6a9f4bc547e8.sanitized.json`
- **User:** \n Still detected as Zigbee Device.\n\n
- **Drivers:** device_radiator_valve
- **Couple:** none in text
- **Root causes:**
  - `scene_mode_unsupported` [medium/BOTH] — scene_switch / TS0044 profile
  - `physical_vs_virtual_button` [high/BOTH] — Physical button path silent; virtual/UI works
    - Fix: 0xFD/0xFC PhysicalButtonMixin; re-pair while pressing
  - `scene_0x8004` [medium/BOTH] — TS004x scene mode attribute probe
    - Fix: Skip 0x8004 for known scene/button mfrs

### ace66ff9 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/1a00c3d99a26469f.txt`
- **App:** 9.0.558
- **User:** App is stable now, also waterdetector sensor is working, SOS buttons not receiving button press in Homey Flow
- **Drivers:** button_wireless_1, button_emergency_sos, water_leak_sensor
- **Couples:** `_TZ3000_0dumfk2z+TS0215A` → button_emergency_sos (derived_interview); `TZ3210_p68kms0l+TS0207` → water_leak_sensor (derived_interview)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `ias_storm_button` [high/BOTH] — Skip proactive IAS on wireless buttons
  - `dp_adapt_not_found` [low/BOTH] — Soft-log DP-ADAPT after device delete
  - `ias_storm_button` [high/BOTH] — Proactive IAS enroll on sleepy wireless button
    - Fix: Skip proactive IAS for wireless button/remote drivers
  - `dp_adapt_not_found` [low/BOTH] — DPAdaptationEngine store race after device delete
    - Fix: Soft-log DP-ADAPT Not Found (no stderr spam)
  - `battery_health_token` [medium/BOTH] — battery_health_changed flow token missing number
    - Fix: Guard health_score before flow trigger
  - `sos_no_press_flow` [high/BOTH] — SOS awake but flow press not firing
    - Fix: button_emergency_sos physical path + IAS enroll on wake
  - `bind_fail_sleepy` [medium/BOTH] — Sleepy end-device bind/IEEE noise
    - Fix: Skip genPowerCfg bind on IAS-only; wake-on-press

### ab5aaf04 (homey_app_diag)

- **Source:** `.github/state/homey-app-diag/ab5aaf04-ec02-4434-bdae-3a59d79466a0.json`
- **User:** Cover stop working
- **Drivers:** curtain_motor
- **Couples:** `_TZE204_bjzrowv2+TS0601` → curtain_motor (derived_interview_soft); `_TZE204_xu4a5rhj+TS0601` → curtain_motor (derived_interview_soft); `_TZ3000_5iixzdo7+TS130F` → curtain_motor (derived_interview_soft); `_TZ3000_bs93npae+TS130F` → curtain_motor (derived_interview_soft); `_TZE200_icka1clh+TS0601` → curtain_motor (derived_interview_soft)
- **Root causes:**
  - `physical_vs_virtual_button` [high/BOTH] — Physical button path silent; virtual/UI works
    - Fix: 0xFD/0xFC PhysicalButtonMixin; re-pair while pressing

### a9e4d712 (homey_app_diag)

- **Source:** `.github/state/homey-app-diag/a9e4d712-b804-4709-926f-1f1ac7fe139a.json`
- **User:** Cover not responding.
- **Drivers:** curtain_motor
- **Couples:** `_TZE204_bjzrowv2+TS0601` → curtain_motor (derived_interview_soft); `_TZE204_xu4a5rhj+TS0601` → curtain_motor (derived_interview_soft); `_TZ3000_5iixzdo7+TS130F` → curtain_motor (derived_interview_soft); `_TZ3000_bs93npae+TS130F` → curtain_motor (derived_interview_soft); `_TZE200_icka1clh+TS0601` → curtain_motor (derived_interview_soft)
- **Root causes:**
  - `physical_vs_virtual_button` [high/BOTH] — Physical button path silent; virtual/UI works
    - Fix: 0xFD/0xFC PhysicalButtonMixin; re-pair while pressing

### a000e0a5 (homey_app_diag)

- **Source:** `.github/state/homey-app-diag/a000e0a5-5287-4612-b1a9-f77ed8c0d5d9.json`
- **User:** Still detecting as Unknow Device.
- **Drivers:** wifi_sonoff_tx_3ch, wifi_switch, wifi_switch_2gang, wifi_switch_3gang, wifi_switch_4gang, wifi_thermostat, wifi_water_tank_monitor, wifi_water_valve, zigbee_repeater
- **Couple:** none in text
- **Root causes:**
  - `physical_vs_virtual_button` [high/BOTH] — Physical button path silent; virtual/UI works
    - Fix: 0xFD/0xFC PhysicalButtonMixin; re-pair while pressing

### 95486295 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/1a032f2bf545db03.txt`
- **Drivers:** button_wireless_1
- **Couple:** **ABSENT** (do not invent / do not glue known TS0041 couples)
- **Root causes:**
  - `d102_no_pid` [high/BOTH] — Persist zb_model_id; interview if still blank
  - `dp_adapt_not_found` [low/BOTH] — Soft-log DP-ADAPT after device delete
  - `d102_no_pid` [high/BOTH] — productId never persisted to zb_model_id
    - Fix: Same as D101 + interview for sacred couple
  - `dp_adapt_not_found` [low/BOTH] — DPAdaptationEngine store race after device delete
    - Fix: Soft-log DP-ADAPT Not Found (no stderr spam)
  - `bind_fail_sleepy` [medium/BOTH] — Sleepy end-device bind/IEEE noise
    - Fix: Skip genPowerCfg bind on IAS-only; wake-on-press

### 8c49c683 (homey_app_diag)

- **Source:** `.github/state/homey-app-diag/8c49c683-294c-4965-ade1-e165c56a06e9.json`
- **User:** App Crashing and AC not functioning
- **Drivers:** wall_thermostat
- **Couple:** none in text
- **Root causes:**
  - `physical_vs_virtual_button` [high/BOTH] — Physical button path silent; virtual/UI works
    - Fix: 0xFD/0xFC PhysicalButtonMixin; re-pair while pressing

### 7a6f2ca1 (homey_app_diag)

- **Source:** `.github/state/homey-app-diag/7a6f2ca1-28dc-4ddb-9748-805a79aa39b6.json`
- **Drivers:** device_radiator_valve
- **Couple:** none in text
- **Root causes:**
  - `scene_mode_unsupported` [medium/BOTH] — scene_switch / TS0044 profile
  - `physical_vs_virtual_button` [high/BOTH] — Physical button path silent; virtual/UI works
    - Fix: 0xFD/0xFC PhysicalButtonMixin; re-pair while pressing
  - `scene_0x8004` [medium/BOTH] — TS004x scene mode attribute probe
    - Fix: Skip 0x8004 for known scene/button mfrs

### 79326369 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19e817b503eb63cc.txt`
- **App:** 8.1.59
- **User:** Button flow bug
- **Drivers:** button_wireless_1, contact_sensor_switch, contact_sensor_zigbee, device_plug_energy_monitor, device_radiator_valve_thermostat, dimmer_wall_plug, dimmer_wall_switch, dimmer_wall_water, remote_button_wireless_fingerbot, sensor_climate_presence, sensor_climate_smart, sensor_contact_rain, switch_wall
- **Couples:** `_TZ3000_b4awzgct+TS0041` → button_wireless_1 (in_log)
  - Forbidden: button_wireless_4_ts0041, switch_1gang, scene_switch_1, scene_switch_4
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `scene_mode_unsupported` [medium/BOTH] — scene_switch / TS0044 profile
  - `physical_vs_virtual_button` [high/BOTH] — Physical button path silent; virtual/UI works
    - Fix: 0xFD/0xFC PhysicalButtonMixin; re-pair while pressing
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit

### 724d4bc9 (homey_app_diag)

- **Source:** `.github/state/homey-app-diag/724d4bc9-229b-46ba-bad7-fc61af93865d.json`
- **User:** Still Unknown Device
- **Drivers:** wifi_sonoff_tx_3ch, wifi_switch, wifi_switch_2gang, wifi_switch_3gang, wifi_switch_4gang, wifi_thermostat, wifi_water_tank_monitor, wifi_water_valve, zigbee_repeater
- **Couple:** none in text
- **Root causes:**
  - `physical_vs_virtual_button` [high/BOTH] — Physical button path silent; virtual/UI works
    - Fix: 0xFD/0xFC PhysicalButtonMixin; re-pair while pressing

### 55e3e591 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/1a023f6ac3857a87.txt`
- **App:** 9.0.617
- **Drivers:** scene_switch_4
- **Couples:** `_TZ3000_zgyzgdua+TS0044` → scene_switch_4 (in_log)
  - Forbidden: button_wireless_4, smart_knob, wall_dimmer_tuya
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `scene_mode_unsupported` [medium/BOTH] — scene_switch / TS0044 profile
  - `physical_vs_virtual_button` [high/BOTH] — Physical button path silent; virtual/UI works
    - Fix: 0xFD/0xFC PhysicalButtonMixin; re-pair while pressing
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit
  - `scene_0x8004` [medium/BOTH] — TS004x scene mode attribute probe
    - Fix: Skip 0x8004 for known scene/button mfrs

### 3a1f196d (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/1a02c5a2c8ea62c9.txt`
- **App:** 9.0.626
- **User:** El dispositivo Zigbee Tongou TO-Q-SYS-JZT no es reconocido por Universal Tuya. Manufacturer: _TZE284_6ocnqlhn Model: TS0601 Endpoint: 1 Clusters: 0xEF00 y 0xED00 Homey Developer Tools lo reconoce correctamente mediante Zigbee Interview, pero Universal Tuya no lo detecta al intentar añadirlo con el
- **Drivers:** smart_rcbo
- **Couples:** `_TZE284_6ocnqlhn+TS0601` → din_rail_meter (in_log)
  - Forbidden: smart_rcbo, climate_sensor, soil_sensor, generic_tuya, zigbee_universal
- **Root causes:**
  - `dyn_cap_humidity_on_meter` [high/BOTH] — DYN-CAP maps meter DP6 raw → humidity on wrong driver
    - Fix: din_rail_meter DP profile; block humidity on RCBO/DIN

### 31e654a4 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/1a02935e2a97ad90.txt`
- **App:** 9.0.626
- **User:** El dispositivo es un medidor de energía Zigbee DIN monofásico. Fabricante: _TZE284_60cnqlhn Product ID: TS0601 IEEE: 14:2d:41:ff:fe:99:b6:a5 Universal Tuya lo detecta como “Smart RCBO”, pero este perfil es incorrecto. En Smart Life el dispositivo proporciona correctamente: tensión (V), corriente (
- **Drivers:** smart_rcbo
- **Couples:** `_TZE284_60cnqlhn+TS0601` → din_rail_meter (in_log)
  - Forbidden: smart_rcbo, climate_sensor, soil_sensor, generic_tuya, zigbee_universal
- **Root causes:**
  - `wrong_driver_hint` [medium/BOTH] — Lock sacred couple in compose + registry
  - `dyn_cap_humidity_on_meter` [high/BOTH] — DYN-CAP maps meter DP6 raw → humidity on wrong driver
    - Fix: din_rail_meter DP profile; block humidity on RCBO/DIN

### 2b0b4e4f (homey_app_diag)

- **Source:** `.github/state/homey-app-diag/2b0b4e4f-971e-4e1f-8d32-09d255e232d0.json`
- **Drivers:** water_valve_smart, wifi_air_purifier, wifi_air_quality, wifi_dehumidifier, wifi_camera, wifi_cover, wifi_dimmer, wifi_doorbell, wifi_door_lock, wifi_ewelink_dimmer, wifi_ewelink_bulb, wifi_ewelink_led, wifi_ewelink_fan, wifi_ewelink_pow, wifi_ewelink_plug, wifi_ewelink_switch, wifi_ewelink_switch_2ch, water_valve_garden, wifi_ewelink_th, wifi_fan, wifi_garage_door, wifi_ewelink_switch_4ch, wifi_heater, wifi_generic, wifi_humidifier, wifi_ir_remote, wifi_led_strip, wifi_light, wifi_pet_feeder, wifi_robot_vacuum, wifi_power_strip, wifi_plug, wifi_sensor, wifi_siren, wifi_sonoff_dualr3, wifi_sonoff_thr316d, wifi_sonoff_tx_2ch, wifi_sonoff_tx_3ch, wifi_switch, wifi_switch_2gang, wifi_switch_3gang, wifi_water_tank_monitor, wifi_thermostat, wifi_water_valve, wifi_switch_4gang, zigbee_repeater
- **Couples:** `_TZ3000_zgyzgdua+TS0044` → scene_switch_4 (in_log)
  - Forbidden: button_wireless_4, smart_knob, wall_dimmer_tuya
- **Root causes:**
  - `physical_vs_virtual_button` [high/BOTH] — Physical button path silent; virtual/UI works
    - Fix: 0xFD/0xFC PhysicalButtonMixin; re-pair while pressing
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit

### 17881125 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/gmail-state-36-1788112577424.txt`
- **Drivers:** water_leak_sensor, contact_sensor
- **Couples:** `_TZ3000_mrpevh8p+TS0041` → button_wireless_1 (in_log)
  - Forbidden: button_wireless, button_wireless_4, button_wireless_4_ts0041, climate_sensor, scene_switch_4, switch_1gang, wall_switch_1gang_1way
- **Root causes:**
  - `battery_spike_sos` [high/BOTH] — SOS battery debounce (button_emergency_sos)
  - `ef00_on_ias_only` [medium/BOTH] — shouldSkipIasOnlyEf00Tx
  - `wrong_driver_hint` [medium/BOTH] — Lock sacred couple in compose + registry
  - `ef00_leftover_ias` [medium/BOTH] — Leftover EF00 TX on IAS-only sleepy
    - Fix: shouldSkipIasOnlyEf00Tx
  - `battery_spike` [medium/BOTH] — Battery % flip spam
    - Fix: UnifiedBatteryHandler anti-flood / SOS debounce

### 0cea6870 (local_report)

- **Source:** `reports/gmail-forum-2026-08-22/diag-0cea6870-excerpt.txt`
- **App:** 9.0.617
- **User:** Waterdetector and Smartbutton still no response yet and Contact sensors no switch state but puls while open closing the window
- **Drivers:** contact_sensor, water_leak_sensor, button_wireless_1, button_emergency_sos
- **Couples:** `_TZ3000_o4mkahkc+TS0203` → contact_sensor (derived_interview_soft); `_TZ3000_996rpfy6+TS0203` → contact_sensor (derived_interview_soft); `HOBEIAN+ZG-102Z` → contact_sensor (derived_interview_soft); `TZ3210_p68kms0l+TS0207` → water_leak_sensor (derived_interview); `_TZ3000_0dumfk2z+TS0215A` → button_emergency_sos (derived_interview)
- **Root causes:**
  - `ias_zone_object_coerce` [high/BOTH] — IASZoneEnhanced coerce (≥9.0.621)
  - `ef00_on_ias_only` [medium/BOTH] — shouldSkipIasOnlyEf00Tx
  - `ias_object_coerce` [high/BOTH] — zoneStatus Buffer/object not coerced
    - Fix: IASZoneEnhanced coerce
  - `ef00_leftover_ias` [medium/BOTH] — Leftover EF00 TX on IAS-only sleepy
    - Fix: shouldSkipIasOnlyEf00Tx

### 08cc3958 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19cc978a5b7aff60.txt`
- **App:** 5.11.101
- **User:** Timeout after 10000ms
- **Couple:** none in text
- **Root causes:**
  - `athom_socket_hang` [high/BOTH] — P139/P2323: wait Athom; no bump-loop; dashboard $timeout 60s; combo budget P2252

### fefab0ce (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19e3272175e5f359.txt`
- **App:** 7.5.30
- **User:** Issue mauvais nomnte de boutons et pas de batterie info et des bugs
- **Drivers:** wifi_switch_4gang, wifi_thermostat, wifi_water_valve, zigbee_repeater, button_emergency_sos, button_wireless_3, button_wireless_4, climate_sensor, ir_blaster, presence_sensor_radar, sensor_presence_radar, soil_sensor, switch_2gang
- **Couples:** `_TZ3000_0dumfk2z+TS0215A` → button_emergency_sos (derived_interview); `_TZ3000_*+TS0043` → button_wireless_3 (derived_interview_soft); `_TZ3000_bczr4e10+TS0043` → button_wireless_3 (derived_interview_soft); `_TZ3000_zgyzgdua+TS0044` → button_wireless_4 (derived_interview_soft); `_TZ3000_kfu8zapd+TS0044` → button_wireless_4 (derived_interview_soft); `_TZ3000_bgtzm4ny+TS0044` → button_wireless_4 (derived_interview_soft)
- **Root causes:**
  - `scene_mode_unsupported` [medium/BOTH] — scene_switch / TS0044 profile

### fe2b7beb (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19eacafffa8546f4.txt`
- **User:** ________________________
- **Drivers:** presence_sensor_radar, soil_sensor, switch_wall_7gang, switch_wall_8gang, water_valve_smart, sensor_motion_presence, thermostatic_radiator_valve
- **Couples:** `_TZ321C_fkzihaxe8+TS0225` → presence_sensor_radar (derived_interview_soft); `_TZE200_rhgsbacq+TS0601` → presence_sensor_radar (derived_interview_soft); `HOBEIAN+ZG-204ZV` → presence_sensor_radar (derived_interview_soft); `_TZE200_3towulqd+TS0601` → presence_sensor_radar (derived_interview_soft); `_TZE200_2aaelwxk+TS0601` → presence_sensor_radar (derived_interview_soft); `_TZE200_kb5noeto+TS0601` → presence_sensor_radar (derived_interview_soft)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit

### fd40db94 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19f2c610082e30b5.txt`
- **Drivers:** light_sensor_outdoor, boiler_switch_energy
- **Couple:** none in text
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit

### f56390e6 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19d121e757c78135.txt`
- **App:** 5.11.118
- **User:** generic...
- **Drivers:** rain_sensor, presence_sensor_radar, soil_sensor
- **Couples:** `_TZ321C_fkzihaxe8+TS0225` → presence_sensor_radar (derived_interview_soft); `_TZE200_rhgsbacq+TS0601` → presence_sensor_radar (derived_interview_soft); `HOBEIAN+ZG-204ZV` → presence_sensor_radar (derived_interview_soft); `_TZE200_3towulqd+TS0601` → presence_sensor_radar (derived_interview_soft); `_TZE200_2aaelwxk+TS0601` → presence_sensor_radar (derived_interview_soft); `_TZE200_kb5noeto+TS0601` → presence_sensor_radar (derived_interview_soft)
- **Root causes:**
  - `bind_fail_sleepy` [medium/BOTH] — Sleepy end-device bind/IEEE noise
    - Fix: Skip genPowerCfg bind on IAS-only; wake-on-press

### ee0d54bd (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19e46f01840056e5.txt`
- **App:** 7.5.47
- **User:** Crash on v7.5.43: Cannot read properties of null (reading '_onSetCapabilityValue')
- **Drivers:** wall_switch_3gang_1way, wall_switch_4gang_1way, water_leak_sensor, water_tank_monitor, water_valve_garden, water_valve_smart, weather_station_outdoor, wifi_air_purifier, wifi_air_quality, wifi_camera, wifi_cover, wifi_dehumidifier, wifi_dimmer, wifi_door_lock, wifi_doorbell, wifi_ewelink_bulb, wifi_ewelink_dimmer, wifi_ewelink_fan, wifi_ewelink_led, wifi_ewelink_plug, wifi_ewelink_pow, wifi_ewelink_switch, wifi_ewelink_switch_2ch, wifi_ewelink_switch_4ch, wifi_ewelink_th, wifi_fan, wifi_garage_door, wifi_generic, wifi_heater, wifi_humidifier, wifi_ir_remote, wifi_led_strip, wifi_light, wifi_pet_feeder, wifi_plug, wifi_power_strip, wifi_robot_vacuum, wifi_sensor, wifi_siren, wifi_sonoff_basicr4, wifi_sonoff_dualr3, wifi_sonoff_micro, wifi_sonoff_minir3, wifi_sonoff_minir4, wifi_sonoff_pow_elite, wifi_sonoff_smate2, wifi_sonoff_thr316d, wifi_sonoff_tx_1ch, wifi_sonoff_tx_2ch, wifi_sonoff_tx_3ch, wifi_switch, wifi_switch_2gang, wifi_switch_3gang, wifi_switch_4gang, wifi_thermostat, wifi_water_tank_monitor, wifi_water_valve, zigbee_repeater, switch_3gang, switch, switch_1gang, switch_2gang, switch_4gang, switch_dimmer_1gang, switch_temp_sensor, switch_usb_dongle, vibration_sensor
- **Couples:** `TZ3210_p68kms0l+TS0207` → water_leak_sensor (derived_interview); `_TZE204_*+TS0601` → water_tank_monitor (derived_interview); `_TZ3000_qkixdnon+TS0003` → switch_3gang (derived_interview_soft); `_TZ3000_blhvsaqf+TS0001` → switch_1gang (derived_interview_soft); `_TZ3000_ysdv91bk+TS0001` → switch_1gang (derived_interview_soft); `_TZ3000_l9brjwau+TS0002` → switch_2gang (derived_interview_soft)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit

### ea2c0a85 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19e8ca9827053c22.txt`
- **Drivers:** contact_sensor, device_radiator_valve_thermostat, dimmer_wall_plug, dimmer_wall_switch, dimmer_wall_water, remote_button_wireless_fingerbot, sensor_climate_presence, sensor_climate_smart, sensor_contact_rain, switch_wall
- **Couples:** `_TZ3000_o4mkahkc+TS0203` → contact_sensor (derived_interview_soft); `_TZ3000_996rpfy6+TS0203` → contact_sensor (derived_interview_soft); `HOBEIAN+ZG-102Z` → contact_sensor (derived_interview_soft)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `ef00_on_ias_only` [medium/BOTH] — shouldSkipIasOnlyEf00Tx
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit
  - `ef00_leftover_ias` [medium/BOTH] — Leftover EF00 TX on IAS-only sleepy
    - Fix: shouldSkipIasOnlyEf00Tx

### e81acce5 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19e9be889f4a49b2.txt`
- **User:** No Lux data submitted=20
- **Drivers:** switch_1gang, switch_2gang, switch_3gang, switch_4gang, switch_dimmer_1gang, switch_plug_1, switch_plug_2, switch_temp_sensor, switch_usb_dongle, switch_wall, switch_wall_5gang, switch_wall_6gang, switch_wall_7gang, switch_wall_8gang, switch_wireless, temphumidsensor, thermostat_4ch, thermostat_tuya_dp, thermostatic_radiator_valve, universal_fallback, usb_dongle_triple, usb_outlet_advanced, valve_dual_irrigation, valve_irrigation, valve_single, vibration_sensor, wall_curtain_switch, wall_dimmer_1gang_1way, wall_remote_1_gang, wall_remote_2_gang, wall_remote_3_gang, wall_remote_4_gang, wall_remote_4_gang_3, wall_remote_6_gang, wall_switch_1gang_1way, wall_switch_2gang_1way, wall_switch_3gang_1way, wall_switch_4gang_1way, water_leak_sensor, water_tank_monitor, water_valve_garden, water_valve_smart, wifi_ewelink_switch, wifi_ewelink_switch_2ch, wifi_ewelink_switch_4ch, zigbee_repeater, illuminance_sensor, motion_sensor_switch, remote_button_wireless_fingerbot, sensor_climate_presence, sensor_climate_smart, sensor_contact_presence, sensor_contact_rain, sensor_contact_water, sensor_gas_presence, sensor_motion_presence, sensor_motion_radar, switch
- **Couples:** `_TZ3000_blhvsaqf+TS0001` → switch_1gang (derived_interview_soft); `_TZ3000_ysdv91bk+TS0001` → switch_1gang (derived_interview_soft); `_TZ3000_l9brjwau+TS0002` → switch_2gang (derived_interview_soft); `_TZ3000_*+TS0002` → switch_2gang (derived_interview_soft); `_TZ3000_jjdkhueq+TS0002` → switch_2gang (derived_interview_soft); `_TZ3000_l9brjwau+TS0003` → switch_2gang (derived_interview_soft)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit

### e5565457 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19d7955bef85b951.txt`
- **App:** 7.0.22
- **Drivers:** switch_dimmer_1gang, switch_hybrid, switch_plug_1, switch_plug_2, switch_temp_sensor, switch_wall_5gang, switch_wall_6gang, switch_wall_7gang, switch_wall_8gang, switch_wireless, temphumidsensor, thermostat_4ch, thermostat_tuya_dp, universal_fallback, usb_dongle_dual_repeater, usb_dongle_triple, usb_outlet_advanced, valve_irrigation, valve_single, vibration_sensor, wall_curtain_switch, wall_dimmer_1gang_1way, wall_remote_1_gang, wall_remote_2_gang, wall_remote_3_gang, wall_remote_4_gang, wall_remote_4_gang_2, wall_remote_4_gang_3, wall_remote_6_gang, wall_switch_1gang_1way, wall_switch_2gang_1way, wall_switch_3gang_1way, wall_switch_4gang_1way, water_leak_sensor, water_tank_monitor, water_valve_garden, water_valve_smart, weather_station_outdoor, wifi_air_purifier, wifi_air_quality, wifi_camera, wifi_cover, wifi_dehumidifier, wifi_dimmer, wifi_door_lock, wifi_doorbell, wifi_ewelink_bulb, wifi_ewelink_dimmer, wifi_ewelink_fan, wifi_ewelink_led, wifi_ewelink_plug, wifi_ewelink_pow, wifi_ewelink_switch, wifi_ewelink_switch_2ch, wifi_ewelink_switch_4ch, wifi_ewelink_th, wifi_fan, wifi_garage_door, wifi_generic, wifi_heater, wifi_humidifier, wifi_ir_remote, wifi_led_strip, wifi_light, wifi_pet_feeder, wifi_plug, wifi_power_strip, wifi_robot_vacuum, wifi_sensor, wifi_sonoff_basicr4, wifi_siren, wifi_sonoff_dualr3, wifi_sonoff_micro, wifi_sonoff_minir3, wifi_sonoff_minir4, wifi_sonoff_pow_elite, wifi_sonoff_smate2, wifi_sonoff_thr316d, wifi_sonoff_tx_1ch, wifi_sonoff_tx_2ch, wifi_sonoff_tx_3ch, wifi_switch, wifi_switch_2gang, wifi_switch_3gang, wifi_switch_4gang, wifi_thermostat, wifi_water_tank_monitor, wifi_water_valve, zigbee_repeater, air_purifier_curtain_hybrid, curtain_motor_tilt, scene_switch_2, scene_switch_3, scene_switch_6, scene_switch_wall_hybrid, switch_4gang
- **Couples:** `_TZE284_9ern5sfh+TS0601` → thermostat_tuya_dp (derived_interview); `_TZ3000_h1ipgkwn+TS0002` → usb_dongle_dual_repeater (derived_interview); `_TZ3000_iedbgyxt+TS0001` → valve_single (derived_interview); `TZ3210_p68kms0l+TS0207` → water_leak_sensor (derived_interview); `_TZE204_*+TS0601` → water_tank_monitor (derived_interview); `_TZ3002_*+TS0726` → switch_4gang (derived_interview)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `scene_mode_unsupported` [medium/BOTH] — scene_switch / TS0044 profile
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit

### e17709eb (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19e92b03b726fd49.txt`
- **User:** Bed Sensor Diagnistic Code
- **Drivers:** bed_sensor, contact_sensor_switch, contact_sensor_zigbee, device_plug_energy_monitor, device_radiator_valve_thermostat, dimmer_wall_plug, dimmer_wall_switch, dimmer_wall_water, remote_button_wireless_fingerbot, sensor_climate_presence, sensor_climate_smart, sensor_contact_rain, switch_wall
- **Couple:** **ABSENT** (do not invent / do not glue known TS0041 couples)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit

### e0104992 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19c9fbcf75d63dde.txt`
- **App:** 5.11.25
- **User:** _TZ3000_itb0omhv not recognized
- **Couples:** `_TZ3000_itb0omhv+TS0042` → ? (in_log)
- **Root causes:**
  - `wrong_driver_hint` [medium/BOTH] — Lock sacred couple in compose + registry

### dbbb9d61 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19e83b99287c7608.txt`
- **App:** 8.1.63
- **User:** Bed_Sensor Report
- **Drivers:** bed_sensor, contact_sensor_switch, contact_sensor_zigbee, device_plug_energy_monitor, dimmer_wall_switch, dimmer_wall_plug, device_radiator_valve_thermostat, dimmer_wall_water, remote_button_wireless_fingerbot, sensor_climate_presence, sensor_climate_smart, sensor_contact_rain, switch_wall
- **Couple:** **ABSENT** (do not invent / do not glue known TS0041 couples)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit

### d341343d (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19d6459d2324a034.txt`
- **Couple:** none in text
- **Root causes:**
  - `wrong_driver_hint` [medium/BOTH] — Lock sacred couple in compose + registry

### d1106a9b (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19f26e81ae005b96.txt`
- **Drivers:** button_wireless_4, boiler_switch_energy
- **Couples:** `_TZ3000_zgyzgdua+TS0044` → button_wireless_4 (derived_interview_soft); `_TZ3000_kfu8zapd+TS0044` → button_wireless_4 (derived_interview_soft); `_TZ3000_bgtzm4ny+TS0044` → button_wireless_4 (derived_interview_soft)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `scene_mode_unsupported` [medium/BOTH] — scene_switch / TS0044 profile
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit

### d10c36b7 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/1a0158b7281277fe.txt`
- **Drivers:** contact_sensor, water_leak_sensor, button_emergency_sos
- **Couples:** `_TZ3000_o4mkahkc+TS0203` → contact_sensor (derived_interview_soft); `_TZ3000_996rpfy6+TS0203` → contact_sensor (derived_interview_soft); `HOBEIAN+ZG-102Z` → contact_sensor (derived_interview_soft); `TZ3210_p68kms0l+TS0207` → water_leak_sensor (derived_interview); `_TZ3000_0dumfk2z+TS0215A` → button_emergency_sos (derived_interview)
- **Root causes:**
  - `ef00_on_ias_only` [medium/BOTH] — shouldSkipIasOnlyEf00Tx
  - `battery_health_token` [medium/BOTH] — battery_health_changed flow token missing number
    - Fix: Guard health_score before flow trigger
  - `ef00_leftover_ias` [medium/BOTH] — Leftover EF00 TX on IAS-only sleepy
    - Fix: shouldSkipIasOnlyEf00Tx

### ca158431 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19d87e054550b017.txt`
- **Couple:** **ABSENT** (do not invent / do not glue known TS0041 couples)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit

### bf2142c2 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19fbc621893f3ed7.txt`
- **User:** No response from buttons or water detector
- **Drivers:** water_leak_sensor, smart_irrigation_valve
- **Couples:** `HOBEIAN+ZG-222Z` → ? (in_log)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit
  - `bind_fail_sleepy` [medium/BOTH] — Sleepy end-device bind/IEEE noise
    - Fix: Skip genPowerCfg bind on IAS-only; wake-on-press

### bc04d6e9 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19e59e4bb9183531.txt`
- **App:** 8.1.5
- **User:** Bed Sensor does not work correctly
- **Drivers:** bed_sensor, climate_sensor_device, curtain_motor, curtain_motor_wall, curtain_motor_shutter, device_generic_tuya_universal, device_radiator_valve, device_radiator_valve_smart, hvac_air_conditioner, hvac_dehumidifier, lcdtemphumidsensor_plug_energy, light_bulb_rgb_rgbw, sensor_contact_presence, sensor_contact_water, sensor_motion_presence, sensor_motion_radar, smart_scene_panel, switch_1gang, switch_temp_sensor, water_valve_smart
- **Couples:** `_TZE200_seq9cm6u+TS0601` → ? (in_log)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit

### b69fa9d4 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19eea23faf3525d1.txt`
- **User:** Soil sensor detected as unknown zigbee
- **Drivers:** contact_sensor, light_bulb_tunable_white, motion_sensor_switch, remote_button_wireless_fingerbot, sensor_climate_presence, sensor_climate_smart, sensor_contact_presence, sensor_contact_rain, sensor_contact_water, sensor_gas_presence, sensor_motion_radar, sensor_motion_presence, switch_1gang, switch_temp_sensor, switch_wall, device_air_purifier_led, water_valve_smart
- **Couples:** `_TZ3000_o4mkahkc+TS0203` → contact_sensor (derived_interview_soft); `_TZ3000_996rpfy6+TS0203` → contact_sensor (derived_interview_soft); `HOBEIAN+ZG-102Z` → contact_sensor (derived_interview_soft); `_TZ3000_blhvsaqf+TS0001` → switch_1gang (derived_interview_soft); `_TZ3000_ysdv91bk+TS0001` → switch_1gang (derived_interview_soft)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit

### b1ece681 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19e46e35bee07619.txt`
- **App:** 7.5.53
- **User:** [BUG] Could not get device by ID - Zigbee Gate Opener Module / QS-Zigbee-C03 / TS0603
- **Drivers:** wall_switch_1gang_1way, wall_switch_2gang_1way, wall_switch_3gang_1way, wall_switch_4gang_1way, water_leak_sensor, water_tank_monitor, water_valve_garden, water_valve_smart, weather_station_outdoor, wifi_air_purifier, wifi_air_quality, wifi_camera, wifi_cover, wifi_dehumidifier, wifi_dimmer, wifi_door_lock, wifi_doorbell, wifi_ewelink_bulb, wifi_ewelink_dimmer, wifi_ewelink_fan, wifi_ewelink_led, wifi_ewelink_plug, wifi_ewelink_pow, wifi_ewelink_switch, wifi_ewelink_switch_2ch, wifi_ewelink_switch_4ch, wifi_ewelink_th, wifi_fan, wifi_garage_door, wifi_generic, wifi_heater, wifi_humidifier, wifi_ir_remote, wifi_led_strip, wifi_light, wifi_pet_feeder, wifi_plug, wifi_power_strip, wifi_robot_vacuum, wifi_sensor, wifi_siren, wifi_sonoff_basicr4, wifi_sonoff_dualr3, wifi_sonoff_micro, wifi_sonoff_minir3, wifi_sonoff_minir4, wifi_sonoff_pow_elite, wifi_sonoff_smate2, wifi_sonoff_thr316d, wifi_sonoff_tx_1ch, wifi_sonoff_tx_2ch, wifi_sonoff_tx_3ch, wifi_switch, wifi_switch_2gang, wifi_switch_3gang, wifi_switch_4gang, wifi_thermostat, wifi_water_tank_monitor, wifi_water_valve, zigbee_repeater, curtain_motor_wall, device_generic_tuya_universal, device_radiator_valve, device_radiator_valve_smart, hvac_air_conditioner, hvac_dehumidifier, lcdtemphumidsensor_plug_energy, light_bulb_rgb_rgbw, scene_switch_2, scene_switch_3, scene_switch_6, scene_switch_wall, sensor_contact_presence, sensor_contact_water, sensor_motion_presence, sensor_motion_radar, smart_scene_panel, switch_1gang, switch_temp_sensor, garage_door_opener
- **Couples:** `TZ3210_p68kms0l+TS0207` → water_leak_sensor (derived_interview); `_TZE204_*+TS0601` → water_tank_monitor (derived_interview); `_TZ3000_blhvsaqf+TS0001` → switch_1gang (derived_interview_soft); `_TZ3000_ysdv91bk+TS0001` → switch_1gang (derived_interview_soft)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit

### b00b28a3 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19e9674693a9bb6b.txt`
- **User:** No luminace / brightness Informationen is showing up
- **Drivers:** illuminance_sensor, contact_sensor_switch, contact_sensor_zigbee, device_plug_energy_monitor, device_radiator_valve_thermostat, dimmer_wall_plug, dimmer_wall_switch, dimmer_wall_water, remote_button_wireless_fingerbot, sensor_climate_presence, sensor_climate_smart, sensor_contact_rain, switch_wall
- **Couple:** **ABSENT** (do not invent / do not glue known TS0041 couples)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit

### ac3f92d2 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19f699b2422b5d2e.txt`
- **App:** 9.0.261
- **User:** Contact state not changing and Luminance not correct
- **Drivers:** contact_sensor, smart_irrigation_valve
- **Couples:** `_TZ3000_o4mkahkc+TS0203` → contact_sensor (derived_interview_soft); `_TZ3000_996rpfy6+TS0203` → contact_sensor (derived_interview_soft); `HOBEIAN+ZG-102Z` → contact_sensor (derived_interview_soft)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `ef00_on_ias_only` [medium/BOTH] — shouldSkipIasOnlyEf00Tx
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit
  - `ef00_leftover_ias` [medium/BOTH] — Leftover EF00 TX on IAS-only sleepy
    - Fix: shouldSkipIasOnlyEf00Tx

### a8741f83 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19e1212c14f49d3b.txt`
- **App:** 7.5.9
- **Couple:** **ABSENT** (do not invent / do not glue known TS0041 couples)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit

### a1fe4b04 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19f672e5a32c3997.txt`
- **App:** 9.0.261
- **User:** Luminance oke now
- **Drivers:** contact_sensor, button_emergency_sos, smart_irrigation_valve
- **Couples:** `_TZ3000_o4mkahkc+TS0203` → contact_sensor (derived_interview_soft); `_TZ3000_996rpfy6+TS0203` → contact_sensor (derived_interview_soft); `HOBEIAN+ZG-102Z` → contact_sensor (derived_interview_soft); `_TZ3000_0dumfk2z+TS0215A` → button_emergency_sos (derived_interview)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `ef00_on_ias_only` [medium/BOTH] — shouldSkipIasOnlyEf00Tx
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit
  - `ef00_leftover_ias` [medium/BOTH] — Leftover EF00 TX on IAS-only sleepy
    - Fix: shouldSkipIasOnlyEf00Tx

### 9e3332c9 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19eb16c545c7abbf.txt`
- **User:** _________________________
- **Drivers:** plug_energy_monitor, rain_sensor, soil_sensor, switch_wall_6gang, switch_wall_7gang, switch_wall_8gang, water_valve_smart
- **Couples:** `SONOFF+S60ZBTPF` → plug_energy_monitor (derived_interview); `_TZE284_aa03yzhs+TS0601` → soil_sensor (derived_interview_soft); `_TZE284_oitavov2+TS0601` → soil_sensor (derived_interview_soft)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit

### 9cbf9eb6 (local_report)

- **Source:** `reports/gmail-forum-2026-08-22/diag-9cbf9eb6-excerpt.txt`
- **App:** 9.0.621
- **User:** Nobø SWS-IZ TS004F _TZ3000_xffhmvhv Single endpoint Output clusters 5/6/8 Only button 1 generates a usable Homey action
- **Drivers:** button_wireless_4
- **Couples:** `_TZ3000_xffhmvhv+TS004F` → button_wireless_4 (in_log); `_TZ3000_xffhmvhv+TS0044` → ? (in_log)
  - Forbidden: scene_switch_4, smart_knob, wall_switch_4_gang, button_wireless_1
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `scene_mode_unsupported` [medium/BOTH] — scene_switch / TS0044 profile
  - `dp_adapt_not_found` [low/BOTH] — Soft-log DP-ADAPT after device delete
  - `dp_adapt_not_found` [low/BOTH] — DPAdaptationEngine store race after device delete
    - Fix: Soft-log DP-ADAPT Not Found (no stderr spam)
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit

### 9885f3d9 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19e8ec018e1cd120.txt`
- **User:** Power reading=20
- **Drivers:** plug_smart, contact_sensor_switch, contact_sensor_plug, contact_sensor_zigbee, device_plug_energy_monitor, device_radiator_valve_thermostat, dimmer_wall_plug, dimmer_wall_switch, dimmer_wall_water, remote_button_wireless_fingerbot, sensor_climate_presence, sensor_climate_smart, sensor_contact_rain, switch_wall
- **Couples:** `_TZ3210_4ux0ondb+TS011F` → plug_smart (derived_interview)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit

### 9828603d (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19d8d3bb16f47815.txt`
- **Couple:** none in text
- **Root causes:**
  - `wrong_driver_hint` [medium/BOTH] — Lock sacred couple in compose + registry

### 950ea50e (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19ea0dbe048b83b3.txt`
- **User:** Presence sensor not working
- **Drivers:** switch_dimmer_1gang, switch_plug_1, switch_plug_2, switch_temp_sensor, switch_usb_dongle, switch_wall, switch_wall_5gang, switch_wall_6gang, switch_wall_7gang, switch_wall_8gang, switch_wireless, temphumidsensor, thermostat_4ch, thermostat_tuya_dp, thermostatic_radiator_valve, universal_fallback, usb_dongle_triple, usb_outlet_advanced, valve_dual_irrigation, valve_irrigation, valve_single, vibration_sensor, wall_curtain_switch, wall_dimmer_1gang_1way, wall_remote_1_gang, wall_remote_2_gang, wall_remote_3_gang, wall_remote_4_gang, wall_remote_4_gang_3, wall_remote_6_gang, wall_switch_1gang_1way, wall_switch_2gang_1way, wall_switch_3gang_1way, wall_switch_4gang_1way, water_leak_sensor, water_tank_monitor, water_valve_garden, water_valve_smart, wifi_ewelink_switch, wifi_ewelink_switch_2ch, wifi_ewelink_switch_4ch, zigbee_repeater, presence_sensor_radar, motion_sensor_switch, remote_button_wireless_fingerbot, sensor_climate_presence, sensor_climate_smart, sensor_contact_presence, sensor_contact_rain, sensor_contact_water, sensor_gas_presence, sensor_motion_presence, sensor_motion_radar, switch, switch_1gang, switch_2gang, switch_3gang, switch_4gang
- **Couples:** `_TZE284_9ern5sfh+TS0601` → thermostat_tuya_dp (derived_interview); `_TZ3000_iedbgyxt+TS0001` → valve_single (derived_interview); `TZ3210_p68kms0l+TS0207` → water_leak_sensor (derived_interview); `_TZE204_*+TS0601` → water_tank_monitor (derived_interview); `_TZ321C_fkzihaxe8+TS0225` → presence_sensor_radar (derived_interview_soft); `_TZE200_rhgsbacq+TS0601` → presence_sensor_radar (derived_interview_soft)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit

### 9000dcb1 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19da62d7a3a30de7.txt`
- **App:** 7.4.1
- **Drivers:** air_purifier_curtain_hybrid, air_purifier_din_hybrid, air_quality_comprehensive, air_purifier_soil_hybrid, air_quality_comprehensive_hybrid, button_emergency_sos, climate_sensor_smart_hybrid, curtain_motor_tilt, device_air_purifier_humidifier_hybrid, device_air_purifier_quality_hybrid, device_air_purifier_smoke_hybrid, device_air_purifier_soil_hybrid, device_air_purifier_siren_hybrid, diy_custom_zigbee, din_rail_switch, energy_meter_3phase, fan_controller, fingerbot, fingerprint_lock, garage_door, handheld_remote_4_buttons, generic_diy, humidifier, lcdtemphumidsensor, ir_remote, illuminance_sensor, led_controller_rgb, led_controller_cct, led_controller_dimmable, pet_feeder, power_clamp_meter, pool_pump, power_meter, radiator_wifi_tuya, remote_button_emergency_sos_hybrid, remote_button_wireless_hybrid, scene_switch_1, scene_switch_3, scene_switch_2, scene_switch_wall_hybrid, scene_switch_6, sensor_lcdtemphumidsensor_temphumidsensor_hybrid, siren, smart_breaker, sensor_lcdtemphumidsensor_soil_hybrid, smart_heater_controller, smart_heater, smart_button_switch, smart_knob_rotary, smart_knob_switch, smart_rcbo, smart_remote_1_button, smart_remote_1_button_2, smart_remote_4_buttons, smart_scene_panel, smoke_detector_advanced, soil_sensor, switch_plug_1, switch_temp_sensor, switch_plug_2, temphumidsensor, thermostat_4ch, valve_irrigation, valve_single, usb_dongle_triple, wall_remote_1_gang, wall_curtain_switch, wall_remote_3_gang, wall_remote_2_gang, wall_remote_4_gang, wall_remote_4_gang_3, wall_remote_4_gang_2, wall_remote_6_gang, wifi_air_purifier, wifi_air_quality, wifi_dehumidifier, wifi_camera, wifi_cover, wifi_dimmer, wifi_door_lock, wifi_ewelink_bulb, wifi_ewelink_dimmer, wifi_doorbell, wifi_ewelink_pow, wifi_ewelink_led, wifi_ewelink_switch, wifi_ewelink_plug, wifi_ewelink_th, wifi_fan, wifi_ewelink_switch_2ch, wifi_ewelink_fan, wifi_ewelink_switch_4ch, wifi_garage_door, wifi_heater, wifi_generic, wifi_led_strip, wifi_ir_remote, wifi_light, wifi_humidifier, wifi_plug, wifi_power_strip, wifi_pet_feeder, wifi_siren, wifi_sonoff_basicr4, wifi_robot_vacuum, wifi_sensor, wifi_sonoff_minir3, wifi_sonoff_micro, wifi_sonoff_minir4, wifi_sonoff_dualr3, wifi_sonoff_smate2, wifi_sonoff_thr316d, wifi_sonoff_tx_1ch, wifi_sonoff_pow_elite, wifi_sonoff_tx_2ch, wifi_switch_2gang, wifi_sonoff_tx_3ch, wifi_switch_3gang, wifi_thermostat, wifi_switch_4gang, zigbee_repeater, wifi_water_valve, radiator_controller, climate_sensor
- **Couples:** `_TZE204_yvx5lh6k+TS0601` → air_quality_comprehensive (derived_interview); `_TZ3000_0dumfk2z+TS0215A` → button_emergency_sos (derived_interview); `_TZ3210_j4pdtz9v+TS0001` → fingerbot (derived_interview); `_TZE204_81yrt3lo+TS0601` → power_meter (derived_interview_soft); `_TZE284_81yrt3lo+TS0601` → power_meter (derived_interview_soft); `_TZ3000_gwkzibhs+TS004F` → smart_knob_rotary (derived_interview)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `wrong_driver_hint` [medium/BOTH] — Lock sacred couple in compose + registry
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit

### 85bfafb1 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19f335bfcc024448.txt`
- **Drivers:** contact_sensor
- **Couples:** `_TZ3000_o4mkahkc+TS0203` → contact_sensor (derived_interview_soft); `_TZ3000_996rpfy6+TS0203` → contact_sensor (derived_interview_soft); `HOBEIAN+ZG-102Z` → contact_sensor (derived_interview_soft)
- **Root causes:**
  - `ef00_on_ias_only` [medium/BOTH] — shouldSkipIasOnlyEf00Tx
  - `ef00_leftover_ias` [medium/BOTH] — Leftover EF00 TX on IAS-only sleepy
    - Fix: shouldSkipIasOnlyEf00Tx

### 851c02ee (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19f5227e81d45b19.txt`
- **Drivers:** contact_sensor
- **Couples:** `_TZ3000_o4mkahkc+TS0203` → contact_sensor (derived_interview_soft); `_TZ3000_996rpfy6+TS0203` → contact_sensor (derived_interview_soft); `HOBEIAN+ZG-102Z` → contact_sensor (derived_interview_soft)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `ef00_on_ias_only` [medium/BOTH] — shouldSkipIasOnlyEf00Tx
  - `ef00_leftover_ias` [medium/BOTH] — Leftover EF00 TX on IAS-only sleepy
    - Fix: shouldSkipIasOnlyEf00Tx

### 81ad938d (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19d3619fae68025c.txt`
- **App:** 5.11.138
- **User:** GitHub issue: TS0003 (_TZ3000_v4l4b0lp). Testing broken Flow Action cards for Gang 2 to generate DP logs
- **Drivers:** switch_3gang
- **Couples:** `_TZ3000_v4l4b0lp+TS0003` → ? (in_log)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit

### 7f1a66ed (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19e8efd74e1d1a25.txt`
- **User:** Energy monitoring=20
- **Drivers:** plug_smart, contact_sensor_switch, contact_sensor_zigbee, device_plug_energy_monitor, device_radiator_valve_thermostat, dimmer_wall_plug, dimmer_wall_switch, dimmer_wall_water, remote_button_wireless_fingerbot, sensor_climate_presence, sensor_climate_smart, sensor_contact_rain, switch_wall
- **Couples:** `_TZ3210_4ux0ondb+TS011F` → plug_smart (derived_interview)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit

### 703fb7df (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19e82cb0c3d6481d.txt`
- **App:** 8.1.60
- **User:** SOS button and Smart button are added as a Universal ZigBee device, still no response after repair existing SOS.
- **Drivers:** contact_sensor, device_radiator_valve_thermostat, dimmer_wall_plug, dimmer_wall_switch, dimmer_wall_water, remote_button_wireless_fingerbot, sensor_climate_smart, sensor_climate_presence, sensor_contact_rain, switch_wall
- **Couples:** `_TZ3000_o4mkahkc+TS0203` → contact_sensor (derived_interview_soft); `_TZ3000_996rpfy6+TS0203` → contact_sensor (derived_interview_soft); `HOBEIAN+ZG-102Z` → contact_sensor (derived_interview_soft)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit

### 6f512a75 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19cc2ad91965a3b2.txt`
- **App:** 5.11.101
- **Drivers:** switch_4gang, switch_dimmer_1gang, switch_plug_1, switch_plug_2, switch_temp_sensor, switch_wall_5gang, switch_wall_6gang, switch_wall_7gang, switch_wall_8gang, switch_wireless, temphumidsensor, thermostat_4ch, thermostat_tuya_dp, universal_fallback, usb_dongle_dual_repeater, usb_dongle_triple, usb_outlet_advanced, valve_irrigation, valve_single, vibration_sensor, wall_dimmer_1gang_1way, wall_switch_1gang_1way, wall_switch_2gang_1way, wall_switch_3gang_1way, wall_switch_4gang_1way, water_leak_sensor, water_tank_monitor, water_valve_garden, water_valve_smart, weather_station_outdoor, wifi_air_purifier, wifi_air_quality, wifi_cover, wifi_dehumidifier, wifi_dimmer, wifi_door_lock, wifi_doorbell, wifi_fan, wifi_garage_door, wifi_generic, wifi_heater, wifi_humidifier, wifi_ir_remote, wifi_led_strip, wifi_light, wifi_pet_feeder, wifi_plug, wifi_power_strip, wifi_robot_vacuum, wifi_sensor, wifi_siren, wifi_switch, wifi_switch_2gang, wifi_switch_3gang, wifi_switch_4gang, wifi_thermostat, wifi_water_valve, zigbee_repeater, air_quality_comprehensive, din_rail_meter, energy_meter_3phase, lcdtemphumidsensor, pet_feeder, power_clamp_meter, power_meter
- **Couples:** `_TZ3002_*+TS0726` → switch_4gang (derived_interview); `_TZE284_9ern5sfh+TS0601` → thermostat_tuya_dp (derived_interview); `_TZ3000_h1ipgkwn+TS0002` → usb_dongle_dual_repeater (derived_interview); `_TZ3000_iedbgyxt+TS0001` → valve_single (derived_interview); `TZ3210_p68kms0l+TS0207` → water_leak_sensor (derived_interview); `_TZE204_*+TS0601` → water_tank_monitor (derived_interview)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit

### 6d5b5064 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19f29c6165879edc.txt`
- **User:** Valve not working.=20
- **Drivers:** valve_dual_irrigation, boiler_switch_energy
- **Couples:** `_TZE284_fhvpaltk+TS0601` → valve_dual_irrigation (in_log)
  - Forbidden: valve_irrigation, smart_irrigation_valve, device_radiator_valve, valve_single, generic_tuya
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit

### 633e18cd (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19f366521ee6e2fd.txt`
- **Drivers:** button_wireless_4
- **Couples:** `_TZ3000_kfu8zapd+TS0044` → button_wireless_4 (in_log)
  - Forbidden: switch_1gang, scene_switch_4
- **Root causes:**
  - `scene_mode_unsupported` [medium/BOTH] — scene_switch / TS0044 profile

### 609d0c35 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19f710197a2340f5.txt`
- **Drivers:** button_emergency_sos, contact_sensor, smart_irrigation_valve
- **Couples:** `_TZ3000_0dumfk2z+TS0215A` → button_emergency_sos (derived_interview); `_TZ3000_o4mkahkc+TS0203` → contact_sensor (derived_interview_soft); `_TZ3000_996rpfy6+TS0203` → contact_sensor (derived_interview_soft); `HOBEIAN+ZG-102Z` → contact_sensor (derived_interview_soft)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit

### 5fec6dc3 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19e9672d95c22aa3.txt`
- **User:** No luminance data is collected
- **Drivers:** illuminance_sensor, contact_sensor_switch, contact_sensor_zigbee, device_plug_energy_monitor, device_radiator_valve_thermostat, dimmer_wall_plug, dimmer_wall_switch, dimmer_wall_water, remote_button_wireless_fingerbot, sensor_climate_presence, sensor_climate_smart, sensor_contact_rain, switch_wall
- **Couple:** **ABSENT** (do not invent / do not glue known TS0041 couples)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit

### 5d14ef15 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19e597be369fdf27.txt`
- **App:** 8.1.5
- **User:** _TZE200_u6x1zyv2
- **Drivers:** rain_sensor, presence_sensor_radar, soil_sensor, curtain_motor_wall, device_generic_tuya_universal, device_radiator_valve_smart, device_radiator_valve, hvac_air_conditioner, hvac_dehumidifier, lcdtemphumidsensor_plug_energy, light_bulb_rgb_rgbw, sensor_contact_water, sensor_contact_presence, sensor_motion_radar, sensor_motion_presence, smart_scene_panel, switch_1gang, switch_temp_sensor, water_valve_smart
- **Couples:** `_TZ321C_fkzihaxe8+TS0225` → presence_sensor_radar (derived_interview_soft); `_TZE200_rhgsbacq+TS0601` → presence_sensor_radar (derived_interview_soft); `HOBEIAN+ZG-204ZV` → presence_sensor_radar (derived_interview_soft); `_TZE200_3towulqd+TS0601` → presence_sensor_radar (derived_interview_soft); `_TZE200_2aaelwxk+TS0601` → presence_sensor_radar (derived_interview_soft); `_TZE200_kb5noeto+TS0601` → presence_sensor_radar (derived_interview_soft)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit

### 5cdb3cb1 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19e922d4461642ac.txt`
- **User:** No Values =20
- **Drivers:** rain_sensor, soil_sensor, device_plug_energy_monitor, device_radiator_valve_thermostat, dimmer_wall_plug, dimmer_wall_switch, dimmer_wall_water, remote_button_wireless_fingerbot, sensor_climate_presence, sensor_climate_smart, sensor_contact_rain, switch_wall, thermostatic_radiator_valve
- **Couples:** `_TZE284_aa03yzhs+TS0601` → soil_sensor (derived_interview_soft); `_TZE284_oitavov2+TS0601` → soil_sensor (derived_interview_soft)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit

### 53c35301 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/1a0157d94f1004fa.txt`
- **Drivers:** contact_sensor, button_wireless_1, water_leak_sensor, button_emergency_sos
- **Couples:** `_TZ3000_o4mkahkc+TS0203` → contact_sensor (derived_interview_soft); `_TZ3000_996rpfy6+TS0203` → contact_sensor (derived_interview_soft); `HOBEIAN+ZG-102Z` → contact_sensor (derived_interview_soft); `TZ3210_p68kms0l+TS0207` → water_leak_sensor (derived_interview); `_TZ3000_0dumfk2z+TS0215A` → button_emergency_sos (derived_interview)
- **Root causes:**
  - `ef00_on_ias_only` [medium/BOTH] — shouldSkipIasOnlyEf00Tx
  - `battery_health_token` [medium/BOTH] — battery_health_changed flow token missing number
    - Fix: Guard health_score before flow trigger
  - `ef00_leftover_ias` [medium/BOTH] — Leftover EF00 TX on IAS-only sleepy
    - Fix: shouldSkipIasOnlyEf00Tx

### 4c65787e (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19df4c2f40936a63.txt`
- **App:** 7.5.7
- **Couple:** none in text
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit

### 4bccd47a (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19eab6a0dcda6464.txt`
- **User:** __________________________
- **Drivers:** soil_sensor, presence_sensor_radar, sensor_motion_presence, thermostatic_radiator_valve
- **Couples:** `_TZE284_aa03yzhs+TS0601` → soil_sensor (derived_interview_soft); `_TZE284_oitavov2+TS0601` → soil_sensor (derived_interview_soft); `_TZ321C_fkzihaxe8+TS0225` → presence_sensor_radar (derived_interview_soft); `_TZE200_rhgsbacq+TS0601` → presence_sensor_radar (derived_interview_soft); `HOBEIAN+ZG-204ZV` → presence_sensor_radar (derived_interview_soft); `_TZE200_3towulqd+TS0601` → presence_sensor_radar (derived_interview_soft)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit

### 48b715ba (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19ee455648e0acea.txt`
- **User:** Diag logs issue
- **Drivers:** presence_sensor_radar, motion_sensor_2, light_bulb_rgb, light_bulb_rgb_led, light_bulb_rgb_rgbw, light_bulb_tunable_white, motion_sensor_switch, remote_button_wireless_fingerbot, sensor_climate_presence, sensor_climate_smart, sensor_contact_presence, sensor_contact_rain, sensor_contact_water, sensor_gas_presence, sensor_motion_presence, sensor_motion_radar, switch_1gang, switch_temp_sensor, switch_wall, water_valve_smart
- **Couples:** `_TZ321C_fkzihaxe8+TS0225` → presence_sensor_radar (derived_interview_soft); `_TZE200_rhgsbacq+TS0601` → presence_sensor_radar (derived_interview_soft); `HOBEIAN+ZG-204ZV` → presence_sensor_radar (derived_interview_soft); `_TZE200_3towulqd+TS0601` → presence_sensor_radar (derived_interview_soft); `_TZE200_2aaelwxk+TS0601` → presence_sensor_radar (derived_interview_soft); `_TZE200_kb5noeto+TS0601` → presence_sensor_radar (derived_interview_soft)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit

### 45168805 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19ee4bc05393d9b3.txt`
- **User:** Diag log issue=20
- **Drivers:** wall_switch_2gang_1way, wall_remote_6_gang, wall_switch_3gang_1way, wall_switch_4gang_1way, water_leak_sensor, water_tank_monitor, water_valve_garden, water_valve_smart, weather_station_outdoor, wifi_air_purifier, wifi_air_quality, wifi_camera, wifi_cover, wifi_dehumidifier, wall_remote_4_gang_3, wifi_dimmer, wifi_door_lock, wifi_ewelink_bulb, wifi_ewelink_dimmer, wifi_doorbell, wifi_ewelink_fan, wifi_ewelink_led, wifi_ewelink_plug, wifi_ewelink_pow, wifi_ewelink_switch, wifi_ewelink_switch_2ch, wifi_ewelink_switch_4ch, wifi_ewelink_th, wifi_fan, wifi_garage_door, wifi_generic, wifi_heater, wifi_humidifier, wifi_ir_remote, wifi_led_strip, wifi_light, wifi_pet_feeder, wifi_plug, wifi_power_strip, wifi_robot_vacuum, wifi_sensor, wifi_siren, wifi_sonoff_basicr4, wifi_sonoff_dualr3, wifi_sonoff_micro, wifi_sonoff_minir3, wifi_sonoff_minir4, wifi_sonoff_smate2, wifi_sonoff_thr316d, wifi_sonoff_tx_1ch, wifi_sonoff_tx_2ch, wifi_sonoff_tx_3ch, wifi_switch, wifi_switch_2gang, wifi_switch_4gang, wifi_switch_3gang, wifi_thermostat, wifi_water_tank_monitor, wifi_water_valve, zigbee_repeater, button_wireless_3, sensor_contact_water, sensor_motion_presence, sensor_motion_radar, smart_scene_panel, switch, switch_1gang, switch_2gang, switch_3gang, switch_4gang, switch_dimmer_1gang, switch_temp_sensor, switch_usb_dongle
- **Couples:** `TZ3210_p68kms0l+TS0207` → water_leak_sensor (derived_interview); `_TZE204_*+TS0601` → water_tank_monitor (derived_interview); `_TZ3000_*+TS0043` → button_wireless_3 (derived_interview_soft); `_TZ3000_bczr4e10+TS0043` → button_wireless_3 (derived_interview_soft); `_TZ3000_blhvsaqf+TS0001` → switch_1gang (derived_interview_soft); `_TZ3000_ysdv91bk+TS0001` → switch_1gang (derived_interview_soft)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit

### 436a34b3 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19f5c25218c18387.txt`
- **App:** 9.0.211
- **User:** Climate sensor added as unknown
- **Drivers:** wall_switch_4gang_1way, water_leak_sensor, water_tank_monitor, water_valve_garden, water_valve_smart, weather_station_outdoor, wifi_air_purifier, wifi_air_quality, wifi_camera, wifi_cover, wifi_dehumidifier, wifi_dimmer, wifi_door_lock, wifi_doorbell, wifi_ewelink_bulb, wifi_ewelink_dimmer, wifi_ewelink_fan, wifi_ewelink_led, wifi_ewelink_plug, wifi_ewelink_pow, wifi_ewelink_switch, wifi_ewelink_switch_2ch, wifi_ewelink_switch_4ch, wifi_ewelink_th, wifi_fan, wifi_garage_door, wifi_generic, wifi_heater, wifi_humidifier, wifi_ir_remote, wifi_led_strip, wifi_light, wifi_pet_feeder, wifi_plug, wifi_power_strip, wifi_robot_vacuum, wifi_sensor, wifi_siren, wifi_sonoff_basicr4, wifi_sonoff_dualr3, wifi_sonoff_micro, wifi_sonoff_minir3, wifi_sonoff_minir4, wifi_sonoff_pow_elite, wifi_sonoff_smate2, wifi_sonoff_thr316d, wifi_sonoff_tx_1ch, wifi_sonoff_tx_2ch, wifi_sonoff_tx_3ch, wifi_switch, wifi_switch_2gang, wifi_switch_3gang, wifi_switch_4gang, wifi_thermostat, wifi_water_tank_monitor, wifi_water_valve, zigbee_repeater, smart_irrigation_valve
- **Couples:** `TZ3210_p68kms0l+TS0207` → water_leak_sensor (derived_interview); `_TZE204_*+TS0601` → water_tank_monitor (derived_interview)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit

### 43455575 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/19cc1c3ed63eedfb.txt`
- **App:** 5.11.99
- **Drivers:** switch_wall_6gang, switch_wall_7gang, switch_wall_8gang, switch_wireless, temphumidsensor, thermostat_4ch, thermostat_tuya_dp, universal_fallback, usb_dongle_dual_repeater, usb_dongle_triple, usb_outlet_advanced, valve_single, vibration_sensor, wall_dimmer_1gang_1way, valve_irrigation, wall_switch_1gang_1way, wall_switch_2gang_1way, wall_switch_3gang_1way, wall_switch_4gang_1way, water_leak_sensor, water_tank_monitor, water_valve_garden, water_valve_smart, weather_station_outdoor, wifi_air_purifier, wifi_air_quality, wifi_cover, wifi_dehumidifier, wifi_dimmer, wifi_door_lock, wifi_doorbell, wifi_fan, wifi_garage_door, wifi_generic, wifi_heater, wifi_humidifier, wifi_ir_remote, wifi_led_strip, wifi_light, wifi_pet_feeder, wifi_plug, wifi_power_strip, wifi_robot_vacuum, wifi_sensor, wifi_siren, wifi_switch, wifi_switch_2gang, wifi_switch_3gang, wifi_switch_4gang, zigbee_repeater, wifi_thermostat, wifi_water_valve, air_quality_comprehensive, switch_1gang, din_rail_meter, energy_meter_3phase, lcdtemphumidsensor, pet_feeder, power_clamp_meter, power_meter
- **Couples:** `_TZ3000_skueekg3+TS0001` → ? (in_log)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit

## Interview sacred couples (from DEVICE_INTERVIEWS)

| ID | Couple | Driver |
|----|--------|--------|
| INT-146 | `_TZ3002_*+TS0726` | switch_4gang |
| INT-015 | `_TZ3000_zgyzgdua+TS0044` | scene_switch_4 |
| INT-062 | `_TZ3000_kfu8zapd+TS0044` | button_wireless_4 |
| INT-145 | `_TZE200_2aaelwxk+TS0601` | — |
| INT-163 | `_TZE204_ztqnh5cg+TS0601` | — |
| INT-164 | `_TZE284_o3x45p96+TS0601` | — |
| INT-001 | `_TZE284_iadro9bf+TS0601` | — |
| INT-150 | `unknown+unknown` | button_wireless_1 |
| INT-161 | `_TZ3000_zgyzgdua+TS0044` | scene_switch_4 |
| INT-162 | `_TZE284_o3x45p96+TS0601` | — |
| INT-013 | `_TZ3000_*+TS004F` | — |
| INT-111 | `_TZE204_xu4a5rhj+TS0601` | — |
| INT-011 | `_TZ3000_wkai4ga5+TS0044` | scene_switch_4 |
| INT-158 | `_TZE200_3towulqd+TS0601` | — |
| INT-010 | `_TZ3000_*+TS0041` | — |
| INT-166 | `_TZE200_kb5noeto+TS0601` | — |
| INT-151 | `_TZ3002_pzao9ls1+TS0726` | — |
| INT-152 | `unknown+TS0601` | motion_sensor_radar_mmwave |
| INT-002 | `_TZE204_gkfbdvyx+TS0601` | — |
| INT-003 | `_TZE204_*+TS0601` | — |
| INT-004 | `_TZE204_ztqnh5cg+TS0601` | — |
| INT-005 | `_TZ321C_fkzihaxe8+TS0225` | presence_sensor_radar |
| INT-012 | `_TZ3000_5tqxpine+TS0044` | — |
| INT-014 | `_TZ3000_*+TS0043` | button_wireless_3 |
| INT-016 | `_TZE200_rhgsbacq+TS0601` | — |
| INT-017 | `_TZE284_xnbkhhdr+TS0601` | — |
| INT-018 | `_TZ3000_l9brjwau+TS0002` | — |
| INT-019 | `_TZ3000_blhvsaqf+TS0001` | — |
| INT-020 | `_TZ3000_*+TS0203` | — |
| INT-021 | `HOBEIAN+ZG-102Z` | — |
| INT-022 | `_TZ3000_o4mkahkc+TS0203` | — |
| INT-030 | `eWeLink+CK-TLSR8656-SS5-01(7014)` | — |
| INT-031 | `HOBEIAN+ZG-227Z` | climate_sensor |
| INT-032 | `_TZE200_*+TS0601` | climate_sensor |
| INT-044 | `HOBEIAN+ZG-204ZL` | presence_sensor_radar |
| INT-040 | `_TZ3000_*+TS0202` | — |
| INT-041 | `_TZE200_y8jijhba+TS0601` | — |
| INT-042 | `_TZ3000_c8ozah8n+TS0202` | — |
| INT-043 | `_TZ3000_fa9mlvja,_TZ3000_rcuyhwe3+TS0202` | motion_sensor |
| INT-050 | `_TZ3000_blhvsaqf+TS0001` | — |
| INT-051 | `_TZ3000_ysdv91bk+TS0001` | — |
| INT-052 | `_TZ3000_l9brjwau+TS0002` | — |
| INT-053 | `_TZ3000_qkixdnon+TS0003` | — |
| INT-054 | `_TZ3210_4ux0ondb+TS011F` | — |
| INT-2138 | `_TZE284_m1cvyneb+TS0601` | wall_dimmer_tuya |
| INT-2172 | `_TZ3000_*+TS0002` | switch_2gang |
| INT-2173 | `_TZ3000_jjdkhueq+TS0002` | wall_switch_2gang_1way |
| INT-060 | `_TZE204_81yrt3lo+TS0601` | — |
| INT-061 | `SONOFF+S60ZBTPF` | plug_energy_monitor |
| INT-070 | `_TZE200_*+TS0601` | smoke_detector_advanced |
| INT-071 | `_TZE284_gyzlwu5q+TS0601` | — |
| INT-080 | `_TZE284_aa03yzhs+TS0601` | — |
| INT-081 | `_TZE204_*+TS0601` | water_tank_monitor |
| INT-090 | `_TZE284_9ern5sfh+TS0601` | — |
| INT-100 | `_TZE204_yvx5lh6k+TS0601` | — |
| INT-110 | `_TZE204_bjzrowv2+TS0601` | — |
| INT-120 | `_TZE200_t1blo2bj+TS0601` | — |
| INT-130 | `_TZ3210_j4pdtz9v+TS0001` | — |
| INT-143 | `HOBEIAN+ZG-204ZV` | presence_sensor_radar |
| INT-144 | `_TZE200_3towulqd+TS0601` | — |
| INT-140 | `_TZE200_rhgsbacq+TS0601` | — |
| INT-141 | `_TZE200_kb5noeto+TS0601` | — |
| INT-142 | `_TZE200_2aaelwxk+TS0601` | — |
| INT-150 | `_TZ3210_eejm8dcr+TS0505B` | — |
| INT-152 | `_TZ3000_ja5osu5g+ZG-103ZL` | — |
| INT-153 | `_TZ3000_5iixzdo7+TS130F` | — |
| INT-154 | `_TZ3000_bs93npae+TS130F` | — |
| INT-155 | `_TZ3000_l9brjwau+TS0003` | — |
| INT-156 | `_TZ3000_qkixdnon+TS0003` | — |
| INT-157 | `TZ3210_p68kms0l+TS0207` | water_leak_sensor |
| INT-159 | `_TZ3000_996rpfy6+TS0203` | — |
| INT-160 | `_TZE284_81yrt3lo+TS0601` | — |
| INT-162 | `unknown+unknown` | — |
| INT-165 | `unknown+TS0601` | presence_sensor_radar |
| INT-167 | `unknown+unknown` | — |
| INT-147 | `_TZE204_xu4a5rhj+TS0601` | — |
| INT-149 | `_TZE284_o3x45p96+TS0601` | — |
| INT-151 | `_TZE200_icka1clh+TS0601` | — |
| INT-158 | `_TZ3000_iedbgyxt+TS0001` | — |
| INT-164 | `unknown+unknown` | contact_sensor |
| INT-166 | `unknown+unknown` | energy_meter |
| INT-168 | `_TZE284_oitavov2+TS0601` | — |
| INT-169 | `HOBEIAN+ZG-204ZM` | presence_sensor_radar |
| INT-170 | `_TZ3000_bczr4e10+TS0043` | button_wireless_3 |
| INT-171 | `_TZ3000_h1ipgkwn+TS0002` | — |
| INT-172 | `_TZE284_iadro9bf+TS0601` | — |
| INT-173 | `_TZE204_laokfqwu+TS0601` | — |
| INT-174 | `_TZ3000_bgtzm4ny+TS0044` | — |
| INT-175 | `_TZ3000_0dumfk2z+TS0215A` | — |
| INT-176 | `_TZE200_3towulqd+TS0601` | — |

## Next (ops)

1. Drop Gmail PLAIN_TEXT bodies into `.github/state/diag-recursive-inbox/bodies/*.txt` then re-run this script.
2. CI with secrets: `npm run diag:gmail:history` then re-run.
3. Ship BOTH-track fixes already identified; user update + re-pair when couple was ABSENT.
4. Never commit raw bodies; keep reports sanitized.

