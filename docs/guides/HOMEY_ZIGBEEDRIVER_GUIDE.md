# 📚 GUIDE COMPLET - Homey ZigbeeDriver

**Source:** https://athombv.github.io/node-homey-zigbeedriver/  
**Version:** 2.0.0+  
**Date:** 12 Octobre 2025

---

## 🎯 INTRODUCTION

Homey ZigbeeDriver est le module officiel pour créer des drivers Zigbee dans Homey Apps SDK v3.

### Modules Liés
- **homey-zigbeedriver** - Drivers Zigbee (NOTRE CAS)
- **zigbee-clusters** - Clusters Zigbee avancés
- **homey-zwavedriver** - Drivers Z-Wave
- **homey-rfdriver** - Drivers RF

---

## 📦 INSTALLATION

```bash
npm install homey-zigbeedriver
npm install zigbee-clusters
```

**Notre package.json:**
```json
{
  "dependencies": {
    "homey-zigbeedriver": "^2.0.0",
    "zigbee-clusters": "^7.0.0"
  }
}
```

---

## 🔑 REQUIREMENTS

- ✅ **Homey Apps SDK v3** (obligatoire)
- ✅ **Node.js** 18+
- ✅ **homey-zigbeedriver** 2.0.0+
- ✅ **zigbee-clusters** 7.0.0+

---

## 📖 CLASSES PRINCIPALES

### 1. ZigBeeDevice (Base)

**Pour la plupart des devices:**
```javascript
const { ZigBeeDevice } = require('homey-zigbeedriver');

class MyDevice extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    // Initialization code
  }
}

module.exports = MyDevice;
```

### 2. ZigBeeLightDevice (Lights)

**Pour les lights/bulbs:**
```javascript
const { ZigBeeLightDevice } = require('homey-zigbeedriver');

class MyLightDevice extends ZigBeeLightDevice {
  
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    // Additional light-specific code
  }
}

module.exports = MyLightDevice;
```

**Avantages ZigBeeLightDevice:**
- ✅ Détection automatique hue/saturation ou XY
- ✅ Gestion dim, color_temperature, rgb
- ✅ Transitions automatiques
- ✅ Capabilities pré-configurées

---

## 🔄 MIGRATIONS SDK v2 → v3

### Changements Critiques

#### 1. Classe de Base
```javascript
// ❌ ANCIEN (SDK v2)
const { MeshDevice } = require('homey-meshdriver');
class MyDevice extends MeshDevice {
  async onMeshInit() { }
}

// ✅ NOUVEAU (SDK v3)
const { ZigBeeDevice } = require('homey-zigbeedriver');
class MyDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) { }
}
```

#### 2. Cluster References
```javascript
// ❌ ANCIEN (string)
this.registerCapabilityListener('onoff', async (value) => {
  await this.node.endpoints[1].clusters['genOnOff'].setOn();
});

// ✅ NOUVEAU (object)
const { CLUSTER } = require('zigbee-clusters');

this.registerCapabilityListener('onoff', async (value) => {
  await this.zclNode.endpoints[1].clusters[CLUSTER.ON_OFF.NAME].setOn();
});
```

#### 3. Online Events
```javascript
// ❌ ANCIEN
this.node.on('online', () => {
  this.log('Device is online');
});

// ✅ NOUVEAU
this.onEndDeviceAnnounce = () => {
  this.log('Device announced');
};
```

#### 4. Report Listeners
```javascript
// ❌ ANCIEN
this.registerAttrReportListener('genOnOff', 'onOff', (value) => {
  this.setCapabilityValue('onoff', value === 1);
});

// ✅ NOUVEAU
this.registerCapability('onoff', CLUSTER.ON_OFF);
// ou
await this.configureAttributeReporting([{
  endpointId: 1,
  cluster: CLUSTER.ON_OFF,
  attributeName: 'onOff',
  minInterval: 0,
  maxInterval: 300,
  minChange: 1
}]);
```

#### 5. Dim Duration
```javascript
// ❌ ANCIEN
const duration = this.calculateZigbeeDimDuration(transitionTime);

// ✅ NOUVEAU
const duration = this.calculateLevelControlTransitionTime(transitionTime);
```

