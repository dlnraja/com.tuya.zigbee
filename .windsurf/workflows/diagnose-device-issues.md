---
description: Diagnose and fix common Tuya device issues from user diagnostic reports
---

# Device Issue Diagnosis Workflow

## When to Use
When user shares diagnostic report with errors like:
- Invalid Flow Card ID
- Device unavailable
- Ghost button presses
- DEFAULT config fallback
- Time sync issues

## Step 1: Parse Diagnostic Report
Look for these key patterns in stderr/logs:

| Pattern | Issue | Fix Location |
|---------|-------|--------------|
| `Invalid Flow Card ID` | Flow card not defined | `driver.flow.compose.json` |
| `sinceEvent=17699...ms` | Huge timestamp = ghost press | `lib/devices/ButtonDevice.js` |
| `Using config: DEFAULT for` | Empty mfr name | Device's `_getManufacturerName()` |
| `mcuSyncTime` / `0x24` | Time not syncing | `lib/tuya/TuyaTimeSyncManager.js` |
| `Could not get device` | Device init crash | Wrap in try-catch |

## Step 2: Identify Root Cause

### Flow Card Errors
```bash
# Search for flow card usage
grep -r "getConditionCard\|getDeviceTriggerCard" drivers/{driver}/
# Compare with driver.flow.compose.json
```

### Ghost Button Presses
Check `sinceEvent` value:
- Normal: < 5000ms
- Ghost: > 1000000ms (timestamp corruption)

Root cause: Duplicate listener registration or `lastTime: 0` default

### DEFAULT Config Fallback
Check in order:
1. `this.getData()?.manufacturerName`
2. `this.getSetting('zb_manufacturer_name')`
3. `this.getStoreValue('manufacturerName')`

Fix: Don't cache empty values

## Step 3: Apply Fix Pattern

### Wrap risky calls in try-catch
```javascript
try {
  this._card = this.homey.flow.getConditionCard('card_id');
} catch (e) {
  this.log('⚠️ Card not available:', e.message);
}
```

### Prevent duplicate listeners
```javascript
if (!this._registeredListeners) this._registeredListeners = {};
if (this._registeredListeners[key]) return;
this._registeredListeners[key] = true;
```

### Don't cache empty values
```javascript
if (value && value.length > 0) {
  this._cachedValue = value;
}
return value || '';
```

## Step 4: Version Bump
// turbo
```bash
npm version patch --no-git-tag-version
```

## Step 5: Update Changelog
Add diagnostic report IDs to changelog entry for traceability.
