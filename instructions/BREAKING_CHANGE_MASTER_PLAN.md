# 🚀 BREAKING CHANGE MASTER PLAN - Réorganisation Totale

## ⚠️ BREAKING CHANGE CONFIRMÉ

**Utilisateur:** APPROUVÉ  
**Type:** Refonte complète  
**Impact:** TOUS les devices devront être re-pairés  
**Raison:** Utilisateurs se plaignent de trop de drivers similaires sans distinction marque

---

## 🎯 OBJECTIFS

1. **Séparer par MARQUE** - Chaque manufacturer a ses drivers
2. **Séparer par BATTERIE** - CR2032, AAA, AA distincts
3. **Nomenclature CLAIRE** - `{brand}_{category}_{type}_{battery}`
4. **Identification INTELLIGENTE** - Détecter marque depuis manufacturerName

---

## 📊 ANALYSE ACTUELLE

### DRIVERS PAR MARQUE (from previous analysis):
- **Tuya:** 95% des drivers (6037 occurrences)
- **Aqara:** 48 drivers
- **GE/Sengled:** 62 drivers chacun
- **Legrand/Schneider:** 34 drivers chacun
- **IKEA:** 11 drivers
- **Sonoff:** 7 drivers
- **SmartThings/Samsung:** 6+5 drivers

### DRIVERS PAR BATTERIE:
- **CR2032:** 85 drivers
- **AAA:** 63 drivers
- **AA:** 9 drivers
- **CR2450:** 3 drivers
- **CR123A:** 1 driver
- **INTERNAL:** 7 drivers
- **Multi-battery:** 64 drivers (doivent être dupliqués!)

---

## 🔧 NOUVELLE NOMENCLATURE

### FORMAT STANDARD:
```
{brand}_{category}_{subtype}_{variant}_{battery}
```

### EXEMPLES TRANSFORMATION:

#### SENSORS:
```
OLD: motion_sensor_battery
NEW: tuya_motion_sensor_pir_basic_cr2032
     tuya_motion_sensor_pir_basic_aaa
     aqara_motion_sensor_pir_lumi_cr2032

OLD: temperature_humidity_sensor_battery  
NEW: tuya_temp_humidity_sensor_basic_cr2032
     tuya_temp_humidity_sensor_basic_aaa
     aqara_temp_humidity_sensor_lumi_cr2032

OLD: water_leak_detector_battery
NEW: tuya_water_leak_detector_basic_cr2032
     tuya_water_leak_detector_basic_aaa
```

#### SWITCHES:
```
OLD: wireless_switch_3gang_cr2032
NEW: tuya_wireless_switch_3button_cr2032

OLD: wall_switch_3gang_ac
NEW: tuya_wall_switch_3gang_ac

OLD: smart_switch_2gang_hybrid
NEW: tuya_smart_switch_2gang_hybrid
```

#### LOCKS:
```
OLD: door_lock_battery
NEW: tuya_door_lock_basic_aa
     tuya_door_lock_basic_aaa

OLD: smart_lock_battery
NEW: tuya_smart_lock_advanced_aa
     aqara_smart_lock_lumi_aa
```

#### PLUGS:
```
OLD: smart_plug_ac
NEW: tuya_plug_smart_basic_ac
     
OLD: energy_monitoring_plug_ac
NEW: tuya_plug_energy_monitor_ac
```

---

## 🏢 DÉTECTION INTELLIGENTE MARQUE

### RÈGLES IDENTIFICATION:

