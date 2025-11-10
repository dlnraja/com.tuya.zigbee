# 🏗️ LIB/ ARCHITECTURE UNIFIÉE - Analyse & Réorganisation

**Date**: 3 Novembre 2025  
**Objectif**: Système intelligent, cohérent et adapté Homey SDK3

---

## 📊 ÉTAT ACTUEL - 61 FICHIERS LIB/

### Catégories Identifiées

#### 1. TUYA MANAGERS (12 fichiers)
- `TuyaAdapter.js` - Adaptateur général
- `TuyaDPParser.js` - Parseur Data Points (✅ OPTIMAL)
- `TuyaDataPointEngine.js` - Engine DP
- `TuyaDataPointParser.js` - Parser alternatif (DOUBLON?)
- `TuyaEF00Manager.js` - Manager cluster 0xEF00 (✅ CORE)
- `TuyaManufacturerCluster.js` - Cluster manufacturer
- `TuyaMultiGangManager.js` - Multi-gang switches (✅ ENRICHI)
- `TuyaSpecificCluster.js` - Cluster specific
- `TuyaSpecificDevice.js` - Device specific
- `TuyaSyncManager.js` - Sync manager
- `TuyaTimeSyncManager.js` - Time sync (DOUBLON?)
- `TuyaZigbeeDevice.js` - Device base

**PROBLÈMES**:
- ❌ Doublons: `TuyaDataPointParser` vs `TuyaDPParser`
- ❌ Doublons: `TuyaSyncManager` vs `TuyaTimeSyncManager`
- ❌ Fragmentation: Trop de fichiers pour fonctions similaires
- ❌ Nommage incohérent: Certains utilisent "Tuya", d'autres "tuya"

#### 2. HYBRID & PROTOCOL (3 fichiers)
- `HybridProtocolManager.js` - Routage intelligent DP/Zigbee (✅ NOUVEAU)
- `IntelligentProtocolRouter.js` - Router protocole
- `BaseHybridDevice.js` - Device hybride (✅ CORE, 2016 lignes!)

**PROBLÈMES**:
- ❌ Doublon: `HybridProtocolManager` vs `IntelligentProtocolRouter`
- ⚠️ `BaseHybridDevice.js` trop gros (2016 lignes)

#### 3. BATTERY MANAGEMENT (5 fichiers)
- `BatteryManager.js` - Manager principal
- `BatteryCalculator.js` - Calculs
- `BatteryHelper.js` - Helpers
- `BatteryMonitoringSystem.js` - Monitoring
- `BatteryCalculator.example.js` - Example (À SUPPRIMER)

**PROBLÈMES**:
- ❌ Fragmentation excessive
- ⚠️ Devrait être 1-2 fichiers maximum

#### 4. IAS ZONE (5 fichiers)
- `IASZoneManager.js` - Manager principal (✅)
- `IASZoneEnroller.js` - Enroller v1
- `IASZoneEnrollerEnhanced.js` - Enroller v2
- `IASZoneEnrollerV4.js` - Enroller v4
- `IASZoneEnroller_SIMPLE_v4.0.6.js` - Simple version

**PROBLÈMES**:
- ❌ TROP de versions (4 versions!)
- ⚠️ Garder uniquement la meilleure version

#### 5. MULTI-ENDPOINT (2 fichiers)
- `MultiEndpointManager.js` - Manager
- `MultiEndpointCommandListener.js` - Listener

**STATUS**: ✅ OK (cohérent)

#### 6. DEVICE TYPES (5 fichiers)
- `SwitchDevice.js` - Switches
- `SensorDevice.js` - Sensors
- `ButtonDevice.js` - Buttons
- `PlugDevice.js` - Plugs
- `SmartSwitchDriver.js` - Smart switches

**STATUS**: ✅ OK (spécialisés)

#### 7. CAPABILITIES & MIGRATION (6 fichiers)
- `DynamicCapabilityManager.js` - Capabilities dynamiques
- `DeviceMigrationManager.js` - Migration devices
- `EnergyCapabilityDetector.js` - Energy detection
- `HybridEnergyManager.js` - Energy hybride
- `PowerManager.js` - Power management
- `DeviceHealth.js` - Santé device

