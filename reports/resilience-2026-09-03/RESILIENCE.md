# Project resilience audit — 2026-09-03

SHADOW forum. Methodology: Homey-native gaps → parallel complementary stacks (P2221→P2225).
Mode: full fleet

Domains: **19/22** gates green | Bug classes: fixed=11 partial=42 open=3

See also: `INVENTORY.md` (`npm run resilience:inventory`)

## Domains

| Domain | Prio | Status | Gates | Homey gap |
|--------|------|--------|-------|-----------|
| sacred_couple_fp | 1 | partial | 3/3 | No hot-swap; mfr-only pairing ambiguous |
| buttons_bidirectional | 1 | hardened | 2/2 | No physical vs app distinction; mfr OnOff 0xFD/0xFC dropped; |
| ias_sleepy | 1 | partial | 0/0 | Boot poll storms; zoneStatus shapes; leftover EF00 |
| battery | 1 | partial | 2/2 | 0–200 vs 0–100; no nonlinear curves |
| energy_divisors | 1 | partial | 4/4 | Double division; energy.approximation vs meter caps; paralle |
| ef00_dp | 1 | partial | 1/1 | Opaque 0xEF00; type0 misread |
| l14_telemetry | 1 | partial | 1/1 | Raw setCapability floods UI; no EMA/ROC |
| hybrid_protocol | 2 | partial | 1/1 | Assumes single cluster path |
| flows | 2 | partial | 2/2 ⚠ | titleFormatted [[device]]; Missing Capability Listener; lega |
| mcu_time | 2 | partial | 0/0 | Wrong epoch / format variants |
| dimmer_brightness | 2 | hardened | 1/1 | dim 0–1 vs MCU 0–1000 |
| timers_destroyed | 2 | partial | 0/0 ⚠ | setTimeout after destroy |
| heap_json | 2 | partial | 1/1 | UTF-16 string OOM on large JSON |
| enrichment_shadow | 2 | hardened | 2/2 | N/A — ops; forum write forbidden |
| dual_app_publish | 2 | partial | 0/0 | Shared Test slot historically |
| protocol_rxtx_bus | 2 | partial | 2/2 | Single confirm path; reconnect storms |
| identity_normalize | 2 | partial | 1/1 | Case-sensitive mfr/pid mismatches |
| ci_fleetwood | 2 | partial | 1/1 ⚠ | N/A — CI purity (braces, shell bash, schema) |
| wifi_local | 3 | partial | 1/1 | Cloud-only MCU handshake |
| layers_fusion | 3 | partial | 1/1 | Single-path RX loss |
| dynamic_adaptation | 3 | partial | 0/0 | Static compose cannot hot-adapt DP/caps |
| bypass_elite_complement | 3 | partial | 0/0 | Documented elite bypass intent — runtime denser now |

## Residual OPEN/PARTIAL bugs

