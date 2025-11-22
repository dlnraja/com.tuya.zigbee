# 🔄 CONVERSION BLAKADDER → HOMEY SDK3

**Date:** 2025-11-21
**Purpose:** Convertir correctement les informations Blakadder (ZHA, Zigbee2MQTT, deCONZ) vers Homey SDK3

---

## ⚠️ DIFFÉRENCES CRITIQUES

### Systèmes Sources (Blakadder)
- **ZHA** (Home Assistant)
- **Zigbee2MQTT** (Node.js + MQTT)
- **deCONZ** (ConBee/RaspBee)
- **Zigbee for Domoticz**
- **ioBroker.zigbee**

### Homey SDK3
- **homey-zigbeedriver** (bibliothèque officielle Athom)
- **zigbee-clusters** (gestion clusters bas niveau)
- Format JSON spécifique `driver.compose.json`

---

## 📋 TABLE DE CONVERSION DES CLUSTERS

### Blakadder/ZHA → Homey SDK3

| Blakadder/ZHA Name | Cluster ID | Homey SDK3 |
|-------------------|-----------|------------|
| `genBasic` | 0 | `0` ou `"basic"` |
| `genIdentify` | 3 | `3` ou `"identify"` |
| `genGroups` | 4 | `4` ou `"groups"` |
| `genScenes` | 5 | `5` ou `"scenes"` |
| `genOnOff` | 6 | `6` ou `"onOff"` |
| `genLevelCtrl` | 8 | `8` ou `"levelControl"` |
| `genPowerCfg` | 1 | `1` ou `"powerConfiguration"` |
| `msTemperatureMeasurement` | 1026 | `1026` ou `"temperatureMeasurement"` |
| `msRelativeHumidity` | 1029 | `1029` ou `"relativeHumidity"` |
| `msIlluminanceMeasurement` | 1024 | `1024` ou `"illuminanceMeasurement"` |
| `ssIasZone` | 1280 | `1280` ou `"iasZone"` |
| `manuSpecificTuya` | 61184 ou 0xEF00 | `61184` |
| `haElectricalMeasurement` | 2820 | `2820` ou `"electricalMeasurement"` |
| `seMetering` | 1794 | `1794` ou `"metering"` |

**⚠️ IMPORTANT POUR HOMEY:**
- Homey SDK3 accepte les **nombres** (recommandé) ou les **strings**
- Dans `driver.compose.json`: utiliser **nombres uniquement**
- Dans `device.js`: utiliser les noms de clusters via `zclNode.endpoints[1].clusters.iasZone`

---

## 🔧 CONVERSION: BOUTONS SANS FIL (TS0041/TS0043/TS0044)

### Source Blakadder TS0041

```yaml
# Blakadder Format
Zigbee ID: TS0041
Manufacturer IDs:
  - _TZ3000_q68478x7
  - _TZ3000_4upl1fcj
  - _TZ3000_fa9mlvja
  - _TZ3000_tk3s5tyg
  - _TZ3400_keyjqthh
  - _TZ3000_pzui3skt
  - _TZ3000_5bpeda8u (Cam's device)

Clusters (ZHA format):
  In: genBasic, genIdentify, genOnOff, genPowerCfg
  Out: genIdentify, genOnOff, genLevelCtrl, genScenes
```

### → Conversion Homey SDK3

```json
{
  "name": {
    "en": "Wireless Button 1-Gang",
    "fr": "Bouton Sans Fil 1-Gang"
  },
  "class": "button",
  "capabilities": [
    "measure_battery"
  ],
  "zigbee": {
    "manufacturerName": [
      "_TZ3000_q68478x7",
      "_TZ3000_4upl1fcj",
      "_TZ3000_fa9mlvja",
      "_TZ3000_tk3s5tyg",
      "_TZ3400_keyjqthh",
      "_TZ3000_pzui3skt",
      "_TZ3000_5bpeda8u"
    ],
    "productId": ["TS0041"],
    "endpoints": {
      "1": {
        "clusters": [0, 3, 6, 1, 1280],
        "bindings": [6, 1280]
      }
    },
    "learnmode": {
      "image": "/drivers/button_wireless_1/assets/learnmode.svg",
      "instruction": {
        "en": "Press and hold the button for 5 seconds until LED flashes",
        "fr": "Appuyez et maintenez le bouton pendant 5 secondes jusqu'à ce que la LED clignote"
      }
    }
  },
  "energy": {
    "batteries": ["CR2032", "CR2450"]
  }
}
```

