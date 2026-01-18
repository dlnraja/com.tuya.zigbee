# 🌐 ANALYSE FORUMS HOMEY - BEST PRACTICES & AMÉLIORATIONS

**Sources analysées:** Tuya Smart Life, Tuya Cloud, Device Capabilities, IKEA Tradfri, Aqara/Xiaomi, Sonoff, Ecodim, Robb

## 📊 PATTERNS IDENTIFIÉS

### 1. **TUYA SMART LIFE - SCALING FACTORS**
**Source:** https://community.homey.app/t/app-tuya-smart-life-smart-living/146735/150

**Problème:**
- Energy monitoring values incorrects (voltage, current, power)
- Valeurs Homey ≠ Valeurs Tuya app

**Solution:**
```javascript
// Device specifications JSON contains scaling factors
"status": {
  "cur_voltage": 2300  // Scaled 1/10 from Tuya app (230V)
}
```

**Pattern appliqué:**
- Vérifier device specifications après pairing
- Identifier scaling factors dans status
- Configurable settings pour scaling (x10, x100, /10, /100)

**Application à notre app:**
```javascript
// lib/TuyaEnergyDevice.js
_parseVoltage(value, scaleFactor = 1) {
  const scaled = value * scaleFactor;
  return parseFloat(scaled.toFixed(1));
}

// Settings in driver.compose.json
"settings": [
  {
    "id": "voltage_scale",
    "type": "dropdown",
    "value": "0.1",
    "values": [
      { "id": "0.01", "label": { "en": "÷100" } },
      { "id": "0.1", "label": { "en": "÷10" } },
      { "id": "1", "label": { "en": "×1 (no scaling)" } },
      { "id": "10", "label": { "en": "×10" } }
    ]
  }
]
```

---

### 2. **DEVICE CAPABILITIES - UX FLOW CARDS**
**Source:** https://community.homey.app/t/app-pro-device-capabilities-enhance-the-capabilities-of-devices/43287/12

**Problème:**
- Device name entered 2x on same flow card
- Poor UX, redundant input

**Solution:**
- Device selection auto-filters events
- Single device picker shows only relevant triggers/conditions

**Application:**
```javascript
// Flow card with device argument auto-filtering
"triggers": [
  {
    "id": "presence_detected",
    "title": { "en": "Presence detected" },
    "args": [
      {
        "type": "device",
        "name": "device",
        "filter": "driver_id=presence_sensor_radar"
      }
    ]
  }
]
```

**Best Practice:**
✅ Device argument auto-filters capabilities
✅ Single device selection per card
✅ Clear, concise trigger names

---

### 3. **IKEA TRADFRI - MATTER BRIDGE & DIMMING**
**Source:** https://community.homey.app/t/app-ikea-tradfri-create-the-right-atmosphere-for-every-mood-by-athom/111676/23

**Pattern:**
- IKEA Dirigera Matter support
- Remote controls work natively with dimming
- Flow access for advanced automation

**Use Case:**
```
Motion sensor → Deactivate when light manually turned off via remote
              → Reactivate when light turned on via remote
```

**Application à notre app:**
```javascript
// Detect manual control vs automation
onCapabilityOnoff(value, opts) {
  if (opts.fromRemote || opts.fromButton) {
    // Manual control - disable automation
    this.setStoreValue('automation_disabled', true);
    this.triggerFlow('manual_control_detected', { action: value ? 'on' : 'off' });
  } else {
    // Automation control
    this.setStoreValue('automation_disabled', false);
  }
}
```

---

### 4. **AQARA/XIAOMI - LIFELINE REPORTING**
**Source:** https://community.homey.app/t/app-aqara-xiaomi-smart-home-simplify-your-life-with-a-smarter-home/156

**Key Features:**
1. **Lifeline Reporting** - Device-dependent interval
2. **Battery reporting** - measurement + alarm
3. **Offset settings** - Temperature/humidity calibration
4. **Reverse logic** - Contact sensor alarm inversion

**Code Patterns:**
```javascript
// Temperature/Humidity offset settings
"settings": [
  {
    "id": "temperature_offset",
    "type": "number",
    "label": { "en": "Temperature offset (°C)" },
    "value": 0,
    "min": -5,
    "max": 5,
    "step": 0.1
  },
  {
    "id": "humidity_offset",
    "type": "number",
    "label": { "en": "Humidity offset (%)" },
    "value": 0,
    "min": -20,
    "max": 20,
    "step": 1
  }
]

// Reverse contact alarm logic
"settings": [
  {
    "id": "reverse_alarm",
    "type": "checkbox",
    "label": { "en": "Reverse alarm logic" },
    "value": false,
    "hint": { "en": "Swap open/closed states" }
  }
]

// Application
_updateTemperature(value) {
  const offset = this.getSetting('temperature_offset') || 0;
  const adjusted = parseFloat(value) + offset;
  this.setCapabilityValue('measure_temperature', adjusted);
}
```

