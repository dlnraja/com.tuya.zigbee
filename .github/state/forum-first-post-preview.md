# Universal Tuya Zigbee v5.11.26

> **143 drivers** | **5368+ fingerprints** | Updated 2026-03-01

The most comprehensive Tuya Zigbee app for Homey Pro.

## Install

**Stable:** [Homey App Store](https://homey.app/a/com.dlnraja.tuya.zigbee/) · **Test:** [Test Channel](https://homey.app/a/com.dlnraja.tuya.zigbee/test/) · **Source:** [GitHub](https://github.com/dlnraja/com.tuya.zigbee)

## Latest (v5.11.26)

v5.11.25: Fixed voltage divisor in driver #137 — readings were off by a factor of 10 on some plug variants., Dashboard fallback rewrite — device tiles now update properly when the primary state channel drops., 17 new fingerprints from community contributions (138 drivers, 5182+ total FPs)., Internal cleanup across several workflow scripts.

## GitHub Activity

- **Issues scanned:** 1162
- **PRs scanned:** 180
- **Issues with FPs:** 925


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
| 📦 Curtain | 1 | 0 |
| 📦 Vacuumcleaner | 1 | 0 |
| 📦 Speaker | 1 | 0 |

[Device Finder](https://dlnraja.github.io/com.tuya.zigbee/) — search by fingerprint

## Features

- **Tuya DP** (0xEF00/TS0601) + **Standard ZCL** (TS0001–TS0504, TS011F)
- BSEED/Zemismart ZCL-only · Physical button detection · Virtual buttons
- Energy monitoring (W/V/A) · Air quality (CO2/VOC/PM2.5/HCHO) · Cover/curtain with tilt
- LED backlight control · Diagnostic reports · Auto-configured settings

## Changelog

<details><summary>Previous versions</summary>

**v5.11.25:** Fixed voltage divisor in driver #137 — readings were off by a factor of 10 on some plug variants., Dashboard fallback rewrite — device tiles now update properly when the primary state channel drops., 17 new fingerprints from community contributions (138 drivers, 5182+ total FPs)., Internal cleanup across several workflow scripts.

**v5.11.24:** Fixed a workflow trigger race condition. Forum scanner now covers 12 topics. Better diagnostics tracking between runs.

**v5.11.23:** Switched post-forum-update to fetchWithRetry (fixes random post failures). RawClusterFallback for non-Tuya-DP devices. Forum deduplication so the same post doesn't get answered twice.

**v5.11.22:** 8 new fingerprints from JohanBendz scan. Device Finder tool. Forum auth now handles 404/401 gracefully.

</details>

## Report Issues

[GitHub Issues](https://github.com/dlnraja/com.tuya.zigbee/issues/new) — include `_TZxxxx` fingerprint + `TSxxxx` model

## Support the Project

If this app is useful to you, consider a small donation:
- **PayPal:** [paypal.me/dlnraja](https://paypal.me/dlnraja)
- **Revolut:** [revolut.me/dlnraja](https://revolut.me/dlnraja)

---
*Auto-updated 2026-03-01*
