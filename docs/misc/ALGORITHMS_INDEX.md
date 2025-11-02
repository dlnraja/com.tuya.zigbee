# 🧮 ALGORITHMS & SCRIPTS INDEX

**Version:** 1.0.0  
**Date:** 20 Octobre 2025  

---

## 🔧 SCRIPTS DE FIX

### 1. FIX_ALL_CLUSTER_IDS.js ⭐ CRITIQUE

**Path:** scripts/fixes/FIX_ALL_CLUSTER_IDS.js  
**Impact:** 140 drivers, 350+ corrections  
**Date:** 20 Oct 2025  

**Algorithme:**
1. Scanner tous device.js files
2. Détecter patterns: registerCapability(cap, NUMBER, ...)
3. Mapper NUMBER vers CLUSTER constant
4. Remplacer avec validation syntax
5. Backup automatique
6. Report détaillé

**Mapping:**
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
```

**Résultat:** 100% success, 0 syntax errors

---

### 2. REMOVE_INVALID_TITLEFORMATTED.js

**Path:** scripts/fixes/REMOVE_INVALID_TITLEFORMATTED.js  
**Impact:** 18 flow files  
**Date:** 20 Oct 2025  

**Algorithme:**
1. Lire driver.flow.compose.json
2. Pour chaque trigger:
   - Si titleFormatted existe
   - ET args = device uniquement
   - Supprimer titleFormatted
3. Écrire JSON formaté
4. Validation

**Règle:** titleFormatted seulement pour args dynamiques (dropdown, text, number)

---

## 🤖 SCRIPTS AUTOMATION

### 1. generate-device-matrix.js

**Path:** scripts/automation/generate-device-matrix.js  
**Output:** DEVICE_MATRIX.md  
**Frequency:** On push master  

**Algorithme:**
1. Scanner drivers/
2. Extraire metadata (id, name, class, capabilities)
3. Categorize (sensor, light, socket, button)
4. Generate Markdown table
5. Statistics (total, by category, by power)
6. Auto-commit si changements

---

### 2. update-readme-proactive.js

**Path:** scripts/automation/update-readme-proactive.js  
**Output:** README.md updated  
**Frequency:** On version bump  

**Algorithme:**
1. Gather current stats
2. Update README sections
3. Validate Markdown
4. Git commit

---

## ✅ SCRIPTS VALIDATION

### 1. validate-driver-schemas.js

**Path:** scripts/validation/validate-driver-schemas.js  
**Purpose:** Validation structure drivers  

**Checks:**
- Required fields (id, name, class, capabilities)
- Image sizes (small 75x75, large 500x500)
- Zigbee endpoints structure
- CLUSTER constants usage
- Flow cards format

---

## 🧠 SCRIPTS AI

### 1. web-research.js

**Path:** scripts/ai/web-research.js  
**Purpose:** Research devices online  

**Algorithme:**
1. Search device specs
2. Extract capabilities
3. Find Zigbee endpoints
4. Generate driver template

---

### 2. driver-generator.js

**Path:** scripts/ai/driver-generator.js  
**Purpose:** Auto-generate drivers  

**Input:** Device specs  
**Output:** Complete driver files  

---

## 📊 RÉSUMÉ SCRIPTS

| Script | Type | Impact | Status |
|--------|------|--------|--------|
| FIX_ALL_CLUSTER_IDS | Fix | 🔴 Critical | ✅ Done |
| REMOVE_INVALID_TITLEFORMATTED | Fix | ⚠️ Warning | ✅ Done |
| generate-device-matrix | Auto | 📝 Docs | ✅ Active |
| update-readme-proactive | Auto | 📝 Docs | ✅ Active |
| validate-driver-schemas | Valid | ✅ Check | ✅ Active |
| web-research | AI | 🤖 Research | ✅ Active |
| driver-generator | AI | 🤖 Generate | ✅ Active |

---

## 🎯 UTILISATION

### Commandes NPM

```bash
# Validation
npm run validate:publish

# Matrix generation
npm run matrix

# README update
npm run readme:update

# Coverage stats
npm run coverage

# AI research
npm run ai:research

# AI generate
npm run ai:generate
```

### Scripts Manuels

```bash
# Fix cluster IDs
node scripts/fixes/FIX_ALL_CLUSTER_IDS.js

# Clean titleFormatted
node scripts/fixes/REMOVE_INVALID_TITLEFORMATTED.js

# Generate matrix
node scripts/automation/generate-device-matrix.js
```

---

## 📚 RÉFÉRENCES

**Templates:**
- lib/templates/BEST_PRACTICE_DEVICE_TEMPLATE.js

**Documentation:**
- docs/SDK3_MASTER_REFERENCE.md
- docs/research/SDK3_BEST_PRACTICES_ANALYSIS.md

**Sources:**
- Athom SDK3: https://apps.developer.homey.app/
- homey-zigbeedriver: https://github.com/athombv/node-homey-zigbeedriver
- IKEA Example: https://github.com/athombv/com.ikea.tradfri-example

---

**Dernière mise à jour:** 20 Oct 2025  
**Maintenance:** Active  
**Contact:** Dylan L.N. Raja
