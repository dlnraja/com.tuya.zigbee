# 🚨 CRITICAL FINDING - Wall Touch Drivers Need SDK3 Refactor

**Date**: 25 Octobre 2025 22:00 UTC+02  
**Discovery**: Automated deprecation scan  
**Impact**: 8 drivers using deprecated APIs  

---

## 🔍 DÉCOUVERTE

### Automated Scan Results

Le scan `scripts/scan_deprecations.js` a révélé:

```
🔴 CRITICAL: 4 occurrences (in unused libraries ✅)
🟡 MEDIUM: 8 occurrences (in PRODUCTION wall_touch drivers ⚠️)
```

---

## ⚠️ DRIVERS AFFECTÉS (8 total)

### Wall Touch Family

| Driver | Status | Priority |
|--------|--------|----------|
| wall_touch_1gang | ❌ Deprecated APIs | HIGH |
| wall_touch_2gang | ❌ Deprecated APIs | HIGH |
| wall_touch_3gang | ❌ Deprecated APIs | HIGH |
| wall_touch_4gang | ❌ Deprecated APIs | HIGH |
| wall_touch_5gang | ❌ Deprecated APIs | HIGH |
| wall_touch_6gang | ❌ Deprecated APIs | HIGH |
| wall_touch_7gang | ❌ Deprecated APIs | HIGH |
| wall_touch_8gang | ❌ Deprecated APIs | HIGH |

---

## 🐛 DEPRECATED APIs UTILISÉES

### 1. `registerCapability()` (SDK2)

**Location**: `drivers/wall_touch_*gang/device.js`

**Lines 60, 127**:
```javascript
// ❌ DEPRECATED SDK2
this.registerCapability(capabilityId, this.CLUSTER.ON_OFF, {
  endpoint: endpoint
});

this.registerCapability('measure_temperature', this.CLUSTER.TEMPERATURE_MEASUREMENT, {
  get: 'measuredValue',
  reportParser: (value) => { return Math.round((value / 100) * 10) / 10; },
  report: 'measuredValue',
  getOpts: { getOnStart: true }
});
```

---

### 2. `registerMultipleCapabilityListener()` (SDK2)

**Location**: `drivers/wall_touch_*gang/device.js`

**Lines 68-74**:
```javascript
// ❌ DEPRECATED SDK2
this.registerMultipleCapabilityListener(
  buttons.map(b => `onoff.${b}`),
  async (valueObj) => {
    return this.onMultipleButtonPress(valueObj);
  },
  500
);
```

---

## ✅ SDK3 REFACTOR REQUIRED

### Pattern 1: Button Capabilities

**OLD (SDK2)**:
```javascript
this.registerCapability(capabilityId, this.CLUSTER.ON_OFF, {
  endpoint: endpoint
});
```

**NEW (SDK3)**:
```javascript
const endpoint = this.zclNode.endpoints[endpointId];
if (endpoint?.clusters?.onOff) {
  endpoint.clusters.onOff.on('attr.onOff', async (value) => {
    await this.setCapabilityValue(capabilityId, value).catch(this.error);
  });
  
  // Configure reporting
  await this.configureAttributeReporting([
    {
      endpointId: endpointId,
      cluster: 6, // onOff
      attributeName: 'onOff',
      minInterval: 0,
      maxInterval: 300,
      minChange: 1
    }
  ]).catch(err => this.log('Configure reporting (non-critical):', err.message));
}
```

---

### Pattern 2: Multiple Capability Listener

**OLD (SDK2)**:
```javascript
this.registerMultipleCapabilityListener(
  buttons.map(b => `onoff.${b}`),
  async (valueObj) => {
    return this.onMultipleButtonPress(valueObj);
  },
  500
);
```

**NEW (SDK3)**:
```javascript
// Individual listeners with debounce tracking
const buttonStates = {};
let debounceTimer = null;

for (const button of buttons) {
  const capabilityId = `onoff.${button}`;
  
  this.registerCapabilityListener(capabilityId, async (value) => {
    buttonStates[capabilityId] = value;
    
    // Debounce: wait for all buttons
    if (debounceTimer) clearTimeout(debounceTimer);
    
    debounceTimer = setTimeout(async () => {
      const pressed = Object.keys(buttonStates)
        .filter(key => buttonStates[key]);
      
      if (pressed.length > 1) {
        await this.onMultipleButtonPress(buttonStates);
      }
      
      // Reset
      Object.keys(buttonStates).forEach(key => buttonStates[key] = false);
    }, 500);
    
    return Promise.resolve();
  });
}
```

---

### Pattern 3: Temperature Capability

**OLD (SDK2)**:
```javascript
this.registerCapability('measure_temperature', this.CLUSTER.TEMPERATURE_MEASUREMENT, {
  get: 'measuredValue',
  reportParser: (value) => { return Math.round((value / 100) * 10) / 10; },
  report: 'measuredValue',
  getOpts: { getOnStart: true }
});
```

**NEW (SDK3)**:
```javascript
const endpoint = this.zclNode.endpoints[1];
if (endpoint?.clusters?.msTemperatureMeasurement) {
  endpoint.clusters.msTemperatureMeasurement.on('attr.measuredValue', async (value) => {
    const temp = Math.round((value / 100) * 10) / 10;
    await this.setCapabilityValue('measure_temperature', temp).catch(this.error);
  });
  
  // Configure reporting
  await this.configureAttributeReporting([
    {
      endpointId: 1,
      cluster: 1026, // msTemperatureMeasurement
      attributeName: 'measuredValue',
      minInterval: 60,
      maxInterval: 3600,
      minChange: 50
    }
  ]).catch(err => this.log('Configure reporting (non-critical):', err.message));
}
```

