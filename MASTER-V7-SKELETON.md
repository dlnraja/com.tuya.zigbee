# 🔵 MASTER-V7+ SKELETON (v7.4.9+)
## Structure Intelligente - Priorité Intelligence

---

## 📋 CONCEPT

### Philosophie
- **Intelligence maximale** - Capacités dynamiques, auto-détection
- **Recherche complète** - Toutes les sources (Z2M, ZHA, Blakadder, GitHub)
- **Features avancées** - Flux dynamiques, DP mapping adaptatif
- **Performance** - Map O(1), fuzzy matching, safeReport

### Structure des fichiers
```
tuya-repair-master-v7/
├── app.js                 (Dynamique, capacités auto-détectées)
├── app.json               (v7.4.9+, capacités vides)
├── package.json
├── drivers/               (1 driver unifié adaptatif)
│   └── unified_driver/
│       ├── index.js
│       ├── DynamicDriverMatcher.js  (Map O(1))
│       ├── EnergyAdaptiveManager.js
│       └── CapabilityAutoRegistry.js
├── lib/
│   ├── devices/
│   │   ├── BaseHybridDevice.js      (182KB, enrichi)
│   │   ├── DynamicSwitchDevice.js   (DP mapping auto)
│   │   └── DynamicSensorDevice.js   (capabilities auto)
│   ├── mixins/
│   │   ├── PhysicalButtonMixin.js   (2000ms timeout)
│   │   ├── VirtualButtonMixin.js
│   │   └── DynamicCapabilityMixin.js (NOUVEAU)
│   ├── protocol/
│   │   ├── DynamicDriverMatcher.js  (Map O(1))
│   │   ├── UniversalTuyaParser.js   (DP parsing adaptatif)
│   │   └── Rule24Resolver.js        (Manufacturer normalization)
│   ├── utils/
│   │   ├── ManufacturerResolver.js  (Rule 24)
│   │   ├── sensorUtils.js           (safeReport)
│   │   └── dpValidator.js           (validation DP)
│   └── battery/
│       └── UnifiedBatteryHandler.js (runtime detection)
├── data/
│   ├── fingerprints.json      (5000+ entries, externalisé)
│   ├── dp-mappings.json      (DP configs par manufacturer)
│   └── brand-profiles.json   (Rule 24 profiles)
└── .github/workflows/        (Complet: validate, publish, sync, forum)
```

---

## 🎯 FONCTIONNALITÉS AVANCÉES (MASTER-V7+)

### Capacités Dynamiques
```javascript
// DynamicCapabilityMixin.js
class DynamicCapabilityMixin {
  
  async detectCapabilities() {
    const availableDPs = await this.getAvailableDPs();
    
    // Auto-register based on DPs
    if (availableDPs.has(1)) this.registerCapability('onoff');
    if (availableDPs.has(3)) this.registerCapability('dim');
    if (availableDPs.has(6)) this.registerCapability('measure_temperature');
    if (availableDPs.has(9)) this.registerCapability('measure_humidity');
    if (availableDPs.has(15)) this.registerCapability('alarm_contact');
    
    return this.capabilities;
  }
  
  async getAvailableDPs() {
    // Query device for available DPs
    const clusters = this.zclNode.endpoints[1].clusters;
    // Return Set of available DPs
  }
}
```

### Flux Dynamiques
```javascript
// DynamicFlowGenerator.js
class DynamicFlowGenerator {
  
  registerDynamicFlows(device) {
    const capabilities = device.capabilities;
    
    // Generate flows based on capabilities
    if (capabilities.includes('onoff')) {
      this.registerTrigger('switch_turned_on', device);
      this.registerTrigger('switch_turned_off', device);
    }
    
    if (capabilities.includes('measure_temperature')) {
      this.registerCondition('temperature_above', device);
      this.registerCondition('temperature_below', device);
    }
  }
  
  registerCondition(flowId, device) {
    const condition = new Homey.FlowCardCondition(flowId);
    condition.registerRunListener(async (args, state) => {
      const value = await device.getCapabilityValue(args.capability);
      return this.evaluateCondition(args.operator, value, args.threshold);
    });
  }
}
```

