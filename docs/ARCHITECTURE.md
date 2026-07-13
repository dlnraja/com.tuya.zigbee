# Architecture Overview

> Tuya Unified Zigbee for Homey Pro
> Version: 9.0.53 | Last Updated: 2026-06-18

## Project Overview

The Tuya Unified Zigbee app is a comprehensive Homey SDK3 application supporting **429 drivers** (378 Zigbee + 51 WiFi) for Tuya-compatible smart home devices. It implements an **11-layer Zigbee pipeline**, **23 time sync formats**, and **42 utility modules** for maximum device compatibility and reliability.

### Key Statistics
| Metric | Value |
|--------|-------|
| Total drivers | 429 |
| Zigbee drivers | 378 |
| WiFi drivers | 51 |
| Fingerprints | 4,304 |
| Flow cards | 4,138 |
| Unique capabilities | 156 |
| Time sync formats | 23 |
| MCU protocol versions | 5 (v3.1-v3.5) |
| Pipeline layers | 11 |
| Lib files | 468 |
| Scripts | 93 |
| Workflows | 40 |

---

## 11-Layer Zigbee Pipeline

The core of the app is an 11-layer processing pipeline that handles all Zigbee communication:

```
Layer 0: TuyaZigbeeDevice.handleFrame     [Raw frame interception]
    |
Layer 1: UniversalThrottleManager          [Flow control: 120 RX/min, 30 TX/min]
    |
Layer 2: IntelligentProtocolRouter         [Route ZCL vs Tuya DP]
    |
Layer 3: TuyaBoundCluster                  [Binding & command capture]
    |
Layer 4: TuyaEF00Manager/TuyaDPParser     [Multi-DP decoding]
    |
Layer 5: GlobalTimeSyncEngine              [Time sync (0x24)]
    |
Layer 6: PhysicalButtonMixin               [Button deduplication]
    |
Layer 7: BaseUnifiedDevice                 [Capability mapping]
    |
Layer 8: DynamicCapabilityManager          [Auto-discovery & phantom pruning]
    |
Layer 9: SessionManager                    [Fragmented IR packets]
    |
Layer 10: HealthMonitor                    [Heartbeat tracking]
    |
Layer 11: SanityFilter                     [EMA + ROC noise filtering]
```

### Layer Details

#### L0: TuyaZigbeeDevice.handleFrame
- **File**: `lib/tuya/TuyaZigbeeDevice.js` (45.6KB)
- **Purpose**: Raw Zigbee frame interception and initial routing
- **Handles**: All incoming Zigbee frames before any processing

#### L1: UniversalThrottleManager
- **File**: `lib/utils/UniversalThrottleManager.js`
- **Purpose**: Flow control to prevent device overload
- **Limits**: 120 RX messages/min, 30 TX commands/min per device

#### L2: IntelligentProtocolRouter
- **File**: `lib/protocol/IntelligentProtocolRouter.js`
- **Purpose**: Routes frames to ZCL or Tuya DP handlers
- **Decision**: Based on cluster ID (0xEF00 = Tuya DP, others = ZCL)

#### L3: TuyaBoundCluster
- **File**: `lib/clusters/TuyaBoundCluster.js` (+ 14 cluster files)
- **Purpose**: Cluster binding and command capture
- **Supports**: 17 safe clusters for auto-discovery

#### L4: TuyaEF00Manager/TuyaDPParser
- **Files**: `lib/tuya/TuyaEF00Manager.js` (97.6KB), `lib/tuya/TuyaDPParser.js` (6.3KB)
- **Purpose**: Multi-DP decoding (single and multi-frame)
- **Features**: MCU UART header detection (0x55 0xAA), parseMultiple()

#### L5: GlobalTimeSyncEngine
- **File**: `lib/tuya/GlobalTimeSyncEngine.js`
- **Purpose**: Time synchronization with 23 format support
- **Formats**: 23 distinct time sync formats (see Time Sync section)

#### L6: PhysicalButtonMixin
- **File**: `lib/mixins/PhysicalButtonMixin.js`
- **Purpose**: Button deduplication with 2000ms window
- **Prevents**: Ghost button presses from hardware echoes

#### L7: BaseUnifiedDevice
- **File**: `lib/devices/BaseUnifiedDevice.js` (182.1KB)
- **Purpose**: Core capability mapping and device lifecycle
- **Features**: safeSetCapabilityValue, markAppCommand, lifecycle management

#### L8: DynamicCapabilityManager
- **File**: `lib/managers/DynamicCapabilityManager.js` (11.7KB)
- **Purpose**: Auto-discovery of capabilities and phantom pruning
- **Features**: Automatic capability detection from DP reports

#### L9: SessionManager
- **File**: `lib/session/SessionManager.js`
- **Purpose**: Fragmented IR packet reassembly
- **For**: IR blaster devices with multi-packet commands

#### L10: HealthMonitor
- **Files**: `lib/health/HealthMonitor.js`, `lib/zigbee/ZigbeeHealthMonitor.js`
- **Purpose**: Device heartbeat tracking and health monitoring
- **Features**: Offline detection, connection quality metrics

