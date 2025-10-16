# 🏠 Universal Tuya Zigbee

[![Version](https://img.shields.io/badge/version-3.0.21-blue.svg)](https://github.com/dlnraja/com.tuya.zigbee)
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
Version:              3.0.21
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

### Version 3.0.17 - 2025-10-16

- ✅ **Tuya TS0601 Devices Now Working**: Gas sensors, some motion sensors, water leak detectors
- ✅ Fixed `Error: Cannot find module '../../utils/tuya-cluster-handler'`
- ✅ All TS0601-based devices now properly initialize
- `utils/tuya-cluster-handler.js`: Universal handler for Tuya proprietary cluster
- Automatic device type detection (GAS_DETECTOR, MULTI_SENSOR, etc.)

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

- `619a443f7` fix: Add required README.txt for Homey App Store - *Dylan Rajasekaram* (3 minutes ago)
- `a0064333f` Update Homey App Version to v3.0.21 - *github-actions[bot]* (3 minutes ago)
- `e1d2a2816` Docs: Auto-update links, paths, README & CHANGELOG [skip ci] - *Dylan Rajasekaram* (5 minutes ago)
- `6439fe0fc` fix: Workflow versioning - Handle existing tags correctly - *Dylan Rajasekaram* (8 minutes ago)
- `c2f09341b` Update Homey App Version to v3.0.20 - *github-actions[bot]* (14 minutes ago)

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
Version:          3.0.21
Build Status:     ✅ Passing
Documentation:    ✅ Up to date
GitHub Actions:   ✅ Active
```

**This README is automatically generated and updated by [update-all-links.js](scripts/automation/update-all-links.js)**

---

**💡 Tip:** Use `powershell scripts/automation/smart-commit.ps1 "message"` for automatic docs updates!


<!-- AUTO-GENERATED-DRIVERS-START -->
## 📱 Supported Devices

> **Auto-generated list** - Updated automatically

**Total:** 183 drivers | 6834+ device IDs

### 🌡️ Temperature & Climate

<details>
<summary><strong>93 drivers</strong> - Click to expand</summary>

- **Advanced Smoke Detector with Temperature & Humidity (Battery)** - 47 device IDs
- **air quality monitor** - 42 device IDs
- **air quality monitor pro (Battery)** - 38 device IDs
- **Ceiling Light Controller** - 39 device IDs
- **climate monitor (Battery)** - 24 device IDs
- **CO Detector Pro (Battery)** - 45 device IDs
- **CO₂ Sensor (Battery)** - 44 device IDs
- **co2 temp humidity (Battery)** - 28 device IDs
- **Comprehensive Air Monitor** - 21 device IDs
- **Contact Sensor Battery (Battery)** - 9 device IDs
- **Curtain Motor (Battery)** - 25 device IDs
- **Door Lock (Battery)** - 45 device IDs
- **Door Window Sensor (Battery)** - 45 device IDs
- **Doorbell (Battery)** - 25 device IDs
- **Doorbell Camera Ac** - 2 device IDs
- **Fan Controller** - 47 device IDs
- **Formaldehyde Sensor (Battery)** - 44 device IDs
- **Garage Door Controller (Battery)** - 28 device IDs
- **Garage Door Opener (Battery)** - 25 device IDs
- **Gas Detector (Battery)** - 62 device IDs
- **Gas Sensor TS0601 (AC)** - 9 device IDs
- **Gas Sensor TS0601 (Battery)** - 23 device IDs
- **humidity controller (Battery)** - 22 device IDs
- **Hvac Controller** - 22 device IDs
- **Led Strip (Battery)** - 27 device IDs
- **LED Strip Controller** - 52 device IDs
- **led strip controller pro** - 38 device IDs
- **Lux Sensor (Battery)** - 44 device IDs
- **Mi-Light Controller** - 39 device IDs
- **Mini Switch (Battery)** - 39 device IDs
- **Mini Switch AC** - 41 device IDs
- **Motion Sensor (mmWave Radar, Battery)** - 64 device IDs
- **Motion Sensor (PIR, Battery)** - 59 device IDs
- **Motion Sensor with Illuminance (Battery)** - 22 device IDs
- **Multi-Sensor (Motion + Lux + Temp) (Battery)** - 38 device IDs
- **Multisensor (Battery)** - 43 device IDs
- **Noise Level Sensor (Battery)** - 44 device IDs
- **Outdoor Light Controller (Battery)** - 47 device IDs
- **Outdoor Siren (Battery)** - 31 device IDs
- **PIR Motion Sensor (Battery)** - 56 device IDs
- **PIR Motion Sensor (Battery)** - 40 device IDs
- **PIR Motion Sensor (Battery)** - 52 device IDs
- **PIR Motion Sensor Advanced (Battery)** - 44 device IDs
- **PIR Radar Illumination Sensor Battery (Battery)** - 27 device IDs
- **pm25 detector (Battery)** - 57 device IDs
- **Pm25 Sensor (Battery)** - 44 device IDs
- **Pool Pump Controller** - 46 device IDs
- **Presence Sensor Mmwave Battery (Battery)** - 3 device IDs
- **Presence Sensor Radar (Battery)** - 48 device IDs
- **Pressure Sensor (Battery)** - 44 device IDs
- **Projector Screen Controller** - 46 device IDs
- **Radar Motion Sensor Advanced (Battery)** - 52 device IDs
- **Radar Motion Sensor Pro (Battery)** - 53 device IDs
- **Radar Presence Sensor (mmWave) (Battery)** - 54 device IDs
- **RGB LED Controller** - 39 device IDs
- **Roller Shutter Controller (Battery)** - 24 device IDs
- **Scene Controller** - 36 device IDs
- **Scene Switch (Battery)** - 56 device IDs
- **Shade Controller** - 47 device IDs
- **Smart Doorbell (Battery)** - 45 device IDs
- **Smart Garden Sprinkler (Battery)** - 45 device IDs
- **Smart Irrigation Controller** - 45 device IDs
- **smart outlet monitor** - 38 device IDs
- **Smart Smoke Detector Advanced (Battery)** - 56 device IDs
- **Smart Valve Controller** - 27 device IDs
- **Smart Water Valve** - 28 device IDs
- **Smoke Detector (Battery)** - 14 device IDs
- **Smoke Detector with Temperature (Battery)** - 9 device IDs
- **Smoke Temperature Humidity Sensor (Battery)** - 48 device IDs
- **Soil Moisture & Temperature Sensor (Battery)** - 47 device IDs
- **Soil Moisture Sensor (Battery)** - 5 device IDs
- **Soil Tester Temperature Humidity (Battery)** - 21 device IDs
- **Solar Panel Controller** - 37 device IDs
- **Tank Level Monitor (Battery)** - 24 device IDs
- **temp sensor pro (Battery)** - 43 device IDs
- **Temperature & Humidity Sensor (Battery)** - 44 device IDs
- **Temperature Controller** - 21 device IDs
- **Temperature Humidity Display (Battery)** - 6 device IDs
- **Temperature Humidity Sensor (Battery)** - 30 device IDs
- **Temperature Humidity Sensor v1w2k9dd (Battery)** - 45 device IDs
- **Temperature Sensor (Battery)** - 45 device IDs
- **Temperature Sensor THS317-ET-TU (Battery)** - 43 device IDs
- **Tvoc Sensor (Battery)** - 44 device IDs
- **TVOC Sensor Advanced (Battery)** - 43 device IDs
- **Vibration Sensor (Battery)** - 45 device IDs
- **Water Leak Detector (Battery)** - 46 device IDs
- **Water Leak Detector Advanced (Battery)** - 46 device IDs
- **Water Leak Sensor** - 40 device IDs
- **Water Leak Sensor (Battery)** - 47 device IDs
- **Water Valve** - 28 device IDs
- **Water Valve Smart** - 28 device IDs
- **Zigbee Bridge Hub AC** - 29 device IDs
- **Zigbee Gateway Hub** - 29 device IDs

</details>

### 💡 Smart Lighting

<details>
<summary><strong>17 drivers</strong> - Click to expand</summary>

- **Bulb White Ac** - 4 device IDs
- **Bulb White Ambiance Ac** - 7 device IDs
- **Ceiling Fan** - 41 device IDs
- **ceiling light rgb** - 41 device IDs
- **Color & White Bulb** - 23 device IDs
- **Color Bulb (RGB)** - 40 device IDs
- **Dimmer Switch** - 41 device IDs
- **Dimmer Switch Timer Module** - 40 device IDs
- **LED Strip Advanced** - 38 device IDs
- **Led Strip Outdoor Color Ac** - 3 device IDs
- **smart bulb dimmer** - 39 device IDs
- **Smart Bulb Tunable** - 40 device IDs
- **Smart Bulb White** - 40 device IDs
- **Smart Dimmer Module 1 Gang** - 40 device IDs
- **Smart Spot** - 42 device IDs
- **Touch Dimmer** - 39 device IDs
- **Touch Dimmer 1-Gang** - 40 device IDs

</details>

### 🔌 Power & Energy

<details>
<summary><strong>51 drivers</strong> - Click to expand</summary>

- **1-Button Wireless Scene Switch (Battery)** - 58 device IDs
- **1-Gang Wall Switch** - 39 device IDs
- **1-Gang Wall Switch** - 40 device IDs
- **1-Gang Wall Switch** - 40 device IDs
- **1-Gang Wall Switch** - 39 device IDs
- **1-Gang Wall Switch (AC)** - 40 device IDs
- **2-Button Wireless Scene Switch (Battery)** - 48 device IDs
- **2-Gang Wall Switch** - 39 device IDs
- **2-Gang Wall Switch** - 40 device IDs
- **2-Gang Wall Switch** - 40 device IDs
- **2-Gang Wall Switch** - 39 device IDs
- **2-Gang Wall Switch (AC)** - 40 device IDs
- **3-Button Wireless Scene Switch (Battery)** - 47 device IDs
- **3-Gang Wall Switch** - 39 device IDs
- **3-Gang Wall Switch** - 40 device IDs
- **3-Gang Wall Switch** - 39 device IDs
- **3-Gang Wall Switch (AC)** - 40 device IDs
- **4-Button Remote** - 47 device IDs
- **4-Button Wireless Scene Switch (Battery)** - 47 device IDs
- **4-Gang Wall Switch** - 39 device IDs
- **4-Gang Wall Switch** - 40 device IDs
- **4-Gang Wall Switch** - 40 device IDs
- **4-Gang Wall Switch** - 39 device IDs
- **5-Button Remote** - 47 device IDs
- **5-Gang Wall Switch** - 42 device IDs
- **6-Button Remote** - 47 device IDs
- **6-Gang Wall Switch** - 40 device IDs
- **Dimmer Switch 1-Gang AC** - 57 device IDs
- **Dimmer Switch 3-Gang AC** - 50 device IDs
- **Energy Monitoring Plug** - 45 device IDs
- **energy plug advanced** - 47 device IDs
- **Energy Plug Advanced** - 46 device IDs
- **Extension Plug** - 50 device IDs
- **power meter socket** - 47 device IDs
- **Relay Switch 1-Gang AC** - 40 device IDs
- **Smart Plug** - 50 device IDs
- **smart plug energy** - 60 device IDs
- **Smart Plug Power Meter 16a Ac** - 13 device IDs
- **Smart Plug with Dimmer (AC)** - 9 device IDs
- **Switch 1-Gang Battery CR2032 (Battery)** - 59 device IDs
- **Switch 2-Gang AC Power** - 40 device IDs
- **Switch 2-Gang Hybrid AC/DC** - 39 device IDs
- **Switch 3-Gang Battery CR2450 (Battery)** - 58 device IDs
- **Switch 4-Gang AC Power** - 40 device IDs
- **Switch 4-Gang Remote (Battery)** - 57 device IDs
- **Switch 5-Gang Battery CR2450 (Battery)** - 57 device IDs
- **Switch 6-Gang AC Power** - 40 device IDs
- **Switch 8-Gang AC Power** - 40 device IDs
- **USB Outlet** - 40 device IDs
- **USB Outlet Advanced** - 38 device IDs
- **Wall Switch 3-Gang AC** - 40 device IDs

</details>

### 🎛️ Automation Control

<details>
<summary><strong>9 drivers</strong> - Click to expand</summary>

- **2-Button Remote** - 32 device IDs
- **2-Button Remote** - 2 device IDs
- **4-Button Remote** - 41 device IDs
- **6-Button Remote** - 32 device IDs
- **8-Button Remote** - 32 device IDs
- **Remote Switch (Battery)** - 46 device IDs
- **SOS Emergency Button (Battery)** - 47 device IDs
- **Wireless Scene Controller 4-Button (Battery)** - 14 device IDs
- **Wireless Switch (Battery)** - 48 device IDs

</details>

### 🔔 Contact & Security

<details>
<summary><strong>2 drivers</strong> - Click to expand</summary>

- **Fingerprint Lock (Battery)** - 59 device IDs
- **Smart Lock (Battery)** - 31 device IDs

</details>

### 🔧 Other Devices

<details>
<summary><strong>11 drivers</strong> - Click to expand</summary>

- **Alarm Siren Chime Ac** - 8 device IDs
- **Curtain Motor (Battery)** - 19 device IDs
- **Pet Feeder (Battery)** - 25 device IDs
- **Radiator Valve** - 44 device IDs
- **Roller Shutter Switch (Battery)** - 29 device IDs
- **Roller Shutter Switch Advanced (Battery)** - 45 device IDs
- **Smart Curtain Motor** - 5 device IDs
- **Smart Radiator Valve** - 16 device IDs
- **Smart Thermostat** - 27 device IDs
- **Thermostat** - 27 device IDs
- **Wireless Dimmer Scroll Battery (Battery)** - 2 device IDs

</details>

---

*Last updated: 2025-10-16*

<!-- AUTO-GENERATED-DRIVERS-END -->
