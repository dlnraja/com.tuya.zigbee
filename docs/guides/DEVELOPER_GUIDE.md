# 👨‍💻 Developer Guide: Universal Tuya Zigbee App

## 🎯 Architecture Overview

Cette application résout le problème des **Data Points (DPs) propriétaires Tuya** via un système universel.

### Le Défi Tuya

**Problème:** Tuya utilise le cluster custom `0xEF00` (61184) au lieu des clusters Zigbee standard.

```
❌ Standard Zigbee:  genPowerCfg.batteryPercentageRemaining
✅ Tuya Custom:      Cluster 0xEF00, DP ID 2 = battery
```

**Notre Solution:** Système universel qui mappe automatiquement les DPs Tuya vers les capabilities Homey.

---

## 🏗️ Structure du Projet

```
tuya_repair/
├── utils/
│   ├── tuya-datapoints-database.js   # 200+ DPs mappés
│   └── tuya-cluster-handler.js       # Handler universel
├── drivers/
│   └── */device.js                   # Utilise TuyaClusterHandler
├── scripts/
│   ├── analysis/                     # Analyse & recherche
│   ├── automation/                   # Scripts auto
│   ├── fixes/                        # Corrections auto
│   ├── generation/                   # Génération images
│   └── verification/                 # Validation
├── docs/
│   ├── TUYA_DATAPOINTS_GUIDE.md     # Guide DPs complet
│   └── DEVELOPER_README.md           # Ce fichier
└── reports/                          # Rapports d'analyse
```

---

## 🚀 Quick Start

### 1. Ajouter un Nouveau Driver

**Créer:** `drivers/mon_device/device.js`

```javascript
'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const TuyaClusterHandler = require('../../utils/tuya-cluster-handler');

class MonDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Mon device initialized');
    await super.onNodeInit({ zclNode });

    // Le handler fait tout automatiquement!
    const deviceType = TuyaClusterHandler.detectDeviceType('mon_device');
    await TuyaClusterHandler.init(this, zclNode, deviceType);

    await this.setAvailable();
  }

  async onDeleted() {
    this.log('Mon device deleted');
  }
}

module.exports = MonDevice;
```

### 2. Ajouter les DPs dans la Database

**Éditer:** `utils/tuya-datapoints-database.js`

```javascript
MON_DEVICE_TYPE: {
  1: { name: 'state', type: 'bool', capability: 'onoff' },
  2: { name: 'battery', type: 'value', capability: 'measure_battery' },
  4: { name: 'temperature', type: 'value', capability: 'measure_temperature', divide: 10 }
}
```

### 3. Ajouter la Détection Auto

**Éditer:** `utils/tuya-cluster-handler.js`

```javascript
static detectDeviceType(driverName) {
  const lower = driverName.toLowerCase();
  
  if (lower.includes('mon_pattern')) return 'MON_DEVICE_TYPE';
  // ... existing code ...
}
```

---

## 🔧 Scripts Utiles

### Analyse

```bash
# Identifier tous les drivers Tuya
node scripts/fixes/FIX_ALL_TUYA_CLUSTER_DRIVERS.js

# Analyser le forum
node scripts/analysis/DEEP_FORUM_ANALYSIS.js

# Rechercher nouveaux devices
node scripts/analysis/DEEP_SEARCH_AND_ENRICHMENT.js
```

### Corrections Auto

```bash
# Fixer tous les devices Tuya
node scripts/fixes/AUTO_FIX_ALL_TUYA_DEVICES.js

# Enrichir les capabilities
node scripts/fixes/AUTO_ENRICH_ALL_CAPABILITIES.js

# Corriger les paths images
node scripts/fixes/FIX_DRIVER_IMAGE_PATHS.js
```

### Génération

```bash
# Générer toutes les images
node scripts/generation/GENERATE_DRIVER_ICONS_V2.js

# Générer les icons manquantes
node scripts/generation/GENERATE_MISSING_ICONS.js
```

### Validation

```bash
# Validation complète pre-publish
node scripts/verification/COMPLETE_PRE_PUBLISH_VALIDATION.js

# Vérifier cohérence images
node scripts/analysis/VERIFY_IMAGES_COHERENCE.js
```

### Synchronisation

```bash
# Sync drivers vers app.json
node scripts/automation/AUTO_SYNC_DRIVERS_TO_APP_JSON.js
```

---

## 📊 Systèmes Implémentés

### 1. Tuya Universal System ⭐⭐⭐

**Fichiers:**
- `utils/tuya-datapoints-database.js`
- `utils/tuya-cluster-handler.js`

**Fonctionnalités:**
- ✅ 200+ DPs mappés
- ✅ 20+ types de devices
- ✅ Auto-détection
- ✅ Parsing intelligent
- ✅ Support enum, bool, int, hex

**Status:** DEPLOYED sur 90+ drivers

### 2. Auto-Enrichment System

**Fichiers:**
- `scripts/fixes/AUTO_ENRICH_ALL_CAPABILITIES.js`
- `scripts/analysis/ENRICH_ALL_MANUFACTURERS.js`

**Fonctionnalités:**
- ✅ Détection type de device
- ✅ Ajout capabilities manquantes
- ✅ Enrichissement manufacturerNames
- ✅ Rules-based logic

**Status:** 23 drivers enrichis

### 3. Image Generation System