**STATUS**: ⚠️ Overlap avec Battery managers

#### 8. FLOW CARDS (3 fichiers)
- `FlowCardManager.js` - Manager principal
- `AdvancedFlowCardManager.js` - Advanced
- `FlowTriggerHelpers.js` - Helpers

**STATUS**: ✅ OK

#### 9. UTILITIES (10 fichiers)
- `Logger.js` - Logging
- `PromiseUtils.js` - Promise helpers
- `TitleSanitizer.js` - Sanitizer (✅ NOUVEAU)
- `ZigbeeHelpers.js` - Helpers
- `ZigbeeTimeout.js` - Timeout
- `ReportingConfig.js` - Reporting
- `RobustInitializer.js` - Init robuste
- `FallbackSystem.js` - Fallbacks
- `HealthCheck.js` - Health
- `powerUtils.js` - Power utils

**STATUS**: ✅ Mostly OK

#### 10. DETECTION & INTELLIGENCE (5 fichiers)
- `HardwareDetectionShim.js` - Hardware detection
- `BseedDetector.js` - Bseed detection
- `MotionAwarePresenceDetector.js` - Presence detection
- `RawDataParser.js` - Raw data
- `ClusterDPDatabase.js` - DP database

**STATUS**: ✅ Spécialisés

#### 11. PAIRING & OTA (4 fichiers)
- `PairingHelper.js` - Pairing
- `CustomPairingHelper.js` - Custom pairing
- `OTAManager.js` - OTA updates
- `GitHubAutoUpdater.js` - GitHub updates

**STATUS**: ✅ OK

#### 12. BASE & DRIVERS (3 fichiers)
- `BaseDriver.js` - Driver base
- `IntelligentDataManager.js` - Data manager
- `zigbee-cluster-map-usage-example.js` - Example (À DOCUMENTER)

---

## 🎯 PLAN DE RÉORGANISATION

### PHASE 1: CONSOLIDATION TUYA (Priorité 1)

#### Fusionner en 4 fichiers core:

1. **`TuyaProtocolManager.js`** (NOUVEAU - Fusion de 5 fichiers)
   ```
   = TuyaAdapter.js
   + TuyaDataPointEngine.js  
   + TuyaManufacturerCluster.js
   + TuyaSpecificCluster.js
   + IntelligentProtocolRouter.js
   ```
   **Rôle**: Routage intelligent DP ↔ Zigbee natif
   
2. **`TuyaDPParser.js`** (✅ GARDER tel quel)
   - Parseur Data Points officiel
   - Encode/Decode tous types DP
   - Conforme doc Tuya Developer

3. **`TuyaEF00Manager.js`** (✅ GARDER, enrichir)
   - Communication cluster 0xEF00
   - Time sync
   - Frame parsing avec TuyaDPParser
   - Méthode `sendTuyaDP()` ajoutée

4. **`TuyaMultiGangManager.js`** (✅ GARDER, enrichir)
   - Multi-Gang Switch standard complet
   - DP1-4, DP7-10, DP14-16, DP19, DP29-32
   - Intégration TuyaDPParser

**SUPPRIMER**:
- ❌ `TuyaDataPointParser.js` (doublon de TuyaDPParser)
- ❌ `TuyaSyncManager.js` (intégré dans EF00Manager)
- ❌ `TuyaTimeSyncManager.js` (doublon)
- ❌ `TuyaSpecificDevice.js` (fonctions dans BaseHybridDevice)
- ❌ `TuyaZigbeeDevice.js` (remplacé par BaseHybridDevice)

### PHASE 2: CONSOLIDATION BATTERY (Priorité 2)

#### Fusionner en 1 fichier:

**`BatteryManager.js`** (Fusion de 5 → 1)
```
= BatteryManager.js (core)
+ BatteryCalculator.js (méthodes)
+ BatteryHelper.js (helpers)
+ BatteryMonitoringSystem.js (monitoring)
```

**SUPPRIMER**:
- ❌ `BatteryCalculator.example.js` (example file)

### PHASE 3: CONSOLIDATION IAS ZONE (Priorité 3)

#### Garder 1 seule version:

