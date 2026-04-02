# Universal Tuya Zigbee - Architecture Reference

> **App**: `com.dlnraja.tuya.zigbee` | **SDK**: Homey SDK3 | **Entry**: `app.js`
> **191+ drivers** | **4385+ fingerprints** | Zigbee + WiFi
> **191+ drivers** | **4385+ fingerprints** | Zigbee + WiFi
> **191+ drivers** | **4385+ fingerprints** | Zigbee + WiFi
> **191+ drivers** | **4385+ fingerprints** | Zigbee + WiFi
> **191+ drivers** | **4385+ fingerprints** | Zigbee + WiFi
> **191+ drivers** | **4385+ fingerprints** | Zigbee + WiFi
> **191+ drivers** | **4385+ fingerprints** | Zigbee + WiFi
> **191+ drivers** | **4385+ fingerprints** | Zigbee + WiFi
> **191+ drivers** | **4385+ fingerprints** | Zigbee + WiFi
> **191+ drivers** | **4385+ fingerprints** | Zigbee + WiFi
> **191+ drivers** | **4385+ fingerprints** | Zigbee + WiFi
> **191+ drivers** | **4385+ fingerprints** | Zigbee + WiFi
> **191+ drivers** | **4385+ fingerprints** | Zigbee + WiFi
> **191+ drivers** | **4385+ fingerprints** | Zigbee + WiFi
> **191+ drivers** | **4385+ fingerprints** | Zigbee + WiFi
> **191+ drivers** | **4385+ fingerprints** | Zigbee + WiFi
> **191+ drivers** | **4385+ fingerprints** | Zigbee + WiFi
> **191+ drivers** | **4385+ fingerprints** | Zigbee + WiFi
> **191+ drivers** | **4385+ fingerprints** | Zigbee + WiFi
> **191+ drivers** | **4385+ fingerprints** | Zigbee + WiFi
> **191+ drivers** | **4385+ fingerprints** | Zigbee + WiFi
> **191+ drivers** | **4385+ fingerprints** | Zigbee + WiFi
> **191+ drivers** | **4385+ fingerprints** | Zigbee + WiFi
> **191+ drivers** | **4385+ fingerprints** | Zigbee + WiFi

---

## 1. App Entry Point (app.js)

`UniversalTuyaZigbeeApp extends Homey.App` initializes in order:

1. **registerCustomClusters** - Tuya 0xEF00, 0xE000/E001, Zosung IR clusters
2. **FlowCardManager** - Global action/condition/trigger cards
3. **UniversalFlowCardLoader** - Sub-capability + generic DP flow cards
4. **AdvancedAnalytics** - Device usage analytics
5. **SmartDeviceDiscovery** - Auto-detect new devices
6. **PerformanceOptimizer** - Cache + throttle (10MB limit)
7. **UnknownDeviceHandler** - Fallback for unrecognized devices
8. **DiagnosticAPI** - MCP/AI integration endpoint
9. **LogBuffer** - Structured log capture (ManagerSettings accessible)
10. **SuggestionEngine** - Non-destructive Smart-Adapt
11. **OTAUpdateManager** - Firmware OTA updates
12. **QuirksDatabase** - Per-device behavioral quirks
13. **TuyaUDPDiscovery** - WiFi local device discovery

Settings: `developerDebugMode` (verbose logs), `experimentalSmartAdapt` (capability modifications opt-in).

---

## 2. Driver Architecture

Each driver lives in `drivers/{type}/` with:

| File | Purpose |
|------|---------|
| `driver.compose.json` | Capabilities, fingerprints (manufacturerName + productId), images, energy |
| `driver.js` | Driver class - flow card registration, pairing logic |
| `device.js` | Device class - DP handling, capability listeners, init |
| `driver.flow.compose.json` | Trigger/condition/action flow cards for this driver |
| `assets/images/` | small.png (75x75) + large.png (500x500) |

### Driver Categories (130+)

