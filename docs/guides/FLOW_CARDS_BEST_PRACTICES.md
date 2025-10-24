# Flow Cards Best Practices - Homey SDK3

**Source:** Documentation officielle Homey + Apps populaires (Aqara, IKEA, Sonoff)  
**Date:** 16 Octobre 2025  
**Version:** 3.0.5

---

## 🎯 OBJECTIF

Guide complet pour implémenter correctement les flow cards selon:
- ✅ Recommandations officielles Homey SDK
- ✅ Best practices apps populaires
- ✅ Fix bugs signalés par users (Peter, etc.)

---

## 📚 DOCUMENTATION OFFICIELLE HOMEY

**URLs:**
- Flow basics: https://apps.developer.homey.app/the-basics/flow
- Flow arguments: https://apps.developer.homey.app/the-basics/flow/arguments
- Device cards: https://apps.developer.homey.app/the-basics/flow (section Device cards)

---

## 🔴 TYPES DE FLOW CARDS

### 1. TRIGGERS (When...)

**Déclenchent un flow quand un événement se produit**

**Format minimal:**
```json
{
  "triggers": [
    {
      "id": "rain_started",
      "title": { "en": "It starts raining" },
      "hint": { "en": "When it starts raining more than 0.1 mm/h" }
    }
  ]
}
```

**Avec tokens (passer données au flow):**
```json
{
  "triggers": [
    {
      "id": "button_pressed",
      "title": { "en": "Button pressed" },
      "tokens": [
        {
          "name": "button",
          "type": "string",
          "title": { "en": "Button" },
          "example": "1"
        },
        {
          "name": "action",
          "type": "string",
          "title": { "en": "Action" },
          "example": "single"
        }
      ]
    }
  ]
}
```

**Device-specific trigger:**
```json
{
  "triggers": [
    {
      "id": "button_pressed",
      "title": { "en": "Button pressed" },
      "tokens": [...],
      "args": [
        {
          "name": "device",
          "type": "device",
          "filter": "driver_id=wireless_switch_4gang_cr2450"
        }
      ]
    }
  ]
}
```

---

### 2. CONDITIONS (And...)

**Vérifient une condition avant de continuer le flow**

**Return:** `true` pour continuer, `false` pour arrêter

**Format:**
```json
{
  "conditions": [
    {
      "id": "is_raining",
      "title": { "en": "It !{{is|is not}} raining" }
    }
  ]
}
```

**Avec arguments:**
```json
{
  "conditions": [
    {
      "id": "temperature_above",
      "title": { "en": "Temperature is..." },
      "titleFormatted": {
        "en": "Temperature !{{is|is not}} above [[temperature]]°C"
      },
      "args": [
        {
          "name": "device",
          "type": "device",
          "filter": "driver_id=temperature_sensor"
        },
        {
          "name": "temperature",
          "type": "number",
          "min": -50,
          "max": 100,
          "step": 0.1,
          "placeholder": { "en": "Temperature" }
        }
      ]
    }
  ]
}
```

---

### 3. ACTIONS (Then...)

**Exécutent une action**

**Format:**
```json
{
  "actions": [
    {
      "id": "stop_raining",
      "title": { "en": "Make it stop raining" }
    }
  ]
}
```

**Avec arguments:**
```json
{
  "actions": [
    {
      "id": "set_mode",
      "title": { "en": "Set mode" },
      "titleFormatted": {
        "en": "Set mode to [[mode]]"
      },
      "args": [
        {
          "name": "device",
          "type": "device",
          "filter": "driver_id=thermostat"
        },
        {
          "name": "mode",
          "type": "dropdown",
          "title": { "en": "Mode" },
          "values": [
            { "id": "auto", "label": { "en": "Auto" } },
            { "id": "heat", "label": { "en": "Heat" } },
            { "id": "cool", "label": { "en": "Cool" } }
          ]
        }
      ]
    }
  ]
}
```

---

## 💻 IMPLÉMENTATION DANS LE CODE

### Triggers

**Méthode 1: App-level trigger**
```javascript
// In app.js
const Homey = require('homey');

class MyApp extends Homey.App {
  async onInit() {
    this.log('App initialized');
    
    // Get trigger card
    const rainStartTrigger = this.homey.flow.getTriggerCard('rain_started');
    
    // Trigger when event happens
    this.on('rain-detected', async () => {
      await rainStartTrigger.trigger();
    });
  }
}

module.exports = MyApp;
```

