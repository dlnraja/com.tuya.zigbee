# Fingerprint Cross-Reference Report
# Updated: 2026-03-21 04:17
# Total remaining: 247 (down from 681, 64% resolved)
# Groups: 33

## RESOLUTION SUMMARY

| Phase | Action | Resolved |
|---|---|---|
| Manual | Remove 3 knob mfrs from button_wireless_4 | ~9 |
| Manual | Remove 8 repeater mfrs + RH3001 pid from water_leak_sensor | ~9 |
| Manual | Remove 12 dimmer mfrs + TS0003 pid from switch_1gang | ~26 |
| Manual | Remove 3 single-gang mfrs from dimmer_dual_channel | ~6 |
| Manual | Remove 3 thermostat mfrs from air_purifier | ~3 |
| Manual | Remove 15 TRV mfrs from thermostat_tuya_dp | ~15 |
| Manual | Remove zbeacon/Zbeacon from contact_sensor | ~1 |
| Auto | fix-fingerprint-conflicts.js v2 (climate_sensor + cross-cat) | 377 |
| **Total** | **681 to 247** | **~434 (64%)** |

## REMAINING 247 BY CATEGORY

### INTENTIONAL (192) - NO ACTION
| Pair | Count |
|---|---|
| bulb_rgb/bulb_rgbw | 64 |
| switch_Xgang/wall_switch_Xgang_1way | 87 |
| button_wireless_X/wall_remote_X_gang | 26 |
| smart_knob/smart_knob_switch | 4 |
| button/scene_switch variants | 11 |

### SAME-CATEGORY (53) - PER-DEVICE RESEARCH
| Pair | Count | Notes |
|---|---|---|
| curtain_motor/curtain_motor_tilt | 13 | Roller vs venetian |
| switch_1gang/switch_2gang | 10 | Cartesian via TS0601 |
| curtain_motor/wall_curtain_switch | 8 | Module vs wall |
| dimmer_dual_channel/dimmer_wall_1gang | 6 | 1ch vs 2ch |
| bulb_rgb/led_strip | 3 | Bulb vs strip |
| button_emergency_sos/smart_remote_4_buttons | 3 | SOS vs remote |
| radiator_valve/smart_lcd_thermostat | 2 | TRV vs LCD thermo |
| curtain_motor/shutter_roller_controller | 2 | Motor vs roller |
| Other (knob/sensor pairs, switch cross-gang) | 6 | IAS zone/DP check |

### RESIDUAL CROSS-CATEGORY (2) - HARD TO FIX
| Pair | Count | Root Cause |
|---|---|---|
| air_quality_comprehensive/lcdtemphumidsensor | 2 | Old _TZ2000_ devices |
| climate_sensor/contact_sensor/water_leak_sensor | 1 | eWeLink+TS0601 cartesian |

## RESEARCH SOURCES
| Source | Confirmed |
|---|---|
| ZHA ts0601_dimmer.py | Single vs dual dimmer |
| Hubitat TRV driver | 15 TRV mfrs classification |
| Z2M issues/discussions | TRV, knob, dimmer IDs |
| Blakadder zigbee DB | Repeater vs sensor, TRV IDs |
| HA community | Thermostat vs air_purifier |
| SmartHomeScene | zbeacon = motion sensor |

## AUTOMATION
- fix-fingerprint-conflicts.js --report-only / --dry-run / (no flag)
- weekly-fingerprint-sync.yml now includes conflict-check step
- Safety: min 3 mfrs retained, 15pt score gap, case-insensitive
