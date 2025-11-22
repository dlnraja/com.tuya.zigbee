# Analyse Complète - GitHub Issues #1267 & #1268

**Date:** 2025-10-13  
**Sources:** JohanBendz/com.tuya.zigbee Issues

---

## 📋 ISSUE #1267 - HOBEIAN ZG-204ZL (PIR + Lux Sensor)

### Device Information

**Source:** https://github.com/JohanBendz/com.tuya.zigbee/issues/1267

| Property | Value |
|----------|-------|
| **Device Name** | PIR Sensor ZG-204Z(L with light sensor) |
| **Model ID** | ZG-204ZL |
| **Manufacturer** | HOBEIAN |
| **Type** | Motion sensor with illuminance |
| **Link** | https://www.aliexpress.com/item/1005006918768626.html |

### Zigbee Interview Data

```json
{
  "manufacturerName": "HOBEIAN",
  "modelId": "ZG-204ZL",
  "endpoints": {
    "1": {
      "inputClusters": [0, 3, 1280, 1, 1024],
      "outputClusters": []
    }
  }
}
```

### Clusters Analysis

| Cluster ID | Name | Purpose |
|------------|------|---------|
| 0 | basic | Device information |
| 1 | powerConfiguration | Battery reporting |
| 3 | identify | Device identification |
| 1024 | illuminanceMeasurement | **Light level (lux)** |
| 1280 | iasZone | **Motion detection** |

### Capabilities Required

- ✅ `alarm_motion` - IAS Zone motion detection
- ✅ `measure_battery` - Battery percentage
- ✅ `measure_luminance` - **Illuminance (lux)**

### Battery Information

- **Type:** Battery powered (source: "battery")
- **Voltage:** 30 (3.0V)
- **Percentage:** 200 → 100% (Zigbee format 0-200)

### Current Driver Status

**Driver:** `motion_temp_humidity_illumination_multi_battery`

**Existing Support:**
- ✅ HOBEIAN manufacturer already in list
- ✅ ZG-204ZV (variant without "L") already supported
- ❌ **ZG-204ZL NOT in productId array**

**Missing:**
```json
"productId": [
  "TS0601",
  "ZG-204ZV",
  "ZG-204ZL"  // ← MISSING
]
```

### Fix Required

**Action:** Add `"ZG-204ZL"` to productId array

**Impact:** Users with ZG-204ZL variant can now pair the device

---

## 📋 ISSUE #1268 - Smart Button TS0041 (4-Gang)

### Device Information

**Source:** https://github.com/JohanBendz/com.tuya.zigbee/issues/1268

| Property | Value |
|----------|-------|
| **Device Name** | Zigbee Smart Button TS0041 |
| **Model ID** | TS0041 |
| **Manufacturer** | _TZ3000_5bpeda8u |
| **Type** | 4-gang wireless button |
| **Link** | https://www.aliexpress.com/item/1005008942665186.html |

### Zigbee Interview Data

```json
{
  "manufacturerName": "_TZ3000_5bpeda8u",
  "modelId": "TS0041",
  "endpoints": {
    "1": {
      "inputClusters": [1, 6, 57344, 0],
      "outputClusters": [25, 10]
    },
    "2": {
      "inputClusters": [6, 1, 6],
      "outputClusters": []
    },
    "3": {
      "inputClusters": [6, 1, 6],
      "outputClusters": []
    },
    "4": {
      "inputClusters": [6, 1, 6],
      "outputClusters": []
    }
  }
}
```

### Multi-Endpoint Structure

**CRITICAL:** This device has **4 ENDPOINTS** (not 1!)

| Endpoint | Clusters | Purpose |
|----------|----------|---------|
| **1** | 0, 1, 6, 57344 | Button 1 + Battery + Basic |
| **2** | 1, 6 | Button 2 + Battery |
| **3** | 1, 6 | Button 3 + Battery |
| **4** | 1, 6 | Button 4 + Battery |

### Clusters Analysis

| Cluster ID | Name | Purpose |
|------------|------|---------|
| 0 | basic | Device information |
| 1 | powerConfiguration | Battery reporting |
| 6 | onOff | **Button press events** |
| 57344 | (custom) | Tuya specific |
| 25 | ota | Firmware updates |
| 10 | time | Time sync |

### Current Driver Status

**Driver:** `wireless_switch_4gang_cr2032`

**Existing Support:**
- ✅ TS0041 already in productId array
- ❌ **_TZ3000_5bpeda8u NOT in manufacturerName array**
- ❌ **ONLY 1 ENDPOINT DEFINED** (should have 4!)

