# 📘 Guide Complet: Tuya Data Points (DPs)

## 🎯 Le Problème

### Valeurs Standard Zigbee vs Tuya Custom

| Type | Description | Exemple |
|------|-------------|---------|
| **Standard Zigbee** | Défini par Zigbee Alliance | Cluster `genPowerCfg`, attribut `batteryPercentageRemaining` |
| **Tuya Custom (DPs)** | Propriétaire Tuya | Cluster `0xEF00`, DP ID `2` = batterie |

### Pourquoi c'est Complexe

- ✅ **80+ DPs différents** par catégorie de produit
- ✅ **Cluster custom:** `0xEF00` (61184) ou `0xEF01`
- ✅ **Encodage spécial:** température × 10, batterie ÷ 2, etc.
- ✅ **Non documenté** officiellement

---

## ✅ Notre Solution: Système Universel Tuya

### Architecture Complète

```
utils/
├── tuya-datapoints-database.js  → 200+ DPs mappés
└── tuya-cluster-handler.js      → Handler universel

drivers/
└── */device.js                   → Utilise TuyaClusterHandler
```

### 1. Database Complète (`tuya-datapoints-database.js`)

**20+ types de devices** avec DPs documentés:

#### 🔹 Multi-Sensor (ZG-204ZV)
```javascript
MULTI_SENSOR: {
  1: { name: 'motion', type: 'bool', capability: 'alarm_motion' },
  2: { name: 'battery', type: 'value', capability: 'measure_battery' },
  4: { name: 'temperature', type: 'value', capability: 'measure_temperature', divide: 10 },
  5: { name: 'humidity', type: 'value', capability: 'measure_humidity' },
  9: { name: 'illuminance', type: 'value', capability: 'measure_luminance' }
}
```

#### 🔹 Smoke Detector
```javascript
SMOKE_DETECTOR: {
  1: { name: 'smoke', type: 'bool', capability: 'alarm_smoke' },
  2: { name: 'battery', type: 'value', capability: 'measure_battery' },
  11: { name: 'smoke_value', type: 'value' },
  14: { name: 'battery_low', type: 'bool', capability: 'alarm_battery' },
  101: { name: 'fault_alarm', type: 'bool', capability: 'alarm_fault' }
}
```

#### 🔹 Gas Detector
```javascript
GAS_DETECTOR: {
  1: { name: 'gas', type: 'bool', capability: 'alarm_co' },
  2: { name: 'battery', type: 'value', capability: 'measure_battery' },
  11: { name: 'gas_value', type: 'value' }
}
```

### 2. Handler Universel (`tuya-cluster-handler.js`)

**Fonctionnalités:**
- ✅ Auto-détection type de device
- ✅ Mapping automatique des DPs
- ✅ Parsing intelligent des valeurs
- ✅ Gestion des enums (actions, modes)
- ✅ Support des couleurs RGB (hex)

**Utilisation dans device.js:**
```javascript
const TuyaClusterHandler = require('../../utils/tuya-cluster-handler');

async onNodeInit({ zclNode }) {
  await super.onNodeInit({ zclNode });
  
  // Auto-détecte et initialise
  const deviceType = TuyaClusterHandler.detectDeviceType('driver_id');
  await TuyaClusterHandler.init(this, zclNode, deviceType);
}
```

---

## 🔍 Comment Découvrir les DPs d'un Nouveau Device

### Méthode 1: Zigbee2MQTT (Recommandé) ✅

**Étapes:**
1. Chercher votre device sur: https://www.zigbee2mqtt.io/supported-devices/
2. Trouver le `Manufacturer` et `Model ID` (ex: `_TZE200_xxxxxx`, `TS0601`)
3. Consulter le fichier converter sur GitHub:
   - https://github.com/Koenkk/zigbee2mqtt/tree/master/src/devices
4. Identifier les DPs dans le code du converter

