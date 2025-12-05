# New DPs Quick Reference Guide

**Database Version:** 2.0.0
**Date:** 2025-12-05
**New DPs:** 100 (Total: 172)

---

## Quick Access by Device Type

### 🌡️ Thermostat Devices (30-49)

| DP | Type | Usage | Homey Capability |
|----|------|-------|------------------|
| 30 | enum | HVAC mode (auto/manual/off) | `thermostat_mode` |
| 31 | value | Temperature limit lower (°C) | - |
| 32 | value | Temperature limit upper (°C) | - |
| 34 | value | Humidity target (dehumidifier) | `target_humidity` |
| 35 | value | Error/battery_low status | - |
| 36 | value | Frost protection | - |
| 37 | bool | Vacation mode | - |
| 38 | bool | Away mode | - |
| 39 | value | Scale protection | - |
| 47 | value | Temperature calibration | - |
| 48 | enum | Operating state (off/heat/cool) | - |
| 49 | value | Boost time remaining (seconds) | - |

**Common Models:** BHT-002, BRT-100, TS0601

---

### 💡 RGB/RGBW Lighting (53-60)

| DP | Type | Usage | Homey Capability |
|----|------|-------|------------------|
| 53 | value | Red channel (0-255) | - |
| 54 | value | Green channel (0-255) | - |
| 55 | value | Blue channel (0-255) | - |
| 56 | value | White channel (0-255) | - |
| 57 | enum | Light mode (white/color/scene/music) | - |
| 58 | enum | Scene selection (0-10) | - |
| 59 | value | Animation speed (%) | - |
| 60 | string | HSV color data | - |

**Common Models:** TS0503A, TS0504A, TS0505, Lidl RGB strips

**Usage Example:**
```javascript
// Set RGB color
device.setDP(53, 255);  // Red: max
device.setDP(54, 128);  // Green: half
device.setDP(55, 0);    // Blue: off
```

---

### ⚡ 3-Phase Energy Monitoring (122-145)

#### Power Measurement (122-125)
| DP | Type | Usage | Unit | Capability |
|----|------|-------|------|------------|
| 122 | value | Active power phase A | W | `measure_power` |
| 123 | value | Active power phase B | W | `measure_power.phaseB` |
| 124 | value | Active power phase C | W | `measure_power.phaseC` |
| 125 | value | Total active power | W | `measure_power` |

#### Current Measurement (126-128)
| DP | Type | Usage | Unit | Capability |
|----|------|-------|------|------------|
| 126 | value | Current phase A | A × 1000 | `measure_current` |
| 127 | value | Current phase B | A × 1000 | `measure_current.phaseB` |
| 128 | value | Current phase C | A × 1000 | `measure_current.phaseC` |

#### Voltage Measurement (129-131)
| DP | Type | Usage | Unit | Capability |
|----|------|-------|------|------------|
| 129 | value | Voltage phase A | V × 10 | `measure_voltage` |
| 130 | value | Voltage phase B | V × 10 | `measure_voltage.phaseB` |
| 131 | value | Voltage phase C | V × 10 | `measure_voltage.phaseC` |

#### Advanced Energy (132-136)
| DP | Type | Usage | Unit | Capability |
|----|------|-------|------|------------|
| 132 | value | Total energy consumed | kWh × 100 | `meter_power` |
| 133 | value | Power factor | ×0.01 | - |
| 134 | value | Grid frequency | Hz × 100 | - |
| 135 | value | Reactive power | VAR | - |
| 136 | value | Apparent power | VA | - |

#### Protection Features (137-145)
| DP | Type | Usage |
|----|------|-------|
| 137 | bool | Power restore mode |
| 138 | value | Power threshold (overcurrent) |
| 139 | value | Voltage threshold (overvoltage) |
| 140 | bool | Overcurrent protection enabled |
| 141 | bool | Overvoltage protection enabled |
| 142 | bool | Undervoltage protection enabled |
| 143 | value | Total operation time (seconds) |
| 144 | bool | Energy reset trigger |
| 145 | bool | LED indicator mode |

**Common Models:** TS0601, TS011F (3-phase monitors)