**Explication de la conversion:**
- `genBasic` → `0`
- `genIdentify` → `3`
- `genOnOff` → `6`
- `genPowerCfg` → `1`
- `ssIasZone` → `1280` (ajouté pour IAS Zone enrollment)
- **bindings**: `[6, 1280]` - nécessaire pour recevoir les events du bouton

### Device.js (IAS Zone Handling)

```javascript
'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class ButtonWireless1 extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // Enable debugging (optional)
    this.enableDebug();
    this.printNode();

    // Register battery capability
    if (this.hasCapability('measure_battery')) {
      this.registerCapability('measure_battery', '0x0001', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 3600, // 1 hour
            maxInterval: 65000, // 18 hours
            minChange: 10, // 10% change
          },
        },
      });
    }

    // IAS Zone enrollment (CRITICAL FOR BUTTONS)
    if (zclNode.endpoints[1].clusters.iasZone) {
      this.log('Initializing IAS Zone for button...');

      // Handle zone enroll request
      zclNode.endpoints[1].clusters.iasZone.onZoneEnrollRequest = async () => {
        this.log('Received Zone Enroll Request');
        try {
          await zclNode.endpoints[1].clusters.iasZone.zoneEnrollResponse({
            enrollResponseCode: 0, // Success
            zoneId: 10,
          });
          this.log('✅ Zone Enroll Response sent successfully');
        } catch (err) {
          this.error('❌ Zone Enroll Response failed:', err);
        }
      };

      // Proactive enrollment (in case request was missed during pairing)
      try {
        await zclNode.endpoints[1].clusters.iasZone.zoneEnrollResponse({
          enrollResponseCode: 0,
          zoneId: 10,
        });
        this.log('✅ Proactive Zone Enroll Response sent');
      } catch (err) {
        this.error('Proactive enrollment failed (may be normal):', err);
      }

      // Listen for button press events
      zclNode.endpoints[1].clusters.iasZone.on('zoneStatusChangeNotification', (data) => {
        this.log('🔘 Button press detected:', data);

        // Parse zone status bits
        const alarm1 = (data.zoneStatus & 0x01) !== 0; // Bit 0 = Alarm1 (press)
        const alarm2 = (data.zoneStatus & 0x02) !== 0; // Bit 1 = Alarm2 (long press?)

        if (alarm1) {
          this.log('✅ Button pressed (alarm1)');
          this.driver.triggerButtonPressed(this, {}, {});
        }

        if (alarm2) {
          this.log('✅ Button long pressed (alarm2)');
          this.driver.triggerButtonLongPressed(this, {}, {});
        }
      });

      this.log('✅ IAS Zone listeners registered');
    } else {
      this.error('❌ IAS Zone cluster not available!');
    }
  }

}

module.exports = ButtonWireless1;
```

---

## 🎯 CONVERSION: CAPTEUR DE PRÉSENCE _TZE200_rhgsbacq

### Source Zigbee2MQTT

```javascript
// Zigbee2MQTT Format
{
  modelID: 'TS0601',
  manufacturerName: '_TZE200_rhgsbacq',
  type: 'Router',
  powerSource: 'Mains',

  // Tuya Datapoints (NOT standard Zigbee)
  meta: {
    tuyaDatapoints: [
      [1, 'presence_state', lookup({ none: 0, motion: 1, stationary: 2 })],
      [3, 'near_detection', divideBy100],
      [4, 'far_detection', divideBy100],
      [9, 'target_distance_closest', divideBy100],
      [101, 'static_sensitivity', raw],
      [102, 'motion_sensitivity', raw],
    ],
  },
}
```

### → Conversion Homey SDK3

**⚠️ ATTENTION: TS0601 = Tuya Proprietary Protocol**

Pour Homey, **les Tuya Datapoints ne sont PAS supportés nativement** par `homey-zigbeedriver`. Il faut :
1. Utiliser le cluster `manuSpecificTuya` (61184)
2. Parser les données Tuya manuellement
3. Ou attendre support officiel Athom

