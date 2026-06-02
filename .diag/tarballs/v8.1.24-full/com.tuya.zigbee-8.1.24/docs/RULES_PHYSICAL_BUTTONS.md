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
    *   Flow Action cards MUST use `triggerCapabilityListener()` instead of `setCapabilityValue()` to ensure actual physical relay switching.
    *   **Action**: Implement fallback in `HybridSwitchBase` to route flow commands through listeners.

## 2. Hardening (Anti-Burst & SDK 3 Safety)
*   **Rule 2.1: ZCL Burst Debounce**
    *   High-frequency frames can crash the driver.
    *   **Action**: Implement `_isDebounced()` check (200ms threshold) in `PhysicalButtonMixin.js`.
*   **Rule 2.2: SDK 3 Flow Protection**
    *   `getTriggerCard()` can throw/crash if card ID is invalid.
    *   **Action**: ALWAYS use the **Safe-Get-Card pattern**: `(() => { try { return this.homey.flow.getTriggerCard(id); } catch(e) { return null; } })()`.
*   **Rule 2.3: Method-Call Safety**
    *   To prevent `ReferenceError` during complex inheritance calls, always prefix SDK methods (like `setCapabilityValue`) with `this.`.

## 3. Fingerprint Integrity
*   **Rule 3.1: Resolution Conflict**
    *   Manufacturer IDs MUST NOT be duplicated across drivers of different "gang" counts (e.g., mapping a 3-gang MFR to a 1-gang driver is forbidden).
    *   **Action**: Audit `DeviceFingerprintDB.js` daily for gang-count consistency.

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
*   **Rule 5.3: Standard Initialization**
    *   Avoid using "ZCL-only" modes for non-BSEED devices. Standard hybrid initialization is the robust default.
