# 🏠 Tuya Unified Zigbee v7.5.17

> **228 drivers** · **10856+ fingerprints** · Updated 2026-05-13

Local-first Zigbee control for Tuya devices on Homey Pro — the most comprehensive Tuya app available.

## Install

**Stable:** [Homey App Store](https://homey.app/a/com.dlnraja.tuya.zigbee/) · **Test:** [Test Channel](https://homey.app/a/com.dlnraja.tuya.zigbee/test/) · **Source:** [GitHub](https://github.com/dlnraja/com.tuya.zigbee)

## What's New (v7.5.17)

Fixed backlight mode alignment across multi-gang switch drivers and completed fingerprint case-insensitive self-heal for 356 conflict entries. Added 2 new device interview profiles.

## Supported Devices

| Category | Drivers | FPs |
|---|---|---|
| 🔌 Socket | 53 | 2534 |
| 💡 Light | 24 | 1191 |
| 📡 Sensor | 60 | 4402 |
| 🌡️ Thermostat | 18 | 900 |
| 🪟 Windowcoverings | 5 | 478 |
| 🔐 Lock | 4 | 66 |
| 🌀 Fan | 10 | 116 |
| 🔔 Doorbell | 4 | 27 |
| 🎮 Remote | 18 | 152 |
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

**v7.5.16:** v7.5.16 — . Maintenance release with updated device expectations, diagnostics, and internal state.

**v7.5.15:** Fixed siren sensor driver crashes, added 3,202 new fingerprints, and improved device detection reliability.

**v7.5.14:** . Bug fixes for wireless buttons, climate sensors, radiator valves, and energy meters. Improved device initialization and diagnostics.

**v7.5.13:** . Added new fingerprints for motion sensor, illuminance sensor, 3-gang switch, energy meter, and DIN rail. Fixed INSOMA dual irrigation valve and smart wireless button detection. Improved climate sensor recognition.

</details>

## Report a Bug

Open a [GitHub Issue](https://github.com/dlnraja/com.tuya.zigbee/issues/new) — please include your `_TZxxxx` fingerprint and `TSxxxx` model ID.

## ☕ Support the Project

This app is free and open-source. If it's useful to you, a small donation helps keep it going:

**PayPal:** [paypal.me/dlnraja](https://paypal.me/dlnraja) · **Revolut:** [revolut.me/dylanoul](https://revolut.me/dylanoul)

---
*Last updated 2026-05-13 — [Source on GitHub](https://github.com/dlnraja/com.tuya.zigbee)*
