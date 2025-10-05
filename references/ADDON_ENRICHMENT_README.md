# 🌍 Addon Global Enrichment - Mode d'Emploi

## 📋 Vue d'Ensemble

Ce système d'enrichissement addon permet d'intégrer des sources mondiales Zigbee multilingues dans votre base de drivers Homey, créant automatiquement des drivers spécifiques pour les écosystèmes propriétaires détectés.

---

## 🚀 Workflow Complet

### Phase 1: Fetch des Sources Mondiales
```bash
node tools/addon_global_enrichment_orchestrator.js
```

**Que fait ce script?**
- Télécharge automatiquement:
  - Zigbee2MQTT supported devices (3500+ appareils)
  - Blakadder Zigbee database (2000+ templates)
  - Koenkk herdsman-converters (manufacturerName Tuya)
  - SmartThings Edge drivers (GitHub API)
- Sauvegarde dans `references/addon_enrichment_data/`
- Génère `project-data/addon_enrichment_report.json`

**Résultats attendus:**
- 5000+ devices récupérés
- 2000+ manufacturer IDs uniques
- 500+ product IDs validés
- Écosystèmes détectés: Samsung, Enki, Xiaomi, Philips, IKEA, Sonoff, etc.

---

### Phase 2: Intégration dans Drivers Existants
```bash
node tools/integrate_addon_sources.js
```

**Que fait ce script?**
- Charge toutes les données addon
- Build mapping `productId -> manufacturerNames`
- Enrichit chaque driver avec manufacturerNames pertinents
- Respecte limites dynamiques par type (switch: 60, sensor: 30, etc.)
- Cap absolu: 200 manufacturerNames par driver

**Résultats:**
- Drivers enrichis: 100-150
- Manufacturersajoutés: 500-1000
- Rapport: `project-data/addon_integration_report.json`

---

### Phase 3: Génération Drivers Écosystèmes
```bash
node tools/generate_ecosystem_drivers.js
```

**Que fait ce script?**
- Détecte écosystèmes dans addon data
- Crée drivers spécifiques:
  - `drivers/samsung_smartthings_generic/`
  - `drivers/enki_leroy_merlin_generic/`
  - `drivers/xiaomi_aqara_generic/`
  - `drivers/philips_hue_generic/`
  - `drivers/ikea_tradfri_generic/`
  - `drivers/sonoff_ewelink_generic/`
  - `drivers/schneider_wiser_generic/`
  - `drivers/legrand_netatmo_generic/`
- Génère:
  - `driver.compose.json` avec manufacturerName/productId
  - `device.js` stub avec logique base
  - `assets/` dossier pour images

**Résultats:**
- 5-8 nouveaux drivers écosystème
- Structure complète prête à personnaliser

---

### Phase 4: Finalisation et Validation
```bash
# Vérifier cohérence globale
node tools/ultimate_coherence_checker_with_all_refs.js

# Audit individuel
node tools/check_each_driver_individually.js

# Normalisation
node tools/normalize_compose_arrays_v38.js

# Validation assets
node tools/verify_driver_assets_v38.js

# Validation SDK3
node tools/homey_validate.js
```

---

## 📊 Métriques Attendues

### Avant Addon
- Drivers: 162
- Manufacturer IDs uniques: 1231
- Product IDs: 47
- Écosystèmes: Tuya principalement

### Après Addon (Estimation)
- Drivers: 170-180
- Manufacturer IDs uniques: 3000+
- Product IDs: 500+
- Écosystèmes: 8-10 (Samsung, Enki, Xiaomi, Philips, IKEA, Sonoff, Schneider, Legrand)

---

## 🛠️ Personnalisation Avancée

### Ajouter une Nouvelle Source

Éditer `tools/addon_global_enrichment_orchestrator.js`:

```javascript
const SOURCES = {
  // ... sources existantes
  
  ma_source: {
    name: 'Ma Source Custom',
    url: 'https://api.example.com/devices.json',
    type: 'json',
    parser: 'custom'
  }
};

// Ajouter parser
function parseCustom(data){
  const devices = [];
  // Logique parsing
  return devices;
}
```

### Ajouter un Nouvel Écosystème

Éditer `tools/generate_ecosystem_drivers.js`:

