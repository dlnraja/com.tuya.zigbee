# 🤖 Scripts d'Automatisation - Système Complet

## 🎯 Vue d'Ensemble

Ce dossier contient le **système d'automatisation complet** pour:
- ✅ Conversion automatique interviews forum/GitHub → drivers fonctionnels
- ✅ Mise à jour bi-mensuelle de toutes les sources externes
- ✅ Intégration automatique données non-standard Tuya
- ✅ Génération parseurs custom pour datapoints propriétaires

**Documentation complète:** `/docs/automation/SYSTEME_AUTO_COMPLET.md`

---

## 🚀 Quick Start

### Générer Driver depuis Interview Forum

```bash
# 1. Placer interview dans data/forum/interviews/
# 2. Lancer processing
node scripts/automation/process-forum-interviews.js

# Driver généré automatiquement!
```

### Forcer Mise à Jour Sources

```bash
# Scraper toutes sources
node scripts/automation/scrapers/scrape-zigbee2mqtt.js
node scripts/automation/scrapers/scrape-home-assistant-zha.js

# Update databases
node scripts/automation/update-manufacturer-database.js
node scripts/automation/update-tuya-datapoints-db.js

# Generate rapport
node scripts/automation/generate-enrichment-report.js
```

---

## 📁 Structure

```
automation/
├── auto-driver-generator.js           ⭐ Générateur principal
├── process-forum-interviews.js        🔄 Forum → Drivers
├── process-github-issues.js           🔄 GitHub → Drivers
├── update-manufacturer-database.js    📊 MAJ Manufacturer IDs
├── update-tuya-datapoints-db.js       📊 MAJ Tuya Datapoints
├── batch-generate-drivers.js          🚀 Génération batch
│
├── scrapers/                          🕷️ Collecte données externes
│   ├── scrape-zigbee2mqtt.js
│   ├── scrape-home-assistant-zha.js
│   ├── scrape-blakadder.js
│   ├── scrape-johan-bendz.js
│   └── scrape-tuya-docs.js
│
└── README.md                          📖 Ce fichier
```

---

## 🤖 Auto Driver Generator

### Utilisation

```javascript
const AutoDriverGenerator = require('./auto-driver-generator');

const input = {
  type: 'forum',           // ou 'github_issue', 'diagnostic'
  content: `
    "manufacturerName": "_TZE204_yojqa8xn",
    "modelId": "TS0601",
    "inputClusters": [4, 5, 61184, 0]
  `
};

const result = await AutoDriverGenerator.generateDriverFromInput(input);
// → Driver créé dans drivers/gas_sensor_ts0601_tze204/
```

### Fonctionnalités

- ✅ Auto-détection device type (50+ patterns)
- ✅ Extraction manufacturer/model IDs
- ✅ Analyse clusters Zigbee
- ✅ Extraction Tuya datapoints (TS0601)
- ✅ Génération driver.compose.json
- ✅ Génération device.js avec handlers
- ✅ Génération capabilities automatiques
- ✅ Intégration dans projet

---

## 🕷️ Scrapers

### Zigbee2MQTT

```bash
node scrapers/scrape-zigbee2mqtt.js

# Output:
# data/sources/zigbee2mqtt/
#   ├── manufacturer-ids.json  (250+ IDs)
#   ├── devices.json           (2,800+ devices)
#   └── tuya-datapoints.json   (500+ mappings)
```

### Home Assistant ZHA

```bash
node scrapers/scrape-home-assistant-zha.js

# Output: Cluster configurations, quirks, device handlers
```

---

## 📊 Database Updates

### Manufacturer IDs

```bash
node update-manufacturer-database.js

# Actions:
# 1. Load existing database
# 2. Merge scraped sources
# 3. Validate format (_TZ[0-9A-Z]+_[a-z0-9]{8})
# 4. Remove duplicates
# 5. Save updated database
# 6. Generate statistics
```

### Tuya Datapoints

```bash
node update-tuya-datapoints-db.js

# Actions:
# 1. Load existing datapoints
# 2. Merge from 7 sources
# 3. Map to capabilities
# 4. Generate parsers
# 5. Save database
# 6. Generate documentation
```

**Output:** `utils/parsers/tuya-datapoints-database.js`

