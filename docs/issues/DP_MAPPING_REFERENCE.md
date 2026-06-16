# DP Mapping Reference

> Last updated: 2026-06-15

Comprehensive Data Point (DP) mapping reference for all Tuya Zigbee device families supported by this app.

---

## 1. TS0601 (Tuya DP Protocol)

All TS0601 devices use Tuya's proprietary EF00 cluster (0xEF00) for DP exchange.

### Standard DP Layout

| DP | Type | Function | Notes |
|----|------|----------|-------|
| 1 | bool/value | Primary function | Device-specific (onoff, presence, alarm) |
| 2 | value/enum | Secondary | Sensitivity, mode, brightness |
| 3 | value | Tertiary | Temperature, humidity, target |
| 4 | value | Battery/Status | Battery % or device status |
| 5 | value | Sensor | Temperature (often /10 divisor) |
| 6-10 | various | Extended | Device-specific |
| 11-15 | value | Battery/Calibration | Battery state, calibration offsets |
| 16-20 | value | Energy (plugs) | Power, voltage, current, energy |
| 101-114 | various | Settings/Advanced | Device-specific settings |

### DP Type Encoding

| Tuya Type | ID | Size | Example |
|-----------|----|----|---------|
| Bool | 0x01 | 1 byte | 0=false, 1=true |
| Value | 0x02 | 4 bytes | uint32 (may need /10, /100 divisor) |
| String | 0x03 | variable | ASCII text |
| Enum | 0x04 | 1 byte | 0, 1, 2, ... (device-specific mapping) |
| Bitmap | 0x05 | 1-4 bytes | Bit flags |

---

## 2. TS011F (ZCL with Energy Monitoring)

TS011F uses standard ZCL clusters, NOT Tuya DP. Energy data comes from standard ZCL Electrical Measurement and Metering clusters.

### ZCL Cluster Layout

| Cluster | ID | Purpose |
|---------|----|---------|
| Basic | 0x0000 | Device info (manufacturer, model) |
| OnOff | 0x0006 | Switch control |
| Metering | 0x0702 | Energy (kWh), power |
| Electrical | 0x0B04 | Voltage, current, power |

### ZCL Attribute Divisors (TS011F Standard)

| Attribute | Cluster | Divisor | Unit |
|-----------|---------|---------|------|
| measuredPower | 0x0B04 | 10 | Watts |
| rmsVoltage | 0x0B04 | 10 | Volts |
| rmsCurrent | 0x0B04 | 1000 | Amps |
| currentSummationDelivered | 0x0702 | 100 | kWh |

### TS011F Variants

| Variant | Energy Protocol | Notes |
|---------|----------------|-------|
| Standard | ZCL (0x0B04 + 0x0702) | Most common |
| Tuya DP | 0xEF00 (DP17-20) | Rare, check manufacturerName |
| Mixed | ZCL + DP config | Some use DP for settings |

### Known TS011F Energy Mappers

From `plug_energy_monitor/device.js`:
- `ZCL_ELECTRICAL` config: Standard ZCL divisors
- `TUYA_DP_STANDARD` config: DP 17-20 with /1000, /10, /10, /100 divisors
- `TUYA_DP_ALT` config: DP 9/16-20 with alternate layout

---

## 3. TS0207 (Water/Rain Sensors)

TS0207 is ambiguous - used for both water leak sensors AND rain sensors.

### Water Leak Sensor (TS0207)
- **Protocol**: IAS Zone (cluster 0x0500) + Battery (cluster 0x0001)
- **Zone Type**: 0x002D (water sensor) or 0x0000 (generic)
- **Capabilities**: `alarm_water`, `measure_battery`, `alarm_battery`

### Rain Sensor (TS0207)
- **Protocol**: IAS Zone (cluster 0x0500) + Tuya DP (0xEF00) + Battery
- **Zone Type**: 0x002D (rain) or 0x000D (motionSensor in some firmware)
- **Capabilities**: `alarm_water`, `measure_humidity` (rain level), `measure_battery`

### TS0207 DP Layout (Rain Sensor - RB-SRAIN01)

| DP | Type | Function | Notes |
|----|------|----------|-------|
| 4 | value | Battery | 0-100% |
| 101 | value | Solar voltage | mV |
| 102 | value | Solar avg 20min | mV |
| 103 | value | Solar max today | mV |
| 104 | bool | Cleaning reminder | Maintenance alert |
| 105 | value | Rain intensity | Triggers alarm_water |

### IAS Zone Status Bits (TS0207)

| Bit | Name | Function |
|-----|------|----------|
| 0 | alarm1 | Rain/water detected |
| 1 | alarm2 | Rain/water detected |
| 2-15 | reserved | Not used |

---

## 4. TS0041/TS004F/TS0044 (Buttons/Switches)

### TS0041 - 1-Gang Button/Switch
- **Protocol**: ZCL OnOff (0x0006) - button press generates OnOff toggle
- **Capabilities**: `button.1`, `measure_battery`, `alarm_battery`
- **Flow Cards**: `button_wireless_1_physical_gang1_on`, `button_wireless_1_physical_gang1_off`

