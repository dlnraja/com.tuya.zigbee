# W5 interview vs driver clusters (PCr2-2, 2026-10-04)

Source data: 109 normalized interview facts in `docs/data/interviews/` (PC harvest r2, merged per
couple; no IEEE address, user or path). Tool: `node tools/audit/w5-interview-clusters.js`.

## What the platform does (Homey SDK, wireless/zigbee)
- A driver is chosen on `manufacturerName` + `productId` only. Endpoint clusters in the compose
  file are not checked at pairing.
- Only clusters listed in the manifest are exposed on the `ZCLNode`, and zigbee-clusters builds the
  node from the device's own endpoint descriptors. A compose cluster the device does not have is
  just absent at runtime.

## Consequences for the 52 rows of `w5_requires_missing.md`
- "Compose requires clusters absent from the interview" never blocks pairing: those clusters are
  already optional in practice. Nothing is removed (W5, W6, R1).
- The real W5 gap is the other direction: clusters the device has but the compose does not list are
  invisible to device code. Adding them is additive, but it must be reviewed per driver, because a
  newly visible cluster (for example 0xEF00 or 0xE001 on a ZCL driver) can switch code paths for
  every device of that driver. The table lists them as candidates and nothing was applied in bulk.
- Most frequent candidates: groups 0x0004 / scenes 0x0005 (about 45 rows), Tuya 0xE001 / 0xE000
  (40 / 25), identify 0x0003 (36), power configuration 0x0001 (25), 0xED00 (15), metering
  0x0702 / electrical measurement 0x0B04 (10).
- Applied (exact couple, evidence = interview with colorControl + levelControl):
  `eWeLight` / TS0502B → `light_cct_ts0502b` (rule M4).
- Still without a driver: Signify RDM001 and RWL022 (they need the Philips 0xFC00 button cluster),
  iHorn LH02121 (no DP or IAS source), `_TYST11_jeaxp72v` (parse artefact; ignored).

## Generated table (`node tools/audit/w5-interview-clusters.js --md ...`)

{"interviews":109,"unsupportedCouples":4,"rowsWithComposeOnly":40,"rowsWithInterviewOnly":77}

