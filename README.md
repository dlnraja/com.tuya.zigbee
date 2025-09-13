# Universal Tuya Zigbee Device App

Professional local Zigbee support for 500+ Tuya devices. Built following Johan Benz standards with clean driver architecture and zero cloud dependencies.

## ✨ Features

- **🏠 Local Only**: Pure Zigbee 3.0 communication, no cloud required
- **🔧 Professional Drivers**: Clean, maintainable architecture following Johan Benz standards  
- **📱 Wide Compatibility**: 500+ devices from 50+ manufacturers
- **⚡ SDK 3 Ready**: Full Homey Pro 2023+ compatibility
- **🔄 Auto Updates**: Monthly device database updates via GitHub Actions
- **🌍 Community Driven**: Based on community feedback and contributions

## 📋 Supported Device Categories

### 🌡️ **Sensors**
| Category | Examples | Device IDs |
|----------|----------|------------|
| **Temperature & Humidity** | TS0201, TS0601, RH3052 | _TZ3000_i8jfiezr, _TZE200_locansqn |
| **Motion Detection** | TS0202, PIR sensors | _TZ3000_mmtwjmaq, _TZE200_3towulqd |
| **Door & Window** | TS0203, Contact sensors | _TZ3000_ebar6ljy, _TZE200_pay2byax |
| **Water Leak** | TS0207, Flood sensors | _TZ3000_fxvjhdyl, _TYZB01_sqmd19i1 |
| **Smoke Detection** | TS0205, Fire alarms | _TZ3210_up3pngle, _TZE200_ntcy3xu1 |

### 💡 **Lighting** 
| Category | Examples | Device IDs |
|----------|----------|------------|
| **Smart Bulbs** | TS0505A, RGB/CCT | _TZ3000_riwp3k79, _TZ3210_raqoarrb |
| **Light Switches** | TS0001-TS0003, Wall switches | _TZ3000_ji4araar, _TZ3000_9cpuaca6 |

### 🔌 **Power & Control**
| Category | Examples | Device IDs |
|----------|----------|------------|
| **Smart Plugs** | TS011F, TS0121 with energy | _TZ3000_g5xawfcq, _TZ3000_3ooaz3ng |
| **Curtain Motors** | TS130F, Window covers | _TZE200_cowvfni3, _TZE200_rddyvrci |

## 🚀 Installation

### Via Homey App Store
1. Open Homey mobile app
2. Go to Apps → Browse Apps  
3. Search for "Universal Tuya Zigbee Device"
4. Install the app

### Via CLI (Development)
```bash
git clone https://github.com/dlnraja/com.tuya.zigbee.git
cd com.tuya.zigbee
homey app install
```

## 📖 Device Pairing

1. **Add Device**: Go to Devices → Add Device
2. **Select Category**: Choose appropriate device type (sensors, lights, etc.)
3. **Pairing Mode**: Put your Tuya device in pairing mode
4. **Auto Detection**: Device will be automatically detected and configured

## 🛠️ Troubleshooting

### Device Not Found?
1. Ensure device is in pairing mode (usually 5-second button press)
2. Check if manufacturer ID is supported
3. Try generic Zigbee pairing first to get device info
4. Report missing devices on [GitHub Issues](https://github.com/dlnraja/com.tuya.zigbee/issues)

### Battery Devices
- Battery devices may take several minutes to appear
- Ensure device is awake during pairing
- Check device manual for specific pairing instructions

## 🤝 Community & Support

- **📋 Forum Discussion**: [Homey Community Thread](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352)
- **🐛 Bug Reports**: [GitHub Issues](https://github.com/dlnraja/com.tuya.zigbee/issues)
- **💬 Device Requests**: Use GitHub Issues with device interview data
- **📚 Documentation**: [Developer Tools](https://developer.athom.com/tools/zigbee)

## 🔧 Development & Contributing

This project welcomes contributions following these standards:

### Device Interview Process
1. Add device as generic Zigbee device in Homey
2. Use [Zigbee Developer Tools](https://developer.athom.com/tools/zigbee)
3. Create GitHub issue with interview data
4. Wait for driver implementation

### Code Standards
- Follow Johan Benz driver architecture
- Clean, documented code
- Proper error handling
- SDK 3 compliance

## 📋 Changelog

### v1.0.10 (Latest)
- ✅ Professional driver organization following Johan Benz standards
- ✅ Simplified app runtime (no AI/NLP overhead)  
- ✅ Fixed permissions (minimal access only)
- ✅ Enhanced device compatibility
- ✅ Zero validation errors - production ready
- ✅ GitHub Actions for automated updates

### v1.0.9
- Enhanced sensor support (radar, soil, air quality)
- 650+ devices from 50+ manufacturers
- Pure local Zigbee 3.0 communication

## 🏆 Credits

- **Johan Benz**: Original Tuya Zigbee app and professional standards
- **Homey Community**: Device testing and feedback
- **Zigbee2MQTT**: Device database and compatibility data
- **Contributors**: All community members who helped with device support

## 📄 License

MIT License - Open source and community-driven development

---

*Built with ❤️ for the Homey community*
