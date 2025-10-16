# 🔬 ANALYSE DES APPS COMMUNAUTAIRES HOMEY

**Date:** 16 Octobre 2025  
**Objectif:** Améliorer Universal Tuya Zigbee avec les best practices communautaires

---

## 📊 APPS ANALYSÉES

### 1. **Philips Hue Zigbee** (Johan Bendz)
**GitHub:** https://github.com/JohanBendz/com.philips.hue.zigbee  
**Devices:** 100+ devices Philips Hue SANS BRIDGE  
**SDK:** SDK3  
**Stars:** Popular!

**Points forts:**
- ✅ Pairing direct Zigbee (sans hub externe)
- ✅ Flow cards avancées par device
- ✅ Dimmer switch avec actions multiples
- ✅ Motion sensor avec occupancy
- ✅ Smart button avec multi-press detection
- ✅ Settings par device (calibration, sensitivity)

**Flow Cards Exemple:**
```
Triggers:
- "Motion detected"
- "Button pressed"
- "Button long pressed"
- "Button released"
- "Dim level changed"

Actions:
- "Set brightness"
- "Set color temperature"
- "Start color loop"
- "Alert effect"
- "Power on behavior"

Conditions:
- "Is turned on"
- "Brightness is greater than"
- "Is reachable"
```

---

### 2. **Aqara & Xiaomi Smart Home** (Maxmudjon)
**GitHub:** https://github.com/Maxmudjon/com.maxmudjon.mihomey  
**Devices:** 80+ devices Aqara/Xiaomi  
**SDK:** SDK3 (Homey Compose)  

**Points forts:**
- ✅ Homey Compose structure
- ✅ Multi-brand support (Aqara + Xiaomi)
- ✅ Advanced triggers (vibration patterns, cube rotations)
- ✅ Device-specific settings
- ✅ Battery reporting optimisé

**Flow Cards Exemple:**
```
Triggers (Cube):
- "Cube rotated clockwise"
- "Cube rotated counter-clockwise"
- "Cube flipped 90°"
- "Cube flipped 180°"
- "Cube shaked"
- "Cube dropped"

Actions (Curtain):
- "Open curtain"
- "Close curtain"
- "Set position"
- "Reverse direction"

Conditions:
- "Is moving"
- "Position is greater than"
```

---

### 3. **SONOFF Zigbee** (Johan Bendz)
**App:** com.sonoff.zigbee  
**Devices:** 50+ devices SONOFF

**Points forts:**
- ✅ Energy monitoring flow cards
- ✅ Switch status reporting
- ✅ Temperature/humidity alerts
- ✅ Power consumption tracking

---

## 🎯 FEATURES MANQUANTES DANS TUYA APP

### 1. **Flow Cards Avancées**

#### ❌ Actuellement manquant:
- Triggers spécifiques par type de sensor
- Actions de configuration
- Conditions complexes
- Multi-press detection
- Long press detection

#### ✅ À ajouter:

**Motion Sensors:**
```javascript
// Triggers
- "Motion started"
- "Motion ended"
- "No motion for X seconds"
- "Lux level changed"
- "Temperature changed"
- "Humidity changed"

// Conditions
- "Has motion"
- "Lux is greater than X"
- "Temperature is between X and Y"
- "Battery is below X%"

// Actions
- "Reset motion alarm"
- "Set sensitivity"
- "Set detection delay"
```

**SOS Button:**
```javascript
// Triggers
- "Button pressed"
- "Button double pressed"
- "Button long pressed"
- "Button released"

// Conditions
- "Is pressed"
- "Last press was within X seconds"

// Actions
- "Reset alarm"
- "Enable/disable button"
```

**Smart Plugs:**
```javascript
// Triggers
- "Power consumption changed"
- "Power threshold exceeded"
- "Device turned on/off"

// Conditions
- "Power is greater than X watts"
- "Is consuming power"
- "Daily energy is greater than X kWh"

// Actions
- "Reset energy meter"
- "Set power threshold"
- "Enable/disable LED"
```

---

### 2. **Settings Avancés Par Device**

#### Exemples à implémenter:

**Motion Sensor Settings:**
```json
{
  "sensitivity": {
    "type": "dropdown",
    "values": [
      { "id": "low", "label": "Low" },
      { "id": "medium", "label": "Medium" },
      { "id": "high", "label": "High" }
    ]
  },
  "detection_delay": {
    "type": "number",
    "min": 0,
    "max": 600,
    "units": "s"
  },
  "lux_threshold": {
    "type": "number",
    "min": 0,
    "max": 2000,
    "units": "lux"
  }
}
```

