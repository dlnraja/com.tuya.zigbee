# Device-Specific Issues

> Last updated: 2026-06-15

Detailed analysis of known device-specific issues, their root causes, and current status.

---

## 1. `_TZE200_seq9cm6u` - Bed Sensor (Pressure Occupancy Detection Belt)

### Device Profile
- **Model**: TS0601
- **Protocol**: Tuya DP (EF00 cluster 0xEF00)
- **Driver**: `drivers/bed_sensor/`
- **Class**: `sensor`
- **Power**: Battery (CR2032)
- **Z2M Reference**: [TS0601_bed_presence_sensor](https://www.zigbee2mqtt.io/devices/TS0601_bed_presence_sensor.html)

### Issues

#### Issue A: Pairs as "Unknown Zigbee Device" (#424)
- **Severity**: Critical
- **Description**: Device pairs but is not recognized as a bed sensor. Shows as "Unknown Zigbee Device" in Homey.
- **Root cause**: The fingerprint `manufacturerName: "_TZE200_seq9cm6u"` is registered in `drivers/bed_sensor/driver.compose.json`, but some firmware variants may report different cluster configurations (e.g., missing cluster 0xEF00 in endpoint list).
- **Investigation needed**: Compare the device interview data in issue #424 against the expected endpoint/clusters in driver.compose.json. The device interview shows input clusters `[0, 61184]` which matches the expected `[0, 61184]` (0xEF00 = 61184). This suggests the fingerprint match is correct but may be colliding with another driver.
- **Workaround**: Manually assign the device to the "Bed Sensor" driver from the Homey app.

#### Issue B: Battery Shows 0% / Drains Rapidly (#328, #355, #360, #367, #371, #378, #383)
- **Severity**: High
- **Description**: Battery percentage shows 0% or drops rapidly. Missing settings (sensitivity, intervals).
- **Root cause**: The device sends binary battery values (0 = depleted, 1 = OK) via DP4 instead of actual percentage. The generic battery handler interprets 0 as 0%. The `bed_sensor/device.js` has a custom override `_handleBatteryDP()` that maps 0->10%, 1->100%, but this may not trigger if the device's DP4 arrives through a different code path.
- **Current fix**: In `drivers/bed_sensor/device.js` lines 63-84, the override maps:
  - `value === 0` -> 10% (depleted)
  - `value === 1` -> 100% (OK)
  - `value 0-100` -> pass-through
- **Status**: Partially fixed. The override exists but users report it still shows 0%. Possible issue with DP4 being handled by parent class `_handleCommonDP` before the override runs.

#### Issue C: Missing DP Settings (#328 follow-ups)
- **Severity**: Medium
- **Description**: Settings for sensitivity (DP9), interval_time (DP101), presence_delay (DP102), presence_time (DP103) are not available in the device settings.
- **Root cause**: The `driver.compose.json` has sensitivity setting defined, but DP101/102/103 are not mapped as writable settings.
- **Fix needed**: Add DP101-DP103 as writable settings in the driver.

### DP Mappings (Z2M-Confirmed)

| DP | Function | Type | Notes |
|----|----------|------|-------|
| 1 | Presence | bool (trueFalse0) | 0=occupied, 1=unoccupied (INVERTED) |
| 4 | Battery | raw 0-100 or 0/1 | Binary or percentage |
| 9 | Sensitivity | enum | 0=low, 1=middle, 2=high |
| 12 | Illuminance | raw lux | Direct value |
| 101 | Interval time | value 5-720 | Sampling interval in minutes |
| 102 | Presence delay | value 0-3600 | Delay to report unoccupied (seconds) |
| 103 | Presence time | value 0-3600 | Delay to report occupied (seconds) |
| 104 | Work state | READ-ONLY | NOT battery - internal state |

---

## 2. `_TZ3000_yj6k7vfo` - Wireless Button (TS0041)

### Device Profile
- **Model**: TS0041
- **Protocol**: ZCL OnOff cluster (standard Zigbee)
- **Driver**: `drivers/button_wireless_1/`
- **Class**: `sensor`
- **Power**: Battery (CR2032/CR2450)

### Issues

#### Issue A: No Button Press Detected (#334, #410, #412)
- **Severity**: High
- **Description**: Device pairs successfully but button presses are not detected. Flow cards do not trigger.
- **Root cause**: The `_TZ3000_yj6k7vfo` fingerprint was originally matched to `gas_sensor_switch` driver due to shared TS0041 modelId. The correct driver is `button_wireless_1`. A regression in fingerprint matching caused it to be re-matched incorrectly.
- **Fix**: Fingerprint added to `button_wireless_1/driver.compose.json` with correct `manufacturerName` entry. PhysicalButtonMixin handles the ZCL OnOff toggle detection.
- **Status**: FIXED in v9.0.1 (issues #410, #412 closed)

#### Issue B: Flow Cards Not Working (#333)
- **Severity**: Medium
- **Description**: Smart button pairs but flow cards for button press/hold are not available.
- **Root cause**: Flow card IDs must follow pattern `{driver}_physical_gang1_{on|off}`. The `button_wireless_1` driver registers `button.1` capability which generates flow triggers.
- **Status**: Working correctly when assigned to `button_wireless_1` driver.

---

## 3. `_TZ3210_p68kms0l` - Rain Sensor (RB-SRAIN01 Solar)

### Device Profile
- **Model**: TS0207 (ZCL-based, NOT TS0601)
- **Protocol**: IAS Zone (cluster 0x0500) + Tuya DP (0xEF00)
- **Driver**: `drivers/rain_sensor/`
- **Class**: `sensor`
- **Power**: Battery + Solar panel

### Issues

#### Issue A: Water Alarm Not Working (#417)
- **Severity**: High
- **Description**: LUX updates work but water/rain alarm never triggers.
- **Root cause**: The TS0207 rain sensor variant uses IAS Zone for rain detection (zoneType: "rain"), but the IAS Zone enrollment may fail if the coordinator CIE address is not written correctly. The device reports `zoneType: "motionSensor"` instead of "rain" in some firmware versions, causing the alarm logic to misinterpret zone status changes.
- **Current implementation**: `rain_sensor/device.js` lines 106-180 set up IAS Zone with:
  - Zone Enroll Request/Response handling
  - CIE address writing
  - Zone Status Change Notification parsing
  - `alarm1 || alarm2` -> raining
- **Workaround**: None currently. The IAS Zone setup code needs to handle the "motionSensor" zoneType variant.
- **Status**: OPEN (Issue #417)

#### Issue B: Also reported as `_TZ3210_tgvtvdoc` (#388)
- **Severity**: Medium
- **Description**: Same TS0207 rain sensor with slightly different manufacturerName is misclassified as a water leak sensor.
- **Root cause**: The TS0207 modelId is shared between water leak sensors and rain sensors. The fingerprint matching assigns it to `water_leak_sensor` driver instead of `rain_sensor`.
- **Fix needed**: Add `_TZ3210_tgvtvdoc` to `rain_sensor/driver.compose.json` with higher fingerprint priority.
- **Status**: OPEN (Issue #388)

### DP Mappings (Z2M-Confirmed for RB-SRAIN01)

| DP | Function | Type | Notes |
|----|----------|------|-------|
| 4 | Battery | value 0-100 | Battery percentage |
| 101 | Solar voltage | value mV | Solar panel voltage |
| 102 | Solar avg 20min | value mV | Average solar voltage |
| 103 | Solar max today | value mV | Peak solar voltage |
| 104 | Cleaning reminder | bool | Maintenance alert |
| 105 | Rain intensity | value | Rain intensity (triggers alarm_water) |

### IAS Zone
- Zone Type: 0x002D (rain) or 0x000D (motionSensor in some firmware)
- Zone Status bit 0 (alarm1): Rain detected
- Zone Status bit 1 (alarm2): Rain detected

---

## 4. TS0207 - Rain/Water Leak Classification

### The Core Problem
TS0207 is a Tuya model ID used for multiple sensor types:

| Device Type | Function | Correct Driver |
|-------------|----------|----------------|
| Water Leak Sensor | Detects water ingress | `water_leak_sensor` |
| Rain Sensor | Detects rainfall | `rain_sensor` |
| Water Detector | General water detection | `water_leak_sensor` |

### Classification Challenge
Both use the same TS0207 modelId but different manufacturerNames. The key differentiator is the `manufacturerName` prefix:
- `_TZ3000_*` with water-related names -> Water leak sensor
- `_TZ3210_*` with "tgvtvdoc" or "p68kms0l" -> Rain sensor (solar)
- `_TZE200_u6x1zyv2` -> TS0601 rain sensor (different protocol)

### Current Fingerprint State
The `rain_sensor/driver.compose.json` includes these TS0207 manufacturers:
```
_TZ3210_tgvtvdoc, _TZ3210_p68kms0l
```

The `water_leak_sensor` includes generic TS0207 manufacturers.

### Fix Needed
Ensure all TS0207 rain sensor manufacturerNames are in `rain_sensor` and NOT in `water_leak_sensor`.

---

## 5. `_TZE204_clrdrnya` - mmWave Radar (Wenzhi MTG235-ZB-RL)

### Device Profile
- **Model**: TS0601
- **Protocol**: Tuya DP (EF00)
- **Driver**: `drivers/motion_sensor_radar_mmwave/`
- **Class**: `sensor`
- **Power**: Mains (230V, acts as Zigbee router)

### Issues

#### Issue A: Pairs But Reports No Data (#420)
- **Severity**: High
- **Description**: Device pairs successfully on `motion_sensor_radar_mmwave` driver but ALL capabilities remain null (alarm_motion, measure_luminance, etc.). Settings are readable but writing fails with "Could not get device by ID".
- **Root cause**: The `_TZE204_clrdrnya` fingerprint IS registered in:
  - `drivers/presence_sensor_radar/configs.js` (MAINS_POWERED_RADAR config)
  - `drivers/motion_sensor_radar_mmwave/driver.compose.json`
  
  However, the device has 16 data points (presence, illuminance, target_distance, radar_sensitivity, detection_range, shield_range, entry_sensitivity, entry_distance_indentation, entry_filter_time, departure_delay, block_time, breaker_status, breaker_mode, illuminance_threshold, status_indication, sensor) and the DP mapping may not cover all of them correctly.

- **Investigation needed**: 
  1. Verify that the DP listener is correctly registered for this manufacturerName
  2. Check if the device sends DPs on a different endpoint than expected
  3. The "Could not get device by id" error on settings write suggests a runtime device ID resolution issue

- **Workaround**: None currently.
- **Status**: OPEN (Issue #420)

### Expected Capabilities
- `alarm_motion` (presence detection)
- `measure_luminance` (illuminance in lux)
- `measure_luminance.distance` (target distance in meters)
- `onoff` (integrated relay/breaker)
- Settings: radar_sensitivity, detection_range, shield_range, entry_sensitivity, etc.

### Z2M Reference
- Device: [MTG235-ZB-RL](https://www.zigbee2mqtt.io/devices/MTG235-ZB-RL.html)
- Z2M converters: 16 DPs defined

---

## 6. `_TZ3002_pzao9ls1` - BSEED 4-Gang Switch (TS0726)

### Device Profile
- **Model**: TS0726
- **Protocol**: ZCL OnOff (multi-endpoint)
- **Driver**: Pending (device request #1401)
- **Class**: `switch`
- **Power**: Mains

### Issues

#### Issue A: No Driver Available (#1401)
- **Severity**: Medium
- **Description**: 4-gang light switch not recognized. TS0726 is a multi-gang switch that may use endpoint-based OnOff clusters.
- **Root cause**: TS0726 is not yet in the driver database. The device uses ZCL OnOff cluster with 4 endpoints (one per gang).
- **Fix needed**: Create or extend a multi-gang switch driver to support TS0726 with manufacturerName `_TZ3002_pzao9ls1`.
- **Status**: Device request OPEN on JohanBendz (#1401)

---

## 7. `_TZ3000_wzmuk9ai` - Smart Plug with Energy Monitoring (TS011F)

### Device Profile
- **Model**: TS011F
- **Protocol**: ZCL Electrical Measurement + Metering
- **Driver**: `drivers/plug_energy_monitor/`
- **Class**: `socket`
- **Power**: Mains

### Issues

#### Issue A: Energy Readings Incorrect (#413)
- **Severity**: Medium
- **Description**: Power, voltage, current, or energy readings are incorrect or missing.
- **Root cause**: The `_TZ3000_wzmuk9ai` is classified under `ZCL_ELECTRICAL` config type in `plug_energy_monitor/device.js`. This uses standard ZCL clusters (0x0B04 Electrical Measurement, 0x0702 Metering). Some TS011F variants use different divisors than the standard ZCL defaults.
- **Fix**: Fingerprint registered in `plug_energy_monitor/driver.compose.json` line 75. The `ZCL_ELECTRICAL` config handles standard ZCL divisors.
- **Status**: FIXED in v9.0.1 (Issue #413 closed)

---

## 8. `_TZE284_hdml1aav` - Soil Sensor EC (Flower Care Fertilizer)

### Device Profile
- **Model**: TS0601
- **Protocol**: Tuya DP (EF00)
- **Driver**: `drivers/soil_sensor/`
- **Class**: `sensor`
- **Power**: Battery

### Issues

#### Issue A: EC (Electrical Conductivity) Readings Erratic (#376, #398)
- **Severity**: Medium
- **Description**: Soil EC (fertilizer level) readings are erratic or show unexpected values.
- **Root cause**: The `_TZE284_hdml1aav` sends EC data on DP20 or DP22 (Z2M mapping), but the `soil_sensor/device.js` maps DP4 to `measure_ec` which may conflict. The TZE284 variant may also use DP112 for soil_fertility_ec.
- **DP mapping in code** (`soil_sensor/device.js` lines 78-123):
  ```
  DP4:  measure_ec (divisor: 1)
  DP20: measure_ec (divisor: 1)  -- Z2M DP mapping
  DP22: measure_ec (divisor: 1)  -- Z2M DP mapping (fertilizer level)
  DP106: measure_ec (divisor: 1) -- advanced variants
  DP112: measure_ec (divisor: 1) -- TZE284 specific
  ```
- **Status**: Partially fixed. The multiple DP sources may cause conflicting values. The `SoilMoistureInference` engine in `onNodeInit()` attempts to smooth readings.

#### Issue B: Strange Soil Readings (#376, #398)
- **Severity**: Medium
- **Description**: Moisture readings show sudden jumps or impossible values.
- **Root cause**: The inference engine uses `maxMoistureJump: 25` threshold, but some sensors send raw ADC values that need scaling.
- **Fix**: The `SoilMoistureInference` class provides smoothing. The `dpMappings` for DP3 (soil_moisture) and DP105 (alt soil_moisture) handle divisor=1 which may be incorrect for some variants.

---

## Summary: Priority Matrix

| Priority | Device | Issue | Status |
|----------|--------|-------|--------|
| P0 | Bed Sensor `_TZE200_seq9cm6u` | Pairs as Unknown | OPEN |
| P0 | mmWave Radar `_TZE204_clrdrnya` | No data reported | OPEN |
| P1 | Rain Sensor `_TZ3210_p68kms0l` | Water alarm not working | OPEN |
| P1 | Rain Sensor `_TZ3210_tgvtvdoc` | Misclassified as water leak | OPEN |
| P1 | Bed Sensor | Battery 0% / settings missing | OPEN (partial) |
| P2 | Soil Sensor `_TZE284_hdml1aav` | EC erratic readings | OPEN (partial) |
| P2 | BSEED 4-gang `_TZ3002_pzao9ls1` | No driver | OPEN |
| P3 | Plug `_TZ3000_wzmuk9ai` | Energy readings | FIXED |
| P3 | Button `_TZ3000_yj6k7vfo` | No press detected | FIXED |

---

*Generated by Claude Code - 15 June 2026*
