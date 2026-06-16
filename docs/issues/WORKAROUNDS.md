# Workarounds Documented

> Last updated: 2026-06-15

For each known issue: the problem, root cause, current workaround (if any), and permanent fix status.

---

## 1. Bed Sensor `_TZE200_seq9cm6u` - Pairs as Unknown

### Problem
Device pairs successfully but appears as "Unknown Zigbee Device" instead of "Bed Sensor".

### Root Cause
The fingerprint `manufacturerName: "_TZE200_seq9cm6u"` is registered in `drivers/bed_sensor/driver.compose.json` with `productId: ["TS0601"]`. However, the device may be matched by a higher-priority generic driver first, or the endpoint cluster configuration may differ slightly between firmware versions.

### Workaround
1. Open the Homey app
2. Go to Devices -> Unknown Device
3. Click the three-dot menu -> "Reassign to different driver"
4. Select "Bed Sensor" from the list
5. The device should now work with correct capabilities

### Permanent Fix Status
**OPEN** - Issue #424. Needs investigation into fingerprint collision or priority ordering.

---

## 2. Bed Sensor - Battery Shows 0%

### Problem
Battery percentage always shows 0% or drops rapidly from 100% to 0%.

### Root Cause
The device sends binary battery values via DP4:
- `0` = depleted (should map to ~10%)
- `1` = OK (should map to ~100%)
- Some firmware versions send actual 0-100% values

The generic battery handler interprets `0` as literally 0%.

### Workaround
1. The `drivers/bed_sensor/device.js` has a custom `_handleBatteryDP()` override (lines 63-84)
2. This maps: `0 -> 10%`, `1 -> 100%`, `0-100 -> pass-through`
3. If still showing 0%, try removing and re-adding the device

### Permanent Fix Status
**PARTIALLY FIXED** - The override exists but may not trigger in all code paths. The DP4 may arrive through `_handleCommonDP` before `_handleBatteryDP` is called.

**Code fix needed**: Ensure `_handleCommonDP` delegates DP4 to `_handleBatteryDP` before processing.

---

## 3. Bed Sensor - Missing Settings

### Problem
Settings for sensitivity, interval_time, presence_delay, and presence_time are not available.

### Root Cause
Only `sensitivity` (DP9) is defined in `driver.compose.json`. DP101 (interval_time), DP102 (presence_delay), and DP103 (presence_time) are not mapped as writable settings.

### Workaround
None currently. These settings must be configured through the Tuya Smart Life app or Zigbee2MQTT.

### Permanent Fix Status
**OPEN** - Need to add DP101-DP103 as writable settings in `bed_sensor/driver.compose.json` and handle them in `device.js`.

---

## 4. Wireless Button `_TZ3000_yj6k7vfo` - No Press Detected

### Problem
Button pairs but press/hold/double-tap actions are not detected. Flow cards do not trigger.

### Root Cause
The `_TZ3000_yj6k7vfo` fingerprint was initially matched to the wrong driver (`gas_sensor_switch`), then regressed in fingerprint matching. The correct driver is `button_wireless_1` which handles TS0041 ZCL OnOff toggle events.

### Workaround
1. Remove the device from Homey
2. Re-pair the device
3. If it still shows as wrong type, manually reassign to "1-Buttons Wireless Controller" driver

### Permanent Fix Status
**FIXED** in v9.0.1. Fingerprint correctly registered in `button_wireless_1/driver.compose.json`.

---

## 5. Rain Sensor `_TZ3210_p68kms0l` - Water Alarm Not Working

### Problem
LUX (illuminance) updates work but the water/rain alarm never triggers.

### Root Cause
The TS0207 rain sensor uses IAS Zone (cluster 0x0500) for rain detection. The IAS Zone enrollment may fail because:
1. The device reports `zoneType: "motionSensor"` instead of "rain" in some firmware
2. The CIE address write may fail silently
3. The zone status change notification may not be received

### Workaround
1. Check if the device is enrolled in IAS Zone (look for "enrolled" in device info)
2. Try removing and re-pairing the device to trigger re-enrollment
3. As a temporary measure, use the illuminance (LUX) value in flows - when it drops significantly, it may indicate rain

### Permanent Fix Status
**OPEN** - Issue #417. The IAS Zone setup code in `rain_sensor/device.js` needs to handle the "motionSensor" zoneType variant and ensure enrollment succeeds.

---

## 6. Rain Sensor `_TZ3210_tgvtvdoc` - Misclassified as Water Leak

### Problem
The rain sensor is incorrectly recognized as a "Water Leak Sensor" instead of "Rain Sensor".

### Root Cause
Both water leak sensors and rain sensors use the TS0207 modelId. The fingerprint matching assigns `_TZ3210_tgvtvdoc` to the `water_leak_sensor` driver because it matches TS0207 generically.

### Workaround
1. Remove the device
2. Manually add it to the "Zigbee Rain Sensor" driver
3. If that option is not available, the fingerprint needs to be added to `rain_sensor/driver.compose.json`

### Permanent Fix Status
**OPEN** - Issue #388. Need to add `_TZ3210_tgvtvdoc` to `rain_sensor/driver.compose.json` manufacturerName list and potentially remove it from `water_leak_sensor`.

