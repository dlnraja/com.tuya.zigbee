# 🗺️ ROADMAP COMPLÈTE - UNIVERSAL TUYA ZIGBEE

## 📋 Vue d'Ensemble

**Objectif**: Créer un driver Homey SDK3 universel, dynamique et auto-adaptatif pour tous les devices Tuya Zigbee.

**Version Actuelle**: v4.9.124
**Version Cible**: v5.0.0 (production ready, tous bugs résolus)

---

## 🎯 PHASE 1: FONDATIONS ✅ TERMINÉ

### 1.1 Architecture de Base
- [x] BaseHybridDevice avec détection power intelligente
- [x] BatteryManager avec détection type batterie par voltage
- [x] PowerManager pour AC/DC/Battery
- [x] ZigbeeHelpers et ZigbeeTimeout
- [x] ReportingConfig centralisé

### 1.2 Managers Spécialisés
- [x] IASZoneManager pour sensors sécurité
- [x] MultiEndpointManager pour devices multi-gang
- [x] TuyaEF00Manager pour clusters propriétaires
- [x] MultiEndpointCommandListener pour events

### 1.3 Locales et Traductions
- [x] Locales FR complets (31 capabilities + 9 settings)
- [x] Locales EN complets
- [x] Support multi-langue

---

## 🚀 PHASE 2: DYNAMIC CAPABILITIES ✅ EN COURS (80%)

### 2.1 DynamicCapabilityManager ✅ TERMINÉ
- [x] Inspection automatique endpoints
- [x] Inspection automatique clusters
- [x] Mapping 31 clusters → capabilities
- [x] Création dynamique capabilities
- [x] Support multi-endpoint avec suffixes
- [x] Defensive bind checks
- [x] Setup listeners automatique
- [x] Lecture valeurs initiales

### 2.2 Problèmes Identifiés 🔴 À CORRIGER

**BUG 1: Valeurs vides dans Homey UI**
- Symptôme: Temperature: --°C, Humidity: --%
- Cause: Valeurs lues mais pas propagées correctement
- Solution: Forcer setCapabilityValue immédiatement après read

**BUG 2: USB 2-gang montre 1 seul bouton**
- Symptôme: Endpoint 2 pas exposé
- Cause: DynamicCapabilityManager s'exécute en background, device déjà affiché
- Solution: Migration automatique des devices existants

**BUG 3: Batterie pas affichée**
- Symptôme: Battery: 0% ou vide
- Cause: BatteryManager lit voltage mais pas percentage
- Solution: Lire batteryPercentageRemaining en priorité

**BUG 4: Capabilities pas créées pour devices déjà appairés**
- Symptôme: Devices anciens gardent anciennes capabilities
- Cause: DynamicCapabilityManager seulement au pairing
- Solution: Script migration + onSettings check

---

## 🛠️ PHASE 3: CORRECTIONS CRITIQUES 🔴 EN COURS

### 3.1 Correction Gestion Batterie

**Problème**:
```javascript
// ACTUEL (BUGUÉ):
const voltage = await cluster.readAttributes(['batteryVoltage']);
// Voltage lu mais percentage pas calculé correctement
```

**Solution**:
```javascript
// CORRIGÉ:
// 1. Priorité au percentage direct
const { batteryPercentageRemaining } = await cluster.readAttributes(['batteryPercentageRemaining']);
if (batteryPercentageRemaining !== undefined) {
  const percentage = batteryPercentageRemaining / 2;
  await this.setCapabilityValue('measure_battery', percentage);
}

// 2. Fallback sur voltage
if (!percentage) {
  const { batteryVoltage } = await cluster.readAttributes(['batteryVoltage']);
  const percentage = this.voltageToPercentage(batteryVoltage);
  await this.setCapabilityValue('measure_battery', percentage);
}
```

### 3.2 Correction Récupération Valeurs Capteurs

**Problème**:
```javascript
// ACTUEL (BUGUÉ):
cluster.on('attr.measuredValue', (value) => {
  // Value reçue mais pas toujours propagée
  this.device.setCapabilityValue(capabilityId, value).catch(this.device.error);
});
```

