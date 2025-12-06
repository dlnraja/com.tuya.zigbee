# [APP][Pro] Universal TUYA Zigbee - Update v5.5.23

## 🚀 Latest Version: v5.5.23

**Status:** Test Phase | Active Development
**GitHub:** [dlnraja/com.tuya.zigbee](https://github.com/dlnraja/com.tuya.zigbee)
**Test App:** [Universal Tuya Zigbee | Homey](https://homey.app/a/com.dlnraja.tuya.zigbee/test/)

---

## 📋 Recent Changes (v5.5.18 → v5.5.23)

### v5.5.23 - LED Controller + Curtain Motor Fix
- **LED Controller Fingerprint Fix:** Removed TS0501B from `bulb_dimmable` - now correctly uses `led_controller_cct`
- **Curtain Motor Improvements:** Extended DP mappings with better value parsing for `_TZE200_uj3f4wr5` and similar devices
- **Solar Curtains:** Added battery DP (13) support

### v5.5.22 - Smoke Detector Temperature/Humidity
- Added missing DP mappings for temperature (DP2) and humidity (DP3) on smoke detectors like `_TZE284_n4ttsck2`

### v5.5.21 - Phantom Device + Battery Polling Fix
- Fixed "Device Not Found" errors in DynamicEnergyManager
- Disabled battery polling for sleeping button devices (SOS buttons, remotes)
- Added `_destroyed` flag to prevent operations on deleted devices

### v5.5.20 - Soil Sensor + USB Outlet Fix
- Soil sensor: Added periodic DP requests for battery-powered devices
- USB outlet: Fixed button capability issue

### v5.5.19 - SOS Button Fix
- Protected `button_emergency_sos` from SmartAdapt removing `alarm_contact`

---

## 🎯 Key Features

- **Local-First:** No cloud required for daily operation
- **183+ Drivers** covering switches, sensors, lights, covers, and more
- **383+ Manufacturer IDs** supported
- **TS0601 DP Engine:** Smart handling of Tuya's complex datapoint system
- **IAS Zone Support:** Motion sensors, SOS buttons, alarms work reliably
- **Multi-Brand:** Tuya, MOES, BSEED, Lonsonho, Nedis, LSC, and many more

---

## 📦 Supported Device Categories

| Category | Examples |
|----------|----------|
| **Switches & Plugs** | TS0001-TS0004, TS011F, TS0121 |
| **Lights & Dimmers** | TS110F, TS0501B, RGB/CCT bulbs |
| **Contact & Motion** | TS0203, TS0202, PIR sensors |
| **Climate** | TS0201, TS0601 temp/humidity, TRV thermostats |
| **Covers** | TS130F, TZE200 curtain motors |
| **Safety** | Smoke, CO, gas, water leak detectors |
| **Scene Control** | TS004F scene switches, remotes |

---

## 🔧 Recent Fixes Summary

| Issue | Device | Problem | Fixed in |
|-------|--------|---------|----------|
| #82 | TS0501B (_TZB210_ngnt8kni) | Added as "Bulb Dimmer" instead of LED Controller | v5.5.23 |
| #79 | _TZE200_uj3f4wr5 | Curtain motor not operable | v5.5.23 |
| - | _TZE284_n4ttsck2 | Smoke detector no temp/humidity | v5.5.22 |
| - | button_emergency_sos | Missing Zigbee Node errors | v5.5.21 |
| - | Energy manager | Device Not Found errors | v5.5.21 |

---

## 📊 Technical Highlights

- **SDK:** Homey SDK v3
- **Validation:** Automated CI/CD (publish level)
- **Architecture:** Modular DP engine + profiles + traits
- **Test Coverage:** Full validation passed

---

## 💡 How to Update

1. **From Homey App Store (Test):** The update should appear automatically within a few hours
2. **Manual Update:** Settings → Apps → Universal Tuya Zigbee → Check for updates

**Note:** After updating to v5.5.23, you may need to re-pair devices that were incorrectly fingerprinted (like TS0501B LED controllers).

---

## 🔗 Important Links

- **GitHub Issues:** [Report a bug](https://github.com/dlnraja/com.tuya.zigbee/issues)
- **Device Matrix:** [MANUFACTURER_DATABASE.json](https://github.com/dlnraja/com.tuya.zigbee/blob/master/project-data/MANUFACTURER_DATABASE.json)
- **Documentation:** [Docs folder](https://github.com/dlnraja/com.tuya.zigbee/tree/master/docs)

---

## ☕ Support This Project

If you find this app useful:
- **PayPal:** [@dlnraja](https://paypal.me/dlnraja)
- **Revolut:** [Revolut.Me Link](https://revolut.me/dylanoul)

Your feedback and bug reports are equally valuable!

---

*Last updated: December 6, 2025*
