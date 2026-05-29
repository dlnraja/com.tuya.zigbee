Unified Smart Home Engine for Homey — Local-First Tuya Zigbee Control

This app provides unified, local-first Zigbee support for Tuya, eWeLink, and hundreds of compatible smart home brands — no cloud required, no internet dependency. It is the most comprehensive Tuya Zigbee driver collection available for Homey Pro.

With over 412 drivers and 33,235+ device fingerprints across all major Tuya device families, it covers a vast array of devices:

SMART PLUGS AND ENERGY:
- Smart plugs (1 and 2 outlets), power strips, energy monitors, CT clamp meters
- Metering plugs with real-time power, voltage, current and kWh tracking

SWITCHES AND DIMMERS:
- Wall switches: 1-gang to 6-gang (TS0001 to TS0006, TS0011 to TS0015)
- Dimmers: leading-edge, trailing-edge, TRIAC (TS110E, TS110F)
- Scene switches, wall remotes, mini remotes and handheld controllers

SENSORS:
- Motion sensors: PIR, mmWave radar (24GHz, 5.8GHz), dual-tech
- Door and window contact sensors (magnetic)
- Smoke, CO, CO2, gas detectors
- Temperature and humidity sensors (LCD display variants included)
- Soil moisture, water leak, rain, pressure and bed occupancy sensors
- Illuminance and air quality sensors (PM2.5, VOC, formaldehyde)

CLIMATE CONTROL:
- Thermostats (floor heating, electric, boiler control)
- Radiator valves (TRV) with schedule support
- Humidity controllers, dehumidifiers and air purifiers

LIGHTING:
- Smart bulbs: E27, E14, GU10, MR16 — RGBW, CCT, dimmable white
- LED strip controllers: single-color, RGB, RGBW, RGBCCT
- Ceiling lights, panel lights and smart candles

COVERS AND MOTORS:
- Curtain motors, roller blind motors, venetian blind controllers
- Garage door openers, gate controllers and awning motors

SECURITY:
- Smart door locks (PIN, fingerprint, card)
- Alarm sirens, panic buttons, emergency switches

SUPPORTED BRANDS (partial list):
Nedis, Silvercrest, Lidl, Ikea Tradfri compatible, Zemismart, Lonsonho, Samotech, Malmbergs,
Alecto, Smart9, BlitzWolf, Neo, Ejlink, NOUS, GIRIER, MOES, TUYA, Loratap, Woox, Mercator,
Aubess, BRT-100 Beok, Avatto, Tongou, Koogeek, Owon, Sunricher, Lumiax, OSRAM compatible,
Schneider compatible, Legrand compatible, Hager compatible, Ajax Systems compatible and many more.

COMPATIBILITY:
- Requires: Homey Pro 2019 or 2023 (Zigbee SDK3)
- Homey firmware: 10.x or higher recommended
- Does NOT support Homey Bridge (limited Zigbee support)

TROUBLESHOOTING:
- Device not found? Check that your device is within Zigbee range of Homey
- Device paired but wrong capabilities? Open an issue on GitHub with the device fingerprint
- To get your device fingerprint: Homey app > Zigbee > your device > scroll to bottom
- AggregateError during install? Update to the latest app version and retry

GETTING STARTED:
1. Install this app from the Homey App Store
2. Go to Devices > Add Device > Tuya Unified (or search your brand name)
3. Put your device in pairing mode (usually hold the button 5-10 seconds until LED blinks)
4. Homey will auto-detect the device type and apply the correct driver

CREDITS AND ATTRIBUTION:
- Based on the original work by Johan Bendz (github.com/JohanBendz/com.tuya.zigbee)
- Community contributors: see github.com/dlnraja/com.tuya.zigbee/graphs/contributors
- Zigbee2MQTT project for protocol documentation
- Tuya Open API for device fingerprint reference

COMMUNITY AND SUPPORT:
- Forum: https://community.homey.app/t/140352
- Issues and feature requests: https://github.com/dlnraja/com.tuya.zigbee/issues
- Source code: https://github.com/dlnraja/com.tuya.zigbee
- Test channel (latest features): https://homey.app/a/com.dlnraja.tuya.zigbee/test/
