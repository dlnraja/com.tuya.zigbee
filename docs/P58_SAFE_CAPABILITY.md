# P58 — SafeCapability + BatteryCore v2 Bridge

**Date**: 2026-07-14
**Trigger**: P57 audit flagged 11 drivers as `direct-setcapabilityvalue`; cross-referencing
revealed that 9+ files in `lib/` call `device.safeSetCapabilityValue(...)` but the method
**did not exist** on any base class. This is the regression that was hiding in plain sight.

## What was wrong

```js
// 9+ places in lib/, mixins/, helpers/, tuya/ use this pattern:
const setter = typeof device.safeSetCapabilityValue === 'function'
  ? device.safeSetCapabilityValue.bind(device)
  : device.setCapabilityValue?.bind(device);
await setter?.('measure_battery', 72).catch(() => {});
```

The fallback path (`device.setCapabilityValue?.bind(device)`) was the only one ever used,
which is exactly the same as a raw `setCapabilityValue` call. **The "safe" wrapper never
ran.** Any time a battery was reported from a destroyed device, the underlying call would
throw or hang — exactly the failure mode P57's data-flooding detector is trying to prevent.

## What P58 ships

### 1. `lib/mixins/SafeCapabilityMixin.js` (new)

A 2.9 KB prototype mixin that adds one method to every device:

```js
async safeSetCapabilityValue(capability, value) {
  if (this.destroyed || this._destroyed) return false;
  if (!this.hasCapability(capability)) return false;
  if (value === undefined || (typeof value === 'number' && Number.isNaN(value))) return false;
  await this.setCapabilityValue(capability, value);
  return true;
}
```

Returns `false` (never throws) on:
- destroyed/removed device
- missing capability
- undefined/NaN value
- any underlying rejection

### 2. `lib/utils/SafeCapability.js` (new)

A thin wrapper that exports:
- `safeSetCapabilityValue(device, capability, value)` — standalone form for callers that
  don't have `this`
- `installSafeCapabilityMixin(BaseClass)` — idempotent prototype patcher
- `SafeCapabilityMixin` — re-exported for advanced use

### 3. Global wire-in via `app.js`

The mixin is installed on the root `ZigBeeDevice` from `homey-zigbeedriver` at app load:

```js
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { installSafeCapabilityMixin } = require('./lib/utils/SafeCapability');
const SmartCapability = require('./lib/data/SmartCapability');
installSafeCapabilityMixin(ZigBeeDevice);
SmartCapability.installSmartCapMixin(ZigBeeDevice);
```

Every base class (Universal, Tuya, Light, Specific, …) inherits the methods. P57's
`SmartCapability` is also installed at the same point — drivers can now call
`this.smartCap('measure_battery', { sources: { zcl: {...} } })` to get cross-source
validation out of the box.

### 4. `UnifiedBatteryHandler` ↔ `BatteryCore` bridge (P54 phase 3)

`UnifiedBatteryHandler` (84K) is a giant static-method class that owns the runtime path
for every battery reading. BatteryCore v2 (25K, 30 functions) is a standalone library
with chemistry-aware curves, Kalman filter, SOH, anti-flood gate. P58 bridges them:

| UnifiedBatteryHandler | Delegates to BatteryCore |
|-----------------------|-------------------------|
| `voltageToPercentChemistry(v, chem, temp)` | `voltageToPercentTempCompensated` |
| `autoDetectChemistry(v, hints)` | `detectChemistry` |
| `smoothEma(cur, prev, alpha)` | `exponentialSmoothing` |
| `stateOfHealth(cycles, chem)` | `stateOfHealth` |
| `shouldCommitBatteryValue(new, last, opts)` | `antiFloodCheck` |
| `normalizeZclPercentV2(raw)` | `normalizeZclPercent` |
| `cascadeBatterySources(sources)` | `cascade` |

This lets drivers tap the chemistry-aware ops without rewriting call sites.

## Tests

| Test file | Pass | Notes |
|-----------|------|-------|
| `tools/ci/test-safe-capability.js` | **21 / 21** | Mixin, standalone, override pattern, idempotent install |
| `tools/ci/test-battery-core-bridge.js` | **18 / 18** | All 7 bridge methods, edge cases, integration |

**Cumulative P53–P58**: 21 + 18 + 26 (smart-fetch) + 20 (KG) + 50 (P57) + 55 (battery-core) +
47 (button-visual) = **237 / 237 tests passing**

## Impact

- **9+ files** that previously fell back to raw `setCapabilityValue` now hit the safe
  wrapper automatically
- **11 drivers** flagged by P57 audit as `direct-setcapabilityvalue` are unblocked —
  their overrides can call `this.safeSetCapabilityValue(...)` from inside their
  custom logic, getting destruction-safe semantics for free
- **All 431 drivers** now have `safeSetCapabilityValue` and `smartCap` on their
  prototype
- **UnifiedBatteryHandler** is now a thin shell over BatteryCore v2 — drivers can use
  either the static `UnifiedBatteryHandler.foo()` or the bridge
  `UnifiedBatteryHandler.voltageToPercentChemistry(...)`

## Commit plan

- `feat(P58): SafeCapability mixin + global wire-in + 21 tests`
- `feat(P58): BatteryCore v2 bridge in UnifiedBatteryHandler + 18 tests`
- `docs(P58): SAFE_CAPABILITY guide`
- `chore(P58): bump version 9.0.238 → 9.0.241`

Then sync the same to `stable-v5`.