| Category | Drivers | Base Class |
|----------|---------|------------|
| **Switches** | switch_1gang..8gang, wall_switch_*, module_mini_switch | HybridSwitchBase |
| **Dimmers** | dimmer_*, bulb_dimmable, wall_dimmer_* | HybridSwitchBase / HybridLightBase |
| **Lights** | bulb_rgb, bulb_rgbw, bulb_tunable_white, led_strip* | HybridLightBase |
| **Covers** | curtain_motor, curtain_motor_tilt, shutter_roller_controller | HybridCoverBase |
| **Sensors** | motion_sensor, contact_sensor, climate_sensor, soil_sensor, presence_sensor_* | HybridSensorBase |
| **Plugs/Energy** | plug_smart, plug_energy_monitor, din_rail_*, power_meter | HybridPlugBase |
| **Climate** | thermostat_*, radiator_valve, smart_heater* | HybridThermostatBase |
| **Security** | lock_smart, siren, smoke_detector*, gas_sensor | HybridSensorBase |
| **Buttons** | button_wireless_*, scene_switch_* | ButtonDevice |
| **IR** | ir_blaster, wifi_ir_remote | TuyaZigbeeDevice |
| **WiFi** | wifi_plug, wifi_switch*, wifi_light, wifi_thermostat... | TuyaHybridDevice |
| **Special** | fingerbot, pet_feeder, garage_door, valve_*, pool_pump | Various |

---

## 3. Device Class Hierarchy

`
Homey.Device (SDK3)
  └── ZigBeeDevice (homey-zigbeedriver)
        └── TuyaZigbeeDevice (lib/tuya/TuyaZigbeeDevice.js)
              └── TuyaHybridDevice (lib/devices/TuyaHybridDevice.js)
                    └── BaseHybridDevice (lib/devices/BaseHybridDevice.js) [182KB - master base]
                          ├── HybridSwitchBase (lib/devices/HybridSwitchBase.js)
                          │     └── + PhysicalButtonMixin + VirtualButtonMixin
                          ├── HybridSensorBase (lib/devices/HybridSensorBase.js) [207KB - largest]
                          ├── HybridCoverBase (lib/devices/HybridCoverBase.js)
                          ├── HybridLightBase (lib/devices/HybridLightBase.js)
                          ├── HybridPlugBase (lib/devices/HybridPlugBase.js)
                          ├── HybridThermostatBase (lib/devices/HybridThermostatBase.js)
                          └── ButtonDevice (lib/devices/ButtonDevice.js) [80KB]
`

### Key Base Classes

- **BaseHybridDevice** (182KB): Master base - DP handling, capability management, settings, diagnostics, health monitoring, manufacturer variation handling
- **HybridSensorBase** (207KB): Biggest file - all sensor types, IAS Zone, Tuya DP sensors, dynamic dpMappings builder, compound frame parsing, inference engines
- **HybridSwitchBase** (40KB): Multi-gang on/off, power-on behavior, backlight, child lock
- **HybridCoverBase** (35KB): Position control, tilt, curtain motor DPs
- **HybridPlugBase** (37KB): Energy monitoring, power metering, USB outlets
- **HybridLightBase** (29KB): RGB, RGBW, CCT, dimming, color temperature, scenes
- **ButtonDevice** (80KB): Wireless buttons, scene switches, press types

---

## 4. Tuya Protocol Stack

### 4.1 Cluster 0xEF00 (Tuya DP Protocol)

`
ZCL Frame: [frameCtrl:1][seqNum:1][cmdId:1][payload:N]
DP Payload: [status:1][transId:1][dp:1][type:1][lenHi:1][lenLo:1][data:N]
`

| Cmd | Direction | Purpose |
|-----|-----------|---------|
| 0x00 | Gw->Dev | dataRequest (send DP) |
| 0x01 | Dev->Gw | dataResponse (DP reply) |
| 0x02 | Dev->Gw | dataReport (proactive) |
| 0x03 | Gw->Dev | dataQuery (query all DPs) |
| 0x10 | Gw->Dev | mcuVersionRequest |
| 0x11 | Dev->Gw | mcuVersionResponse |
| 0x24 | Both | mcuSyncTime |

