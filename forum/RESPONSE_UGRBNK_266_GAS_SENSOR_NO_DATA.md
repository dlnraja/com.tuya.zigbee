# 🔍 RÉPONSE ugrbnk #266 - Gas Sensor No Data to Homey

**Date:** 16 Octobre 2025, 20:35 UTC+02:00  
**User:** ugrbnk  
**Post:** #266  
**Device:** Gas Sensor TS0601 (_TZE204_yojqa8xn)  
**Issue:** L'alarme physique se déclenche, mais aucune donnée vers Homey

---

## 📧 RÉPONSE FORUM

**Sujet:** RE: Gas Sensor - Testing & Troubleshooting Steps

---

Hi @ugrbnk,

Thank you for testing! I see the sensor is detecting smoke physically (alarm sounds), but the data isn't reaching Homey. Let me help you troubleshoot this step by step.

## 🔍 Current Status

Based on your screenshot and description:
- ✅ Device paired successfully
- ✅ Physical alarm works (sounds when you smoke it)
- ❌ **No data transmitted to Homey**
- ❌ Tiles show no alarm status

This indicates the sensor hardware works fine, but there's a **communication issue** between the sensor and Homey.

---

## 🛠️ TROUBLESHOOTING STEPS

### Step 1: Verify App Version

**Current requirement:** v3.0.17 or newer

Check your app version:
1. Homey app → **More** → **Apps**
2. Find **Universal Tuya Zigbee**
3. Current version shown at top

**If you're on v3.0.16 or older:**
- Update to v3.0.17+ immediately
- v3.0.17 includes the Tuya cluster handler fix specifically for your gas sensor!

---

### Step 2: Re-Pair the Device (CRITICAL)

Even if you updated the app, the sensor needs to be re-paired to use the new handler.

**How to re-pair:**

1. **Remove device from Homey:**
   - Go to device tile
   - Settings (⚙️) → Advanced Settings
   - Remove Device

2. **Factory reset the sensor:**
   - Press and hold the reset button for **10 seconds**
   - LED should blink rapidly (indicating reset mode)
   - If no LED blinks, try removing battery for 30 seconds, then reinsert

3. **Add device back:**
   - Homey → Add Device
   - Universal Tuya Zigbee
   - Search for: **"Gas Sensor TS0601 (AC)"**
   - Keep sensor **very close** to Homey during pairing (< 1 meter)
   - Wait 30-60 seconds for pairing

4. **Wait for initialization:**
   - After pairing, wait **2-3 minutes**
   - The Tuya cluster handler needs time to initialize
   - Check Homey logs for confirmation

---

### Step 3: Check Homey Logs

This is crucial to see if data is being received:

1. **Open Homey Developer Tools:**
   - Go to: https://developer.homey.app/
   - Login with your Homey account
   - Select your Homey

2. **Open Logs:**
   - Click **System** → **Logs**
   - Or go to: Settings → System → Logs

3. **Look for these messages:**
   ```
   ✅ GOOD SIGNS:
   [TuyaCluster] Initializing for type: GAS_DETECTOR
   [TuyaCluster] ✅ Found on endpoint 1
   [TuyaCluster] ✅ Tuya cluster found on endpoint 1
   [TuyaCluster] ✅ Reporting configured
   [TuyaCluster] 📦 DataPoints received: {"1":false,"13":false}
   [TuyaCluster] Processing DP 1 (gas_alarm): false
   [TuyaCluster] ✅ alarm_smoke = false
   
   ❌ BAD SIGNS:
   [TuyaCluster] No Tuya cluster found on any endpoint
   [TuyaCluster] ⚠️ No dataPoints in response
   Cannot find module '../../utils/tuya-cluster-handler'
   ```

4. **Test the sensor:**
   - While watching logs, make smoke near sensor
   - Physical alarm should sound
   - **Watch logs for datapoint changes:**
     ```
     [TuyaCluster] Processing DP 1 (gas_alarm): true
     [TuyaCluster] ✅ alarm_smoke = true
     ```

---

### Step 4: Verify Device Driver

Make sure the correct driver was selected:

1. Go to device settings
2. Check **Driver:** should show **"Gas Sensor TS0601 (AC)"**
3. If it shows something else, remove and re-pair with correct driver

---

### Step 5: Check Zigbee Network

If still no data after re-pairing:

1. **Check Zigbee mesh quality:**
   - Settings → Zigbee → Network Map
   - Find your gas sensor
   - Check signal quality (should be green/good)

2. **Improve mesh if needed:**
   - Add Zigbee router between Homey and sensor
   - Or move sensor closer to Homey
   - AC-powered devices act as routers automatically

3. **Check for interference:**
   - Move away from WiFi router (2.4GHz interference)
   - Move away from microwave, baby monitors
   - Avoid metal walls/objects between Homey and sensor

