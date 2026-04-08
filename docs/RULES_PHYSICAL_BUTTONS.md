# Rules for Physical & Virtual Button Logic (v1.0.0)
> Core architectural rules for bidirectional button synchronization in Universal Tuya App.

## 1. Bidirectional Sync (RX/TX)
*   **Rule 1.1: Deduplication Engine**
    *   Every incoming Zigbee report (`report`) MUST check `isAppCommand(gang)`.
    *   If `isAppCommand(gang)` is `true`, the report is a loopback from a Homey-initiated change.
    *   **Action**: Update internal state but DO NOT trigger flow cards or repeat command.
*   **Rule 1.2: Physical Triggering**
    *   If `isAppCommand(gang)` is `false`, the report is a physical event.
    *   **Action**: Use `_triggerPhysicalFlow(gang, value)` and then `_safeSetCapability(gangId, value)`.

## 2. Hardening (Anti-Burst)
*   **Rule 2.1: ZCL Burst Debounce**
    *   High-frequency frames (e.g. triple click in 50ms) can crash the driver.
    *   **Action**: Implement `_isDebounced()` check with at least 200ms threshold in `PhysicalButtonMixin.js`.
*   **Rule 2.2: SDK 3 Flow Protection**
    *   Flow card lookups via `getTriggerCard()` are prone to synchronous throw/crash if card ID is invalid.
    *   **Action**: ALWAYS use `app._safeGetTriggerCard()` wrapper.

## 3. Virtual Buttons
*   **Rule 3.1: Packetninja State Tracking**
    *   Virtual buttons (Toggle, Dim Up, Identify) must record events in `_virtualButtonState`.
    *   **Action**: Use `_recordVirtualButtonEvent(gang, type, data)` for audit logs and forensic diagnostics.

## 4. Multi-Layer Logic
*   **Layer 0: Trame Réseau (Raw)**
    *   Check for endpoint 0xFD or 0xEF00 (Tuya Cluster).
*   **Layer 1: Zigbee Standard**
    *   Standard OnOff (0x0006) cluster usage.
*   **Layer 2: Tuya DP Mapping**
    *   Mapping DPs (1, 2, 7 etc.) to gang IDs.

## 5. Manufacturer Rules
*   **Rule 5.1: Case Sensitivity**
    *   ALWAYS use `.toLowerCase()` when matching `manufacturerName`.
*   **Rule 5.2: Generic Fallbacks**
    *   For `_TZ3000_` devices, prefer generic drivers but prune `onoff` if it's a battery remote.
