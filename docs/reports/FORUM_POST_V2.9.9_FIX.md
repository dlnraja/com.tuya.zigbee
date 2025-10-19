# Forum Post - Version 2.9.9 Critical Battery Fix

## Post pour le Forum Homey Community

**Thread:** https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352

---

## 🔧 Version 2.9.9 Released - Critical Battery Reading Fix

Hi everyone,

I've just released **version 2.9.9** which fixes a critical issue affecting battery-powered devices.

### 🐛 Problem Fixed

Many users (including Peter - thanks for the diagnostic report!) were experiencing:
- **"Last readings 56 years ago"** on sensors
- **No battery level** displayed
- **No data updates** from battery-powered devices

**Root cause:** The app was using incorrect cluster ID format for Homey SDK3. Battery capability registration was using a string (`'genPowerCfg'`) instead of the numeric constant required (`CLUSTER.POWER_CONFIGURATION`).

### ✅ What's Fixed in v2.9.9

**96 device drivers corrected**, including:
- Multi-sensors (motion/temp/humidity/illuminance)
- SOS emergency buttons
- Contact sensors
- Motion sensors
- Temperature/humidity sensors
- Water leak detectors
- Smoke detectors
- And many more battery-powered devices

**Expected results after update:**
- ✅ Battery levels now display correctly
- ✅ Sensor readings update normally
- ✅ Proper timestamps (no more "56 years ago"!)
- ✅ All capabilities work as expected

### 📦 How to Update

**Option 1 - Automatic (Recommended):**
1. Wait for the update notification in Homey
2. Settings → Apps → Universal Tuya Zigbee → Update
3. Restart your Homey
4. Your devices should work correctly!

**Option 2 - If issues persist:**
1. Remove affected devices
2. Restart Homey
3. Re-pair the devices with the updated drivers

### 🔍 Technical Details

This was an SDK3 migration issue. The fix ensures proper communication with the Zigbee Power Configuration cluster (0x0001) according to Homey SDK3 requirements.

```javascript
// Before (incorrect):
this.registerCapability('measure_battery', 'genPowerCfg', {...})

// After (correct):
const { CLUSTER } = require('zigbee-clusters');
this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {...})
```

### 📊 Current App Status

**Version:** 2.9.9
**Total Drivers:** 167
**Devices Supported:** 1500+
**SDK:** Version 3 (fully compliant)
**Validation:** 100% passed

### 🙏 Special Thanks

Big thanks to Peter for the detailed diagnostic report that helped identify this critical issue! Your feedback helps make the app better for everyone.

### 📍 Links

**App Store:** [Universal Tuya Zigbee](https://homey.app/a/com.dlnraja.tuya.zigbee/)
**GitHub:** [dlnraja/com.tuya.zigbee](https://github.com/dlnraja/com.tuya.zigbee)
**Developer Dashboard:** https://tools.developer.homey.app

### 💬 Feedback

If you encounter any issues after updating, please:
1. Share your device manufacturer IDs
2. Send diagnostic reports (if applicable)
3. Let me know which specific device is affected

I'm continuously improving the app based on user feedback!

Best regards,
Dylan

---

## 📋 Changelog v2.9.9

**Critical Fixes:**
- Fixed battery reading issues on 96 drivers
- Corrected SDK3 cluster ID implementation
- Improved data reporting for all battery-powered sensors

**Enhancements:**
- Better Tuya datapoint handling
- Enhanced stability across all 167 drivers
- Improved error logging

**Previous versions:**
- v2.9.8: App metadata improvements
- v2.9.7: AC gas sensor support, image rendering fixes
- v2.9.6: Sensor accuracy improvements

---

## ⚠️ Known Compatible Devices

The fix specifically benefits these device types:
- Motion sensors (PIR, radar, mmWave)
- Multi-sensors (temp/humidity/illuminance/motion)
- Contact/door sensors
- Button/scene controllers (battery-powered)
- Temperature/humidity sensors
- Water leak detectors
- Smoke/CO detectors
- Gas sensors (battery versions)
- Soil moisture sensors
- And all other battery-powered Tuya Zigbee devices

---

**Please update to v2.9.9 and let me know if this fixes your battery reading issues!** 🎉
