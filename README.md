# 🌟 Universal Tuya Zigbee Device App

[![Version](https://img.shields.io/badge/version-1.4.1-blue.svg)](https://github.com/dlnraja/com.tuya.zigbee)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Homey](https://img.shields.io/badge/Homey-SDK3-orange.svg)](https://apps.developer.homey.app/)

**The most comprehensive Tuya Zigbee device integration for Homey Pro**

## 🎯 Overview

Universal Tuya Zigbee Device App provides seamless integration of 1,200+ Tuya Zigbee devices with Homey Pro, featuring:

- ✅ **Pure Zigbee Local Control** - No API key required
- ✅ **1,200+ Devices Supported** - Maximum compatibility
- ✅ **163 Drivers** - Comprehensive device coverage
- ✅ **Zigbee2MQTT Compatible** - Easy migration
- ✅ **Enki Support** - Leroy Merlin devices fully supported
- ✅ **UNBRANDED Organization** - Find devices by function, not brand

## 🌐 Mode: 100% Zigbee Local

**No Tuya Cloud API Required:**
- ✅ No API key needed
- ✅ No cloud account required
- ✅ Works completely offline
- ✅ Instant local control
- ✅ More secure and private

## 📊 Coverage

**Supported Devices:**
- 110 Manufacturer IDs
- 68 Product IDs (optimized)
- 163 Drivers
- ~1,200+ device variants

**Supported Brands:**
- Tuya (all series: TS*, _TZ*, _TZE*)
- Enki (Leroy Merlin)
- Moes
- Nous
- Lidl Silvercrest
- Action
- Blitzwolf
- Lonsonho
- Zemismart
- And many more...

## 🔧 Installation

### Method 1: Homey App Store
1. Go to Homey App Store
2. Search for "Universal Tuya Zigbee"
3. Click Install

### Method 2: GitHub Installation
```bash
# Clone repository
git clone https://github.com/dlnraja/com.tuya.zigbee.git
cd com.tuya.zigbee

# Install dependencies
npm install

# Install on your Homey
homey app install
```

## 📱 Device Categories

Devices organized by **FUNCTION**, not brand:

### 1. Motion & Presence Detection
- PIR motion sensors
- Radar presence sensors
- mmWave sensors

### 2. Contact & Security
- Door/window sensors
- Smart locks
- Security sensors

### 3. Temperature & Climate
- Temperature/humidity sensors
- Thermostats
- TRV (Radiator valves)
- Climate controllers

### 4. Smart Lighting
- Smart bulbs (white/tunable/RGB)
- Light switches (1-4 gang)
- Dimmers
- LED controllers

### 5. Power & Energy
- Smart plugs
- Energy monitoring outlets
- Power meters

### 6. Safety & Detection
- Smoke detectors
- Water leak sensors
- Gas detectors
- CO detectors

### 7. Automation Control
- Scene switches
- Wireless buttons
- Remote controls
- Rotary knobs

### 8. Curtains & Blinds
- Curtain motors
- Blinds controllers
- Shutter motors

## 🆕 What's New in v1.4.1

### Major Updates
- ✅ **+36 Manufacturer IDs** added (64% increase)
- ✅ **Zigbee2MQTT Integration** - 34 new device IDs
- ✅ **Enki Support** - Full Leroy Merlin device compatibility
- ✅ **Deep Scraping** - 110 drivers cleaned and optimized
- ✅ **1,014 ProductIds cleaned** - Improved device recognition
- ✅ **Forum Issues Fixed** - Generic device detection resolved

### Sources Integrated
- **Zigbee2MQTT Database** - 34 manufacturer IDs
- **Enki (Leroy Merlin)** - 4 devices
- **Homey Community Forum** - 17 reported IDs
- **ZHA Patterns** - Additional compatibility

## 🔄 Migration from Zigbee2MQTT

Easy migration path for Z2M users:

1. Remove device from Zigbee2MQTT
2. Factory reset the device
3. Add to Homey using this app
4. Device automatically recognized

**Same manufacturer IDs = Seamless migration**

## 🛠️ Development

### Project Structure

```
.
├── drivers/              # 163 device drivers
├── scripts/
│   ├── analysis/         # Analysis tools
│   ├── fixes/            # Fix scripts
│   ├── integration/      # Integration scripts
│   ├── forum/            # Forum scrapers
│   └── publishing/       # Publication tools
├── reports/              # Analysis reports
└── .github/
    └── workflows/        # CI/CD automation
```

### Scripts

**Analysis:**
```bash
node scripts/analysis/DEEP_SCRAPER_AND_REORGANIZER.js
```

**Integration:**
```bash
node scripts/integration/MEGA_INTEGRATION_ALL_SOURCES.js
```

**Fixes:**
```bash
node scripts/fixes/APPLY_DEEP_SCRAPING_FIXES.js
```

## 📖 Documentation

- [Session Reports](reports/) - Detailed session logs
- [GitHub Actions](.github/workflows/) - CI/CD configuration
- [Integration Guide](reports/RAPPORT_MEGA_INTEGRATION_FINALE.md)

## 🐛 Bug Reports & Feature Requests

**GitHub Issues:** https://github.com/dlnraja/com.tuya.zigbee/issues

**Homey Forum:** https://community.homey.app/t/140352/

Please include:
- Device model & manufacturer
- Homey diagnostic report
- Expected vs actual behavior

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Test thoroughly
4. Submit a pull request

## 📄 License

MIT License - See [LICENSE](LICENSE) file

## 👥 Credits

**Developer:** Dylan Rajasekaram ([@dlnraja](https://github.com/dlnraja))

**Based on:** Johan Bendz's Tuya Zigbee App (MIT License)

**Data Sources:**
- Zigbee2MQTT database
- Koenkk/zigbee-herdsman-converters
- Homey Community feedback
- ZHA device handlers

## 🔗 Links

- **GitHub:** https://github.com/dlnraja/com.tuya.zigbee
- **Homey Dashboard:** https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee
- **Forum Thread:** https://community.homey.app/t/140352/

## 📊 Statistics

```
Version: 1.4.1
Drivers: 163
Manufacturer IDs: 110
Product IDs: 68 (optimized)
Devices Supported: ~1,200+
Coverage Increase: +50% (this version)
Mode: 100% Zigbee Local
API Key Required: NONE
```

## 🌟 Star History

If this app helped you, please star the repository! ⭐

---

**Made with ❤️ for the Homey Community**
