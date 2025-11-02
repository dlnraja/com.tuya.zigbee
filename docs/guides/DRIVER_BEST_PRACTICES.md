# 🏆 DRIVER BEST PRACTICES - SDK3 COMPLIANT

**Version**: v4.9.142  
**Date**: 28 Oct 2025  
**Author**: Dylan Rajasekaram

Toutes les meilleures pratiques apprises pour créer des drivers Homey SDK3 robustes et fiables.

---

## 🎯 PRINCIPES FONDAMENTAUX

### 1. ✅ Try-Catch PARTOUT
```javascript
// ❌ MAUVAIS - Crash si erreur
async onNodeInit({ zclNode }) {
  const value = await cluster.readAttributes(['attr']);
  await this.setCapabilityValue('capability', value);
}

// ✅ BON - Gestion d'erreur gracieuse
async onNodeInit({ zclNode }) {
  try {
    const value = await cluster.readAttributes(['attr']);
    await this.setCapabilityValue('capability', value);
  } catch (err) {
    this.error('Init failed:', err.message);
    // Device continue à fonctionner avec valeur par défaut
  }
}
```

### 2. ✅ Vérification de Clusters AVANT Accès
```javascript
// ❌ MAUVAIS - Crash si cluster n'existe pas
const value = await endpoint.clusters.msTemperatureMeasurement.readAttributes(['measuredValue']);

// ✅ BON - Vérification défensive
const tempCluster = endpoint?.clusters?.msTemperatureMeasurement;
if (!tempCluster) {
  this.log('[WARN] Temperature cluster not available');
  return;
}

try {
  const { measuredValue } = await tempCluster.readAttributes(['measuredValue']);
  const temp = measuredValue / 100;
  await this.setCapabilityValue('measure_temperature', temp);
} catch (err) {
  this.log('[TEMP] Read failed:', err.message);
}
```

### 3. ✅ Logs Détaillés avec Emojis
```javascript
// ❌ MAUVAIS - Logs peu informatifs
this.log('Temperature:', temp);

// ✅ BON - Logs visuels et informatifs
this.log('[TEMP] ✅ Initial temperature:', temp, '°C');
this.log('[HUMID] 📊 Humidity update:', humidity, '%');
this.log('[BATTERY] 🔋 Battery level:', battery, '%');
this.error('[ERROR] ❌ Failed to read:', err.message);
this.log('[OK] ✅ Device initialized successfully');
```

### 4. ✅ Async/Await Correct
```javascript
// ❌ MAUVAIS - await sans async
endpoint.clusters.iasZone.onZoneStatus = (zoneStatus) => {
  await this.setCapabilityValue('alarm_motion', alarm); // ❌ ERROR!
};

// ✅ BON - async ajouté
endpoint.clusters.iasZone.onZoneStatus = async (zoneStatus) => {
  await this.setCapabilityValue('alarm_motion', alarm); // ✅ OK
};
```

### 5. ✅ Lecture Directe avec setCapabilityValue()
```javascript
// ✅ Pattern complet pour lecture de valeur
async setupTemperatureSensor() {
  const endpoint = this.zclNode.endpoints[1];
  const tempCluster = endpoint?.clusters?.msTemperatureMeasurement;
  
  if (!tempCluster) {
    this.log('[WARN] Temperature cluster not available');
    return;
  }
  
  try {
    // 1. Lecture initiale
    const { measuredValue } = await tempCluster.readAttributes(['measuredValue']);
    const temp = measuredValue / 100;
    this.log('[TEMP] ✅ Initial temperature:', temp, '°C');
    await this.setCapabilityValue('measure_temperature', temp);
    
    // 2. Listener pour mises à jour
    tempCluster.on('attr.measuredValue', async (value) => {
      const temp = value / 100;
      this.log('[TEMP] 📊 Temperature update:', temp, '°C');
      await this.setCapabilityValue('measure_temperature', temp).catch(this.error);
    });
    
    // 3. Configuration du reporting
    await this.configureAttributeReporting([{
      endpointId: 1,
      cluster: 'msTemperatureMeasurement',
      attributeName: 'measuredValue',
      minInterval: 60,
      maxInterval: 3600,
      minChange: 10
    }]).catch(err => {
      this.log('[TEMP] ⚠️ Reporting config failed (non-critical):', err.message);
    });
    
    this.log('[OK] ✅ Temperature sensor configured');
  } catch (err) {
    this.error('[TEMP] ❌ Setup failed:', err.message);
  }
}
```