- `ghost_flow_echo` (**partial**) → markAppCommand + dedup [buttons_bidirectional, flows]
- `missing_capability_listener` (**partial**) → P2220/P2221 UI listeners [buttons_bidirectional, flows]
- `double_division` (**partial**) → SmartDivisorManager + gate [energy_divisors]
- `zcl_battery_half` (**partial**) → normalizeZclBatteryPercent P216 [battery]
- `linear_battery_formula` (**partial**) → nonlinear profiles ban [battery]
- `phantom_mains_battery` (**partial**) → mainsPowered strip + P2391/P2392 FirmwareQuirkCompensator + Energy clear [battery, sacred_couple_fp]
- `mmwave_rx_flood` (**partial**) → P2389 radar RX budget + floodCalm DP coalesce (airtime is firmware) [hybrid_protocol]
- `ias_ef00_leftover` (**partial**) → shouldSkipIasOnlyEf00Tx [ias_sleepy]
- `fp_collision_ts0601` (**open**) → sacred locks + softHypothesis [sacred_couple_fp]
- `sacred_misroute` (**partial**) → p2138 matrix [sacred_couple_fp, dimmer_brightness, ef00_dp]
- `oom_json_utf16` (**partial**) → Buffer JSON.parse [heap_json]
- `settimeout_destroyed` (**partial**) → safe-timers [timers_destroyed]
- `unsupported_cluster` (**partial**) → parallelDiscover cascade [hybrid_protocol]
- `mcu_time_wrong` (**partial**) → guessFormat chain [mcu_time]
- `dp_type0_misread` (**partial**) → DpByteArrayProfiles + audit [ef00_dp]
- `bseed_group_all_gangs` (**partial**) → group strip + per-gang mark [buttons_bidirectional]
- `enricher_reinject` (**partial**) → anti-bot + sacred gate [sacred_couple_fp, enrichment_shadow]
- `forum_soft_hypothesis` (**open**) → never invent pid; soft only [enrichment_shadow]
- `p139_processing_failed` (**open**) → wait cooldown no loop [dual_app_publish]
- `onoff_fd_dropped` (**partial**) → OnOffBoundCluster 0xFD/0xFC + cascade L1 [buttons_bidirectional]
- `e000_unbound_silent` (**partial**) → ButtonCaptureCascade L5 E000 BoundCluster [buttons_bidirectional]
- `raw_capability_flood` (**partial**) → safeSetCapabilityValue + SanityFilter [l14_telemetry]
- `case_sensitive_mfr` (**partial**) → CaseInsensitiveMatcher [identity_normalize]
- `reconnect_confirm_storm` (**partial**) → ReconnectBurstCoalescer + confirmInbound [protocol_rxtx_bus]
- `shared_test_slot_overwrite` (**partial**) → independent .stable App ID + soak-guard [dual_app_publish]
- `appjson_compose_drift` (**partial**) → sync-appjson-zigbee after compose FP changes [sacred_couple_fp, ci_fleetwood]

## Parallel stacks (priority 1)

### sacred_couple_fp

- compose static FP
- DeviceFingerprintDB
- misattribution-registry
- softHypothesis never lock

### buttons_bidirectional

- L1 OnOffBoundCluster 0xFD/0xFC per-EP
- L2 raw handleFrame + wide command match
- L3 scenes recall
- L4 ZCL on/off/toggle
- L5 TuyaE000BoundCluster + E001 (ButtonCaptureCascade P2223)
- L6 LevelControl knobs
- L7 EF00 conditional MCU
- L8 MultistateInput
- VirtualButtonMixin markAppCommand + UI P2220/P2221

### ias_sleepy

- IASZoneEnhanced.coerce
- shouldSkipIasOnlyEf00Tx
- _ensureIasBound
- wake enroll
- no Poll Control sleepy

### battery

- normalizeZclBatteryPercent
- UnifiedBatteryHandler nonlinear
- DP cascade
- linear formula ban

### energy_divisors

- SmartDivisorManager (parse SSOT)
- EnergyJumpGuard → rememberLearnedDivisor
- SmartEnergyManager (real vs estimated audit)
- VirtualEnergyMeterMixin (estimates only after silence)
- L14 safeSetCapabilityValue
- HomeyGapCompensator soft notes only

### ef00_dp

- couple dp profile
- DpByteArrayProfiles
- SmartDivisor
- UnknownDPLogger observe-only TX

### l14_telemetry

- SanityFilter EMA/ROC
- anti-flood
- safeSetCapabilityValue
- commitCapability


## Layer glossary (P2224 complementary)

Schemes coexisting: `pipeline_l0_l11`, `bypass_elite_l1_l9`, `capability_protocol_l0_l6`, `button_capture_l1_l8`, `ai_three_layers`

SSOT: `config/resilience/layer-glossary.json` · doctrine: `docs/architecture/COMPLEMENTARY_ENRICHMENT.md`

### Evolution refs

- `docs/CHRONOLOGICAL_EVOLUTION.md`
- `docs/PROJECT_EVOLUTION_HISTORY.md`
- `docs/MASTER_EVOLUTION_REFERENCE.md`
- `docs/architecture/LAYERS_CAPABILITY_PROTOCOL.md`
- `docs/architecture/LAYERS_ENERGY_BUTTONS_FLOWS.md`
- `docs/architecture/ARCHITECTURE_TELEMETRY_V5.md`
- `docs/architecture/COMPLEMENTARY_ENRICHMENT.md`
- `docs/rules/BYPASS_ELITE_LAYERS.md`
- `docs/rules/DUAL_APP_VISION.md`
- `docs/ARCHITECTURE_AI.md`
- `AI_CONTEXT_MANDATE.md`

---
Regenerate: `npm run resilience:audit`

