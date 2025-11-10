# 🎓 SDK3 MASTER REFERENCE - Documentation Complète

**Version:** 1.0.0  
**Date:** 20 Octobre 2025  
**App:** Universal Tuya Zigbee  

---

## 🔍 DÉCOUVERTES CRITIQUES SDK3

### 1. CLUSTER Constants (CRITIQUE!)

**Source:** Peter van Werkhoven reports + Athom examples  
**Impact:** 🔴 BLOQUANT - TypeError: expected_cluster_id_number

#### Solution Validée
```javascript
// ❌ SDK2 OBSOLÈTE
this.registerCapability('measure_battery', 1, {...});

// ✅ SDK3 REQUIS
const { CLUSTER } = require('zigbee-clusters');
this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {...});
```

#### Mapping Complet
```
1 → CLUSTER.POWER_CONFIGURATION
6 → CLUSTER.ON_OFF
8 → CLUSTER.LEVEL_CONTROL
768 → CLUSTER.COLOR_CONTROL
1024 → CLUSTER.ILLUMINANCE_MEASUREMENT
1026 → CLUSTER.TEMPERATURE_MEASUREMENT
1029 → CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT
1030 → CLUSTER.OCCUPANCY_SENSING
1280 → CLUSTER.IAS_ZONE
0xEF00 → Custom Tuya cluster
```

**Source:** https://github.com/athombv/node-homey-zigbeedriver

---

### 2. titleFormatted Rules

**Source:** https://apps.developer.homey.app/the-basics/flow  
**Impact:** ⚠️ NON-BLOQUANT - Future requirement

**Règle:** titleFormatted pour ARGS seulement, PAS pour TOKENS!

```json
✅ CORRECT:
{
  "titleFormatted": {"en": "Temperature [[degrees]]°C"},
  "args": [{"name": "degrees", "type": "number"}]
}

❌ INVALIDE:
{
  "titleFormatted": {"en": "Button [[button]]"},
  "tokens": [{"name": "button"}]
}
```

---

### 3. reportOpts Intégré

**Source:** https://github.com/athombv/com.ikea.tradfri-example  
**Impact:** 🟢 BEST PRACTICE - Code plus clean

```javascript
// ✅ Pattern moderne
this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
  get: 'batteryPercentageRemaining',
  report: 'batteryPercentageRemaining',
  
  getOpts: {
    getOnStart: true,
    getOnOnline: true,
  },
  
  reportOpts: {
    configureAttributeReporting: {
      minInterval: 3600,
      maxInterval: 86400,
      minChange: 1,
    },
  },
  
  reportParser: value => Math.round(value / 2),
});
```

---

### 4. triggerFlow() Method

**Source:** homey-zigbeedriver 2.2.1 API  
**Impact:** 🟢 SIMPLIFICATION

```javascript
// ✅ Nouveau pattern
this.triggerFlow({ 
  id: 'button_pressed',
  tokens: { button: '1', action: 'single' }
})
  .then(() => this.log('✅ Flow triggered'))
  .catch(err => this.error('Error:', err));
```

---

### 5. Battery Thresholds

**Source:** Athom best practices  
**Impact:** 🟢 UX Improvement

```javascript
async onNodeInit({ zclNode }) {
  this.batteryThreshold = 20;  // alarm_battery triggers at 20%
}
```

---

## 📚 SOURCES OFFICIELLES

### Documentation
- **SDK3 Main:** https://apps.developer.homey.app/
- **Zigbee Guide:** https://apps.developer.homey.app/wireless/zigbee
- **Flow Cards:** https://apps.developer.homey.app/the-basics/flow
- **Upgrade Guide:** https://apps.developer.homey.app/upgrade-guides/upgrading-to-sdk-v3/upgrading-zigbee

### Repositories
- **homey-zigbeedriver:** https://github.com/athombv/node-homey-zigbeedriver
- **IKEA Example:** https://github.com/athombv/com.ikea.tradfri-example
- **Philips Hue SDK3:** https://github.com/JohanBendz/com.philips.hue.zigbee/tree/sdk3

### Packages
- homey-zigbeedriver: 2.2.1
- zigbee-clusters: 2.1.2+

---

## 🔧 SCRIPTS CRÉÉS

### 1. FIX_ALL_CLUSTER_IDS.js
**Impact:** 140 drivers, 350+ corrections  
**Algorithme:**
1. Scanner device.js files
2. Détecter numeric cluster IDs
3. Mapper vers CLUSTER constants
4. Remplacer avec validation

### 2. REMOVE_INVALID_TITLEFORMATTED.js
**Impact:** 18 flow files  
**Algorithme:**
1. Lire driver.flow.compose.json
2. Supprimer titleFormatted invalides
3. Garder seulement si args dynamiques

### 3. generate-device-matrix.js
**Impact:** Auto-documentation  
**Output:** DEVICE_MATRIX.md avec tous les drivers

---

## 💻 PATTERNS DE CODE

### Battery Device
```javascript
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class BatteryDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.batteryThreshold = 20;
    
    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
      get: 'batteryPercentageRemaining',
      report: 'batteryPercentageRemaining',
      getOpts: { getOnStart: true },
      reportOpts: {
        configureAttributeReporting: {
          minInterval: 3600,
          maxInterval: 86400,
          minChange: 1,
        },
      },
      reportParser: value => Math.round(value / 2),
    });
  }
}
```

### Motion Sensor (IAS Zone)
```javascript
this.registerCapability('alarm_motion', CLUSTER.IAS_ZONE, {
  get: 'zoneStatus',
  report: 'zoneStatus',
  getOpts: { getOnStart: true },
  reportParser: value => (value & 0x01) === 0x01,
});
```

### Button Controller
```javascript
async _onButton(button, action) {
  await this.triggerFlow({
    id: 'button_pressed',
    tokens: { button, action }
  }).catch(err => this.error(err));
}
```

---

## 🔍 TROUBLESHOOTING

### TypeError: expected_cluster_id_number
**Solution:** Utiliser CLUSTER constants, pas numeric IDs  
**Script:** scripts/fixes/FIX_ALL_CLUSTER_IDS.js

### Invalid [[token]] in titleFormatted
**Solution:** Supprimer titleFormatted si pas d'args dynamiques  
**Script:** scripts/fixes/REMOVE_INVALID_TITLEFORMATTED.js

### Device not reporting
**Checklist:**
- ✅ getOnStart: true
- ✅ reportOpts configured
- ✅ Battery > 20%
- ✅ maxInterval raisonnable

---

## 📝 CHANGELOG

### v3.1.14 - CLUSTER Fix
- 140 drivers corrigés
- 350+ replacements
- Validation: ✅ Passed

### v3.1.15 - Flow Cleanup
- 18 flow files
- titleFormatted warnings
- Validation: ✅ Passed

### v3.1.16 - SDK3 Improvements
- homey-zigbeedriver: 2.2.1
- Documentation complète
- Templates best practices
- Validation: ✅ Passed

---

**Voir aussi:**
- docs/research/SDK3_BEST_PRACTICES_ANALYSIS.md
- lib/templates/BEST_PRACTICE_DEVICE_TEMPLATE.js
