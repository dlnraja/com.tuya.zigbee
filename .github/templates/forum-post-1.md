# :house: Universal Tuya Zigbee v{{VERSION}}

> **{{DRIVERS}} drivers** · **{{FINGERPRINTS}}+ fingerprints** · **{{FLOW_CARDS}} flow cards** · SDK3 · Updated {{DATE}}

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

## :sparkles: What's New (v{{VERSION}})

{{CHANGELOG_LATEST}}

<details><summary>:scroll: Previous versions</summary>

{{CHANGELOG_PREVIOUS}}

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

<details><summary>:stethoscope: How to get diagnostic logs</summary>

**From Developer Tools:**
1. Go to [tools.developer.homey.app/tools/zigbee](https://tools.developer.homey.app/tools/zigbee)
2. Select your device → click **Interview**
3. Copy the JSON and paste in your bug report

**From Homey App:**
1. Open device → **Settings** (gear icon)
2. Note `zb_manufacturer_name` and `zb_model_id`
3. Screenshot and attach to your report
</details>

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
