# 🎯 REFACTORING PLAN v4.2.0 - HYBRID ARCHITECTURE

## 📊 PROBLÈMES ACTUELS

### 1. Fragmentation Excessive
- **183+ drivers** dont beaucoup sont duplicates avec suffixes différents
- Exemple: `smart_switch_3gang_ac`, `smart_switch_3gang_dc`, `smart_switch_3gang_cr2032`, `smart_switch_3gang_hybrid`
- **Confusion utilisateurs**: Quel driver choisir?
- **Maintenance difficile**: Code dupliqué partout

### 2. Nommage Incohérent
- Suffixes: `_ac`, `_dc`, `_cr2032`, `_cr2450`, `_aaa`, `_hybrid`, `_internal`, `_battery`
- Préfixes marques: `zemismart_`, `moes_`, `avatto_`, `tuya_`, `lsc_`, etc.
- **Problème**: Non-conforme à l'approche UNBRANDED

### 3. SDK3 Non-Compliance
- `alarm_battery` encore présent dans certains drivers (DEPRECATED SDK3)
- Manque `energy.batteries` array dans certains drivers battery
- Settings dupliqués (battery_threshold, low_battery_threshold, etc.)

---

## 🎯 OBJECTIFS v4.2.0

### A. Architecture Hybride Intelligente
**Principe**: 1 driver = 1 type de device, détection auto de l'alimentation

**Avant**:
```
wireless_button_3gang_cr2032/
wireless_button_3gang_cr2450/
wireless_button_3gang_aaa/
smart_switch_3gang_ac/
smart_switch_3gang_dc/
smart_switch_3gang_hybrid/
```

**Après**:
```
button_3gang/          ← UNIFIED (détecte CR2032/CR2450/AAA auto)
switch_wall_3gang/     ← UNIFIED (détecte AC/DC auto)
```

### B. Détection Automatique Alimentation
```javascript
// Dans device.js
async detectPowerSource() {
  try {
    const powerSource = await this.zclNode.endpoints[1]
      .clusters.basic.readAttributes(['powerSource']);
    
    switch(powerSource) {
      case 0x01: // Mains (single phase)
      case 0x02: // Mains (3 phase)
        this.powerType = 'AC';
        await this.addCapability('measure_power');
        await this.addCapability('meter_power');
        break;
        
      case 0x03: // Battery
        this.powerType = 'BATTERY';
        await this.addCapability('measure_battery');
        // Detect battery type from voltage
        const batteryType = await this.detectBatteryType();
        this.setStoreValue('battery_type', batteryType);
        break;
        
      case 0x04: // DC Source
        this.powerType = 'DC';
        await this.addCapability('measure_voltage');
        break;
        
      default:
        this.log('Unknown power source, using defaults');
    }
  } catch (err) {
    this.log('Power detection failed, using config defaults');
  }
}
```

### C. Catégorisation Logique

#### CATÉGORIE 1: BUTTONS (Sans fil, batterie)
```
button_1gang/          ← 1 bouton (CR2032/CR2450/AAA)
button_2gang/          ← 2 boutons
button_3gang/          ← 3 boutons
button_4gang/          ← 4 boutons
button_6gang/          ← 6 boutons
button_8gang/          ← 8 boutons
button_scene/          ← Scene controller
button_dimmer/         ← Dimmer rotary
button_sos/            ← Emergency button
```

#### CATÉGORIE 2: SWITCHES (Mural, AC/DC)
```
switch_wall_1gang/     ← Wall switch 1 gang (AC/DC auto)
switch_wall_2gang/     ← Wall switch 2 gang
switch_wall_3gang/     ← Wall switch 3 gang
switch_wall_4gang/     ← Wall switch 4 gang
switch_wall_6gang/     ← Wall switch 6 gang
switch_touch_1gang/    ← Touch switch
switch_touch_3gang/    ← Touch switch 3 gang
```

