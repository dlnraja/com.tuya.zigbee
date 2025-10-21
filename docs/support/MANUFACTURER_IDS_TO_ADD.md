# Manufacturer IDs to Add - Ian Gibbo Interview Data

**Source:** Community interview (Ian Gibbo)  
**Date:** Oct 17, 2025  
**Status:** Pending implementation

---

## ✅ Already Supported

### HOBEIAN (ZG-204ZV Motion Sensor)
- **Manufacturer:** `HOBEIAN`
- **Model:** `ZG-204ZV`
- **Current Driver:** `motion_sensor_illuminance_battery`
- **Status:** ✅ Already included
- **Location:** `drivers/motion_sensor_illuminance_battery/driver.compose.json` line 32
- **Action:** None needed

---

## ❌ Missing Manufacturer IDs - Need to Add

### 1. _TZ3000_h1ipgkwn (TS0002 2-Gang Switch)

**Device Info:**
- **Manufacturer:** `_TZ3000_h1ipgkwn` ⭐ NEW
- **Model:** `TS0002`
- **Type:** 2-gang AC switch (router)
- **IEEE:** `a4:c1:38:fe:3d:c3:0f:75`
- **Power:** AC powered
- **Features:** onOff, metering, electricalMeasurement

**Proposed Driver:** `switch_2gang_ac`

**Action Required:**
```json
Add to drivers/switch_2gang_ac/driver.compose.json:
"_TZ3000_h1ipgkwn"
```

**Priority:** 🟡 Medium (user has working device, just ensuring coverage)

---

### 2. _TZE284_1lvln0x6 (TS0601 Battery Device)

**Device Info:**
- **Manufacturer:** `_TZE284_1lvln0x6` ⭐ NEW
- **Model:** `TS0601`
- **Type:** Unknown (battery-powered, Tuya cluster)
- **IEEE:** `a4:c1:38:ca:5b:2b:86:a1`
- **Power:** Battery
- **Clusters:** Basic, groups, scenes, Tuya proprietary (60672)

**Challenge:** TS0601 is a "catch-all" model ID used for many different Tuya devices.

**Investigation Needed:**
1. What type of device is this? (sensor? button? thermostat?)
2. Which TS0601 driver should it use?
3. Does it need special Tuya cluster parsing?

**Possible Drivers:**
- `temp_sensor_pro_battery` (if temp sensor)
- `motion_sensor_*` (if motion sensor)
- `wireless_button_*` (if button/scene controller)
- Custom TS0601 driver?

**Action Required:**
1. ❓ Request user clarification: What device is this?
2. 🔍 Check Tuya cluster data point mappings
3. ➕ Add to appropriate driver once identified

**Priority:** 🔴 High (unknown device type, may not work at all)

---

### 3. _TZ3000_zmlunnhy (TS0012 Battery Switch - UNUSUAL!)

**Device Info:**
- **Manufacturer:** `_TZ3000_zmlunnhy` ⭐ NEW
- **Model:** `TS0012`
- **Type:** 2-gang switch (but battery-powered! ⚠️)
- **IEEE:** `a4:c1:38:b6:32:39:b9:a0`
- **Power:** Battery (unusual for TS0012!)
- **Clusters:** onOff, groups, scenes

**Analysis:**
- TS0012 is normally AC-powered switch
- This variant reports as battery-powered (enddevice, receiveWhenIdle: false)
- Likely a **wireless scene controller** misidentified as switch
- OR a battery-powered relay module (rare)

**Proposed Drivers (need to determine correct one):**
1. **Most Likely:** `wireless_button_2gang_battery` or `wireless_switch_2gang_cr2032`
   - Battery-powered
   - 2-gang button control
   - Scene/switch triggering
2. **Less Likely:** `switch_2gang_battery` (if it's actually a battery relay)

**Investigation Needed:**
1. How does user use this device?
2. Does it control other devices or act as a trigger?
3. Does it have actual relay switching or just sends commands?

**Action Required:**
1. ❓ Request user clarification: Is this a wireless button or actual switch?
2. 🔍 Check endpoint behavior (scenes vs. onOff)
3. ➕ Add to correct battery-powered driver

**Priority:** 🟡 Medium (working but may be in wrong driver category)

---

## ⏸️ Excluded (Not Tuya)

### Philips Hue LOM003
- **Manufacturer:** `Signify Netherlands B.V.`
- **Model:** `LOM003`
- **Status:** Not a Tuya device
- **Action:** None - has dedicated Philips app by Johan Bendz
- **Priority:** N/A

---

## 📊 Summary

| Manufacturer ID | Model | Device Type | Status | Priority |
|----------------|-------|-------------|--------|----------|
| `_TZ3000_h1ipgkwn` | TS0002 | 2-gang AC switch | ❌ Missing | 🟡 Medium |
| `_TZE284_1lvln0x6` | TS0601 | Unknown (battery) | ❌ Missing | 🔴 High |
| `_TZ3000_zmlunnhy` | TS0012 | Battery switch/button | ❌ Missing | 🟡 Medium |
| `HOBEIAN` | ZG-204ZV | Motion sensor | ✅ Present | N/A |

**Total New IDs:** 3  
**Clarification Needed:** 2 (TS0601 and TS0012 battery variant)  
**Ready to Add:** 1 (TS0002 switch)

---

## 🚀 Next Steps

### Immediate Action
1. ✅ Add `_TZ3000_h1ipgkwn` to `switch_2gang_ac`

### Requires User Clarification
1. ❓ Email Ian Gibbo:
   - What is the TS0601 device? (temp sensor? motion? button?)
   - What is the TS0012 battery device used for? (button or actual switch?)
   - Can he provide device photos or product links?

### After Clarification
1. 🔍 Map TS0601 to correct driver
2. 🔍 Map TS0012 battery variant to correct driver
3. ➕ Add manufacturer IDs
4. 🧪 Test if possible
5. 📝 Release patch version

---

**Last Updated:** Oct 17, 2025 @ 06:56
