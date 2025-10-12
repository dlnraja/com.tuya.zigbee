# 🌟 Universal Tuya Zigbee Device App

[![Version](https://img.shields.io/badge/version-2.1.51-blue.svg)](https://github.com/dlnraja/com.tuya.zigbee)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Homey](https://img.shields.io/badge/Homey-SDK3-orange.svg)](https://apps.developer.homey.app/)
[![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-Active-brightgreen.svg)](https://github.com/dlnraja/com.tuya.zigbee/actions)
[![Automation](https://img.shields.io/badge/Automation-Master_Orchestrator-blueviolet.svg)](docs/MASTER_ORCHESTRATOR_GUIDE.md)

> **Based on the excellent work by [Johan Bendz](https://github.com/JohanBendz)**  
> Original app: [com.tuya.zigbee](https://github.com/JohanBendz/com.tuya.zigbee) | Licensed under MIT License

**Community-maintained Tuya Zigbee integration for Homey Pro - Extending Johan's original work to full SDK3**

> 🎭 **NEW!** [Master Orchestrator Ultimate](docs/MASTER_ORCHESTRATOR_GUIDE.md) - Double-click `RUN_ULTIMATE.bat` for full automation!

## 🙏 Credits & Attribution

This is a **community-maintained fork** of Johan Bendz's original Tuya Zigbee app, extended and updated to full SDK3 native implementation.

- **Original Author:** [Johan Bendz](https://github.com/JohanBendz)
- **Original Repository:** [JohanBendz/com.tuya.zigbee](https://github.com/JohanBendz/com.tuya.zigbee)
- **Current Maintainer:** Dylan Rajasekaram
- **License:** MIT License (inherited from original)

### Why This Fork?

Johan's original app was an excellent SDK2/SDK3 hybrid implementation. This fork continues that work with:
- ✅ Full SDK3 native implementation (no legacy SDK2 code)
- ✅ Extended device support (183 drivers vs original count)
- ✅ Active maintenance and bug fixes
- ✅ Community-driven development via GitHub
- ✅ Automated testing and publication
- ✅ IAS Zone enrollment fixes for motion sensors & buttons

## 🎯 Overview

**Version 2.1.51** | **SDK3** | **164 Drivers** | **2,000+ Manufacturer IDs** | **100% Local Control**

**Last Updated:** 2025-10-11 | **Status:** Production Ready ✅ | **Auto-Publish:** GitHub Actions

Seamless integration of 2,000+ Tuya Zigbee device manufacturers with Homey Pro, featuring:

- ✅ **Pure Zigbee Local Control** - No API key required
- ✅ **2,000+ Manufacturer IDs** - Maximum device coverage
- ✅ **164 Drivers** - All validated and functional
- ✅ **1,767 Flow Cards** - Complete automation support
- ✅ **SDK3 Compliant** - Latest Homey standards
- ✅ **Automated Publishing** - Official Homey GitHub Actions
- ✅ **Continuous Validation** - GitHub Actions workflows
- ✅ **Community Fixes** - Forum bugs resolved (v2.1.40+)
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
- **164 Drivers** - All validated SDK3
- **1,767 Flow Cards** - Complete automation
- **0 Validation Errors** - Production ready
- **GitHub Actions** - Automated CI/CD pipeline

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

## 🆕 What's New in v2.1.51

### 🚀 GitHub Actions Integration (v2.1.51)
- ✅ **Official Homey Actions** - Using GitHub Marketplace actions
- ✅ **Automated Publishing** - Push to master triggers publication
- ✅ **Semantic Versioning** - Automatic version management
- ✅ **Smart Changelog** - Generated from commit messages
- ✅ **Continuous Validation** - Multi-level testing on PRs
- ✅ **PowerShell Scripts** - Local publication automation

### 🐛 Community Bug Fixes (v2.1.40)
- ✅ **Temperature/Humidity Sensors** - Now display values correctly (Bug #259)
- ✅ **PIR Motion Sensors** - No more "Unknown Device" errors (Bug #256)
- ✅ **Gas Sensor Support** - TS0601_gas_sensor_2 added (Bug #261)
- ✅ **Manufacturer IDs** - Cleaned overlapping IDs across drivers
- ✅ **Zigbee Clusters** - Corrected configurations per device type

### 📚 Documentation (v2.1.51)
- ✅ **Publication Guide** - Complete official workflows guide
- ✅ **Quick Start** - 5-minute setup for GitHub Actions
- ✅ **Technical Reference** - github_actions_official.json
- ✅ **Forum Corrections Report** - Detailed bug fix documentation

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
├── app.json                       # 164 drivers, 1,767 flow cards
├── drivers/                       # 164 device drivers
├── scripts/
│   ├── automation/                # Publication automation
│   │   └── publish-homey-official.ps1
│   ├── analysis/                  # Verification scripts
│   ├── fixes/                     # Automatic fixes
│   └── generators/                # Code generators
├── references/
│   └── github_actions_official.json  # GitHub Actions reference
├── docs/
│   ├── forum/                     # Homey forum posts
│   └── reports/                   # Technical reports
├── .github/
│   └── workflows/                 # GitHub Actions
│       ├── homey-official-publish.yml   # 🌟 Main workflow
│       ├── homey-validate.yml           # Validation
│       ├── OFFICIAL_WORKFLOWS_GUIDE.md  # Complete guide
│       └── WORKFLOWS.md                 # Overview
├── PUBLICATION_GUIDE_OFFICIELLE.md    # 📖 Full publication guide
├── QUICK_START_PUBLICATION.md         # ⚡ Quick start
└── CHANGELOG.md                        # Version history
```

### 🚀 Publication Methods

#### Method 1: GitHub Actions (Recommended)

**Automatic publication on push:**
```bash
git add .
git commit -m "feat: add new device support"
git push origin master
# → GitHub Actions automatically validates, versions, and publishes
```

**Manual dispatch:**
```
GitHub → Actions → Official Homey App Store Publication
  → Run workflow (choose version type and changelog)
```

#### Method 2: PowerShell Script

```powershell
# Standard publication
.\scripts\automation\publish-homey-official.ps1

# Minor version bump
.\scripts\automation\publish-homey-official.ps1 -VersionType minor

# With custom changelog
.\scripts\automation\publish-homey-official.ps1 -Changelog "Added 20 new devices"
```

#### Method 3: Homey CLI

```bash
# Validate first
npx homey app validate --level publish

# Then publish
npx homey app publish
```

### 🔧 Development Scripts

**Validation:**
```bash
npx homey app validate --level publish
```

**Build:**
```bash
npx homey app build
```

**Local install:**
```bash
npx homey app install
```

## 📖 Documentation

### Publication & Workflows
- [📖 Publication Guide](PUBLICATION_GUIDE_OFFICIELLE.md) - Complete official guide
- [⚡ Quick Start](QUICK_START_PUBLICATION.md) - 5-minute setup
- [🔧 Workflows Guide](.github/workflows/OFFICIAL_WORKFLOWS_GUIDE.md) - Technical workflows
- [📊 Implementation Recap](RECAP_IMPLEMENTATION_OFFICIELLE.md) - What we built

### Bug Fixes & Features
- [🐛 Forum Corrections](FORUM_BUGS_CORRECTIONS_RAPPORT.md) - Community fixes (v2.1.40)
- [📝 Changelog](CHANGELOG.md) - Version history
- [🤝 Contributing](CONTRIBUTING.md) - How to contribute

### Technical References
- [🔗 GitHub Actions Reference](references/github_actions_official.json) - Technical spec
- [📋 Workflows Overview](.github/workflows/WORKFLOWS.md) - All workflows

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

## 🔧 For Developers

### Master Orchestrator Ultimate

The project includes a powerful automation system that handles everything from A to Z:

```bash
# Double-click (easiest)
RUN_ULTIMATE.bat

# Or command-line
node scripts/MASTER_ORCHESTRATOR_ULTIMATE.js [options]
```

**What it does:**
- 🌐 Downloads & matches with Blakadder + Zigbee2MQTT databases
- 🎯 Intelligent cross-platform conversion
- 🤖 Auto-enriches drivers (HIGH confidence ≥90%)
- ✅ Multi-level validation (JSON, Homey CLI, SDK3)
- 📄 Auto-organizes documentation
- 🚀 Smart Git commit + GitHub Actions publish

**Documentation:** [Master Orchestrator Guide](docs/MASTER_ORCHESTRATOR_GUIDE.md)

### Other Automation Scripts

```bash
# Intelligent enrichment system
node scripts/enrichment/INTELLIGENT_MATCHER_BLAKADDER.js
node scripts/enrichment/PATHFINDER_CONVERTER.js
node scripts/enrichment/AUTO_ENRICHMENT_ORCHESTRATOR.js

# Forum & analysis
node scripts/analysis/CHECK_FORUM_ISSUES_COMPLETE.js

# Git automation
pwsh scripts/automation/SMART_COMMIT.ps1 -Message "your message"
```

---

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
Version: 2.1.51
Drivers: 164 (all validated SDK3)
Manufacturer IDs: 2,000+
Product IDs: 1,500+
Flow Cards: 1,767 (661 triggers + 698 conditions + 408 actions)
Validation Errors: 0
Mode: 100% Zigbee Local
API Key Required: NONE
Publication: Official GitHub Actions
CI/CD: Automated validation & versioning
SDK: 3 (latest)
```

## 🔄 CI/CD Pipeline

**Automated Workflows:**
- ✅ **Validation** - Multi-level testing on every PR
- ✅ **Versioning** - Semantic version management
- ✅ **Publishing** - Automated Homey App Store submission
- ✅ **Changelog** - Auto-generated from commits

**GitHub Actions:**
```
Push to master → Validate → Version → Publish → Test → Live
```

**Status:** All workflows passing ✅

## 🌟 Star History

If this app helped you, please star the repository! ⭐

---

**Made with ❤️ for the Homey Community**
