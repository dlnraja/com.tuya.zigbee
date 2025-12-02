# 🌐 Universal Zigbee Device App for Homey

![Version](https://img.shields.io/badge/version-5.3.14-blue)
![Devices](https://img.shields.io/badge/devices-4217+-green)
![SDK](https://img.shields.io/badge/SDK-3-orange)
![License](https://img.shields.io/badge/license-GPL--3.0-red)
![Homey](https://img.shields.io/badge/Homey-Pro-blueviolet)

**The most comprehensive Universal Zigbee app for Homey with 4,217+ device IDs across 79 drivers.**

🏠 **100% Local Control** - No Cloud Required
🔋 **Auto-Detection** - Power Source, Battery Type, Protocol
⚡ **27 Device Categories** - From sensors to smart plugs
🛠️ **SDK3** - Latest Homey Standards
🌍 **Open Source** - Community-driven development

---

## 📊 Statistics

| Metric | Value |
|--------|-------|
| **Total Device IDs** | 4,217+ |
| **Product IDs** | 349 |
| **Manufacturer IDs** | 3,868 |
| **Drivers** | 79 |
| **SVG Icons** | 79 |
| **Enrichment Scripts** | 50+ |
| **SDK Version** | 3 |
| **Homey Compatibility** | >=12.2.0 |
| **Last Updated** | 2025-12-02 |
| **Data Sources** | 7 (auto-updated daily) |

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

## 🚀 Latest Updates - v5.3.14

### ✨ Recent Features
- **v5.3.14** - MEGA REORGANIZATION: 57 drivers fixed, 4217 IDs, daily auto-discovery
- **v5.3.13** - CRITICAL BUG FIXES: Wireless button, rain sensor, curtain motor
- **v5.3.12** - Climax Technology security devices (13 models)
- **v5.3.11** - Worldwide Zigbee brands database (50+ brands)
- **v5.3.10** - 2000+ IDs milestone from Z2M brand files
- **v5.3.9** - MEGA source fetch enrichment

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
- **Auto-Detection** - Protocol, power source, battery type
- **FP300-Like Features** - Advanced radar sensor controls
- **Energy Monitoring** - Full kWh, W, V, A support

## 📦 Installation

### From Homey App Store
1. Open Homey app
2. Go to "More" → "Apps"
3. Search for "Universal Tuya Zigbee"
4. Click "Install"

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
├── drivers/           # 163 Zigbee device drivers
├── lib/              # Shared libraries
├── scripts/          # Automation & validation scripts
│   ├── automation/   # Auto-update & organization
│   ├── validation/   # Coherence checking & fixing
│   └── deployment/   # Safe push & publish
├── diagnostics/      # Issue tracking & reports
├── flow/             # Flow cards (triggers, actions, conditions)
├── locales/          # Translations (en, fr, de, nl)
└── app.json          # App manifest
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
| **App Store** | [homey.app/a/com.dlnraja.tuya.zigbee/](https://homey.app/a/com.dlnraja.tuya.zigbee/) |
| **Test App** | [homey.app/a/com.dlnraja.tuya.zigbee/test/](https://homey.app/a/com.dlnraja.tuya.zigbee/test/) |
| **Forum** | [community.homey.app](https://community.homey.app/) |

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

**Made with ❤️ by the Zigbee community**

*Last updated: 2025-11-29*
