# 🔋 AMÉLIORATION GESTION BATTERIES & ÉNERGIES - TUYA ZIGBEE APP
## Analyse Approfondie Forum Homey + SDK3 Best Practices

**Document Créé:** 19 Nov 2024
**Version App:** 4.9.360+
**Référence:** Forum Homey Community + Homey Apps SDK3 Documentation

---

## 📊 PROBLÈMES IDENTIFIÉS (Forum + Logs)

### 1. **Batteries Non Mises à Jour**
**Symptômes:**
- Utilisateurs rapportent batteries toujours à 100%
- Pas de mise à jour après pairing
- Alarmes batteries basses ne se déclenchent pas

**Causes Identifiées:**
```javascript
// ❌ PROBLÈME: reportParser peut bloquer l'update
reportParser: value => value / 2  // Division simple mais synchrone

// ❌ PROBLÈME: Pas de logging pour debug
setCapabilityValue('measure_battery', percentage)
```

**Impacts:**
- Utilisateurs ne savent pas quand changer batteries
- Risque de perte dispositifs critiques (détecteurs fumée, contacts)
- Mauvaise expérience utilisateur

---

### 2. **Configuration Reporting Inadéquate**
**Problème Actuel:**
```javascript
// ❌ Configuration trop fréquente = épuise batterie
configureAttributeReporting({
  minInterval: 60,      // Trop court pour batterie
  maxInterval: 3600,    // 1h trop court
  minChange: 5          // Trop sensible
})
```

**Recommandations SDK3:**
- **minInterval:** 3600-7200s (1-2h) pour batteries
- **maxInterval:** 43200-86400s (12-24h) pour batteries
- **minChange:** 10-20% (évite spam updates)

---

### 3. **Absence de Gestion Énergie Permanente**
**Devices Concernés:**
- Switches alimentés (non batterie)
- USB outlets
- Thermostats filaires
- Prises murales

**Problème:** Code traite tout comme batterie
```javascript
// ❌ Pas de différenciation
this.registerCapability('measure_battery', ...)
// Devrait vérifier si device est sur secteur!
```

---

### 4. **Calcul Batterie Incorrect**
**Patterns Identifiés:**

```javascript
// ❌ MAUVAIS: Division simple
const percentage = value / 2;

// ✅ BON: Utiliser BatteryCalculator.js
const calculator = new BatteryCalculator();
const percentage = calculator.calculate(value, deviceType);
```

**Problème:** Différents devices Tuya utilisent différentes échelles:
- Certains: 0-200 (0-100%)
- Autres: 0-100 (direct)
- Autres: Voltage 2.0-3.0V

---

## 🎯 SOLUTIONS PROPOSÉES

### **SOLUTION 1: Améliorer BatteryCalculator.js**

Notre `lib/BatteryCalculator.js` existe déjà mais n'est pas utilisé partout!

**Action:**
1. ✅ Déjà créé avec VOLTAGE_RANGES
2. ❌ **PAS UTILISÉ** dans la plupart des drivers
3. 🔧 **À FAIRE:** Intégrer partout

**Exemple d'intégration:**
```javascript
// Dans chaque driver avec batterie
const BatteryCalculator = require('../../lib/BatteryCalculator');

async onNodeInit() {
  this.batteryCalculator = new BatteryCalculator();

  // Déterminer type de device pour calcul correct
  const deviceType = this.getData().modelId || 'default';

  this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
    get: 'batteryPercentageRemaining',
    reportParser: async value => {
      this.log(`📊 [BATTERY] Raw value: ${value}`);

      // Utiliser calculator pour conversion précise
      const percentage = this.batteryCalculator.calculate(value, deviceType);

      this.log(`🔋 [BATTERY] Calculated: ${percentage}%`);

      // Update alarme si nécessaire
      await this.updateBatteryAlarm(percentage);

      return percentage;
    },
    reportOpts: {
      configureAttributeReporting: {
        minInterval: 3600,    // 1h minimum
        maxInterval: 43200,   // 12h maximum
        minChange: 10         // 5% change
      }
    }
  });
}

async updateBatteryAlarm(percentage) {
  if (!this.hasCapability('alarm_battery')) return;

  const threshold = this.getSetting('battery_low_threshold') || 20;
  const isLow = percentage < threshold;

  this.log(`⚠️ [BATTERY ALARM] ${percentage}% vs threshold ${threshold}%: ${isLow ? 'LOW' : 'OK'}`);

  await this.setCapabilityValue('alarm_battery', isLow);
}
```

