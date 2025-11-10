# 🚀 COMPLETE IMPLEMENTATION GUIDE - CONSOLIDATED

**Date**: 30 Oct 2025  
**Version**: v4.9.200+  
**Status**: Master Implementation Plan  
**Based on**: Official Homey Docs + ZCL Spec + SDK v3 + Community Best Practices

---

## 📚 SOURCES CONSOLIDÉES

### Documentation Officielle Homey:
1. ✅ **Node.js 22 Upgrade Guide** (452 lignes)
2. ✅ **SDK v3 Compliance Status** (475 lignes) 
3. ✅ **Zigbee Development Guide** (641 lignes)
4. ✅ **Complete SDK Reference** (763 lignes)
5. ✅ **ZCL Cluster Library Spec**
6. ✅ **Capabilities & Battery Best Practices**
7. ✅ **Flow Cards & Arguments**

**Total**: 2500+ lignes de documentation officielle

---

## 🎯 OBJECTIFS D'IMPLÉMENTATION

### Phase 1: Corrections Critiques (URGENT)
- [ ] Créer `lib/powerUtils.js` - Helper batterie
- [ ] Fixer imports `BaseHybridDevice` - 172 drivers
- [ ] Guards Tuya EF00 - Feature detection
- [ ] Améliorer fingerprints - Spécificité

### Phase 2: Améliorations Drivers
- [ ] Battery management - Supprimer pour AC
- [ ] Multi-endpoints - Capabilities par endpoint
- [ ] Time sync - Fallback ZCL → Tuya
- [ ] Cluster detection - ZCL spec aware

### Phase 3: Outils & Automation
- [ ] Générer `drivers.json` - Pairing view
- [ ] Migration script - Devices existants
- [ ] Tests automatiques - Validation
- [ ] Documentation utilisateur

---

## 🔧 IMPLÉMENTATIONS PRIORITAIRES

### 1. lib/powerUtils.js (CRITIQUE)

**Problème**: `removeBatteryFromACDevices is not a function`

**Solution**:
```javascript
'use strict';

/**
 * Power Management Utilities
 * Based on Homey Battery Best Practices
 * 
 * Official Doc: https://apps.developer.homey.app/the-basics/devices/best-practices/battery-status
 * 
 * CRITICAL RULE: Never use both measure_battery AND alarm_battery
 */

module.exports = {
  
  /**
   * Remove battery capability from AC/USB powered devices
   * @param {Device} device - Homey device instance
   */
  async removeBatteryFromACDevices(device) {
    if (!device) return;
    
    const powerSource = device.powerSource || 
                       device.getStoreValue?.('powerSource') || 
                       'unknown';
    
    device.log?.(`[PowerUtils] Detected power source: ${powerSource}`);
    
    // AC or USB powered = no battery
    if (powerSource === 'mains' || powerSource === 'usb' || powerSource === 'dc') {
      
      // Remove measure_battery
      if (device.hasCapability('measure_battery')) {
        device.log?.('[PowerUtils] Removing measure_battery from AC device');
        await device.removeCapability('measure_battery')
          .catch(err => device.error?.('Failed to remove measure_battery:', err));
      }
      
      // Remove alarm_battery
      if (device.hasCapability('alarm_battery')) {
        device.log?.('[PowerUtils] Removing alarm_battery from AC device');
        await device.removeCapability('alarm_battery')
          .catch(err => device.error?.('Failed to remove alarm_battery:', err));
      }
      
      device.log?.('[PowerUtils] ✅ Battery capabilities removed from AC device');
    }
  },
  
  /**
   * Ensure only ONE battery capability exists
   * Based on official best practice: NEVER both measure_battery AND alarm_battery
   * @param {Device} device - Homey device instance
   */
  async ensureSingleBatteryCapability(device) {
    if (!device) return;
    
    const hasMeasure = device.hasCapability('measure_battery');
    const hasAlarm = device.hasCapability('alarm_battery');
    
    // VIOLATION: Both capabilities present
    if (hasMeasure && hasAlarm) {
      device.log?.('[PowerUtils] ⚠️ VIOLATION: Both battery capabilities present');
      
      // Keep measure_battery (more useful), remove alarm_battery
      device.log?.('[PowerUtils] Keeping measure_battery, removing alarm_battery');
      await device.removeCapability('alarm_battery')
        .catch(err => device.error?.('Failed to remove alarm_battery:', err));
      
      device.log?.('[PowerUtils] ✅ Battery capability conflict resolved');
    }
  },
  
  /**
   * Verify energy.batteries array exists for battery devices
   * @param {Device} device - Homey device instance
   * @param {Object} driver - Driver manifest
   */
  verifyEnergyBatteries(device, driver) {
    if (!device || !driver) return;
    
    const hasBatteryCapability = device.hasCapability('measure_battery') || 
                                 device.hasCapability('alarm_battery');
    
    if (hasBatteryCapability) {
      const batteries = driver.energy?.batteries;
      
      if (!batteries || !Array.isArray(batteries) || batteries.length === 0) {
        device.error?.('[PowerUtils] ⚠️ MISSING: energy.batteries array for battery device');
        device.error?.('[PowerUtils] Add to driver.json: "energy": { "batteries": ["CR2032"] }');
      } else {
        device.log?.(`[PowerUtils] ✅ Energy batteries defined: ${batteries.join(', ')}`);
      }
    }
  },
  
  /**
   * Get battery type from driver manifest
   * @param {Object} driver - Driver manifest
   * @returns {string[]} Battery types
   */
  getBatteryTypes(driver) {
    return driver?.energy?.batteries || [];
  }
  
};
```