DP Types: 0=Raw, 1=Bool, 2=Value(4B), 3=String, 4=Enum, 5=Bitmap

Common DPs: DP1-8=gang states, DP14=power-on, DP15=backlight, DP101=child_lock

### 4.2 Core Tuya Files (lib/tuya/)

| File | Size | Role |
|------|------|------|
| **TuyaEF00Manager.js** | 93KB | Main DP report handler, AdaptiveDataParser, compound frames |
| **UniversalTuyaParser.js** | 71KB | Frame parsing, ZCL header routing, MCU version handling |
| **DeviceFingerprintDB.js** | 215KB | Complete fingerprint database (all mfr+pid combos) |
| **EnrichedDPMappings.js** | 51KB | DP-to-capability enriched mappings |
| **TuyaDataPointsZ2M.js** | 43KB | DP definitions from Zigbee2MQTT |
| **TuyaTimeSyncFormats.js** | 32KB | All Tuya time sync format variants |
| **TuyaTimeSyncManager.js** | 24KB | Time sync coordination |
| **TuyaGatewayEmulator.js** | 23KB | Gateway protocol emulation |
| **TuyaSpecificClusterDevice.js** | 20KB | Cluster-specific device handling |
| **TuyaZigbeeDevice.js** | 17KB | Base Tuya Zigbee device class |
| **TuyaDPUltimate.js** | 43KB | Ultimate DP processing engine |

### 4.3 DP Flow: Report -> Capability

`
Device receives ZCL frame on cluster 0xEF00
  -> TuyaSpecificCluster / TuyaBoundCluster parses frame
  -> TuyaEF00Manager.handleDataReport(dp, type, data)
    -> AdaptiveDataParser converts raw data (bool, value, enum, etc.)
    -> dpMappings lookup: dp -> { capability, divisor, valueMap }
    -> ProductValueValidator validates range
    -> setCapabilityValue(capability, convertedValue)
    -> Flow triggers fire if applicable
`

### 4.4 Double-Division Bug (FIXED v5.11.15)
- AdaptiveDataParser auto-converts (e.g. temp /100)
- Then dpMappings divisor divides again -> wrong values
- Fix: TuyaEF00Manager line ~1912 skips auto-conversion when dpMappings divisor !== 1

---

## 5. Mixins

### PhysicalButtonMixin (lib/mixins/PhysicalButtonMixin.js - 35KB)
- Detects physical button presses vs app commands (2000ms window)
- Single/double/triple/long press detection
- Manufacturer profiles (BSEED, Zemismart, Moes, Lonsonho)
- State tracking: `_lastOnoffState`, `_appCommandPending`, `_appCommandTimeout`
- Pattern: `markAppCommand()` before sending, check `!_appCommandPending` on report

### VirtualButtonMixin (lib/mixins/VirtualButtonMixin.js - 16KB)
- Virtual button support for flow-only actions

### TuyaDeviceMixin (lib/mixins/TuyaDeviceMixin.js - 13KB)
- Common Tuya device initialization patterns

### PeriodicAutoEnricherMixin (lib/mixins/PeriodicAutoEnricherMixin.js - 4KB)
- Periodic device data enrichment

Mixin order: `PhysicalButtonMixin(VirtualButtonMixin(HybridSwitchBase))`

---

## 6. Zigbee Layer (lib/zigbee/)

| File | Role |
|------|------|
| **registerClusters.js** | Registers all custom Zigbee clusters at app init |
| **ZigbeeClusterManager** | Cluster binding and configuration |
| **ZigbeeHealthMonitor** | Connection health tracking |
| **ZigbeeErrorCodes** | Error code catalog and recovery |
| **ZigbeeDataQuery** | Data querying from clusters |
| **GreenPowerManager** | Green Power protocol support |
| **MatterCompatibilityLayer** | Future Matter bridge compatibility |
| **zigbee-cluster-map.js** | Cluster ID -> name/handler mapping |