#### CATÉGORIE 3: SENSORS
```
sensor_motion/         ← Motion PIR (battery auto-detect)
sensor_motion_radar/   ← Radar/mmWave
sensor_contact/        ← Door/window
sensor_temperature/    ← Temp only
sensor_temp_humidity/  ← Temp + Humidity
sensor_multi/          ← Motion + Temp + Humidity + Lux
sensor_water_leak/     ← Water leak
sensor_smoke/          ← Smoke detector
sensor_gas/            ← Gas detector
sensor_air_quality/    ← Air quality (CO2, VOC, etc.)
```

#### CATÉGORIE 4: ACTUATORS
```
plug_smart/            ← Smart plug (AC)
plug_dimmer/           ← Dimmer plug
curtain_motor/         ← Curtain/blind motor
valve_smart/           ← Water valve
lock_basic/            ← Basic lock
lock_fingerprint/      ← Fingerprint lock
siren/                 ← Alarm siren
```

---

## 🔨 MIGRATION STRATEGY

### Phase 1: Créer Base Classes
```javascript
// lib/BaseHybridDevice.js
class BaseHybridDevice extends ZigBeeDevice {
  async onNodeInit() {
    // 1. Detect power source
    await this.detectPowerSource();
    
    // 2. Configure capabilities based on power
    await this.configurePowerCapabilities();
    
    // 3. Setup standard monitoring
    await this.setupMonitoring();
    
    // 4. Register flow cards
    await this.registerFlowCards();
  }
  
  async detectPowerSource() { /* ... */ }
  async configurePowerCapabilities() { /* ... */ }
  async detectBatteryType() { /* ... */ }
}

// lib/ButtonDevice.js
class ButtonDevice extends BaseHybridDevice {
  async onNodeInit() {
    await super.onNodeInit();
    await this.setupButtonDetection();
  }
}

// lib/SwitchDevice.js
class SwitchDevice extends BaseHybridDevice {
  async onNodeInit() {
    await super.onNodeInit();
    await this.setupSwitchControl();
  }
}
```

### Phase 2: Créer Drivers Unifiés

**Exemple: button_3gang/**
```json
{
  "name": {
    "en": "3-Button Wireless Controller"
  },
  "class": "button",
  "capabilities": [
    "measure_battery"
  ],
  "capabilitiesOptions": {
    "measure_battery": {
      "title": { "en": "Battery" }
    }
  },
  "energy": {
    "batteries": ["CR2032", "CR2450", "AAA"]
  },
  "zigbee": {
    "manufacturerName": [
      "_TZ3000_*",
      "TS0043",
      /* Consolidate ALL 3-button IDs */
    ]
  }
}
```

**device.js**:
```javascript
const ButtonDevice = require('../../lib/ButtonDevice');

class Button3GangDevice extends ButtonDevice {
  async onNodeInit() {
    await super.onNodeInit(); // Auto power detection
    
    // Setup 3 buttons
    this.buttonCount = 3;
    await this.setupButtons(['button1', 'button2', 'button3']);
  }
}
```

### Phase 3: Migration des Manufacturer IDs

**Script automatique**:
```javascript
// scripts/consolidate_manufacturer_ids.js
const fs = require('fs');
const path = require('path');

// 1. Scan tous les drivers button/switch
// 2. Extraire manufacturerName arrays
// 3. Dédupliquer et consolider
// 4. Créer nouveaux drivers unifiés
// 5. Générer mapping ancien → nouveau
```

### Phase 4: Mapping de Migration

**migration_map.json**:
```json
{
  "zemismart_wireless_switch_3button_cr2032": "button_3gang",
  "avatto_wireless_switch_3button_cr2450": "button_3gang",
  "moes_wireless_button_3gang_aaa": "button_3gang",
  "zemismart_smart_switch_3gang_ac": "switch_wall_3gang",
  "zemismart_smart_switch_3gang_dc": "switch_wall_3gang",
  "zemismart_smart_switch_3gang_hybrid": "switch_wall_3gang",
  "zemismart_smart_switch_3gang_cr2032": "button_3gang"
}
```

### Phase 5: Documentation Utilisateur

**pairing_guide.md**:
```markdown
# Comment Choisir le Bon Driver?

