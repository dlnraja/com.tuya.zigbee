# Recursive diag + interview treat — 2026-09-27

Silent enrichment only. Same methodology as manual `f647d35b` paste analysis.
**Never invent** manufacturerName+productId. Couple ABSENT stays ABSENT.

Sources scanned: **338** · Unique cases: **259** · Actionable: **69** · Interview couples: **90** · Gmail bodies ingested: **232**

## Signal tally

| Signal | Count |
|--------|------:|
| `wrong_driver_hint` | 8 |
| `heap_oom` | 4 |
| `scene_mode_unsupported` | 3 |
| `athom_socket_hang` | 2 |
| `athom_processing_failed` | 2 |
| `wrong_smart_rcbo` | 2 |
| `flow_guard_spam` | 2 |
| `processing_failed` | 2 |
| `scene_0x8004` | 2 |
| `missing_capability_listener` | 2 |
| `invalid_flow_card` | 1 |

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

### f4dcd5e9 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/imap_f4dcd5e9cb9d.txt`
- **App:** 1.0.82
- **Drivers:** button_wireless_2, button_wireless_1, switch_1gang
- **Couples:** `_TZ3000_blhvsaqf+TS0001` → switch_1gang (derived_interview_soft); `_TZ3000_ysdv91bk+TS0001` → switch_1gang (derived_interview_soft)
- **Root causes:**
  - `heap_oom` [critical/BOTH] — LiveData caps / buffer JSON load
  - `heap_oom` [critical/BOTH] — Homey 64MB heap OOM
    - Fix: Buffer JSON load + LiveData caps

### d7c7b90a (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/imap_d7c7b90a1e77.txt`
- **App:** 9.0.1165
- **Drivers:** switch_1gang, wall_switch_1gang_1way
- **Couples:** `_TZ3000_FDXIHPP7+TS0001` → ? (in_log)
- **Root causes:**
  - `heap_oom` [critical/BOTH] — LiveData caps / buffer JSON load
  - `heap_oom` [critical/BOTH] — Homey 64MB heap OOM
    - Fix: Buffer JSON load + LiveData caps

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

### c33007b0 (interview)

- **Source:** `docs/data/DEVICE_INTERVIEWS.json#INT-146`
- **Couples:** `_TZ3002_*+TS0726` → switch_4gang (interview_locked); `_TZ3002_+TS0726` → ? (interview_locked)
- **Root causes:**
  - `invalid_flow_card` [medium/BOTH] — Check driver.flow.compose.json IDs
  - `missing_capability_listener` [high/BOTH] — Register listener in onNodeInit
  - `flow_guard_spam` [medium/BOTH] — Stale or mismatched flow card IDs
    - Fix: Hashed flow resolve / compose ID audit

### b631c78d (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/imap_b631c78d2f38.txt`
- **Couples:** `_TZE204_gkfbdvyx+TS0601` → presence_sensor_radar (in_log)
  - Forbidden: curtain_motor, device_radiator_valve, radiator_valve, smartplug, generic_tuya, zigbee_universal, unknown_zigbee_unit
- **Root causes:**
  - `missing_capability_listener` [high/BOTH] — Register listener in onNodeInit

### doc-FORUM_ISSUES_ANALYSIS.md--_TZ3000_wkai4ga5-_TZ3000-200.txt (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/doc-FORUM_ISSUES_ANALYSIS.md--_TZ3000_wkai4ga5-_TZ3000-200.txt`
- **Couple:** **ABSENT** (do not invent / do not glue known TS0041 couples)
- **Root causes:**
  - `wrong_driver_hint` [medium/BOTH] — Lock sacred couple in compose + registry

### doc-FORUM_ISSUES_ANALYSIS.md--_TZ3000_wkai4ga5-_TZ3000-892.txt (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/doc-FORUM_ISSUES_ANALYSIS.md--_TZ3000_wkai4ga5-_TZ3000-892.txt`
- **Couple:** **ABSENT** (do not invent / do not glue known TS0041 couples)
- **Root causes:**
  - `wrong_driver_hint` [medium/BOTH] — Lock sacred couple in compose + registry

### doc-GITHUB_RESPONSES_FULL.md-DAVID9SE-_TZ3000_an5rjiwd-FI-20.txt (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/doc-GITHUB_RESPONSES_FULL.md-DAVID9SE-_TZ3000_an5rjiwd-FI-20.txt`
- **Couple:** **ABSENT** (do not invent / do not glue known TS0041 couples)
- **Root causes:**
  - `wrong_driver_hint` [medium/BOTH] — Lock sacred couple in compose + registry

