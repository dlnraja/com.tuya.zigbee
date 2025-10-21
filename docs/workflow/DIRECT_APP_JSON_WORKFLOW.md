# 📝 Workflow - Édition Directe app.json

**Date:** 2025-10-21  
**Version:** 4.0.4+

---

## 🎯 PRINCIPE

### Architecture Simplifiée

```
┌─────────────────────────────────────┐
│  ÉDITION DIRECTE                    │
│                                     │
│  app.json ← ÉDITER ICI              │
│     │                               │
│     ├─ Version control (git)        │
│     ├─ Build (homey app build)      │
│     └─ Publish (homey app publish)  │
│                                     │
│  .homeycompose/ ← IGNORÉ (git)      │
│     │                               │
│     └─ Optionnel (si besoin split)  │
└─────────────────────────────────────┘
```

### Pourquoi ce changement?

**Avant (système .homeycompose/):**
```
❌ Problèmes:
- 319 drivers = beaucoup de fichiers
- .homeycompose/drivers/*.json (319 fichiers)
- .homeycompose/flow/*.json (374 flow cards)
- Sync complexe entre .homeycompose/ et app.json
- Scripts SYNC_HOMEYCOMPOSE.js nécessaires
- Risque de désynchronisation
```

**Maintenant (édition directe):**
```
✅ Avantages:
- 1 seul fichier: app.json
- Pas de sync nécessaire
- Édition directe plus rapide
- Git tracking simple
- Pas de rebuild constant
- app.json = source of truth
```

---

## 📋 CONFIGURATION

### .gitignore

```bash
# .homeycompose/ est ignoré
.homeycompose/

# app.json est versionné
# (pas dans .gitignore)
```

**Status:**
```
✅ .homeycompose/ dans .gitignore (ligne 3)
✅ app.json versionné et suivi par git
✅ Configuration correcte
```

### app.json

**Avant:**
```json
{
  "_comment": "This file is generated. Please edit .homeycompose/app.json instead.",
  "id": "com.dlnraja.tuya.zigbee",
  ...
}
```

**Maintenant:**
```json
{
  "id": "com.dlnraja.tuya.zigbee",
  ...
}
```

✅ Commentaire retiré = édition directe autorisée

---

## 🔧 WORKFLOW QUOTIDIEN

### 1. Éditer app.json Directement

```javascript
// Ouvrir app.json
code app.json

// Éditer ce que vous voulez:
// - Version
// - Drivers
// - Flow cards
// - Capabilities
// - Settings
```

**Exemple: Ajouter un driver**

```json
{
  "drivers": [
    // ... drivers existants
    {
      "id": "nouveau_driver",
      "name": { "en": "New Driver" },
      "class": "sensor",
      "capabilities": ["measure_temperature"],
      "zigbee": {
        "manufacturerName": ["_TZ3000_example"],
        "productId": ["TS0201"],
        "endpoints": {
          "1": {
            "clusters": [0, 3, 1026],
            "bindings": [1026]
          }
        }
      }
    }
  ]
}
```

### 2. Valider les Changements

```bash
# Valider SDK3 compliance
homey app validate --level publish

# Si erreurs, corriger dans app.json
# Puis re-valider
```

### 3. Commit Git

```bash
# Stage changes
git add app.json

# Commit avec message descriptif
git commit -m "feat: Add nouveau_driver support"

# Push
git push origin master
```

### 4. Build & Publish

```bash
# Build local
homey app build

# Publish vers Homey
homey app publish
```

---

## 🛠️ OUTILS UTILES

### Scripts Disponibles

**Validation:**
```bash
# Valider app.json
node scripts/validation/CHECK_CLUSTER_IDS.js
node scripts/validation/CHECK_BINDINGS_CONFIGURATION.js

# Valider drivers
node scripts/audit/AUDIT_ERROR_HANDLING.js
node scripts/audit/AUDIT_EXCESSIVE_LOGS.js
```

**Analyse:**
```bash
# Check app size
.\scripts\debug\CHECK_BUILD_SIZE.ps1

# Analyze aggregate error
node scripts/debug/ANALYZE_AGGREGATE_ERROR.js

# Check 4-gang drivers
node scripts/add-devices/CHECK_4GANG_DRIVERS.js
```

**Device Addition:**
```bash
# Ajouter device automatiquement
node scripts/add-devices/ADD_GIRIER_TO_APP.js

# Créer votre propre script similaire pour autres devices
```

---

## 📝 BONNES PRATIQUES

### Édition app.json

**DO ✅:**
```json
// Utiliser validation JSON
// VSCode: Format Document (Shift+Alt+F)

// Garder indentation 2 spaces
{
  "id": "...",
  "drivers": [
    {
      "id": "..."
    }
  ]
}

// Valider après chaque changement
homey app validate --level publish
```

**DON'T ❌:**
```json
// Pas de trailing commas
{
  "id": "test", // ❌ virgule finale
}

// Pas de commentaires (sauf _comment)
{
  "id": "test", // ❌ commentaire JSON invalide
}

// Pas de quotes simples
{
  'id': 'test' // ❌ utiliser doubles quotes "
}
```

### Version Control

**Commit Messages:**
```bash
# Bon format
feat: Add GIRIER device support
fix: Correct cluster ID for motion sensor
docs: Update driver documentation
refactor: Optimize flow cards structure

# Mauvais format
updated stuff  # ❌ pas descriptif
fix  # ❌ trop court
```

