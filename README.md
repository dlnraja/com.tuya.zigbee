# 🏠 Universal Tuya Zigbee

[![Version](https://img.shields.io/badge/version-3.0.50-blue.svg)](https://github.com/dlnraja/com.tuya.zigbee)
[![SDK](https://img.shields.io/badge/SDK-3-green.svg)](https://apps.developer.homey.app)
[![Homey](https://img.shields.io/badge/Homey->=12.2.0-orange.svg)](https://homey.app)
[![Drivers](https://img.shields.io/badge/drivers-183-brightgreen.svg)](matrix/DEVICE_MATRIX.md)
[![Build & Validate](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/build.yml/badge.svg)](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/build.yml)
[![Complete Validation](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/complete-validation.yml/badge.svg)](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/complete-validation.yml)
[![License](https://img.shields.io/badge/license-MIT-lightgrey.svg)](LICENSE)

**Community-maintained Tuya Zigbee app** with 183 SDK3 native drivers. 100% local control, no cloud required. Active development with comprehensive device support.

---

## 🚀 Start Here

**New User?** Follow these steps:

1. **📥 Install** → [Via Homey CLI](#from-homey-cli-recommended) (recommended) or [wait for App Store](#from-homey-app-store)
2. **🔍 Check Compatibility** → [Device Matrix](matrix/DEVICE_MATRIX.md) (183 drivers, 550+ device IDs)
3. **📚 Learn** → [Zigbee Cookbook](ZIGBEE_COOKBOOK.md) (pairing, troubleshooting, best practices)
4. **🆕 Request Device** → [Device Request Template](.github/ISSUE_TEMPLATE/device-request.md)
5. **💬 Get Help** → [Homey Community Forum](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352)

---

## ✨ Key Features

- ✅ **183 Native Zigbee Drivers** - Comprehensive device coverage
- ✅ **100% Local Control** - No cloud dependency, works offline
- ✅ **SDK3 Architecture** - Modern Homey SDK implementation
- ✅ **Multi-brand Support** - Compatible with 550+ device IDs
- ✅ **Active Development** - Regular updates and community support
- ✅ **CI/CD Pipeline** - Automated validation and publishing

---

## 📥 Installation

### Method 1: Homey CLI (Recommended - Available Now)

**Why CLI?** Get latest features immediately, no waiting for Store approval.

```bash
# Install Homey CLI (once)
npm install -g homey

# Clone and install app
git clone https://github.com/dlnraja/com.tuya.zigbee.git
cd com.tuya.zigbee
npm install
homey app install
```

**Requirements**: Node.js 18+, npm, Homey account

---

### Method 2: Homey App Store (Coming Soon)

> ⚠️ **Status**: App Store submission pending Athom review  
> ⏰ **ETA**: Review typically takes 1-7 days  
> 📌 **Use CLI above** for immediate access

**Once live**:
1. Open Homey app → **More** → **Apps**
2. Search for "**Universal Tuya Zigbee**"
3. Click **Install**

We'll update this README with Store link once live.

---

## 🔍 Transparency & Quality (CI/CD)

We believe in **radical transparency**. Every build publishes public artifacts:

### 📊 What We Publish

| Artifact | Description | Link |
|----------|-------------|------|
| **Validation Logs** | Full `homey app validate --level publish` output | [Download](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/build.yml) |
| **Device Matrix** | JSON/CSV of all 183 drivers + 550+ device IDs | [View](matrix/DEVICE_MATRIX.md) / [JSON](matrix/devices.json) |
| **Investigation Report** | Automated quality checks + coverage stats | [Download](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/build.yml) |
| **ESLint Results** | Code quality analysis | [Download](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/build.yml) |

### ✅ Quality Gates

- **Homey Validation**: ✅ PASSED (publish level, 0 errors)
- **Device Matrix**: ✅ 183 drivers, auto-generated every build
- **Battery Coverage**: ✅ 100% (166/166 battery drivers)
- **IAS Zone Coverage**: ✅ 100% (30/30 alarm drivers)
- **CI/CD**: ✅ Automated on every commit

### 🔗 Live Status

[![Build & Validate](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/build.yml/badge.svg)](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/build.yml) ← **Click for latest validation logs**

**How to verify**:
1. Click badge above → View latest workflow run
2. Scroll to **Artifacts** section
3. Download `build-artifacts.zip`
4. Contains: validation logs, device matrix, investigation report

**Updated**: Every push to `master` branch (typically daily)

---

## 📊 Supported Devices (183 Drivers)

### 🚨 Motion & Presence Detection (14)

<details>
<summary>View all 14 drivers</summary>

- Motion Sensor Battery
- Motion Sensor Illuminance Battery
- Motion Sensor Mmwave Battery
- Motion Sensor Pir Ac Battery
- Motion Sensor Pir Battery
- Motion Sensor Zigbee 204z Battery
- Motion Temp Humidity Illumination Multi Battery
- Pir Radar Illumination Sensor Battery
- Pir Sensor Advanced Battery
- Presence Sensor Mmwave Battery
- Presence Sensor Radar Battery
- Radar Motion Sensor Advanced Battery
- Radar Motion Sensor Mmwave Battery
- Radar Motion Sensor Tank Level Battery

</details>

### 🚪 Contact & Security (14)

<details>
<summary>View all 14 drivers</summary>

- Contact Sensor Battery
- Door Controller Ac
- Door Lock Battery
- Door Window Sensor Battery
- Doorbell Camera Ac
- Doorbell Cr2032
- Fingerprint Lock Battery
- Garage Door Controller Ac
- Garage Door Opener Cr2032
- Led Strip Outdoor Color Ac
- Outdoor Light Controller Ac
- Outdoor Siren Cr2032
- Smart Doorbell Battery
- Smart Lock Battery

</details>

### 🌡️ Temperature & Climate (20)

<details>
<summary>View all 20 drivers</summary>

- Climate Monitor Cr2032
- Co2 Temp Humidity Cr2032
- Humidity Controller Ac
- Hvac Controller Ac
- Smart Thermostat Hybrid
- Smoke Detector Temp Humidity Advanced Battery
- Smoke Detector Temperature Battery
- Smoke Temp Humid Sensor Battery
- Soil Moisture Temperature Sensor Battery
- Soil Tester Temp Humid Cr2032
- Temp Humid Sensor Advanced Battery
- Temp Humid Sensor Dd Battery
- Temp Humid Sensor Leak Detector Battery
- Temp Sensor Pro Battery
- Temperature Controller Hybrid
- Temperature Humidity Display Battery
- Temperature Humidity Sensor Battery
- Temperature Sensor Advanced Battery
- Temperature Sensor Battery
- Thermostat Hybrid

</details>

### 💡 Smart Lighting (23)

<details>
<summary>View all 23 drivers</summary>

- Bulb Color Rgbcct Ac
- Bulb White Ac
- Bulb White Ambiance Ac
- Ceiling Light Controller Ac
- Ceiling Light Rgb Ac
- Dimmer Ac
- Dimmer Switch 1gang Ac
- Dimmer Switch 3gang Ac
- Dimmer Switch Timer Module Ac
- Led Strip Advanced Ac
- Led Strip Controller Ac
- Led Strip Controller Pro Ac
- Milight Controller Ac
- Rgb Led Controller Ac
- Smart Bulb Dimmer Ac
- Smart Bulb Rgb Ac
- Smart Bulb Tunable Ac
- Smart Bulb White Ac
- Smart Dimmer Module 1gang Ac
- Smart Plug Dimmer Ac
- Touch Dimmer 1gang Ac
- Touch Dimmer Ac
- Wireless Dimmer Scroll Battery

</details>

### 🔌 Power & Energy (11)

<details>
<summary>View all 11 drivers</summary>

- Energy Monitoring Plug Ac
- Energy Monitoring Plug Advanced Ac
- Energy Plug Advanced Ac
- Extension Plug Ac
- Power Meter Socket Ac
- Smart Outlet Monitor Ac
- Smart Plug Ac
- Smart Plug Energy Ac
- Smart Plug Power Meter 16a Ac
- Usb Outlet Ac
- Usb Outlet Advanced Ac

</details>

### ⚠️ Safety & Detection (13)

<details>
<summary>View all 13 drivers</summary>

- Alarm Siren Chime Ac
- Co Detector Pro Battery
- Gas Detector Battery
- Gas Sensor Ts0601 Ac
- Gas Sensor Ts0601 Battery
- Smart Smoke Detector Advanced Battery
- Smart Water Valve Hybrid
- Smoke Detector Battery
- Water Leak Detector Advanced Battery
- Water Leak Detector Battery
- Water Leak Sensor Battery
- Water Valve Hybrid
- Water Valve Smart Hybrid

</details>

### 🎛️ Automation Control (15)

<details>
<summary>View all 15 drivers</summary>

- Remote Switch Cr2032
- Roller Shutter Switch Advanced Battery
- Scene Controller
- Scene Controller 2button Cr2032
- Scene Controller 4button Cr2032
- Scene Controller 6button Cr2032
- Scene Controller 8button Cr2032
- Scene Controller Battery
- Sos Emergency Button Cr2032
- Switch 1gang Battery
- Switch 3gang Battery
- Switch 4gang Battery Cr2032
- Switch 5gang Battery
- Wireless Button 2gang Battery
- Wireless Scene Controller 4button Battery

</details>

### 🔧 Other Devices (73)

<details>
<summary>View all 73 drivers</summary>

- Air Quality Monitor Ac
- Air Quality Monitor Pro Battery
- Ceiling Fan Ac
- Co2 Sensor Battery
- Comprehensive Air Monitor Ac
- Curtain Motor Ac
- Fan Controller Ac
- Formaldehyde Sensor Battery
- Lux Sensor Battery
- Mini Ac
- Mini Switch Cr2032
- Multisensor Battery
- Noise Level Sensor Battery
- Pet Feeder Cr2032
- Pm25 Detector Battery
- Pm25 Sensor Battery
- Pool Pump Controller Ac
- Pressure Sensor Battery
- Projector Screen Controller Ac
- Radiator Valve Hybrid
- Relay Switch 1gang Ac
- Roller Blind Controller Ac
- Roller Shutter Controller Ac
- Roller Shutter Switch Cr2032
- Shade Controller Ac
- Smart Curtain Motor Hybrid
- Smart Garden Sprinkler Battery
- Smart Irrigation Controller Hybrid
- Smart Radiator Valve Hybrid
- Smart Spot Ac
- Smart Switch 1gang Ac
- Smart Switch 1gang Hybrid
- Smart Switch 2gang Ac
- Smart Switch 2gang Hybrid
- Smart Switch 3gang Ac
- Smart Switch 3gang Hybrid
- Smart Switch 4gang Hybrid
- Smart Valve Controller Hybrid
- Soil Moisture Sensor Battery
- Solar Panel Controller Hybrid
- Switch 2gang Ac
- Switch 2gang Hybrid
- Switch 4gang Ac
- Switch 6gang Ac
- Switch 8gang Ac
- Tank Level Monitor Cr2032
- Touch Switch 1gang Ac
- Touch Switch 2gang Ac
- Touch Switch 3gang Ac
- Touch Switch 4gang Ac
- Tvoc Sensor Advanced Battery
- Tvoc Sensor Battery
- Vibration Sensor Battery
- Wall Switch 1gang Ac
- Wall Switch 1gang Dc
- Wall Switch 2gang Ac
- Wall Switch 2gang Dc
- Wall Switch 3gang Ac
- Wall Switch 3gang Dc
- Wall Switch 4gang Ac
- Wall Switch 4gang Dc
- Wall Switch 5gang Ac
- Wall Switch 6gang Ac
- Wireless Switch 1gang Cr2032
- Wireless Switch 2gang Cr2032
- Wireless Switch 3gang Cr2032
- Wireless Switch 4gang Cr2032
- Wireless Switch 4gang Cr2450
- Wireless Switch 5gang Cr2032
- Wireless Switch 6gang Cr2032
- Wireless Switch Cr2032
- Zbbridge Ac
- Zigbee Gateway Hub Ac

</details>

---

## 🔄 Recent Updates

**Version 3.0.37** - Latest changes in [CHANGELOG.md](CHANGELOG.md)

### v3.0.37 - IAS Zone Enrollment Fix
- ✅ Fixed crash: "Zigbee is aan het opstarten" (6 crashes eliminated)
- ✅ Listener-only approach per Homey SDK best practices
- ✅ All IAS Zone devices (motion/contact/buttons) now stable

### v3.0.17 - TS0601 Device Support
- ✅ Tuya TS0601 devices now working (gas sensors, leak detectors)
- ✅ Fixed `Error: Cannot find module '../../utils/tuya-cluster-handler'`
- ✅ Universal handler for Tuya proprietary cluster (EF00)

**Full changelog:** [CHANGELOG.md](CHANGELOG.md)

---

## 🔍 Transparence (CI)

> **Public Artifacts** - Every commit generates verifiable evidence

### Validation Logs
- **Latest:** [CI Complete – Validation & Matrix Generation](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/ci-complete.yml)
- **Command:** `homey app validate --level publish`
- **Status:** ✅ Zero errors, warnings only

### Device Matrix
- **Export:** [Matrix Export workflow artifacts](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/matrix-export.yml)
- **Formats:** JSON (`devices.json`) + CSV (`devices.csv`)
- **Content:** 183 drivers × 6834+ device IDs with clusters

**💡 Download:** Click on a run → "Artifacts" section → `validation-report` or `device-matrix`

---

## 📚 Documentation

### For Users
- [Installation Guide](docs/guides/INSTALLATION.md) - Step-by-step setup
- [Device Support](docs/guides/DEVICE_SUPPORT.md) - Compatibility list
- [Troubleshooting](docs/guides/TROUBLESHOOTING.md) - Common issues

### For Developers
- [Tuya Engine (Declarative)](docs/guides/TUYA_ENGINE_DEV.md) - Add devices via JSON
- [Device Matrix](docs/guides/DEVICE_MATRIX.md) - Regenerate matrix (JSON/CSV)
- [Project Structure](PROJECT_STRUCTURE.md) - Complete documentation
- [Contributing](CONTRIBUTING.md) - PR checklist and guidelines

### Bug Fixes & Reports
- [Critical Fixes](docs/fixes/) - Latest bug fixes
- [IAS Zone Fix](docs/fixes/PETER_IAS_ZONE_FIX_COMPLETE.md) - Sensor enrollment fix

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:
- PR checklist (lint, validate, matrix, issue)
- Code standards (UNBRANDED by function)
- Device request template

**Report issues:** [GitHub Issues](https://github.com/dlnraja/com.tuya.zigbee/issues)

---

## 📝 License

MIT License - see [LICENSE](LICENSE) for details

---

## 🙏 Acknowledgments

Built with contributions from:
- Homey Community Forum
- Zigbee2MQTT Database
- Johan Bendz (inspiration)
- Home Assistant / Blakadder

**Support:** [Homey Community Forum](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test)

---

<p align="center">
  <strong>Made with ❤️ for the Homey Community</strong><br>
  <em>v3.0.37 | 183 Drivers | 100% Local | No Cloud Required</em>
</p>