### doc-GITHUB_RESPONSES_FULL.md-DAVID9SE-_TZ3000_an5rjiwd-FIX-336.txt (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/doc-GITHUB_RESPONSES_FULL.md-DAVID9SE-_TZ3000_an5rjiwd-FIX-336.txt`
- **Couple:** **ABSENT** (do not invent / do not glue known TS0041 couples)
- **Root causes:**
  - `wrong_driver_hint` [medium/BOTH] — Lock sacred couple in compose + registry

### INT-015 (interview)

- **Source:** `docs/data/DEVICE_INTERVIEWS.json#INT-015`
- **Couples:** `_TZ3000_zgyzgdua+TS0044` → scene_switch_4 (interview_locked)
  - Forbidden: button_wireless_4, smart_knob, wall_dimmer_tuya
- **Root causes:**
  - `scene_mode_unsupported` [medium/BOTH] — scene_switch / TS0044 profile

### INT-062 (interview)

- **Source:** `docs/data/DEVICE_INTERVIEWS.json#INT-062`
- **Couples:** `_TZ3000_kfu8zapd+TS0044` → button_wireless_4 (interview_locked)
  - Forbidden: switch_1gang, scene_switch_4
- **Root causes:**
  - `scene_mode_unsupported` [medium/BOTH] — scene_switch / TS0044 profile
  - `scene_0x8004` [medium/BOTH] — TS004x scene mode attribute probe
    - Fix: Skip 0x8004 for known scene/button mfrs

### INT-145 (interview)

- **Source:** `docs/data/DEVICE_INTERVIEWS.json#INT-145`
- **Couples:** `_TZE200_2aaelwxk+TS0601` → presence_sensor_radar (interview_locked); `HOBEIAN+ZG-204ZM` → presence_sensor_radar (interview_locked); `HOBEIAN+zg-204zm-review` → ? (interview_locked)
  - Forbidden: climate_sensor, vibration_sensor, soil_sensor, power_clamp_meter, motion_sensor
  - Forbidden: climate_sensor, climate_sensor_energy, sensor_climate_temphumidsensor, temphumidsensor, temphumidsensor5, soil_sensor, vibration_sensor, power_clamp_meter, motion_sensor, radar_sensor_ceiling
- **Root causes:**
  - `wrong_driver_hint` [medium/BOTH] — Lock sacred couple in compose + registry

### INT-163 (interview)

- **Source:** `docs/data/DEVICE_INTERVIEWS.json#INT-163`
- **Couples:** `_TZE204_ztqnh5cg+TS0601` → ? (interview_locked)
- **Root causes:**
  - `wrong_driver_hint` [medium/BOTH] — Lock sacred couple in compose + registry

### ebf31bb8 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/imap_ebf31bb85430.txt`
- **Couples:** `_TZE204_gkfbdvyx+TS0601` → presence_sensor_radar (in_log)
  - Forbidden: curtain_motor, device_radiator_valve, radiator_valve, smartplug, generic_tuya, zigbee_universal, unknown_zigbee_unit

### e7bcb045 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/imap_e7bcb045c7e3.txt`
- **Couples:** `_TZE284_ogx8u5z6+TS0601` → device_radiator_valve (in_log)
  - Forbidden: climate_sensor, wall_thermostat, zigbee_universal

### d517ff88 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/imap_d517ff884078.txt`
- **Couples:** `_TZE204_gkfbdvyx+TS0601` → presence_sensor_radar (in_log)
  - Forbidden: curtain_motor, device_radiator_valve, radiator_valve, smartplug, generic_tuya, zigbee_universal, unknown_zigbee_unit

### d3b8f0ad (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/imap_d3b8f0ad2c3d.txt`
- **Couples:** `_TZE204_gkfbdvyx+TS0601` → presence_sensor_radar (in_log)
  - Forbidden: curtain_motor, device_radiator_valve, radiator_valve, smartplug, generic_tuya, zigbee_universal, unknown_zigbee_unit

### d1d1eefe (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/imap_d1d1eefe8db4.txt`
- **Couples:** `_TZE204_gkfbdvyx+TS0601` → presence_sensor_radar (in_log)
  - Forbidden: curtain_motor, device_radiator_valve, radiator_valve, smartplug, generic_tuya, zigbee_universal, unknown_zigbee_unit

