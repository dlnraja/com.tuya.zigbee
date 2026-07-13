# 🔋 UnifiedBatteryHandler Analysis - v5.3.15

> **Generated**: 2026-05-18
> **File**: `lib/battery/UnifiedBatteryHandler.js` (608 lines)
> **Version**: v5.3.15 (last major update: v5.8.70)

---

## Overview

Runtime-adaptive battery handler that probes ALL possible energy sources:
1. ZCL genPowerCfg (cluster 0x0001)
2. Tuya DP (DP 4,10,14,15,21,100-105)
3. IAS Zone Status (bit 3 = low battery)
4. Voltage DPs (33,35,247) → voltage-to-percent curve conversion
5. Mains-powered detection
6. Kinetic/self-powered detection

---

## Architecture

```
initialize(zclNode)
├── _hasZclBatteryCluster()     → probe ZCL
├── _isTuyaDPDevice()           → check DP protocol
├── _hasIasZoneCluster()        → probe IAS
├── _device.mainsPowered        → check getter
├── _isKineticDevice()          → check model
├── _adaptBatteryCapabilities() → add/remove runtime caps
├── _setupZclBattery()          → listen ZCL
├── _setupTuyaBattery()         → listen Tuya DP
├── _setupIasZoneBattery()      → listen IAS
└── _setDefaultBattery()        → restore from store
```

---

## CRITICAL BUGS

### Bug 1: Endpoint Scope — ALL cluster checks only use `endpoints[1]`

**File lines**: 153-163, 250-265, 290-371, 185-228

**Problem**: Both `_hasZclBatteryCluster()`, `_hasIasZoneCluster()`, `_setupZclBattery()`, and `_setupIasZoneBattery()` hardcode `zclNode?.endpoints?.[1]`. Many ZCL-only battery devices report powerConfiguration on endpoint[2] or [3].

**Evidence**: Cross-ref report shows 21 drivers with mains/battery confusion issues (bulb_dimmable, button_wireless_plug, soil_sensor, smart_knob_switch, etc.)

**Impact**: Battery not detected → device wrongly classified as mains-powered → battery capability removed → no battery reading.

**Fix**: Replace ALL `endpoints[1]` cluster lookups with a helper that scans ALL endpoints:

```javascript
_findEndpointByCluster(clusterKeys, zclNode) {
    if (!zclNode?.endpoints) return null;
    for (const epKey of Object.keys(zclNode.endpoints)) {
        const ep = zclNode.endpoints[epKey];
        if (!ep?.clusters) continue;
        for (const key of clusterKeys) {
            if (ep.clusters[key] || ep.clusters[Number(key)]) {
                return ep;
            }
        }
    }
    return null;
}
```

### Bug 2: Kinetic Detection Over-match

**File lines**: 170-178

**Problem**: `_isKineticDevice()` uses regex `/^TS004[1-6]$/` which matches ALL TS004x devices. But some TS004x variants ARE battery-powered (e.g., TS0041 with CR2032 battery).

**Current code**:
```javascript
return /^TS004[1-6]$/.test(modelId) && 
       !this.device.getEnergy?.()?.batteries?.length;
```

**Issues**:
1. Regex catches ALL TS0041-6 as kinetic — false for battery variants
2. `getEnergy()?.()?.batteries?.length` may return undefined/falsy during early init
3. No check for driver-specific overrides (some drivers DO declare batteries for TS004x)

**Fix**: Add explicit kinetic-only model list + battery model exceptions:

```javascript
_isKineticDevice() {
    try {
      const settings = this.device.getSettings?.() || {};
      const modelId = (settings.zb_model_id || '').toUpperCase();
      
      // If driver explicitly declares batteries → not kinetic
      const energy = this.device.getEnergy?.();
      if (energy?.batteries?.length > 0) return false;
      
      // TS004x with 'battery' in driver id or capabilities → not kinetic
      const driverId = (this.device.driver?.id || '').toLowerCase();
      if (driverId.includes('battery') || driverId.includes('button_wireless')) return false;
      
      // True kinetic models: specific TS0044/TS0046 scene switches
      // Most TS0041/TS0042 are battery powered
      const kineticModels = ['TS0044', 'TS0046'];
      return kineticModels.includes(modelId);
    } catch { return false; }
}
```

### Bug 3: `checkMainsPowered()` Logic Flaw

**File lines**: 593-605

**Problem**: The fallback logic at line 597 causes false mains-detection:
```javascript
!this._hasZclBatteryCluster(this.device.zclNode) && !this._isTuyaDPDevice()
```

