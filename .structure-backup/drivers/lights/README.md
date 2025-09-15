# LIGHTS DRIVERS

Bulbs, LED Strips, Controllers, Dimmers

## Supported Devices
- Smart Bulb
- Rgb Bulb
- Tunable White Bulb
- Led Strip
- Led Controller
- Gu10 Spot
- Candle Bulb
- Filament Bulb

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
