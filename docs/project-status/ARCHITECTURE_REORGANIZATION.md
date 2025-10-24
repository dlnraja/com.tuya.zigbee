# 🗂️ RÉORGANISATION ARCHITECTURE DRIVERS

**Date:** 16 Octobre 2025, 12:09 UTC+2  
**Objectif:** Architecture cohérente, logique et maintenable  
**Status:** 🔄 RÉORGANISATION EN COURS

---

## 📋 ANALYSE ACTUELLE

### Problèmes Identifiés
```
❌ Nommage incohérent: ac_battery mixte
❌ Suffixes redondants: _ac, _battery, _cr2032
❌ Organisation plate (183 dossiers au même niveau)
❌ Pas de catégorisation par fonction
❌ Difficile à naviguer et maintenir
```

### Statistiques Actuelles
```
Total drivers:     183
AC powered:        ~120
Battery:           ~50
CR2032:            ~13
Hybrid:            Aucun (à créer)
```

---

## 🎯 NOUVELLE ARCHITECTURE

### Principes de Design
```
✅ Organisation par CATÉGORIE FONCTIONNELLE
✅ Power source dans metadata (pas dans nom dossier)
✅ Nommage cohérent et lisible
✅ Structure hiérarchique claire
✅ Maintenabilité maximale
```

### Structure Proposée
```
drivers/
├── 01_lighting/              # Éclairage (bulbs, strips, controllers)
│   ├── bulb_white/
│   ├── bulb_white_ambiance/
│   ├── bulb_color_rgbcct/
│   ├── led_strip_controller/
│   ├── led_strip_advanced/
│   ├── led_strip_outdoor/
│   ├── ceiling_light_controller/
│   └── ceiling_light_rgb/
│
├── 02_switches/              # Switches & Dimmers
│   ├── switch_1gang/
│   ├── switch_2gang/
│   ├── switch_3gang/
│   ├── switch_4gang/
│   ├── dimmer_1gang/
│   ├── dimmer_3gang/
│   ├── mini_switch/
│   └── remote_switch/
│
├── 03_plugs/                 # Smart Plugs
│   ├── smart_plug/
│   ├── smart_plug_energy/
│   ├── smart_plug_advanced/
│   ├── extension_plug/
│   └── mini_plug/
│
├── 04_sensors/               # Sensors
│   ├── motion/
│   │   ├── motion_basic/
│   │   ├── motion_illuminance/
│   │   └── motion_mmwave/
│   ├── contact/
│   │   ├── door_window/
│   │   └── vibration/
│   ├── climate/
│   │   ├── temperature_humidity/
│   │   ├── co2_monitor/
│   │   └── pressure_monitor/
│   ├── air_quality/
│   │   ├── air_quality_basic/
│   │   ├── air_quality_pro/
│   │   └── formaldehyde/
│   ├── safety/
│   │   ├── smoke_detector/
│   │   ├── gas_detector/
│   │   ├── co_detector/
│   │   └── water_leak/
│   └── other/
│       ├── lux_sensor/
│       └── soil_moisture/
│
├── 05_security/              # Security & Alarms
│   ├── siren_alarm/
│   ├── siren_chime/
│   ├── sos_button/
│   ├── door_lock/
│   ├── fingerprint_lock/
│   └── doorbell/
│
├── 06_climate/               # Climate Control
│   ├── thermostat/
│   │   ├── thermostat_basic/
│   │   ├── thermostat_lcd/
│   │   └── thermostat_pro/
│   ├── hvac_controller/
│   ├── trv_valve/
│   │   ├── trv_basic/
│   │   └── trv_advanced/
│   ├── humidity_controller/
│   └── fan_controller/
│
├── 07_motors/                # Motors & Actuators
│   ├── curtain_motor/
│   ├── blind_controller/
│   ├── valve_controller/
│   ├── garage_door/
│   └── door_controller/
│
├── 08_buttons/               # Buttons & Remotes
│   ├── button_1/
│   ├── button_2/
│   ├── button_4/
│   ├── button_6/
│   ├── scene_switch/
│   └── rotary_dimmer/
│
└── 09_specialized/           # Specialized Devices
    ├── ceiling_fan/
    ├── pet_feeder/
    ├── irrigation_controller/
    ├── doorbell_camera/
    └── presence_detector/
```

---

## 🔄 PLAN DE MIGRATION

### Phase 1: Catégorisation (30 min)
```bash
1. Analyser tous les 183 drivers
2. Catégoriser par fonction principale
3. Créer mapping ancien → nouveau nom
4. Générer script de migration
```

### Phase 2: Création Structure (15 min)
```bash
1. Créer dossiers catégories (01_ à 09_)
2. Créer sous-dossiers par type
3. Valider structure vide
```

