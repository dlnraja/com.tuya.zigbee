#  NEXUS ULTIMATE MANIFESTO (v7.2.14)

> This manifesto defines the operational logic for the Universal Tuya Zigbee project, integrating advanced agentic patterns from the `antigravity-awesome-skills` ecosystem.

##  Architectural Philosophy

1. **Autonomous Self-Healing**: Every CI/CD run must audit the entire fleet for known "forgotten trigger" and "broken init" patterns.
2. **Idempotent Resilience**: Drivers must be safe for multiple re-initializations (use `_flowCardsRegistered` guards).
3. **Cluster Standardisation**: Custom Tuya `0xE000` clusters must use `endpoint.bind(57344, boundCluster)` for reliable event routing.
4. **SDK 3 Compliance First**: No deprecated methods (`getDeviceActionCard`, etc.). All icons MUST be 500x500+.

##  Fleet-Wide Maintenance Rules

### 1. Flow Card Registration (DRIVER)
- **Pattern**: Always register flow cards in `onInit()` (never in `onPairListDevices`).
- **Guard**: Re-registration is a CRITICAL FAILURE. Always use `this._flowCardsRegistered`.
- **Retrieval**: Use `this.homey.flow.get[Type]Card('id')`.
- **Compliance**: Never return `false` on initialization; throw informative errors if a card is missing from manifest.

### 2. Physical Button Handling (DEVICE)
- **Standard**: Custom `0xE000` clusters require explicit binding: `endpoint.bind(57344, boundCluster)`.
- **Triggers**: Every card retrieval MUST be followed by a `.trigger()` or `.registerRunListener()`. "Lonely" retrieval lines are bugs.

### 3. Climate & Sensor Precision
- **Validation**: Use `HybridSensorBase` for all climate hardware.
- **Inference**: Apply `ClimateInference` to smooth erratic readings and prevent phantom temperature spikes.
- **Dual Time Sync**: LCD devices require BOTH ZCL Time Group sync and Tuya `EF00` epoch sync.

##  NEXUS Maintenance Orchestrator

The project utilizes the following autonomous scripts:
- `ULTIMATE_DRIVER_STABILIZER.js`: Fleet-wide pattern-based repair engine.
- `generate-driver-images.js`: SDK 3 compliance asset generator.
- `post-forum-update.js`: Ghostwriter-AI powered forum synchronization.

##  Security & PII Protocols
- **Sanitisation**: All diagnostic reports MUST be anonymized before storage.
- **Masking**: IDs, IP addresses, and User names are stripped at the edge.

---
*Version: 7.2.14 | Build: Universal Engine Reimplementation | Author: dlnraja & Antigravity*
