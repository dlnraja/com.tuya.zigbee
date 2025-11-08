# DECISION LOG - Universal Tuya Zigbee App

Track of major development decisions and their rationale.

---

## **DEC-008: Archiving Mega-Prompt V2 (Device Helpers)**

**Date:** Nov 8, 2025 12:35am  
**Decision:** Archive user's comprehensive mega-prompt instead of implementing immediately  
**Status:** ✅ Decided

### **Context:**

User provided detailed mega-prompt with:
- `lib/device_helpers.js` (detectMultiGang, safeAddCapability, mapPresenceFallback)
- Driver init patches
- Migration error handling
- Auto-issue creation scripts
- Enhanced CI/CD workflow
- Test fixtures

### **Reason for Archiving:**

**4 versions released in 2 days:**
```
v4.9.305 (Nov 7, 10pm): Fix app crash
v4.9.306 (Nov 7, 11pm): Fix manufacturer/model
v4.9.307 (Nov 7, 11:30pm): Fix Smart-Adapt safety
v4.9.308 (Nov 8, 12:30am): Fix Tuya DP + multi-gang
```

**Core problems already solved in v4.9.308:**
- ✅ Tuya DP detection (TS0601 / _TZE*)
- ✅ Multi-gang detection for all switches
- ✅ Protected driver list
- ✅ Confidence threshold 95%+
- ✅ Safety checks (sensor→switch prevention)

**Proposed helpers are nice-to-have, not critical:**
- Device helpers useful but not urgent
- Error handling improvements can wait
- Auto-issue creation is over-engineering at this stage
- Need to validate v4.9.308 first (24-48h)

### **Decision:**

1. **ARCHIVE** complete mega-prompt in `docs/MEGA_PROMPT_V2_DEVICE_HELPERS.md`
2. **PUBLISH** v4.9.308 now
3. **WAIT** 24-48h for user feedback
4. **DECIDE** implementation based on feedback:
   - ✅ If positive: Implement Priority 1 scripts only
   - ⚠️ If issues: Targeted fix first, then helpers

### **Implementation Priority (IF NEEDED):**

**Priority 1: Simple scripts (safe to add)**
- ✅ `scripts/generate_capability_map.js`
- ✅ `scripts/scan_history.sh` (already done)
- ✅ `scripts/version_summary.js` (already done)
- ⏳ `scripts/generate_timeline_report.js`

**Priority 2: Error handling (after validation)**
- ⏳ `safeAddCapability()` wrapper
- ⏳ Migration error handling
- ⏳ Raw dump on failure

**Priority 3: Advanced features (Phase 3)**
- ⏳ `lib/device_helpers.js` complete
- ⏳ `mapPresenceFallback()`
- ⏳ Auto-issue creation
- ⏳ Integration test fixtures

### **Alternatives Considered:**

**Option A: Implement everything now** ❌
- Risk: Too many changes at once
- Risk: Cannot isolate bugs if problems occur
- Risk: User feedback not yet validated

**Option B: Implement helpers incrementally** ⏳
- Pro: Gradual validation
- Pro: Can stop if issues found
- Con: Takes longer
- Decision: This is the chosen approach

**Option C: Archive and never implement** ❌
- Pro: Simplicity
- Con: Useful features lost
- Con: User provided good ideas

**CHOSEN: Option B (Incremental)** ✅
- Archive now
- Implement Priority 1 after feedback
- Gradual rollout of Priority 2-3

### **Success Criteria:**

**v4.9.308 considered successful if:**
- ✅ No reports of climate sensors → switches
- ✅ No reports of battery KPI missing
- ✅ TS0002/TS0003 detected as multi-gang
- ✅ Tuya DP devices preserved
- ✅ No new crashes

**Priority 1 scripts can be added if:**
- ✅ v4.9.308 validated (24-48h)
- ✅ No critical issues reported
- ✅ Scripts are simple/safe (no driver changes)

**Priority 2-3 features only if:**
- ✅ v4.9.308 validated
- ✅ Priority 1 validated
- ✅ User feedback shows need
- ✅ No regressions

### **References:**

- Mega-Prompt V2: `docs/MEGA_PROMPT_V2_DEVICE_HELPERS.md`
- User message: Nov 8, 2025 12:22am
- Log ID: 7d3eaaf0-d947-4a72-a202-945647fd7ad7

---

## **DEC-007: Tuya DP Detection (v4.9.308)**

**Date:** Nov 8, 2025 12:20am  
**Decision:** Add Tuya DP device detection BEFORE cluster analysis  
**Status:** ✅ Implemented in v4.9.308

### **Problem:**

Tuya DP devices (TS0601 / _TZE*) use cluster 0xEF00 which is:
- NOT visible in standard Zigbee cluster enumeration
- All sensors/KPIs are via DP protocol
- Cluster analysis shows ONLY basic + onOff
- Smart-Adapt thinks: "I see onOff → it's a switch!"
- Result: Wrong device type, wrong power source, wrong capabilities

### **Solution:**