### TS004F - Smart Knob/Rotary
- **Protocol**: ZCL OnOff + LevelControl (0x0008) + Multi-Press
- **Capabilities**: `button.1` through `button.4`, `dim` (rotation)
- **Flow Cards**: `button_wireless_smart_physical_gang{1-4}_{on|off}`

### TS0044 - 4-Gang Button
- **Protocol**: ZCL OnOff (multi-endpoint)
- **Capabilities**: `button.1` through `button.4`
- **Flow Cards**: `button_wireless_4_physical_gang{1-4}_{on|off}`

### Button Detection Mechanism

```
PhysicalButtonMixin:
  - Listens for ZCL OnOff toggle (cluster 0x0006, attribute 0x0000)
  - Debounce: 200ms
  - Hold detection: 1.5s window
  - Generates: button.1 capability events

VirtualButtonMixin:
  - Handles flow card trigger actions
  - Uses setCapabilityValue() with safe guards
  - Prevents ghost presses via markAppCommand()
```

---

## 5. TS0726 (Multi-Gang Switches)

### TS0726 - 4-Gang Light Switch
- **Protocol**: ZCL OnOff (multi-endpoint, 4 endpoints)
- **Endpoint Layout**:
  - Endpoint 1: Gang 1 OnOff
  - Endpoint 2: Gang 2 OnOff
  - Endpoint 3: Gang 3 OnOff
  - Endpoint 4: Gang 4 OnOff
