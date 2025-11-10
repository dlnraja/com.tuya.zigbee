# 🔋 Battery Intelligence System V2 - Documentation Complète

## Vue d'ensemble

Le **Battery Intelligence System V2** est un système ultra-intelligent qui apprend automatiquement les caractéristiques de batterie de chaque manufacturer Zigbee et utilise des mesures physiques (voltage, ampérage) pour fournir des pourcentages de batterie précis.

---

## 🎯 Fonctionnalités Principales

### 1. Homey Persistent Storage
- **API officielle Homey** pour sauvegarde (pas de fichiers)
- Données persistantes entre redémarrages
- `getStoreValue()` / `setStoreValue()` API
- Documentation: https://apps-sdk-v3.developer.homey.app/tutorial-Device.html#persistent-storage

### 2. Cascade de Fallback Multi-Niveau

Le système utilise une cascade intelligente avec 4 niveaux de précision:

#### **NIVEAU 1: Learned Behavior** ✨ (Priorité maximale)
- Manufacturer déjà connu et confirmé
- Transformation apprise (0-100, 0-200, 0-255)
- Confiance: **90%+**
- Auto-confirmation après 3-5 échantillons cohérents

#### **NIVEAU 2: Voltage + Current** 🔬 (Très haute précision)
- Mesures physiques disponibles
- Calcul résistance interne (loi d'Ohm: R = ΔV / I)
- Courbes de décharge par technologie
- Confiance: **95%**
- **Apprend le format de données en même temps**

#### **NIVEAU 3: Voltage Seul** 🌡️ (Haute précision)
- Voltage disponible sans ampérage
- Interpolation sur courbes constructeur
- 5 technologies supportées (CR2032, CR2450, CR2477, AA, AAA)
- Confiance: **85%**

#### **NIVEAU 4: Détection Intelligente** 🧠 (Learning mode)
- Analyse du format (0-100, 0-200, 0-255)
- Détection automatique avec validation voltage si disponible
- Auto-confirmation statistique après 5 échantillons
- Confiance: **50-70%**

### 3. Courbes de Décharge Réelles

Basées sur datasheets constructeurs:

```javascript
CR2032 (Lithium 3V, 225mAh):
100% → 3.0V (Ω=10)
 50% → 2.7V (Ω=28)
 10% → 2.3V (Ω=80)
  0% → 2.0V (Ω=200)

CR2450 (Lithium 3V, 620mAh):
100% → 3.0V (Ω=8)
 50% → 2.8V (Ω=22)
 10% → 2.35V (Ω=60)
  0% → 2.0V (Ω=150)

AA/AAA (Alkaline 1.5V):
100% → 1.5V
 50% → 1.25V
 10% → 0.95V
  0% → 0.8V
```

### 4. Apprentissage Automatique

Le système apprend automatiquement:

- **Format de données** par manufacturer
- **Cohérence** entre valeur brute et mesures physiques
- **Confirmation** après échantillons répétés
- **Sauvegarde** périodique dans Homey Storage

---

## 📚 Architecture

### Base de Données

```javascript
{
  manufacturers: {
    "_TZ3000_mmtwjmaq": {
      dataType: "0-200",           // 0-100, 0-200, 0-255
      confirmed: true,             // Auto-confirmé
      confirmedBy: "physical_measurement",
      samples: [...],              // Derniers 20 échantillons
      voltageSupported: true,
      currentSupported: false,
      batteryType: "CR2032",
      firstSeen: "2025-01-15T10:30:00Z",
      lastUpdated: "2025-01-20T14:45:00Z"
    },
    // ... autres manufacturers
  },
  statistics: {
    totalDevices: 167,
    learnedDevices: 142,
    accuracyRate: 85
  },
  version: "2.0.0"
}
```

### Méthodes Principales

#### `async analyzeValue(rawValue, manufacturerName, voltage, current, batteryType)`

Analyse intelligente multi-niveau avec cascade de fallback.

**Paramètres:**
- `rawValue` - Valeur brute du cluster Zigbee
- `manufacturerName` - Nom du manufacturer (ex: "_TZ3000_mmtwjmaq")
- `voltage` - Tension batterie en volts (optionnel)
- `current` - Courant en mA (optionnel)
- `batteryType` - Type batterie: CR2032, CR2450, AA, AAA (optionnel)

**Retourne:**
```javascript
{
  percent: 85,                    // Pourcentage calculé
  confidence: 0.95,               // Niveau de confiance
  method: "voltage_and_current",  // Méthode utilisée
  source: "physical_measurement", // Source des données
  needsLearning: false           // Besoin de sauvegarder?
}
```

#### `calculatePercentFromVoltage(voltage, batteryType)`

Calcul basé uniquement sur voltage avec courbes réelles.

#### `calculatePercentFromVoltageAndCurrent(voltage, current, batteryType)`

Calcul avancé avec résistance interne pour maximum de précision.

---

## 🔧 Intégration dans Driver

### device.js

```javascript
const BatteryIntelligenceSystemV2 = require('../../utils/battery-intelligence-system-v2');

class MyDevice extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    // Initialiser le système
    try {
      this.batterySystem = new BatteryIntelligenceSystemV2(this);
      await this.batterySystem.load();
      this.log('✅ Battery Intelligence System V2 loaded');
    } catch (err) {
      this.log('⚠️  Fallback to basic mode');
    }
    
    // Enregistrer capability batterie
    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
      get: 'batteryPercentageRemaining',
      report: 'batteryPercentageRemaining',
      reportParser: async (value) => {
        // Récupérer manufacturerName
        const manufacturerName = this.getData().manufacturerName || 'unknown';
        
        // Essayer de récupérer voltage + current
        let voltage = null;
        let current = null;
        try {
          const attrs = await zclNode.endpoints[1].clusters.powerConfiguration
            .readAttributes(['batteryVoltage', 'batteryCurrentCapacity'])
            .catch(() => ({}));
          
          if (attrs.batteryVoltage) voltage = attrs.batteryVoltage / 10;
          if (attrs.batteryCurrentCapacity) current = attrs.batteryCurrentCapacity / 1000;
        } catch (err) {
          // Mesures non disponibles
        }
        
        // CASCADE DE FALLBACK
        if (this.batterySystem) {
          const batteryType = this.getSetting('battery_type') || 'CR2032';
          const analysis = await this.batterySystem.analyzeValue(
            value, manufacturerName, voltage, current, batteryType
          );
          
          // Sauvegarder si learning
          if (analysis.needsLearning) {
            await this.batterySystem.save().catch(this.error);
          }
          
          return analysis.percent;
        }
        
        // FALLBACK NIVEAU 2: Voltage simple
        if (voltage) {
          return this.calculateSimpleVoltagePercent(voltage, 'CR2032');
        }
        
        // FALLBACK NIVEAU 3: Détection format
        if (value <= 100) return value;
        if (value <= 200) return value / 2;
        if (value <= 255) return Math.round(value / 2.55);
        return Math.min(100, value);
      }
    });
  }
  
  async onDeleted() {
    // Sauvegarder avant suppression
    if (this.batterySystem) {
      await this.batterySystem.save();
    }
  }
}
```

---

## 🎓 Avantages du Système

### 1. Précision Maximale
- Mesures physiques (voltage + ampérage)
- Courbes constructeur réelles
- Learning par manufacturer

### 2. Robustesse
- 4 niveaux de fallback
- Gestion gracieuse des erreurs
- Fonctionne même sans voltage

### 3. Intelligence
- Auto-apprentissage
- Confirmation automatique
- Détection incohérences

### 4. Performance
- Persistance via Homey API
- Pas de fichiers système
- Sauvegarde asynchrone

---

## 📊 Exemples de Cas d'Usage

### Cas 1: Device avec Voltage + Current
```
Input: value=180, voltage=2.8V, current=50mA, manufacturer="_TZ3000_mmtwjmaq"

→ NIVEAU 2: Voltage + Current
→ Résistance: (3.0-2.8)/0.05 = 4Ω
→ Courbe CR2032: 4Ω ≈ 90%
→ Apprend: format 0-200 (180/2 = 90% cohérent)
→ Résultat: 90% (confiance 95%)
```

### Cas 2: Device sans mesures physiques (1ère fois)
```
Input: value=180, manufacturer="_TZE200_unknown"

→ NIVEAU 4: Learning
→ Détecte: probablement 0-200 (valeur > 100)
→ Calcule: 180/2 = 90%
→ Sauvegarde échantillon
→ Résultat: 90% (confiance 55%)
```

### Cas 3: Device appris
```
Input: value=90, manufacturer="_TZ3000_mmtwjmaq" (connu: 0-200)

→ NIVEAU 1: Learned
→ Transformation confirmée: valeur / 2
→ Calcule: 90/2 = 45%
→ Résultat: 45% (confiance 90%)
```

### Cas 4: Validation avec voltage
```
Input: value=180, voltage=2.7V, manufacturer="_TZ3000_mmtwjmaq"

→ NIVEAU 1: Learned (0-200 confirmé)
→ Calcul: 180/2 = 90%
→ Validation voltage: 2.7V (CR2032) = 50%
→ Incohérence détectée! (90% vs 50% = 40% diff)
→ Ajustement: moyenne pondérée 70%-30%
→ Résultat: 78% (confiance 92%)
```

---

## 🔍 Debugging & Monitoring

Le système log toutes ses opérations:

```
🔋 Battery raw value: 180
🔋 Battery voltage: 2.8V
🔋 Battery current: 50mA
🔋 Advanced: V=2.8V, I=50A, R=4.0Ω → 90%
✅ Using learned behavior for _TZ3000_mmtwjmaq
🔋 Intelligent V2 analysis: { percent: 90, confidence: 0.95, method: 'voltage_and_current', source: 'physical_measurement' }
✅ Battery Intelligence saved to Homey Storage
```

---

## 🚀 Évolutions Futures

### Version 2.1
- Support pour plus de technologies (CR123A, 18650)
- Détection température ambiante
- Prédiction durée de vie restante

### Version 2.2
- Machine learning avancé
- Détection anomalies
- Alertes batterie faible intelligentes

### Version 3.0
- API cloud pour partage données
- Benchmarks communautaires
- Optimisation par usage device

---

## 📖 Références

- **Homey SDK3 Storage**: https://apps-sdk-v3.developer.homey.app/tutorial-Device.html#persistent-storage
- **Zigbee Cluster Library**: Power Configuration (cluster 0x0001)
- **Battery Datasheets**: Panasonic, Energizer, Duracell
- **Loi d'Ohm**: R = V / I (résistance interne)

---

**Auteur:** Dylan Rajasekaram  
**Version:** 2.0.0  
**Date:** 2025-10-12  
**Projet:** Universal Tuya Zigbee v2.15.21