**Solution**:
```javascript
// CORRIGÉ:
// 1. Forcer lecture initiale IMMÉDIATE (pas en background)
const { measuredValue } = await cluster.readAttributes(['measuredValue']);
const processedValue = measuredValue / 100; // Temperature/Humidity
await this.device.setCapabilityValue(capabilityId, processedValue);
this.device.log(`[INIT] ✅ ${capabilityId} = ${processedValue}`);

// 2. Setup listener pour updates futures
cluster.on('attr.measuredValue', (value) => {
  const processedValue = value / 100;
  this.device.setCapabilityValue(capabilityId, processedValue)
    .then(() => this.device.log(`[UPDATE] ${capabilityId} = ${processedValue}`))
    .catch(err => this.device.error(`[UPDATE] Failed ${capabilityId}:`, err));
});

// 3. Configure reporting agressif
await cluster.configureReporting('measuredValue', 10, 300, 1);
```

### 3.3 Correction Multi-Endpoint (USB 2-Gang)

**Problème**:
```javascript
// ACTUEL (BUGUÉ):
// Endpoint 2 détecté mais capability pas visible dans UI
await this.device.addCapability('onoff.2');
// ↑ Capability existe en DB mais UI Homey pas refresh
```

**Solution**:
```javascript
// CORRIGÉ:
// 1. Vérifier si capability existe déjà
const hasCapability = this.device.hasCapability('onoff.2');

// 2. Si pas existe, créer ET forcer refresh UI
if (!hasCapability) {
  await this.device.addCapability('onoff.2');
  
  // CRITIQUE: Forcer Homey à refresh UI
  await this.device.setCapabilityValue('onoff.2', false); // Set default value
  this.device.log(`[UI-REFRESH] Capability onoff.2 created and visible`);
}

// 3. Lire valeur actuelle immédiatement
const { onOff } = await cluster.readAttributes(['onOff']);
await this.device.setCapabilityValue('onoff.2', onOff);
this.device.log(`[INIT] onoff.2 = ${onOff}`);
```

### 3.4 Migration Automatique Devices Existants

**Problème**:
- Devices appairés AVANT mise à jour gardent anciennes capabilities
- Pas de mécanisme pour ajouter nouvelles capabilities

**Solution**:
```javascript
// NOUVEAU: DeviceMigrationManager
class DeviceMigrationManager {
  
  async migrateDevice(device, zclNode) {
    const currentVersion = device.getStoreValue('capability_version');
    const targetVersion = '2.0'; // Version avec DynamicCapabilityManager
    
    if (currentVersion !== targetVersion) {
      device.log('[MIGRATION] Starting capability migration...');
      
      // Re-run dynamic discovery
      const dynamicManager = new DynamicCapabilityManager(device);
      await dynamicManager.inspectAndCreateCapabilities(zclNode);
      
      // Update version
      await device.setStoreValue('capability_version', targetVersion);
      
      device.log('[MIGRATION] ✅ Migration complete');
    }
  }
}
```

---

## 📊 PHASE 4: FLOW CARDS DYNAMIQUES ⏳ TODO

### 4.1 App-Level Registration

**À implémenter dans app.js**:
```javascript
class UniversalTuyaZigbeeApp extends Homey.App {
  
  async onInit() {
    this.log('Initializing flow cards...');
    
    // Listen for new capabilities
    this.homey.on('device.capability.added', ({ device, capability }) => {
      this.registerFlowCardsForCapability(device, capability);
    });
    
    // Register existing capabilities
    const drivers = this.homey.drivers.getDrivers();
    for (const driver of Object.values(drivers)) {
      const devices = driver.getDevices();
      for (const device of devices) {
        for (const capability of device.getCapabilities()) {
          this.registerFlowCardsForCapability(device, capability);
        }
      }
    }
  }
  
  registerFlowCardsForCapability(device, capabilityId) {
    const baseCapability = capabilityId.split('.')[0];
    const endpointSuffix = capabilityId.includes('.') ? ` (${capabilityId.split('.')[1]})` : '';
    
    // Trigger card
    this.homey.flow.getDeviceTriggerCard(`${baseCapability}_changed`)
      .registerRunListener(async (args, state) => {
        return args.device.id === device.id && state.capability === capabilityId;
      });
    
    // Action card for writable capabilities
    if (['onoff', 'dim', 'target_temperature'].includes(baseCapability)) {
      this.homey.flow.getDeviceActionCard(`set_${baseCapability}`)
        .registerRunListener(async (args) => {
          await args.device.setCapabilityValue(capabilityId, args.value);
        });
    }
    
    // Condition card
    this.homey.flow.getDeviceConditionCard(`${baseCapability}_is`)
      .registerRunListener(async (args) => {
        const value = args.device.getCapabilityValue(capabilityId);
        return value === args.value;
      });
  }
}
```