### Custom Clusters (lib/clusters/)

| Cluster | File | Purpose |
|---------|------|---------|
| 0xEF00 | TuyaSpecificCluster.js, TuyaBoundCluster.js | Main Tuya DP protocol |
| 0xE000 | TuyaE000Cluster.js, TuyaE000BoundCluster.js | BSEED custom cluster |
| 0xE001 | TuyaE001Cluster.js | BSEED extended cluster |
| 0xE002 | TuyaE002Cluster.js | Tuya extended |
| IAS ACE | IasAceCluster.js | Security panel |
| Zosung | ZosungIRControlCluster.js, ZosungIRTransmitCluster.js | IR blaster |

---

## 7. Managers (lib/managers/)

| Manager | Role |
|---------|------|
| **SmartDriverAdaptation** (48KB) | Runtime driver adaptation based on device capabilities |
| **AutonomousMigrationManager** (24KB) | Auto-migrate devices between driver versions |
| **IASZoneManager** (23KB) | IAS Zone enrollment, status parsing, alarm routing |
| **IEEEAddressManager** (19KB) | IEEE address tracking and neighbor tables |
| **IntelligentDataManager** (17KB) | Smart data caching and retrieval |
| **UniversalHybridEnricher** (15KB) | Post-pair capability enrichment |
| **EnergyManager** (13KB) | Energy monitoring aggregation |
| **PowerManager** (12KB) | Power state management |
| **DriverMigrationManager** (11KB) | Driver version migrations |
| **DynamicCapabilityManager** (9KB) | Runtime capability add/remove |
| **CountdownTimerManager** (6KB) | Countdown timer DPs |
| **MultiEndpointManager** (6KB) | Multi-endpoint device handling |
| **OTAManager** (5KB) | OTA update coordination |

---

## 8. Utilities (lib/utils/)

| Utility | Role |
|---------|------|
| **DriverMappingLoader** (41KB) | Load and parse driver DP mappings from compose files |
| **AdaptiveDataParser** (14KB) | Smart data type conversion for DP values |
| **battery-reporting-manager** (18KB) | Battery reporting configuration |
| **cluster-configurator** (17KB) | ZCL cluster binding and reporting setup |
| **data-collector** (14KB) | Device data collection for diagnostics |
| **DriverUtils** (15KB) | Driver utility functions |
| **UniversalThrottleManager** (8KB) | Rate limiting for device commands |
| **RetryWithBackoff** (8KB) | Exponential backoff retry logic |
| **ZigbeeRetry** (5KB) | Zigbee-specific retry with re-enrollment |
| **migration-queue** (12KB) | Queued device migration system |
| **TuyaDataPointUtils** (7KB) | DP encoding/decoding utilities |

---

## 9. Helpers (lib/helpers/)

| Helper | Role |
|--------|------|
| **DeviceHintsDatabase** (21KB) | Device identification hints for pairing |
| **device_helpers** (19KB) | Common device helper functions |
| **UniversalCapabilityDetector** (16KB) | Auto-detect capabilities from clusters |
| **RawDataParser** (13KB) | Parse raw Tuya data frames |
| **DeviceIdentificationDatabase** (12KB) | Fingerprint -> device type mapping |
| **FallbackSystem** (12KB) | Multi-level fallback for unknown devices |
| **UnknownDeviceHandler** (11KB) | Handle completely unknown devices |
| **BatteryRouter** (10KB) | Route battery data to correct capability |
| **CustomPairingHelper** (8KB) | Custom pairing flows |
| **ManufacturerNameHelper** (8KB) | Manufacturer name normalization |

---

## 10. Flow Cards System (lib/flow/)

| File | Role |
|------|------|
| **AdvancedFlowCardManager** (17KB) | Advanced flow cards (conditions, actions, triggers) |
| **FlowCardManager** (5KB) | Basic flow card registration |
| **FlowTriggerHelpers** (8KB) | Trigger helper utilities |
| **UniversalFlowCardLoader** (5KB) | Dynamic flow card loading from compose files |