**Usage Example:**
```javascript
// Read 3-phase power
const powerA = device.getDP(122);
const powerB = device.getDP(123);
const powerC = device.getDP(124);
const totalPower = device.getDP(125);
```

---

### 🔬 Advanced Sensors (146-170)

#### Weather Sensors (146-147)
| DP | Type | Usage | Unit | Capability |
|----|------|-------|------|------------|
| 146 | value | Wind direction | degrees | `measure_wind_direction` |
| 147 | value | Rainfall amount | mm × 10 | `measure_rain` |

#### Air Quality (148-152)
| DP | Type | Usage | Unit | Capability |
|----|------|-------|------|------------|
| 148 | value | PM1.0 concentration | µg/m³ | `measure_pm1` |
| 149 | value | TVOC (Total VOC) | ppb | `measure_tvoc` |
| 150 | value | CO (Carbon Monoxide) | ppm | `measure_co` |
| 151 | value | Combustible gas (CH4/LPG) | %LEL | `measure_gas` |
| 152 | value | Sound level (noise) | dB | `measure_noise` |

#### Soil Monitoring (153-155)
| DP | Type | Usage | Unit |
|----|------|-------|------|
| 153 | value | Soil conductivity (EC) | µS/cm |
| 154 | value | Soil pH level | pH |
| 155 | value | NPK fertilizer (nitrogen) | mg/L |

#### Water Monitoring (156-159)
| DP | Type | Usage | Unit | Capability |
|----|------|-------|------|------------|
| 156 | value | Water level / depth | cm | - |
| 157 | value | Water flow rate | L/min | - |
| 158 | value | Water consumption total | L | `meter_water` |
| 159 | bool | Water leak detected | - | `alarm_water` |

#### Radar/Presence (160-170)
| DP | Type | Usage | Unit | Capability |
|----|------|-------|------|------------|
| 160 | value | Target distance | cm | `measure_distance` |
| 161 | value | Motion confidence level | % | - |
| 162 | enum | Motion direction (stationary/moving/approaching/away) | - | - |
| 163 | value | Response time | ms | - |
| 164 | value | Radar sensitivity | % | - |
| 165 | value | Detection range minimum | cm | - |
| 166 | value | Detection range maximum | cm | - |
| 167 | value | Detection delay / hold time | seconds | - |
| 168 | value | Fading time / unoccupied delay | seconds | - |
| 169 | enum | Motion detection mode (large/small/breathing) | - | - |
| 170 | bool | Static detection enabled | - | - |

**Common Models:** TS0225, TS0601, ZY-M100, Weather stations

---

### ⚙️ Configuration DPs (171-190)

#### Button Configuration (171-175)
| DP | Type | Usage |
|----|------|-------|
| 171 | bool | Scene switch enable |
| 172 | enum | Button mode (scene/switch/dimmer) |
| 173 | value | Long press duration (ms) |
| 174 | bool | Beep on press |
| 175 | bool | Vibration on press |

#### Switch Configuration (180-184)
| DP | Type | Usage |
|----|------|-------|
| 180 | enum | Power-on behavior (off/on/restore) |
| 181 | bool | Inching mode enabled |
| 182 | value | Inching duration (seconds) |
| 183 | bool | Interlock enabled |
| 184 | enum | Switch mode (relay_mode/detached_mode) |

#### Dimmer/Light Configuration (185-190)
| DP | Type | Usage |
|----|------|-------|
| 185 | value | Minimum brightness (%) |
| 186 | value | Maximum brightness (%) |
| 187 | enum | Light type/load type (RC/RL/C) |
| 188 | value | PWM frequency (Hz) |
| 189 | value | Fade time (ms) |
| 190 | enum | Transition mode (instant/smooth/fade/custom) |

**Common Models:** TS0001-TS0004, TS110F, TS011F

---

### 📅 Weekly Scheduling (202-208)

