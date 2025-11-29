# 🌐 Universal Zigbee Device App for Homey

![Version](https://img.shields.io/badge/version-5.2.43-blue)
![Devices](https://img.shields.io/badge/devices-1372+-green)
![SDK](https://img.shields.io/badge/SDK-3-orange)
![License](https://img.shields.io/badge/license-GPL--3.0-red)
![Homey](https://img.shields.io/badge/Homey-Pro-blueviolet)

**The most comprehensive Universal Zigbee app for Homey with 1372+ devices from the entire Zigbee ecosystem.**

🏠 **100% Local Control** - No Cloud Required
🔋 **Auto-Detection** - Power Source, Battery Type, Protocol
⚡ **27 Device Categories** - From sensors to smart plugs
🛠️ **SDK3** - Latest Homey Standards
🌍 **Open Source** - Community-driven development

---

## 📊 Statistics

| Metric | Value |
|--------|-------|
| **Total Devices** | 1372+ |
| **Categories** | 27 |
| **SDK Version** | 3 |
| **Homey Compatibility** | >=12.2.0 |
| **Last Updated** | 2025-11-29 |
| **Data Sources** | 15+ |

### 📦 Devices by Category

| Category | Emoji | Count |
|----------|-------|-------|
| Switches | 🎛️ | 228 |
| Lighting | 💡 | 179 |
| Covers | 🪟 | 115 |
| Thermostats | 🏠 | 106 |
| Climate Sensors | 🌡️ | 85 |
| Presence/Radar | 👤 | 86 |
| Smart Plugs | 🔌 | 76 |
| Energy Meters | ⚡ | 69 |
| Contact Sensors | 🚪 | 65 |
| Remotes/Buttons | 🎮 | 58 |
| Safety Sensors | 🚨 | 45 |
| Other | 📡 | 260+ |

---

## 🚀 Latest Updates - v5.2.43

### ✨ Recent Features
- **v5.2.43** - UNBRANDED: Generic drivers organized by category
- **v5.2.42** - ZG-204ZM 5-in-1 multi-sensor (like Aqara FP300)
- **v5.2.41** - +14 radar sensors from community
- **v5.2.40** - FP300-like radar features (sensitivity, range, fading time)
- **v5.2.39** - Major driver enhancements (curtain, TRV, plug)
- **v5.2.38** - Curtain motor + TS011F 20A plug support
- **v5.2.37** - ZG-204ZM radar Tuya DP support
- **v5.2.36** - TS0044 4-button remote fix
- **v5.2.35** - TS0201 battery fix

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

### 🔷 Primary Sources

| Source | Repository | Maintainer |
|--------|------------|------------|
| **Zigbee2MQTT** | [github.com/Koenkk/zigbee2mqtt](https://github.com/Koenkk/zigbee2mqtt) | [@Koenkk](https://github.com/Koenkk) |
| **ZHA Quirks** | [github.com/zigpy/zha-device-handlers](https://github.com/zigpy/zha-device-handlers) | [@dmulcahey](https://github.com/dmulcahey) |
| **Blakadder DB** | [zigbee.blakadder.com](https://zigbee.blakadder.com) | [@blakadder](https://github.com/blakadder) |
| **JohanBendz Tuya** | [github.com/JohanBendz/com.tuya.zigbee](https://github.com/JohanBendz/com.tuya.zigbee) | [@JohanBendz](https://github.com/JohanBendz) |

### 🔶 Secondary Sources

| Source | Link |
|--------|------|
| **Tuya Developer** | [developer.tuya.com](https://developer.tuya.com) |
| **SmartThings Edge** | [community.smartthings.com](https://community.smartthings.com) |
| **deCONZ/Phoscon** | [github.com/dresden-elektronik](https://github.com/dresden-elektronik/deconz-rest-plugin) |
| **Jeedom Zigbee** | [github.com/jeedom/plugin-zigbee](https://github.com/jeedom/plugin-zigbee) |
| **Zigbee-OTA** | [github.com/Koenkk/zigbee-OTA](https://github.com/Koenkk/zigbee-OTA) |

### 👥 Key Contributors

**Zigbee2MQTT Team:**
- [@Koenkk](https://github.com/Koenkk) - Creator & Lead Maintainer
- [@Nerivec](https://github.com/Nerivec), [@sjorge](https://github.com/sjorge), [@arteck](https://github.com/arteck)

**ZHA Team:**
- [@dmulcahey](https://github.com/dmulcahey) - Creator
- [@Adminiuga](https://github.com/Adminiuga), [@puddly](https://github.com/puddly)

**Homey Community:**
- **@Laborhexe** - ZG-204ZM device interview
- **@Jocke_Svensson**, **@SunBeech**, **@Cam**, **@telenut** - Testing
- **@Patrickske1** - Curtain motor issue report

📄 **Full credits:** See [CREDITS.md](./CREDITS.md)

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