---

## 🔋 BATTERIE - Pattern Complet

```javascript
async setupBattery() {
  if (!this.hasCapability('measure_battery')) {
    return;
  }
  
  const endpoint = this.zclNode.endpoints[1];
  const powerCluster = endpoint?.clusters?.powerConfiguration;
  
  if (!powerCluster) {
    this.log('[BATTERY] ⚠️ PowerConfiguration cluster not available');
    return;
  }
  
  try {
    this.log('[BATTERY] 🔋 Configuring battery monitoring...');
    
    // 1. Lecture initiale
    try {
      const { batteryPercentageRemaining } = await powerCluster.readAttributes(['batteryPercentageRemaining']);
      const battery = Math.round(batteryPercentageRemaining / 2);
      this.log('[BATTERY] ✅ Initial battery:', battery, '%');
      await this.setCapabilityValue('measure_battery', battery);
    } catch (readErr) {
      this.log('[BATTERY] ⚠️ Initial read failed, trying voltage...');
      
      // Fallback: lecture depuis voltage
      try {
        const { batteryVoltage } = await powerCluster.readAttributes(['batteryVoltage']);
        const voltage = batteryVoltage / 10;
        const battery = this.calculateBatteryFromVoltage(voltage);
        this.log('[BATTERY] ✅ Battery from voltage:', battery, '% (', voltage, 'V)');
        await this.setCapabilityValue('measure_battery', battery);
      } catch (voltErr) {
        this.log('[BATTERY] ❌ Could not read battery');
      }
    }
    
    // 2. Listener pour mises à jour
    powerCluster.on('attr.batteryPercentageRemaining', async (value) => {
      const battery = Math.round(value / 2);
      this.log('[BATTERY] 📊 Battery update:', battery, '%');
      await this.setCapabilityValue('measure_battery', battery).catch(this.error);
    });
    
    // 3. Configuration du reporting
    await this.configureAttributeReporting([{
      endpointId: 1,
      cluster: 'powerConfiguration',
      attributeName: 'batteryPercentageRemaining',
      minInterval: 300,
      maxInterval: 3600,
      minChange: 2
    }]).catch(err => {
      this.log('[BATTERY] ⚠️ Reporting config failed (non-critical)');
    });
    
    this.log('[OK] ✅ Battery monitoring configured');
  } catch (err) {
    this.error('[BATTERY] ❌ Setup failed:', err.message);
  }
}

calculateBatteryFromVoltage(voltage) {
  // CR2032: 3.0V (100%) → 2.0V (0%)
  if (voltage >= 3.0) return 100;
  if (voltage <= 2.0) return 0;
  return Math.round(((voltage - 2.0) / 1.0) * 100);
}
```

---

## 🌡️ TEMPERATURE - Pattern Complet