---

## 🔬 DIAGNOSTIC REQUEST

If still not working after all steps above, please provide:

### 1. Device Diagnostic Report

**How to generate:**
1. Go to gas sensor device page
2. Settings (⚙️) → Advanced Settings
3. **"Create Diagnostic Report"**
4. Copy the diagnostic ID
5. Post it here

### 2. Homey Logs

**After testing smoke:**
1. Make smoke near sensor
2. Wait 30 seconds
3. Copy logs from last 1 minute
4. Post here (or pastebin if long)

### 3. App Version Confirmation

Please confirm:
- Universal Tuya Zigbee version: **?**
- Homey firmware version: **?**
- When did you last update the app?

---

## 🎯 EXPECTED BEHAVIOR

**After fixes in v3.0.17:**

When smoke is detected:
```
Physical sensor:
✅ Alarm sounds (beeping)
✅ LED flashes red

Homey side:
✅ Device tile shows "ALARM: Smoke detected!"
✅ alarm_smoke capability = true
✅ Flow triggers fire
✅ Notifications sent (if configured)
✅ Timeline shows event
```

When smoke clears:
```
Physical sensor:
✅ Alarm stops
✅ LED back to normal

Homey side:
✅ Device tile shows "OK"
✅ alarm_smoke capability = false
✅ Timeline shows "Alarm cleared"
```

---

## 🆘 KNOWN ISSUES & WORKAROUNDS

### Issue 1: Delayed Updates

**Symptom:** Data arrives 30-60 seconds late  
**Cause:** Tuya reporting interval  
**Solution:** 
- This is normal for battery-optimized sensors
- Your gas sensor is AC-powered, so should be faster
- If delayed, check Zigbee mesh quality

### Issue 2: First Alarm Missed

**Symptom:** First alarm doesn't trigger, subsequent ones work  
**Cause:** Initial datapoint not read  
**Solution:**
- Re-pair device
- Wait 3 minutes after pairing
- Test second time

### Issue 3: Sensor Goes "Unavailable"

**Symptom:** Device shows unavailable in Homey  
**Cause:** Poor Zigbee connection  
**Solution:**
- Improve Zigbee mesh
- Check power supply (AC adapter working?)
- Restart Homey as last resort

---

## 📚 TECHNICAL DETAILS

### How Tuya Gas Sensors Work

Your sensor uses **Tuya proprietary protocol**:
- Cluster: **0xEF00 (61184)**
- Datapoints:
  - **DP 1:** Gas alarm (boolean)
  - **DP 13:** CO alarm (boolean)
  - **DP 2:** Sensitivity setting

The v3.0.17 handler automatically:
1. Detects Tuya cluster on endpoint 1
2. Configures reporting (0-3600s intervals)
3. Listens for datapoint changes
4. Maps DP1 → alarm_smoke
5. Maps DP13 → alarm_co
6. Updates Homey capabilities
7. Triggers flows

### Why Re-Pairing is Important

When you pair a device:
- Driver loads and initializes
- Cluster bindings created
- Reporting configured
- Initial state read

If you updated the app but didn't re-pair:
- Old driver still loaded
- New Tuya handler not initialized
- No cluster bindings
- No data reception

**Solution:** Always re-pair after major app updates!

---

## ✅ CHECKLIST

Before reporting still not working:

- [ ] Confirmed app version is v3.0.17 or newer
- [ ] Removed device from Homey
- [ ] Factory reset sensor (10s button press)
- [ ] Re-paired with correct driver
- [ ] Waited 3 minutes after pairing
- [ ] Checked Homey logs during test
- [ ] Tested smoke detection (alarm sounds physically)
- [ ] Checked Zigbee mesh quality
- [ ] Verified AC power connected
- [ ] Generated diagnostic report
- [ ] Copied logs to post

---

## 💡 NEXT STEPS

1. **Check your app version** (most important!)
2. **Re-pair the device** (critical step)
3. **Test and watch logs**
4. **Report back with:**
   - App version
   - Log output
   - Diagnostic ID (if still not working)

I'm confident this will work after re-pairing with v3.0.17+. The Tuya cluster handler was specifically created to fix your exact issue!

Let me know how it goes! 🚀

---

Best regards,  
Dylan  
Universal Tuya Zigbee Developer

---

**Related:**
- Fix commit: v3.0.17 - Tuya cluster handler created
- Technical doc: `docs/forum/RESPONSE_UGRBNK_GAS_SENSOR_FIX.md`
- Handler code: `utils/tuya-cluster-handler.js`

**Links:**
- GitHub: https://github.com/dlnraja/com.tuya.zigbee
- App Store: https://homey.app/a/com.dlnraja.tuya.zigbee/