Flow card IDs follow pattern: `{driver}_physical_gang{N}_{on|off}`

---

## 11. Diagnostics (lib/diagnostics/)

| File | Role |
|------|------|
| **SystemLogsCollector** (19KB) | Collect structured system logs |
| **DeviceDiagnostics** (16KB) | Per-device diagnostic data |
| **HealthCheck** (15KB) | Device health monitoring |
| **DiagnosticLogsCollector** (11KB) | Aggregate diagnostic logs |
| **DiagnosticAPI** (9KB) | REST API for MCP/AI integration |
| **DeviceHealth** (5KB) | Health state tracking |

---

## 12. Battery System (lib/battery/)

| File | Role |
|------|------|
| **BatteryCalculator** (21KB) | Battery % calculation from voltage curves |
| **BatteryProfileDatabase** (20KB) | Per-device battery profiles (CR2032, AA, etc.) |
| **BatteryHybridManager** (15KB) | Hybrid battery source management |
| **BatteryManager** (14KB) | Core battery management |
| **BatterySystem** (12KB) | Battery system orchestration |
| **UnifiedBatteryHandler** (12KB) | Unified battery reporting |
| **BatteryMonitoringMixin** (10KB) | Battery monitoring mixin for devices |

---

## 13. Protocol Detection (lib/protocol/)

| File | Role |
|------|------|
| **ZigbeeProtocolComplete** (40KB) | Complete ZCL protocol implementation |
| **HybridProtocolManager** (21KB) | Decide ZCL vs Tuya DP per device |
| **IntelligentProtocolRouter** (17KB) | Smart routing based on device behavior |
| **KnownProtocolsDatabase** (15KB) | Known manufacturer protocol preferences |
| **HardwareDetectionShim** (11KB) | Hardware capability detection |

---

## 14. Intelligent Systems

| File | Role |
|------|------|
| **IntelligentDeviceLearner** (22KB) | Learn device behavior over time |
| **IntelligentSensorInference** (21KB) | Infer sensor types from DP patterns |
| **ProductValueValidator** (22KB) | Validate sensor value ranges (CO2 min=0, temp -40..100) |
| **ManufacturerVariationManager** (36KB) | Handle per-manufacturer DP variations |
| **UniversalDataHandler** (39KB) | Universal DP->capability conversion |

---

## 15. Tuya DP Engine (lib/tuya-dp-engine/)

Self-contained DP processing engine with:
- `index.js` (8KB) - Engine entry point
- `capability-map.json` (8KB) - DP to capability mapping
- `profiles.json` (9KB) - Device profiles
- `fingerprints.json` (6KB) - Fingerprint DB
- `converters/` - Type-specific converters

---

## 16. Tuya Engine (lib/tuya-engine/)

Secondary engine with:
- `index.js` (5KB) - Engine entry point
- `enhanced-dp-handler.js` (9KB) - Enhanced DP processing
- `dp-database.json` (10KB) - DP definitions
- `profiles.json` (9KB) - Device type profiles
- `converters/` - Data converters
- `traits/` - Device behavior traits

---

## 17. Pairing System (lib/pairing/)

| File | Role |
|------|------|
| **UniversalPairingManager** (10KB) | Orchestrate pairing flow |
| **PermissiveMatchingEngine** (6KB) | Fuzzy fingerprint matching |
| **EnrichmentScheduler** (5KB) | Post-pair enrichment scheduling |
| **TwoPhaseEnrichment** (3KB) | Two-phase capability enrichment |
| **DynamicEndpointDiscovery** (2KB) | Discover endpoints during pair |
| **TuyaTimeSyncEngine** (3KB) | Time sync during pairing |

---

## 18. Data Files