**`IASZoneManager.js`** (Meilleure version)
- Enrollment automatique
- Conformité SDK3
- Compatibilité tous devices

**SUPPRIMER**:
- ❌ `IASZoneEnroller.js` (old)
- ❌ `IASZoneEnrollerEnhanced.js` (old)
- ❌ `IASZoneEnrollerV4.js` (old)
- ❌ `IASZoneEnroller_SIMPLE_v4.0.6.js` (old)

### PHASE 4: OPTIMISATION BaseHybridDevice (Priorité 1)

**`BaseHybridDevice.js`** (2016 lignes → split intelligent)

Split en 3 fichiers:
1. **`BaseHybridDevice.js`** (500 lignes)
   - Core initialization
   - zclNode management
   - Capability registration
   
2. **`HybridDeviceCore.js`** (NOUVEAU - 800 lignes)
   - Protocol detection & routing
   - Manager initialization
   - Event handling
   
3. **`HybridDeviceHelpers.js`** (NOUVEAU - 700 lignes)
   - Utility methods
   - Logging & diagnostics
   - Migration helpers

### PHASE 5: CONSOLIDATION HYBRID PROTOCOL (Priorité 1)

**`HybridProtocolManager.js`** (✅ GARDER et enrichir)
- Routage intelligent Tuya DP ↔ Zigbee
- DP mapping automatique
- Détection protocole optimal
- Intégration TuyaDPParser + TuyaEF00Manager

**SUPPRIMER**:
- ❌ `IntelligentProtocolRouter.js` (fusionné)

---

## 🔗 ARCHITECTURE UNIFIÉE FINALE

### CORE TUYA (4 fichiers)
```
lib/
├── TuyaDPParser.js              [Parser DP officiel - 191 lignes]
├── TuyaEF00Manager.js            [Cluster 0xEF00 - 475 lignes]
├── TuyaMultiGangManager.js       [Multi-gang switches - 374 lignes]
└── TuyaProtocolManager.js        [NOUVEAU - Routage intelligent]
```

### HYBRID SYSTEM (3 fichiers)
```
lib/
├── BaseHybridDevice.js           [Core device - 500 lignes]
├── HybridDeviceCore.js           [NOUVEAU - Protocol core]
├── HybridProtocolManager.js      [Protocol routing - 360 lignes]
```

### MANAGERS (8 fichiers consolidés)
```
lib/
├── BatteryManager.js             [Consolidé - Battery management]
├── IASZoneManager.js             [Zone manager unique]
├── MultiEndpointManager.js       [Multi-endpoint]
├── MultiEndpointCommandListener.js
├── DynamicCapabilityManager.js
├── DeviceMigrationManager.js
├── PowerManager.js
└── FlowCardManager.js
```

### DEVICE TYPES (5 fichiers)
```
lib/
├── SwitchDevice.js
├── SensorDevice.js
├── ButtonDevice.js
├── PlugDevice.js
└── SmartSwitchDriver.js
```

### UTILITIES (12 fichiers)
```
lib/
├── Logger.js
├── ZigbeeHelpers.js
├── TitleSanitizer.js
├── ReportingConfig.js
├── ... (autres helpers)
```

**TOTAL**: **~40 fichiers** (au lieu de 61)  
**RÉDUCTION**: **-34% de fichiers**

---

## 🔄 ADAPTATIONS HOMEY SDK3

### Principes d'Adaptation Tuya → Homey

#### 1. Gateway Tuya → Homey Pro
```javascript
// ❌ TUYA (Gateway method)
gateway.sendDataPoint(dp, value);

// ✅ HOMEY SDK3 (via zclNode)
const endpoint = this.zclNode.endpoints[1];
await endpoint.sendFrame(0xEF00, buffer, 0x00);
```

#### 2. Cluster Access
```javascript
// ❌ TUYA
const cluster = device.getCluster('tuyaManufacturer');

// ✅ HOMEY SDK3
const cluster = this.zclNode.endpoints[1].clusters.tuyaManufacturer
             || this.zclNode.endpoints[1].clusters[0xEF00];
```

