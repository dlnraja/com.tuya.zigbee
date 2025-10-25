# Universal Tuya Zigbee

![Version](https://img.shields.io/badge/version-4.9.8-blue)
![Drivers](https://img.shields.io/badge/drivers-163-green)
![SDK](https://img.shields.io/badge/SDK-3-orange)
![License](https://img.shields.io/badge/license-GPL--3.0-red)

Community-maintained Universal Zigbee app with 186 unified hybrid drivers and 18,000+ manufacturer IDs. 100% local control, no cloud required. Intelligent auto-detection of power source and battery type. Advanced energy management with flow cards. SDK3 compliant.

## 📊 Statistics

- **Total Drivers:** 163
- **SDK Version:** 3
- **Homey Compatibility:** >=12.2.0
- **Last Updated:** 2025-10-25

### Drivers by Category

- **Other:** 57 drivers
- **Switches:** 45 drivers
- **Sensors:** 21 drivers
- **Buttons:** 18 drivers
- **Power:** 17 drivers
- **Lighting:** 7 drivers
- **Climate:** 6 drivers

## 🚀 Latest Updates

- [`b31a5c50c`] feat: Autonomous automation system + 39 coherence fixes *(5 minutes ago)*
- [`2bbf8bb19`] chore: Auto-increment version to v4.9.8 [skip ci] *(11 minutes ago)*
- [`24d9f1e2a`] Docs: Auto-update links, paths, README & CHANGELOG [skip ci] *(17 minutes ago)*
- [`19c02a263`] chore: update device matrix [skip ci] *(18 minutes ago)*
- [`eb5052b93`] Fix: Deep coherence fixes - 39 automatic corrections *(21 minutes ago)*

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

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Run validation: `homey app validate`
4. Submit a pull request

## 📝 License

GPL-3.0 - See LICENSE file

## 🔗 Links

- **Homey App Store:** https://homey.app/a/com.dlnraja.tuya.zigbee/
- **GitHub Repository:** https://github.com/dlnraja/com.tuya.zigbee
- **GitHub Actions:** https://github.com/dlnraja/com.tuya.zigbee/actions
- **Issues & Support:** https://github.com/dlnraja/com.tuya.zigbee/issues

## 📞 Support

For issues and questions:
- Check existing issues: [GitHub Issues](https://github.com/dlnraja/com.tuya.zigbee/issues)
- Homey Community Forum: [Universal TUYA Zigbee](https://community.homey.app/)
- Diagnostic reports: Submit via Homey app settings

---

*This README is automatically updated on each commit by AUTO_README_UPDATER.js*

*Last auto-update: 2025-10-25*
