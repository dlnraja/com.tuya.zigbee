# 🔍 RÉPONSE DIAGNOSTIC ugrbnk - No Tuya Cluster Found

**Date:** 16 Octobre 2025, 21:20  
**Diagnostic ID:** cbfd89ec-692d-4cc9-b555-18114cf6d31a  
**Device:** Gas Sensor TS0601 (_TZE204_yojqa8xn)  
**App Version:** v3.0.23  
**Issue:** Tuya cluster 0xEF00 not found

---

## 📧 RÉPONSE FORUM / EMAIL

**Sujet:** RE: Gas Sensor Diagnostic - Tuya Cluster Not Detected

---

Hi @ugrbnk,

Thank you for submitting the diagnostic report (ID: cbfd89ec-692d-4cc9-b555-18114cf6d31a).

I've analyzed the logs and identified the root cause of your issue.

## 🔴 PROBLEM IDENTIFIED

The critical issue is in these log lines:

```
[TuyaCluster] Initializing for type: GAS_DETECTOR
[TuyaCluster] No Tuya cluster found on any endpoint
No Tuya cluster found, using standard Zigbee
```

**What this means:**
- Your gas sensor is paired to Homey ✅
- The Tuya cluster handler is trying to initialize ✅
- But the **Tuya cluster 0xEF00 (61184) is NOT found** ❌

## 🎯 ROOT CAUSE

This happens when:

1. **Device was paired BEFORE v3.0.17 update** (most likely)
   - Old pairing doesn't expose Tuya cluster correctly
   - Handler can't find cluster to attach listeners
   
2. **Device not fully reset before pairing**
   - Previous pairing data still in sensor
   - Not in proper discovery mode
   
3. **Zigbee endpoint configuration issue**
   - Cluster present but on unexpected endpoint
   - Handler scanning wrong endpoints

## ✅ SOLUTION: COMPLETE RE-PAIRING

You MUST re-pair the device for the Tuya cluster to be detected properly.

### Step 1: Remove Device from Homey

1. Go to your Gas Sensor device page
2. Settings (⚙️) → **Advanced Settings**
3. Scroll to bottom → **Remove Device**
4. Confirm removal

### Step 2: Factory Reset the Sensor (CRITICAL!)

**This is the most important step:**

1. **Disconnect power** from sensor (unplug)
2. **Wait 30 seconds** (let capacitors discharge)
3. **Reconnect power**
4. **Press and hold reset button for 10 seconds**
   - Usually small button on back or inside battery compartment
5. **LED should blink rapidly** (2-3 times per second)
   - This means sensor is in pairing mode
   - If LED blinks slowly, reset didn't work - try again