### Phase 3: Migration Fichiers (45 min)
```bash
1. Copier drivers vers nouvelles locations
2. Mettre à jour paths dans driver.compose.json
3. Mettre à jour references dans app.json
4. Valider compilation
```

### Phase 4: Metadata Update (30 min)
```bash
1. Ajouter power_source dans driver settings
2. Retirer suffixes _ac, _battery, _cr2032
3. Standardiser naming convention
4. Update driver IDs
```

### Phase 5: Scripts Update (30 min)
```bash
1. Update organize-project.ps1
2. Update automation scripts
3. Update documentation links
4. Update README generator
```

### Phase 6: Validation (30 min)
```bash
1. homey app validate
2. Test compilation
3. Check broken links
4. Verify all drivers accessible
```

---

## 📝 NAMING CONVENTION

### Ancienne Convention (AVANT)
```
❌ motion_sensor_battery
❌ smart_plug_ac
❌ thermostat_battery_cr2032
❌ switch_1gang_ac
```

### Nouvelle Convention (APRÈS)
```
✅ motion_basic          (metadata: power_source: battery)
✅ smart_plug            (metadata: power_source: ac)
✅ thermostat_basic      (metadata: power_source: battery, battery_type: CR2032)
✅ switch_1gang          (metadata: power_source: ac)
```

### Power Source Metadata
```json
{
  "power_source": "ac|battery|hybrid|solar",
  "battery_type": "CR2032|CR2450|AAA|AA|built-in",
  "battery_replaceable": true|false,
  "battery_count": 1|2|3
}
```

---

## 🗺️ MAPPING DRIVERS

### 01_lighting/ (28 drivers)
```
bulb_white_ac                    → lighting/bulb_white/
bulb_white_ambiance_ac           → lighting/bulb_white_ambiance/
bulb_color_rgbcct_ac             → lighting/bulb_color_rgbcct/
led_strip_controller_ac          → lighting/led_strip_controller/
led_strip_advanced_ac            → lighting/led_strip_advanced/
led_strip_outdoor_color_ac       → lighting/led_strip_outdoor/
led_strip_controller_pro_ac      → lighting/led_strip_pro/
ceiling_light_controller_ac      → lighting/ceiling_light_controller/
ceiling_light_rgb_ac             → lighting/ceiling_light_rgb/
milight_controller_ac            → lighting/milight_controller/
... (+ 18 autres)
```

### 02_switches/ (42 drivers)
```
switch_1gang_ac                  → switches/switch_1gang/
switch_2gang_ac                  → switches/switch_2gang/
switch_3gang_ac                  → switches/switch_3gang/
switch_4gang_ac                  → switches/switch_4gang/
dimmer_switch_1gang_ac           → switches/dimmer_1gang/
dimmer_switch_3gang_ac           → switches/dimmer_3gang/
mini_switch_cr2032               → switches/mini_switch/
remote_switch_battery            → switches/remote_switch/
... (+ 34 autres)
```

### 03_plugs/ (18 drivers)
```
smart_plug_ac                    → plugs/smart_plug/
energy_monitoring_plug_ac        → plugs/smart_plug_energy/
energy_monitoring_plug_advanced_ac → plugs/smart_plug_advanced/
extension_plug_ac                → plugs/extension_plug/
mini_ac                          → plugs/mini_plug/
... (+ 13 autres)
```

### 04_sensors/ (52 drivers)
```
Motion:
motion_sensor_battery            → sensors/motion/motion_basic/
motion_sensor_illuminance_battery → sensors/motion/motion_illuminance/
motion_sensor_mmwave_battery     → sensors/motion/motion_mmwave/

Contact:
door_window_sensor_battery       → sensors/contact/door_window/
contact_sensor_battery           → sensors/contact/contact_basic/
vibration_sensor_battery         → sensors/contact/vibration/

Climate:
temperature_humidity_sensor_battery → sensors/climate/temperature_humidity/
climate_monitor_cr2032           → sensors/climate/climate_basic/
co2_sensor_battery               → sensors/climate/co2_monitor/
co2_temp_humidity_cr2032         → sensors/climate/co2_temp_humidity/

Air Quality:
air_quality_monitor_ac           → sensors/air_quality/air_quality_basic/
air_quality_monitor_pro_battery  → sensors/air_quality/air_quality_pro/
comprehensive_air_monitor_ac     → sensors/air_quality/comprehensive/
formaldehyde_sensor_battery      → sensors/air_quality/formaldehyde/

Safety:
smoke_detector_battery           → sensors/safety/smoke_detector/
gas_detector_battery             → sensors/safety/gas_detector/
gas_sensor_ts0601_ac             → sensors/safety/gas_sensor_ac/
gas_sensor_ts0601_battery        → sensors/safety/gas_sensor_battery/
co_detector_pro_battery          → sensors/safety/co_detector/
water_leak_sensor_battery        → sensors/safety/water_leak/

Other:
lux_sensor_battery               → sensors/other/lux_sensor/
soil_moisture_sensor_battery     → sensors/other/soil_moisture/
... (+ 30 autres)
```