**Battery Monitoring Pattern:**
```javascript
// Lifeline reporting interval
configureReporting() {
  this.registerCapabilityListener('alarm_battery', async (value) => {
    if (value) {
      this.setWarning(this.homey.__('warnings.battery_low'));
    } else {
      this.unsetWarning();
    }
  });
}
```

---

### 5. **ECODIM - DIMMING FLOWS SANS TIMER**
**Source:** https://community.homey.app/t/app-ecodim-affordable-reliable-led-dimmers-for-everyone/17632

**Innovation:**
- Dimming flows SANS app timer externe
- Feedback du dim level au controller
- Configurable dimming speeds

**Pattern:**
```javascript
// Wall controller dimming flow
"flow": {
  "triggers": [
    {
      "id": "dim_up_started",
      "title": { "en": "Dimming up started" }
    },
    {
      "id": "dim_up_stopped",
      "title": { "en": "Dimming up stopped" }
    },
    {
      "id": "dim_down_started",
      "title": { "en": "Dimming down started" }
    }
  ],
  "actions": [
    {
      "id": "set_dim_level",
      "title": { "en": "Set dim level" },
      "args": [
        {
          "type": "range",
          "name": "level",
          "min": 0,
          "max": 1,
          "step": 0.01,
          "label": "%",
          "labelMultiplier": 100
        }
      ]
    }
  ]
}

// Settings
"settings": [
  {
    "id": "dim_speed",
    "type": "dropdown",
    "label": { "en": "Dimming speed" },
    "value": "medium",
    "values": [
      { "id": "slow", "label": { "en": "Slow (5s)" } },
      { "id": "medium", "label": { "en": "Medium (2s)" } },
      { "id": "fast", "label": { "en": "Fast (0.5s)" } }
    ]
  }
]
```

**Feedback Pattern:**
```javascript
// Sync dim level back to controller
async onCapabilityDim(value, opts) {
  await super.onCapabilityDim(value, opts);

  // Feedback to wall controller
  if (!opts.fromController) {
    this.triggerFlow('dim_level_feedback', { level: value });
  }
}
```

---

### 6. **SONOFF - ANTI-PATTERN (ÉVITER)**
**Source:** https://community.homey.app/t/app-pro-sonoff-zigbee/36418/453

**Problème:**
- App non mise à jour depuis 1+ an
- Users frustrated, no support
- Abandoned project

**Lesson:**
❌ Ne PAS abandonner maintenance
✅ Updates réguliers (monthly minimum)
✅ Community engagement
✅ Changelog transparent

---

### 7. **AQARA CURTAINS - MAINTENANCE ACTIONS**
**Source:** https://community.homey.app/t/aqara-qurtains-stopped-working/148804

**Pattern identifié:**
- Curtain motors need maintenance actions
- Calibration, position reset, manual control disable

**Application:**
```javascript
"flow": {
  "actions": [
    {
      "id": "curtain_calibrate",
      "title": { "en": "Calibrate curtain" },
      "hint": { "en": "Run full open/close cycle for calibration" }
    },
    {
      "id": "curtain_reset_position",
      "title": { "en": "Reset position" },
      "hint": { "en": "Reset curtain to 0% position" }
    },
    {
      "id": "curtain_enable_manual",
      "title": { "en": "Enable/disable manual control" },
      "args": [
        {
          "type": "checkbox",
          "name": "enabled",
          "title": { "en": "Allow manual pulling" }
        }
      ]
    }
  ]
}
```

---

## 🎯 AMÉLIORATIONS APPLICABLES À NOTRE APP

### **PRIORITÉ HAUTE (Immediate)**

#### 1. **Energy Monitoring Scaling Factors**
**Files:** `lib/TuyaEnergyDevice.js`, all power_meter/plug drivers

```javascript
// Add to all energy monitoring drivers
"settings": [
  {
    "type": "group",
    "label": { "en": "Energy Monitoring Calibration" },
    "children": [
      {
        "id": "voltage_scale",
        "type": "dropdown",
        "label": { "en": "Voltage scaling" },
        "value": "0.1",
        "values": [
          { "id": "0.01", "label": { "en": "÷100" } },
          { "id": "0.1", "label": { "en": "÷10 (default)" } },
          { "id": "1", "label": { "en": "×1" } },
          { "id": "10", "label": { "en": "×10" } }
        ]
      },
      {
        "id": "current_scale",
        "type": "dropdown",
        "label": { "en": "Current scaling" },
        "value": "0.001",
        "values": [
          { "id": "0.001", "label": { "en": "÷1000 (mA→A)" } },
          { "id": "0.01", "label": { "en": "÷100" } },
          { "id": "0.1", "label": { "en": "÷10" } },
          { "id": "1", "label": { "en": "×1" } }
        ]
      },
      {
        "id": "power_scale",
        "type": "dropdown",
        "label": { "en": "Power scaling" },
        "value": "0.1",
        "values": [
          { "id": "0.1", "label": { "en": "÷10 (default)" } },
          { "id": "1", "label": { "en": "×1" } },
          { "id": "10", "label": { "en": "×10" } }
        ]
      }
    ]
  }
]
```

