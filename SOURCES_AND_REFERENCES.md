# 📚 SOURCES ET RÉFÉRENCES - Documentation Complète

**Version:** 1.0.0  
**Date:** 20 Octobre 2025  
**Dernière validation:** 20 Oct 2025  

---

## 🎯 SOURCES OFFICIELLES ATHOM

### Documentation Principale

| Ressource | URL | Description | Utilisé Pour |
|-----------|-----|-------------|--------------|
| **Homey Apps SDK** | https://apps.developer.homey.app/ | Documentation officielle SDK3 | Reference principale |
| **Zigbee Guide** | https://apps.developer.homey.app/wireless/zigbee | Guide Zigbee SDK3 complet | Clusters, endpoints, pairing |
| **Flow Cards** | https://apps.developer.homey.app/the-basics/flow | Flow triggers/actions/conditions | titleFormatted, tokens, args |
| **Arguments** | https://apps.developer.homey.app/the-basics/flow/arguments | Args types et usage | Distinction args vs tokens |
| **Upgrade Guide SDK3** | https://apps.developer.homey.app/upgrade-guides/upgrading-to-sdk-v3/upgrading-zigbee | Migration SDK2→SDK3 | CLUSTER constants migration |
| **Guidelines** | https://apps.developer.homey.app/app-store/guidelines | App Store guidelines | Flow titles, images, naming |

**Validé:** ✅ Toutes sources consultées 20 Oct 2025

---

## 📦 PACKAGES & LIBRAIRIES

### NPM Packages Officiels

| Package | Version | Repository | Usage |
|---------|---------|------------|-------|
| **homey-zigbeedriver** | 2.2.1 | https://github.com/athombv/node-homey-zigbeedriver | Base class ZigBeeDevice |
| **zigbee-clusters** | 2.1.2+ | https://github.com/Koenkk/zigbee-herdsman-converters | CLUSTER constants, ZCL |
| **homey** | SDK3 | https://www.npmjs.com/package/homey | Homey API |

**Notre version actuelle:**
```json
{
  "dependencies": {
    "homey-zigbeedriver": "^2.2.1",
    "axios": "^1.12.2",
    "canvas": "^3.2.0",
    "fs-extra": "^11.3.2"
  }
}
```

**Dernière update:** 20 Oct 2025 - homey-zigbeedriver 2.1.1 → 2.2.1

---

## 🔍 EXEMPLES OFFICIELS ATHOM

### 1. IKEA Trådfri Example ⭐

**URL:** https://github.com/athombv/com.ikea.tradfri-example  
**Date consultation:** 20 Oct 2025  
**Status:** ✅ Production-ready  

**Ce qu'on a appris:**

1. **reportOpts intégré dans registerCapability**
```javascript
// Source: drivers/remote_control/device.js
this.registerCapability('alarm_battery', CLUSTER.POWER_CONFIGURATION, {
  getOpts: {
    getOnStart: true,
  },
  reportOpts: {
    configureAttributeReporting: {
      minInterval: 0,
      maxInterval: 60000,
      minChange: 5,
    },
  },
});
```

2. **triggerFlow() method**
```javascript
// Source: drivers/remote_control/device.js
_toggleCommandHandler() {
  this.triggerFlow({ id: 'toggled' })
    .then(() => this.log('flow was triggered', 'toggled'))
    .catch(err => this.error('Error: triggering flow', 'toggled', err));
}
```

3. **Battery threshold**
```javascript
// Source: drivers/remote_control/device.js
async onNodeInit({ zclNode }) {
  this.batteryThreshold = 20;
}
```

4. **BoundClusters pour commandes**
```javascript
// Source: drivers/remote_control/device.js
const OnOffBoundCluster = require('../../lib/OnOffBoundCluster');
zclNode.endpoints[1].bind(CLUSTER.ON_OFF.NAME, new OnOffBoundCluster({
  onToggle: this._toggleCommandHandler.bind(this),
}));
```

**Impact sur notre app:** ✅ Implémenté dans BEST_PRACTICE_DEVICE_TEMPLATE.js

---

### 2. Philips Hue Zigbee (SDK3 Branch)

**URL:** https://github.com/JohanBendz/com.philips.hue.zigbee/tree/sdk3  
**Auteur:** Johan Bendz  
**Date consultation:** 20 Oct 2025  
**Status:** 🔄 En préparation SDK3  

**Insights:**
- Migration SDK2→SDK3 en cours
- Patterns similaires IKEA
- Custom clusters Philips

