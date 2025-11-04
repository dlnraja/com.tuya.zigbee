# 🚀 INTEGRATION ACTION PLAN - Phase 2 Intelligent System
**Date:** 2025-11-03  
**Version:** v4.10.0 → v4.12.0  
**Status:** In Progress

## 📋 EXECUTIVE SUMMARY

This plan integrates:
- ✅ Multi-Gang Switch Standard (DP1-32, DP209-210)
- ✅ Custom Pairing Views for device selection
- ✅ GitHub Pages Device Finder (functional search)
- ✅ Complete Tuya DP Engine integration
- ✅ Native Zigbee + Tuya hybrid protocol routing
- ✅ BSEED 2-gang issue resolution (Loïc's email)
- ✅ HOBEIAN manufacturer ID integration
- ✅ All PR#47 merge items

---

## 🎯 CRITICAL ISSUES TO RESOLVE

### 1. BSEED 2-Gang Switch Issue (HIGH PRIORITY)
**Reporter:** Loïc Salmona (loic.salmona@gmail.com)  
**Problem:** Both gangs activate when triggering one gang  
**Root Cause:** Firmware vs Homey endpoint command handling

**Analysis:**
```javascript
// Current behavior: endpoint[1 or 2].clusters.onoff triggers BOTH switches
// Expected: endpoint[1] → Gang 1 only, endpoint[2] → Gang 2 only
```

**Solution Strategy:**
1. Test with Tuya DP protocol (DP1 for gang1, DP2 for gang2)
2. Verify BSEED firmware uses Tuya DP vs standard Zigbee
3. Implement TuyaMultiGangManager for proper DP routing
4. Add custom pairing detection for BSEED devices

**Status:** 🔄 Ready for implementation

---

### 2. Device Finder Empty List (HIGH PRIORITY)
**File:** `docs/device-finder.html`  
**Problem:** device-matrix.json loads but displays no results

**Root Cause Analysis:**
- JSON structure mismatch: uses `devices` array instead of `drivers`
- Filter dropdowns expect different data structure
- Search functionality exists but data mapping incorrect

**Solution:**
```javascript
// Current: const data = await response.json(); allDevices = data.drivers || [];
// Fix: Parse device-matrix.json correctly with device → driver mapping
```

**Status:** 🔄 Ready to fix

---

### 3. HOBEIAN Manufacturer ID Missing
**Device:** ZG-204ZV (from interview data)  
**Status:** ❌ Not in database  
**Action:** Add to manufacturer database with complete ID

---

## 📦 PHASE BREAKDOWN

### **Phase 2.1: GitHub Pages Device Finder** (v4.10.0)
**Duration:** 2-4 hours  
**Priority:** HIGH

#### Tasks:
- [x] Analyze device-matrix.json structure
- [ ] Fix data loading in device-finder.html
- [ ] Implement working search filters
- [ ] Add manufacturer ID search
- [ ] Add product ID search
- [ ] Test all filter combinations
- [ ] Deploy to GitHub Pages

#### Files to Modify:
1. `docs/device-finder.html` - Fix JavaScript data parsing
2. `docs/device-matrix.json` - Verify structure
3. `.github/workflows/deploy-github-pages.yml` - Ensure deployment

#### Success Criteria:
✅ Search by device name works  
✅ Filter by category works  
✅ Manufacturer ID search functional  
✅ Product ID search functional  
✅ All dropdowns populated correctly

---

### **Phase 2.2: BSEED Multi-Gang Resolution** (v4.10.0)
**Duration:** 3-5 hours  
**Priority:** HIGH

#### Implementation Steps:

1. **Detect BSEED Devices**
```javascript
// lib/BseedDetector.js
class BseedDetector {
  static isBseedDevice(manufacturerName, productId) {
    const bseedIds = ['BSEED', '_TZ3000_BSEED_ID']; // Add actual IDs
    return bseedIds.includes(manufacturerName);
  }
}
```

2. **Route to Tuya DP Protocol**
```javascript
// In BaseHybridDevice.js onNodeInit
if (BseedDetector.isBseedDevice(manufacturerName, productId)) {
  this.log('[BSEED] Using Tuya DP protocol for multi-gang control');
  this.useTuyaDP = true;
}
```

3. **Implement Gang-Specific Commands**
```javascript
// lib/TuyaMultiGangManager.js - already exists!
async setGang(gangNumber, state) {
  const dp = gangNumber; // DP1=gang1, DP2=gang2
  await this.tuyaEF00.writeDP(dp, state);
}
```

4. **Update Wall Touch Drivers**
- Modify `drivers/wall_touch_2gang/device.js`
- Add BSEED-specific logic
- Test with Loïc's device

#### Files to Modify:
1. `lib/BseedDetector.js` (NEW)
2. `lib/BaseHybridDevice.js` - Add BSEED detection
3. `lib/TuyaMultiGangManager.js` - Enhance gang control
4. `drivers/wall_touch_2gang/device.js` - Integrate
5. `docs/EMAIL_RESPONSE_LOIC_BSEED.txt` - Update status

---

### **Phase 2.3: HOBEIAN Integration** (v4.10.0)
**Duration:** 1-2 hours  
**Priority:** MEDIUM

#### Tasks:
1. Extract manufacturer ID from interview data
2. Add to manufacturer database
3. Create or update driver
4. Test pairing

#### Files:
1. `docs/INTERVIEW_DATA_HOBEIAN_ZG-204ZV.md` - Read
2. `project-data/MANUFACTURER_DATABASE.json` - Update
3. Create driver if needed

---

### **Phase 2.4: Tuya DP Engine Enhancement** (v4.11.0)
**Duration:** 4-6 hours  
**Priority:** MEDIUM

#### Integration Points:

**Current State:**
- ✅ `TuyaDPParser.js` - DP encoding/decoding
- ✅ `TuyaEF00Manager.js` - EF00 cluster handling
- ✅ `TuyaMultiGangManager.js` - Multi-gang features
- ✅ `TuyaDataPointEngine.js` - DP engine
- ✅ `HybridProtocolManager.js` - Protocol routing

**Enhancement Needed:**
```javascript
// lib/IntelligentProtocolRouter.js (NEW)
class IntelligentProtocolRouter {
  static async detectProtocol(zclNode, manufacturerName) {
    // Check for EF00 cluster
    const hasEF00 = this.hasCluster(zclNode, 0xEF00);
    
    // Check if manufacturer uses Tuya DP
    const usesTuyaDP = this.isTuyaDP Manufacturer(manufacturerName);
    
    if (hasEF00 || usesTuyaDP) {
      return 'TUYA_DP';
    }
    return 'ZIGBEE_NATIVE';
  }
}
```

#### Files to Create/Modify:
1. `lib/IntelligentProtocolRouter.js` (NEW)
2. `lib/BaseHybridDevice.js` - Integrate router
3. `lib/HybridProtocolManager.js` - Enhance
4. All `wall_touch_*gang` drivers - Update

---

### **Phase 2.5: Custom Pairing Views** (v4.11.0)
**Duration:** 3-4 hours  
**Priority:** MEDIUM

#### Implementation:
Reference: https://apps.developer.homey.app/the-basics/devices/pairing/custom-views

**Pairing Flow:**
1. User starts pairing
2. Device detected (manufacturer + product ID)
3. **NEW:** If multiple drivers match → show custom selection view
4. User selects appropriate driver
5. Pairing completes

**Custom View Structure:**
```javascript
// pairing/select-driver.html
<div id="driver-selection">
  <h2>Multiple drivers available for this device</h2>
  <div class="driver-options">
    <!-- Dynamically populated -->
  </div>
</div>

// pairing/select-driver.js
async onPairListDevices() {
  const matches = await this.findMatchingDrivers(device);
  if (matches.length > 1) {
    return this.showCustomView('select-driver', { matches });
  }
  return matches[0];
}
```

#### Files to Create:
1. `pairing/select-driver.html` (NEW)
2. `pairing/select-driver.js` (NEW)
3. `pairing/list-devices.js` - Enhance

---

### **Phase 2.6: Advanced Multi-Gang Features** (v4.12.0)
**Duration:** 5-7 hours  
**Priority:** LOW

#### Features from Tuya Documentation:
Based on: https://developer.tuya.com/en/docs/connect-subdevices-to-gateways/tuya-zigbee-multiple-switch-access-standard

**Already Implemented:**
- ✅ DP1-4: Gang On/Off
- ✅ DP7-10: Countdown timers
- ✅ DP14: Main power-on behavior
- ✅ DP15: LED indicator
- ✅ DP16: Backlight
- ✅ DP19: Inching/Pulse mode
- ✅ DP29-32: Per-gang power-on behavior

**To Implement:**
- [ ] DP209: Weekly schedules (2+10×n bytes)
- [ ] DP210: Random timing (2+6×n bytes)
- [ ] Settings UI for schedules
- [ ] Flow cards for schedule control

---

## 🔧 TECHNICAL INTEGRATION MATRIX

### Tuya DP ↔ Homey Capabilities

| Tuya DP | Type | Description | Homey Capability | Parser |
|---------|------|-------------|------------------|--------|
| DP1 | Bool | Gang 1 On/Off | `onoff` | Boolean |
| DP2 | Bool | Gang 2 On/Off | `onoff.2` | Boolean |
| DP3 | Bool | Gang 3 On/Off | `onoff.3` | Boolean |
| DP4 | Bool | Gang 4 On/Off | `onoff.4` | Boolean |
| DP7 | Value | Gang 1 Countdown | Custom | Seconds |
| DP14 | Enum | Main Power-On | Setting | 0/1/2 |
| DP15 | Enum | LED Mode | Setting | 0/1/2 |
| DP16 | Bool | Backlight | Setting | Boolean |
| DP19 | Raw | Inching Mode | Setting | 3×n bytes |
| DP101 | Value | Temperature | `measure_temperature` | value/10 |
| DP102 | Value | Humidity | `measure_humidity` | value/10 |
| DP103 | Value | Battery | `measure_battery` | Percentage |

### Zigbee Clusters ↔ Tuya DP Routing

```javascript
// Intelligent routing logic
if (hasCluster(0xEF00)) {
  // Use Tuya DP protocol
  await tuyaEF00Manager.writeDP(dpId, value);
} else if (hasCluster(CLUSTER.ON_OFF)) {
  // Use native Zigbee
  await endpoint.clusters.onOff.setOn();
}
```

---

## 📚 REFERENCE DOCUMENTATION

### Official Tuya Documentation:
1. ✅ [Multi-Gang Switch Standard](https://developer.tuya.com/en/docs/connect-subdevices-to-gateways/tuya-zigbee-multiple-switch-access-standard)
2. ✅ [Zigbee Gateway Connectivity](https://developer.tuya.com/en/docs/connect-subdevices-to-gateways/Zigbee_2)
3. ✅ [Smart Product Solutions](https://developer.tuya.com/en/docs/iot/smart-product-solutions)
4. ✅ [Downloads & Tools](https://developer.tuya.com/en/docs/iot/download)

### Zigbee Native Documentation:
1. ✅ [Zigbee Cluster Library (ZCL)](https://docs.homey.app/en/sdk/guides/zigbee/)
2. ✅ [ESP Zigbee Custom Clusters](https://docs.espressif.com/projects/esp-zigbee-sdk/en/latest/esp32/)
3. ✅ [Home Assistant Zigbee Integration](https://www.home-assistant.io/integrations/zha/)

### Internal References:
1. ✅ Memory: Tuya Multi-Gang Switch Standard (1e3c3b7d)
2. ✅ Memory: SDK3 Compliance Status (7ffef87a)
3. ✅ Memory: Unbranded Organization (9f7be57a)
4. ✅ `docs/TUYA_MULTI_GANG_SWITCH_STANDARD.md`
5. ✅ `docs/SYSTEM_2_PHASES_ARCHITECTURE.md`

---

## 🚦 IMPLEMENTATION SEQUENCE

### Immediate (Today):
1. ✅ Create INTEGRATION_ACTION_PLAN.md
2. 🔄 Fix GitHub Pages device finder
3. 🔄 Add HOBEIAN manufacturer ID
4. 🔄 Respond to Loïc about BSEED issue
5. 🔄 Merge PR#47

### Short-term (This Week - v4.10.0):
1. Implement BSEED detection and routing
2. Complete custom pairing views
3. Test multi-gang switches
4. Deploy GitHub Pages
5. Close relevant issues

### Medium-term (Next Week - v4.11.0):
1. Enhance Tuya DP engine
2. Implement intelligent protocol router
3. Add advanced flow cards
4. Complete all countdown/LED features

### Long-term (Next Month - v4.12.0):
1. Weekly schedules (DP209)
2. Random timing (DP210)
3. Full automation AI system
4. Complete documentation

---

## ✅ SUCCESS CRITERIA

### Phase 2.1 Complete When:
- [ ] Device finder shows all devices
- [ ] All filters functional
- [ ] Search works for all fields
- [ ] GitHub Pages deployed

### Phase 2.2 Complete When:
- [ ] BSEED 2-gang controls each gang independently
- [ ] Loïc confirms fix works
- [ ] Documentation updated
- [ ] Email response sent

### Phase 2.3 Complete When:
- [ ] HOBEIAN device pairs successfully
- [ ] Manufacturer ID in database
- [ ] Driver functional

### Overall Success:
- [ ] All critical issues resolved
- [ ] v4.10.0 published to Homey App Store
- [ ] Zero blocking bugs
- [ ] All PRs merged
- [ ] All issues responded to

---

## 🔒 SAFETY PROTOCOLS

1. **No Breaking Changes:** All modifications must be backward compatible
2. **SDK3 Compliant:** Follow Homey SDK3 standards strictly
3. **Test First:** Test on development devices before push
4. **Version Control:** Commit frequently with clear messages
5. **Documentation:** Update docs alongside code changes

---

## 📞 COMMUNICATION PLAN

### Loïc Salmona (BSEED Issue):
- ✅ Email received 2025-11-01
- 🔄 Response draft prepared
- ⏳ Test implementation needed
- 📧 Final response after fix confirmed

### GitHub Issues:
- 🔄 Auto-respond system active
- 🔄 Direct responses for complex issues
- ✅ Close issues after fix deployed

### PR#47:
- 🔄 Review code
- 🔄 Test changes
- 🔄 Merge with proper commit message
- ✅ Close PR

---

## 📊 PROGRESS TRACKING

**Overall Progress:** 15% (Planning Complete)

| Phase | Status | Progress | ETA |
|-------|--------|----------|-----|
| 2.1 Device Finder | 🔄 In Progress | 20% | Today |
| 2.2 BSEED Fix | ⏳ Pending | 0% | 2 days |
| 2.3 HOBEIAN | ⏳ Pending | 0% | 1 day |
| 2.4 DP Engine | ⏳ Pending | 0% | 1 week |
| 2.5 Custom Pairing | ⏳ Pending | 0% | 1 week |
| 2.6 Advanced Features | ⏳ Pending | 0% | 2 weeks |

---

**Last Updated:** 2025-11-03 12:45 UTC+01:00  
**Next Review:** After Phase 2.1 completion  
**Responsible:** Dylan Rajasekaram