---

## 🎯 EXEMPLES PRATIQUES

### Exemple 1: Simple On/Off Switch

```javascript
'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class OnOffSwitch extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.printNode();
    
    // Register onoff capability
    this.registerCapability('onoff', CLUSTER.ON_OFF, {
      endpoint: 1
    });
  }
}

module.exports = OnOffSwitch;
```

### Exemple 2: Dimmable Light

```javascript
'use strict';

const { ZigBeeLightDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class DimmableLight extends ZigBeeLightDevice {
  
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    
    this.printNode();
    
    // onoff and dim are handled by ZigBeeLightDevice
  }
}

module.exports = DimmableLight;
```

### Exemple 3: RGB+CCT Light

```javascript
'use strict';

const { ZigBeeLightDevice } = require('homey-zigbeedriver');

class RGBLight extends ZigBeeLightDevice {
  
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    
    this.printNode();
    
    // Auto-detects:
    // - onoff (cluster 0x0006)
    // - dim (cluster 0x0008)
    // - light_hue/light_saturation or light_mode (cluster 0x0300)
    // - light_temperature (cluster 0x0300)
  }
}

module.exports = RGBLight;
```

### Exemple 4: Temperature Sensor

```javascript
'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class TemperatureSensor extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.printNode();
    
    // Register temperature capability
    this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT, {
      get: 'measuredValue',
      getOpts: {
        getOnStart: true,
      },
      report: 'measuredValue',
      reportOpts: {
        configureAttributeReporting: {
          minInterval: 60,
          maxInterval: 3600,
          minChange: 100, // 1°C = 100 (value is in 0.01°C)
        },
      },
      reportParser(value) {
        return value / 100; // Convert to °C
      },
    });
  }
}

module.exports = TemperatureSensor;
```

### Exemple 5: Motion Sensor (IAS Zone)

```javascript
'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class MotionSensor extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.printNode();
    
    // IAS Zone for motion
    if (this.hasCapability('alarm_motion')) {
      zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME]
        .on('zoneStatusChangeNotification', (payload) => {
          this.onIASZoneStatusChangeNotification(payload);
        });
    }
    
    // Battery
    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION);
  }
  
  onIASZoneStatusChangeNotification({ zoneStatus, extendedStatus, zoneId, delay }) {
    this.log('IAS Zone status change:', zoneStatus, extendedStatus, zoneId, delay);
    
    const alarm = zoneStatus.alarm1;
    this.setCapabilityValue('alarm_motion', alarm).catch(this.error);
  }
}

module.exports = MotionSensor;
```

---

## 🔧 MÉTHODES IMPORTANTES

### Configuration Reporting

```javascript
await this.configureAttributeReporting([
  {
    endpointId: 1,
    cluster: CLUSTER.POWER_CONFIGURATION,
    attributeName: 'batteryPercentageRemaining',
    minInterval: 3600,
    maxInterval: 60000,
    minChange: 1,
  },
  {
    endpointId: 1,
    cluster: CLUSTER.TEMPERATURE_MEASUREMENT,
    attributeName: 'measuredValue',
    minInterval: 60,
    maxInterval: 3600,
    minChange: 100,
  },
]);
```

### Read Attributes

```javascript
const value = await this.zclNode.endpoints[1].clusters[CLUSTER.ON_OFF.NAME]
  .readAttributes(['onOff']);

this.log('Current state:', value.onOff);
```

### Write Attributes

```javascript
await this.zclNode.endpoints[1].clusters[CLUSTER.LEVEL_CONTROL.NAME]
  .writeAttributes({
    currentLevel: 128, // 50%
  });
```

### Bind Cluster

```javascript
await this.zclNode.endpoints[1].clusters[CLUSTER.ON_OFF.NAME].bind();
```

---

## 📋 CLUSTERS COMMUNS

