# Flow + L99 audit — 2026-10-12

Failing steps: **0** / 8

| Step | OK |
|------|----|
| flow-dups | yes |
| flows-integrity | yes |
| flow-coherence | yes |
| flow-fleet-enrich | yes |
| appjson-flow-dedupe | yes |
| voice-safety | yes |
| dp-cluster-flow-coverage | yes |
| button-flow-harvest | yes |

## Notes

- Runtime heuristics: `lib/flow/FlowCardHeuristics.js` (no invented `*_1gang_button_pressed`).
- Physical pattern: `{driver}_physical_gang{N}_{on|off}`.
- Memory: do not preload all flow compose into Homey heap — this audit is CI-only.

### flow-dups

```
Flow card ID uniqueness OK (6104 compose ids)

```

### flows-integrity

```
--- Starting Flows Integrity Audit ---
--- Summary ---
Missing Flows: 0
Format Errors: 0

```

### flow-coherence

```
eless_4 : button_wireless_4_fut089z_on → orphan tokens: zone
  - button_wireless_4 : button_wireless_4_fut089z_off → orphan tokens: zone
  - button_wireless_4 : button_wireless_4_fut089z_brightness → orphan tokens: zone, brightness
  - button_wireless_4 : button_wireless_4_fut089z_color_temperature → orphan tokens: zone, mireds, warmth
  - button_wireless_4 : button_wireless_4_fut089z_color → orphan tokens: zone, hue, saturation
  - button_wireless_4 : button_wireless_4_fut089z_scene → orphan tokens: zone, scene
  - ir_blaster : ir_blaster_learning_started → orphan tokens: protocol, frequency, duration
  - ir_blaster : ir_blaster_learning_state_changed → orphan tokens: state, state_code
  - ir_blaster : ir_blaster_code_learned → orphan tokens: ir_code
  - ir_blaster : ir_blaster_code_analyzed → orphan tokens: code_name, protocol, frequency, length
  - presence_sensor_radar : presence_sensor_radar_illuminance_changed → orphan tokens: lux
  - presence_sensor_radar : presence_sensor_radar_distance_changed → orphan tokens: distance
  - presence_sensor_radar : presence_sensor_radar_movement_classificatio_ee75a → orphan tokens: classification
  - presence_sensor_radar : presence_sensor_radar_temperature_changed → orphan tokens: temperature
  - presence_sensor_radar : presence_sensor_radar_humidity_changed → orphan tokens: humidity
  - wifi_ir_remote : wifi_ir_remote_learning_started → orphan tokens: timeout_s
  - wifi_ir_remote : wifi_ir_remote_code_learned → orphan tokens: format

```

### flow-fleet-enrich

```
{
  "generatedAt": "2026-10-12T12:19:33.989Z",
  "mode": "dry-run",
  "driversTouched": 2,
  "orphanTokensFixed": 6,
  "triggersAdded": 1,
  "actionsAdded": 0,
  "appJsonDedupe": {
    "mode": "dry-run"
  },
  "z2mCrossRef": {
    "count": 27
  },
  "subtools": [],
  "topChanges": [
    {
      "driver": "button_wireless_4",
      "orphans": 6,
      "triggers": [],
      "actions": []
    },
    {
      "driver": "led_controller_spi_tuya",
      "orphans": 0,
      "triggers": [
        "led_controller_spi_tuya_brightness_changed"
      ],
      "actions": []
    }
  ]
}

```

### appjson-flow-dedupe

```
{
  "mode": "dry-run",
  "removed": {
    "triggers": 0,
    "conditions": 0,
    "actions": 0
  },
  "kept": {
    "triggers": 61,
    "conditions": 47,
    "actions": 93
  },
  "homeycompose": {
    "removed": {
      "triggers": 0,
      "conditions": 0,
      "actions": 0
    },
    "files": []
  }
}

```

### voice-safety

```
Google Assistant voice-safety gate
Drivers checked: 449
button.* capabilities checked: 624
OK: button.* event-only (getable/setable false); class:button|remote may use device-view.

```

### dp-cluster-flow-coverage

