Universal Tuya Zigbee - Community-Maintained App

DESCRIPTION:
The Universal Tuya Zigbee app provides comprehensive support for 183 Tuya Zigbee devices with 100% local control - no cloud required. This community-maintained app features SDK3 native drivers, enriched manufacturer IDs from multiple sources (Zigbee2MQTT, Home Assistant, Blakadder, Johan Bendz), and automatic Tuya datapoint handling for TS0601 devices.

KEY FEATURES:
✅ 183 SDK3 native drivers
✅ 550+ device IDs supported
✅ 100% local control - no cloud required
✅ Automatic Tuya cluster handler (TS0601 devices)
✅ 250+ manufacturer IDs enriched
✅ IAS Zone enrollment verified
✅ 123 flow cards (triggers, actions, conditions)
✅ User-friendly driver names for easy pairing
✅ Active development and community support

SUPPORTED DEVICE CATEGORIES:
- Motion & Presence Detection (PIR, radar sensors)
- Contact & Security (door/window sensors, SOS buttons)
- Temperature & Climate (temp/humidity sensors, thermostats)
- Smart Lighting (bulbs, switches, dimmers, RGB lights)
- Power & Energy (smart plugs, energy monitoring)
- Safety & Detection (smoke, gas, CO, water leak detectors)
- Automation Control (scene switches, buttons, knobs)

TUYA TS0601 SUPPORT:
Automatic handling of Tuya proprietary cluster 0xEF00 (61184) for devices like:
- Gas sensors with CO detection
- Advanced motion sensors
- Water leak detectors
- Thermostatic radiator valves (TRV)
- Air quality sensors
- Multi-sensors with custom datapoints

RECENT UPDATES:
v3.0.17: Added Tuya cluster handler for TS0601 devices
v3.0.16: Fixed cluster ID registration for motion sensors and SOS buttons
v3.0.15: Enhanced IAS Zone enrollment for security devices

COMMUNITY:
This is a community-maintained fork with active development, monthly updates, and support for 2024-2025 devices. We welcome contributions, bug reports, and feature requests.

PRIVACY:
All device communication is 100% local through your Homey hub. No data is sent to external servers or cloud services.

COMPATIBILITY:
Requires Homey Pro (2023) or newer with firmware ≥12.2.0

SUPPORT:
- GitHub: https://github.com/dlnraja/com.tuya.zigbee
- Forum: https://community.homey.app/
- Issues: Report bugs via GitHub Issues

LICENSE:
GPL-3.0

CREDITS:
Originally based on Johan Bendz's work, now maintained by the community with contributions from multiple sources.