---

### **SOLUTION 2: Différencier Devices Secteur vs Batterie**

**Créer:** `lib/PowerSourceDetector.js`

```javascript
class PowerSourceDetector {
  static isPowered(device) {
    const modelId = device.getData().modelId || '';

    // Devices TOUJOURS sur secteur
    const poweredPatterns = [
      'TS0121',  // Plugs/Outlets
      'TS011F',  // Smart plugs
      'TS0601_thermostat', // Thermostats filaires
      'switch_', // Wall switches
      'dimmer_', // Dimmers muraux
      'curtain_motor' // Moteurs rideaux (optionnel)
    ];

    return poweredPatterns.some(pattern => modelId.includes(pattern));
  }

  static getBatteryReportingConfig(deviceType) {
    // Configuration adaptée par type
    const configs = {
      sensor: {
        minInterval: 7200,  // 2h
        maxInterval: 86400, // 24h
        minChange: 10
      },
      motion: {
        minInterval: 3600,  // 1h (plus actif)
        maxInterval: 43200, // 12h
        minChange: 15
      },
      contact: {
        minInterval: 7200,  // 2h
        maxInterval: 86400, // 24h
        minChange: 10
      },
      remote: {
        minInterval: 14400,  // 4h (moins actif)
        maxInterval: 86400,  // 24h
        minChange: 20
      }
    };

    return configs[deviceType] || configs.sensor;
  }
}

module.exports = PowerSourceDetector;
```

**Usage dans drivers:**
```javascript
const PowerSourceDetector = require('../../lib/PowerSourceDetector');

async onNodeInit() {
  // Vérifier source énergie
  if (PowerSourceDetector.isPowered(this)) {
    this.log('⚡ Device powered by mains - NO battery monitoring');
    // Ne PAS configurer measure_battery!
    return;
  }

  // Device sur batterie
  this.log('🔋 Battery-powered device - configuring monitoring');
  const config = PowerSourceDetector.getBatteryReportingConfig('sensor');

  // Setup avec config optimisée
  await this.setupBatteryMonitoring(config);
}
```

---

### **SOLUTION 3: Améliorer Logging Batterie**

**Pattern Actuel:**
```javascript
// ❌ Pas assez d'info pour debug
this.log('Battery:', percentage);
```

**Pattern Amélioré:**
```javascript
// ✅ Logging complet pour diagnostic
this.log('─────────────────────────────');
this.log('🔋 BATTERY UPDATE');
this.log('  Raw Value:', rawValue);
this.log('  Calculated:', percentage, '%');
this.log('  Previous:', this.getCapabilityValue('measure_battery'), '%');
this.log('  Threshold:', this.getSetting('battery_low_threshold') || 20, '%');
this.log('  Alarm:', this.getCapabilityValue('alarm_battery') ? '⚠️ LOW' : '✅ OK');
this.log('  Last Update:', new Date().toISOString());
this.log('─────────────────────────────');
```

**Bénéfices:**
- Utilisateurs peuvent partager logs précis sur forum
- Support peut diagnostiquer rapidement
- Développeurs voient patterns bizarres

---

### **SOLUTION 4: Settings Utilisateur pour Batteries**