**Before Commit:**
```bash
# TOUJOURS valider avant commit
homey app validate --level publish

# Si fail, corriger puis re-commit
```

---

## 🔄 SI BESOIN: Régénérer .homeycompose/

### Quand c'est utile?

```
✅ Pour split app.json en fichiers modulaires
✅ Pour migration vers autre projet
✅ Pour debug structure complexe
✅ Pour collaboration équipe (fichiers séparés)
```

### Comment faire?

**Option A: Script Personnalisé**

```javascript
// scripts/utils/SPLIT_APP_JSON.js
const fs = require('fs');
const path = require('path');

const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));

// Créer structure .homeycompose/
fs.mkdirSync('.homeycompose/drivers', { recursive: true });
fs.mkdirSync('.homeycompose/flow/actions', { recursive: true });
fs.mkdirSync('.homeycompose/flow/triggers', { recursive: true });
fs.mkdirSync('.homeycompose/flow/conditions', { recursive: true });

// Split drivers
app.drivers.forEach(driver => {
  const driverPath = `.homeycompose/drivers/${driver.id}.json`;
  fs.writeFileSync(driverPath, JSON.stringify(driver, null, 2));
});

// Split flow cards
Object.entries(app.flow.actions || {}).forEach(([id, action]) => {
  const actionPath = `.homeycompose/flow/actions/${id}.json`;
  fs.writeFileSync(actionPath, JSON.stringify(action, null, 2));
});

// Etc...
```

**Option B: Manuel**

```bash
# 1. Créer .homeycompose/app.json
# Copier metadata de app.json

# 2. Créer drivers individuels
.homeycompose/drivers/driver1.json
.homeycompose/drivers/driver2.json

# 3. Build pour vérifier
homey app build
```

---

## 📊 COMPARAISON WORKFLOWS

### Workflow .homeycompose/ (Ancien)

```
Pros:
✅ Structure modulaire
✅ Fichiers séparés par driver
✅ Collaboration équipe facilitée
✅ Git diffs plus clairs

Cons:
❌ 319 fichiers à gérer
❌ Sync nécessaire (scripts)
❌ Build requis à chaque édition
❌ Désynchronisation possible
❌ Complexité accrue
```

### Workflow app.json Direct (Actuel)

```
Pros:
✅ 1 seul fichier
✅ Édition directe
✅ Pas de sync nécessaire
✅ Git tracking simple
✅ Changements rapides
✅ Source of truth unique

Cons:
❌ Fichier volumineux (3.58 MB)
❌ Git diffs larges
❌ Collaboration difficile sur même driver
❌ Merge conflicts possibles
```

### Recommandation

**Pour ce projet (319 drivers):**
```
✅ app.json direct = MEILLEUR CHOIX
```

**Raisons:**
- 1 développeur principal (vous)
- Besoin de rapidité
- 319 drivers = trop pour .homeycompose/
- Changements fréquents
- Homey build timeout avec trop de fichiers

---

## 🚀 AUTOMATED WORKFLOW

### GitHub Actions (Optionnel)

Si vous voulez automatiser:

```yaml
# .github/workflows/validate-app-json.yml
name: Validate app.json

on:
  push:
    paths:
      - 'app.json'
  pull_request:
    paths:
      - 'app.json'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install Homey CLI
        run: npm install -g homey
      
      - name: Validate app.json
        run: homey app validate --level publish
      
      - name: Run custom validations
        run: |
          node scripts/validation/CHECK_CLUSTER_IDS.js
          node scripts/validation/CHECK_BINDINGS_CONFIGURATION.js
```

---

## 📦 BACKUP STRATEGY

### Avant Modifications Importantes

```bash
# Backup app.json
cp app.json app.json.backup

# Ou avec date
cp app.json "app.json.backup.$(date +%Y%m%d_%H%M%S)"

# Faire vos modifications
code app.json

# Si problème, restore
cp app.json.backup app.json
```

### Git Tags pour Versions Importantes

```bash
# Tag version stable
git tag -a v4.0.4 -m "Stable version with 319 drivers"
git push origin v4.0.4

# Lister tags
git tag -l

# Revenir à un tag
git checkout v4.0.4
```

---

## 🎯 RÉSUMÉ

### Configuration Actuelle

```
✅ app.json = Source of truth
✅ .homeycompose/ dans .gitignore
✅ Édition directe activée
✅ Commentaire "_comment" retiré
✅ Git tracking sur app.json
✅ Workflow simplifié
```

### Commandes Essentielles

```bash
# Éditer
code app.json

# Valider
homey app validate --level publish

# Commit
git add app.json
git commit -m "feat: ..."
git push

# Build & Publish
homey app build
homey app publish
```

### Fichiers Clés

```
app.json ← ÉDITER ICI (versionné)
.homeycompose/ ← IGNORÉ (gitignore)
.gitignore ← Configuration correcte
```

---

**Workflow optimisé pour développement solo avec 319 drivers!** ✨

---

**Créé:** 2025-10-21  
**Auteur:** Dylan Rajasekaram  
**App:** com.dlnraja.tuya.zigbee  
**Drivers:** 319  
**Approche:** Direct app.json editing