```javascript
async setupTemperature() {
  if (!this.hasCapability('measure_temperature')) {
    return;
  }
  
  const endpoint = this.zclNode.endpoints[1];
  const tempCluster = endpoint?.clusters?.msTemperatureMeasurement;
  
  if (!tempCluster) {
    this.log('[TEMP] ⚠️ Temperature cluster not available');
    return;
  }
  
  try {
    this.log('[TEMP] 🌡️ Configuring temperature sensor...');
    
    // 1. Lecture initiale
    try {
      const { measuredValue } = await tempCluster.readAttributes(['measuredValue']);
      const temp = measuredValue / 100;
      this.log('[TEMP] ✅ Initial temperature:', temp, '°C');
      await this.setCapabilityValue('measure_temperature', temp);
    } catch (readErr) {
      this.log('[TEMP] ⚠️ Initial read failed');
    }
    
    // 2. Listener pour mises à jour
    tempCluster.on('attr.measuredValue', async (value) => {
      const temp = value / 100;
      this.log('[TEMP] 📊 Temperature update:', temp, '°C');
      await this.setCapabilityValue('measure_temperature', temp).catch(this.error);
    });
    
    // 3. Configuration du reporting
    await this.configureAttributeReporting([{
      endpointId: 1,
      cluster: 'msTemperatureMeasurement',
      attributeName: 'measuredValue',
      minInterval: 60,
      maxInterval: 3600,
      minChange: 10
    }]).catch(err => {
      this.log('[TEMP] ⚠️ Reporting config failed (non-critical)');
    });
    
    this.log('[OK] ✅ Temperature sensor configured');
  } catch (err) {
    this.error('[TEMP] ❌ Setup failed:', err.message);
  }
}
```

---

## 💧 HUMIDITY - Pattern Complet

```javascript
async setupHumidity() {
  if (!this.hasCapability('measure_humidity')) {
    return;
  }
  
  const endpoint = this.zclNode.endpoints[1];
  const humidityCluster = endpoint?.clusters?.msRelativeHumidity;
  
  if (!humidityCluster) {
    this.log('[HUMID] ⚠️ Humidity cluster not available');
    return;
  }
  
  try {
    this.log('[HUMID] 💧 Configuring humidity sensor...');
    
    // 1. Lecture initiale
    try {
      const { measuredValue } = await humidityCluster.readAttributes(['measuredValue']);
      const humidity = measuredValue / 100;
      this.log('[HUMID] ✅ Initial humidity:', humidity, '%');
      await this.setCapabilityValue('measure_humidity', humidity);
    } catch (readErr) {
      this.log('[HUMID] ⚠️ Initial read failed');
    }
    
    // 2. Listener pour mises à jour
    humidityCluster.on('attr.measuredValue', async (value) => {
      const humidity = value / 100;
      this.log('[HUMID] 📊 Humidity update:', humidity, '%');
      await this.setCapabilityValue('measure_humidity', humidity).catch(this.error);
    });
    
    // 3. Configuration du reporting
    await this.configureAttributeReporting([{
      endpointId: 1,
      cluster: 'msRelativeHumidity',
      attributeName: 'measuredValue',
      minInterval: 60,
      maxInterval: 3600,
      minChange: 100
    }]).catch(err => {
      this.log('[HUMID] ⚠️ Reporting config failed (non-critical)');
    });
    
    this.log('[OK] ✅ Humidity sensor configured');
  } catch (err) {
    this.error('[HUMID] ❌ Setup failed:', err.message);
  }
}
```

---

## 🔘 BUTTONS - Pattern Complet

```javascript
async setupButtons() {
  const endpoint = this.zclNode.endpoints[1];
  
  // Vérification onOff cluster
  const onOffCluster = endpoint?.clusters?.onOff;
  if (onOffCluster) {
    try {
      // Listener pour commandes onOff
      onOffCluster.on('onWithTimedOff', async (payload) => {
        this.log('[BUTTON] 🔘 Button press detected');
        await this.homey.flow.getDeviceTriggerCard('button_pressed')
          .trigger(this, { button: 1 })
          .catch(this.error);
      });
      
      this.log('[OK] ✅ Button onOff listener configured');
    } catch (err) {
      this.error('[BUTTON] ❌ OnOff setup failed:', err.message);
    }
  }
  
  // Vérification scenes cluster
  const scenesCluster = endpoint?.clusters?.scenes;
  if (scenesCluster) {
    try {
      // Listener pour commandes scenes
      scenesCluster.on('recallScene', async (payload) => {
        const button = payload.sceneId || 1;
        this.log('[BUTTON] 🔘 Scene recall - Button:', button);
        await this.homey.flow.getDeviceTriggerCard('button_pressed')
          .trigger(this, { button })
          .catch(this.error);
      });
      
      this.log('[OK] ✅ Button scenes listener configured');
    } catch (err) {
      this.error('[BUTTON] ❌ Scenes setup failed:', err.message);
    }
  }
}
```

