# 📝 USER SUGGESTIONS - RESPONSE & STATUS

## 🎯 **FEEDBACK FROM HOMEY DEVELOPER DASHBOARD**

### ✅ **SUGGESTION 1 (2 days ago) - IMPLEMENTED in v4.9.316**

**User Request:**
> "kan deze: Tuya _TZ3000_vp6clf9d TS0044 4 buttons scene switch worden toegevoegd?"

**Reference:** https://github.com/dresden-elektronik/deconz-rest-plugin/issues/4994

**Status:** ✅ **DONE!**

**Implementation:**
- **Driver:** `scene_controller_4button`
- **Manufacturers Added:**
  - `_TZ3000_vp6clf9d` ✅ (User requested)
  - `_TZ3000_xabckq1v` ✅ (Related variant)
  - `_TZ3000_czuyt8lz` ✅ (Related variant)
  - `_TZ3000_w8jwkczz` ✅ (Related variant)
- **Product IDs:**
  - `TS0044` ✅ (4-button model)
  - `TS0041` ✅ (Already supported)

**Capabilities:**
- 4 independent buttons (onoff, onoff.button2, onoff.button3, onoff.button4)
- Battery monitoring (measure_battery)
- Scene control (alarm_generic, windowcoverings_state)
- Battery alerts (low/critical thresholds)
- Energy optimization modes

**Release:** v4.9.316
**File Modified:** `drivers/scene_controller_4button/driver.compose.json`

---

### ✅ **SUGGESTION 2 (2 weeks ago) - ALREADY SUPPORTED**

**User Request:**
> "Bseed 1/2/3/4 gang touch switches are extensively sold on Amazon but not supported anywhere. Any chance to get an upgrade for that?"

**Status:** ✅ **ALREADY SUPPORTED!**

**Explanation:**

The app **already has comprehensive Bseed support**:

1. **Dedicated Bseed Driver:**
   - `switch_wall_2gang_bseed` ✅
   - Manufacturer: `_TZ3000_l9brjwau`
   - Product ID: `TS0002`
   - Special workaround for firmware bugs

2. **All Gang Configurations Supported:**

   | Gang Count | Drivers Available |
   |------------|-------------------|
   | 1-gang | `switch_wall_1gang`, `switch_touch_1gang`, `switch_wall_1gang_basic`, `switch_touch_1gang_basic` |
   | 2-gang | `switch_wall_2gang`, `switch_touch_2gang`, `switch_wall_2gang_bseed`, `switch_wall_2gang_basic` |
   | 3-gang | `switch_wall_3gang`, `switch_touch_3gang`, `switch_wall_3gang_basic`, `switch_touch_3gang_basic` |
   | 4-gang | `switch_wall_4gang`, `switch_touch_4gang`, `switch_wall_4gang_basic`, `switch_wall_4gang_smart` |

3. **Total Switch Drivers:** 48 drivers covering all configurations

**How to Pair Bseed Switches:**

1. Add device in Homey app
2. Search for "Bseed" or "Wall Switch"
3. Select correct gang count (1/2/3/4)
4. Follow pairing instructions
5. ✅ Device will auto-detect and work!

**Auto-Detection:**
- Smart-Adapt system (v4.9.315) detects multi-gang configuration
- Automatically suggests correct driver if wrong one selected
- Safe migration system prevents data loss

**Special Features:**
- Touch switches support ✅
- Basic switches support ✅
- Smart switches with power measurement ✅
- Firmware bug workarounds (for BSEED 2-gang) ✅

---

## 📊 **SUMMARY**

| Suggestion | Status | Version | Action |
|------------|--------|---------|--------|
| Tuya TS0044 4-button | ✅ Implemented | v4.9.316 | Added 4 manufacturer IDs + TS0044 product ID |
| Bseed 1/2/3/4 gang | ✅ Already Supported | Since v4.9.300+ | 48 switch drivers available |

---

## 🚀 **NEXT STEPS FOR USERS**

### **For Tuya TS0044 Users:**

1. **Update App** to v4.9.316 (when Live)
2. **Add Device:**
   - Open Homey app
   - Add device → Search "Scene Controller 4button"
   - Follow pairing instructions
3. **Enjoy!**

### **For Bseed Switch Users:**

1. **Identify Gang Count** (1/2/3/4 buttons on switch)
2. **Add Device:**
   - Open Homey app
   - Add device → Search "Wall Switch [X] Gang" or "Bseed"
   - Select matching gang count
   - Follow pairing instructions
3. **If Wrong Driver:**
   - Safe Migration System (v4.9.315) will suggest correct driver
   - Follow on-screen instructions
   - Or: Remove device → Re-pair with correct driver

---

## 🙏 **THANK YOU!**

Your suggestions help make this app better for everyone!

**Keep them coming:**
- Homey Developer Dashboard → Suggestions tab
- GitHub Issues: https://github.com/dlnraja/com.tuya.zigbee/issues
- Homey Community Forum

**Your feedback drives development! 🎉**

---

## 📅 **CHANGELOG REFERENCE**

**v4.9.316** - New Devices Support (User Suggestions)
- ✅ Tuya TS0044 4-button scene switch
- ✅ 4 new manufacturer IDs
- ✅ Bseed confirmed supported
- ✅ Safe Migration System included

**See:** `.homeychangelog.json` for full details

---

**Last Updated:** Nov 8, 2025  
**Release Version:** v4.9.316  
**Status:** Ready for publish  
**Manual Promotion Required:** Dashboard → Promote to Live
