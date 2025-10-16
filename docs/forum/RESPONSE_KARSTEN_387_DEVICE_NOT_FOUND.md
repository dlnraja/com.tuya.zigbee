# 🔍 RÉPONSE Karsten_Hille #387 - Device Not Found During Pairing

**Date:** 16 Octobre 2025, 21:10 UTC+02:00  
**User:** Karsten_Hille  
**Post:** #387  
**Issue:** Device not found after installing v3.0.15

---

## 📧 RÉPONSE FORUM

**Sujet:** RE: Device Not Found - Need Device Diagnostic Info

---

Hi @Karsten_Hille,

Thank you for reporting this! I can see from your screenshot that you're having trouble finding the device during pairing with v3.0.15.

To help you effectively, I need to see the **device information** from your screenshot. Could you please provide:

## 📋 INFORMATION NEEDED

From the diagnostic screenshot you posted, please share:

### 1. Device Identification
- **Manufacturer Name:** (e.g., _TZE200_xxxxxx or _TZ3000_xxxxx)
- **Model ID:** (e.g., TS0601, TS011F, TS0041)
- **Device Type:** (e.g., sensor, switch, plug, dimmer)

### 2. Zigbee Details
- **Input Clusters:** (list of cluster IDs)
- **Output Clusters:** (list of cluster IDs)
- **Endpoints:** (usually 1, 2, or 3)

### 3. Current Situation
- What device are you trying to pair?
- Have you paired this device successfully before?
- Is this a new device or re-pairing?

---

## 🔍 COMMON CAUSES & QUICK FIXES

While waiting for your device info, here are common causes when devices aren't found during pairing:

### Cause 1: Wrong Driver Selected ⚠️

**Symptom:** Device doesn't appear in search results

**Solution:**
1. During pairing, try searching for:
   - Generic device type (e.g., "Switch", "Sensor", "Dimmer")
   - Manufacturer name if known
   - Model ID if known

2. If still not found, try:
   - **"Unknown Tuya Device (Pair Manually)"** driver
   - This catches all Tuya devices and shows capabilities after pairing

### Cause 2: Device Not in Pairing Mode 🔄

**Symptom:** Homey searching but nothing found

**Solution:**
1. **Factory reset the device:**
   - Most Tuya devices: Press button 5-10 seconds until LED blinks rapidly
   - Some devices: Remove battery for 30 seconds, reinsert
   - Plugs: On/off 5 times quickly

2. **Keep device VERY close to Homey during pairing:**
   - Distance: < 50cm / 20 inches
   - Critical for initial pairing

3. **Wait for pairing mode LED:**
   - Should blink rapidly (every 0.5-1 second)
   - If slow blinking, device is already paired to another hub
   - Factory reset required

### Cause 3: Device Already Paired Elsewhere 🔗

**Symptom:** Device doesn't respond to pairing

**Solution:**
1. Remove device from previous hub (if applicable)
2. Factory reset device
3. Wait 1 minute after reset
4. Try pairing again

### Cause 4: Zigbee Mesh Interference 📡

**Symptom:** Pairing times out or fails

**Solution:**
1. Move device closer to Homey (< 30cm during pairing)
2. Avoid WiFi router interference (keep 1m+ away)
3. Remove metal objects between device and Homey
4. Try pairing in a different room

### Cause 5: App Version Too Old 📦

**Symptom:** Device type not recognized

**Current version:** v3.0.15 (you have this)  
**Latest version:** Check App Store for updates

**Solution:**
- Update to latest version if available
- Some devices require newer drivers

---

## 🛠️ STEP-BY-STEP TROUBLESHOOTING

### Step 1: Verify App Version
1. Homey app → **More** → **Apps**
2. Find **Universal Tuya Zigbee**
3. Check version (should be v3.0.15+)
4. Update if newer version available

### Step 2: Factory Reset Device
**For most Tuya Zigbee devices:**
1. Press and hold button for **10 seconds**
2. LED should blink **rapidly** (pairing mode)
3. If no LED, remove battery 30 seconds, reinsert
4. Try button again

**For switches/dimmers:**
1. Turn on/off **5 times** quickly
2. LED blinks rapidly = success
3. Wait 5 seconds
4. Start pairing

**For plugs:**
1. Plug in
2. Press button 5-10 seconds
3. LED blinks = pairing mode

### Step 3: Start Pairing Process
1. Homey → **Add Device**
2. Select **Universal Tuya Zigbee**
3. Search by device type OR:
4. Select **"Unknown Tuya Device (Pair Manually)"**
5. Keep device < 30cm from Homey
6. Wait 30-60 seconds

### Step 4: If Still Not Found
Try pairing as **generic Zigbee device:**
1. Homey → Add Device
2. Select **Homey → Zigbee**
3. Choose generic type (switch, sensor, etc.)
4. After pairing, note manufacturer/model
5. Report back here for specific driver

---

## 📊 DIAGNOSTIC REPORT NEEDED

To create a specific driver for your device, I need:

### Option A: Manual Report
Please copy from your screenshot:
```
Manufacturer Name: _______
Model ID: _______
Input Clusters: [ _____ ]
Output Clusters: [ _____ ]
Endpoints: _____
```

### Option B: Diagnostic Export
If device pairs with generic driver:
1. Go to device page
2. Settings (⚙️) → Advanced
3. **Create Diagnostic Report**
4. Copy diagnostic ID
5. Post here

---

## 🎯 WHAT HAPPENS NEXT

Once you provide device info:
1. ✅ I'll identify the correct driver
2. ✅ Or create a new driver if needed
3. ✅ Provide specific pairing instructions
4. ✅ Add to next app update if missing

---

## 💡 QUICK CHECKLIST

Before reporting back:
- [ ] Verified app is v3.0.15+
- [ ] Factory reset device (LED blinking rapidly)
- [ ] Tried pairing < 30cm from Homey
- [ ] Waited full 60 seconds during pairing
- [ ] Tried "Unknown Tuya Device" driver
- [ ] Noted manufacturer/model from screenshot
- [ ] Checked for WiFi/Bluetooth interference

---

## 📝 TEMPLATE FOR REPLY

Please copy and fill this out:

```
Device Information:
- Brand: [e.g., Smart Life, Moes, Nous]
- Type: [e.g., switch, sensor, plug, dimmer]
- Manufacturer Name: [from screenshot]
- Model ID: [from screenshot]

What I tried:
- Factory reset: [Yes/No]
- Pairing mode LED: [Blinking/Not blinking]
- Distance from Homey: [< 30cm / > 1m]
- Tried "Unknown Device" driver: [Yes/No]

Result:
- [Device not found / Found but wrong capabilities / etc.]
```

---

Looking forward to your device details so I can help you get this working! 🚀

Best regards,  
Dylan  
Universal Tuya Zigbee Developer

---

**Related Documentation:**
- Pairing Guide: `docs/PAIRING_GUIDE.md`
- Troubleshooting: `docs/TROUBLESHOOTING.md`
- Device Request: https://github.com/dlnraja/com.tuya.zigbee/issues

**Links:**
- GitHub: https://github.com/dlnraja/com.tuya.zigbee
- App Store: https://homey.app/a/com.dlnraja.tuya.zigbee/
