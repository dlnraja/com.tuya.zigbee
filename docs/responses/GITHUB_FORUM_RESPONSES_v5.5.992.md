# GitHub & Forum Responses - Universal Tuya Zigbee v5.5.993+

## 🔧 FIXES IMPLEMENTED IN v5.5.993+

---

## v5.5.993 - BSEED ZCL-Only Multi-Gang Virtual Button Fix

**Issue**: BSEED 4-gang switch virtual toggle buttons failing for gang 2-4
**Error**: `Missing Capability Listener: onoff.gang2`

### Root Cause:
VirtualButtonMixin was using `triggerCapabilityListener()` which fails for ZCL-only devices even though capability listeners are registered via `registerCapabilityListener()`.

### Fix:
1. **VirtualButtonMixin** - Now detects `_isZclOnlyMode` flag and uses direct ZCL commands
2. **switch_2gang, switch_3gang, switch_4gang** - Added `_isZclOnlyMode = true` flag in ZCL-only init

### Files Changed:
- `lib/mixins/VirtualButtonMixin.js` - v5.5.993 direct ZCL for ZCL-only devices
- `drivers/switch_2gang/device.js` - Added `_isZclOnlyMode` flag
- `drivers/switch_3gang/device.js` - Added `_isZclOnlyMode` flag  
- `drivers/switch_4gang/device.js` - Added `_isZclOnlyMode` flag

---

## GitHub Issue #121 - DAVID9SE (`_TZ3000_an5rjiwd` TS0041 button)

**User's Question**: "Was anything changed? I mean was the delay fixed somehow?"

### Response:

Hi DAVID9SE,

Your device `_TZ3000_an5rjiwd` TS0041 has been **moved from button_wireless_1 to button_wireless_4** driver.

**Why?** Your device interview shows:
- 4 endpoints with onOff clusters
- Cluster 57344 (0xE000) present
- This matches the MOES 4-button pattern, not a single-button device

**Changes in v5.5.992:**
1. Added `_TZ3000_an5rjiwd` to `knownE000Devices` list
2. Added fingerprint to `button_wireless_4/driver.compose.json`
3. Added `TS0041` to productId list for button_wireless_4
4. Removed from button_wireless_1 to prevent wrong pairing

**Action Required:**
1. Remove your device from Homey
2. Update to v5.5.992+
3. Re-pair the device
4. It should now appear as "4-Boutons Contrôleur Sans Fil"
5. Each button press will trigger via cluster E000 BoundCluster + raw frame interceptor

---

## Forum - Peter_van_Werkhoven (HOBEIAN ZG-204ZV)

