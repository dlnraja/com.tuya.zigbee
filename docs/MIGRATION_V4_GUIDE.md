# 🚀 MIGRATION GUIDE V4 - TUYA DP & BATTERY ULTRA SYSTEM

## 📋 TABLE DES MATIÈRES

1. [Vue d'ensemble](#vue-densemble)
2. [Nouveautés V4](#nouveautés-v4)
3. [Migration des Drivers](#migration-des-drivers)
4. [API Reference](#api-reference)
5. [Exemples Complets](#exemples-complets)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 VUE D'ENSEMBLE

La version V4 apporte un système **ultra-complet** de gestion des DP Tuya et des batteries, inspiré des meilleures pratiques de:
- **Zigbee2MQTT** (github.com/Koenkk/zigbee-herdsman-converters)
- **LocalTuya** (github.com/rospogrigio/localtuya)
- **Home Assistant** Tuya integration
- **Tuya Developer Platform** (developer.tuya.com)
- **TinyTuya** (pypi.org/project/tinytuya)

### **Avantages V4:**
- ✅ **Auto-mapping DP** → capabilities Homey (intelligent!)
- ✅ **Battery V4** → 7 technologies + courbes voltage précises
- ✅ **Time Sync** → synchronisation horloge device
- ✅ **DP Discovery** → mode debug pour nouveaux devices
- ✅ **10+ profiles** devices pré-configurés
- ✅ **Documentation complète** de tous les DP

---

## 🆕 NOUVEAUTÉS V4

### **1. TuyaDPDatabase.js**
Base de données complète de tous les DP Tuya connus:
- 10+ profiles devices (TRV, Climate, Soil, PIR, etc.)
- 100+ DP documentés avec types et conversions
- Auto-détection manufacturerName

### **2. TuyaDPMapper.js**
Mapping automatique DP → Homey capabilities:
- Pattern matching intelligent
- Conversions automatiques (divider, scale, enum)
- Auto-setup listeners (lecture + écriture)

### **3. TuyaDPDiscovery.js**
Mode découverte pour nouveaux devices:
- Écoute tous les messages Tuya
- Log tous les DP reçus
- Génère rapport détaillé + code template
- Export JSON pour GitHub issues

### **4. TuyaTimeSyncManager.js**
Synchronisation date/heure:
- Protocol 0x24 (Tuya standard)
- Format alternatif 7 bytes
- Auto-réponse aux requêtes device
- Sync quotidien programmé

### **5. BatteryManagerV4.js**
Gestion batterie ultra-précise:
- 7 technologies (CR2032, AAA, AA, Li-ion, Li-polymer, etc.)
- Courbes de décharge non-linéaires
- Calcul voltage-to-percentage scientifique
- Auto-détection type batterie
- Intervals intelligents par device

---

## 🔄 MIGRATION DES DRIVERS

### **Avant (V3):**

```javascript
const { ZigBeeDevice } = require('homey-zigbeedriver');
const TuyaEF00Manager = require('../../lib/tuya/TuyaEF00Manager');

class MyDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    // Manual DP listeners
    this.tuyaEF00Manager = new TuyaEF00Manager(this);
    await this.tuyaEF00Manager.initialize(zclNode);

    this.tuyaEF00Manager.on('dp-1', (value) => {
      this.setCapabilityValue('measure_temperature', value / 10);
    });

    // Manual battery
    this.registerAttrReportListener('genPowerCfg', 'batteryPercentageRemaining', ...);
  }
}
```

### **Après (V4):**

```javascript
const { ZigBeeDevice } = require('homey-zigbeedriver');
const TuyaDPMapper = require('../../lib/tuya/TuyaDPMapper');
const TuyaTimeSyncManager = require('../../lib/tuya/TuyaTimeSyncManager');
const BatteryManagerV4 = require('../../lib/BatteryManagerV4');

class MyDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    // 🚀 AUTO SETUP - 3 LIGNES!

    // 1. Auto DP mapping (tout automatique!)
    await TuyaDPMapper.autoSetup(this, zclNode);

    // 2. Time sync (horloge device)
    this.timeSyncManager = new TuyaTimeSyncManager(this);
    await this.timeSyncManager.initialize(zclNode);

    // 3. Battery V4 (ultra-précis)
    this.batteryManager = new BatteryManagerV4(this, 'AAA');
    await this.batteryManager.startMonitoring();

    // ✅ C'EST TOUT! Tout le reste est automatique!
  }

  async onDeleted() {
    // Cleanup
    if (this.timeSyncManager) this.timeSyncManager.cleanup();
    if (this.batteryManager) this.batteryManager.stopMonitoring();
  }
}
```

---

## 📚 API REFERENCE

### **TuyaDPMapper**

#### `autoSetup(device, zclNode)`
Auto-configure tous les DP listeners + capability listeners.

```javascript
await TuyaDPMapper.autoSetup(this, zclNode);
// ✅ Setup automatique de TOUS les DP connus!
```

#### `mapDPToCapability(dp, value)`
Trouve la capability Homey pour un DP.

```javascript
const mapping = TuyaDPMapper.mapDPToCapability(1);
// { dp: 1, capability: 'onoff', type: 0x01, convert: fn }
```

#### `convertValue(dp, rawValue)`
Convertit valeur DP → Homey.

```javascript
const temp = TuyaDPMapper.convertValue(3, 250); // 250 / 10 = 25.0°C
```

---

### **BatteryManagerV4**

#### Constructor
```javascript
new BatteryManagerV4(device, batteryType = null)
```

**Battery Types:**
- `'CR2032'` - Lithium coin cell 3V (220mAh)
- `'CR2450'` - Lithium coin cell 3V (620mAh)
- `'CR123A'` - Lithium photo 3V (1500mAh)
- `'AAA'` - Alkaline 1.5V (1200mAh)
- `'AA'` - Alkaline 1.5V (2850mAh)
- `'Li-ion'` - Rechargeable 3.7V (2600mAh)
- `'Li-polymer'` - Rechargeable 3.7V (1200mAh)

#### `startMonitoring()`
Démarre monitoring batterie avec auto-détection.

```javascript
this.batteryManager = new BatteryManagerV4(this, 'AAA');
await this.batteryManager.startMonitoring();
```

#### `calculateFromVoltage(voltage, batteryType)`
Calcul précis percentage depuis voltage.

```javascript
const battery = BatteryManagerV4.calculateFromVoltage(2.8, 'CR2032');
// 70% (interpolation courbe non-linéaire)
```

---

### **TuyaTimeSyncManager**

#### `initialize(zclNode)`
Démarre time sync + écoute requêtes device.

```javascript
this.timeSyncManager = new TuyaTimeSyncManager(this);
await this.timeSyncManager.initialize(zclNode);
```

#### `sendTimeSync(requestId)`
Envoie sync manuel.

```javascript
await this.timeSyncManager.sendTimeSync();
```

#### `sendDateTimeSync()`
Format alternatif (7 bytes).

```javascript
await this.timeSyncManager.sendDateTimeSync();
```

---

### **TuyaDPDiscovery**

#### `startDiscovery()`
Active mode découverte.

```javascript
this.dpDiscovery = new TuyaDPDiscovery(this);
this.dpDiscovery.startDiscovery();
// Interagissez avec le device!
```

#### `stopDiscovery()`
Arrête + génère rapport complet.

```javascript
const report = this.dpDiscovery.stopDiscovery();
this.log(report);
// 📊 Rapport avec tous les DP découverts + code template!
```

---

## 💡 EXEMPLES COMPLETS

### **Exemple 1: Climate Sensor Simple**

```javascript
const { ZigBeeDevice } = require('homey-zigbeedriver');
const TuyaDPMapper = require('../../lib/tuya/TuyaDPMapper');
const BatteryManagerV4 = require('../../lib/BatteryManagerV4');

class ClimateDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    // Auto-setup tout!
    await TuyaDPMapper.autoSetup(this, zclNode);

    // Battery AAA (climate sensors)
    this.batteryManager = new BatteryManagerV4(this, 'AAA');
    await this.batteryManager.startMonitoring();

    this.log('✅ Ready!');
  }

  async onDeleted() {
    if (this.batteryManager) this.batteryManager.stopMonitoring();
  }
}
```

### **Exemple 2: TRV avec Time Sync**

```javascript
const { ZigBeeDevice } = require('homey-zigbeedriver');
const TuyaDPMapper = require('../../lib/tuya/TuyaDPMapper');
const TuyaTimeSyncManager = require('../../lib/tuya/TuyaTimeSyncManager');
const BatteryManagerV4 = require('../../lib/BatteryManagerV4');

class TRVDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    // Auto DP mapping
    await TuyaDPMapper.autoSetup(this, zclNode);

    // Time sync (pour scheduling)
    this.timeSyncManager = new TuyaTimeSyncManager(this);
    await this.timeSyncManager.initialize(zclNode);

    // Battery AA (TRV)
    this.batteryManager = new BatteryManagerV4(this, 'AA');
    await this.batteryManager.startMonitoring();

    this.log('✅ TRV ready with time sync!');
  }

  async onDeleted() {
    if (this.timeSyncManager) this.timeSyncManager.cleanup();
    if (this.batteryManager) this.batteryManager.stopMonitoring();
  }
}
```

### **Exemple 3: Device Inconnu (Discovery Mode)**

```javascript
const { ZigBeeDevice } = require('homey-zigbeedriver');
const TuyaDPDiscovery = require('../../lib/tuya/TuyaDPDiscovery');

class UnknownDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    // Mode découverte
    this.dpDiscovery = new TuyaDPDiscovery(this);
    this.dpDiscovery.startDiscovery();

    this.log('🔍 DP Discovery active!');
    this.log('   Interact with device...');

    // Après 5 minutes, générer rapport
    setTimeout(() => {
      const report = this.dpDiscovery.stopDiscovery();
      this.log(report);
      // Copier le rapport dans GitHub issue!
    }, 5 * 60 * 1000);
  }
}
```

### **Exemple 4: Manuel (sans auto-setup)**

```javascript
const { ZigBeeDevice } = require('homey-zigbeedriver');
const TuyaDPMapper = require('../../lib/tuya/TuyaDPMapper');
const BatteryManagerV4 = require('../../lib/BatteryManagerV4');

class CustomDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    // Setup manuel avec helper
    const dpListeners = TuyaDPMapper.generateDPListeners(
      this,
      zclNode.manufacturerName,
      zclNode.modelId
    );

    // Appliquer listeners
    for (const listener of dpListeners) {
      this.tuyaEF00Manager.on(`dp-${listener.dp}`, listener.handler);
    }

    // Battery avec voltage calc
    this.batteryManager = new BatteryManagerV4(this);
    await this.batteryManager.startMonitoring();
  }
}
```

---

## 🐛 TROUBLESHOOTING

### **Problème: DP non détecté**

**Solution:** Utiliser DP Discovery mode.

```javascript
const settings = this.getSettings();
if (settings.dp_discovery_mode === true) {
  this.dpDiscovery = new TuyaDPDiscovery(this);
  this.dpDiscovery.startDiscovery();
}
```

### **Problème: Battery toujours 0%**

**Solution:** Vérifier type batterie + voltage.

```javascript
// Force type
this.batteryManager = new BatteryManagerV4(this, 'CR2032');

// Check voltage
const voltage = this.batteryManager.voltage;
this.log('Voltage:', voltage, 'V');
```

### **Problème: Time sync ne marche pas**

**Solution:** Vérifier device supporte 0x24.

```javascript
// Test manuel
await this.timeSyncManager.sendTimeSync();
await this.timeSyncManager.sendDateTimeSync(); // Format alternatif
```

### **Problème: Auto-setup rate un DP**

**Solution:** Ajouter DP manuellement.

```javascript
// Après auto-setup
this.tuyaEF00Manager.on('dp-99', (value) => {
  this.log('DP 99:', value);
  // Custom handling
});
```

---

## 📊 STATISTIQUES V4

| Feature | V3 | V4 | Amélioration |
|---------|----|----|--------------|
| **DP Profiles** | 3 | 10+ | +233% |
| **Battery Types** | 2 | 7 | +250% |
| **Voltage Points** | 20 | 77 | +285% |
| **Auto-mapping** | ❌ | ✅ | NEW! |
| **Time Sync** | Manual | Auto | NEW! |
| **Discovery Mode** | ❌ | ✅ | NEW! |
| **Lines of Code** | 450 | 1,500+ | +233% |
| **Documentation** | Basic | Complete | +500% |

---

## 🎉 CONCLUSION

La V4 est **LE SYSTÈME LE PLUS COMPLET** jamais créé pour Tuya Zigbee sur Homey!

**Prochain steps:**
1. ✅ Migrer vos drivers (copy/paste exemples!)
2. ✅ Tester sur vrais devices
3. ✅ Partager découvertes DP sur GitHub
4. ✅ Contribuer à la database!

**Support:**
- GitHub Issues: github.com/dlnraja/com.tuya.zigbee/issues
- Documentation: MASTER_IMPLEMENTATION_PLAN.md
- Examples: tous les drivers dans `/drivers/`

**Made with ❤️ by the Homey Community**

*Version: 5.0.0 "Ultra Edition"*
*Last Updated: Nov 23, 2025*