| mfr | pid | driver | in compose, not in interview (absent at runtime, harmless) | in interview, not in compose (add candidates, review per driver) |
|---|---|---|---|---|
| SONOFF | MINI-ZBRBS | curtain_module | — | ep1:[3, 7, 2821, 64529, 64599] |
| HEIMAN | RC-EF-3.0 | button_emergency_sos | ep1:[4, 5, 6, 1281, 57344, 61184] | ep1:[3, 2821] |
| TUYATEC-dxnohkpd | RH3040 | motion_sensor | — | ep1:[1, 3, 1280] |
| _TZ3000_fdxihpp7 | TS0001 | wall_switch_1gang_1way | ep1:[0, 3, 4, 5, 6, 57344, 57345] | — |
| _TZ3000_prits6g4 | TS0001 | switch_1gang | ep1:[0, 4, 5, 6] | — |
| _TZ3000_raytv4q5 | TS0001 | switch_1gang | — | ep1:[3, 57344, 57345]; ep2:[4, 5, 6, 57345]; ep3:[4, 5, 6, 57345] |
| _TZ3000_tqlv4ug4 | TS0001 | switch_1gang | — | ep1:[1, 3, 1280, 57344, 57345] |
| Zbeacon | TS0001 | switch_zbeacon_ts0001 | — | ep1:[10, 4096, 6280, 57344, 57345] |
| _TZ3000_atp7xmd9 | TS0002 | button_wireless_2 | ep1:[1]; ep2:[0, 57344] | ep1:[57345]; ep2:[57345] |
| _TZ3000_xftvfolu | TS0002 | switch_2gang | — | ep1:[3, 57344, 57345]; ep2:[57345]; ep3:[4, 5, 6, 57345] |
| _TZ3210_nuenzetq | TS0002 | switch_2gang | ep2:[4, 5, 6] | ep1:[3, 57344, 57345] |
| _TZ3000_hbic3ka3 | TS0003 | switch_3gang | ep3:[6] | ep1:[3, 4, 5, 1794, 2820, 57344, 57345]; ep2:[4, 5] |
| _TZ3000_kl72oake | TS0003 | switch_3gang | — | ep1:[3, 4, 5, 57344, 57345]; ep2:[4, 5, 57345]; ep3:[4, 5, 57345] |
| _TZ3000_v4l4b0lp | TS0003 | switch_3gang | — | ep1:[3, 4, 5, 57344, 57345]; ep2:[3, 4, 5, 57344, 57345]; ep3:[3, 4, 5, 57344, 57345] |
| _TZ3210_n0wbkysi | TS0003 | switch_1gang | — | ep1:[3, 57344, 57345]; ep2:[4, 5, 6, 57344, 57345]; ep3:[4, 5, 6, 57344, 57345] |
| _TZ3000_e98krvvk | TS0012 | switch_1gang | — | ep1:[3, 57344, 57345]; ep2:[3, 4, 5, 6, 57344, 57345] |
| _TZ3000_jl7qyupf | TS0012 | switch_2gang | — | ep1:[3, 57344, 57345]; ep2:[57345] |
| _TZ3000_mrduubod | TS0014 | wall_switch_4gang_1way | ep2:[0]; ep3:[0]; ep4:[0] | — |
| _TZ3000_5bpeda8u | TS0041 | button_wireless_1 | — | ep1:[57344]; ep2:[1, 6]; ep3:[1, 6]; ep4:[1, 6] |
| _TZ3000_yj6k7vfo | TS0041 | button_wireless_4_ts0041 | ep1:[5, 18]; ep2:[0, 18, 57344]; ep3:[0, 18, 57344]; ep4:[0, 18, 57344] | ep2:[1]; ep3:[1]; ep4:[1] |
| _TZ3000_dzwgk7e2 | TS0042 | button_wireless_2 | ep1:[3, 4, 5]; ep2:[0, 4, 5, 57344] | ep2:[1]; ep3:[1, 6]; ep4:[1, 6] |
| _TZ3000_famkxci2 | TS0043 | button_wireless_3 | — | ep2:[1]; ep3:[1]; ep4:[1, 6] |
| _TZ3000_vsxvaj9i | TS0043 | button_wireless_3 | — | ep2:[1]; ep3:[1]; ep4:[1, 6] |
| _TZ3000_kfu8zapd | TS0044 | button_wireless_4 | ep1:[8, 18]; ep2:[0, 8, 18, 57344]; ep3:[0, 8, 18, 57344]; ep4:[0, 8, 18, 57344] | ep1:[3, 4, 57345]; ep2:[1]; ep3:[1]; ep4:[1] |
| _TZ3000_u3nv1jwk | TS0044 | button_wireless_4 | ep1:[5, 8, 18, 57344]; ep2:[0, 8, 18, 57344]; ep3:[0, 8, 18, 57344]; ep4:[0, 8, 18, 57344] | ep2:[1]; ep3:[1]; ep4:[1] |
| _TZ3000_kaflzta4 | TS004F | smart_knob | ep1:[8] | ep1:[4, 57345] |
| _TZ3000_qja6nq5z | TS004F | smart_knob_rotary | ep1:[8] | — |
| _TZ3000_1obwwnmq | TS011F | socket_power_strip | — | ep1:[3]; ep2:[3]; ep3:[3] |
| _TZ3000_4ux0ondb | TS011F | button_wireless_2 | ep1:[1]; ep2:[0, 4, 5, 6, 57344] | ep1:[1794, 2820, 57345] |
| _TZ3000_5ct6e7ye | TS011F | plug_energy_monitor | — | ep1:[3, 4, 5, 1794, 2820, 57344, 57345] |
| _TZ3000_b28wrpvx | TS011F | button_wireless_2 | ep1:[0, 1, 3, 4, 5, 6, 57344]; ep2:[0, 4, 5, 6, 57344] | — |
| _TZ3000_gjnozsaz | TS011F | button_wireless_plug | — | ep1:[3, 1794, 2820, 57344, 57345] |
| _TZ3000_j1v25l17 | TS011F | smartplug | — | ep1:[3, 57344, 57345] |
| _TZ3000_okaz9tjs | TS011F | plug_energy_monitor | — | ep1:[3, 4, 5, 1794, 2820, 57345] |
| _TZ3000_wzmuk9ai | TS011F | plug_energy_monitor | — | ep1:[3, 4, 5, 1794, 2820, 57345] |
| _TZ3210_2uollq9d | TS011F | plug_energy_monitor | — | ep1:[3, 4, 5, 1794, 2820, 57344, 57345] |
| _TZ3210_4ux0ondb | TS011F | wall_socket | — | ep1:[3, 57344, 57345] |
| _TZ3210_cehuw1lw | TS011F | switch_1gang | — | ep1:[3, 1794, 2820, 57344, 57345] |
| _TZ3210_xzhnra8x | TS011F | button_wireless_plug | — | ep1:[3, 1794, 2820, 57344, 57345] |
| _TZ3000_vtscrpmw | TS0121 | smartplug | ep1:[0, 4, 5, 6, 1794, 2820] | — |
| _TZ3000_fllyghyj | TS0201 | climate_sensor | ep1:[4, 32, 61184, 64529] | — |
| Zbeacon | TS0201 | doorwindowsensor_4 | ep1:[1280] | ep1:[1026, 1029] |
| _TZ3040_bb6xaihh | TS0202 | pir_sensor_2 | — | ep1:[4] |
| _TZ3040_o4mkahkc | TS0202 | slim_motion_sensor | — | ep1:[4] |
| _TZ3000_6zvw8ham | TS0203 | contact_sensor | ep1:[1, 1280] | ep1:[4, 5, 6, 1794, 2820, 57344, 57345] |
| _TYZB01_wqcac7lo | TS0205 | smoke_sensor3 | — | ep1:[3, 1282] |
| _TZ3210_tgvtvdoc | TS0207 | rain_sensor | ep1:[1024] | ep1:[4, 5] |
| _TZ3000_fsiepnrh | TS0215A | button_wireless_2 | ep1:[3, 4, 5, 6, 57344]; ep2:[0, 4, 5, 6, 57344] | ep1:[1280, 1281] |
| _TYZB01_ftdkanlj | TS0222 | lcdtemphumidluxsensor | ep1:[57346] | — |
| _TZ3218_t9ynfz4x | TS0225 | motion_sensor_radar_mmwave | ep1:[1024] | — |
| _TZ3210_jtifm80b | TS0502B | light_cct_ts0502b | — | ep1:[4096, 61184] |
| eWeLight | TS0502B | light_cct_ts0502b | — | ep1:[2821, 4096] |
| Zbeacon | TS0505B | bulb_zbeacon_ts0505b | — | ep1:[4096, 64513, 64515] |
| _TZE200_8ygsuhe1 | TS0601 | air_quality_co2 | — | ep1:[4, 5] |
| _TZE200_bjawzodf | TS0601 | climate_sensor | ep1:[0, 1, 3, 4, 32, 1026, 1029, 61184, 64529] | — |
| _TZE200_cirvgep4 | TS0601 | climate_sensor | ep1:[1, 32, 1026, 1029, 64529] | ep1:[5, 1280, 16384, 57346] |
| _TZE200_ghynnvos | TS0601 | presence_sensor_radar | — | ep1:[4, 5] |
| _TZE200_myd45weu | TS0601 | soil_sensor | — | ep1:[4, 5] |
| _TZE200_ntcy3xu1 | TS0601 | smoke_detector_advanced | ep1:[1, 1280] | ep1:[4, 5] |
| _TZE200_u6x1zyv2 | TS0601 | rain_sensor | — | ep1:[3] |
| _TZE200_vvmbj46n | TS0601 | lcdtemphumidsensor | ep1:[1, 3, 1026, 1029] | ep1:[4, 5] |
| _TZE200_wfxuhoea | TS0601 | garage_door | — | ep1:[4, 5] |
| _TZE204_dcnsggvz | TS0601 | dimmer_wall_1gang | — | ep1:[4, 5] |
| _TZE204_mpbki2zm | TS0601 | wall_thermostat | ep1:[1, 2, 3, 6, 7, 513, 1026] | — |
| _TZE204_ogkdpgy2 | TS0601 | air_quality_co2 | — | ep1:[4, 5] |
| _TZE204_yojqa8xn | TS0601 | sensor_gas_presence | — | ep1:[4, 5] |
| _TZE284_0ints6wl | TS0601 | soil_sensor | — | ep1:[4, 5, 60672] |
| _TZE284_81yrt3lo | TS0601 | power_clamp_meter | ep1:[6, 1794, 2820] | ep1:[1, 1026, 1029, 60672] |
| _TZE284_8se38w3c | TS0601 | climate_sensor | ep1:[1, 3, 32, 1026, 1029, 64529] | ep1:[5, 60672] |
| _TZE284_9ern5sfh | TS0601 | climate_sensor | ep1:[1, 3, 32, 1026, 1029, 64529] | ep1:[5, 60672] |
| _TZE284_aaeasoll | TS0601 | light_sensor_outdoor | ep1:[1, 1024] | — |
| _TZE284_aao3yzhs | TS0601 | soil_sensor | — | ep1:[4, 5, 60672] |
| _TZE284_awepdiwi | TS0601 | soil_sensor | — | ep1:[4, 5, 60672] |
| _TZE284_bquwrqh1 | TS0601 | presence_sensor_radar | — | ep1:[4, 5, 60672] |
| _TZE284_fhvpaltk | TS0601 | valve_dual_irrigation | — | ep1:[60672] |
| _TZE284_fodv6bkr | TS0601 | curtain_motor | — | ep1:[60672] |
| _TZE284_hdml1aav | TS0601 | soil_sensor | — | ep1:[4, 5, 60672] |
| _TZE284_hodyryli | TS0601 | climate_sensor_zt08 | ep1:[0, 4, 5, 60672, 61184] | — |
| _TZE284_m1cvyneb | TS0601 | wall_dimmer_tuya | — | ep1:[60672] |
| _TZE284_myd45weu | TS0601 | soil_sensor | — | ep1:[4, 5, 60672] |
| _TZE284_ne4pikwm | TS0601 | radiator_valve | ep1:[6] | ep1:[4, 5, 60672, 61184] |
| _TZE284_ogx8u5z6 | TS0601 | device_radiator_valve | — | ep1:[60672] |
| _TZE284_uqfph8ah | TS0601 | curtain_motor_shutter | ep1:[6, 258] | ep1:[4, 5, 60672] |
| _TZ3000_7ysdnebc | TS1101 | dimmer_2_gang | ep1:[1] | ep1:[3]; ep2:[3, 4, 5] |
| _TZ3290_ot6ewjvmejq5ekhl | TS1201 | ir_blaster | ep1:[61184] | ep1:[3, 4, 5] |
| _TZ3000_cet6ch1r | TS130F | curtain_motor_wall | ep1:[61184] | ep1:[4, 5, 57345]; ep2:[4, 5, 6, 258, 57345] |
| _TZ3210_ol1uhvza | TS130F | wall_curtain_switch | ep1:[3, 6] | — |
| _TZ3000_bjawzodf | TY0201 | lcdtemphumidsensor | ep1:[61184] | — |
| _TZ1800_ejwkn2h2 | TY0203 | smart_door_window_sensor | — | ep1:[3, 2821] |
| eWeLight | ZB-CL01 | bulb_rgb | — | ep1:[2821, 4096] |
| HOBEIAN | ZG-222Z | water_leak_sensor | — | ep1:[61184] |
| HOBEIAN | ZG-303Z | soil_sensor | — | ep1:[1, 3, 1026, 1029, 1280] |

Couples from interviews with no driver: `iHorn` / LH02121, `Signify Netherlands B.V.` / RDM001, `Signify Netherlands B.V.` / RWL022, `_TYST11_jeaxp72v` / eaxp72v
