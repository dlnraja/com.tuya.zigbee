# 💬 Réponse Forum - Ian_Gibbo - App Update Issue

**Pour:** @Ian_Gibbo  
**Post:** #279  
**Sujet:** App uninstalled but new version doesn't install  
**Date:** 12 Octobre 2025

---

## Message Forum (EN)

Hi Ian,

Thank you for reporting this issue and for your patience! This is actually expected behavior during the **test/experimental phase** of the app.

### 🔍 Why This Happens

The app is currently in **test mode** (not officially released to App Store yet). During this phase:

1. **Each version is a separate "test" app**
   - When I publish a new test version, Homey treats it as a different app
   - The previous test version is uninstalled
   - The new version must be manually installed

2. **Your devices get removed** because:
   - Each test version has a slightly different app ID internally
   - Homey doesn't maintain device associations between test versions
   - This is standard Homey behavior for experimental apps

### ✅ Solution

**Option 1: Wait for Official Release (Recommended)**
- Once the app is officially published to the App Store (soon!), updates will work normally
- Your devices will be preserved between updates
- No more manual reinstallation needed

**Option 2: Stay on One Version**
- Pick a stable version (like v2.15.1 - coming in 24-48h)
- Don't update until official release
- Your devices stay configured

**Option 3: Manual Update Process**
For now, when you see a new version:
1. **Before updating:** Note down your device configurations/settings
2. Update to new version via `homey app install`
3. Re-add devices (sorry for the inconvenience!)
4. Reconfigure if needed

### 📅 Timeline

**Upcoming:**
- **v2.15.1** (this weekend): Critical bug fixes for battery & sensors
- **Official App Store Release** (within 2-3 weeks): Normal update behavior will work!

Once officially published:
- ✅ Updates will be automatic
- ✅ Devices will be preserved
- ✅ No manual reinstallation
- ✅ Standard Homey update experience

### 🙏 Apology

I know this is frustrating during the test phase. The good news:
- The app is very close to stable release
- All major issues are being fixed
- The temporary inconvenience will be worth it for a rock-solid app!

Thank you for being an early tester and helping make the app better! 🚀

---

## Alternative Response (Shorter)

Hi Ian,

Yes, this is expected during test phase. Each test version is treated as a separate app by Homey, so:
- Old version uninstalls
- New version needs manual install
- Devices get removed (unfortunately)

**Good news:** Once officially released to App Store (2-3 weeks), updates will work normally and preserve your devices.

**For now:** Either wait for official release, or accept the manual reinstall when updating.

Sorry for the inconvenience - we're almost there! 🙏

---

**Préparé par:** Dylan  
**Date:** 12 Octobre 2025 13:50