This means: "if NO ZCL battery AND NOT Tuya DP → it's mains-powered". This is WRONG because:
1. A battery device could have ZCL battery on endpoint[2] (not found due to Bug 1)
2. Battery devices often use IAS Zone or voltage DPs (not Tuya DP or ZCL battery)
3. Many battery-powered TS0601 devices are Tuya DP but report battery differently

**Fix**: Add IAS Zone and voltage checks:

```javascript
async checkMainsPowered() {
    const zclNode = this.device.zclNode;
    const isMains = this.device.powerType === 'MAINS' ||
      this.device.powerType === 'AC' ||
      (!this._hasZclBatteryCluster(zclNode) && 
       !this._isTuyaDPDevice() &&
       !this._hasIasZoneCluster(zclNode) &&
       !this.device.mainsPowered === false);
    ...
}
```

---

## WORKING FEATURES (Verified OK)

### Voltage-to-Percent Curves (lines 535-567)
✅ 4 non-linear curves: TRV/Lock, Li-ion 3.7V, Single AA, CR2032
✅ Linear interpolation between curve points
✅ Proper clamping to 0-100%

### Tuya DP Battery Parsing (lines 377-464)
✅ Unified DP list: [4,10,14,15,21,100,101,102,104,105]
✅ Voltage DPs: [33,35,247]
✅ Dual listeners (TuyaEF00Manager + TuyaClusterWrapper)
✅ DP14 scaling (0-200 → /2)

### Runtime Capability Adaptation (lines 97-148)
✅ Removes alarm_battery when measure_battery exists (SDKv3 rule)
✅ Adds measure_battery when ZCL/Tuya detected
✅ Adds alarm_battery for IAS-only devices
✅ Cleans up both for mains/kinetic

### Anti-Flood (lines 487-507)
✅ 300000ms (5min) throttle
✅ 2% change threshold
✅ Store-based restore (last_battery_percentage)
✅ Emit 'battery_update' event

---

## DRIVERS WITH BATTERY ISSUES (from cross-ref report)

| Driver | Issue |
|--------|-------|
| bulb_dimmable | False battery (mains device) |
| bulb_dimmable_dimmer | False battery |
| bulb_rgbw | False battery |
| bulb_rgb_led | False battery |
| bulb_tunable_white | False battery |
| bulb_white | False battery |
| button_wireless_plug | Battery not detected |
| device_din_rail_meter | False battery |
| dimmer_wall_1gang | False battery |
| generic_diy | Battery not detected |
| lcdtemphumidsensor_plug_energy | False battery |
| plug_energy_monitor | False battery |
| remote_button_wireless_plug | Battery not detected |
| scene_switch_wall | Battery not detected |
| sensor_climate_contact | Battery not detected |
| smart_button_switch | Battery confusion |
| smart_knob_switch | Battery confusion |
| smoke_detector_advanced | Battery not detected |
| soil_sensor | Battery confusion |
| switch_usb_dongle | False battery |
| switch_wireless | Battery not detected |

**Root cause for most**: Bug 1 (endpoint[1]-only checks) → battery not detected → removed by `_adaptBatteryCapabilities` as "mains".

---

## RECOMMENDED FIX PRIORITY

1. **HIGH** - Fix `_findEndpointByCluster()` helper → resolve ALL endpoint[1] bugs
2. **HIGH** - Fix `_isKineticDevice()` to not over-match TS004x
3. **MEDIUM** - Fix `checkMainsPowered()` logic
4. **LOW** - Add explicit `endpoint` parameter to `_setupZclBattery()` for more control

---

## COMPATIBILITY NOTES

- ✅ SDK v3: `setCapabilityValue()`, `addCapability()`, `removeCapability()`
- ✅ Works with `TuyaEF00Manager` (DP events via `tuyaEF00Manager`)
- ✅ Works with `TuyaClusterWrapper` (alternative DP transport)
- ✅ Falls back to `registerAttrReportListener()` when cluster not interviewed
- ⚠️ `_setupZclBattery()` uses `cluster.readAttributes()` which may fail for sleepy devices (handled gracefully)
- ⚠️ `_setupIasZoneBattery()` uses `onZoneStatusChangeNotification` which is non-standard alias
- 🚨 **SDK v3 Validation**: Any driver that can potentially be battery-powered MUST have `"energy": { "batteries": ["CR2032"] }` (or similar) defined in `driver.compose.json` if `measure_battery` or `alarm_battery` is listed in capabilities, even if it is dynamically added/removed at runtime.

---

## PERFORMANCE

- **Memory**: ~2KB per handler instance (608 lines code)
- **CPU**: O(n) for endpoint scanning (n=number of endpoints, usually 1-5)
- **Anti-flood**: Up to 300s between identical updates
- **Store writes**: On every battery update (wear concern for flash storage)

---

*Analyzed in Shadow Mode by Universal Tuya Zigbee AI Agent v7.5.40*