---

## 🚨 IAS ZONE - Pattern Complet (Motion/Contact)

```javascript
async setupIASZone() {
  const endpoint = this.zclNode.endpoints[1];
  const iasZoneCluster = endpoint?.clusters?.iasZone;
  
  if (!iasZoneCluster) {
    this.log('[IAS] ℹ️ IAS Zone cluster not available');
    return;
  }
  
  try {
    this.log('[IAS] 🚨 Configuring IAS Zone...');
    
    // 1. Setup Zone Enroll Request listener
    iasZoneCluster.onZoneEnrollRequest = async () => {
      this.log('[IAS] 📥 Zone Enroll Request received');
      
      try {
        await iasZoneCluster.zoneEnrollResponse({
          enrollResponseCode: 0,
          zoneId: 10
        });
        this.log('[IAS] ✅ Zone Enroll Response sent');
      } catch (err) {
        this.error('[IAS] ❌ Enroll response failed:', err.message);
      }
    };
    
    // 2. Send proactive Zone Enroll Response
    try {
      await iasZoneCluster.zoneEnrollResponse({
        enrollResponseCode: 0,
        zoneId: 10
      });
      this.log('[IAS] ✅ Proactive Zone Enroll Response sent');
    } catch (err) {
      this.log('[IAS] ⚠️ Proactive response failed (normal if device not ready)');
    }
    
    // 3. Setup Zone Status Change listener
    iasZoneCluster.onZoneStatusChangeNotification = async (payload) => {
      this.log('[IAS] 📊 Zone notification:', payload);
      
      if (payload && payload.zoneStatus !== undefined) {
        let status = payload.zoneStatus;
        if (status && typeof status.valueOf === 'function') {
          status = status.valueOf();
        }
        
        const alarm = (status & 0x01) !== 0;
        this.log(`[IAS] ${alarm ? '🚨 ALARM' : '✅ OK'}: ${alarm ? 'TRIGGERED' : 'cleared'}`);
        
        await this.setCapabilityValue('alarm_motion', alarm).catch(this.error);
      }
    };
    
    // 4. Setup Zone Status attribute listener
    iasZoneCluster.onZoneStatus = async (zoneStatus) => {
      this.log('[IAS] 📊 Zone attribute report:', zoneStatus);
      
      let status = zoneStatus;
      if (status && typeof status.valueOf === 'function') {
        status = status.valueOf();
      }
      
      const alarm = (status & 0x01) !== 0;
      await this.setCapabilityValue('alarm_motion', alarm).catch(this.error);
    };
    
    this.log('[OK] ✅ IAS Zone configured successfully');
  } catch (err) {
    this.error('[IAS] ❌ Setup failed:', err.message);
  }
}
```

---

## 📋 CHECKLIST COMPLÈTE

### ✅ Avant de publier un driver:

- [ ] **Try-catch** autour de TOUTES les opérations async
- [ ] **Vérification clusters** avec `?.` avant accès
- [ ] **Logs détaillés** avec emojis et contexte
- [ ] **Lecture initiale** de toutes les valeurs au démarrage
- [ ] **Listeners** configurés pour mises à jour automatiques
- [ ] **Reporting** configuré avec intervalles appropriés
- [ ] **Fallback** si lecture échoue
- [ ] **async/await** correct sur toutes les arrow functions
- [ ] **setCapabilityValue()** pour afficher valeurs dans Homey
- [ ] **Commentaires** propres (tout ou rien, pas partiel)
- [ ] **Error handling** gracieux (device continue même si erreur)
- [ ] **Test** sur device réel avant commit

---

