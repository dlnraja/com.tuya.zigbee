# Flow + L99 audit — 2026-08-26

Failing steps: **0** / 5

| Step | OK |
|------|----|
| flow-dups | yes |
| flows-integrity | yes |
| flow-coherence | yes |
| voice-safety | yes |
| dp-cluster-flow-coverage | yes |

## Notes

- Runtime heuristics: `lib/flow/FlowCardHeuristics.js` (no invented `*_1gang_button_pressed`).
- Physical pattern: `{driver}_physical_gang{N}_{on|off}`.
- Memory: do not preload all flow compose into Homey heap — this audit is CI-only.

### flow-dups

```
Flow card ID uniqueness OK (5182 compose ids)

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
rphan tokens: brightness
  - air_purifier_dimmer : air_purifier_dimmer_wall_1gang_dimmer_1gang__09f81 → orphan tokens: dim
  - air_purifier_lcdtemphumidsensor : air_purifier_lcdtemphumidsensor_air_purifier_66846 → orphan tokens: pm25
  - air_purifier_motion : air_purifier_motion_air_purifier_pm25_changed → orphan tokens: pm25
  - air_purifier_presence : air_purifier_presence_sensor_radar_illuminan_505ed → orphan tokens: lux
  - air_purifier_presence : air_purifier_presence_sensor_radar_distance__30088 → orphan tokens: distance
  - air_purifier_quality : air_purifier_quality_air_quality_co2_level_changed → orphan tokens: co2
  - air_purifier_quality : air_purifier_quality_air_quality_co2_air_tem_fdfb3 → orphan tokens: temperature
  - air_purifier_quality : air_purifier_quality_air_quality_co2_air_hum_4a124 → orphan tokens: humidity
  - air_purifier_quality : air_purifier_quality_air_quality_co2_pm25_changed → orphan tokens: pm25
  - air_purifier_soil : air_purifier_soil_sensor_moisture_changed → orphan tokens: moisture
  - air_purifier_soil : air_purifier_soil_sensor_temperature_changed → orphan tokens: temperature
  - air_purifier_soil : air_purifier_soil_sensor_battery_changed → orphan tokens: battery
  - air_purifier_switch : air_purifier_switch_1gang_physical_long_press → orphan tokens: duration
  - air_purifier_switch : air_purifier_switch_1gang_physical_triple → orphan tokens: clicks
  - air_purifier_switch : air_purifier_switch_1gang_gang1_scene → orphan tokens: action

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
# DP × Cluster × Flow coverage — 2026-08-26

Critical gaps: **0**

## Drivers / Flow
- Drivers: 431
- With flow.compose: 431
- Without: none
- Flow card entries (compose): 5049

## Clusters
- Compose unique: 34
- Lexicon size: 34
- Missing from lexicon: 0

## DP knowledge
- Knowledge couples: 78
- Registry couples: 118
- Covered: 78 (66.1%)

## Flow heuristic smoke
```json
{
  "undeclaredReturnsNull": true,
  "remoteResolves": true,
  "sceneResolves": true
}
```

## Commands
```bash
node tools/ci/sync-dp-couple-knowledge.js --apply
npm run audit:dp-couples
npm run flow:l99
```


```