**Temperature Sensor Settings:**
```json
{
  "temperature_offset": {
    "type": "number",
    "min": -10,
    "max": 10,
    "units": "°C"
  },
  "humidity_offset": {
    "type": "number",
    "min": -20,
    "max": 20,
    "units": "%"
  },
  "reporting_interval": {
    "type": "number",
    "min": 60,
    "max": 3600,
    "units": "s"
  }
}
```

---

### 3. **Capability Listeners Intelligents**

#### Pattern Philips Hue:

```javascript
// Multi-value capability listener
this.registerMultipleCapabilityListener(
  ['onoff', 'dim', 'light_temperature'], 
  async (values) => {
    // Apply all changes at once
    const commands = [];
    
    if (values.onoff !== undefined) {
      commands.push(this.setOnOff(values.onoff));
    }
    
    if (values.dim !== undefined) {
      commands.push(this.setDim(values.dim));
    }
    
    if (values.light_temperature !== undefined) {
      commands.push(this.setColorTemp(values.light_temperature));
    }
    
    await Promise.all(commands);
  },
  500 // Debounce 500ms
);
```

---

### 4. **Button Multi-Press Detection**

#### Pattern Aqara:

```javascript
class ButtonDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.pressCount = 0;
    this.pressTimer = null;
    this.longPressTimer = null;
    
    // Listen for button press
    zclNode.endpoints[1].clusters.onOff.on('on', () => {
      this.handleButtonPress();
    });
    
    // Listen for button release
    zclNode.endpoints[1].clusters.onOff.on('off', () => {
      this.handleButtonRelease();
    });
  }
  
  async handleButtonPress() {
    this.pressCount++;
    
    // Clear existing timers
    if (this.pressTimer) clearTimeout(this.pressTimer);
    if (this.longPressTimer) clearTimeout(this.longPressTimer);
    
    // Start long press timer
    this.longPressTimer = setTimeout(() => {
      this.log('Long press detected');
      this.triggerFlow('button_long_pressed');
      this.pressCount = 0;
    }, 1000);
    
    // Start multi-press timer
    this.pressTimer = setTimeout(async () => {
      const count = this.pressCount;
      this.pressCount = 0;
      
      if (count === 1) {
        this.triggerFlow('button_pressed');
      } else if (count === 2) {
        this.triggerFlow('button_double_pressed');
      } else if (count === 3) {
        this.triggerFlow('button_triple_pressed');
      }
    }, 500);
  }
  
  async handleButtonRelease() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }
  
  async triggerFlow(cardId) {
    try {
      const card = this.homey.flow.getDeviceTriggerCard(cardId);
      await card.trigger(this, {}, {});
      this.log(`Triggered: ${cardId}`);
    } catch (err) {
      this.error(`Failed to trigger ${cardId}:`, err);
    }
  }
}
```

---

### 5. **Energy Monitoring Flow Cards**

#### Pattern SONOFF:

```javascript
// Register energy capability
this.registerCapability('measure_power', CLUSTER.ELECTRICAL_MEASUREMENT, {
  get: 'activePower',
  report: 'activePower',
  reportParser: value => value / 10, // Watts
  getOpts: {
    getOnStart: true
  }
});

// Trigger on power threshold
this.registerCapabilityListener('measure_power', async (value) => {
  const threshold = this.getSetting('power_threshold') || 100;
  
  if (value > threshold && !this.powerThresholdExceeded) {
    this.powerThresholdExceeded = true;
    await this.triggerFlow('power_threshold_exceeded', { power: value });
  } else if (value <= threshold) {
    this.powerThresholdExceeded = false;
  }
});

// Daily energy reset
this.homey.clock.on('midnight', () => {
  this.setCapabilityValue('meter_power.daily', 0).catch(this.error);
});
```

---

## 🏗️ STRUCTURE RECOMMANDÉE

### 1. **Homey Compose** (Comme Aqara App)

```
/drivers
  /motion_sensor
    /driver.compose.json
    /device.js
    /assets/
    
/.homeycompose
  /flow/
    /triggers/
    /actions/
    /conditions/
  /capabilities/
```

**Avantages:**
- ✅ Génération automatique app.json
- ✅ Flow cards organisées
- ✅ Capabilities réutilisables
- ✅ Maintenance facilitée

