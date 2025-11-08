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

## **DEC-009: Archiving Mega-Prompt V3 (Device-Specific Fixtures & Testing)**

**Date:** Nov 8, 2025 12:45am  
**Decision:** Archive user's device-specific analysis and testing framework  
**Status:** ✅ Decided

### **Context:**

User provided comprehensive analysis of 6 specific nodes:
1. Switch 1gang (TS0002) - powerSource validation
2. Presence Sensor Radar (TS0601) - mapping fallback needed
3. SOS Emergency Button (TS0215A) - alarm capabilities
4. Climate Monitor (TS0601) - battery KPI missing
5. 4-Buttons Controller (TS0044) - multi-endpoint
6. 3-Buttons Controller (TS0043) - multi-endpoint

**Proposed solutions:**
- `config/device_overrides.json` - Model-specific configuration
- Enhanced `lib/device_helpers.js` - Override loading
- Test fixtures for all 6 devices
- `tests/run_fixtures_tests.js` - Fixture test runner
- `scripts/create_issue.sh` - Auto-issue creation
- TS0601 presence fallback with re-interview

### **Reason for Archiving:**

**v4.9.308 published 20 minutes ago:**
- Just released (12:30am)
- Zero user feedback yet
- Need 24-48h validation
- Too risky to add more changes

**Problems already addressed:**
- ✅ TS0601 detection (Tuya DP bypass)
- ✅ Multi-gang detection (TS0002, TS0003, TS0004)
- ✅ Protected drivers (prevents destructive adapt)
- ✅ Safety checks (sensor→switch prevention)

**Proposed features are enhancements:**
- Config overrides = nice-to-have
- Fixture tests = validation tool (good for later)
- Auto-issue = over-engineering (not critical)
- Presence fallback = already protected by v4.9.308

### **Decision:**

1. **ARCHIVE** complete mega-prompt in `docs/MEGA_PROMPT_V3_FIXTURES_TESTING.md`
2. **WAIT** for v4.9.308 feedback (24-48h)
3. **EVALUATE** need for overrides config based on feedback
4. **IMPLEMENT** gradually if validated:
   - Priority 1: Config overrides (safe, no driver changes)
   - Priority 2: Fixture tests (validation only)
   - Priority 3: Driver integration (after validation)

### **Implementation Priority (IF NEEDED):**

**Priority 1: Configuration & Tests (safe, no production impact)**
- ⏳ `config/device_overrides.json`
- ⏳ `.artifacts/tests/fixtures/*.json` (6 devices)
- ⏳ `tests/run_fixtures_tests.js`
- ⏳ `scripts/create_issue.sh`

**Priority 2: Helper Integration (after v4.9.308 validation)**
- ⏳ `getOverrideForModel()` in device_helpers
- ⏳ Blacklist logic in `safeAddCapability()`
- ⏳ Load overrides in driver init

**Priority 3: Advanced Features (Phase 3)**
- ⏳ TS0601 re-interview logic
- ⏳ Presence fallback with retry
- ⏳ Auto-issue creation on failure
- ⏳ CI integration for fixture tests

### **Why These Features Are Good But Not Urgent:**

**1. Config Overrides:**
- Pro: Explicit model-specific rules
- Pro: Easy to maintain
- Con: v4.9.308 already protects TS0601
- Con: Can wait until proven need

**2. Fixture Tests:**
- Pro: Good validation tool
- Pro: Helps catch regressions
- Con: No production impact
- Con: Can be added anytime

**3. TS0601 Presence Fallback:**
- Pro: Handles edge cases
- Pro: Re-interview on failure
- Con: Already protected by Tuya DP detection
- Con: Complex logic (needs careful testing)

**4. Auto-Issue Creation:**
- Pro: Automatic bug tracking
- Pro: Reduces manual work
- Con: Over-engineering at this stage
- Con: May create spam issues

### **Success Criteria for Implementation:**

**v4.9.308 must be validated first:**
- ✅ No TS0601 devices broken
- ✅ Multi-gang switches detected
- ✅ Battery KPI reporting
- ✅ No new crashes
- ✅ User feedback positive

**Then Priority 1 can be added if:**
- ✅ Specific model issues identified
- ✅ Override config would help
- ✅ Test fixtures would catch bugs
- ✅ Simple, non-invasive changes

**Priority 2-3 only if:**
- ✅ Priority 1 validated
- ✅ Clear need demonstrated
- ✅ Careful testing completed
- ✅ No regressions

### **Alternatives Considered:**

**Option A: Implement everything now** ❌
- Risk: Too many changes on top of v4.9.308
- Risk: Cannot isolate bugs
- Risk: User confusion

**Option B: Implement Priority 1 only (config + fixtures)** ⏳
- Pro: Safe (no driver changes)
- Pro: Useful for validation
- Con: Still too soon (v4.9.308 not validated)
- Decision: Wait 24h, then reconsider

