# Response to User Diagnostic Report 5b66b6ed

**User:** Ian_gibbo  
**Date:** 2025-10-12 19:24  
**Log ID:** 5b66b6ed-c26d-41e1-ab3d-be2cb11f695c  
**App Version:** v2.15.20  
**Issues Reported:**
1. Icons shown as little squares with no symbols
2. HOBEIAN sensor motion not working (passing several times, no response)
3. SOS button doesn't respond at all

---

## Analysis of Diagnostic Logs

### ✅ What's Working:
- **Illuminance sensor:** Reports every minute (660→606→555... lux) ✅
- **Temperature sensor:** Reporting (15.1°C) ✅
- **Humidity sensor:** Reporting (80-81.3%) ✅
- **Battery:** Reading correctly (100%) ✅

### ❌ What's NOT Working:
- **Motion detection:** No IAS Zone enrollment visible in logs ❌
- **SOS Button:** No IAS Zone setup, just battery reading ❌
- **Icons:** User reports square icons (image issue) ❌

### Root Cause:
The user is running **v2.15.20**, but the critical fixes for motion detection and SOS button are in **v2.15.33** which is not yet published to the Homey App Store.

---

## Solution

### Dear Ian_gibbo,

Thank you for submitting the diagnostic reports! I can see exactly what's happening with your devices.

**Good news:** Your HOBEIAN sensor's temperature, humidity, and illuminance are working perfectly. The bad news is that motion detection and SOS button require a **critical update that's ready but not yet published**.

### What's Fixed in v2.15.33 (Coming Soon):

#### 1. **Motion Detection for HOBEIAN Sensors**
- ✅ Complete IAS Zone enrollment with CIE address write
- ✅ Retry logic for initialization (3 attempts)
- ✅ Support for multiple zone status formats
- ✅ Auto-reset motion after configurable timeout

#### 2. **SOS Button Event Triggering**
- ✅ Proper IAS Zone enrollment
- ✅ Notification listeners for button press
- ✅ Flow card triggering
- ✅ Auto-reset after 5 seconds

#### 3. **Enhanced Logging**
- ✅ Detailed troubleshooting information
- ✅ Emoji indicators for easy debugging
- ✅ Comprehensive error handling

### What You Need to Do:

**OPTION 1: Wait for Official Update (Recommended)**
- Wait for **v2.15.33** to be published on Homey App Store
- Update the app when available
- **CRITICAL:** Remove and re-pair both devices after updating
  - This is necessary for IAS Zone enrollment

**OPTION 2: Install Test Version Now**
1. Go to: https://homey.app/a/com.dlnraja.tuya.zigbee/test/
2. Install the test version (v2.15.33)
3. Remove your HOBEIAN sensor from Homey
4. Remove your SOS button from Homey
5. Re-pair both devices
6. Test motion detection and button press

### Why Re-Pairing is Required:

IAS Zone devices (motion sensors, buttons) need to be **enrolled** with Homey during pairing. The old version (v2.15.20) didn't do this correctly, so simply updating the app won't fix existing devices - they must be re-paired.

### After Update & Re-Pairing, You Should See:

**In Logs:**
```
✅ IAS CIE address written (attempt 1)
✅ IAS Zone reporting configured (attempt 1)
✅ Motion IAS Zone registered with notification listener
🚶 MOTION DETECTED! Notification: {...}
Motion state: DETECTED ✅
```

**For SOS Button:**
```
✅ IAS CIE address written (attempt 1)
✅ IAS Zone reporting configured (attempt 1)
🚨 SOS BUTTON PRESSED! Notification: {...}
✅ SOS alarm triggered!
```

### Icon Issue:

The square icons issue will also be resolved in v2.15.33 with proper image generation for all drivers.

---

## Testing After Update

1. **Motion Sensor Test:**
   - Walk in front of sensor
   - Check Homey logs for "🚶 MOTION DETECTED!"
   - Verify motion capability changes to "true"
   - Test in a flow to ensure automation works

2. **SOS Button Test:**
   - Press the button
   - Check logs for "🚨 SOS BUTTON PRESSED!"
   - Verify alarm capability triggers
   - Test flow automation

3. **Monitor Logs:**
   - Enable debug logging in app settings
   - Watch for the ✅ success indicators
   - If issues persist, submit new diagnostic report

---

## Expected Timeline

**v2.15.33** should be available on the Homey App Store within **24-48 hours**. 

If you're comfortable with test versions, you can install it now from the test channel. Otherwise, please wait for the official release and then update + re-pair your devices.

**I'll reply to your email once v2.15.33 is published!**

---

## Technical Details

For reference, here's what was changed:

### Files Modified:
- `utils/tuya-cluster-handler.js` - Scan all endpoints, not just endpoint 1
- `drivers/motion_temp_humidity_illumination_multi_battery/device.js` - IAS Zone with retry
- `drivers/sos_emergency_button_cr2032/device.js` - IAS Zone enrollment
- `drivers/pir_radar_illumination_sensor_battery/device.js` - Enhanced enrollment

### Documentation:
- `docs/DEVICE_DATA_RECEPTION_FIXES_v2.15.32.md` - Complete technical guide

---

**Thank you for your patience and for submitting detailed diagnostic reports! This helps improve the app for everyone.**

Best regards,  
Dylan Rajasekaram  
Universal Tuya Zigbee App Developer
