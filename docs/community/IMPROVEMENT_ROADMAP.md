# 🚀 ROADMAP AMÉLIORATIONS - UNIVERSAL TUYA ZIGBEE

**Basé sur:** Apps populaires Homey Community  
**Sources:** Device Capabilities, Philips Hue, Aqara, SONOFF  
**Focus:** Flows, Features, Capabilities, Manufacturer Names  
**Date:** 16 Octobre 2025

---

## 📊 ANALYSE APPS POPULAIRES

### 1. Device Capabilities App
**Source:** https://community.homey.app/t/app-pro-device-capabilities-enhance-the-capabilities-of-devices/43287

**Concept:** Ajouter capabilities manquantes aux devices

**Ce qu'on peut implémenter:**

#### A. Advanced Flow Cards
```javascript
// WHEN cards (triggers)
✅ Motion detected with specific lux level
✅ Temperature crossed threshold (rising/falling)
✅ Humidity changed by X%
✅ Battery below threshold with notification
✅ Power consumption above/below threshold
✅ Contact sensor opened for duration
✅ Button pressed X times (multi-press)

// THEN cards (actions)
✅ Turn on with specific brightness
✅ Change color with transition time
✅ Dim to level over duration
✅ Set thermostat with mode
✅ Enable/disable motion sensor
✅ Set reporting interval
✅ Reset energy meter
✅ Trigger alarm on device

// AND cards (conditions)
✅ Check if motion detected in last X minutes
✅ Check if temperature in range
✅ Check if device is reachable
✅ Check battery level
✅ Check power consumption
```

---

#### B. Virtual Capabilities
```javascript
// Ajouter capabilities dérivées
measure_apparent_power  // Calculé de V × A
measure_power_factor    // Calculé de W / VA
measure_daily_energy    // Cumul journalier
measure_monthly_energy  // Cumul mensuel
meter_cost             // Coût en €
alarm_offline          // Device unreachable
```

---

#### C. Enhanced Capabilities
```javascript
// Enrichir capabilities existantes
measure_temperature: {
  min: -20,
  max: 60,
  step: 0.1,
  decimals: 1,
  units: '°C'
}

measure_power: {
  min: 0,
  max: 3680,  // 16A × 230V
  step: 0.1,
  decimals: 1,
  units: 'W',
  chartType: 'spline'
}
```

---

### 2. Philips Hue Zigbee (Johan Bendz)

**Best Practices à implémenter:**

#### A. Advanced Light Controls
```javascript
// Transition effects
✅ Smooth transitions (configurable duration)
✅ Breathing effect
✅ Flash/blink patterns
✅ Color loops
✅ Scene recall

// Flow cards
WHEN: Light turned on/off
THEN: Set brightness with transition
AND: Check if light is on
```

---

#### B. Motion Sensor Enhancements
```javascript
// Advanced motion settings
✅ Motion timeout (configurable)
✅ Occupancy vs motion
✅ Daylight sensing integration
✅ Motion sensitivity levels
✅ Blind time (no retrigger period)

// Flow cards
WHEN: Motion detected (with lux condition)
WHEN: No motion for X minutes
THEN: Enable/disable motion sensor
AND: Motion detected in last X min
```

---

#### C. Button Controllers
```javascript
// Multi-press detection
✅ Single press
✅ Double press
✅ Long press (hold)
✅ Release
✅ Multi-click (3x, 4x, 5x)

// Per-button flow cards
WHEN: Button 1 pressed
WHEN: Button 2 double-pressed
WHEN: Button 3 long-pressed
```

---

### 3. Aqara & Xiaomi (Maxmudjon)

**Best Practices à implémenter:**

#### A. Cube Controller
```javascript
// Gestures
✅ Flip 90°
✅ Flip 180°
✅ Rotate (with degrees)
✅ Shake
✅ Tap
✅ Slide

// Flow integration
WHEN: Cube flipped to side X
WHEN: Cube rotated clockwise
WHEN: Cube shaken
```

---

#### B. Advanced Sensors
```javascript
// Multi-attribute sensors
✅ Temperature + Humidity + Pressure
✅ Motion + Illuminance
✅ Contact + Vibration
✅ Water leak + Temperature

// Smart reporting
✅ Report on change threshold
✅ Report interval configurable
✅ Battery-friendly reporting
```

