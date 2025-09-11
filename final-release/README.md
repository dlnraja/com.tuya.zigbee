# 🌟 Universal Tuya Zigbee Device App - Enhanced Community Edition

![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)
![Homey](https://img.shields.io/badge/homey->=3.0.0-green.svg)
![Devices](https://img.shields.io/badge/devices-500+-orange.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

**The most comprehensive Tuya Zigbee integration for Homey with AI-powered device detection, exotic sensor support, and community-driven enhancements.**

---

## 🚀 Features

### 🎯 **500+ Device Support**
- Complete Tuya Zigbee device library
- Exotic and lesser-known sensors (soil, radar, fingerbot, IR controllers)
- Generic fallback drivers for future devices
- AI-powered automatic device detection

### 🎨 **Modern Interface**
- Johan Benz style SVG assets with gradients and shadows
- Real-time dashboard with device statistics
- Multi-language support (EN/FR/NL/TA)
- Intuitive device management

### 🔧 **Community Enhanced**
- User-contributed patches and fixes
- Forum feedback integration  
- GitHub community collaboration
- Continuous improvement process

### ⚡ **Advanced Features**
- Zero validation errors (Homey certified)
- Enhanced EF00 cluster support
- Battery optimization for wireless devices
- Robust error handling and recovery

---

## 📱 Supported Device Categories

| Category | Examples | Count |
|----------|----------|-------|
| **Switches & Plugs** | TS0011, TS011F, Multi-gang switches | 50+ |
| **Lights** | TS0501A/B, TS0502A/B, TS0505A/B, RGB/CCT | 75+ |
| **Sensors** | Temperature, humidity, motion, contact | 100+ |
| **Exotic Devices** | Soil sensors, radar, fingerbot, IR controllers | 25+ |
| **Climate** | Thermostats, valves, temperature controllers | 40+ |
| **Security** | Locks, alarms, smoke detectors | 35+ |
| **Covers** | Blinds, curtains, garage doors | 30+ |
| **Energy** | Power monitoring, energy meters | 25+ |
| **Generic** | Universal fallback drivers | 5+ |

### 🌱 **Exotic Devices Supported**
- **QT-07S**: Soil moisture & temperature sensor
- **TS0601 Radar**: mmWave presence detection with battery optimization
- **TS1201**: IR controllers for home automation  
- **Fingerbot**: Mechanical button pusher robots
- **Advanced Valves**: Irrigation controllers with external sensors
- **Air Quality**: CO2, PM2.5, VOC multi-metric sensors

---

## 🏠 Installation

### From Homey App Store (Recommended)
1. Open Homey mobile app
2. Go to "More" → "Apps" 
3. Search for "Universal Tuya Zigbee"
4. Install and enjoy!

### Development Installation
```bash
git clone https://github.com/dlnraja/com.tuya.zigbee.git
cd com.tuya.zigbee
npm install
homey app install --clean
```

---

## 🔧 Device Pairing

1. **Put Homey in pairing mode**: "Add Device" → "Tuya" → Select device type
2. **Reset your Tuya device**: Hold reset button for 5-10 seconds until LED flashes
3. **Wait for detection**: Device should appear automatically
4. **Configure**: Follow on-screen setup instructions

### For Exotic Devices
- **Soil Sensors**: Ensure proper soil contact for calibration
- **Radar Sensors**: Allow 30 seconds for presence detection tuning
- **IR Controllers**: Point toward target devices during setup
- **Fingerbot**: Test mechanical button press during pairing

---

## 🎛️ Advanced Configuration

### EF00 Cluster Devices
Most Tuya devices use the proprietary EF00 cluster. This app automatically:
- Detects cluster configurations
- Maps datapoints to Homey capabilities
- Applies community patches and calibrations
- Handles unknown devices gracefully

### Battery Optimization
Wireless sensors include:
- Smart polling intervals
- Presence detection debounce
- Low-power mode activation
- Battery level monitoring

---

## 🌍 Community & Support

### 📞 **Get Help**
- **GitHub Issues**: [Report bugs & request features](https://github.com/dlnraja/com.tuya.zigbee/issues)
- **Homey Community**: [Discussion forum](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352)
- **Documentation**: [Wiki & guides](https://github.com/dlnraja/com.tuya.zigbee/wiki)

### 🤝 **Contributing**
We welcome community contributions!
- Bug reports and feature requests
- Device compatibility testing
- Translation improvements
- Code contributions

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📊 Compatibility

| Platform | Status | Notes |
|----------|--------|-------|
| **Homey Pro (Early 2023)** | ✅ Full Support | Recommended |
| **Homey Pro (2016-2019)** | ✅ Legacy Support | All features |
| **Homey Cloud** | ⚠️ Limited | Local Zigbee only |
| **Homey Bridge** | ❌ Not Supported | Zigbee required |

### Technical Requirements
- **Homey Firmware**: 3.0.0 or higher
- **Zigbee**: 3.0 compliant
- **Node.js**: 18+ (for development)
- **Memory**: 50MB+ available

---

## 🔄 Recent Updates

### Version 3.0.0 Highlights
- 🎉 **500+ devices** now supported
- 🌱 **Exotic device drivers** for soil, radar, fingerbot, IR
- 🎨 **Johan Benz style assets** with modern gradients
- 🔧 **Community patches** integrated
- ✅ **Zero validation errors** achieved
- 🌍 **Multi-language support** enhanced

[View Full Changelog](CHANGELOG.md)

---

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **dlnraja** - Original developer and maintainer
- **Johan Benz** - Design inspiration and Tuya expertise  
- **Homey Community** - Testing, feedback, and patches
- **Zigbee2MQTT Project** - Device database and converters
- **Contributors** - Everyone who helped improve this app

---

**⭐ If this app helps you, please star the repository and leave a review on the Homey App Store!**

*Made with ❤️ by the Homey community for the Homey community*
