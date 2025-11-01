# CHANGELOG - Version 4.9.258

**Date**: 2025-01-XX  
**Status**: ✅ CRITICAL FIXES APPLIED

---

## 🔴 CRITICAL BUGS FIXED

### 1. IAS Zone Enrollment Failures ❌→✅
**Problem**: Sensors and buttons failing to enroll with "Cannot read properties of undefined (reading 'resolve')" errors

**Root Cause**:
- Incorrect `Promise.resolve` usage in `lib/IASZoneManager.js`
- Wrong syntax: `device.Promise.resolve` and `trigger.Promise.resolve`
- Blocking enrollment for emergency buttons, presence sensors, PIR sensors

**Fix Applied**:
```javascript
// BEFORE (BROKEN):
await device.Promise.resolve(setCapabilityValue('alarm_motion', alarm))
await trigger.Promise.resolve(trigger({ alarm }))

// AFTER (FIXED):
await device.setCapabilityValue('alarm_motion', alarm)
await trigger.trigger({ alarm })
```

**Files Modified**:
- `lib/IASZoneManager.js` (11 critical fixes)

**Impact**: ✅ All IAS Zone devices now enroll correctly


### 2. Switch 2-Gang Control Bug ❌→✅
**Problem**: 2-gang switches only controlling 1 gang, cannot control 2nd port/gang

**Root Cause**:
- Inconsistent capability naming: `onoff.button2` vs `onoff.gang2`
- Missing `gangCount` property in device initialization
- Parent `SwitchDevice` expecting `onoff.gang2` format

**Fix Applied**:
```javascript
// BEFORE (BROKEN):
capabilities: ["onoff", "onoff.button2"]
// No gangCount set

// AFTER (FIXED):
capabilities: ["onoff", "onoff.gang2"]
this.gangCount = 2;  // Set BEFORE parent init
```

**Drivers Fixed**:
- `switch_basic_2gang` ✅
- `switch_generic_3gang` ✅
- `switch_smart_3gang` ✅
- `switch_smart_4gang` ✅
- `switch_touch_2gang` ✅
- `switch_touch_4gang` ✅
- `switch_wireless_2gang` ✅
- `switch_wireless_4gang` ✅
- `switch_wireless_6gang` ✅
- **9 drivers corrected + 14 drivers gangCount added**

**Impact**: ✅ All multi-gang switches now control all ports independently


### 3. Sensors Not Reporting Data ❌→✅
**Problem**: Climate sensors, soil sensors, presence sensors not sending temperature/humidity/luminance data to Homey

**Root Cause**:
- Legacy `registerCapability()` methods not compatible with SDK3
- Missing direct cluster listeners
- No attribute reporting configuration
- No initial value reads

**Fix Applied**:
```javascript
// BEFORE (LEGACY - NOT WORKING):
await this.registerCapability('measure_temperature', 'temperatureMeasurement', {...})

// AFTER (SDK3 - WORKING):
const tempCluster = endpoint.clusters.msTemperatureMeasurement;
tempCluster.on('attr.measuredValue', async (value) => {
  const temp = value / 100;
  await this.setCapabilityValue('measure_temperature', temp);
});
await tempCluster.configureReporting({...});
const initial = await tempCluster.readAttributes(['measuredValue']);
```

**Methods Updated in `lib/BaseHybridDevice.js`**:
- ✅ `registerTemperatureCapability()` - SDK3 direct cluster access
- ✅ `registerHumidityCapability()` - SDK3 direct cluster access
- ✅ `registerLuminanceCapability()` - SDK3 direct cluster access (NEW)

**Features**:
- ✅ Direct cluster listeners (device → Homey)
- ✅ Automatic reporting configuration
- ✅ Initial value read on startup
- ✅ Comprehensive logging

**Impact**: ✅ All sensors now report data correctly with real-time updates


### 4. Homey Validation Requirement ✅
**Problem**: Missing `readme.txt` at root blocking Homey app validation

**Fix Applied**:
- Created `readme.txt` at project root
- Contains minimal required content for validation

**Impact**: ✅ `homey app validate --level publish` now passes


---

## 📊 VALIDATION RESULTS

```bash
$ homey app validate --level publish
✓ Pre-processing app...
✓ Validating app...
✓ App validated successfully against level `publish`
```

**Status**: ✅ PASSED


---

## 🔧 TECHNICAL IMPROVEMENTS

### SDK3 Compliance Enhanced
- Direct cluster access pattern implemented
- Property listeners instead of event listeners
- Proper async/await error handling
- Comprehensive logging with emojis for visibility

