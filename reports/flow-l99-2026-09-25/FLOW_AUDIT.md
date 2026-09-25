# Flow + L99 audit — 2026-09-25

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
Flow card ID uniqueness OK (5995 compose ids)

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
=== FLOW CARD COHERENCE AUDIT ===
Drivers scanned: 434
Cards with args: 676
Cards with tokens: 1067
Cards with orphan tokens (declared but not used in args/title): 12

First 20 issues:
  - blaster_remote : blaster_remote_ir_remote_code_learned → orphan tokens: ir_code
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
  "generatedAt": "2026-09-25T18:10:02.542Z",
  "mode": "dry-run",
  "driversTouched": 0,
  "orphanTokensFixed": 0,
  "triggersAdded": 0,
  "actionsAdded": 0,
  "appJsonDedupe": {
    "mode": "dry-run"
  },
  "z2mCrossRef": {
    "count": 27
  },
  "subtools": [],
  "topChanges": []
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
    "triggers": 97,
    "conditions": 40,
    "actions": 87
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
Drivers checked: 434
button.* capabilities checked: 624
OK: button.* event-only (getable/setable false); class:button|remote may use device-view.

```

### dp-cluster-flow-coverage

```
# DP × Cluster × Flow coverage — 2026-09-25

Critical gaps: **0**

## Drivers / Flow
- Drivers: 434
- With flow.compose: 434
- Without: none
- Flow card entries (compose): 5819

## Clusters
- Compose unique: 36
- Lexicon size: 45
- Missing from lexicon: 0

## DP knowledge
- Knowledge couples: 209
- Registry couples (Tuya EF00-eligible): 214
- Covered: 208 (97.2%)
- Skipped brand/external soft-watch: 20
- Uncovered:
  - _TZE204_nkjintbl|TS0601
  - _TZ3000_axpdxqgu|TS0041
  - _TZ3000_vsxvaj9i|TS0043
  - _TZ3000_ltt60asa|TS0004
  - _TZ3000_dzwgk7e2|TS0042
  - _TZ3000_fllyghyj|TS0201

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
ivers": 52,
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
      "driverId": "button_wireless_3",
      "triggers": 21
    },
    {
      "driverId": "button_wireless_switch",
      "triggers": 20
    },
    {
      "driverId": "remote_button_emergency_sos",
      "triggers": 20
    }
  ]
}

```
