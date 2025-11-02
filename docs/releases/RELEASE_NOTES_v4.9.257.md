# 🚀 Release v4.9.257 - BSEED 2-Gang Fix

**Date:** November 1, 2025  
**Type:** Bug Fix + User Request  
**Priority:** HIGH

## 🎯 Main Achievements

### ✅ BSEED 2-Gang Switch Support
- Added comprehensive support for BSEED 2-Gang Touch Switches (_TZ3000_l9brjwau)
- Fixed critical firmware bug where commanding one gang affected both gangs
- Implemented intelligent workaround with auto-correction
- Enhanced manual state synchronization

### ✅ Multi-Gang Control Improvements
- All multi-gang switches now benefit from enhanced reliability
- Automatic bug detection and correction
- Better state synchronization across all endpoints

### ✅ Project Cleanup
- Fixed "Payload too large" issue for `homey app run`
- Organized 238 root files into proper folders
- Optimized `.homeyignore` for smaller deployments
- Fixed 171 pairing HTML file naming issues

### ✅ Validation Fixes
- Removed invalid `alarm_temperature` capability
- Removed invalid `led_mode` capability  
- Fixed JSON syntax issues
- App now validates at publish level

##  📋 Detailed Changes

### lib/SwitchDevice.js - BSEED Workaround
**New Methods:**
- `_captureOtherGangStates(excludeGang)` - Snapshot gang states before command
- `_verifyOtherGangsUnchanged(gang, previousStates)` - Detect firmware bugs
- `_pollAllGangs()` - Sync all gang states after manual changes
- `_wait(ms)` - Stabilization delay helper

**Enhanced onCapabilityOnoff():**
1. Read current state before commanding (skip if already correct)
2. Capture other gang states before command
3. Send command to target gang
4. Wait 500ms for stabilization
5. Verify other gangs unchanged
6. Auto-correct if firmware bug detected

**Enhanced Cluster Listeners:**
- Added automatic polling of all gangs when manual state change detected
- Catches firmware bugs affecting multiple gangs

### drivers/*/pair/ - File Naming Fix
- Renamed `select-driver.html` → `select_driver.html` (171 drivers)
- Fixed Homey validation requirements

### drivers/temperature_sensor* - Invalid Capability Removal
- Removed `alarm_temperature` (not a standard Homey capability)
- Fixed in 3 drivers: temperature_sensor, temperature_sensor_advanced, thermostat_temperature_control

### drivers/usb_outlet_2port - Invalid Capability Removal
- Removed `led_mode` (not a standard Homey capability)

### Root Directory Cleanup
Organized 238 files into:
- `docs/diagnostics/`
- `docs/support/`
- `docs/fixes/`
- `docs/releases/`
- `docs/guides/`
- `docs/technical/`
- `commits/`
- `data/`
- `scripts/`

### .homeyignore Updates
- Excludes all doc folders
- Excludes all scripts
- Excludes all markdown except README.md
- Reduced deployment size by ~80%

## 🐛 Bugs Fixed

### Critical
1. **BSEED Dual-Gang Control Bug**
   - **Problem:** Commanding one gang activated both gangs
   - **Root Cause:** Tuya firmware bug where endpoint 2 broadcasts to endpoint 1
   - **Solution:** Pre/post-command state verification + auto-correction

2. **Manual Status Not Read**
   - **Problem:** Physical button presses not reflected in Homey
   - **Root Cause:** Attribute reporting not configured on endpoint 2
   - **Solution:** Forced reporting + automatic polling

3. **Payload Too Large**
   - **Problem:** `homey app run` fails
   - **Root Cause:** 238 documentation files at root
   - **Solution:** Organized files + updated .homeyignore

### High
4. **Invalid Capabilities**
   - Removed `alarm_temperature` from 3 drivers
   - Removed `led_mode` from usb_outlet_2port

5. **Pairing HTML Naming**
   - Fixed 171 drivers with incorrect HTML file names

## 🧪 Testing

### Required Tests for BSEED Users
1. Update to v4.9.257
2. Re-pair BSEED 2-gang switch
3. Test independent control of each gang
4. Test manual button press synchronization
5. Test flow triggers for each gang

### Expected Behavior
✅ Independent gang control  
✅ Manual states reflected in Homey < 2s  
✅ No cross-talk between gangs  
✅ Auto-correction if firmware bug occurs

### Debug Logs
If firmware bug detected:
```
🔴 BUG DETECTED: Gang X changed unexpectedly!
   Expected: false, Got: true
[FIX] Restoring gang X to: false
⚠️  BSEED firmware bug detected - states auto-corrected
```

## 📦 Files Modified

**Core Library:**
- `lib/SwitchDevice.js` (+150 lines)

**Drivers:**
- `drivers/temperature_sensor/driver.compose.json`
- `drivers/temperature_sensor_advanced/driver.compose.json`
- `drivers/thermostat_temperature_control/driver.compose.json`
- `drivers/usb_outlet_2port/driver.compose.json`
- 171 pairing HTML files renamed

**Configuration:**
- `app.json` (version 4.9.255 → 4.9.257)
- `.homeyignore` (optimized)

**Documentation:**
- `docs/support/LOIC_BSEED_ANALYSIS.md` (new)
- `docs/support/EMAIL_LOIC_BSEED_REPONSE.txt` (new)
- `commits/commit-v4.9.257-bseed-fix.txt` (new)

**Scripts:**
- `scripts/fixes/fix-pairing-html-names.ps1` (new)
- `scripts/fixes/remove-invalid-capability.ps1` (new)
- `scripts/fixes/fix-alarm-temperature.js` (new)
- `scripts/fixes/remove-led-mode.js` (new)

## 👥 Credits

**User Request:** Loïc Salmona (loic.salmona@gmail.com)  
**Device:** BSEED 2-Gang Touch Switch (_TZ3000_l9brjwau)  
**Amazon Link:** https://amzn.eu/d/44FAB6n  
**Manufacturer:** https://www.bseed.com/fr/collections/serie-zigbee

## 🚀 Deployment

### Validation Status
✅ `homey app validate --level publish` - PASSED  
✅ JSON syntax valid  
✅ All capabilities standard  
✅ All file paths correct

### Ready For
- Homey App Store submission
- Public release
- User testing

## 📝 Known Limitations

1. **500ms delay per gang command**
   - Required for state stabilization
   - Multiple rapid commands may feel slightly less responsive

2. **Auto-correction logs may alarm users**
   - Consider adding user documentation
   - Logs are informative, not errors

## 🔮 Future Improvements

1. Add setting to disable auto-correction
2. Add setting to adjust stabilization delay
3. Consider alternative: `toggle()` instead of `setOn/setOff`
4. Report firmware bug to Tuya
5. Add BSEED 3-Gang support (awaiting interview report)
6. Add BSEED Curtain support (awaiting interview report)

## 📞 Support

For issues with this release:
1. Check Homey logs for `[BSEED]` or `BUG DETECTED` messages
2. Provide diagnostic report
3. Note which gangs are problematic
4. Contact: senetmarne@gmail.com

---

**Status:** ✅ READY FOR RELEASE  
**Validation:** ✅ PASSED  
**User Feedback:** ⏳ PENDING  
**Next Version:** v4.9.258 (future improvements)