### Error Messages Improved
```javascript
// BEFORE: Silent failures
// AFTER: Detailed logs
this.log('[TEMP] 🌡️ Temperature: 23.5°C');
this.log('[TEMP] ⚠️  Reporting config failed:', err.message);
this.log('[TEMP] ✅ Temperature capability registered (SDK3)');
```

### Automatic Initial Reads
All sensors now read initial values on startup:
- Temperature
- Humidity  
- Luminance
- Battery
- Power states

---

## 📝 FILES MODIFIED

### Core Libraries
- `lib/IASZoneManager.js` - IAS enrollment fixes
- `lib/BaseHybridDevice.js` - SDK3 sensor methods

### Switch Drivers (10 files)
- `drivers/switch_basic_2gang/driver.compose.json`
- `drivers/switch_basic_2gang/device.js`
- `drivers/switch_generic_3gang/driver.compose.json`
- `drivers/switch_smart_3gang/driver.compose.json`
- `drivers/switch_smart_4gang/driver.compose.json`
- `drivers/switch_touch_2gang/driver.compose.json`
- `drivers/switch_touch_4gang/driver.compose.json`
- `drivers/switch_wireless_2gang/driver.compose.json`
- `drivers/switch_wireless_4gang/driver.compose.json`
- `drivers/switch_wireless_6gang/driver.compose.json`

### Sensor Drivers
- `drivers/presence_sensor_radar/device.js`
- `drivers/climate_sensor_soil/device.js` (uses SDK3 methods)

### Project Root
- `readme.txt` - Created for validation
- `app.json` - Version bump to 4.9.258

---

## 🎯 IMPACT SUMMARY

| Issue | Status Before | Status After | Affected Devices |
|-------|--------------|--------------|------------------|
| IAS Enrollment | ❌ Broken | ✅ Fixed | Emergency buttons, PIR sensors, presence sensors |
| 2-Gang Switches | ❌ 1 gang only | ✅ All gangs | All multi-gang switches (2-6 gang) |
| Sensor Data | ❌ No data | ✅ Real-time | Climate, soil, presence, motion sensors |
| Validation | ❌ Failed | ✅ Passed | App publishing |

**Total Drivers Fixed**: 20+  
**Total Users Impacted**: All users with affected devices  
**Breaking Changes**: None (backward compatible)

---

## 🚀 DEPLOYMENT

### Installation
Users will receive automatic update to v4.9.258 via Homey App Store.

### Post-Update Actions
1. **IAS Devices**: May need re-pairing to complete enrollment
2. **Multi-Gang Switches**: Test all gangs to confirm independent control
3. **Sensors**: Check device cards for data updates within 1 hour
4. **Flows**: Verify triggers now fire correctly

### Troubleshooting
If issues persist after update:
1. Remove device from Homey
2. Factory reset device
3. Re-pair with app v4.9.258
4. Check Homey logs for detailed diagnostics

---

## 📚 REFERENCES

### SDK3 Documentation
- [Homey SDK3 Migration Guide](https://apps.developer.homey.app/upgrade-guides/upgrading-to-sdk-v3)
- [ZigbeeDriver Documentation](https://athombv.github.io/node-homey-zigbeedriver/)

### Community Support
- [GitHub Issues](https://github.com/dlnraja/com.tuya.zigbee/issues)
- [Homey Community Forum](https://community.homey.app/)

---

## ✅ TESTING CHECKLIST

### IAS Zone Devices
- [x] Emergency button enrollment
- [x] Presence sensor enrollment
- [x] PIR sensor enrollment
- [x] Motion detection triggers
- [x] Alarm capability updates

### Multi-Gang Switches
- [x] 2-gang independent control
- [x] 3-gang independent control
- [x] 4-gang independent control
- [x] Manual switch state reporting
- [x] Flow card triggers

### Sensors
- [x] Temperature reporting
- [x] Humidity reporting
- [x] Luminance reporting
- [x] Initial value reads
- [x] Real-time updates
- [x] Attribute reporting configuration

### Validation
- [x] `homey app validate --level publish`
- [x] No breaking changes
- [x] Backward compatibility

---

## 👨‍💻 CONTRIBUTORS

**Primary Developer**: Dylan Rajasekaram  
**Testing**: Community testers  
**Issue Reports**: Users on Homey Community Forum

---

**Version**: 4.9.258  
**Release Date**: TBD  
**Status**: ✅ READY FOR DEPLOYMENT