| Path | Content |
|------|---------|
| `lib/tuya/DeviceFingerprintDB.js` | 215KB - Complete fingerprint database |
| `lib/tuya/EnrichedDPMappings.js` | 51KB - DP enrichment data |
| `lib/tuya/TuyaDataPointsZ2M.js` | 43KB - Z2M DP definitions |
| `lib/data/SourceCredits.js` | Source attribution data |
| `lib/helpers/DeviceHintsDatabase.js` | 21KB - Pairing hints |
| `data/` | Runtime state files |

---

## 19. GitHub Automation (.github/)

### 19.1 Scripts (.github/scripts/)

| Script | Role |
|--------|------|
| **ai-helper.js** | Multi-provider AI fallback: Gemini->OpenAI->Groq->Granite->Mistral->OpenRouter->ApiFreeLLM |
| **project-rules.js** | Condensed project rules injected into all AI prompts |
| **forum-responder.js** | Auto-respond to Homey forum topics using AI |
| **forum-respond-requests.js** | Process forum device request threads |
| **forum-updater.js** | Post forum summary updates |
| **github-scanner.js** | Scan GitHub issues/PRs for device requests |
| **enrichment-scanner.js** | Scan for device enrichment opportunities |
| **nightly-processor.js** (23KB) | Nightly batch processing |
| **monthly-comprehensive.js** (18KB) | Monthly deep scan all sources |
| **triage-upstream-enhanced.js** | Enhanced issue triage |
| **scan-forum.js** | Scan Homey forum for device topics |
| **scan-forks.js** | Scan fork repos for new fingerprints |
| **cross-driver-gap.js** | Detect cross-driver fingerprint gaps |
| **load-fingerprints.js** | Load and validate fingerprints |

### 19.2 AI Provider Chain

`
GOOGLE_API_KEY  -> Gemini 2.0 Flash / Flash Lite (free)
OPENAI_API_KEY  -> GPT-4o-mini
GROQ_API_KEY    -> Llama 3.3 70B (free, fast)
HF_TOKEN        -> IBM Granite 3.3 8B (HuggingFace, free)
MISTRAL_API_KEY -> Mistral Small (free experiment)
OPENROUTER_API_KEY -> Llama 3.3 8B free models
APIFREELLM_KEY  -> ApiFreeLLM (free, unlimited)
`

All providers get `PROJECT_RULES` injected into system prompt via `project-rules.js`.

### 19.3 Workflows (.github/workflows/)

| Workflow | Schedule | Purpose |
|----------|----------|---------|
| **tuya-automation-hub.yml** | Dispatch | Master hub: forum-responder, github-scanner, enrichment-scanner, forum-updater |
| **sunday-master.yml** | Weekly Sun | Triage issues, scan forks, scan forum, auto-respond |
| **nightly-auto-process.yml** | Daily | Nightly batch processing |
| **monthly-comprehensive-sync.yml** | Monthly | Deep scan all sources |
| **forum-auto-responder.yml** | 6h | Auto-respond to forum topics |
| **weekly-fingerprint-sync.yml** | Weekly | Fetch + validate fingerprints |
| **auto-respond.yml** | Issue/PR trigger | Auto-respond to new issues/PRs |
| **upstream-auto-triage.yml** | Schedule | Triage upstream issues |

### 19.4 GitHub Secrets Required

`
GOOGLE_API_KEY, OPENAI_API_KEY, GROQ_API_KEY, HF_TOKEN,
MISTRAL_API_KEY, OPENROUTER_API_KEY, APIFREELLM_KEY,
HOMEY_EMAIL, HOMEY_PASSWORD, GH_PAT
`

---

## 20. Key Design Patterns

### 20.1 Fingerprint Matching
- Fingerprint = `manufacturerName` + `productId` (COMBINED)
- Same mfr in multiple drivers is NORMAL if productId differs
- Defined in `driver.compose.json` -> `zigbee.manufacturerName[]` + `zigbee.productId[]`

### 20.2 DP Mappings
- Static: defined in device.js `get dpMappings()`
- Dynamic: built at runtime from sensor config (presence_sensor_radar)
- Enriched: from `EnrichedDPMappings.js` database

### 20.3 Settings Keys
- `zb_model_id` NOT `zb_modelId`
- `zb_manufacturer_name` NOT `zb_manufacturerName`