**Option C: Archive and implement after validation** ✅ CHOSEN
- Pro: Safe approach
- Pro: Based on real feedback
- Pro: Gradual rollout
- Con: Takes longer
- Decision: This is the right approach

### **Timeline:**

- **Nov 8, 12:45am:** Mega-Prompt V3 archived
- **Nov 9-10:** Wait for v4.9.308 feedback
- **Nov 10:** Decision point
  - ✅ If OK: Consider Priority 1 (config + fixtures)
  - ⚠️ If issues: Targeted fix first
- **Nov 11+:** Priority 2-3 if validated and needed

### **References:**

- Mega-Prompt V3: `docs/MEGA_PROMPT_V3_FIXTURES_TESTING.md`
- User message: Nov 8, 2025 12:42am
- 6 specific nodes analyzed
- TS0601 presence mapping (primary concern)
- Config overrides proposal
- Test fixtures for validation

---

## **DEC-010: Archiving Mega-Prompt V4 (Enriched Endpoint/Cluster Detection)**

**Date:** Nov 8, 2025 12:55am  
**Decision:** Archive comprehensive endpoint/cluster detection improvements  
**Status:** ✅ Decided

### **Context:**

User feedback: "je pense que la recuperation et la detection des endpoints et clusters de tous les peripheriques sont incompletes"

Translation: "I think that the recovery and detection of endpoints and clusters for all devices are incomplete"

**Current limitations (lines 179-206):**
- ❌ Only reads cluster names (Object.keys)
- ❌ Only reads attribute names (Object.keys)
- ❌ No distinction between server vs client clusters
- ❌ No attribute values
- ❌ No command listing
- ❌ No node descriptor
- ❌ Power source guessed (not read)

**Proposed improvements:**
- ✅ Read node descriptor (type, power source, receiverOnWhenIdle)
- ✅ Distinguish server (inputClusters) vs client (outputClusters)
- ✅ Read selective attribute values
- ✅ List available commands
- ✅ Read attribute metadata (reportable, readable, writable)
- ✅ Detect bindings
- ✅ Comprehensive error handling

### **Research Conducted:**

**SDK3 Documentation:**
- https://apps.developer.homey.app/wireless/zigbee
- Server clusters: device implements attributes
- Client clusters: device sends commands
- Best practice: Always catch promises
- Use `isFirstInit()` to avoid repeated reads

**Key findings:**
```javascript
// Correct way to read attributes
const value = await zclNode.endpoints[1].clusters.onOff
  .readAttributes(['onOff'])
  .catch(err => this.error(err));

// Node descriptor contains power source
nodeDescriptor.powerSource === 'mains' // AC device
nodeDescriptor.powerSource === 'battery' // Battery device
```

### **Benefits of Improvements:**

**1. Accurate Power Source Detection:**
- ✅ Read from node descriptor (not guessed)
- ✅ Prevents adding measure_battery to AC devices
- ✅ 100% accurate

**2. Button/Remote vs Switch:**
- ✅ Client-only onOff = button/remote (sends commands)
- ✅ Server onOff = switch/outlet (receives commands)
- ✅ Eliminates false positives

**3. TS0601 Tuya DP Detection:**
- ✅ Node descriptor + limited clusters = Tuya DP
- ✅ Better detection logic
- ✅ Combined with model ID check

**4. Multi-Gang Detection:**
- ✅ Count inputClusters.includes('onOff') per endpoint
- ✅ More accurate than just endpoint count
- ✅ Distinguishes control vs data endpoints

**5. Attribute Metadata:**
- ✅ Know which attributes are reportable
- ✅ Set up correct listeners
- ✅ Avoid non-reportable attributes

### **Reason for Archiving:**

**v4.9.308 published 40 minutes ago:**
- Just released (12:30am)
- Zero user feedback yet
- Need 24-48h validation
- Too risky to add more changes

**Current detection already works:**
- ✅ Tuya DP devices protected (bypass cluster analysis)
- ✅ Multi-gang switches detected (endpoint count)
- ✅ Protected drivers (whitelist)
- ✅ Safety checks in place

**Improvements are enhancements, not critical fixes:**
- Enriched data = better decisions
- More accurate detection = fewer errors
- BUT: Not urgent (current system works)

### **Decision:**

1. **ARCHIVE** complete improvements in `docs/MEGA_PROMPT_V4_ENRICHED_DETECTION.md`
2. **WAIT** for v4.9.308 feedback (24-48h)
3. **EVALUATE** if enriched detection would solve remaining issues
4. **IMPLEMENT** if validated and beneficial

### **Implementation Plan (IF NEEDED):**

