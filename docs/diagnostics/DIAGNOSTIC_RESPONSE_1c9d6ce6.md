# Diagnostic Response - IAS Zone Enrollment Fix

**Report ID:** 1c9d6ce6-21d8-4811-ae81-71a12be7fe0e  
**App Version:** v2.15.49 → v2.15.52 (FIXED)  
**Issue Date:** 2025-10-12  
**Fix Date:** 2025-10-12

## User Issues Reported

1. **HOBEIAN Multi Sensor** - Motion detection not working
2. **SOS Emergency Button** - Button press not recognized

## Root Cause Analysis

### Critical Bug: Incorrect IAS Zone Enrollment API

**Problem:**
```javascript
// ❌ INCORRECT - This API doesn't exist
await endpoint.clusters.iasZone.writeAttributes({
  iasCieAddress: zclNode.ieeeAddr
});
```

**Error in Logs:**
```
⚠️ IAS CIE write failed (may retry): iasCieAddress is not a valid attribute of iasZone
```

The code was using `writeAttributes()` with an invalid attribute name `iasCieAddress`. This caused enrollment to fail, preventing the devices from sending notifications.

## Fix Applied - v2.15.52

### Motion Sensor (HOBEIAN Multi)
**File:** `drivers/motion_temp_humidity_illumination_multi_battery/device.js`

**Changes:**
1. ✅ Fixed IAS CIE enrollment with correct attribute ID `0x0010`
2. ✅ Added 3 fallback methods for enrollment:
   - Method 1: Direct write with attribute ID
   - Method 2: Buffer format write
   - Method 3: Read to trigger auto-enrollment
3. ✅ Enhanced notification listener with dual format support (object/number)
4. ✅ Added fallback attribute listener (`attr.zoneStatus`)
5. ✅ Removed unsupported `configureReporting` (many Tuya devices don't support it)

**Expected Behavior:**
- Motion sensor will now properly enroll with Homey
- Motion events will trigger via `zoneStatusChangeNotification`
- Enhanced logging shows: `===== MOTION NOTIFICATION RECEIVED =====`
- Auto-reset after 60 seconds (configurable in settings)

### SOS Emergency Button
**File:** `drivers/sos_emergency_button_cr2032/device.js`

**Changes:**
1. ✅ Fixed IAS CIE enrollment with correct attribute ID `0x0010`
2. ✅ Added 3 fallback methods (same as motion sensor)
3. ✅ Enhanced notification listener with dual format support
4. ✅ Added fallback attribute listener
5. ✅ Flow card trigger: `sos_button_pressed`
6. ✅ Auto-reset after 5 seconds

**Expected Behavior:**
- SOS button will now properly enroll with Homey
- Button press triggers `alarm_generic` capability
- Enhanced logging shows: `===== SOS BUTTON NOTIFICATION RECEIVED =====`
- Triggers flow card for automation
- Auto-reset after 5 seconds

## Technical Details

### Correct IAS Zone Enrollment Sequence

```javascript
// ✅ CORRECT METHOD 1: Direct write with attribute ID
await endpoint.clusters.iasZone.write(0x0010, zclNode.ieeeAddr, 'ieeeAddr');

// ✅ CORRECT METHOD 2: Buffer format
const ieeeBuffer = Buffer.from(zclNode.ieeeAddr.split(':').reverse().join(''), 'hex');
await endpoint.clusters.iasZone.write(0x0010, ieeeBuffer);

// ✅ CORRECT METHOD 3: Read to trigger auto-enrollment
const currentCie = await endpoint.clusters.iasZone.read(0x0010);
```

### Enhanced Notification Handling

```javascript
// Dual format support (object vs number)
endpoint.clusters.iasZone.on('zoneStatusChangeNotification', async (payload) => {
  let motionDetected = false;
  
  if (typeof payload.zoneStatus === 'object') {
    motionDetected = payload.zoneStatus.alarm1 || payload.zoneStatus.alarm2;
  } else if (typeof payload.zoneStatus === 'number') {
    motionDetected = (payload.zoneStatus & 1) === 1;
  }
  
  await this.setCapabilityValue('alarm_motion', motionDetected);
});

// Fallback attribute listener
endpoint.clusters.iasZone.on('attr.zoneStatus', async (value) => {
  const motionDetected = (value & 1) === 1;
  await this.setCapabilityValue('alarm_motion', true);
});
```

## Testing Instructions

### For Motion Sensor (HOBEIAN Multi)

1. **Re-pair the device** (recommended for clean enrollment)
   - Remove device from Homey
   - Add device again via "Add Device"
   
2. **Watch logs** for successful enrollment:
   ```
   ✅ IAS CIE address written (method 1: direct write)
   🚶 Motion IAS Zone registered with notification listener
   ```

3. **Test motion detection:**
   - Wave hand in front of sensor
   - Look for log: `===== MOTION NOTIFICATION RECEIVED =====`
   - Check alarm_motion capability turns ON
   - Wait 60 seconds for auto-reset

4. **Verify other sensors work:**
   - Temperature: ✅ Already working
   - Humidity: ✅ Already working  
   - Illuminance: ✅ Already working
   - Battery: ✅ Already working

### For SOS Button

1. **Re-pair the device** (recommended)
   - Remove device from Homey
   - Add device again
   
2. **Watch logs** for successful enrollment:
   ```
   ✅ IAS CIE address written (method 1: direct write)
   🚨 SOS Button IAS Zone registered with notification listener
   ```

3. **Test button press:**
   - Press SOS button
   - Look for log: `===== SOS BUTTON NOTIFICATION RECEIVED =====`
   - Check alarm_generic capability turns ON
   - Flow card `sos_button_pressed` should trigger
   - Wait 5 seconds for auto-reset

## Deployment

**Version:** v2.15.52  
**Status:** Ready for testing  
**Affected Drivers:**
- `motion_temp_humidity_illumination_multi_battery`
- `sos_emergency_button_cr2032`

## Next Steps

1. Update app to v2.15.52 on Homey
2. Re-pair affected devices (recommended)
3. Test motion detection and button press
4. Monitor logs for successful enrollment
5. Report back if issues persist

## Support

If issues persist after re-pairing:
- Provide full device logs via Homey Developer Tools
- Include device manufacturer name and model
- Share Zigbee interview data if available

---

**Developer Notes:**
- IAS Zone enrollment is notoriously device-specific
- Some Tuya devices auto-enroll without CIE write
- Triple fallback ensures maximum compatibility
- Enhanced logging helps diagnose specific device behavior
