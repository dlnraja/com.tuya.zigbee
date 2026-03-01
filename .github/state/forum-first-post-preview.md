# 🏠 Universal Tuya Zigbee v5.11.26

> **143 drivers** · **5368+ fingerprints** · Updated 2026-03-01

Local-first Zigbee control for Tuya devices on Homey Pro — the most comprehensive Tuya app available.

## Install

**Stable:** [Homey App Store](https://homey.app/a/com.dlnraja.tuya.zigbee/) · **Test:** [Test Channel](https://homey.app/a/com.dlnraja.tuya.zigbee/test/) · **Source:** [GitHub](https://github.com/dlnraja/com.tuya.zigbee)

## What's New (v5.11.26)

Fixed voltage divisor in driver #137 — readings were off by a factor of 10 on some plug variants., Dashboard fallback rewrite — device tiles now update properly when the primary state channel drops., 17 new fingerprints from community contributions (138 drivers, 5182+ total FPs)., Internal cleanup across several workflow scripts.

## Supported Devices

| Category | Drivers | FPs |
|---|---|---|
| 🔌 Socket | 31 | 776 |
| 💡 Light | 18 | 576 |
| 📡 Sensor | 42 | 2578 |
| 🌡️ Thermostat | 7 | 502 |
| 🪟 Windowcoverings | 3 | 276 |
| 🔐 Lock | 4 | 26 |
| 🌀 Fan | 9 | 46 |
| 🔔 Doorbell | 2 | 10 |
| 🎮 Remote | 2 | 37 |
| 🔘 Button | 2 | 9 |
| 🔥 Heater | 4 | 19 |
| 🚗 Garagedoor | 2 | 8 |
| 📦 Other | 14 | 505 |

[Device Finder](https://dlnraja.github.io/com.tuya.zigbee/) — search by fingerprint

## Features

- **Tuya DP protocol** (0xEF00/TS0601) + **Standard ZCL** clusters
- Physical button detection · Virtual buttons · LED backlight control
- Energy monitoring (W/V/A) · Air quality sensors (CO₂/VOC/PM2.5/HCHO)
- Covers & curtains with tilt · TRVs · Dimmers · IR blasters
- Auto-configured settings · Diagnostic reports

## Changelog

<details><summary>Previous versions</summary>

**v5.11.25:** Fixed voltage divisor in driver #137 — readings were off by a factor of 10 on some plug variants., Dashboard fallback rewrite — device tiles now update properly when the primary state channel drops., 17 new fingerprints from community contributions (138 drivers, 5182+ total FPs)., Internal cleanup across several workflow scripts.

**v5.11.24:** Fixed a workflow trigger race condition. Forum scanner now covers 12 topics. Better diagnostics tracking between runs.

**v5.11.23:** Switched post-forum-update to fetchWithRetry (fixes random post failures). RawClusterFallback for non-Tuya-DP devices. Forum deduplication so the same post doesn't get answered twice.

**v5.11.22:** 8 new fingerprints from JohanBendz scan. Device Finder tool. Forum auth now handles 404/401 gracefully.

</details>

## Report a Bug

Open a [GitHub Issue](https://github.com/dlnraja/com.tuya.zigbee/issues/new) — please include your `_TZxxxx` fingerprint and `TSxxxx` model ID.

## ☕ Support the Project

This app is free and open-source. If it's useful to you, a small donation helps keep it going:

**PayPal:** [paypal.me/dlnraja](https://paypal.me/dlnraja) · **Revolut:** [revolut.me/dylanoul](https://revolut.me/dylanoul)

---
*Last updated 2026-03-01 — [Source on GitHub](https://github.com/dlnraja/com.tuya.zigbee)*
