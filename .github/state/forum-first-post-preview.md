# 🏠 Universal Tuya Zigbee v7.5.13

> **221 drivers** · **10821+ fingerprints** · Updated 2026-05-11

Local-first Zigbee control for Tuya devices on Homey Pro — the most comprehensive Tuya app available.

## Install

**Stable:** [Homey App Store](https://homey.app/a/com.dlnraja.tuya.zigbee/) · **Test:** [Test Channel](https://homey.app/a/com.dlnraja.tuya.zigbee/test/) · **Source:** [GitHub](https://github.com/dlnraja/com.tuya.zigbee)

## What's New (v7.5.13)

Fixed sensor fallback check for unknown model IDs to prevent incorrect capability assignments, Cleaned up HybridSensorBase exports to remove unused draft scripts, Updated documentation, project rules, and configuration files for better developer experience, Refreshed fingerprint cross-reference and project status docs, Added support for Nedis SmartLife Radiator Control (_TZE284_ne4pikwm /

## Supported Devices

| Category | Drivers | FPs |
|---|---|---|
| 🔌 Socket | 50 | 2563 |
| 💡 Light | 23 | 1193 |
| 📡 Sensor | 58 | 4335 |
| 🌡️ Thermostat | 18 | 900 |
| 🪟 Windowcoverings | 5 | 478 |
| 🔐 Lock | 4 | 66 |
| 🌀 Fan | 10 | 111 |
| 🔔 Doorbell | 4 | 27 |
| 🎮 Remote | 17 | 156 |
| 🔘 Button | 2 | 27 |
| 🔥 Heater | 4 | 36 |
| 🚗 Garagedoor | 3 | 39 |
| 📦 Other | 18 | 887 |
| 📦 Curtain | 2 | 3 |

[Device Finder](https://dlnraja.github.io/com.tuya.zigbee/) — search by fingerprint

## Features

- **Tuya DP protocol** (0xEF00/TS0601) + **Standard ZCL** clusters
- Physical button detection · Virtual buttons · LED backlight control
- Energy monitoring (W/V/A) · Air quality sensors (CO₂/VOC/PM2.5/HCHO)
- Covers & curtains with tilt · TRVs · Dimmers · IR blasters
- Auto-configured settings · Diagnostic reports

## Changelog

<details><summary>Previous versions</summary>

**v7.5.12:** . Fixed sensor fallback logic for unknown models. Added new fingerprints for radiator valve (_TZE284_ne4pikwm). Updated documentation and project rules.

**v7.5.11:** Fixed ReferenceError crashes in HybridSensorBase, HybridCoverBase, HybridLightBase, HybridPlugBase, HybridSwitchBase, and HybridThermostatBase during dynamic capability updates.

**v7.5.10:** Fixed a crash in HybridSensorBase that caused a ReferenceError on _safeSetCapability. Added support for Nedis SmartLife Radiator Control (_TZE284_ne4pikwm).

**v7.5.9:** . Fixed ProtocolArbitrator crash, _TZE608 opener reclassification, SDK3 validation errors, duplicate fingerprints, case-insensitive matching, and MODULE_NOT_FOUND crash. Added 5 new fingerprints, Z2M enriched mappings, rain/soil sensor fixes.

</details>

## Report a Bug

Open a [GitHub Issue](https://github.com/dlnraja/com.tuya.zigbee/issues/new) — please include your `_TZxxxx` fingerprint and `TSxxxx` model ID.

## ☕ Support the Project

This app is free and open-source. If it's useful to you, a small donation helps keep it going:

**PayPal:** [paypal.me/dlnraja](https://paypal.me/dlnraja) · **Revolut:** [revolut.me/dylanoul](https://revolut.me/dylanoul)

---
*Last updated 2026-05-11 — [Source on GitHub](https://github.com/dlnraja/com.tuya.zigbee)*
