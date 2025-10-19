# 🛠️ Universal Tuya Zigbee - Node.js Tools

Suite d'outils Node.js multiplateforme pour le développement et la maintenance de l'application Universal Tuya Zigbee pour Homey.

## 📋 Table des Matières

- [Installation](#installation)
- [Scripts Disponibles](#scripts-disponibles)
- [Usage](#usage)
- [Conversion PowerShell → Node.js](#conversion-powershell--nodejs)
- [Architecture](#architecture)

---

## 🚀 Installation

### Prérequis

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0

### Installation des dépendances

```bash
cd scripts/node-tools
npm install
```

---

## 📦 Scripts Disponibles

### 1. **Orchestrator Main** (`orchestrator-main.js`)

Lance tous les outils dans l'ordre optimal.

```bash
npm run orchestrate
# ou
node orchestrator-main.js
```

**Options:**
- `--verbose` ou `-v` : Mode verbeux avec logs détaillés
- `--skip-organize` : Sauter l'étape d'organisation
- `--skip-diagnostic` : Sauter le diagnostic d'images

**Étapes exécutées:**
1. ✅ Organisation des fichiers du projet
2. ✅ Diagnostic des images de drivers
3. ✅ Extraction des manufacturer IDs
4. ✅ Analyse et génération de rapports

---

### 2. **Organize Project** (`organize-project.js`)

Range automatiquement tous les fichiers dans la structure appropriée.

```bash
npm run organize:all
# ou
node organize-project.js
```

**Fonctionnalités:**
- 📁 Création de la structure de dossiers
- 📦 Déplacement automatique des fichiers
- 🧹 Nettoyage des dossiers vides
- 📝 Mise à jour du `.gitignore`

**Structure créée:**
```
project-root/
├── docs/
│   ├── fixes/
│   ├── workflow/
│   ├── community/
│   └── analysis/
├── scripts/
│   ├── automation/
│   ├── fixes/
│   ├── utils/
│   ├── deployment/
│   └── node-tools/
├── project-data/
│   ├── reports/
│   ├── exports/
│   └── backups/
└── build/
```

---

### 3. **Diagnose Driver Images** (`diagnose-driver-images.js`)

Vérifie l'intégrité des chemins d'images dans tous les drivers.

```bash
npm run diagnose:images
# ou
node diagnose-driver-images.js [options]
```

**Options:**
- `--verbose` ou `-v` : Affiche tous les détails
- `--no-export` : Ne pas exporter le rapport JSON

**Sortie:**
- ✅ Statistiques globales
- 📊 Patterns de chemins d'images
- ⚠️  Liste des images manquantes
- 📄 Rapport JSON exporté

**Exemple de sortie:**
```
╔══════════════════════════════════════════════════════════════════╗
║         DIAGNOSTIC PROFOND DES IMAGES DE DRIVERS                  ║
╚══════════════════════════════════════════════════════════════════╝

🔍 Scanning drivers directory...

── RÉSULTATS DU DIAGNOSTIC ──

📊 Statistiques Globales:
  ✓ Total drivers scannés: 183
  ✓ Drivers avec images: 183
  ✓ Images valides: 454
  ✓ Images manquantes: 0

✅ Rapport exporté: project-data/IMAGE_DIAGNOSTIC_REPORT_2025-01-15.json
✅ Diagnostic terminé!
```

---

### 4. **Extract Manufacturer IDs** (`extract-manufacturer-ids.js`)

Extrait tous les manufacturer IDs présents dans les drivers.

```bash
npm run extract:ids
# ou
node extract-manufacturer-ids.js
```

**Sortie:**
- 📊 Statistiques par catégorie (_TZ3000, _TZE200, _TZE204, _TZE284)
- 📋 Liste complète des IDs avec drivers associés
- 🔍 Analyse de mapping _TZE204_ → _TZE284_
- 📄 Rapport JSON exporté

**Exemple:**
```
── STATISTIQUES PAR CATÉGORIE ──

  _TZ3000: 136 IDs
  _TZE200: 78 IDs
  _TZE204: 25 IDs
  _TZE284: 30 IDs

── ANALYSE DE MAPPING _TZE204_ → _TZE284_ ──

  Total _TZE204_: 25
  Total _TZE284_: 30
  Gap: -5 variants (coverage 120%)

✅ Rapport exporté: project-data/ALL_MANUFACTURER_IDS_2025-01-15.json
```

---

### 5. **Map TZE204 to TZE284** (`map-tze204-to-tze284.js`)

Identifie les variants _TZE284_ manquants basés sur les _TZE204_ existants.

```bash
npm run map:ids
# ou
node map-tze204-to-tze284.js
```

---

### 6. **Add TZE284 IDs** (`add-tze284-ids.js`)

Ajoute automatiquement les nouveaux manufacturer IDs _TZE284_ aux drivers appropriés.

```bash
npm run add:ids
# ou
node add-tze284-ids.js
```

---

### 7. **Analyze Manufacturers** (`analyze-manufacturers.js`)

Analyse détaillée de tous les manufacturer IDs utilisés.

```bash
npm run analyze:manufacturers
# ou
node analyze-manufacturers.js
```

---

### 8. **Find Missing Manufacturers** (`find-missing-manufacturers.js`)

Identifie les manufacturer IDs manquants basés sur des patterns connus.

```bash
npm run find:missing
# ou
node find-missing-manufacturers.js
```

---

### 9. **Export Database** (`export-database.js`)

Exporte la base de données manufacturer en multiples formats.

```bash
npm run export:database
# ou
node export-database.js
```

**Formats:**
- 📄 CSV
- 🌐 HTML
- 📝 Markdown
- 📊 JSON

---

### 10. **Search Manufacturer** (`search-manufacturer.js`)

Recherche interactive dans la base de données manufacturer.

```bash
npm run search:manufacturer
# ou
node search-manufacturer.js <query>
```

**Exemples:**
```bash
node search-manufacturer.js motion
node search-manufacturer.js _TZE284_
node search-manufacturer.js "smart plug"
```

---

## 🔄 Conversion PowerShell → Node.js

Tous les scripts PowerShell ont été convertis en Node.js pour une meilleure portabilité multiplateforme.

### Correspondance des scripts

| PowerShell (`.ps1`) | Node.js (`.js`) | Status |
|---------------------|-----------------|--------|
| `ORCHESTRATOR_MAIN.ps1` | `orchestrator-main.js` | ✅ Converti |
| `DIAGNOSE_DRIVER_IMAGES.ps1` | `diagnose-driver-images.js` | ✅ Converti |
| `EXTRACT_ALL_MANUFACTURER_IDS.ps1` | `extract-manufacturer-ids.js` | ✅ Converti |
| `MAP_TZE204_TO_TZE284.ps1` | `map-tze204-to-tze284.js` | ✅ Converti |
| `ADD_TZE284_IDS_TO_DRIVERS.ps1` | `add-tze284-ids.js` | ✅ Converti |
| `ANALYZE_MANUFACTURERS.ps1` | `analyze-manufacturers.js` | ✅ Converti |
| `FIND_MISSING_MANUFACTURERS.ps1` | `find-missing-manufacturers.js` | ✅ Converti |
| `EXPORT_DATABASE.ps1` | `export-database.js` | ✅ Converti |
| `SEARCH_MANUFACTURER.ps1` | `search-manufacturer.js` | ✅ Converti |
| `TEST_ALL_SCRIPTS.ps1` | `test-all-scripts.js` | ✅ Converti |

### Avantages de la conversion

✅ **Multiplateforme**: Fonctionne sur Windows, macOS et Linux  
✅ **Performance**: Meilleure gestion asynchrone  
✅ **Maintenabilité**: Code JavaScript moderne (ES modules)  
✅ **Intégration**: S'intègre nativement avec l'écosystème Node.js/Homey  
✅ **Dépendances**: Utilise npm pour la gestion des packages  
✅ **Tests**: Facilite l'écriture de tests unitaires  

---

## 🏗️ Architecture

### Structure des fichiers

```
scripts/node-tools/
├── package.json              # Dépendances et scripts npm
├── README.md                 # Cette documentation
├── lib/                      # Bibliothèques partagées
│   ├── logger.js            # Système de logging avec couleurs
│   ├── file-utils.js        # Utilitaires fichiers (JSON, text, glob)
│   └── validation.js        # Utilitaires de validation
├── orchestrator-main.js      # 🎯 Orchestrateur principal
├── organize-project.js       # 📁 Organisation des fichiers
├── diagnose-driver-images.js # 🖼️  Diagnostic images
├── extract-manufacturer-ids.js # 🔍 Extraction IDs
├── map-tze204-to-tze284.js   # 🗺️  Mapping variants
├── add-tze284-ids.js         # ➕ Ajout IDs aux drivers
├── analyze-manufacturers.js  # 📊 Analyse manufacturers
├── find-missing-manufacturers.js # 🔎 IDs manquants
├── export-database.js        # 📤 Export database
├── search-manufacturer.js    # 🔍 Recherche interactive
└── test-all-scripts.js       # ✅ Tests automatisés
```

### Bibliothèques (`lib/`)

#### `logger.js`
Système de logging avec couleurs et emojis.

```javascript
import { logger } from './lib/logger.js';

logger.success('✅ Opération réussie!');
logger.error('❌ Erreur détectée');
logger.warning('⚠️  Attention');
logger.info('ℹ️  Information');
logger.title('TITRE PRINCIPAL');
logger.section('Section');
logger.summary('Résumé', [
  { label: 'Fichiers', value: 42, status: 'success' },
  { label: 'Erreurs', value: 0, status: 'success' }
]);
```

#### `file-utils.js`
Utilitaires pour la manipulation de fichiers.

```javascript
import { readJSON, writeJSON, findFiles, exists } from './lib/file-utils.js';

// Lire JSON
const data = await readJSON('file.json');

// Écrire JSON
await writeJSON('output.json', data);

// Trouver fichiers
const files = await findFiles('**/*.json');

// Vérifier existence
if (await exists('file.txt')) { /* ... */ }
```

---

## 🎯 Usage Typique

### Workflow complet

```bash
# 1. Installer les dépendances
cd scripts/node-tools
npm install

# 2. Lancer l'orchestrateur complet
npm run orchestrate

# 3. Vérifier les rapports générés
ls -la ../../project-data/

# 4. Executer un script spécifique si besoin
npm run diagnose:images -- --verbose
npm run extract:ids
npm run organize:all
```

### Pour le développement

```bash
# Extraction IDs + Analyse
npm run extract:ids
npm run analyze:manufacturers

# Recherche d'un manufacturer spécifique
npm run search:manufacturer _TZE284_mrf6vtua

# Diagnostic images uniquement
npm run diagnose:images --no-export

# Organisation des fichiers
npm run organize:all
```

### Pour la maintenance

```bash
# Test de tous les scripts
npm run test:scripts

# Export de la database
npm run export:database

# Validation complète
npm run validate:all
```

---

## 📚 Documentation Complémentaire

- [CRITICAL_FIX_v2.15.96_IAS_ZONE.md](../../CRITICAL_FIX_v2.15.96_IAS_ZONE.md) - Fix IAS Zone
- [FINAL_ENRICHMENT_v2.15.96_COMPLETE.md](../../FINAL_ENRICHMENT_v2.15.96_COMPLETE.md) - Enrichissement complet
- [SYSTEMATIC_ENRICHMENT_PLAN.md](../../project-data/SYSTEMATIC_ENRICHMENT_PLAN.md) - Plan d'enrichissement

---

## 🤝 Contribution

Pour ajouter un nouveau script:

1. Créer le fichier `.js` dans `scripts/node-tools/`
2. Ajouter le shebang `#!/usr/bin/env node`
3. Utiliser les bibliothèques partagées (`logger`, `file-utils`)
4. Ajouter le script dans `package.json`
5. Documenter dans ce README

---

## 📝 License

MIT License - Universal Tuya Zigbee Team

---

**Version**: 2.15.96  
**Date**: 2025-01-15  
**Status**: ✅ Production Ready
