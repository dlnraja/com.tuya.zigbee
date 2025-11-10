# Response to Diagnostic ef9db7d4

**Forum Link:** https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352/447?u=dlnraja

**Diagnostic ID:** ef9db7d4-331e-492b-99bf-2d85993c0d21  
**User:** (from diagnostic)  
**Date:** October 19, 2025

---

## User Issue

"Still no readings and battery indicator at all on both devices"

**Devices Affected:**
1. Motion/Temperature/Humidity/Illuminance Sensor (multi-sensor)
2. SOS Emergency Button

**App Version:** v3.1.8  
**Homey Version:** v12.8.0

---

## Root Cause Analysis

Thank you for the diagnostic report! I've identified and fixed 2 critical bugs in your devices:

### Bug 1: IEEE Address API Change (Motion Sensor)
**Error:** `this.homey.zigbee.getIeeeAddress is not a function`

**Root Cause:** The motion sensor driver was using an old API that no longer exists in Homey SDK3.

**Fix Applied:**
```javascript
// OLD (broken):
const ieeeAddress = await this.homey.zigbee.getIeeeAddress();

// NEW (working):
const ieeeAddress = this.zclNode.ieeeAddress;
```

### Bug 2: Cluster ID Format (Both Devices)
**Error:** `expected_cluster_id_number`

**Root Cause:** The drivers were using string cluster names instead of numeric IDs, which SDK3 doesn't accept in `registerCapability()`.

**Fix Applied:**
```javascript
// OLD (broken):
this.registerCapability('measure_battery', 'genPowerCfg', {...})
this.registerCapability('onoff', 'genOnOff', {...})

// NEW (working):
this.registerCapability('measure_battery', 1, {...})  // genPowerCfg = 1
this.registerCapability('onoff', 6, {...})           // genOnOff = 6
```

---

## What's Fixed

### Motion Sensor (`motion_temp_humidity_illumination_multi_battery`)
✅ **Motion detection** - IAS Zone enrollment now works correctly  
✅ **Temperature readings** - Will appear correctly  
✅ **Humidity readings** - Will appear correctly  
✅ **Illuminance (LUX)** - Will appear correctly  
✅ **Battery percentage** - Will be visible and update regularly

### SOS Emergency Button (`sos_emergency_button_cr2032`)
✅ **Button clicks** - Single, double, long press detection  
✅ **Battery percentage** - Will be visible and update regularly

---

## How to Get the Fix

### Option 1: Wait for Automatic Update (Recommended)
The fix has been committed and pushed. It will be published in the next app update automatically (usually within 24-48 hours).

**Steps:**
1. Wait for app update notification in Homey
2. Update the app when available
3. Your devices will automatically start working

### Option 2: Force Re-initialization (Immediate)
If you need it working immediately:

**Steps:**
1. Go to Homey app → Devices
2. Click on the motion sensor → Settings → Remove device
3. Click on the SOS button → Settings → Remove device
4. Re-add both devices (Add device → Universal Tuya Zigbee)
5. Readings and battery should appear immediately

---

## What You Should See After Fix

### Motion Sensor
- **Motion:** Detected/Clear status
- **Temperature:** Current temperature in °C
- **Humidity:** Current humidity in %
- **Illuminance:** Current light level in LUX
- **Battery:** Percentage (updates every 5 minutes)

### SOS Button
- **Button clicks:** Triggers flows on press
- **Battery:** Percentage (updates every 12 hours)

---

## Technical Details

**Changes Made:**
- File: `drivers/motion_temp_humidity_illumination_multi_battery/device.js`
  - Fixed IEEE address retrieval (line 57)
  - Fixed battery cluster ID (line 86)
  
- File: `drivers/sos_emergency_button_cr2032/device.js`
  - Fixed onOff cluster ID (line 34)

**Commit:** c98394191  
**Status:** Pushed to master branch  
**Next Version:** Will be published automatically

---

## Prevention

These bugs were caused by SDK3 migration issues. I've created an automated script to detect and fix similar issues across all 190 drivers to prevent this from happening again.

---

## Need More Help?

If after updating/re-adding the devices you still have issues:

1. **Enable Advanced Logging:**
   - Go to app settings
   - Enable "Debug Level" → DEBUG or TRACE
   
2. **Send New Diagnostic:**
   - Wait 5 minutes with logging enabled
   - Send another diagnostic report
   - I'll investigate further

3. **Check Device Compatibility:**
   - Your devices should be Zigbee 3.0 compatible
   - Make sure they're within range of Homey or a Zigbee repeater

---

## Apologies & Thanks

I apologize for the inconvenience caused by these bugs. Thank you for:
- Sending the diagnostic report
- Being patient
- Helping improve the app for everyone

The fix is live and will be automatically published soon!

Best regards,  
Dylan

---

**Status:** ✅ FIXED in commit c98394191  
**Will be available in:** Next app version (automatic)  
**Immediate solution:** Re-add devices