### cb672707 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/imap_cb6727077498.txt`
- **App:** 1.0.93
- **Drivers:** button_wireless_2, button_wireless_1, button_wireless_3
- **Couples:** `_TZ3000_dzwgk7e2+TS0042` → button_wireless_2 (in_log)
  - Forbidden: button_wireless_1, button_wireless_4, scene_switch_4, switch_2gang, zigbee_universal, generic_tuya

### b49324ab (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/imap_b49324ab22cb.txt`
- **App:** 1.0.7
- **Drivers:** remote_button_wireless_wall
- **Couples:** `_TZ3000_axpdxqgu+TS0041` → button_wireless_1 (in_log)
  - Forbidden: remote_button_wireless_wall, smart_knob, button_wireless_4, scene_switch_4

### ad2e946e (interview)

- **Source:** `docs/data/DEVICE_INTERVIEWS.json#INT-161`
- **Couples:** `_TZ3000_zgyzgdua+TS0044` → scene_switch_4 (interview_locked)
  - Forbidden: button_wireless_4, smart_knob, wall_dimmer_tuya

### ab1dfbb3 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/imap_ab1dfbb3bc07.txt`
- **App:** 1.0.53
- **Drivers:** switch_1gang, button_wireless_2, button_wireless_3
- **Couples:** `_TZ3000_dzwgk7e2+TS0042` → button_wireless_2 (in_log)
  - Forbidden: button_wireless_1, button_wireless_4, scene_switch_4, switch_2gang, zigbee_universal, generic_tuya

### a98b597c (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/imap_a98b597c4451.txt`
- **App:** 1.0.80
- **Drivers:** switch_1gang, button_wireless_3, button_wireless_2, button_wireless_1
- **Couples:** `_TZ3000_dzwgk7e2+TS0042` → button_wireless_2 (in_log)
  - Forbidden: button_wireless_1, button_wireless_4, scene_switch_4, switch_2gang, zigbee_universal, generic_tuya

### a15abd94 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/imap_a15abd948498.txt`
- **App:** 1.0.76
- **Drivers:** switch_1gang, button_wireless_2
- **Couples:** `_TZ3000_dzwgk7e2+TS0042` → button_wireless_2 (in_log)
  - Forbidden: button_wireless_1, button_wireless_4, scene_switch_4, switch_2gang, zigbee_universal, generic_tuya

### 9ab1e21e (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/imap_9ab1e21e9ad2.txt`
- **Couples:** `_TZE204_gkfbdvyx+TS0601` → presence_sensor_radar (in_log)
  - Forbidden: curtain_motor, device_radiator_valve, radiator_valve, smartplug, generic_tuya, zigbee_universal, unknown_zigbee_unit

### 9761b749 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/imap_9761b749fc01.txt`
- **App:** 1.0.53
- **Drivers:** switch_1gang, button_wireless_2, button_wireless_3
- **Couples:** `_TZ3000_dzwgk7e2+TS0042` → button_wireless_2 (in_log)
  - Forbidden: button_wireless_1, button_wireless_4, scene_switch_4, switch_2gang, zigbee_universal, generic_tuya

### 9389e216 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/imap_9389e216b140.txt`
- **Couples:** `_TZE204_gkfbdvyx+TS0601` → presence_sensor_radar (in_log)
  - Forbidden: curtain_motor, device_radiator_valve, radiator_valve, smartplug, generic_tuya, zigbee_universal, unknown_zigbee_unit

### 90263ff1 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/imap_90263ff1e250.txt`
- **Couples:** `_TZE204_gkfbdvyx+TS0601` → presence_sensor_radar (in_log)
  - Forbidden: curtain_motor, device_radiator_valve, radiator_valve, smartplug, generic_tuya, zigbee_universal, unknown_zigbee_unit

### 8972b1d0 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/imap_8972b1d096f2.txt`
- **Couples:** `_TZE204_gkfbdvyx+TS0601` → presence_sensor_radar (in_log)
  - Forbidden: curtain_motor, device_radiator_valve, radiator_valve, smartplug, generic_tuya, zigbee_universal, unknown_zigbee_unit

### 87b09c7a (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/imap_87b09c7af7c5.txt`
- **Couples:** `_TZE204_gkfbdvyx+TS0601` → presence_sensor_radar (in_log)
  - Forbidden: curtain_motor, device_radiator_valve, radiator_valve, smartplug, generic_tuya, zigbee_universal, unknown_zigbee_unit

