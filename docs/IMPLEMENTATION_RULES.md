# 📋 RÈGLES D'IMPLÉMENTATION - Universal Tuya Zigbee v5.5.42

## 🔧 9.20 - HYBRID ZIGBEE / TUYA CLUSTER HANDLING

### 9.20.1. Nommage OBLIGATOIRE des handlers

Pour que le système fonctionne correctement:

**Zigbee standard:**
```javascript
cluster: {
  temperatureMeasurement: {
    attributeReport: (zclData, node) => { ... },
  },
},
boundCluster: {
  iasZone: {
    zoneStatusChangeNotification: (payload) => { ... },
  },
},
```

**Tuya EF00 (DP-based):**
```javascript
tuyaCluster: {
  0xEF00: {
    dpReport: (tuyaDP, node) => { ... },
  },
},
tuyaBoundCluster: {
  dataReport: (data) => { ... },
  dataResponse: (data) => { ... },
},
```

❌ **INTERDIT:**
```javascript
// NE PAS accrocher EF00 sur "cluster"
cluster: {
  0xEF00: { ... }  // MAUVAIS!
}
```

### 9.20.2. Mode HYBRIDE par défaut

Tous les drivers utilisent par défaut:
```javascript
this.hybridClusterMode = {
  enabled: true,
  zigbeeActive: true,
  tuyaActive: true,
  decided: false,
  decidedMode: null, // 'zigbee' | 'tuya' | 'hybrid'
};
```

### 9.20.3. Auto-détection après 15 minutes

```javascript
// Après 15 min d'observation:
if (tuyaHits > 0 && zigbeeHits === 0) {
  // Device = 100% Tuya DP
  disableZigbeeClusters();
  hybridClusterMode.decidedMode = 'tuya';
}

if (zigbeeHits > 0 && tuyaHits === 0) {
  // Device = 100% Zigbee standard
  disableTuyaClusters();
  hybridClusterMode.decidedMode = 'zigbee';
}

// Les deux > 0 = garder hybrid
```

### 9.20.4. Référentiel LOCAL (KnownProtocolsDatabase.js)

**PRIORITÉ AU RÉFÉRENTIEL LOCAL** - pas de connexion internet!

```javascript
// Consulter AVANT l'auto-détection:
const knownInfo = lookupProtocol(manufacturerName, productId);

if (knownInfo) {
  // Utiliser directement le protocole connu
  this.protocol = knownInfo.protocol;
}
```

### 9.20.5. Non-régression

- **NE JAMAIS** désactiver un chemin qui produit des données
- **NE PAS** override la logique existante sans raison
- **TOUJOURS** commenter les migrations

---

## 🔋 9.21 - BATTERY HYBRID MANAGEMENT

### 9.21.1. Sources de données batterie

| Source | Usage | Priorité |
|--------|-------|----------|
| `tuya_dp` | DP4, DP15, DP101 | 1 (préféré pour Tuya) |
| `tuya_state` | Enum low/medium/high | 2 |
| `zcl_percent` | powerConfiguration | 3 |
| `zcl_voltage` | Voltage → courbe | 4 |

### 9.21.2. Algorithmes de calcul

| Algo | Description |
|------|-------------|
| `direct` | Valeur = pourcentage direct |
| `mult2` | Valeur × 2 = pourcentage |
| `div2` | Valeur ÷ 2 = pourcentage |
| `cr2032` | Courbe de décharge CR2032 |
| `alkaline` | Courbe alkaline |
| `lithium` | Courbe lithium (plate) |
| `linear` | Interpolation linéaire min-max |

### 9.21.3. Profils connus (BatteryProfileDatabase.js)

```javascript
'_TZE284_oitavov2': {
  chemistry: 'cr2032',
  source: 'tuya_dp',
  dpId: 15,
  algorithm: 'direct',
},
'_TZE284_vvmbj46n': {
  chemistry: 'cr2032',
  source: 'tuya_dp',
  dpId: 4,
  algorithm: 'mult2',  // value × 2 = percent
},
```

### 9.21.4. Auto-apprentissage

Après 15 minutes:
1. Identifier quelle source a reçu des données
2. Analyser la plage des valeurs reçues
3. Déduire l'algorithme (direct, ×2, ÷2)
4. Désactiver les sources inutiles

---

## 📦 9.22 - DONNÉES LOCALES (PAS D'INTERNET)

### 9.22.1. Principe

**L'app DOIT fonctionner 100% offline** (sauf OTA).

