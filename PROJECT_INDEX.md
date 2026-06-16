# PROJECT_INDEX.md - Unified Smart Home Engine (Local-First) Reference Guide

> **Version**: 9.0.38 | **App ID**: `com.dlnraja.tuya.zigbee` (stable: `com.dlnraja.tuya.zigbee.stable`)
> **412 drivers** (361 Zigbee + 51 WiFi) | **4,304 fingerprints** | **4,138 flow cards** | **156 capabilities** | **SDK v3**

⚠️ **ATTENTION AI AGENTS, LOCAL CLAUDE CODE, & ANTIGRAVITY SKILLS** ⚠️
Before making ANY changes to this repository, you **MUST** execute the mandatory entry procedure:
1. **Read [AI_GLOBAL_ACTION_PLAN.md](.archive/root-cleanup-2026-05-28/AI_GLOBAL_ACTION_PLAN.md)** — immediate plan of action and token-saving offline intelligence aggregator methodology.
2. **Read [GLOBAL_INVESTIGATION_PLAN.md](docs/GLOBAL_INVESTIGATION_PLAN.md)** — 22-section deep diagnostic methodology covering forums, logs, emails, and external Z2M/ZHA/Domoticz cross-references.
3. **Understand the Single-MFR Multi-Variant Rule** — A single `manufacturerName` can map to dozens of different product variants (PIDs). Check `productId` combinations!
4. **Leverage the Local Arsenal** — Use Antigravity Skills in `.agents/skills/` and local Claude Code tools for automated audits.
5. **Enrich Iteratively** — Update documentation, dotfiles (`.*`), and workflows (`nightly-auto-process.yml`, `driver-maintenance.yml`) with your findings to elevate overall project performance.

---

## 📑 TABLE DES MATIÈRES

