# 🚀 Migration v4.0.0 - Breaking Change Total

## 📋 Vue d'ensemble

Système complet de migration automatisée pour réorganiser tous les drivers par:
1. **MARQUE** (Tuya, Aqara, IKEA, Philips, etc.)
2. **TYPE DE BATTERIE** (CR2032, AAA, AA, CR2450, etc.)
3. **NOMENCLATURE CLAIRE** (`{brand}_{category}_{type}_{battery}`)

## 🎯 Résultat Attendu

- **190 drivers actuels** → **~318 drivers** (duplication multi-battery)
- Préfixe marque: `tuya_`, `aqara_`, `ikea_`, etc.
- Suffixe batterie: `_cr2032`, `_aaa`, `_aa`, etc.
- Noms explicites et uniques

## 📂 Scripts Disponibles

### 🎭 00_orchestrator.js - **SCRIPT PRINCIPAL**
Lance toutes les phases automatiquement dans l'ordre.

```bash
node scripts/migration/00_orchestrator.js
```

**Phases exécutées:**
1. Analyse & Mapping
2. Duplication Multi-Battery
3. Renommage Drivers
4. Update Références
5. Validation Finale

### 📊 01_analyze_and_map.js - Phase 1
Analyse tous les drivers et génère le mapping OLD → NEW.

```bash
node scripts/migration/01_analyze_and_map.js
```

**Output:** `MIGRATION_MAP_v4.json`

**Actions:**
- Détecte la marque (manufacturerName analysis)
- Identifie les batteries (energy.batteries)
- Génère nouveaux IDs
- Sauvegarde mapping complet
- Affiche statistiques

### 📋 02_duplicate_drivers.js - Phase 2
Duplique les drivers supportant plusieurs batteries.

```bash
node scripts/migration/02_duplicate_drivers.js
```

**Actions:**
- Copie dossier driver complet
- Update `driver.compose.json` (id, name, energy.batteries)
- Update `driver.flow.compose.json` (filters, IDs)
- Crée 1 driver par type de batterie

### ✏️ 03_rename_drivers.js - Phase 3
Renomme les drivers existants avec nouvelle nomenclature.

```bash
node scripts/migration/03_rename_drivers.js
```

**Actions:**
- Renomme dossiers drivers/
- Update `driver.compose.json` (id, name)
- Update `driver.flow.compose.json` (filters, IDs)
- Préserve assets et fichiers

### 🔄 04_update_references.js - Phase 4
Met à jour toutes les références dans le projet.

```bash
node scripts/migration/04_update_references.js
```

**Actions:**
- Update `app.json` (version 4.0.0)
- Update `README.md` (breaking notice)
- Update/Create `CHANGELOG.md`
- Create `MIGRATION_GUIDE_v4.md`

### ✅ 05_validate.js - Phase 5
Validation complète avant commit.

```bash
node scripts/migration/05_validate.js
```

**Checks:**
- Mapping existe
- Compte drivers
- Vérifie structure (compose, images)
- Valide app.json
- Execute `homey app validate`

## 🚀 Exécution Complète

### Option A: Orchestrateur (Recommandé)

```bash
# Tout en une fois
node scripts/migration/00_orchestrator.js
```

Confirmer à chaque prompt:
- Taper "oui" pour continuer

### Option B: Phase par Phase

```bash
# Phase 1: Analyse
node scripts/migration/01_analyze_and_map.js

# Revue: MIGRATION_MAP_v4.json

# Phase 2: Duplication
node scripts/migration/02_duplicate_drivers.js

# Phase 3: Renommage
node scripts/migration/03_rename_drivers.js

# Phase 4: Update Références
node scripts/migration/04_update_references.js

# Phase 5: Validation
node scripts/migration/05_validate.js
```

## 📊 Outputs Générés

### MIGRATION_MAP_v4.json
```json
{
  "generatedAt": "2025-10-20T...",
  "stats": {
    "total": 190,
    "toRename": 126,
    "toDuplicate": 128,
    "brands": { "tuya": 180, "aqara": 48, ... },
    "batteries": { "CR2032": 85, "AAA": 63, ... }
  },
  "mapping": [
    {
      "oldId": "motion_sensor_battery",
      "newId": "tuya_motion_sensor_pir_basic_cr2032",
      "brand": "tuya",
      "battery": "CR2032",
      "action": "duplicate"
    },
    ...
  ]
}
```

### MIGRATION_GUIDE_v4.md
Guide complet pour utilisateurs avec:
- Explication du changement
- Steps de migration
- Mapping exemples
- FAQ

## 🎯 Exemples Transformation

### Sensors
```
motion_sensor_battery [AAA, CR2032]
→ tuya_motion_sensor_pir_basic_cr2032
→ tuya_motion_sensor_pir_basic_aaa

temperature_humidity_sensor_battery [AAA, CR2032]
→ tuya_temp_humidity_sensor_basic_cr2032
→ tuya_temp_humidity_sensor_basic_aaa

water_leak_detector_advanced_battery [AAA, CR2032]
→ tuya_water_leak_detector_advanced_cr2032
→ tuya_water_leak_detector_advanced_aaa
```

### Switches
```
wireless_switch_3gang_cr2032
→ tuya_wireless_switch_3button_cr2032

wall_switch_4gang_ac
→ tuya_wall_switch_4gang_ac

smart_switch_2gang_hybrid
→ tuya_smart_switch_2gang_hybrid
```

### Plugs
```
smart_plug_ac
→ tuya_plug_smart_basic_ac

energy_monitoring_plug_advanced_ac
→ tuya_plug_energy_monitor_advanced_ac
```

### Locks
```
door_lock_battery [AA, AAA]
→ tuya_lock_basic_aa
→ tuya_lock_basic_aaa

smart_lock_battery [AA]
→ tuya_lock_smart_aa
```

## 🔍 Détection Marque

### Règles Intelligentes

```javascript
manufacturerName:
  _TZ*, _TY*      → tuya
  lumi*, LUMI     → aqara
  IKEA, TRADFRI   → ikea
  Philips         → philips
  Sonoff          → sonoff
  Legrand         → legrand
  Schneider       → schneider
  Samsung         → samsung
  Default         → tuya (95%)
```

## ⚠️ Important

### Backup Recommandé
```bash
# Backup avant migration
git stash
git checkout -b backup-pre-v4
git push origin backup-pre-v4
git checkout master
git stash pop
```

### Rollback (si nécessaire)
```bash
git reset --hard backup-pre-v4
git push origin master --force
```

## 📝 Après Migration

### 1. Vérification
```bash
git status
git diff --stat
```

### 2. Commit
```bash
git add -A
git commit -m "feat: v4.0.0 breaking change - brand & battery reorganization"
```

### 3. Push
```bash
git push origin master
```

### 4. Communication
- Post forum Homey
- Update App Store description
- Email utilisateurs actifs

## 🆘 Support

Questions? Problèmes?
- Review `MIGRATION_MAP_v4.json`
- Check logs de chaque phase
- Contact: GitHub Issues

## 📊 Statistiques Attendues

- **Drivers finaux:** ~318
- **Marques:** 10+
- **Types batterie:** 6
- **Duplications:** ~128
- **Renommages:** ~126
- **Version:** 4.0.0
