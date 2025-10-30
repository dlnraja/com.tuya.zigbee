# 🔴 CRASH: IAS Zone Enrollment Race Condition

**Status:** 🔧 In Progress  
**Priority:** HIGH (6 crashes, dernière il y a 18 min)  
**Homey Version:** 12.8.0  
**App Version:** v3.0.23-3.0.35

---

## 📊 Crash Details

**Error Message:**
```
Error: Zigbee is aan het opstarten. Wacht even en probeer het opnieuw.
(Translation: Zigbee is starting up. Wait and try again.)
```

**Stack Trace:**
```javascript
IASZoneEnroller.enroll() [line 316]
  → setupZoneEnrollListener() [line 76]
    → IASZoneCluster.zoneEnrollResponse()
      → ZigBeeNode.sendFrame()
        ❌ ERROR: Zigbee not ready yet
```

**Affected Devices:**
- `sos_emergency_button_cr2032` (confirmed)
- Likely ALL IAS Zone devices (motion sensors, contact sensors, etc.)

**Occurrences:** 6 crashes in last 5 hours
- 18 minutes ago (manual: ⨯)
- 4 hours ago (manual: ✓) × 3
- 5 hours ago (manual: ⨯)
- 5 hours ago (manual: ✓)

---

## 🔍 Root Cause

### Problem
`IASZoneEnroller.js` lines 73-79 sends a **proactive** Zone Enroll Response immediately when `setupZoneEnrollListener()` is called:

```javascript
// Line 73-79 in IASZoneEnroller.js
this.log('📤 Sending proactive Zone Enroll Response (official fallback)...');

try {
  this.endpoint.clusters.iasZone.zoneEnrollResponse({
    enrollResponseCode: 0, // Success
    zoneId: this.options.zoneId || 10
  });
  // ...
} catch (err) {
  this.log('⚠️ Proactive response failed (normal if device not ready):', err.message);
}
```

### Race Condition
**Timeline:**
1. Homey starts/restarts
2. App initializes → `onNodeInit()` called for all devices
3. IAS Zone devices → `enroller.enroll()` called **immediately**
4. `setupZoneEnrollListener()` → `zoneEnrollResponse()` sent
5. **BUT** Zigbee subsystem not fully initialized yet
6. ❌ CRASH: "Zigbee is starting up"

### Why It Happens
- **Official Homey SDK pattern:** "driver could send Zone Enroll Response when initializing regardless of having received the Zone Enroll Request"
- **Intent:** Proactive enrollment for devices that may have missed the request
- **Issue:** No guard against Zigbee not being ready

---

## 🔧 Fix Options

### Option 1: Add Retry with Exponential Backoff (RECOMMENDED)

```javascript
// In IASZoneEnroller.js, line 73-86
async sendProactiveEnrollResponse(maxRetries = 3, initialDelay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await this.endpoint.clusters.iasZone.zoneEnrollResponse({
        enrollResponseCode: 0,
        zoneId: this.options.zoneId || 10
      });
      this.log(`✅ Proactive Zone Enroll Response sent (attempt ${attempt})`);
      this.enrolled = true;
      this.enrollmentMethod = 'proactive-enroll-response';
      return true;
    } catch (err) {
      if (err.message.includes('opstarten') || err.message.includes('starting')) {
        // Zigbee not ready yet
        const delay = initialDelay * Math.pow(2, attempt - 1); // Exponential backoff
        this.log(`⏳ Zigbee not ready, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Other error, don't retry
        this.log(`⚠️ Proactive response failed:`, err.message);
        break;
      }
    }
  }
  return false;
}

// Then in setupZoneEnrollListener(), line 73:
await this.sendProactiveEnrollResponse();
```

**Pros:** Robust, handles startup race condition  
**Cons:** Adds complexity

---

### Option 2: Simple Delay Before Enrollment

```javascript
// In device.js onNodeInit(), line 36:
// Wait for Zigbee to be fully ready
await new Promise(resolve => setTimeout(resolve, 3000));

const method = await enroller.enroll(zclNode);
```

**Pros:** Simple, one-line fix  
**Cons:** Fixed delay may be too short or too long

---

### Option 3: Wrap in try-catch + Log (CURRENT - INSUFFICIENT)

**Current code already has try-catch** (lines 75-86), but:
- ❌ Still throws error to Homey (crashes)
- ❌ No retry mechanism
- ❌ Device may not enroll properly

**Not sufficient** - need proactive fix.

---

## 🚀 CORRECT Fix (Per Homey Official Docs)

### Remove Proactive Response Call

**Official Homey Documentation:**
> "Avoid initiating communication with the node in onInit or onNodeInit. Zigbee may not be ready during initialization."

**IAS Zone Enrollment (Correct Method):**
```javascript
// Homey SDK Example - LISTENER ONLY
zclNode.endpoints[1].clusters.iasZone.onZoneEnrollRequest = () => {
  zclNode.endpoints[1].clusters.iasZone.zoneEnrollResponse({
    enrollResponseCode: 0, // Success
    zoneId: 10,
  });
};
```

### Applied Fix

```javascript
// IASZoneEnroller.js, line 70-74 (AFTER FIX)
// NOTE: We do NOT send proactive response here as per Homey best practices
// "Avoid initiating communication with the node in onInit or onNodeInit"
// The listener above will handle the request when the device sends it
this.log('✅ Zone Enroll listener configured, waiting for device request...');
return true;
```

**What Was Removed:**
```javascript
// ❌ REMOVED - This was causing the crash
try {
  await this.endpoint.clusters.iasZone.zoneEnrollResponse({
    enrollResponseCode: 0,
    zoneId: this.options.zoneId || 10
  });
  // ... enrollment logic
} catch (err) {
  // Error: Zigbee is starting up ← CRASH HERE
}
```

**Benefits:**
- ✅ Follows official Homey SDK best practices
- ✅ No Zigbee commands during `onNodeInit` (prevents crash)
- ✅ Simpler code (listener-only approach)
- ✅ Device enrollment happens when device requests (not forced)

---

## 🧪 Testing Plan

1. **Reproduce:**
   - Restart Homey with IAS Zone devices paired
   - Check crash logs

2. **Verify Fix:**
   - Apply delay in `enroll()`
   - Restart Homey
   - Confirm no crashes
   - Confirm devices still enroll successfully

3. **Regression Test:**
   - Test new device pairing (IAS Zone)
   - Test existing device reconnection
   - Test multiple devices simultaneously

4. **Monitor:**
   - Check crash logs for 24-48h after release
   - Track enrollment success rate

---

## 📝 Implementation Checklist

- [x] Remove proactive `zoneEnrollResponse()` call from `setupZoneEnrollListener()`
- [x] Keep only the `onZoneEnrollRequest` listener (per Homey SDK docs)
- [x] Update `CHANGELOG.md` with correct fix explanation
- [ ] Test with `sos_emergency_button_cr2032`
- [ ] Test with motion sensor (`motion_sensor_battery`)
- [ ] Test with contact sensor (`door_window_sensor_battery`)
- [ ] Release as patch version (v3.0.37)
- [ ] Monitor crash logs post-release (expect 0 crashes)

---

## 📊 Impact Assessment

**Current:**
- 6 crashes in 5 hours
- Affects IAS Zone enrollment (critical functionality)
- Poor user experience (devices may not work)

**After Fix:**
- Zero crashes expected
- Enrollment success rate unchanged or improved
- Users see devices working immediately after pairing

---

**Date Created:** Oct 17, 2025 @ 02:00  
**Last Updated:** Oct 17, 2025 @ 02:00  
**Fix Status:** Ready to implement