```javascript
function detectBrand(manufacturerNames, productIds) {
  // Tuya variants
  if (manufacturerNames.some(m => m.includes('_TZ') || m.includes('_TY'))) {
    return 'tuya';
  }
  
  // Aqara/Xiaomi
  if (manufacturerNames.some(m => 
    m.toLowerCase().includes('lumi') || 
    m.toLowerCase().includes('aqara') ||
    productIds.some(p => p.startsWith('lumi.'))
  )) {
    return 'aqara';
  }
  
  // IKEA
  if (manufacturerNames.some(m => 
    m.toLowerCase().includes('ikea') || 
    m === 'TRADFRI'
  )) {
    return 'ikea';
  }
  
  // Philips/Signify
  if (manufacturerNames.some(m => 
    m.toLowerCase().includes('philips') ||
    m.includes('Signify')
  )) {
    return 'philips';
  }
  
  // Sonoff
  if (manufacturerNames.some(m => 
    m.toLowerCase().includes('sonoff') ||
    m.toLowerCase().includes('ewelink')
  )) {
    return 'sonoff';
  }
  
  // Legrand
  if (manufacturerNames.some(m => m.toLowerCase().includes('legrand'))) {
    return 'legrand';
  }
  
  // Schneider
  if (manufacturerNames.some(m => m.toLowerCase().includes('schneider'))) {
    return 'schneider';
  }
  
  // GE
  if (manufacturerNames.some(m => m.toLowerCase().includes('ge '))) {
    return 'ge';
  }
  
  // Sengled
  if (manufacturerNames.some(m => m.toLowerCase().includes('sengled'))) {
    return 'sengled';
  }
  
  // Samsung/SmartThings
  if (manufacturerNames.some(m => 
    m.toLowerCase().includes('samsung') ||
    m.toLowerCase().includes('smartthings') ||
    m === 'Samjin'
  )) {
    return 'samsung';
  }
  
  // Default: Tuya (95% of devices)
  return 'tuya';
}
```

---

## 🔄 MULTI-BATTERY STRATEGY

### PROBLÈME: 64 drivers supportent 2+ types

### SOLUTION: DUPLIQUER
```
motion_sensor_battery [AAA, CR2032]
→ tuya_motion_sensor_pir_basic_cr2032
→ tuya_motion_sensor_pir_basic_aaa

temperature_sensor_battery [AAA, CR2032]  
→ tuya_temp_humidity_sensor_basic_cr2032
→ tuya_temp_humidity_sensor_basic_aaa

water_leak_detector_battery [AAA, CR2032]
→ tuya_water_leak_detector_basic_cr2032
→ tuya_water_leak_detector_basic_aaa
```

**Calcul:** 64 multi × 2 types = **128 nouveaux drivers**  
**Total:** 190 actuels + 128 nouveaux = **318 drivers**

---

## 📁 STRUCTURE DRIVERS

### AVANT (flat):
```
drivers/
  motion_sensor_battery/
  temperature_sensor_battery/
  water_leak_detector_battery/
  ...
```

### APRÈS (par marque - IMPOSSIBLE Homey):
```
❌ drivers/
    tuya/
      tuya_motion_sensor_pir_cr2032/
    aqara/
      aqara_motion_sensor_pir_cr2032/
```
**⚠️ Homey ne supporte PAS les sous-dossiers!**

### APRÈS (flat avec préfixe):
```
✅ drivers/
    tuya_motion_sensor_pir_basic_cr2032/
    tuya_motion_sensor_pir_basic_aaa/
    tuya_temp_humidity_sensor_basic_cr2032/
    tuya_temp_humidity_sensor_basic_aaa/
    aqara_motion_sensor_pir_lumi_cr2032/
    aqara_temp_humidity_sensor_lumi_cr2032/
    ikea_remote_4button_styrbar_other/
    ...
```

---

## 🎨 CATÉGORIES APP.JSON

### Organisation par Marque & Type:
```json
{
  "category": [
    "sensors"
  ],
  "discovery": {
    "tuya_sensors": {
      "type": "zigbee",
      "manufacturerName": ["_TZ3000_*", "_TZ3210_*", "_TZE200_*"],
      "strategy": "find_tuya_sensors"
    },
    "aqara_sensors": {
      "type": "zigbee", 
      "manufacturerName": ["LUMI", "lumi.*"],
      "strategy": "find_aqara_sensors"
    },
    "ikea_devices": {
      "type": "zigbee",
      "manufacturerName": ["IKEA", "TRADFRI"],
      "strategy": "find_ikea_devices"
    }
  }
}
```

---

## 🔧 SCRIPT DE MIGRATION

### ÉTAPES:

1. **Analyse & Détection**
   ```javascript
   - Lire tous drivers
   - Détecter marque (manufacturerName)
   - Détecter batterie (energy.batteries)
   - Créer mapping OLD → NEW
   ```

2. **Duplication Multi-Battery**
   ```javascript
   - Identifier drivers multi-battery (64)
   - Créer 2+ copies par type
   - Adapter energy.batteries
   - Mettre à jour noms
   ```

3. **Renommage Dossiers**
   ```javascript
   - Renommer drivers/ folders
   - Mettre à jour driver.compose.json (id)
   - Mettre à jour flow files (filter)
   - Mettre à jour images paths
   ```