**Utilité:** Référence pour migration complexe

---

## 🌐 COMMUNITY RESOURCES

### 1. Homey Community Forum

**URL:** https://community.homey.app/  
**Section:** APP Pro Universal TUYA Zigbee Device  
**Thread:** https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352  

**Feedback utilisateurs:**
- Peter van Werkhoven: Battery issues (résolu v3.1.14)
- Luca: SDK3 compatibility discussions
- Multiple users: Device pairing successes

**Date dernière consultation:** 20 Oct 2025

---

### 2. GitHub Discussions

**Repositories consultés:**
- athombv/node-homey-zigbeedriver: Issues & PRs
- Koenkk/zigbee2mqtt: Device compatibility
- zigpy/zigpy: Zigbee protocol insights

---

## 📊 ZIGBEE SPECIFICATIONS

### 1. Zigbee Cluster Library (ZCL)

**Spec Version:** ZCL 7  
**Source:** Zigbee Alliance  

**Clusters utilisés dans notre app:**

| Cluster ID | Name | Hex | Usage |
|------------|------|-----|-------|
| 0x0001 | Power Configuration | 0x0001 | Battery percentage |
| 0x0006 | On/Off | 0x0006 | Switch control |
| 0x0008 | Level Control | 0x0008 | Dimming |
| 0x0300 | Color Control | 0x0300 | RGB/CT control |
| 0x0400 | Illuminance | 0x0400 | Light sensor |
| 0x0402 | Temperature | 0x0402 | Temperature sensor |
| 0x0405 | Humidity | 0x0405 | Humidity sensor |
| 0x0406 | Occupancy | 0x0406 | Occupancy detection |
| 0x0500 | IAS Zone | 0x0500 | Security sensors |
| 0xEF00 | Tuya Specific | 0xEF00 | Tuya custom cluster |

**Source:** Zigbee Cluster Library Specification

---

### 2. Tuya Specific Cluster (0xEF00)

**Source:** Tuya IoT Developer Platform + Reverse engineering  
**Type:** Manufacturer specific cluster  

**Structure DP (Data Point):**
```
DP1: On/Off
DP2: Brightness
DP3: Color Temperature
DP4: Color (RGB)
...
```

**Implementation:** lib/TuyaSpecificCluster.js

**References:**
- zigbee2mqtt converters
- Community reverse engineering
- Tuya official (partial docs)

---

## 🔬 DÉCOUVERTES & SOLUTIONS

### 1. TypeError: expected_cluster_id_number

**Date découverte:** 20 Oct 2025  
**Source:** Peter van Werkhoven diagnostic reports  
**Cause:** Numeric cluster IDs non supportés SDK3  

**Investigation:**
1. ❌ **Hypothèse initiale:** Issue dans code Peter  
   - **Rejeté:** Peter utilise app officielle
   
2. ✅ **Vraie cause:** Notre app v3.1.10 utilisait numeric IDs  
   - **Validé:** Athom examples utilisent CLUSTER constants
   - **Solution:** FIX_ALL_CLUSTER_IDS.js

**Sources validation:**
- https://github.com/athombv/com.ikea.tradfri-example
- https://apps.developer.homey.app/wireless/zigbee
- https://github.com/athombv/node-homey-zigbeedriver

**Commit fix:** v3.1.14 (792220a9c)

---

### 2. titleFormatted Validation Error

**Date découverte:** 20 Oct 2025  
**Source:** homey app validate --level publish  
**Error:** Invalid [[button]] in titleFormatted  

**Investigation:**
1. ❌ **Tentative 1:** Ajouter titleFormatted avec tokens  
   - **Résultat:** Validation error
   - **Script:** ADD_TITLE_FORMATTED.js (deprecated)

2. ✅ **Solution:** Supprimer titleFormatted invalides  
   - **Règle:** titleFormatted pour ARGS uniquement
   - **Script:** REMOVE_INVALID_TITLEFORMATTED.js

**Sources validation:**
- https://apps.developer.homey.app/the-basics/flow
- https://apps.developer.homey.app/the-basics/flow/arguments

**Commit fix:** v3.1.15 (5295fe2af)

---

### 3. reportOpts Best Practice

**Date découverte:** 20 Oct 2025  
**Source:** IKEA Trådfri example analysis  

**Ancien pattern (fonctionnel):**
```javascript
this.registerCapability(...);
await this.configureAttributeReporting([...]);
```

