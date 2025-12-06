# Quick Start Guide

## For Users

### Installation
1. Open Homey App Store
2. Search "Universal Tuya Zigbee"
3. Install

### Pairing a Device
1. Put device in pairing mode (usually hold button 5-10s)
2. In Homey app: Add Device → Universal Tuya Zigbee
3. Select device type (switch, plug, sensor, etc.)
4. Follow pairing instructions

### Supported Devices
- 3,743+ Tuya-compatible devices
- Brands: Tuya, Moes, Zemismart, Lonsonho, BlitzWolf, Neo, Immax

## For Developers

### Setup
```bash
git clone https://github.com/dlnraja/com.tuya.zigbee.git
cd com.tuya.zigbee
npm install
```

### Validate
```bash
npx homey app validate --level publish
```

### Run Scripts
```bash
# Apply all fingerprinting rules
node automation/MASTER_APPLY_ALL_RULES.js

# Check for collisions
node automation/DETECT_COLLISIONS.js

# Safe audit (read-only)
node automation/SAFE_AUDIT.js [driver_name]
```

### Key Files
- `DEV_NOTES.md` - Complete documentation
- `drivers/*/driver.compose.json` - Fingerprints
- `automation/*.js` - Validation scripts

### Adding New Device
1. Identify category (switch, plug, sensor, etc.)
2. Find correct driver folder
3. Add manufacturerName + productId
4. Run collision detection
5. Validate and commit

## Key Rules

```
✅ Always pair manufacturerName + productId
✅ Add ALL known productId variants
✅ Run DETECT_COLLISIONS.js before commit
❌ Never add TS0601 alone
❌ Never remove existing manufacturers
```

## Links
- [GitHub](https://github.com/dlnraja/com.tuya.zigbee)
- [Homey Community](https://community.homey.app)
- [Zigbee2MQTT Database](https://www.zigbee2mqtt.io/supported-devices/)