**Critical Issues:**

1. **Missing Manufacturer ID:**
```json
"manufacturerName": [
  // ... many IDs ...
  "_TZ3000_5bpeda8u"  // ← MISSING
]
```

2. **Incorrect Endpoints:**
```json
// CURRENT (WRONG):
"endpoints": {
  "1": {
    "clusters": [0, 4, 5, 6, 8]
  }
}

// SHOULD BE (CORRECT):
"endpoints": {
  "1": {
    "clusters": [0, 1, 6, 57344],
    "bindings": [1]
  },
  "2": {
    "clusters": [1, 6]
  },
  "3": {
    "clusters": [1, 6]
  },
  "4": {
    "clusters": [1, 6]
  }
}
```

### Fix Required

**Actions:**
1. Add `"_TZ3000_5bpeda8u"` to manufacturerName array
2. **CRITICAL:** Fix endpoints to match 4-gang structure
3. Remove incorrect clusters (4, 5, 8 not present in interview)
4. Add cluster 57344 (Tuya custom cluster)

---

## 🔍 ROOT CAUSE ANALYSIS

### Common Pattern: Multi-Gang Endpoint Misconfiguration

**Reference:** Memory `c001af1c-e8ef-498e-8427-0808cd8a7711`

> **PROBLÈME PERSISTANT IDENTIFIÉ:**
> Les drivers smart_switch_Xgang nécessitent des endpoints multiples correctement configurés:
> - 1gang: endpoint "1" seulement
> - 2gang: endpoints "1" ET "2"
> - 3gang: endpoints "1", "2" ET "3"
> - **4gang: endpoints "1", "2", "3" ET "4"** ← Applicable ici!

### Why This Matters

**Without correct endpoints:**
- ❌ Only button 1 works
- ❌ Buttons 2, 3, 4 don't trigger
- ❌ Device appears partially functional
- ❌ User confusion and frustration

**With correct endpoints:**
- ✅ All 4 buttons trigger correctly
- ✅ Individual button press detection
- ✅ Flow cards work for each button
- ✅ Full device functionality

---

## 🛠 DETAILED FIXES

### Fix #1: motion_temp_humidity_illumination_multi_battery

**File:** `drivers/motion_temp_humidity_illumination_multi_battery/driver.compose.json`

**Change:**
```json
"productId": [
  "TS0601",
  "ZG-204ZV",
  "ZG-204ZL"  // ← ADD THIS LINE
]
```

**Impact:**
- ✅ HOBEIAN ZG-204ZL now pairs correctly
- ✅ Motion detection works
- ✅ **Illuminance sensor works** (key differentiator from ZG-204Z)
- ✅ Battery reporting works
- ✅ Temperature & humidity work (if supported)

**Testing:**
- Pair device
- Test motion → `alarm_motion` should trigger
- Check lux reading → `measure_luminance` should show values
- Verify battery → `measure_battery` should show percentage

---

### Fix #2: wireless_switch_4gang_cr2032

**File:** `drivers/wireless_switch_4gang_cr2032/driver.compose.json`

**Change 1 - Add Manufacturer:**
```json
"manufacturerName": [
  // ... existing IDs ...
  "_TZ3000_5bpeda8u"  // ← ADD THIS
]
```

**Change 2 - Fix Endpoints (CRITICAL):**
```json
"endpoints": {
  "1": {
    "clusters": [0, 1, 6, 57344],
    "bindings": [1]
  },
  "2": {
    "clusters": [1, 6]
  },
  "3": {
    "clusters": [1, 6]
  },
  "4": {
    "clusters": [1, 6]
  }
}
```

**Explanation:**
- **Endpoint 1:** Main endpoint with basic, power, onOff, Tuya custom
- **Endpoints 2-4:** Secondary buttons with power + onOff only
- **Bindings:** Only on endpoint 1 for battery reporting

**Impact:**
- ✅ All 4 buttons now functional
- ✅ _TZ3000_5bpeda8u devices now pair
- ✅ Individual button press detection
- ✅ Battery reporting from endpoint 1
- ✅ Flow cards can differentiate button presses

**Testing:**
- Pair device
- Press button 1 → Should trigger
- Press button 2 → Should trigger
- Press button 3 → Should trigger  
- Press button 4 → Should trigger
- Create flow with button-specific triggers

---

## 📊 COMPARISON: Before vs After