### 85b60092 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/imap_85b60092a6fc.txt`
- **App:** 1.0.60
- **Drivers:** switch_1gang, button_wireless_2
- **Couples:** `_TZ3000_dzwgk7e2+ts0042` → button_wireless_2 (in_log)
  - Forbidden: button_wireless_1, button_wireless_4, scene_switch_4, switch_2gang, zigbee_universal, generic_tuya

### 63cacdf6 (interview)

- **Source:** `docs/data/DEVICE_INTERVIEWS.json#INT-011`
- **Couples:** `_TZ3000_wkai4ga5+TS0044` → scene_switch_4 (interview_locked)
  - Forbidden: button_wireless_4, smart_knob, wall_switch_4_gang, wall_dimmer_tuya

### 61b655cb (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/imap_61b655cbc4cb.txt`
- **Couples:** `_TZE204_gkfbdvyx+TS0601` → presence_sensor_radar (in_log)
  - Forbidden: curtain_motor, device_radiator_valve, radiator_valve, smartplug, generic_tuya, zigbee_universal, unknown_zigbee_unit

### 52546992 (interview)

- **Source:** `docs/data/DEVICE_INTERVIEWS.json#INT-158`
- **Couples:** `_TZE200_3towulqd+TS0601` → presence_sensor_radar (interview_locked); `HOBEIAN+ZG-204ZV` → presence_sensor_radar (interview_locked)
  - Forbidden: air_purifier, wall_switch_5_gang_tuya, climate_sensor
  - Forbidden: climate_sensor, climate_sensor_energy, sensor_climate_temphumidsensor, temphumidsensor, temphumidsensor5, soil_sensor, vibration_sensor, power_clamp_meter, motion_sensor, radar_sensor_ceiling

### 33677378 (interview)

- **Source:** `docs/data/DEVICE_INTERVIEWS.json#INT-166`
- **Couples:** `_TZE200_kb5noeto+TS0601` → presence_sensor_radar (interview_locked)
  - Forbidden: climate_sensor, vibration_sensor, soil_sensor, power_clamp_meter, motion_sensor

### 2cc1e137 (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/imap_2cc1e137e1e9.txt`
- **App:** 9.0.1037
- **Drivers:** device_radiator_valve
- **Couples:** `_TZE284_ogx8u5z6+TS0601` → device_radiator_valve (in_log)
  - Forbidden: climate_sensor, wall_thermostat, zigbee_universal

### 17a4197f (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/imap_17a4197f8977.txt`
- **Couples:** `_TZE204_gkfbdvyx+TS0601` → presence_sensor_radar (in_log)
  - Forbidden: curtain_motor, device_radiator_valve, radiator_valve, smartplug, generic_tuya, zigbee_universal, unknown_zigbee_unit

### 1081c90e (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/imap_1081c90ee398.txt`
- **Couples:** `_TZE204_gkfbdvyx+TS0601` → presence_sensor_radar (in_log)
  - Forbidden: curtain_motor, device_radiator_valve, radiator_valve, smartplug, generic_tuya, zigbee_universal, unknown_zigbee_unit

### doc-FORUM_ISSUES_ANALYSIS.md--Scene-Switches-No-Button-75.txt (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/doc-FORUM_ISSUES_ANALYSIS.md--Scene-Switches-No-Button-75.txt`
- **Couple:** **ABSENT** (do not invent / do not glue known TS0041 couples)

### doc-FORUM_ISSUES_ANALYSIS.md--Scene-Switches-No-Button-767.txt (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/doc-FORUM_ISSUES_ANALYSIS.md--Scene-Switches-No-Button-767.txt`
- **Couple:** **ABSENT** (do not invent / do not glue known TS0041 couples)

### doc-FORUM_ISSUES_ANALYSIS.md--_TZE204_gkfbdvyx-Similar-146.txt (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/doc-FORUM_ISSUES_ANALYSIS.md--_TZE204_gkfbdvyx-Similar-146.txt`
- **Couples:** `_TZE204_gkfbdvyx+TS0601` → presence_sensor_radar (in_log)
  - Forbidden: curtain_motor, device_radiator_valve, radiator_valve, smartplug, generic_tuya, zigbee_universal, unknown_zigbee_unit

### doc-FORUM_ISSUES_ANALYSIS.md--_TZE204_gkfbdvyx-Similar-838.txt (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/doc-FORUM_ISSUES_ANALYSIS.md--_TZE204_gkfbdvyx-Similar-838.txt`
- **Couples:** `_TZE204_gkfbdvyx+TS0601` → presence_sensor_radar (in_log)
  - Forbidden: curtain_motor, device_radiator_valve, radiator_valve, smartplug, generic_tuya, zigbee_universal, unknown_zigbee_unit

