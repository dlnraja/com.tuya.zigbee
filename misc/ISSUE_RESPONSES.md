# Réponses aux Issues

## Issue #45 - PR Merged ✅
**Status:** DONE
**Action:** Merged - Added _TZE200_nv6nxo0c to curtain_motor

---

## Issue #44 - TS011F Smart Plug ✅
**Status:** RESOLVED  
**Manufacturer ID:** _TZ3210_fgwhjm9j  
**Driver:** plug_energy_monitor  
**Response:**

```
✅ Device Support Added!

Your TS011F smart plug with manufacturer ID `_TZ3210_fgwhjm9j` is now supported!

**Driver:** Plug Energy Monitor  
**Capabilities:**
- On/Off control
- Real-time power measurement (Watts)
- Total energy consumption (kWh)
- Voltage measurement
- Current measurement (Ampere)

**Next Steps:**
1. Update to the latest app version (v4.9.250+)
2. Remove and re-pair your device
3. It should now appear as "Plug Energy Monitor"

**Pairing Instructions:**
Press and hold the pairing button for 5 seconds until the LED flashes.

This will be included in the next release!
```

---

## Issue #38-42 - Old Publish Failures ❌
**Status:** TO CLOSE - Obsolete  
**Response:**

```
This issue is now obsolete. The app has been updated to v4.9.249 with:
- Improved CI/CD workflow
- Official Athom API publishing
- All validation issues resolved

Closing as resolved. If you encounter any new issues, please open a new ticket.
```

---

## Issue #37, #35, #32, #31, #30 - Device Requests 📋
**Status:** NEED INFO  
**Response Template:**

```
Thank you for the device request!

The model **[MODEL]** is already supported by the app. To add your specific device variant, I need:

**Required Information:**
1. **Manufacturer ID** - Find it in:
   - Homey Developer Tools → Your Device → "manufacturerName"
   - Or via diagnostic report

2. **Pairing diagnostic** - While pairing, run:
   ```
   homey app log
   ```
   And share the output here.

**Likely compatible drivers:**
- [List of drivers for this model]

Once you provide the manufacturer ID, I'll add it to the appropriate driver within 24 hours!

**Quick tip:** Take a photo of the device label - it often contains useful information!
```

---

## Issue #33 - Devices Not Working 🐛
**Status:** NEED MORE INFO  
**Devices:** TS0201 (temp/humidity), TS0210 (vibration)  
**Response:**

```
Thank you for reporting this issue with your TS0201 and TS0210 devices.

Based on the diagnostic data you provided:

**TS0201 (Temperature/Humidity):**
- Model: TS0201
- Manufacturer: _TZ3000_lqpt3mvr (for vibration sensor shown)
- This model IS supported by multiple drivers

**TS0210 (Vibration Sensor):**
- Manufacturer: _TZ3000_lqpt3mvr
- Zone Type: vibrationMovementSensor
- Status: notEnrolled

**Troubleshooting Steps:**

1. **Re-pair the devices:**
   - Remove both devices from Homey
   - Reset devices (hold button 5+ seconds)
   - Pair again within 1 meter of Homey

2. **Check driver selection:**
   - TS0201: Should use `temperature_humidity_sensor` driver
   - TS0210: Should use `vibration_sensor` or `motion_sensor_vibration` driver

3. **Verify manufacturer IDs:**
   - Check if your exact manufacturer IDs are in the drivers
   - I can add them if missing

**Can you provide:**
1. Full diagnostic for BOTH devices (fresh pairing)
2. Screenshot of device settings in Homey
3. Any error messages from app log during pairing

I'll investigate and fix any driver issues!
```

---

## Issue #24 - Settings Issues 🔧
**Status:** NEED REPRODUCTION  
**Response:**

```
Thank you for reporting settings issues.

To help diagnose this, I need:

1. **Which device** is showing settings issues?
2. **What happens** when you try to change settings?
3. **Error messages** (if any)
4. **App version** you're using
5. **Steps to reproduce**

Recent updates (v4.9.x) have improved settings handling. Please update to the latest version and let me know if the issue persists.

If still occurring, I'll investigate immediately!
```

---

## Issue #4 - Old Bug 🕰️
**Status:** CHECK IF RESOLVED  
**Response:**

```
This issue was opened 3 months ago. The app has had major updates since then (now v4.9.249).

**Can you confirm:**
1. Are you still experiencing this issue?
2. Have you updated to the latest version?
3. If yes, please provide fresh diagnostic

If no longer relevant, I'll close this issue. Otherwise, I'll investigate with current codebase.
```

---

## General Device Request Response Template 📱

```
✅ Device Request Received

**Model:** [MODEL]
**Current Status:** Checking compatibility...

**To expedite support:**

1. **Provide Manufacturer ID:**
   - Method 1: Homey Developer Tools
   - Method 2: Diagnostic report
   - Method 3: Photo of device label

2. **Pairing Diagnostic:**
   ```bash
   # While pairing, run:
   homey app log
   ```

3. **Device Information:**
   - Where did you purchase it?
   - Any special features?
   - Link to product page (if available)

**Expected Timeline:**
- With manufacturer ID: Added within 24-48 hours
- Without manufacturer ID: Need info first

I'll update this issue as soon as I have the information needed!

---

**💡 Pro Tip:** Most Tuya Zigbee devices work immediately if the manufacturer ID is in our database. We support 18,000+ variants!
```