**Issues Reported:**
1. Humidity showing 9% instead of 90%
2. Distance capability showing (shouldn't)
3. Instability after v989 ("disco party")
4. Battery not reporting

### Response:

Hi Peter,

**v5.5.992 MAJOR FIX - PERMISSIVE MODE:**

The root cause was that `_TZE200_3towulqd` can be EITHER ZG-204ZL (PIR only) OR ZG-204ZV (multisensor). The old code matched ZG204ZL_PIR_ONLY profile first, which set wrong DP mappings.

**New PERMISSIVE_VARIANT Profile:**
```javascript
// For variant manufacturers, return PERMISSIVE profile
return { 
  name: 'PERMISSIVE_VARIANT',
  dp3: 'measure_temperature',  // ZG-204ZV: temp on DP3 (÷10)
  dp4: 'measure_humidity',     // ZG-204ZV: humidity on DP4 (*10!)
  dp4_multiplier: 10,
  dp9: 'measure_luminance',    // ZG-204ZV: lux on DP9
  dp12: 'measure_battery',     // ZG-204ZV: battery on DP12
  isPermissive: true,
};
```

**All Fixes Applied:**
1. ✅ **Humidity *10 Multiplier**: DP4 now multiplies by 10 (9 → 90%)
2. ✅ **Temperature**: DP3 divides by 10 for correct reading
3. ✅ **Battery**: DP12 now correctly mapped to battery (was luminance!)
4. ✅ **Luminance**: DP9 for lux reading
5. ✅ **Distance Removed**: Already removed in v5.5.892

**Capabilities Added Upfront** (permissive mode):
- measure_temperature
- measure_humidity
- measure_luminance
- measure_battery
- alarm_motion

**Action Required:**
1. Update to v5.5.992+
2. Remove and re-pair your ZG-204ZV
3. All sensors should now report correctly

The "disco party" instability was caused by wrong DP mappings - DP12 was mapped to luminance instead of battery, causing capability conflicts.

---

## Forum - Pieter_Pessers (BSEED 2-gang/3-gang TS0003)

**Issue**: `_TZ3000_l9brjwau` and `_TZ3000_qkixdnon` with TS0003 detected as unknown

### Response:

Hi Pieter,

**Root Cause:** Your BSEED 2-gang switches report `TS0003` as productId instead of `TS0002`. This is an OEM inconsistency.

**Fix in v5.5.992:**
- Added `TS0003` to `switch_2gang/driver.compose.json` productId list

**For LED Backlight Control:**
Go to device settings → "LED Backlight Mode" → Options: Off, Normal, Inverted

This uses DP15 (Tuya DP) or ZCL attribute 0x8001 depending on firmware.

---

## Forum - Tbao (BSEED Curtain Switch `_TZ3000_bs93npae` / TS130F)

**Issue**: Curtain motor not responding to commands

### Response:

Hi Tbao,

**Root Cause:** TS130F devices use **ZCL windowCovering cluster (0x0102)**, NOT Tuya DP protocol. The driver was incorrectly detecting Tuya DP due to cached settings.

**Fix in v5.5.992:**
- Added explicit TS130F detection in `HybridCoverBase._detectProtocol()`
- TS130F now forces ZCL protocol regardless of cached settings

```javascript
// v5.5.991: TS130F devices use ZCL windowCovering cluster, NOT Tuya DP
const isTS130F = modelId === 'TS130F' || modelId.startsWith('TS130');
const isTuyaDP = !isTS130F && (modelId === 'TS0601' || mfr.startsWith('_TZE'));
```

**Action Required:**
1. Update to v5.5.992+
2. Remove and re-pair your curtain motor
3. Commands should now work via ZCL cluster

---

## Forum - Hartmut_Dunker (BSEED 4-gang Virtual Button Error)

**Diagnostic Error:**
```
[VIRTUAL-BTN] Toggle error: Missing Capability Listener: onoff.gang2
[VIRTUAL-BTN] Toggle error: Missing Capability Listener: onoff.gang3
[VIRTUAL-BTN] Toggle error: Missing Capability Listener: onoff.gang4
```

### Response:

Hi Hartmut,

**Root Cause:** VirtualButtonMixin was trying to use `this.zclNode` but ZCL-only mode stores it as `this._zclNode`.

**Fix in v5.5.992:**
- VirtualButtonMixin now uses `this._zclNode || this.zclNode` as fallback
- Also checks `clusters[6]` (cluster ID) in addition to `clusters.onOff`

**Note:** Your diagnostic shows only EP1 has an onOff cluster. This may indicate your device is actually a 1-gang switch with `_TZ3000_hafsqare` fingerprint. If so, it should pair with switch_1gang driver instead.

---

## Forum - ManuelKugler (Thermostat `_TZE284_o3x45p96`)

**Issue**: Target temperature not transferred

### Response:

Hi Manuel,

**Status:** The fingerprint `_TZE284_o3x45p96` is already in the `radiator_valve/driver.compose.json`.

**Standard TRV DP Mappings:**
- DP2: Target temperature (value/10 = °C)
- DP3: Current temperature (value/10 = °C)
- DP1: On/off

**Troubleshooting:**
1. Check device settings → ensure correct temperature range
2. Try setting temperature via Homey app
3. Check logs for `[THERMOSTAT]` messages
4. If still not working, please provide a diagnostic report

---

## Forum - Freddyboy (MOES 4-button `_TZ3000_zgyzgdua`)

**Issue**: No response to flows

### Response:

Hi Freddyboy,

**Status:** The `_TZ3000_zgyzgdua` is a TS0044 that uses cluster 0xE000 (57344). This is fully supported in v5.5.992 with:

1. **TuyaE000BoundCluster** - Receives button presses
2. **Raw frame interceptor** - Catches frames that bypass BoundCluster
3. **onOff command listeners** - Fallback for commandOn/Off/Toggle

**Debugging:**
- Check logs for `[BUTTON4-E000]` or `[BUTTON4-RAW]` messages
- If no messages appear on button press, try re-pairing

**Flow Setup:**
- Trigger: "Button X pressed" (X = 1-4)
- Actions: single, double, long (hold)

---

## Forum - Lasse_K (Water sensor inactive + Contact sensor reversed)

**Issues:**
1. Water sensor always inactive
2. Contact sensor shows reversed state

### Response:

Hi Lasse_K,

**Water Sensor (v5.5.549 fix):**
- IAS Zone sensors may use `alarm1` OR `alarm2` bit
- Fixed: Now checks BOTH bits by default
- If still not working, check IAS Zone enrollment status in logs

**Contact Sensor:**
- Go to device settings → Enable "Invert Contact State" checkbox
- Or: Enable "Reverse alarm logic" if available
- HOBEIAN ZG-102Z was removed from auto-invert list in v5.5.776 per your feedback

---

## Forum - tlink (`_TZE204_ztqnh5cg` presence sensor)

**Issue**: Detected as unknown

### Response:

Hi tlink,

**Status:** The fingerprint `_TZE204_ztqnh5cg` is already in:
- `presence_sensor_radar/driver.compose.json`
- `motion_sensor_radar_mmwave/driver.compose.json`

**Troubleshooting:**
1. Update to latest version
2. Remove and re-pair device
3. Should pair as "Presence Sensor Radar" or "Motion Sensor Radar mmWave"

If still not pairing, please provide device interview data.

---

## Summary of v5.5.992 Changes

| File | Change |
|------|--------|
| `drivers/switch_2gang/driver.compose.json` | Added TS0003 to productId |
| `lib/devices/HybridCoverBase.js` | Added TS130F ZCL-only detection |
| `drivers/motion_sensor/device.js` | Added ZG204ZV_MULTISENSOR profile with humidity *10 |
| `lib/mixins/VirtualButtonMixin.js` | Added _zclNode fallback for ZCL-only devices |
| `drivers/button_wireless_4/device.js` | Added _TZ3000_an5rjiwd to E000 list |
| `drivers/button_wireless_4/driver.compose.json` | Added _TZ3000_an5rjiwd + TS0041 |
| `drivers/button_wireless_1/driver.compose.json` | Removed _TZ3000_an5rjiwd |

