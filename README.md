# 🏠 Universal Tuya Zigbee

[![Version](https://img.shields.io/badge/version-2.15.133-blue.svg)](https://github.com/dlnraja/com.tuya.zigbee)
[![SDK](https://img.shields.io/badge/SDK-3-green.svg)](https://apps.developer.homey.app)
[![Homey](https://img.shields.io/badge/Homey->=12.2.0-orange.svg)](https://homey.app)
[![Drivers](https://img.shields.io/badge/drivers-183-brightgreen.svg)](https://github.com/dlnraja/com.tuya.zigbee/tree/master/drivers)
[![License](https://img.shields.io/badge/license-MIT-lightgrey.svg)](LICENSE)

Community-maintained Tuya Zigbee app with 183 SDK3 native drivers. Based on Johan Bendz's original work. 100% local control, no cloud required. Active development and support for 300+ device IDs. User-friendly driver names for easy pairing.

---

## 📊 Statistics

```
Drivers:              183
SDK Version:          3
Homey Compatibility:  >=12.2.0
Version:              2.15.133
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
tuya_repair/
├── 📄 FICHIERS RACINE (essentiels seulement)
│   ├── README.md              ← Documentation principale
│   ├── CHANGELOG.md           ← Historique versions
│   ├── LICENSE                ← Licence MIT
│   ├── app.json              ← Config Homey (généré)
│   ├── package.json          ← Dépendances Node
│   └── .env                  ← Variables environnement
│
├── 📁 DOSSIERS HOMEY (SDK)
│   ├── drivers/              ← 183 drivers Zigbee
│   ├── lib/                  ← Bibliothèques partagées
│   ├── utils/                ← Utilitaires helpers
│   ├── assets/               ← Images app
│   ├── locales/              ← Traductions
│   ├── settings/             ← Interface settings
│   └── api/                  ← API endpoints
│
├── 📁 DOCUMENTATION
│   ├── docs/
│   │   ├── fixes/            ← Docs corrections bugs
│   │   ├── workflow/         ← Docs workflow GitHub
│   │   ├── community/        ← Analyse apps communautaires
│   │   └── forum/            ← Réponses forum users
│   │
│   └── references/           ← Références techniques
│
├── 📁 SCRIPTS
│   ├── scripts/
│   │   ├── fixes/            ← Scripts correction bugs
│   │   ├── automation/       ← Scripts Git/Publish
│   │   └── utils/            ← Scripts utilitaires
│   │
│   └── ultimate_system/      ← Système automatisation avancé
│
├── 📁 DATA & REPORTS
│   ├── project-data/         ← Données projet
│   ├── reports/              ← Rapports validation
│   └── github-analysis/      ← Analyses GitHub
│
└── 📁 CONFIGURATION
    ├── .github/              ← GitHub Actions workflows
    ├── .vscode/              ← Config VS Code
    ├── .gitignore            ← Fichiers ignorés Git
    └── .homeyignore          ← Fichiers ignorés Homey
```

**Complete documentation:** [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)

---

## 🔄 Recent Updates

### Version 2.15.98 - 2025-01-15

- **IASZoneEnroller Library** - Multi-method enrollment system with automatic fallback
- **Comprehensive Documentation**
- **Motion Sensor** (`motion_temp_humidity_illumination_multi_battery`)
- **SOS Emergency Button** (`sos_emergency_button_cr2032`)
- No longer dependent on Homey IEEE address

**Full changelog:** [CHANGELOG.md](CHANGELOG.md)

---

## 🐛 Recent Fixes

- [STATUS_FINAL.md](docs/fixes/STATUS_FINAL.md) (2025-10-16)
- [EMAIL_CORRECTION_SUMMARY.md](docs/fixes/EMAIL_CORRECTION_SUMMARY.md) (2025-10-16)
- [CRITICAL_FIX_SUMMARY_v2.15.130.md](docs/fixes/CRITICAL_FIX_SUMMARY_v2.15.130.md) (2025-10-16)

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

- `3e0fc6186` Version: Bump to 2.15.133 (2.15.132 already published) - *Dylan Rajasekaram* (5 minutes ago)
- `d42ffda05` Merge branch 'master' of https://github.com/dlnraja/com.tuya.zigbee - *Dylan Rajasekaram* (8 minutes ago)
- `02850e640` Docs: Integration forum - Support Tuya Zigbee Local + Smart Plugs FAQ (sans cloud, 100% local) - *Dylan Rajasekaram* (11 minutes ago)
- `41a48da79` Docs: Auto-update links, paths, README & CHANGELOG [skip ci] - *Dylan Rajasekaram* (22 minutes ago)
- `6341e2178` Merge branch 'master' of https://github.com/dlnraja/com.tuya.zigbee - *Dylan Rajasekaram* (23 minutes ago)
- `d42ffda05` Merge branch 'master' of https://github.com/dlnraja/com.tuya.zigbee - *Dylan Rajasekaram* (43 seconds ago)
- `02850e640` Docs: Integration forum - Support Tuya Zigbee Local + Smart Plugs FAQ (sans cloud, 100% local) - *Dylan Rajasekaram* (4 minutes ago)
- `41a48da79` Docs: Auto-update links, paths, README & CHANGELOG [skip ci] - *Dylan Rajasekaram* (15 minutes ago)
- `6341e2178` Merge branch 'master' of https://github.com/dlnraja/com.tuya.zigbee - *Dylan Rajasekaram* (16 minutes ago)
- `e15bb9a19` Feature: Systeme complet mise a jour automatique (README + liens + CHANGELOG + GitHub Actions) - *Dylan Rajasekaram* (17 minutes ago)

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
Version:          2.15.133
Build Status:     ✅ Passing
Documentation:    ✅ Up to date
GitHub Actions:   ✅ Active
```

**This README is automatically generated and updated by [update-all-links.js](scripts/automation/update-all-links.js)**

---

**💡 Tip:** Use `powershell scripts/automation/smart-commit.ps1 "message"` for automatic docs updates!