---

### 2. **Flow Cards Par Driver**

#### Structure `/drivers/motion_sensor/driver.compose.json`:

```json
{
  "id": "motion_sensor",
  "name": { "en": "Motion Sensor" },
  "class": "sensor",
  "capabilities": ["alarm_motion", "measure_luminance", "measure_temperature"],
  "flow": {
    "triggers": [
      {
        "id": "motion_started",
        "title": { "en": "Motion started" }
      },
      {
        "id": "motion_ended",
        "title": { "en": "Motion ended" }
      },
      {
        "id": "no_motion_timeout",
        "title": { "en": "No motion for..." },
        "args": [
          {
            "name": "timeout",
            "type": "number",
            "min": 1,
            "max": 3600,
            "step": 1,
            "label": { "en": "Seconds" }
          }
        ]
      }
    ],
    "conditions": [
      {
        "id": "has_motion",
        "title": { "en": "Has motion" }
      },
      {
        "id": "lux_greater_than",
        "title": { "en": "Lux is greater than..." },
        "args": [
          {
            "name": "lux",
            "type": "number",
            "min": 0,
            "max": 2000,
            "step": 10
          }
        ]
      }
    ],
    "actions": [
      {
        "id": "reset_motion",
        "title": { "en": "Reset motion alarm" }
      },
      {
        "id": "set_sensitivity",
        "title": { "en": "Set sensitivity" },
        "args": [
          {
            "name": "sensitivity",
            "type": "dropdown",
            "values": [
              { "id": "low", "label": { "en": "Low" } },
              { "id": "medium", "label": { "en": "Medium" } },
              { "id": "high", "label": { "en": "High" } }
            ]
          }
        ]
      }
    ]
  }
}
```

---

## 🎨 DEVICES PHILIPS HUE COMPATIBLES SANS BRIDGE

### Bulbs (Pairing Direct Zigbee):
```
✅ Hue White A19 (LWB014, LWB004, LWB006, LWB007)
✅ Hue White Ambiance A19 (LTW001, LTW004, LTW010, LTW015)
✅ Hue Color A19 (LCT001, LCT007, LCT010, LCT014, LCT015, LCT016)
✅ Hue Spot GU10 (LWG001, LWG004, LCG002)
✅ Hue Filament (LWA004, LWO001, LWV001)
✅ Hue Lightstrip (LST001, LST002, LST003, LST004)
✅ Hue Go (LLC020, LCT026)
✅ Hue Smart Plug (LOM002)
```

### Sensors & Controllers:
```
✅ Hue Dimmer Switch (RWL020, RWL021)
✅ Hue Motion Sensor (SML001, SML002)
✅ Hue Smart Button
```

**Manufacturer IDs à ajouter dans Tuya App:**
```
"Signify Netherlands B.V."
"Philips"
"Philips Lighting"
```

**Product IDs courants:**
```
"LWB014", "LCT001", "RWL021", "SML001", etc.
```

---

## 🚀 PLAN D'IMPLÉMENTATION

### Phase 1: Flow Cards Basiques (Semaine 1)

**Pour chaque driver existant:**
1. ✅ Ajouter trigger "value_changed"
2. ✅ Ajouter condition "value_greater_than"
3. ✅ Ajouter action "reset_value"

**Priorité:**
- Motion sensors
- SOS buttons
- Temperature sensors
- Smart plugs

---

### Phase 2: Multi-Press Detection (Semaine 2)

**Buttons uniquement:**
1. ✅ Détecter single press
2. ✅ Détecter double press
3. ✅ Détecter long press
4. ✅ Détecter triple press (optionnel)

---

### Phase 3: Settings Avancés (Semaine 3)

**Par type de device:**
1. ✅ Sensitivity/threshold settings
2. ✅ Calibration offsets
3. ✅ Reporting intervals
4. ✅ Behavior configurations

---

### Phase 4: Energy Monitoring (Semaine 4)

**Smart plugs avec energy:**
1. ✅ Power threshold triggers
2. ✅ Daily/monthly energy tracking
3. ✅ Cost calculation
4. ✅ Reset meter actions

---

### Phase 5: Philips Hue Support (Semaine 5)

**Ajouter devices Hue compatibles:**
1. ✅ Bulbs (White, Ambiance, Color)
2. ✅ Spots GU10
3. ✅ Lightstrips
4. ✅ Dimmer switch
5. ✅ Motion sensors
6. ✅ Smart plug

