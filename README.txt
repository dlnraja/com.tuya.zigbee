Universal TUYA Zigbee - Local-First Control

This app provides comprehensive support for Tuya-based Zigbee devices on Homey Pro.

FEATURES:
- 83+ device drivers supporting 2225+ manufacturer IDs
- Hybrid ZCL + Tuya DP protocol support
- Physical and virtual button detection
- Advanced settings: power-on behavior, backlight, child lock
- Flow cards for all device types

SUPPORTED DEVICES:
- Switches (1-8 gang, wall, wireless)
- Dimmers and LED controllers
- RGB/RGBW bulbs
- Sensors (motion, contact, temperature, humidity, water leak, smoke, gas)
- Thermostats and TRVs
- Covers (blinds, curtains, roller shutters)
- Plugs and power meters
- Buttons (wireless scene switches)
- IR blasters
- And many more...

REQUIREMENTS:
- Homey Pro (2023 or earlier)
- Zigbee-enabled Tuya devices

SUPPORT:
- GitHub: https://github.com/dlnraja/com.tuya.zigbee
- Forum: https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352

Version 5.8.25 - February 2026
- Fixed color-space module loading error in Homey sandbox
- Added TuyaE000 cluster for MOES button press detection
- Added exotic clusters (TuyaE001, TuyaE002, OnOffExt) for advanced settings
- Case-insensitive fingerprint matching for BSEED switches