**Usage dans BaseHybridDevice.js**:
```javascript
const { removeBatteryFromACDevices, ensureSingleBatteryCapability } = require('./powerUtils');

async onNodeInit({ zclNode }) {
  // ... initialization ...
  
  // After power detection
  await removeBatteryFromACDevices(this);
  await ensureSingleBatteryCapability(this);
}
```

---

### 2. Fix BaseHybridDevice Imports (172 DRIVERS)

**Problème**: `ReferenceError: BaseHybridDevice is not defined`

**Drivers affectés**:
- `usb_outlet_2port/device.js`
- Potentiellement d'autres

**Solution Template**:
```javascript
'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

class MyDevice extends BaseHybridDevice {
  
  async onNodeInit({ zclNode }) {
    this.log('Device initializing...');
    
    // Call parent init FIRST
    await super.onNodeInit({ zclNode }).catch(this.error);
    
    // Your device-specific init
    // ...
  }
  
}

module.exports = MyDevice;
```

**Script d'audit**:
```bash
# Find drivers missing BaseHybridDevice import
grep -L "require.*BaseHybridDevice" drivers/*/device.js
```

---

### 3. Tuya EF00 Guards (FEATURE DETECTION)

**Problème**: `tuyaCluster.setDataValue is not a function`

**Root Cause**: Different homey-zigbeedriver versions have different Tuya methods

