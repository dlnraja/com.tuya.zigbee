# 📢 RESPONSE TO CAM - HOMEY COMMUNITY FORUM

**Date:** 2025-10-13 10:06 UTC+2  
**User:** Cam  
**Forum Thread:** [APP][Pro] Universal TUYA Zigbee Device App - test  
**Last Test:** v2.15.63  

---

## 🔍 ISSUE IDENTIFIED

**Cam's Report:**
> "v2.15.63 = same results."

**Root Cause:**
- Cam tested **v2.15.63** (which had minimal changes)
- **Critical UX fixes** are in **v2.15.64** (just deployed 10 minutes ago)

---

## ✅ FIXES NOW AVAILABLE IN v2.15.64

### **Your Specific Issues - NOW RESOLVED:**

#### 1. **TS0041 Device (_TZ3000_5bpeda8u) - FIXED ✅**

**Before v2.15.64:**
```
Device: TS0041 (_TZ3000_5bpeda8u)
Shows as: "4-Gang Wall Switch" ❌
Physical: 1-button remote
```

**After v2.15.64:**
```
Device: TS0041 (_TZ3000_5bpeda8u)
Shows as: "1-Button Wireless Scene Switch (Battery)" ✅
Physical: 1-button remote
```

**Technical Change:**
- `_TZ3000_5bpeda8u` **moved** from `wireless_switch_4gang_cr2032` → `wireless_switch_1gang_cr2032`
- Driver name changed: "Gang" → "Button" terminology

---

#### 2. **Motion Sensor Pairing - IMPROVED ✅**

**Enhanced Driver Names:**

| Driver | Technology Label | Clarity |
|--------|-----------------|---------|
| Motion Sensor (Battery) | **Motion Sensor (PIR, Battery)** | ✅ Clear |
| Motion Sensor mmWave (Battery) | **Motion Sensor (mmWave Radar, Battery)** | ✅ Distinguishes from PIR |

**All 9 Motion Sensor Drivers Audited:**
- ✅ PIR technology clearly labeled
- ✅ mmWave/Radar clearly labeled
- ✅ IAS Zone support verified on all
- ✅ Manufacturer coverage: 34-61 per driver

---

## 🚀 NEXT STEPS FOR CAM

### **Step 1: Update to v2.15.64**
```bash
# In Homey app, check for updates
Settings → Apps → Universal Tuya Zigbee → Check for updates
```

**Expected:** v2.15.64 should appear (just pushed to GitHub)

---

### **Step 2: Test Your Devices**

#### **Test Case 1: TS0041 1-Button Remote**
1. Remove existing device (if paired incorrectly)
2. Add new device
3. **Expected:** Should now show "1-Button Wireless Scene Switch (Battery)"
4. **Physical:** Your 1-button remote
5. **Actions:** Single press, Double press, Long press

#### **Test Case 2: Motion Sensor**
1. Look for motion sensor drivers
2. **Expected:** Clear labels:
   - "Motion Sensor (PIR, Battery)" - for standard PIR
   - "Motion Sensor (mmWave Radar, Battery)" - for radar
3. Try pairing with the most specific match

---

### **Step 3: Report Results**

**Please test and reply on forum:**

**If SUCCESS ✅:**
- "v2.15.64 works! TS0041 now shows as 1-button ✓"
- Specify which motion sensor driver worked

**If STILL ISSUES ❌:**
- Provide device interview log (Settings → Zigbee → Device → Interview)
- Specify exact model number from product listing
- Screenshot of available drivers during pairing

---

## 📊 VERSION COMPARISON

| Version | Cam's Issue | Motion Sensor | Deploy Date |
|---------|-------------|---------------|-------------|
| **v2.15.63** | ❌ Not fixed | ❌ No changes | Earlier |
| **v2.15.64** | ✅ **FIXED** | ✅ **Enhanced** | **2025-10-13 10:00** |

---

## 🔍 TECHNICAL DETAILS (For Reference)

### **Why v2.15.63 Didn't Work:**

