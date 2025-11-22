# UX Improvement Plan - Driver Names & Descriptions

**Date:** 2025-10-13  
**Priority:** HIGH  
**Issue:** Users can't find their devices due to technical driver names

---

## 🚨 PROBLEM STATEMENT

### User Feedback (Cam):

> "From a user experience (UX) point of view, the user is looking for a description of the product they purchased, not how it works in the code. Something more like the title they read when they purchased the product or an image, like Johan's app works."

> "I just tried adding the motion sensor about 3 times and gave up, not knowing which one it was meant to be."

### Current State:

**Example - HOBEIAN ZG-204ZL:**
- **User bought:** "PIR Motion Sensor with Light Sensor"
- **Driver name shown:** "Motion Temp Humidity Illumination Multi Battery"
- **Result:** User confused, can't find correct driver

### Why This Happens:

1. **Technical names** describe capabilities, not products
2. **Too many similar drivers** (10 drivers with "motion")
3. **No visual differentiation** (same generic icons)
4. **No device examples** in descriptions

---

## ✅ SOLUTION STRATEGY

### Approach 1: User-Friendly Names (RECOMMENDED)

**Pattern:** `[Device Type] ([Key Features])`

**Examples:**

| Current (Technical) | Improved (User-Friendly) |
|---------------------|--------------------------|
| Motion Temp Humidity Illumination Multi Battery | **Multi-Sensor (Motion + Lux + Temp)** |
| Motion Sensor PIR AC Battery | **PIR Motion Sensor (AC/Battery)** |
| Wireless Switch 4gang CR2032 | **4-Gang Button Switch** |
| Smart Switch 2gang AC | **2-Gang Wall Switch** |
| Bulb Color RGBCCT AC | **RGB+CCT Smart Bulb** |
| Curtain Motor Battery | **Curtain/Blind Motor (Battery)** |

### Approach 2: Add Device Examples

**In driver name or description:**

```json
{
  "name": {
    "en": "Multi-Sensor (Motion + Lux + Temp)"
  },
  "images": {
    "large": "/drivers/motion_temp_humidity_illumination_multi_battery/assets/large.png"
  },
  "$description": {
    "en": "PIR motion sensor with light, temperature and humidity. Examples: HOBEIAN ZG-204ZL, Tuya TS0601 multi-sensor"
  }
}
```

### Approach 3: Better Categorization

**Group by primary function:**

**Motion Sensors:**
- Basic PIR Motion Sensor
- Multi-Sensor (Motion + Lux + Temp)
- Advanced Motion Sensor (mmWave)

**Buttons/Switches:**
- 1-Gang Button
- 2-Gang Button
- 3-Gang Button
- 4-Gang Button

**Climate Sensors:**
- Temperature + Humidity Sensor
- Temperature Only Sensor
- Multi-Function Air Quality Sensor

---

## 📋 PRIORITY DRIVERS TO RENAME

### Tier 1 - Most Confusing (Fix First)

**Motion Sensors (10 drivers!):**

| Old Name | New Name | Devices |
|----------|----------|---------|
| `motion_temp_humidity_illumination_multi_battery` | **Multi-Sensor (Motion + Lux + Temp)** | HOBEIAN ZG-204ZL |
| `motion_sensor_illuminance_battery` | **Motion Sensor with Light Sensor** | Basic PIR + Lux |
| `motion_sensor_pir_battery` | **Basic PIR Motion Sensor** | Simple motion only |
| `motion_sensor_mmwave_battery` | **Smart Motion Sensor (mmWave)** | Advanced radar |
| `radar_motion_sensor_mmwave_battery` | **Radar Presence Sensor** | mmWave detection |

**Buttons (4 variants):**

| Old Name | New Name |
|----------|----------|
| `wireless_switch_1gang_cr2032` | **1-Button Remote** |
| `wireless_switch_2gang_cr2032` | **2-Button Remote** |
| `wireless_switch_3gang_cr2032` | **3-Button Remote** |
| `wireless_switch_4gang_cr2032` | **4-Button Remote** |

**Wall Switches:**

