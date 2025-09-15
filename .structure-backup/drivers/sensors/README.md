# SENSORS DRIVERS

Motion, Contact, Temperature, Presence, Air Quality

## Supported Devices
- Motion Sensor
- Contact Sensor
- Door Window Sensor
- Temperature Humidity Sensor
- Presence Sensor
- Radar Sensor
- Pir Sensor
- Air Quality Monitor
- Soil Moisture Sensor
- Vibration Sensor
- Multisensor

## Standards
- Johan Benz design principles
- SDK3 compliance
- Unbranded categorization by function
- Local Zigbee 3.0 operation
- No cloud dependencies

## Driver Structure
Each driver contains:
- `driver.compose.json` - Driver manifest with Zigbee configuration
- `device.js` - Device logic implementation  
- `assets/` - Professional images (75x75, 500x500, 1000x1000)
- `pair/` - Pairing templates if needed
