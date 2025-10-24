# 🔧 GUIDE D'ENRICHISSEMENT DRIVERS - Inspiré athombv/com.tuya

**Date:** 12 Octobre 2025 04:00  
**Source:** https://github.com/athombv/com.tuya  
**Version:** 2.11.3  

---

## 🎯 DIFFÉRENCE CLÉS

### athombv/com.tuya (Cloud/WiFi)
```
Type: Cloud API + WiFi
Protocol: Tuya Cloud API
Connection: Internet required
Control: Via cloud Tuya
SDK: Homey SDK 3
Language: TypeScript
```

### dlnraja/com.tuya.zigbee (Local/Zigbee)
```
Type: Zigbee local
Protocol: Zigbee 3.0
Connection: 100% local
Control: Direct Zigbee
SDK: Homey SDK 3
Language: JavaScript
```

---

## 📚 LEÇONS À TIRER d'athombv

### 1. Structure TypeScript (À Adapter)

**Avantages TypeScript:**
- Type safety
- Better IDE support
- Compile-time errors
- Better documentation

**Pour notre app (JavaScript):**
```javascript
// Ajouter JSDoc pour type hints
/**
 * @typedef {Object} TuyaDevice
 * @property {string} manufacturerName
 * @property {string} productId
 * @property {Object} endpoints
 * @property {number[]} endpoints.clusters
 */

/**
 * @param {TuyaDevice} device
 * @returns {Promise<void>}
 */
async function onZigbeeNodeInit(device) {
  // ...
}
```

### 2. Capabilities Mapping Avancé

**athombv utilise un mapping sophistiqué:**
```typescript
// Leur approche (TypeScript)
const CAPABILITY_MAPPINGS = {
  'onoff': { code: 'switch_led', type: 'Boolean' },
  'dim': { code: 'bright_value', type: 'Integer', scale: [0, 1000] },
  'measure_temperature': { code: 'temp_current', type: 'Integer', scale: 10 },
  // etc...
};
```

**Notre adaptation (JavaScript):**
```javascript
// drivers/[driver]/device.js
const TUYA_CAPABILITY_MAP = {
  // Datapoint mappings
  onoff: {
    dp: 1,
    type: 'bool',
    get: value => !!value,
    set: value => !!value
  },
  dim: {
    dp: 2,
    type: 'number',
    scale: { homey: [0, 1], tuya: [10, 1000] },
    get: value => (value - 10) / 990,
    set: value => Math.round(value * 990 + 10)
  },
  measure_temperature: {
    dp: 18,
    type: 'number',
    scale: 10,
    get: value => value / 10,
    set: null // Read-only
  },
  measure_humidity: {
    dp: 19,
    type: 'number',
    get: value => value,
    set: null
  }
};
```

### 3. Error Handling Robuste

**athombv pattern:**
```typescript
try {
  await device.setCapabilityValue('onoff', value);
} catch (error) {
  this.error('Failed to set capability:', error);
  throw new Error(this.homey.__('errors.capability_set_failed'));
}
```

