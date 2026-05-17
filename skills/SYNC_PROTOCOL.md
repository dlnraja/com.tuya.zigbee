# 🔄 SYNC ORCHESTRATION PROTOCOL (Antigravity v6.0.0)

> Protocol for synchronizing with upstream Johan Benz (SDK3), Z2M/ZHA, and community databases.

## 🛠️ Orchestration Principles

### 1. Intelligence Synthesis
- **Multi-Source**: Blend Johan's ZCL drivers with Tuya DP mappings from Z2M and specialized Zosung IR codes.
- **Conflict Resolution**: If Johan and Z2M disagree on a DP, prioritize the one verified in `lib/tuya/EnrichedDPMappings.js` (community verified).
- **Enrichment**: Every sync must check if a new device can be "Enriched" with better icons, localized names, or advanced settings.

### 2. Validation Pipeline (Zero-Defect)
Every sync must pass the `scripts/ci/antigravity-controls.js` audit before merge.
1. `node --check`
2. `npx homey app validate --level publish`
3. `antigravity-controls.js` (Structural Audit)

### 3. Bidirectional Stability
Ensure that all synced drivers support the v6.0.0 `VirtualButtonMixin` and `PhysicalButtonMixin` standards.
- No "ghost" presses during sync updates.
- State preservation during driver upgrades.

## 🔋 Battery Parity Standard
- **BatteryMixin**: Mandatory for all DC devices.
- **mainsPowered**: Mandatory getter for all AC devices.
- **Parity**: Battery level reports must be consistent across Tuya and ZCL protocols.

## 🔘 Asymmetric Button Standard
- **Mixed Gangs**: Handle drivers where Gang 1 is a switch and Gang 2 is a scene button.
- **Flow Cards**: Every gang must have its own `on`, `off`, `single`, `double`, `long` cards.
- **Correlation**: Use `correlationId` from `VirtualButtonMixin` v6.0.0 for event tracking.

## 📡 Zosung & MCU Protocol
- **IR Support**: Use `TuyaSpecificCluster` for Zosung IR learning and playback.
- **Heartbeat**: Maintain MCU heartbeats to prevent device dropouts.