```json
{
  "name": {
    "en": "Presence Sensor mmWave Radar",
    "fr": "Capteur Présence Radar mmWave"
  },
  "class": "sensor",
  "capabilities": [
    "alarm_motion",
    "measure_luminance"
  ],
  "zigbee": {
    "manufacturerName": [
      "_TZE200_rhgsbacq",
      "_TZE200_gkfbdvyx",
      "_TZE200_v6ossqfy",
      "_TZE200_kb5noeto"
    ],
    "productId": ["TS0601"],
    "endpoints": {
      "1": {
        "clusters": [0, 4, 5, 61184],
        "bindings": [61184]
      }
    }
  }
}
```

**device.js (Tuya DP Parsing):**

```javascript
'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class PresenceSensorMmwave extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.enableDebug();

    // Tuya TS0601 devices use manufacturer-specific cluster
    if (zclNode.endpoints[1].clusters.manuSpecificTuya) {
      this.log('Initializing Tuya DP engine for TS0601...');

      // Listen for Tuya DP reports
      zclNode.endpoints[1].clusters.manuSpecificTuya.on('reporting', (data) => {
        this.log('Received Tuya DP data:', data);

        // Parse Tuya datapoints
        // Note: This is simplified - actual Tuya DP parsing is more complex
        try {
          if (data.dp === 1) {
            // DP 1 = presence_state (0=none, 1=motion, 2=stationary)
            const presenceState = data.data;
            const hasMotion = presenceState === 1 || presenceState === 2;

            if (this.hasCapability('alarm_motion')) {
              this.setCapabilityValue('alarm_motion', hasMotion).catch(this.error);
            }

            this.log(`Presence state: ${presenceState} (motion: ${hasMotion})`);
          }

          if (data.dp === 9) {
            // DP 9 = target_distance_closest (in cm, divide by 100 for meters)
            const distanceCm = data.data;
            const distanceM = distanceCm / 100;
            this.log(`Closest target distance: ${distanceM}m`);
          }
        } catch (err) {
          this.error('Failed to parse Tuya DP:', err);
        }
      });

      this.log('✅ Tuya DP listeners registered');
    } else {
      this.error('❌ Tuya manufacturer-specific cluster not available!');
    }
  }

}

module.exports = PresenceSensorMmwave;
```

**⚠️ LIMITATION IMPORTANTE:**
Le parsing Tuya DP complet nécessite une implémentation plus avancée. Pour Homey, il vaut mieux attendre qu'Athom ajoute le support officiel des Tuya DP, ou utiliser une bibliothèque externe.

---

## 🚨 CONVERSION: BOUTON SOS D'URGENCE

### Source LoraTap

```yaml
# LoraTap SOSZB
Protocol: Tuya ZigBee 3.0
Model: SOSZB
Manufacturer: LoraTap (probablement _TZ3000_xxxxxxxx)
Battery: CR2032
Type: Emergency panic button
Function: One-click SOS alarm

# Clusters (estimation basée sur devices similaires)
In: genBasic, genPowerCfg, genIdentify, ssIasZone
Out: (none typically)
```

### → Conversion Homey SDK3

```json
{
  "name": {
    "en": "Emergency SOS Panic Button",
    "fr": "Bouton Panique SOS d'Urgence"
  },
  "class": "button",
  "capabilities": [
    "alarm_generic",
    "measure_battery"
  ],
  "zigbee": {
    "manufacturerName": [
      "LoraTap",
      "_TZ3000_peshyb0z",
      "_TZ3000_xxxx"
    ],
    "productId": ["TS0211", "SOSZB"],
    "endpoints": {
      "1": {
        "clusters": [0, 1, 3, 1280],
        "bindings": [1280]
      }
    },
    "learnmode": {
      "image": "/drivers/button_emergency_sos/assets/learnmode.svg",
      "instruction": {
        "en": "Press the SOS button for 5 seconds until LED flashes",
        "fr": "Appuyez sur le bouton SOS pendant 5 secondes jusqu'à ce que la LED clignote"
      }
    }
  },
  "energy": {
    "batteries": ["CR2032"]
  }
}
```

**device.js:**