### ZG-204ZL Support

| Aspect | Before | After |
|--------|--------|-------|
| HOBEIAN | ✅ Supported | ✅ Supported |
| ZG-204ZV | ✅ Supported | ✅ Supported |
| **ZG-204ZL** | ❌ **NOT supported** | ✅ **Supported** |
| Motion | ✅ Works | ✅ Works |
| Illuminance | ⚠️ Not available | ✅ **Works** |
| Battery | ✅ Works | ✅ Works |

### TS0041 _TZ3000_5bpeda8u Support

| Aspect | Before | After |
|--------|--------|-------|
| TS0041 (generic) | ✅ Supported | ✅ Supported |
| **_TZ3000_5bpeda8u** | ❌ **NOT supported** | ✅ **Supported** |
| Button 1 | ⚠️ Partial | ✅ **Full functionality** |
| Button 2 | ❌ Doesn't work | ✅ **Works** |
| Button 3 | ❌ Doesn't work | ✅ **Works** |
| Button 4 | ❌ Doesn't work | ✅ **Works** |
| Endpoints | ❌ Only 1 | ✅ **All 4** |
| Battery | ✅ Works | ✅ Works |

---

## 🎯 COMMUNITY IMPACT

### Users Affected

**ZG-204ZL:**
- GitHub Issue #1267 submitter
- Other users with "L" variant (with lux sensor)
- AliExpress buyers (item 1005006918768626)

**TS0041 _TZ3000_5bpeda8u:**
- GitHub Issue #1268 submitter
- Other users with this manufacturer variant
- AliExpress buyers (item 1005008942665186)

### Expected Feedback

**Positive:**
- "Finally works with all 4 buttons!"
- "Lux sensor now showing values"
- "Exactly what I needed"

**Potential Issues:**
- Need to re-pair device after update
- Flow cards may need recreation

---

## 📝 COMMIT MESSAGE

```
v2.15.54 - GitHub Issues #1267 & #1268: Add ZG-204ZL + Fix TS0041 4-Gang

GITHUB ISSUES RESOLVED:
✅ #1267: HOBEIAN ZG-204ZL PIR sensor with lux
✅ #1268: _TZ3000_5bpeda8u TS0041 4-gang button

FIX #1: motion_temp_humidity_illumination_multi_battery
- Added "ZG-204ZL" to productId array
- Enables lux variant of ZG-204Z to pair
- Illuminance sensor now functional

FIX #2: wireless_switch_4gang_cr2032 (CRITICAL ENDPOINT FIX)
- Added "_TZ3000_5bpeda8u" to manufacturerName
- CORRECTED endpoints: 1 → 4 endpoints (was only 1!)
- Fixed cluster configuration per endpoint
- Removed incorrect clusters (4, 5, 8)
- Added Tuya cluster 57344 on endpoint 1

ENDPOINTS STRUCTURE (4-Gang):
- Endpoint 1: [0, 1, 6, 57344] - Main button + battery + basic
- Endpoint 2: [1, 6] - Button 2
- Endpoint 3: [1, 6] - Button 3  
- Endpoint 4: [1, 6] - Button 4

USER IMPACT:
- ZG-204ZL users can now pair and use lux sensor
- TS0041 users now have ALL 4 buttons working
- Matches Johan Bendz repository issue requests

REFERENCE:
- Memory c001af1c: Multi-gang endpoint best practices
- AliExpress: 1005006918768626 (ZG-204ZL)
- AliExpress: 1005008942665186 (TS0041)
```

---

## ✅ VALIDATION CHECKLIST

Before commit:

- [ ] ZG-204ZL added to productId
- [ ] _TZ3000_5bpeda8u added to manufacturerName
- [ ] Endpoints corrected to 4-gang structure
- [ ] Clusters match interview data
- [ ] Battery type correct (CR2032)
- [ ] Cache cleaned (.homeybuild, .homeycompose)
- [ ] Validation passes: `homey app validate --level publish`
- [ ] Device class correct (sensor for #1267, button for #1268)

---

## 🔗 RÉFÉRENCES

**GitHub Issues:**
- #1267: https://github.com/JohanBendz/com.tuya.zigbee/issues/1267
- #1268: https://github.com/JohanBendz/com.tuya.zigbee/issues/1268

**Forum:**
- https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352

**Memory Reference:**
- c001af1c: Multi-gang endpoint configuration patterns

---

**Date:** 2025-10-13  
**Status:** ✅ Analysis Complete - Ready for Implementation