#### L11: SanityFilter
- **File**: `lib/tuya/SanityFilter.js` (3.4KB)
- **Purpose**: Noise filtering using EMA and ROC algorithms
- **Prevents**: Spurious value spikes from sensor readings

---

## Device Class Hierarchy

```
Homey.Device (SDK3)
  |
  +-- ZigBeeDevice (homey-zigbeedriver)
  |     |
  |     +-- TuyaZigbeeDevice (lib/tuya/TuyaZigbeeDevice.js)
  |           |
  |           +-- BaseUnifiedDevice (lib/devices/BaseUnifiedDevice.js)
  |                 |
  |                 +-- UnifiedSensorBase (lib/devices/UnifiedSensorBase.js)
  |                 |     [122 sensor drivers]
  |                 |
  |                 +-- UnifiedCoverBase (lib/devices/UnifiedCoverBase.js)
  |                 |     [9 windowcoverings + 2 curtain + 3 garagedoor]
  |                 |
  |                 +-- UnifiedLightBase (lib/devices/UnifiedLightBase.js)
  |                 |     [42 light + 16 fan drivers]
  |                 |
  |                 +-- UnifiedPlugBase (lib/devices/UnifiedPlugBase.js)
  |                 |     [113 socket drivers]
  |                 |
  |                 +-- UnifiedThermostatBase (lib/devices/UnifiedThermostatBase.js)
  |                 |     [25 thermostat + 4 heater drivers]
  |                 |
  |                 +-- UnifiedSwitchBase (lib/devices/UnifiedSwitchBase.js)
  |                 |     |
  |                 |     +-- HybridSwitchBase (adds PhysicalButtonMixin + VirtualButtonMixin)
  |                 |
  |                 +-- ButtonDevice (lib/devices/ButtonDevice.js)
  |                       [18 remote + 4 doorbell + 2 button drivers]
  |
  +-- TuyaLocalDevice (lib/tuya-local/TuyaLocalDevice.js)
  |     [29 WiFi Tuya drivers]
  |
  +-- EweLinkLocalDevice (lib/ewelink-local/EweLinkLocalDevice.js)
        [22 WiFi eWeLink drivers]
```

### Driver Categories
| Category | Count | Protocol | Base Class |
|----------|-------|----------|------------|
| sensor | 122 | ZCL + Tuya DP | UnifiedSensorBase |
| socket | 113 | ZCL + Tuya DP | UnifiedPlugBase |
| other | 44 | Mixed | Various |
| light | 42 | ZCL + Tuya DP | UnifiedLightBase |
| thermostat | 25 | Tuya DP | UnifiedThermostatBase |
| remote | 18 | ZCL | ButtonDevice |
| fan | 16 | ZCL + Tuya DP | UnifiedLightBase |
| windowcoverings | 9 | Tuya DP + ZCL | UnifiedCoverBase |
| lock | 5 | Tuya DP | UnifiedSensorBase |
| doorbell | 4 | ZCL | ButtonDevice |
| heater | 4 | Tuya DP | UnifiedThermostatBase |
| garagedoor | 3 | Tuya DP | UnifiedCoverBase |
| button | 2 | ZCL | ButtonDevice |
| curtain | 2 | Tuya DP | UnifiedCoverBase |
| camera | 1 | Mixed | Various |
| vacuumcleaner | 1 | Mixed | Various |
| speaker | 1 | Mixed | Various |

---

## Protocols

### Zigbee (Tuya DP 0xEF00 + ZCL)
- **Primary protocol** for 378 drivers
- **Tuya DP**: Custom Data Point protocol on cluster 0xEF00
- **ZCL**: Standard Zigbee Cluster Library for on/off, level control, etc.
- **Multi-DP**: Single frame can contain multiple data points

### WiFi (TuyaLocalClient)
- **29 WiFi drivers** using Tuya protocol
- **TCP socket** connection with adaptive handshake
- **Protocol versions**: 3.1, 3.2, 3.3, 3.4, 3.5
- **Features**: Offline command queuing, heartbeat monitoring, IP self-healing

### WiFi (EweLinkLocal)
- **22 WiFi drivers** using eWeLink protocol
- **Similar architecture** to TuyaLocalClient
- **Features**: Circuit breaker, connection state tracking

---

## Module Directory Structure

```
lib/
  tuya/          [57 files] Tuya protocol: DP parsing, time sync, sanity filtering
  devices/       [17 files] Device base classes: switch, sensor, cover, light, plug, thermostat
  mixins/        [18 files] Reusable behavior: PhysicalButton, VirtualButton, Sonoff, Thermostat
  managers/      [23 files] Services: SmartDivisor, DynamicCapability, Energy, IASZone, IEEE
  utils/         [50 files] Utilities: AdaptiveDataParser, CaseInsensitiveMatcher, cache
  battery/       [13 files] Battery: UnifiedHandler, Calculator, Monitor, Health, Hybrid
  clusters/      [28 files] ZCL clusters: OnOff, LevelControl, Tuya, ZosungIR
  protocol/      [5 files]  Protocol: HybridProtocol, IntelligentRouter, KnownProtocols
  presence/      [7 files]  Presence: ConfidenceScorer, SignalTriangulation, VirtualPresence
  features/      [19 files] Features: Flows, Conditions, Energy, Topology, Backup
  groups/        [2 files]  Groups: DeviceGroupManager
  registry/      [8 files]  Device profiles: switches, sensors, covers, lights, plugs, thermostats
```

