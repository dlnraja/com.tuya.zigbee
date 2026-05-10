# 🌌 UNIVERSAL TUYA - AI System Context & Map

### 🧠 Superior Intelligence Ecosystem (v7.5.9+)

The app uses a multi-layered, self-healing intelligence approach to handle the massive diversity of Tuya hardware:

### 1. Genesis Orchestrator (`lib/GenesisOrchestrator.js`)
*   **Purpose**: Centralized "Truth Engine" for device definitions.
*   **Precedence**: Local Driver Overrides > `driver-mapping-database.json` > Passive Heuristic Fallbacks.
*   **Rule**: ALL new device logic should be registered in the JSON database rather than hardcoded in drivers.

### 2. Autonomous Intelligence Gate (`lib/AutonomousIntelligenceGate.js`)
*   **Purpose**: Runtime heuristic learning and self-correction.
*   **Behavior**: Scores incoming DPs based on value patterns (e.g., 20-30 = Temperature).
*   **Self-Healing**: Automatically re-maps capabilities if high-confidence heuristics contradict the current database entry.

### 3. Smart Scale Value Corrector (`lib/adapters/ZclToHomeyMap.js`)
*   **Purpose**: Automatically and dynamically handles unit divisor adjustments and out-of-bounds scales.
*   **Behavior**: Detects raw value ranges for temperature, humidity, voltage, current, and power, and rescales them on-the-fly inside `TuyaZigbeeDevice.js` during the `safeSetCapabilityValue` stage.

### 4. Smart Battery Manager (`lib/managers/SmartBatteryManager.js`)
*   **Purpose**: Solves the conflict between battery alarms and measurements.
*   **Behavior**: Triggers low battery alarms when percentages drop below 15%; synthesizes virtual percentages (10% or 100%) when devices only report raw binary alarm flags, ensuring a clean Homey UI.

### 5. Multi-Source Scraping Engine (`scripts/automation/fetch-z2m-fingerprints.js`)
*   **Purpose**: Automated weekly evolution syncer.
*   **Behavior**: Downloads and parses Zigbee2MQTT typescript definitions and ZHA Python quirks every Monday morning. Deduplicates signatures and updates local databases.

---

## 🛡️ Zero-Defect Maintenance Rules
1.  **Lower-Case Manufacturers**: All fingerprints in `driver.compose.json` MUST be lowercase for standard matching.
2.  **Flattened Flow Cards**: Use `homey:manager:flow-card:id` syntax only.
3.  **Parallel Init**: Use `Promise.all` in `onNodeInit` for non-dependent managers.
4.  **Energy Objects**: All metering devices MUST define an `energy` object with `cumulative: true`.
5.  **Clean Folder Names**: Strictly prevent any hybrid or composite folder suffixes (e.g., use `switch_wall`, avoid `switch_wall_switch`).

---

## 🗺️ Key Architectural Landmarks

### 1. Core Device Inheritance
- **TuyaZigbeeDevice.js**: The ultimate foundation for all drivers. Handles hybrid routing, diagnostic collection, and houses the dynamic scaling interceptor.
- **SmartBatteryManager.js**: The brain of the battery percentage/alarm bidirectional sync.
- **SmartEnergyManager.js**: Smart divisor detector and listener setup for electrical measurement/metering clusters.

### 2. Autonomous Pipeline
- **Weekly Multi-Source Sync**: `.github/workflows/fetch-z2m-fingerprints.yml`. Runs every Monday morning to execute the Z2M + ZHA multi-source signature sync.
- **Master CI/CD**: `.github/workflows/master-cicd.yml`. Handles static validation, versioning, and publishing.

### 3. Intelligence Reference
- **driver-mapping-database.json**: 30,000+ lines of cross-platform fingerprints and DP mappings.
- **docs/meta/AI_OFFLINE_GUIDE.md**: Exhaustive architectural reference sheet for offline LLMs.

---

## 💎 Recent Intelligence (v7.5.9+)
- **Dynamic Scale Correctors**: Standardized temperature, humidity, voltage, and power conversions globally across all 190+ drivers inside `safeSetCapabilityValue`.
- **Battery Sync**: Added bidirectional synthesis to prevent empty layout blocks in Homey.
- **Folder Sanitizer**: Implemented `sanitizeDriverId` inside `Z2MConverterAdapter.js` to block hybrid suffixes.
- **Functional Scaffolder**: Scaffolded drivers now write operational registrations (e.g., `await this.registerTemperatureCapability()`) instead of stubs.

**Last Updated**: May 2026 by Antigravity (Google DeepMind Team)
