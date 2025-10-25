# 🔄 GUIDE CONVERSION VERS SYSTÈME HYBRIDE

**Version**: v4.8.0+  
**Objectif**: Convertir TOUS les drivers vers BaseHybridDevice  
**Bénéfice**: Gestion intelligente automatique des capabilities

---

## 📋 INVENTAIRE DES CLASSES DE BASE

### ✅ Existantes

```
lib/BaseHybridDevice.js   ✅ Classe principale (tous types)
lib/SwitchDevice.js       ✅ Pour switches (extends BaseHybridDevice)
lib/ButtonDevice.js       ✅ Pour buttons (extends BaseHybridDevice)
lib/SensorDevice.js       ✅ NOUVEAU - Pour sensors
lib/PlugDevice.js         ✅ NOUVEAU - Pour plugs
```

### ⏳ À Créer

```
lib/ThermostatDevice.js   ⏳ Pour thermostats
lib/CurtainDevice.js      ⏳ Pour curtains/blinds
lib/ValveDevice.js        ⏳ Pour valves
lib/ClimateDevice.js      ⏳ Pour climate devices
lib/LightDevice.js        ⏳ Pour lights/dimmers
```

---

## 🔄 PROCÉDURE DE CONVERSION

### Template Conversion

**AVANT** (extend ZigBeeDevice directement):
```javascript
const { ZigBeeDevice } = require('homey-zigbeedriver');

class MyDevice extends ZigBeeDevice {
  async onNodeInit() {
    // Code spécifique
  }
}
```

**APRÈS** (extend classe hybride):
```javascript
const SensorDevice = require('../../lib/SensorDevice'); // ou autre classe

class MyDevice extends SensorDevice {
  async onNodeInit() {
    // ✅ BaseHybridDevice gère auto power detection
    await super.onNodeInit();
    
    // Code spécifique ici
  }
}
```

---

## 📊 DRIVERS À CONVERTIR (PAR PRIORITÉ)

### Priorité 1: Sensors (HAUTE FRÉQUENCE)

```
✅ motion_sensor_pir → SensorDevice
✅ temperature_sensor → SensorDevice
✅ humidity_sensor → SensorDevice
✅ contact_sensor_* → SensorDevice
✅ water_leak_sensor → SensorDevice
✅ presence_sensor_radar → SensorDevice
✅ climate_monitor_* → SensorDevice
✅ air_quality_monitor → SensorDevice
```

**Bénéfice**: 
- Auto-suppression measure_battery si AC
- Auto-détection type batterie
- Alertes batterie automatiques

### Priorité 2: Plugs (MOYENNE FRÉQUENCE)

```
✅ plug_smart → PlugDevice
✅ plug_energy_monitor → PlugDevice
✅ usb_outlet_* → PlugDevice
```

**Bénéfice**:
- Gestion intelligente power capabilities
- Auto-détection energy monitoring
- Estimation si mesure absente

### Priorité 3: Thermostats (SPÉCIALISÉS)

```
⏳ thermostat_smart → ThermostatDevice
⏳ thermostat_advanced → ThermostatDevice
⏳ thermostat_temperature_control → ThermostatDevice
⏳ radiator_valve_smart → ValveDevice
```

**Bénéfice**:
- Target temperature management
- Mode switching (heat/cool/auto)
- Battery pour TRVs

### Priorité 4: Curtains/Blinds

```
⏳ curtain_motor → CurtainDevice
⏳ blind_control → CurtainDevice
```

**Bénéfice**:
- Position management
- Calibration helper
- Battery backup detection

### Priorité 5: Autres

```
⏳ doorbell_button → ButtonDevice (déjà existe)
⏳ scene_controller_* → ButtonDevice
⏳ sound_controller → ButtonDevice
```

---

## 🛠️ CONVERSION ÉTAPE PAR ÉTAPE

### Exemple: Motion Sensor PIR

#### 1. Driver Compose (driver.compose.json)