**Fichiers:**
- `scripts/generation/GENERATE_DRIVER_ICONS_V2.js`
- `scripts/generation/GENERATE_CUSTOM_ICONS.js`

**Fonctionnalités:**
- ✅ Icons device-specific
- ✅ Rounded corners
- ✅ Color coding par catégorie
- ✅ Multi-gang visualization
- ✅ Power badges

**Status:** 498 images générées

### 4. Validation System

**Fichiers:**
- `scripts/verification/COMPLETE_PRE_PUBLISH_VALIDATION.js`

**Fonctionnalités:**
- ✅ Validation structure drivers
- ✅ Check manifests
- ✅ Verify capabilities
- ✅ Validate Zigbee endpoints
- ✅ Check images
- ✅ Homey app validate

**Status:** Health Score 100%

---

## 🐛 Debugging

### Activer Logs Tuya

```javascript
async onNodeInit({ zclNode }) {
  // ... init code ...
  
  const tuyaCluster = zclNode.endpoints[1]?.clusters[61184];
  if (tuyaCluster) {
    tuyaCluster.on('response', (data) => {
      this.log('📥 RAW:', JSON.stringify(data));
    });
    
    tuyaCluster.on('reporting', (data) => {
      this.log('📊 REPORT:', JSON.stringify(data));
      if (data.dataPoints) {
        Object.entries(data.dataPoints).forEach(([dp, value]) => {
          this.log(`  DP ${dp}: ${value} (${typeof value})`);
        });
      }
    });
  }
}
```

### Trouver les DPs d'un Device

**Méthode 1: Zigbee2MQTT**
1. https://www.zigbee2mqtt.io/supported-devices/
2. Chercher manufacturerName ou modelID
3. Voir le converter sur GitHub

**Méthode 2: Logs Homey**
1. Activer logs (code ci-dessus)
2. Observer les DPs dans les logs
3. Déclencher actions sur le device

**Méthode 3: ZHA Device Handlers**
1. https://github.com/zigpy/zha-device-handlers
2. Chercher dans `zhaquirks/tuya/`

---

## 📝 Conventions de Code

### Nommage

```javascript
// Drivers: snake_case
drivers/motion_sensor_battery/

// Classes: PascalCase
class MotionSensorBatteryDevice extends ZigBeeDevice

// Functions: camelCase
async onNodeInit({ zclNode })

// Constants: UPPER_SNAKE_CASE
const TUYA_CLUSTER = 61184;
```

### Structure device.js

```javascript
'use strict';

// 1. Imports
const { ZigBeeDevice } = require('homey-zigbeedriver');
const TuyaClusterHandler = require('../../utils/tuya-cluster-handler');

// 2. Class
class DeviceClass extends ZigBeeDevice {

  // 3. onNodeInit (required)
  async onNodeInit({ zclNode }) {
    this.log('Device initialized');
    await super.onNodeInit({ zclNode });
    
    // Tuya handler
    const deviceType = TuyaClusterHandler.detectDeviceType('driver_id');
    await TuyaClusterHandler.init(this, zclNode, deviceType);
    
    await this.setAvailable();
  }

  // 4. onDeleted (optional)
  async onDeleted() {
    this.log('Device deleted');
  }
}

// 5. Export
module.exports = DeviceClass;
```

---

## 🧪 Testing

### Test Local

```bash
# Install dependencies
npm install

# Validate
homey app validate --level publish

# Run local
homey app run
```

### Test avec Device Réel

1. Pair le device via Homey app
2. Observer les logs dans Homey Developer Tools
3. Vérifier que les données arrivent
4. Tester toutes les capabilities

---

## 📚 Ressources

### Documentation
- **Homey SDK3:** https://apps-sdk-v3.developer.homey.app/
- **Zigbee2MQTT:** https://www.zigbee2mqtt.io/
- **Tuya IoT:** https://developer.tuya.com/

### Nos Docs
- **Guide DPs:** `/docs/TUYA_DATAPOINTS_GUIDE.md`
- **Database:** `/utils/tuya-datapoints-database.js`
- **Handler:** `/utils/tuya-cluster-handler.js`

### Rapports
- `/reports/TUYA_CLUSTER_DRIVERS_REPORT.json`
- `/reports/DEEP_FORUM_ANALYSIS.json`
- `/reports/PRE_PUBLISH_VALIDATION.json`

---

## 🤝 Contributing

### Ajouter un Nouveau DP

1. Identifier le DP (via logs ou Zigbee2MQTT)
2. Ajouter dans `tuya-datapoints-database.js`
3. Tester avec device réel
4. Commit avec message descriptif

### Corriger un Bug

1. Créer un rapport dans `/reports/`
2. Identifier la cause root
3. Créer un fix
4. Tester
5. Documenter dans commit message

---

## ✅ Checklist Pre-Publish

- [ ] Tous les devices testés
- [ ] Logs propres (pas d'erreurs)
- [ ] `homey app validate --level publish` → PASS
- [ ] Images présentes (small.png, large.png)
- [ ] app.json synchronisé
- [ ] Capabilities cohérentes
- [ ] Endpoints Zigbee définis
- [ ] Documentation à jour

---

## 📈 Stats Actuelles

- **166 drivers** total
- **90 drivers** avec Tuya cluster support
- **23 drivers** enrichis récemment
- **200+ DPs** documentés
- **498 images** générées
- **Health Score:** 100%

---

**🎉 Bienvenue dans l'équipe! Questions? Check les docs ou les rapports!**