| Old Name | New Name |
|----------|----------|
| `smart_switch_1gang_ac` | **1-Gang Wall Switch** |
| `smart_switch_2gang_ac` | **2-Gang Wall Switch** |
| `smart_switch_3gang_ac` | **3-Gang Wall Switch** |

### Tier 2 - Somewhat Confusing

**Climate Sensors:**

| Old Name | New Name |
|----------|----------|
| `temp_humid_sensor_advanced_battery` | **Temperature & Humidity Sensor (Advanced)** |
| `temp_humid_sensor_dd_battery` | **Temperature & Humidity Sensor (Display)** |
| `temperature_sensor_battery` | **Temperature Sensor** |

**Air Quality:**

| Old Name | New Name |
|----------|----------|
| `air_quality_monitor_ac` | **Air Quality Monitor (AC)** |
| `air_quality_monitor_pro_battery` | **Air Quality Monitor Pro (Battery)** |
| `co2_sensor_battery` | **CO₂ Sensor** |
| `pm25_sensor_battery` | **PM2.5 Air Quality Sensor** |

### Tier 3 - Acceptable

**Contact Sensors:**

| Old Name | New Name |
|----------|----------|
| `door_window_sensor_battery` | **Door/Window Sensor** ✅ Good |
| `water_leak_sensor_battery` | **Water Leak Sensor** ✅ Good |
| `vibration_sensor_battery` | **Vibration Sensor** ✅ Good |

---

## 🎨 VISUAL IMPROVEMENTS

### Current Problem:

- Most drivers use **generic placeholder icons**
- No way to visually differentiate similar devices
- Icons don't match actual product appearance

### Solution:

**1. Product-Specific Icons:**

```
Motion Sensors:
- Basic PIR → Simple PIR icon
- Multi-Sensor → Icon showing motion + lux + temp
- mmWave → Radar wave icon

Buttons:
- 1-Gang → Single button icon
- 2-Gang → Two buttons icon
- 3-Gang → Three buttons icon
- 4-Gang → Four buttons icon
```

**2. Icon Color Coding:**

```
Battery devices → Blue accent
AC powered → Green accent
Multi-function → Purple accent
Pro/Advanced → Gold accent
```

**3. Asset Images:**

Show actual product photos in pairing flow:
- Large image: Real device photo
- Small icon: Simplified representation

---

## 📝 IMPLEMENTATION PLAN

### Phase 1: Critical Renames (This Week)

**Target:** Top 20 most confusing drivers

**Files to modify:**
- `driver.compose.json` → Update "name" field
- Update documentation
- No code changes needed

**Testing:**
- Validate app after renames
- Test pairing flow
- Verify existing devices still work

### Phase 2: Add Device Examples (Next Week)

**Add to driver.compose.json:**

```json
{
  "name": {
    "en": "Multi-Sensor (Motion + Lux + Temp)"
  },
  "learnmode": {
    "instruction": {
      "en": "Press the pairing button for 3-5 seconds until LED flashes. Compatible with: HOBEIAN ZG-204ZL, Tuya multi-sensors."
    }
  }
}
```

### Phase 3: Visual Improvements (Future)

**Assets needed:**
- Product-specific icons (183 drivers)
- Category-based color schemes
- Real device photos for top 50 drivers

**Source photos:**
- AliExpress product listings
- User submissions
- Manufacturer websites

### Phase 4: Driver Consolidation (Future)

**Reduce driver count by creating more generic drivers:**

Example:
```
BEFORE:
- wireless_switch_1gang_cr2032
- wireless_switch_2gang_cr2032
- wireless_switch_3gang_cr2032
- wireless_switch_4gang_cr2032

AFTER:
- wireless_switch_battery (auto-detects 1-4 gang)
```

Benefits:
- Fewer drivers for users to choose from
- Automatic endpoint detection
- Easier maintenance

---

## 🎯 SUCCESS METRICS

### Before (Current State):

**User Experience:**
- ❌ Cam: "Tried 3 times and gave up"
- ❌ Can't find correct driver
- ❌ Technical names confusing