**Méthode 2: Device-level trigger (RECOMMENDED)**
```javascript
// In driver.js
const Homey = require('homey');

class MyDriver extends Homey.Driver {
  async onInit() {
    this.log('Driver initialized');
    
    // Get DEVICE trigger card
    this.buttonPressedTrigger = this.homey.flow.getDeviceTriggerCard('button_pressed');
  }
}

module.exports = MyDriver;
```

```javascript
// In device.js
const Homey = require('homey');

class MyDevice extends Homey.Device {
  async onInit() {
    this.log('Device initialized');
  }
  
  async onButton(button, action) {
    this.log(`Button ${button} pressed: ${action}`);
    
    // Trigger flow with tokens
    await this.driver.buttonPressedTrigger
      .trigger(this, {
        button: String(button),
        action: String(action)
      })
      .catch(this.error);
  }
}

module.exports = MyDevice;
```

---

### Conditions

```javascript
// In app.js
const Homey = require('homey');

class MyApp extends Homey.App {
  async onInit() {
    // Get condition card
    const rainingCondition = this.homey.flow.getConditionCard('is_raining');
    
    // Register listener (REQUIRED)
    rainingCondition.registerRunListener(async (args, state) => {
      const raining = await this.isItRaining();
      return Boolean(raining); // MUST return boolean
    });
  }
  
  async isItRaining() {
    // Your logic here
    return true; // or false
  }
}

module.exports = MyApp;
```

**Device-specific condition:**
```javascript
// In app.js or driver.js
const temperatureAboveCondition = this.homey.flow.getConditionCard('temperature_above');

temperatureAboveCondition.registerRunListener(async (args, state) => {
  const currentTemp = await args.device.getCapabilityValue('measure_temperature');
  const threshold = Number(args.temperature);
  
  return currentTemp > threshold; // Boolean
});
```

---

### Actions

```javascript
// In app.js
const Homey = require('homey');

class MyApp extends Homey.App {
  async onInit() {
    // Get action card
    const stopRainingAction = this.homey.flow.getActionCard('stop_raining');
    
    // Register listener (REQUIRED)
    stopRainingAction.registerRunListener(async (args, state) => {
      await this.makeItStopRaining();
      // Return void or Promise<void>
    });
  }
  
  async makeItStopRaining() {
    // Your logic here
  }
}

module.exports = MyApp;
```

**Device-specific action:**
```javascript
const setModeAction = this.homey.flow.getActionCard('set_mode');

setModeAction.registerRunListener(async (args, state) => {
  const device = args.device;
  const mode = args.mode; // 'auto', 'heat', 'cool'
  
  await device.setMode(mode);
});
```

---

## 🎯 BEST PRACTICES PAR TYPE DE DEVICE

### 1. BUTTONS / WIRELESS SWITCHES

**CRITICAL:** Doivent avoir tokens pour identifier quel bouton et quelle action

```json
{
  "triggers": [
    {
      "id": "button_pressed",
      "title": { "en": "Button pressed" },
      "hint": { "en": "Triggered when any button is pressed" },
      "tokens": [
        {
          "name": "button",
          "type": "string",
          "title": { "en": "Button" },
          "example": "1"
        },
        {
          "name": "action",
          "type": "string",
          "title": { "en": "Action" },
          "example": "single"
        }
      ],
      "args": [
        {
          "name": "device",
          "type": "device",
          "filter": "driver_id=wireless_switch_4gang"
        }
      ]
    }
  ]
}
```

**Implementation:**
```javascript
// When button pressed (from Zigbee cluster or DP)
async onButton(button, action) {
  await this.driver.buttonPressedTrigger
    .trigger(this, {
      button: String(button),    // "1", "2", "3", "4"
      action: String(action)      // "single", "double", "long"
    })
    .catch(this.error);
}
```

---

### 2. MOTION SENSORS

```json
{
  "triggers": [
    {
      "id": "motion_detected",
      "title": { "en": "Motion detected" },
      "args": [
        {
          "name": "device",
          "type": "device",
          "filter": "driver_id=motion_sensor"
        }
      ]
    },
    {
      "id": "motion_cleared",
      "title": { "en": "Motion cleared" },
      "args": [
        {
          "name": "device",
          "type": "device",
          "filter": "driver_id=motion_sensor"
        }
      ]
    }
  ],
  "conditions": [
    {
      "id": "motion_active",
      "title": { "en": "Motion !{{is|is not}} active" },
      "args": [
        {
          "name": "device",
          "type": "device",
          "filter": "driver_id=motion_sensor"
        }
      ]
    }
  ]
}
```

