# 🔍 ANALYSE DIAGNOSTIQUE - 12 Octobre 2025

**Log ID:** 32546f72-a816-4e43-afce-74cd9a6837e3  
**App Version:** v2.15.0  
**Homey Version:** v12.7.0

---

## 📋 PROBLÈMES RAPPORTÉS

### Utilisateur: @Peter_van_Werkhoven
> "Still no data reception from devices, only battery reading receiving now the HOBEIAN Multisensor 100% and the SOS button only 1% even after changing battery 3,36 V measured with a multimeter."

---

## 🔴 DEVICE 1: SOS Emergency Button (CR2032)

**Driver:** `sos_emergency_button_cr2032`  
**Device ID:** `6a37461d-6762-459a-9fc0-94691e319e95`

### Symptômes
1. ❌ **Battery:** 1% (faux positif)
   - Voltage réel mesuré: **3.36V** (batterie neuve)
   - Valeur affichée: **1%** (complètement faux)

2. ❌ **Aucun événement de bouton capturé**
   - Beaucoup de "end device announce" (27 occurrences en 1h)
   - Device se réveille mais aucun event capturé
   - Pas d'alarm_contact, pas de button_press

3. ⚠️ **Tuya cluster non détecté**
   ```
   [TuyaCluster] No Tuya cluster found
   ⚠️  No Tuya cluster found, using standard Zigbee
   ```

### Log Pattern
```
07:01:36 - Received end device announce indication
07:01:48 - Received end device announce indication
07:02:05 - Received end device announce indication
... (27 fois en 1 heure)
```

### Cause Racine

#### 1. Battery Calculation Incorrect
```javascript
// Code actuel (ligne 42-43 device.js)
reportParser: value => Math.max(0, Math.min(100, value / 2)),
getParser: value => Math.max(0, Math.min(100, value / 2))
```

**Problème:**
- Zigbee standard: `batteryPercentageRemaining` va de 0-200 (200 = 100%)
- Division par 2 est correcte NORMALEMENT
- MAIS certains devices Tuya renvoient déjà 0-100 directement!
- Si device renvoie `2` (= 2%), on divise par 2 → **1%** ❌

**Solution:**
- Vérifier si valeur > 100 avant division
- Ajouter logging pour debug

#### 2. Aucun Event Handling
```javascript
// Code actuel: PAS de gestion button events
async registerStandardCapabilities() {
  // Seulement battery registration
  // MANQUE: IAS Zone, alarm_contact, button events
}
```

**Problème:**
- Device se réveille (end device announce)
- MAIS: Aucun listener pour les events
- Possibles sources:
  - IAS Zone (alarm_contact)
  - OnOff cluster (button simulation)
  - Tuya custom cluster

**Solution:**
- Ajouter IAS Zone listener
- Ajouter alarm_contact capability

#### 3. Excessive Reconnections
27 "end device announce" en 1h = **reconnexion toutes les 2 minutes**

**Causes possibles:**
- Signal Zigbee faible
- Interférences
- Device mal configuré
- Pas de check-in interval configuré

---

## 🟡 DEVICE 2: HOBEIAN Multisensor (ZG-204ZV)

**Driver:** `motion_temp_humidity_illumination_multi_battery`  
**Device ID:** `f6ab3813-7e67-4a53-a834-b40c47e0f28f`

### Symptômes
1. ✅ **Battery:** 100% (OK)
2. ❌ **Temperature:** Pas de données
3. ❌ **Humidity:** Pas de données
4. ❌ **Illuminance:** Pas de données
5. ❌ **Motion:** Pas de données

### Log Analysis
```
07:12:25 - motion_temp_humidity_illumination_sensor device initialized
07:12:25 - ✅ Battery capability registered (fallback)
07:12:26 - handle report (cluster: powerConfiguration, capability: measure_battery), parsed payload: 100
```

**MANQUE DANS LE LOG:**
- ❌ Aucun "Tuya cluster found"
- ❌ Aucun "Tuya data received"
- ❌ Aucun "Processing DP"