**Ajouter dans app.json (settings):**
```json
{
  "id": "battery_monitoring",
  "type": "group",
  "label": {
    "en": "Battery & Power Management",
    "fr": "Gestion Batterie & Énergie"
  },
  "children": [
    {
      "id": "battery_low_threshold",
      "type": "number",
      "label": {
        "en": "Low battery threshold (%)",
        "fr": "Seuil batterie faible (%)"
      },
      "value": 20,
      "min": 5,
      "max": 50,
      "hint": {
        "en": "Trigger alarm when battery drops below this level",
        "fr": "Déclencher alarme quand batterie passe sous ce niveau"
      }
    },
    {
      "id": "battery_report_interval",
      "type": "dropdown",
      "label": {
        "en": "Battery reporting interval",
        "fr": "Intervalle rapport batterie"
      },
      "value": "standard",
      "values": [
        {
          "id": "eco",
          "label": {
            "en": "Eco (24h) - Longer battery life",
            "fr": "Éco (24h) - Durée batterie maximale"
          }
        },
        {
          "id": "standard",
          "label": {
            "en": "Standard (12h) - Balanced",
            "fr": "Standard (12h) - Équilibré"
          }
        },
        {
          "id": "frequent",
          "label": {
            "en": "Frequent (4h) - More updates",
            "fr": "Fréquent (4h) - Plus de mises à jour"
          }
        }
      ]
    },
    {
      "id": "battery_debug_logging",
      "type": "checkbox",
      "label": {
        "en": "Enable detailed battery logging",
        "fr": "Activer logs batterie détaillés"
      },
      "value": false,
      "hint": {
        "en": "Help diagnose battery reporting issues (increases log size)",
        "fr": "Aide diagnostiquer problèmes batteries (augmente logs)"
      }
    }
  ]
}
```

---

### **SOLUTION 5: Proactive Battery Read au Pairing**

**Problème Forum:** Batteries restent à 0% après pairing

**Solution:**
```javascript
async onNodeInit() {
  await super.onNodeInit();

  // Attendre que device soit prêt
  await this.wait(2000);

  // FORCE lecture initiale batterie
  if (this.hasCapability('measure_battery')) {
    try {
      this.log('🔍 [INIT] Reading initial battery level...');

      const batteryLevel = await this.zclNode.endpoints[1]
        .clusters.powerConfiguration
        .readAttributes(['batteryPercentageRemaining']);

      this.log('✅ [INIT] Battery read:', batteryLevel);

      // Process value
      if (batteryLevel?.batteryPercentageRemaining !== undefined) {
        const percentage = this.batteryCalculator.calculate(
          batteryLevel.batteryPercentageRemaining,
          this.getData().modelId
        );

        await this.setCapabilityValue('measure_battery', percentage);
        this.log(`🔋 [INIT] Battery set to ${percentage}%`);
      }
    } catch (err) {
      this.error('❌ [INIT] Failed to read initial battery:', err.message);
      // Non-critique, reporting configuré prendra le relais
    }
  }
}
```

---

## 🚀 PLAN D'IMPLÉMENTATION

### **Phase 1: Infrastructure (PRIORITÉ 1)** 🔴
**Fichiers à créer/modifier:**
1. ✅ `lib/BatteryCalculator.js` - Déjà existe
2. 🆕 `lib/PowerSourceDetector.js` - À créer
3. 🆕 `lib/BatteryMonitoringMixin.js` - Mixin réutilisable

**Temps estimé:** 2-3 heures

---

### **Phase 2: Intégration Drivers (PRIORITÉ 2)** 🟠
**Drivers à mettre à jour (par priorité usage):**

**Critiques (batterie + sécurité):**
1. `contact_sensor*` (8 variants)
2. `motion_sensor*` (6 variants)
3. `smoke_detector*` (4 variants)
4. `water_leak_sensor*` (4 variants)
5. `doorbell_button`

**Importants (batterie + confort):**
6. `button_wireless*` (5 variants)
7. `scene_controller*`
8. `climate_monitor*`
9. `temperature_sensor*`

**Temps estimé:** 4-6 heures

---

### **Phase 3: Devices Secteur (PRIORITÉ 3)** 🟡
**Retirer monitoring batterie:**
1. `switch_*gang` (15+ variants)
2. `dimmer_*`
3. `usb_outlet_*`
4. `thermostat_*` (si filaire)

**Temps estimé:** 2-3 heures

---

### **Phase 4: Settings & UI (PRIORITÉ 4)** 🟢
1. Ajouter settings batterie dans `app.json`
2. Update README avec section batterie
3. Créer FAQ batterie

**Temps estimé:** 1-2 heures

---

## 📝 CHECKLIST D'IMPLÉMENTATION

