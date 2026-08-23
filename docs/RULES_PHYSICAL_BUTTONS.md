# Rules for Physical & Virtual Button Logic (v1.1.0)
> Core architectural rules for bidirectional button synchronization in Universal Tuya App.

## 1. Bidirectional Sync (RX/TX)
*   **Rule 1.1: Deduplication Engine**
    *   Every incoming Zigbee report (`report`) MUST check `isAppCommand(gang)`.
    *   If `isAppCommand(gang)` is `true`, the report is a loopback from a Homey-initiated change.
    *   **Action**: Update internal state but DO NOT trigger flow cards or repeat command.
*   **Rule 1.2: Physical Triggering**
    *   If `isAppCommand(gang)` is `false`, the report is a physical event.
    *   **Action**: Use `_triggerPhysicalFlow(gang, value)` and then `_safeSetCapability(gangId, value)`.
*   **Rule 1.3: Physical Execution (Zero Defect)**
    *   Flow Action cards MUST NOT write `setCapabilityValue()` directly when the device is expected to actuate physically.
    *   Commands MUST enter a protocol-aware path that first calls `markAppCommand(gang, value)` and then sends the actual ZCL/Tuya-DP command.
    *   `triggerCapabilityListener()` is only a fallback for devices without a direct protocol router. Since v9.0.103, button and switch mixins prefer direct ZCL/Tuya-DP dispatch to avoid echo loops and missing-listener crashes.
    *   **Action**: Keep physical execution centralized in `VirtualButtonMixin`, `PhysicalButtonMixin`, `UnifiedSwitchBase`, or equivalent base routers.

## 2. Hardening (Anti-Burst & SDK 3 Safety)
*   **Rule 2.1: ZCL Burst Debounce**
    *   High-frequency frames can crash the driver.
    *   **Action**: Implement `_isDebounced()` check (200ms threshold) in `PhysicalButtonMixin.js`.
*   **Rule 2.2: SDK 3 Flow Protection**
    *   `getTriggerCard()` can throw/crash if card ID is invalid.
    *   **Action**: ALWAYS use the **Safe-Get-Card pattern**: `(() => { try { return this.homey.flow.getTriggerCard(id); } catch(e) { return null; } })()`.
*   **Rule 2.3: Method-Call Safety**
    *   To prevent `ReferenceError` during complex inheritance calls, always prefix SDK methods (like `setCapabilityValue`) with `this.`.

## 5. Capture cascade L1–L8 (P2223 — Homey gap compensation)
Declarative SSOT: `config/resilience/button-capture-cascade.json`. Runtime enricher: `lib/mixins/ButtonCaptureCascade.js` (additive).

| L | Path | Role |
|---|------|------|
| 1 | OnOffBoundCluster per-EP `0xFD`/`0xFC` | Tuya mfr cmds Homey SDK drops |
| 2 | Raw `zclNode.handleFrame` + wide `command` match | When bindings silent |
| 3 | Scenes `0x0005` recall | Scene remotes |
| 4 | ZCL on/off/toggle (+ 9 name patterns) | Dimmer/hybrid fallback |
| 5 | `TuyaE000BoundCluster` + L1 E000/E001 | Moes/legacy proprietary |
| 6 | LevelControl step/move/stop | TS004F knobs / command mode |
| 7 | EF00 DP | MCU scene pads (TS0601 family) — observe-first on residual EF00 |
| 8 | MultistateInput `presentValue` | Exotic remotes |

**Pillars:** (1) normalize via `TuyaPressTypeMap` → Homey press tokens (2) `DeviceOperatingMode` family at init (3) silent OnOff re-bind retry.

## 6. Homey-native gaps → parallel compensation (P2221)
Homey / zigbee-clusters omit Tuya manufacturer OnOff cmds and unknown 0xE000 objects.
Re-implement smarter from Z2M/ZHA/Hubitat ideas — keep all complementary layers.

Bidirectional vision: Physical RX fires flows; Virtual/UI TX actuates device + optimistic UI; shared `_virtualPhysicalDedup` + `markAppCommand`. `UnifiedSwitchBase` inits physical + virtual + UI.

## 7. Fingerprint / manufacturer
* Route `manufacturerName`/`productId` through `TuyaNormalizer` (case-insensitive).
* Sacred couple = manufacturerName + productId (e.g. `_TZ3000_zgyzgdua`+`TS0044` → `scene_switch_4`).
* Hybrid init is the default; BSEED stays `zcl_only` when profile says so.

## 8. Dedup between parallel layers
* Windows 200–500ms between L1–L8 so complementary paths do not multi-fire the same press.

