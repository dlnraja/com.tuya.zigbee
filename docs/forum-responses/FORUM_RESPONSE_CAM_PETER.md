# Forum Response - Cam & Peter Issues

**Date:** 2025-10-13 02:56  
**Users:** Cam (motion sensor pairing issue) & Peter (IAS Zone not working)

---

## 📝 RESPONSE TO CAM

### Hi Cam!

Thanks for trying the update and for the valuable UX feedback. You're absolutely right about the naming - technical driver names are confusing for users.

### For Your HOBEIAN Motion Sensor with Lux:

**The correct driver is:**
```
Motion Temp Humidity Illumination Multi Battery
```

I know it's a terrible name! Here's an easier way to find it:

**Search for:** "Illumination" or "Multi"  
**Look for:** The one that shows capabilities: Motion + Lux + Battery + Temp + Humidity

### Device Details:

- **Your device:** HOBEIAN ZG-204ZL (PIR sensor with light sensor)
- **AliExpress:** Item 1005006918768626
- **Driver:** motion_temp_humidity_illumination_multi_battery

### What it will show in Homey:

- ✅ Motion detection (alarm_motion)
- ✅ Light level/Lux (measure_luminance) ← Key feature
- ✅ Battery percentage
- ✅ Temperature (may or may not work depending on exact model)
- ✅ Humidity (may or may not work depending on exact model)

### Why it didn't work before:

Your exact variant (ZG-204**L**) was missing from the productId list. I added it in v2.15.54.

### Steps to try again:

1. **Update to v2.15.54** (latest)
2. Remove device if already paired
3. Add new device
4. Search: "Multi" or scroll to "Motion Temp Humidity Illumination Multi Battery"
5. Follow pairing instructions

### UX Improvement Coming:

I totally agree with your feedback. I'm working on:
- ✅ Better driver names (e.g., "Multi-Sensor (Motion + Lux + Temp)")
- ✅ More descriptive images
- ✅ Clear device examples in descriptions

This is exactly the kind of feedback I need to make the app user-friendly!

---

## 📝 RESPONSE TO PETER

### Hi Peter!

I see the issue - you tested **v2.15.49**, but the IAS Zone fix for your diagnostic report (`1c9d6ce6`) was released in **v2.15.52**.

### Version Timeline:

| Version | Date | Your Issue |
|---------|------|------------|
| **v2.15.49** | Oct 12 | ❌ No fix yet |
| **v2.15.52** | Oct 13 00:10 | ✅ **IAS Zone fix** |
| **v2.15.54** | Oct 13 00:25 | ✅ Additional improvements |

### What Changed in v2.15.52:

**Your Diagnostic:** `1c9d6ce6-21d8-4811-ae81-71a12be7fe0e`

**Problem Identified:**
- Motion sensor not detecting movement
- SOS button not triggering

**Root Cause:**
```javascript
// WRONG (was in v2.15.49)
writeAttributes({ iasCieAddress: zclNode.ieeeAddr })  // API doesn't exist!

// CORRECT (in v2.15.52+)
endpoint.clusters.iasZone.write(0x0010, zclNode.ieeeAddr, 'ieeeAddr')
```

### Files Fixed:

1. `drivers/motion_temp_humidity_illumination_multi_battery/device.js`
2. `drivers/sos_emergency_button_cr2032/device.js`

**Changes:**
- ✅ Fixed IAS CIE enrollment (3 fallback methods)
- ✅ Enhanced notification listeners (object + number formats)
- ✅ Added fallback attr.zoneStatus listener
- ✅ Removed unsupported configureReporting

### Please Try Again:

1. **Update to v2.15.54** (latest version)
2. **Remove your devices** from Homey
3. **Re-pair them** (this is critical - old devices won't re-enroll)
4. **Test motion detection** by walking in front of sensor
5. **Test SOS button** by pressing it

### Expected Behavior:

**HOBEIAN Motion Sensor:**
- Walk in front → Motion alarm triggers within 1-2 seconds
- Homey app shows "Motion detected"
- Flow cards can be triggered

**SOS Button:**
- Press button → Alarm triggers immediately
- Auto-resets after 5 seconds
- Flow card "SOS Button Pressed" triggers

### If Still Not Working:

Please generate a **new diagnostic report** after:
- Installing v2.15.54
- Re-pairing the device
- Testing motion/button

This will show me if the enrollment succeeded.

### Technical Details (for reference):

The fix uses the correct Zigbee attribute:
- Attribute: `0x0010` (iasCieAddress)
- Method: Direct write with 3 fallback strategies
- Notification: Both `zoneStatusChangeNotification` and `attr.zoneStatus`

---

## 🎯 SUMMARY

### For Cam:
- ✅ Your device (HOBEIAN ZG-204ZL) is now supported in v2.15.54
- ✅ Use driver: "Motion Temp Humidity Illumination Multi Battery"
- 🔄 UX improvements coming (better names, clearer descriptions)

### For Peter:
- ❌ v2.15.49 doesn't have the fix
- ✅ v2.15.52+ has the IAS Zone fix
- ⚠️ Must update to v2.15.54 and **re-pair devices**

---

## 📊 WHAT I'M WORKING ON

### Immediate (Today):

1. **Better Driver Names** (UX improvement)
   ```
   BEFORE: Motion Temp Humidity Illumination Multi Battery
   AFTER:  Multi-Sensor (Motion + Lux + Temp/Humidity)
   ```

2. **Clearer Descriptions**
   - Add device examples (HOBEIAN ZG-204ZL, etc.)
   - Show capabilities clearly
   - Add images of actual products

3. **Pairing Guidance**
   - Step-by-step instructions
   - LED indicators to watch
   - Troubleshooting tips

### Medium Term:

1. **Driver Reorganization**
   - Group by capability (Motion sensors, Multi-sensors, etc.)
   - Fewer, more generic drivers
   - Better device matching

2. **Auto-Detection**
   - Show "Suggested driver" based on interview data
   - Highlight compatible drivers

---

**Please let me know if v2.15.54 works for you!**

Best regards,  
Dylan
