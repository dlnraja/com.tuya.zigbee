# Tuya Unified Zigbee App for Homey

<!-- AUTO-UPDATED: Do not edit badges manually - updated by GitHub Actions -->
[![Version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fdlnraja%2Fcom.tuya.zigbee%2Fmaster%2Fapp.json&query=%24.version&label=version&color=blue)](https://homey.app/a/com.dlnraja.tuya.zigbee/)
[![Fingerprints](https://img.shields.io/badge/fingerprints-11,042+-green)](https://homey.app/a/com.dlnraja.tuya.zigbee/)
[![Drivers](https://img.shields.io/badge/drivers-230-brightgreen)](https://homey.app/a/com.dlnraja.tuya.zigbee/)
[![Flow Cards](https://img.shields.io/badge/flow%20cards-2,457-blue)](https://homey.app/a/com.dlnraja.tuya.zigbee/)
[![SDK](https://img.shields.io/badge/SDK-3-orange)](https://homey.app/a/com.dlnraja.tuya.zigbee/)
[![License](https://img.shields.io/badge/license-GPL--3.0-red)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/LICENSE)
[![Homey](https://img.shields.io/badge/Homey-Pro-blueviolet)](https://homey.app/a/com.dlnraja.tuya.zigbee/)

A community-driven Homey app that brings local control to Tuya Zigbee devices — no cloud, no internet needed. Covers switches, sensors, lights, thermostats, covers, locks, and more across **230 drivers** and **11,042+ device fingerprints**.

**Key features:**
- **Local-only** — everything runs on your Homey, nothing goes to the cloud
- **Hybrid mode** — auto-detects whether a device speaks Tuya DP or standard ZCL
- **Smart battery** — voltage-based fallback when devices don't report percentage
- **2,457+ flow cards** — triggers, conditions & actions in EN, FR, NL, DE
- **SDK3** — built on the latest Homey platform

---

## Installation

| Method | Link |
|--------|------|
| **Homey App Store** | [Install from Homey App Store](https://homey.app/a/com.tuya.zigbee/) |
| **Test Version** | [Install Test Version](https://homey.app/a/com.tuya.zigbee/test/) |
| **GitHub Releases** | [View Releases](https://github.com/dlnraja/com.tuya.zigbee/releases) |

---

## 🚀 Latest Updates

<!-- CHANGELOG_START - Auto-updated from .homeychangelog.json -->
### ✨ Recent Changes (May 2026)

| Version | Feature |
|---------|---------|
| **v7.5.49** | v7.5.48: clamp_meter: corrected incoherent watt/voltage scaling using safeDiv... |
| **v7.5.48** | Bug fix: clamp meter watt/voltage scaling corrected. New fingerprints added a... |
| **v7.5.47** | v7.5.46: No changes. |
| **v7.5.46** | v7.5.46 - Maintenance release. No new devices or fixes. |
| **v7.5.45** | Bug fixes across 7 drivers including humidifier, motion_sensor_2, dimmer_dual... |
| **v7.5.44** | Bug fixes for wireless buttons, remote buttons, and scene switches. Critical ... |
| **v7.5.43** | Bug fixes: wall flow cards on multi-gang switches, wireless button reliabilit... |
| **v7.5.42** | v7.5.41: Fixed battery endpoint scan handling for better battery device detec... |
| **v7.5.41** | v7.5.41 - 3,202 new fingerprints from ZHA, Z2M, Z-Link and ZCT. Battery endpo... |
| **v7.5.40** | Bug fix: Empty battery reports on sleepy devices resolved with adaptive batte... |
<!-- CHANGELOG_END -->




## Statistics

| Metric | Value |
|--------|-------|
| **App Version** | v7.5.50 |
| **Device Fingerprints** | 11,042+ |
| **Unique Product IDs** | 560 |
| **Drivers** | 230 (180 Zigbee + 50 WiFi) |
| **Flow Cards** | 2,457 |
| **Unique Capabilities** | 138 |
| **SVG Icons** | 390 |
| **Languages** | EN, FR, NL, DE |
| **SDK Version** | 3 |
| **Homey Compatibility** | >=12.2.0 |
| **Last Updated** | 2026-05-20 |

### Top 20 Drivers by Fingerprint Count

| # | Driver | Fingerprints |
|---|--------|-------------|
| 1 | `climate_sensor` | 2,028 |
| 2 | `switch_1gang` | 1,008 |
| 3 | `radiator_valve` | 524 |
| 4 | `plug_energy_monitor` | 445 |
| 5 | `dimmer_wall_1gang` | 372 |
| 6 | `curtain_motor` | 352 |
| 7 | `generic_tuya` | 352 |
| 8 | `presence_sensor_radar` | 300 |
| 9 | `contact_sensor` | 267 |
| 10 | `bulb_rgbw` | 259 |
| 11 | `switch_2gang` | 252 |
| 12 | `motion_sensor` | 251 |
| 13 | `switch_4gang` | 236 |
| 14 | `generic_diy` | 225 |
| 15 | `diy_custom_zigbee` | 206 |
| 16 | `thermostat_tuya_dp` | 201 |
| 17 | `switch_3gang` | 184 |
| 18 | `bulb_tunable_white` | 138 |
| 19 | `water_leak_sensor` | 136 |
| 20 | `bulb_dimmable` | 120 |

### Drivers by Device Class

| Class | Count |
|-------|-------|
| sensor | 61 |
| socket | 54 |
| light | 24 |
| other | 19 |
| thermostat | 18 |
| remote | 17 |
| fan | 10 |
| windowcoverings | 5 |
| doorbell | 4 |
| lock | 4 |
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
| **v7.5.50** | v7.5.49: Added `pir_mmwave_sensor` driver for microwave motion sensors (presence_sensor_radar alternative)., Phoenix ... |
| **v7.5.49** | New driver: presence sensor microwave (pir_mmwave_sensor). New fingerprints via Phoenix Sovereign v8.1.0. SONOFF case... |
| **v7.5.48** | Bug fix: clamp meter watt/voltage scaling corrected. New fingerprints added across multiple drivers. Flow repair tool... |
| **v7.5.47** | v7.5.46: No changes. |
| **v7.5.46** | v7.5.46 - Maintenance release. No new devices or fixes. |
| **v7.5.45** | Bug fixes across 7 drivers including humidifier, motion_sensor_2, dimmer_dual_channel, smart_button_switch, and pet_f... |
| **v7.5.44** | Bug fixes for wireless buttons, remote buttons, and scene switches. Critical runtime errors resolved in button devices. |
| **v7.5.43** | Bug fixes: wall flow cards on multi-gang switches, wireless button reliability, climate sensor battery/pressure, part... |
| **v7.5.42** | v7.5.41: Fixed battery endpoint scan handling for better battery device detection, Fixed Fingerbot capability registr... |
| **v7.5.41** | v7.5.41 - 3,202 new fingerprints from ZHA, Z2M, Z-Link and ZCT. Battery endpoint scan fix, Fingerbot capability timin... |
| **v7.5.40** | Bug fix: Empty battery reports on sleepy devices resolved with adaptive battery listeners and ZCL/IAS fallbacks. |
| **v7.5.39** | Updated 3202 fingerprints across 228 drivers. Added new device support and minor fixes. |
| **v7.5.38** | No user-facing changes in this release. |
| **v7.5.37** | Fix all runtime syntax errors, resolve unclosed braces, add support for wall_remote_2_gang assets and validate SDK3 c... |
| **v7.5.35** | v7.5.34: Fixed condition card registration in `air_quality_comprehensive` and `din_rail_meter` drivers (resolved runt... |

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
       └─ 230 Drivers ─ 11,042+ fingerprints
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

*Last updated: 2026-05-20*