**Notre amélioration:**
```javascript
// lib/TuyaZigbeeDevice.js (à créer)
class TuyaZigbeeDevice extends ZigBeeDevice {
  
  async setCapabilityValueSafe(capability, value) {
    try {
      await this.setCapabilityValue(capability, value);
      this.log(`✓ ${capability} set to:`, value);
      return true;
    } catch (error) {
      this.error(`✗ Failed to set ${capability}:`, error);
      
      // Retry logic
      if (error.message.includes('timeout')) {
        await this.wait(1000);
        return this.setCapabilityValueSafe(capability, value);
      }
      
      throw error;
    }
  }
  
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 4. Settings Management

**athombv approach:**
```typescript
async onSettings({ oldSettings, newSettings, changedKeys }) {
  for (const key of changedKeys) {
    switch(key) {
      case 'polling_interval':
        await this.setupPolling(newSettings[key]);
        break;
      case 'sensitivity':
        await this.sendSetting('sensitivity', newSettings[key]);
        break;
    }
  }
}
```

**Notre amélioration:**
```javascript
// Ajouter à chaque device.js
async onSettings({ oldSettings, newSettings, changedKeys }) {
  this.log('Settings changed:', changedKeys);
  
  for (const key of changedKeys) {
    try {
      // Mapping settings → Zigbee attributes
      const settingsMap = {
        'temperature_calibration': {
          cluster: 'msTemperatureMeasurement',
          attribute: 'tolerance',
          dp: 19
        },
        'sensitivity': {
          cluster: 'msOccupancySensing',
          attribute: 'occupancySensorType',
          dp: 9
        }
      };
      
      if (settingsMap[key]) {
        const config = settingsMap[key];
        await this.writeAttribute(config.cluster, config.attribute, newSettings[key]);
        this.log(`✓ Setting ${key} updated`);
      }
    } catch (error) {
      this.error(`Failed to update ${key}:`, error);
      throw new Error(`Failed to update ${key}`);
    }
  }
}
```

### 5. Device Capabilities Detection

**athombv auto-detection:**
```typescript
async discoverCapabilities(device) {
  const capabilities = [];
  
  for (const [dpCode, dpInfo] of Object.entries(device.status)) {
    const capability = this.mapDpToCapability(dpCode, dpInfo.type);
    if (capability) capabilities.push(capability);
  }
  
  return capabilities;
}
```

**Notre adaptation Zigbee:**
```javascript
// À ajouter dans driver.js
async discoverCapabilitiesFromClusters(node) {
  const capabilities = [];
  const endpoint = node.endpoints[1];
  
  // Auto-detect based on clusters
  const clusterMap = {
    0x0006: 'onoff',                    // On/Off
    0x0008: 'dim',                      // Level Control
    0x0300: ['light_hue', 'light_saturation', 'light_temperature'],
    0x0402: 'measure_temperature',
    0x0405: 'measure_humidity',
    0x0400: 'measure_luminance',
    0x0500: 'alarm_motion',            // IAS Zone
    0x0001: 'measure_battery'          // Power Configuration
  };
  
  for (const cluster of endpoint.clusters) {
    const capability = clusterMap[cluster];
    if (capability) {
      if (Array.isArray(capability)) {
        capabilities.push(...capability);
      } else {
        capabilities.push(capability);
      }
    }
  }
  
  return [...new Set(capabilities)]; // Remove duplicates
}
```

---

## 🎯 AMÉLIORATIONS PRIORITAIRES

### 1. Créer Lib Commune

**Fichier:** `lib/TuyaZigbeeDevice.js`

```javascript
'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * Base class for all Tuya Zigbee devices
 * Provides common functionality and error handling
 */
class TuyaZigbeeDevice extends ZigBeeDevice {
  
  /**
   * Called when device is initialized
   */
  async onNodeInit({ zclNode }) {
    this.log('TuyaZigbeeDevice initialized');
    
    // Enable debug if setting enabled
    if (this.getSetting('debug_logging')) {
      this.setDebugEnabled(true);
    }
    
    // Setup common capabilities
    await this.setupCapabilities();
    
    // Setup battery reporting if present
    if (this.hasCapability('measure_battery')) {
      await this.setupBatteryReporting();
    }
  }
  
  /**
   * Setup capabilities with error handling
   */
  async setupCapabilities() {
    const capabilities = this.getCapabilities();
    
    for (const capability of capabilities) {
      try {
        await this.setupCapability(capability);
      } catch (error) {
        this.error(`Failed to setup ${capability}:`, error);
      }
    }
  }
  
  /**
   * Setup individual capability
   */
  async setupCapability(capability) {
    if (this.hasCapabilityListener(capability)) return;
    
    this.registerCapabilityListener(capability, async (value) => {
      try {
        await this.onCapabilityChange(capability, value);
      } catch (error) {
        this.error(`Capability ${capability} error:`, error);
        throw error;
      }
    });
  }
  
  /**
   * Override in device-specific classes
   */
  async onCapabilityChange(capability, value) {
    throw new Error(`Capability ${capability} not implemented`);
  }
  
  /**
   * Setup battery reporting with configurable interval
   */
  async setupBatteryReporting() {
    try {
      const interval = this.getSetting('battery_report_interval') || 24;
      
      await this.configureAttributeReporting([{
        cluster: 1, // Power Configuration
        attributeName: 'batteryPercentageRemaining',
        minInterval: 60,
        maxInterval: interval * 3600,
        minChange: 5
      }]);
      
      this.log(`✓ Battery reporting configured: ${interval}h`);
    } catch (error) {
      this.error('Failed to setup battery reporting:', error);
    }
  }
  
  /**
   * Safe capability value setter with retry
   */
  async setCapabilityValueSafe(capability, value, options = {}) {
    const maxRetries = options.maxRetries || 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        await this.setCapabilityValue(capability, value);
        this.log(`✓ ${capability} = ${value}`);
        return true;
      } catch (error) {
        attempt++;
        this.error(`Attempt ${attempt}/${maxRetries} failed for ${capability}:`, error);
        
        if (attempt < maxRetries) {
          await this.wait(1000 * attempt); // Exponential backoff
        } else {
          throw error;
        }
      }
    }
  }
  
  /**
   * Helper: wait for milliseconds
   */
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Debug logging helper
   */
  setDebugEnabled(enabled) {
    this.debugEnabled = enabled;
  }
  
  debug(...args) {
    if (this.debugEnabled) {
      this.log('[DEBUG]', ...args);
    }
  }
}

