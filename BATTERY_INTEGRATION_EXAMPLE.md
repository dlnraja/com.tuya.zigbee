# 🔋 EXEMPLE D'INTÉGRATION - Battery Monitoring Amélioré

## 📚 Guide Complet d'Utilisation des Nouvelles Librairies

---

## MÉTHODE 1: Utiliser le Mixin (RECOMMANDÉ) ✅

### Exemple Complet: Contact Sensor

```javascript
'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const BatteryMonitoringMixin = require('../../lib/BatteryMonitoringMixin');

// Appliquer le mixin à la classe de base
class ContactSensorDevice extends BatteryMonitoringMixin(ZigBeeDevice) {

  async onNodeInit() {
    await super.onNodeInit();

    this.log('🚀 Contact Sensor initializing...');

    // Setup IAS Zone pour contact
    await this.setupIASZone();

    // Setup monitoring batterie AMÉLIORÉ
    // Le mixin gère TOUT automatiquement!
    await this.setupBatteryMonitoring({
      deviceType: 'contact',      // Type pour config optimale
      proactiveRead: true,         // Lecture initiale
      endpoint: 1                  // Endpoint par défaut
    });

    this.log('✅ Contact Sensor ready!');
  }

  async setupIASZone() {
    // ... code IAS Zone habituel
  }
}

module.exports = ContactSensorDevice;
```

**C'EST TOUT!** Le mixin gère:
- ✅ Détection si device sur secteur (skip monitoring)
- ✅ Configuration reporting optimale
- ✅ Parsing batterie avec BatteryCalculator
- ✅ Logging détaillé
- ✅ Alarme batterie faible automatique
- ✅ Lecture proactive au démarrage
- ✅ Respect des settings utilisateur

---

## MÉTHODE 2: Intégration Manuelle (Contrôle Total)

### Si vous voulez plus de contrôle:

```javascript
'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const BatteryCalculator = require('../../lib/BatteryCalculator');
const PowerSourceDetector = require('../../lib/PowerSourceDetector');

class MotionSensorDevice extends ZigBeeDevice {

  async onNodeInit() {
    await super.onNodeInit();

    // 1. Vérifier si device sur secteur
    if (PowerSourceDetector.isPowered(this)) {
      this.log('⚡ Mains powered - no battery');
      return;
    }

    // 2. Initialiser calculator
    this.batteryCalculator = new BatteryCalculator();

    // 3. Obtenir config optimale
    const config = PowerSourceDetector.getBatteryReportingConfig('motion');

    this.log('🔋 Battery config:', config);

    // 4. Configurer reporting
    try {
      await this.configureAttributeReporting([{
        endpointId: 1,
        cluster: CLUSTER.POWER_CONFIGURATION,
        attributeName: 'batteryPercentageRemaining',
        minInterval: config.minInterval,
        maxInterval: config.maxInterval,
        minChange: config.minChange
      }]);
    } catch (err) {
      this.log('⚠️ Reporting config failed (non-critical):', err.message);
    }

    // 5. Enregistrer capability avec parser amélioré
    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
      endpoint: 1,
      get: 'batteryPercentageRemaining',
      report: 'batteryPercentageRemaining',
      reportParser: async (value) => {
        const debugMode = this.getSetting('battery_debug_logging') !== false;

        if (debugMode) {
          this.log('─────────────────────────────');
          this.log('🔋 BATTERY UPDATE');
          this.log(`   Raw: ${value}`);
        }

        // Utiliser calculator
        const modelId = this.getData().modelId;
        const percentage = this.batteryCalculator.calculate(value, modelId);

        if (debugMode) {
          this.log(`   Calculated: ${percentage}%`);
          this.log(`   Model: ${modelId}`);
          this.log('─────────────────────────────');
        }

        // Update alarme
        await this.updateBatteryAlarm(percentage);

        return percentage;
      },
      getOpts: {
        getOnStart: true,
        getOnOnline: true
      }
    });

    // 6. Lecture proactive
    await this.performInitialBatteryRead();
  }

  async updateBatteryAlarm(percentage) {
    if (!this.hasCapability('alarm_battery')) return;

    const threshold = this.getSetting('battery_low_threshold') || 20;
    const isLow = percentage < threshold;

    await this.setCapabilityValue('alarm_battery', isLow);

    if (isLow) {
      this.log(`⚠️ BATTERY LOW! ${percentage}% < ${threshold}%`);
    }
  }

  async performInitialBatteryRead() {
    await this.wait(2000);

    try {
      const result = await this.zclNode.endpoints[1].clusters.powerConfiguration
        .readAttributes(['batteryPercentageRemaining']);

      if (result?.batteryPercentageRemaining !== undefined) {
        const percentage = this.batteryCalculator.calculate(
          result.batteryPercentageRemaining,
          this.getData().modelId
        );

        await this.setCapabilityValue('measure_battery', percentage);
        this.log(`🎯 Initial battery: ${percentage}%`);
      }
    } catch (err) {
      this.log('⚠️ Proactive read failed:', err.message);
    }
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = MotionSensorDevice;
```

---

## MÉTHODE 3: Quick Win pour Drivers Existants

### Migration Rapide (10 minutes par driver):

**AVANT:**
```javascript
// Old code
this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
  get: 'batteryPercentageRemaining',
  reportParser: value => value / 2
});
```

**APRÈS (Version Minimale):**
```javascript
const BatteryCalculator = require('../../lib/BatteryCalculator');

// Dans constructor ou onNodeInit
this.batteryCalculator = new BatteryCalculator();

// Dans registerCapability
this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
  get: 'batteryPercentageRemaining',
  reportParser: async value => {
    const modelId = this.getData().modelId;
    const percentage = this.batteryCalculator.calculate(value, modelId);

    this.log(`🔋 Battery: ${percentage}% (raw: ${value})`);

    // Update alarme si existe
    if (this.hasCapability('alarm_battery')) {
      const threshold = this.getSetting('battery_low_threshold') || 20;
      await this.setCapabilityValue('alarm_battery', percentage < threshold);
    }

    return percentage;
  }
});
```

