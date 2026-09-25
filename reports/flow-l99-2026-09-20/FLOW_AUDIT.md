# Flow + L99 audit — 2026-09-20

Failing steps: **2** / 8

| Step | OK |
|------|----|
| flow-dups | yes |
| flows-integrity | yes |
| flow-coherence | yes |
| flow-fleet-enrich | yes |
| appjson-flow-dedupe | yes |
| voice-safety | NO |
| dp-cluster-flow-coverage | NO |
| button-flow-harvest | yes |

## Notes

- Runtime heuristics: `lib/flow/FlowCardHeuristics.js` (no invented `*_1gang_button_pressed`).
- Physical pattern: `{driver}_physical_gang{N}_{on|off}`.
- Memory: do not preload all flow compose into Homey heap — this audit is CI-only.

### flow-dups

```
Flow card ID uniqueness OK (6046 compose ids)

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
reless_6_button_6gang_button_multi_press → orphan tokens: count
  - button_wireless_8 : button_wireless_8_button_8gang_button_multi_press → orphan tokens: count
  - handheld_remote_4_buttons : handheld_remote_4_buttons_button_4gang_button_multi_press → orphan tokens: count
  - ir_blaster : ir_blaster_learning_started → orphan tokens: protocol, frequency, duration
  - ir_blaster : ir_blaster_learning_state_changed → orphan tokens: state, state_code
  - ir_blaster : ir_blaster_code_learned → orphan tokens: ir_code
  - ir_blaster : ir_blaster_code_analyzed → orphan tokens: code_name, protocol, frequency, length
  - presence_sensor_radar : presence_sensor_radar_illuminance_changed → orphan tokens: lux
  - presence_sensor_radar : presence_sensor_radar_distance_changed → orphan tokens: distance
  - presence_sensor_radar : presence_sensor_radar_movement_classificatio_ee75a → orphan tokens: classification
  - presence_sensor_radar : presence_sensor_radar_temperature_changed → orphan tokens: temperature
  - presence_sensor_radar : presence_sensor_radar_humidity_changed → orphan tokens: humidity
  - remote_button_wireless : remote_button_wireless_button_3gang_button_multi_press → orphan tokens: count
  - remote_button_wireless_wall : remote_button_wireless_wall_btn_pressed → orphan tokens: button
  - remote_button_wireless_wall : remote_button_wireless_wall_btn_double → orphan tokens: button
  - remote_button_wireless_wall : remote_button_wireless_wall_btn_long → orphan tokens: button

```

### flow-fleet-enrich

```
 0,
  "appJsonDedupe": {
    "mode": "dry-run"
  },
  "z2mCrossRef": {
    "count": 27
  },
  "subtools": [],
  "topChanges": [
    {
      "driver": "button_wireless_2",
      "orphans": 1,
      "triggers": [],
      "actions": []
    },
    {
      "driver": "button_wireless_3",
      "orphans": 1,
      "triggers": [],
      "actions": []
    },
    {
      "driver": "button_wireless_4",
      "orphans": 1,
      "triggers": [],
      "actions": []
    },
    {
      "driver": "button_wireless_6",
      "orphans": 1,
      "triggers": [],
      "actions": []
    },
    {
      "driver": "button_wireless_8",
      "orphans": 1,
      "triggers": [],
      "actions": []
    },
    {
      "driver": "handheld_remote_4_buttons",
      "orphans": 1,
      "triggers": [],
      "actions": []
    },
    {
      "driver": "remote_button_wireless",
      "orphans": 1,
      "triggers": [],
      "actions": []
    },
    {
      "driver": "remote_button_wireless_wall",
      "orphans": 5,
      "triggers": [],
      "actions": []
    },
    {
      "driver": "scene_switch_4",
      "orphans": 1,
      "triggers": [],
      "actions": []
    },
    {
      "driver": "wall_remote_3_gang",
      "orphans": 1,
      "triggers": [],
      "actions": []
    },
    {
      "driver": "wall_remote_4_gang",
      "orphans": 1,
      "triggers": [],
      "actions": []
    },
    {
      "driver": "wall_remote_6_gang",
      "orphans": 1,
      "triggers": [],
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
    "triggers": 51,
    "conditions": 39,
    "actions": 80
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
Drivers checked: 431
button.* capabilities checked: 621

```

### dp-cluster-flow-coverage

```
# DP × Cluster × Flow coverage — 2026-09-20

Critical gaps: **1**

## Drivers / Flow
- Drivers: 431
- With flow.compose: 431
- Without: none
- Flow card entries (compose): 5876

## Clusters
- Compose unique: 36
- Lexicon size: 44
- Missing from lexicon: 1
  - 0xFC11 (64529)

## DP knowledge
- Knowledge couples: 209
- Registry couples (Tuya EF00-eligible): 212
- Covered: 208 (98.1%)
- Skipped brand/external soft-watch: 20
- Uncovered:
  - _TZE204_nkjintbl|TS0601
  - _TZ3000_axpdxqgu|TS0041
  - _TZ3000_vsxvaj9i|TS0043
  - _TZ3000_ltt60asa|TS0004

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
iftDrivers": 52,
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
      "triggers": 45
    },
    {
      "driverId": "scene_switch_6ch",
      "triggers": 40
    },
    {
      "driverId": "button_wireless_6",
      "triggers": 35
    },
    {
      "driverId": "scene_switch_6",
      "triggers": 34
    },
    {
      "driverId": "wall_remote_6_gang",
      "triggers": 34
    },
    {
      "driverId": "button_wireless_smart",
      "triggers": 29
    },
    {
      "driverId": "button_wireless_4",
      "triggers": 28
    },
    {
      "driverId": "button_wireless_4_ts0041",
      "triggers": 25
    },
    {
      "driverId": "remote_button_wireless_handheld",
      "triggers": 25
    },
    {
      "driverId": "handheld_remote_4_buttons",
      "triggers": 24
    },
    {
      "driverId": "wall_remote_4_gang",
      "triggers": 24
    },
    {
      "driverId": "remote_button_wireless",
      "triggers": 23
    },
    {
      "driverId": "button_wireless_3",
      "triggers": 21
    },
    {
      "driverId": "button_wireless_switch",
      "triggers": 20
    }
  ]
}

```