---

## Data Flow

### Zigbee Device Communication
```
Device sends Zigbee frame
    |
    v
L0: handleFrame() intercepts
    |
    v
L1: ThrottleManager checks rate limits
    |
    v
L2: ProtocolRouter decides ZCL vs Tuya DP
    |
    v
L3: BoundCluster captures command
    |
    v
L4: TuyaEF00Manager decodes DPs (may have multiple)
    |
    v
L5: TimeSyncEngine handles time DPs
    |
    v
L6: PhysicalButtonMixin deduplicates button presses
    |
    v
L7: BaseUnifiedDevice maps to capabilities
    |
    v
L8: DynamicCapabilityManager auto-discovers new caps
    |
    v
L11: SanityFilter smooths noisy values
    |
    v
Homey UI updates
```

### WiFi Device Communication
```
Device sends TCP packet
    |
    v
TuyaLocalClient receives and decrypts
    |
    v
TuyaLocalDevice._onData() processes
    |
    v
Capability mapping via dpMappings
    |
    v
safeSetCapabilityValue() updates Homey
```

---

## Time Sync Formats

The app supports 23 distinct time synchronization formats:

### Epoch-Based (4-8 bytes)
- ZIGBEE_2000, ZIGBEE_2000_LOCAL, ZIGBEE_2000_LE
- UNIX_1970, UNIX_1970_LOCAL, UNIX_1970_LE, UNIX_1970_MS

### Dual Timestamp (8 bytes)
- TUYA_DUAL_2000, TUYA_DUAL_1970
- Z2M_DUAL_1970, Z2M_DUAL_2000

### MCU UART Protocol (8-10 bytes)
- TUYA_MCU, TUYA_MCU_HDR_10, TUYA_MCU_HDR_8

### Sequence-Echo (10 bytes)
- TUYA_SEQ_10, TUYA_SEQ_10_E2K

### Minimal & Date-String (5-12 bytes)
- ZCL_5, TUYA_STANDARD, TUYA_UTC
- TUYA_EXTENDED_TZ, TUYA_FULL_TZ, TUYA_GATEWAY

### Commit-Trigger
- ZT08_DP17_COMMIT

---

## Security Model

### Local-First Architecture & Zero-Touch Updates
- **100% local execution** on Homey Pro
- **Zero cloud calls** during normal operation
- **Autonomous Enricher (v9.0.53)**: The `mfs_db.json` database is loaded as the primary source of truth locally. The remote Tuya Github master is only used as a weekly fallback, eliminating cloud dependencies while keeping fingerprints updated.
- **Intelligent Fingerprinting**: Case-insensitive heuristics natively cross-reference manufacturer names (`includesCI`) allowing autonomous mapping of variations.
- **Heap limit**: < 64MB
- **Bundle limit**: < 7MB

### Bi-Directional Button Architecture
- **Ghost Press Prevention**: The `PhysicalButtonMixin` and `VirtualButtonMixin` prototype chain securely propagates `markAppCommand()` to accurately decouple physical button presses from app/virtual flow commands.
- **Legacy Compatibility**: A fallback Boolean tracker (`this._appCommandPending`) is preserved ensuring 30+ legacy single-gang switch drivers maintain backwards compatibility without breaking dual/multi-gang implementations.

### Token Security
- GitHub tokens never committed to .git/config
- GH_PAT secret for cross-repo access
- GITHUB_TOKEN for current repo only

### Sensitive Files Blocked
`*.key`, `*.pem`, `config.json`, `secrets.json`, `credentials.json`, `token.json`, `oauth2.keys.json`, `client_secret*.json`

---

## CI/CD Pipeline

### GitHub Actions (40 workflows)
- **Validation**: Syntax, JSON schema, security scanning
- **Building**: Bundle size check, SDK publish validation
- **Publishing**: Auto-publish draft, stable release
- **Maintenance**: Daily maintenance, monthly enrichment
- **Quality**: Code quality, fingerprint health, flow card integrity

### Pre-Commit Checklist
1. Syntax check: `node --check <files>`
2. SDK validation: `npx homey app validate --level publish`
3. Security scan: `node scripts/ci/security-scanner.js`
4. Size check: < 7MB bundle

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| `CLAUDE.md` | Full project reference for AI agents |
| `CORE_RULES.md` | Single source of truth for all rules (R1-R58) |
| `docs/MODULES.md` | Module documentation |
| `docs/WORKFLOWS.md` | Workflow documentation |
| `docs/SCRIPTS.md` | Script documentation |
| `.ai/KNOWLEDGE_CACHE.json` | Machine-readable knowledge base |
