# ⚡ GESTION HYBRIDE DE L'ALIMENTATION - SYSTÈME INTELLIGENT

**Version**: v4.7.6+  
**Lib**: `BaseHybridDevice.js` + `BatteryManager.js` + `PowerManager.js`  
**Principe**: **AUTO-DÉTECTION** intelligente avec fallback

---

## 🎯 PRINCIPE FONDAMENTAL

### ❌ ERREUR PRÉCÉDENTE
```javascript
// MAUVAIS: Supprimer energy.batteries
"energy": {}  // ← Casse le fallback detection!
```

### ✅ APPROCHE CORRECTE
```javascript
// BON: Garder config HYBRIDE complète
"capabilities": ["onoff", "measure_battery"],
"energy": {
  "batteries": ["CR2032", "CR2450", "AAA", "AA", "INTERNAL"]
}

// BaseHybridDevice détectera automatiquement:
// - Si AC/DC → SUPPRIME measure_battery
// - Si Battery → GARDE measure_battery + alertes seuils
```

---

## 🔍 SYSTÈME DE DÉTECTION (Auto)

### Étape 1: Lecture Power Source Attribute
```javascript
// Cluster 0x0000 (Basic), Attribute 0x0007 (powerSource)
const powerSource = await basicCluster.readAttributes(['powerSource']);

// Valeurs Zigbee:
// 0x01/0x02 → AC Mains
// 0x03      → Battery
// 0x04      → DC Source
```

### Étape 2: Fallback si Échec
```javascript
if (driverManifest.energy?.batteries) {
  // Fallback: Battery
  this.powerType = 'BATTERY';
  this.batteryType = batteries[0];
} else if (capabilities.includes('measure_power')) {
  // Fallback: AC Mains
  this.powerType = 'AC';
}
```

### Étape 3: Override Manuel (Settings)
```javascript
// Utilisateur peut forcer le type:
power_source: "auto" | "ac" | "dc" | "battery"
battery_type: "auto" | "CR2032" | "AAA" | "AA" | etc.
```

---

## 🔋 GESTION BATTERIE INTELLIGENTE

### Auto-Détection Type Batterie (Voltage)
```javascript
// BatteryManager.detectBatteryTypeFromVoltage(voltage)

Voltage ranges:
2.8-3.2V → CR2032, CR2450, CR2477 (3V button cells)
1.3-1.7V → AAA, AA (1.5V alkaline)
2.7-3.7V → CR123A (3V lithium)
3.0-4.2V → INTERNAL (Li-ion/LiPo)
```

### Calcul Pourcentage Précis
```javascript
// BatteryManager.calculateBatteryPercentage(voltage, batteryType)

CR2032:
3.0V = 100%
2.8V = 75%
2.5V = 25%
2.2V = 0%

AA/AAA:
1.5V = 100%
1.3V = 50%
1.1V = 10%
1.0V = 0%
```

### Alertes de Seuil (Pourcentage)
```javascript
// Settings configurables par utilisateur
battery_low_threshold: 20%      // Seuil batterie faible
battery_critical_threshold: 10% // Seuil critique

// Flow Triggers automatiques:
// - "Battery below 20%" → Warning
// - "Battery below 10%" → Critical
// - "Battery status changed" → Info
```

### État de Santé Batterie
```javascript
// BatteryManager.getBatteryHealth(percentage, voltage, type)

Status:
- EXCELLENT (90-100%)
- GOOD (70-89%)
- FAIR (50-69%)
- POOR (20-49%)
- CRITICAL (<20%)
- REPLACE (<10%)

Recommendation:
"Battery in excellent condition"
"Consider replacing battery soon"
"Replace battery immediately"
```

---

## ⚡ GESTION AC/DC INTELLIGENTE

### Détection Capabilities Disponibles
```javascript
// PowerManager.detectPowerCapabilities(zclNode)

Détecte automatiquement:
✅ measure_voltage   (Cluster 2820 - Electrical Measurement)
✅ measure_current   (Cluster 2820)
✅ measure_power     (Cluster 2820)
✅ meter_power       (Cluster 1794 - Metering)
```