#### 3. Capability Registration
```javascript
// ❌ TUYA
device.registerCapability('temperature', dp1);

// ✅ HOMEY SDK3
this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT, {
  get: 'measuredValue',
  reportOpts: {
    configureAttributeReporting: {
      minInterval: 0,
      maxInterval: 3600,
      minChange: 50
    }
  }
});
```

#### 4. Event Handlers
```javascript
// ❌ TUYA
device.on('dataPoint', (dp, value) => { });

// ✅ HOMEY SDK3
this.tuyaEF00Manager.on('datapoint', ({ dp, value }) => {
  this.handleTuyaDP(dp, value);
});
```

#### 5. Settings
```javascript
// ❌ TUYA
device.updateSetting('led_mode', value);

// ✅ HOMEY SDK3
await this.setSettings({ led_mode: value });
// Settings handled in onSettings(params)
```

### Nommage SDK3 Conforme

#### Variables
```javascript
// ✅ SDK3 Standard
this.zclNode          // ZCL Node (fourni par Homey)
this.homey            // Homey instance
this.log()            // Logging method
this.error()          // Error logging
this.setCapabilityValue()  // Set capability
```

#### Méthodes Lifecycle
```javascript
// ✅ SDK3 Lifecycle
async onNodeInit({ zclNode }) { }
async onSettings({ oldSettings, newSettings, changedKeys }) { }
async onDeleted() { }
async onRenamed(name) { }
async onAdded() { }
```

#### Cluster Constants
```javascript
// ✅ SDK3 avec zigbee-clusters
const { CLUSTER } = require('zigbee-clusters');

CLUSTER.ON_OFF                      // 0x0006
CLUSTER.TEMPERATURE_MEASUREMENT     // 0x0402
CLUSTER.OCCUPANCY_SENSING          // 0x0406
CLUSTER.IAS_ZONE                   // 0x0500
// Tuya custom: 0xEF00 (accès direct)
```

---

## 📋 MANUFACTURER ID: HOBEIAN

### Research Results

**Source**: GitHub ZHA Issue #4122

**Device**: Soil Moisture Sensor
- **Model**: TS0601
- **Manufacturer**: `_TZE200_wqashyqo` (existing)
- **Alternate**: `_TZE204_myd45weu` (PR #47)
- **NEW**: HOBEIAN (identifier à confirmer)

**Clusters**:
- 0x0000 (Basic)
- 0x0001 (Power Configuration)  
- 0x0003 (Identify)
- 0x0402 (Temperature Measurement)
- 0x0405 (Relative Humidity Measurement)

**Data Points**:
- DP1: Soil Moisture (%)
- DP2: Temperature (°C × 10)
- DP3: Humidity (% × 10) 
- DP4: Battery (%)

### Intégration PR #47

**Fichier**: `drivers/sensor_soil_moisture/driver.compose.json`

```json
{
  "zigbee": {
    "manufacturerName": [
      "_TZE204_myd45weu",
      "_TZE200_wqashyqo",
      "HOBEIAN"
    ]
  }
}
```

---

## ✅ CHECKLIST RÉORGANISATION

### Phase 1: Consolidation (Aujourd'hui)
- [ ] Créer `TuyaProtocolManager.js`
- [ ] Enrichir `HybridProtocolManager.js`
- [ ] Consolider `BatteryManager.js`
- [ ] Nettoyer IAS Zone (garder 1 version)
- [ ] Supprimer doublons (9 fichiers)

### Phase 2: BaseHybridDevice Split (Demain)
- [ ] Split en 3 fichiers cohérents
- [ ] Tester intégration
- [ ] Valider avec drivers existants

### Phase 3: Documentation & Tests (48h)
- [ ] Documenter architecture finale
- [ ] Créer exemples d'utilisation
- [ ] Tests intégration complète
- [ ] Validation Homey

### Phase 4: PR #47 & Release (3 jours)
- [ ] Ajouter HOBEIAN manufacturer ID
- [ ] Merger PR #47
- [ ] Release v4.10.1
- [ ] Update CHANGELOG

---

**STATUS**: 📋 PLAN ÉTABLI  
**PRÊT**: ✅ Pour exécution  
**IMPACT**: 🚀 +34% efficacité, architecture cohérente
