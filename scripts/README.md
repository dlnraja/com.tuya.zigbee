// Scripts d'automatisation

#// 🚀 Scripts principaux

##// Pipeline complète
- `mega-progressive.js` - Pipeline progressive avec pushes intermédiaires
- `mega-sources-complete.js` - Pipeline complète avec sources wildcard

##// Gestion des drivers
- `complete-app-js.js` - Complétion automatique de app.js
- `create-missing-files.js` - Création des fichiers manquants
- `enrich-drivers.js` - Enrichissement des drivers existants
- \reorganize-drivers.js` - Réorganisation de la structure

##// Sources externes
- `sources-wildcard.js` - Collecte depuis toutes les sources
- `analyze-external-sources.js` - Analyse des sources externes

##// Validation et diagnostic
- `validate-driver-structure.js` - Validation de la structure
- `diagnose-drivers.js` - Diagnostic des drivers
- `fix-driver-structure.js` - Correction de la structure

#// 🔧 Utilisation

```bash
// Pipeline complète
node scripts/mega-progressive.js

// Complétion app.js
node scripts/complete-app-js.js

// Création fichiers manquants
node scripts/create-missing-files.js
```

#// 📋 Dépendances
- Node.js 18+
- npm packages: homey, homey-zigbeedriver, zigbee-clusters
