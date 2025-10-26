# Diagnostic Analysis - 835b3359

**Date**: October 26, 2025 @ 13:52 UTC+1  
**Version**: v4.9.51  
**User**: Same French user

---

## 🔍 User Complaints (Translated)

> "Partiels même issue rien remonte et mauvaises configuration le bouton d'allumage usb est inqoue et pas 2 boutons 1 par USB .....  
> Et tout les autres drivers ne sont pas bô 3 et 4 gang sans aller te ni même actionneur de dispo ...  
> Autres problème aussi a corriger car aucun KPI data visible bat"

**Translation**:
- USB outlet: Only 1 button instead of 2 (1 per USB port)
- Other drivers not good: 3 and 4 gang switches without any actuator available  
- Other problem: No KPI data visible (battery)

---

## 🐛 ROOT CAUSE IDENTIFIED

### Problem 1: USB 2-Port Only Shows 1 Button

**File**: `drivers/usb_outlet_2port/device.js`

**Lines 57 and 88** - Code is **COMMENTED OUT**:

```javascript
// Line 57:
// this.registerCapability('onoff', 6, {
  endpoint: 1,
  get: 'onOff',
  // ...
});

// Line 88:
// this.registerCapability('onoff.usb2', 6, {
  endpoint: 2,
  get: 'onOff',
  // ...
});
```

**Result**: Neither port 1 nor port 2 are configured!  
**Why 1 button shows**: Probably from driver.compose.json capabilities, but not functional.

---

### Problem 2: Logs Not Verbose Enough

**Current logs show**:
```
BaseHybridDevice initializing...
[SEARCH] Detecting power source...
PowerSource attribute: mains (type: string)
```

**Missing from logs** (even though in code):
- ═══════════════════ (separator lines)
- 📱 DEVICE IDENTITY
- 🔌 AVAILABLE CLUSTERS PER ENDPOINT
- Detailed cluster information

**Why missing**: 
1. v4.9.51 not yet published to App Store (GitHub Actions still running)
2. User testing on cached/old version
3. Or logs filtered by Homey console

---

### Problem 3: 3-Gang and 4-Gang Switches Not Available

**Not visible in logs** - need to check:
- `drivers/switch_basic_3gang/`
- `drivers/switch_basic_4gang/`
- Probably same issue: `registerCapability` commented out

---

### Problem 4: No KPI Data (Battery)

**Logs show battery IS working**:
```
[BATTERY] Battery: 100% (raw: 200, voltage: 3V, type: CR2032)
[OK] Battery reporting configured
```

**But** user says not visible. Possible reasons:
1. measure_battery capability not added to device
2. Capability hidden in UI
3. Battery only for battery devices (USB outlet is AC powered)

---

## ✅ What IS Working

From logs (button_wireless_4 and button_wireless_3):
```
BaseHybridDevice initializing...
PowerSource attribute: battery (type: string)
[OK] Detected: Battery Power
[OK] Intelligent detection: CR2032 (voltage: 3V)
Battery: 100% (raw: 200, voltage: 3V, type: CR2032)
[OK] Button detection configured for 4 button(s)
Button4GangDevice initialized - 4 buttons ready
```

**Buttons ARE working correctly!**

---

## 🔧 Fixes Required

### Fix 1: Un-comment USB Port Registration

**File**: `drivers/usb_outlet_2port/device.js`

Lines 53-78 and 83-109 need to be **UN-COMMENTED**:

```javascript
// WRONG (current):
// this.registerCapability('onoff', 6, {

// CORRECT (should be):
this.registerCapability('onoff', CLUSTER.ON_OFF, {
```

### Fix 2: Add MUCH MORE Verbose Logging

Need to add logs for:
- **Every step** of device initialization
- **Every capability** being registered
- **Every cluster** being configured
- **Every endpoint** being checked
- **Raw Zigbee data** received

### Fix 3: Check 3-Gang and 4-Gang Drivers

Verify and fix:
- `switch_basic_3gang/device.js`
- `switch_basic_4gang/device.js`
- Likely same commented code issue

### Fix 4: KPI Data for AC Devices

Add measure_power, measure_voltage, measure_current capabilities where available.

---

## 📊 Verification Needed

User needs to test with **FRESH v4.9.52** that will include:
1. ✅ Un-commented registerCapability calls
2. ✅ Ultra-verbose logging (every step)
3. ✅ Proper multi-endpoint configuration
4. ✅ All gang counts working

---

## 🎯 Next Steps

1. **Create v4.9.52** with:
   - Un-comment all registerCapability
   - Add EXTREME verbosity in logs
   - Fix USB 2-port
   - Fix 3-gang, 4-gang switches

2. **Test locally** if possible

3. **Push immediately**

4. **User tests** with full verbose logs

---

**Priority**: 🔴 CRITICAL - Code is broken (commented out)  
**Impact**: All multi-endpoint devices broken  
**ETA Fix**: v4.9.52 in ~20 minutes
