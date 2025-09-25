# Homey SDK3 Guidelines - Ultimate Zigbee Hub

## Critical Requirements for Validation

### Image Dimensions (MANDATORY)
**App Images** (`assets/images/`):
- `small.png`: 250 x 175 px
- `large.png`: 500 x 350 px  
- `xlarge.png`: 1000 x 700 px

**Driver Images** (`drivers/*/assets/`):
- `small.png`: 75 x 75 px
- `large.png`: 500 x 500 px
- `xlarge.png`: 1000 x 1000 px

⚠️ **Critical**: Driver `small.png` must be 75x75, not 250x175 (app fallback causes validation errors)

### Cluster ID Format (MANDATORY)
```json
{
  "zigbee": {
    "endpoints": {
      "1": {
        "clusters": [0, 3, 6, 8]  // NUMERIC ONLY
      }
    }
  }
}
```

**Cluster Reference**:
- basic: 0
- powerConfiguration: 1
- identify: 3
- groups: 4
- scenes: 5
- onOff: 6
- levelControl: 8
- colorControl: 768
- temperatureMeasurement: 1026
- relativeHumidity: 1029
- occupancySensing: 1030
- iasZone: 1280
- electricalMeasurement: 2820
- windowCovering: 258
- thermostat: 513

### Driver Classes (MANDATORY)
**Valid Classes**:
- `sensor` - For all sensors (motion, temperature, contact, etc.)
- `light` - For bulbs, strips, dimmers
- `button` - For switches, scene controllers  
- `socket` - For plugs, outlets
- `thermostat` - For climate control
- `windowcoverings` - For curtains, blinds
- `other` - Generic fallback

⚠️ **Invalid**: `switch` class not supported in SDK3

### Energy Configuration (MANDATORY for battery devices)
```json
{
  "energy": {
    "batteries": ["CR2032", "AA", "AAA"]
  }
}
```
Required when `measure_battery` capability is present.

### Contributors Format (MANDATORY)
```json
{
  "contributors": {
    "developers": [
      {
        "name": "Johan Bendz",
        "email": "johan.bendz@gmail.com"
      }
    ],
    "translators": []
  }
}
```

### Reserved Setting IDs (AVOID)
Do NOT use these prefixes:
- `energy_*`
- `homey_*` 
- `app_*`
- `system_*`

Use alternatives like `reporting_interval` instead of `energy_reporting`.

## Johan Benz Design Standards

### Visual Identity
- **Clean Minimalism**: Professional, uncluttered design
- **Device-Specific Icons**: Recognizable silhouettes at small sizes
- **Consistent Colors**: Category-based color palettes
- **Professional Quality**: High-resolution, crisp images

### Color Palettes by Category
```javascript
const colorPalettes = {
  sensors: { primary: '#2196F3', secondary: '#03A9F4' },
  lights: { primary: '#FFD700', secondary: '#FFA500' },
  switches: { primary: '#4CAF50', secondary: '#8BC34A' },
  plugs: { primary: '#9C27B0', secondary: '#673AB7' },
  safety: { primary: '#F44336', secondary: '#E91E63' },
  climate: { primary: '#FF9800', secondary: '#FF5722' },
  covers: { primary: '#607D8B', secondary: '#455A64' }
};
```

### Organization Principles
- **Unbranded**: Organize by function, not manufacturer
- **User-Focused**: Categories based on what devices do
- **Scalable**: Easy to add new devices
- **Professional**: Clean, predictable structure

## Validation Error Fixes

### Common Errors & Solutions

**1. "clusters[X] should be number"**
```javascript
// ❌ Wrong
"clusters": ["basic", "onOff"]

// ✅ Correct  
"clusters": [0, 6]
```

**2. "missing array 'energy.batteries'"**
```javascript
// Add to drivers with measure_battery
{
  "capabilities": ["measure_battery"],
  "energy": {
    "batteries": ["CR2032", "AA"]
  }
}
```

**3. "invalid driver class: switch"**
```javascript
// ❌ Wrong
"class": "switch"

// ✅ Correct
"class": "button"  // or "light" for dimmers
```

**4. "invalid setting id: energy_reporting"**
```javascript
// ❌ Wrong
"id": "energy_reporting"

// ✅ Correct
"id": "reporting_interval"
```

**5. "contributors should be object"**
```javascript
// ✅ Correct format
"contributors": {
  "developers": [{"name": "Johan Bendz", "email": "johan.bendz@gmail.com"}],
  "translators": []
}
```

## Device.js SDK3 Requirements

### Capability Registration
```javascript
// ✅ Correct - Numeric cluster IDs
this.registerCapability('onoff', 6);
this.registerCapability('dim', 8);
this.registerCapability('measure_temperature', 1026);

// ❌ Wrong - String cluster names
this.registerCapability('onoff', 'onOff');
```

### Error Handling
```javascript
async onNodeInit() {
  try {
    // Register capabilities
    await this.registerCapabilities();
    
    // Configure reporting
    await this.configureReporting();
    
    this.setAvailable();
  } catch (error) {
    this.error('Device initialization failed:', error);
    this.setUnavailable(error.message);
  }
}
```

## OTA Updates (Native SDK3)

### Implementation
```javascript
const { ZigBeeOTADevice } = require('homey-zigbeedriver');

class MyDevice extends ZigBeeOTADevice {
  async onOTAUpdate() {
    this.log('OTA update started');
    // Homey handles the update automatically
  }
}
```

### Firmware Files
Store in `/drivers/*/ota/` directory:
- Use manufacturer-specific naming
- Include version information
- Test thoroughly before deployment

## Publication Checklist

### Pre-Validation
- [ ] All images have correct dimensions
- [ ] All cluster IDs are numeric
- [ ] No invalid driver classes
- [ ] Energy arrays for battery devices
- [ ] Proper contributors format
- [ ] No reserved setting IDs

### Validation Process
```bash
# Must pass without red errors
homey app validate --level=publish
```

### Publication Steps
1. Clean `.homeybuild` directory
2. Commit all changes to Git
3. Run `homey app publish`
4. Handle prompts:
   - Uncommitted changes: `y`
   - Version type: `patch`/`minor`/`major`
   - Changelog: Professional description

## Automated Workflows

### Monthly Updates
- Forum scraping for new devices
- Manufacturer database updates  
- Driver enrichment
- Automatic draft publication

### Validation Automation
```javascript
// Auto-fix common issues
await this.convertClustersToNumeric();
await this.addEnergyArrays();
await this.validateImageDimensions();
await this.updateContributorsFormat();
```

## Forum Integration

### Button Connectivity Issues
Based on community feedback (Post #141):
- Device: AliExpress item 1005007769107379
- Issue: Pairs but immediately disconnects
- Solution: Enhanced pairing settings, retry logic

### Implementation
```javascript
// In driver.compose.json for buttons
"settings": [
  {
    "id": "pairing_timeout",
    "type": "number", 
    "value": 30,
    "min": 10,
    "max": 120,
    "hint": {"en": "Increase if button keeps disconnecting"}
  }
]
```

## Quality Assurance

### Image Quality
- Professional gradients
- Consistent iconography  
- Device-recognizable silhouettes
- Category-appropriate colors

### Code Quality
- SDK3 compliance
- Error handling
- Proper logging
- Meaningful error messages

### User Experience
- Clear pairing instructions
- Helpful setting descriptions
- Logical device organization
- Professional presentation

---

**Remember**: These guidelines ensure zero validation errors and professional app store presence following Johan Benz standards and Homey SDK3 requirements.

*Last Updated: ${new Date().toISOString()}*
*Version: SDK3 Compliant*
*Status: Production Ready*
