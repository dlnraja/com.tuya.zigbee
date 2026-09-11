# Flow + L99 audit — 2026-09-11

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
Flow card ID uniqueness OK (5962 compose ids)

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
Cards with args: 627
Cards with tokens: 1032
Cards with orphan tokens (declared but not used in args/title): 0

```

### flow-fleet-enrich

```
{
  "generatedAt": "2026-09-11T06:39:01.891Z",
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
button.* capabilities checked: 625
OK: all button.* capabilities are event/maintenance-only.

```

### dp-cluster-flow-coverage

```
Z3000_g9chy2ib|TS0003
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
  - _TZE200_dfxkcots|TS0601
  - _TZE200_p0gzbqct|TS0601
  - _TZE200_fjjbhx9d|TS0601
  - _TZE200_aqnazj70|TS0601
  - _TZE200_mexisfik|TS0601
  - _TYZB01_qeqvmvti|TS0011
  - _TZE200_mja3fuja|TS0601
  - _TZE200_2ekuz3dz|TS0601
  - _TZE204_qasjif9e|TS0601
  - _TZE204_sxm7l9xa|TS0601
  - _TZE200_3towulqd|TS0601
  - _TZE200_3p5ydos3|TS0601
  - _TZ3000_mmkbptmx|TS0004
  - _TZ3000_ruxexjfz|TS0002
  - _TZ3000_3dfewsk1|TS0207
  - _TZ3000_wkai4ga5|TS0042
  - _TZE204_zenj4lxv|TS0601
  - _TZB210_rkgngb5o|TS0502B
  - _TYZB01_6g8b7at8|TS0012
  - _TZ3210_0zabbfax|TS0503B
  - _TZE204_ex3rcdha|TS0601
  - _TZE200_yjjdcqsq|TS0601
  - _TZ3000_ja5osu5g|TS004F
  - _TZ3000_an5rjiwd|TS0041
  - _TZ3000_5tqxpine|TS0044

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
