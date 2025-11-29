# Universal Tuya Zigbee - Credits & Data Sources

## 🙏 Acknowledgments

This application relies heavily on the incredible work of the Zigbee open-source community. Without their contributions, this project would not be possible.

---

## 📦 Primary Data Sources

### Zigbee2MQTT
- **Repository**: https://github.com/Koenkk/zigbee2mqtt
- **Website**: https://www.zigbee2mqtt.io
- **Devices Supported**: 4797+
- **License**: GPL-3.0
- **Maintainer**: Koen Kanters (@Koenkk)
- **Key Contributors**: Koenkk, sjorge, arteck, Nerivec, Hedda, cydrain, jethome-ru, Quentame, GiedriusM
- **Data Used**:
  - Device definitions and fingerprints
  - Tuya DP (DataPoint) mappings
  - Device capabilities and exposures

### Zigbee-OTA Firmware Repository
- **Repository**: https://github.com/Koenkk/zigbee-OTA
- **License**: CC0-1.0 (Public Domain)
- **Maintainer**: Koen Kanters (@Koenkk)
- **Contributors**: 162+
- **Data Used**:
  - OTA firmware index (index.json)
  - Manufacturer codes and image types
  - SHA512 hashes for verification
  - Tuya & Xiaomi firmware URLs

### ZHA Device Handlers (Quirks)
- **Repository**: https://github.com/zigpy/zha-device-handlers
- **License**: Apache-2.0
- **Maintainer**: zigpy team
- **Key Contributors**: dmulcahey, Adminiuga, puddly, javicalle, TheJulianJES, MattWestworking, frenck
- **Data Used**:
  - TuyaQuirkBuilder patterns
  - Device quirks and workarounds
  - DP to ZCL attribute mappings

### Blakadder Zigbee Database
- **Repository**: https://github.com/blakadder/zigbee
- **Website**: https://zigbee.blakadder.com
- **License**: MIT
- **Maintainer**: Blakadder
- **Data Used**:
  - Device compatibility information
  - Cross-platform support status (ZHA, Z2M, deCONZ, Tasmota)

---

## 🔧 Secondary Sources

### deCONZ / Phoscon
- **Repository**: https://github.com/dresden-elektronik/deconz-rest-plugin
- **Website**: https://phoscon.de/en/conbee2/compatible
- **License**: BSD-3-Clause
- **Maintainer**: Dresden Elektronik

### Fairecasoimeme Zigbee-OTA
- **Repository**: https://github.com/fairecasoimeme/zigbee-OTA
- **License**: CC0-1.0

### Tuya Developer Platform
- **Website**: https://developer.tuya.com
- **Data Used**: Official DP documentation for Tuya devices

### Zigbee Alliance / CSA
- **Website**: https://csa-iot.org
- **Data Used**: Zigbee Cluster Library (ZCL) specifications

---

## 👥 Community Contributors

| Name | GitHub | Role |
|------|--------|------|
| Koen Kanters | [@Koenkk](https://github.com/Koenkk) | Zigbee2MQTT creator & maintainer |
| Nerivec | [@Nerivec](https://github.com/Nerivec) | Zigbee2MQTT contributor |
| David Mulcahey | [@dmulcahey](https://github.com/dmulcahey) | ZHA creator |
| Alexei Chetroi | [@Adminiuga](https://github.com/Adminiuga) | zigpy maintainer |
| puddly | [@puddly](https://github.com/puddly) | zigpy contributor |
| Blakadder | [@blakadder](https://github.com/blakadder) | Zigbee device database |

---

## 🔄 Auto-Update System

This application automatically fetches updates from the following sources:

| Source | Update Interval | Data |
|--------|-----------------|------|
| Zigbee-OTA | Every 6 hours | Firmware images |
| Fairecasoimeme OTA | Every 12 hours | Firmware images |
| Zigbee2MQTT | Every 24 hours | Device converters |
| ZHA Quirks | Every 24 hours | Device quirks |
| Blakadder | Every 24 hours | Device compatibility |
| Tuya Developer | Weekly | DP documentation |

---

## 📜 License Compliance

This project respects all licenses of the data sources used:

- **GPL-3.0**: Zigbee2MQTT - Source code available
- **Apache-2.0**: ZHA - Attribution preserved
- **MIT**: Blakadder - Attribution preserved
- **CC0-1.0**: OTA repos - Public domain, no restrictions
- **BSD-3-Clause**: deCONZ - Attribution in documentation

---

## 💡 How to Contribute

If you find a device that's not working correctly:

1. Check if it's supported in [Zigbee2MQTT](https://www.zigbee2mqtt.io/supported-devices/)
2. Check the [ZHA quirks](https://github.com/zigpy/zha-device-handlers) for your device
3. Submit an issue with your device's manufacturer name and model ID
4. Include diagnostic logs from the app

---

*Thank you to all contributors who make the Zigbee ecosystem better!* 🎉