### Ajout/Suppression Dynamique
```javascript
// Si AC/DC détecté:
if (powerCapabilities.hasPowerMeasurement) {
  await this.addCapability('measure_power');
  await this.addCapability('meter_power');
}

// Si NON mesurable:
if (!available.hasPowerMeasurement && !canEstimate) {
  await this.removeCapability('measure_power');
  // Marque comme "Non disponible" au lieu d'erreur
}

// Si Battery détecté:
await this.removeCapability('measure_power');
await this.removeCapability('meter_power');
```

### Estimation Intelligente
```javascript
// Si measure_power absent mais AC/DC confirmé
if (enable_power_estimation === true) {
  // Estimation basée sur:
  // - Voltage * Current (si disponibles)
  // - Usage constant (energy.approximation.usageConstant)
  // - Valeur typique du device type
  
  this.setCapabilityValue('measure_power', estimatedWatts);
}
```

---

## 📊 CONFIGURATION DRIVER (Template)

### Switch 2-Gang HYBRIDE
```json
{
  "class": "socket",
  "capabilities": [
    "onoff",
    "onoff.switch_2",
    "measure_battery"  // ✅ GARDER pour detection
  ],
  "capabilitiesOptions": {
    "measure_battery": {
      "title": { "en": "Battery" },
      "preventInsights": false
    }
  },
  "energy": {
    "batteries": [
      "CR2032",    // Button cell 3V
      "CR2450",    // Button cell 3V large
      "CR2477",    // Button cell 3V XL
      "AAA",       // 1.5V alkaline
      "AA",        // 1.5V alkaline
      "CR123A",    // 3V lithium
      "INTERNAL"   // Li-ion/LiPo rechargeable
    ],
    "approximation": {
      "usageConstant": 0.5  // Watts (si AC sans mesure)
    }
  },
  "settings": [
    {
      "id": "power_source",
      "type": "dropdown",
      "value": "auto",
      "values": [
        { "id": "auto", "label": { "en": "Auto Detect" } },
        { "id": "ac", "label": { "en": "AC Powered" } },
        { "id": "dc", "label": { "en": "DC Powered" } },
        { "id": "battery", "label": { "en": "Battery Powered" } }
      ]
    },
    {
      "id": "battery_type",
      "type": "dropdown",
      "value": "auto",
      "values": [
        { "id": "auto", "label": { "en": "Auto Detect" } },
        { "id": "CR2032", "label": { "en": "CR2032 (3V)" } },
        { "id": "AAA", "label": { "en": "AAA (1.5V)" } },
        { "id": "AA", "label": { "en": "AA (1.5V)" } },
        { "id": "INTERNAL", "label": { "en": "Rechargeable" } }
      ]
    },
    {
      "id": "battery_low_threshold",
      "type": "number",
      "value": 20,
      "min": 0,
      "max": 50,
      "step": 5,
      "hint": { "en": "Trigger warning at %" }
    },
    {
      "id": "battery_critical_threshold",
      "type": "number",
      "value": 10,
      "min": 0,
      "max": 30,
      "step": 5,
      "hint": { "en": "Trigger critical at %" }
    },
    {
      "id": "enable_power_estimation",
      "type": "checkbox",
      "value": true,
      "hint": { "en": "Estimate power if not measurable" }
    }
  ]
}
```

---

## 🔄 COMPORTEMENT RUNTIME

### Scénario 1: Switch Mural AC (BSEED)
```
1. Pairing → detectPowerSource()
2. Read powerSource attribute → 0x01 (AC Mains)
3. powerType = 'AC'
4. configurePowerCapabilities():
   - Remove measure_battery ✅
   - Check for measure_power → Absent
   - enable_power_estimation=true → Add estimated
5. User voit: onoff, onoff.switch_2 (PAS battery)
```

