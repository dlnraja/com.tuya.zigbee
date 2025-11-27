# 🎮 TS004X DRIVERS V2 - CLEAN BUTTON/REMOTE TEMPLATES

**AUDIT V2:** Drivers propres selon guidelines Homey
**Status:** Templates ready pour implementation

---

## 🎯 PHILOSOPHY

**What Homey wants:**
- `class: button` for controllers/remotes
- NO onoff, NO dim, NO controllable capabilities
- Flow Cards only: "When button X pressed/double/long"
- measure_battery for battery-powered devices

**What we had before:**
- Hybrid drivers (sometimes button, sometimes switch)
- Smart-Adapt changing capabilities dynamically
- Confusion for users

**What we do now:**
- Dedicated, static drivers
- Crystal clear purpose
- No runtime modifications

---

## 📁 DRIVER STRUCTURE

### button_wireless_1 (TS0041)
```
drivers/button_wireless_1_v2/
├── driver.compose.json    # Static capabilities
├── device.js              # Simple battery + scene triggers
├── assets/
│   ├── images/
│   │   ├── small.png
│   │   └── large.png
│   └── learnmode.svg
└── README.md
```

### button_wireless_3 (TS0043)
Same structure, 3 buttons

### button_wireless_4 (TS0044)
Same structure, 4 buttons

---

## 📄 driver.compose.json (TS0041 - 1 Button)

```json
{
  "name": {
    "en": "Wireless Button (1 button)",
    "fr": "Bouton Sans Fil (1 bouton)"
  },
  "class": "button",
  "capabilities": [
    "measure_battery"
  ],
  "capabilitiesOptions": {
    "measure_battery": {
      "title": {
        "en": "Battery",
        "fr": "Batterie"
      }
    }
  },
  "energy": {
    "batteries": ["CR2032", "CR2450"]
  },
  "zigbee": {
    "manufacturerName": [
      "_TZ3000_5bpeda8u",
      "_TZ3000_vp6clf9d",
      "_TZ3000_dfgbtub0",
      "_TZ3000_tk3s5tyg",
      "_TZ3000_*"
    ],
    "productId": ["TS0041"],
    "learnmode": {
      "instruction": {
        "en": "Press and hold the button for 5 seconds until LED blinks",
        "fr": "Appuyez et maintenez le bouton pendant 5 secondes jusqu'à ce que la LED clignote"
      }
    },
    "endpoints": {
      "1": {
        "clusters": [0, 1, 3, 6],
        "bindings": [6]
      }
    }
  },
  "images": {
    "small": "/drivers/button_wireless_1_v2/assets/images/small.png",
    "large": "/drivers/button_wireless_1_v2/assets/images/large.png"
  },
  "platforms": ["local"],
  "connectivity": ["zigbee"],
  "settings": [
    {
      "id": "battery_report_interval",
      "type": "number",
      "label": {
        "en": "Battery Report Interval (hours)",
        "fr": "Intervalle Rapport Batterie (heures)"
      },
      "value": 6,
      "min": 1,
      "max": 24,
      "step": 1,
      "hint": {
        "en": "How often to check battery level",
        "fr": "Fréquence de vérification du niveau de batterie"
      }
    }
  ],
  "id": "button_wireless_1_v2"
}
```

---

## 📄 device.js (TS0041 - 1 Button)

```javascript
'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const BatteryManagerV2 = require('../../lib/BatteryManagerV2');

/**
 * TS0041 - Wireless Button (1 button)
 *
 * AUDIT V2: Clean button driver
 * - class: button (controller, not controllable)
 * - measure_battery only
 * - Flow cards for scenes (pressed/double/long)
 * - No onoff, no dim
 */
class TS0041Device extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('TS0041 Wireless Button initialized');

    // Initialize battery manager
    this.batteryManager = new BatteryManagerV2(this);
    await this.batteryManager.startMonitoring();

    // Register scene triggers (button events)
    this.registerSceneTriggers();

    this.log('✅ TS0041 ready');
  }

  /**
   * Register scene triggers for button events
   */
  registerSceneTriggers() {
    // Button 1 pressed (short click)
    this.registerCommandListener('onOff', 'on', async () => {
      await this.triggerFlow('button_1_pressed');
    }, 1);

    this.registerCommandListener('onOff', 'off', async () => {
      await this.triggerFlow('button_1_pressed');
    }, 1);

    // Button 1 double press
    this.registerCommandListener('onOff', 'toggle', async () => {
      await this.triggerFlow('button_1_double');
    }, 1);

    // Button 1 long press
    this.registerCommandListener('levelControl', 'moveWithOnOff', async () => {
      await this.triggerFlow('button_1_long_press_start');
    }, 1);

    this.registerCommandListener('levelControl', 'stop', async () => {
      await this.triggerFlow('button_1_long_press_stop');
    }, 1);

    this.log('Scene triggers registered');
  }

  /**
   * Trigger flow card
   */
  async triggerFlow(cardId) {
    this.log(`Triggering flow: ${cardId}`);

    const card = this.homey.flow.getDeviceTriggerCard(cardId);
    if (card) {
      await card.trigger(this, {}, {});
    }
  }

  /**
   * Cleanup on device delete
   */
  async onDeleted() {
    this.log('TS0041 deleted');

    if (this.batteryManager) {
      this.batteryManager.stopMonitoring();
    }
  }
}

module.exports = TS0041Device;
```