### 4.2 Flow Cards à Générer

| Capability | Trigger | Condition | Action |
|------------|---------|-----------|--------|
| onoff | "turned on/off" | "is on" | "turn on/off" |
| dim | "brightness changed" | "brightness is" | "set brightness" |
| measure_temperature | "temperature changed" | "temperature is above/below" | - |
| measure_humidity | "humidity changed" | "humidity is above/below" | - |
| measure_battery | "battery changed" | "battery is below" | - |
| alarm_motion | "motion detected" | "motion detected" | - |
| alarm_contact | "contact changed" | "is open/closed" | - |

---

## 🗄️ PHASE 5: CATALOGUE TUYA DP ⏳ TODO

### 5.1 Structure Catalogue

**Fichier: `lib/TuyaDPCatalog.js`**
```javascript
const TUYA_DP_CATALOG = {
  // Switch/OnOff
  '1': {
    name: 'switch',
    type: 'boolean',
    capability: 'onoff',
    description: 'Main power switch'
  },
  
  // Countdown timer
  '2': {
    name: 'countdown',
    type: 'number',
    capability: 'countdown_timer',
    unit: 's',
    min: 0,
    max: 86400,
    description: 'Countdown timer in seconds'
  },
  
  // Battery
  '101': {
    name: 'battery_percentage',
    type: 'number',
    capability: 'measure_battery',
    unit: '%',
    min: 0,
    max: 100,
    description: 'Battery level percentage'
  },
  
  // Temperature
  '102': {
    name: 'temperature',
    type: 'number',
    capability: 'measure_temperature',
    unit: '°C',
    min: -40,
    max: 80,
    scale: 10, // Divide by 10
    description: 'Temperature measurement'
  },
  
  // Humidity
  '103': {
    name: 'humidity',
    type: 'number',
    capability: 'measure_humidity',
    unit: '%',
    min: 0,
    max: 100,
    description: 'Relative humidity'
  }
  
  // ... 200+ DP mappings à ajouter
};

module.exports = { TUYA_DP_CATALOG };
```

### 5.2 Intégration dans TuyaEF00Manager

```javascript
const { TUYA_DP_CATALOG } = require('./TuyaDPCatalog');

class TuyaEF00Manager {
  
  async handleDP(dp, value) {
    const dpConfig = TUYA_DP_CATALOG[dp.toString()];
    
    if (dpConfig) {
      // DP connu - mapper automatiquement
      const capability = dpConfig.capability;
      let processedValue = value;
      
      // Apply scale
      if (dpConfig.scale) {
        processedValue = value / dpConfig.scale;
      }
      
      // Set capability
      await this.device.setCapabilityValue(capability, processedValue);
      this.device.log(`[TUYA-DP] DP${dp} (${dpConfig.name}) = ${processedValue}`);
      
    } else {
      // DP inconnu - créer capability dynamique
      const capabilityId = `tuya_dp_${dp}`;
      
      if (!this.device.hasCapability(capabilityId)) {
        await this.device.addCapability(capabilityId);
        this.device.log(`[TUYA-DP] 🆕 Unknown DP${dp} - created dynamic capability`);
      }
      
      await this.device.setCapabilityValue(capabilityId, value);
    }
  }
}
```

---

## 🔄 PHASE 6: PERIODIC REFRESH FALLBACK ⏳ TODO

### 6.1 Auto-Refresh Manager