**Exemple ZG-204ZV:**
```javascript
// De zigbee2mqtt/src/devices/tuya.ts
const device = {
  fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_uli8wasj'}],
  fromZigbee: [tuya.fz.datapoints],
  toZigbee: [tuya.tz.datapoints],
  exposes: [
    e.occupancy(),           // DP 1
    e.battery(),             // DP 2
    e.temperature(),         // DP 4, divide: 10
    e.humidity(),            // DP 5
    e.illuminance_lux()      // DP 9
  ],
  meta: {
    tuyaDatapoints: [
      [1, 'occupancy', tuya.valueConverter.trueFalse1],
      [2, 'battery', tuya.valueConverter.raw],
      [4, 'temperature', tuya.valueConverter.divideBy10],
      [5, 'humidity', tuya.valueConverter.raw],
      [9, 'illuminance_lux', tuya.valueConverter.raw]
    ]
  }
}
```

### Méthode 2: Home Assistant ZHA

**Étapes:**
1. Chercher dans: https://github.com/zigpy/zha-device-handlers
2. Fichier: `zhaquirks/tuya/`
3. Trouver votre manufacturerName

### Méthode 3: Debug Homey (Avancé)

**Activer les logs:**
```javascript
// Dans device.js
_handleTuyaData(data) {
  this.log('🔍 RAW Tuya data:', JSON.stringify(data));
  
  if (data.dataPoints) {
    Object.entries(data.dataPoints).forEach(([dp, value]) => {
      this.log(`DP ${dp}: ${value} (type: ${typeof value})`);
    });
  }
}
```

**Observer les logs:**
- Homey Developer Tools → Apps → Votre App → Logs
- Déclencher une action sur le device
- Noter les DP IDs et valeurs

### Méthode 4: Tuya IoT Platform

**Si vous avez un compte développeur:**
1. https://iot.tuya.com/
2. Cloud → Development → Your Product
3. Section "Standard DPs" ou "Custom DPs"

---

## 📝 Ajouter un Nouveau Device

### Étape 1: Identifier les DPs

Utilisez une des méthodes ci-dessus pour identifier:
- ✅ DP IDs utilisés
- ✅ Type de données (bool, int, enum, string)
- ✅ Transformation nécessaire (÷10, ÷100, etc.)
- ✅ Capabilities Homey correspondantes

### Étape 2: Ajouter à la Database

**Éditer:** `utils/tuya-datapoints-database.js`

```javascript
module.exports = {
  // ... existing code ...
  
  /**
   * NOUVEAU DEVICE TYPE
   */
  NEW_DEVICE_TYPE: {
    1: { 
      name: 'state', 
      type: 'bool', 
      capability: 'onoff' 
    },
    2: { 
      name: 'battery', 
      type: 'value', 
      capability: 'measure_battery' 
    },
    10: { 
      name: 'custom_value', 
      type: 'value', 
      capability: 'measure_custom',
      divide: 100  // Si nécessaire
    }
  }
}
```

### Étape 3: Ajouter Détection Auto

**Éditer:** `utils/tuya-cluster-handler.js`

Dans la fonction `detectDeviceType()`:
```javascript
static detectDeviceType(driverName) {
  const lower = driverName.toLowerCase();
  
  // Ajouter votre pattern
  if (lower.includes('mon_nouveau_device')) return 'NEW_DEVICE_TYPE';
  
  // ... existing patterns ...
  return 'COMMON';
}
```

### Étape 4: Le Device.js utilise automatiquement le handler

```javascript
'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const TuyaClusterHandler = require('../../utils/tuya-cluster-handler');

class MonNouveauDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Mon nouveau device initialized');
    await super.onNodeInit({ zclNode });

    // ✅ C'est tout! Le handler fait le reste
    const deviceType = TuyaClusterHandler.detectDeviceType('mon_nouveau_device');
    await TuyaClusterHandler.init(this, zclNode, deviceType);

    await this.setAvailable();
  }
}

module.exports = MonNouveauDevice;
```

---

## 📊 DPs Communs par Catégorie

### Capteurs (Sensors)
| DP | Fonction | Type | Parsing |
|----|----------|------|---------|
| 1 | État/Alarm | bool | Direct |
| 2 | Batterie | int | Direct (0-100%) |
| 4 | Température | int | ÷ 10 |
| 5 | Humidité | int | Direct (0-100%) |
| 9 | Luminosité | int | Lux direct |
| 13 | Action bouton | enum | 0=single, 1=double, 2=hold |
| 14 | Batterie faible | bool | Direct |