**Alternative reset (if button doesn't work):**
1. Unplug sensor
2. Wait 1 minute
3. Plug back in while holding reset button
4. Keep holding for 10 seconds after power on

### Step 3: Add Device to Homey

1. Open Homey app
2. **Add Device** (+)
3. Select **Universal Tuya Zigbee**
4. Search: **"Gas Sensor TS0601 (AC)"**
5. Select the driver with AC in name
6. **Keep sensor VERY close to Homey** (< 30cm / 1 foot)
7. Wait 30-60 seconds for detection

**IMPORTANT:** The sensor MUST be in pairing mode (LED blinking rapidly) during this step!

### Step 4: Verify Tuya Cluster Detection

After pairing, check Homey logs to confirm cluster is found:

1. Go to: https://developer.homey.app
2. Login and select your Homey
3. **System → Logs**
4. Look for these messages (should appear within 1 minute):

**✅ GOOD (what you SHOULD see):**
```
[TuyaCluster] Initializing for type: GAS_DETECTOR
[TuyaCluster] ✅ Found on endpoint 1
[TuyaCluster] ✅ Tuya cluster found on endpoint 1
[TuyaCluster] ✅ Reporting configured
[TuyaCluster] Reading initial data (attempt 1/5)...
[TuyaCluster] ✅ Initial data received: {"1":false,"13":false}
```

**❌ BAD (what you're seeing now):**
```
[TuyaCluster] No Tuya cluster found on any endpoint
```

If you see the GOOD messages, the sensor is properly configured!

### Step 5: Test Functionality

1. Make smoke near sensor (use safe method: incense stick, steam from kettle)
2. Physical alarm should sound ✅
3. **Check Homey device tile:**
   - Should show "ALARM: Smoke detected!"
   - alarm_smoke capability should be TRUE
4. Check logs for:
   ```
   [TuyaCluster] Processing DP 1 (gas_alarm): true
   [TuyaCluster] ✅ alarm_smoke = true
   ```

---

## 🔬 TECHNICAL DETAILS

### Why Re-Pairing is Required

**The Tuya Cluster (0xEF00 / 61184):**
- Is a **manufacturer-specific cluster**
- Must be properly exposed during Zigbee joining process
- Handler attaches listeners during device initialization
- If cluster not found during init, handler can't function

**What happens during pairing:**
1. Sensor broadcasts join request
2. Homey accepts and performs interview
3. Sensor exposes all its clusters (including 0xEF00)
4. Driver reads cluster list and initializes handlers
5. Tuya handler attaches to cluster 0xEF00
6. Listeners configured for datapoint reports

**Your current situation:**
- Device paired with old driver (before v3.0.17)
- Old pairing didn't properly expose Tuya cluster
- New handler tries to find cluster but fails
- Falls back to "standard Zigbee" (which doesn't work for TS0601)

**After re-pairing:**
- Fresh join with new driver
- Cluster 0xEF00 properly exposed
- Handler finds cluster on endpoint 1
- Listeners attached successfully
- Datapoints received and processed
- Device fully functional ✅

### Cluster Detection Code

The handler scans ALL endpoints for Tuya cluster:

```javascript
for (const [epId, endpoint] of Object.entries(zclNode.endpoints)) {
  if (endpoint.clusters && endpoint.clusters[61184]) {
    tuyaCluster = endpoint.clusters[61184];
    tuyaEndpoint = epId;
    break;
  }
}
```

Your sensor likely has cluster on endpoint 1, but old pairing doesn't expose it correctly.

---

## 🆘 IF RE-PAIRING DOESN'T WORK

### Scenario 1: Still "No Tuya cluster found"

**Possible causes:**
- Factory reset didn't complete
- Sensor still has old pairing data
- Hardware issue with sensor

**Try this:**
1. Power cycle sensor 3 times (on/off/on/off/on)
2. Each time wait 30 seconds
3. On 3rd power-on, immediately press reset for 15 seconds
4. Try pairing again

### Scenario 2: Pairs but no data

**Check:**
1. Homey logs show cluster found? ✅
2. Initial data received? Check for: `[TuyaCluster] ✅ Initial data received`
3. If no initial data, wait 5 minutes (some sensors delay first report)
4. Try triggering sensor (make smoke) to force report

### Scenario 3: Wrong driver selected

**Verify:**
1. Device page → Settings
2. Check **Driver** field
3. Should say: **"Gas Sensor TS0601 (AC)"**
4. If different, remove and re-pair with correct driver

---

## 📊 EXPECTED BEHAVIOR AFTER FIX

### Homey Logs (Good)
```
2025-10-16T21:30:00.000Z [TuyaCluster] Initializing for type: GAS_DETECTOR
2025-10-16T21:30:00.001Z [TuyaCluster] ✅ Found on endpoint 1
2025-10-16T21:30:00.002Z [TuyaCluster] ✅ Tuya cluster found on endpoint 1
2025-10-16T21:30:00.010Z [TuyaCluster] ✅ Reporting configured
2025-10-16T21:30:00.500Z [TuyaCluster] Reading initial data (attempt 1/5)...
2025-10-16T21:30:01.000Z [TuyaCluster] ✅ Initial data received: {"1":false,"13":false}
2025-10-16T21:30:01.010Z [TuyaCluster] Processing DP 1 (gas_alarm): false
2025-10-16T21:30:01.020Z [TuyaCluster] ✅ alarm_smoke = false
2025-10-16T21:30:01.030Z [TuyaCluster] Processing DP 13 (co_alarm): false
2025-10-16T21:30:01.040Z [TuyaCluster] ✅ alarm_co = false
2025-10-16T21:30:01.050Z [TuyaCluster] ═══════════════════════════════════════
2025-10-16T21:30:01.051Z [TuyaCluster] Initialization complete
2025-10-16T21:30:01.052Z [TuyaCluster] Device Type: GAS_DETECTOR
2025-10-16T21:30:01.053Z [TuyaCluster] Endpoint: 1
2025-10-16T21:30:01.054Z [TuyaCluster] Initial Data: Received
2025-10-16T21:30:01.055Z [TuyaCluster] Power Mode: AC
2025-10-16T21:30:01.056Z [TuyaCluster] Auto Discovery: Enabled
2025-10-16T21:30:01.057Z [TuyaCluster] ═══════════════════════════════════════
```

### Device Tile (Good)
```
Gas Sensor TS0601 (AC)
_TZE204_yojqa8xn

🔥 Gas Alarm: Safe
☠️ CO Alarm: Safe
🔌 Power: AC
```

### When Smoke Detected
```
Physical Sensor:
- Alarm sounds (beeping) ✅
- LED flashes red ✅

Homey:
- Device tile shows "ALARM: Smoke detected!" ✅
- alarm_smoke = true ✅
- Flow triggers fire ✅
- Notifications sent (if configured) ✅
- Timeline shows event ✅
```

---

## 📝 CHECKLIST BEFORE REPORTING BACK

- [ ] Device removed from Homey
- [ ] Factory reset performed (LED blinking rapidly)
- [ ] Re-paired with "Gas Sensor TS0601 (AC)" driver
- [ ] Sensor kept < 30cm from Homey during pairing
- [ ] Checked Homey logs for "[TuyaCluster] ✅ Found on endpoint 1"
- [ ] Waited 2-3 minutes after pairing
- [ ] Tested smoke detection (alarm sounds)
- [ ] Checked device tile for alarm status

If ALL steps completed and still not working:
- [ ] Generate NEW diagnostic report
- [ ] Copy logs from pairing attempt
- [ ] Post diagnostic ID + logs here

---

## 💡 WHY THIS HAPPENS

This is a **known issue** with Tuya TS0601 devices when upgrading from older app versions:

**Old app versions (< v3.0.17):**
- No Tuya cluster handler
- Devices paired with generic Zigbee driver
- Cluster 0xEF00 not properly utilized

**New app version (v3.0.17+):**
- Dedicated Tuya cluster handler
- Proper datapoint mapping
- Full TS0601 support

**Migration path:**
- Simply updating app is NOT enough
- Device MUST be re-paired for new handler to work
- This is a Zigbee limitation, not an app bug

**Going forward:**
- All NEW devices paired with v3.0.17+ work immediately
- Only EXISTING devices need re-pairing once
- After re-pairing, future updates don't require this

---

## 🔗 ADDITIONAL RESOURCES

**Documentation:**
- Tuya Cluster Reference: `docs/technical/TUYA_CLUSTER_0xEF00_COMPLETE_REFERENCE.md`
- Troubleshooting Guide: `docs/forum/RESPONSE_UGRBNK_266_GAS_SENSOR_NO_DATA.md`

**Technical:**
- Handler code: `utils/tuya-cluster-handler.js` (v3.1.0)
- 18 sources documented (Zigbee2MQTT, ZHA, Tuya IoT, etc.)

**Support:**
- Forum: https://community.homey.app/t/140352
- GitHub: https://github.com/dlnraja/com.tuya.zigbee/issues

---

## ✅ NEXT STEPS

1. **Re-pair your sensor** following steps above
2. **Check logs** to confirm cluster found
3. **Test smoke detection**
4. **Report back** with results

I'm confident this will solve your issue. The re-pairing will expose the Tuya cluster properly and everything will work as expected!

Let me know how it goes! 🚀

Best regards,  
Dylan  
Universal Tuya Zigbee Developer

---

**Diagnostic Analysis:**
- Report ID: cbfd89ec-692d-4cc9-b555-18114cf6d31a
- App Version: v3.0.23
- Homey Version: v12.8.0
- Issue: Tuya cluster 0xEF00 not found during initialization
- Root Cause: Device paired with old driver before v3.0.17
- Solution: Complete factory reset + re-pairing required
- Expected Result: Cluster found on endpoint 1, full functionality restored
