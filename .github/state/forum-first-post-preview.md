# 🏠 Universal Tuya Zigbee v7.5.16

> **228 drivers** · **10854+ fingerprints** · Updated 2026-05-12

Local-first Zigbee control for Tuya devices on Homey Pro — the most comprehensive Tuya app available.

## Install

**Stable:** [Homey App Store](https://homey.app/a/com.dlnraja.tuya.zigbee/) · **Test:** [Test Channel](https://homey.app/a/com.dlnraja.tuya.zigbee/test/) · **Source:** [GitHub](https://github.com/dlnraja/com.tuya.zigbee)

## What's New (v7.5.16)

Fixed broken require paths in siren sensor driver. Added Virtual Telemetry Compensation Engine for dynamic device calibration. Enhanced ButtonDevice handling. Added new device fingerprints. Now .

## Supported Devices

| Category | Drivers | FPs |
|---|---|---|
| 🔌 Socket | 53 | 2536 |
| 💡 Light | 24 | 1191 |
| 📡 Sensor | 60 | 4398 |
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

**v7.5.17:** Added support for new devices:
- bulb_dimmable (_TYZB01_bngwdjsr / TS0501A,TS0501B,TS110E,TS110F,LED1623G12,LED1649C5,LED1836G9,LWB004,LWB006,LWB010,LWB014,Plug 01,A19 W 10 year,BR30 W 10 year,PAR38 W 10 year,GL-B-001Z,RS 125,RB 165,RB 175 W,ZBT-DimmableLight,TS0052,TS1101)
- button_wireless_2 (_tyzb01_hlla45kx, _TYZB01_HLLA45KX, _tyzb01_iuepbmpv, _TYZB01_IUEPBMPV, _tyzb01_phjeraqq, _TYZB01_PHJERAQQ, _tyzb01_ncutbjdi, _TYZB01_NCUTBJDI, _tyzb01_aneiicmq, _TYZB01_ANEIICMQ, _tyz... and more.

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
*Last updated 2026-05-12 — [Source on GitHub](https://github.com/dlnraja/com.tuya.zigbee)*
