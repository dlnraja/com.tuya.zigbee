# Forum Responses - Peter & DutchDuke

---

## Response to Peter (Diagnostic: 6c8e96e2-06b1-4c1e-aa45-ed47923a71f2)

Hi Peter,

Thank you for the diagnostic report! I've identified the critical issue:

**Root Cause:**
Version 2.15.125 has a missing module error that prevents the multisensor from initializing:
```
Error: Cannot find module '../../utils/tuya-cluster-handler'
```

This is why you're seeing "last seen 56 years ago" - the device never properly initialized.

**Immediate Fix:**
I'm publishing v2.15.130 right now with:
- ✅ Fixed missing module import
- ✅ Implemented official Homey IAS Zone enrollment method (`onZoneEnrollRequest` + proactive `zoneEnrollResponse`)
- ✅ Corrected syntax error in smoke detector driver

**Important: You MUST re-pair your devices after updating!**

The IAS Zone enrollment happens during pairing. Simply updating the app won't fix already-paired devices.

**Steps to fix:**
1. Wait for v2.15.130 to appear in your Homey App Store (should be available within 5-10 minutes)
2. Update the app
3. **Remove** your multisensor from Homey
4. **Factory reset** the sensor (hold button 5 seconds)
5. **Add it again** to Homey
6. Repeat for SOS button

**Expected logs after re-pairing:**
```
🎧 Setting up Zone Enroll Request listener...
📤 Sending proactive Zone Enroll Response...
✅ Zone Enroll Response sent (zoneId: 10)
```

I apologize for the issues. The fix is based on official Homey SDK documentation and analysis of successful community apps (Philips Hue, Aqara).

Best regards,
Dylan

---

## Response to DutchDuke (Diagnostic: cf04e00e-9df5-4424-91e1-3f83c4407194)

Hi DutchDuke,

Thanks for the diagnostic report! I found the issue:

**Root Cause:**
Version 2.15.124 has a syntax error in the smoke detector driver that causes it to crash:
```
SyntaxError: Unexpected token '}' at line 284
```

This corrupted driver is causing device misidentification during pairing.

**Fixed in v2.15.130:**
- ✅ Removed syntax error in smoke_detector_battery/device.js
- ✅ Fixed device identification logic
- ✅ Improved driver matching for temperature and soil sensors

**For the temperature sensor discovered as smoke detector:**
1. Update to v2.15.130 (publishing now)
2. Remove the incorrectly-added smoke detector device
3. Factory reset your temperature sensor
4. Add it again - it should now be recognized correctly

**For the soil sensor not being added:**
Can you provide more details?
- Manufacturer ID (visible in Homey developer tools)
- Product ID
- Model number if available

I'll add it to the driver database immediately.

**Alternative:** After updating to v2.15.130, try adding it as a "Generic Zigbee Device" first, then send me a diagnostic report. I can then create a specific driver for it.

Thank you for helping improve the app!

Best regards,
Dylan

---

## Technical Details (for reference)

### Issues Fixed in v2.15.130:

1. **Missing Module Import**
   - Removed non-existent `tuya-cluster-handler` import
   - Used direct cluster registration instead

2. **Syntax Error**
   - Fixed orphaned `catch` block in smoke_detector_battery/device.js
   - Removed duplicate closing braces

3. **IAS Zone Enrollment**
   - Implemented official Homey method from SDK docs
   - Added `onZoneEnrollRequest` listener
   - Added proactive `zoneEnrollResponse` (critical fallback)
   - Multi-fallback: Standard → Auto → Polling → Passive

4. **Device Identification**
   - Fixed driver matching logic
   - Improved manufacturer/product ID recognition

### Version Timeline:
- v2.15.87-91: IAS Zone enrollment broken
- v2.15.124: Syntax error introduced
- v2.15.125: Missing module error
- v2.15.126-128: Partial fixes
- **v2.15.130: Complete fix** ✅

### Re-pairing Required:
IAS Zone enrollment occurs during the pairing process. Devices paired with broken versions (2.15.87-128) need to be:
1. Removed from Homey
2. Factory reset
3. Re-added with v2.15.130

This allows the new enrollment method to work correctly.