## Buttons (Sans fil, à batterie)
- Petit device portable avec boutons
- Fonctionne sur batterie (CR2032, CR2450, AAA)
- Se colle au mur ou se pose
→ **Choisir: button_XXgang** (XX = nombre de boutons)

## Switches (Mural, câblé)
- Installé dans le mur
- Câblage électrique requis (220V ou 12V DC)
- Remplace interrupteur traditionnel
→ **Choisir: switch_wall_XXgang**

## En cas de doute
1. Ouvrir le device
2. Si batterie visible → Button
3. Si fils électriques → Switch
```

---

## 📋 CHECKLIST TECHNIQUE

### SDK3 Compliance
- [ ] Remove ALL `alarm_battery` capabilities
- [ ] Use ONLY `measure_battery`
- [ ] Add `energy.batteries` array to ALL battery devices
- [ ] Validate cluster IDs are numeric (0, 1, 6, etc.)
- [ ] Remove duplicate settings (consolidate battery_threshold)
- [ ] Validate all flow cards have titleFormatted

### Battery Management
- [ ] Standardize battery percentage conversion (0-200 → 0-100%)
- [ ] Implement voltage-based battery type detection
- [ ] Low battery notifications (20%, 10%)
- [ ] Battery reporting interval configurable
- [ ] Support multiple battery types in same driver

### Power Detection
- [ ] Read powerSource attribute (cluster 0x0000, attr 0x0007)
- [ ] Fallback if attribute not available
- [ ] Dynamic capability addition/removal
- [ ] Persist power type in store
- [ ] Handle re-pairing with different power

### Manufacturer IDs
- [ ] Deduplicate across drivers
- [ ] Group by device function, not brand
- [ ] Validate against Zigbee Alliance database
- [ ] Remove invalid/test IDs
- [ ] Add missing common IDs

---

## 🚀 DÉPLOIEMENT

### v4.1.7 (CURRENT) ✅
- Fix syntax error wireless_switch_3button
- Fix SOS button IAS Zone enrollment
- Prepare hybrid architecture

### v4.2.0 (HYBRID ARCHITECTURE)
- Create base classes (BaseHybridDevice, ButtonDevice, SwitchDevice)
- Create 10 unified button drivers (button_1gang → button_8gang)
- Create 6 unified switch drivers (switch_wall_1gang → switch_wall_6gang)
- Migration guide for users
- Backward compatibility via manufacturer ID migration

### v4.3.0 (CLEANUP)
- Deprecate old drivers (mark as deprecated in app.json)
- Remove duplicate manufacturer IDs
- Update all documentation
- Complete SDK3 compliance audit

### v5.0.0 (FINAL)
- Remove deprecated drivers
- Final architecture stable
- Performance optimizations
- Complete test coverage

---

## 📊 IMPACT ANALYSIS

### Nombre de Drivers
- **Avant**: 183 drivers
- **Après Phase 1**: ~120 drivers (consolidation buttons)
- **Après Phase 2**: ~80 drivers (consolidation switches)
- **Final**: ~60 drivers (consolidation complète)

### Benefits
- ✅ **67% reduction** in driver count
- ✅ **Zero confusion** for users (choose by function, not power source)
- ✅ **Maintenance**: 3x easier (no code duplication)
- ✅ **SDK3 Compliant**: 100%
- ✅ **Auto-adaptation**: Works with any power source
- ✅ **Future-proof**: Easy to add new devices

---

## 🎯 PRIORITÉS

### HIGH PRIORITY (v4.2.0)
1. ✅ Fix bugs critiques (v4.1.7) - DONE
2. 🔄 Create base classes
3. 🔄 Unified button drivers (most user confusion)
4. 🔄 Unified switch drivers (second most confusion)

### MEDIUM PRIORITY (v4.3.0)
5. Sensor consolidation
6. Plug/actuator consolidation
7. Documentation update
8. Migration guide

### LOW PRIORITY (v5.0.0)
9. Remove deprecated drivers
10. Performance optimization
11. Advanced features

---

**Next Action**: Créer BaseHybridDevice.js et commencer consolidation buttons
