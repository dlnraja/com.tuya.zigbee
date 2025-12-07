# Lib - Universal Tuya Zigbee Library v5.5.47

> Architecture complète pour la gestion des devices Tuya et Zigbee standard.

---

## 📁 Structure des Modules

```
lib/
├── devices/           ← Classes de base pour drivers
├── battery/           ← Gestion batterie ultra-précise
├── tuya/              ← Gestion Tuya EF00/DP
├── protocol/          ← Auto-détection protocole
├── clusters/          ← Clusters personnalisés
├── zigbee/            ← Enregistrement clusters
└── utils/             ← Utilitaires
```

---

## 🔧 devices/ - Classes de Base

### TuyaHybridDevice.js (v5.5.46)
**Classe de base pour TOUS les devices hybrides Tuya/Zigbee**

```javascript
const TuyaHybridDevice = require('../../lib/devices/TuyaHybridDevice');

class MyDevice extends TuyaHybridDevice {
  // Mappings Tuya DP
  get dpMappings() {
    return {
      3: { capability: 'measure_humidity', divisor: 1 },
      5: { capability: 'measure_temperature', divisor: 10 },
    };
  }

  // Configuration batterie
  get batteryConfig() {
    return {
      chemistry: BatteryCalculator.CHEMISTRY.CR2032,
      algorithm: BatteryCalculator.ALGORITHM.DIRECT,
      dpId: 15,
      dpIdState: 14,
    };
  }

  // Handlers ZCL standard
  get clusterHandlers() {
    return {
      temperatureMeasurement: {
        attributeReport: (data) => { ... }
      }
    };
  }
}
```

**Fonctionnalités:**
- ✅ Mode hybride (Tuya + Zigbee simultanés)
- ✅ Auto-décision après 15 min
- ✅ Listeners directs sur `clusters.tuya`
- ✅ Raw frame parser fallback
- ✅ Intégration BatteryCalculator

---

## 🔋 battery/ - Gestion Batterie Ultra-Précise

### BatteryCalculator.js (v5.5.47)
**Calcul batterie avec courbes de décharge non-linéaires**

```javascript
const BatteryCalculator = require('../../lib/battery/BatteryCalculator');

// Méthode principale
const percent = BatteryCalculator.calculate(rawValue, {
  algorithm: BatteryCalculator.ALGORITHM.VOLTAGE_CURVE,
  chemistry: BatteryCalculator.CHEMISTRY.CR2032,
});

// Conversion voltage → % avec courbe
const percent = BatteryCalculator.voltageToPercentCurve(2.85, 'cr2032');
// → 70% (et non 85% en linéaire!)
```

**4 Méthodes de calcul:**
| Méthode | Description |
|---------|-------------|
| `DIRECT` | Valeur = pourcentage |
| `MULT2` | Valeur × 2 |
| `VOLTAGE_CURVE` | Courbe non-linéaire par chimie |
| `ENUM_3` | États discrets (low/med/high) |

**Chimies supportées:**
- CR2032, CR2450, CR123A
- Alkaline AA/AAA
- Li-ion/LiPo (4.2-3.0V)
- LiFePO4 (3.6-2.5V)
- NiMH

### BatteryProfileDatabase.js
Base de données locale des profils batterie par manufacturerName.

---

## 📡 tuya/ - Gestion Tuya EF00

### TuyaSpecificCluster.js
**Cluster 0xEF00 avec NAME='tuya'**

```javascript
// Accès via:
zclNode.endpoints[1].clusters.tuya.on('response', (data) => {...});
zclNode.endpoints[1].clusters.tuya.on('reporting', (data) => {...});
```

### TuyaEF00Manager.js
Gestion complète des DataPoints Tuya.

### TuyaDevicesDatabase.js
Base de données locale des 2100+ devices Tuya.

---

## 🔄 protocol/ - Auto-Détection

### KnownProtocolsDatabase.js
Référentiel LOCAL des protocoles connus (pas d'internet!).

### HybridProtocolManager.js
Auto-détection avec fallback après 15 minutes.

---

## 📋 Usage Standard

```javascript
// Pour un nouveau driver capteur:
const TuyaHybridDevice = require('../../lib/devices/TuyaHybridDevice');
const BatteryCalculator = require('../../lib/battery/BatteryCalculator');

class MySensor extends TuyaHybridDevice {
  get mainsPowered() { return false; }

  get dpMappings() { return { ... }; }
  get batteryConfig() { return { ... }; }
  get clusterHandlers() { return { ... }; }
}
```

---

## 📌 Standards de Code

- ✅ Toutes les données LOCALES (pas d'internet)
- ✅ Auto-apprentissage après 15 min
- ✅ Pas de polling agressif (batterie!)
- ✅ JSDoc complet
- ✅ Logs structurés `[MODULE]`