---

## ⏰ Workflow Automatique

### GitHub Actions: Bi-Monthly Enrichment

**Fichier:** `.github/workflows/bi-monthly-auto-enrichment.yml`

**Cron:** `0 2 1 */2 *` (1er de chaque 2 mois, 2h UTC)

**Étapes:**
1. Scrape 7 sources externes
2. Update 3 databases
3. Process forum interviews (2 mois)
4. Process GitHub issues
5. Generate drivers
6. Validate all
7. Publish to App Store
8. Create report issue

**Durée:** ~30-45 minutes

---

## 📝 Scripts d'Automatisation

## Scripts disponibles

### ADD_ALL_CAPABILITY_FLOWS.js

```bash
node scripts/automation/ADD_ALL_CAPABILITY_FLOWS.js
```

### ADD_ENERGY_BADGES.js

```bash
node scripts/automation/ADD_ENERGY_BADGES.js
```

### ADD_FLOWS_TO_APP_JSON.js

```bash
node scripts/automation/ADD_FLOWS_TO_APP_JSON.js
```

### ADD_MISSING_CRITICAL_FLOWS.js

```bash
node scripts/automation/ADD_MISSING_CRITICAL_FLOWS.js
```

### ADD_MULTI_GANG_FLOWS.js

```bash
node scripts/automation/ADD_MULTI_GANG_FLOWS.js
```

### ANALYZE_IMAGE_CONTENT.js

```bash
node scripts/automation/ANALYZE_IMAGE_CONTENT.js
```

### ANALYZE_SOS_BUTTON_ISSUE.js

```bash
node scripts/automation/ANALYZE_SOS_BUTTON_ISSUE.js
```

### AUTO_CLEANUP_PROJECT.js

```bash
node scripts/automation/AUTO_CLEANUP_PROJECT.js
```

### AUTO_FIX_DRIVERS.js

```bash
node scripts/automation/AUTO_FIX_DRIVERS.js
```

### AUTO_ORGANIZE_DOCS.js

```bash
node scripts/automation/AUTO_ORGANIZE_DOCS.js
```

### AUTO_ORGANIZE_REPORTS.js

```bash
node scripts/automation/AUTO_ORGANIZE_REPORTS.js
```

### AUTO_SYNC_DRIVERS_TO_APP_JSON.js

```bash
node scripts/automation/AUTO_SYNC_DRIVERS_TO_APP_JSON.js
```

### AUTO_UPDATE_APP_JSON.js

```bash
node scripts/automation/AUTO_UPDATE_APP_JSON.js
```

### BULK_OPTIMIZE_PNGS.js

```bash
node scripts/automation/BULK_OPTIMIZE_PNGS.js
```

### CLEAN_ASSETS_FOLDER.js

```bash
node scripts/automation/CLEAN_ASSETS_FOLDER.js
```

### CLEAN_DUPLICATE_IAS_CODE.js

```bash
node scripts/automation/CLEAN_DUPLICATE_IAS_CODE.js
```

### COMPLETE_FLOWS_BY_CAPABILITY.js

```bash
node scripts/automation/COMPLETE_FLOWS_BY_CAPABILITY.js
```

### COMPLETE_FLOW_IMPLEMENTATION.js

```bash
node scripts/automation/COMPLETE_FLOW_IMPLEMENTATION.js
```

### ENRICH_ALL_183_DRIVERS.js

```bash
node scripts/automation/ENRICH_ALL_183_DRIVERS.js
```

### FINAL_CLEANUP_AND_PUBLISH.js

```bash
node scripts/automation/FINAL_CLEANUP_AND_PUBLISH.js
```

### FIX_ALL_TITLEFORMATTED.js

```bash
node scripts/automation/FIX_ALL_TITLEFORMATTED.js
```

### FIX_ALL_TITLEFORMATTED_PLACEHOLDERS.js

```bash
node scripts/automation/FIX_ALL_TITLEFORMATTED_PLACEHOLDERS.js
```

### FIX_COMMUNITY_CRITICAL_ISSUES.js

```bash
node scripts/automation/FIX_COMMUNITY_CRITICAL_ISSUES.js
```

### FIX_DUPLICATE_MANUFACTURER_IDS.js

