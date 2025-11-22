# Contributing to Universal Tuya Zigbee

Thank you for your interest in contributing to this community-maintained Tuya Zigbee app for Homey Pro!

## 🌟 Based on Johan Bendz's Work

This project is a fork of [Johan Bendz's original Tuya Zigbee app](https://github.com/JohanBendz/com.tuya.zigbee), extended to full SDK3 native implementation. All contributions should respect the original MIT License and maintain the spirit of Johan's excellent work.

---

## 📋 How to Add a New Device

### 1. Check if Device is Already Supported

Before requesting a new device, check:
- Browse the `/drivers/` folder in the repository
- Check the device matrix in `README.md`
- Search existing GitHub Issues

### 2. Interview Your Device

Follow Johan's comprehensive guide on how to interview a Zigbee device:
1. Add device to Homey using the generic Zigbee app
2. Use Developer Tools to interview the device
3. Collect the following information:
   - `manufacturerName` (e.g., `_TZ3000_mmtwjmaq`, `TS0201`, `Tuya`)
   - `productId` (e.g., `TS0201`, `TS011F`)
   - Zigbee clusters (e.g., `[0, 1, 3, 1026, 1029]`)
   - Capabilities needed (e.g., `measure_temperature`, `measure_humidity`)
   - Endpoints (if multi-gang device)

**Example interview output:**
```json
{
  "manufacturerName": "_TZ3000_mmtwjmaq",
  "productId": "TS0202",
  "clusters": {
    "1": [0, 1, 3, 1030, 1280]
  },
  "capabilities": ["alarm_motion", "measure_battery"]
}
```

### 3. Submit a GitHub Issue

Create a new issue using the "New Device Request" template:

**Title:** `[Device Request] Your Device Name`

**Content:**
```markdown
## Device Information

- **Brand/Model:** [e.g., HOBEIAN Multi Sensor]
- **Manufacturer Name:** [e.g., _TZ3000_mmtwjmaq]
- **Product ID:** [e.g., TS0202]
- **Purchase Link:** [optional]

## Zigbee Interview Data

```json
{
  "manufacturerName": "...",
  "productId": "...",
  "clusters": {...}
}
```

## Desired Capabilities

- [ ] Motion detection (`alarm_motion`)
- [ ] Temperature (`measure_temperature`)
- [ ] Humidity (`measure_humidity`)
- [ ] Battery (`measure_battery`)

## Additional Notes

[Any specific behavior or issues you've noticed]
```

### 4. Test the Driver (If Created)

If a developer creates a driver for your device:

1. **Install the app manually:**
   ```bash
   git clone https://github.com/dlnraja/com.tuya.zigbee.git
   cd com.tuya.zigbee
   homey app install
   ```

2. **Test all capabilities:**
   - Verify each capability works (motion, temperature, etc.)
   - Check error logs in Homey Developer Tools
   - Test edge cases (low battery, rapid triggers, etc.)

3. **Report results in the GitHub Issue:**
   - ✅ Working capabilities
   - ❌ Non-working capabilities
   - 📝 Logs and error messages
   - 💡 Suggestions for improvement

---

## 💻 Code Contributions

### Project Structure

```
com.tuya.zigbee/
├── drivers/                    # All device drivers
│   ├── motion_sensor_battery/  # Example driver
│   │   ├── device.js           # Device logic (SDK3)
│   │   ├── driver.js           # Driver initialization
│   │   ├── driver.compose.json # Driver configuration
│   │   └── assets/             # Images (75x75, 500x500)
│   └── ...
├── lib/                        # Shared libraries
├── utils/                      # Utility functions
├── app.json                    # App configuration (auto-generated)
└── app.js                      # App initialization
```

### Code Standards

#### 1. **Full SDK3 Native**
- ✅ Use `homey-zigbeedriver` and `zigbee-clusters`
- ❌ No legacy SDK2 code (`homey-meshdriver`)
- ✅ Numeric cluster IDs only: `CLUSTER.TEMPERATURE_MEASUREMENT` or `1026`

#### 2. **Follow Existing Driver Structure**

**device.js template:**
```javascript
'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class MyDeviceDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Device initialized');
    
    await super.onNodeInit({ zclNode });
    
    // Register capabilities
    if (this.hasCapability('measure_temperature')) {
      this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT);
    }
    
    await this.setAvailable();
  }

  async onDeleted() {
    this.log('Device deleted');
  }
}

module.exports = MyDeviceDevice;
```

#### 3. **Proper Error Handling**
```javascript
try {
  await endpoint.clusters.iasZone.write(0x0010, zclNode.ieeeAddr);
  this.log('✅ IAS CIE address written');
} catch (err) {
  this.log('⚠️ IAS CIE write failed:', err.message);
  // Try fallback method
}
```

#### 4. **Detailed Logging**
```javascript
// Good: Descriptive with emojis for clarity
this.log('🚶 ===== MOTION NOTIFICATION RECEIVED =====');
this.log('Full payload:', JSON.stringify(payload));

// Bad: Unclear
this.log('Got data');
```

#### 5. **Image Requirements**
- **Small:** 75x75px (driver icon)
- **Large:** 500x500px (driver detail)
- PNG format, transparent background
- Follow Johan Bendz design standards (see `MEMORY[4c104af8]`)

---

## 🧪 Testing

### Local Testing Checklist

Before submitting a PR:

- [ ] Tested on real Homey Pro hardware (not emulator)
- [ ] All capabilities verified working
- [ ] Error logs checked (no critical errors)
- [ ] Battery reporting accurate (if applicable)
- [ ] Motion/contact sensors trigger reliably
- [ ] Multi-gang switches control all endpoints
- [ ] IAS Zone enrollment successful (for sensors/buttons)

### Validation

Run Homey CLI validation before committing:
```bash
homey app validate --level=publish
```

All errors must be resolved before PR acceptance.

---

## 📚 Documentation

### When Adding a Driver

Update these files:

1. **README.md** - Add device to supported devices list
2. **CHANGELOG.md** - Document the new driver
3. **Driver comments** - Explain any quirks or special handling

### Comment Style

```javascript
/**
 * HOBEIAN Multi Sensor (Motion + Temperature + Humidity + Illumination)
 * v2.15.50 - Enhanced IAS Zone enrollment for motion detection (2025-10-12)
 * 
 * CRITICAL FIXES:
 * - Use attribute ID 0x0010 for IAS CIE enrollment (not writeAttributes)
 * - Triple fallback methods for maximum device compatibility
 * - Enhanced notification listeners for both object and number formats
 */
class MotionSensorDevice extends ZigBeeDevice {
  // ...
}
```

---

## 🐛 Bug Reports

### Creating a Bug Report

**Title:** `[Bug] Brief description`

**Content:**
```markdown
## Description

Clear description of the bug.

## Steps to Reproduce

1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior

What should happen.

## Actual Behavior

What actually happens.

## Environment

- **App Version:** v2.15.52
- **Homey Version:** v12.7.0
- **Device:** [e.g., HOBEIAN Multi Sensor]
- **Driver:** [e.g., motion_temp_humidity_illumination_multi_battery]

## Logs

```
[Paste relevant logs from Homey Developer Tools]
```

## Additional Context

Any other information about the problem.
```

---

## 🚀 Pull Request Process

### Before Submitting

1. ✅ Fork the repository
2. ✅ Create a feature branch: `git checkout -b feature/my-new-driver`
3. ✅ Follow code standards
4. ✅ Test thoroughly on real hardware
5. ✅ Update documentation
6. ✅ Commit with descriptive messages
7. ✅ Pass validation: `homey app validate --level=publish`

### PR Template

**Title:** `[Driver] Add support for Device Name`

**Content:**
```markdown
## Description

Adds support for [Device Name].

## Device Information

- **Manufacturer:** _TZ3000_xxxxx
- **Product ID:** TS0xxx
- **Capabilities:** alarm_motion, measure_battery

## Changes

- Created driver: `drivers/my_device/`
- Added device.js with IAS Zone support
- Updated README.md with new driver

## Testing

- [x] Tested on real Homey Pro
- [x] All capabilities working
- [x] No validation errors
- [x] Logs reviewed

## Screenshots

[If applicable]
```

### Review Process

1. Automated checks run (GitHub Actions)
2. Code review by maintainer
3. Testing on additional hardware (if available)
4. Merge or request changes

---

## 🤝 Community Guidelines

### Be Respectful

- Respect the work of Johan Bendz and all contributors
- Be patient - this is a volunteer project
- Help others when you can
- Provide constructive feedback

### Communication

- Use clear, descriptive titles for issues/PRs
- Include all relevant information
- Respond to questions from reviewers
- Update issues if you solve them yourself

### Attribution

- Always credit original sources
- Link to relevant documentation
- Acknowledge help from community members

---

## 📖 Resources

### Homey Development

- [Homey Apps SDK3 Documentation](https://apps.developer.homey.app/)
- [Homey Community Forum](https://community.homey.app/)
- [Zigbee Clusters Documentation](https://github.com/Koenkk/zigbee-herdsman-converters)

### Zigbee References

- [Zigbee2MQTT Device Database](https://www.zigbee2mqtt.io/supported-devices/)
- [Blakadder Zigbee Database](https://zigbee.blakadder.com/)
- [ZHA Device Handlers](https://github.com/zigpy/zha-device-handlers)

### Original Project

- [Johan Bendz's Tuya Zigbee App](https://github.com/JohanBendz/com.tuya.zigbee)
- [Johan's Forum Thread](https://community.homey.app/t/app-pro-tuya-zigbee-app/26439)

---

## 📬 Contact

- **GitHub Issues:** https://github.com/dlnraja/com.tuya.zigbee/issues
- **Forum Thread:** https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352
- **Email:** [Maintainer contact if provided]

---

## 🙏 Thank You!

Every contribution, no matter how small, helps make this app better for the entire Homey community. Special thanks to Johan Bendz for creating the original foundation that makes this all possible.

**Happy contributing!** 🎉