---

## UTILISATION: PowerSourceDetector

### Vérifier si Device sur Secteur:

```javascript
const PowerSourceDetector = require('../../lib/PowerSourceDetector');

async onNodeInit() {
  // Méthode 1: Check simple
  if (PowerSourceDetector.isPowered(this)) {
    this.log('⚡ SKIP battery - mains powered');
    return;
  }

  // Méthode 2: Obtenir type pour config
  const deviceType = PowerSourceDetector.getDeviceType(this);
  // Returns: 'sensor', 'motion', 'contact', 'smoke', 'water', 'button'

  // Méthode 3: Obtenir config optimale
  const config = PowerSourceDetector.getBatteryReportingConfig(deviceType);
  // Returns: { minInterval, maxInterval, minChange, description }

  // Méthode 4: Config avec settings utilisateur
  const configWithSettings = PowerSourceDetector.getConfigWithUserSettings(this, deviceType);
  // Prend en compte setting 'battery_report_interval': 'eco' | 'standard' | 'frequent'
}
```

---

## SETTINGS UTILISATEUR REQUIS

### Ajouter dans app.json (device settings):

```json
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
    "en": "Trigger alarm when battery below this level",
    "fr": "Déclencher alarme si batterie sous ce niveau"
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
        "en": "Eco (24h max) - Longer battery life",
        "fr": "Éco (24h max) - Durée batterie max"
      }
    },
    {
      "id": "standard",
      "label": {
        "en": "Standard (12h max) - Balanced",
        "fr": "Standard (12h max) - Équilibré"
      }
    },
    {
      "id": "frequent",
      "label": {
        "en": "Frequent (6h max) - More updates",
        "fr": "Fréquent (6h max) - Plus de MAJ"
      }
    }
  ]
},
{
  "id": "battery_debug_logging",
  "type": "checkbox",
  "label": {
    "en": "Enable detailed battery logs",
    "fr": "Logs batterie détaillés"
  },
  "value": false,
  "hint": {
    "en": "For troubleshooting battery issues",
    "fr": "Pour dépanner problèmes batterie"
  }
}
```

---

## DIAGNOSTICS & DEBUG

### Obtenir Stats Batterie:

```javascript
// Avec Mixin:
const stats = this.getBatteryStats();
console.log(stats);
// {
//   current: 85,
//   alarm: false,
//   threshold: 20,
//   isPowered: false,
//   lastUpdate: '2024-11-19T14:30:00Z',
//   deviceType: 'motion'
// }

// Manuel:
const current = this.getCapabilityValue('measure_battery');
const alarm = this.getCapabilityValue('alarm_battery');
const isPowered = PowerSourceDetector.isPowered(this);
```

### Logs à Rechercher:

```
✅ BONS LOGS (après migration):
  🔋 [BATTERY] Starting battery monitoring setup...
  📊 [BATTERY] Device type: motion
  ⚙️ [BATTERY] Report config: { minInterval: 3600, ... }
  🔋 Battery: 85.0% (was 87.0%)
  ⚠️ [BATTERY ALARM] TRIGGERED! 15.0% < 20%

❌ MAUVAIS LOGS (avant migration):
  Battery: 85  (pas d'info contexte)
  // Silence total sur batterie
```

---

## CHECKLIST MIGRATION

### Pour chaque driver batterie:

- [ ] Importer `BatteryMonitoringMixin` OU `BatteryCalculator` + `PowerSourceDetector`
- [ ] Remplacer `reportParser: value => value / 2` par version améliorée
- [ ] Ajouter check `PowerSourceDetector.isPowered()`
- [ ] Configurer reporting avec intervals optimaux
- [ ] Ajouter logging détaillé
- [ ] Implémenter alarme batterie faible
- [ ] Ajouter lecture proactive au démarrage
- [ ] Tester sur device réel
- [ ] Vérifier logs utilisateur

---

## TROUBLESHOOTING

### Batterie reste à 0% après pairing?
✅ **Solution:** Lecture proactive au démarrage
```javascript
await this.performInitialBatteryRead();
```

### Batterie ne se met jamais à jour?
✅ **Solution:** Vérifier reporting config
```javascript
// Intervals trop longs? Trop courts?
const config = PowerSourceDetector.getBatteryReportingConfig('sensor');
```

### Device sur secteur affiche batterie?
✅ **Solution:** Ajouter check PowerSourceDetector
```javascript
if (PowerSourceDetector.isPowered(this)) {
  return; // Skip battery
}
```

### Alarme batterie ne se déclenche pas?
✅ **Solution:** Vérifier capability et threshold
```javascript
if (this.hasCapability('alarm_battery')) {
  const threshold = this.getSetting('battery_low_threshold') || 20;
  await this.setCapabilityValue('alarm_battery', percentage < threshold);
}
```

---

## TESTS RECOMMANDÉS

1. **Pairing nouveau device**
   - Batterie s'affiche immédiatement?
   - Log "Initial battery: X%"?

2. **Attendre 1-2 heures**
   - Batterie se met à jour?
   - Logs "Battery: X% (was Y%)"?

3. **Simuler batterie faible**
   - Setting threshold à 95%
   - Alarme se déclenche?

4. **Device sur secteur**
   - Pas de monitoring batterie?
   - Log "SKIP battery - mains powered"?

---

**Document de référence pour toutes migrations batterie!**
