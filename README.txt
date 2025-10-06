Universal Tuya Zigbee - Professional Edition

Support for Tuya Zigbee devices with local control (no cloud required).

FEATURES:
• 163+ device types supported
• UNBRANDED organization (by function, not by brand)
• SDK3 compliant
• Local control (no internet required)
• Energy monitoring
• Advanced pairing system
• Multi-language support (EN, FR)

SUPPORTED DEVICES:
• Switches (1-6 gang, AC & Battery)
• Wireless Buttons (1-6 gang)
• Motion Sensors (PIR, Radar, mmWave)
• Contact Sensors (Door/Window)
• Smart Plugs (Basic & Energy Monitoring)
• Lights (RGB, White, Dimmable)
• Climate Sensors (Temperature, Humidity, CO2)
• Safety Sensors (Smoke, CO, Gas, Water Leak)
• Curtains & Blinds
• Valves (Water, Gas)
• Locks & Special Devices

ORGANIZATION:
Drivers are organized by FUNCTION for easy selection:
- {type}_{gangs}gang_{power}
- Example: switch_3gang_ac, button_2gang_battery

INSTALLATION:
1. Install app from Homey App Store
2. Add device via "Devices" → "Add Device"
3. Select device type based on:
   - Function (switch, button, motion, etc.)
   - Number of gangs (1-6)
   - Power type (AC or Battery)
4. Follow pairing instructions

PAIRING:
Most Tuya devices enter pairing mode by:
• Pressing reset button 5 times quickly
• Holding button for 5-10 seconds
• Power cycling 3-5 times
• Check device manual for specific instructions

TROUBLESHOOTING:
• Device not pairing → Try reset multiple times
• Device offline → Check Zigbee network strength
• Wrong capabilities → Select correct driver variant
• Battery devices → Check battery level

TECHNICAL:
• SDK Version: 3
• Minimum Homey: 12.2.0
• Protocol: Zigbee 3.0
• Local control: Yes
• Cloud required: No

CREDITS:
Based on Johan Bendz's original work
Community-maintained fork with active development
Monthly updates and improvements

SUPPORT:
• GitHub: https://github.com/dlnraja/com.tuya.zigbee
• Community Forum: Homey Community Forum
• Report issues on GitHub

VERSION: 1.1.8
LAST UPDATE: 2025-10-06

CHANGELOG v1.1.8:
• UNBRANDED reorganization (function-based naming)
• 163 drivers analyzed and enriched
• Smart recovery of drivers
• SDK3 full compliance
• Improved device detection
• Better organization by function
• Enhanced pairing experience

LICENSE:
MIT License - Free and Open Source

DISCLAIMER:
This is a community-maintained app. Not officially affiliated with Tuya.
Use at your own risk. Always test devices before critical deployments.

ENJOY LOCAL CONTROL OF YOUR TUYA DEVICES!
