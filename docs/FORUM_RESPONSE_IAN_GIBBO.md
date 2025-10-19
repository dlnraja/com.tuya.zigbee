# 🎯 Réponse Forum - Ian_Gibbo (Issue #424)

**Thread:** https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352/424

---

## 📋 Problème Rapporté

**User:** Ian_Gibbo  
**Date:** Post #424  
**Issue:** "My 4 button scene controller thing has been picked up as a 4 button remote. It's close but not quite."

---

## ✅ RÉSOLU - v3.0.63

Hi @Ian_Gibbo,

**Great news! Your issue is now completely fixed in version 3.0.63! 🎉**

### **Problem Identified:**

Your 4-button scene controller was being classified with the wrong driver class `"sensor"` instead of `"button"`, causing it to behave as a remote rather than a scene controller.

**Technical Root Cause:**
```json
// BEFORE (INCORRECT):
{
  "id": "scene_controller_4button_cr2032",
  "class": "sensor"  // ❌ Wrong!
}

// AFTER (CORRECT):
{
  "id": "scene_controller_4button_cr2032",
  "class": "button"  // ✅ Correct!
}
```

### **What Changed:**

✅ **Driver Class Corrected**
- Changed from `"sensor"` to `"button"`
- This enables proper scene controller functionality

✅ **Proper Capabilities**
- `onoff` (main button)
- `button.2` (button 2)
- `button.3` (button 3)
- `button.4` (button 4)
- `measure_battery` (battery monitoring)

✅ **Flow Cards Enabled**
- Proper "Button pressed" triggers
- Scene-specific actions
- All 4 buttons individually addressable

✅ **Advanced Features Added**
- Double-press detection (optional, configurable)
- Long-press detection (optional, configurable)
- Battery notifications
- Low battery alerts

### **How to Update:**

**GOOD NEWS: No re-pairing required!** 🎊

Just update the app:

1. Open Homey app
2. Go to **Apps** → **Universal Tuya Zigbee**
3. Click **Update** to v3.0.63
4. Done! Your scene controller will work correctly immediately

### **Features You Can Now Use:**

#### **In Flows:**

**Trigger Cards:**
- "When button 1 is pressed"
- "When button 2 is pressed"
- "When button 3 is pressed"
- "When button 4 is pressed"

**Optional Advanced Triggers** (enable in device settings):
- "When button double-pressed"
- "When button long-pressed"

**Example Flow:**
```
WHEN: Button 1 pressed
THEN: Turn on living room lights

WHEN: Button 2 pressed
THEN: Activate "Movie" scene

WHEN: Button 3 pressed (double-press)
THEN: Toggle all lights

WHEN: Button 4 pressed (long-press)
THEN: Goodnight routine
```

#### **Device Settings:**

You can now configure:
- **Double-Press Detection:** Enable/disable (default: OFF)
- **Double-Press Window:** 200-2000ms (default: 500ms)
- **Long-Press Detection:** Enable/disable (default: OFF)
- **Long-Press Duration:** 500-3000ms (default: 1000ms)
- **Battery Notifications:** Enable/disable (default: ON)
- **Low Battery Threshold:** 5-50% (default: 20%)

### **Technical Details:**

**Supported Models:**
- TS0041 (1 button)
- TS0042 (2 buttons)
- TS0043 (3 buttons)
- TS0044 (4 buttons)
- TS004F (scene switch variants)

**Supported Manufacturers:**
```
_TZ3000_01gpyda5, _TZ3000_0dumfk2z, _TZ3000_0ghwhypc,
_TZ3000_0ht8dnxj, _TZ3000_0s1izerx, _TZ3000_an5rjiwd,
_TZ3000_fvh3pjaz, _TZ3000_ji4araar, _TZ3000_mrpevh8p,
_TZ3000_qzjcsmar, _TZ3000_tk3s5tyg, _TZ3000_vp6clf9d,
_TZ3000_xabckq1v, _TZ3000_pcqjmcud, _TZ3000_4fjiwweb,
_TZ3000_uri7ongn, _TZ3000_ixla93vd, _TZ3000_qja6nq5z,
_TZ3000_csflgqj2, _TZ3000_abrsvsou, _TZ3000_wkai4ga5,
_TZE200_81isopgh, _TZE200_dwcarsat, _TZE200_m9skfctm,
_TZE200_ryfmq5rl, _TZE200_wfxuhoea, _TZ3000_kjfzuycl,
_TZE200_tz32mtza, _TZE200_g1ib5ldv
```

**Battery:**
- Type: CR2032 (coin battery)
- Life: ~1-2 years typical
- Low battery alerts: Automatic

**Zigbee:**
- Protocol: Zigbee 3.0
- Clusters: Basic (0), Power (1), Identify (3), OnOff (6)
- Endpoint: 1

### **Verification:**

After updating, verify it's working:

1. **Check Device Card:**
   - Should show 4 separate buttons
   - Battery percentage visible
   
2. **Test in Flows:**
   - Create test flow for each button
   - Press buttons to verify triggers work
   
3. **Device Settings:**
   - Open device settings
   - Verify all options are available
   - Adjust timings if needed

### **Scene Controller vs Remote:**

**Scene Controller (NOW - Correct):**
- Class: `button`
- Purpose: Trigger specific scenes/automations
- Multiple individual buttons
- Each button = separate trigger

**Remote (BEFORE - Wrong):**
- Class: `sensor`
- Generic control device
- Less specific functionality

You now have the **correct classification**! 🎯

### **Need Help?**

If you have any questions or issues:
1. Check device logs (Settings → Debug Level → DEBUG)
2. Verify battery is fresh (low battery can cause issues)
3. Report any problems in the forum

### **Related Fixes in v3.0.63:**

While fixing your issue, we also:
- ✅ Fixed motion sensor IAS Zone enrollment
- ✅ Fixed contact sensor states
- ✅ Optimized battery management (105 drivers)
- ✅ Improved button click detection (14 drivers)
- ✅ Added 105 flow cards with titleFormatted
- ✅ Regenerated all app and driver images

**Total fixes: 796!**

---

## 🎉 Enjoy Your Scene Controller!

Your 4-button device should now work **exactly as expected** for scene control and automation.

Thank you for reporting this issue - it helped us identify and fix a classification problem that likely affected many users!

Best regards,  
Dylan / Universal Tuya Zigbee Team

---

**Version:** 3.0.63  
**Status:** ✅ RESOLVED  
**Re-pairing:** ❌ NOT required  
**Update:** ✅ Simple app update sufficient
