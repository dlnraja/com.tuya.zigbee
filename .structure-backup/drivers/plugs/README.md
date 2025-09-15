# PLUGS DRIVERS

Smart Plugs, Outlets, Energy Monitoring

## Supported Devices
- Smart Plug
- Smart Outlet
- Energy Plug
- Wall Outlet
- Extension Plug
- Usb Outlet

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