### Infrastructure
- [ ] Créer `PowerSourceDetector.js`
- [ ] Créer `BatteryMonitoringMixin.js`
- [ ] Améliorer `BatteryCalculator.js` avec plus de types
- [ ] Tester sur devices réels

### Drivers Batterie (Top 10 prioritaires)
- [ ] contact_sensor
- [ ] contact_sensor_magnet
- [ ] motion_sensor
- [ ] motion_sensor_pir
- [ ] smoke_detector
- [ ] water_leak_sensor
- [ ] doorbell_button
- [ ] button_wireless
- [ ] climate_monitor
- [ ] temperature_sensor

### Drivers Secteur (retirer batterie)
- [ ] switch_1gang → switch_8gang
- [ ] dimmer_smart
- [ ] usb_outlet_1gang
- [ ] thermostat_* (vérifier modèles)

### Tests & Validation
- [ ] Test pairing nouveau device batterie
- [ ] Test update batterie après X heures
- [ ] Test alarme batterie faible
- [ ] Test devices secteur (pas de batterie)
- [ ] Valider logs avec utilisateurs forum

### Documentation
- [ ] Update README section batteries
- [ ] Créer BATTERY_FAQ.md
- [ ] Ajouter exemples logs pour support
- [ ] Document settings utilisateur

---

## 🎓 RESSOURCES & RÉFÉRENCES

### Homey SDK3 Documentation
- **Power Configuration Cluster:** https://apps-sdk-v3.developer.homey.app/tutorial-Zigbee-PowerConfiguration.html
- **Zigbee Clusters:** https://apps-sdk-v3.developer.homey.app/tutorial-Zigbee-Clusters.html
- **Best Practices:** https://apps-sdk-v3.developer.homey.app/tutorial-BestPractices.html

### Forum Homey
- **Battery Issues:** Rechercher "Tuya battery not updating"
- **Energy Reporting:** Rechercher "Zigbee reporting configuration"
- **Diagnostic PDFs:** Analysés (voir `pdfhomey/`)

### Zigbee Specification
- **Power Configuration Cluster (0x0001):** Attributes 0x0020-0x0033
- **Battery Percentage Remaining:** 0-200 scale (0-100%)
- **Battery Voltage:** Actual mV reading

---

## 💡 QUICK WINS IMMÉDIATS

### 1. **Ajouter Logging Partout** (30 min)
Pattern simple à appliquer dans tous les reportParser:
```javascript
reportParser: async value => {
  this.log(`🔋 Battery raw: ${value}`);
  const percentage = value / 2;
  this.log(`🔋 Battery calculated: ${percentage}%`);
  return percentage;
}
```

### 2. **Fix Reporting Intervals** (1h)
Chercher/remplacer dans tous les fichiers:
```javascript
// Ancien
minInterval: 60,
maxInterval: 3600,
minChange: 5

// Nouveau
minInterval: 7200,
maxInterval: 43200,
minChange: 10
```

### 3. **Proactive Read au Init** (1h)
Ajouter dans les 10 drivers les plus utilisés d'abord.

---

## 🎯 OBJECTIFS MESURABLES

**Avant Améliorations:**
- ❌ 30%+ utilisateurs rapportent batteries pas à jour
- ❌ Logs insuffisants pour debug
- ❌ Pas de différenciation secteur/batterie
- ❌ Alarmes faibles ne marchent pas

**Après Améliorations:**
- ✅ 95%+ batteries se mettent à jour correctement
- ✅ Logs détaillés pour diagnostic rapide
- ✅ Devices secteur n'affichent pas batterie
- ✅ Alarmes fonctionnent avec seuil utilisateur
- ✅ Durée de vie batterie optimisée

---

## 🚨 NOTES IMPORTANTES

1. **NE PAS** déployer tout d'un coup - faire par phases
2. **TESTER** sur Test channel d'abord
3. **DOCUMENTER** tous changements dans CHANGELOG
4. **COMMUNIQUER** avec utilisateurs forum
5. **MONITORER** feedback après chaque phase

---

**Document vivant - À mettre à jour après chaque amélioration!**
