# :house: Universal Tuya Zigbee v5.11.138

> **188+ drivers** · **4,700+ fingerprints** · SDK3 · Updated 2026-03-25

Local-first Zigbee control for **all** your Tuya devices on Homey Pro — no cloud, no internet needed.

---

## :inbox_tray: Install

| | |
|---|---|
| :white_check_mark: **Stable** | [Homey App Store](https://homey.app/a/com.dlnraja.tuya.zigbee/) |
| :test_tube: **Test Channel** | [Install Test Version](https://homey.app/a/com.dlnraja.tuya.zigbee/test/) |
| :hammer_and_wrench: **Manual** | [GitHub Source](https://github.com/dlnraja/com.tuya.zigbee) |

<details><summary>:wrench: Manual install from GitHub</summary>

```
git clone https://github.com/dlnraja/com.tuya.zigbee.git
cd com.tuya.zigbee
npm install
homey app install
```
</details>

> :bulb: The test channel gets updates first — new fingerprints and fixes land there before stable.

---

## :sparkles: What's New (v5.11.138)

v5.11.29: Removed one-shot fix-post-now script and workflow to streamline the development process., Updated workflow to improve maintenance and reduce complexity.

<details><summary>:scroll: Previous versions</summary>

**v5.11.29**: Universal Tuya Zigbee app v5.11.29: Cleanup of scripts and workflows.

**v5.11.28**: Updated to v5.11.28 with 143 drivers and 3062 fingerprints. Includes script fixes for forum post editing.

**v5.11.27**: Universal Tuya Zigbee app v5.11.27: Added new AI providers and improved forum management.

**v5.11.26**: Fixed forum duplication issues and improved AI ensemble routing for better task classification.

**v5.11.25**: v5.11.25: Fixed voltage divisor in driver #137 — readings were off by a factor of 10 on some plug variants., Dashboard fallback rewrite — device tiles now update properly when the primary state channel drops., 17 new fingerprints from community contributions (138 drivers, 5182+ total FPs)., Internal cleanup across several workflow scripts.

</details>

---

## :satellite_antenna: Supported Devices

| Category | Examples |
|---|---|
| :electric_plug: **Switches** | 1–6 gang, dimmers, fan switches |
| :bulb: **Lights** | LED strips, bulbs, dimmers |
| :satellite: **Sensors** | Motion, contact, temp, humidity, smoke, water, air quality, soil |
| :thermometer: **Climate** | Thermostats, TRVs, heaters |
| :roller_coaster: **Covers** | Curtains, blinds, garage doors |
| :joystick: **Remotes** | Scene switches, knobs, buttons |
| :zap: **Energy** | Smart plugs with power monitoring |
| :lock: **Security** | Locks, sirens, smoke/gas detectors |
| :seedling: **Garden** | Irrigation, soil sensors |
| :robot_face: **Presence** | Radar / mmWave sensors |
| :desktop_computer: **IR Blasters** | Infrared controllers |

:mag: [Device Finder](https://dlnraja.github.io/com.tuya.zigbee/) — search by manufacturer name or model ID

---

## :gear: Key Features

- :house: **100% local** — no cloud needed
- :repeat: **Hybrid protocol** — Tuya DP + ZCL
- :detective: **Auto-detection** — sets up capabilities automatically
- :joystick: **Physical button detection** — flow triggers on wall press
- :zap: **Energy monitoring** — power, voltage, current
- :battery: **Smart battery** — voltage-based fallback
- :lock: **Child lock & power-on behavior**
- :performing_arts: **1,810+ flow cards** — EN/FR/NL/DE

---

## :bug: Report a Bug

1. Note `zb_manufacturer_name` + `zb_model_id` from device settings
2. Get a [Zigbee Interview](https://tools.developer.homey.app/tools/zigbee)
3. [Open Bug Report](https://github.com/dlnraja/com.tuya.zigbee/issues/new?template=02_bug_report.yml)

---

## :new: Request a New Device

1. Pair your device (may show as unknown)
2. Note `zb_manufacturer_name` + `zb_model_id` from Settings
3. Run [Zigbee Interview](https://tools.developer.homey.app/tools/zigbee)
4. [Open Device Request](https://github.com/dlnraja/com.tuya.zigbee/issues/new?template=01_device_request.yml)

---

## :handshake: Contribute

Fork → branch → add fingerprints → `homey app install` → PR
[GitHub](https://github.com/dlnraja/com.tuya.zigbee)

---

## :link: Links

| | |
|---|---|
| :package: **GitHub** | [dlnraja/com.tuya.zigbee](https://github.com/dlnraja/com.tuya.zigbee) |
| :mag: **Device Finder** | [Search](https://dlnraja.github.io/com.tuya.zigbee/) |
| :books: **Z2M** | [zigbee2mqtt.io](https://www.zigbee2mqtt.io) |
| :card_index: **Blakadder** | [zigbee.blakadder.com](https://zigbee.blakadder.com) |

---

## :heart: Support

| | |
|---|---|
| **PayPal** | [paypal.me/dlnraja](https://paypal.me/dlnraja) |
| **Revolut** | [revolut.me/dylanoul](https://revolut.me/dylanoul) |

---
*Built by [Dylan](https://github.com/dlnraja) — based on the original work of [JohanBendz](https://github.com/JohanBendz/com.tuya.zigbee)*