```javascript
'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class ButtonEmergencySos extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.enableDebug();
    this.printNode();

    // Battery reporting
    if (this.hasCapability('measure_battery')) {
      this.registerCapability('measure_battery', '0x0001', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 3600,
            maxInterval: 65000,
            minChange: 10,
          },
        },
      });
    }

    // IAS Zone for SOS button
    if (zclNode.endpoints[1].clusters.iasZone) {
      this.log('Initializing IAS Zone for SOS button...');

      // Zone enrollment
      zclNode.endpoints[1].clusters.iasZone.onZoneEnrollRequest = async () => {
        try {
          await zclNode.endpoints[1].clusters.iasZone.zoneEnrollResponse({
            enrollResponseCode: 0,
            zoneId: 10,
          });
          this.log('✅ SOS button enrolled successfully');
        } catch (err) {
          this.error('SOS enrollment failed:', err);
        }
      };

      // Proactive enrollment
      try {
        await zclNode.endpoints[1].clusters.iasZone.zoneEnrollResponse({
          enrollResponseCode: 0,
          zoneId: 10,
        });
      } catch (err) {
        // Ignore error
      }

      // Listen for SOS press
      zclNode.endpoints[1].clusters.iasZone.on('zoneStatusChangeNotification', (data) => {
        this.log('🚨 SOS BUTTON PRESSED!', data);

        // Trigger alarm
        if (this.hasCapability('alarm_generic')) {
          this.setCapabilityValue('alarm_generic', true).catch(this.error);

          // Auto-reset after 5 seconds
          this.sosTimeout = setTimeout(() => {
            this.setCapabilityValue('alarm_generic', false).catch(this.error);
          }, 5000);
        }

        // Trigger flow card
        this.driver.triggerSosPressed(this, {}, {});

        // Log for emergency
        this.log('⚠️⚠️⚠️ EMERGENCY SOS ACTIVATED ⚠️⚠️⚠️');
      });

      this.log('✅ SOS button ready');
    }
  }

  onDeleted() {
    if (this.sosTimeout) {
      clearTimeout(this.sosTimeout);
    }
  }

}

module.exports = ButtonEmergencySos;
```

---

## 📊 RÉSUMÉ DES CONVERSIONS

### Clusters IDs (Numériques pour Homey)

```javascript
// TOUJOURS utiliser les IDs numériques dans driver.compose.json
const HOMEY_CLUSTER_IDS = {
  basic: 0,
  powerConfiguration: 1,
  identify: 3,
  groups: 4,
  scenes: 5,
  onOff: 6,
  levelControl: 8,
  illuminanceMeasurement: 1024,
  temperatureMeasurement: 1026,
  relativeHumidity: 1029,
  iasZone: 1280,            // ← CRITIQUE pour boutons/capteurs
  manuSpecificTuya: 61184,  // ← Pour TS0601 Tuya devices
  electricalMeasurement: 2820,
  metering: 1794,
};
```

### Manufacturer IDs (Identiques sur tous systèmes)

```javascript
// Les manufacturer IDs sont UNIVERSELS
// Utiliser exactement comme dans Blakadder/Zigbee2MQTT
const MANUFACTURER_IDS = {
  // Buttons TS0041
  button_ts0041: [
    '_TZ3000_q68478x7',
    '_TZ3000_4upl1fcj',
    '_TZ3000_fa9mlvja',
    '_TZ3000_tk3s5tyg',
    '_TZ3400_keyjqthh',
    '_TZ3000_pzui3skt',
    '_TZ3000_5bpeda8u',
  ],

  // Presence mmWave TS0601
  presence_mmwave: [
    '_TZE200_rhgsbacq',
    '_TZE200_gkfbdvyx',
    '_TZE200_v6ossqfy',
    '_TZE200_kb5noeto',
  ],

  // Motion ZG-204ZL
  motion_zg204zl: [
    'HOBEIAN',
    '_TZ3000_1o6x1bl0',
  ],
};
```

### Product IDs (Identiques)

```javascript
// Les product IDs (modelId) sont aussi universels
const PRODUCT_IDS = {
  button_1gang: ['TS0041'],
  button_3gang: ['TS0043'],
  button_4gang: ['TS0044'],
  motion_hobeian: ['ZG-204ZL', 'ZG-204ZM'],
  presence_tuya: ['TS0601'],
  sos_button: ['TS0211', 'SOSZB'],
};
```