```
_TZ3000_dzwgk7e2|TS0042
  - _TZ3000_fllyghyj|TS0201
  - _TZ3000_lmcp6b0a|TS0003
  - _TZ3000_z6fgd73r|TS011F
  - _TYZB02_key8kk7r|TS0043
  - _TZ3000_rrjr1q0u|TS0043
  - _TZ3000_mugyhz0q|TS0207
  - _TZ3000_0s9gukzt|TS0207
  - _TZ3000_zl1kmjqx|TS0201
  - _TYZB01_ncutbjdi|TS0003
  - _TYZB01_aneiicmq|TS0003
  - _TZ3210_zxbtub8r|TS110E
  - _TZ3000_18ejxno0|TS0012
  - _TZ3000_qewo8dlz|TS0013
  - _TYZB01_iuepbmpv|TS0121
  - _TZ3000_saiqcn0y|TS0201
  - _TZ3000_xr3htd96|TS0201
  - _TZ3000_j0ktmul1|TS011F
  - _TYZB01_bagt1e4o|TS0014
  - _TZ3000_e98krvvk|TS0012
  - _TYZB01_b8cr31hp|TS0003
  - _TYZB01_xiuox57i|TS0013
  - _TZ3000_5e5ptb24|TS0013
  - _TZ3000_aezbqpcu|TS0013
  - _TZ3000_hlwm8e96|TS0013
  - _TZ3000_lrgccsxm|TS0013
  - _TZ3000_thhxrept|TS0003
  - _TZ3000_wyhuocal|TS0013
  - _TZ3000_r0pmi2p3|TS0014
  - _TYZB01_vzrytttn|TS0012
  - _TZ3000_s8r1qoyq|TS0012
  - _TZ3000_dku2cfsc|TS0044
  - _TZ3210_cehuw1lw|TS011F
  - _TZ3210_a2erlvb8|TS0002
  - _TZ3210_a2erlvb8|TS000F
  - _TZ3000_bgtzm4ny|TS0044
  - _TZE200_aj0oxo1i|TS0225
  - _TZ3000_6oabgtzv|TS0207
  - _TZ3000_fdxihpp7|TS0001
  - _TZ3000_kjfzuycl|TS004F
  - _TYZB01_qezuin6k|TS110F
  - _TZE200_wrmhp6b3|TS0601
  - _TZE600_ogyg1y6b|TS0105
  - _TZE600_5cu64znk|TS0105

## Flow heuristic smoke
```json
{
  "undeclaredReturnsNull": true,
  "remoteResolves": true,
  "sceneResolves": true,
  "capabilityResolves": true
}
```

## Commands
```bash
node tools/ci/sync-dp-couple-knowledge.js --apply
npm run audit:dp-couples
npm run flow:l99
```


```

### button-flow-harvest

```
Drivers": 52,
  "appLevelButtonTriggers": [
    "button_pressed",
    "button_double_press",
    "button_long_press",
    "button_triple_clicked",
    "button_multi_press",
    "button_release",
    "button_matrix",
    "virtual_button_pressed",
    "remote_button_pressed",
    "knob_rotated"
  ],
  "appLevelButtonTriggersMissing": [],
  "topByTriggers": [
    {
      "driverId": "scene_switch_4",
      "triggers": 51
    },
    {
      "driverId": "button_wireless_8",
      "triggers": 46
    },
    {
      "driverId": "scene_switch_6ch",
      "triggers": 41
    },
    {
      "driverId": "button_wireless_6",
      "triggers": 36
    },
    {
      "driverId": "button_wireless_4",
      "triggers": 35
    },
    {
      "driverId": "scene_switch_6",
      "triggers": 35
    },
    {
      "driverId": "wall_remote_6_gang",
      "triggers": 35
    },
    {
      "driverId": "button_wireless_smart",
      "triggers": 30
    },
    {
      "driverId": "button_wireless_4_ts0041",
      "triggers": 26
    },
    {
      "driverId": "remote_button_wireless_handheld",
      "triggers": 26
    },
    {
      "driverId": "handheld_remote_4_buttons",
      "triggers": 25
    },
    {
      "driverId": "wall_remote_4_gang",
      "triggers": 25
    },
    {
      "driverId": "button_wireless_3",
      "triggers": 22
    },
    {
      "driverId": "remote_button_emergency_sos",
      "triggers": 21
    },
    {
      "driverId": "wall_remote_4_gang_3",
      "triggers": 21
    }
  ]
}

```