```javascript
const ECOSYSTEMS = {
  // ... écosystèmes existants
  
  mon_ecosysteme: {
    name: 'Mon Écosystème',
    prefix: 'mon_eco',
    class: 'sensor',
    icon: '🎯'
  }
};
```

### Ajuster Limites par Type

Éditer `tools/integrate_addon_sources.js`:

```javascript
const MAX_PER_TYPE = {
  switch: 80,  // Augmenter limite switches
  sensor: 40,  // Augmenter limite sensors
  // ...
};
```

---

## 📁 Structure Fichiers Générés

```
tuya_repair/
├── references/
│   ├── addon_enrichment_data/
│   │   ├── zigbee2mqtt_1234567890.json
│   │   ├── blakadder_1234567890.json
│   │   ├── koenkk_tuya_1234567890.json
│   │   └── smartthings_edge_1234567890.json
│   ├── ZIGBEE_GLOBAL_SOURCES_MULTILINGUAL.md
│   └── ADDON_ENRICHMENT_README.md (ce fichier)
├── drivers/
│   ├── [drivers existants...]
│   ├── samsung_smartthings_generic/
│   │   ├── driver.compose.json
│   │   ├── device.js
│   │   └── assets/
│   ├── enki_leroy_merlin_generic/
│   │   ├── driver.compose.json
│   │   ├── device.js
│   │   └── assets/
│   └── [autres écosystèmes...]
├── project-data/
│   ├── addon_enrichment_report.json
│   ├── addon_integration_report.json
│   └── ecosystem_drivers_report.json
└── tools/
    ├── addon_global_enrichment_orchestrator.js
    ├── integrate_addon_sources.js
    └── generate_ecosystem_drivers.js
```

---

## ⚠️ Considérations Importantes

### Rate Limiting
- **Délai entre requêtes**: 2 secondes
- **User-Agent**: `HomeyZigbeeEnrichment/1.0`
- **Respecter robots.txt** de chaque source

### Légal & Licences
- Sources publiques: OK pour usage personnel
- Attribution requise pour redistribution
- Vérifier compatibilité licences (MIT, GPL, etc.)

### Maintenance
- **Mise à jour recommandée**: Mensuelle
- **Sources volatiles**: Zigbee2MQTT, Blakadder (MAJ fréquentes)
- **Sources stables**: Koenkk converters (MAJ hebdo)

### Performance
- **Temps d'exécution Phase 1**: 5-10 minutes
- **Temps d'exécution Phase 2**: 2-5 minutes
- **Temps d'exécution Phase 3**: < 1 minute

---

## 🎯 Prochaines Étapes Recommandées

1. **Exécuter workflow complet** (Phases 1-4)
2. **Personnaliser drivers écosystèmes**:
   - Ajouter images réelles dans `assets/`
   - Implémenter capabilities spécifiques dans `device.js`
   - Tester avec devices réels
3. **Enrichir continuellement**:
   - Re-run Phase 1 mensuellement
   - Monitorer nouvelles sources communautaires
4. **Publier sur Homey App Store**:
   - Après validation complète
   - Mettre à jour README avec nouveaux écosystèmes
   - Créer changelog détaillé

---

## 📝 Support & Contribution

### Ajouter une Source
1. Fork repo
2. Éditer `addon_global_enrichment_orchestrator.js`
3. Ajouter parser + tests
4. Pull request avec documentation

### Reporter un Bug
- GitHub Issues
- Include: logs, rapport JSON, environnement

### Demander un Écosystème
- GitHub Issues avec label `enhancement`
- Fournir: URL source, manufacturerName exemples

---

## 📚 Références

- **Zigbee2MQTT**: https://www.zigbee2mqtt.io/
- **Blakadder**: https://zigbee.blakadder.com/
- **Koenkk herdsman**: https://github.com/Koenkk/zigbee-herdsman-converters
- **SmartThings Community**: https://community.smartthings.com/
- **Homey SDK**: https://apps.developer.homey.app/
- **Document sources**: `references/ZIGBEE_GLOBAL_SOURCES_MULTILINGUAL.md`

---

## 🏆 Contributeurs

- **N4 Protocol**: Fondation architecture
- **Claude Sonnet 3.5**: Scripts addon orchestration
- **Communautés**: Zigbee2MQTT, Homey, Home Assistant, SmartThings

---

**Version**: Addon v1.0  
**Date**: 2025-10-05  
**Licence**: Compatible Homey SDK3