---

## 7. mmWave Radar `_TZE204_clrdrnya` - No Data Reported

### Problem
Device pairs on `motion_sensor_radar_mmwave` driver but all capabilities remain null.

### Root Cause
The fingerprint is registered in the driver but the DP listener may not be receiving data. Possible causes:
1. Device sends DPs on a different endpoint than expected
2. The DP mapping configuration does not match this specific variant
3. The "MAINS_POWERED_RADAR" config in `presence_sensor_radar/configs.js` suppresses battery polling which may also suppress other DP subscriptions

### Workaround
1. Try assigning to `presence_sensor_radar` driver instead of `motion_sensor_radar_mmwave`
2. Check device logs for any DP data: `homey app logs | grep -i "DP\|EF00"`
3. If DPs are received but not mapped, the device may need a new DP configuration entry

### Permanent Fix Status
**OPEN** - Issue #420. Needs investigation with device interview data and DP logs.

---

## 8. Radiator Valve `_TZE200_9xfjixap` - Not Working

### Problem
TRV pairs but thermostat mode, temperature, and other controls do not work.

### Root Cause
This device uses ME167/AVATTO DP profile (Profile B) which has different DP IDs than the standard MOES TRV profile. The manufacturerName `_TZE200_9xfjixap` was not recognized for ME167 profile detection.

### Workaround
None needed after v9.0.1 fix. The `radiator_valve/device.js` now detects ME167 profile via `dpProfile` getter which checks manufacturerName against ME167 IDs list.

### Permanent Fix Status
**FIXED** in v9.0.1. `_TZE200_9xfjixap` added to ME167 profile detection list.

---

## 9. Soil Sensor `_TZE284_hdml1aav` - Erratic EC Readings

### Problem
Electrical Conductivity (fertilizer level) readings are erratic or show unexpected values.

### Root Cause
Multiple DPs map to `measure_ec`: DP4, DP20, DP22, DP106, DP112. Some of these may send conflicting values or raw ADC values that need scaling.

### Workaround
1. Use the `SoilMoistureInference` engine which smooths readings
2. Set `maxMoistureJump: 25` threshold to filter sudden jumps
3. Calibrate using the `soil_calibration` setting (DP104)
4. If readings are extremely wrong, try the `temperature_calibration` setting (DP107)

### Permanent Fix Status
**PARTIALLY FIXED** - The inference engine helps but does not fully resolve conflicting DP sources.

---

## 10. Configuration Page Loading Endlessly (#361, #380)

### Problem
The device settings/configuration page loads indefinitely in the Homey app.

### Root Cause
DataRecoveryManager startup crash in v8.1.x caused by corrupt state data. The crash prevented the settings handler from registering.

### Workaround
1. Update to v8.1.98 or later (v9.0.x recommended)
2. If still occurring, clear app data: remove app, restart Homey, reinstall app
3. Check diagnostics report for DataRecoveryManager errors

### Permanent Fix Status
**FIXED** in v8.1.98+. DataRecoveryManager startup crash resolved.

---

## 11. App Crash on Startup (#338)

### Problem
App crashes immediately on startup, preventing all devices from working.

### Root Cause
AggregateError in server-side build caused by template drivers without valid manufacturer entries.

### Workaround
1. Downgrade to last known working version
2. Wait for fix release

### Permanent Fix Status
**FIXED** in v9.0.0. Generic placeholders injected for all template drivers.

---

## 12. Gate Opener TS0603 - "Could not get device by ID" (#332)

### Problem
Zigbee Gate Opener Module shows error "Could not get device by ID" when trying to operate.

### Root Cause
The device was not correctly registered in the driver database, causing runtime device lookup failure.

### Workaround
1. Remove and re-pair the device
2. Ensure it matches the correct driver (check manufacturerName)

### Permanent Fix Status
**FIXED** in v9.0.1.

---

## General Troubleshooting Steps

### For All Device Issues
1. **Check version**: Ensure you are on the latest app version (v9.0.33+)
2. **Check fingerprint**: Go to device settings, verify `zb_manufacturer_name` and `zb_model_id`
3. **Re-pair**: Remove device, restart Homey, re-pair
4. **Check logs**: `homey app logs` to see DP data and errors
5. **Manual reassign**: Three-dot menu -> Reassign to different driver

### For Battery Issues
1. Check if device sends binary (0/1) vs percentage (0-100) battery
2. Verify `_handleBatteryDP()` override is present in driver
3. Check `UnifiedBatteryHandler.calculateFromVoltage()` for voltage-based devices

### For Missing Capabilities
1. Check `driver.compose.json` capabilities list
2. Verify DP mappings in `device.js` match the device's actual DPs
3. Check if capability is being removed during init (some devices remove capabilities they don't support)

### For Flow Card Issues
1. Ensure flow card IDs follow pattern `{driver}_physical_gang{N}_{on|off}`
2. Check that `button.1` capability is registered for button devices
3. Verify `markAppCommand()` is called before sending commands

---

*Generated by Claude Code - 15 June 2026*