---

#### C. Device Settings
```javascript
// Configurable via Homey UI
✅ Motion sensitivity
✅ Detection distance
✅ Blind time
✅ Reporting intervals
✅ LED indicators on/off
✅ Calibration offsets
```

---

### 4. SONOFF Zigbee (StyraHem)

**Best Practices à implémenter:**

#### A. Power Monitoring
```javascript
// Comprehensive energy data
✅ Voltage (V)
✅ Current (A)
✅ Power (W)
✅ Power Factor
✅ Energy today (kWh)
✅ Energy total (kWh)
✅ Cost calculation

// Advanced flow cards
WHEN: Power above X for Y minutes
WHEN: Energy today exceeds X kWh
THEN: Reset energy counter
AND: Power consumption in range
```

---

#### B. Device Health
```javascript
// Connection monitoring
✅ Last seen timestamp
✅ Signal strength (LQI/RSSI)
✅ Route quality
✅ Offline alerts
✅ Auto-reconnect attempts

// Flow cards
WHEN: Device went offline
WHEN: Signal strength below X
THEN: Ping device
```

---

## 🎯 PLAN D'IMPLÉMENTATION

### Phase 1: Flow Cards Enhancement (Priorité 1)

**1.1 Motion Sensors**
```javascript
// Ajouter à drivers/motion_*/device.js
registerFlowCards() {
  // WHEN cards
  this.homey.flow.getDeviceTriggerCard('motion_alarm_lux')
    .registerRunListener(async (args, state) => {
      return args.lux_min <= state.lux && state.lux <= args.lux_max;
    });
  
  this.homey.flow.getDeviceTriggerCard('no_motion_timeout')
    .register();
  
  // THEN cards
  this.homey.flow.getDeviceActionCard('enable_motion_sensor')
    .registerRunListener(async (args) => {
      await this.setCapabilityValue('alarm_motion_enabled', args.enabled);
    });
  
  // AND cards
  this.homey.flow.getDeviceConditionCard('motion_in_last_minutes')
    .registerRunListener(async (args) => {
      const lastMotion = this.getCapabilityValue('last_motion_time');
      return (Date.now() - lastMotion) < (args.minutes * 60000);
    });
}
```

**Flow Cards à ajouter:**
```
✅ WHEN: Motion detected with lux between X and Y
✅ WHEN: No motion for X minutes
✅ THEN: Enable/disable motion detection
✅ THEN: Set motion sensitivity (high/medium/low)
✅ AND: Motion detected in last X minutes
✅ AND: Lux level above/below threshold
```

---

**1.2 Smart Plugs**
```javascript
// Ajouter à drivers/smart_plug_*/device.js
registerFlowCards() {
  // Power monitoring
  this.homey.flow.getDeviceTriggerCard('power_above_threshold')
    .registerRunListener(async (args, state) => {
      return state.power > args.watts;
    });
  
  this.homey.flow.getDeviceTriggerCard('energy_today_exceeded')
    .register();
  
  // Actions
  this.homey.flow.getDeviceActionCard('reset_energy_meter')
    .registerRunListener(async () => {
      await this.setStoreValue('energy_start', Date.now());
    });
}
```

**Flow Cards à ajouter:**
```
✅ WHEN: Power consumption above X W
✅ WHEN: Power consumption below X W for Y minutes
✅ WHEN: Energy today exceeded X kWh
✅ WHEN: Power changed by more than X%
✅ THEN: Reset daily energy counter
✅ THEN: Set power threshold alert
✅ AND: Power consumption between X and Y W
✅ AND: Energy today above/below X kWh
```

---

**1.3 Temperature Sensors**
```javascript
// Ajouter à drivers/temperature_*/device.js
registerFlowCards() {
  // Temperature triggers
  this.homey.flow.getDeviceTriggerCard('temperature_crossed_threshold')
    .registerRunListener(async (args, state) => {
      if (args.direction === 'rising') {
        return state.oldTemp < args.threshold && state.newTemp >= args.threshold;
      } else {
        return state.oldTemp > args.threshold && state.newTemp <= args.threshold;
      }
    });
  
  this.homey.flow.getDeviceTriggerCard('humidity_changed_by')
    .registerRunListener(async (args, state) => {
      return Math.abs(state.change) >= args.percent;
    });
}
```