**Ajouter config hybride**:
```json
{
  "capabilities": [
    "alarm_motion",
    "measure_battery"  // ← GARDER même si parfois AC
  ],
  "energy": {
    "batteries": [
      "CR2032",
      "CR2450",
      "AAA",
      "AA"
    ]
  },
  "settings": [
    {
      "id": "power_source",
      "type": "dropdown",
      "value": "auto",
      "values": [
        { "id": "auto", "label": { "en": "Auto Detect" } },
        { "id": "ac", "label": { "en": "AC Mains" } },
        { "id": "battery", "label": { "en": "Battery" } }
      ]
    }
  ]
}
```

#### 2. Device Code (device.js)

**AVANT**:
```javascript
const { ZigBeeDevice } = require('homey-zigbeedriver');

class MotionSensorPIR extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
    
    // Register motion
    this.registerCapability('alarm_motion', this.CLUSTER.OCCUPANCY_SENSING);
    
    // Register battery
    this.registerCapability('measure_battery', this.CLUSTER.POWER_CONFIGURATION);
  }
}
```

**APRÈS**:
```javascript
const SensorDevice = require('../../lib/SensorDevice');

class MotionSensorPIR extends SensorDevice {
  async onNodeInit() {
    // ✅ SensorDevice → BaseHybridDevice gère TOUT automatiquement:
    // - Power detection (AC/Battery)
    // - Battery type detection
    // - Capability add/remove
    // - Alertes batterie
    await super.onNodeInit();
    
    // Register motion (spécifique à ce sensor)
    this.registerCapability('alarm_motion', this.CLUSTER.OCCUPANCY_SENSING);
  }
}
```

**Ce qui se passe automatiquement**:
```
1. detectPowerSource() lit powerSource attribute
2. Si Battery:
   - Garde measure_battery
   - Détecte type (CR2032, AAA, etc.)
   - Setup alertes (20%, 10%)
3. Si AC:
   - Supprime measure_battery
   - Icône batterie disparaît
```

---

## 📝 CHECKLIST CONVERSION

Pour chaque driver à convertir:

- [ ] Identifier classe de base appropriée (Sensor/Plug/Switch/Button/etc.)
- [ ] Modifier device.js:
  - [ ] Changer `const { ZigBeeDevice }` → `const TypeDevice`
  - [ ] Changer `extends ZigBeeDevice` → `extends TypeDevice`
  - [ ] Ajouter `await super.onNodeInit()` au début
  - [ ] Supprimer logique power detection manuelle (si présente)
- [ ] Modifier driver.compose.json:
  - [ ] Ajouter `measure_battery` à capabilities
  - [ ] Ajouter `energy.batteries` config
  - [ ] Ajouter settings `power_source` et `battery_type`
- [ ] Tester:
  - [ ] Build SUCCESS
  - [ ] Aucune erreur
  - [ ] Battery disparaît si AC
  - [ ] Battery reste si Battery

---

## 🎯 STRATÉGIE BATCH CONVERSION

### Phase 1: Sensors (v4.9.0)

Convertir **TOUS** les sensors vers `SensorDevice`:
- motion_sensor_*
- temperature_sensor_*
- humidity_sensor_*
- contact_sensor_*
- water_leak_sensor_*
- presence_sensor_*
- climate_*
- air_quality_*

**Impact**: ~30 drivers  
**Durée estimée**: 2-3 heures  
**Bénéfice**: Gestion batterie intelligente pour tous sensors

### Phase 2: Plugs (v4.9.5)

Convertir **TOUS** les plugs vers `PlugDevice`:
- plug_smart
- plug_energy_monitor
- plug_*
- usb_outlet_*

**Impact**: ~10 drivers  
**Durée estimée**: 1 heure  
**Bénéfice**: Power monitoring intelligent

### Phase 3: Thermostats (v4.10.0)

Créer `ThermostatDevice` et convertir:
- thermostat_*
- radiator_valve_*

**Impact**: ~8 drivers  
**Durée estimée**: 2 heures (créer classe + conversion)  
**Bénéfice**: Battery pour TRVs, mode management

### Phase 4: Divers (v4.10.5)

Créer classes manquantes et convertir:
- Curtains → `CurtainDevice`
- Valves → `ValveDevice`
- Lights → `LightDevice`

