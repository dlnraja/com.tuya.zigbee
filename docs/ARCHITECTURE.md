# Tuya Zigbee App Architecture

## 🏗️ Overview

This app uses a modern, modular architecture centered around the **Tuya Engine** that centralizes device logic and makes it easy to support new devices without duplicating code.

## 📁 Project Structure

```
com.tuya.zigbee/
├── .github/                      # GitHub workflows & templates
│   ├── workflows/
│   │   ├── homey-official-publish.yml  # Main publish workflow
│   │   └── pr-validation.yml           # PR validation with artifacts
│   ├── ISSUE_TEMPLATE/
│   │   ├── device_request.md           # Device support requests
│   │   └── bug_report.md               # Bug reports
│   └── pull_request_template.md        # PR checklist
│
├── lib/                          # Shared libraries
│   ├── tuya-engine/              # ⭐ Core engine (profiles + traits)
│   │   ├── fingerprints.json     # Device identification
│   │   ├── profiles.json         # Device configurations
│   │   ├── converters/           # DP ↔ Capability transformers
│   │   ├── traits/               # Reusable capability logic
│   │   └── utils/                # Logging, DP encoding
│   ├── IASZoneEnroller.js        # IAS Zone enrollment handler
│   ├── Logger.js                 # Leveled logging
│   └── TuyaDPParser.js           # TS0601 DP parser
│
├── drivers/                      # Device drivers (minimal wiring)
│   ├── motion_sensor/
│   ├── contact_sensor/
│   ├── plug/
│   └── ...                       # 183 drivers
│
├── scripts/                      # Automation & tools
│   ├── automation/
│   │   ├── build-device-matrix.js      # Generate device list
│   │   └── update-all-links.js         # Doc maintenance
│   └── fixes/                    # One-time fixes
│
├── docs/                         # Documentation
│   ├── community/                # Community analysis
│   ├── fixes/                    # Fix summaries
│   ├── forum/                    # Forum templates
│   └── workflow/                 # Development workflows
│
├── app.json                      # Homey app manifest
├── package.json                  # Node.js dependencies
└── README.md                     # Main documentation
```

## 🔧 Core Architecture: Tuya Engine

### Design Philosophy

**Problem**: 183 drivers with scattered logic → hard to maintain, easy to introduce bugs

**Solution**: Centralized engine where:
- Device identification → `fingerprints.json`
- Device behavior → `profiles.json`
- Capability logic → `traits/`
- Data transformation → `converters/`

### How It Works

#### 1. Fingerprints (Device Identification)

```json
{
  "manufacturerName": "_TZ3000_26fmupbb",
  "modelId": "TS0203",
  "endpoints": [1],
  "profile": "contact_sensor"
}
```

Maps manufacturer + model → profile

#### 2. Profiles (Device Configuration)

```json
{
  "contact_sensor": {
    "capabilities": ["alarm_contact"],
    "dpMap": {
      "contact": 1
    },
    "options": {
      "invert": false
    }
  }
}
```

Defines capabilities + DP mapping + options

#### 3. Traits (Capability Logic)

```javascript
// traits/Contact.js
async function ContactTrait(device, context) {
  const { endpoint, dpMap, converters } = context;
  
  device.registerCapability('alarm_contact', endpoint);
  device.onZigbeeReport('contact', (value) => {
    device.setCapabilityValue('alarm_contact', value);
  });
}
```

Reusable logic for each capability type

#### 4. Converters (Data Transformation)

```javascript
// converters/temperature.js
module.exports = {
  toHomey: (value, options = {}) => {
    const scale = options.scale || 10;
    return value / scale;
  },
  fromHomey: (value, options = {}) => {
    const scale = options.scale || 10;
    return Math.round(value * scale);
  }
};
```

Handles DP ↔ Capability transformations

### Driver Structure (Minimal Wiring)

```javascript
// drivers/motion_sensor/device.js
const TuyaEngine = require('../../lib/tuya-engine');
const logger = require('../../lib/tuya-engine/utils/logger');

class MotionSensor extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.logger = logger.createLogger(this, 'motion');
    
    // Get profile from engine
    const profile = await TuyaEngine.getProfile(zclNode);
    
    if (profile) {
      // Apply traits
      await TuyaEngine.applyTraits(this, zclNode, profile);
      this.logger.info('Device initialized with profile', { profileId: profile.profileId });
    } else {
      // Fallback to legacy logic
      this.logger.warn('No profile found, using legacy logic');
      this._initLegacy();
    }
  }
}
```

Drivers become thin wrappers that:
1. Create logger
2. Get profile from engine
3. Apply traits
4. Done!

## 📊 Data Flow

```
Zigbee Report
     ↓
  Device Driver (minimal)
     ↓
  Tuya Engine (get profile)
     ↓
  Trait (capability logic)
     ↓
  Converter (transform data)
     ↓
  Homey Capability Update
```

## 🔍 Logging System

### Log Levels