### Scénario 2: Switch Sans Fil Battery
```
1. Pairing → detectPowerSource()
2. Read powerSource attribute → 0x03 (Battery)
3. powerType = 'BATTERY'
4. Detect voltage → 3.0V → CR2032
5. configurePowerCapabilities():
   - Keep measure_battery ✅
   - Calculate percentage: 100%
   - Setup thresholds: 20%, 10%
6. User voit: onoff, onoff.switch_2, measure_battery (100%)
```

### Scénario 3: Fallback (PowerSource absent)
```
1. detectPowerSource() → Attribute unavailable
2. fallbackPowerDetection()
3. Check energy.batteries → ["CR2032", ...]
4. powerType = 'BATTERY' (safe default)
5. batteryType = 'CR2032' (first in array)
6. Comportement identique Scénario 2
```

---

## ⚠️ POINTS CRITIQUES

### ❌ NE JAMAIS FAIRE:
```javascript
// MAUVAIS: Supprimer energy.batteries
"energy": {}

// MAUVAIS: Supprimer measure_battery capability
"capabilities": ["onoff"]  // Sans measure_battery!

// MAUVAIS: Hardcoder le power type
this.powerType = 'AC';  // Pas de détection!
```

### ✅ TOUJOURS FAIRE:
```javascript
// BON: Config HYBRIDE complète
"capabilities": ["onoff", "measure_battery"],
"energy": { "batteries": [...] }

// BON: Laisser BaseHybridDevice détecter
await this.detectPowerSource();  // Auto!

// BON: Settings pour override manuel
power_source: "auto"  // User peut forcer si besoin
```

---

## 📈 MÉTRIQUES & MONITORING

### Battery Health Tracking
```javascript
// Stocké dans device.store
{
  "power_type": "BATTERY",
  "battery_type": "CR2032",
  "battery_voltage": 2.95,
  "battery_health": {
    "status": "GOOD",
    "percentage": 87,
    "recommendation": "Battery in good condition"
  },
  "last_battery_check": "2025-10-24T23:00:00Z"
}
```

### Power Capabilities Tracking
```javascript
// Pour AC/DC devices
{
  "power_type": "AC",
  "power_capabilities": {
    "hasVoltageMeasurement": false,
    "hasCurrentMeasurement": false,
    "hasPowerMeasurement": false,
    "hasEnergyMeasurement": false
  },
  "power_estimation_enabled": true
}
```

---

## 🚀 BÉNÉFICES SYSTÈME HYBRIDE

### Pour l'Utilisateur:
✅ **Transparence totale**: Batterie affichée SI présente  
✅ **Alertes intelligentes**: Seuils personnalisables  
✅ **Santé batterie**: Recommandations proactives  
✅ **Estimation smart**: Pas d'"Indisponible" inutile

### Pour le Développeur:
✅ **Zero configuration**: Auto-détection automatique  
✅ **Fallback robuste**: Marche même si détection échoue  
✅ **Override manuel**: User peut forcer si problème  
✅ **SDK3 compliant**: NO alarm_battery, measure_battery only

### Pour la Maintenance:
✅ **Debugging facile**: Logs clairs du power type  
✅ **Health monitoring**: État batterie stocké  
✅ **Unified codebase**: Tous devices utilisent BaseHybridDevice

---

## 📝 CHECKLIST IMPLÉMENTATION

Pour chaque driver HYBRIDE:

- [ ] `capabilities` inclut `measure_battery`
- [ ] `energy.batteries` array complet (7+ types)
- [ ] `energy.approximation.usageConstant` défini
- [ ] Settings `power_source` avec "auto" par défaut
- [ ] Settings `battery_type` avec "auto" par défaut
- [ ] Settings seuils batterie (20%, 10%)
- [ ] Settings `enable_power_estimation`
- [ ] Driver extends BaseHybridDevice (dans device.js)
- [ ] Pas de logique power hardcodée dans device.js

---

**⚡ SYSTÈME HYBRIDE INTELLIGENT - AUTO-DÉTECTION COMPLÈTE ! 🔋✨**

**Règle d'or**: BaseHybridDevice gère TOUT. Driver fournit juste la CONFIG complète.