```bash
node scripts/automation/FIX_DUPLICATE_MANUFACTURER_IDS.js
```

### FIX_IAS_ZONE_ENROLLMENT.js

```bash
node scripts/automation/FIX_IAS_ZONE_ENROLLMENT.js
```

### FIX_INVALID_SWITCH_CLASS.js

```bash
node scripts/automation/FIX_INVALID_SWITCH_CLASS.js
```

### FIX_RED_ERROR_TRIANGLES.js

```bash
node scripts/automation/FIX_RED_ERROR_TRIANGLES.js
```

### FIX_TITLEFORMATTED_WARNINGS.js

```bash
node scripts/automation/FIX_TITLEFORMATTED_WARNINGS.js
```

### FIX_TITLEFORMATTED_WITH_ARGS.js

```bash
node scripts/automation/FIX_TITLEFORMATTED_WITH_ARGS.js
```

### FIX_VALIDATION_ERRORS.js

```bash
node scripts/automation/FIX_VALIDATION_ERRORS.js
```

### FULL_AUTOMATION_WORKFLOW.js

```bash
node scripts/automation/FULL_AUTOMATION_WORKFLOW.js
```

### GENERATE_SDK3_ENRICHMENTS.js

```bash
node scripts/automation/GENERATE_SDK3_ENRICHMENTS.js
```

### GITHUB_BUILD_MANAGER.js

```bash
node scripts/automation/GITHUB_BUILD_MANAGER.js
```

### HOMEY_DASHBOARD_AUTOMATION.js

```bash
node scripts/automation/HOMEY_DASHBOARD_AUTOMATION.js
```

### INTELLIGENT_FLOW_GENERATOR.js

```bash
node scripts/automation/INTELLIGENT_FLOW_GENERATOR.js
```

### MASTER_AUTO_FIX.js

```bash
node scripts/automation/MASTER_AUTO_FIX.js
```

### MEGA_INTELLIGENT_REFACTOR.js

```bash
node scripts/automation/MEGA_INTELLIGENT_REFACTOR.js
```

### OPTIMIZE_PNG_IMAGES.js

```bash
node scripts/automation/OPTIMIZE_PNG_IMAGES.js
```

### ORGANIZE_DOCS.js

```bash
node scripts/automation/ORGANIZE_DOCS.js
```

### publish-homey-official.js

```bash
node scripts/automation/publish-homey-official.js
```

### publish_and_promote.js

```bash
node scripts/automation/publish_and_promote.js
```

### PUBLISH_TO_HOMEY.js

```bash
node scripts/automation/PUBLISH_TO_HOMEY.js
```

### SAFE_PUSH_AND_PUBLISH.js

```bash
node scripts/automation/SAFE_PUSH_AND_PUBLISH.js
```

### SIMPLE_FLOW_ENRICHMENT.js

```bash
node scripts/automation/SIMPLE_FLOW_ENRICHMENT.js
```

### SMART_COMMIT.js

```bash
node scripts/automation/SMART_COMMIT.js
```

### SMART_PUBLISH.js

```bash
node scripts/automation/SMART_PUBLISH.js
```

### smart_push.js

```bash
node scripts/automation/smart_push.js
```

### ULTIMATE_DEEP_CATEGORIZATION.js

```bash
node scripts/automation/ULTIMATE_DEEP_CATEGORIZATION.js
```

### ULTIMATE_GITHUB_ISSUES_PROCESSOR.js

```bash
node scripts/automation/ULTIMATE_GITHUB_ISSUES_PROCESSOR.js
```

### VALIDATE_DRIVER_IMAGES.js

```bash
node scripts/automation/VALIDATE_DRIVER_IMAGES.js
```

### VALIDATE_FLOW_COHERENCE.js

```bash
node scripts/automation/VALIDATE_FLOW_COHERENCE.js
```

### VERIFY_AND_FIX_IMAGE_PATHS.js

```bash
node scripts/automation/VERIFY_AND_FIX_IMAGE_PATHS.js
```

### WEEKLY_ORCHESTRATOR.js

```bash
node scripts/automation/WEEKLY_ORCHESTRATOR.js
```


## Utilisation

Tous les scripts peuvent être importés via l'index:

```javascript
const automation = require('./scripts/automation');
```
