# ⚡ Changement de Workflow - Édition Directe app.json

**Date:** 2025-10-21  
**Impact:** HIGH  
**Breaking Change:** Non (workflow interne)

---

## 🎯 CHANGEMENT

### Avant

```
Éditer: .homeycompose/app.json + driver files
Build: homey app build (génère app.json)
Versionner: .homeycompose/ dans git
Ignorer: app.json (gitignore)
```

### Maintenant

```
Éditer: app.json directement
Build: homey app build (juste validation)
Versionner: app.json dans git
Ignorer: .homeycompose/ (gitignore)
```

---

## 💡 POURQUOI?

### Problèmes avec .homeycompose/

```
❌ 319 drivers = 319 fichiers séparés
❌ Sync complexe entre .homeycompose/ et app.json
❌ Scripts SYNC_HOMEYCOMPOSE.js nécessaires
❌ Risque désynchronisation
❌ Build timeout avec trop de fichiers
❌ Overhead inutile pour dev solo
```

### Avantages app.json Direct

```
✅ 1 seul fichier à éditer
✅ Pas de sync nécessaire
✅ Édition plus rapide
✅ Git tracking simple
✅ app.json = source of truth unique
✅ Pas de rebuild constant
✅ Meilleur pour 319 drivers
```

---

## ✅ ACTIONS FAITES

### 1. app.json

```diff
{
- "_comment": "This file is generated. Please edit .homeycompose/app.json instead.",
  "id": "com.dlnraja.tuya.zigbee",
  ...
}
```

✅ Commentaire retiré = édition directe OK

### 2. .gitignore

```bash
# .homeycompose/ déjà ignoré (ligne 3)
.homeycompose/
```

✅ Configuration correcte

### 3. Documentation

```
✅ docs/workflow/DIRECT_APP_JSON_WORKFLOW.md
   - Guide complet nouveau workflow
   - Bonnes pratiques
   - Scripts utiles
   - Comparaison workflows

✅ scripts/cleanup/REMOVE_HOMEYCOMPOSE.ps1
   - Script cleanup .homeycompose/
   - Backup optionnel
   - Vérification .gitignore
```

---

## 🚀 UTILISATION

### Éditer un Driver

```javascript
// Ouvrir app.json
code app.json

// Chercher votre driver (Ctrl+F)
"drivers": [
  {
    "id": "mon_driver",
    "name": { "en": "Mon Driver" },
    // ... éditer ici
  }
]

// Sauvegarder
```

### Ajouter un Manufacturer ID

```javascript
// Dans app.json, trouver le driver
{
  "id": "mon_driver",
  "zigbee": {
    "manufacturerName": [
      "_TZ3000_existing",
      "_TZ3000_nouveau" // ← Ajouter ici
    ]
  }
}
```

### Valider & Commit

```bash
# Valider
homey app validate --level publish

# Commit
git add app.json
git commit -m "feat: Add nouveau manufacturer ID"

# Push
git push origin master
```

---

## 🛠️ OUTILS DISPONIBLES

### Cleanup (Si .homeycompose/ existe encore)

```powershell
# Supprimer .homeycompose/ local
.\scripts\cleanup\REMOVE_HOMEYCOMPOSE.ps1

# Avec backup automatique
```

### Validation

```bash
# Valider app.json
homey app validate --level publish

# Scripts custom
node scripts/validation/CHECK_CLUSTER_IDS.js
node scripts/validation/CHECK_BINDINGS_CONFIGURATION.js
```

### Analyse

```bash
# Check size
.\scripts\debug\CHECK_BUILD_SIZE.ps1

# Analyze structure
node scripts/debug/ANALYZE_AGGREGATE_ERROR.js
```

---

## 📝 WORKFLOW QUOTIDIEN

### 1. Éditer

```bash
code app.json
# Faire vos modifications
```

### 2. Valider

```bash
homey app validate --level publish
```

### 3. Commit

```bash
git add app.json
git commit -m "type: description"
git push
```

### 4. Build & Publish

```bash
# Build local
homey app build

# Publish (manuel car AggregateError)
homey app publish
```

---

## 🔄 MIGRATION

### Si vous avez .homeycompose/ en local

**Option A: Cleanup (Recommandé)**

```powershell
.\scripts\cleanup\REMOVE_HOMEYCOMPOSE.ps1
```

**Option B: Manuel**

```bash
# Backup (optionnel)
mv .homeycompose .homeycompose.backup

# Ou suppression directe
rm -rf .homeycompose
```

### Vérifier .gitignore

```bash
# Doit contenir
.homeycompose/

# NE DOIT PAS contenir
# app.json  ← doit être versionné
```

---

## 📊 IMPACT

### Fichiers Modifiés

```
✅ app.json (commentaire retiré)
✅ .gitignore (déjà correct)
```

### Nouveaux Fichiers

```
✅ docs/workflow/DIRECT_APP_JSON_WORKFLOW.md
✅ scripts/cleanup/REMOVE_HOMEYCOMPOSE.ps1
✅ WORKFLOW_CHANGE.md (ce fichier)
```

### Fichiers Supprimés

```
❌ .homeycompose/ (si existait localement)
```

### Scripts Obsolètes

```
⚠️  scripts/sync/SYNC_HOMEYCOMPOSE.js
   → Plus nécessaire (workflow direct)
   → Garder pour référence si besoin futur
```

---

## ❓ FAQ

### Q: Puis-je encore utiliser .homeycompose/?

**R:** Oui, mais pas recommandé avec 319 drivers. Si vous voulez:

```bash
# Recréer structure .homeycompose/
node scripts/utils/SPLIT_APP_JSON.js

# Puis homey app build pour sync
homey app build
```

### Q: Comment merger des PRs maintenant?

**R:** Même processus, mais conflits sur app.json au lieu de .homeycompose/:

```bash
# Résoudre conflits dans app.json
code app.json

# Valider
homey app validate --level publish

# Commit merge
git commit
```

### Q: Et les collaborateurs?

**R:** Pour ce projet (319 drivers, dev solo), édition directe est meilleure. Pour équipe:

```
Option 1: app.json direct (actuel)
  - Simple, rapide
  - Git diffs larges
  - Merge conflicts possibles

Option 2: .homeycompose/ split
  - Modulaire, fichiers séparés
  - Complexe avec 319 drivers
  - Overhead sync
```

### Q: Backup de app.json?

**R:** 

```bash
# Avant modifications importantes
cp app.json app.json.backup

# Git est votre backup principal
git log --oneline app.json
git checkout HEAD~1 -- app.json
```

---

## 🎯 RÉSUMÉ

### Configuration Actuelle

```
✅ app.json = Source of truth (versionné)
✅ .homeycompose/ = Ignoré (gitignore)
✅ Workflow simplifié
✅ Édition directe activée
```

### Commandes Essentielles

```bash
# Éditer
code app.json

# Valider
homey app validate --level publish

# Commit
git add app.json && git commit -m "..." && git push

# Build & Publish
homey app build && homey app publish
```

### Documentation

```
📚 Guide complet:
   docs/workflow/DIRECT_APP_JSON_WORKFLOW.md

🧹 Cleanup script:
   scripts/cleanup/REMOVE_HOMEYCOMPOSE.ps1

📝 Ce fichier:
   WORKFLOW_CHANGE.md
```

---

**Workflow optimisé pour 319 drivers et dev solo!** 🚀

---

**Créé:** 2025-10-21  
**Auteur:** Dylan Rajasekaram  
**Version:** 4.0.4  
**Impact:** Simplifie développement et maintenance