**Flow Cards à ajouter:**
```
✅ WHEN: Temperature crossed X° (rising/falling)
✅ WHEN: Humidity changed by more than X%
✅ WHEN: Temperature changed by more than X° in Y minutes
✅ THEN: Calibrate temperature offset
✅ AND: Temperature in range X to Y°
✅ AND: Humidity above/below X%
```

---

**1.4 Buttons & Switches**
```javascript
// Ajouter à drivers/button_*/device.js
registerFlowCards() {
  // Multi-press detection
  this.homey.flow.getDeviceTriggerCard('button_pressed_times')
    .registerRunListener(async (args, state) => {
      return state.presses === args.times;
    });
  
  this.homey.flow.getDeviceTriggerCard('button_long_press')
    .registerRunListener(async (args, state) => {
      return state.duration >= args.seconds;
    });
}

// Detection multi-press
handleButtonPress() {
  const now = Date.now();
  const lastPress = this.getStoreValue('last_press') || 0;
  
  if (now - lastPress < 500) {
    // Double press
    this.pressCount++;
  } else {
    this.pressCount = 1;
  }
  
  this.setStoreValue('last_press', now);
  
  // Wait for more presses
  this.clearTimeout(this.pressTimeout);
  this.pressTimeout = this.setTimeout(() => {
    this.triggerFlow('button_pressed_times', { presses: this.pressCount });
    this.pressCount = 0;
  }, 500);
}
```

**Flow Cards à ajouter:**
```
✅ WHEN: Button pressed X times (1-5)
✅ WHEN: Button long-pressed (> X seconds)
✅ WHEN: Button released after long press
✅ THEN: Enable/disable button
✅ AND: Button state (pressed/released)
```

---

### Phase 2: Virtual Capabilities (Priorité 2)

**2.1 Energy Calculations**
```javascript
// Ajouter à lib/TuyaZigbeeDevice.js
class TuyaZigbeeDevice extends Homey.Device {
  
  async registerVirtualCapabilities() {
    // Daily energy
    this.registerCapability('meter_power_daily', CLUSTER.METERING, {
      get: 'currentSummationDelivered',
      reportParser: value => {
        const dailyStart = this.getStoreValue('energy_day_start') || value;
        return (value - dailyStart) / 1000; // Wh to kWh
      }
    });
    
    // Monthly energy
    this.registerCapability('meter_power_monthly', CLUSTER.METERING);
    
    // Apparent power (VA)
    this.registerCapability('measure_apparent_power', CLUSTER.ELECTRICAL_MEASUREMENT, {
      reportParser: () => {
        const V = this.getCapabilityValue('measure_voltage') || 230;
        const A = this.getCapabilityValue('measure_current') || 0;
        return V * A;
      }
    });
    
    // Power factor
    this.registerCapability('measure_power_factor', CLUSTER.ELECTRICAL_MEASUREMENT, {
      reportParser: () => {
        const W = this.getCapabilityValue('measure_power') || 0;
        const VA = this.getCapabilityValue('measure_apparent_power') || 1;
        return W / VA;
      }
    });
    
    // Cost calculation
    this.registerCapability('meter_cost', CLUSTER.METERING, {
      reportParser: () => {
        const kWh = this.getCapabilityValue('meter_power') || 0;
        const pricePerKWh = this.getSetting('electricity_price') || 0.25;
        return kWh * pricePerKWh;
      }
    });
  }
  
  // Reset counters at midnight
  resetDailyCounters() {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
      const currentEnergy = this.getCapabilityValue('meter_power') || 0;
      this.setStoreValue('energy_day_start', currentEnergy);
    }
  }
}
```

---

**2.2 Device Health Monitoring**
```javascript
// Ajouter à lib/TuyaZigbeeDevice.js
async registerHealthCapabilities() {
  // Last seen
  this.registerCapability('last_seen', {
    get: () => {
      return new Date(this.getStoreValue('last_seen_timestamp'));
    }
  });
  
  // Signal strength
  this.registerCapability('measure_rssi', {
    get: () => {
      return this.zclNode.endpoints[1].clusters.basic.readAttribute('rssi');
    }
  });
  
  // Offline alarm
  this.registerCapability('alarm_offline', {
    get: () => {
      const lastSeen = this.getStoreValue('last_seen_timestamp') || Date.now();
      const offline = (Date.now() - lastSeen) > 3600000; // 1 hour
      return offline;
    }
  });
  
  // Monitor connection
  this.monitorConnection();
}

async monitorConnection() {
  this.connectionInterval = this.setInterval(async () => {
    const isReachable = await this.ping();
    
    if (!isReachable) {
      this.setCapabilityValue('alarm_offline', true);
      this.homey.flow.getDeviceTriggerCard('device_offline').trigger(this);
    } else {
      this.setCapabilityValue('alarm_offline', false);
      this.setStoreValue('last_seen_timestamp', Date.now());
    }
  }, 300000); // Check every 5 minutes
}
```