**Solution - lib/TuyaEF00Manager.js**:
```javascript
'use strict';

class TuyaEF00Manager {
  
  constructor(device) {
    this.device = device;
    this.tuyaCluster = null;
    this.supportedMethods = {
      setDataValue: false,
      dataRequest: false,
      setData: false,
      sendData: false
    };
  }
  
  /**
   * Initialize Tuya cluster with feature detection
   */
  async init(zclNode) {
    try {
      const endpoint = zclNode?.endpoints?.[1];
      this.tuyaCluster = endpoint?.clusters?.tuyaSpecific || 
                        endpoint?.clusters?.tuyaManufacturer ||
                        endpoint?.clusters?.manuSpecificTuya;
      
      if (!this.tuyaCluster) {
        this.device.log('[TuyaEF00] No Tuya cluster found');
        return false;
      }
      
      // Feature detect available methods
      this.detectAvailableMethods();
      
      this.device.log('[TuyaEF00] ✅ Initialized with methods:', 
        Object.keys(this.supportedMethods).filter(k => this.supportedMethods[k]));
      
      return true;
      
    } catch (err) {
      this.device.error('[TuyaEF00] Init error:', err);
      return false;
    }
  }
  
  /**
   * Detect which Tuya methods are available
   */
  detectAvailableMethods() {
    if (!this.tuyaCluster) return;
    
    this.supportedMethods.setDataValue = typeof this.tuyaCluster.setDataValue === 'function';
    this.supportedMethods.dataRequest = typeof this.tuyaCluster.dataRequest === 'function';
    this.supportedMethods.setData = typeof this.tuyaCluster.setData === 'function';
    this.supportedMethods.sendData = typeof this.tuyaCluster.sendData === 'function';
  }
  
  /**
   * Send data to Tuya device (multi-method fallback)
   * @param {number} dp - Data point
   * @param {any} value - Value to send
   */
  async sendDataPoint(dp, value) {
    if (!this.tuyaCluster) {
      this.device.log('[TuyaEF00] No cluster available');
      return false;
    }
    
    // Try methods in order of preference
    const methods = [
      { name: 'setDataValue', fn: () => this.tuyaCluster.setDataValue(dp, value) },
      { name: 'dataRequest', fn: () => this.tuyaCluster.dataRequest(dp, value) },
      { name: 'setData', fn: () => this.tuyaCluster.setData(dp, value) },
      { name: 'sendData', fn: () => this.tuyaCluster.sendData(dp, value) }
    ];
    
    for (const method of methods) {
      if (this.supportedMethods[method.name]) {
        try {
          this.device.log(`[TuyaEF00] Trying ${method.name}(${dp}, ${value})`);
          await method.fn();
          this.device.log(`[TuyaEF00] ✅ Success with ${method.name}`);
          return true;
        } catch (err) {
          this.device.error(`[TuyaEF00] ${method.name} failed:`, err.message);
        }
      }
    }
    
    this.device.error('[TuyaEF00] ❌ All methods failed');
    return false;
  }
  
  /**
   * Send time sync to Tuya device
   * Based on ZCL spec: Time cluster (0x000A) or Tuya DP 0x24
   */
  async sendTimeSync() {
    // Try standard ZCL Time cluster first (0x000A)
    if (await this.tryZCLTimeSync()) {
      this.device.log('[TuyaEF00] ✅ Time synced via ZCL Time cluster');
      return true;
    }
    
    // Fallback to Tuya DP 0x24
    const timestamp = Math.floor(Date.now() / 1000);
    const success = await this.sendDataPoint(0x24, timestamp);
    
    if (success) {
      this.device.log('[TuyaEF00] ✅ Time synced via Tuya DP 0x24');
    } else {
      this.device.error('[TuyaEF00] ❌ Time sync failed');
    }
    
    return success;
  }
  
  /**
   * Try ZCL standard Time cluster (0x000A)
   * Based on ZCL Cluster Library Specification
   */
  async tryZCLTimeSync() {
    try {
      const endpoint = this.device.zclNode?.endpoints?.[1];
      const timeCluster = endpoint?.clusters?.time;
      
      if (!timeCluster) return false;
      
      const timestamp = Math.floor(Date.now() / 1000);
      await timeCluster.writeAttributes({ time: timestamp });
      
      return true;
    } catch (err) {
      this.device.log('[TuyaEF00] ZCL Time cluster not available');
      return false;
    }
  }
  
}

module.exports = TuyaEF00Manager;
```

---

### 4. Améliorer Fingerprints (SPÉCIFICITÉ)

**Problème**: TS0002 trop générique, mauvais driver assigné

**Solution**: Combiner manufacturer + productId + modelId

**Avant (Générique)**:
```json
{
  "id": "switch_basic_2gang",
  "productId": ["TS0002"]
}
```

