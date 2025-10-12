# 🎯 SYSTÈME ENRICHISSEMENT INTELLIGENT

**Composants:** Matcher + Pathfinder + Converter + Orchestrator

## 📚 ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                    SOURCES EXTERNES                          │
├─────────────────────────────────────────────────────────────┤
│  • Blakadder Zigbee Database (zigbee.blakadder.com)         │
│  • Zigbee2MQTT Converters (GitHub)                          │
│  • ZHA Device Handlers                                       │
│  • Homey Community Forum                                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│           INTELLIGENT_MATCHER_BLAKADDER.js                   │
├─────────────────────────────────────────────────────────────┤
│  • Télécharge & cache données externes (7 jours)            │
│  • Parse Blakadder JSON                                      │
│  • Parse Zigbee2MQTT TypeScript                              │
│  • Calcule score de similarité (Levenshtein-like)           │
│  • Trouve correspondances HIGH/MEDIUM/LOW confidence         │
│  • Génère rapport matching                                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              PATHFINDER_CONVERTER.js                         │
├─────────────────────────────────────────────────────────────┤
│  • Matrices de conversion complètes                          │
│  • Manufacturer ID mapping (cross-platform)                  │
│  • Product ID normalization                                  │
│  • Device type synonyms                                      │
│  • Cluster ID conversion (hex ↔ decimal ↔ name)             │
│  • Capability mapping (Zigbee → Homey)                       │
│  • Pathfinding: trouve meilleur chemin conversion           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│         AUTO_ENRICHMENT_ORCHESTRATOR.js                      │
├─────────────────────────────────────────────────────────────┤
│  • Combine Matcher + Pathfinder                              │
│  • Backup automatique avant modification                     │
│  • Applique enrichissements HIGH confidence (≥90%)           │
│  • Validation après changement                               │
│  • Rollback si erreur                                        │
│  • Rapport final complet                                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   DRIVERS ENRICHIS                           │
│                    (167 drivers)                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 UTILISATION

### 1. **Matcher Seul** (Analyse)

Trouve les correspondances sans modifier:

```bash
node scripts/enrichment/INTELLIGENT_MATCHER_BLAKADDER.js
```

**Résultat:**
- Rapport JSON dans `docs/enrichment/intelligent_matcher_*.json`
- Liste devices matchés avec score confiance
- Top 10 recommendations

### 2. **Pathfinder/Converter** (Test)

Teste conversions:

```bash
node scripts/enrichment/PATHFINDER_CONVERTER.js
```

**Teste:**
- Manufacturer ID conversion
- Product ID normalization
- Device type conversion
- Cluster conversion
- Full device → Homey config

### 3. **Orchestrator** (Enrichissement Automatique)

#### Dry Run (Simulation):
```bash
node scripts/enrichment/AUTO_ENRICHMENT_ORCHESTRATOR.js --dry-run
```

#### Production (Applique changements):
```bash
node scripts/enrichment/AUTO_ENRICHMENT_ORCHESTRATOR.js
```

**Actions:**
1. Download sources externes (cached 7 jours)
2. Match drivers avec external databases
3. Convertit formats → Homey
4. Backup avant modification
5. Applique enrichissements HIGH confidence
6. Génère rapport final

---

## 📊 MATRICES DE CONVERSION

### Manufacturer ID Mapping

```javascript
'_TZ3000_mmtwjmaq': {
  blakadder: '_TZ3000_mmtwjmaq',
  zigbee2mqtt: '_TZ3000_mmtwjmaq',
  homey: ['_TZ3000_mmtwjmaq'],
  productId: 'TS0202',
  type: 'motion_sensor',
  verified: true
}
```

### Product ID Normalization

```javascript
'TS0202': {
  variations: ['TS0202', 'ts0202', 'TS_0202'],
  type: 'motion_sensor',
  clusters: [0, 1, 3, 1280, 1026],
  endpoints: { 1: {} }
}
```

### Device Type Synonyms

```javascript
'motion_sensor': {
  blakadder: ['pir', 'motion', 'occupancy'],
  zigbee2mqtt: ['occupancy', 'motion_sensor', 'pir_sensor'],
  homey: ['motion_sensor', 'pir_sensor', 'occupancy_sensor'],
  capabilities: ['alarm_motion', 'measure_battery']
}
```

### Cluster Conversion

```javascript
1280: {
  hex: '0x0500',
  name: 'iasZone',
  homey: 'iasZone'
}
```

---

## 🎯 ALGORITHME MATCHING

### Score Calculation

```javascript
function calculateMatchScore(driver, externalDevice) {
  let score = 0;
  
  // Manufacturer ID (60% weight)
  const manuSimilarity = similarityScore(
    driver.manufacturerId, 
    external.manufacturerId
  );
  score += manuSimilarity * 0.6;
  
  // Product ID (40% weight)
  const prodSimilarity = similarityScore(
    driver.productId,
    external.productId
  );
  score += prodSimilarity * 0.4;
  
  return score;
}
```

