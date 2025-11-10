# 📋 PLAN DE RÉORGANISATION COMPLÈTE

## ⚠️ IMPORTANT: Homey Constraints
Homey **NE SUPPORTE PAS** de sous-dossiers dans `/drivers/`.
Structure obligatoire: `/drivers/{driver_id}/`

## ✅ SOLUTION ADOPTÉE

### 1. PRÉFIXAGE PAR MARQUE
Tous les drivers seront préfixés par leur marque principale:
- `tuya_*` - Tuya devices (95% de l'app)
- `aqara_*` - Aqara/Xiaomi devices
- `ikea_*` - IKEA TRADFRI devices
- `philips_*` - Philips Hue/Signify
- `sonoff_*` - Sonoff eWeLink
- etc.

### 2. NOMENCLATURE STANDARDISÉE

**Format:**
```
{brand}_{category}_{type}_{variant}_{power}
```

**Exemples:**
```
tuya_wall_switch_3gang_touch_ac
tuya_wireless_switch_4button_cr2032
tuya_plug_smart_energy_monitor_ac
tuya_motion_sensor_pir_illuminance_battery
aqara_door_window_sensor_battery
aqara_wireless_button_2gang_battery
ikea_remote_4button_styrbar_battery
philips_bulb_white_ambiance_ac
```

### 3. CATÉGORIES PRINCIPALES

**18 catégories identifiées:**

1. **wall_switches** (494 drivers)
   - Switches muraux AC/DC
   - Touch switches
   - Gang switches 1-8

2. **wireless_remotes** (571 drivers)
   - Wireless buttons
   - Scene controllers
   - Remote controls

3. **smart_switches** (903 drivers)
   - Smart switches AC/Hybrid
   - Relay modules
   - Switch modules

4. **plugs_sockets** (426 drivers)
   - Smart plugs
   - Energy monitoring plugs
   - Power sockets

5. **dimmers** (177 drivers)
   - Dimmer modules
   - Dimmer switches
   - Touch dimmers

6. **bulbs_lights** (285 drivers)
   - Smart bulbs
   - LED bulbs
   - RGB/CCT lights

7. **led_strips** (33 drivers)
   - LED strip controllers
   - RGB controllers

8. **curtains_shutters** (122 drivers)
   - Curtain motors
   - Roller shutters
   - Blind controllers

9. **motion_sensors** (676 drivers)
   - PIR sensors
   - mmWave/Radar sensors
   - Presence sensors

10. **climate_sensors** (618 drivers)
    - Temperature sensors
    - Humidity sensors
    - Temp/Humidity combos

11. **door_window_sensors** (325 drivers)
    - Contact sensors
    - Door/Window sensors

12. **water_sensors** (218 drivers)
    - Water leak detectors
    - Water leak sensors

13. **safety_sensors** (609 drivers)
    - Smoke detectors
    - CO detectors
    - Gas sensors

14. **air_quality** (244 drivers)
    - Air quality monitors
    - TVOC sensors
    - PM2.5 sensors
    - CO2 sensors

15. **heating_cooling** (109 drivers)
    - Thermostats
    - Radiator valves
    - Temperature controllers

16. **locks** (75 drivers)
    - Door locks
    - Smart locks

17. **alarms** (5 drivers)
    - Sirens
    - Alarm systems

18. **doorbells** (included in other)
    - Doorbells
    - Doorbell cameras

### 4. MAPPING COMPLET

#### WALL SWITCHES (494 drivers)
```
OLD: wall_switch_1gang_ac
NEW: tuya_wall_switch_1gang_ac

OLD: wall_switch_3gang_dc
NEW: tuya_wall_switch_3gang_dc

OLD: touch_switch_4gang_ac
NEW: tuya_wall_switch_4gang_touch_ac
```

#### WIRELESS REMOTES (571 drivers)
```
OLD: wireless_switch_1gang_cr2032
NEW: tuya_wireless_switch_1button_cr2032

OLD: scene_controller_4button_cr2032
NEW: tuya_scene_controller_4button_cr2032

OLD: remote_4button_styrbar_battery
NEW: ikea_remote_4button_styrbar_battery
```

#### SMART SWITCHES (903 drivers)
```
OLD: smart_switch_1gang_ac
NEW: tuya_smart_switch_1gang_ac

OLD: switch_3gang_battery
NEW: tuya_switch_3gang_battery_cr2032
```

#### PLUGS & SOCKETS (426 drivers)
```
OLD: smart_plug_ac
NEW: tuya_plug_smart_basic_ac

OLD: smart_plug_energy_ac
NEW: tuya_plug_smart_energy_monitor_ac

OLD: energy_monitoring_plug_advanced_ac
NEW: tuya_plug_energy_monitor_advanced_ac
```

#### DIMMERS (177 drivers)
```
OLD: dimmer_ac
NEW: tuya_dimmer_module_ac

OLD: touch_dimmer_1gang_ac
NEW: tuya_dimmer_1gang_touch_ac

OLD: wireless_dimmer_scroll_battery
NEW: tuya_dimmer_wireless_scroll_battery
```

#### BULBS & LIGHTS (285 drivers)
```
OLD: smart_bulb_rgb_ac
NEW: tuya_bulb_smart_rgb_ac

OLD: bulb_white_ambiance_ac
NEW: philips_bulb_white_ambiance_ac

OLD: bulb_color_rgbcct_ac
NEW: tuya_bulb_color_rgbcct_ac
```

#### LED STRIPS (33 drivers)
```
OLD: led_strip_controller_ac
NEW: tuya_led_strip_controller_basic_ac

OLD: led_strip_controller_pro_ac
NEW: tuya_led_strip_controller_pro_ac

OLD: rgb_led_controller_ac
NEW: tuya_led_controller_rgb_ac
```

#### CURTAINS & SHUTTERS (122 drivers)
```
OLD: curtain_motor_ac
NEW: tuya_curtain_motor_ac

OLD: roller_shutter_switch_cr2032
NEW: tuya_shutter_switch_cr2032

OLD: shade_controller_ac
NEW: tuya_shade_controller_ac
```

#### MOTION SENSORS (676 drivers)
```
OLD: motion_sensor_battery
NEW: tuya_motion_sensor_pir_basic_battery

OLD: motion_sensor_mmwave_battery
NEW: tuya_motion_sensor_mmwave_battery

OLD: presence_sensor_fp2_ac
NEW: tuya_presence_sensor_fp2_ac

OLD: motion_sensor_zigbee_204z_battery
NEW: hobeian_motion_sensor_zg204z_battery
```

#### CLIMATE SENSORS (618 drivers)
```
OLD: temperature_humidity_sensor_battery
NEW: tuya_temp_humidity_sensor_basic_battery

OLD: temp_sensor_pro_battery
NEW: tuya_temp_sensor_pro_battery

OLD: temperature_humidity_display_battery
NEW: tuya_temp_humidity_display_battery
```

#### DOOR/WINDOW SENSORS (325 drivers)
```
OLD: contact_sensor_battery
NEW: tuya_contact_sensor_battery

OLD: door_window_sensor_battery
NEW: tuya_door_window_sensor_battery
```

#### WATER SENSORS (218 drivers)
```
OLD: water_leak_detector_battery
NEW: tuya_water_leak_detector_basic_battery

OLD: water_leak_detector_advanced_battery
NEW: tuya_water_leak_detector_advanced_battery

OLD: water_leak_sensor_battery
NEW: tuya_water_leak_sensor_battery
```

#### SAFETY SENSORS (609 drivers)
```
OLD: smoke_detector_battery
NEW: tuya_smoke_detector_basic_battery

OLD: smoke_detector_temp_humidity_advanced_battery
NEW: tuya_smoke_detector_temp_humidity_advanced_battery

OLD: co_detector_pro_battery
NEW: tuya_co_detector_pro_battery

OLD: gas_detector_battery
NEW: tuya_gas_detector_battery
```

#### AIR QUALITY (244 drivers)
```
OLD: air_quality_monitor_ac
NEW: tuya_air_quality_monitor_ac

OLD: tvoc_sensor_battery
NEW: tuya_tvoc_sensor_basic_battery

OLD: pm25_detector_battery
NEW: tuya_pm25_detector_battery

OLD: co2_sensor_battery
NEW: tuya_co2_sensor_battery
```

#### HEATING/COOLING (109 drivers)
```
OLD: thermostat_hybrid
NEW: tuya_thermostat_basic_hybrid

OLD: smart_thermostat_hybrid
NEW: tuya_thermostat_smart_hybrid

OLD: radiator_valve_hybrid
NEW: tuya_radiator_valve_hybrid

OLD: water_valve_hybrid
NEW: tuya_water_valve_hybrid
```

#### LOCKS (75 drivers)
```
OLD: door_lock_battery
NEW: tuya_door_lock_battery

OLD: smart_lock_battery
NEW: tuya_lock_smart_battery

OLD: fingerprint_lock_battery
NEW: tuya_lock_fingerprint_battery
```

#### ALARMS (5 drivers)
```
OLD: alarm_siren_chime_ac
NEW: tuya_alarm_siren_chime_ac

OLD: outdoor_siren_cr2032
NEW: tuya_siren_outdoor_cr2032
```

#### DOORBELLS
```
OLD: doorbell_cr2032
NEW: tuya_doorbell_button_cr2032

OLD: smart_doorbell_battery
NEW: tuya_doorbell_camera_battery

OLD: doorbell_camera_ac
NEW: tuya_doorbell_camera_ac
```

## 🔧 ÉTAPES D'EXÉCUTION

### Phase 1: Préparation
1. ✅ Analyser tous les manufacturers
2. ✅ Créer mapping complet
3. ⏳ Valider avec utilisateur
4. ⏳ Backup complet

### Phase 2: Renommage
1. Renommer dossiers drivers
2. Mettre à jour driver.compose.json (id)
3. Mettre à jour flow files (filter driver_id)
4. Mettre à jour images paths

### Phase 3: App.json
1. Mettre à jour categories
2. Organiser discovery
3. Créer brand filtering

### Phase 4: Validation
1. Tester compilation
2. Valider structure
3. Vérifier flows
4. Test installation

### Phase 5: Flow Cards
1. Compléter flows manquants
2. Ajouter battery info
3. Enrichir features
4. Standardiser naming

## ⚠️ RISQUES & CONSIDÉRATIONS

### RISQUES MAJEURS:
1. **Breaking change** - Utilisateurs devront re-pairer devices
2. **Migration impossible** - Pas de migration automatique
3. **Loss of data** - Utilisateurs perdront flows existants
4. **App Store** - Nouvelle soumission requise

### ALTERNATIVES:
1. **Garder IDs actuels** - Ajouter seulement categories
2. **Soft migration** - Garder anciens + nouveaux drivers
3. **Documentation** - Guide migration utilisateurs

## 📊 STATISTIQUES

- **Total drivers:** 190
- **Drivers à renommer:** 190 (100%)
- **Flow files à mettre à jour:** ~150
- **Images à déplacer:** ~380
- **Categories:** 18
- **Brands:** 26

## 💬 RECOMMANDATION

**⚠️ NE PAS PROCÉDER** avec renommage complet car:
- Breaking change massif
- Perte de données utilisateurs
- Migration impossible

**✅ APPROCHE RECOMMANDÉE:**
1. Garder IDs actuels
2. Améliorer noms affichés (déjà fait!)
3. Ajouter categories dans app.json
4. Créer brand filtering via discovery
5. Enrichir flows et features
6. Documentation utilisateur

## 🎯 DÉCISION UTILISATEUR

Attendre validation avant de procéder:
- [ ] Procéder avec renommage complet (breaking)
- [ ] Approche soft (garder IDs, améliorer UX)
- [ ] Hybrid (nouveaux drivers + garder anciens)
