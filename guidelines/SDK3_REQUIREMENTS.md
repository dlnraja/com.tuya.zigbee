# HOMEY SDK3 GUIDELINES

## Image Requirements
- **App Images**: 250x175, 500x350, 1000x700 (landscape format)
- **Driver Images**: 75x75, 500x500, 1000x1000 (square format)
- All images must be PNG format
- Professional quality with device-specific icons

## Driver Structure
- Use `driver.compose.json` for configuration
- Implement `device.js` extending ZigBeeDevice
- Numeric cluster IDs only (basic: 0, powerConfiguration: 1, etc.)
- Energy.batteries array required for battery devices
- Valid classes: sensor, light, socket, button (NOT switch)

## Validation Requirements
- Zero red errors in `homey app validate --level=publish`
- All manufacturer IDs must be arrays
- Settings IDs cannot use reserved prefixes (energy_, homey_, app_)
- Contributors must be object format with developers array

## Flow Cards
- Descriptive IDs (motion_detected, not generic_trigger)
- Multilingual support (en, fr, nl, de minimum)
- Device filters by driver_id
- Proper token types (boolean, number, string)

## Best Practices
- Unbranded approach - categorize by function not brand
- Local Zigbee operation - no cloud dependencies
- Professional asset design following Johan Benz standards
- Comprehensive manufacturer ID coverage from all sources