---

## ✅ CHECKLIST DE CONVERSION

### Avant de créer un driver Homey depuis Blakadder:

- [ ] **1. Identifier les Manufacturer IDs**
  - Copier EXACTEMENT de Blakadder
  - Ne pas modifier, ne pas "adapter"

- [ ] **2. Identifier le Product ID (modelId)**
  - Copier EXACTEMENT
  - Peut être array si plusieurs variantes

- [ ] **3. Convertir les Cluster Names → IDs numériques**
  - `genBasic` → `0`
  - `ssIasZone` → `1280`
  - Etc. (voir table ci-dessus)

- [ ] **4. Déterminer les Bindings**
  - Pour recevoir events: ajouter cluster dans `bindings`
  - Typiquement: `[6, 1280]` pour boutons IAS Zone

- [ ] **5. Choisir la Class Homey appropriée**
  - `"button"` pour boutons
  - `"sensor"` pour capteurs
  - `"light"` pour lumières
  - `"socket"` pour prises
  - PAS `"switch"` (invalide sur Homey)

- [ ] **6. Choisir les Capabilities Homey**
  - `measure_battery` pour devices batterie
  - `alarm_motion` pour détection mouvement
  - `measure_temperature` pour température
  - Voir [Homey Capabilities](https://apps.developer.homey.app/the-basics/device/capabilities)

- [ ] **7. Ajouter Energy section si batterie**
  ```json
  "energy": {
    "batteries": ["CR2032", "CR2450", "AAA", "AA"]
  }
  ```

- [ ] **8. Implémenter IAS Zone si nécessaire**
  - Pour boutons, capteurs motion, contact, etc.
  - Utiliser `onZoneEnrollRequest` + listener
  - Voir exemple code ci-dessus

- [ ] **9. Tester avec `homey app validate`**
  - Vérifier aucune erreur de validation
  - Clusters doivent être numériques
  - Class doit être valide

- [ ] **10. Tester avec device physique**
  - Pairing fonctionne
  - Capabilities fonctionnent
  - Events déclenchent flows

---

## 🚫 ERREURS COMMUNES À ÉVITER

### ❌ NE PAS FAIRE:

```json
// ❌ Utiliser des noms de clusters au lieu d'IDs
{
  "clusters": ["genBasic", "genPowerCfg", "ssIasZone"]
}

// ❌ Class invalide
{
  "class": "switch"  // Invalide sur Homey!
}

// ❌ Oublier les bindings pour IAS Zone
{
  "clusters": [1280],
  "bindings": []  // ❌ Events ne seront pas reçus!
}

// ❌ Adapter les manufacturer IDs
{
  "manufacturerName": ["TZ3000"]  // ❌ Incomplet!
}
```

### ✅ FAIRE:

```json
// ✅ Utiliser des IDs numériques
{
  "clusters": [0, 1, 1280]
}

// ✅ Class valide
{
  "class": "button"  // ✅ Valide
}

// ✅ Inclure bindings pour recevoir events
{
  "clusters": [0, 1, 1280],
  "bindings": [1280]  // ✅ Recevra zone status changes
}

// ✅ Manufacturer ID complet
{
  "manufacturerName": ["_TZ3000_q68478x7"]  // ✅ Exact
}
```

---

## 📚 RESSOURCES OFFICIELLES

### Documentation Homey

- **Zigbee Guide:** https://apps.developer.homey.app/wireless/zigbee
- **homey-zigbeedriver:** https://athombv.github.io/node-homey-zigbeedriver/
- **zigbee-clusters:** https://github.com/athombv/node-zigbee-clusters
- **Capabilities:** https://apps.developer.homey.app/the-basics/device/capabilities
- **Zigbee Cluster Spec:** https://zigbeealliance.org/wp-content/uploads/2019/12/07-5123-06-zigbee-cluster-library-specification.pdf

### Bases de données Zigbee

- **Blakadder:** https://zigbee.blakadder.com/
- **Zigbee2MQTT Devices:** https://www.zigbee2mqtt.io/supported-devices/
- **ZHA Device Handlers:** https://github.com/zigpy/zha-device-handlers

---

**Status:** READY TO USE
**Author:** Dylan Rajasekaram
**Date:** 2025-11-21