### doc-GITHUB_RESPONSES_FULL.md-DVMasters-TS0043-_TZ3000_fam-32.txt (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/doc-GITHUB_RESPONSES_FULL.md-DVMasters-TS0043-_TZ3000_fam-32.txt`
- **Couple:** **ABSENT** (do not invent / do not glue known TS0041 couples)

### doc-GITHUB_RESPONSES_FULL.md-DVMasters-TS0043-_TZ3000_famk-348.txt (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/doc-GITHUB_RESPONSES_FULL.md-DVMasters-TS0043-_TZ3000_famk-348.txt`
- **Couple:** **ABSENT** (do not invent / do not glue known TS0041 couples)

### doc-GITHUB_RESPONSES_FULL.md-Lalla80111-TS0041-button-NO--8.txt (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/doc-GITHUB_RESPONSES_FULL.md-Lalla80111-TS0041-button-NO--8.txt`
- **Couples:** `_TZ3000_b4awzgct+TS0041` → button_wireless_1 (in_log)
  - Forbidden: button_wireless_4_ts0041, switch_1gang, scene_switch_1, scene_switch_4

### doc-GITHUB_RESPONSES_FULL.md-Lalla80111-TS0041-button-NO-F-324.txt (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/doc-GITHUB_RESPONSES_FULL.md-Lalla80111-TS0041-button-NO-F-324.txt`
- **Couples:** `_TZ3000_b4awzgct+TS0041` → button_wireless_1 (in_log)
  - Forbidden: button_wireless_4_ts0041, switch_1gang, scene_switch_1, scene_switch_4

### doc-GITHUB_RESPONSES_FULL.md-Lalla80111-TS0041-_TZ3000_b4-23.txt (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/doc-GITHUB_RESPONSES_FULL.md-Lalla80111-TS0041-_TZ3000_b4-23.txt`
- **Couple:** **ABSENT** (do not invent / do not glue known TS0041 couples)

### doc-GITHUB_RESPONSES_FULL.md-Lalla80111-TS0041-_TZ3000_b4a-339.txt (gmail_body)

- **Source:** `.github/state/diag-recursive-inbox/bodies/doc-GITHUB_RESPONSES_FULL.md-Lalla80111-TS0041-_TZ3000_b4a-339.txt`
- **Couple:** **ABSENT** (do not invent / do not glue known TS0041 couples)

### INT-002 (interview)

- **Source:** `docs/data/DEVICE_INTERVIEWS.json#INT-002`
- **Couples:** `_TZE204_gkfbdvyx+TS0601` → presence_sensor_radar (interview_locked)
  - Forbidden: curtain_motor, device_radiator_valve, radiator_valve, smartplug, generic_tuya, zigbee_universal, unknown_zigbee_unit

### INT-012 (interview)

- **Source:** `docs/data/DEVICE_INTERVIEWS.json#INT-012`
- **Couples:** `_TZ3000_5tqxpine+TS0044` → scene_switch_4 (interview_locked)
  - Forbidden: button_wireless_4, smart_knob

### INT-018 (interview)

- **Source:** `docs/data/DEVICE_INTERVIEWS.json#INT-018`
- **Couples:** `_TZ3000_l9brjwau+TS0002` → wall_switch_2gang_1way (interview_locked)
  - Forbidden: switch_2gang, switch_2_gang, switch_1gang, wall_switch_1gang_1way, button_wireless_2

### INT-031 (interview)

- **Source:** `docs/data/DEVICE_INTERVIEWS.json#INT-031`
- **Couples:** `HOBEIAN+ZG-227Z` → climate_sensor (interview_locked)
  - Forbidden: soil_sensor, soilsensor_2, presence_sensor_radar, sensor_contact_presence, motion_sensor, contact_sensor

### INT-044 (interview)

- **Source:** `docs/data/DEVICE_INTERVIEWS.json#INT-044`
- **Couples:** `HOBEIAN+ZG-204ZL` → presence_sensor_radar (interview_locked)
  - Forbidden: climate_sensor, climate_sensor_energy, sensor_climate_temphumidsensor, temphumidsensor, temphumidsensor5, soil_sensor, vibration_sensor, power_clamp_meter, motion_sensor, radar_sensor_ceiling

### INT-051 (interview)

- **Source:** `docs/data/DEVICE_INTERVIEWS.json#INT-051`
- **Couples:** `_TZ3000_ysdv91bk+TS0001` → wall_switch_1gang_1way (interview_locked)
  - Forbidden: switch_1gang, wall_switch_2gang_1way, generic_tuya, zigbee_universal