---

### Phase 3: Manufacturer Names Enrichment (Priorité 3)

**3.1 Database Expansion**
```javascript
// Ajouter à utils/manufacturer-database.js
const MANUFACTURER_DATABASE = {
  // Tuya standard
  '_TZ3000_': {
    name: 'Tuya',
    brands: ['Generic Tuya', 'MOES', 'Nous', 'LSC', 'Nedis', 'Lidl'],
    zigbee_version: '3.0'
  },
  
  '_TZE200_': {
    name: 'Tuya Advanced',
    brands: ['MOES Pro', 'Nous Pro', 'BlitzWolf'],
    zigbee_version: '3.0'
  },
  
  '_TZ3210_': {
    name: 'Tuya New Gen',
    brands: ['Latest Tuya devices'],
    zigbee_version: '3.0'
  },
  
  // Specific manufacturers
  '_TZ3000_8nkb7mof': {
    name: 'MOES ZSS-X',
    device: 'Smart Plug 16A',
    features: ['Energy monitoring', 'Overload protection']
  },
  
  '_TZ3000_g5xawfcq': {
    name: 'LSC Smart Connect',
    device: 'Smart Plug',
    brand: 'Action',
    features: ['Energy monitoring']
  },
  
  '_TZ3000_vzopcetz': {
    name: 'Nedis SmartLife',
    device: 'Smart Plug ZBSP10WT',
    brand: 'Nedis',
    features: ['Energy monitoring', '16A']
  },
  
  // Add hundreds more...
};

// Function to enrich device info
function enrichDeviceInfo(manufacturerId) {
  const info = MANUFACTURER_DATABASE[manufacturerId];
  if (info) {
    return {
      manufacturer: info.name,
      brands: info.brands,
      device: info.device,
      features: info.features,
      zigbee_version: info.zigbee_version
    };
  }
  
  // Fallback to generic
  const prefix = manufacturerId.substring(0, 8);
  return MANUFACTURER_DATABASE[prefix] || { manufacturer: 'Unknown' };
}
```

---

**3.2 Device Identification Enhancement**
```javascript
// Ajouter à lib/TuyaZigbeeDevice.js
async onNodeInit({ zclNode }) {
  // Get manufacturer info
  const manufacturerId = zclNode.endpoints[1].clusters.basic.attributes.manufacturerName;
  const modelId = zclNode.endpoints[1].clusters.basic.attributes.modelId;
  
  // Enrich with database
  const deviceInfo = enrichDeviceInfo(manufacturerId);
  
  // Store enriched info
  await this.setSettings({
    manufacturer_id: manufacturerId,
    manufacturer_name: deviceInfo.manufacturer,
    model_id: modelId,
    device_name: deviceInfo.device,
    supported_brands: deviceInfo.brands.join(', '),
    features: deviceInfo.features.join(', '),
    zigbee_version: deviceInfo.zigbee_version
  });
  
  // Log for community database
  this.log('Device identified:', {
    manufacturer: deviceInfo.manufacturer,
    device: deviceInfo.device,
    brands: deviceInfo.brands
  });
}
```

---

### Phase 4: Settings & Configuration (Priorité 4)

