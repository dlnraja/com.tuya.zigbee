# Universal Tuya Zigbee App for Homey

<!-- AUTO-UPDATED: Do not edit badges manually - updated by GitHub Actions -->
[![Version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fdlnraja%2Fcom.tuya.zigbee%2Fmaster%2Fapp.json&query=%24.version&label=version&color=blue)](https://homey.app/a/com.dlnraja.tuya.zigbee/)
[![Fingerprints](https://img.shields.io/badge/fingerprints-5,363+-green)](https://homey.app/a/com.dlnraja.tuya.zigbee/)
[![Drivers](https://img.shields.io/badge/drivers-143-brightgreen)](https://homey.app/a/com.dlnraja.tuya.zigbee/)
[![Flow Cards](https://img.shields.io/badge/flow%20cards-1,810-blue)](https://homey.app/a/com.dlnraja.tuya.zigbee/)
[![SDK](https://img.shields.io/badge/SDK-3-orange)](https://homey.app/a/com.dlnraja.tuya.zigbee/)
[![License](https://img.shields.io/badge/license-GPL--3.0-red)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/LICENSE)
[![Homey](https://img.shields.io/badge/Homey-Pro-blueviolet)](https://homey.app/a/com.dlnraja.tuya.zigbee/)

A community-driven Homey app that brings local control to Tuya Zigbee devices — no cloud, no internet needed. Covers switches, sensors, lights, thermostats, covers, locks, and more across **143 drivers** and **5,363+ device fingerprints**.

**Key features:**
- **Local-only** — everything runs on your Homey, nothing goes to the cloud
- **Hybrid mode** — auto-detects whether a device speaks Tuya DP or standard ZCL
- **Smart battery** — voltage-based fallback when devices don't report percentage
- **1,810+ flow cards** — triggers, conditions & actions in EN, FR, NL, DE
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
| **Device Fingerprints** | 5,363+ |
| **Unique Product IDs** | 508 |
| **Drivers** | 143 (116 Zigbee + 27 WiFi) |
| **Flow Cards** | 1,810 |
| **Unique Capabilities** | 112 |
| **SVG Icons** | 240 |
| **Languages** | EN, FR, NL, DE |
| **SDK Version** | 3 |
| **Homey Compatibility** | >=12.2.0 |
| **Last Updated** | 2026-03-03 |

### Top 20 Drivers by Fingerprint Count

| # | Driver | Fingerprints |
|---|--------|-------------|
| 1 | `climate_sensor` | 1,577 |
| 2 | `radiator_valve` | 277 |
| 3 | `generic_tuya` | 263 |
| 4 | `switch_1gang` | 260 |
| 5 | `curtain_motor` | 241 |
| 6 | `thermostat_tuya_dp` | 185 |
| 7 | `dimmer_wall_1gang` | 155 |
| 8 | `contact_sensor` | 151 |
| 9 | `motion_sensor` | 134 |
| 10 | `bulb_rgb` | 115 |
| 11 | `plug_energy_monitor` | 106 |
| 12 | `switch_2gang` | 104 |
| 13 | `diy_custom_zigbee` | 103 |
| 14 | `presence_sensor_radar` | 103 |
| 15 | `water_leak_sensor` | 88 |
| 16 | `bulb_rgbw` | 80 |
| 17 | `switch_4gang` | 75 |
| 18 | `switch_3gang` | 71 |
| 19 | `bulb_dimmable` | 52 |
| 20 | `bulb_tunable_white` | 49 |

### Drivers by Device Class

| Class | Count |
|-------|-------|
| sensor | 42 |
| socket | 31 |
| light | 18 |
| other | 14 |
| fan | 9 |
| thermostat | 7 |
| lock | 4 |
| heater | 4 |
| windowcoverings | 3 |
| button | 2 |
| doorbell | 2 |
| garagedoor | 2 |
| remote | 2 |
| curtain | 1 |
| vacuumcleaner | 1 |
| speaker | 1 |

---

## Latest Updates

<!-- CHANGELOG_START - Auto-updated from .homeychangelog.json -->

| Version | Changes |
|---------|---------|
| **v5.11.32** | Updated Universal Tuya Zigbee app to v5.11.32 with 143 drivers and 3057 fingerprints. |
| **v5.11.31** | Universal Tuya Zigbee app v5.11.31: Updated drivers and improved documentation. |
| **v5.11.30** | Universal Tuya Zigbee app v5.11.30: Re-enabled read-only forum intel, fixed driver misplacement, and updated 143 driv... |
| **v5.11.29** | Universal Tuya Zigbee app v5.11.29: Cleanup of scripts and workflows. |
| **v5.11.28** | Updated to v5.11.28 with 143 drivers and 3062 fingerprints. Includes script fixes for forum post editing. |
| **v5.11.27** | Universal Tuya Zigbee app v5.11.27: Added new AI providers and improved forum management. |
| **v5.11.26** | Fixed forum duplication issues and improved AI ensemble routing for better task classification. |
| **v5.11.25** | v5.11.25: Fixed voltage divisor in driver #137 — readings were off by a factor of 10 on some plug variants., Dashboar... |
| **v5.11.24** | v5.11.24: Fixed a workflow trigger race condition. Forum scanner now covers 12 topics. Better diagnostics tracking be... |
| **v5.11.23** | v5.11.23: Switched post-forum-update to fetchWithRetry (fixes random post failures). RawClusterFallback for non-Tuya-... |
| **v5.11.22** | v5.11.22: 8 new fingerprints from JohanBendz scan. Device Finder tool. Forum auth now handles 404/401 gracefully. |
| **v5.11.21** | v5.11.21: IR Blaster learning fix, energy divisors, soil moisture fix. (1) IR Blaster ZS06 manual cluster fallback fo... |
| **v5.11.20** | See .homeychangelog.json for details |
| **v5.11.19** | v5.11.19: Soil sensor compound frame guards, curtain motor physical button fix, CI/CD overhaul with auto-publish. |
| **v5.11.18** | Auto-publish via GitHub Actions |

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
  └─ Universal Tuya Zigbee App (SDK3)
       ├─ Hybrid Protocol Engine
       │    ├─ Tuya DP (Cluster 0xEF00) ─ DP1-DP255 data points
       │    └─ Standard ZCL ─ onOff, levelControl, colorControl, etc.
       ├─ DeviceProfileRegistry (149 profiles)
       │    └─ Per-fingerprint: DP mappings, quirks, timing
       ├─ BatteryManager (8 chemistries, voltage fallback)
       ├─ PhysicalButtonMixin (2000ms detection)
       └─ 143 Drivers ─ 5,363+ fingerprints
```

---

## Data Sources

| Source | Usage |
|--------|-------|
| **[Zigbee2MQTT](https://www.zigbee2mqtt.io)** | Device discovery, DP mappings, manufacturer names |
| **[Blakadder](https://zigbee.blakadder.com)** | Cross-checking rebranded Tuya devices |
| **[ZHA / zigpy](https://github.com/zigpy/zha-device-handlers)** | Device signatures, custom quirks |
| **[deCONZ](https://github.com/dresden-elektronik/deconz-rest-plugin)** | REST plugin device data |
| **[kkossev / Hubitat](https://github.com/kkossev/Hubitat)** | Tuya DP research, mmWave radar profiles |
| **[Tasmota](https://github.com/arendst/Tasmota)** | Tuya device research, DP documentation |
| **[CSA](https://csa-iot.org)** | Zigbee 3.0 certified products |
| **[Homey Community Forum](https://community.homey.app)** | User reports, device interviews |
| **[JohanBendz Fork](https://github.com/JohanBendz/com.tuya.zigbee)** | Original app & community contributions |

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
| **App Store** | [Universal Tuya Zigbee](https://homey.app/a/com.dlnraja.tuya.zigbee/) |
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
1. Go to **Settings > Apps > Universal Tuya Zigbee > Send Diagnostics**
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

A massive thank you to everyone who makes this possible:

### Source Projects
- **[JohanBendz](https://github.com/JohanBendz/com.tuya.zigbee)** — Original Tuya Zigbee Homey app. His architecture and fingerprint collection laid the foundation. Merci Johan!
- **[Athom B.V.](https://athom.com)** — Homey platform, SDK3 & Zigbee stack
- **[Koenkk / Zigbee2MQTT](https://github.com/Koenkk/zigbee2mqtt)** — The largest Zigbee device database, DP mappings & converters
- **[blakadder](https://zigbee.blakadder.com)** — Zigbee Device Compatibility Repository for Tuya OEM cross-references
- **[zigpy / ZHA](https://github.com/zigpy/zha-device-handlers)** — Python quirks, device signatures & Home Assistant integration
- **[kkossev / Hubitat](https://github.com/kkossev/Hubitat)** — Tuya DP research, mmWave radar profiles, deviceProfileV4 mappings
- **[dresden-elektronik / deCONZ](https://github.com/dresden-elektronik)** — ConBee hardware & REST plugin docs
- **[Tasmota](https://github.com/arendst/Tasmota)** — Cross-platform Tuya device research & DP documentation
- **[CSA](https://csa-iot.org)** — Zigbee 3.0 protocol specifications

### GitHub Contributors
[@mayconbordin](https://github.com/mayconbordin), [@kodalissri](https://github.com/kodalissri), [@IsaacNZ2](https://github.com/IsaacNZ2), [@pkuijpers](https://github.com/pkuijpers), [@willarentz](https://github.com/willarentz) — fingerprints & fork contributions

### Homey Community Forum
Lasse_K, Rudy_De_Vylder, Peter_van_Werkhoven, Karsten_Hille, FrankP, ManuelKugler, Nicolas, blutch32, PacketNinja — bug reports, diagnostics, testing & fixes that directly improved the app

All users on the **[Homey Community Forum](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352)** who share device logs, diagnostics, and fingerprints — you are the backbone of this project

> Full credits with all contributor fingerprints: [docs/CREDITS.md](./docs/CREDITS.md)

---

## License

**GPL-3.0** - See [LICENSE](./LICENSE) file

| Project | License |
|---------|---------|
| Zigbee2MQTT | GPL-3.0 |
| ZHA / zigpy | Apache-2.0 |
| Blakadder | MIT |
| deCONZ | BSD-3-Clause |
| kkossev/Hubitat | Apache-2.0 |
| Tasmota | GPL-3.0 |

---

**Made with love by Dylan Rajasekaram & the Zigbee community**

*Last updated: 2026-03-02*
