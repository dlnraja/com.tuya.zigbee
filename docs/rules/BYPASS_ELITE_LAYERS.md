# 🧬 BYPASS ELITE LAYERS & NATIVE SDK3 MIGRATION ARCHITECTURE
> **Document Class**: Core Architectural Specification & Reference
> **Status**: APPROVED for Both Innovative (master) & Stable (stable-v5) Tracks
> **Last Upgraded**: May 2026 (v8.0.0+) by Antigravity (Google DeepMind Team)

---

## 🗺️ 1. The Dual-Track Challenge & The 9-Layer Architecture

Homey Pro's native SDK3 is optimized for standard Zigbee Cluster Library (ZCL) devices. However, Tuya's hardware fleet extensively utilizes proprietary, non-standard, or highly erratic Zigbee behaviors—such as private cluster `0xEF00` (Tuya DP), custom boundary cluster `0xE000` (MOES), or missing/corrupted standard attribute reports.

To handle these limitations without causing Homey Pro to reject the devices or crash, this application implements a **Dual-Track, Decoupled Architecture (L1 to L9)**. This allows the engine to bypass native SDK3 boundaries under the hood while maintaining 100% store validation compliance.

```mermaid
graph TD
    subgraph Hardware Layer
        A[Physical Device Event]
    end

    subgraph Deep Bypass Track (L1 - L4)
        A -->|Raw Bytes / EF00 / E000| L1[L1: Raw Frame Fallback Interceptor]
        L1 -->|Bound Clusters / Emulation| L2[L2: Custom BoundCluster Binding]
        L1 -->|ZCL Direct Event Listeners| L3[L3: Command Listeners Fallback]
        L2 & L3 -->|Debounce / Multi-Press Throttle| L4[L4: State Machine & Debounce Engine]
    end

    subgraph Intelligent Translation Track (L5 - L7)
        L4 -->|Numeric Scale Self-Healing| L5[L5: Smart Scale Value Corrector]
        L5 -->|Virtual State Synthesis| L6[L6: Smart Battery & Energy Manager]
        L6 -->|Multi-Protocol Routing| L7[L7: Adaptive Hybrid Protocol Router]
    end

    subgraph Homey Presentation Track (L8 - L9)
        L7 -->|Dynamic Capability Scaffolding| L8[L8: Dynamic Capability Scaffolding]
        L8 -->|SDK3 Compliant UI & Flows| L9[L9: Homey SDK3 API Wrapper Layer]
    end
```

---

## 🛠️ 2. Deep Dive: The 9-Layer Technical Stack

### 🔴 Layer 1 (L1): Raw Frame Fallback Interception (Low-Level Transceiver)
*   **Purpose**: Intercept raw Zigbee frames directly before the SDK or default cluster handlers discard them as unparsed or unsupported.
*   **Implementation**: Uses the low-level `zclNode.on('response', ...)` listener inside `UniversalFallbackDevice` and `TuyaZigbeeDevice` to capture private Tuya DP clusters (`0xEF00` / `61184`) and custom clusters (`0xE000`). This ensures no command is lost due to rigid SDK bindings.

### 🟠 Layer 2 (L2): Custom BoundCluster Binding (Gateway Emulation)
*   **Purpose**: Emulate Tuya Zigbee gateway responses for sleepy battery-powered switches, sensors, and remote controllers.
*   **Implementation**: Registers boundary responders like `TuyaE000BoundCluster` and `FingerBotTimeBoundCluster` to answer requests (such as local time queries or custom battery status updates) directly to the device.
*   **Crucial Benefit**: Prevents devices from constantly retrying transmissions and draining their battery, solving the notorious "Sleepy Tuya battery drain" bug.

### 🟡 Layer 3 (L3): ZCL Command Listeners Fallback
*   **Purpose**: Intercept direct ZCL command broadcasts (like `commandOn`, `commandOff`, or scenes `recall`) instead of relying solely on attribute reporting.
*   **Implementation**: Essential for devices like the TS0044 which have no E000 cluster or refuse to report button states via standard attributes. Direct listeners map these broadcast triggers to corresponding Homey flow cards instantly.