```javascript
// BEFORE cluster analysis
if (modelId === 'TS0601' || manufacturer.startsWith('_TZE')) {
  analysis.isTuyaDP = true;
  analysis.confidence = 0.0; // Prevent adaptation
  // Infer device type from CURRENT DRIVER NAME
  // Skip cluster analysis entirely
  return analysis;
}
```

### **Rationale:**

- Cluster 0xEF00 limitation cannot be fixed (Zigbee protocol issue)
- Current driver name is MORE reliable than cluster analysis for Tuya DP
- Forcing confidence to 0.0 prevents all adaptations
- Early return avoids wrong analysis logs

### **Impact:**

- ✅ climate_sensor_soil preserved
- ✅ climate_monitor preserved
- ✅ presence_sensor_radar preserved
- ✅ Battery KPI will report correctly
- ✅ Clear logs explaining Tuya DP limitation

---

## **DEC-006: Multi-Gang Detection for Regular Switches (v4.9.308)**

**Date:** Nov 8, 2025 12:25am  
**Decision:** Extend multi-gang detection to ALL switches, not just USB outlets  
**Status:** ✅ Implemented in v4.9.308

### **Problem:**

TS0002 (2-gang switch) was detected as 1-gang because:
- Multi-gang detection only for USB outlets
- Regular switches ignored
- Users manually select wrong driver

### **Solution:**

```javascript
// After switch/outlet detection
const endpointCount = Object.keys(deviceInfo.endpoints).length;
const hasMultipleOnOffEndpoints = ...;

if (hasMultipleOnOffEndpoints || endpointCount >= 2) {
  analysis.subType = '2gang';
  this.log('Multi-gang switch detected');
  this.log('Should use switch_basic_2gang driver');
}
```

### **Rationale:**

- Endpoint counting is simple and reliable
- Works for TS0002, TS0003, TS0004
- Suggests correct driver to user
- No risk (detection only, no adaptation)

### **Impact:**

- ✅ TS0002 → Detected as 2-gang
- ✅ TS0003 → Detected as 3-gang
- ✅ TS0004 → Detected as 4-gang
- ✅ Users can re-pair to correct driver

---

## **DEC-005: Protected Driver Whitelist (v4.9.307)**

**Date:** Nov 7, 2025 11:30pm  
**Decision:** Add protected driver whitelist to prevent Smart-Adapt from being over-aggressive  
**Status:** ✅ Implemented in v4.9.307

### **Problem:**

climate_sensor_soil was transformed into switch because:
- Tuya DP cluster (0xEF00) not visible
- Smart-Adapt only saw basic + onOff clusters
- Confidence 90% → Adapted
- Result: Battery capability removed, device broken

### **Solution:**

```javascript
const PROTECTED_DRIVERS = [
  'climate_sensor_soil',
  'climate_sensor_temp_humidity',
  'climate_monitor_temp_humidity',
  'presence_sensor_radar',
  'presence_sensor_pir',
  'thermostat_climate'
];

if (isProtected) {
  skipReason = 'Driver is in protected list';
  canAdapt = false;
}
```

### **Rationale:**

- Sensor/monitor drivers should NEVER become switches
- Whitelist approach is simple and safe
- Can be extended easily
- No false positives

### **Impact:**

- ✅ Soil sensors preserved
- ✅ Climate monitors preserved
- ✅ Presence sensors preserved
- ✅ No destructive adaptations

---

## **DEC-004: Confidence Threshold 95% (v4.9.307)**

**Date:** Nov 7, 2025 11:30pm  
**Decision:** Raise confidence threshold from 90% to 95% for auto-adaptation  
**Status:** ✅ Implemented in v4.9.307

### **Reason:**

- 90% caused false positives
- Tuya DP devices showed 90% confidence for wrong type
- Conservative approach is safer
- User can manually change driver if needed

---

## **DEC-003: Sensor/Monitor Protection (v4.9.307)**

**Date:** Nov 7, 2025 11:30pm  
**Decision:** Add explicit check to prevent sensor/monitor → switch transformation  
**Status:** ✅ Implemented in v4.9.307

### **Reason:**

```javascript
if (isSensorOrMonitor && clusterAnalysis.deviceType === 'switch') {
  this.log('SAFETY: Sensor/Monitor cannot become Switch!');
  this.log('This is a FALSE POSITIVE');
  this.log('Reason: Tuya DP devices show only basic+onOff clusters');
  canAdapt = false;
}
```

---

## **DEC-002: Manufacturer/Model Reading Fix (v4.9.306)**

**Date:** Nov 7, 2025 11:00pm  
**Decision:** Fix Promise.resolve() syntax error and add proper error handling  
**Status:** ✅ Implemented in v4.9.306

### **Problem:**

```javascript
// WRONG
Promise.resolve(this.zclNode.endpoints[1].clusters.basic.readAttributes(...));

// CORRECT
await this.zclNode.endpoints[1].clusters.basic.readAttributes(...);
```

---

## **DEC-001: SDK3 Read-Only Property Fix (v4.9.305)**

**Date:** Nov 7, 2025 10:00pm  
**Decision:** Cannot override this.log() in SDK3 - use wrapper methods instead  
**Status:** ✅ Implemented in v4.9.305

---

**END OF DECISION LOG**
