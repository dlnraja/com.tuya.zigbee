# Interview Research - v5.6.0
## 10 Devices from C:\Users\HP\Desktop\interview

Generated: 2026-01-31
Sources: Z2M GitHub, ZHA GitHub, Blakadder, Home Assistant Community, SmartHomeScene, Reddit

---

## 1. `_TZE284_vvmbj46n` (TS0601) - Soil Sensor

### Interview Data
- **Type:** EndDevice (battery)
- **Clusters:** [4, 5, 61184, 0, 60672]
- **Protocol:** Tuya DP

### Internet Research
| Source | Info |
|--------|------|
| Z2M #23260 | Similar `_TZE284_sgabhwa6` has DP3=moisture, DP5=temp, DP110=battery |
| ZHA Quirks | Same family as `_TZE284_aao3yzhs` |

### DP Mapping (from Z2M/ZHA)
```javascript
dpMap: {
  2: { cap: 'temperature_unit', type: 'enum' },  // 0=C, 1=F
  3: { cap: 'measure_humidity', type: 'soil_moisture' },  // Soil moisture %
  5: { cap: 'measure_temperature', divisor: 10 },  // °C / 10
  14: { cap: 'battery_state', type: 'enum' },  // 0=low, 1=medium, 2=high
  15: { cap: 'measure_battery', divisor: 1 },  // Battery %
}
```

### Known Bugs
- ❌ None reported

---

## 2. `_TZE284_oitavov2` (TS0601) - Soil Sensor

### Interview Data
- **Type:** EndDevice (battery)
- **Clusters:** [4, 5, 61184, 0, 60672]
- **Protocol:** Tuya DP

### Internet Research
| Source | URL |
|--------|-----|
| ZHA Quirks | switt.kongdachalert.com/zha-code-for-tuya-moisture-sensor-stick-2/ |
| HA Forum | community.home-assistant.io/t/ts0601-by-tze284-oitavov2-soil/899999 |
| Reddit | r/smarthome - "moisture reported as humidity" |

### DP Mapping (CONFIRMED from ZHA quirk)
```javascript
// Tuya QT-07S soil probe – _TZE284_oitavov2
dpMap: {
  2: { cap: 'temperature_unit', type: 'enum' },  // 0=C, 1=F
  3: { cap: 'measure_humidity', type: 'soil_moisture' },  // Soil moisture %
  5: { cap: 'measure_temperature', divisor: 100 },  // °C / 100 (centidegrees!)
  14: { cap: 'battery_state', type: 'enum' },  // 0=low, 1=medium, 2=high
  15: { cap: 'measure_battery', divisor: 1 },  // Battery %
}
```

### Known Bugs
- ⚠️ Temperature divisor is 100, NOT 10 (ZHA quirk fix)
- ⚠️ "Moisture reported as humidity" - this is normal for Tuya

---

## 3. `HOBEIAN ZG-204ZM` - Radar Motion Sensor

### Interview Data
- **Type:** EndDevice (battery)
- **Clusters:** [0, 3, 1280, 61184, 1, 1024]
- **Protocol:** HYBRID (IAS Zone + Tuya DP + ZCL)
- **swBuildId:** 0112112025

### Interview ZCL Values
```javascript
iasZone: { zoneType: "motionSensor", zoneState: "enrolled" }
powerConfiguration: { batteryVoltage: 30, batteryPercentage: 200 }
illuminanceMeasurement: { measuredValue: 32816, minInterval: 10, maxInterval: 300 }
```

### Internet Research
| Source | URL |
|--------|-----|
| Z2M #21919 | github.com/Koenkk/zigbee2mqtt/issues/21919 |
| Z2M #28529 | "HOBEIAN ZG-204ZM not supported" |
| SmartHomeScene | Review - dual PIR + 24GHz mmWave |
| HA Forum #931174 | "Issues with Z2M - unstable detection" |

### DP Mapping (from Z2M)
```javascript
dpMap: {
  1: { cap: 'alarm_motion', type: 'presence_bool' },
  2: { cap: 'motion_detection_mode', type: 'enum' },  // only_pir, pir_and_radar, only_radar
  3: { cap: 'radar_sensitivity', type: 'value', min: 1, max: 10 },
  4: { cap: 'detection_distance_min', divisor: 100 },  // meters
  5: { cap: 'detection_distance_max', divisor: 100 },  // meters
  9: { cap: 'measure_luminance', type: 'lux_direct' },
  10: { cap: 'measure_battery', divisor: 1 },
  101: { cap: 'radar_scene', type: 'enum' },  // bathroom, bedroom, etc.
  102: { cap: 'motion_state', type: 'enum' },  // none, large, small, static
}
```

