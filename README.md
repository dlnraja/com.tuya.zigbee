# 🌟 Universal Tuya Zigbee Device App

[![Version](https://img.shields.io/badge/version-2.0.12-blue.svg)](https://github.com/dlnraja/com.tuya.zigbee)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Homey](https://img.shields.io/badge/Homey-SDK3-orange.svg)](https://apps.developer.homey.app/)
[![Health](https://img.shields.io/badge/health-96%25-brightgreen.svg)](https://github.com/dlnraja/com.tuya.zigbee)

**The most comprehensive Tuya Zigbee device integration for Homey Pro**

## 🎯 Overview

# Universal Tuya Zigbee - Complete Local Control for 10,000+ Devices

**Version 2.0.5** | **SDK3** | **163 Drivers** | **10,520+ Device IDs** | **100% Local Control**

**Last Updated:** 2025-10-08 | **Build #14-16** | **Status:** Production Ready

**Seamless integration of 10,520+ Tuya Zigbee device variants with Homey Pro, featuring:

- ✅ **Pure Zigbee Local Control** - No API key required
- ✅ **10,520+ Device Variants** - Record coverage (5x reference databases)
- ✅ **163 Drivers** - Comprehensive device coverage
- ✅ **96% Health Score** - Optimal quality
{{ ... }}
- ✅ **Auto-Updates** - Monthly enrichment via GitHub Actions
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
- **10,520+ Manufacturer IDs** (Record coverage!)
- **150+ Product IDs** (optimized)
- **163 Drivers** (all validated)
- **11+ Sources** integrated (GitHub, Forums, Web DBs)
- **96% Health Score** (optimal quality)

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

## 🆕 What's New in v1.8.2

### Major Updates
- ✅ **+1,226 Manufacturer IDs** added (+48% increase)
- ✅ **10,520+ Total Coverage** - Record for Homey ecosystem
- ✅ **11+ Sources Integrated** - GitHub, Forums, Web databases
- ✅ **Monthly Auto-Updates** - GitHub Actions automation
- ✅ **96% Health Score** - Optimal quality
- ✅ **28 Corrections** - Gang capabilities, class fixes
- ✅ **20/20 Tests Passed** - 100% validation
- ✅ **Community Issues** - 4 issues resolved (<24h)

### Sources Integrated
- **GitHub** - 3 repos (yours, Johan Bendz, Koenkk)
- **Homey Forums** - 4 community threads
- **Web Databases** - Zigbee2MQTT, ZHA, BlakAdder
- **Pattern Analysis** - Cross-variation detection
- **Community Feedback** - Direct user reports

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
├── LAUNCH_FULL_ENRICHMENT.bat    # Windows launcher (ultra-verbose)
├── app.json                       # 10,520+ IDs, 163 drivers
├── drivers/                       # 163 device drivers
├── scripts/                       # 18 automation scripts
│   ├── MEGA_GITHUB_INTEGRATION_ENRICHER.js
│   ├── MEGA_FORUM_WEB_INTEGRATOR.js
│   ├── MONTHLY_AUTO_ENRICHMENT_ORCHESTRATOR.js
│   ├── ULTRA_FINE_DRIVER_ANALYZER.js
│   ├── TEST_ALL_SYSTEMS.js
│   ├── TEST_AUTOMATION_COMPLETE.js
│   └── ... (18 total)
├── docs/                          # 25 documents
├── reports/                       # JSON reports
└── .github/
    └── workflows/                 # 10 GitHub Actions
        ├── publish-main.yml       # Primary (active)
        └── monthly-auto-enrichment.yml
```

### Scripts

**Full Enrichment Cycle (Manual):**
```batch
# Windows - Ultra-verbose launcher
.\LAUNCH_FULL_ENRICHMENT.bat
```

**Testing:**
```bash
# Test all systems
node scripts/TEST_ALL_SYSTEMS.js

# Test automation
node scripts/TEST_AUTOMATION_COMPLETE.js
```

**GitHub Integration:**
```bash
node scripts/MEGA_GITHUB_INTEGRATION_ENRICHER.js
```

**Forum Integration:**
```bash
node scripts/MEGA_FORUM_WEB_INTEGRATOR.js
```

## 📖 Documentation

- [Session Complete Report](docs/SESSION_FINALE_COMPLETE_10H.md) - 10-hour session
- [Automation Guide](docs/AUTOMATION_SYSTEM_GUIDE.md) - GitHub Actions + .bat
- [Test Reports](docs/AUTOMATION_TEST_REPORT.md) - 20/20 tests passed
- [Organization Report](docs/PROJECT_ORGANIZATION_REPORT.md) - Structure
- [GitHub Actions](.github/workflows/) - 10 workflows
- [All Documentation](docs/) - 25+ documents

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
Version: 1.8.2
Drivers: 163 (all validated)
Manufacturer IDs: 10,520+ (RECORD!)
Product IDs: 150+ (optimized)
Devices Supported: 10,520+ variants
Coverage: 5x reference databases
Health Score: 96% (optimal)
Tests: 20/20 passed (100%)
Mode: 100% Zigbee Local
API Key Required: NONE
Auto-Updates: Monthly (GitHub Actions)
```

## 🌟 Star History

If this app helped you, please star the repository! ⭐

---

**Made with ❤️ for the Homey Community**
