# 🔧 Tuya DP Engine

**Universal Data Point interpretation engine for Tuya Zigbee devices**

---

## 🎯 Purpose

The Tuya DP Engine is a **centralized, reusable system** for interpreting Tuya device Data Points (DPs) and mapping them to Homey capabilities.

**Problem it solves:**
- Tuya devices use TS0601 with custom Data Points (DPs)
- Each DP has specific meaning, scale, and unit
- Without centralization, every driver duplicates DP logic
- Adding a new device = copy-paste + modify = technical debt

**Solution:**
- **One engine** interprets all DPs
- **Profiles** define device capabilities
- **Converters** handle DP ↔ Homey value transformation
- **Drivers** are reduced to declarative configuration

---

## 📁 Architecture

```
lib/tuya-dp-engine/
├── README.md                    # This file
├── index.js                     # Main engine entry point
├── fingerprints.json            # Device identification
├── profiles.json                # Capability profiles
├── capability-map.json          # DP → Capability mapping
├── converters/                  # Value transformation
│   ├── onoff.js
│   ├── dim.js
│   ├── temperature.js
│   ├── humidity.js
│   ├── cover.js
│   ├── thermostat.js
│   └── ...
└── traits/                      # Reusable mixins
    ├── OnOffTrait.js
    ├── DimmingTrait.js
    ├── TemperatureTrait.js
    └── ...
```

---

## 🔍 How It Works

### 1. Device Fingerprinting
```json
// fingerprints.json
{
  "_TZ3000_8nkb7mof": {
    "manufacturer": "MOES",
    "model": "Smart Plug ZSS-X",
    "profile": "smart-plug-energy",
    "category": "plugs"
  }
}
```

### 2. Profile Definition
```json
// profiles.json
{
  "smart-plug-energy": {
    "name": "Smart Plug with Energy Monitoring",
    "capabilities": [
      "onoff",
      "measure_power",
      "measure_current",
      "measure_voltage",
      "meter_power"
    ],
    "traits": ["OnOffTrait", "EnergyMonitoringTrait"]
  }
}
```

### 3. Capability Mapping
```json
// capability-map.json
{
  "onoff": {
    "dp": 1,
    "type": "bool",
    "converter": "onoff"
  },
  "measure_power": {
    "dp": 19,
    "type": "value",
    "converter": "power",
    "scale": 10
  }
}
```

### 4. Converter Implementation
```javascript
// converters/power.js
module.exports = {
  toHomey: (dpValue, config) => {
    // DP value is in deciwatts (W * 10)
    return dpValue / (config.scale || 10);
  },
  
  toDevice: (homeyValue, config) => {
    // Convert back to deciwatts
    return Math.round(homeyValue * (config.scale || 10));
  }
};
```

### 5. Driver Usage
```javascript
// drivers/smart_plug_ac/device.js
const TuyaDPEngine = require('../../lib/tuya-dp-engine');

class SmartPlugDevice extends Homey.Device {
  async onInit() {
    // Engine detects manufacturer, loads profile, sets up capabilities
    this.dpEngine = new TuyaDPEngine(this);
    await this.dpEngine.initialize();
  }
  
  // That's it! Engine handles the rest.
}
```

---

## 📋 Data Point Types

### Standard Tuya DP Types
```javascript
DP_TYPE_RAW     = 0x00  // Raw bytes
DP_TYPE_BOOL    = 0x01  // Boolean (true/false)
DP_TYPE_VALUE   = 0x02  // Integer value
DP_TYPE_STRING  = 0x03  // String
DP_TYPE_ENUM    = 0x04  // Enumeration (0, 1, 2...)
DP_TYPE_BITMAP  = 0x05  // Bitmap (flags)
```

