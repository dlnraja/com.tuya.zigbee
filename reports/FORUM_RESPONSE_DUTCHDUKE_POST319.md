# FORUM RESPONSE - DutchDuke POST #319

**To**: DutchDuke  
**Forum**: Homey Community  
**Thread**: [APP][Pro] Universal TUYA Zigbee Device App - test  
**Post**: #319

---

## 📝 RESPONSE TEXT (Ready to Post)

```markdown
Hi @DutchDuke,

Thank you so much for reporting these devices and providing the GitHub issue links! Both are now fixed in the latest version. 🎉

---

### 🌡️ Device 1: Temperature Humidity Sensor ✅ FIXED

Your sensor **_TZ3000_akqdg6g7 / TS0201** was incorrectly being detected as a smoke detector. 

**What happened**: This manufacturer ID was accidentally added to the smoke detector driver instead of the temperature/humidity driver. The device interview clearly shows it has temperature (cluster 1026) and humidity (cluster 1029) capabilities, NOT smoke detection!

**The fix**:
- ✅ Removed from smoke detector driver
- ✅ Added to correct **Temperature Humidity Sensor (Battery)** driver
- ✅ Now properly recognized with all capabilities

**How to fix your setup**:
1. Update **Universal Tuya Zigbee** to **v2.15.68** or later
2. **Remove** the device (currently showing as smoke detector)
3. **Re-pair** the device
4. When asked, select driver: **"Temperature Humidity Sensor (Battery)"**

**You'll now get**:
- ✅ Temperature readings (°C)
- ✅ Humidity readings (%)
- ✅ Battery level (%)
- ✅ Temperature alarm triggers (high/low alerts)

GitHub Issue [#1040](https://github.com/JohanBendz/com.tuya.zigbee/issues/1040) → ✅ **RESOLVED**

---

### 🌱 Device 2: Soil Moisture Sensor ✅ NOW SUPPORTED

Your sensor **_TZE284_oitavov2 / TS0601** is now fully supported!

**Technical info**: This is a Tuya proprietary device using cluster 61184 (EF00) for soil moisture and temperature data. Perfect for garden automation! 🌿

**How to add**:
1. Update **Universal Tuya Zigbee** to **v2.15.68** or later
2. Add new device
3. Select driver: **"Soil Moisture & Temperature Sensor (Battery)"**
4. Press and hold the pairing button on your sensor (LED will blink)
5. Wait for Homey to detect it

**Capabilities**:
- ✅ **Soil Temperature** (°C) - Monitor soil warmth
- ✅ **Soil Moisture** (%) - Perfect for irrigation automation
- ✅ **Battery Level** (%) - Know when to replace battery

**Use cases**:
- 🌻 Automate garden watering based on soil moisture
- 🌡️ Monitor greenhouse soil temperature
- 💧 Get alerts when plants need water
- 📊 Track soil conditions over time

GitHub Issue [#1245](https://github.com/JohanBendz/com.tuya.zigbee/issues/1245) → ✅ **RESOLVED**

---

### 📲 Update Instructions

The fix is in **v2.15.68+** which should auto-update soon. To manually update:

1. Open Homey app
2. Go to **Settings** → **Apps**
3. Find **Universal Tuya Zigbee**
4. Click **Update** (if available)

---

Both devices should work perfectly now! Please test them out and let me know if you encounter any issues. 

Thanks again for the detailed reports - having the GitHub issue links with device interviews made it super easy to fix! 👍

Best regards,  
Dylan

---

**Links**:
- GitHub Issue #1040: https://github.com/JohanBendz/com.tuya.zigbee/issues/1040
- GitHub Issue #1245: https://github.com/JohanBendz/com.tuya.zigbee/issues/1245
- Commit: 95c50637e
```

---

## 🎯 POST CHECKLIST

- [x] Acknowledge user's report
- [x] Explain both issues clearly
- [x] Provide fix details
- [x] Give clear re-pairing instructions
- [x] List all capabilities
- [x] Include use cases (soil sensor)
- [x] Link to GitHub issues
- [x] Friendly and helpful tone
- [x] Mention version number
- [x] Request feedback

---

## 📊 EXPECTED USER ACTIONS

### After Posting

1. ⏳ DutchDuke will see response
2. ⏳ Update to v2.15.68+
3. ⏳ Re-pair temperature sensor
4. ⏳ Pair soil moisture sensor
5. ⏳ Report back success/issues

### Follow-up

If issues persist:
- Request diagnostic report
- Check device interview data
- Verify driver selection
- Check Zigbee clusters

---

**Response Status**: ✅ READY TO POST  
**Expected Outcome**: Both devices working correctly  
**User Satisfaction**: High (complete fix provided)
