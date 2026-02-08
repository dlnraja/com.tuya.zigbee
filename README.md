# 🌐 Universal Tuya Zigbee App for Homey

<!-- AUTO-UPDATED: Do not edit badges manually - updated by GitHub Actions -->
[![Version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fdlnraja%2Fcom.tuya.zigbee%2Fmaster%2Fapp.json&query=%24.version&label=version&color=blue)](https://homey.app/a/com.dlnraja.tuya.zigbee/)
[![Fingerprints](https://img.shields.io/badge/fingerprints-42%2C500+-green)](https://homey.app/a/com.dlnraja.tuya.zigbee/)
[![Drivers](https://img.shields.io/badge/drivers-111-brightgreen)](https://homey.app/a/com.dlnraja.tuya.zigbee/)
[![Flow Cards](https://img.shields.io/badge/flow%20cards-1%2C457-blue)](https://homey.app/a/com.dlnraja.tuya.zigbee/)
[![SDK](https://img.shields.io/badge/SDK-3-orange)](https://homey.app/a/com.dlnraja.tuya.zigbee/)
[![License](https://img.shields.io/badge/license-GPL--3.0-red)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/LICENSE)
[![Homey](https://img.shields.io/badge/Homey-Pro-blueviolet)](https://homey.app/a/com.dlnraja.tuya.zigbee/)

## 📥 Installation

| Method | Link |
|--------|------|
| **🏪 Homey App Store** | **[Install from Homey App Store](https://homey.app/a/com.tuya.zigbee/)** |
| **🧪 Test Version** | [Install Test Version](https://homey.app/a/com.tuya.zigbee/test/) |
| **📦 GitHub Releases** | [View Releases](https://github.com/dlnraja/com.tuya.zigbee/releases) |

**Control your Tuya Zigbee devices locally without cloud! The most comprehensive Tuya Zigbee app for Homey with 111 drivers, 42,500+ device fingerprints, and 1,457 flow cards.**

🏠 **100% Local Control** - No Cloud, No Internet Required
🔋 **Smart Battery** - Accurate readings with voltage fallback
⚡ **Hybrid Mode** - Auto-detect Tuya DP vs Standard ZCL
🛠️ **SDK3** - Latest Homey Standards
🌍 **Open Source** - Community-driven development
📱 **111 Drivers** - Switches, sensors, lights, thermostats, covers, locks & more
📋 **1,457 Flow Cards** - Complete triggers, conditions & actions in 4 languages

---

## 📊 Statistics

| Metric | Value |
|--------|-------|
| **Device Fingerprints** | 42,500+ |
| **Unique Product IDs** | 472 |
| **Drivers** | 111 |
| **Flow Cards** | 1,457 |
| **Unique Capabilities** | 99 |
| **SVG Icons** | 197 |
| **Languages** | EN, FR, NL, DE |
| **SDK Version** | 3 |
| **Homey Compatibility** | >=12.2.0 |
| **Last Updated** | 2026-02-07 |

### 📦 Top 15 Drivers by Device IDs

| # | Driver | Total IDs |
|---|--------|-----------|
| 1 | `climate_sensor` | 814 |
| 2 | `switch_1gang` | 522 |
| 3 | `plug_smart` | 213 |
| 4 | `contact_sensor` | 113 |
| 5 | `switch_2gang` | 111 |
| 6 | `motion_sensor` | 108 |
| 7 | `presence_sensor_radar` | 103 |
| 8 | `curtain_motor` | 90 |
| 9 | `switch_4gang` | 89 |
| 10 | `siren` | 82 |
| 11 | `thermostat_ts0601` | 79 |
| 12 | `plug_energy_monitor` | 78 |
| 13 | `air_quality_comprehensive` | 75 |
| 14 | `button_wireless_1` | 75 |
| 15 | `shutter_roller_controller` | 72 |

---

## 🚀 Latest Updates

<!-- CHANGELOG_START - Auto-updated from .homeychangelog.json -->
### ✨ Recent Changes (Feb 2026)

| Version | Feature |
|---------|---------|
| **v5.8.66** | v5.8.66: BUTTON DRIVER ENHANCEMENT + CASE SENSITIVITY FIX — (1) FIX: button_w... |
| **v5.8.65** | v5.8.65: 4x4_PETE DEVICE AUDIT — (1) CRITICAL FIX: _TZE200_3towulqd ZCL-only ... |
| **v5.8.64** | v5.8.64: FIX CURTAIN MOTOR CRASH (expected_cluster_id_number) — HybridCoverBa... |
| **v5.8.67** | v5.8.67: BATTERY RECOGNITION FIX — Fix broken linear voltage-to-percent across all battery device types. Non-linear discharge curves (CR2032, 2xAA, Li-ion). Fix batteryPercentageRemaining /2 bug. 8 fixes across 5 files. |
| **v5.8.66** | v5.8.66: BUTTON DRIVER ENHANCEMENT + CASE FIX — Fix button_wireless_1 missing cluster 0xE000 (#121 _TZ3000_an5rjiwd), fix 84 missing uppercase manufacturer names across 18 drivers (PR #124). |
| **v5.8.65** | v5.8.65: 4x4_PETE DEVICE AUDIT — Fix ZCL-only _TZE200_3towulqd motion blocked (noIasMotion+no DP cluster), fix TZE284_IADRO9BF DP102 fading_time mapped as lux, upgrade radar settings to user-configurable for ZY-M100-S_2 and WZ-M100. |
| **v5.8.64** | v5.8.64: FIX CURTAIN MOTOR CRASH (expected_cluster_id_number) — Remove async from HybridCoverBase.registerCapability. |
| **v5.8.63** | v5.8.63: HOBEIAN DEVICE AUDIT (4x4_Pete) — Fix critical config map collisions... |
| **v5.8.62** | 🔧 v5.8.62: COMPREHENSIVE APP AUDIT — (1) FIX DUPLICATE FINGERPRINTS: Removed... |
| **v5.8.61** | 🔧 v5.8.61: (1) FIX HOBEIAN PIR SENSOR IN RADAR DRIVER (diag 25cbd6ae): HOBEI... |
| **v5.8.60** | 🔧 v5.8.60: (1) FIX TS130F CURTAIN UP/DOWN (Tbao _TZ3000_bs93npae): ZCL windo... |
| **v5.8.59** | 🔧 v5.8.59: FIX SCENE SWITCH FLOW CARDS (Freddyboy) - Physical button presses... |
| **v5.8.58** | 🔧 v5.8.58: FORUM REGRESSION FIXES - (1) FIX water sensor no alarm (Lasse_K):... |
| **v5.8.57** | 🔧 v5.8.57: FIX BLANK MANUFACTURER NAMES - Added ensureManufacturerSettings()... |
<!-- CHANGELOG_END -->

### 🎯 Flow Enrichment v5.5.159-162

Comprehensive flow cards for all major drivers:
- **Sensors:** climate, motion, presence, gas, smoke, contact, water leak
- **Plugs:** power monitoring, standby detection, overload alerts
- **Thermostats:** preset control, heating status, temperature thresholds
- **Sirens:** melody selection (18 options), volume, duration control
- **Switches:** per-gang triggers/actions for 1-3 gang variants

### 🧹 Smart Cleanup v5.5.163-168

- **Energy capabilities** auto-removed after 15min if no data received
- **Duplicate flow cards** removed (motion, contact, SOS, smoke, gas)
- **Cleaner UI** - Homey's built-in capability triggers used where appropriate

### ⚡ Protocol Optimizer v5.5.100+

- Auto-detects best protocol (Tuya DP vs Standard ZCL)
- Observes device for 15 minutes before deciding
- HybridPlugBase: Universal smart plug support

### 📁 Data Sources
- ✅ Zigbee2MQTT (tuya.ts + brand files)
- ✅ ZHA Device Handlers (quirks)
- ✅ deCONZ REST Plugin
- ✅ JohanBendz (164 forks, 1314 issues, 177 PRs)
- ✅ Blakadder Database
- ✅ Homey Community Forum
- ✅ Tuya Developer Portal
- ✅ Complete DP Database (255 DPs documented)

### 🔧 Technical Highlights
- **Dual Protocol Support** - Tuya DP (0xEF00) + Standard ZCL
- **Auto-Detection** - Protocol after 15 min observation
- **Smart Battery** - 8 chemistries, 4 algorithms
- **Energy Monitoring** - Full kWh, W, V, A support

### ⚠️ Known Firmware Limitations

Some Tuya devices have firmware limitations that cannot be resolved by this app:

| Issue | Affected Devices | Status |
|-------|-----------------|--------|
| **TS0601 Time Sync** | LCD climate sensors (_TZE284_vvmbj46n, etc.) | Some firmwares ignore Zigbee time responses and only sync with Tuya cloud gateway |
| **Battery 0%** | TS0044 buttons (_TZ3000_wkai4ga5) | Reports 0% always - firmware bug |
| **Cloud-only devices** | Some TS0601 variants | MCU ignores local Zigbee commands |

**Time Sync Details:**
- The Time cluster (0x000A) is exposed as OUTPUT (device is client)
- Device requests time, doesn't receive push
- **Cooperative firmware**: LCD syncs correctly
- **Hybrid firmware**: Logs OK, LCD not updated
- **Cloud-only firmware**: Cannot fix locally

> 💡 **Re-pairing required** after driver updates to apply new mappings.

## 📦 Installation

### From Homey App Store (Recommended)
**Direct Install Link:** [Install Universal Tuya Zigbee](https://homey.app/a/com.dlnraja.tuya.zigbee/test/)

Or manually:
1. Open Homey app
2. Go to "More" → "Apps"
3. Search for "Universal Tuya Zigbee"
4. Click "Install"

### Quick Links
- 📱 **Test Version:** https://homey.app/a/com.dlnraja.tuya.zigbee/test/
- 🔍 **Device Finder:** https://dlnraja.github.io/com.tuya.zigbee/device-finder.html
- 🐛 **Report Bug:** https://github.com/dlnraja/com.tuya.zigbee/issues
- 📊 **GitHub Actions:** https://github.com/dlnraja/com.tuya.zigbee/actions

### Manual Installation (Development)
```bash
git clone https://github.com/dlnraja/com.tuya.zigbee.git
cd com.tuya.zigbee
npm install
homey app run
```

## 🔧 Development

### Prerequisites
- Node.js 18+
- Homey CLI: `npm install -g homey`

### Build & Validate
```bash
# Build app
homey app build

# Validate (publish level)
homey app validate --level publish

# Run locally
homey app run
```

### Scripts Available
```bash
# Deep coherence check
node scripts/validation/DEEP_COHERENCE_CHECKER.js

# Auto-fix issues
node scripts/validation/DEEP_COHERENCE_FIXER.js

# Update README (automatic)
node scripts/automation/AUTO_README_UPDATER.js

# Safe push & publish
node scripts/deployment/SAFE_PUSH_AND_PUBLISH.js
```

## 📁 Project Structure

```
tuya_repair/
├── drivers/           # 111 Zigbee device drivers
├── lib/              # Shared libraries (HybridPlugBase, TuyaHybridDevice)
├── .homeycompose/    # Homey compose files (capabilities, flow cards)
├── docs/             # Documentation & Device Finder
├── locales/          # Translations (en, fr, de, nl)
└── app.json          # App manifest (auto-generated)
```

---

## 🙏 DATA SOURCES & CREDITS

This app is built on the incredible work of the Zigbee open-source community.

### Canonical Data Sources

- **Zigbee2MQTT – Supported devices & converters**
  Project: https://github.com/Koenkk/zigbee2mqtt
  Docs: https://www.zigbee2mqtt.io/supported-devices/
  Used for:
  - Discovering thousands of Zigbee devices (switches, sensors, TRVs, plugs, LED controllers, etc.).
  - Mapping vendors, models, `zigbeeModel[]` and capabilities.
  - Understanding Tuya / `_TZE200_*` / `_TZ3000_*` behaviour and DP mappings.

- **Blakadder – Zigbee Device Compatibility Repository**
  Project: https://github.com/blakadder/zigbee
  Website: https://zigbee.blakadder.com
  Used for:
  - Cross-checking rebranded Tuya devices against their "true" identity.
  - Comparing support status across Zigbee2MQTT, ZHA, deCONZ, and other stacks.

- **Home Assistant ZHA / zigpy / zha-device-handlers**
  Stack: https://github.com/zigpy/zigpy
  Quirks: https://github.com/zigpy/zha-device-handlers
  Used for:
  - Reading device signatures (manufacturer, model, endpoints, clusters).
  - Studying custom quirks and manufacturer-specific behaviour (Aqara, Tuya, Hue, etc.).

- **Connectivity Standards Alliance (CSA) – Certified Zigbee products**
  Website: https://csa-iot.org
  Used for:
  - Verifying Zigbee-certified products and understanding "clean" Zigbee 3.0 profiles.
  - Identifying major brands (Philips Hue, IKEA, Legrand, Schneider Electric, Bosch, etc.).

### Manufacturers & Brands (Non-Exhaustive)

Universal Tuya Zigbee aims to be compatible with as many Zigbee devices as possible,
including both **native Zigbee 3.0** devices and devices using **proprietary overlays**
(e.g. Tuya DPs, manufacturer-specific clusters).

Typical vendors and ecosystems covered through the above data sources include:

- **Tuya-based brands:** Tuya, Moes, Avatto, Zemismart, BlitzWolf and many Aliexpress rebrands
  (with manufacturer names such as `_TZE200_*`, `_TZ3000_*`, `_TZE284_*`, etc.).
- **"Classic" Zigbee brands:** Philips Hue / Signify, IKEA TRÅDFRI, Aqara / Lumi, Xiaomi MiJia,
  Sonoff / ITEAD, Gledopto, Innr, Osram / LEDVANCE / Sylvania.
- **Professional / residential automation:** Schneider Electric Wiser, Legrand, Niko, Bosch, Siemens.
- **Ecosystems and hubs:** Samsung SmartThings, Amazon Echo (with embedded Zigbee hub), and more.

Because these lists evolve weekly, **Universal Tuya Zigbee does not hard-code a frozen list of
manufacturer names**. Instead, it relies on the above projects as the **living, authoritative
source of truth**, and periodically re-aligns its fingerprints, drivers and Tuya DP mappings.

### Credits & Thanks

A massive thank you to the maintainers and contributors of the following projects:

- **Koenkk** and all contributors to **Zigbee2MQTT**
- **blakadder** and contributors to the Zigbee Device Compatibility Repository
- The **zigpy** / **ZHA** / **zha-device-handlers** maintainers and community
- The **CSA (Connectivity Standards Alliance)** for maintaining the Zigbee specifications
- All developers and testers who share device logs, diagnostics reports, fingerprints,
  and crash-logs for the Universal Tuya Zigbee app (Homey Community & GitHub issues)

Without their work, maintaining a "universal" Zigbee driver set would simply not be possible.

📄 **Full credits:** See [CREDITS.md](./CREDITS.md)
🏭 **Brands database:** See [BRANDS.md](./BRANDS.md)

---

## 🇫🇷 Sources Zigbee & Remerciements (FR)

Universal Tuya Zigbee ne cherche **pas** à recréer l'écosystème Zigbee tout seul dans son coin.
L'application s'appuie sur le travail incroyable de projets open-source et organismes de standardisation
qui maintiennent des **bases de données vivantes** des appareils Zigbee.

### Sources de Données de Référence
- **Zigbee2MQTT** – Appareils supportés & converters (https://www.zigbee2mqtt.io)
- **Blakadder** – Base de compatibilité Zigbee (https://zigbee.blakadder.com)
- **ZHA / zigpy** – Quirks Home Assistant (https://github.com/zigpy/zha-device-handlers)
- **CSA** – Produits Zigbee certifiés (https://csa-iot.org)

### Fabricants & Marques Couverts
- **Marques Tuya:** Tuya, Moes, Avatto, Zemismart, BlitzWolf (manufacturerName: `_TZE200_*`, `_TZ3000_*`, `_TZE284_*`)
- **Marques Zigbee classiques:** Philips Hue, IKEA TRÅDFRI, Aqara, Xiaomi, Sonoff, Gledopto, Innr, Osram
- **Domotique pro:** Schneider Electric Wiser, Legrand, Niko, Bosch, Siemens
- **Écosystèmes:** Samsung SmartThings, Amazon Echo avec hub Zigbee

Ces listes évoluent chaque semaine. **Universal Tuya Zigbee ne fige pas une liste de manufacturerName en dur**,
mais s'appuie sur ces projets comme **sources de vérité vivantes**.

### Remerciements
Merci aux mainteneurs : **Koenkk** (Zigbee2MQTT), **blakadder**, l'équipe **zigpy/ZHA**, la **CSA**,
et tous les testeurs de la communauté Homey.

---

## 🔗 Links

### 🏠 Homey Platform
| | |
|---|---|
| **App Store** | [Universal Tuya Zigbee](https://homey.app/a/com.dlnraja.tuya.zigbee/) |
| **Test App** | [Universal Tuya Zigbee (Test)](https://homey.app/a/com.dlnraja.tuya.zigbee/test/) |
| **Forum** | [Community Thread](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352) |
| **Device Finder** | [Smart Device Finder](https://dlnraja.github.io/com.tuya.zigbee/) |

### 💻 Development
| | |
|---|---|
| **GitHub** | [github.com/dlnraja/com.tuya.zigbee](https://github.com/dlnraja/com.tuya.zigbee) |
| **Issues** | [github.com/dlnraja/com.tuya.zigbee/issues](https://github.com/dlnraja/com.tuya.zigbee/issues) |

### 📚 Documentation
| | |
|---|---|
| **Zigbee2MQTT Docs** | [www.zigbee2mqtt.io](https://www.zigbee2mqtt.io) |
| **Tuya DP Guide** | [zigbee2mqtt.io/advanced/support-new-devices/02_support_new_tuya_devices.html](https://www.zigbee2mqtt.io/advanced/support-new-devices/02_support_new_tuya_devices.html) |
| **ZHA Wiki** | [github.com/zigpy/zha-device-handlers/wiki](https://github.com/zigpy/zha-device-handlers/wiki) |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Run validation: `homey app validate`
4. Submit a pull request

### Report a Device
1. Get device interview from Homey Developer Tools
2. Check [Zigbee2MQTT](https://www.zigbee2mqtt.io/supported-devices/) for DP mappings
3. Open an issue with manufacturerName, modelId, and interview

---

## 📝 License

**GPL-3.0** - See [LICENSE](./LICENSE) file

This project uses data from various open-source projects. All licenses are respected:
- Zigbee2MQTT: GPL-3.0
- ZHA: Apache-2.0
- Blakadder: MIT
- deCONZ: BSD-3-Clause

---

## 🎉 Special Thanks

> **To the entire Zigbee open-source community** - Your tireless work in reverse-engineering thousands of devices has made smart home automation accessible to everyone.

> **To [@Koenkk](https://github.com/Koenkk)** - For creating and maintaining Zigbee2MQTT, the most comprehensive Zigbee device database in existence.

> **To the Homey Community** - For testing, reporting issues, and providing device interviews that make this app better every day.

---

---

## ☕ Support This Project

This app is developed in my free time, powered by passion and coffee!

If you find it useful and want to support continued development:

| Method | Link |
|--------|------|
| **PayPal** | [💳 @dlnraja](https://paypal.me/dlnraja) |
| **Revolut** | [💱 Revolut.Me](https://revolut.me/dylanoul) |

💡 **100% optional** — Your feedback and bug reports are equally valuable!

---

## 📩 Report Issues / Send Diagnostics

### Method 1: From Homey App
1. Go to **Settings → Apps → Universal Tuya Zigbee**
2. Click **Send Diagnostics Report**
3. Add a description of your issue

### Method 2: GitHub Issues
1. Go to [GitHub Issues](https://github.com/dlnraja/com.tuya.zigbee/issues)
2. Click **New Issue**
3. Include: Device model, manufacturerName, error messages

### What to include:
- Device name and model number
- `manufacturerName` (e.g., `_TZE200_xxx`)
- `modelId` (e.g., `TS0601`)
- Error messages from logs
- Screenshot if applicable

---

**Made with ❤️ by Dylan Rajasekaram & the Zigbee community**

*Last updated: 2026-02-07*