---

## 📦 REPOSITORIES À ÉTUDIER

### Zigbee Direct (Sans Hub):

1. **Philips Hue Zigbee**
   - https://github.com/JohanBendz/com.philips.hue.zigbee
   - 100+ devices, flow cards avancées

2. **Aqara & Xiaomi**
   - https://github.com/Maxmudjon/com.maxmudjon.mihomey
   - Multi-press, cube gestures

3. **SONOFF Zigbee**
   - https://github.com/StyraHem/Homey.Sonoff.Zigbee
   - Energy monitoring

4. **IKEA TRADFRI**
   - https://github.com/athombv/com.ikea.tradfri-example
   - Exemple officiel Athom

5. **Ubisys Zigbee**
   - https://github.com/kasteleman/de.ubisys
   - Advanced dimmer controls

---

## 🎯 BEST PRACTICES IDENTIFIÉES

### 1. **Capability Registration**
```javascript
// ✅ Bon: Multiple capability listener
this.registerMultipleCapabilityListener(
  ['onoff', 'dim'], 
  async (values) => { /* ... */ },
  500 // Debounce
);

// ❌ Mauvais: Separate listeners
this.registerCapabilityListener('onoff', async (value) => { /* ... */ });
this.registerCapabilityListener('dim', async (value) => { /* ... */ });
```

### 2. **Flow Card Triggers**
```javascript
// ✅ Bon: Avec tokens
await this.triggerFlow('motion_detected', {
  lux: luxValue,
  temperature: tempValue
});

// ❌ Mauvais: Sans context
await this.triggerFlow('motion_detected');
```

### 3. **Error Handling**
```javascript
// ✅ Bon: Graceful degradation
try {
  await this.endpoint.clusters.iasZone.zoneEnrollResponse({...});
} catch (err) {
  this.error('Enrollment failed:', err.message);
  // Continue avec fallback method
}

// ❌ Mauvais: Crash l'app
await this.endpoint.clusters.iasZone.zoneEnrollResponse({...});
```

### 4. **Settings Sync**
```javascript
// ✅ Bon: onSettings hook
async onSettings({ oldSettings, newSettings, changedKeys }) {
  if (changedKeys.includes('sensitivity')) {
    await this.setSensitivity(newSettings.sensitivity);
  }
}

// ❌ Mauvais: Polling settings
setInterval(() => {
  const sensitivity = this.getSetting('sensitivity');
  // ...
}, 1000);
```

---

## 📊 STATISTIQUES COMPARATIVES

### Universal Tuya Zigbee (Actuel):
```
Drivers: 183
Flow cards par driver: ~0-2
Settings avancés: Basiques
Multi-press: Non
Energy monitoring: Basique
```

### Apps Communautaires (Objectif):
```
Philips Hue: 100+ devices, 5-10 flow cards/driver
Aqara: 80+ devices, 8-15 flow cards/driver (cube!)
SONOFF: 50+ devices, 4-8 flow cards/driver
```

### Objectif Universal Tuya:
```
Drivers: 183 + Philips Hue (50+) = 230+
Flow cards par driver: 5-10 (moyenne)
Settings avancés: Oui
Multi-press: Oui
Energy monitoring: Avancé
```

---

## ✅ ACTIONS IMMÉDIATES

1. **Créer structure Homey Compose:**
   ```bash
   mkdir .homeycompose
   mkdir .homeycompose/flow
   mkdir .homeycompose/flow/triggers
   mkdir .homeycompose/flow/actions
   mkdir .homeycompose/flow/conditions
   ```

2. **Ajouter flow cards pour top 10 drivers:**
   - Motion sensors
   - SOS buttons
   - Temperature sensors
   - Smart plugs
   - Door sensors
   - Smoke detectors
   - Water leak sensors
   - Curtain motors
   - Dimmer switches
   - Scene controllers

3. **Implémenter multi-press detection:**
   - Button devices
   - Scene controllers
   - Dimmer switches

4. **Ajouter devices Philips Hue:**
   - Manufacturer IDs
   - Product IDs
   - Driver configs

---

**Documentation Complète:** Ce fichier  
**Next Steps:** `FLOW_CARDS_IMPLEMENTATION.md`  
**GitHub Refs:** Voir section "Repositories à Étudier"

🎉 **Transformation en Super-App Zigbee!**
