# 📚 LIB MIGRATION GUIDE

## Overview

The `lib/` directory has been reorganized for better maintainability and clarity.

## New Structure

```
lib/
├── battery/          Battery management system
├── security/         IAS Zone, locks, security devices
├── tuya/            Tuya protocol integration
├── flow/            Flow card management
├── devices/         Device type implementations
├── managers/        System managers
├── protocol/        Protocol routing and detection
├── utils/           Utilities and helpers
├── helpers/         Helper utilities
├── detectors/       Detection systems
├── zigbee/          Zigbee utilities
└── _archive/        Archived/obsolete files
```

## Migration Examples

### Before (Old Structure)
```javascript
const BatteryCalculator = require('../../lib/BatteryCalculator');
const IASZoneEnroller = require('../../lib/IASZoneEnroller');
const TuyaEF00Manager = require('../../lib/TuyaEF00Manager');
```

### After (New Structure)
```javascript
// Option 1: Import from main index
const { Battery, Security, Tuya } = require('../../lib');
const batterySystem = new Battery.BatterySystem(device);
const iasZone = new Security.IASZoneSystem(device);
const tuyaManager = new Tuya.TuyaEF00Manager(device);

// Option 2: Direct import
const { BatterySystem } = require('../../lib/battery');
const { IASZoneSystem } = require('../../lib/security');
const { TuyaEF00Manager } = require('../../lib/tuya');
```

## Consolidated Systems

### Battery System
**Before:** BatteryCalculator, BatteryHelper, BatteryManager, BatteryMonitoringSystem  
**After:** `lib/battery/BatterySystem.js` (unified)

```javascript
const { BatterySystem } = require('../../lib/battery');
const battery = new BatterySystem(device, {
  type: 'CR2032',
  reportingInterval: 3600
});
```

### IAS Zone System
**Before:** IASZoneEnroller, IASZoneManager, IASZoneEnrollerV4, etc.  
**After:** `lib/security/IASZoneSystem.js` (unified)

```javascript
const { IASZoneSystem } = require('../../lib/security');
const iasZone = new IASZoneSystem(device);
await iasZone.enroll();
```

### Tuya DataPoint System
**Before:** TuyaDPParser, TuyaDataPointParser, TuyaDataPointEngine  
**After:** `lib/tuya/TuyaDataPointSystem.js` (unified)

```javascript
const { TuyaDataPointSystem } = require('../../lib/tuya');
const dpSystem = new TuyaDataPointSystem(device);
dpSystem.registerDP(0x01, 'onoff');
```

### Flow System
**Before:** AdvancedFlowCardManager, FlowCardManager, FlowTriggerHelpers  
**After:** `lib/flow/FlowSystem.js` (unified)

```javascript
const { FlowSystem } = require('../../lib/flow');
const flow = new FlowSystem(this.homey);
await flow.registerDeviceTrigger('motion_detected', device);
```

## Device Types

All device types are now in `lib/devices/`:

```javascript
const { 
  BaseHybridDevice,
  ButtonDevice,
  PlugDevice,
  SensorDevice,
  SwitchDevice 
} = require('../../lib/devices');

class MyDevice extends BaseHybridDevice {
  // Your device implementation
}
```

## Backward Compatibility

For backward compatibility, old paths are maintained via symlinks until all drivers are migrated.

## Benefits

✅ **Better Organization:** Logical grouping by functionality  
✅ **Reduced Duplication:** Similar files merged  
✅ **Easier Imports:** Use main index or specific modules  
✅ **Clear Dependencies:** Understand what depends on what  
✅ **Maintainability:** Easier to find and update code  

## Archived Files

Obsolete and backup files have been moved to `lib/_archive/`:
- Old versions (e.g., IASZoneEnrollerV4)
- Example files (e.g., BatteryCalculator.example.js)
- Deprecated utilities

These are kept for reference but should not be used in new code.
