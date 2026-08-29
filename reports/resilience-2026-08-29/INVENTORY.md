# Features + historical bugs inventory — 2026-08-29

SHADOW forum. Method: Homey-native gaps → **parallel complementary stacks** → gates/workflows (P2221→P2225).

Domains: **22** (prio1=7) | Bugs: **35** (residual OPEN/PARTIAL=25) | Critical gaps: **8** | Layer schemes: **5**

## Methodology

- Homey gap → parallel complementary stack
- Wire gate/test/workflow
- Honest FIXED/PARTIAL/OPEN

## Critical gaps (priority 1 — audit first)

| Domain | Why | Homey gap | Bugs |
|--------|-----|-----------|------|
| `sacred_couple_fp` | Wrong driver pairing cannot hot-swap; inventing pi | No driver hot-swap; mfr-only ambiguous | fp_collision_ts0601, sacred_misroute, enricher_reinject |
| `buttons_bidirectional` | Homey drops Tuya 0xFD/0xFC; physical↔virtual↔UI lo | No physical vs app distinction; mfr OnOf | ghost_flow_echo, missing_capability_listener, bseed_group_all_gangs, handleframe_orphan |
| `handleframe_chain` | Blind node.handleFrame= + L0 dedup/shed without ne | SDK exposes single handleFrame; no offic | handleframe_orphan, l0_dedup_swallow_fd |
| `ias_sleepy` | Boot poll storms + leftover EF00 brick sleepy IAS | zoneStatus shapes; EF00 TX on wake | ias_ef00_leftover, ias_zonestatus_coerce |
| `battery` | Half-percent + linear formulas spam false battery | 0–200 vs 0–100; no nonlinear curves | zcl_battery_half, linear_battery_formula, phantom_mains_battery |
| `energy_divisors` | Double /100 wrecks power/temp UX | AdaptiveDataParser + dpMappings both div | double_division, energy_approximation_conflict |
| `ef00_dp` | Type0 byte_array misread as humidity/climate | Opaque 0xEF00; no type semantics without | dp_type0_misread, sacred_misroute |
| `l14_telemetry` | Raw setCapability floods UI / flows | No EMA/ROC / anti-flood in SDK |  |

### Parallel stacks (critical)

#### sacred_couple_fp

- compose FP
- DeviceFingerprintDB
- misattribution-registry
- p2138 gate
- softHypothesis

_Discoveries:_
- Tongou _TZE284_6ocnqlhn+TS0601→din_rail_meter
- BSEED m1cvyneb+TS0601→wall_dimmer_tuya 0-1000
- P2229 app.json stole Tongou onto smart_rcbo — sync-appjson-zigbee + mfs retarget

#### buttons_bidirectional

- L1–L8 ButtonCaptureCascade
- Physical+Virtual+UI init
- markAppCommand
- 2s dedup
- BidirectionalButtonState.wrapHandleFrame

_Discoveries:_
- P2220–P2223 cascade
- OnOffBound 0xFD/0xFC
- scene remotes flow-only
- P2230 FlowCardHeuristics: no *_1gang_button_pressed / *_button_N_button_pressed invent
- P2283 wrapHandleFrame SSOT
- P2284 L0/IO/P0 always next — never orphan 0xFD

#### handleframe_chain

- BidirectionalButtonState.wrapHandleFrame
- raw-l0-fallback keepAlways
- io-passive-ef00
- physical-onoff-fd

_Discoveries:_
- P2282 Peter mrpevh8p IO arity
- P2284 UnifiedSwitch/Sensor super L0 + UniversalZigbee always forward

#### ias_sleepy

- IASZoneEnhanced.coerce
- shouldSkipIasOnlyEf00Tx
- _ensureIasBound

_Discoveries:_
- Peter SOS IAS
- k4ej+TS0207 water_leak never EF00
- P2287 shouldSkipIasOnlyEf00Tx unit gate

#### battery

- normalizeZclBatteryPercent
- UnifiedBatteryHandler
- nonlinear profiles

_Discoveries:_
- P216 ban blind /2

#### energy_divisors

- SmartDivisorManager
- adaptive-double-division-gate
- energy-compose-gate

_Discoveries:_
- v8 SmartDivisor

#### ef00_dp

- DpByteArrayProfiles
- dp_couple_knowledge
- audit:dp-couples

_Discoveries:_
- Tongou DP6 type0 V/A/W composite — not humidity
- P2230 DYN-CAP never maps type0/raw to measure_humidity

#### l14_telemetry

- safeSetCapabilityValue
- SanityFilter
- commitCapability

_Discoveries:_
- Phoenix L14 v5.13.6+

## All feature domains