**Implementation:**
```javascript
// When motion state changes
async onCapabilityAlarmMotion(value) {
  if (value === true) {
    // Motion detected
    await this.driver.motionDetectedTrigger
      .trigger(this)
      .catch(this.error);
  } else {
    // Motion cleared
    await this.driver.motionClearedTrigger
      .trigger(this)
      .catch(this.error);
  }
}

// Condition
const motionActiveCondition = this.homey.flow.getConditionCard('motion_active');
motionActiveCondition.registerRunListener(async (args) => {
  return await args.device.getCapabilityValue('alarm_motion');
});
```

---

### 3. SMART PLUGS / SWITCHES

```json
{
  "actions": [
    {
      "id": "turn_on_duration",
      "title": { "en": "Turn on for..." },
      "titleFormatted": {
        "en": "Turn on for [[duration]] seconds"
      },
      "args": [
        {
          "name": "device",
          "type": "device",
          "filter": "driver_id=smart_plug"
        },
        {
          "name": "duration",
          "type": "number",
          "min": 1,
          "max": 86400,
          "step": 1,
          "placeholder": { "en": "Duration (seconds)" }
        }
      ]
    }
  ]
}
```

**Implementation:**
```javascript
const turnOnDurationAction = this.homey.flow.getActionCard('turn_on_duration');

turnOnDurationAction.registerRunListener(async (args) => {
  const device = args.device;
  const duration = Number(args.duration);
  
  // Turn on
  await device.setCapabilityValue('onoff', true);
  
  // Turn off after duration
  await device.homey.setTimeout(async () => {
    await device.setCapabilityValue('onoff', false);
  }, duration * 1000);
});
```

---

### 4. THERMOSTATS

```json
{
  "actions": [
    {
      "id": "set_thermostat_mode",
      "title": { "en": "Set mode" },
      "titleFormatted": {
        "en": "Set mode to [[mode]]"
      },
      "args": [
        {
          "name": "device",
          "type": "device",
          "filter": "driver_id=thermostat"
        },
        {
          "name": "mode",
          "type": "dropdown",
          "title": { "en": "Mode" },
          "values": [
            { "id": "auto", "label": { "en": "Auto" } },
            { "id": "heat", "label": { "en": "Heat" } },
            { "id": "cool", "label": { "en": "Cool" } },
            { "id": "off", "label": { "en": "Off" } }
          ]
        }
      ]
    }
  ],
  "conditions": [
    {
      "id": "mode_is",
      "title": { "en": "Mode is..." },
      "titleFormatted": {
        "en": "Mode !{{is|is not}} [[mode]]"
      },
      "args": [
        {
          "name": "device",
          "type": "device",
          "filter": "driver_id=thermostat"
        },
        {
          "name": "mode",
          "type": "dropdown",
          "values": [...]
        }
      ]
    }
  ]
}
```

---

## ❌ ERREURS COMMUNES

### 1. Trigger sans tokens (buttons)

**WRONG:**
```json
{
  "id": "button_pressed",
  "title": { "en": "Button pressed" }
  // ❌ Pas de tokens!
}
```

**CORRECT:**
```json
{
  "id": "button_pressed",
  "title": { "en": "Button pressed" },
  "tokens": [
    { "name": "button", "type": "string", "title": { "en": "Button" } },
    { "name": "action", "type": "string", "title": { "en": "Action" } }
  ]
}
```

---

### 2. getTriggerCard() au lieu de getDeviceTriggerCard()

**WRONG:**
```javascript
// ❌ App-level trigger pour device-specific card
const trigger = this.homey.flow.getTriggerCard('button_pressed');
trigger.trigger(); // Pas de device passé!
```

**CORRECT:**
```javascript
// ✅ Device trigger
const trigger = this.homey.flow.getDeviceTriggerCard('button_pressed');
trigger.trigger(device, tokens, state);
```

---

### 3. Condition return non-boolean

**WRONG:**
```javascript
conditionCard.registerRunListener(async (args) => {
  return 'yes'; // ❌ String!
});
```

**CORRECT:**
```javascript
conditionCard.registerRunListener(async (args) => {
  const value = await args.device.getCapabilityValue('onoff');
  return Boolean(value); // ✅ Boolean
});
```

---

### 4. Pas de registerRunListener

