# DRIVER SUPPORT: Universal Brand Normalization & Hardening Protocols
## Version: 8.3.0 (Comprehensive Case-Insensitive Normalization & Quality Gate Hardening)

This document details the validated support for the **HOBEIAN Radar** fleet, and the system-wide **v8.3.0 Hardening Architecture** designed to ensure case-insensitive brand normalization and telemetry stability for all core brands in the repository.

---

## 1. Validated HOBEIAN Radar Fleet
The following HOBEIAN (and generic mmWave) variants have been rigorously validated against the v8 protocol stack.

| Model ID | Manufacturer ID | Device Class | Modernization Level | Key Features |
|---|---|---|---|---|
| **ZG-204ZM** | `_TZE200_2aaelwxk` | Presence Radar | **Tier 1 (Ultimate)** | 24GHz mmWave, Distance, Lux, Battery |
| **ZG-204ZV** | `_TZE200_grgol3xp` | Multisensor Radar | **Tier 1 (Ultimate)** | Presence, Temp/Humidity, Lux, SOS |
| **ZG-204ZL** | `_TZE200_uli8wasj` | Ceiling Radar | **Tier 2 (Core)** | Presence, Lux, Mains Powered |
| **ZG-227Z** | `_TZE200_kb5noeto` | Mini Radar | **Tier 2 (Core)** | Presence, Ultra-compact |
| **ZG-102Z** | `_TZE200_crq3r3la` | PIR/Radar Hybrid | **Tier 3 (Legacy)** | Basic Motion Tracking |

---

## 2. Hardening Protocols (The v8 "Zero-Defect" Pattern)
To eliminate phantom reports and telemetry spikes, all Tier 1/2 drivers utilize the following validation layers:

### A. Intelligent Sensor Inference
Decouples physical presence state from raw Tuya DP health. 
- **Distance Correlation**: Presence is confirmed only if distance changes within configured sensitivity bounds.
- **Lux Smoothing**: Prevents "flicker" presence triggers caused by sudden light changes (e.g., sunset/sunrise).
- **Null-Safety**: State machines persist the "last known good" state during Tuya cluster timeouts.

### B. Sanity Filter (Rate-of-Change)
Enforces physical boundaries on telemetry data to prevent "telemetry spikes".
- **Radar Distance**: Hard limit at 15.0m; ROC limited to 3.0m/sec.
- **Climate**: Temperature ROC limited to 2.0°C/report; Humidity ROC limited to 5.0%/report.
- **Discard Logging**: Discarded reports are logged with `[SANITY] ⚠️ Discarded` for diagnostic transparency.

### C. Autonomous DP Discovery
For unknown manufacturer variants (e.g., new HOBEIAN sub-brands), the `IntelligentDPAutoDiscovery` engine performs real-time heuristic analysis.
- **Pattern Matching**: Automatically maps DP1/101 to Presence, DP4/15/121 to Battery, and DP12/104/106 to Illuminance.
- **Confidence Threshold**: 80%+ confidence required before auto-registration.

---

## 3. Case-Insensitive Matching and Load-time Normalization (v8.3.0 Hardening)
To solve mismatch issues from casing variations in Zigbee telemetry across all brands (e.g. Lumi, Aqara, Xiaomi, BSEED, Sonoff, eWeLink, Moes, Heiman, IKEA, Philips, Innr, Gledopto, Legrand, Schneider Electric, and Tuya), the following dual-layer normalization pipeline has been implemented:

### A. Dual-Layer Case Insensitivity
- **Static Matching during Pairing**: The `driver.compose.json` files contain all common case variants (e.g. `lumi`, `LUMI`, `hobeian`, `HOBEIAN`, etc.) to guarantee successful pairing under the Homey Zigbee matchmaker.
- **Dynamic Load-Time Normalization (`onLoad` / `onInit`)**: Inside the `ensureManufacturerSettings(device)` routine (lib/utils/ManufacturerNameHelper.js), any custom casing or brand mismatch is intercepted during device startup. It dynamically rewrites the settings `zb_manufacturer_name` and `zb_model_id` into canonical form (e.g. `lumi` / `lumi.` → `LUMI`, `sonoff` → `SONOFF`, `ewelink` → `eWeLink`, `moes` → `Moes`, `bseed` → `BSEED`, `hobeian` → `HOBEIAN`, `tuya` → `Tuya`).

### B. Architectural Guardrails
- **Pre-Push Quality Gate**: Added static check rules in `scripts/PRE_COMMIT_CHECKS.js` to block any legacy raw comparison patterns like `.toUpperCase() === 'SONOFF'` or `.toLowerCase() === 'lumi'`. All comparisons must go through the centralized case-insensitive `CaseInsensitiveMatcher` (`CI` helper).

---

## 4. Configuration & Tuning
All modern HOBEIAN devices support advanced tuning via Homey Settings:
- **Sensitivity (0-10)**: Adjusts the mmWave energy threshold.
- **Detection Range (0.0 - 10.0m)**: Sets the active tracking bubble.
- **Fading Time (0 - 28800s)**: Determines how long presence is held after motion ceases.

---

## 5. Maintenance & Diagnostics
If a device reports inconsistent data:
1. Check logs for `[DP-DISCOVERY] 🚀` (Indicates auto-mapping).
2. Check logs for `[INFERENCE] 🧠` (Indicates state machine correction).
3. Ensure the device is running the latest HOBEIAN firmware (App Version >= 74 recommended).

---
*Created by Antigravity AI for Universal Tuya Zigbee v8.2.0*
