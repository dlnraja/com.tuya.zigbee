# 🎯 HYBRID CONSOLIDATION MASTER PLAN v4.2.0

## 📋 OBJECTIF PRINCIPAL

**Fusionner TOUS les drivers en drivers hybrides intelligents qui:**
- ✅ Détectent automatiquement AC/DC/Battery
- ✅ Affichent les capabilities appropriées selon l'alimentation
- ✅ Éliminent la confusion utilisateur (plus besoin de choisir le type d'alimentation)
- ✅ Réduisent drastiquement le nombre de drivers (183 → ~60)
- ✅ SDK3 100% compliant (`measure_battery` uniquement, pas `alarm_battery`)

## 🚨 DIAGNOSTICS RÉCENTS (22 Oct 2025)

### Erreurs Critiques Détectées:

1. **e10dadd9-7cf9-4cd3-9e8b-3b929aeccd29**
   - Driver: `zemismart_wireless_switch_3button_cr2032`
   - Erreur: `SyntaxError: Unexpected identifier` ligne 448
   - Status: ✅ **CORRIGÉ** dans v4.1.7

2. **23ff6ed3-06c0-4865-884f-bc6ac1a6b159**
   - Driver: `moes_sos_emergency_button_cr2032`
   - Erreur: `IEEE address not available from zclNode` (IAS Zone)
   - Status: ✅ **CORRIGÉ** dans v4.1.7

3. **b3028f16-36c6-46a7-b028-2f3cb34915c3**
   - Device: "Big 3 button wall cr2032"
   - User confused about driver selection
   - **Solution**: Driver unifié `button_3gang` ✅ CRÉÉ

### Devices Interview Data (Ian_Gibbo):

**Nouveaux devices à supporter:**

1. **Philips Hue Plug (LOM003)**
   - manufacturerName: "Signify Netherlands B.V."
   - Endpoint 11: onOff, levelControl
   - Note: Déjà supporté par app Johan Bendz "Philips Hue without bridge"

2. **Smart Plug TS011F (_TZ3000_00mk2xzy)**
   - Manufacturer: `_TZ3000_00mk2xzy`
   - Endpoint 11: onOff
   - Type: AC mains

3. **Wall Switch TS0002 2-Gang (_TZ3000_h1ipgkwn)**
   - Manufacturer: `_TZ3000_h1ipgkwn`
   - Endpoints: 1, 2 (2-gang)
   - Type: AC mains
   - Features: Energy monitoring (metering, electricalMeasurement)

4. **Motion Sensor HOBEIAN (ZG-204ZV)**
   - Manufacturer: "HOBEIAN"
   - Features: IAS Zone (motion), battery, illuminance
   - Battery: 3.0V (100%)

5. **Presence Sensor TS0601 (_TZE284_1lvln0x6)**
   - Manufacturer: `_TZE284_1lvln0x6`
   - Type: Tuya MCU (cluster 0xEF00)
   - Battery powered

## 📊 CONSOLIDATION STRATEGY

### Phase 1: BUTTONS (Priority HIGH) 🔴

**Ancien système** (24+ drivers):
```
zemismart_wireless_switch_1button_cr2032
zemismart_wireless_switch_1button_cr2450
avatto_wireless_button_1gang_aaa
zemismart_wireless_switch_2button_cr2032
...etc (3 variants × 8 button counts)
```

**Nouveau système** (8 drivers):
```
button_1gang/  ← Unifié (CR2032/CR2450/AAA auto-detect)
button_2gang/
button_3gang/  ← ✅ DÉJÀ CRÉÉ
button_4gang/
button_6gang/
button_8gang/
button_scene/  ← Scene controller
button_dimmer/ ← Rotary dimmer
```

### Phase 2: WALL SWITCHES (Priority HIGH) 🔴

**Ancien système** (18+ drivers):
```
zemismart_smart_switch_1gang_ac
zemismart_smart_switch_1gang_dc
zemismart_smart_switch_1gang_hybrid
zemismart_smart_switch_1gang_internal
...etc (4 variants × 6 gang counts)
```

**Nouveau système** (7 drivers):
```
switch_wall_1gang/  ← Unifié (AC/DC auto-detect)
switch_wall_2gang/
switch_wall_3gang/
switch_wall_4gang/
switch_wall_6gang/
switch_touch_1gang/  ← Touch variant
switch_touch_3gang/
```

### Phase 3: SENSORS (Priority MEDIUM) 🟡

**Catégories:**
```
sensor_motion/         ← PIR basic
sensor_motion_multi/   ← Motion + Temp + Humidity + Lux
sensor_motion_radar/   ← Radar/mmWave
sensor_contact/        ← Door/window
sensor_temp_humidity/  ← Climate
sensor_water_leak/
sensor_smoke/
sensor_gas/
sensor_air_quality/
```

### Phase 4: ACTUATORS (Priority MEDIUM) 🟡

```
plug_smart/       ← Smart plug (energy monitoring)
curtain_motor/    ← Curtain/blind
valve_smart/      ← Water valve
lock_basic/
lock_fingerprint/
siren/
```

### Phase 5: LIGHTING (Priority LOW) 🟢

```
bulb_white/
bulb_rgb/
bulb_tunable/
led_strip/
```

## 🛠️ TECHNICAL IMPLEMENTATION

### Base Classes (✅ DÉJÀ CRÉÉS)

```javascript
ZigBeeDevice
    ↓
BaseHybridDevice          // lib/BaseHybridDevice.js
    ├── detectPowerSource()      // AC/DC/Battery auto-detection
    ├── configurePowerCapabilities()  // Dynamic capabilities
    ├── detectBatteryType()       // CR2032/CR2450/AAA
    └── setupMonitoring()         // Reporting config
    ↓
ButtonDevice              // lib/ButtonDevice.js
    ├── setupButtonDetection()    // Click types
    ├── handleButtonCommand()     // Press logic
    └── triggerButtonPress()      // Flow cards
    ↓
SwitchDevice              // lib/SwitchDevice.js
    ├── setupSwitchControl()      // On/Off logic
    └── setupEnergyMonitoring()   // Power/Energy
```

### Power Detection Logic

```javascript
async detectPowerSource() {
  // Read Basic cluster attribute 0x0007 (powerSource)
  const powerSource = await readAttribute('basic', 'powerSource');
  
  switch (powerSource) {
    case 0x01: // Mains (single phase)
    case 0x02: // Mains (3 phase)
    case 0x05: // USB
    case 0x06: // Emergency mains
      this.powerType = 'AC';
      await this.addCapability('measure_power');
      await this.addCapability('meter_power');
      break;
      
    case 0x03: // Battery
      this.powerType = 'BATTERY';
      await this.addCapability('measure_battery');
      await this.detectBatteryType();
      break;
      
    case 0x04: // DC Source
      this.powerType = 'DC';
      await this.addCapability('measure_voltage');
      break;
      
    default:
      await this.fallbackPowerDetection();
  }
}

async detectBatteryType() {
  const voltage = await readAttribute('powerConfiguration', 'batteryVoltage');
  
  if (voltage >= 28 && voltage <= 32) {
    this.batteryType = 'CR2032';  // 3.0V
  } else if (voltage >= 28 && voltage <= 32 && deviceSize === 'large') {
    this.batteryType = 'CR2450';  // 3.0V but larger
  } else if (voltage >= 40 && voltage <= 50) {
    this.batteryType = 'AAA';     // 4.5V (3x AAA)
  } else if (voltage >= 50 && voltage <= 65) {
    this.batteryType = 'AA';      // 6.0V (4x AA)
  }
  
  await this.setSettings({ battery_type: this.batteryType });
  this.setEnergy({ batteries: [this.batteryType] });
}
```

### Manufacturer ID Consolidation

**Stratégie:**
1. Scanner tous les drivers existants
2. Extraire tous les manufacturer IDs
3. Grouper par fonction (buttons, switches, sensors, etc.)
4. Dédupliquer
5. Consolider dans les nouveaux drivers unifiés

**Script à créer:**
```javascript
// scripts/consolidate_manufacturer_ids.js
const fs = require('fs');
const path = require('path');

// Scan all driver.compose.json
// Extract manufacturerName arrays
// Group by device type
// Remove duplicates
// Output consolidated lists
```

## 📝 NAMING CONVENTION (UNBRANDED)

**Principe:** Nom basé sur FONCTION, pas MARQUE

### ❌ Ancien (branded):
```
zemismart_wireless_switch_3button_cr2032
moes_smart_switch_2gang_ac
avatto_wall_switch_4gang_dc
```

### ✅ Nouveau (unbranded, function-based):
```
button_3gang          (wireless, auto-detect battery)
switch_wall_2gang     (wall-mounted, auto-detect AC/DC)
switch_wall_4gang     (wall-mounted, auto-detect AC/DC)
```

## 🔧 SDK3 COMPLIANCE FIXES

### ❌ NON-COMPLIANT (À RETIRER):
```javascript
capabilities: [
  'alarm_battery',  // ❌ DEPRECATED SDK3
  'onoff'
]
```

### ✅ SDK3 COMPLIANT:
```javascript
capabilities: [
  'measure_battery', // ✅ SDK3
  'onoff'
],
energy: {
  batteries: ['CR2032']  // ✅ REQUIS avec measure_battery
}
```

### Settings à Standardiser:
```javascript
// ❌ Éviter les doublons
battery_threshold
battery_low_threshold
low_battery_threshold

// ✅ Standard unifié
battery_low_threshold    // Seul setting pour seuil batterie
battery_reporting_interval  // Seul setting pour intervalle
```

## 📋 MIGRATION MAP

**Mapping ancien → nouveau** (pour documentation utilisateur):

```json
{
  "zemismart_wireless_switch_1button_cr2032": "button_1gang",
  "zemismart_wireless_switch_1button_cr2450": "button_1gang",
  "avatto_wireless_button_1gang_aaa": "button_1gang",
  
  "zemismart_wireless_switch_2button_cr2032": "button_2gang",
  "moes_wireless_button_2gang_cr2450": "button_2gang",
  
  "zemismart_wireless_switch_3button_cr2032": "button_3gang",
  "avatto_wireless_switch_3button_cr2450": "button_3gang",
  
  "zemismart_smart_switch_1gang_ac": "switch_wall_1gang",
  "zemismart_smart_switch_1gang_dc": "switch_wall_1gang",
  "zemismart_smart_switch_1gang_hybrid": "switch_wall_1gang",
  
  "zemismart_smart_switch_2gang_ac": "switch_wall_2gang",
  "zemismart_smart_switch_2gang_dc": "switch_wall_2gang",
  
  "zemismart_smart_switch_3gang_ac": "switch_wall_3gang",
  "zemismart_smart_switch_3gang_dc": "switch_wall_3gang",
  "zemismart_smart_switch_3gang_cr2032": "button_3gang",
  "zemismart_smart_switch_3gang_hybrid": "switch_wall_3gang"
}
```

## 🚀 DÉPLOIEMENT

### v4.1.7 (CURRENT) ✅
- Fix syntax error wireless_switch_3button
- Fix SOS button IAS Zone enrollment
- Prepare hybrid architecture

### v4.2.0 (IN PROGRESS) 🔄
- ✅ Create base classes (BaseHybridDevice, ButtonDevice, SwitchDevice)
- ✅ Create button_3gang (first unified driver)
- ⏳ Create button_1gang, button_2gang, button_4gang, button_6gang, button_8gang
- ⏳ Create switch_wall_1gang through 6gang
- ⏳ Consolidate manufacturer IDs
- ⏳ Update all documentation

### v4.3.0 (NEXT)
- Deprecate old drivers (mark in app.json)
- Sensor consolidation
- Documentation update
- Migration guide

### v5.0.0 (FINAL)
- Remove deprecated drivers
- Final cleanup
- Performance optimization

## 📊 IMPACT ESTIMATION

### Réduction Nombre de Drivers:

**Avant v4.2.0:**
- Total: 183 drivers
- Buttons: ~24 drivers (8 counts × 3 power variants)
- Switches: ~18 drivers (6 counts × 3 power variants)
- Sensors: ~50 drivers (various)
- Others: ~91 drivers

**Après v4.2.0:**
- Total: ~60 drivers (-67% réduction)
- Buttons: 8 drivers unified
- Switches: 7 drivers unified
- Sensors: ~25 drivers unified
- Others: ~20 drivers

**Benefits:**
- ✅ 67% reduction in driver count
- ✅ Zero user confusion (no power source selection)
- ✅ Automatic adaptation to any power source
- ✅ Easier maintenance (no code duplication)
- ✅ 100% SDK3 compliant
- ✅ Future-proof architecture

## 🎯 PROCHAINES ACTIONS IMMÉDIATES

1. ✅ button_3gang créé et validé
2. 🔄 Créer button_1gang (template identique)
3. 🔄 Créer button_2gang
4. 🔄 Créer button_4gang
5. 🔄 Créer button_6gang
6. 🔄 Créer button_8gang
7. 🔄 Créer switch_wall_1gang
8. 🔄 Créer switch_wall_2gang
9. 🔄 Créer switch_wall_3gang
10. 🔄 Tester avec devices réels

## 📝 NOTES IMPORTANTES

### Manufacturer IDs à Enrichir:
- Ian_Gibbo devices: `_TZ3000_00mk2xzy`, `_TZ3000_h1ipgkwn`, `_TZE284_1lvln0x6`, HOBEIAN
- Ajouter à drivers appropriés

### Flow Cards:
- Garder triggers génériques (button_pressed, etc.)
- Ajouter triggers spécifiques par bouton
- Multilingual (8 languages)

### Settings:
- Garder simple et cohérent
- Éviter doublons
- SDK3 compliant

### Images:
- Copier depuis drivers existants
- Format: small.png (75x75), large.png (500x500), xlarge.png (1000x1000)
- Learnmode SVG pour pairing instructions

---

**Date**: 22 Oct 2025  
**Version Target**: v4.2.0  
**Status**: ✅ Phase 1 started - button_3gang complete  
**Next**: Continue button consolidation
