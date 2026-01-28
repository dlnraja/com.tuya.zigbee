# Z2M / Hubitat / Fork Analysis - Improvements for Universal Tuya Zigbee

**Generated**: January 28, 2026  
**Sources**: Zigbee2MQTT tuya.ts, kkossev Hubitat drivers, JohanBendz forks

---

## 📊 Key DP Patterns Discovered

### 1. Radar Sensors (24G/mmWave)
**Source**: Z2M tuya.ts position 220

```javascript
// _TZE204_no6qtgtl RD24G01
tuyaDatapoints: [
  [1, "presence_state", lookup({ none: 0, motion: 1, stationary: 2 })],
  [3, "near_detection", divideBy100],      // min range in meters
  [4, "far_detection", divideBy100],       // max range in meters
  [9, "target_distance_closest", divideBy100],
  [101, "static_sensitivity", raw],        // 0-10
  [102, "motion_sensitivity", raw],        // 0-10
]
```

**Status**: ✅ Already implemented in `EnrichedDPMappings.js` MMWAVE profile

### 2. 3-Phase Energy Meters
**Source**: Z2M tuya.ts position 150

```javascript
// SDM01 _TZE204_ugekduaj 3P+N Energy Monitor
tuyaDatapoints: [
  [1, "energy", divideBy100],
  [2, "produced_energy", divideBy100],
  [15, "power_factor", raw],
  [101, "ac_frequency", divideBy100],
  [102, "voltage_a", divideBy10],
  [103, "current_a", divideBy1000],
  [104, "power_a", raw],
  [105, "voltage_b", divideBy10],
  [106, "current_b", divideBy1000],
  [107, "power_b", raw],
  [108, "voltage_c", divideBy10],
  [109, "current_c", divideBy1000],
  [110, "power_c", raw],
  [111, "power", raw],  // Total power
  [112-120, "energy_X / power_factor_X", various]
]
```

**Status**: 🔄 Partially implemented - need 3-phase support

### 3. TRV Thermostats
**Source**: Z2M tuya.ts position 200

```javascript
// GTZ10 _TZE200_pbo8cj0z
tuyaDatapoints: [
  [2, "mode", thermostatSystemModeAndPresetMap],
  [4, "current_heating_setpoint", divideBy10],
  [5, "local_temperature", divideBy10],
  [7, "running_state", lookup({ idle: 0, heat: 1 })],
  [13, "battery", raw],
  [14, "child_lock", lockUnlock],
  [28, "valve_position", raw],
  [40, "child_lock", lockUnlock],
  [101, "local_temperature_calibration", localTempCalibration],
  [103, "boost_heating", onOff],
  [104, "boost_timeset_countdown", raw],
  [106, "temporary_leaving", onOff],
]
```

**Status**: ✅ Already in THERMOSTAT_DPS

### 4. Cover Motors
**Source**: Z2M tuya.ts position 220

```javascript
// M515EGBZTN _TZE200_gubdgai2
tuyaDatapoints: [
  [1, "state", lookup({ OPEN: 0, STOP: 1, CLOSE: 2 })],
  [2, "position", coverPositionInverted],
  [5, "motor_direction", lookup({ forward: 0, back: 1 })],
  [16, "border", lookup({ up: 0, down: 1, up_delete: 2, down_delete: 3, remove_top_bottom: 4 })],
]
```

**Status**: ✅ Already in COVER_DPS

### 5. Cluster E000/E001 Handling (MOES Buttons)
**Source**: kkossev Hubitat commonLib

```groovy
// Cluster E000 attributes
if (descMap.cluster == 'E000' && descMap.attrId in ['D001', 'D002', 'D003']) {
  // Button press data
}
// Cluster E001 attributes  
if (descMap.cluster == 'E001' && descMap.attrId == 'D010') {
  // Power-on behavior
}
if (descMap.cluster == 'E001' && descMap.attrId == 'D030') {
  // Switch type
}
```

**Status**: ✅ Implemented in TuyaE000BoundCluster.js (v5.5.924)

---

## 🔧 Improvements to Implement

### Priority 1: 3-Phase Energy Meter Support
Add per-phase capabilities for 3-phase energy meters:
- `measure_voltage.phase_a`, `measure_voltage.phase_b`, `measure_voltage.phase_c`
- `measure_current.phase_a`, `measure_current.phase_b`, `measure_current.phase_c`  
- `measure_power.phase_a`, `measure_power.phase_b`, `measure_power.phase_c`
- `meter_power.phase_a`, `meter_power.phase_b`, `meter_power.phase_c`

### Priority 2: Pilot Wire Mode (French Heating)
Add support for French heating pilot wire modes:
- comfort, eco, antifrost, off, comfort_1, comfort_2

### Priority 3: Cover Border Settings
Add UI settings for cover calibration:
- Set upper limit
- Set lower limit
- Delete limits
- Motor direction

---

## 📋 Fingerprints to Add

### From Z2M tuya.ts:
| Fingerprint | Device | Driver |
|-------------|--------|--------|
| `_TZE204_no6qtgtl` | RD24G01 24GHz radar | presence_sensor_radar |
| `_TZE204_ugekduaj` | SDM01 3P+N meter | din_rail_meter |
| `_TZE284_loejka0i` | Nous D4Z 3P meter | din_rail_meter |
| `_TZE284_r3szw0xr` | Cover motor | curtain_motor |
| `_TZE200_gubdgai2` | Quoya blind | curtain_motor |

### From Hubitat kkossev:
| Fingerprint | Device | Features |
|-------------|--------|----------|
| `_TZE200_rhgsbacq` | HOBEIAN 10G radar | temp/humid/lux/presence |
| `_TZE204_ztc6ggyl` | FP1/FP2 style radar | presence zones |

---

## ✅ Already Implemented (Verified)

Based on analysis, the following Z2M patterns are **already present** in our codebase:

1. **EnrichedDPMappings.js** - Comprehensive DP mappings
2. **TuyaE000BoundCluster.js** - MOES button cluster handling
3. **HybridSwitchBase.js** - Packetninja physical button detection
4. **presence_sensor_radar/device.js** - Full radar DP support
5. **Permissive variant mode** - Dynamic capability detection

---

## 🎯 Conclusion

The current Universal Tuya Zigbee v5.5.926 is **well-aligned** with Z2M and Hubitat patterns. Key areas for future enhancement:

1. **3-phase energy monitoring** - Per-phase capabilities
2. **Cover calibration UI** - Border/limit settings
3. **French pilot wire heating** - Mode support
4. **Additional radar profiles** - New manufacturer variants
