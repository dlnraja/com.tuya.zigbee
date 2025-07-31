# 🏠 Universal Tuya & Zigbee Device App – Mega Project

[![Homey SDK](https://img.shields.io/badge/Homey-SDK3+-blue.svg)](https://apps.athom.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-100%25-yellow.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Drivers](https://img.shields.io/badge/Drivers-550+-orange.svg)](drivers/)
[![Languages](https://img.shields.io/badge/Languages-4-brightgreen.svg)](README.md)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-success.svg)]()

> **🚀 Fully autonomous and self-healing Homey app for Tuya and Zigbee devices**  
> **🧠 AI-powered driver enrichment with optional OpenAI/HuggingFace integration**  
> **🌍 Multilingual support: EN, FR, NL, TA**  
> **⚡ SDK3+ exclusive for all Homey boxes (Pro, Cloud, Bridge)**

---

## 📋 Table of Contents

- [🎯 Objective](#-objective)
- [🧠 Data Sources](#-data-sources)
- [🔄 Monthly Automation](#-monthly-automation)
- [📊 Project Statistics](#-project-statistics)
- [🛠️ Technical Features](#️-technical-features)
- [📁 Project Structure](#-project-structure)
- [🚀 Quick Start](#-quick-start)
- [📚 Documentation](#-documentation)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## 🎯 Objective

A **fully autonomous and self-healing** Homey app for Tuya and Zigbee devices:

### ✨ Key Features
- 🔧 **JavaScript-only automation** (no PowerShell)
- 🤖 **Automatic monthly enrichment** & update (drivers, changelog, dashboard)
- 🧠 **Optional AI inference** (OpenAI, HuggingFace, heuristics, forum scraping)
- 📱 **Full SDK3+ compatibility** for all Homey boxes (Pro, Cloud, Bridge)
- 📂 **Devices separated**: `/drivers/tuya/` and `/drivers/zigbee/`
- 🧹 **Cleans legacy code** and folders (fusion*, .vscode, old/test drivers)
- 🔍 **Scrapes & syncs** with: Z2M, ZHA, SmartLife/Samsung, ENKI, Domoticz, Zigbee official specs, Tuya SDK
- 📝 **Dynamic TODO list** for missing or incomplete devices
- 📊 **Generates**: README, CHANGELOG, drivers-matrix, GitHub Pages dashboard
- ✅ **Auto-validates** via Homey CLI (no auto-publish)
- 🌍 **Multilingual logs** & commits (EN/FR/NL/TA)
- 🔄 **Regenerates past changelogs** & history if corrupted or partial

---

## 🧠 Data Sources

### 🔗 External Integrations
- 🧩 **Zigbee2MQTT** device converters
- 🧩 **ZHA integration** (Home Assistant)
- 🧩 **Samsung SmartLife** (Zigbee SDK extraction)
- 🧩 **Legrand/Enki** (Zigbee profiles)
- 🧩 **Domoticz forums** and device DB

### 📚 Community Resources
- 📚 **Homey Community Forums**: topics [26439], [140352]
- 📚 **Zigbee Alliance specs**, Tuya cluster/dp docs
- 🔁 **Historical Git data**, Homey CLI interviews

---

## 🔄 Monthly Automation

### 🤖 Mega Pipeline (`mega-pipeline.js`)
The pipeline executes all operations automatically:

```javascript
// Monthly automation workflow
1. Clean          // Remove legacy files
2. Enrich         // AI-powered driver completion
3. Reorganize     // Categorize drivers
4. Test           // Validate with Homey CLI
5. Document       // Generate README/CHANGELOG
6. Dashboard      // Deploy GitHub Pages
7. Changelog      // Generate (EN > FR > NL > TA)
```

### 🧠 AI Features
- **AI fallback** for missing info (cluster, dpId, capabilities)
- **Fallback templates** for low-confidence detection
- **Smart caching** of forum scraping + `.cache/` system
- **Logs**: no user config, no personal paths

---

## 📊 Project Statistics

| Metric | Value |
|--------|-------|
| **Total Drivers** | 550+ documented |
| **Tuya Drivers** | 400+ in `/drivers/tuya/` |
| **Zigbee Drivers** | 150+ in `/drivers/zigbee/` |
| **Categories** | 6 main categories |
| **Compatibility** | All Homey boxes |
| **SDK Version** | 3+ exclusive |
| **Languages** | EN, FR, NL, TA |

### 📂 Driver Categories

| Category | Description | Count |
|----------|-------------|-------|
| **Lights** | RGB, dimmable, tunable, strips, panels | 200+ |
| **Switches** | On/off, dimmers, scene controllers | 150+ |
| **Plugs** | Smart plugs, power monitoring | 100+ |
| **Sensors** | Motion, contact, humidity, pressure | 80+ |
| **Controls** | Curtains, blinds, thermostats | 50+ |
| **Temperature** | Temperature and humidity sensors | 70+ |

---

## 🛠️ Technical Features

### 🔧 Core Capabilities
- **Self-Healing**: Automatic detection and repair of broken files
- **Smart Enrichment**: AI-powered driver completion
- **Forum Integration**: Automatic scraping of Homey Community
- **GitHub Actions**: Monthly automated updates
- **Dashboard**: Real-time driver matrix and statistics
- **Documentation**: Multilingual README and CHANGELOG
- **Validation**: Homey CLI integration for testing

### 🏗️ Architecture
- **Modular Design**: Scripts organized by functionality
- **Error Recovery**: Automatic fallback mechanisms
- **Performance**: Optimized for large driver catalogs
- **Scalability**: Easy to extend with new drivers

---

## 📁 Project Structure

```
com.tuya.zigbee/
├── 📂 drivers/
│   ├── 📂 tuya/
│   │   ├── 📂 lights/          # Tuya light devices
│   │   ├── 📂 switches/        # Tuya switch devices
│   │   ├── 📂 plugs/           # Tuya plug devices
│   │   ├── 📂 sensors/         # Tuya sensor devices
│   │   └── 📂 controls/        # Tuya control devices
│   └── 📂 zigbee/
│       ├── 📂 lights/          # Generic Zigbee lights
│       ├── 📂 switches/        # Generic Zigbee switches
│       ├── 📂 sensors/         # Generic Zigbee sensors
│       └── 📂 temperature/     # Temperature sensors
├── 📂 scripts/
│   ├── 📂 core/               # Core automation scripts
│   ├── 📂 enrichment/         # AI enrichment scripts
│   └── 📂 validation/         # Testing and validation
├── 📂 docs/
│   ├── 📂 specs/             # Technical specifications
│   └── 📂 guides/            # User guides
├── 📂 .github/
│   └── 📂 workflows/         # GitHub Actions automation
├── 📄 app.js                 # Main application file
├── 📄 app.json              # Homey app configuration
├── 📄 package.json          # Dependencies
└── 📄 README.md            # This file
```

---

## 🚀 Quick Start

### 📦 Installation

```bash
# Clone the repository
git clone https://github.com/dlnraja/com.tuya.zigbee.git

# Navigate to project directory
cd com.tuya.zigbee

# Install dependencies
npm install

# Validate the app
homey app validate

# Install on Homey
homey app install
```

### 🔧 Development

```bash
# Run the mega pipeline
node scripts/core/mega-pipeline-ultimate.js

# Run specific modules
node scripts/core/fusion-tuya-light-drivers.js
node scripts/core/ultimate-driver-analyzer.js
node scripts/core/release-manager.js

# Validate changes
homey app validate
```

### 🧪 Testing

```bash
# Run validation tests
node scripts/core/final-validation-test.js

# Check driver statistics
node scripts/core/driver-statistics.js

# Test specific driver
homey app validate --driver=tuya/lights/ts0001
```

---

## 🔧 Technical Specifications

### 📱 Homey SDK3+ Compatibility

| Feature | Support |
|---------|---------|
| **Minimum SDK** | 3.0.0 |
| **Target SDK** | Latest stable |
| **Compatibility** | Pro, Cloud, Bridge |
| **Features** | Full SDK3+ features |

### 📄 Driver Structure

Each driver contains:
- `driver.compose.json` - Driver configuration
- `device.js` - Device implementation
- `icon.svg` - Device icon (optional)
- `images/` - Device images (optional)

### 🤖 Automation Features

| Feature | Description |
|---------|-------------|
| **Self-Healing** | Automatic file repair |
| **Smart Enrichment** | AI-powered completion |
| **Forum Integration** | Community scraping |
| **GitHub Actions** | Monthly updates |
| **Dashboard** | Real-time statistics |
| **Documentation** | Multilingual support |

---

## 📚 Documentation

### 📖 Guides
- [📋 Installation Guide](docs/guides/installation.md)
- [🔧 Driver Development](docs/guides/driver-development.md)
- [🤖 Automation Setup](docs/guides/automation.md)
- [🔍 Troubleshooting](docs/guides/troubleshooting.md)

### 📋 Specifications
- [📄 Driver Specification](docs/specs/driver-spec.md)
- [🔌 API Documentation](docs/specs/api.md)
- [⚙️ Automation Rules](docs/specs/automation.md)

---

## 🤝 Contributing

### 📋 Development Rules

1. **JavaScript Only**: No PowerShell scripts
2. **SDK3+**: All code must be SDK3+ compatible
3. **Multilingual**: Support EN, FR, NL, TA
4. **Automation**: Monthly automated updates
5. **Validation**: All changes must pass `homey app validate`

### 💻 Code Style

| Aspect | Standard |
|--------|----------|
| **Language** | JavaScript (ES6+) |
| **Formatting** | Prettier |
| **Linting** | ESLint |
| **Testing** | Homey CLI validation |

### 🔄 Workflow

1. **Fork** the repository
2. **Create** a feature branch
3. **Make** your changes
4. **Test** with `homey app validate`
5. **Commit** with clear messages
6. **Push** to your branch
7. **Create** a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **🏠 Homey Community**: For device reports and feedback
- **🔗 Zigbee2MQTT**: For device definitions
- **🏠 ZHA**: For Home Assistant integration
- **📱 Samsung SmartLife**: For Zigbee SDK
- **🏢 Legrand Enki**: For Zigbee profiles
- **🏠 Domoticz**: For device database

---

## 🌍 Multilingual Support

This project supports **4 languages** in priority order:

| Language | Code | Status |
|----------|------|--------|
| **English** | EN | ✅ Complete |
| **Français** | FR | ✅ Complete |
| **Nederlands** | NL | ✅ Complete |
| **தமிழ் (Tamil)** | TA | ✅ Complete |

---

## 📊 Current Status

| Component | Status | Details |
|-----------|--------|---------|
| **Drivers** | ✅ Complete | 550+ drivers organized |
| **Pipeline** | ✅ Complete | JavaScript 100% autonomous |
| **Documentation** | ✅ Complete | Multilingual README |
| **Validation** | ✅ Complete | Homey CLI integration |
| **Fusion** | ✅ Complete | tuya-light merged |
| **Production** | ✅ Ready | Ready for deployment |

---

**📅 Last Updated**: 31/07/2025  
**🔧 Version**: 3.1.0  
**✅ Status**: FUSION TUYA-LIGHT COMPLETE - READY FOR PRODUCTION

---

> **For all contributions, rules, changelog and upgrade process**: see `/docs/specs/`, `/scripts/`, and `.github/workflows/`.