### 20.4 Flow Card Rules
- IDs: `{driver}_physical_gang{N}_{on|off}`
- NO `titleFormatted` with `[[device]]` (causes manual selection bug)
- Use `title` field instead

### 20.5 Physical Button Detection
`
_markAppCommand() -> set _appCommandPending=true, timeout 2s
On DP report: isPhysical = reportingEvent && !_appCommandPending
if (isPhysical && previousState !== value) -> trigger flow card
`

### 20.6 Backlight Values
Strings: `"off"`, `"normal"`, `"inverted"` (NOT numbers)

### 20.7 Mains-Powered Sensors
- `get mainsPowered() { return true; }` in device.js
- Remove `measure_battery` in `onNodeInit`

### 20.8 Import Paths
`javascript
// CORRECT:
const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const HybridSwitchBase = require('../../lib/devices/HybridSwitchBase');
const { ZigBeeDevice } = require('homey-zigbeedriver');

// WRONG:
const TuyaZigbeeDevice = require('../../lib/TuyaZigbeeDevice');
`

---

## 21. Configuration Files

| File | Purpose |
|------|---------|
| `app.json` (2.1MB) | Homey app manifest (auto-generated from compose) |
| `package.json` | NPM config, scripts, dependencies |
| `.homeycompose/app.json` | Base app compose config |
| `.homeycompose/capabilities/` | Custom capability definitions |
| `.homeycompose/flow/` | Global flow card definitions |
| `locales/` | i18n translations (en, nl, de, fr, etc.) |
| `settings/` | App settings page |
| `.env.example` | Environment variable template |

---

## 22. Scripts (scripts/)

Utility and maintenance scripts:
- `scripts/automation/` - CI/CD, auto-update, pre-push checks
- `scripts/ai/` - AI research, analysis, driver generation
- `scripts/maintenance/` - Image fixing, cleanup
- `scripts/fixes/` - One-off fix scripts
- `scripts/docs/` - Documentation generation
- `scripts/images/` - Image generation and verification
- `scripts/validation/` - Schema validation

---

## 23. External Data Sources

| Source | Usage |
|--------|-------|
| **Zigbee2MQTT** | Fingerprints, DP definitions, device configs |
| **ZHA (zigpy)** | Device handlers, quirks |
| **Blakadder** | Device database cross-reference |
| **JohanBendz fork** | Upstream fingerprints (com.tuya.zigbee) |
| **Homey Forum** | User device requests, diagnostic reports |
| **GitHub Issues** | Bug reports, device support requests |

---

## 24. Windsurf Workflows (.windsurf/workflows/)

| Workflow | Purpose |
|----------|---------|
| `cross-reference-session.md` | Cross-reference all sources at each prompt |
| `diagnose-device-issues.md` | Diagnose Tuya device issues from diagnostic logs |
| `monthly-fingerprint-sync.md` | Monthly comprehensive fingerprint sync |
| `sunday-automation.md` | Sunday triage: GitHub, forks, forum |

---

## 25. File Size Reference (largest files)

| File | Size | Notes |
|------|------|-------|
| `lib/tuya/DeviceFingerprintDB.js` | 215KB | Fingerprint database |
| `lib/devices/HybridSensorBase.js` | 207KB | All sensor logic |
| `lib/devices/BaseHybridDevice.js` | 182KB | Master base device |
| `lib/tuya/TuyaEF00Manager.js` | 93KB | DP protocol handler |
| `lib/devices/ButtonDevice.js` | 80KB | Button/scene device |
| `lib/devices/TuyaHybridDevice.js` | 79KB | Hybrid device base |
| `lib/tuya/UniversalTuyaParser.js` | 71KB | Frame parser |
| `lib/tuya/EnrichedDPMappings.js` | 51KB | DP enrichment DB |
| `lib/managers/SmartDriverAdaptation.js` | 48KB | Runtime adaptation |
| `app.js` | 43KB | App entry point |