Toutes les données sont embarquées dans:
- `lib/protocol/KnownProtocolsDatabase.js`
- `lib/battery/BatteryProfileDatabase.js`
- `lib/tuya/TuyaDPDatabase.js`

### 9.22.2. Structure d'un profil device

```javascript
{
  // Identification
  manufacturerName: '_TZE284_oitavov2',
  productId: 'TS0601',

  // Protocole
  protocol: 'tuya_dp',  // ou 'zcl_standard', 'hybrid'
  dataMethod: 'tuya_bound',

  // DP Mappings
  dpMappings: {
    3: { capability: 'measure_humidity', divisor: 1 },
    5: { capability: 'measure_temperature', divisor: 10 },
    15: { capability: 'measure_battery', divisor: 1 },
  },

  // Batterie
  battery: {
    chemistry: 'cr2032',
    source: 'tuya_dp',
    dpId: 15,
    algorithm: 'direct',
  },

  // Notes
  notes: 'Soil sensor QT-07S'
}
```

---

## 🏷️ 9.23 - RÈGLES MANUFACTURER/PRODUCTID

### 9.23.1. ProductId → Protocole par défaut

| ProductId | Protocole | Notes |
|-----------|-----------|-------|
| `TS0601` | `tuya_dp` | Toujours Tuya DP (0xEF00) |
| `TS0001-TS0004` | `zcl_standard` | Switches ZCL |
| `TS0011-TS0014` | `zcl_standard` | Switches sans neutre |
| `TS011F` | `hybrid` | Smart plugs |
| `TS0201` | `zcl_standard` | Climate sensors ZCL |
| `TS0202` | `zcl_standard` | Motion sensors IAS |
| `TS0203` | `zcl_standard` | Contact sensors IAS |
| `TS0215A` | `hybrid` | SOS buttons |
| `TS0041-TS0044` | `zcl_standard` | Scene switches |

### 9.23.2. Manufacturer → Tuya DP forcé

Tout manufacturer commençant par:
- `_TZE200_*`
- `_TZE204_*`
- `_TZE284_*`

→ **TOUJOURS** utiliser `tuya_dp` (cluster 0xEF00)

### 9.23.3. Priorité de matching

1. **Exact manufacturerName** → profil spécifique
2. **ProductId pattern** → profil par défaut
3. **Manufacturer prefix** (_TZE*) → Tuya DP
4. **Inconnu** → mode hybrid + auto-détection

---

## 📝 9.24 - COMMENTAIRES OBLIGATOIRES

### 9.24.1. Sur migrations

```javascript
// HYBRID MODE v5.5.42:
// - cluster/boundCluster handle standard Zigbee attributes
// - tuyaCluster/tuyaBoundCluster handle Tuya EF00 DP-based frames
// Auto-detection ensures non-regression and convergence to correct mode.
```

### 9.24.2. Sur DP mappings

```javascript
/**
 * DP Mappings for _TZE284_oitavov2 (Soil Sensor)
 * Source: Z2M tuya.ts + ZHA quirks
 *
 * DP3: soil_moisture (direct %)
 * DP5: temperature (÷10 = °C)
 * DP14: battery_state (enum 0=low, 1=med, 2=high)
 * DP15: battery_percent (direct %)
 */
```

---

## ⚡ 9.25 - FICHIERS CLÉS

| Fichier | Rôle |
|---------|------|
| `lib/protocol/HybridProtocolManager.js` | Gestion protocoles hybride |
| `lib/protocol/KnownProtocolsDatabase.js` | Base protocoles connus |
| `lib/battery/BatteryHybridManager.js` | Gestion batteries hybride |
| `lib/battery/BatteryProfileDatabase.js` | Base profils batteries |
| `lib/clusters/TuyaBoundCluster.js` | Réception dataReport |
| `lib/tuya/TuyaEF00Manager.js` | Gestion cluster 0xEF00 |
| `lib/tuya/TuyaSpecificCluster.js` | Cluster Tuya enregistré |
| `lib/zigbee/registerClusters.js` | Enregistrement clusters |

---

## 🎯 RÉSUMÉ

1. **LOCAL FIRST** - Pas d'internet sauf OTA
2. **HYBRID PAR DÉFAUT** - Écoute tous les protocoles
3. **RÉFÉRENTIEL PRIORITAIRE** - Consulter la base avant auto-détection
4. **AUTO-OPTIMISATION 15 MIN** - Désactive les protocoles inutiles
5. **NON-RÉGRESSION** - Ne pas casser ce qui marche
6. **COMMENTAIRES** - Documenter les migrations