---

## 📄 Flow Cards (driver.flow.compose.json)

```json
{
  "triggers": [
    {
      "id": "button_1_pressed",
      "title": {
        "en": "Button pressed",
        "fr": "Bouton appuyé"
      },
      "hint": {
        "en": "This card triggers when the button is pressed (short click)",
        "fr": "Cette carte se déclenche lors d'un appui court sur le bouton"
      }
    },
    {
      "id": "button_1_double",
      "title": {
        "en": "Button double pressed",
        "fr": "Bouton double-cliqué"
      },
      "hint": {
        "en": "This card triggers when the button is pressed twice quickly",
        "fr": "Cette carte se déclenche lors d'un double-clic rapide"
      }
    },
    {
      "id": "button_1_long_press_start",
      "title": {
        "en": "Button long press started",
        "fr": "Appui long démarré"
      },
      "hint": {
        "en": "This card triggers when the button is held down",
        "fr": "Cette carte se déclenche lors d'un appui long"
      }
    },
    {
      "id": "button_1_long_press_stop",
      "title": {
        "en": "Button long press stopped",
        "fr": "Appui long arrêté"
      },
      "hint": {
        "en": "This card triggers when the button is released after long press",
        "fr": "Cette carte se déclenche au relâchement après un appui long"
      }
    }
  ]
}
```

---

## 📄 TS0043 (3 buttons) - Differences

**driver.compose.json:**
- `productId: ["TS0043"]`
- More manufacturer names

**device.js:**
- 3x scene triggers (button_1, button_2, button_3)
- Endpoints 1, 2, 3

**Flow Cards:**
- `button_1_pressed`, `button_2_pressed`, `button_3_pressed`
- `button_1_double`, `button_2_double`, `button_3_double`
- `button_1_long_*`, `button_2_long_*`, `button_3_long_*`

---

## 📄 TS0044 (4 buttons) - Differences

**driver.compose.json:**
- `productId: ["TS0044"]`

**device.js:**
- 4x scene triggers

**Flow Cards:**
- 4x button triggers (button_1 through button_4)

---

## 🚫 WHAT WE DON'T DO

❌ NO `onoff` capability
❌ NO `dim` capability
❌ NO `alarm_motion` capability
❌ NO Smart-Adapt modifications
❌ NO polling every 5 minutes (6h default)
❌ NO class: socket (it's a button!)

---

## ✅ WHAT WE DO

✅ `class: button` (clear, follows Homey guidelines)
✅ `measure_battery` only (declared statically)
✅ Flow cards for user automation
✅ Simple, predictable behavior
✅ BatteryManagerV2 (6h polling for buttons)
✅ No confusion with switches

---

## 🔄 MIGRATION PLAN

### From old drivers to new:

1. **Create new drivers:**
   - `button_wireless_1_v2/`
   - `button_wireless_3_v2/`
   - `button_wireless_4_v2/`

2. **User migration:**
   - Remove old device
   - Pair with new driver
   - Recreate flows (new trigger cards)

3. **Deprecate old drivers:**
   - Mark as deprecated in next version
   - Remove in v6.0.0

---

## 📊 COMPARISON

### Before (v4.9.x):
```
Driver: switch_wireless_1gang or button_wireless_1
Class: socket (wrong!)
Capabilities: onoff, dim (wrong!), measure_battery
Smart-Adapt: Removes onoff/dim at runtime → confusion
Flow: onoff turned on/off (doesn't work!)
```

### After (v5.0.0):
```
Driver: button_wireless_1_v2
Class: button (correct!)
Capabilities: measure_battery (only)
Smart-Adapt: Analysis only, no modifications
Flow: button pressed/double/long (works!)
```

---

## 🎯 NEXT STEPS

1. Implement `button_wireless_1_v2/`
2. Implement `button_wireless_3_v2/`
3. Implement `button_wireless_4_v2/`
4. Test with real devices
5. Document migration guide for users
6. Deprecate old hybrid drivers

---

**Created:** 2025-11-22
**Status:** 📋 TEMPLATE READY
**Target:** v5.0.0 "Stable Edition"