- **info** (default): Essential events only
  - Device initialization
  - IAS enrollment status
  - Capability changes
  
- **debug**: Detailed operational info
  - DP mappings
  - Cluster reports
  - Trait application
  
- **trace**: Full packet-level data
  - Raw ZCL frames
  - All attribute reports

### Usage

```javascript
const logger = require('./lib/tuya-engine/utils/logger');
const log = logger.createLogger(this, 'my_device');

log.info('Device paired');
log.debug('Registering capability', { cap: 'onoff' });
log.trace('Raw report', zclFrame);
```

### Setting Log Level

```bash
# In device settings or environment
LOG_LEVEL=info    # Default
LOG_LEVEL=debug   # For troubleshooting
LOG_LEVEL=trace   # Deep debugging
```

## 🧪 Testing Strategy

### Unit Tests (Converters)

```javascript
// tests/converters/temperature.test.js
test('temperature converter scales correctly', () => {
  const conv = require('../converters/temperature');
  expect(conv.toHomey(235, { scale: 10 })).toBe(23.5);
  expect(conv.fromHomey(23.5, { scale: 10 })).toBe(235);
});
```

### Integration Tests (Traits)

```javascript
// tests/traits/onoff.test.js
test('OnOff trait registers capability', async () => {
  const mockDevice = createMockDevice();
  await OnOffTrait(mockDevice, mockContext);
  expect(mockDevice.registerCapability).toHaveBeenCalledWith('onoff');
});
```

### Validation (CI)

```bash
# Run on every PR
npm run lint
npm test
homey app validate --level publish
node scripts/automation/build-device-matrix.js
```

## 🚀 CI/CD Pipeline

### Pull Request Flow

1. **PR opened** → Triggers `pr-validation.yml`
2. **Lint** → Check code style
3. **Test** → Run unit/integration tests
4. **Validate** → Homey app validation (publish level)
5. **Matrix** → Build device matrix
6. **Artifacts** → Upload validation report + matrix
7. **Comment** → Auto-comment on PR with results
8. **Block merge** → If validation fails

### Main Branch Flow

1. **Push to master** → Triggers `homey-official-publish.yml`
2. **Update docs** → Auto-update links/paths
3. **Validate** → Ensure app is valid
4. **Version** → Bump patch version
5. **Publish** → Push to Homey App Store
6. **Release** → Create GitHub release

## 📦 Adding a New Device

### Option 1: Using Profiles (Recommended)

1. **Identify device**
   ```json
   // Add to fingerprints.json
   {
     "manufacturerName": "_TZ3000_newdevice",
     "modelId": "TS0601",
     "endpoints": [1],
     "profile": "motion_sensor"  // Reuse existing profile
   }
   ```

2. **Done!** If profile exists, no code changes needed

### Option 2: New Profile

1. **Add fingerprint** (same as above, but new profile name)

2. **Create profile**
   ```json
   // Add to profiles.json
   {
     "my_new_device": {
       "capabilities": ["onoff", "measure_power"],
       "dpMap": {
         "onoff": 1,
         "power": 18
       },
       "options": {
         "powerScale": 10
       }
     }
   }
   ```

3. **Create trait** (if new capability type)
   ```javascript
   // traits/Power.js
   async function PowerTrait(device, context) {
     // Implementation
   }
   ```

4. **Create converter** (if needed)
   ```javascript
   // converters/power.js
   module.exports = {
     toHomey: (value, options) => value / (options.scale || 1),
     fromHomey: (value, options) => value * (options.scale || 1)
   };
   ```

### Option 3: Legacy Driver

For complex/unique devices, create traditional driver in `drivers/`

## 🔄 Migration Strategy

Currently migrating from **183 individual drivers** → **Engine-based profiles**

**Phase 1** (Current):
- Engine infrastructure exists
- Most drivers still use legacy logic
- New devices use profiles when possible

**Phase 2** (In Progress):
- Identify common patterns
- Group similar devices
- Create profiles for device families

**Phase 3** (Future):
- 80%+ devices use profiles
- ~20-30 profiles cover most variants
- Only truly unique devices have custom drivers

## 🛡️ Quality Assurance

### Before Every Release

- ✅ All tests pass
- ✅ Homey validation (publish level)
- ✅ Device matrix updated
- ✅ CHANGELOG updated
- ✅ No lint errors

### Pull Request Requirements

- ✅ Descriptive title & description
- ✅ Linked issue (if fixing bug/adding device)
- ✅ Tests added/updated
- ✅ Matrix updated (if device added)
- ✅ CI validation passes

## 📚 References

- [Homey SDK3 Documentation](https://apps-sdk-v3.developer.homey.app/)
- [Zigbee Clusters](https://zigbee.blakadder.com/)
- [Zigbee2MQTT Device Database](https://www.zigbee2mqtt.io/supported-devices/)
- [Home Assistant Tuya Integration](https://www.home-assistant.io/integrations/tuya/)

---

**Version**: 3.1.3+  
**Last updated**: 2025-01-19