**Support Load:**
- Multiple forum posts asking "which driver?"
- Diagnostic reports for wrong driver
- Users giving up on pairing

### After (Target):

**User Experience:**
- ✅ Clear, product-oriented names
- ✅ Visual differentiation (icons)
- ✅ Device examples in descriptions
- ✅ Find driver in < 30 seconds

**Support Load:**
- ↓ 50% reduction in "which driver?" questions
- ↓ Fewer failed pairing attempts
- ↑ Higher user satisfaction

---

## 📊 COMPARISON: JOHAN'S APP VS OURS

### Johan's Approach (Good UX):

```json
{
  "name": "Tuya Zigbee - Motion Sensor",
  "description": "For Tuya motion sensors",
  "images": {
    "large": "actual_product_photo.png"
  }
}
```

**Why it works:**
- Simple, clear name
- Shows product photo
- Easy to identify

### Our Current Approach (Poor UX):

```json
{
  "name": "Motion Temp Humidity Illumination Multi Battery",
  "description": "",
  "images": {
    "large": "generic_placeholder.svg"
  }
}
```

**Why it fails:**
- Technical capability list
- No visual reference
- User doesn't know what it is

### Our Improved Approach:

```json
{
  "name": "Multi-Sensor (Motion + Lux + Temp)",
  "description": "PIR motion sensor with light level, temperature and humidity. Examples: HOBEIAN ZG-204ZL, Tuya TS0601",
  "images": {
    "large": "hobeian_multisensor.png"
  },
  "learnmode": {
    "instruction": "Press pairing button 3-5 sec until LED flashes"
  }
}
```

**Why it works:**
- Clear product description
- Device examples listed
- Visual reference
- Pairing instructions

---

## ⚡ QUICK WIN: TOP 10 RENAMES

**Do these first for immediate impact:**

1. `motion_temp_humidity_illumination_multi_battery`
   → **Multi-Sensor (Motion + Lux + Temp)**

2. `wireless_switch_4gang_cr2032`
   → **4-Button Remote**

3. `smart_switch_2gang_ac`
   → **2-Gang Wall Switch**

4. `motion_sensor_pir_battery`
   → **Basic PIR Motion Sensor**

5. `temp_humid_sensor_advanced_battery`
   → **Temperature & Humidity Sensor**

6. `bulb_color_rgbcct_ac`
   → **RGB+CCT Smart Bulb**

7. `curtain_motor_battery`
   → **Curtain/Blind Motor (Battery)**

8. `air_quality_monitor_pro_battery`
   → **Air Quality Monitor Pro**

9. `radar_motion_sensor_mmwave_battery`
   → **Smart Presence Sensor (Radar)**

10. `alarm_siren_chime_ac`
    → **Alarm Siren & Chime**

---

## 📋 VALIDATION

### Before Renaming:

```bash
homey app validate --level publish
```

### After Renaming:

```bash
homey app validate --level publish
# Should pass - name changes are safe
```

### Testing:

1. Install app with new names
2. Test device pairing
3. Verify existing devices still work
4. Check flow cards still function
5. Validate all capabilities

---

## ✅ ACTION ITEMS

### Immediate (Today):

- [x] Document UX issues
- [x] Create improvement plan
- [ ] Rename top 10 drivers
- [ ] Test validation
- [ ] Commit changes

### Short Term (This Week):

- [ ] Rename all Tier 1 drivers (20 drivers)
- [ ] Add device examples to descriptions
- [ ] Update README with driver guide
- [ ] Create pairing troubleshooting doc

### Medium Term (Next Week):

- [ ] Create product-specific icons
- [ ] Add real device photos
- [ ] Improve learnmode instructions
- [ ] User testing with forum community

### Long Term (Future):

- [ ] Driver consolidation
- [ ] Auto-detection improvements
- [ ] Visual category system
- [ ] Searchable driver database

---

**Priority:** HIGH  
**Impact:** User satisfaction, reduced support load  
**Effort:** Medium (name changes), High (visual improvements)  
**Status:** Planning → Implementation
