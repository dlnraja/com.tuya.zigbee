# 🙏 Universal Tuya Zigbee - Credits, Sources & Contributors

## ✨ Acknowledgments

This application relies heavily on the incredible work of the Zigbee open-source community.
**Without their contributions, this project would not be possible.**

> *"Standing on the shoulders of giants"* - This app is a tribute to all the developers, testers,
> and contributors who have spent countless hours reverse-engineering Zigbee devices and sharing their knowledge.

---

## 📦 PRIMARY DATA SOURCES

### 🔷 Zigbee2MQTT (Main Source)
| | |
|---|---|
| **Repository** | https://github.com/Koenkk/zigbee2mqtt |
| **Converters** | https://github.com/Koenkk/zigbee-herdsman-converters |
| **Website** | https://www.zigbee2mqtt.io |
| **Devices** | 4797+ supported |
| **License** | GPL-3.0 |
| **Creator** | **Koen Kanters** ([@Koenkk](https://github.com/Koenkk)) |

**Key Contributors:**
- [@Koenkk](https://github.com/Koenkk) - Creator & Lead Maintainer
- [@Nerivec](https://github.com/Nerivec) - Core Developer
- [@sjorge](https://github.com/sjorge) - Major Contributor
- [@arteck](https://github.com/arteck) - Tuya Device Expert
- [@Hedda](https://github.com/Hedda) - Documentation
- [@cydrain](https://github.com/cydrain) - Device Support
- [@jethome-ru](https://github.com/jethome-ru) - Russian Devices
- [@Quentame](https://github.com/Quentame) - French Localization
- [@GiedriusM](https://github.com/GiedriusM) - Core Development

**Data Used:**
- `tuya.ts` - Complete Tuya device definitions (1500+ devices)
- Device fingerprints (manufacturerName, modelId)
- Tuya DP (DataPoint) mappings
- Device capabilities and cluster definitions

### 🔶 ZHA Device Handlers (Quirks)
| | |
|---|---|
| **Repository** | https://github.com/zigpy/zha-device-handlers |
| **License** | Apache-2.0 |
| **Creator** | **David Mulcahey** ([@dmulcahey](https://github.com/dmulcahey)) |

**Key Contributors:**
- [@dmulcahey](https://github.com/dmulcahey) - Creator & Maintainer
- [@Adminiuga](https://github.com/Adminiuga) - Core Developer (Alexei Chetroi)
- [@puddly](https://github.com/puddly) - zigpy Maintainer
- [@javicalle](https://github.com/javicalle) - Spanish Devices
- [@TheJulianJES](https://github.com/TheJulianJES) - Device Support
- [@MattWestworking](https://github.com/MattWestworking) - Testing
- [@frenck](https://github.com/frenck) - Home Assistant Integration

**Data Used:**
- TuyaQuirkBuilder patterns
- Device quirks and workarounds
- DP to ZCL attribute mappings

### 🔷 Blakadder Zigbee Database
| | |
|---|---|
| **Repository** | https://github.com/blakadder/zigbee |
| **Website** | https://zigbee.blakadder.com |
| **License** | MIT |
| **Creator** | **Blakadder** ([@blakadder](https://github.com/blakadder)) |

**Data Used:**
- Device compatibility matrix (ZHA, Z2M, deCONZ, Tasmota)
- Device images and specifications
- Purchase links and reviews

### 🔶 SmartThings Edge Drivers
| | |
|---|---|
| **Repository** | https://github.com/SmartThingsCommunity |
| **Forum** | https://community.smartthings.com |
| **License** | Various |

**Key Contributors:**
- [@Mariano-Colmenarejo](https://github.com/Mariano-Colmenarejo) - Edge Driver Expert
- [@veonua](https://github.com/veonua) - Tuya Drivers
- SmartThings Community Members

### 🔷 JohanBendz Tuya Zigbee (Homey)
| | |
|---|---|
| **Repository** | https://github.com/JohanBendz/com.tuya.zigbee |
| **License** | GPL-3.0 |
| **Creator** | **Johan Bendz** ([@JohanBendz](https://github.com/JohanBendz)) |

**Data Used:**
- Homey-specific device implementations
- Tuya device fingerprints for Homey

---

## 🔧 SECONDARY SOURCES

### Zigbee-OTA Firmware Repository
| | |
|---|---|
| **Repository** | https://github.com/Koenkk/zigbee-OTA |
| **License** | CC0-1.0 (Public Domain) |
| **Contributors** | 162+ |

### deCONZ / Phoscon (Dresden Elektronik)
| | |
|---|---|
| **Repository** | https://github.com/dresden-elektronik/deconz-rest-plugin |
| **Website** | https://phoscon.de |
| **License** | BSD-3-Clause |

### Jeedom Zigbee Plugin
| | |
|---|---|
| **Repository** | https://github.com/jeedom/plugin-zigbee |
| **Website** | https://jeedom.com |
| **License** | AGPL-3.0 |

### Tuya Developer Platform
| | |
|---|---|
| **Website** | https://developer.tuya.com |
| **DP Docs** | https://developer.tuya.com/en/docs/iot/dps |

### Zigbee Alliance / CSA
| | |
|---|---|
| **Website** | https://csa-iot.org |
| **ZCL Spec** | Zigbee Cluster Library specifications |

### Aqara Documentation
| | |
|---|---|
| **Website** | https://www.aqara.com |
| **FP300 Spec** | Inspiration for radar sensor features |

---

## 👥 HOMEY COMMUNITY CONTRIBUTORS

### Forum Contributors (community.homey.app)
| Username | Contribution |
|----------|--------------|
| **@Laborhexe** | ZG-204ZM device interview, testing, bug reports |
| **@Jocke_Svensson** | Testing, feedback |
| **@SunBeech** | Forum support, formatting help |
| **@Cam** | Testing, device reports |
| **@telenut** | Device testing |
| **@DidierVU** | French translations |
| **@Patrickske1** | Curtain motor issue report (#79) |

### GitHub Contributors
| Username | Contribution |
|----------|--------------|
| **@dlnraja** | App creator & maintainer |
| Issue reporters | Device support requests |

---

## 🌐 ALL DATA SOURCES LINKS

### Primary Sources
```
https://github.com/Koenkk/zigbee2mqtt
https://github.com/Koenkk/zigbee-herdsman-converters
https://github.com/Koenkk/zigbee-herdsman-converters/blob/master/src/devices/tuya.ts
https://www.zigbee2mqtt.io/supported-devices/
https://github.com/zigpy/zha-device-handlers
https://zigbee.blakadder.com
https://github.com/blakadder/zigbee
```

### Secondary Sources
```
https://github.com/JohanBendz/com.tuya.zigbee
https://github.com/dresden-elektronik/deconz-rest-plugin
https://github.com/jeedom/plugin-zigbee
https://github.com/Koenkk/zigbee-OTA
https://developer.tuya.com/en/docs/iot/
https://community.smartthings.com
```

### Documentation
```
https://www.zigbee2mqtt.io/advanced/support-new-devices/02_support_new_tuya_devices.html
https://www.zigbee2mqtt.io/advanced/support-new-devices/03_find_tuya_data_points.html
https://github.com/zigpy/zha-device-handlers/wiki
https://zigbee.blakadder.com/zigbee2mqtt.html
```

### Review & Testing Sites
```
https://smarthomescene.com
https://www.derekseaman.com (Aqara FP300 review)
https://www.matteralpha.com
```

---

## 📜 LICENSE COMPLIANCE

| Source | License | Compliance |
|--------|---------|------------|
| Zigbee2MQTT | GPL-3.0 | Source code available, attribution |
| ZHA | Apache-2.0 | Attribution preserved |
| Blakadder | MIT | Attribution preserved |
| OTA repos | CC0-1.0 | Public domain |
| deCONZ | BSD-3-Clause | Attribution in documentation |
| JohanBendz | GPL-3.0 | Attribution |
| SmartThings | Various | Attribution |

---

## 📊 DATABASE STATISTICS

| Category | Count |
|----------|-------|
| **Total Devices** | 1372+ |
| **Categories** | 27 |
| **Sources Used** | 15+ |
| **Contributors Credited** | 50+ |

---

## 💡 HOW TO CONTRIBUTE

### Report a Device Issue
1. Open GitHub Issue: https://github.com/dlnraja/com.tuya.zigbee/issues
2. Include: manufacturerName, modelId, device interview
3. Check Zigbee2MQTT first: https://www.zigbee2mqtt.io/supported-devices/

### Add a New Device
1. Find the device in Zigbee2MQTT or ZHA
2. Extract the fingerprint and DP mappings
3. Submit a PR or issue with the data

### Test & Validate
1. Join the Homey Community Forum
2. Report your testing results
3. Help other users with similar devices

---

## 🎉 SPECIAL THANKS

> **To the entire Zigbee open-source community** - Your tireless work in reverse-engineering
> thousands of devices has made smart home automation accessible to everyone.

> **To Koen Kanters (@Koenkk)** - For creating and maintaining Zigbee2MQTT, the most
> comprehensive Zigbee device database in existence.

> **To the Homey Community** - For testing, reporting issues, and providing device interviews
> that make this app better every day.

> **To all device manufacturers** - Who have (sometimes reluctantly) allowed their devices
> to be reverse-engineered for the greater good of home automation.

---

*This file is maintained as part of the Universal Tuya Zigbee app.*
*Last updated: 2025-11-29*

**Made with ❤️ by the Zigbee community**