### Confidence Levels

- **HIGH:** score ≥ 95% (exact ou très proche match)
- **MEDIUM:** score 85-94% (probable match)
- **LOW:** score 70-84% (possible match)

### Similarité String

```javascript
function similarityScore(str1, str2) {
  // 1. Exact match → 100%
  if (str1 === str2) return 100;
  
  // 2. Wildcard match → 90%
  if (wildcardMatch(str1, str2)) return 90;
  
  // 3. Contains → 80%
  if (str1.includes(str2)) return 80;
  
  // 4. Common prefix → 0-70%
  return (commonPrefix / maxLength) * 100;
}
```

---

## 📁 STRUCTURE DONNÉES

### Input (External Device)

```json
{
  "manufacturerId": "_TZ3000_g5xawfcq",
  "productId": "TS011F",
  "type": "plug",
  "endpoints": {
    "1": {
      "clusters": [0, 3, 4, 5, 6, 1794, 2820]
    }
  },
  "source": "blakadder",
  "verified": true
}
```

### Output (Homey Config)

```json
{
  "manufacturerName": ["_TZ3000_g5xawfcq"],
  "productId": ["TS011F"],
  "endpoints": {
    "1": {
      "clusters": [0, 3, 4, 5, 6, 1794, 2820]
    }
  },
  "capabilities": ["onoff", "measure_power", "meter_power"]
}
```

---

## 🔐 SÉCURITÉ

### Backup Automatique

Avant toute modification:
```bash
.backup/
  └─ driver_name/
      └─ driver.compose.json.backup.1728745678901
```

### Validation Post-Enrichissement

Après chaque changement:
```bash
homey app validate --level publish
```

### Rollback

Si erreur détectée:
```bash
cp .backup/driver_name/driver.compose.json.backup.* \
   drivers/driver_name/driver.compose.json
```

---

## 📊 RAPPORTS GÉNÉRÉS

### Matching Report

```json
{
  "timestamp": "2025-10-12T15:59:00.000Z",
  "sources": {
    "blakadder": 1423,
    "zigbee2mqtt": 892
  },
  "results": {
    "totalDrivers": 167,
    "matched": 89,
    "highConfidence": 45,
    "mediumConfidence": 28,
    "lowConfidence": 16,
    "unmatched": 78
  }
}
```

### Enrichment Report

```json
{
  "timestamp": "2025-10-12T16:00:00.000Z",
  "totalDrivers": 45,
  "enriched": 38,
  "skipped": 5,
  "failed": 2,
  "details": [
    {
      "driver": "motion_sensor_battery",
      "success": true,
      "changes": ["Added manufacturer IDs: _TZ3000_kmh5qpmb"],
      "matchScore": 98,
      "confidence": "HIGH"
    }
  ]
}
```

---

## 🎯 WORKFLOW COMPLET

### 1. Analyse Initiale

```bash
# Voir quels drivers peuvent être enrichis
node scripts/enrichment/INTELLIGENT_MATCHER_BLAKADDER.js
```

### 2. Test Conversion

```bash
# Vérifier matrices de conversion
node scripts/enrichment/PATHFINDER_CONVERTER.js
```

### 3. Dry Run

```bash
# Simuler enrichissement
node scripts/enrichment/AUTO_ENRICHMENT_ORCHESTRATOR.js --dry-run
```

### 4. Appliquer

```bash
# Enrichir drivers HIGH confidence
node scripts/enrichment/AUTO_ENRICHMENT_ORCHESTRATOR.js
```

### 5. Valider

```bash
# Vérifier aucune erreur
homey app validate --level publish
```

### 6. Commit

```bash
# Si validation OK
git sc -Message "enrich: added verified manufacturer IDs from Blakadder"
```

---

## 🔄 MISE À JOUR CACHE

Cache sources externes: **7 jours**

Forcer refresh:
```bash
rm -rf .cache/
node scripts/enrichment/AUTO_ENRICHMENT_ORCHESTRATOR.js
```

---

## 📈 STATISTIQUES

**Sources Externes:**
- Blakadder: ~1400 devices Tuya
- Zigbee2MQTT: ~900 devices Tuya
- **Total:** ~2300 devices vérifiés

**Conversion Matrices:**
- Manufacturer IDs: 50+ mappings
- Product IDs: 30+ normalisations
- Device Types: 20+ synonymes
- Clusters: 15+ conversions
- Capabilities: 10+ mappings

**Performance:**
- Matching: ~2-3 min (167 drivers)
- Conversion: Instantané
- Enrichissement: ~1 min (high confidence)

---

## 🎊 RÉSULTAT

**Avant:** Manufacturer IDs incomplets, endpoints manquants

**Après:** 
- ✅ Manufacturer IDs complets depuis sources vérifiées
- ✅ Endpoints auto-détectés
- ✅ Capabilities suggérées
- ✅ Configuration optimale Homey

**Compatibilité:** Maximum device support avec minimum effort! 🚀