### Common DP Mappings
| DP  | Name | Type | Description | Example |
|-----|------|------|-------------|---------|
| 1   | switch | bool | On/Off state | true/false |
| 2   | brightness | value | Dimming level | 0-1000 |
| 3   | mode | enum | Operation mode | 0=white, 1=color |
| 4   | temperature | value | Color temperature | 0-1000 (mireds) |
| 13  | temperature_sensor | value | Temperature reading | 250 = 25.0°C |
| 14  | humidity_sensor | value | Humidity reading | 550 = 55.0% |
| 18  | current | value | Current (mA) | 1234 = 1.234A |
| 19  | power | value | Power (dW) | 450 = 45.0W |
| 20  | voltage | value | Voltage (dV) | 2200 = 220.0V |

---

## 🎨 Traits System

Traits are **reusable capability mixins** that add common functionality.

### Example: OnOffTrait
```javascript
// traits/OnOffTrait.js
module.exports = class OnOffTrait {
  constructor(device, config) {
    this.device = device;
    this.config = config;
  }
  
  register() {
    this.device.registerCapability('onoff', cluster => {
      return {
        set: value => this.setOnOff(value),
        get: () => this.getOnOff()
      };
    });
  }
  
  async setOnOff(value) {
    const dp = this.config.dp || 1;
    await this.device.sendDP(dp, value, 'bool');
  }
  
  getOnOff() {
    const dp = this.config.dp || 1;
    return this.device.getDP(dp);
  }
};
```

### Usage in Profile
```json
{
  "smart-plug-basic": {
    "traits": [
      {
        "trait": "OnOffTrait",
        "config": { "dp": 1 }
      }
    ]
  }
}
```

---

## 🔄 Converter Examples

### Temperature Converter
```javascript
// converters/temperature.js
module.exports = {
  toHomey: (dpValue, config) => {
    // Tuya sends temperature * 10 (e.g., 235 = 23.5°C)
    const scale = config.scale || 10;
    return dpValue / scale;
  },
  
  toDevice: (homeyValue, config) => {
    const scale = config.scale || 10;
    return Math.round(homeyValue * scale);
  }
};
```

### Cover Converter
```javascript
// converters/cover.js
module.exports = {
  toHomey: (dpValue, config) => {
    // Tuya: 0-100 where 0=closed, 100=open
    // Homey: 0-1 where 0=closed, 1=open
    return dpValue / 100;
  },
  
  toDevice: (homeyValue, config) => {
    // Convert 0-1 to 0-100
    return Math.round(homeyValue * 100);
  }
};
```

### Enum Converter
```javascript
// converters/enum.js
module.exports = {
  toHomey: (dpValue, config) => {
    // Map Tuya enum to Homey string
    const mapping = config.mapping || {};
    return mapping[dpValue] || 'unknown';
  },
  
  toDevice: (homeyValue, config) => {
    // Reverse mapping
    const mapping = config.mapping || {};
    const reverseMap = Object.entries(mapping)
      .reduce((acc, [k, v]) => ({ ...acc, [v]: parseInt(k) }), {});
    return reverseMap[homeyValue] || 0;
  }
};
```

---

## 📊 Profile Examples

### Smart Plug with Energy
```json
{
  "smart-plug-energy": {
    "name": "Smart Plug with Energy Monitoring",
    "capabilities": [
      "onoff",
      "measure_power",
      "measure_current",
      "measure_voltage",
      "meter_power"
    ],
    "traits": [
      "OnOffTrait",
      "EnergyMonitoringTrait"
    ],
    "dp_mapping": {
      "onoff": { "dp": 1, "type": "bool" },
      "measure_power": { "dp": 19, "type": "value", "converter": "power", "scale": 10 },
      "measure_current": { "dp": 18, "type": "value", "converter": "current", "scale": 1000 },
      "measure_voltage": { "dp": 20, "type": "value", "converter": "voltage", "scale": 10 },
      "meter_power": { "dp": 17, "type": "value", "converter": "energy", "scale": 100 }
    }
  }
}
```