**WRONG:**
```json
// Action définie dans .flow.compose.json
{ "id": "my_action", "title": { "en": "Do something" } }

// ❌ Mais pas de registerRunListener dans le code!
```

**CORRECT:**
```javascript
// ✅ Toujours ajouter listener
const myAction = this.homey.flow.getActionCard('my_action');
myAction.registerRunListener(async (args) => {
  // Implementation
});
```

---

### 5. Device arg manquant

**WRONG:**
```json
{
  "id": "set_mode",
  "args": [
    { "name": "mode", "type": "dropdown", "values": [...] }
    // ❌ Pas de device arg!
  ]
}
```

**CORRECT:**
```json
{
  "id": "set_mode",
  "args": [
    {
      "name": "device",
      "type": "device",
      "filter": "driver_id=my_driver"
    },
    { "name": "mode", "type": "dropdown", "values": [...] }
  ]
}
```

---

## 📊 CHECKLIST VALIDATION

**Avant de commit flow cards:**

- [ ] Triggers device-specific ont tokens (button, action, etc.)
- [ ] Tous les cards device-specific ont arg device avec filter
- [ ] registerRunListener implémenté pour chaque card
- [ ] Conditions return boolean
- [ ] Actions return void
- [ ] Triggers utilisent getDeviceTriggerCard()
- [ ] Titre multilang (au moins en + fr)
- [ ] titleFormatted pour args visibles
- [ ] Hint ajouté si besoin de clarification
- [ ] Test dans Homey app (pairing + flow creation)

---

## 🎯 EXEMPLE COMPLET: Wireless Switch 4-Gang

**driver.flow.compose.json:**
```json
{
  "triggers": [
    {
      "id": "button_pressed",
      "title": {
        "en": "Button pressed",
        "fr": "Bouton appuyé"
      },
      "hint": {
        "en": "Triggered when any button is pressed"
      },
      "tokens": [
        {
          "name": "button",
          "type": "string",
          "title": { "en": "Button", "fr": "Bouton" },
          "example": "1"
        },
        {
          "name": "action",
          "type": "string",
          "title": { "en": "Action", "fr": "Action" },
          "example": "single"
        }
      ],
      "args": [
        {
          "name": "device",
          "type": "device",
          "filter": "driver_id=wireless_switch_4gang_cr2450"
        }
      ]
    }
  ]
}
```

**driver.js:**
```javascript
'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WirelessSwitch4GangDriver extends ZigBeeDriver {
  
  async onInit() {
    this.log('Wireless Switch 4-Gang driver initialized');
    
    // Get device trigger card
    this.buttonPressedTrigger = this.homey.flow
      .getDeviceTriggerCard('button_pressed');
  }
  
}

module.exports = WirelessSwitch4GangDriver;
```

**device.js:**
```javascript
'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class WirelessSwitch4GangDevice extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.log('Wireless Switch 4-Gang device initialized');
    
    // Listen for button presses (example with Tuya cluster)
    if (this.hasCapability('button')) {
      this.registerMultipleCapabilityListener(['button'], async (values) => {
        const buttonData = values.button;
        await this.onButtonPressed(buttonData);
      });
    }
  }
  
  async onButtonPressed(data) {
    // Parse button data (format depends on device)
    // Example: { button: 1, action: 'single' }
    const button = String(data.button || '1');
    const action = String(data.action || 'single');
    
    this.log(`Button ${button} pressed: ${action}`);
    
    // Trigger flow with tokens
    await this.driver.buttonPressedTrigger
      .trigger(this, {
        button: button,
        action: action
      })
      .catch(this.error);
  }
  
}

module.exports = WirelessSwitch4GangDevice;
```

---

## 📚 RESSOURCES

**Documentation officielle:**
- Flow basics: https://apps.developer.homey.app/the-basics/flow
- Flow arguments: https://apps.developer.homey.app/the-basics/flow/arguments
- API ManagerFlow: https://apps-sdk-v3.developer.homey.app/ManagerFlow.html

**Apps populaires (exemples):**
- Aqara (Maxmudjon): https://github.com/Maxmudjon/com.maxmudjon.mihomey
- IKEA TRADFRI (Athom): Implémentation référence
- Sonoff (StyraHem): Flow cards bien implémentées

**Forum Homey:**
- Flow cards questions: https://community.homey.app/
- Peter issue: Missing button triggers fixed

---

*Guide créé: 16 Octobre 2025*  
*Version: 3.0.5*  
*Status: COMPLETE - Ready for implementation*