- **Capabilities**: `onoff.1`, `onoff.2`, `onoff.3`, `onoff.4`
- **Status**: NOT YET SUPPORTED (Issue #1401)

### Other Multi-Gang Families

| Family | Gangs | Protocol | Status |
|--------|-------|----------|--------|
| TS0001 | 1 | ZCL OnOff | Supported |
| TS0002 | 2 | ZCL OnOff (2 endpoints) | Supported |
| TS0003 | 3 | ZCL OnOff (3 endpoints) | Supported |
| TS0011 | 1 | ZCL OnOff | Supported |
| TS0012 | 2 | ZCL OnOff | Supported |
| TS0013 | 3 | ZCL OnOff | Supported |
| TS0014 | 4 | ZCL OnOff | Supported |
| TS0726 | 4 | ZCL OnOff | NOT SUPPORTED |

---

## 6. Device-Specific DP Mappings

### Bed Sensor `_TZE200_seq9cm6u`

| DP | Type | Function | Transform | Cap |
|----|------|----------|-----------|-----|
| 1 | bool (trueFalse0) | Presence | 0=occupied, 1=unoccupied (INVERTED) | `alarm_contact` |
| 4 | value | Battery | 0=10%, 1=100%, else pass-through | `measure_battery` |
| 9 | enum | Sensitivity | 0=low, 1=middle, 2=high | setting |
| 12 | value | Illuminance | Raw lux | `measure_luminance` |
| 101 | value | Interval time | 5-720 minutes | setting |
| 102 | value | Presence delay | 0-3600 seconds | setting |
| 103 | value | Presence time | 0-3600 seconds | setting |
| 104 | value | Work state | READ-ONLY, NOT battery | internal |

### Radiator Valve `_TZE200_9xfjixap` (ME167 Profile)

| DP | Type | Function | Transform | Cap |
|----|------|----------|-----------|-----|
| 2 | enum | Mode | 0=auto, 1=heat, 2=off | `thermostat_mode` |
| 3 | enum | Running state | 0=heat, else idle | internal |
| 4 | value | Target temp | /10 divisor | `target_temperature` |
| 5 | value | Local temp | /10 divisor | `measure_temperature` |
| 7 | bool | Child lock | writable | internal |
| 14 | bool | Window open | 1=open | internal |
| 35 | bool | Battery alarm | 1=low | `alarm_battery` |
| 36 | bool | Frost protection | writable | internal |
| 39 | bool | Anti-scaling | writable | internal |
| 47 | value | Temp calibration | writable | internal |
| 101 | value | Valve position | /100 divisor | `dim` |
| 102 | bool | Battery low | 1=low | internal |

### Rain Sensor `_TZE200_u6x1zyv2` (TS0601)

| DP | Type | Function | Transform | Cap |
|----|------|----------|-----------|-----|
| 1 | bool | Rain alarm | 1=true | `alarm_water` |
| 2 | value | Rain level | divisor 1 | `measure_humidity` |
| 4 | value | Battery | divisor 1 | `measure_battery` |
| 101 | value | Illuminance | divisor 1 | `measure_luminance` |
| 105 | value | Rain intensity | >0 = raining | `alarm_water` |
| 106 | value | Rain level | divisor 1 | `measure_humidity` |

### Rain Sensor `_TZ3210_p68kms0l` (TS0207 Solar)

| DP | Type | Function | Transform | Cap |
|----|------|----------|-----------|-----|
| 4 | value | Battery | divisor 1 | `measure_battery` |
| 101 | value | Solar voltage | mV | `measure_voltage` |
| 102 | value | Solar avg 20min | mV | `measure_voltage.20min` |
| 103 | value | Solar max today | mV | `measure_voltage.peak` |
| 104 | bool | Cleaning reminder | true/false | `alarm_cleaning` |
| 105 | value | Rain intensity | >0 = raining | `alarm_water` |

### Soil Sensor `_TZE284_hdml1aav` (EC Variant)

| DP | Type | Function | Transform | Cap |
|----|------|----------|-----------|-----|
| 1 | value | Temperature alt | /10 | `measure_temperature` |
| 2 | value | Soil moisture alt | divisor 1 | `measure_humidity.soil` |
| 3 | value | Soil moisture | divisor 1 | `measure_humidity.soil` |
| 4 | value | EC | divisor 1 | `measure_ec` |
| 5 | value | Temperature | auto-scale | `measure_temperature` |
| 14 | enum | Battery state | 0=10%, 1=50%, 2=100% | `measure_battery` |
| 15 | value | Battery % | divisor 1 | `measure_battery` |
| 20 | value | EC (Z2M) | divisor 1 | `measure_ec` |
| 22 | value | EC fertilizer | divisor 1 | `measure_ec` |
| 101 | value | Ambient humidity | divisor 1 | `measure_humidity` |
| 102 | value | Illuminance | divisor 1 | `measure_luminance` |
| 106 | value | EC advanced | divisor 1 | `measure_ec` |
| 112 | value | Soil fertility EC | divisor 1 | `measure_ec` |

### Presence Radar `_TZE200_hl0ss9oa` (ZY-M100 Standard)

| DP | Type | Function | Transform | Cap |
|----|------|----------|-----------|-----|
| 1 | enum | Presence | 0=present, 1=away | `alarm_motion` |
| 2 | value | Sensitivity | 0-9 | setting |
| 3 | value | Near distance | 0-10m | setting |
| 4 | value | Far distance | 0-10m | setting |
| 9 | value | Target distance | /100 | `measure_luminance.distance` |
| 12 | value | Illuminance | direct lux | `measure_luminance` |
| 101 | value | Static sensitivity | 0-10 | setting |
| 102 | value | Motion sensitivity | 0-10 | setting |

### mmWave Radar `_TZE204_clrdrnya` (MAINS_POWERED_RADAR)

Same as ZY-M100 Standard but:
- `battery: false` (mains powered)
- `noBatteryCapability: true`
- `suppressBatteryCapability: true`
- Additional DPs: breaker_status, breaker_mode, illuminance_threshold, etc.

### Plug Energy `_TZE200_byzdayie` (Tuya DP Standard)

| DP | Type | Function | Divisor | Cap |
|----|------|----------|---------|-----|
| 1 | bool | On/off | - | `onoff` |
| 17 | value | Current | /1000 (mA->A) | `measure_current` |
| 18 | value | Power | /10 (dW->W) | `measure_power` |
| 19 | value | Voltage | /10 (dV->V) | `measure_voltage` |
| 20 | value | Energy | /100 (Wh*100->kWh) | `meter_power` |

---

## 7. DP Mapping Configuration in Code

### In `device.js` (dpMappings getter)

```javascript
get dpMappings() {
  return {
    1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
    2: { capability: 'target_temperature', divisor: 10 },
    3: { capability: 'measure_temperature', divisor: 10 },
    4: { capability: 'measure_battery', divisor: 1 },
    // Setting (writable, not a capability)
    5: { setting: 'sensitivity', min: 0, max: 9 },
    // Internal (not exposed as capability)
    7: { internal: true, type: 'child_lock', writable: true },
  };
}
```

### DP Mapping Options

| Option | Type | Description |
|--------|------|-------------|
| `capability` | string | Homey capability name to update |
| `transform` | function | Custom value transformation |
| `divisor` | number | Divide raw value by this number |
| `type` | string | Data type hint (bool, value, enum) |
| `setting` | string | Device setting ID (writable) |
| `internal` | boolean | Internal use, not exposed |
| `writable` | boolean | Can be written to device |
| `min` | number | Minimum value (for settings) |
| `max` | number | Maximum value (for settings) |

---

## 8. Common Transform Functions

### Boolean Transform
```javascript
transform: (v) => v === 1 || v === true
// or for inverted:
transform: (v) => v === 0 || v === false
```

### Enum Transform
```javascript
transform: (v) => ({ 0: 'auto', 1: 'heat', 2: 'off' }[v] ?? 'heat')
```

### Battery Binary Transform (Bed Sensor)
```javascript
transform: (v) => {
  if (v === 0) return 10;  // depleted
  if (v === 1) return 100; // OK
  return v; // pass-through percentage
}
```

### Temperature Auto-Scale (Soil Sensor)
```javascript
transform: (v) => {
  const num = Number(v);
  if (Math.abs(num) > 1000) return num * 100;
  if (Math.abs(num) > 100) return num * 10;
  return num;
}
```

### Rain Intensity Transform
```javascript
transform: (v) => typeof v === 'number' ? v > 0 : (v !== 0 && v !== false)
```

---

*Generated by Claude Code - 15 June 2026*
