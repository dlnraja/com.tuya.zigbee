# 🌟 Universal Tuya Zigbee Device App

[![Version](https://img.shields.io/badge/version-2.1.36-blue.svg)](https://github.com/dlnraja/com.tuya.zigbee)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Homey](https://img.shields.io/badge/Homey-SDK3-orange.svg)](https://apps.developer.homey.app/)
[![Health](https://img.shields.io/badge/health-96%25-brightgreen.svg)](https://github.com/dlnraja/com.tuya.zigbee)

**The most comprehensive Tuya Zigbee device integration for Homey Pro**

## 🎯 Overview

# Universal Tuya Zigbee - Complete Local Control for 10,000+ Devices

**Version 2.1.36** | **SDK3** | **163 Drivers** | **2,000+ Manufacturer IDs** | **100% Local Control**

**Last Updated:** 2025-10-09 | **Status:** Production Ready ✅

Seamless integration of 2,000+ Tuya Zigbee device manufacturers with Homey Pro, featuring:

- ✅ **Pure Zigbee Local Control** - No API key required
- ✅ **2,000+ Manufacturer IDs** - Maximum device coverage
- ✅ **163 Drivers** - All validated and functional
- ✅ **1,767 Flow Cards** - Complete automation support
- ✅ **SDK3 Compliant** - Latest Homey standards
- ✅ **Auto-Updates** - Via GitHub Actions
- ✅ **Zigbee2MQTT Compatible** - Easy migration
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
- **2,000+ Manufacturer IDs** - Comprehensive coverage
- **1,500+ Product IDs** - Maximum compatibility
- **163 Drivers** - All validated SDK3
- **1,767 Flow Cards** - Complete automation
- **0 Validation Errors** - Production ready

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

## 🆕 What's New in v2.1.36

### Major Features Added
- ✅ **1,767 Flow Cards** - Auto-generated (661 triggers, 698 conditions, 408 actions)
- ✅ **2,481 Corrections** - Complete app.json sync with sources
- ✅ **Advanced Settings** - Calibration, reporting intervals, sensitivity
- ✅ **Maintenance Actions** - Identify device, reset meters
- ✅ **Energy.batteries** - All battery devices configured
- ✅ **Complete Coherence** - All 163 drivers verified

### Bug Fixes
- ✅ Temperature/humidity/battery parsers corrected (11 drivers)
- ✅ Missing manufacturer IDs added (_TZE284_vvmbj46n and more)
- ✅ Missing product IDs sync (159 drivers)
- ✅ Flow handlers added to all drivers
- ✅ 0 validation errors - SDK3 compliant

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
├── app.json                       # 163 drivers, 1,767 flow cards
├── drivers/                       # 163 device drivers
├── scripts/
│   ├── analysis/                  # Verification scripts
│   │   ├── VERIFY_AND_FIX_APP_JSON.js
│   │   ├── VERIFY_DRIVERS_COHERENCE.js
│   │   └── MEGA_FEATURE_ANALYZER.js
│   ├── fixes/                     # Automatic fixes
│   │   ├── FIX_DEVICE_CAPABILITIES_CASCADE.js
│   │   ├── FIX_MISSING_BATTERIES.js
│   │   └── FIX_SETTINGS_VALIDATION.js
│   ├── generators/                # Code generators
│   │   ├── FLOW_HANDLER_GENERATOR.js
│   │   └── MEGA_FEATURE_IMPLEMENTER.js
│   └── automation/                # GitHub Actions helpers
├── docs/
│   ├── forum/                     # Homey forum posts
│   ├── reports/                   # Technical reports
│   └── actions/                   # Action guides
├── reports/
│   ├── json/                      # JSON reports
│   └── commits/                   # Commit messages
└── .github/
    └── workflows/                 # GitHub Actions
        └── publish-main.yml       # Automatic publishing
```

### Scripts

**Verify app.json coherence:**
```bash
node scripts/analysis/VERIFY_AND_FIX_APP_JSON.js
```

**Verify all drivers:**
```bash
node scripts/analysis/VERIFY_DRIVERS_COHERENCE.js
```

**Fix missing capabilities:**
```bash
node scripts/fixes/FIX_DEVICE_CAPABILITIES_CASCADE.js
```

**Generate flow cards:**
```bash
node scripts/generators/MEGA_FEATURE_IMPLEMENTER.js
```

## 📖 Documentation

- [Forum Post](docs/forum/FORUM_POST_ENGLISH_SHORT.md) - User-friendly update post
- [Mega Features Report](docs/reports/MEGA_FEATURES_RAPPORT_FINAL.md) - 1,767 flow cards
- [Coherence Summary](docs/reports/COHERENCE_FINAL_SUMMARY.md) - Final verification
- [Cascade Fixes](docs/reports/RAPPORT_CASCADE_FIXES.md) - Technical fixes
- [Contributing Guide](docs/CONTRIBUTING.md) - How to contribute
- [GitHub Actions](.github/workflows/) - Automatic publishing

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
Version: 2.1.36
Drivers: 163 (all validated SDK3)
Manufacturer IDs: 2,000+
Product IDs: 1,500+
Flow Cards: 1,767 (661 triggers + 698 conditions + 408 actions)
Validation Errors: 0
Mode: 100% Zigbee Local
API Key Required: NONE
Auto-Updates: Via GitHub Actions
SDK: 3 (latest)
```

## 🌟 Star History

If this app helped you, please star the repository! ⭐

---

**Made with ❤️ for the Homey Community**
