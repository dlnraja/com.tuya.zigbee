# Universal Tuya Zigbee App for Homey

<!-- AUTO-UPDATED: Do not edit badges manually - updated by GitHub Actions -->
[![Version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fdlnraja%2Fcom.tuya.zigbee%2Fmaster%2Fapp.json&query=%24.version&label=version&color=blue)](https://homey.app/a/com.dlnraja.tuya.zigbee/)
[![Fingerprints](https://img.shields.io/badge/fingerprints-5,644+-green)](https://homey.app/a/com.dlnraja.tuya.zigbee/)
[![Drivers](https://img.shields.io/badge/drivers-138-brightgreen)](https://homey.app/a/com.dlnraja.tuya.zigbee/)
[![Flow Cards](https://img.shields.io/badge/flow%20cards-1,725-blue)](https://homey.app/a/com.dlnraja.tuya.zigbee/)
[![SDK](https://img.shields.io/badge/SDK-3-orange)](https://homey.app/a/com.dlnraja.tuya.zigbee/)
[![License](https://img.shields.io/badge/license-GPL--3.0-red)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/LICENSE)
[![Homey](https://img.shields.io/badge/Homey-Pro-blueviolet)](https://homey.app/a/com.dlnraja.tuya.zigbee/)

> **🔒 Control your Tuya Zigbee devices locally without cloud!** The most comprehensive Tuya Zigbee app for Homey with **138 drivers**, **5,644+ device fingerprints**, and **1,725+ flow cards**.

## ✨ Key Features

| 🚀 Feature | Description |
|------------|-------------|
| **🏠 100% Local Control** | No Cloud, No Internet Required - Full privacy |
| **🔋 Smart Battery Management** | Accurate readings with voltage fallback curves |
| **🔄 Hybrid Mode** | Auto-detect Tuya DP vs Standard ZCL protocols |
| **📱 SDK3 Compatible** | Latest Homey Standards with modern UI |
| **🌍 Open Source** | Community-driven development with full transparency |
| **⚡ 138 Drivers** | Switches, sensors, lights, thermostats, covers, locks & more |
| **🎛️ 1,725 Flow Cards** | Complete triggers, conditions & actions in 4 languages |
| **🔍 Device Finder** | Web-based tool to identify your devices |
| **📊 Energy Monitoring** | Real-time power, voltage, current tracking |
| **🌡️ Advanced Sensors** | Radar presence, air quality, soil moisture, etc. |

---

## 📦 Installation

| Method | Link |
|--------|------|
| **Homey App Store** | [Install from Homey App Store](https://homey.app/a/com.tuya.zigbee/) |
| **Test Version** | [Install Test Version](https://homey.app/a/com.tuya.zigbee/test/) |
| **GitHub Releases** | [View Releases](https://github.com/dlnraja/com.tuya.zigbee/releases) |

---

## Statistics

| Metric | Value |
|--------|-------|
| **Device Fingerprints** | 5,644+ |
| **Unique Product IDs** | 500 |
| **Drivers** | 138 (116 Zigbee + 22 WiFi) |
| **Flow Cards** | 1,725 |
| **Unique Capabilities** | 109 |
| **SVG Icons** | 240 |
| **Languages** | EN, FR, NL, DE |
| **SDK Version** | 3 |
| **Homey Compatibility** | >=12.2.0 |
| **Last Updated** | 2026-02-25 |

### Top 20 Drivers by Fingerprint Count

| # | Driver | Fingerprints |
|---|--------|-------------|
| 1 | `climate_sensor` | 1,157 |
| 2 | `switch_1gang` | 369 |
| 3 | `dimmer_wall_1gang` | 242 |
| 4 | `radiator_valve` | 237 |
| 5 | `curtain_motor` | 227 |
| 6 | `switch_2gang` | 222 |
| 7 | `contact_sensor` | 221 |
| 8 | `motion_sensor` | 218 |
| 9 | `generic_tuya` | 207 |
| 10 | `switch_4gang` | 194 |
| 11 | `switch_3gang` | 190 |
| 12 | `thermostat_tuya_dp` | 185 |
| 13 | `plug_energy_monitor` | 115 |
| 14 | `bulb_rgb` | 114 |
| 15 | `plug_smart` | 113 |
| 16 | `diy_custom_zigbee` | 103 |
| 17 | `presence_sensor_radar` | 103 |
| 18 | `water_leak_sensor` | 87 |
| 19 | `bulb_rgbw` | 79 |
| 20 | `generic_diy` | 55 |

### Drivers by Device Class

| Class | Count |
|-------|-------|
| sensor | 41 |
| socket | 30 |
| light | 17 |
| other | 14 |
| fan | 8 |
| thermostat | 7 |
| lock | 4 |
| heater | 4 |
| windowcoverings | 3 |
| button | 2 |
| garagedoor | 2 |
| remote | 2 |
| doorbell | 1 |
| curtain | 1 |
| vacuumcleaner | 1 |
| speaker | 1 |

---

## Latest Updates

<!-- CHANGELOG_START - Auto-updated from .homeychangelog.json -->

| Version | Changes |
|---------|---------|
| **v5.11.23** | Universal Tuya Zigbee app v5.11.23 includes improvements to forum response handling and CI/CD pipeline stability. |
| **v5.11.22** | Universal Tuya Zigbee v5.11.22 introduces enhanced forum responsiveness, improved workflow resilience, and updates to... |
| **v5.11.21** | v5.11.21: IR Blaster learning fix, energy divisors, soil moisture fix. (1) IR Blaster ZS06 manual cluster fallback fo... |
| **v5.11.20** | See .homeychangelog.json for details |
| **v5.11.19** | v5.11.19: Soil sensor compound frame guards, curtain motor physical button fix, CI/CD overhaul with auto-publish. |
| **v5.11.18** | Auto-publish via GitHub Actions |
| **v5.11.17** | Auto-publish via GitHub Actions |
| **v5.11.16** | Auto-publish via GitHub Actions |
| **v5.11.15** | Auto-publish via GitHub Actions |
| **v5.11.14** | v5.11.14: WiFi overhaul + bug fixes. (1) Fix settings blank spinner (Homey.ready). (2) New Easy Login: email+password... |
| **v5.11.13** | v5.11.13: Fix presence_sensor_radar log spam (~52K lines/day). (1) Same-value dedup for lux — skip when value unchang... |
| **v5.11.12** | v5.11.12: Critical case-sensitivity fix + WiFi bugs. (1) Fixed 5,004 lowercase manufacturer names (_tz3000_ -> _TZ300... |
| **v5.11.11** | v5.11.11: Fingerprint regression fixes — (1) Removed 5,450 case-duplicate mfrs across 113 drivers. (2) Fixed plug_sma... |
| **v5.11.10** | v5.11.10: Full Zigbee DB sync — crawled Z2M (365 files), ZHA (all quirks), Blakadder, deCONZ. +117 new fingerprints a... |
| **v5.11.9** | v5.11.9: Live DB sync — Z2M+ZHA+deCONZ crawl. +2 water_leak_sensor (TS0207), +6 radiator_valve TRVs (_TYST11_). |

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
| **App Store** | [Universal Tuya Zigbee](https://homey.app/a/com.dlnraja.tuya.zigbee/) |
| **Test Version** | [Install Test](https://homey.app/a/com.dlnraja.tuya.zigbee/test/) |
| **Forum** | [Community Thread](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352) |
| **Device Finder** | [Smart Device Finder](https://dlnraja.github.io/com.tuya.zigbee/) |
| **GitHub** | [github.com/dlnraja/com.tuya.zigbee](https://github.com/dlnraja/com.tuya.zigbee) |
| **Issues** | [Report a Bug](https://github.com/dlnraja/com.tuya.zigbee/issues) |

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Run validation: `homey app validate`
4. Submit a pull request

### Report a Device
1. Get device interview from Homey Developer Tools
2. Check [Zigbee2MQTT](https://www.zigbee2mqtt.io/supported-devices/) for DP mappings
3. Open an issue with manufacturerName, modelId, and interview

---

## Report Issues / Send Diagnostics

### From Homey App
1. Go to **Settings > Apps > Universal Tuya Zigbee**
2. Click **Send Diagnostics Report**
3. Add a description of your issue

### GitHub Issues
1. Go to [GitHub Issues](https://github.com/dlnraja/com.tuya.zigbee/issues)
2. Include: Device model, manufacturerName, error messages

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

*Last updated: 2026-02-25*
