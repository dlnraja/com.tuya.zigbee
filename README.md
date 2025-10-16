# 🏠 Universal Tuya Zigbee

[![Version](https://img.shields.io/badge/version-3.0.5-blue.svg)](https://github.com/dlnraja/com.tuya.zigbee)
[![SDK](https://img.shields.io/badge/SDK-3-green.svg)](https://apps.developer.homey.app)
[![Homey](https://img.shields.io/badge/Homey->=12.2.0-orange.svg)](https://homey.app)
[![Drivers](https://img.shields.io/badge/drivers-183-brightgreen.svg)](https://github.com/dlnraja/com.tuya.zigbee/tree/master/drivers)
[![License](https://img.shields.io/badge/license-MIT-lightgrey.svg)](LICENSE)

Community-maintained Tuya Zigbee app with 183 SDK3 native drivers. 67 drivers enriched with 254+ manufacturer IDs from multiple sources (Zigbee2MQTT, Johan Bendz, Homey Forum, Home Assistant, Blakadder). 123 flow cards (triggers, actions, conditions) with proper tokens. 100% local control, no cloud required. IAS Zone enrollment verified. Zero overlaps after cleanup (5,332 remaining). Active development and support for 550+ device IDs. User-friendly driver names for easy pairing.

---

## 📊 Statistics

```
Drivers:              183
SDK Version:          3
Homey Compatibility:  >=12.2.0
Version:              3.0.5
Status:               ✅ Active Development
```

---

## ✨ Features

- ✅ **183 Native Zigbee Drivers** - No cloud dependency
- ✅ **100% Local Control** - All devices work offline
- ✅ **SDK3 Modern Architecture** - Built with latest Homey SDK
- ✅ **Advanced Flow Cards** - Comprehensive automation support
- ✅ **Multi-brand Support** - Works with 300+ device IDs
- ✅ **Active Development** - Regular updates and bug fixes
- ✅ **Community Driven** - Based on community feedback
- ✅ **Automated Updates** - GitHub Actions CI/CD pipeline

---

## 🚀 Installation

### From Homey App Store (Recommended)
1. Open Homey app
2. Go to **More** → **Apps**
3. Search for "**Universal Tuya Zigbee**"
4. Click **Install**

### From GitHub (Development)
```bash
git clone https://github.com/dlnraja/com.tuya.zigbee.git
cd com.tuya.zigbee
npm install
homey app install
```

---

## 📂 Project Structure

```

```

**Complete documentation:** [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)

---

## 🔄 Recent Updates

### Version 3.0.0 - 2025-10-16

- **Complete DP interpretation engine** - Centralized Data Point handling
- **Fingerprints database** (100+ devices mapped)
- **Profiles system** (20+ profiles defined)
- **Capability mapping** (comprehensive DP → Homey conversion)
- **Reusable converters** (power, temperature, onoff, and more)

**Full changelog:** [CHANGELOG.md](CHANGELOG.md)

---

## 🐛 Recent Fixes

- [STATUS_FINAL.md](docs/fixes/STATUS_FINAL.md) (2025-10-16)
- [PETER_INSTRUCTIONS_COURTES.md](docs/fixes/PETER_INSTRUCTIONS_COURTES.md) (2025-10-16)

**All fixes:** [docs/fixes/](docs/fixes/)

---

## 📚 Documentation

### User Documentation
- [Workflow Guide](docs/workflow/WORKFLOW_GUIDE.md) - GitHub Actions workflow
- [Quick Reference](docs/workflow/QUICK_WORKFLOW.md) - Quick commands
- [Auto-Update System](docs/workflow/AUTO_UPDATE_SYSTEM.md) - Automatic docs updates

### Developer Documentation
- [Project Structure](PROJECT_STRUCTURE.md) - Complete structure documentation
- [Community Analysis](docs/community/COMMUNITY_APPS_ANALYSIS.md) - Best practices from community apps
- [Quick Improvements](docs/community/QUICK_IMPROVEMENTS.md) - Priority features

### Bug Fixes & Reports
- [Critical Fix Summary](docs/fixes/CRITICAL_FIX_SUMMARY_v2.15.130.md) - Latest critical fixes
- [IAS Zone Fix](docs/fixes/PETER_IAS_ZONE_FIX_COMPLETE.md) - Motion sensor fix
- [All Fixes](docs/fixes/) - Complete fix history

---

## 🤝 Contributing

Contributions are welcome! This project follows these principles:
- **UNBRANDED** - Organized by device function, not brand
- **USER-FRIENDLY** - Easy to understand driver names
- **COMPREHENSIVE** - Support as many devices as possible
- **QUALITY** - Well-tested, properly documented

### Development Workflow

1. **Make changes** to drivers/lib/utils
2. **Validate locally:** `homey app validate --level publish`
3. **Commit & push:** `git commit && git push`
4. **GitHub Actions** automatically validates, versions, and publishes

**Smart commit:** `powershell scripts/automation/smart-commit.ps1 "Your message"`

---

## 🔧 Scripts & Automation

### Organization
```bash
# Reorganize project structure
powershell scripts/organize-project.ps1
```

### Updates
```bash
# Update all links and paths
node scripts/automation/update-all-links.js

# Smart commit (with auto-updates)
powershell scripts/automation/smart-commit.ps1 "Message"
```

### Git Hooks
```bash
# Install pre-commit hooks
powershell scripts/automation/install-git-hooks.ps1
```

---

## 📦 Device Support

### Categories
1. **Motion & Presence** - PIR sensors, radar sensors, presence detection
2. **Contact & Security** - Door/window sensors, locks, alarms
3. **Temperature & Climate** - Temp/humidity sensors, thermostats
4. **Smart Lighting** - Bulbs, switches, dimmers, RGB controllers
5. **Power & Energy** - Smart plugs, power monitors, energy tracking
6. **Safety** - Smoke detectors, water leak sensors, CO detectors
7. **Automation** - Buttons, scene controllers, remotes

**Total: 183 drivers supporting 300+ device IDs**

---

## 🔗 Links

- **GitHub Repository:** https://github.com/dlnraja/com.tuya.zigbee
- **Homey Community Forum:** https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352
- **Issue Tracker:** https://github.com/dlnraja/com.tuya.zigbee/issues
- **Homey App Store:** [Universal Tuya Zigbee](https://homey.app/a/com.dlnraja.tuya.zigbee/)

---

## 📝 Recent Commits

- `af2f99906` Merge branch 'master' of https://github.com/dlnraja/com.tuya.zigbee - *Dylan Rajasekaram* (4 minutes ago)
- `2334f112c` chore: Update app.json to v3.0.5 with complete session improvements - *Dylan Rajasekaram* (5 minutes ago)
- `36eed5127` Docs: Auto-update links, paths, README & CHANGELOG [skip ci] - *Dylan Rajasekaram* (8 minutes ago)
- `9076454a2` Merge branch 'master' of https://github.com/dlnraja/com.tuya.zigbee - *Dylan Rajasekaram* (9 minutes ago)
- `7ece0d3ca` feat: Intelligent driver enrichment - 67 drivers with 254 manufacturer IDs + features - *Dylan Rajasekaram* (9 minutes ago)
- `af2f99906` Merge branch 'master' of https://github.com/dlnraja/com.tuya.zigbee - *Dylan Rajasekaram* (46 seconds ago)
- `2334f112c` chore: Update app.json to v3.0.5 with complete session improvements - *Dylan Rajasekaram* (2 minutes ago)
- `36eed5127` Docs: Auto-update links, paths, README & CHANGELOG [skip ci] - *Dylan Rajasekaram* (5 minutes ago)
- `9076454a2` Merge branch 'master' of https://github.com/dlnraja/com.tuya.zigbee - *Dylan Rajasekaram* (5 minutes ago)
- `7ece0d3ca` feat: Intelligent driver enrichment - 67 drivers with 254 manufacturer IDs + features - *Dylan Rajasekaram* (6 minutes ago)

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details

---

## 👤 Author

**Dylan Rajasekaram**
- Email: dylan.rajasekaram@gmail.com
- GitHub: [@dlnraja](https://github.com/dlnraja)

---

## 🙏 Acknowledgments

Based on the original work by **Johan Bendz** and inspired by:
- [Philips Hue Zigbee](https://github.com/JohanBendz/com.philips.hue.zigbee) by Johan Bendz
- [Aqara & Xiaomi](https://github.com/Maxmudjon/com.maxmudjon.mihomey) by Maxmudjon
- [SONOFF Zigbee](https://github.com/StyraHem/Homey.Sonoff.Zigbee) by StyraHem

---

## ⚡ Status

```
Last Updated:     2025-10-16
Version:          3.0.5
Build Status:     ✅ Passing
Documentation:    ✅ Up to date
GitHub Actions:   ✅ Active
```

**This README is automatically generated and updated by [update-all-links.js](scripts/automation/update-all-links.js)**

---

**💡 Tip:** Use `powershell scripts/automation/smart-commit.ps1 "message"` for automatic docs updates!