**Priority 1: Core Improvements**
- ⏳ Replace `collectDeviceInfo()` method
- ⏳ Add node descriptor reading
- ⏳ Add server/client distinction
- ⏳ Add selective attribute reading
- ⏳ Add error handling

**Priority 2: Use Improved Data**
- ⏳ Update `analyzeClusters()` logic
- ⏳ Update power source detection
- ⏳ Update button/remote detection
- ⏳ Update multi-gang detection

**Priority 3: Advanced Features**
- ⏳ Binding detection
- ⏳ Attribute metadata usage
- ⏳ Command availability checks
- ⏳ Reportable attribute subscription

### **Why These Improvements Are Good:**

**1. SDK3 Compliant:**
- Uses official APIs
- Follows best practices
- Based on Homey documentation
- Compatible with zigbee-clusters library

**2. Comprehensive:**
- Node descriptor (device type, power source)
- Input vs output clusters (server vs client)
- Attribute values (current state)
- Command listing (available actions)
- Binding detection (relationships)

**3. Backward Compatible:**
- Old `info.clusters` still populated
- New `info.endpoints[].clusterDetails` adds data
- Gradual adoption possible
- No breaking changes

**4. Well Error-Handled:**
- All reads wrapped in try-catch
- Silent fails for non-critical data
- Continues processing on errors
- Logs failures for debugging

**5. Performance-Conscious:**
- Selective attribute reading (only important ones)
- Skip large arrays/structures
- Can use cached data (isFirstInit)
- Non-blocking errors

### **Why Not Implement Now:**

**1. Timing:**
- v4.9.308 published 40 min ago
- Need validation first
- 4 versions in 3 hours already

**2. Current System Works:**
- Tuya DP bypass solves main issue
- Multi-gang detection improved
- Protected drivers prevent errors
- Safety checks in place

**3. Complexity:**
- Large code change (~200 lines)
- Needs thorough testing
- Affects core detection logic
- Risk of regressions

**4. User Feedback Priority:**
- Need to confirm v4.9.308 solves problems
- Then evaluate if more enrichment needed
- Don't over-engineer before validation

### **Success Criteria for Implementation:**

**v4.9.308 must be validated:**
- ✅ Tuya DP devices work correctly
- ✅ Multi-gang switches detected
- ✅ Battery KPIs report
- ✅ No false positives (sensor→switch)
- ✅ User feedback positive

**Then enriched detection beneficial if:**
- ⚠️ Power source still incorrectly detected
- ⚠️ Button/remote confusion remains
- ⚠️ Attribute values needed for decisions
- ⚠️ Current detection insufficient

**Implementation only if:**
- ✅ Clear benefit demonstrated
- ✅ Testing plan prepared
- ✅ Fixtures created
- ✅ Gradual rollout planned

### **Alternatives Considered:**

**Option A: Implement full enrichment now** ❌
- Risk: Too complex on top of v4.9.308
- Risk: Cannot isolate bugs
- Risk: Performance impact unknown

**Option B: Implement node descriptor only** ⏳
- Pro: Small change (~20 lines)
- Pro: High value (power source)
- Con: Still too soon (wait for v4.9.308)
- Decision: Could reconsider after validation

**Option C: Archive and implement after validation** ✅ CHOSEN
- Pro: Safe approach
- Pro: Based on real needs
- Pro: Thoroughly tested first
- Con: Takes longer
- Decision: Correct approach given timeline

### **Testing Approach:**

**When implemented, test with:**

1. **Known Devices:**
   - TS0601 (Tuya DP) → nodeDescriptor.type = 'endDevice'
   - TS0002 (2-gang) → 2 endpoints with inputClusters
   - Button/remote → client clusters only
   - AC switch → nodeDescriptor.powerSource = 'mains'
   - Battery sensor → nodeDescriptor.powerSource = 'battery'

2. **Fixtures:**
   - Create test fixtures with expected output
   - Validate enriched data structure
   - Compare before/after logs

3. **Performance:**
   - Measure init time increase
   - Verify no blocking reads
   - Check error handling works

### **Timeline:**

- **Nov 8, 12:55am:** Mega-Prompt V4 archived
- **Nov 9-10:** Wait for v4.9.308 feedback
- **Nov 10:** Decision point
  - ✅ If OK and beneficial: Implement Priority 1
  - ⚠️ If issues: Fix first
  - ❌ If not needed: Keep archived
- **Nov 11+:** Priority 2-3 if validated

### **References:**

- Mega-Prompt V4: `docs/MEGA_PROMPT_V4_ENRICHED_DETECTION.md`
- User message: "recuperation et detection des endpoints et clusters incompletes"
- Current code: `lib/SmartDriverAdaptation.js` lines 179-206
- SDK3 docs: https://apps.developer.homey.app/wireless/zigbee
- homey-zigbeedriver: https://athombv.github.io/node-homey-zigbeedriver/

---

**END OF DECISION LOG**