**Nouveau pattern (best practice):**
```javascript
this.registerCapability(..., {
  getOpts: { getOnStart: true },
  reportOpts: {
    configureAttributeReporting: {...}
  }
});
```

**Avantages:** Code -40% plus concis, fetch initial automatique

**Sources:**
- https://github.com/athombv/com.ikea.tradfri-example/blob/main/drivers/remote_control/device.js
- https://athombv.github.io/node-homey-zigbeedriver/

**Implémentation:** BEST_PRACTICE_DEVICE_TEMPLATE.js

---

## 📝 RAPPORTS UTILISATEURS

### Peter van Werkhoven - HOBEIAN & SOS Button

**Date:** Oct 2025  
**Devices:**
- HOBEIAN Multisensor (ZG-204Z)
- SOS Emergency Button

**Issues reportés:**
- ❌ Battery reading: 0%
- ❌ No sensor data (temperature, humidity)
- ❌ Flows not triggering

**Version problématique:** v3.1.10  
**Diagnostic:** TypeError expected_cluster_id_number  

**Solution appliquée:** v3.1.14
- ✅ Fix CLUSTER constants
- ✅ 140 drivers corrigés
- ✅ Battery reporting fixed

**Status:** ⏳ En attente feedback sur v3.1.14+

---

## 🎓 KNOWLEDGE BASE INTERNE

### Documentation Créée

| Document | Path | Date | Usage |
|----------|------|------|-------|
| **SDK3 Master Reference** | docs/SDK3_MASTER_REFERENCE.md | 20 Oct 2025 | Reference complète |
| **Best Practices Analysis** | docs/research/SDK3_BEST_PRACTICES_ANALYSIS.md | 20 Oct 2025 | Benchmarking |
| **Algorithms Index** | docs/ALGORITHMS_INDEX.md | 20 Oct 2025 | Scripts reference |
| **Device Template** | lib/templates/BEST_PRACTICE_DEVICE_TEMPLATE.js | 20 Oct 2025 | Code template |
| **Sources (ce document)** | docs/SOURCES_AND_REFERENCES.md | 20 Oct 2025 | Références |

---

### Templates & Patterns

| Template | Path | Usage |
|----------|------|-------|
| **Best Practice Device** | lib/templates/BEST_PRACTICE_DEVICE_TEMPLATE.js | Base pour nouveaux drivers |
| **Tuya Specific Cluster** | lib/TuyaSpecificCluster.js | Cluster 0xEF00 |
| **Tuya OnOff Cluster** | lib/TuyaOnOffCluster.js | On/Off Tuya |

---

## ✅ VALIDATION & TESTING

### Validation Tools

| Tool | Command | Purpose |
|------|---------|---------|
| **Homey Validate** | homey app validate --level publish | Official validation |
| **Schema Validator** | npm run test | Driver schemas |
| **ESLint** | npm run lint | Code quality |
| **GitHub Actions** | Auto on push | CI/CD validation |

**Dernière validation complète:** 20 Oct 2025  
**Résultat:** ✅ Passed publish level  
**Warnings:** 18 titleFormatted (non-bloquants)

---

## 🔄 CHANGELOG SOURCES

### v3.1.14 - CLUSTER Constants Fix
**Sources utilisées:**
- Athom SDK3 docs
- IKEA Trådfri example
- homey-zigbeedriver API
- Peter reports

### v3.1.15 - Flow Cleanup
**Sources utilisées:**
- Athom Flow documentation
- Arguments guide
- Validation errors analysis

### v3.1.16 - SDK3 Improvements
**Sources utilisées:**
- IKEA Trådfri (reportOpts)
- homey-zigbeedriver 2.2.1
- Community best practices
- Athom guidelines

---

## 📧 CONTACTS & SUPPORT

### Athom Support
- **Developer Forum:** https://community.homey.app/c/developers/
- **GitHub Issues:** https://github.com/athombv/node-homey-zigbeedriver/issues

### Community
- **Homey Community:** https://community.homey.app/
- **Our Thread:** Universal TUYA Zigbee Device App

### Maintainer
- **Author:** Dylan L.N. Raja
- **App:** com.dlnraja.tuya.zigbee
- **GitHub:** https://github.com/dlnraja/com.tuya.zigbee

---

**Document maintenu activement**  
**Dernière révision:** 20 Oct 2025  
**Prochaine révision:** Après feedback Peter v3.1.14+