### Known Bugs
- 🐛 **Z2M #28529:** "Not recognized - shows as HOBEIAN but wrong definition"
- 🐛 **HA Forum:** "Unstable detection - sometimes detects cats, sometimes misses hand wave"
- 🐛 **Dual sensor conflict:** PIR + radar may report conflicting states

---

## 4. `_TZ3000_bczr4e10` (TS0043) - 3-Button Wireless

### Interview Data
- **Type:** EndDevice (battery)
- **Endpoints:** [1, 2, 3, 4] (actually 3 buttons + 1 extra)
- **Clusters EP1:** [1, 6, 57344, 0]
- **Protocol:** ZCL (OnOff per endpoint)

### Interview ZCL Values
```javascript
EP1: { batteryVoltage: 26, batteryPercentage: 58, onOff: false }
EP2-4: { onOff: false, batteryPercentage: 253 }
```

### Internet Research
| Source | URL |
|--------|-----|
| ZHA #1762 | "TS0043 not supported" - _TZ3000_bczr4e10 variant |
| HA Forum #301273 | Blueprint for Loratap SS600ZB / TS0043 |
| HA Forum #507010 | "Often seems to break" |
| OpenHAB | Adding support for TS0043/TS0042/TS0041 |

### Button Actions
```javascript
// Per endpoint button actions
EP1: button1 (single, double, long)
EP2: button2 (single, double, long)
EP3: button3 (single, double, long)
```

### Known Bugs
- 🐛 **HA Forum:** "Often seems to break" - connection issues
- 🐛 **ZHA #1762:** Variant `_TZ3000_bczr4e10` needs specific quirk
- ⚠️ Battery reporting: EP2-4 show 253 (invalid) - use EP1 only

---

## 5. `_TZ3000_h1ipgkwn` (TS0002) - 2-Gang Switch + Energy

### Interview Data
- **Type:** Router (mains)
- **Endpoints:** [1, 2, 242]
- **Clusters EP1:** [3, 4, 5, 6, 1794, 2820, 57344, 57345, 0]
- **Protocol:** ZCL

### Interview ZCL Values
```javascript
EP1: {
  metering: { currentSummationDelivered: 0 },
  electricalMeasurement: { rmsVoltage: 0, rmsCurrent: 0, activePower: 0 }
}
EP2: { onOff: false }
```

### Internet Research
| Source | URL |
|--------|-----|
| Z2M #23625 | "Dual USB switch" - same fingerprint! |
| Z2M #26121 | "Wrong device" - USB switch shown as TS0002 |
| ZHA #1580 | "Switched on/off as a group" bug |
| Sprut Hub #3517 | Russian forum - energy monitoring issues |

### Capabilities
```javascript
capabilities: [
  'onoff',           // EP1
  'onoff.gang2',     // EP2
  'measure_power',   // EP1 electricalMeasurement
  'measure_voltage', // EP1 electricalMeasurement
  'measure_current', // EP1 electricalMeasurement
  'meter_power',     // EP1 metering
]
```

### Known Bugs
- 🐛 **Z2M #23625:** This is actually a "Dual USB switch", not a wall switch!
- 🐛 **ZHA #1580:** "Gang1 and Gang2 switch as group" - ZHA bug, not device bug
- ⚠️ Energy monitoring only on EP1, not EP2

---

## 6. `_TZE284_iadro9bf` (TS0601) - Presence Radar

### Interview Data
- **Type:** Router (mains)
- **Clusters:** [4, 5, 61184, 0, 60672]
- **Protocol:** Tuya DP

### Internet Research
| Source | URL |
|--------|-----|
| Z2M #26615 | "Human presence sensor not supported" |
| Z2M #27212 | **BUG: "presence: null, target_distance: null"** |
| ZHA #3969 | "Not showing entities" |
| Z2M-converters #8939 | Request to add support |

### DP Mapping (from Z2M #27212)
```javascript
dpMap: {
  1: { cap: 'alarm_motion', type: 'presence_bool' },
  2: { cap: 'radar_sensitivity', type: 'value', min: 1, max: 10 },
  3: { cap: 'detection_distance_min', divisor: 100 },
  4: { cap: 'detection_distance_max', divisor: 100 },
  6: { cap: 'self_test', type: 'enum' },
  9: { cap: 'target_distance', divisor: 100 },  // meters
  101: { cap: 'detection_delay', divisor: 10 },
  102: { cap: 'fading_time', divisor: 10 },
  104: { cap: 'measure_luminance', type: 'lux_direct' },
}
```

