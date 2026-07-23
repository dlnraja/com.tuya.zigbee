# P85 — Forum #2114 Door/Window Sensor Fix (HOBEIAN ZG-227Z)

**Date**: 2026-07-23
**Scope**: Master (also propagating to stable)
**Trigger**: User said "lis tout et corrge tout" referencing forum post 2114

## 📝 Forum post 2114 (Peter_van_Werkhoven, 2026-07-16)

> "Door/Window sensors: contact state not changing, only with manual 'Invert
> contact state' toggle. Luminance doesn't match: 1153 Lx real but app reports
> 551 Lx. Diagnostic code ac3f92d2-9dd3-45ec-99e6-a8770e2d40ad."

## 🐛 Root cause

The user has HOBEIAN ZG-227Z multi-function sensors (presence + contact +
luminance + temperature + humidity) deployed on doors/windows. They map to
the `sensor_contact_presence` driver (HOBEIAN_10G_MULTI config).

### Bug 1: contact state stale
- DP 1 was mapped to `alarm_motion` + `alarm_human` only
- `alarm_contact` (the "Door/Window" capability) was **never updated**
- Only way to "fix" was to manually toggle "invert_contact" via setting,
  which was a no-op because the capability was never being set

### Bug 2: luminance halved (1153 → 551)
- ProductValueValidator had `motion_sensor.measure_luminance` rule with
  `possibleDivisors: [1, 10]` and `autoCorrect: true`
- For HOBEIAN devices, the value is **direct lux** (type: 'lux_direct')
- The validator was applying divisor 2 or 10 incorrectly
- Result: 1153 / 2 = 576 → 551 (rounded)

## 🔧 Fix

### `drivers/sensor_contact_presence/device.js`
- Also map DP 1 to `alarm_contact` (with `invert_contact` setting)
- Mark `lux_direct` dpMappings entries with `skipValidator: true`

### `drivers/sensor_contact_presence/driver.compose.json`
- New `invert_contact` setting (checkbox, default false)
- Mirrors `invert_presence` for the contact capability

### `lib/devices/UnifiedSensorBase.js`
- Honor `mapping.skipValidator` in the validator block
- When true, value passes through unchanged (no auto-correction)

### `lib/ProductValueValidator.js`
- Already has the rules — the fix is at the call site (skipValidator flag)

## 🧪 Test verification

```
Luminance 1153 -> 1153 (with skipValidator=true)  ✓
Presence 1 -> true                                   ✓
Contact (1=detected) -> true                         ✓
Contact (0=cleared) -> false                         ✓
```

All 28 architectural tests PASS.

## 🚀 Release

- master v9.0.340 published
- Stable to follow (selective sync)

## 📁 Files modified

- `drivers/sensor_contact_presence/device.js` (alsoSets alarm_contact, skipValidator)
- `drivers/sensor_contact_presence/driver.compose.json` (invert_contact setting)
- `lib/devices/UnifiedSensorBase.js` (skipValidator support)

## 🔍 Key learnings

1. **HOBEIAN ZG-227Z is multi-function** — same device handles presence +
   contact + luminance. Driver must support all capabilities.
2. **lux_direct type is a trust flag** — Hobeian devices report direct lux,
   not ZCL log. Auto-correction must be bypassed.
3. **Learned divisors are sticky** — once ProductValueValidator learns a
   wrong divisor, it stays wrong. Need explicit reset path.
4. **The "skipValidator" flag** is the cleanest solution: opt-out of
   validation for trusted data sources.
5. **Multi-capability devices need alsoSets** — when one DP drives multiple
   capabilities, all must be set together.

## 🌐 Forum reply draft

> "Hi Peter, the issue is fixed in v9.0.340. The HOBEIAN ZG-227Z driver
> was missing `alarm_contact` mapping — only `alarm_motion` was being
> updated. The luminance was being auto-corrected by the validator (it
> thought 1153 should be divided). I've:
> 1. Added `alarm_contact` to the same DP that drives `alarm_motion`
> 2. Added an `invert_contact` setting (new) for door/window placement
> 3. Bypassed the auto-corrector for `lux_direct` data (Hobeian reports
>    direct lux, not ZCL log)
> Please update to v9.0.340 and reset the device (or set the new
> `invert_contact` toggle). Thanks for the diagnostic!"