1. [Apps & Branches](#1-apps--branches)
2. [Glossaire des Termes](#2-glossaire-des-termes)
3. [Architecture Globale](#3-architecture-globale)
4. [Fingerprint Matching](#4-fingerprint-matching)
5. [DP Protocol (0xEF00)](#5-dp-protocol-0xef00)
6. [Device Class Hierarchy](#6-device-class-hierarchy)
7. [Battery & Power Management](#7-battery--power-management)
8. [Flow Cards System](#8-flow-cards-system)
9. [Settings Keys](#9-settings-keys)
10. [Critical Rules](#10-critical-rules)
11. [File Locations](#11-file-locations)
12. [YML Workflows](#12-yml-workflows)
13. [Driver Categories](#13-driver-categories)
14. [Common Patterns](#14-common-patterns)
15. [Anti-Generic Strategy](#15-anti-generic-strategy)
16. [GitHub Automation](#16-github-automation)
17. [External Sources](#17-external-sources)
18. [Version History](#18-version-history)
19. [Known Issues](#19-known-issues)
20. [Quality Gate System (9 Layers)](#20-quality-gate-system-9-layers)
21. [Local Tuya WiFi Architecture](#21-local-tuya-wifi-architecture)
22. [Crash Resolutions History](#22-crash-resolutions-history)
23. [AI Navigation & Cartography Map](#23-ai-navigation--cartography-map)
24. [Advanced Agentic Skills Integration](#24-advanced-agentic-skills-integration)
25. [Deep Diagnostic & Cross-Referencing Mandate](#25-deep-diagnostic--cross-referencing-mandate-ai-agents)
26. [Autonomous Agent Reflection & Logic Mode](#26-autonomous-agent-reflection--logic-mode)
27. [Dynamic Heuristics & Adaptive Capabilities](#27-dynamic-heuristics--adaptive-capabilities)
28. [Dual-Layer Pairing Architecture & Aggregate Error Prevention](#28-dual-layer-pairing-architecture--aggregate-error-prevention-v8534)
29. [Session Changelog v9.0.22 (June 2026)](#29-session-changelog-v9022-june-2026)
30. [Pre-Commit Automation & Validation Gates](#30-pre-commit-automation--validation-gates)

---

## 1. APPS & BRANCHES

### App IDs
| App | App ID | Purpose |
|-----|--------|---------|
| **Main** | `com.dlnraja.tuya.zigbee` | Production + Test channel |
| **Stable** | `com.dlnraja.tuya.zigbee.stable` | Parallel stable version |

### Branches
| Branch | Purpose | Push Target |
|--------|---------|-------------|
| `master` | Latest stable code | Production |
| `stable-v5` | Stable version | Test channel + stable app |
| `SDK3` (upstream) | JohanBendz upstream | Sync source |

### Version Bump Order
```bash
1. Update version in package.json
2. Update version in .homeycompose/app.json
3. Add entry to .homeychangelog.json (TOP)
4. git commit -m "v5.11.XXX"
5. git push
```

---

## 2. GLOSSAIRE DES TERMES

### Terminologie Zigbee
| Term | Definition |
|------|------------|
| **manufacturerName** | Zigbee manufacturer identifier (e.g., `_TZ3000_abc123`) |
| **productId** | Device product ID (e.g., `TS0001`, `TS0601`) |
| **Fingerprint** | Combination of `manufacturerName + productId` → driver |
| **DP (Data Point)** | Tuya protocol data unit (DP1-DP200+) |
| **0xEF00** | Tuya DP cluster (61184 decimal) |
| **0xE000** | BSEED custom cluster for buttons |
| **ZCL** | Zigbee Cluster Library (standard clusters) |
| **Unified** | Device using BOTH ZCL + Tuya DP |

### Terminologie Homey
| Term | Definition |
|------|------------|
| **Driver** | Homey driver matching fingerprints → device class |
| **Capability** | Homey feature (measure_temperature, onoff, etc.) |
| **Flow Card** | Trigger/Condition/Action in Homey flows |
| **compose.json** | Driver configuration (fingerprints, capabilities) |
| **device.js** | Device implementation (DP handling, listeners) |
| **SDK v3** | Homey SDK version 3 (async, this.homey.* managers) |

### Terminologie Projet
| Term | Definition |
|------|------------|
| **Anti-Generic** | Strategy to prevent devices pairing as "zigbee generic" |
| **Variant** | Device variant with different features (same mfr) |
| **Enrichment** | Post-pairing capability detection |
| **Fallback** | `universal_fallback` driver for unknown devices |
| **Unified Driver** | Driver supporting multiple protocol types |

---

## 3. ARCHITECTURE GLOBALE

```
┌─────────────────────────────────────────────────────────────────┐
│                         app.js                                  │
│  - registerCustomClusters (0xEF00, 0xE000, 0xE001-E003)        │
│  - FlowCardManager + UniversalFlowCardLoader                    │
│  - SmartDeviceDiscovery + UnknownDeviceHandler                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              drivers/ (412 drivers: 361 Zigbee + 51 WiFi)       │
│  ├── 339 drivers with flow cards (4,138 total)                  │
│  ├── 7 profile classes: switch, sensor, cover, light,           │
│  │   plug, thermostat, button                                   │
│  ├── 17 Homey device classes (sensor:122, socket:113, etc.)     │
│  └── 156 unique capabilities                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    lib/ (core library, 12+ subdirs)              │
│  ├── tuya/     (57 files) Tuya protocol, DP parsing            │
│  │   └── TuyaTimeSyncFormats.js (23 time formats, MCU guessing)│
│  ├── devices/  (17 files) BaseUnifiedDevice, UnifiedSwitchBase │
│  ├── mixins/   (18 files) PhysicalButton, VirtualButton         │
│  ├── managers/ (23 files) SmartDivisor, DynamicCapability       │
│  ├── utils/    (50 files) AdaptiveDataParser, CaseMatcher      │
│  ├── battery/  (12 files) UnifiedBatteryHandler                 │
│  ├── clusters/ (28 files) OnOff, LevelControl, Tuya, ZosungIR  │
│  ├── protocol/ (5 files)  HybridProtocol, IntelligentRouter    │
│  ├── zigbee/   (20+ files) HealthMonitor, DataQuery, GreenPower│
│  └── registry/ (8 files)  DeviceProfileRegistry, 7 profiles    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    scripts/ (126 total)                          │
│  ├── automation/ (95 files) validate-all, driver-health, etc.   │
│  ├── ci/         (20 files) pre-commit, security, CI gates     │
│  └── validation/ (11 files) fingerprint, collision, schema      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. FINGERPRINT MATCHING

### Règle d'Or
```
Fingerprint = manufacturerName + productId (COMBINED)

_EXEMPLE NORMAL (même mfr dans plusieurs drivers):
_TZ3000_abc + TS0001 → switch_1gang
_TZ3000_abc + TS0002 → switch_2gang  ✅ OK (productId différent)
_TZ3000_abc + TS0043 → button_wireless_3 ✅ OK (productId différent)

_EXEMPLE DE CONFLIT:
_TZ3000_abc + TS0001 → switch_1gang
_TZ3000_abc + TS0001 → switch_2gang  ❌ CONFLIT (même driver different!)
```

### Matching Logic (Homey SDK)
- Device matches if `manufacturerName IN list` AND `productId IN list`
- Order matters: first matching driver wins
- Exact string match required

### When to REMOVE a fingerprint
- ONLY if SAME manufacturerName + SAME productId in WRONG driver
- Do NOT remove just because mfr appears in another driver with different productId

### Manufacturer Prefixes
| Prefix | Type | Notes |
|--------|------|-------|
| `_TZ3000_` | ZCL switches | Often multi-gang (1,2,3,4) |
| `_TZ3210_` | ZCL switches | Tuya standard |
| `_TZE200_` | Tuya DP | Sensors, TRVs, covers |
| `_TZE204_` | Tuya DP | Variant of _TZE200_ |
| `_TZE284_` | Tuya DP | Variant of _TZE200_ |
| `_TZ3...` | Mixed | Check productId for device type |

---

## 5. DP PROTOCOL (0xEF00)

### Cluster 0xEF00 (Tuya DP)
```
ZCL Frame: [frameCtrl:1][seqNum:1][cmdId:1][payload:N]
DP Payload: [status:1][transId:1][dp:1][type:1][lenHi:1][lenLo:1][data:N]
```

### DP Types
| Type | Value | Meaning |
|------|-------|---------|
| Raw | 0 | Binary data |
| Bool | 1 | True/False |
| Value | 2 | 4-byte number |
| String | 3 | Text |
| Enum | 4 | Discrete values |
| Bitmap | 5 | Bit flags |

### Common DPs (Switches)
| DP | Function | Notes |
|----|----------|-------|
| DP1 | Gang 1 state | on/off |
| DP2 | Gang 2 state | on/off |
| DP3-8 | Gangs 3-8 | on/off |
| DP14 | Power-on behavior | 0=off, 1=on, 2=last |
| DP15 | Backlight | 0=off, 1=normal, 2=inverted |
| DP101 | Child lock | bool |

### Air Quality Sensor DPs (_TZE200_8ygsuhe1)
| DP | Capability | Divisor |
|----|------------|---------|
| DP2 | CO2 (ppm) | 1 |
| DP18 | Temperature | 10 |
| DP19 | Humidity | 10 |
| DP20 | PM2.5 | 1 |
| DP21 | VOC (ppb) | 1 |
| DP22 | Formaldehyde (mg/m³) | 100 |

### Double-Division Bug (FIXED v5.11.15)
- Symptom: temp 0.2°C instead of 20.6°C
- Cause: AdaptiveDataParser auto-converts (/100) THEN dpMappings divisor divides again
- Fix: TuyaEF00Manager skips auto-convert when dpMappings divisor !== 1

### 23 Time Sync Formats (MCU Time Synchronization)
The `TuyaTimeSyncFormats.js` (v6.0.0) library defines 23 distinct time sync format variants for Tuya MCU devices. Time sync is critical for LCD climate sensors, TRVs, and weather stations that lose their clocks on power cycles.

**Epoch-Based (7 formats):** ZIGBEE_2000, ZIGBEE_2000_LOCAL, ZIGBEE_2000_LE, UNIX_1970, UNIX_1970_LOCAL, UNIX_1970_LE, UNIX_1970_MS
**Dual Timestamp (4 formats):** TUYA_DUAL_2000, TUYA_DUAL_1970, Z2M_DUAL_1970, Z2M_DUAL_2000
**MCU UART Protocol (3 formats):** TUYA_MCU (9 bytes), TUYA_MCU_HDR_10 (10 bytes), TUYA_MCU_HDR_8 (8 bytes)
**Sequence-Echo (2 formats):** TUYA_SEQ_10, TUYA_SEQ_10_E2K
**Minimal & Date-String (6 formats):** ZCL_5, TUYA_STANDARD, TUYA_UTC, TUYA_EXTENDED_TZ, TUYA_FULL_TZ, TUYA_GATEWAY
**Commit-Trigger (1 format):** ZT08_DP17_COMMIT (DP17 bool write after time sync)

**MCU Format Guessing** (`guessFormat()`): Uses 6 heuristics (manufacturer prefix, product ID, endpoint clusters, driver class, known patterns, model ID) to auto-detect the correct format for unknown devices with confidence scoring.

**MCU UART Protocol Versions:** v3.1 (8-byte, no seq), v3.2 (8-byte, optional seq), v3.3 (10-byte, seq REQUIRED), v3.4 (+ DP17 commit), v3.5 (extended TZ)

---

## 6. DEVICE CLASS HIERARCHY

```
Homey.Device (SDK3)
  └── ZigBeeDevice (homey-zigbeedriver)
        └── TuyaZigbeeDevice (lib/tuya/TuyaZigbeeDevice.js) [45.6KB]
              └── TuyaUnifiedDevice (lib/devices/TuyaUnifiedDevice.js)
                    └── BaseUnifiedDevice (lib/devices/BaseUnifiedDevice.js) [182.1KB]
                          ├── UnifiedSensorBase [193.8KB] (largest)
                          ├── UnifiedPlugBase [41.2KB]
                          ├── UnifiedCoverBase [34.9KB]
                          ├── UnifiedThermostatBase [34.7KB]
                          ├── UnifiedLightBase [31.4KB]
                          ├── UnifiedSwitchBase [~30KB]
                          │     └── + PhysicalButtonMixin + VirtualButtonMixin
                          └── ButtonDevice
```

### Base Class Sizes (Current)
| File | Size | Purpose |
|------|------|---------|
| UnifiedSensorBase.js | 193.8KB | All sensor logic (largest) |
| BaseUnifiedDevice.js | 182.1KB | Master base device |
| UnifiedBatteryHandler.js | 59.5KB | Non-linear battery calculation |
| TuyaZigbeeDevice.js | 45.6KB | Base device class, frame interception |
| UnifiedPlugBase.js | 41.2KB | Smart plug logic |
| UnifiedCoverBase.js | 34.9KB | Cover/curtain logic |
| UnifiedThermostatBase.js | 34.7KB | Thermostat logic |
| UnifiedLightBase.js | 31.4KB | Light device logic |
| TuyaEF00Manager.js | 97.6KB | DP protocol handler |
| SmartDivisorManager.js | 16.7KB | Smart divisor auto-detection |
| DynamicCapabilityManager.js | 11.7KB | Auto-discovery & phantom pruning |
| TuyaDPParser.js | 6.3KB | Multi-DP parser with MCU UART detection |
| SanityFilter.js | 3.4KB | EMA + ROC noise filtering |
| CapabilityFallbackManager.js | 3KB | **CRITICAL:** Intercepts and sanitizes all capabilities |

### Import Paths (CRITICAL)
```javascript
// CORRECT:
const { ZigBeeDevice } = require('homey-zigbeedriver');
constSwitchBase = require('../../lib/devices/UnifiedSwitchBase');
const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');

// WRONG (missing ../../):
const TuyaZigbeeDevice = require('../../lib/TuyaZigbeeDevice');
```

---

## 7. BATTERY & POWER MANAGEMENT

### Power Source Classification
| Type | Class | Battery Cap | Notes |
|------|-------|-------------|-------|
| Battery | sensor, remote | measure_battery OR alarm_battery | Never both |
| Mains | socket, light, fan | NONE | get mainsPowered() = true |
| | varies | Runtime detection | mainsPowered getter + conditional |
| Kinetic | remote | NONE | Energy harvesting (TS004x) |
| USB | varies | NONE | Treated as mains |

### Rule: NEVER combine measure_battery + alarm_battery
```javascript
// SAFE check before adding battery capability
const caps = compose.capabilities || [];
if (caps.includes('measure_battery')) {
  // NEVER add alarm_battery — SDK v3 violation
}
```

### UnifiedBatteryHandler Detection Order
1. ZCL genPowerCfg (cluster 0x0001) → batteryPercentageRemaining ÷ 2
2. Tuya DP (DP 4,10,14,15,21,100-105) → direct percentage
3. IAS Zone Status bit 3 → low-battery boolean
4. Voltage DPs (DP 33,35,247) → voltage-to-percent curve conversion
5. mainsPowered getter → remove all battery capabilities
6. Kinetic detection (TS004x without batteries) → remove all

### Mains-Powered Sensors
```javascript
// Must remove measure_battery:
get mainsPowered() { return true; }
// In onNodeInit:
await this.removeCapability('measure_battery').catch(() => {});
```

---

## 8. FLOW CARDS SYSTEM

### Flow Card ID Pattern
```
{driver}_physical_gang{N}_{on|off}
Example: switch_2gang_physical_gang1_on
```

### Rules
- NO `titleFormatted` with `[[device]]` — causes manual selection bug
- Always check `driver.flow.compose.json` for exact IDs
- Virtual buttons MUST use `this._safeSetCapability()` not native setter

### Card Types
| Type | Method | Notes |
|------|--------|-------|
| Trigger | `getDeviceTriggerCard()` | Empty args |
| Condition (driver) | `getDeviceConditionCard()` | |
| Condition (app) | `getConditionCard()` | |
| Action | `getDeviceActionCard()` | |

---

## 9. SETTINGS KEYS

### ALWAYS Use These EXACT Keys
```javascript
// CORRECT:
this.settings.get('zb_model_id')
this.settings.get('zb_manufacturer_name')

// WRONG (camelCase variants):
this.settings.get('zb_modelId')
this.settings.get('zb_manufacturerName')
```

---

## 10. CRITICAL RULES

### SDK v3 Mandatory Rules
1. `async onNodeInit()` — Zigbee init (NOT sync onInit)
2. `await this.setCapabilityValue()` — ALWAYS awaited
3. `this.homey.<managerId>` — SDK v3 managers (NOT global Managers)
4. Idempotent listeners — prevent duplication on reconnect
5. Clear timeouts in `onDeleted()` / `onUninit()`

### Physical Button Detection Pattern
```javascript
// State tracking (PR #120 pattern)
this._lastOnoffState = null;
this._appCommandPending = false;
this._appCommandTimeout = null;

// Mark app command (2000ms window):
_markAppCommand() {
  this._appCommandPending = true;
  clearTimeout(this._appCommandTimeout);
  this._appCommandTimeout = setTimeout(() => {
    this._appCommandPending = false;
  }, 2000);
}

// In DP handler:
const isPhysical = reportingEvent && !this._appCommandPending;
if (isPhysical && previousState !== value) {
  this.homey.flow.getDeviceTriggerCard(flowId).trigger(this, {}, {});
}
```

### Mixin Order
```javascript
class Device extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedSwitchBase))
```

### Backlight Values (Strings Only)
```javascript
"off"      // NOT 0
"normal"   // NOT 1
"inverted" // NOT 2
```

### Post-Promotion Documentation & Registry Sync
- On every app promotion (draft-to-test / production / branch synchronization), it is mandatory to recursively audit, normalize, and update all markdown documentation files (`.md`), technical registries/reference databases (like `app.json`, `package.json`, fingerprint matrices, and cross-references), dotfiles (`.eslintignore`, `.homeyignore`, etc.), rules configuration files (such as `.clinerule`, `.cursorrules`, etc.), architectural maps, and cartography/index files (like `PROJECT_INDEX.md`, `.archive/root-cleanup-2026-05-28/FINGERPRINT-CROSSREF.md`) to maintain perfect structural alignment with active codebase updates and prevent documentation rot.
- **Comment robustness in CI/CD pipeline checks**: When grep'ing for banned words, comment lines (`//` or `*`) must be ignored (using `grep -v '^[[:space:]]*//' | grep -v '^[[:space:]]*\*'`) to prevent false-positive failures during code-quality validations.
- **Draft script isolation in STRICT_SYNTAX_GUARD**: The temporary draft or development scripts directory (`temp`) must be explicitly ignored by the syntax checker so only active production, lib, drivers, and standard CI/CD files are validated, keeping the repository's build green.
- **Hybrid-Compatible Base Class Exports**: Base classes exported from `lib/devices/` (like `SensorBase` / `UnifiedSensorBase.js`) must use direct exports together with self-referential class properties (`SensorBase.SensorBase = SensorBase; module.exports = SensorBase;`) to ensure absolute compatibility with both direct destructured requires (used by driver implementations) and index-based requires.
- **Universal Evolution & Continuous Enrichment Loop (MANDATORY)**: On *every* single prompt execution or task processed, the developer agent MUST execute a comprehensive, full-scope repository sweep. This loop comprises: scanning and triaging latest community PRs/issues/images (`scan-prs-issues.js`), auto-learning newly found fingerprints (`auto-learn-fingerprints.js`), running self-heals and automated code-fixes (`auto-fix-common-issues.js`), verifying drivers, and collectively enriching ALL yml files, javascript source codes, base classes, rules configs (`.clinerule`, `.cursorrules`, `.windsurfrules`), automations, cartographies, indexes, and reference databases. No element of the ecosystem must be left stagnant.


---

## 11. FILE LOCATIONS

### Core Files
| File | Location | Purpose |
|------|----------|---------|
| app.js | root | App entry point |
| package.json | root | NPM config, scripts |
| app.json | root | Auto-generated manifest (2.1MB) |
| .homeycompose/app.json | root | Base app config |

### Driver Files
| File | Location | Purpose |
|------|----------|---------|
| driver.compose.json | drivers/{type}/ | Fingerprints, capabilities, images |
| driver.js | drivers/{type}/ | Driver class, flow registration |
| device.js | drivers/{type}/ | Device implementation, DP handling |
| driver.flow.compose.json | drivers/{type}/ | Flow cards (triggers/conditions/actions) |

### Library Files
| Path | Files | Purpose |
|------|-------|---------|
| lib/devices/ | 17 files | Device base classes (BaseUnifiedDevice, Unified*Base, HybridSwitchBase) |
| lib/mixins/ | 18 files | Reusable behavior (PhysicalButton, VirtualButton, Sonoff*, Thermostat) |
| lib/tuya/ | 57 files | Tuya protocol (TuyaEF00Manager, TuyaDPParser, SanityFilter, TimeSync) |
| lib/utils/ | 50 files | Utilities (AdaptiveDataParser, CaseInsensitiveMatcher, CacheManager) |
| lib/battery/ | 12 files | Battery management (UnifiedBatteryHandler, Calculator, Monitor) |
| lib/managers/ | 23 files | Services (SmartDivisor, DynamicCapability, Energy, IASZone, IEEE) |
| lib/clusters/ | 28 files | ZCL clusters (OnOff, LevelControl, Tuya*, ZosungIR*) |
| lib/protocol/ | 5 files | Protocol management (HybridProtocol, IntelligentRouter) |
| lib/zigbee/ | 20+ files | Zigbee helpers (HealthMonitor, DataQuery, GreenPower) |
| lib/registry/ | 8 files | Device profiles registry (7 profile categories) |
| lib/adapters/ | 6 files | External adapters (Z2M, ZHA, Security) |
| lib/analytics/ | 3 files | Analytics (Advanced, Standard) |
| lib/session/ | 1 file | IR session management |
| lib/health/ | 1 file | Device health monitoring |

### Scripts
| Path | Files | Purpose |
|------|-------|---------|
| scripts/automation/ | 95 files | CI/CD, auto-update, validate-all, driver-health, mega-audit |
| scripts/ci/ | 20 files | Pre-commit checks, security scanner, CI health gate |
| scripts/validation/ | 11 files | Fingerprint health, collision checking, schema validation |
| scripts/ | 109 files (root) | Maintenance, fixes, fingerprint scans |
| .github/scripts/ | 50+ files | GitHub Actions: forum, github, triage, Athom automation |
| .github/workflows/ | 63 YAML files | CI/CD pipelines (daily, weekly, monthly) |
| .githooks/ | -- | Git hooks (pre-commit, pre-push) |

### Documentation
| File | Purpose |
|------|---------|
| .cursorrules | Cursor AI rules (126 lines) |
| .windsurfrules | Windsurf AI rules (418 lines) |
| .github/WORKFLOW_GUIDELINES.md | GitHub Actions rules (368 lines) |
| .github/SECRETS.md | Secrets reference (133 lines) |
| docs/MEGA_PROMPT_WINDSURF.md | Windsurf mega prompt (45 lines) |
| docs/ARCHITECTURE.md | Architecture reference (562 lines) |
| docs/PROJECT_STATUS.md | Project statistics (41 lines) |

---

## 12. YML WORKFLOWS

### 63 Workflows (see .github/WORKFLOW_GUIDELINES.md for full list)

| Workflow | Schedule | Key Secrets |
|----------|----------|-------------|
| daily-everything | 4x/day | ALL secrets |
| sunday-master | Sun 07:00 | ALL secrets |
| nightly-auto-process | 03:30 daily | ALL secrets |
| weekly-fingerprint-sync | Mon 06:00 | GH_PAT |
| publish | manual | HOMEY_PAT |
| auto-publish-on-push | on complete | HOMEY_PAT |

### YML Rules
1. Read `.github/WORKFLOW_GUIDELINES.md` BEFORE editing any yml
2. Every job running `node` MUST have: checkout → setup-node → npm ci
3. Always set `timeout-minutes` on jobs
4. Always set `permissions:` and `concurrency:` at top level
5. Use `continue-on-error: true` for optional-secret steps
6. Use `[skip ci]` in auto-commit messages to prevent loops
7. Stagger cron schedules by 30+ min to avoid push conflicts

### Secret Priority
1. `HOMEY_PAT` — publishing
2. `GH_PAT` — cross-repo
3. `GOOGLE_API_KEY` — AI analysis
4. `DISCOURSE_API_KEY` — forum posting
5. `HOMEY_EMAIL` + `HOMEY_PASSWORD` — forum fallback

---

## 13. DRIVER CATEGORIES

### Zigbee Drivers (361)
| Category | Drivers | Examples |
|----------|---------|----------|
| Switches | 30+ | switch_1gang..8gang, wall_switch_*, module_mini_switch |
| Dimmers | 15+ | dimmer_*, bulb_dimmable, wall_dimmer_* |
| Lights | 25+ | bulb_rgb, bulb_rgbw, led_strip* |
| Covers | 10+ | curtain_motor, curtain_motor_tilt, shutter_roller_controller |
| Sensors | 60+ | motion_sensor, contact_sensor, climate_sensor, soil_sensor |
| Plugs | 20+ | plug_smart, plug_energy_monitor, din_rail_* |
| Climate | 20+ | thermostat_*, radiator_valve, smart_heater* |
| Security | 15+ | lock_smart, siren, smoke_detector* |
| Buttons | 25+ | button_wireless_*, scene_switch_* |
| Remote | 5+ | ir_remote (virtual), zigbee_remote_*, scene_switch_* |
| Special | 10+ | fingerbot, pet_feeder, garage_door, valve_*, ir_blaster |
| Air Purifiers | 10+ | air_purifier_climate, air_purifier_sensor, air_purifier_quality |
| Radar/Presence | 5+ | presence_sensor_radar, presence_sensor_mmwave |
| Soil Sensors | 3+ | soil_sensor, device_air_purifier_soil |

### WiFi Drivers (51)
| Category | Examples |
|----------|----------|
| SmartLife | wifi_plug, wifi_switch_*, wifi_light, wifi_thermostat |
| eWeLink | wifi_ewelink_plug, wifi_ewelink_switch_2ch |
| Sonoff | wifi_sonoff_minir3, wifi_sonoff_pow_elite |
| Generic | wifi_generic, wifi_sensor |

### Homey Device Class Distribution (17 classes)
| Class | Count | Description |
|-------|-------|-------------|
| sensor | 122 | Temp, humidity, motion, contact, water, smoke, air quality, presence radar |
| socket | 113 | Smart plugs, energy monitors, power strips, DIN rail |
| other | 44 | Mixed-purpose, DIY, generic Tuya |
| light | 42 | RGB, RGBW, CCT bulbs, LED strips, tunable white |
| thermostat | 25 | TRVs, floor heating, wall thermostats |
| remote | 18 | Scene switches, button remotes, IR blasters |
| fan | 16 | Ceiling fans, tower fans, exhaust fans |
| windowcoverings | 9 | Curtain motors, roller blinds, shutters |
| lock | 5 | Smart door locks, fingerprint locks |
| doorbell | 4 | Video doorbells, wired chimes |
| heater | 4 | Space heaters, radiator valves |
| garagedoor | 3 | Garage door openers |
| button | 2 | Scene triggers, emergency SOS |
| curtain | 2 | Curtain-specific motors |
| camera | 1 | IP cameras |
| vacuumcleaner | 1 | Robot vacuums |
| speaker | 1 | Smart speakers |

### Notable Drivers
| Driver | Features |
|--------|----------|
| device_floor_heating | Floor heating + thermostat |
| device_radiator_valve | Radiator valve + TRV |
| dimmer_dual_channel | Dual channel dimmer |
| sensor_presence_radar | Radar presence + contact |
| air_purifier_sensor | Multi-sensor air quality monitor |
| button_wireless_fingerbot | Fingerbot touch actuator |

---

## 14. COMMON PATTERNS

### Detect Physical Button Press
```javascript
// 2000ms window after app command
const isPhysical = reportingEvent && !this._appCommandPending;
if (isPhysical) {
  this.homey.flow.getDeviceTriggerCard(flowId).trigger(this, {}, {});
}
```

### Deduplicate Flow Triggers
```javascript
const dedupKey = `${capability}_${value}`;
const now = Date.now();
if (this._lastFlowTrigger?.[dedupKey] && now - this._lastFlowTrigger[dedupKey] < 500) {
  return; // Skip duplicate
}
this._lastFlowTrigger = this._lastFlowTrigger || {};
this._lastFlowTrigger[dedupKey] = now;
```

### BSEED ZCL-only Fingerprints
```javascript
_TZ3000_l9brjwau, _TZ3000_blhvsaqf, _TZ3000_ysdv91bk,
_TZ3000_hafsqare, _TZ3000_e98krvvk, _TZ3000_iedbgyxt
```

### Mains-Powered Sensor Fix
```javascript
get mainsPowered() { return true; }
async onNodeInit() {
  await this.removeCapability('measure_battery').catch(() => {});
}
```

---

## 15. ANTI-GENERIC STRATEGY

### Matching Priority (STRICT ORDER)
1. **Specific drivers** (manufacturerName + productId OR manufacturerName alone)
2. **Family permissive drivers** (TS0601, TS004x, Tuya)
3. **universal_fallback**
4. **zigbee generic is FORBIDDEN** unless all above fail

### Anti-Generic Rules
- Drivers must be permissive at pairing time
- Never require DP discovery, ZCL completeness, or time sync during pairing
- Progressive enrichment is mandatory
- universal_fallback must always remain enabled and functional

### Phantom Capabilities Warning
- Do NOT fallback to `HOBEIAN_10G_MULTI` for missing model IDs
- It assigns fake temperature and humidity causing UI spam
- Cascade safely into `HOBEIAN_ZG204ZM_FALLBACK`

### Validation Commands
```bash
node scripts/validation/audit-anti-generic.js   # 100% safe
node scripts/validation/check-pairing-collisions.js  # 0 collisions
npx homey app validate --level publish  # SUCCESS
```

---

## 16. GITHUB AUTOMATION

### Scripts Location
`.github/scripts/` - All GitHub Actions scripts

### Key Scripts
| Script | Purpose |
|--------|---------|
| ai-helper.js | Multi-provider AI fallback chain |
| project-rules.js | Condensed rules for AI prompts |
| forum-responder.js | Auto-respond to forum topics |
| github-scanner.js | Scan GitHub issues/PRs |
| triage-upstream-enhanced.js | Enhanced issue triage |
| nightly-processor.js | Nightly batch (23KB) |
| monthly-comprehensive.js | Monthly deep scan (18KB) |
| athom-build-error-diag.js | Puppeteer diagnostic: extract real error from "Processing failed" builds |
| athom-session-inject.js | Injects Athom CLI OAuth session into Puppeteer (no email/password needed) |
| ultra-compact-app-json.js | Reduces app.json to minimum to avoid processing_failed (<2MB) |

### AI Provider Chain
```
GOOGLE_API_KEY  → Gemini 2.0 Flash / Flash Lite (free)
OPENAI_API_KEY  → GPT-4o-mini
GROQ_API_KEY    → Llama 3.3 70B (free, fast)
HF_TOKEN        → IBM Granite 3.3 8B (HuggingFace, free)
MISTRAL_API_KEY → Mistral Small (free experiment)
OPENROUTER_API_KEY → Llama 3.3 8B free models
APIFREELLM_KEY  → ApiFreeLLM (free, unlimited)
```

### REPLY_TOPICS Rule (CRITICAL)
- Bot must ONLY post on T140352 (our own thread)
- NEVER post on other threads (T26439 Johan, T146735 Tuya)
- `FORUM_TOPICS` may include others for READ-ONLY scanning
- All forum scripts hardcode `140352` as safety net

---

## 17. EXTERNAL SOURCES

### Sources to SCAN (implement silently)
| Source | What to get |
|--------|-------------|
| **Zigbee2MQTT** | Fingerprints, DP definitions, device configs |
| **ZHA (zigpy)** | Device handlers, quirks |
| **Blakadder** | Device database cross-reference |
| **JohanBendz fork** | Upstream fingerprints, PRs, issues |
| **Homey Forum** | User device requests, diagnostic reports |
| **GitHub Issues** | Bug reports, device support requests |

### Sources to PUBLICIZE
- Only: dlnraja T140352, own GitHub, direct user requests
- NEVER mention: JohanBendz, Z2M, ZHA in changelogs/commits

### Forum Post Merge Rule
- If last poster = dlnraja: EDIT/MERGE into that post
- If last poster = someone else: NEW reply (only on T140352)
- NEVER create consecutive posts

---

## 18. VERSION HISTORY

### Key Versions
| Version | Date | Key Changes |
|---------|------|-------------|
| v9.0.36 | 2026-06-16 | 412 drivers, 4304 FPs, 4138 flow cards, 156 capabilities, 63 workflows, 23 time sync formats, MCU format guessing |
| v9.0.22 | 2026-06-14 | 412 drivers, 2520 FPs, Athom build diagnostics, session injection, app.json compaction, security scan |
| v9.0.21 | 2026-06-14 | Forum processing (93 interviews), YAML workflow optimization, CI script --json support, console.log cleanup in 13 drivers |
| v8.3.0 | 2026-05-23 | Case-Insensitive Brand & Taxonomy Hardening for all core brands |
| v5.11.212 | 2026-05-08 | 3784 duplicate fingerprints removed, 4 drivers |
| v5.11.211 | 2026-05 | DeviceIdentificationDatabase crash fix |
| v5.11.210 | 2026-05 | Stability release, 213 drivers |
| v5.11.205 | 2026-04 | Stable app (com.dlnraja.tuya.zigbee.stable) |
| v5.11.204 | 2026-04 | SOS philosophy support, 213 drivers |
| v5.11.200 | 2026-04 | 2141 new FPs from community sync |
| v5.11.15 | 2025-11 | Double-division bug FIXED |
| v5.11.138 | 2025-10 | Driver matching audit complete |

### Latest Commits (stable-v5)
```bash
ab2097ed0 fix: removed 3784 duplicate fingerprints, added 4 drivers
cb038cde7 feat: mega community sync v8.0 data collection
4ce88bbe9 bump: v5.11.212
670d3dda0 fix: make DeviceIdentificationDatabase crash-proof
```

---

## 19. KNOWN ISSUES

### Double-Division Bug
- **Fixed in v5.11.15**
- TuyaEF00Manager skips auto-convert when dpMappings divisor !== 1

### ZCL Cluster Double-Parsing
- **Risk**: sensors with `setupUniversalZCLListeners`
- **Fix**: Check `!this.clusterHandlers?.temperatureMeasurement` before `_setupZCLCluster`

### Phantom Capabilities
- **Risk**: `HOBEIAN_10G_MULTI` fallback on unknown model IDs
- **Fix**: Use `HOBEIAN_ZG204ZM_FALLBACK` instead

### Git Push Conflicts
- **Fix**: Always `git pull --rebase origin master || true` before push

### MFR+PID Collisions (False Positives)
- `audit-anti-generic.js` reports 13,293 "collisions"
- These are duplicates in same driver (normal for TS0601, TS004x)
- `lint-collisions.js` = 0 true collisions ✅

---

## 📌 QUICK REFERENCE

### Settings Keys
```javascript
zb_model_id, zb_manufacturer_name  // NOT camelCase
```

### Import Paths
```javascript
'../../lib/devices/UnifiedSwitchBase'  // NOT relative to root
'../../lib/tuya/TuyaZigbeeDevice'
'homey-zigbeedriver'
```

### Backlight Values
```javascript
"off" | "normal" | "inverted"  // Strings only
```

### Mixin Order
```javascript
PhysicalButtonMixin(VirtualButtonMixin(UnifiedSwitchBase))
```

### Battery Rule
```javascript
// NEVER: measure_battery + alarm_battery together
```

### REPLY_TOPICS
```javascript
// STRICT READ ONLY POLICY: ALL THREADS ARE READ ONLY
// DO NOT POST ANY REPLIES ON 140352 OR ANY OTHER FORUM THREAD
```

## 20. QUALITY GATE SYSTEM (9 LAYERS)

Our codebase is protected by a state-of-the-art **9-Layer Quality Gateway** run locally and in GitHub Actions CI/CD via `scripts/_verify_prs.js`. This prevents any manual or automated code modifications from introducing bugs or breaking architectural rules:

| Layer | Audit Target | Verification Logic |
|-------|--------------|-------------------|
| **L1** | PR #120 Conformity | Verifies that no `driver.flow.compose.json` contains redundant `titleFormatted` cards or `[[device]]` template strings. |
| **L2** | PR #119 Class Mapping | Confirms that `wall_switch_1gang_1way` properly inherits from the robust `SwitchBase` class. |
| **L3** | PR #118 Manufacturer | Validates the registration of exact manufacturer target string `_TZ3000_ysdv91bk` in a driver. |
| **L4** | PR #116 Manufacturer | Validates the registration of exact manufacturer target string `_TZ3000_blhvsaqf` in a driver. |
| **L5** | PR #111 Wall Dimmer | Ensures the wall touch dimmer driver exists, compiles, and is registered within the index. |
| **L6** | Suffix Cleanup Rules | Detects and flags any folder or driver config suffixing with `_hybrid` or `_hybride` to avoid namespace pollution. |
| **L7** | Match Integrity | Scans for manual `.toLowerCase()` calls on manufacturer names and flags them, ensuring exclusive usage of the case-insensitive [CaseInsensitiveMatcher.js](lib/utils/CaseInsensitiveMatcher.js). |
| **L8** | Memory Leak Watchdog | Scans local WiFi driver classes to verify they correctly inherit from `TuyaLocalDevice` (gaining inherited `onUninit()` hooks) or implement explicit `onUninit()` resource cleanups. |
| **L9** | Direct TuyAPI Bypass | Verifies that no drivers bypass the local connection pool queue and direct require `tuyapi` directly, maintaining queueing integrity. |

---

## 21. LOCAL TUYA WIFI ARCHITECTURE

Local Tuya WiFi connectivity is designed with an **Enterprise-grade Connection and Execution Loop** to support robust operation on Homey Pro without cloud latency:

```
                  ┌───────────────────────────────┐
                  │       TuyaLocalDevice         │
                  │   - Capability Listeners      │
                  │   - onInit() / onUninit()     │
                  └───────────────────────────────┘
                                  │
                                  ▼
                  ┌───────────────────────────────┐
                  │       TuyaLocalClient         │
                  │   - TCP Socket Management     │
                  │   - Missed Heartbeat Watchdog │
                  │   - Protocol Auto-Rotation    │
                  └───────────────────────────────┘
                                  │
                     ┌────────────┴────────────┐
                     ▼                         ▼
         ┌───────────────────────┐ ┌───────────────────────┐
         │     Command Queue     │ │      Backoff Loop     │
         │ - 200ms Rate Limiting │ │ - Exp Reconnection    │
         │ - Micro-anti-flooding │ │ - Handshake Re-tries  │
         └───────────────────────┘ └───────────────────────┘
```

### Key Structural Pillars
1. **Delegated Connection Pool**: Individual device classes do not instantiate `tuyapi` directly. They instantiate `TuyaLocalClient` which unifies all connection handling, encryption, and socket states.
2. **200ms Queue Throttle**: Commands sent via `.setDP()` or `.setDPs()` are added to a rate-limited queue, ensuring a `200ms` window between frame writes. This keeps cheaper Tuya WiFi chips from dropping connections due to packet flooding.
3. **Adaptive Handshake Handler**: Autodetects device protocol version (`3.1`, `3.2`, `3.3`, `3.4`, or `3.5`) and rotates handshake formats dynamically if authentication failures are thrown.
4. **Lifecycle Resource Cleaning**: All classes enforce the SDK3 `onUninit()` lifecycle handler, executing `.destroy()` on clients to fully tear down sockets, intervals, and listeners, preventing severe runtime socket and memory exhaustion leaks.

---

## 22. CRASH RESOLUTIONS HISTORY

| Version | Crash | Root Cause | Fix |
|---------|-------|------------|-----|
| v7.5.21 | MODULE_NOT_FOUND fingerprints.json | data/fingerprints.json absent du bundle lors de cette release | Corrigé v7.5.26: paths require corrigés, .homeyignore vérifié |
| v7.5.26 | getTriggerCard deprecated warnings | 45 drivers utilisaient l'API dépréciée Homey SDK3 | Migré getDeviceTriggerCard sur master + stable-v5 |
| v7.5.36 | ReferenceError: setCapabilityValue is not defined | Missing 'this.' context in BaseUnifiedDevice.js & Hybrid syntax errors | Fixed 'this.' binding and made callbacks async in _setupUniversalHybridMode |
| v8.4.0 | triggerRecovery TypeError | Cached prototype mismatch in DataRecoveryManager | Bound forceRecovery directly to instance in constructor |
| v8.4.0 | Flow card ReferenceError | Missing RHS assignment inside air purifier drivers | Restored exact flow card card getter lookups |
| v8.4.0 | Syntax Unexpected identifier | Missing closing braces in air purifier driver getDeviceById | Restored closing braces to prevent breaking onInit |
| v8.4.0 | Manifest Energy conflicts | BOTH energy.approximation & measure_power declared | Removed approximation from 33 compose manifests |
| v8.4.0 | Workflow shell default errors | Missing defaults.run.shell: bash in GHA workflows | Injected bash default config across 16 workflows |
| v8.5.7 | OOM Heap Allocation failed at startup (Issue #338) | data/fingerprints.json (11.5MB/59K+ FPs) parsed via JSON.parse() at module init, consuming 50-80MB V8 heap, exceeding Homey Pro 64MB limit | Lazy-loading via _ensureLoaded() + un-ignored and fully reintegrated in .homeyignore (v8.5.8+), solved via direct Buffer parsing (double-heap fix) + defensive V8 GC calls |

### 22.1. Buffer-Based Direct JSON Parsing & Double-Heap Memory Optimization (v9.0.0+)
To completely resolve Out Of Memory (OOM) fatal crashes (`FATAL ERROR: Reached heap limit Allocation failed`) when parsing large JSON files like `data/fingerprints.json` (11.8MB) in Homey Pro (strict 64MB heap limit), the loader has been optimized to bypass standard string allocation:
1. **Raw Buffer Reading**: Instead of using `fs.readFileSync(fpath, 'utf8')` (which creates a massive UTF-16 JavaScript string in V8 memory consuming ~24MB of JS heap), the loader reads the database directly as a raw Node.js **Buffer** (`fs.readFileSync(fpath)`).
2. **Direct Buffer JSON Parsing**: Node.js allows passing a Buffer directly to `JSON.parse(buffer)`. By parsing the Buffer directly, V8's JS heap avoids allocating the massive UTF-16 intermediate string, cutting the transient memory footprint by **50%**!
3. **Defensive V8 Garbage Collection**: Active V8 garbage collection calls (`global.gc()`) are triggered before and after parsing (if exposed) to instantly flush transient memory fragments and keep the heap clean.
4. **Resilient Try-Catch Wrapper**: If parsing fails due to any RangeError or OOM, the parser intercepts the error gracefully and falls back to an empty object `{}` rather than crashing the Homey Pro box, ensuring absolute runtime reliability.

### 22.2. Dual-Layer Pairing & Runtime Refinement Design Principle
To support offline/local functionality while avoiding startup OOM, a two-layer design was implemented:
- **Static Matching Layer (Pairing Time)**: Device manufacturer names (mfs) and `modelId` / `deviceId` strings must be statically defined in the driver's `driver.compose.json` and the central `app.json` fingerprints. This allows the Homey Pro Z-Wave/Zigbee pairing wizard to match the device and successfully bind it locally.
- **Dynamic Refinement Layer (Runtime)**: Dynamic database files (like `fingerprints.json` and `driver-mapping-database.json`) must remain in the app bundle (fully unignored in `.homeyignore`) to refine the paired device's exact capability mappings and DP values dynamically at runtime.

### 22.3. Promise-Chaining Trigger Card Crash Prevention (v9.5.0+)
To prevent runtime type errors and crashes (e.g. `TypeError: card.trigger is not a function`) when triggering device-specific cards in multi-gang BSEED or standard switch drivers, the trigger handling pattern is strictly isolated:
- **Card Retrieval separation**: Card fetching via `getDeviceTriggerCard` is isolated from the trigger call.
- **Async Containment**: The trigger is invoked asynchronously with explicit `.catch()` containment to intercept any transient rejects.
- **AST / String checking**: Automated gates block legacy double-wrapped `.trigger().trigger()` patterns before commit integration.

### 22.4. ZCL-Only Duplicate Listener Blocker & Broadcast Filtering (v9.5.0+)
Multi-gang switches and scened panels under BSEED/Zemismart require strict listener isolation:
- **Early onNodeInit Returns**: The `device.js` must return immediately after `_initZclOnlyMode()` if `isZclOnlyDevice` is matched, preventing standard capability listeners and mixin events from duplicate binding.
- **Sliding command window**: A 2000ms window filters internal hardware broadcasts and echoes by matching commanded endpoints against `this._lastCommandedGang`.


### Issues Résolues Récemment
| # | Titre | Status |
|---|-------|--------|
| #318 | PJ-1203A wrong driver mapping | ✅ Fixed v7.5.26 (power_clamp_meter) |
| #319 | Smart Knob TZ3000_402vrq2i | ✅ Déjà supporté, fermé |
| #317 | OAuth pairing white screen | ✅ Fermé (architectural constraint) |
| #316 | Fingerbot missing listeners | ✅ Fixed v7.5.26 require paths |
| #314 | Smart Button _TZ3000_b4awzgct | ✅ Déjà supporté, fermé |
| #312 | INSOMA _TZE284_fhvpaltk | ✅ Déjà supporté, fermé |
| #276 | Smart Solar Soil Sensor | ✅ Déjà supporté, fermé |
| #162 | Fingerbot capability listeners | ✅ Fixed v7.5.26 |
| #305 | Gate Opener DP3 contact | ✅ Fixed v7.5.25 |

---


## Fleetwood Gateway & Syntax Purity Mandates (v8.4.0+)
- **ZCL Method Override Purity**: Any driver class override of ZCL/SDK methods (e.g., `getDeviceById(id)`) MUST have correct closing braces to prevent breaking following method declarations like `onInit()` or `onNodeInit()`.
- **Standard ZCL Measurement Scoping**: Inside ZCL Measurement cluster listeners (`attr.rmsCurrent`, etc.), never re-declare block-scoped variables (`const scaled`) in the same scope block; use unique variables (`scaledCurrent` and `scaledPower`) to prevent standard JS scope crash exceptions.
- **Mains/Battery Approximation Conflicts**: If a compose manifest (`driver.compose.json`) defines `measure_power` or `meter_power`, it MUST NOT define `energy.approximation` under `energy` to prevent severe Homey Pro Energy v3 schema validation errors.
- **Mandatory GitHub Actions Shell Default Configuration**: Every CI workflow `.yml` file that runs commands MUST include top-level `defaults: run: shell: bash` to prevent PowerShell syntax failures on Windows runners.
- **GHA Cloud Purity Validation Gate**: Every primary workflow CI check (`unified-ci.yml`, `syntax-validation.yml`, `syntax-purity-gate.yml`, `syntax-check.yml`, `validate.yml`) has been hardened to execute the strict `PRE_COMMIT_CHECKS.js` gateway. This ensures 100% JS syntax parsing, workflow default checking, and manifest schema validation before commit integration.

## 23. AI NAVIGATION & CARTOGRAPHY MAP

> **🚨 CRITICAL NOTICE FOR ALL AI AGENTS (Claude, Gemini, Windsurf, Cursor, etc.)**
> *Before taking any action on this repository, you MUST read this section. It contains the operational blueprint of the Tuya Unified Engine.*

### 1. Dotfiles & Rules Context (Where to find AI Instructions)
The project behavior is governed by multiple rule files and dotfiles. If you need to understand project rules, coding standards, or ignored files, look here:
- **`.windsurfrules` / `.cursorrules` / `.clinerules` / `.clinerule` / `.cascade`**: Core behavioral prompts, Anti-Generic Strategy rules, and strict instructions for all agents. *Read these to avoid breaking the 9-Layer Quality Gate.*
- **`.github/WORKFLOW_GUIDELINES.md`**: Strict instructions on how to handle YML files and GitHub Actions limits.
- **`.homeyignore`**: Controls what goes into the Homey bundle. *WARNING: Do not ignore `data/fingerprints.json` or you will cause a `MODULE_NOT_FOUND` runtime crash!*
- **`.gitignore`**: Standard Git ignores.
- **`.archive/root-cleanup-2026-05-28/.context_checkpoint.md`**: Short-term AI agent memory storage.

### 1.5. Global Investigation Plan (MANDATORY READ)

> **🌐 COMPLETE INVESTIGATION METHODOLOGY** — For deep diagnostic and cross-referencing when investigating bugs, missing fingerprints, or device issues, you MUST consult:
> - **[GLOBAL_INVESTIGATION_PLAN.md](docs/GLOBAL_INVESTIGATION_PLAN.md)` — The authoritative AI investigation framework
>   - Phase-by-phase investigation flow (Context → Cross-Reference → Variant → Implementation → Documentation → Quality Gate)
>   - Source matrix (forums, GitHub, emails, Z2M/ZHA, Blakadder)
>   - Investigation scripts catalog (internet-research-tool.js, github-scanner.js, fetch-gmail-diagnostics.js)
>   - Cross-reference patterns (manufacturerName × productId matrix)
>   - Shadow Mode Protocol rules
>   - Quality Gate compliance checklist

*This document is the master reference for all AI agents performing device investigation, bug hunting, and diagnostic analysis.*

### 2. Architecture & Cartography (Where to find Deep Knowledge)
If you need to understand *how* the engine works before modifying it, read these mapping files:
- **`PROJECT_INDEX.md`**: (This file) The master entry point.
- **`.ai/IR_UI_UX_PAIRING.md`**: Documentation for implementing HTML/JS pairing wizards for Universal Remotes (Xiaomi Mi Remote / SmartIR emulation).
- **`.ai/SYSTEM_CHANGELOG.md`**: A living record of deep engine hardening (e.g. ButtonRemoteManager multi-endpoint logic, Universal Protocol base64 translations).
- **`docs/ARCHITECTURE.md`**: In-depth explanation of the Zigbee SDK3 implementation and Tuya protocol structures.
- **`.archive/root-cleanup-2026-05-28/MEGA_PROMPT_UNIVERSAL_TUYA_ZIGBEE.md`**: The supreme "Opus 4.6" directive for driver enrichment and zero-defect coding.
- **`.archive/root-cleanup-2026-05-28/MASTER-V7-SKELETON.md` / `.archive/root-cleanup-2026-05-28/STABLE-V5-SKELETON.md`**: Architectural skeleton maps outlining structural differences between major versions.
- **`docs/PROJECT_STATUS.md`**: Real-time tracker for the number of drivers, devices, and current build.
- **`.ai/SKILL_REGISTRY.md`**: **MASTER CATALOG** of all Antigravity Advanced Agentic Skills available in the project.

### 3. Antigravity AI Skills Mastery (The Boost Engine)
This repository is optimized for autonomous agents using the **Antigravity Awesome Skills** fleet.
> **🔗 See the full catalog in: [.ai/SKILL_REGISTRY.md](file:///.ai/SKILL_REGISTRY.md)**

Key skills frequently used in this engine:
- **`@logic-lens`**: Used for deep review of `HybridDriverSystem` to prevent race conditions.
- **`@performance-optimizer`**: Drives the `ENERGY_STRATEGIES` logic.
- **`@codebase-audit-pre-push`**: Strips junk and ensures production readiness.
- **`@squirrel`**: Primary full-cycle AI agent pattern for new drivers.
- **`@technical-change-tracker`**: Powering the `SYSTEM_CHANGELOG.md` for session handoffs.
- **`@bug-hunter`**: Methodical root-cause analysis for Zosung IR trame corruption.


### 3. Dual App & Dual Branch Architecture
The repository deploys **two separate applications** to the Homey store. You must understand the split:
1. **App 1: "Tuya Unified Zigbee"** (Test/Production channel)
   - **Branch**: `master`
   - **App ID**: `com.dlnraja.tuya.zigbee`
   - **CI/CD Auto-Publish**: `auto-publish-on-push.yml` (on push to master) and `daily-promote-to-test.yml`
2. **App 2: "Tuya Unified Zigbee (Stable)"** (Parallel stable fallback)
   - **Branch**: `stable-v5`
   - **App ID**: `com.dlnraja.tuya.zigbee.stable`
   - **CI/CD Auto-Publish**: `publish-stable.yml` (on push to stable-v5)

*Rule: If a fix is made on `master`, it MUST often be ported to `stable-v5` (via `git cherry-pick` or manual patch) and pushed to both branches to ensure both apps are synced.*

### 4. Data Collection & Orchestration Scripts (How to fetch updates)
This repository contains a massive suite of Node.js scripts to pull external data. If you are asked to "fetch latest issues", "check emails", or "sync the forum", **DO NOT WRITE NEW SCRIPTS**. Execute the existing ones:

| Action Required | Execute this script | Purpose |
|-----------------|---------------------|---------|
| **Fetch Diagnostic Emails** | `node .github/scripts/fetch-gmail-diagnostics.js` | Connects to Gmail via IMAP, pulls crash reports and diagnostic IDs (`54888ee1...`), and generates a local report. |
| **Scan Forum Topics** | `node .github/scripts/scan-forum.js` (or `forum-activity-scraper.js`) | Scrapes the Homey Community Forum (T140352) for new user requests and bugs. |
| **Fetch GitHub PRs/Issues** | `node .github/scripts/github-scanner.js` (or `comprehensive-github-scan.js`) | Scans all open/closed issues and PRs across the current repository and upstream forks. |
| **Auto-Heal / Triage Bugs** | `node .github/scripts/diagnostic-auto-resolver.js` | Uses AI to automatically map crash logs to codebase fixes. |
| **Auto-Learn Fingerprints** | `node .github/scripts/auto-learn-fingerprints.js` | Parses forum/email dumps to map new `_TZE200...` fingerprints into the `data/` registry. |
| **Sync with Upstream (Johan)** | `node .github/scripts/sync-johan-sdk3.js` | Pulls SDK3 fixes from upstream forks without destroying local Tuya structures. |

### 5. Automated CI/CD Workflows (`.github/workflows/`)
To trigger operations without running local scripts, you can use the `gh` CLI to trigger workflows:
- `gh workflow run daily-promote-to-test.yml` -> Forces Draft to Test promotion (using Puppeteer/OAuth).
- `gh workflow run collect-diagnostics.yml` -> Runs email extraction via GitHub Actions.
- `gh workflow run validate.yml` -> Comprehensive project validation (npx homey app validate).

**Last Updated**: 2026-05-26 | **Version**: 9.0.0+
**Generated by**: Antigravity AI | **Author**: dlnraja

---

## 25. DEEP DIAGNOSTIC & CROSS-REFERENCING MANDATE (AI AGENTS)

When a user reports "it doesn't work well" or an "unknown device" issue, **DO NOT** immediately assume it's just a missing fingerprint. You must perform a **Deep Diagnostic Investigation** using cross-referencing:

1. **Analyze Multiple Sources**: Use the repository's JS scraper scripts to fetch and analyze Homey emails, community forum discussions, diagnostic logs, PRs, and issues.
2. **Cross-Reference Domotic Projects**: Check Z2M (Zigbee2MQTT), ZHA, and Domoticz registries for the exact same `manufacturerName` to understand its real DP mappings or cluster behavior.
3. **Manufacturer Identity Variants**: Remember that a single `manufacturerName` (e.g., `_TZ3000_...`) can be used across *multiple* device IDs and hardware variants. Do not blindly map it without checking the `productId` and capability set.
4. **Architecture Context**: Always read documents relating to **Architecture 7+ and 8.0** for clues on SDK3 compliance, TuyaEF00Manager handling, and new cluster rules.
5. **Update Resources**: Enrich documentation, workflows, and GitHub actions with your findings. Do not just patch the code; update the knowledge base.
6. **Agentic Skills & Local Code**: Leverage the local AI tools! Be fully aware of the `Antigravity skills` (located in `.agents/skills/`) and the local `Claude Code` implementations within the project. These serve as major sources of inspiration and diagnostic power.
7. **Dotfile Reading Mandate**: Always read configuration files starting with a dot (e.g., `.windsurfrules`, `.clinerules`, `.github/workflows/*`) to understand the strict project boundaries before applying any cross-referenced fix.
8. **MANDATORY Investigation Plan**: Before any bug investigation or deep diagnostic, you MUST read [GLOBAL_INVESTIGATION_PLAN.md](docs/GLOBAL_INVESTIGATION_PLAN.md) — the complete 22-section methodology for cross-referencing manufacturers, DP mappings, forums, emails, Z2M/ZHA, GitHub PRs/Issues, and Antigravity skills integration.

---

## 26. AUTONOMOUS AGENT REFLECTION & LOGIC MODE

Inspired by advanced agentic loops (like those in Claude Code and Antigravity frameworks), all AI interactions within this project must strictly adhere to the following reflection protocols:

- **Thinking Blocks**: Before taking action, use a structured thinking process to reflect on the codebase state, the dual-app architecture, and potential side-effects.
- **Incremental Verification**: Do not attempt to fix 10 things at once. Plan, execute one logical block, test/verify (e.g., via `npm run test` or validator scripts), and reflect on the outcome before proceeding.
- **Tool-Driven Loop**: Leverage tools intelligently (read files to confirm context, search codebase for dependencies, run validation scripts) before making blind code edits.
- **Context Mastery**: Assimilate the dual-app context and project architecture fully into your reasoning model before proposing solutions.

By embedding this logic into IDE rules, workflows, and algorithms, the project ensures zero-regression and highly autonomous, reliable self-healing capabilities.

---

## 27. DYNAMIC HEURISTICS & ADAPTIVE CAPABILITIES

As part of the v5.12.0 core update, the app introduces **Dynamic Heuristics** directly inspired by advanced Z2M converters, Athom B.V. official SDK3 guidelines, and Johan Bendz's foundational Tuya implementations.

### 1. CapabilityFallbackManager (Sanitization Engine)
- intercepts ZCL calls before they reach the `Homey SDK`.
- Hardcodes a rigid 0-100% boundary for `measure_battery` and drops `9999` temperature anomalies to prevent mobile app crashes.

### 2. UniversalVariantManager (Smart DP Injection)
- Identifies devices contextually (Switch vs Sensor vs Plug).
- Automatically translates DP `101`, `102` into multi-gang sub-endpoints (`onoff.2`, `onoff.3`).
- Injects standard alarm capabilities dynamically based on driver context (e.g. `alarm_motion` vs `alarm_contact` for DP 1).

### 3. DynamicCapabilityManager (Phantom Pruning)
- Automatically audits capabilities `5 minutes` after device initialization.
- If a capability exists on the driver but the physical ZCL cluster is missing (e.g., `measure_power` without `0b04`), the capability is autonomously stripped away from the UI.
- Skips pruning for `Pure Tuya DP` virtual endpoints.

### 4. Smart DP Adaptation (TuyaDPParser)
- Intercepts Tuya hardware quirks at the lowest data-layer.
- Auto-corrects `1000` battery levels to `100%`.
- Re-aligns unsigned negative temperature wrapping (`> 65536`) back to proper negative Integers.
- Prevents cascade failures across higher managers.

### 5. UnifiedBatteryHandler (Non-Linear Profiling)
- Avoids linear `(voltage - min) / span` formulas.
- Employs 15+ non-linear discharge curves (`CR2032`, `CR2450`, `AAA`, `Li-Ion`).
- Adapts runtime polling actively instead of waiting passively for Tuya battery payloads.

---

## 28. DUAL-LAYER PAIRING ARCHITECTURE & AGGREGATE ERROR PREVENTION (v8.5.34+)

> **🚨 CRITICAL — ALL AI AGENTS MUST READ THIS BEFORE TOUCHING driver.compose.json**

### Root Cause of AggregateError (v8.1.6 → v8.5.33 — 58 failed builds)

From v8.1.6, 182 synthetic hybrid drivers were created with `manufacturerName: []` empty.
Homey Pro reads `app.json` **locally and statically** to match a device during pairing.
An empty `manufacturerName` array means **zero matches** → Homey throws `AggregateError`.

### The Two-Layer Architecture (MANDATORY)

```
LAYER 1 — STATIC (Pairing Time) — MANDATORY
  driver.compose.json → zigbee.manufacturerName[]
  Copied into app.json at build time
  Homey Pro reads this OFFLINE/LOCALLY during pairing
  ❌ EMPTY = AggregateError = device cannot pair

LAYER 2 — DYNAMIC (Runtime) — OPTIONAL (enrichment only)
  data/fingerprints.json (11.8 Mo, 126k entries)
  Loaded lazily via Buffer (anti-OOM)
  Used to refine capabilities/DPs AFTER successful pairing
  ✅ Can be empty/absent — pairing still works
```

### Rules (PERMANENT CONSTRAINTS)

1. **NEVER** create a Zigbee driver with `manufacturerName: []`
2. **NEVER** remove MFs from `driver.compose.json` without explicitly moving them
3. **Hybrid drivers** (e.g. `air_purifier_climate`) MUST inherit MFs from their parent driver
4. **Wildcards** (`_TZE200_*`) are **STRICTLY FORBIDDEN** in `manufacturerName`
5. **All comparisons** must use `CaseInsensitiveMatcher.js` — no manual `.toLowerCase()`
6. **After any fingerprint operation**, run `node scripts/validation/check-fingerprint-health.js`

### Maintenance Scripts (v8.5.34)

| Script | Purpose | When to Run |
|--------|---------|-------------|
| `scripts/validation/check-fingerprint-health.js` | CI gate: detects empty MFs and wildcards | Before every commit |
| `scripts/deep-compare-stable-vs-master.js` | Finds MFs present in stable-v5 but missing in master | Monthly |
| `scripts/inject-stable-fps-to-master.js` | Injects missing MFs from stable-v5 → master | After deep-compare |
| `scripts/restore-master-only-hybrid-mfs.js` | Copies MFs from parent driver to hybrid variants | After collision fixes |
| `scripts/fix-fingerprint-collisions.js` | Resolves true MF+PID collisions | Before publish |
| `scripts/analyze-fingerprints-db.js` | Analyzes data/fingerprints.json health | Debugging |
| `scripts/sync-fingerprints-to-compose.js` | Syncs data/ DB fingerprints → driver.compose.json | After DB update |

### Validation Pipeline

```bash
# Pre-commit (mandatory)
node scripts/validation/check-fingerprint-health.js    # Must PASS
npx homey app validate --level publish                 # Must PASS

# Monthly maintenance
node scripts/deep-compare-stable-vs-master.js
node scripts/inject-stable-fps-to-master.js
node scripts/restore-master-only-hybrid-mfs.js
node scripts/validation/check-fingerprint-health.js   # Verify
```

### Fingerprint Statistics (v9.0.36)

| Metric | Value |
|--------|-------|
| Total drivers | 412 (361 Zigbee + 51 WiFi) |
| Total fingerprint entries | 4,304 |
| Unique manufacturerNames | 4,035 |
| Unique productIds | 566 |
| Drivers with MF = 0 | **0** (was: 99) |
| Wildcards | **0** |
| Validation level | **publish** |
| Pre-commit checks | PASSED |
| Driver health average | 81/100 |

---

## 29. SESSION CHANGELOG v9.0.37 (June 2026)

### New Advanced Feature Modules

| Module | File | Purpose |
|--------|------|---------|
| **Virtual Presence Detection** | `lib/presence/PresenceConfidenceScorer.js` | Multi-factor Bayesian presence scoring with temporal decay |
| **Battery Health Intelligence** | `lib/battery/BatteryHealthMonitor.js` | Long-term battery degradation tracking, RUL estimation, predictive replacement alerts |
| **Device Group Management** | `lib/groups/DeviceGroupManager.js` | Coordinate actions across device groups, synchronized execution, scene persistence |
| **Advanced Multi-Condition Flows** | `lib/features/AdvancedMultiConditionFlows.js` | Complex conditional logic: AND/OR/NOT, time constraints, value ranges, cooldowns |
| **Diagnostic Report Export** | `lib/features/DiagnosticReportExport.js` | Generate shareable JSON/PDF reports for GitHub issues, network topology, battery history |
| **Network Topology Trigger** | `lib/features/NetworkTopologyTrigger.js` | Flow triggers based on mesh health: router availability, link quality, heal recommendations |
| **Configuration Backup/Restore** | `lib/features/ConfigurationBackupRestore.js` | Export/import device settings, DP mappings, and capability configurations |
| **State History Trigger** | `lib/features/StateHistoryTrigger.js` | Trigger flows based on historical state patterns and anomalies |
| **Capability Export/Import** | `lib/features/CapabilityExportImport.js` | Transfer capability configurations between devices of the same class |
| **Device Migration Wizard** | `lib/features/DeviceMigrationWizard.js` | Guided migration when replacing devices, preserving flows and automations |
| **Custom Capability Templates** | `lib/features/CustomCapabilityTemplates.js` | Pre-built capability sets for common device combinations |
| **Tuya Cloud Scene Sync** | `lib/features/TuyaCloudSceneSync.js` | Bidirectional sync with Tuya cloud scenes (when cloud access is available) |
| **Device Group Scene Manager** | `lib/features/DeviceGroupSceneManager.js` | Advanced scene management with group-aware transitions |

### New Infrastructure Modules

| Module | File | Purpose |
|--------|------|---------|
| **Auto-Detection Pairing Wizard** | `lib/pairing/AutoDetectionPairingWizard.js` | Enhanced pairing flow with automatic device type detection |
| **Pre-Pairing Compatibility Check** | `lib/ux/PrePairingCompatibilityCheck.js` | Validate device compatibility before pairing attempt |
| **Real-Time Communication Monitor** | `lib/ux/RealTimeCommunicationMonitor.js` | Live Zigbee traffic visualization and debugging |
| **Settings UI Tooltips** | `lib/ux/SettingsUITooltips.js` | Contextual help for device settings in Homey app |
| **Visual Battery Health Indicator** | `lib/ux/VisualBatteryHealthIndicator.js` | Battery status visualization with degradation warnings |
| **Centralized DP Registry** | `lib/registry/CentralizedDPRegistry.js` | Unified DP definition database with versioning |
| **Config Schema Validator** | `lib/validation/ConfigSchemaValidator.js` | JSON Schema validation for all configuration files |
| **User-Friendly Errors** | `lib/errors/UserFriendlyErrors.js` | Human-readable error messages with troubleshooting hints |
| **Test Framework** | `lib/testing/TestFramework.js` | Device simulation and integration testing framework |

### New Performance Optimizations

| Module | File | Purpose |
|--------|------|---------|
| **Startup Time Profiler** | `lib/performance/StartupTimeProfiler.js` | Measure and optimize app startup time |
| **Memory Leak Detector** | `lib/performance/MemoryLeakDetector.js` | Runtime memory leak detection and reporting |
| **Fragment Buffer Memory Limiter** | `lib/performance/FragmentBufferMemoryLimiter.js` | Prevent memory exhaustion from fragmented packets |
| **Smart Cluster Engine Throttling** | `lib/performance/SmartClusterEngineThrottling.js` | Intelligent rate limiting for cluster operations |
| **Auto-Discovery Polling Optimizer** | `lib/performance/AutoDiscoveryPollingOptimizer.js` | Optimize polling intervals for device discovery |
| **Tuya DP Compression** | `lib/performance/TuyaDPCompression.js` | Compress DP payloads for reduced memory usage |
| **Diagnostic Logger Rotation** | `lib/performance/DiagnosticLoggerRotation.js` | Prevent log file bloat with automatic rotation |

### New Security Enhancements

| Module | File | Purpose |
|--------|------|---------|
| **Command Rate Limiter** | `lib/security/CommandRateLimiter.js` | Prevent command flooding attacks |
| **DP Value Input Validator** | `lib/security/DPValueInputValidator.js` | Sanitize DP values before device transmission |
| **Local Key Validator** | `lib/security/LocalKeyValidator.js` | Validate encryption keys for WiFi devices |
| **UDP Discovery Key Rotation** | `lib/security/UDPDiscoveryKeyRotation.js` | Rotate keys for UDP discovery protocol |

### New Protocol Enhancements

| Module | File | Purpose |
|--------|------|---------|
| **Binding Persistence** | `lib/protocol/BindingPersistence.js` | Persist ZCL bindings across device restarts |
| **Bitmap Multi-Field Parser** | `lib/protocol/BitmapMultiFieldParser.js` | Parse complex bitmap fields in ZCL attributes |
| **DP Fragmentation Hardening** | `lib/protocol/DPFragmentationHardening.js` | Handle fragmented DP payloads robustly |
| **Occupancy Sensing Enhancement** | `lib/protocol/OccupancySensingEnhancement.js` | Advanced occupancy detection with PIR + radar fusion |
| **Schedule Data Encoder** | `lib/protocol/ScheduleDataEncoder.js` | Encode/decode complex thermostat schedules |

### Updated Statistics

| Metric | v9.0.36 | v9.0.37 | Change |
|--------|---------|---------|--------|
| Total drivers | 412 | 412 | 0 |
| Fingerprints | 4,304 | 4,304 | 0 |
| Flow cards | 4,138 | 4,138 | 0 |
| Capabilities | 156 | 156 | 0 |
| Library modules | 218 | 267 | +49 |
| Automation scripts | 126 | 134 | +8 |
| **New features** | 0 | 13 | **+13** |

---

### New Files Created (v9.0.22)

| File | Purpose | Commit |
|------|---------|--------|
| `.github/scripts/athom-build-error-diag.js` | Puppeteer-based Athom build error diagnostic — navigates to failing builds, clicks SUBMISSION, extracts real error messages, screenshots, and structured JSON report | `c43fa30d8` |
| `.github/scripts/athom-session-inject.js` | Injects Athom CLI OAuth session from `%APPDATA%/athom-cli/settings.json` into Puppeteer — enables authenticated scraping without email/password | `c43fa30d8` |
| `.github/scripts/ultra-compact-app-json.js` | Strips app.json to Athom-required minimum (removes connectivity, settings, platforms, pair, null/empty fields) — target <2MB for <20MB compressed archive | `c43fa30d8` |

### Fixes Applied

| Fix | Details | Driver(s) | Commit |
|-----|---------|-----------|--------|
| HOBEIAN water leak sensor | Added `HOBEIAN` to `manufacturerName` for ZG-222Z (Peter #2090) | `water_leak_sensor` | `5815bec65` |
| SOS button fingerprint routing | Moved `_TZ3000_0dumfk2z` from `dimmer_wall_1gang` to `button_emergency_sos` | `button_emergency_sos`, `dimmer_wall_1gang` | `7c4d68e75` |
| LCD sensor collision | Removed `_TZE200/_TZE284_vvmbj46n` from `climate_sensor_plug` to prevent thermostat vs LCD routing error | `climate_sensor_plug` | `7c4d68e75` |
| Multisensor routing | Added `_TZE200_3towulqd` to `motion_sensor_2` (was only in `sensor_gas_presence`) | `motion_sensor_2`, `sensor_gas_presence` | `7c4d68e75` |
| Forum fingerprint routing | Fixed 5 device fingerprint routing issues from 93 interview files | `switch_1gang`, `power_meter`, `button_wireless_4`, `plug_energy_monitor`, `garage_door_opener` | `3c6e1d1e7` |
| App.json compaction | Reduced app.json from 3.58MB to <2MB (Athom processing_failed fix) | root `app.json` | `c43fa30d8` |

### Security Improvements

| Check | Result | Commit |
|-------|--------|--------|
| CLAUDE-FABLE-5 prompt audit | No malicious content found (safe system prompt) | `7c4d68e75` |
| GitHub AI skills audit | No relevant skills for this project | `7c4d68e75` |
| MiMo-Skills audit | Not relevant (TTS tool, not IoT) | `7c4d68e75` |
| Local skills audit | Safe (2 JS scripts with hardcoded local paths) | `7c4d68e75` |
| Console.log cleanup | Removed `console.log` violations from 13 drivers | `3c6e1d1e7` |
| CI script hardening | Fixed zero-defect-control.js shebang, added --json support to validate-all-yaml.js, find-bloat.js, check-flow-ids.js | `3c6e1d1e7` |

### Documentation Updates

| File | Change | Commit |
|------|--------|--------|
| `README.md` | Updated to reflect 412 drivers, 2520 FPs | `b7f763332`, `c43fa30d8` |
| `docs/CONTRIBUTING.md` | Deduplicated content, added CI validation references | `3c6e1d1e7` |
| `docs/PROJECT_STATUS.md` | Updated statistics to 412 drivers, 2520 FPs | `b7f763332` |
| `.homeychangelog.json` | Added v9.0.22 release entry | `c43fa30d8` |
| `.github/workflows/auto-publish-on-push.yml` | Added permissions block | `3c6e1d1e7` |
| `.github/workflows/syntax-purity-gate.yml` | Added permissions block | `3c6e1d1e7` |
| `.github/workflows/syntax-validation.yml` | Added permissions block | `3c6e1d1e7` |
| `.github/workflows/test-api-keys.yml` | Added permissions block | `3c6e1d1e7` |
| `.github/workflows/weekly-fingerprint-sync.yml` | Added permissions block | `3c6e1d1e7` |

### CI/YAML Workflows Updated

| Workflow | Change |
|----------|--------|
| `auto-publish-on-push.yml` | Added `permissions:` block, SHA version comments |
| `syntax-purity-gate.yml` | Added `permissions:` block |
| `syntax-validation.yml` | Added `permissions:` block |
| `test-api-keys.yml` | Added `permissions:` block |
| `weekly-fingerprint-sync.yml` | Added `permissions:` block |

---

## 30. PRE-COMMIT AUTOMATION & VALIDATION GATES

> **Upgraded in v9.0.22** -- The pre-commit hook at `.githooks/pre-commit` now runs 8 validation layers.

### Pre-Commit Hook Layers (`.githooks/pre-commit`)

| # | Check | What it does | Failure action |
|---|-------|--------------|----------------|
| 1 | **Mandatory file check** | Runs `homey-mandatory-check.js` for complete file integrity | `npm run check:fix` |
| 2 | **JSON syntax** | Validates all staged `.json` files parse correctly | Fix JSON syntax |
| 3 | **Version consistency** | Auto-syncs `package.json` version with `app.json` | Auto-fixed |
| 4 | **Homeyignore safety** | Blocks `*.json` wildcard, `README.txt` exclusion, `data/fingerprints.json` exclusion | Edit `.homeyignore` |
| 5 | **Empty manufacturerName** | Scans staged `driver.compose.json` for `manufacturerName: []` -- prevents AggregateError | Add fingerprints or remove driver |
| 6 | **Missing driver assets** | Checks that `driver.js`, `device.js`, and `driver.compose.json` all exist in staged driver directories | Create missing files |
| 7 | **Console.log in drivers** | Flags `console.log` / `console.warn` / `console.error` in `drivers/**/*.js` | Remove or use Homey logger |
| 8 | **Security scan** | Runs `security-scanner.js` for secrets, eval(), hardcoded tokens in staged `.js` files | Remove secrets |

### Install / Uninstall

```bash
# Install (one-time or after pull)
npm run hooks:install
# Or manually:
git config core.hooksPath .githooks

# Uninstall
npm run hooks:uninstall
```

### CI Pipeline Integration

```bash
# Pre-commit (local, automatic via hook)
node scripts/PRE_COMMIT_CHECKS.js       # JS syntax + workflow + SDK compliance
node scripts/ci/security-scanner.js     # Secrets, eval, hardcoded tokens
node .githooks/pre-commit               # Full 8-layer gate

# CI/CD (GitHub Actions)
npx homey app validate --level publish  # Athom SDK validation
node scripts/ci/validate-all-yaml.js    # YAML syntax + permissions blocks
node scripts/ci/check-flow-ids.js       # Flow card ID uniqueness
node scripts/ci/find-bloat.js           # Bundle size analysis
```

---

**Last Updated**: 2026-06-15 | **Version**: 9.0.38
**Generated by**: Antigravity AI | **Author**: dlnraja
**END OF PROJECT_INDEX.md**