| Domain | Prio | Status | Gates | Homey gap |
|--------|------|--------|-------|-----------|
| battery | 1 | partial | 2/2 | 0–200 vs 0–100; no nonlinear curves |
| buttons_bidirectional | 1 | hardened | 1/1 | No physical vs app distinction; mfr OnOff 0xFD/0xFC dro |
| ef00_dp | 1 | partial | 1/1 | Opaque 0xEF00; type0 misread |
| energy_divisors | 1 | partial | 4/4 | Double division; energy.approximation vs meter caps; pa |
| ias_sleepy | 1 | partial | 0/0 | Boot poll storms; zoneStatus shapes; leftover EF00 |
| l14_telemetry | 1 | partial | 1/1 | Raw setCapability floods UI; no EMA/ROC |
| sacred_couple_fp | 1 | partial | 3/3 | No hot-swap; mfr-only pairing ambiguous |
| ci_fleetwood | 2 | partial | 1/1 | N/A — CI purity (braces, shell bash, schema) |
| dimmer_brightness | 2 | hardened | 1/1 | dim 0–1 vs MCU 0–1000 |
| dual_app_publish | 2 | partial | 0/0 | Shared Test slot historically |
| enrichment_shadow | 2 | hardened | 2/2 | N/A — ops; forum write forbidden |
| flows | 2 | partial | 0/0 | titleFormatted [[device]]; Missing Capability Listener |
| heap_json | 2 | partial | 1/1 | UTF-16 string OOM on large JSON |
| hybrid_protocol | 2 | partial | 1/1 | Assumes single cluster path |
| identity_normalize | 2 | partial | 1/1 | Case-sensitive mfr/pid mismatches |
| mcu_time | 2 | partial | 0/0 | Wrong epoch / format variants |
| protocol_rxtx_bus | 2 | partial | 2/2 | Single confirm path; reconnect storms |
| timers_destroyed | 2 | partial | 0/0 | setTimeout after destroy |
| bypass_elite_complement | 3 | partial | 0/0 | Documented elite bypass intent — runtime denser now |
| dynamic_adaptation | 3 | partial | 0/0 | Static compose cannot hot-adapt DP/caps |
| layers_fusion | 3 | partial | 1/1 | Single-path RX loss |
| wifi_local | 3 | partial | 1/1 | Cloud-only MCU handshake |

## Residual OPEN / PARTIAL bugs

- `fp_collision_ts0601` (**open**) → sacred locks + softHypothesis [sacred_couple_fp]
- `forum_soft_hypothesis` (**open**) → never invent pid; soft only [enrichment_shadow]
- `p139_processing_failed` (**open**) → wait cooldown no loop [dual_app_publish]
- `ghost_flow_echo` (**partial**) → markAppCommand + dedup [buttons_bidirectional, flows]
- `missing_capability_listener` (**partial**) → P2220/P2221 UI listeners [buttons_bidirectional, flows]
- `double_division` (**partial**) → SmartDivisorManager + gate [energy_divisors]
- `zcl_battery_half` (**partial**) → normalizeZclBatteryPercent P216 [battery]
- `linear_battery_formula` (**partial**) → nonlinear profiles ban [battery]
- `phantom_mains_battery` (**partial**) → mainsPowered strip [battery, sacred_couple_fp]
- `ias_ef00_leftover` (**partial**) → shouldSkipIasOnlyEf00Tx [ias_sleepy]
- `sacred_misroute` (**partial**) → p2138 matrix [sacred_couple_fp, dimmer_brightness, ef00_dp]
- `oom_json_utf16` (**partial**) → Buffer JSON.parse [heap_json]
- `settimeout_destroyed` (**partial**) → safe-timers [timers_destroyed]
- `unsupported_cluster` (**partial**) → parallelDiscover cascade [hybrid_protocol]
- `mcu_time_wrong` (**partial**) → guessFormat chain [mcu_time]
- `dp_type0_misread` (**partial**) → DpByteArrayProfiles + audit [ef00_dp]
- `bseed_group_all_gangs` (**partial**) → group strip + per-gang mark [buttons_bidirectional]
- `enricher_reinject` (**partial**) → anti-bot + sacred gate [sacred_couple_fp, enrichment_shadow]
- `onoff_fd_dropped` (**partial**) → OnOffBoundCluster 0xFD/0xFC + cascade L1 [buttons_bidirectional]
- `e000_unbound_silent` (**partial**) → ButtonCaptureCascade L5 E000 BoundCluster [buttons_bidirectional]
- `raw_capability_flood` (**partial**) → safeSetCapabilityValue + SanityFilter [l14_telemetry]
- `case_sensitive_mfr` (**partial**) → CaseInsensitiveMatcher [identity_normalize]
- `reconnect_confirm_storm` (**partial**) → ReconnectBurstCoalescer + confirmInbound [protocol_rxtx_bus]
- `shared_test_slot_overwrite` (**partial**) → independent .stable App ID + soak-guard [dual_app_publish]
- `appjson_compose_drift` (**partial**) → sync-appjson-zigbee after compose FP changes [sacred_couple_fp, ci_fleetwood]

## Layer glossary schemes (coexist)

- `pipeline_l0_l11`
- `bypass_elite_l1_l9`
- `capability_protocol_l0_l6`
- `button_capture_l1_l8`
- `ai_three_layers`

## Workflow hooks

```json
{
  "inventory": "tools/ci/inventory-features-bugs.js",
  "auditCritical": "tools/ci/project-resilience-orchestrator.js --write-report --critical-first",
  "auditAll": "tools/ci/project-resilience-orchestrator.js --write-report",
  "enrichGates": "tools/ci/silent-enrichment-orchestrator.js --phase=gates --skip-scan",
  "shadowEnv": {
    "FORUM_AUTO_POST": "0",
    "SHADOW_FORUM": "1",
    "DISCOURSE_WRITE": "0",
    "REPLY_TOPICS": ""
  }
}
```

---
Regenerate: `npm run resilience:inventory`