### Switches & Dimmers
| DP | Fonction | Type | Parsing |
|----|----------|------|---------|
| 1 | État L1 | bool | Direct |
| 2 | État L2 | bool | Direct |
| 2 | Brightness (dimmer) | int | ÷ 1000 |
| 9-12 | Countdown 1-4 | int | Secondes |

### RGB Lights
| DP | Fonction | Type | Parsing |
|----|----------|------|---------|
| 1 | État | bool | Direct |
| 2 | Mode | enum | 0=white, 1=color, 2=scene |
| 3 | Brightness | int | ÷ 1000 |
| 5 | Couleur | hex | HHHHSSSSVVVV |

### Thermostats / TRV
| DP | Fonction | Type | Parsing |
|----|----------|------|---------|
| 2 | Température cible | int | ÷ 10 |
| 3 | Température actuelle | int | ÷ 10 |
| 4 | Mode | enum | 0=auto, 1=manual, etc. |
| 7 | Batterie | int | Direct |

---

## 🛠️ Debugging & Troubleshooting

### Activer les Logs Détaillés

**Dans device.js:**
```javascript
async onNodeInit({ zclNode }) {
  // ... initialization ...
  
  // Log cluster info
  const tuyaCluster = zclNode.endpoints[1]?.clusters[61184];
  if (tuyaCluster) {
    this.log('✅ Tuya cluster found!');
    
    // Log tous les events
    tuyaCluster.on('response', (data) => {
      this.log('📥 Tuya response:', JSON.stringify(data));
    });
    
    tuyaCluster.on('reporting', (data) => {
      this.log('📊 Tuya reporting:', JSON.stringify(data));
    });
  }
}
```

### Problèmes Courants

#### 1. Pas de données
**Cause:** DPs non mappés  
**Solution:** Vérifier les logs, identifier les DPs, les ajouter à la database

#### 2. Valeurs incorrectes
**Cause:** Parsing incorrect (ex: température × 10 au lieu de ÷ 10)  
**Solution:** Ajuster le `divide` ou `multiply` dans la database

#### 3. Device non reconnu
**Cause:** Type de device non détecté  
**Solution:** Ajouter pattern dans `detectDeviceType()`

---

## 📚 Références

### Documentation Officielle
- **Tuya IoT:** https://developer.tuya.com/
- **Zigbee Alliance:** https://csa-iot.org/all-solutions/zigbee/

### Projets Communautaires
- **Zigbee2MQTT:** https://www.zigbee2mqtt.io/
  - Devices: https://www.zigbee2mqtt.io/supported-devices/
  - Converters: https://github.com/Koenkk/zigbee2mqtt/tree/master/src/devices
- **ZHA (Home Assistant):** https://github.com/zigpy/zha-device-handlers
- **Homey SDK3:** https://apps-sdk-v3.developer.homey.app/

### Notre Implémentation
- **Database:** `/utils/tuya-datapoints-database.js` (200+ DPs)
- **Handler:** `/utils/tuya-cluster-handler.js` (Système universel)
- **Exemples:** `/drivers/*/device.js` (90+ drivers implémentés)

---

## ✅ Status Actuel

### DPs Implémentés
- ✅ **200+ datapoints** documentés
- ✅ **20+ types** de devices supportés
- ✅ **90+ drivers** utilisant le système
- ✅ **Auto-détection** fonctionnelle

### Coverage
- ✅ Sensors (motion, temp, humidity, CO2, etc.)
- ✅ Switches (1-6 gang)
- ✅ Dimmers & RGB lights
- ✅ Thermostats / TRV
- ✅ Safety devices (smoke, gas, water leak)
- ✅ Buttons & scene controllers
- ✅ Curtains & blinds
- ✅ Locks & valves
- ✅ Sirens

### Prochaines Étapes
1. Ajouter plus de DPs au fur et à mesure des découvertes
2. Améliorer la détection automatique
3. Créer des templates pour nouveaux devices
4. Documentation utilisateur

---

**📝 Ce guide est maintenu à jour avec chaque nouvelle découverte de DPs.**

**💡 Contribuez:** Si vous découvrez de nouveaux DPs, partagez-les!
