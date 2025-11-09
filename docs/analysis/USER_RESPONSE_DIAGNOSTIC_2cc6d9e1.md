# Response to User Diagnostic Report - Log ID: 2cc6d9e1-4b28-478b-b9e0-75b6e9f36950

**To:** User (diagnostic reporter)  
**Subject:** Re: Universal Tuya Zigbee Diagnostic Report - Fixed in v4.9.321  
**Date:** 2025-01-09

---

## Hi! Thank you for your diagnostic report!

I've analyzed your logs and **excellent news** - both critical errors you're experiencing are **already fixed** in the upcoming version **v4.9.321** (currently in test channel).

---

### **Your Errors (v4.9.320):**

#### **1. Zigbee Configuration Error**
```
Error: configuring attribute reporting (endpoint: 1, cluster: onOff)
Error: Zigbee est en cours de démarrage. Patientez une minute et réessayez.
```

**Cause:** The app tries to configure Zigbee reporting immediately at startup, but the Zigbee stack isn't ready yet.

**Fixed in v4.9.321:** 
- New `zigbee-retry.js` utility with exponential backoff retry (6 attempts)
- Automatically retries configuration after Zigbee stack is ready
- No more manual intervention required!

---

#### **2. Energy-KPI Crash (7 occurrences)**
```
[ENERGY-KPI] Failed to get KPI: Cannot read properties of undefined (reading 'get')
```

**Cause:** SDK3 incompatibility - using deprecated `Homey.ManagerSettings` API.

**Fixed in v4.9.321:**
- Migrated to SDK3-compliant `homey.settings` API
- Added guards to prevent crash if settings unavailable
- Graceful fallback instead of error spam

---

### **Additional Fixes in v4.9.321 for Your Devices:**

Your soil sensor (`climate_sensor_soil - 535e758f`) will particularly benefit from:

✅ **Tuya DP5 Soil Moisture Parsing**
- Direct parsing of Tuya datapoint protocol (cluster 0xEF00)
- Automatic capability creation for missing capabilities
- Listeners for real-time data updates

✅ **Enhanced Battery Reading**
- 4 fallback methods for battery data
- Tuya DP protocol support (DP4, DP14, DP15)
- Voltage-to-percentage heuristic

---

### **What You Should Do:**

#### **Option 1: Update to v4.9.321 (Recommended)**
1. Go to Homey Settings → Apps → Universal Tuya Zigbee
2. Check for updates (v4.9.321 should appear in test channel)
3. Install update
4. **No need to re-pair devices!**
5. Observe logs for 24-48h

**Expected Results:**
- No more "Zigbee est en cours de démarrage" errors
- No more "[ENERGY-KPI] Failed to get KPI" spam
- Soil sensor moisture data should appear
- Battery data for all devices

---

#### **Option 2: Wait for Live Channel Release**
If you prefer stable releases, v4.9.321 will be promoted to Live channel after:
- 24-48h of monitoring in test channel
- Confirmation from other beta testers
- No critical regressions detected

**ETA:** Approximately 2-4 days from now

---

### **Monitoring Your Devices After Update:**

After updating to v4.9.321, please check:

1. **Soil Sensor (535e758f):**
   - Should show moisture data (measure_humidity capability)
   - Should show temperature (measure_temperature)
   - Check after 5-10 minutes (data may take time to arrive)

2. **All Battery Devices:**
   - Battery percentage should appear in device cards
   - Check logs for `[BATTERY-READER] ✅ Battery from...`

3. **Switch (30d57211):**
   - Should configure reporting without errors
   - Check logs for `configureReporting success` instead of errors

---

### **How to Verify Fix:**

In Homey logs, you should see:

**Before (v4.9.320):**
```
❌ Error: Zigbee est en cours de démarrage...
❌ [ENERGY-KPI] Failed to get KPI: Cannot read properties...
```

**After (v4.9.321):**
```
✅ [ZIGBEE-RETRY] Attempt 1/6 failed... Retrying in 2000ms
✅ [ZIGBEE] configureReporting success for onOff
✅ [ENERGY-KPI] Sample pushed for device...
✅ [TUYA] 📦 dataReport received!
✅ [TUYA] DP 5 = 45 (soil moisture!)
```

---

### **Need Help?**

If after updating to v4.9.321 you still experience issues:

1. Send new diagnostic report with v4.9.321 logs
2. Include specific devices still having problems
3. Mention if you tried re-pairing the device

I'll investigate immediately!

---

### **Thank You!**

Your diagnostic report was **extremely valuable** - it confirms that our fixes in v4.9.321 target exactly the real-world issues users are experiencing.

Please don't hesitate to send another report after updating if anything doesn't work as expected.

Best regards,  
Dylan Rajasekaram  
Universal Tuya Zigbee Developer

---

## Technical Details (for reference):

**Commits fixing your issues:**
- `b63f68e332` - Energy-KPI SDK3 fix
- `74f9206501` - Safe guards + migration queue
- `e730b398ce` - Utilities (zigbee-retry, battery-reader)
- `951950b6be` - Final SDK3 compliance (log-buffer)

**Files created/modified:**
- `lib/utils/energy-kpi.js` - SDK3 guards added
- `lib/utils/zigbee-retry.js` - NEW: Retry mechanism
- `lib/utils/battery-reader.js` - NEW: 4 fallback methods
- `lib/tuya/TuyaEF00Manager.js` - DP5 soil moisture parsing
- `lib/utils/log-buffer.js` - SDK3 compliance

**Changelog:**
See `.homeychangelog.json` in app for full French/English changelog.