**4.1 Advanced Device Settings**
```json
// Ajouter à drivers/*/driver.compose.json
{
  "settings": [
    {
      "type": "group",
      "label": {
        "en": "Motion Detection"
      },
      "children": [
        {
          "id": "motion_sensitivity",
          "type": "dropdown",
          "value": "medium",
          "label": {
            "en": "Motion Sensitivity"
          },
          "values": [
            { "id": "low", "label": { "en": "Low" } },
            { "id": "medium", "label": { "en": "Medium" } },
            { "id": "high", "label": { "en": "High" } }
          ]
        },
        {
          "id": "motion_timeout",
          "type": "number",
          "value": 60,
          "min": 10,
          "max": 600,
          "units": { "en": "seconds" },
          "label": {
            "en": "Motion Timeout"
          }
        },
        {
          "id": "blind_time",
          "type": "number",
          "value": 5,
          "min": 0,
          "max": 60,
          "units": { "en": "seconds" },
          "label": {
            "en": "Blind Time (no retrigger)"
          }
        }
      ]
    },
    {
      "type": "group",
      "label": {
        "en": "Reporting"
      },
      "children": [
        {
          "id": "report_interval",
          "type": "number",
          "value": 300,
          "min": 60,
          "max": 3600,
          "units": { "en": "seconds" },
          "label": {
            "en": "Report Interval"
          }
        },
        {
          "id": "temp_change_threshold",
          "type": "number",
          "value": 0.5,
          "min": 0.1,
          "max": 5,
          "decimals": 1,
          "units": { "en": "°C" },
          "label": {
            "en": "Temperature Change Threshold"
          }
        }
      ]
    },
    {
      "type": "group",
      "label": {
        "en": "Energy Monitoring"
      },
      "children": [
        {
          "id": "electricity_price",
          "type": "number",
          "value": 0.25,
          "min": 0,
          "max": 1,
          "decimals": 4,
          "units": { "en": "€/kWh" },
          "label": {
            "en": "Electricity Price"
          }
        },
        {
          "id": "power_threshold_alert",
          "type": "number",
          "value": 2000,
          "min": 0,
          "max": 3680,
          "units": { "en": "W" },
          "label": {
            "en": "Power Threshold Alert"
          }
        }
      ]
    }
  ]
}
```

---

## 📋 PRIORITÉS D'IMPLÉMENTATION

### Très Haute Priorité (Sprint 1 - 1 semaine)
1. ✅ Flow cards motion sensors (lux, timeout, enable/disable)
2. ✅ Flow cards smart plugs (power thresholds, energy reset)
3. ✅ Multi-press detection buttons
4. ✅ Temperature threshold crossing

### Haute Priorité (Sprint 2 - 1 semaine)
5. ✅ Virtual capabilities (daily energy, power factor, cost)
6. ✅ Device health monitoring (last seen, offline alarm)
7. ✅ Advanced settings UI (sensitivity, timeouts, thresholds)

### Priorité Moyenne (Sprint 3 - 2 semaines)
8. ✅ Manufacturer database expansion (500+ devices)
9. ✅ Device identification enhancement
10. ✅ Advanced light controls (transitions, effects)

### Priorité Basse (Sprint 4 - 2 semaines)
11. ✅ Cube controller gestures
12. ✅ Scene recall functionality
13. ✅ Advanced diagnostics UI

---

## 📊 IMPACT ATTENDU

### Users
- ✅ **+300%** flow cards disponibles
- ✅ **+50%** capabilities par device
- ✅ **Meilleure** identification devices
- ✅ **Plus de contrôle** via settings

### Developers
- ✅ **Code réutilisable** (base class)
- ✅ **Documentation** complète
- ✅ **Standards** industry best practices

### Community
- ✅ **Compétitif** avec apps populaires
- ✅ **Feature-rich** comparable Philips Hue
- ✅ **Professional** grade app

---

## 🔗 RESSOURCES

### Apps Référence
- Device Capabilities: https://community.homey.app/t/app-pro-device-capabilities-enhance-the-capabilities-of-devices/43287
- Philips Hue Zigbee: https://github.com/JohanBendz/com.philips.hue.zigbee
- Aqara & Xiaomi: https://github.com/Maxmudjon/com.maxmudjon.mihomey
- SONOFF Zigbee: https://github.com/StyraHem/Homey.Sonoff.Zigbee

### Documentation
- Homey SDK3: https://apps.developer.homey.app
- Flow Cards: https://apps.developer.homey.app/the-basics/flows
- Capabilities: https://apps.developer.homey.app/the-basics/capabilities

---

**Version:** 1.0  
**Date:** 16 Octobre 2025  
**Status:** 📋 ROADMAP DÉFINIE

🚀 **Objectif: Devenir l'app Zigbee la plus feature-rich de Homey App Store!**