### INT-052 (interview)

- **Source:** `docs/data/DEVICE_INTERVIEWS.json#INT-052`
- **Couples:** `_TZ3000_l9brjwau+TS0002` → wall_switch_2gang_1way (interview_locked)
  - Forbidden: switch_2gang, switch_2_gang, switch_1gang, wall_switch_1gang_1way, button_wireless_2

### INT-2138 (interview)

- **Source:** `docs/data/DEVICE_INTERVIEWS.json#INT-2138`
- **Couples:** `_TZE284_m1cvyneb+TS0601` → wall_dimmer_tuya (interview_locked)
  - Forbidden: climate_sensor, climate_sensor_temperature, thermostat, air_purifier_climate, soil_sensor, zigbee_universal, generic_tuya, ir_blaster

### INT-2173 (interview)

- **Source:** `docs/data/DEVICE_INTERVIEWS.json#INT-2173`
- **Couples:** `_TZ3000_jjdkhueq+TS0002` → wall_switch_2gang_1way (interview_locked)
  - Forbidden: switch_1gang, climate_sensor, switch_3gang, switch_2gang

### INT-060 (interview)

- **Source:** `docs/data/DEVICE_INTERVIEWS.json#INT-060`
- **Couples:** `_TZE204_81yrt3lo+TS0601` → power_clamp_meter (interview_locked)
  - Forbidden: power_meter, din_rail_meter

### INT-100 (interview)

- **Source:** `docs/data/DEVICE_INTERVIEWS.json#INT-100`
- **Couples:** `_TZE204_yvx5lh6k+TS0601` → air_quality_co2 (interview_locked)
  - Forbidden: climate_sensor, soil_sensor, zigbee_universal, air_quality_comprehensive, smart_air_detection_box

### INT-143 (interview)

- **Source:** `docs/data/DEVICE_INTERVIEWS.json#INT-143`
- **Couples:** `HOBEIAN+ZG-204ZV` → presence_sensor_radar (interview_locked); `HOBEIAN+ZG-204ZV.html` → ? (interview_locked); `HOBEIAN+ZG-204ZG` → ? (interview_locked)
  - Forbidden: climate_sensor, climate_sensor_energy, sensor_climate_temphumidsensor, temphumidsensor, temphumidsensor5, soil_sensor, vibration_sensor, power_clamp_meter, motion_sensor, radar_sensor_ceiling

### INT-144 (interview)

- **Source:** `docs/data/DEVICE_INTERVIEWS.json#INT-144`
- **Couples:** `_TZE200_3towulqd+TS0601` → presence_sensor_radar (interview_locked); `HOBEIAN+ZG-204ZL` → presence_sensor_radar (interview_locked); `HOBEIAN+ZG-204ZV` → presence_sensor_radar (interview_locked); `HOBEIAN+ZG-204ZM` → presence_sensor_radar (interview_locked)
  - Forbidden: air_purifier, wall_switch_5_gang_tuya, climate_sensor
  - Forbidden: climate_sensor, climate_sensor_energy, sensor_climate_temphumidsensor, temphumidsensor, temphumidsensor5, soil_sensor, vibration_sensor, power_clamp_meter, motion_sensor, radar_sensor_ceiling
  - Forbidden: climate_sensor, climate_sensor_energy, sensor_climate_temphumidsensor, temphumidsensor, temphumidsensor5, soil_sensor, vibration_sensor, power_clamp_meter, motion_sensor, radar_sensor_ceiling
  - Forbidden: climate_sensor, climate_sensor_energy, sensor_climate_temphumidsensor, temphumidsensor, temphumidsensor5, soil_sensor, vibration_sensor, power_clamp_meter, motion_sensor, radar_sensor_ceiling

### INT-141 (interview)

- **Source:** `docs/data/DEVICE_INTERVIEWS.json#INT-141`
- **Couples:** `_TZE200_kb5noeto+TS0601` → presence_sensor_radar (interview_locked)
  - Forbidden: climate_sensor, vibration_sensor, soil_sensor, power_clamp_meter, motion_sensor

### INT-142 (interview)

- **Source:** `docs/data/DEVICE_INTERVIEWS.json#INT-142`
- **Couples:** `_TZE200_2aaelwxk+TS0601` → presence_sensor_radar (interview_locked)
  - Forbidden: climate_sensor, vibration_sensor, soil_sensor, power_clamp_meter, motion_sensor