### DP Mapping Adaptatif
```javascript
// UniversalTuyaParser.js
class UniversalTuyaParser {
  
  parseDP(dp, data, manufacturer) {
    // Rule 24: Manufacturer-specific DP mapping
    const profile = Rule24Resolver.getProfile(manufacturer);
    
    if (profile && profile.dpMappings) {
      // Use manufacturer-specific mapping
      return this.applyMapping(dp, data, profile.dpMappings);
    }
    
    // Fallback to generic mapping
    return this.applyGenericMapping(dp, data);
  }
  
  applyMapping(dp, data, mappings) {
    const mapping = mappings[dp];
    if (!mapping) return null;
    
    // Apply divisor, min, max validation
    let value = this.decodeValue(data, mapping.type);
    
    if (mapping.divisor && mapping.divisor !== 1) {
      value = value / mapping.divisor;
    }
    
    if (mapping.min !== undefined && value < mapping.min) {
      return null; // Invalid value
    }
    
    if (mapping.max !== undefined && value > mapping.max) {
      return null; // Invalid value
    }
    
    return { capability: mapping.capability, value };
  }
}
```

---

## 🔧 INDEX MAP O(1) (MASTER-V7+)

### DynamicDriverMatcher.js
```javascript
// Map O(1) au lieu de O(n) pour fingerprint lookup
class DynamicDriverMatcher {
  
  constructor() {
    this._fingerprintMap = new Map(); // O(1) lookup
    this._manufacturerIndex = new Map(); // mfr → Set of pids
  }
  
  loadFingerprints(fingerprints) {
    for (const fp of fingerprints) {
      const key = this._makeKey(fp.manufacturerName, fp.productId);
      this._fingerprintMap.set(key, fp.driver);
      
      // Index par manufacturer
      if (!this._manufacturerIndex.has(fp.manufacturerName)) {
        this._manufacturerIndex.set(fp.manufacturerName, new Set());
      }
      this._manufacturerIndex.get(fp.manufacturerName).add(fp.productId);
    }
  }
  
  match(manufacturerName, productId) {
    // O(1) lookup
    const key = this._makeKey(manufacturerName, productId);
    return this._fingerprintMap.get(key) || null;
  }
  
  _makeKey(mfr, pid) {
    return `${mfr}|${pid}`;
  }
  
  // Fuzzy matching pour variants
  fuzzyMatch(manufacturerName, productId) {
    // Check exact first (O(1))
    const exact = this.match(manufacturerName, productId);
    if (exact) return exact;
    
    // Fuzzy: try without variant suffix
    const baseMfr = this._stripVariantSuffix(manufacturerName);
    const basePid = this._stripVariantSuffix(productId);
    
    return this.match(baseMfr, basePid);
  }
}
```

---

## 🎨 RULE 24: MANUFACTURER RESOLVER (MASTER-V7+)

### ManufacturerResolver.js
```javascript
// Rule 24: Normalize manufacturer variants
class ManufacturerResolver {
  
  static getProfile(manufacturerName) {
    // Check cache
    if (this._cache.has(manufacturerName)) {
      return this._cache.get(manufacturerName);
    }
    
    // Resolve to base profile
    const profile = this._resolve(manufacturerName);
    this._cache.set(manufacturerName, profile);
    return profile;
  }
  
  static _resolve(manufacturerName) {
    // Pattern: _TZE200_xxx → _TZE200_base
    // Pattern: _TZ3000_xxx → _TZ3000_base
    // Pattern: _TZE284_xxx → _TZE284_base (Radar variant)
    
    const prefix = manufacturerName.split('_')[1] || '';
    const basePrefix = prefix.replace(/[a-z0-9]+$/, '');
    
    return {
      basePrefix,
      type: this._detectType(manufacturerName),
      dpProfile: this._getDPProfile(basePrefix),
      energyProfile: this._getEnergyProfile(manufacturerName)
    };
  }
  
  static _detectType(manufacturerName) {
    if (manufacturerName.includes('TZE200') || manufacturerName.includes('TZE204')) {
      return 'tuya_dp'; // Cluster 0xEF00
    }
    if (manufacturerName.includes('TZ3000')) {
      return 'zcl_standard'; // Standard ZCL
    }
    if (manufacturerName.includes('TZE284')) {
      return 'tuya_dp_radar'; // Radar variant
    }
    return 'unknown';
  }
}
```

---

## 📊 DONNÉES EXTERNALISÉES (MASTER-V7+)

### data/fingerprints.json (Structure)
```json
{
  "_TZ3000_abc123": {
    "TS0001": { "driver": "switch_1gang", "type": "zcl", "energy": "mains" },
    "TS0002": { "driver": "switch_2gang", "type": "zcl", "energy": "mains" },
    "TS0043": { "driver": "button_wireless_3", "type": "zcl", "energy": "kinetic" }
  },
  "_TZE200_def456": {
    "TS0601": { "driver": "thermostat_tuya_dp", "type": "dp", "energy": "battery" }
  },
  "_TZE284_ghi789": {
    "TS0601": { "driver": "presence_sensor_radar", "type": "dp", "energy": "mains" }
  }
}
```

