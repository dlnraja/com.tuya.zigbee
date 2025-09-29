# Homey SDK3 Guidelines & Requirements

## Image Dimensions (Critical)

### App Images (`assets/images/`)
- **small.png**: 250 x 175 px
- **large.png**: 500 x 350 px  
- **xlarge.png**: 1000 x 700 px

### Driver Images (`drivers/*/assets/`)
- **small.png**: 75 x 75 px
- **large.png**: 500 x 500 px
- **xlarge.png**: 1000 x 1000 px

⚠️ **CRITICAL**: If driver small.png missing, Homey uses app small.png (250x175) as fallback, causing validation errors when used in 75x75 driver context.

## Validation Requirements

### Cluster IDs
- Must be **numeric format only** (not strings)
- `basic: 0` ✅ (not `"basic"` ❌)
- `powerConfiguration: 1` ✅
- `identify: 3` ✅
- `onOff: 6` ✅
- `levelControl: 8` ✅

### Driver Classes
Valid classes:
- `sensor` ✅
- `light` ✅  
- `socket` ✅
- `button` ✅
- `thermostat` ✅
- `windowcoverings` ✅

Invalid classes:
- `switch` ❌ (use `light` or `button` instead)

### Energy Arrays
- Drivers with `measure_battery` capability MUST have:
```json
"energy": {
  "batteries": ["CR2032", "AA", "AAA"]
}
```

### Settings IDs
Avoid reserved prefixes:
- ❌ `energy_reporting` 
- ❌ `homey_setting`
- ❌ `app_config`
- ✅ `reporting_interval`
- ✅ `device_sensitivity`

### Contributors Format
```json
"contributors": {
  "developers": [
    {
      "name": "Developer Name",
      "email": "email@domain.com"
    }
  ],
  "translators": []
}
```

## Johan Benz Design Standards

### Visual Identity
- Clean, minimalist design with professional gradients
- Device-specific icons with recognizable silhouettes
- White/light backgrounds for driver images
- Professional typography and spacing
- Brand-agnostic approach focusing on device function

### Color Palette by Category
- **Sensors**: Blues (#2196F3, #03A9F4)
- **Lights**: Warm yellows/oranges (#FFA500, #FFD700)  
- **Switches**: Clean greens (#4CAF50, #8BC34A)
- **Plugs**: Purple/violet (#9C27B0, #673AB7)
- **Safety**: Red/pink tones (#F44336, #E91E63)
- **Climate**: Orange/red spectrum (#FF9800, #FF5722)
- **Covers**: Gray/blue (#607D8B, #455A64)

## Device Organization (Unbranded)

### Categories
1. **Motion & Presence Detection** (PIR, radar, presence sensors)
2. **Contact & Security** (door/window sensors, locks)  
3. **Temperature & Climate** (temp/humidity, thermostats, climate control)
4. **Smart Lighting** (bulbs, switches, dimmers, RGB)
5. **Power & Energy** (plugs, outlets, energy monitoring)
6. **Safety & Detection** (smoke, water leak, CO detectors)
7. **Automation Control** (buttons, scene switches, knobs)

### Naming Convention
- Focus on DEVICE FUNCTION not manufacturer
- `motion_sensor` ✅ (not `tuya_motion_sensor` ❌)
- `smart_plug` ✅ (not `brand_smart_plug` ❌)
- Professional, descriptive names

## Common Validation Errors & Fixes

### Error: "clusters[X] should be number"
```javascript
// ❌ Wrong
"clusters": ["basic", "identify", "onOff"]

// ✅ Correct  
"clusters": [0, 3, 6]
```

### Error: "missing array 'energy.batteries'"
```json
{
  "capabilities": ["measure_battery"],
  "energy": {
    "batteries": ["CR2032", "AA"]
  }
}
```

### Error: "invalid driver class: switch"
```json
{
  "class": "light"  // ✅ Use instead of "switch"
}
```

### Error: "invalid setting id: energy_reporting"
```json
{
  "id": "reporting_interval"  // ✅ Avoid reserved prefixes
}
```

## Zigbee Cluster Reference

| Cluster Name | ID | Purpose |
|--------------|----|---------| 
| basic | 0 | Basic device information |
| powerConfiguration | 1 | Battery/power status |
| identify | 3 | Device identification |
| groups | 4 | Group management |
| scenes | 5 | Scene control |
| onOff | 6 | On/off control |
| levelControl | 8 | Dimming control |
| colorControl | 768 | Color control |
| illuminanceMeasurement | 1024 | Light measurement |
| temperatureMeasurement | 1026 | Temperature |
| relativeHumidity | 1029 | Humidity |
| occupancySensing | 1030 | Motion detection |
| iasZone | 1280 | Security sensors |
| electricalMeasurement | 2820 | Power measurement |
| windowCovering | 258 | Curtain/blind control |
| thermostat | 513 | Thermostat control |

## Capabilities Reference

### Standard Capabilities
- `onoff` - On/off switch
- `dim` - Dimming (0-1)
- `measure_battery` - Battery percentage
- `measure_temperature` - Temperature (°C)
- `measure_humidity` - Humidity (%)
- `measure_power` - Power consumption (W)
- `meter_power` - Energy consumption (kWh)
- `alarm_motion` - Motion detection
- `alarm_contact` - Contact sensor
- `alarm_smoke` - Smoke detection
- `target_temperature` - Target temperature
- `windowcoverings_state` - Curtain position

### Color Capabilities  
- `light_hue` - Hue (0-1)
- `light_saturation` - Saturation (0-1)
- `light_temperature` - Color temperature (K)

## OTA Updates (SDK3 Native)

Use Homey's native OTA capabilities:
```javascript
// Check for firmware updates
await device.getNode().checkForFirmwareUpdate();

// Update firmware
await device.getNode().updateFirmware(firmwareData);
```

## Best Practices

1. **Always validate** with `homey app validate --level=publish`
2. **Test thoroughly** before publication
3. **Use semantic versioning** (1.0.0, 1.0.1, etc.)
4. **Document changes** in changelog
5. **Follow unbranded organization** by device type
6. **Provide proper translations** (EN/FR/NL/DE)
7. **Include comprehensive flow cards**
8. **Optimize for local operation** (no cloud dependencies)

## Publication Checklist

- [ ] All images correct dimensions and professional quality
- [ ] All clusters numeric format
- [ ] Valid driver classes used
- [ ] Energy arrays for battery devices
- [ ] No reserved setting ID prefixes
- [ ] Contributors properly formatted
- [ ] Validation passes with 0 errors 
- [ ] Professional device categorization
- [ ] Comprehensive manufacturer/product ID coverage
- [ ] Flow cards complete and translated
- [ ] Local Zigbee operation confirmed
