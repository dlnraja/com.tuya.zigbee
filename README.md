# Tuya Unified Zigbee App for Homey

<!-- AUTO-UPDATED: Do not edit badges manually - updated by GitHub Actions -->
[![Version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fdlnraja%2Fcom.tuya.zigbee%2Fmaster%2Fapp.json&query=%24.version&label=version&color=blue)](https://homey.app/a/com.dlnraja.tuya.zigbee/)
[![Fingerprints](https://img.shields.io/badge/fingerprints-29,249+-green)](https://homey.app/a/com.dlnraja.tuya.zigbee/)
[![Drivers](https://img.shields.io/badge/drivers-411-brightgreen)](https://homey.app/a/com.dlnraja.tuya.zigbee/)
[![Flow Cards](https://img.shields.io/badge/flow%20cards-4,027-blue)](https://homey.app/a/com.dlnraja.tuya.zigbee/)
[![SDK](https://img.shields.io/badge/SDK-3-orange)](https://homey.app/a/com.dlnraja.tuya.zigbee/)
[![License](https://img.shields.io/badge/license-GPL--3.0-red)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/LICENSE)
[![Homey](https://img.shields.io/badge/Homey-Pro-blueviolet)](https://homey.app/a/com.dlnraja.tuya.zigbee/)

A community-driven Homey app that brings local control to Tuya Zigbee devices — no cloud, no internet needed. Covers switches, sensors, lights, thermostats, covers, locks, and more across **411 drivers** and **29,249+ device fingerprints**.

**Key features:**
- **Local-only** — everything runs on your Homey, nothing goes to the cloud
- **Hybrid mode** — auto-detects whether a device speaks Tuya DP or standard ZCL
- **Smart battery** — voltage-based fallback when devices don't report percentage
- **4,027+ flow cards** — triggers, conditions & actions in EN, FR, NL, DE
- **SDK3** — built on the latest Homey platform

---

## Installation

| Method | Link |
|--------|------|
| **Homey App Store** | [Install from Homey App Store](https://homey.app/a/com.tuya.zigbee/) |
| **Test Version** | [Install Test Version](https://homey.app/a/com.tuya.zigbee/test/) |
| **GitHub Releases** | [View Releases](https://github.com/dlnraja/com.tuya.zigbee/releases) |

---

## Statistics

| Metric | Value |
|--------|-------|
| **App Version** | v8.1.34 |
| **Device Fingerprints** | 29,249+ |
| **Unique Product IDs** | 499 |
| **Drivers** | 411 (361 Zigbee + 50 WiFi) |
| **Flow Cards** | 4,027 |
| **Unique Capabilities** | 119 |
| **SVG Icons** | 703 |
| **Languages** | EN, FR, NL, DE |
| **SDK Version** | 3 |
| **Homey Compatibility** | >=12.2.0 |
| **Last Updated** | 2026-05-30 |

### Top 20 Drivers by Fingerprint Count

| # | Driver | Fingerprints |
|---|--------|-------------|
| 1 | `climate_sensor` | 2,127 |
| 2 | `climate_sensor_energy` | 2,127 |
| 3 | `lcdtemphumidsensor_2` | 2,127 |
| 4 | `sensor_climate_temphumidsensor` | 2,127 |
| 5 | `relay_board_1_channel` | 1,293 |
| 6 | `smart_switch` | 1,293 |
| 7 | `sr_zs_switch` | 1,293 |
| 8 | `switch_1gang` | 1,293 |
| 9 | `wall_switch_1_gang_tuya` | 1,293 |
| 10 | `wall_switch_5_gang_tuya` | 1,293 |
| 11 | `bulb_dimmable` | 632 |
| 12 | `bulb_dimmable_dimmer` | 632 |
| 13 | `presence_sensor_radar` | 432 |
| 14 | `curtain_module` | 423 |
| 15 | `curtain_motor` | 423 |
| 16 | `radiator_valve` | 416 |
| 17 | `generic_tuya` | 398 |
| 18 | `bed_sensor` | 290 |
| 19 | `motion_sensor` | 290 |
| 20 | `radar_sensor_2` | 290 |

### Drivers by Device Class

| Class | Count |
|-------|-------|
| sensor | 122 |
| socket | 113 |
| light | 57 |
| other | 28 |
| thermostat | 25 |
| remote | 18 |
| fan | 16 |
| windowcoverings | 9 |
| lock | 5 |
| doorbell | 4 |
| heater | 4 |
| garagedoor | 3 |
| button | 2 |
| curtain | 2 |
| camera | 1 |
| vacuumcleaner | 1 |
| speaker | 1 |

---

## Latest Updates

<!-- CHANGELOG_START - Auto-updated from .homeychangelog.json -->

| Version | Changes |
|---------|---------|
| **vv8_5_30** | [object Object] |
| **v9.0.1** | v9.0.0: |
| **v9.0.0** | v8.5.54: |
| **v8.5.54** | v8.5.53: |
| **v8.5.53** | v8.5.52: |
| **v8.5.52** | v8.5.51: |
| **v8.5.51** | v8.5.50: |
| **v8.5.50** | v8.5.49: |
| **v8.5.49** | v8.5.48: |
| **v8.5.48** | v8.5.47: |
| **v8.5.47** | v8.5.46: Fixed 88 empty manufacturerName arrays in driver.compose.json files (DEFINITIVE cleanup), Resolved persisten... |
| **v8.5.46** | v8.5.46: . Cleaned 88 empty manufacturer arrays from driver configs. New fingerprints from community sync. Stability ... |
| **v8.5.45** | v8.5.45: . Bug fixes: empty manufacturerName arrays removed, button_wireless_4 + illuminance_sensor MFs restored. New... |
| **v8.5.44** | v8.5.44: Fixed critical app crash (AggregateError) caused by empty manufacturerName arrays in 75 drivers. Restored 36... |
| **v8.5.43** | v8.5.43: . Fixed button_wireless_4 and illuminance_sensor manufacturer fingerprints. Added 114 new fingerprints from ... |

<!-- CHANGELOG_END -->

---

## Key Features

### Dual Protocol Support
- **Tuya DP Protocol** (Cluster 0xEF00) - For Tuya-specific devices
- **Standard ZCL** - For native Zigbee 3.0 devices
- **Auto-Detection** - Observes device for 15 min, then picks the best protocol

### Smart Battery Management
- 8 battery chemistries supported
- 4 calculation algorithms
- Voltage-based fallback when percentage unavailable

### Energy Monitoring
- Full kWh, W, V, A support
- Configurable ZCL energy divisors
- Auto-removal of unused energy capabilities after 15 min

### Physical Button Detection
- 2000ms timeout-based detection
- Flow triggers for physical button presses per gang
- Deduplication to prevent duplicate triggers

---

## Supported Device Categories

| Category | Examples | Protocol |
|----------|---------|----------|
| **Switches** (1-8 gang) | Wall switches, smart relays, BSEED, Zemismart | ZCL + Tuya DP |
| **Dimmers** | Wall dimmers, LED dimmers, rotary knobs | ZCL + Tuya DP |
| **Lights** | RGB, RGBW, CCT bulbs, LED strips | ZCL |
| **Plugs & Sockets** | Smart plugs, energy monitors, power strips | ZCL + Tuya DP |
| **Sensors** | Temp/humidity, motion, contact, water leak, smoke, air quality | ZCL + Tuya DP |
| **Presence Radars** | mmWave, PIR+radar hybrid, HOBEIAN ZG-204ZM | ZCL + Tuya DP |
| **Thermostats & TRVs** | Radiator valves, floor heating, AVATTO, Moes | Tuya DP |
| **Covers** | Curtain motors, roller blinds, garage doors | Tuya DP + ZCL |
| **Buttons & Remotes** | Scene switches (1-4 button), SOS buttons, rotary | ZCL |
| **Locks** | Smart door locks, fingerprint locks | Tuya DP |
| **Climate** | Air purifiers, fans, IR blasters, humidifiers | Tuya DP |
| **Water** | Valves, tank monitors, garden timers | Tuya DP |
| **WiFi Devices** | Tuya WiFi switches, plugs, sensors (via cloud API) | WiFi/Cloud |

### Supported Brands

> BSEED, Zemismart, Moes, AVATTO, Lonsonho, HOBEIAN, Lidl/Silvercrest, eWeLink/SONOFF, Girier, Benexmart, Owon, and **hundreds more** via Tuya OEM fingerprints.

---

## Architecture

```
Homey Pro
  └─ Tuya Unified Zigbee App (SDK3)
       ├─ Hybrid Protocol Engine
       │    ├─ Tuya DP (Cluster 0xEF00) ─ DP1-DP255 data points
       │    └─ Standard ZCL ─ onOff, levelControl, colorControl, etc.
       ├─ DeviceProfileRegistry (149 profiles)
       │    └─ Per-fingerprint: DP mappings, quirks, timing
       ├─ BatteryManager (8 chemistries, voltage fallback)
       ├─ PhysicalButtonMixin (2000ms detection)
       └─ 411 Drivers ─ 29,249+ fingerprints
```

---

## Data Sources

| Source | Usage |
|--------|-------|
| **[Zigbee2MQTT](https://www.zigbee2mqtt.io)** | Device discovery, DP mappings, manufacturer names |
| **[Blakadder](https://zigbee.blakadder.com)** | Cross-checking rebranded Tuya devices |
| **[ZHA / zigpy](https://github.com/zigpy/zha-device-handlers)** | Device signatures, custom quirks |
| **[deCONZ](https://github.com/dresden-elektronik/deconz-rest-plugin)** | REST plugin device data |
| **[CSA](https://csa-iot.org)** | Zigbee 3.0 certified products |
| **[Homey Community Forum](https://community.homey.app)** | User reports, device interviews |
| **[JohanBendz Fork](https://github.com/JohanBendz/com.tuya.zigbee)** | Community contributions |

---

## Automation Workflows

| Workflow | Schedule | Description |
|----------|----------|-------------|
| **Daily Everything** | Daily 2 AM UTC | Forum + GitHub auto-response with AI |
| **Forum Responder** | Every 6h | Monitors topics 140352, 26439 |
| **GitHub Scanner** | Mon/Thu | Issues, PRs, forks analysis |
| **Enrichment Scanner** | Mon/Thu | Z2M, ZHA, deCONZ, Blakadder sync |
| **Sunday Master** | Sunday 7 AM | Full triage, fork scan, forum scan |
| **Monthly Comprehensive** | 1st of month | Deep scan all sources |

---

## Known Firmware Limitations

| Issue | Affected Devices | Status |
|-------|-----------------|--------|
| **TS0601 Time Sync** | LCD climate sensors (_TZE284_*) | Some firmwares ignore Zigbee time responses |
| **Battery 0%** | TS0044 buttons (_TZ3000_wkai4ga5) | Reports 0% always - firmware bug |
| **Cloud-only devices** | Some TS0601 variants | MCU ignores local Zigbee commands |

> **Re-pairing required** after driver updates to apply new mappings.

---

## Development

### Prerequisites
- Node.js 18+
- Homey CLI: `npm install -g homey`

### Quick Start
```bash
git clone https://github.com/dlnraja/com.tuya.zigbee.git
cd com.tuya.zigbee
npm install
homey app run
```

### Build & Validate
```bash
homey app build
homey app validate --level publish
homey app run
```

---

## Links

| | |
|---|---|
| **App Store** | [Tuya Unified Zigbee](https://homey.app/a/com.dlnraja.tuya.zigbee/) |
| **Test Version** | [Install Test](https://homey.app/a/com.dlnraja.tuya.zigbee/test/) |
| **Forum** | [Community Thread](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352) |
| **Device Finder** | [Smart Device Finder](https://dlnraja.github.io/com.tuya.zigbee/) |
| **GitHub** | [github.com/dlnraja/com.tuya.zigbee](https://github.com/dlnraja/com.tuya.zigbee) |
| **Issues** | [Report a Bug](https://github.com/dlnraja/com.tuya.zigbee/issues) |

---

## FAQ

<details>
<summary><strong>My device shows as "unknown Zigbee device"</strong></summary>

Your device's fingerprint (manufacturerName + productId) is not yet in the app. Open a GitHub issue with your device interview from [Homey Developer Tools](https://tools.developer.homey.app/tools/zigbee).
</details>

<details>
<summary><strong>Device paired but doesn't respond to commands</strong></summary>

1. Try re-pairing the device (remove and add again)
2. Check if it's a Tuya DP device (TS0601) — these need specific DP mappings
3. For BSEED/Zemismart: these are ZCL-only, ensure explicit binding is working
</details>

<details>
<summary><strong>Battery always shows 0%</strong></summary>

Some devices (e.g., TS0044 _TZ3000_wkai4ga5) have a firmware bug that always reports 0%. The app uses voltage-based fallback when available, but some devices don't report voltage either.
</details>

<details>
<summary><strong>Temperature/humidity values are wrong (divided by 10 or 100)</strong></summary>

This is usually a double-division bug. The app auto-detects divisors from Tuya DP values. If values are still wrong after re-pairing, open an issue with your exact manufacturerName.
</details>

<details>
<summary><strong>How to get the test version?</strong></summary>

Install from: [Test Version](https://homey.app/a/com.dlnraja.tuya.zigbee/test/) — this is auto-promoted from draft builds daily.
</details>

---

## Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feat/my-device`)
3. **Validate**: `homey app validate --level publish`
4. **Submit** a pull request with description

### Report a New Device
1. Get a **device interview** from [Homey Developer Tools](https://tools.developer.homey.app/tools/zigbee)
2. Check [Zigbee2MQTT](https://www.zigbee2mqtt.io/supported-devices/) for DP mappings
3. Check [Blakadder](https://zigbee.blakadder.com) for cross-references
4. Open an [issue](https://github.com/dlnraja/com.tuya.zigbee/issues/new?template=01_device_request.yml) with: **manufacturerName**, **modelId**, and **interview data**

### Report a Bug
1. Go to **Settings > Apps > Tuya Unified Zigbee > Send Diagnostics**
2. Open a [bug report](https://github.com/dlnraja/com.tuya.zigbee/issues/new?template=02_bug_report.yml) with: device model, error messages, and diagnostics code

---

## Support This Project

This app is developed in my free time, powered by passion and coffee!

| Method | Link |
|--------|------|
| **PayPal** | [@dlnraja](https://paypal.me/dlnraja) |
| **Revolut** | [Revolut.Me](https://revolut.me/dylanoul) |

100% optional - Your feedback and bug reports are equally valuable!

---

## Credits & Thanks

A massive thank you to the maintainers and contributors of:
- **[Koenkk](https://github.com/Koenkk)** and all contributors to **Zigbee2MQTT**
- **[blakadder](https://github.com/blakadder)** and the Zigbee Device Compatibility Repository
- The **zigpy / ZHA / zha-device-handlers** maintainers
- The **CSA (Connectivity Standards Alliance)** for the Zigbee specifications
- All developers and testers who share device logs, diagnostics, and fingerprints

---

## License

**GPL-3.0** - See [LICENSE](./LICENSE) file

| Project | License |
|---------|---------|
| Zigbee2MQTT | GPL-3.0 |
| ZHA | Apache-2.0 |
| Blakadder | MIT |
| deCONZ | BSD-3-Clause |

---

**Made with love by Dylan Rajasekaram & the Zigbee community**

*Last updated: 2026-05-30*