**Impact**: ~15 drivers  
**Durée estimée**: 3 heures  
**Bénéfice**: Uniformité complète

---

## 🚀 SCRIPT AUTOMATISATION (OPTIONNEL)

### Conversion Semi-Automatique

```javascript
// scripts/convert-to-hybrid.js

const fs = require('fs');
const path = require('path');

function convertDriver(driverPath, baseClass) {
  const devicePath = path.join(driverPath, 'device.js');
  let content = fs.readFileSync(devicePath, 'utf8');
  
  // Replace import
  content = content.replace(
    /const.*ZigBeeDevice.*require.*homey-zigbeedriver.*/,
    `const ${baseClass} = require('../../lib/${baseClass}');`
  );
  
  // Replace extends
  content = content.replace(
    /extends ZigBeeDevice/g,
    `extends ${baseClass}`
  );
  
  // Add super.onNodeInit if missing
  if (!content.includes('await super.onNodeInit()')) {
    content = content.replace(
      /async onNodeInit\(\)\s*{/,
      `async onNodeInit() {\n    await super.onNodeInit();\n`
    );
  }
  
  fs.writeFileSync(devicePath, content, 'utf8');
  console.log(`✅ Converted: ${driverPath}`);
}

// Usage:
// node scripts/convert-to-hybrid.js motion_sensor_pir SensorDevice
```

---

## 📊 MÉTRIQUES OBJECTIFS

### Avant Conversion Complète

```
Drivers with BaseHybridDevice: ~15 (8%)
Drivers with ZigBeeDevice: ~170 (92%)
Battery management: Inconsistent
Power detection: Manual
```

### Après Conversion Complète

```
Drivers with BaseHybridDevice: ~185 (100%)
Drivers with ZigBeeDevice: 0 (0%)
Battery management: Automatic & consistent
Power detection: Intelligent & uniform
```

### Bénéfices Utilisateur

```
✅ Icône batterie disparaît si AC (pas de confusion)
✅ Alertes batterie configurables (20%, 10%)
✅ Type batterie auto-détecté
✅ Health monitoring batterie
✅ Power capabilities intelligentes
✅ UX cohérente sur tous devices
```

---

## 📚 DOCUMENTATION RÉFÉRENCE

### Fichiers Clés

```
lib/BaseHybridDevice.js              - Classe principale
lib/SwitchDevice.js                  - Exemple switches
lib/ButtonDevice.js                  - Exemple buttons
lib/SensorDevice.js                  - NOUVEAU sensors
lib/PlugDevice.js                    - NOUVEAU plugs
docs/HYBRID_POWER_MANAGEMENT.md      - Guide système
HYBRID_CONVERSION_GUIDE.md           - Ce document
```

### Exemples Fonctionnels

```
drivers/switch_wall_3gang/           - Switch hybride
drivers/button_wireless_4/           - Button hybride
drivers/motion_sensor_pir/           - À convertir (exemple)
```

---

## ✅ STATUS CONVERSION

### Complété (v4.8.0)

```
✅ BaseHybridDevice.js - Système complet
✅ SwitchDevice.js - Tous switches
✅ ButtonDevice.js - Tous buttons
✅ SensorDevice.js - Classe créée
✅ PlugDevice.js - Classe créée
✅ Documentation complète
```

### En Cours (v4.9.0)

```
⏳ Conversion sensors batch
⏳ Conversion plugs batch
⏳ Création ThermostatDevice
⏳ Création CurtainDevice
⏳ Conversion thermostats
⏳ Conversion curtains
```

### Objectif Final (v5.0.0)

```
🎯 100% drivers utilisent BaseHybridDevice
🎯 Gestion batterie uniforme
🎯 Power detection intelligente partout
🎯 UX cohérente sur toute l'app
```

---

**🔄 CONVERSION EN COURS - OBJECTIF 100% HYBRIDE ! 🎯**

**Version actuelle**: 4.8.0  
**Drivers hybrides**: ~15/185 (8%)  
**Objectif v5.0.0**: 185/185 (100%)
