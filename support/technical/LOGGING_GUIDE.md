# 📚 GUIDE DE LOGGING - HOMEY SDK v3

Guide complet pour utiliser le système de logging professionnel basé sur la documentation officielle Homey SDK v3.

---

## 🎯 CONCEPTS CLÉS (SDK v3)

### Méthodes de Base Device
Selon la documentation officielle:
- `this.log()` - Log général
- `this.error()` - Log d'erreur
- `getName()` - Nom du device
- `getCapabilities()` - Liste des capabilities
- `getSettings()` - Settings du device
- `getState()` - État actuel (capability values)

### ZigBeeNode Properties (SDK v3)
- `ieeeAddress` - Adresse IEEE unique (disponible depuis Homey v12.3.0)
- `manufacturerName` - Nom du fabricant
- `productId` - ID du produit
- `endpoints` - Map des endpoints disponibles

---

## 🚀 UTILISATION

### 1. Initialisation dans un Driver

```javascript
'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const Logger = require('../../lib/Logger');
const ZigbeeDebug = require('../../lib/ZigbeeDebug');

class MyDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    // Initialiser le logger
    this.logger = new Logger(this);
    this.logger.deviceInit();
    
    // Initialiser le debugger Zigbee
    this.zigbeeDebug = new ZigbeeDebug(this, this.logger);
    
    // Log node info
    this.logger.zigbeeNode(zclNode);
    this.logger.zigbeeEndpoints(zclNode);
    
    // Diagnostic complet si debug activé
    const debugEnabled = this.getSetting('debug_logging');
    if (debugEnabled) {
      await this.zigbeeDebug.fullDiagnostic(zclNode);
    }
    
    // Register capabilities
    await this.registerCapabilities(zclNode);
    
    this.logger.deviceReady();
  }
}
```

### 2. Logs de Capabilities

```javascript
// Register capability listener
this.registerCapabilityListener('onoff', async (value, opts) => {
  this.logger.capabilityListener('onoff', value, opts);
  
  const timer = this.logger.startTimer('onoff command');
  
  try {
    await endpoint.clusters.onOff.toggle();
    this.logger.zigbeeCommand('onOff', 'toggle');
    
    timer.end(); // Log: "onoff command took 45ms"
    
  } catch (err) {
    this.logger.exception('Failed to toggle onoff', err);
    throw err;
  }
});

// Capability change report
this.registerAttrReportListener('onOff', 'onOff', (value) => {
  this.logger.zigbeeReadAttribute('onOff', 'onOff', value);
  this.setCapabilityValue('onoff', value === 1).catch(this.error);
}, 1);
```

### 3. Logs Zigbee Clusters

```javascript
// Lecture d'attribut
async getBatteryLevel() {
  this.logger.debug('Reading battery level...');
  
  try {
    const { batteryPercentageRemaining } = await endpoint.clusters.powerConfiguration
      .readAttributes('batteryPercentageRemaining');
    
    this.logger.zigbeeReadAttribute(
      'powerConfiguration', 
      'batteryPercentageRemaining', 
      batteryPercentageRemaining
    );
    
    const percentage = Math.min(100, Math.round(batteryPercentageRemaining / 2));
    return percentage;
    
  } catch (err) {
    this.logger.exception('Failed to read battery', err);
    return null;
  }
}

// Écriture d'attribut
async enrollIASZone(endpoint, ieeeAddress) {
  this.logger.debug('Enrolling IAS Zone...');
  
  try {
    await endpoint.clusters.iasZone.writeAttributes({
      iasCieAddress: ieeeAddress,
      zoneType: 13 // Motion sensor
    });
    
    this.logger.zigbeeWriteAttribute('iasZone', 'iasCieAddress', ieeeAddress);
    this.logger.zigbeeWriteAttribute('iasZone', 'zoneType', 13);
    this.logger.info('✅ IAS Zone enrolled successfully');
    
  } catch (err) {
    this.logger.exception('IAS Zone enrollment failed', err);
    throw err;
  }
}

// Report listener
endpoint.clusters.temperatureMeasurement.on('attr.measuredValue', (value) => {
  this.logger.zigbeeReport('temperatureMeasurement', { measuredValue: value });
  
  const temperature = Math.round(value / 100 * 10) / 10;
  this.setCapabilityValue('measure_temperature', temperature).catch(this.error);
});
```