### 05_security/ (12 drivers)
```
alarm_siren_chime_ac             → security/siren_chime/
siren_alarm_battery              → security/siren_alarm/
sos_button_battery               → security/sos_button/
door_lock_battery                → security/door_lock/
fingerprint_lock_battery         → security/fingerprint_lock/
doorbell_cr2032                  → security/doorbell/
doorbell_camera_ac               → security/doorbell_camera/
... (+ 5 autres)
```

### 06_climate/ (18 drivers)
```
thermostat_battery               → climate/thermostat/thermostat_basic/
thermostat_lcd_battery           → climate/thermostat/thermostat_lcd/
thermostat_pro_ac                → climate/thermostat/thermostat_pro/
hvac_controller_ac               → climate/hvac_controller/
trv_valve_battery                → climate/trv_valve/trv_basic/
trv_advanced_battery             → climate/trv_valve/trv_advanced/
humidity_controller_ac           → climate/humidity_controller/
fan_controller_ac                → climate/fan_controller/
... (+ 10 autres)
```

### 07_motors/ (8 drivers)
```
curtain_motor_ac                 → motors/curtain_motor/
curtain_switch_ac                → motors/curtain_switch/
roller_blind_ac                  → motors/blind_controller/
valve_controller_ac              → motors/valve_controller/
garage_door_controller_ac        → motors/garage_door/
garage_door_opener_cr2032        → motors/garage_door_remote/
door_controller_ac               → motors/door_controller/
... (+ 1 autre)
```

### 08_buttons/ (12 drivers)
```
button_1_battery                 → buttons/button_1/
button_2_battery                 → buttons/button_2/
button_4_battery                 → buttons/button_4/
button_6_battery                 → buttons/button_6/
scene_switch_battery             → buttons/scene_switch/
rotary_dimmer_battery            → buttons/rotary_dimmer/
wireless_switch_battery          → buttons/wireless_switch/
... (+ 5 autres)
```

### 09_specialized/ (13 drivers)
```
ceiling_fan_ac                   → specialized/ceiling_fan/
pet_feeder_ac                    → specialized/pet_feeder/
irrigation_controller_ac         → specialized/irrigation/
presence_detector_mmwave_ac      → specialized/presence_detector/
occupancy_sensor_battery         → specialized/occupancy_sensor/
... (+ 8 autres)
```

**Total:** 183 drivers mappés ✅

---

## 🔧 POWER SOURCE LOGIC

### Nouvelle Convention Hybrid
```javascript
// Avant (incohérent)
❌ gas_sensor_ts0601_ac
❌ gas_sensor_ts0601_battery

// Après (cohérent)
✅ sensors/safety/gas_sensor/
   Metadata:
   - power_source: "hybrid"
   - power_modes: ["ac", "battery"]
   - default_mode: "ac"
   - battery_backup: true
```

### Types de Power Source
```
1. AC (Mains Powered)
   - Plugs, switches, AC lights
   - Always-on devices
   - Mesh repeaters

2. Battery (Battery Powered)
   - Sensors, remotes, buttons
   - CR2032, CR2450, AAA, AA
   - Low power consumption

3. Hybrid (AC + Battery Backup)
   - Gas sensors with backup
   - Smoke detectors dual power
   - Critical safety devices

4. Solar (Solar Powered)
   - Outdoor sensors
   - Irrigation controllers
   - Future support
```

---

## 📊 BENEFITS

### Pour Developers
```
✅ Navigation intuitive par catégorie
✅ Moins de noms redondants
✅ Metadata standardisée
✅ Maintenance facilitée
✅ Extensibilité améliorée
```

### Pour Users
```
✅ Recherche par catégorie
✅ Noms plus clairs
✅ Groupement logique
✅ Documentation organisée
```

### Pour le Projet
```
✅ Architecture professionnelle
✅ Scalabilité (500+ drivers future)
✅ Standards industry
✅ Open source friendly
```

---

## 🚀 EXECUTION

### Script de Migration
```powershell
# scripts/reorganize-drivers.ps1
# 1. Create new structure
# 2. Copy files with new names
# 3. Update all references
# 4. Validate
# 5. Commit
```

### Validation Checklist
- [ ] Structure créée
- [ ] Fichiers copiés
- [ ] References updated
- [ ] homey app validate
- [ ] Tests passed
- [ ] Documentation updated
- [ ] Scripts updated
- [ ] Git commit

---

**Status:** 📋 PLAN PRÊT  
**Next:** Création script migration automatique  
**ETA:** 2-3 heures pour migration complète

🎯 **Architecture cohérente, logique et scalable!**
