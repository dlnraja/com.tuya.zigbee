Universal Tuya Zigbee - The Ultimate Zigbee Hub for Homey

OVERVIEW
========
Community-maintained Universal Zigbee app with 190 SDK3 native drivers and 12,563+ manufacturer IDs from multiple sources (Zigbee2MQTT, Johan Bendz, Homey Community). 100% local control, no cloud required. Supports 25+ major brands across 5 regions (Global, Asia, USA, Europe, France). Active development with 96%+ Zigbee market coverage.

KEY FEATURES
============
✓ 190 Native Zigbee Drivers - No cloud dependency
✓ 100% Local Control - All devices work offline
✓ 12,563+ Manufacturer IDs - Massive device compatibility
✓ 25+ Major Brands - Tuya, Xiaomi, Aqara, Philips, IKEA, Sonoff, Samsung, etc.
✓ 96%+ Market Coverage - Supports virtually all Zigbee devices
✓ 5 Regional Coverage - Global, Asia, USA, Europe, France
✓ SDK3 Modern Architecture - Built with latest Homey SDK
✓ Advanced Flow Cards - Comprehensive automation support
✓ UNBRANDED Structure - Professional driver organization
✓ Active Development - Regular updates and bug fixes

SUPPORTED BRANDS
================
Tuya (12,000+ devices), Xiaomi/Aqara (500+ devices), Philips Hue/Signify (200+ devices), IKEA TRÅDFRI (100+ devices), Sonoff (150+ devices), Samsung SmartThings (100+ devices), OSRAM/LEDVANCE (50+ devices), GE/Jasco (USA), Sengled (USA), Legrand (France), Schneider Electric (France), and many more.

SUPPORTED DEVICE TYPES
======================
Motion Sensors, Temperature/Humidity Sensors, Door/Window Sensors, Smart Plugs, Smart Switches (1-6 gang), RGB/CCT/Dimmable Lights, LED Strips, Thermostats, Radiator Valves, Smart Locks, Curtain Motors, Roller Shutters, Smoke Detectors, Water Leak Detectors, CO/CO2 Detectors, Air Quality Monitors, Scene Controllers, Remote Controls, Emergency Buttons, Garage Door Openers, Irrigation Controllers, Pet Feeders, Presence Sensors (mmWave), Radar Sensors, and more.

LOCAL CONTROL
=============
All devices communicate directly with Homey via Zigbee protocol. No internet connection required. No cloud servers. No data collection. Complete privacy. Works offline 100%.

INSTALLATION
============
1. Install "Universal Tuya Zigbee" from Homey App Store
2. Add devices via "Add Device" → Select your device type
3. Devices will be automatically detected based on manufacturer ID
4. No configuration needed - works out of the box

TROUBLESHOOTING
===============
- Device not found? Make sure it's in pairing mode and within Zigbee range
- No readings? Check battery level and ensure device is awake
- Still issues? Send diagnostic report via app settings

SUPPORT & COMMUNITY
===================
Forum: https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352
GitHub: https://github.com/dlnraja/com.tuya.zigbee
Issues: https://github.com/dlnraja/com.tuya.zigbee/issues

CHANGELOG
=========
See CHANGELOG.md or https://github.com/dlnraja/com.tuya.zigbee/blob/master/CHANGELOG.md

LICENSE
=======
GPL-3.0 - See LICENSE file

CREDITS
=======
- Community contributors
- Zigbee2MQTT project
- Johan Bendz drivers
- Homey Community Forum members
- Athom Homey SDK team

TECHNICAL SPECIFICATIONS
========================
SDK Version: 3
Minimum Homey Version: 12.2.0
Platforms: Local (Zigbee)
Communication: 100% Local Zigbee
Protocol: Zigbee 3.0
Encryption: AES-128
Mesh Network: Automatic (via AC-powered devices)

PRIVACY & SECURITY
==================
✓ 100% Local - No cloud communication
✓ No data collection - Zero telemetry
✓ No external servers - Everything stays on your network
✓ Encrypted communication - Zigbee AES-128
✓ Offline capable - Works without internet

UPDATES
=======
Regular updates with new device support, bug fixes, and improvements. GitHub Actions CI/CD pipeline ensures quality and automatic publishing.

COMPATIBILITY MATRIX
====================
Homey Pro (2023): ✓ Full support
Homey Pro (2019): ✓ Full support
Homey Bridge: ✗ Not supported (no Zigbee radio)

MANUFACTURER ID COVERAGE
========================
Over 12,563 manufacturer IDs including:
- Tuya: _TZ3000_*, _TZE200_*, _TZE204_*, _TZE284_*, TS*, etc.
- Xiaomi: lumi.sensor_*, lumi.switch_*, lumi.plug_*, etc.
- Philips: Signify*, Philips*, LWA*, LWB*, LCT*, etc.
- IKEA: TRADFRI*, SYMFONISK*, STYRBAR*, RODRET*, etc.
- Sonoff: SONOFF*, eWeLink*, etc.

And thousands more from 25+ brands worldwide.

LANGUAGE SUPPORT
================
English (EN), Nederlands (NL), Deutsch (DE), Français (FR)

FLOW CARD CATEGORIES
====================
- Triggers: Device state changes, motion detection, button presses
- Conditions: Device state checks, value comparisons
- Actions: Device control, scene activation, notifications

ADVANCED FEATURES
=================
- Multi-endpoint support for complex devices
- Custom Zigbee clusters (Tuya 0xEF00, Xiaomi 0xFCC0, etc.)
- IAS Zone enrollment for security devices
- Battery monitoring with low battery alerts
- Automatic reporting configuration
- Exponential backoff for network stability
- Debouncing for button devices
- Presence timeout configuration

DEVICE CATEGORIES
=================
All drivers are organized by FUNCTION, not brand:
- Climate Control (temperature, humidity, thermostats)
- Lighting (bulbs, strips, switches, dimmers)
- Security (motion, contact, smoke, water leak, locks)
- Energy (plugs, monitoring, metering)
- Automation (buttons, scene controllers, remotes)
- Comfort (curtains, blinds, valves)
- Air Quality (CO2, TVOC, PM2.5, formaldehyde)
- Garden (irrigation, soil moisture, sprinklers)

CERTIFICATION & COMPLIANCE
==========================
- Homey SDK3 compliant
- Zigbee Alliance certified devices supported
- CE/FCC certified devices compatible
- Full Homey App Store guidelines adherence

DEVELOPMENT STATUS
==================
✓ Active development
✓ Regular updates
✓ Community-driven
✓ Open source (GPL-3.0)
✓ CI/CD automated testing
✓ Professional support

VERSION HISTORY HIGHLIGHTS
===========================
v3.x: SDK3 migration, 190 drivers, 12,563+ IDs
v2.x: Major expansion, 150+ drivers, regional coverage
v1.x: Initial release, basic Tuya support

FUTURE ROADMAP
==============
- More manufacturer IDs via community feedback
- Enhanced diagnostics and logging
- Advanced flow cards for complex automations
- Regional expansion (Latin America, Africa)
- Matter bridge support (future consideration)

Thank you for using Universal Tuya Zigbee!
The #1 Zigbee app for Homey with maximum device coverage.

For support, visit our forum or GitHub repository.