### INT-155 (interview)

- **Source:** `docs/data/DEVICE_INTERVIEWS.json#INT-155`
- **Couples:** `_TZ3000_l9brjwau+TS0003` → wall_switch_3gang_1way (interview_locked)
  - Forbidden: switch_2gang, switch_3gang

### INT-151 (interview)

- **Source:** `docs/data/DEVICE_INTERVIEWS.json#INT-151`
- **Couples:** `_TZE200_icka1clh+TS0601` → curtain_motor (interview_locked)
  - Forbidden: curtain_motor_shutter, curtain_motor_tilt, climate_sensor, soil_sensor, zigbee_universal, generic_tuya

### INT-169 (interview)

- **Source:** `docs/data/DEVICE_INTERVIEWS.json#INT-169`
- **Couples:** `HOBEIAN+ZG-204ZM` → presence_sensor_radar (interview_locked)
  - Forbidden: climate_sensor, climate_sensor_energy, sensor_climate_temphumidsensor, temphumidsensor, temphumidsensor5, soil_sensor, vibration_sensor, power_clamp_meter, motion_sensor, radar_sensor_ceiling

### INT-170 (interview)

- **Source:** `docs/data/DEVICE_INTERVIEWS.json#INT-170`
- **Couples:** `_TZ3000_bczr4e10+TS0043` → button_wireless_3 (interview_locked)
  - Forbidden: switch_3gang, switch_4gang, switch_2gang

### INT-176 (interview)

- **Source:** `docs/data/DEVICE_INTERVIEWS.json#INT-176`
- **Couples:** `_TZE200_3towulqd+TS0601` → presence_sensor_radar (interview_locked)
  - Forbidden: air_purifier, wall_switch_5_gang_tuya, climate_sensor

## Interview sacred couples (from DEVICE_INTERVIEWS)