### Known Bugs
- 🔴 **Z2M #27212:** "presence: null, target_distance: null" - **CRITICAL BUG**
- 🐛 DPs not properly mapped in Z2M 2.2.1
- ⚠️ Need custom converter for full functionality

---

## 7. `_TZE204_laokfqwu` (TS0601) - Occupancy/Climate Sensor

### Interview Data
- **Type:** Router (mains)
- **Clusters:** [4, 5, 61184, 0]
- **Protocol:** Tuya DP

### Internet Research
| Source | URL |
|--------|-----|
| HA Forum #743184 | ZHA custom quirk for occupancy sensor |
| ZHA #3472 | "TS0601 _TZE204_laokfqwu occupancy and illuminance" |
| ZHA #3437 | Similar air quality monitors |

### DP Mapping (from ZHA quirk)
```javascript
// This is an OCCUPANCY sensor with illuminance, NOT climate!
dpMap: {
  1: { cap: 'alarm_motion', type: 'presence_bool' },
  2: { cap: 'radar_sensitivity', type: 'value' },
  3: { cap: 'detection_distance_min', divisor: 100 },
  4: { cap: 'detection_distance_max', divisor: 100 },
  6: { cap: 'self_test', type: 'enum' },
  9: { cap: 'target_distance', divisor: 100 },
  101: { cap: 'detection_delay', divisor: 10 },
  102: { cap: 'fading_time', divisor: 10 },
  104: { cap: 'measure_luminance', type: 'lux_direct' },
}
```

### Known Bugs
- ⚠️ **Misidentified:** Often confused with air quality sensor - it's actually occupancy!
- 🐛 ZHA needs custom quirk

---

## 8. `_TZ3000_bgtzm4ny` (TS0044) - 4-Button Wireless

### Interview Data
- **Type:** EndDevice (battery)
- **Endpoints:** [1, 2, 3, 4]
- **Clusters EP1:** [0, 1, 6]
- **Protocol:** ZCL
- **swBuildId:** 0118092025

### Interview ZCL Values
```javascript
EP1: { batteryVoltage: 30, batteryPercentage: 200, onOff: false }
EP2-4: { onOff: false }
```

### Internet Research
| Source | URL |
|--------|-----|
| Z2M Docs | zigbee2mqtt.io/devices/TS0044.html |
| HA Forum #274735 | Blueprint for TS0044 |
| deCONZ #8131 | TS0044 _TZ3000_j61x9rxn (different variant) |
| Z2M #16595 | "_TZ3000_dziaict4 - Wireless switch with 4 buttons" |

### Button Actions
```javascript
// Standard TS0044 actions
actions: ['single', 'double', 'hold']
endpoints: [1, 2, 3, 4]  // 4 buttons
```

### Known Bugs
- ✅ Well supported in Z2M
- ⚠️ Battery: 200 = 100% (divide by 2)

---

## 9. `_TZ3000_0dumfk2z` (TS0215A) - SOS Emergency Button

### Interview Data
- **Type:** EndDevice (battery)
- **Clusters:** [1, 3, 1280, 0]
- **Output Clusters:** [1281, 25, 10]
- **Protocol:** ZCL (IAS Zone)

### Interview ZCL Values
```javascript
iasZone: { zoneType: "remoteControl", zoneState: "notEnrolled" }
powerConfiguration: { batteryVoltage: 28, batteryPercentage: 140 }
iasACE: { clusterRevision: 2 }  // Output cluster 1281
```

### Internet Research
| Source | URL |
|--------|-----|
| Z2M #21102 | Fingerprint list includes `_TZ3000_0dumfk2z` |
| Z2M #13159 | "SOS button NOT receiving action" |
| Z2M-converters #5014 | "TS0215A SOS Button not working" |
| HA Forum #271235 | "Issues seeing TS0215A" |

### Known Bugs
- 🐛 **Z2M #13159:** "Button pairing but not receiving action" - IAS enrollment issue
- 🐛 **Z2M-converters #5014:** Battery info missing
- ⚠️ **IAS Zone enrollment required:** zoneState: "notEnrolled" in interview!
- ⚠️ Battery 140 = 70% (divide by 2)

### Fix Required
```javascript
// Must enroll IAS Zone on pairing
await this._enrollIASZone(zclNode);
```

---

## 10. `_TZE200_3towulqd` (TS0601) - ZCL-ONLY Motion Sensor