module.exports = TuyaZigbeeDevice;
```

### 2. Utiliser la Lib dans Drivers

**Exemple:** `drivers/motion_sensor_battery/device.js`

```javascript
'use strict';

const TuyaZigbeeDevice = require('../../lib/TuyaZigbeeDevice');

class MotionSensorDevice extends TuyaZigbeeDevice {
  
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    
    this.log('Motion Sensor initialized');
    
    // Setup IAS Zone
    await this.setupIASZone();
    
    // Setup illuminance reporting
    await this.setupIlluminanceReporting();
  }
  
  async setupIASZone() {
    try {
      const endpoint = this.zclNode.endpoints[1];
      
      // Register alarm_motion capability
      endpoint.clusters.iasZone.on('alarm', (value) => {
        this.setCapabilityValueSafe('alarm_motion', value).catch(this.error);
      });
      
      this.log('✓ IAS Zone configured');
    } catch (error) {
      this.error('IAS Zone setup failed:', error);
    }
  }
  
  async setupIlluminanceReporting() {
    try {
      await this.configureAttributeReporting([{
        cluster: 0x0400, // Illuminance Measurement
        attributeName: 'measuredValue',
        minInterval: 60,
        maxInterval: 3600,
        minChange: 100
      }]);
      
      this.registerAttrReportListener('illuminanceMeasurement', 'measuredValue', 
        async (value) => {
          const lux = Math.pow(10, (value - 1) / 10000);
          await this.setCapabilityValueSafe('measure_luminance', lux);
        });
      
      this.log('✓ Illuminance reporting configured');
    } catch (error) {
      this.error('Illuminance setup failed:', error);
    }
  }
}

module.exports = MotionSensorDevice;
```

---

## 📊 CHECKLIST ENRICHISSEMENT

### Général
- [ ] Créer `lib/TuyaZigbeeDevice.js` base class
- [ ] Ajouter JSDoc pour toutes fonctions
- [ ] Implémenter retry logic
- [ ] Ajouter debug logging configurable
- [ ] Error handling robuste partout

### Capabilities
- [ ] Auto-detection from clusters
- [ ] Mapping capability ↔ datapoints
- [ ] Safe setters avec retry
- [ ] Listeners avec error handling

### Reporting
- [ ] Battery reporting configurable
- [ ] Temperature/Humidity reporting
- [ ] Illuminance reporting
- [ ] Motion timeout configurable

### Settings
- [ ] Mapping settings → Zigbee attributes
- [ ] Validation des valeurs
- [ ] Error messages clairs
- [ ] Settings par type de device

### Tests
- [ ] Test pairing process
- [ ] Test chaque capability
- [ ] Test error scenarios
- [ ] Test settings changes

---

## 🚀 PROCHAINES VERSIONS

### v2.12.0 - Base Class
- [ ] Créer lib/TuyaZigbeeDevice.js
- [ ] Migrer 5-10 drivers pilotes
- [ ] Tester compatibilité
- [ ] Documentation

### v2.13.0 - Auto-Detection
- [ ] Discover capabilities from clusters
- [ ] Dynamic driver selection
- [ ] Unknown device support

### v2.14.0 - Advanced Features
- [ ] Scenes support
- [ ] Groups support
- [ ] OTA updates
- [ ] Advanced settings

---

## 📝 NOTES IMPORTANTES

### athombv vs Notre App

**athombv (Cloud):**
- ✅ Support WiFi devices
- ✅ Cloud features (scenes, automation)
- ✅ TypeScript
- ❌ Requires internet
- ❌ API deprecated by Tuya

**Notre app (Zigbee):**
- ✅ 100% local
- ✅ No cloud required
- ✅ 167 drivers
- ✅ 1500+ devices
- ⚠️ JavaScript (pas TypeScript)
- ⚠️ Moins de features avancées

### Inspiration Applicable

**OUI, applicable:**
- Structure error handling
- Capabilities mapping
- Settings management
- Debug logging
- Retry logic
- Base class pattern

**NON, pas applicable:**
- Cloud API calls
- OAuth flow
- Tuya datapoints (différent de Zigbee)
- TypeScript types (on est en JS)

---

**Status:** 📚 **GUIDE CRÉÉ** - Prêt pour enrichissement drivers v2.12.0+