| ID | Couple | Driver |
|----|--------|--------|
| INT-146 | `_TZ3002_*+TS0726` | switch_4gang |
| INT-015 | `_TZ3000_zgyzgdua+TS0044` | scene_switch_4 |
| INT-062 | `_TZ3000_kfu8zapd+TS0044` | button_wireless_4 |
| INT-145 | `_TZE200_2aaelwxk+TS0601` | presence_sensor_radar |
| INT-163 | `_TZE204_ztqnh5cg+TS0601` | — |
| INT-164 | `_TZE284_o3x45p96+TS0601` | — |
| INT-001 | `_TZE284_iadro9bf+TS0601` | — |
| INT-150 | `unknown+unknown` | button_wireless_1 |
| INT-161 | `_TZ3000_zgyzgdua+TS0044` | scene_switch_4 |
| INT-162 | `_TZE284_o3x45p96+TS0601` | — |
| INT-013 | `_TZ3000_*+TS004F` | — |
| INT-111 | `_TZE204_xu4a5rhj+TS0601` | — |
| INT-011 | `_TZ3000_wkai4ga5+TS0044` | scene_switch_4 |
| INT-158 | `_TZE200_3towulqd+TS0601` | presence_sensor_radar |
| INT-010 | `_TZ3000_*+TS0041` | — |
| INT-166 | `_TZE200_kb5noeto+TS0601` | presence_sensor_radar |
| INT-151 | `_TZ3002_pzao9ls1+TS0726` | — |
| INT-152 | `unknown+TS0601` | motion_sensor_radar_mmwave |
| INT-002 | `_TZE204_gkfbdvyx+TS0601` | presence_sensor_radar |
| INT-003 | `_TZE204_*+TS0601` | — |
| INT-004 | `_TZE204_ztqnh5cg+TS0601` | — |
| INT-005 | `_TZ321C_fkzihaxe8+TS0225` | presence_sensor_radar |
| INT-012 | `_TZ3000_5tqxpine+TS0044` | scene_switch_4 |
| INT-014 | `_TZ3000_*+TS0043` | button_wireless_3 |
| INT-016 | `_TZE200_rhgsbacq+TS0601` | presence_sensor_radar |
| INT-017 | `_TZE284_xnbkhhdr+TS0601` | — |
| INT-018 | `_TZ3000_l9brjwau+TS0002` | wall_switch_2gang_1way |
| INT-019 | `_TZ3000_blhvsaqf+TS0001` | — |
| INT-020 | `_TZ3000_*+TS0203` | — |
| INT-021 | `HOBEIAN+ZG-102Z` | — |
| INT-022 | `_TZ3000_o4mkahkc+TS0203` | — |
| INT-030 | `eWeLink+CK-TLSR8656-SS5-01(7014)` | climate_sensor |
| INT-031 | `HOBEIAN+ZG-227Z` | climate_sensor |
| INT-032 | `_TZE200_*+TS0601` | climate_sensor |
| INT-044 | `HOBEIAN+ZG-204ZL` | presence_sensor_radar |
| INT-040 | `_TZ3000_*+TS0202` | — |
| INT-041 | `_TZE200_y8jijhba+TS0601` | — |
| INT-042 | `_TZ3000_c8ozah8n+TS0202` | — |
| INT-043 | `_TZ3000_fa9mlvja,_TZ3000_rcuyhwe3+TS0202` | motion_sensor |
| INT-050 | `_TZ3000_blhvsaqf+TS0001` | — |
| INT-051 | `_TZ3000_ysdv91bk+TS0001` | wall_switch_1gang_1way |
| INT-052 | `_TZ3000_l9brjwau+TS0002` | wall_switch_2gang_1way |
| INT-053 | `_TZ3000_qkixdnon+TS0003` | — |
| INT-054 | `_TZ3210_4ux0ondb+TS011F` | — |
| INT-2138 | `_TZE284_m1cvyneb+TS0601` | wall_dimmer_tuya |
| INT-2172 | `_TZ3000_*+TS0002` | switch_2gang |
| INT-2173 | `_TZ3000_jjdkhueq+TS0002` | wall_switch_2gang_1way |
| INT-060 | `_TZE204_81yrt3lo+TS0601` | power_clamp_meter |
| INT-061 | `SONOFF+S60ZBTPF` | plug_energy_monitor |
| INT-070 | `_TZE200_*+TS0601` | smoke_detector_advanced |
| INT-071 | `_TZE284_gyzlwu5q+TS0601` | — |
| INT-080 | `_TZE284_aa03yzhs+TS0601` | — |
| INT-081 | `_TZE204_*+TS0601` | water_tank_monitor |
| INT-090 | `_TZE284_9ern5sfh+TS0601` | — |
| INT-100 | `_TZE204_yvx5lh6k+TS0601` | air_quality_co2 |
| INT-110 | `_TZE204_bjzrowv2+TS0601` | — |
| INT-120 | `_TZE200_t1blo2bj+TS0601` | — |
| INT-130 | `_TZ3210_j4pdtz9v+TS0001` | — |
| INT-143 | `HOBEIAN+ZG-204ZV` | presence_sensor_radar |
| INT-144 | `_TZE200_3towulqd+TS0601` | presence_sensor_radar |
| INT-140 | `_TZE200_rhgsbacq+TS0601` | presence_sensor_radar |
| INT-141 | `_TZE200_kb5noeto+TS0601` | presence_sensor_radar |
| INT-142 | `_TZE200_2aaelwxk+TS0601` | presence_sensor_radar |
| INT-150 | `_TZ3210_eejm8dcr+TS0505B` | — |
| INT-152 | `_TZ3000_ja5osu5g+ZG-103ZL` | — |
| INT-153 | `_TZ3000_5iixzdo7+TS130F` | — |
| INT-154 | `_TZ3000_bs93npae+TS130F` | — |
| INT-155 | `_TZ3000_l9brjwau+TS0003` | wall_switch_3gang_1way |
| INT-156 | `_TZ3000_qkixdnon+TS0003` | — |
| INT-157 | `TZ3210_p68kms0l+TS0207` | water_leak_sensor |
| INT-159 | `_TZ3000_996rpfy6+TS0203` | — |
| INT-160 | `_TZE284_81yrt3lo+TS0601` | — |
| INT-162 | `unknown+unknown` | — |
| INT-165 | `unknown+TS0601` | presence_sensor_radar |
| INT-167 | `unknown+unknown` | — |
| INT-147 | `_TZE204_xu4a5rhj+TS0601` | — |
| INT-149 | `_TZE284_o3x45p96+TS0601` | — |
| INT-151 | `_TZE200_icka1clh+TS0601` | curtain_motor |
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
| INT-176 | `_TZE200_3towulqd+TS0601` | presence_sensor_radar |

## Next (ops)

1. Drop Gmail PLAIN_TEXT bodies into `.github/state/diag-recursive-inbox/bodies/*.txt` then re-run this script.
2. CI with secrets: `npm run diag:gmail:history` then re-run.
3. Ship BOTH-track fixes already identified; user update + re-pair when couple was ABSENT.
4. Never commit raw bodies; keep reports sanitized.