| DP | Type | Usage |
|----|------|-------|
| 202 | string | Weekly schedule (Monday) - JSON |
| 203 | string | Weekly schedule (Tuesday) - JSON |
| 204 | string | Weekly schedule (Wednesday) - JSON |
| 205 | string | Weekly schedule (Thursday) - JSON |
| 206 | string | Weekly schedule (Friday) - JSON |
| 207 | string | Weekly schedule (Saturday) - JSON |
| 208 | string | Weekly schedule (Sunday) - JSON |

**Common Models:** BHT-002, thermostat devices

**Schedule Format:**
```json
{
  "periods": [
    {"time": "06:00", "temp": 21.0},
    {"time": "08:00", "temp": 18.0},
    {"time": "17:00", "temp": 22.0},
    {"time": "22:00", "temp": 19.0}
  ]
}
```

---

## Common Usage Patterns

### Pattern 1: Energy Monitoring Device

```javascript
// Read single-phase power metrics
const current = device.getDP(17);   // A × 1000
const power = device.getDP(18);     // W × 10
const voltage = device.getDP(19);   // V × 10
const energy = device.getDP(20);    // kWh × 100

// Read 3-phase metrics (advanced)
const phaseAPower = device.getDP(122);
const phaseBPower = device.getDP(123);
const phaseCPower = device.getDP(124);
```

### Pattern 2: RGB Lighting Control

```javascript
// Set light mode
device.setDP(57, 1);  // 0=white, 1=color, 2=scene, 3=music

// Set RGB values
device.setDP(53, 255);  // Red
device.setDP(54, 128);  // Green
device.setDP(55, 64);   // Blue

// Set scene
device.setDP(58, 3);    // Scene 3

// Set animation speed
device.setDP(59, 75);   // 75% speed
```

### Pattern 3: Thermostat Control

```javascript
// Set HVAC mode
device.setDP(30, 1);    // 0=auto, 1=manual, 2=off

// Set target temperature (already exists as DP4)
device.setDP(4, 220);   // 22.0°C (divide by 10)

// Enable frost protection
device.setDP(36, 1);

// Set vacation mode
device.setDP(37, 1);
```

### Pattern 4: Radar Presence Configuration

```javascript
// Configure radar sensitivity
device.setDP(164, 75);  // 75% sensitivity

// Set detection range
device.setDP(165, 50);  // Min: 50cm
device.setDP(166, 600); // Max: 600cm

// Set detection delay
device.setDP(167, 5);   // 5 seconds hold time

// Set fading time
device.setDP(168, 30);  // 30 seconds unoccupied delay

// Enable static detection
device.setDP(170, 1);
```

---

## Type Reference

### DP Types

- **bool**: Boolean value (0 or 1)
- **value**: Numeric value (often needs scaling)
- **enum**: Enumerated value (discrete options)
- **string**: Text/JSON data
- **raw**: Binary data

### Common Scaling

- **Temperature**: Divide by 10 (e.g., 220 = 22.0°C)
- **Humidity**: Divide by 10 (e.g., 650 = 65.0%)
- **Current**: Divide by 1000 (e.g., 5000 = 5.0A)
- **Voltage**: Divide by 10 (e.g., 2300 = 230V)
- **Power**: Divide by 10 (e.g., 1500 = 150W)
- **Energy**: Divide by 100 (e.g., 12345 = 123.45 kWh)

---

## Device Compatibility

### Fully Supported Device Types
- ✅ 3-phase energy monitors
- ✅ RGB/RGBW LED controllers
- ✅ Advanced thermostats with scheduling
- ✅ mmWave radar presence sensors
- ✅ Weather stations
- ✅ Soil moisture sensors
- ✅ Water leak detectors
- ✅ Air quality monitors (PM1.0, TVOC, CO)

### Partially Supported
- ⚠️ Lighting effects (DP 61-99 gap)
- ⚠️ Advanced button configurations

---

## Related Documentation

- **Full Database:** `/home/user/com.tuya.zigbee/data/tuya-dp-complete-database.json`
- **Enrichment Report:** `/home/user/com.tuya.zigbee/docs/DP_DATABASE_ENRICHMENT_REPORT.md`
- **Enrichment Script:** `/home/user/com.tuya.zigbee/scripts/enrich_dp_database.py`

---

**Last Updated:** 2025-12-05
**Database Version:** 2.0.0