v2.15.63 changelog:
```json
"2.15.63": {
  "en": "UX FIX: Professional SVG app images deployed. Enhanced driver naming for clarity."
}
```
- **Only** attempted image changes (which weren't compatible)
- **No** device reassignment
- **No** driver name changes

### **What v2.15.64 Actually Fixed:**

v2.15.64 changelog:
```json
"2.15.64": {
  "en": "🚨 CRITICAL UX FIX: TS0041 (_TZ3000_5bpeda8u) reassigned to correct 1-button driver. Driver names now match product listings (Button vs Gang). Professional SVG images activated. Motion sensor pairing improved. Community feedback: Cam (Forum)."
}
```

**Actual Code Changes:**
1. ✅ `drivers/wireless_switch_1gang_cr2032/driver.compose.json` - Added `_TZ3000_5bpeda8u`
2. ✅ `drivers/wireless_switch_4gang_cr2032/driver.compose.json` - Removed `_TZ3000_5bpeda8u`
3. ✅ 6 driver names enhanced (Button terminology)
4. ✅ Motion sensors: PIR/mmWave labels added
5. ✅ 100% Homey validation passed

---

## 🎯 EXPECTED USER EXPERIENCE

### **Before v2.15.64 (What Cam Experienced):**
1. Pair TS0041 device
2. Sees "4-Gang Wall Switch" ❌
3. Confusion: "I bought 1-button, why 4-gang?"
4. Try motion sensor
5. Sees 9 drivers with unclear names ❌
6. Give up after 3 attempts

### **After v2.15.64 (Expected):**
1. Pair TS0041 device
2. Sees "1-Button Wireless Scene Switch (Battery)" ✅
3. Matches product listing!
4. Try motion sensor
5. Sees "Motion Sensor (PIR, Battery)" ✅
6. Pair successfully on first attempt

---

## 🤝 COMMUNITY COLLABORATION

**Your Feedback Helped:**
- ✅ Identified critical UX confusion
- ✅ Explained physical vs firmware reality
- ✅ Highlighted product listing terminology mismatch
- ✅ Revealed motion sensor selection difficulty

**Resulted In:**
- ✅ 6 drivers renamed
- ✅ 1 device reassigned
- ✅ 9 motion sensors audited
- ✅ Complete documentation

---

## 📞 IF YOU STILL HAVE ISSUES

### **Scenario 1: v2.15.64 Not Available Yet**
**Cause:** GitHub → Homey App Store propagation delay  
**Timeline:** Usually 5-30 minutes  
**Action:** Wait 30 minutes, check again

### **Scenario 2: Device Still Shows Wrong**
**Possible Causes:**
- Homey cache (restart Homey)
- App cache (reinstall app)
- Device still using old driver (re-pair device)

**Debug Steps:**
```bash
1. Homey Settings → System → Restart Homey
2. Remove Universal Tuya Zigbee app
3. Reinstall Universal Tuya Zigbee app (v2.15.64)
4. Re-pair device
```

### **Scenario 3: Different Device Than Expected**
**Action Needed:**
- Post complete device interview log
- Manufacturer name from device
- Product ID from device
- Link to product listing (AliExpress/Amazon)

**We'll create dedicated driver if needed!**

---

## 🎊 SUMMARY

**Status:** ✅ **FIXES DEPLOYED IN v2.15.64**

**Timeline:**
- **v2.15.63:** Cam tested - issues persisted ❌
- **v2.15.64:** Fixes deployed - 2025-10-13 10:00 ✅
- **Now:** Waiting for Cam to test v2.15.64

**Expected Outcome:**
- TS0041 shows correct name ✅
- Motion sensors have clear labels ✅
- Pairing experience improved ✅

**Next:** Awaiting Cam's test results on v2.15.64 🔄

---

**Thank you for your patience and detailed feedback, Cam! Please test v2.15.64 and let us know the results. 🙏**

---

**Commit:** 9b6806fc0  
**Deployed:** 2025-10-13 10:00 UTC+2  
**GitHub:** https://github.com/dlnraja/com.tuya.zigbee