**Fichier: `lib/AutoRefreshManager.js`**
```javascript
class AutoRefreshManager {
  
  constructor(device) {
    this.device = device;
    this.refreshInterval = null;
    this.capabilityRefreshMap = new Map();
  }
  
  start() {
    // Refresh every 5 minutes
    this.refreshInterval = setInterval(() => {
      this.refreshAllCapabilities();
    }, 5 * 60 * 1000);
    
    this.device.log('[AUTO-REFRESH] Started (5 min interval)');
  }
  
  async refreshAllCapabilities() {
    for (const [capabilityId, config] of this.capabilityRefreshMap.entries()) {
      try {
        const endpoint = this.device.zclNode.endpoints[config.endpoint];
        const cluster = endpoint.clusters[config.clusterName];
        
        if (cluster && typeof cluster.readAttributes === 'function') {
          const result = await cluster.readAttributes([config.attribute]);
          const value = this.processValue(result[config.attribute], capabilityId);
          
          await this.device.setCapabilityValue(capabilityId, value);
          this.device.log(`[AUTO-REFRESH] ${capabilityId} = ${value}`);
        }
      } catch (err) {
        // Ignore errors
      }
    }
  }
  
  processValue(rawValue, capabilityId) {
    const baseCapability = capabilityId.split('.')[0];
    
    if (baseCapability === 'measure_temperature' || baseCapability === 'measure_humidity') {
      return rawValue / 100;
    } else if (baseCapability === 'measure_battery') {
      return rawValue / 2;
    } else if (baseCapability === 'measure_power') {
      return rawValue / 10;
    }
    
    return rawValue;
  }
  
  stop() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.device.log('[AUTO-REFRESH] Stopped');
    }
  }
}

module.exports = AutoRefreshManager;
```

---

## 📈 MÉTRIQUES DE SUCCÈS

### Avant Corrections
```
❌ USB 2-Gang: 1 bouton visible (au lieu de 2)
❌ Temperature: --°C (valeur vide)
❌ Humidity: --% (valeur vide)
❌ Battery: 0% (incorrect)
❌ Devices existants: pas de migration
```

### Après Corrections (Cible)
```
✅ USB 2-Gang: 2 boutons visibles et contrôlables
✅ Temperature: 22.5°C (valeur réelle)
✅ Humidity: 65% (valeur réelle)
✅ Battery: 95% (valeur réelle)
✅ Devices existants: migration automatique
✅ Flow cards: auto-générées pour tous endpoints
✅ Periodic refresh: fallback si reporting échoue
```

---

## 🚀 PLAN DE DÉPLOIEMENT

### Version v4.9.125 (Immédiat)
- [x] DynamicCapabilityManager de base
- [ ] Corrections bugs batterie
- [ ] Corrections récupération valeurs
- [ ] Corrections multi-endpoint
- [ ] Migration automatique

### Version v4.9.130 (Court terme)
- [ ] Flow cards dynamiques (app-level)
- [ ] AutoRefreshManager
- [ ] Catalogue Tuya DP complet (50 DP)

### Version v5.0.0 (Production Ready)
- [ ] Catalogue Tuya DP complet (200+ DP)
- [ ] Custom cluster support
- [ ] Community contribution system
- [ ] Documentation complète
- [ ] Tests automatisés

---

## 📝 TESTS REQUIS

### Test 1: USB 2-Gang Switch
1. Apparier device
2. Vérifier: 2 boutons visibles
3. Tester: Contrôle indépendant de chaque port
4. Vérifier: Flow cards disponibles pour les 2 ports

### Test 2: Temperature/Humidity Sensor
1. Apparier device
2. Vérifier: Valeurs affichées immédiatement
3. Attendre 5 min: Valeurs mises à jour
4. Vérifier: Graphiques Insights peuplés

### Test 3: Battery Device
1. Apparier device
2. Vérifier: Battery % affiché correctement
3. Vérifier: Type batterie détecté (CR2032, AAA, etc.)
4. Vérifier: Alerts batterie faible fonctionnent

### Test 4: Migration Device Existant
1. Device déjà appairé (version ancienne)
2. Mettre à jour app
3. Vérifier: Nouvelles capabilities ajoutées automatiquement
4. Vérifier: Valeurs propagées

---

## 🎯 CONCLUSION

**État actuel**: 80% complet, fonctionnel mais bugs critiques
**Objectif v5.0.0**: 100% complet, production ready, zéro bugs

**Prochaines 24h**:
1. Corriger tous les bugs identifiés
2. Tester sur devices réels
3. Déployer v4.9.125 avec corrections
4. Valider avec utilisateurs

**Prochaines 7 jours**:
1. Flow cards dynamiques
2. Catalogue Tuya DP (50 DP)
3. AutoRefreshManager
4. Version v5.0.0 stable