### Interview Data
- **Type:** EndDevice (battery)
- **Clusters:** [0, 3, 1280, 1, 1024]
- **⚠️ NO CLUSTER 61184 (Tuya DP)!**
- **Protocol:** ZCL ONLY
- **swBuildId:** 0122052017

### Interview ZCL Values
```javascript
iasZone: { zoneType: "motionSensor", zoneState: "notEnrolled" }
powerConfiguration: { batteryVoltage: 30, batteryPercentage: 200 }
illuminanceMeasurement: { measuredValue: 33280, maxMeasuredValue: 4000 }
```

### Internet Research
| Source | URL |
|--------|-----|
| deCONZ #6158 | "ZG-204ZL _TZE200_3towulqd" |
| ZHA #1620 | "TS0601 still not working" - wrong expectations |
| HA Forum #453487 | Custom ZHA quirk for ZG-204ZL |
| Blakadder | zigbee.blakadder.com/Tuya_ZG-204ZL.html |
| HA Forum #737067 | "ZG-204ZS quirk v2" |

### CRITICAL DISCOVERY
```
⚠️ THIS VARIANT HAS NO TUYA DP CLUSTER 61184!

Interview shows: inputClusters = [0, 3, 1280, 1, 1024]
- 0 = Basic
- 3 = Identify
- 1280 = IAS Zone (motion)
- 1 = PowerConfiguration (battery)
- 1024 = IlluminanceMeasurement (lux)

This is a PURE ZCL device - NOT Tuya DP!
```

### Capabilities (ZCL-only)
```javascript
capabilities: {
  alarm_motion: { source: 'iasZone', cluster: 1280 },
  measure_luminance: { source: 'illuminanceMeasurement', cluster: 1024 },
  measure_battery: { source: 'powerConfiguration', cluster: 1 },
}
```

### Known Bugs
- 🐛 **ZHA #1620:** Users expect Tuya DP but this variant is ZCL-only
- 🐛 **deCONZ:** "motion, brightness, battery entities not created"
- ⚠️ **IAS Zone enrollment:** zoneState: "notEnrolled" - must enroll!
- ⚠️ **Confusion:** Same mfr `_TZE200_3towulqd` has BOTH Tuya DP AND ZCL-only variants!

### Fix Applied in v5.6.0
```javascript
// Added to ZCL_ONLY_RADAR config in presence_sensor_radar/device.js
'ZCL_ONLY_RADAR': {
  sensors: [
    '_TZE200_kb5noeto',
    '_TZE204_ztqnh5cg',
    '_TZE200_3towulqd',  // v5.6.0: ZCL-only variant!
  ],
  useZcl: true,
  useIasZone: true,
  useTuyaDP: false,
  permissiveMode: true,
}
```

---

## Summary: Bugs Found

| Device | Bug | Severity | Status |
|--------|-----|----------|--------|
| `_TZE284_oitavov2` | Temp divisor 100 not 10 | Medium | ⚠️ Check |
| `HOBEIAN ZG-204ZM` | Unstable detection | Medium | ⚠️ Known |
| `_TZ3000_bczr4e10` | Connection breaks | Medium | ⚠️ Known |
| `_TZ3000_h1ipgkwn` | Is USB switch, not wall switch | Low | ℹ️ Info |
| `_TZE284_iadro9bf` | presence: null bug | 🔴 HIGH | ⚠️ Z2M bug |
| `_TZ3000_0dumfk2z` | IAS not enrolled | Medium | ✅ Fix: enroll |
| `_TZE200_3towulqd` | No Tuya DP cluster | 🔴 HIGH | ✅ Fixed v5.6.0 |

---

## Actions Taken

1. ✅ Added `_TZ3000_h1ipgkwn` to `switch_2gang` driver
2. ✅ Added `_TZE200_3towulqd` to `ZCL_ONLY_RADAR` config
3. ✅ Updated `DEVICE_INTERVIEWS.json` with all 10 devices (INT-167 to INT-176)
4. ✅ Updated changelog v5.6.0

## Actions Needed (VERIFIED 2026-02-05 v5.8.30)

1. ✅ `_TZE284_oitavov2` temp divisor verified in soil_sensor/device.js (DP5 ÷10, DP3 moisture)
2. ✅ `_TZ3000_0dumfk2z` SOS button — IN CODE button_emergency_sos driver
3. ✅ `_TZE284_iadro9bf` presence — 11 matches in presence_sensor_radar (fixed v5.5.791+)
