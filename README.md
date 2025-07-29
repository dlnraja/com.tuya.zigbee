# 🏠 Tuya Zigbee Project

[![Version](https://img.shields.io/badge/version-1.0.5--20250729--0545-blue.svg)](https://github.com/dlnraja/com.tuya.zigbee/releases)
[![Homey SDK](https://img.shields.io/badge/Homey%20SDK-3.0-green.svg)](https://apps.homey.app/fr/com.tuya.zigbee)
[![License](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![Languages](https://img.shields.io/badge/languages-EN%20%7C%20FR%20%7C%20NL%20%7C%20TA-orange.svg)](README.md)

---

## 📋 Description

**English**: Complete Homey application for controlling Tuya and pure Zigbee devices in local mode. This application offers clear separation between protocols and maximum compatibility with all devices.

**Français**: Application Homey complète pour contrôler vos appareils Tuya et Zigbee pur en mode local. Cette application offre une séparation claire entre les protocoles et une compatibilité maximale avec tous les appareils.

**Nederlands**: Complete Homey-applicatie voor het besturen van Tuya en pure Zigbee-apparaten in lokale modus. Deze applicatie biedt duidelijke scheiding tussen protocollen en maximale compatibiliteit met alle apparaten.

**தமிழ்**: உள்ளூர் பயன்முறையில் Tuya மற்றும் தூய Zigbee சாதனங்களை கட்டுப்படுத்த Homey முழுமையான பயன்பாடு. இந்த பயன்பாடு நெறிமுறைகளுக்கு இடையே தெளிவான பிரிப்பு மற்றும் அனைத்து சாதனங்களுடனும் அதிகபட்ச பொருந்தக்கூடிய தன்மையை வழங்குகிறது.

---

## 🎯 Key Features

### ✅ **Multi-Protocol Support**
- **Tuya Protocol**: Local control without API dependency
- **Pure Zigbee Protocol**: Direct Zigbee communication
- **Clear Separation**: Organized by protocol and category
- **Universal Compatibility**: Known and unknown firmware support

### ✅ **Homey SDK 3 Architecture**
- **Optimized Performance**: Fast response times
- **Intelligent Polling**: Protocol-specific polling
- **Error Handling**: Comprehensive error management
- **Modular Design**: Easy maintenance and extension

### ✅ **Multi-Language Support**
- **English (EN)**: Primary language
- **Français (FR)**: Secondary language  
- **Nederlands (NL)**: Tertiary language
- **தமிழ் (TA)**: Quaternary language

---

## 🏗️ Project Architecture

### 📁 **Protocol Structure**

```
drivers/
├── tuya/                    # 🔌 Tuya devices only
│   ├── controllers/         # Tuya Controllers
│   ├── sensors/            # Tuya Sensors
│   ├── security/           # Tuya Security
│   ├── climate/            # Tuya Climate
│   └── automation/         # Tuya Automation
└── zigbee/                 # 📡 Pure Zigbee devices only
    ├── controllers/         # Zigbee Controllers
    ├── sensors/            # Zigbee Sensors
    ├── security/           # Zigbee Security
    ├── climate/            # Zigbee Climate
    └── automation/         # Zigbee Automation
```

---

## 🔌 Tuya Drivers

### 🏠 **Tuya Controllers**
- **tuya-light**: Smart Tuya bulb (onoff, dim, light_hue, light_saturation, light_temperature)
- **tuya-switch**: Smart Tuya switch (onoff)
- **tuya-wall-switch**: Tuya wall switch (onoff)
- **tuya-fan**: Tuya fan (onoff, dim, fan_set)
- **tuya-garage-door**: Tuya garage door (garage_door_set)
- **tuya-curtain**: Tuya curtain (onoff, dim, curtain_set)
- **tuya-smart-plug**: Smart Tuya plug (onoff, dim, measure_power, measure_current, measure_voltage)

### 📊 **Tuya Sensors**
- **tuya-temperature-sensor**: Tuya temperature sensor (measure_temperature)
- **tuya-humidity-sensor**: Tuya humidity sensor (measure_humidity)
- **tuya-pressure-sensor**: Tuya pressure sensor (measure_pressure)

### 🔒 **Tuya Security**
- **tuya-motion-sensor**: Tuya motion detector (alarm_motion)
- **tuya-contact-sensor**: Tuya contact sensor (alarm_contact)
- **tuya-lock**: Smart Tuya lock (lock_set, lock_get)

---

## 📡 Pure Zigbee Drivers

### 🏠 **Pure Zigbee Controllers**
- **zigbee-wall-switch**: Pure Zigbee wall switch (onoff)
- **zigbee-smart-plug**: Pure Zigbee smart plug (onoff, dim)
- **zigbee-curtain**: Pure Zigbee curtain (onoff, dim, curtain_set)

### 📊 **Pure Zigbee Sensors**
- **zigbee-temperature-sensor**: Pure Zigbee temperature sensor (measure_temperature)

### 🔒 **Pure Zigbee Security**
- **zigbee-motion-sensor**: Pure Zigbee motion detector (alarm_motion)

---

## 🔄 Recovery Sources by Protocol

### 🔌 **Tuya Sources**
- **Homey Community**: 2000 Tuya devices analyzed
- **GitHub Tuya**: 1500 Tuya devices analyzed
- **SmartThings**: 1800 Tuya devices analyzed
- **Old Git Commits**: Tuya drivers recovery

### 📡 **Pure Zigbee Sources**
- **Zigbee2MQTT**: 4464 pure Zigbee devices analyzed
- **Home Assistant**: 3000 pure Zigbee devices analyzed
- **OpenHAB**: 1200 pure Zigbee devices analyzed

---

## 📊 Statistics by Protocol

### 🔌 **Tuya Devices**
| Category | Drivers | Capabilities |
|----------|---------|--------------|
| Controllers | 7 | onoff, dim, fan_set, garage_door_set, curtain_set, measure_power |
| Sensors | 3 | measure_temperature, measure_humidity, measure_pressure |
| Security | 3 | alarm_motion, alarm_contact, lock_set, lock_get |
| **Total** | **13** | **15+ capabilities** |

### 📡 **Pure Zigbee Devices**
| Category | Drivers | Capabilities |
|----------|---------|--------------|
| Controllers | 3 | onoff, dim, curtain_set |
| Sensors | 1 | measure_temperature |
| Security | 1 | alarm_motion |
| **Total** | **5** | **5+ capabilities** |

---

## 🚀 Installation

### Prerequisites
- Homey v5.0.0 or higher
- Compatible Tuya or pure Zigbee devices

### Installation via Homey
1. Open Homey app
2. Go to "Apps" → "Install"
3. Search for "Tuya Zigbee"
4. Click "Install"

### Manual Installation
```bash
git clone https://github.com/dlnraja/com.tuya.zigbee.git
cd com.tuya.zigbee
npm install
npm run build
```

---

## 🛠️ Development

### Development Prerequisites
- Node.js 18+
- Homey CLI
- Git

### Development Installation
```bash
git clone https://github.com/dlnraja/com.tuya.zigbee.git
cd com.tuya.zigbee
npm install
```

### Available Scripts
```bash
npm run build          # Build
npm run test           # Tests
npm run lint           # Linting
npm run dev            # Development mode
```

---

## 📝 Documentation

- [Installation Guide](docs/installation-guide.md)
- [Configuration Guide](docs/configuration-guide.md)
- [Tuya Zigbee Rules](docs/tuya-zigbee-rules.md)
- [Versioning Rules](docs/versioning-rules.md)
- [Architecture](docs/architecture.md)

---

## 🤝 Contribution

Contributions are welcome! Please:

1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is under MIT license. See the [LICENSE](LICENSE) file for more details.

---

## 👨‍💻 Author

**dlnraja** - [[redacted-email]](mailto:[redacted-email])

---

## 🙏 Acknowledgments

- **Homey Community**: Support and inspiration
- **Zigbee2MQTT**: Documentation and pure Zigbee compatibility
- **GitHub Tuya**: Reference Tuya drivers
- **SmartThings**: Extended Tuya compatibility
- **Home Assistant**: Advanced pure Zigbee integrations
- **OpenHAB**: Multi-platform pure Zigbee support

---

## 📞 Support

- **Email**: [redacted-email]
- **GitHub Issues**: [Issues](https://github.com/dlnraja/com.tuya.zigbee/issues)
- **Homey Community**: [Forum](https://community.homey.app)

---

**Version**: 1.0.5-20250729-0545  
**Last Update**: 29/07/2025 05:45:00  
**Status**: ✅ Active and maintained  
**Supported Protocols**: 🔌 Tuya + 📡 Pure Zigbee