### 🟢 Layer 4 (L4): State Machine & Debounce Engine
*   **Purpose**: Decouple hardware-level rapid triggers from application-level flow executions.
*   **Implementation**: Incorporates specialized timers (`LOCAL_PRESS_SUPPRESS_MS`, `LOCAL_REPORT_IGNORE_MS`, and `REMOTE_PRESS_DEBOUNCE_MS`) to ignore echo reports, prevent duplicated button events, and stabilize physical contact switches.

### 🔵 Layer 5 (L5): Self-Healing Smart Scale Value (Magnifying & Scaling Correction)
*   **Purpose**: Automatically correct and normalize misaligned numeric values on the fly.
*   **Implementation**: Evaluates values inside `ZclToHomeyMap.smartScaleValue` to check if a temperature is reported in tenths (e.g. `215` instead of `21.5`) or if voltage is in millivolts, dynamically applying correction factors based on realistic human physiological ranges.

### 🟣 Layer 6 (L6): Smart Battery & Energy Management (Virtual Synthesis)
*   **Purpose**: Prevent empty or misleading placeholders on the Homey Pro dashboard when a device fails to report standard battery/power properties.
*   **Implementation**: 
    *   **Battery**: Dual-tracks battery percentage and low battery alarm, synthesizing a virtual status (10% on active alarm, 100% on healthy) if percentage data is missing.
    *   **Energy**: Automatically scales power parameters based on physiological bounds, ensuring live wattage is consistent and logical.

### 🟤 Layer 7 (L7): Adaptive Routing & Hybrid Protocol Router
*   **Purpose**: Intelligently route incoming data based on the dynamic profile of the paired device.
*   **Implementation**: Evaluates if the device should be processed as a pure Tuya DP device, a standard ZCL-only device, or a hybrid device utilizing manufacturer-specific cluster overrides.

### 🔘 Layer 8 (L8): Dynamic Capability Scaffolding with Fallbacks
*   **Purpose**: Proactively repair missing capabilities on the fly if the matched driver configuration is incomplete.
*   **Implementation**: Uses `this.addCapability()` at runtime to inject missing capability channels (such as individual gangs or custom battery/motion alarms) and maps them to dynamic flow card triggers automatically.

### ⚫ Layer 9 (L9): Homey Pro SDK3 API Wrapper Layer
*   **Purpose**: Present a clean, 100% store-compliant, high-performance interface to the Homey Pro OS.
*   **Implementation**: Wraps all core drivers, flows, and capabilities in modern SDK3 structures. Obsoletes deprecated calls (like changing `getDeviceTriggerCard` to `getTriggerCard`) to ensure future-proof stability and zero warnings during `homey app validate --level publish`.

---

## 🔑 3. Coding Guidelines & Integration Rules

To benefit both the **Innovative (`master`)** and **Stable (`stable-v5`)** tracks, all developers and AI models modifying this codebase must adhere to the following enforcement rules:

1.  **Always Call Super Inits first**: Any driver overriding `onNodeInit()` must start with `await super.onNodeInit({ zclNode })` to initialize the underlying 9-layer engine before executing any custom behavior.
2.  **No Cloud Dependencies (Local-First)**: All operations, transformations, and capability synthesis must be evaluated fully offline.
3.  **Sanitized Comparisons Only**: Direct string-matching or raw `.toLowerCase()` operations on `manufacturerName` or `productId` are strictly prohibited. Always use `CaseInsensitiveMatcher.js`.
4.  **No Duplicate Battery Capabilities**: Never allow concurrent `measure_battery` and `alarm_battery` capability definitions within the same driver configuration.

---

## 🛡️ 4. Action Plan for Long-Term Stabilization

To maintain this zero-defect, high-performance ecosystem:
- **Weekly Integrity Sweeps**: Run `scripts/ci/DEPENDENCY_INTEGRITY_SHIELD.js` and `scripts/ci/STRICT_SYNTAX_GUARD.js` to prevent any regressions.
- **Auto-Alignment Checks**: Utilize the newly deployed `scripts/ci/zero-defect-control.js` script to verify that all drivers correctly implement the required initializations and conform to SDK3 standards.