```javascript
const { CLUSTER } = require('zigbee-clusters');

// Basic
CLUSTER.BASIC                        // 0x0000
CLUSTER.POWER_CONFIGURATION          // 0x0001
CLUSTER.IDENTIFY                     // 0x0003

// Control
CLUSTER.ON_OFF                       // 0x0006
CLUSTER.LEVEL_CONTROL                // 0x0008
CLUSTER.COLOR_CONTROL                // 0x0300

// Sensors
CLUSTER.TEMPERATURE_MEASUREMENT      // 0x0402
CLUSTER.RELATIVE_HUMIDITY            // 0x0405
CLUSTER.OCCUPANCY_SENSING            // 0x0406
CLUSTER.ILLUMINANCE_MEASUREMENT      // 0x0400
CLUSTER.IAS_ZONE                     // 0x0500

// Others
CLUSTER.WINDOW_COVERING              // 0x0102 (curtains)
CLUSTER.THERMOSTAT                   // 0x0201
CLUSTER.DOOR_LOCK                    // 0x0101
```

---

## ✅ BONNES PRATIQUES

### 1. Toujours utiliser printNode()
```javascript
async onNodeInit({ zclNode }) {
  this.printNode(); // Affiche structure complète
}
```

### 2. Error Handling
```javascript
async onNodeInit({ zclNode }) {
  try {
    await this.configureAttributeReporting([...]);
  } catch (error) {
    this.error('Failed to configure reporting:', error);
  }
}
```

### 3. Capabilities Options
```javascript
this.registerCapability('onoff', CLUSTER.ON_OFF, {
  endpoint: 1,
  get: 'onOff',
  getOpts: {
    getOnStart: true,
    getOnOnline: true,
  },
  set: 'setOn',
  setParser(value) {
    return value ? 'setOn' : 'setOff';
  },
});
```

### 4. Multiple Endpoints
```javascript
// Endpoint 1 pour switch 1
this.registerCapability('onoff.1', CLUSTER.ON_OFF, {
  endpoint: 1
});

// Endpoint 2 pour switch 2
this.registerCapability('onoff.2', CLUSTER.ON_OFF, {
  endpoint: 2
});
```

---

## 🚀 POUR NOTRE APP

### Structure Actuelle
```
drivers/
├── motion_sensor_battery/
│   └── device.js (extend ZigBeeDevice)
├── smart_bulb_rgb_ac/
│   └── device.js (extend ZigBeeLightDevice)
└── ...
```

### Améliorations Possibles

#### 1. Base Class Commune
```javascript
// lib/TuyaZigbeeDevice.js
const { ZigBeeDevice } = require('homey-zigbeedriver');

class TuyaZigbeeDevice extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.printNode();
    
    // Common Tuya setup
    await this.setupTuyaDevice();
  }
  
  async setupTuyaDevice() {
    // Common configuration
  }
}

module.exports = TuyaZigbeeDevice;
```

#### 2. Utiliser dans Drivers
```javascript
// drivers/motion_sensor_battery/device.js
const TuyaZigbeeDevice = require('../../lib/TuyaZigbeeDevice');
const { CLUSTER } = require('zigbee-clusters');

class MotionSensor extends TuyaZigbeeDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    
    // Device-specific setup
  }
}
```

---

## 📚 RESSOURCES

- **Documentation:** https://athombv.github.io/node-homey-zigbeedriver/
- **Examples:** https://github.com/athombv/node-homey-zigbeedriver/tree/master/examples
- **Zigbee Clusters:** https://github.com/athombv/node-zigbee-clusters
- **Homey SDK v3:** https://apps-sdk-v3.developer.homey.app/

---

## ✅ CHECKLIST MIGRATION

Pour chaque driver:
- [ ] Remplacer `MeshDevice` → `ZigBeeDevice`
- [ ] Remplacer `onMeshInit()` → `onNodeInit({ zclNode })`
- [ ] Importer `{ CLUSTER }` depuis `zigbee-clusters`
- [ ] Mettre à jour références clusters (string → object)
- [ ] Remplacer `registerAttrReportListener` → `configureAttributeReporting`
- [ ] Remplacer `this.node` → `this.zclNode`
- [ ] Tester pairing et fonctionnalités
- [ ] Valider avec `homey app validate`

---

**Status:** 📚 **GUIDE COMPLET** - Prêt pour amélioration drivers v2.12.0