4. **Update References**
   ```javascript
   - app.json (drivers list)
   - README.md
   - CHANGELOG.md  
   - Documentation
   ```

5. **Validation**
   ```javascript
   - homey app validate --level publish
   - Vérifier tous IDs uniques
   - Vérifier images présentes
   - Vérifier flows cohérents
   ```

---

## ⏱️ TIMELINE

### Phase 1: Préparation (2h)
- ✅ Analyse types batterie (FAIT)
- ✅ Analyse marques (FAIT)
- ⏳ Script détection intelligente
- ⏳ Mapping complet OLD → NEW

### Phase 2: Exécution (4h)
- ⏳ Duplication multi-battery (128 drivers)
- ⏳ Renommage ALL drivers (318 total)
- ⏳ Update references
- ⏳ Fix images paths

### Phase 3: Validation (1h)
- ⏳ Validation Homey
- ⏳ Test build
- ⏳ Commit & push

### Phase 4: Communication (1h)
- ⏳ CHANGELOG détaillé
- ⏳ Migration guide utilisateurs
- ⏳ Forum announcement

**TOTAL:** ~8h de travail

---

## 📢 COMMUNICATION UTILISATEURS

### CHANGELOG v4.0.0 (BREAKING):

```markdown
# v4.0.0 - BREAKING CHANGE MAJEURE

## ⚠️ TOUS LES DEVICES DOIVENT ÊTRE RE-PAIRÉS

### Raisons du changement:
- Feedback utilisateurs: confusion avec drivers similaires
- Identification claire par MARQUE (Tuya, Aqara, IKEA, etc.)
- Séparation par TYPE DE BATTERIE (CR2032, AAA, AA)
- Meilleure organisation pour 300+ drivers

### Ce qui change:
- 190 drivers → 318 drivers (séparation batterie)
- Nouveaux noms: `{brand}_{category}_{type}_{battery}`
- Exemple: `motion_sensor_battery` → `tuya_motion_sensor_pir_basic_cr2032`

### Migration:
1. Noter vos flows existants
2. Supprimer anciens devices
3. Re-pairer avec nouveaux drivers
4. Recréer flows

### Avantages:
✅ Identification claire de la marque
✅ Type de batterie explicite
✅ Moins de confusion au pairing
✅ Meilleure organisation
✅ Calcul batterie optimisé par type
```

---

## 🎯 BÉNÉFICES POST-MIGRATION

### UTILISATEURS:
✅ Savent immédiatement la marque du device
✅ Voient le type de batterie dans le nom
✅ Moins de confusion au pairing
✅ Meilleur support (logs plus clairs)

### DÉVELOPPEMENT:
✅ Structure claire et scalable
✅ Facilite ajout nouvelles marques
✅ Maintenance simplifiée
✅ Tests ciblés par marque

### COMMUNAUTÉ:
✅ Compatibilité claire par marque
✅ Feedback plus précis
✅ Documentation améliorée
✅ Support forum facilité

---

## ⚠️ RISQUES & MITIGATION

### RISQUES:

1. **Breaking change massif**
   - Mitigation: Communication claire + guide migration
   
2. **Users mécontents (re-pairing)**
   - Mitigation: Expliquer bénéfices long-terme
   
3. **Bugs durant migration**
   - Mitigation: Tests approfondis + validation
   
4. **Perte flows utilisateurs**
   - Mitigation: Guide recréation flows

5. **App Store rejection**
   - Mitigation: Pre-validate + documentation complète

---

## ✅ CHECKLIST AVANT EXÉCUTION

- [ ] Backup complet repository
- [ ] User confirmation BREAKING CHANGE
- [ ] Script migration testé
- [ ] Validation plan ready
- [ ] Communication draft ready
- [ ] Migration guide written
- [ ] Forum post prepared
- [ ] Rollback strategy defined

---

## 🚀 COMMANDE D'EXÉCUTION

Une fois prêt:
```bash
node scripts/migration/EXECUTE_BREAKING_CHANGE_v4.js
```

**⚠️ CETTE COMMANDE EST IRRÉVERSIBLE! ⚠️**

---

## 📝 NOTES

- Version finale: v4.0.0 (breaking)
- Durée estimée: 8h
- Drivers finaux: 318
- Impact: 100% utilisateurs
- Benefit: Organisation claire long-terme

**DÉCISION FINALE: APPROUVÉ PAR UTILISATEUR**