### data/dp-mappings.json (Structure)
```json
{
  "_TZ3000": {
    "1": { "capability": "onoff", "type": "bool" },
    "14": { "capability": "meta_power_on_state", "type": "enum" },
    "15": { "capability": "dim", "type": "enum" }
  },
  "_TZE200": {
    "1": { "capability": "measure_temperature", "divisor": 10 },
    "2": { "capability": "measure_humidity", "divisor": 10 },
    "9": { "capability": "alarm_contact", "type": "bool" }
  },
  "_TZE284": {
    "1": { "capability": "measure_temperature", "divisor": 10 },
    "2": { "capability": "measure_humidity", "divisor": 10 },
    "101": { "capability": "measure_radar_distance", "divisor": 1 }
  }
}
```

---

## 🔒 SAFE REPORT (MASTER-V7+)

### sensorUtils.js
```javascript
// safeReport - protège contre les valeurs corrompues
class SensorUtils {
  
  static safeReport(device, capability, value, options = {}) {
    // Validate range
    if (options.min !== undefined && value < options.min) {
      this._log.warn(`Value ${value} below min ${options.min} for ${capability}`);
      return false;
    }
    
    if (options.max !== undefined && value > options.max) {
      this._log.warn(`Value ${value} above max ${options.max} for ${capability}`);
      return false;
    }
    
    // Validate type
    if (typeof value !== options.expectedType) {
      this._log.warn(`Value type ${typeof value} != ${options.expectedType} for ${capability}`);
      return false;
    }
    
    // Check for NaN/Infinity
    if (!Number.isFinite(value)) {
      this._log.warn(`Invalid value ${value} for ${capability}`);
      return false;
    }
    
    // Deduplicate
    const dedupKey = `${capability}_${value}`;
    const now = Date.now();
    if (device._lastFlowTrigger?.[dedupKey] && now - device._lastFlowTrigger[dedupKey] < 500) {
      return false; // Skip duplicate
    }
    device._lastFlowTrigger = device._lastFlowTrigger || {};
    device._lastFlowTrigger[dedupKey] = now;
    
    // Set capability
    await device.setCapabilityValue(capability, value);
    return true;
  }
}
```

---

## 📝 GIT WORKFLOW (MASTER-V7+)

### Version Bump Order
```bash
# 1. Update version
# package.json: "version": "7.4.9"
# .homeycompose/app.json: "version": "7.4.9"

# 2. Add changelog
# .homeychangelog.json: add entry at TOP

# 3. AI research cycle
node scripts/ai/weekly-research.js
# → Updates data/fingerprints.json, data/dp-mappings.json

# 4. Commit
git add .
git commit -m "[skip ci] feat: v7.4.9 - AI research update"

# 5. Push
git push origin master
```

### Branch Strategy
```
master (v7.4.9+) ← Intelligent, dynamic, full research
stable-v5 (v5.11.206+) ← Stable, minimal, proven
```

---

## ✅ CHECKLIST MASTER-V7+

- [ ] 1 driver unifié avec Map O(1) fingerprint lookup
- [ ] Capacités dynamiques auto-enregistrées
- [ ] Flux dynamiques générés à l'init
- [ ] DP mapping adaptatif (Rule 24)
- [ ] Rule 24 ManufacturerResolver implémenté
- [ ] safeReport pour valeurs corrompues
- [ ] données externalisées (fingerprints.json, dp-mappings.json)
- [ ] EnergyAdaptiveManager runtime detection
- [ ] Validation: lint-collisions.js = 0
- [ ] Validation: audit-anti-generic.js = 95%+
- [ ] Validation: homey app validate = success

---

## 📚 SOURCES DE RECHERCHE (MASTER-V7+)

### Sources à scanner (implémenter silencieusement)
| Source | Format | Actions |
|--------|--------|---------|
| Zigbee2MQTT | YAML | Fingerprints + DP configs |
| ZHA (zigpy) | Python quirks | Device handlers |
| Blakadder | JSON | Device database |
| JohanBendz fork | Git | Upstream fingerprints |
| Homey Forum T140352 | HTML | User requests |
| GitHub Issues | JSON | Bug reports |

### Sources à publiciser
- Forum T140352 (dlnraja thread)
- Own GitHub issues/PRs
- Direct user requests

---

**Version**: v7.4.9+ | **Status**: SKELETON CREATED
**Generated**: 2026-05-08 | **Author**: dlnraja