### Cause Racine

#### Device Code Analysis (device.js)
```javascript
const tuyaCluster = zclNode.endpoints[1].clusters[61184];

if (tuyaCluster) {
  this.log('✅ Tuya cluster found, setting up datapoint listeners');
  // ... listeners setup
}
```

**Problème:**
- Code attend cluster 61184 sur endpoint 1
- Log ne montre PAS "Tuya cluster found"
- **→ Cluster 61184 n'existe pas ou wrong endpoint!**

#### Possible Causes:
1. **Cluster pas sur endpoint 1**
   - Peut être sur endpoint 2 ou 3
   
2. **Pas de Tuya cluster du tout**
   - Device utilise clusters standards
   - Needs: OccupancySensing, Temperature, RelativeHumidity, Illuminance

3. **Reporting pas configuré**
   - Cluster existe MAIS pas de configuration reporting
   - Device n'envoie jamais de données

---

## 🔧 SOLUTIONS PROPOSÉES

### Fix 1: SOS Button Battery Calculation

```javascript
// Amélioration calculation
reportParser: value => {
  // Si valeur déjà entre 0-100, ne pas diviser
  if (value <= 100) {
    return Math.max(0, Math.min(100, value));
  }
  // Si 0-200 standard, diviser par 2
  return Math.max(0, Math.min(100, value / 2));
},
```

**OU mieux: Battery Voltage Direct**
```javascript
// Utiliser batteryVoltage au lieu de percentage
this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
  get: 'batteryVoltage',
  report: 'batteryVoltage',
  reportParser: value => {
    // Convert voltage (tenths of volts) to percentage
    const voltage = value / 10; // 36 = 3.6V
    // CR2032: 3.0V = full, 2.0V = empty
    const percentage = Math.round(((voltage - 2.0) / (3.0 - 2.0)) * 100);
    return Math.max(0, Math.min(100, percentage));
  }
});
```

### Fix 2: SOS Button Event Handling

```javascript
// Ajouter IAS Zone pour alarm_contact
if (this.hasCapability('alarm_contact')) {
  this.registerCapability('alarm_contact', CLUSTER.IAS_ZONE, {
    get: 'zoneStatus',
    report: 'zoneStatus',
    reportParser: value => (value & 1) === 1 // Bit 0 = alarm
  });
  
  // Enroll IAS Zone
  try {
    await zclNode.endpoints[1].clusters.iasZone.enrollResponse({
      enrollResponseCode: 0, // Success
      zoneId: 1
    });
    this.log('✅ IAS Zone enrolled');
  } catch (err) {
    this.error('IAS Zone enrollment failed:', err);
  }
}
```

### Fix 3: HOBEIAN Multisensor - Auto-detect Endpoint

```javascript
async onNodeInit({ zclNode }) {
  this.log('motion_temp_humidity_illumination_sensor device initialized');
  await super.onNodeInit({ zclNode });

  // Auto-detect Tuya cluster on any endpoint
  let tuyaCluster = null;
  let tuyaEndpoint = null;
  
  for (const [epId, endpoint] of Object.entries(zclNode.endpoints)) {
    if (endpoint.clusters[61184]) {
      tuyaCluster = endpoint.clusters[61184];
      tuyaEndpoint = epId;
      this.log(`✅ Tuya cluster found on endpoint ${epId}`);
      break;
    }
  }
  
  if (tuyaCluster) {
    // Setup Tuya listeners
    tuyaCluster.on('response', this._handleTuyaData.bind(this));
    tuyaCluster.on('reporting', this._handleTuyaData.bind(this));
    
    // Configure attribute reporting
    try {
      await tuyaCluster.configureReporting([{
        attributeId: 0, // dataPoints
        minimumReportInterval: 60, // 1 minute
        maximumReportInterval: 3600, // 1 hour
      }]);
      this.log('✅ Tuya reporting configured');
    } catch (err) {
      this.error('Tuya reporting config failed:', err);
    }
  } else {
    // Fallback: Standard Zigbee clusters
    this.log('⚠️  No Tuya cluster found, using standard clusters');
    await this.registerStandardClusters(zclNode);
  }
  
  // ... rest of code
}

async registerStandardClusters(zclNode) {
  // Temperature
  if (this.hasCapability('measure_temperature')) {
    this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT);
  }
  
  // Humidity
  if (this.hasCapability('measure_humidity')) {
    this.registerCapability('measure_humidity', CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT);
  }
  
  // Illuminance
  if (this.hasCapability('measure_luminance')) {
    this.registerCapability('measure_luminance', CLUSTER.ILLUMINANCE_MEASUREMENT);
  }
  
  // Motion (IAS Zone)
  if (this.hasCapability('alarm_motion')) {
    this.registerCapability('alarm_motion', CLUSTER.IAS_ZONE);
  }
}
```