### RGB Bulb
```json
{
  "bulb-rgb": {
    "name": "RGB Smart Bulb",
    "capabilities": [
      "onoff",
      "dim",
      "light_hue",
      "light_saturation",
      "light_temperature",
      "light_mode"
    ],
    "traits": [
      "OnOffTrait",
      "DimmingTrait",
      "ColorTrait",
      "TemperatureTrait"
    ],
    "dp_mapping": {
      "onoff": { "dp": 1, "type": "bool" },
      "dim": { "dp": 2, "type": "value", "converter": "dim", "max": 1000 },
      "light_mode": { "dp": 3, "type": "enum", "converter": "enum", "mapping": { "0": "white", "1": "color" } },
      "light_temperature": { "dp": 4, "type": "value", "converter": "temperature", "min": 0, "max": 1000 },
      "light_hue": { "dp": 5, "type": "value", "converter": "hue" },
      "light_saturation": { "dp": 6, "type": "value", "converter": "saturation" }
    }
  }
}
```

### Thermostat
```json
{
  "thermostat-basic": {
    "name": "Thermostat",
    "capabilities": [
      "target_temperature",
      "measure_temperature",
      "thermostat_mode"
    ],
    "traits": [
      "TemperatureTrait",
      "ThermostatTrait"
    ],
    "dp_mapping": {
      "target_temperature": { "dp": 2, "type": "value", "converter": "temperature", "scale": 10, "min": 50, "max": 300 },
      "measure_temperature": { "dp": 3, "type": "value", "converter": "temperature", "scale": 10 },
      "thermostat_mode": { "dp": 1, "type": "enum", "converter": "enum", "mapping": { "0": "off", "1": "heat", "2": "cool", "3": "auto" } }
    }
  }
}
```

---

## 🚀 Benefits

### For Developers
✅ **No duplication** - Write converter once, use everywhere  
✅ **Declarative drivers** - Just config, no logic  
✅ **Easy additions** - New device = add profile JSON  
✅ **Testable** - Converters are pure functions  
✅ **Maintainable** - Fix bug once, fixes all drivers  

### For Users
✅ **More devices** - Faster device support  
✅ **Consistency** - Same behavior across devices  
✅ **Reliability** - Centralized, tested code  
✅ **Updates** - Fixes benefit all devices  

### For Project
✅ **Scalable** - 183 → 500+ drivers without explosion  
✅ **Professional** - Industry-standard architecture  
✅ **Portable** - Profiles can export to HA/Z2M  
✅ **Community** - PRs add profiles, not code  

---

## 📈 Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [x] Create tuya-dp-engine structure
- [ ] Implement core engine (index.js)
- [ ] Basic converters (onoff, dim, temperature)
- [ ] Fingerprints for top 20 devices
- [ ] Profiles for top 5 categories

### Phase 2: Expansion (Week 3-4)
- [ ] All standard converters
- [ ] Trait system implementation
- [ ] 100+ device fingerprints
- [ ] 20+ profiles
- [ ] Unit tests for converters

### Phase 3: Migration (Week 5-8)
- [ ] Migrate 10 drivers to use engine
- [ ] Validate no regressions
- [ ] Document migration guide
- [ ] Community beta testing

### Phase 4: Scale (Week 9-12)
- [ ] Migrate all 183 drivers
- [ ] Profile community hub
- [ ] Auto-generation tools
- [ ] Performance optimization

---

## 🔗 Related Documentation

- [Capability Map Reference](./capability-map.json)
- [Profiles Library](./profiles.json)
- [Fingerprints Database](./fingerprints.json)
- [Converter API](./converters/README.md)
- [Trait System](./traits/README.md)

---

**Version:** 1.0.0  
**Status:** 🚧 Under Development  
**Target:** v2.20.0 (Q1 2026)

🎯 **Goal: Make adding Tuya devices as easy as adding a JSON profile!**