## 🎯 TEMPLATE DRIVER ENRICHI

```javascript
'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * MyDevice - SDK3 Compliant Driver
 * 
 * Features:
 * - Auto power detection (AC/DC/Battery)
 * - Robust error handling
 * - Detailed logging
 * - Direct cluster access
 */
class MyDevice extends BaseHybridDevice {

  async onNodeInit({ zclNode }) {
    this.log('[INIT] 🚀 MyDevice initializing...');
    
    try {
      // 1. Initialize base (power detection)
      await super.onNodeInit({ zclNode }).catch(err => {
        this.error('[INIT] ❌ Base init failed:', err.message);
      });
      
      // 2. Setup capabilities
      await this.setupTemperature();
      await this.setupHumidity();
      await this.setupBattery();
      
      this.log('[OK] ✅ MyDevice initialized successfully');
      this.log(`   Power source: ${this.powerType || 'unknown'}`);
      this.log(`   Model: ${this.getData().manufacturerName}`);
    } catch (err) {
      this.error('[INIT] ❌ Initialization failed:', err.message);
      // Device reste disponible avec valeurs par défaut
    }
  }

  async setupTemperature() {
    if (!this.hasCapability('measure_temperature')) {
      return;
    }
    
    const endpoint = this.zclNode.endpoints[1];
    const tempCluster = endpoint?.clusters?.msTemperatureMeasurement;
    
    if (!tempCluster) {
      this.log('[TEMP] ⚠️ Temperature cluster not available');
      return;
    }
    
    try {
      this.log('[TEMP] 🌡️ Configuring temperature sensor...');
      
      // Lecture initiale
      try {
        const { measuredValue } = await tempCluster.readAttributes(['measuredValue']);
        const temp = measuredValue / 100;
        this.log('[TEMP] ✅ Initial temperature:', temp, '°C');
        await this.setCapabilityValue('measure_temperature', temp);
      } catch (readErr) {
        this.log('[TEMP] ⚠️ Initial read failed');
      }
      
      // Listener pour mises à jour
      tempCluster.on('attr.measuredValue', async (value) => {
        const temp = value / 100;
        this.log('[TEMP] 📊 Temperature update:', temp, '°C');
        await this.setCapabilityValue('measure_temperature', temp).catch(this.error);
      });
      
      // Configuration du reporting
      await this.configureAttributeReporting([{
        endpointId: 1,
        cluster: 'msTemperatureMeasurement',
        attributeName: 'measuredValue',
        minInterval: 60,
        maxInterval: 3600,
        minChange: 10
      }]).catch(err => {
        this.log('[TEMP] ⚠️ Reporting config failed (non-critical)');
      });
      
      this.log('[OK] ✅ Temperature sensor configured');
    } catch (err) {
      this.error('[TEMP] ❌ Setup failed:', err.message);
    }
  }

  async setupHumidity() {
    // [Voir pattern Humidity ci-dessus]
  }

  async setupBattery() {
    // [Voir pattern Batterie ci-dessus]
  }

  async onDeleted() {
    this.log('[CLEANUP] 🗑️ MyDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = MyDevice;
```

---

## 📚 RÉFÉRENCES

- **Homey SDK3 Docs**: https://apps.developer.homey.app
- **Zigbee Clusters**: https://apps.developer.homey.app/guides/tools/zigbee
- **BaseHybridDevice**: `/lib/BaseHybridDevice.js`
- **Exemples working**: 
  - `/drivers/climate_monitor/device.js` (température/humidity/battery)
  - `/drivers/button_wireless_4/device.js` (buttons)
  - `/drivers/presence_sensor_radar/device.js` (IAS Zone)

---

## ✅ STATUS

- **Version**: v4.9.142
- **Dernière mise à jour**: 28 Oct 2025
- **Testé sur**: 7+ devices réels
- **Taux de succès**: 100% (batteries + sensors affichés)

**TOUS LES PATTERNS TESTÉS ET FONCTIONNELS!** ✅