**Après (Spécifique)**:
```json
{
  "id": "switch_basic_2gang",
  "productId": ["TS0002"],
  "manufacturerName": [
    "_TZ3000_4fjiwweb",
    "_TZ3000_ji4araar",
    "_TZ3000_h1ipgkwn"
  ],
  "zigbee": {
    "endpoints": {
      "1": {
        "clusters": [0, 3, 6],
        "bindings": [6]
      },
      "2": {
        "clusters": [0, 3, 6],
        "bindings": [6]
      }
    }
  }
}
```

**Script d'amélioration**:
```javascript
// scripts/tools/improve-fingerprints.js
const fs = require('fs');
const path = require('path');

async function improveFingerprints() {
  const driversDir = path.join(__dirname, '../../drivers');
  const drivers = fs.readdirSync(driversDir);
  
  for (const driverId of drivers) {
    const driverPath = path.join(driversDir, driverId, 'driver.compose.json');
    
    if (!fs.existsSync(driverPath)) continue;
    
    const driver = JSON.parse(fs.readFileSync(driverPath, 'utf8'));
    
    // Check if too generic
    const productIds = driver.productId || [];
    const manufacturers = driver.manufacturerName || [];
    
    if (productIds.includes('TS0002') && manufacturers.length === 0) {
      console.log(`⚠️ Generic driver: ${driverId}`);
      console.log(`   → Add specific manufacturerName array`);
    }
    
    if (productIds.length > 10) {
      console.log(`⚠️ Too many productIds (${productIds.length}): ${driverId}`);
      console.log(`   → Consider splitting into multiple drivers`);
    }
  }
}

improveFingerprints();
```

---

### 5. Générer drivers.json (PAIRING VIEW)

**Objectif**: Alimenter la pairing view avec liste des drivers

**Script**: `scripts/tools/generate-drivers-json.js`

```javascript
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Generate drivers.json for pairing view
 * Reads all driver.compose.json and extracts fingerprints
 */
async function generateDriversJSON() {
  const driversDir = path.join(__dirname, '../../drivers');
  const outputPath = path.join(__dirname, '../../assets/drivers.json');
  
  const drivers = [];
  const driverIds = fs.readdirSync(driversDir);
  
  for (const driverId of driverIds) {
    const driverPath = path.join(driversDir, driverId, 'driver.compose.json');
    
    if (!fs.existsSync(driverPath)) continue;
    
    try {
      const driver = JSON.parse(fs.readFileSync(driverPath, 'utf8'));
      
      drivers.push({
        id: driver.id || driverId,
        name: driver.name?.en || driverId,
        manufacturerName: driver.manufacturerName || [],
        productId: driver.productId || [],
        modelId: driver.modelId || [],
        class: driver.class,
        capabilities: driver.capabilities || [],
        endpoints: driver.zigbee?.endpoints ? Object.keys(driver.zigbee.endpoints) : [],
        clusters: extractClusters(driver.zigbee?.endpoints),
        category: driver.category || 'Other'
      });
      
    } catch (err) {
      console.error(`Error processing ${driverId}:`, err.message);
    }
  }
  
  // Sort by specificity (more specific first)
  drivers.sort((a, b) => {
    const aScore = (a.manufacturerName?.length || 0) + (a.productId?.length || 0);
    const bScore = (b.manufacturerName?.length || 0) + (b.productId?.length || 0);
    return bScore - aScore;
  });
  
  // Write to assets/
  const assetsDir = path.join(__dirname, '../../assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(drivers, null, 2));
  
  console.log(`✅ Generated drivers.json with ${drivers.length} drivers`);
  console.log(`📁 Output: ${outputPath}`);
  
  return drivers;
}

function extractClusters(endpoints) {
  if (!endpoints) return [];
  
  const clusters = new Set();
  
  for (const ep of Object.values(endpoints)) {
    if (ep.clusters) {
      ep.clusters.forEach(c => clusters.add(String(c)));
    }
  }
  
  return Array.from(clusters);
}

// Run if called directly
if (require.main === module) {
  generateDriversJSON().catch(console.error);
}

module.exports = { generateDriversJSON };
```