### Fix 4: Enhanced Logging

```javascript
async onNodeInit({ zclNode }) {
  this.log('=== DEVICE DEBUG INFO ===');
  this.log('Node:', zclNode.ieeeAddr);
  this.log('Endpoints:', Object.keys(zclNode.endpoints));
  
  // Log all clusters for all endpoints
  for (const [epId, endpoint] of Object.entries(zclNode.endpoints)) {
    this.log(`Endpoint ${epId} clusters:`, Object.keys(endpoint.clusters));
  }
  
  this.log('========================');
  
  // ... rest of init
}
```

---

## 📊 PRIORITÉS D'IMPLÉMENTATION

### 🔴 HAUTE PRIORITÉ (Immédiat)

1. **Fix Battery SOS Button** ⏱️ 15 min
   - Implémenter smart battery calculation
   - Tester avec voltage direct

2. **Fix HOBEIAN No Data** ⏱️ 30 min
   - Auto-detect endpoint Tuya cluster
   - Fallback standard clusters
   - Configure reporting

3. **Add Event Handling SOS** ⏱️ 20 min
   - IAS Zone enrollment
   - alarm_contact capability

### 🟡 MOYENNE PRIORITÉ

4. **Enhanced Debug Logging** ⏱️ 10 min
   - Log tous endpoints/clusters
   - Aide diagnostic futur

5. **Battery Voltage Support** ⏱️ 15 min
   - Option utiliser voltage au lieu de %
   - Plus précis pour CR2032

### 🟢 BASSE PRIORITÉ

6. **Reconnection Optimization** ⏱️ 30 min
   - Configure check-in interval
   - Reduce "end device announce"

---

## 🎯 SCRIPT DE FIX AUTOMATIQUE

**À créer:** `FIX_FORUM_ISSUES_20251012.js`

1. Patch SOS button battery calculation
2. Patch HOBEIAN endpoint detection
3. Add IAS Zone handling
4. Add debug logging
5. Validate all changes

**Temps total estimé:** 1h30

---

## 📝 RÉPONSE FORUM À PRÉPARER

**Pour:** @Peter_van_Werkhoven

**Contenu:**
- Acknowledge problèmes identifiés
- Expliquer causes techniques (simple)
- Annoncer fix v2.15.1 en cours
- ETA: 24-48h
- Request: Peut-il partager Zigbee interview data?

---

## ✅ CHECKLIST AVANT PUBLICATION

- [ ] Fix SOS button battery
- [ ] Fix HOBEIAN no data
- [ ] Add IAS Zone
- [ ] Enhanced logging
- [ ] Test avec devices réels (ou simulation)
- [ ] Validate SDK3
- [ ] Version bump → v2.15.1
- [ ] Changelog update
- [ ] Forum response
- [ ] Publish App Store

---

**Analyse par:** Cascade AI  
**Date:** 12 Octobre 2025 13:40  
**Status:** 🔴 CRITIQUE - Fix requis immédiatement
