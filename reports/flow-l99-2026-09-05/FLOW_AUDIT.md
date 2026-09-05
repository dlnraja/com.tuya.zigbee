# Flow + L99 audit — 2026-09-05

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
Flow card ID uniqueness OK (5950 compose ids)

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
Drivers scanned: 431
Cards with args: 625
Cards with tokens: 1027
Cards with orphan tokens (declared but not used in args/title): 0

```

### flow-fleet-enrich

```
{
  "generatedAt": "2026-09-05T04:52:21.234Z",
  "mode": "dry-run",
  "driversTouched": 1,
  "orphanTokensFixed": 0,
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
      "driver": "smart_knob",
      "orphans": 0,
      "triggers": [
        "smart_knob_brightness_changed"
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
    "triggers": 47,
    "conditions": 29,
    "actions": 57
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
button.* capabilities checked: 632
OK: all button.* capabilities are event/maintenance-only.

```

### dp-cluster-flow-coverage

```
 Drivers: 431
- With flow.compose: 431
- Without: none
- Flow card entries (compose): 5817

## Clusters
- Compose unique: 34
- Lexicon size: 34
- Missing from lexicon: 0

## DP knowledge
- Knowledge couples: 121
- Registry couples (Tuya EF00-eligible): 152
- Covered: 120 (78.9%)
- Skipped brand/external soft-watch: 9
- Uncovered:
  - _TZE284_fhvpaltk|TS0601
  - _TZ3000_pjb1ua0m|TS0203
  - _TZ3000_wkai4ga5|TS0044
  - _TZ3000_xffhmvhv|TS004F
  - _TZ3000_ufhtxr59|TS0044
  - _TZ3000_mtnpt6ws|TS0002
  - _TZ3210_ddigca5n|TS011F
  - _TZ3000_v5498kdm|TS0001
  - _TZE200_127x7wnl|TS0601
  - _TZE284_upt8lzi0|TS0601
  - _TZ3000_a4xycprs|TS0044
  - _TZE200_jthf7vb6|TS0601
  - _TZ3000_cvis4qmw|TS0006
  - _TZ3000_g9chy2ib|TS0003
  - _TZ3000_etufnltx|TS1002
  - _TZ3210_w0qqde0g|TS011F
  - _TZE204_a2jcoyuk|TS0601
  - _TZE200_r32ctezx|TS0601
  - _TZ3000_uw3dadam|TS0202
  - _TZE284_0ints6wl|TS0601
  - _TZE200_e3oitdyu|TS0601
  - _TZE200_uj3f4wr5|TS0601
  - _TZ3000_u3nv1jwk|TS0044
  - _TZ3000_otvn3lne|TS0202
  - _TZE204_81yrt3lo|TS0601
  - _TZ3210_tgvtvdoc|TS0207
  - _TZE200_vuqzj1ej|TS0601
  - _TZE200_2aaelwxk|TS0601
  - _TZE200_kccdzaeo|TS0601
  - _TZE200_khzbklyh|TS0601
  - _TZE200_jfw0a4aa|TS0601
  - _TZE200_iba1ckek|TS0601

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
s": 52,
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
      "triggers": 47
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
      "triggers": 30
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
      "driverId": "button_wireless_3",
      "triggers": 21
    },
    {
      "driverId": "button_wireless_switch",
      "triggers": 20
    },
    {
      "driverId": "handheld_remote_4_buttons",
      "triggers": 20
    },
    {
      "driverId": "remote_button_emergency_sos",
      "triggers": 20
    },
    {
      "driverId": "remote_button_wireless",
      "triggers": 20
    }
  ]
}

```