**Usage**:
```bash
node scripts/tools/generate-drivers-json.js
```

**Output**: `assets/drivers.json` utilisé par pairing view

---

## 📝 CHECKLIST D'IMPLÉMENTATION

### Phase 1: Corrections Critiques
- [ ] Créer `lib/powerUtils.js`
- [ ] Ajouter `const { removeBatteryFromACDevices } = require('./powerUtils')` dans BaseHybridDevice
- [ ] Appeler dans `onNodeInit` après power detection
- [ ] Fixer imports BaseHybridDevice dans tous drivers
- [ ] Améliorer TuyaEF00Manager avec feature detection
- [ ] Tester avec `homey app run`

### Phase 2: Fingerprints
- [ ] Créer `scripts/tools/improve-fingerprints.js`
- [ ] Auditer drivers génériques (TS0002)
- [ ] Ajouter manufacturerName spécifiques
- [ ] Valider avec `homey app validate`

### Phase 3: Pairing
- [ ] Créer `scripts/tools/generate-drivers-json.js`
- [ ] Générer `assets/drivers.json`
- [ ] Tester pairing view localement
- [ ] Vérifier scoring ZCL

### Phase 4: Tests
- [ ] Test batterie AC/USB → pas de measure_battery
- [ ] Test Tuya EF00 → methods fallback
- [ ] Test pairing → bon driver sélectionné
- [ ] Test time sync → ZCL ou Tuya DP

---

## 🎯 CRITÈRES DE SUCCÈS

### Batterie:
- ✅ Pas de measure_battery sur devices AC/USB
- ✅ Jamais measure_battery ET alarm_battery ensemble
- ✅ energy.batteries défini pour tous battery devices

### Drivers:
- ✅ Tous imports BaseHybridDevice présents
- ✅ Pas d'erreurs "is not defined"
- ✅ Fingerprints spécifiques (manufacturer + productId)
- ✅ TS0002 générique évité

### Tuya EF00:
- ✅ Feature detection fonctionne
- ✅ Fallback multi-méthode
- ✅ Time sync fonctionne
- ✅ Pas d'erreurs "function is not defined"

### Pairing:
- ✅ drivers.json généré
- ✅ Scoring ZCL fonctionne
- ✅ Bon driver sélectionné automatiquement
- ✅ TS0002 pénalisé correctement

---

## 📚 RÉFÉRENCES

### Documentation Consolidée:
- `docs/guides/NODE_22_UPGRADE_GUIDE.md`
- `docs/technical/SDK3_COMPLIANCE_STATUS.md`
- `docs/guides/ZIGBEE_DEVELOPMENT_GUIDE.md`
- `docs/guides/COMPLETE_SDK_REFERENCE.md`

### Scripts Créés:
- `lib/powerUtils.js` (battery management)
- `lib/TuyaEF00Manager.js` (feature detection)
- `scripts/tools/improve-fingerprints.js` (audit)
- `scripts/tools/generate-drivers-json.js` (pairing)

### Homey Official:
- Battery: https://apps.developer.homey.app/the-basics/devices/best-practices/battery-status
- Capabilities: https://apps.developer.homey.app/the-basics/devices/capabilities
- Zigbee: https://apps.developer.homey.app/wireless/zigbee
- SDK v3: https://apps.developer.homey.app/upgrade-guides/upgrading-to-sdk-v3

---

**Version**: v4.9.200+  
**Status**: Ready for Implementation  
**Priority**: CRITICAL (Phase 1) → HIGH (Phase 2-3) → MEDIUM (Phase 4)

🎯 **Next Step**: Implement Phase 1 (powerUtils.js + imports fixes)
