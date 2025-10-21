# 🎯 Ajout Device GIRIER - Issue #1187

**Source:** Votre contribution dlnraja sur Johan Bendz  
**Issue:** https://github.com/JohanBendz/com.tuya.zigbee/issues/1187  
**Status:** Already fixed (commit #1188)

---

## 📋 DEVICE INFORMATION

### GIRIER Tuya Smart ZigBee LED Switch 4CH

**Manufacturer:** GIRIER  
**Model:** TS0004  
**Manufacturer ID:** `_TZ3000_ltt60asa`  
**Type:** 4-Channel LED/Light Switch Module  
**Power:** Mains (AC)  

**AliExpress Link:**  
https://a.aliexpress.com/_EHbkKnq

**Description:**  
Module de commutation 4 canaux ZigBee intelligent pour :
- Contrôle d'éclairage LED
- Contrôle de rideaux
- Gradateur
- Relais domotique
- Compatible Alexa, Google Home, Alice

---

## 🔧 CONFIGURATION ZIGBEE

### Device Interview Data

```json
{
  "modelId": "TS0004",
  "manufacturerName": "_TZ3000_ltt60asa",
  "deviceType": "router",
  "powerSource": "mains"
}
```

### Endpoints Configuration

#### Endpoint 1 (Primary)
```json
{
  "endpointId": 1,
  "applicationProfileId": 260,
  "applicationDeviceId": 256,
  "inputClusters": [0, 3, 4, 5, 6, 1794, 2820, 57344, 57345],
  "outputClusters": [10, 25]
}
```

**Capabilities:**
- `onoff` (cluster 6)
- `meter_power` (cluster 1794 - Metering)
- `measure_power` (cluster 2820 - Electrical Measurement)
- `measure_voltage` (rmsVoltage: 1285)
- `measure_current` (rmsCurrent: 1288)

#### Endpoint 2, 3, 4 (Additional Channels)
```json
{
  "endpointId": 2/3/4,
  "applicationProfileId": 260,
  "applicationDeviceId": 256,
  "inputClusters": [4, 5, 6],
  "outputClusters": []
}
```

**Capabilities:**
- `onoff` (cluster 6) per channel

---

## 🎨 DRIVER STRUCTURE

### Option A: Single Driver Multi-Channel

**Driver ID:** `girier_smart_led_switch_4gang_ac`

```json
{
  "id": "girier_smart_led_switch_4gang_ac",
  "name": {
    "en": "Smart LED Switch 4-Gang (AC)",
    "fr": "Interrupteur LED Intelligent 4 Canaux (AC)"
  },
  "class": "socket",
  "capabilities": [
    "onoff",
    "onoff.1",
    "onoff.2", 
    "onoff.3",
    "measure_power",
    "measure_voltage",
    "measure_current",
    "meter_power"
  ],
  "capabilitiesOptions": {
    "onoff": {
      "title": {
        "en": "Channel 1",
        "fr": "Canal 1"
      }
    },
    "onoff.1": {
      "title": {
        "en": "Channel 2",
        "fr": "Canal 2"
      }
    },
    "onoff.2": {
      "title": {
        "en": "Channel 3",
        "fr": "Canal 3"
      }
    },
    "onoff.3": {
      "title": {
        "en": "Channel 4",
        "fr": "Canal 4"
      }
    }
  },
  "zigbee": {
    "manufacturerName": ["_TZ3000_ltt60asa"],
    "productId": ["TS0004"],
    "endpoints": {
      "1": {
        "clusters": [0, 3, 4, 5, 6, 1794, 2820],
        "bindings": [6, 1794, 2820]
      },
      "2": {
        "clusters": [4, 5, 6],
        "bindings": [6]
      },
      "3": {
        "clusters": [4, 5, 6],
        "bindings": [6]
      },
      "4": {
        "clusters": [4, 5, 6],
        "bindings": [6]
      }
    }
  }
}
```

### Option B: Separate Drivers (1, 2, 3, 4 Gang)

**Avantage:** Plus flexible si versions 1/2/3 gang existent

```
girier_smart_led_switch_1gang_ac
girier_smart_led_switch_2gang_ac
girier_smart_led_switch_3gang_ac
girier_smart_led_switch_4gang_ac
```

---

## 📊 CAPABILITIES MAPPING

### Power Monitoring (Endpoint 1)

```javascript
// Electrical Measurement (cluster 2820)
{
  "rmsVoltage": 1285,      // → measure_voltage
  "rmsCurrent": 1288,      // → measure_current
  "activePower": 1291      // → measure_power
}

// Metering (cluster 1794)
{
  "currentSummationDelivered": 0  // → meter_power
}
```

### Switch Control (All Endpoints)

```javascript
// OnOff (cluster 6)
{
  "onOff": 0,              // → onoff capability
  "onTime": 16385,         // Timer support
  "offWaitTime": 16386     // Delay support
}
```

---

## 🎯 DRIVER FEATURES

### Core Features
- ✅ 4 independent channels
- ✅ Individual on/off control per channel
- ✅ Power monitoring (channel 1)
- ✅ Voltage monitoring
- ✅ Current monitoring
- ✅ Energy metering

### Advanced Features
- ✅ Timer support (onTime, offWaitTime)
- ✅ Groups & Scenes support
- ✅ Reporting configuration
- ✅ Mains powered (always on router)

### Flow Cards

**Triggers:**
- When channel [1-4] turned on
- When channel [1-4] turned off
- When power changed
- When energy threshold reached

**Actions:**
- Turn channel [1-4] on
- Turn channel [1-4] off
- Toggle channel [1-4]
- Turn all on/off
- Set timer on/off

**Conditions:**
- Channel [1-4] is on/off
- Power is above/below X watts
- Total energy is above/below X kWh

---

## 🔄 EXISTING DRIVERS SIMILAIRES

### Dans com.tuya.zigbee (Johan Bendz)

Recherchons si déjà existant:

```bash
# Devices similaires 4-gang:
- tuya_smart_switch_4gang_ac (TS0004)
- moes_smart_switch_4gang_ac (TS0004)
- zemismart_smart_switch_4gang_ac (TS0004)
```

**Manufacturer IDs communs pour TS0004:**
- `_TZ3000_ss98ec5d`
- `_TZ3000_vjhcenzo`
- `_TZ3000_ki1msukj`
- `_TZ3000_ltt60asa` ← **GIRIER (VOTRE DEVICE)**

---

## 🛠️ IMPLEMENTATION PLAN

### 1. Vérifier si déjà dans app actuelle

```bash
# Chercher manufacturer ID:
grep -r "_TZ3000_ltt60asa" app.json

# Chercher TS0004:
grep -r "TS0004" app.json | grep -i "4gang"
```

### 2. Si pas existant, créer driver

```bash
# Créer dossier driver:
mkdir -p drivers/girier_smart_led_switch_4gang_ac/assets/images

# Fichiers requis:
- driver.compose.json (endpoints, capabilities)
- device.js (logique multi-channel)
- assets/images/small.png (75x75)
- assets/images/large.png (500x500)
- assets/images/xlarge.png (1000x1000)
```

### 3. Configuration driver.compose.json

```json
{
  "$schema": "https://raw.githubusercontent.com/athombv/node-homey-lib/master/assets/driver/driver.compose.schema.json",
  "id": "girier_smart_led_switch_4gang_ac",
  "name": {
    "en": "Smart LED Switch 4-Gang (AC) - GIRIER",
    "fr": "Interrupteur LED 4 Canaux (AC) - GIRIER"
  },
  "class": "socket",
  "capabilities": [
    "onoff",
    "onoff.1",
    "onoff.2",
    "onoff.3",
    "measure_power",
    "measure_voltage",
    "measure_current",
    "meter_power"
  ],
  "energy": {
    "approximation": {
      "usageOn": 5,
      "usageOff": 0.5
    }
  },
  "zigbee": {
    "manufacturerName": [
      "_TZ3000_ltt60asa"
    ],
    "productId": [
      "TS0004"
    ],
    "endpoints": {
      "1": {
        "clusters": [0, 3, 4, 5, 6, 1794, 2820],
        "bindings": [6, 1794, 2820]
      },
      "2": {
        "clusters": [4, 5, 6],
        "bindings": [6]
      },
      "3": {
        "clusters": [4, 5, 6],
        "bindings": [6]
      },
      "4": {
        "clusters": [4, 5, 6],
        "bindings": [6]
      }
    },
    "learnmode": {
      "instruction": {
        "en": "Press and hold the reset button for 5 seconds until the LED flashes",
        "fr": "Maintenez le bouton reset pendant 5 secondes jusqu'à ce que la LED clignote"
      }
    }
  },
  "images": {
    "small": "/drivers/girier_smart_led_switch_4gang_ac/assets/images/small.png",
    "large": "/drivers/girier_smart_led_switch_4gang_ac/assets/images/large.png",
    "xlarge": "/drivers/girier_smart_led_switch_4gang_ac/assets/images/xlarge.png"
  }
}
```

### 4. Device.js Multi-Channel Logic

```javascript
'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class GirierSmartLedSwitch4Gang extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    
    // Register capability for channel 1 (endpoint 1)
    this.registerCapability('onoff', 'onOff', {
      endpoint: 1
    });
    
    // Register capabilities for channels 2-4 (endpoints 2-4)
    this.registerCapability('onoff.1', 'onOff', {
      endpoint: 2
    });
    
    this.registerCapability('onoff.2', 'onOff', {
      endpoint: 3
    });
    
    this.registerCapability('onoff.3', 'onOff', {
      endpoint: 4
    });
    
    // Power monitoring (endpoint 1)
    if (this.hasCapability('measure_power')) {
      this.registerCapability('measure_power', 'electricalMeasurement', {
        endpoint: 1
      });
    }
    
    if (this.hasCapability('measure_voltage')) {
      this.registerCapability('measure_voltage', 'electricalMeasurement', {
        endpoint: 1
      });
    }
    
    if (this.hasCapability('measure_current')) {
      this.registerCapability('measure_current', 'electricalMeasurement', {
        endpoint: 1
      });
    }
    
    if (this.hasCapability('meter_power')) {
      this.registerCapability('meter_power', 'metering', {
        endpoint: 1
      });
    }
    
    this.log('GIRIER 4-Gang LED Switch initialized');
  }
  
}

module.exports = GirierSmartLedSwitch4Gang;
```

---

## 📸 IMAGES ASSETS

### Source Images

**AliExpress Product:**
https://a.aliexpress.com/_EHbkKnq

**Recommandations:**
1. Screenshot produit AliExpress
2. Crop & resize à 1000x1000
3. Créer versions 500x500 et 75x75
4. Style: Module électrique 4 canaux
5. Fond transparent ou blanc

---

## ✅ VALIDATION CHECKLIST

### Avant Commit

- [ ] Vérifier manufacturer ID unique dans app.json
- [ ] Tester pairing avec device réel
- [ ] Vérifier chaque channel fonctionne
- [ ] Tester power monitoring
- [ ] Valider images (3 tailles)
- [ ] `homey app validate --level publish`
- [ ] Increment version app

### Tests Fonctionnels

- [ ] Channel 1 on/off
- [ ] Channel 2 on/off
- [ ] Channel 3 on/off
- [ ] Channel 4 on/off
- [ ] Power measurement updates
- [ ] Voltage measurement
- [ ] Current measurement
- [ ] Energy metering
- [ ] Groups & Scenes work
- [ ] Device survives Homey restart

---

## 🔄 SYNC AVEC JOHAN BENDZ

### Votre Contribution (Issue #1187)

**Status:** Already fixed with commit #1188  
**Action:** Vérifier si ce fix a été merged dans master

```bash
# Check dans repo Johan Bendz:
curl https://api.github.com/repos/JohanBendz/com.tuya.zigbee/commits | 
  grep -A5 "1188"

# Ou visiter:
https://github.com/JohanBendz/com.tuya.zigbee/commits
```

### Si Déjà Merged

Copier la configuration depuis Johan Bendz:

```bash
# Cloner repo Johan:
git clone https://github.com/JohanBendz/com.tuya.zigbee.git temp_johan

# Chercher le driver GIRIER:
cd temp_johan
find . -name "*ltt60asa*" -o -name "*girier*"

# Copier configuration
```

---

## 🎯 RÉSUMÉ EXÉCUTIF

### Device GIRIER TS0004

```
✅ Manufacturer ID: _TZ3000_ltt60asa
✅ Model: TS0004 (4-gang switch)
✅ Your Issue: #1187 (Johan Bendz repo)
✅ Status: Fixed in commit #1188
✅ Power: Mains AC
✅ Features: 4 channels + power monitoring
```

### Action Required

1. **Vérifier** si `_TZ3000_ltt60asa` déjà dans votre app.json
2. **Si non:** Créer driver basé sur cette spec
3. **Si oui:** Vérifier que 4 channels fonctionnent
4. **Tester** avec votre device physique
5. **Commit** et push

### Prochaine Étape

```bash
# Chercher dans app actuel:
grep "_TZ3000_ltt60asa" app.json

# Si absent:
node scripts/add-devices/CREATE_GIRIER_DRIVER.js

# Si présent:
echo "Already supported!"
```

---

**Créé:** 2025-10-21  
**Auteur:** Dylan Rajasekaram  
**Source:** Issue #1187 Johan Bendz  
**Device:** GIRIER TS0004 4-Gang LED Switch