### 4. Settings Change

```javascript
async onSettings({ oldSettings, newSettings, changedKeys }) {
  this.logger.settingsChange(changedKeys, oldSettings, newSettings);
  
  // Le logger met automatiquement à jour son niveau si debug_logging change
  
  if (changedKeys.includes('motion_sensitivity')) {
    try {
      await this.updateMotionSensitivity(newSettings.motion_sensitivity);
      this.logger.info(`Motion sensitivity updated to ${newSettings.motion_sensitivity}`);
    } catch (err) {
      this.logger.exception('Failed to update sensitivity', err);
      throw new Error('Failed to update sensitivity');
    }
  }
}
```

### 5. Device Lifecycle

```javascript
class MyDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.logger = new Logger(this);
    this.logger.deviceInit(); // ℹ️ Device initialized
    
    // ... setup ...
    
    await this.setAvailable();
    this.logger.deviceAvailable(); // ℹ️ Device available
  }
  
  async onAdded() {
    this.logger.info('Device added to Homey');
  }
  
  async onDeleted() {
    this.logger.deviceDeleted(); // ℹ️ Device deleted
  }
  
  async onUninit() {
    this.logger.info('Device uninitializing...');
  }
}
```

---

## 📊 NIVEAUX DE LOG

### ERROR (toujours visible)
```javascript
this.logger.error('Critical error occurred', { code: 500 });
this.logger.exception('Operation failed', error);
```
**Output**:
```
❌ [12:34:56] [motion_sensor] ❌ Critical error occurred
{
  "code": 500
}
```

### WARN (toujours visible)
```javascript
this.logger.warn('Device offline, retrying...', { attempt: 3 });
this.logger.deviceUnavailable('Connection timeout');
```

### INFO (toujours visible)
```javascript
this.logger.info('Temperature updated', { value: 22.5 });
this.logger.capabilityChange('measure_temperature', 22.5);
```

### DEBUG (si debug_logging = true)
```javascript
this.logger.debug('Processing command...', { command: 'toggle' });
this.logger.zigbeeCommand('onOff', 'toggle', {});
this.logger.capabilityListener('onoff', true, {});
```

### TRACE (si debug_logging = true)
```javascript
this.logger.trace('Raw data received', { hex: '0x1234' });
this.logger.zigbeeReadAttribute('basic', 'modelId', 'TS0601');
```

---

## 🔬 DIAGNOSTIC ZIGBEE

### Diagnostic Complet
```javascript
async onNodeInit({ zclNode }) {
  this.logger = new Logger(this);
  this.zigbeeDebug = new ZigbeeDebug(this, this.logger);
  
  // Diagnostic complet (si debug activé)
  if (this.getSetting('debug_logging')) {
    await this.zigbeeDebug.fullDiagnostic(zclNode);
  }
}
```

**Output**:
```
🔬 Starting full Zigbee diagnostic...
📡 ZigBee Node Information
{
  "ieeeAddress": "00:12:4b:00:1c:6f:2e:7a",
  "manufacturerName": "Tuya",
  "productId": "TS0601",
  "endpoints": ["1"]
}
📡 ZigBee Endpoints
{
  "1": {
    "clusters": ["basic", "powerConfiguration", "onOff"],
    "deviceId": 81,
    "profileId": 260
  }
}
⚙️ Endpoint 1 Clusters
{
  "basic": {
    "name": "basic",
    "attributes": ["manufacturerName", "modelId"],
    "commands": ["resetToFactoryDefaults"]
  }
}
✅ Diagnostic complete
```

### Dump Complet
```javascript
// Pour support/debugging
const dump = await this.zigbeeDebug.dumpDevice(zclNode);
// Dump contient TOUT: device info, zigbee info, clusters, attributes
```

---

## ⚡ PERFORMANCE MONITORING

```javascript
async syncWithDevice() {
  const timer = this.logger.startTimer('Device sync');
  
  try {
    await this.readAllAttributes();
    await this.updateCapabilities();
    
    timer.end(); // Automatiquement log: "Device sync took 234ms"
    
  } catch (err) {
    timer.end();
    this.logger.exception('Sync failed', err);
  }
}
```

---

## 🎛️ SETTINGS

Ajouter dans `driver.compose.json`:

```json
{
  "settings": [
    {
      "id": "debug_logging",
      "type": "checkbox",
      "title": {
        "en": "Enable debug logging"
      },
      "hint": {
        "en": "Enable detailed logging for troubleshooting (increases log size)"
      },
      "value": false
    }
  ]
}
```

Le logger détecte automatiquement le changement et ajuste son niveau!

---

## 📋 EXEMPLES COMPLETS

### Exemple 1: Motion Sensor avec IAS Zone

```javascript
const { ZigBeeDevice } = require('homey-zigbeedriver');
const Logger = require('../../lib/Logger');
const IASZoneEnroller = require('../../lib/IASZoneEnroller');

class MotionSensor extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.logger = new Logger(this);
    this.logger.deviceInit();
    
    // Log Zigbee info
    this.logger.zigbeeNode(zclNode);
    
    // IAS Zone enrollment
    if (this.hasCapability('alarm_motion')) {
      this.logger.debug('Setting up IAS Zone for motion detection');
      
      try {
        const endpoint = zclNode.endpoints[1];
        const enroller = new IASZoneEnroller(this, endpoint, {
          zoneType: 13,
          capability: 'alarm_motion'
        });
        
        const method = await enroller.enroll(zclNode);
        this.logger.info(`✅ IAS Zone enrolled via: ${method}`);
        
      } catch (err) {
        this.logger.exception('IAS Zone enrollment failed', err);
      }
    }
    
    // Battery
    if (this.hasCapability('measure_battery')) {
      this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
        get: 'batteryPercentageRemaining',
        report: 'batteryPercentageRemaining',
        reportParser: (value) => {
          this.logger.zigbeeReport('powerConfiguration', { batteryPercentageRemaining: value });
          return Math.min(100, Math.round(value / 2));
        }
      });
    }
    
    await this.setAvailable();
    this.logger.deviceAvailable();
  }
  
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.logger.settingsChange(changedKeys, oldSettings, newSettings);
  }
  
  async onDeleted() {
    this.logger.deviceDeleted();
  }
}

module.exports = MotionSensor;
```

### Exemple 2: Temperature Sensor

```javascript
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const Logger = require('../../lib/Logger');

class TemperatureSensor extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.logger = new Logger(this);
    this.logger.deviceInit();
    
    // Temperature
    this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT, {
      get: 'measuredValue',
      report: 'measuredValue',
      reportParser: (value) => {
        this.logger.zigbeeReport('temperatureMeasurement', { measuredValue: value });
        const temperature = Math.round(value / 100 * 10) / 10;
        this.logger.capabilityChange('measure_temperature', temperature);
        return temperature;
      }
    });
    
    // Humidity
    this.registerCapability('measure_humidity', CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT, {
      get: 'measuredValue',
      report: 'measuredValue',
      reportParser: (value) => {
        this.logger.zigbeeReport('relativeHumidity', { measuredValue: value });
        const humidity = Math.round(value / 100);
        this.logger.capabilityChange('measure_humidity', humidity);
        return humidity;
      }
    });
    
    this.logger.deviceReady();
  }
}

module.exports = TemperatureSensor;
```

---

## 🎯 BEST PRACTICES

1. ✅ **Toujours** initialiser le Logger en premier dans `onNodeInit`
2. ✅ **Log** les actions Zigbee importantes (read, write, command)
3. ✅ **Utiliser** `logger.exception()` pour les erreurs avec stack trace
4. ✅ **Respecter** les niveaux de log (ERROR/WARN/INFO/DEBUG/TRACE)
5. ✅ **Inclure contexte** dans les logs (data object)
6. ✅ **Timer** les opérations longues pour détecter les problèmes
7. ✅ **Settings** pour activer/désactiver debug
8. ✅ **Diagnostic** complet lors du premier pairing (si debug)

---

## 📚 RÉFÉRENCES

- [Homey Apps SDK v3](https://apps-sdk-v3.developer.homey.app)
- [Device Class](https://apps-sdk-v3.developer.homey.app/Device.html)
- [ZigBeeNode Class](https://apps-sdk-v3.developer.homey.app/ZigBeeNode.html)
- [ManagerZigBee](https://apps-sdk-v3.developer.homey.app/ManagerZigBee.html)

---

**Système créé selon la documentation officielle Homey SDK v3** ✅