#### 2. **Climate Sensor Offset Settings**
**Files:** `drivers/climate_sensor/*`, `drivers/presence_sensor_radar/*`

```javascript
"settings": [
  {
    "type": "group",
    "label": { "en": "Sensor Calibration" },
    "children": [
      {
        "id": "temperature_offset",
        "type": "number",
        "label": { "en": "Temperature offset" },
        "units": "°C",
        "value": 0,
        "min": -10,
        "max": 10,
        "step": 0.1
      },
      {
        "id": "humidity_offset",
        "type": "number",
        "label": { "en": "Humidity offset" },
        "units": "%",
        "value": 0,
        "min": -30,
        "max": 30,
        "step": 1
      }
    ]
  }
]
```

#### 3. **Contact Sensor Reverse Logic**
**Files:** `drivers/contact_sensor/*`

```javascript
"settings": [
  {
    "id": "reverse_alarm",
    "type": "checkbox",
    "label": { "en": "Reverse alarm logic" },
    "hint": { "en": "Swap open/closed states (use if sensor reports inverted)" },
    "value": false
  }
]

// In device.js
_updateContactState(value) {
  const reverse = this.getSetting('reverse_alarm');
  const state = reverse ? !value : value;
  this.setCapabilityValue('alarm_contact', state);
}
```

#### 4. **Curtain Maintenance Actions**
**Files:** `drivers/curtain_motor/*`

```javascript
"flow": {
  "actions": [
    {
      "id": "curtain_calibrate",
      "title": { "en": "Calibrate curtain motor" }
    },
    {
      "id": "curtain_reset_position",
      "title": { "en": "Reset position to 0%" }
    }
  ]
}
```

#### 5. **Dimmer Speed Settings**
**Files:** `drivers/dimmer_wall_*/*`

```javascript
"settings": [
  {
    "id": "dim_speed",
    "type": "dropdown",
    "label": { "en": "Dimming speed" },
    "value": "medium",
    "values": [
      { "id": "slow", "label": { "en": "Slow (5 seconds)" } },
      { "id": "medium", "label": { "en": "Medium (2 seconds)" } },
      { "id": "fast", "label": { "en": "Fast (0.5 seconds)" } }
    ]
  }
]
```

---

### **PRIORITÉ MOYENNE (Short-term)**

#### 6. **Manual Control Detection**
**Files:** All switch/dimmer/curtain drivers

```javascript
// Detect manual vs automation control
this.triggerFlow('manual_control_detected', {
  device: this.getName(),
  type: 'button' // or 'remote', 'app'
});

// Flow trigger
{
  "id": "manual_control_detected",
  "title": { "en": "Manual control detected" },
  "tokens": [
    {
      "name": "type",
      "type": "string",
      "title": { "en": "Control type" },
      "example": "button"
    }
  ]
}
```

#### 7. **Dimmer Feedback Flows**
**Files:** `drivers/dimmer_wall_*/*`, `drivers/bulb_*/*`

```javascript
{
  "id": "dim_level_changed_feedback",
  "title": { "en": "Dim level changed (for feedback)" },
  "tokens": [
    {
      "name": "level",
      "type": "number",
      "title": { "en": "Level" },
      "example": 0.5
    }
  ]
}
```

---

### **PRIORITÉ BASSE (Long-term)**

#### 8. **Matter Bridge Support**
Research IKEA Dirigera pattern for future Matter integration

#### 9. **Advanced Virtual Capabilities**
Inspiration from Device Capabilities app

---

## 📝 ACTIONS REQUISES

### Immediate (Today):
1. ✅ Add energy monitoring scaling factors
2. ✅ Add climate sensor offset settings
3. ✅ Add contact sensor reverse logic
4. ✅ Add curtain maintenance actions
5. ✅ Add dimmer speed settings

### Short-term (This week):
6. Manual control detection triggers
7. Dimmer feedback flows
8. Documentation update

### Long-term (This month):
9. Matter bridge research
10. Advanced capabilities exploration

---

## 🔧 SCRIPTS À CRÉER

1. `scripts/add_scaling_settings.js` - Energy monitoring calibration
2. `scripts/add_offset_settings.js` - Climate sensor offsets
3. `scripts/add_maintenance_actions.js` - Curtain/device maintenance
4. `scripts/validate_all_settings.js` - Ensure all settings valid

---

**Status:** Ready for implementation
**Date:** 10 janvier 2026
**Priority:** HIGH - User-facing improvements