---

## 📋 REFACTOR PLAN

### Phase 1: Create SDK3 Base (Do Now)

1. **Create new base class**: `lib/WallTouchDevice.js` (SDK3)
   - Multi-endpoint button handling
   - Debounced combination detection
   - Temperature/tamper monitoring
   - Extends `BaseHybridDevice` (already SDK3)

2. **Update 8 drivers** to extend new base
   - Replace deprecated APIs
   - Add SDK3 cluster listeners
   - Test button combinations

---

### Phase 2: Test & Validate

3. **Test scenarios**:
   - ✅ Single button press
   - ✅ Multiple button combination
   - ✅ Momentary vs toggle switch types
   - ✅ Temperature monitoring
   - ✅ Tamper detection
   - ✅ Battery vs AC power detection

4. **Validate**:
   ```bash
   homey app validate --level publish
   # Expected: PASS
   
   node scripts/scan_deprecations.js
   # Expected: 0 MEDIUM issues in wall_touch drivers
   ```

---

### Phase 3: Deploy

5. **Version**: v4.9.23
6. **Changelog**: "Fix wall_touch drivers - SDK3 compliance"
7. **Publish**: Via GitHub Actions

---

## 🚦 PRIORITY ASSESSMENT

### Impact

- **Severity**: MEDIUM (not CRITICAL)
- **Reason**: `registerMultipleCapabilityListener` is deprecated but still works
- **Users Affected**: Wall touch users only (~5-10% of user base)
- **Functionality**: Not broken, but using deprecated API

### Timeline

- **Immediate** (Tonight): ❌ Not required (not critical)
- **Short-term** (This Week): ✅ **RECOMMENDED**
- **Long-term** (Next Month): ⚠️ Must fix before deprecated API removed

---

## 📊 COMPARISON WITH v4.9.20 FIX

### BaseHybridDevice (v4.9.20)

- ✅ Fixed `registerCapability` in base class
- ✅ All drivers extending BaseHybridDevice benefit
- ✅ Impact: 171 drivers automatically fixed

### WallTouch Drivers (v4.9.23)

- ⚠️ Need individual fix (use `registerCapability` directly)
- ⚠️ Need `registerMultipleCapabilityListener` refactor
- ⚠️ Impact: Only 8 drivers

**Lesson**: Always check for direct deprecated API usage, not just inherited!

---

## ✅ VALIDATION AGAINST PREVIOUS AUDITS

### Manual Audit (21:45)

```
Production Code: 100% SDK3 Clean ✅
```

**Result**: ❌ **MISSED wall_touch drivers!**

**Reason**: Manual audit didn't check `registerMultipleCapabilityListener`

---

### Automated Scan (21:50)

```
MEDIUM: 8 occurrences ⚠️
Location: wall_touch_*gang drivers
```

**Result**: ✅ **FOUND THE ISSUE!**

**Benefit**: Automated scan caught what manual audit missed!

---

## 🎯 ACTION ITEMS

### Tonight (Optional)

- [ ] Create `lib/WallTouchDevice.js` SDK3 base class
- [ ] Refactor `wall_touch_1gang` as proof of concept
- [ ] Test single + combination buttons

### This Week (Recommended)

- [ ] Refactor all 8 wall_touch drivers
- [ ] Test comprehensive scenarios
- [ ] Update changelog
- [ ] Publish v4.9.23

### Monitoring

- [ ] Re-run `node scripts/scan_deprecations.js`
- [ ] Expected: 0 MEDIUM issues
- [ ] Confirm: `homey app validate` passes

---

## 📁 FILES TO CREATE/MODIFY

### New Files

1. `lib/WallTouchDevice.js` (SDK3 base class)
2. `docs/SDK3_MIGRATION_WALL_TOUCH.md` (migration guide)

### Modified Files (8)

1. `drivers/wall_touch_1gang/device.js`
2. `drivers/wall_touch_2gang/device.js`
3. `drivers/wall_touch_3gang/device.js`
4. `drivers/wall_touch_4gang/device.js`
5. `drivers/wall_touch_5gang/device.js`
6. `drivers/wall_touch_6gang/device.js`
7. `drivers/wall_touch_7gang/device.js`
8. `drivers/wall_touch_8gang/device.js`

---

## 🔗 REFERENCES

1. **SDK3 Migration**: apps-sdk-v3.developer.homey.app
2. **registerMultipleCapabilityListener deprecated**: Known issue in SDK3
3. **Our v4.9.20 fix**: `lib/BaseHybridDevice.js` (reference implementation)
4. **Scan tool**: `scripts/scan_deprecations.js`

---

## 🎉 CONCLUSION

### Discovery

✅ **Automated scan successful** - Found issue manual audit missed!

### Impact

⚠️ **8 drivers need refactor** - Medium priority, not critical

### Action

📋 **Create SDK3 WallTouchDevice base class** - Refactor this week

---

**Universal Tuya Zigbee v4.9.22**  
**Status**: Production mostly clean, 8 drivers need SDK3 refactor  
**Priority**: MEDIUM - Fix this week  
**Tool**: `scripts/scan_deprecations.js` proved invaluable!  

*Automated scanning catches what manual audits miss!*
