# 🏠 Universal Tuya Zigbee v7.5.14

> **225 drivers** · **10860+ fingerprints** · Updated 2026-05-11

Local-first Zigbee control for Tuya devices on Homey Pro — the most comprehensive Tuya app available.

## Install

**Stable:** [Homey App Store](https://homey.app/a/com.dlnraja.tuya.zigbee/) · **Test:** [Test Channel](https://homey.app/a/com.dlnraja.tuya.zigbee/test/) · **Source:** [GitHub](https://github.com/dlnraja/com.tuya.zigbee)

## What's New (v7.5.14)

Fixed radiator valve and smart radiator valve device initialization issues, Resolved energy meter 3-phase and power clamp meter reporting problems, Corrected presence sensor radar and motion sensor behavior, Fixed climate sensor and climate sensor device recognition, Addressed wireless button (1-gang, 4-gang, smart) pairing and response issues

## Supported Devices

| Category | Drivers | FPs |
|---|---|---|
| 🔌 Socket | 51 | 2533 |
| 💡 Light | 24 | 1193 |
| 📡 Sensor | 59 | 4399 |
| 🌡️ Thermostat | 18 | 900 |
| 🪟 Windowcoverings | 5 | 478 |
| 🔐 Lock | 4 | 66 |
| 🌀 Fan | 10 | 116 |
| 🔔 Doorbell | 4 | 27 |
| 🎮 Remote | 18 | 158 |
| 🔘 Button | 2 | 27 |
| 🔥 Heater | 4 | 36 |
| 🚗 Garagedoor | 3 | 39 |
| 📦 Other | 18 | 885 |
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

**v7.5.13:** . Added new fingerprints for motion sensor, illuminance sensor, 3-gang switch, energy meter, and DIN rail. Fixed INSOMA dual irrigation valve and smart wireless button detection. Improved climate sensor recognition.

**v7.5.12:** . Fixed sensor fallback logic for unknown models. Added new fingerprints for radiator valve (_TZE284_ne4pikwm). Updated documentation and project rules.

**v7.5.11:** Fixed ReferenceError crashes in HybridSensorBase, HybridCoverBase, HybridLightBase, HybridPlugBase, HybridSwitchBase, and HybridThermostatBase during dynamic capability updates.

**v7.5.10:** Fixed a crash in HybridSensorBase that caused a ReferenceError on _safeSetCapability. Added support for Nedis SmartLife Radiator Control (_TZE284_ne4pikwm).

</details>

## Report a Bug

Open a [GitHub Issue](https://github.com/dlnraja/com.tuya.zigbee/issues/new) — please include your `_TZxxxx` fingerprint and `TSxxxx` model ID.

## ☕ Support the Project

This app is free and open-source. If it's useful to you, a small donation helps keep it going:

**PayPal:** [paypal.me/dlnraja](https://paypal.me/dlnraja) · **Revolut:** [revolut.me/dylanoul](https://revolut.me/dylanoul)

---
*Last updated 2026-05-11 — [Source on GitHub](https://github.com/dlnraja/com.tuya.zigbee)*
