# 🔧 GITHUB WORKFLOWS OFFICIELS HOMEY

**Date:** 2025-11-04  
**Status:** ✅ CLEAN & OFFICIAL  

---

## 🎯 OBJECTIF ACCOMPLI

Nettoyage complet des workflows GitHub Actions et mise en place des workflows officiels Homey.

**Avant:** 41 workflows (chaos)  
**Après:** 3 workflows officiels (clean)  

---

## ✅ WORKFLOWS ACTIFS (3)

### 1. validate.yml - Validation Automatique

**Trigger:** Push sur master/main + Pull Requests

**Actions:**
1. ✅ Checkout code
2. ✅ Setup Node.js 20
3. ✅ Install dependencies
4. ✅ Install Homey CLI
5. ✅ **`homey app validate --level publish`** (OFFICIEL)
6. ✅ Generate validation report
7. ✅ Upload artifact

**Commande clé:** `homey app validate --level publish`

**Status:** ✅ Officiel Homey

---

### 2. publish.yml - Publication Homey App Store

**Trigger:** GitHub Release (published)

**Actions:**
1. ✅ Checkout code
2. ✅ Setup Node.js 20
3. ✅ Install dependencies
4. ✅ Install Homey CLI
5. ✅ **`homey app validate --level publish`**
6. ✅ **`homey app build`** (OFFICIEL)
7. ✅ **`homey app publish`** (OFFICIEL)
8. ✅ Upload build artifact

**Commandes clés:**
```bash
homey app validate --level publish
homey app build
homey login --token $HOMEY_TOKEN
homey app publish
```

**Status:** ✅ Officiel Homey

**Nécessite:** `HOMEY_TOKEN` secret dans GitHub

---

### 3. auto-organize.yml - Organisation Automatique

**Trigger:** Push sur master

**Actions:**
1. ✅ Checkout code
2. ✅ Setup Node.js 20
3. ✅ Install dependencies
4. ✅ Run AUTO_ORGANIZE_ROOT.js
5. ✅ Validate avec `homey app validate`
6. ✅ Commit changements
7. ✅ Push automatique

**Status:** ✅ Custom (maintenance)

---

## 🔒 WORKFLOWS DÉSACTIVÉS (38)

**Ancien workflows désactivés:**
- ❌ ai-enhanced-automation.yml
- ❌ ai-multi-agent-system.yml
- ❌ auto-enrichment.yml
- ❌ auto-pr-handler.yml
- ❌ auto-publish-homey.yml
- ❌ auto-publish-improved.yml
- ❌ auto-publish.yml
- ❌ bi-monthly-auto-enrichment.yml
- ❌ bimonthly-drivers-sync.yml
- ❌ build.yml
- ❌ check-onnodeinit-ci.yml
- ❌ check-onNodeInit.yml
- ❌ ci-complete.yml
- ❌ ci-validation.yml
- ❌ deploy-github-pages.yml
- ❌ diagnostic.yml
- ❌ forum-auto-responder.yml
- ❌ homey-app-publish.yml
- ❌ homey-official-publish-api.yml
- ❌ homey-official-publish-improved.yml
- ❌ homey-publish-enhanced.yml
- ❌ homey-publish.yml
- ❌ homey-validate-only.yml
- ❌ matrix-export.yml
- ❌ metrics-collector.yml
- ❌ monthly-auto-enrichment.yml
- ❌ monthly-intelligence-update.yml
- ❌ multi-ai-auto-handler.yml
- ❌ organize-docs.yml
- ❌ pr-validation.yml
- ❌ pre-publish-version-check.yml
- ❌ publish-with-db.yml
- ❌ scheduled-issues-scan.yml
- ❌ smart-version-increment.yml
- ❌ update-device-matrix.yml
- ❌ update-docs.yml
- ❌ validate-and-publish.yml
- ❌ weekly-enrichment.yml

**Status:** Renommés en .yml.disabled

---

## 📖 MÉTHODE OFFICIELLE HOMEY - PUBLICATION

### Étape 1: Développement Local

```bash
# Développer et tester
homey app run

# Valider
homey app validate --level publish

# Build
homey app build
```

---

### Étape 2: Commit & Push

```bash
# Commit changes
git add -A
git commit -m "feat: New feature"
git push origin master
```

**Résultat:** ✅ Workflow `validate.yml` s'exécute automatiquement

---

### Étape 3: Créer GitHub Release

**Méthode 1: Via GitHub Web**

1. Aller sur GitHub: https://github.com/dlnraja/com.tuya.zigbee/releases
2. Cliquer "Draft a new release"
3. Tag: `v4.9.273` (version suivante)
4. Release title: `v4.9.273 - Description`
5. Description: Changelog
6. Cliquer "Publish release"

**Méthode 2: Via Git Tags**

```bash
# Créer tag
git tag v4.9.273 -m "Release v4.9.273"

# Push tag
git push origin v4.9.273
```

**Résultat:** ✅ Workflow `publish.yml` s'exécute automatiquement

---

### Étape 4: Workflow Publish

**Automatique:**
1. ✅ Validate app (`homey app validate --level publish`)
2. ✅ Build app (`homey app build`)
3. ✅ Login to Homey (`homey login --token`)
4. ✅ Publish to App Store (`homey app publish`)

**Status:** App publiée sur Homey App Store! 🎉

---

## 🔑 CONFIGURATION REQUISE

### GitHub Secrets

**`HOMEY_TOKEN`** - Token Homey pour publication

**Comment obtenir le token:**

1. Aller sur https://developer.athom.com
2. Login avec compte Athom
3. Aller dans "Profile" → "Access Tokens"
4. Créer un nouveau token
5. Copier le token

**Ajouter le token à GitHub:**

1. Aller sur GitHub: https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions
2. Cliquer "New repository secret"
3. Name: `HOMEY_TOKEN`
4. Value: [paste token]
5. Cliquer "Add secret"

---

## 📊 WORKFLOW EXECUTION

### Validate Workflow

**Trigger:** Chaque push sur master

**Voir les runs:**
https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/validate.yml

**Résultat:**
- ✅ Badge: Pass/Fail
- ✅ Artifact: validation-report.md
- ✅ Logs détaillés

---

### Publish Workflow

**Trigger:** Création de GitHub release

**Voir les runs:**
https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/publish.yml

**Résultat:**
- ✅ App publiée sur Homey App Store
- ✅ Build artifact uploadé
- ✅ Logs de publication

---

## ✅ AVANTAGES

**Avant (41 workflows):**
- ❌ Chaos complet
- ❌ Workflows conflictuels
- ❌ Méthodes non-officielles
- ❌ Difficile à maintenir
- ❌ Erreurs fréquentes

**Après (3 workflows):**
- ✅ Clean & organisé
- ✅ Méthodes officielles Homey
- ✅ Validation automatique
- ✅ Publication via releases
- ✅ Facile à comprendre
- ✅ Maintenance simple
- ✅ Best practices

---

## 📝 COMMANDES HOMEY CLI

### Validation

```bash
# Validation publish level
homey app validate --level publish

# Validation debug level
homey app validate --level debug
```

### Build

```bash
# Build l'app
homey app build

# Build avec clean
homey app build --clean
```

### Publish

```bash
# Login
homey login --token YOUR_TOKEN

# Publish
homey app publish

# Publish sans rebuild
homey app publish --skip-build

# Publish avec changelog
homey app publish --changelog "Bug fixes"
```

### Run (Local)

```bash
# Run en dev
homey app run

# Run avec clean install
homey app install

# Run avec logs
homey app run --clean
```

---

## 🔄 WORKFLOW LIFECYCLE

```
┌─────────────────────────────────────────────────┐
│  1. Développement Local                         │
│     - Code changes                              │
│     - homey app run                             │
│     - Test sur Homey                            │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  2. Commit & Push                               │
│     - git commit                                │
│     - git push origin master                    │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  3. Validate Workflow (automatique)             │
│     ✅ homey app validate --level publish       │
│     ✅ Upload validation report                 │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  4. Créer GitHub Release                        │
│     - Tag: v4.9.273                             │
│     - Changelog                                 │
│     - Publish release                           │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  5. Publish Workflow (automatique)              │
│     ✅ homey app validate                       │
│     ✅ homey app build                          │
│     ✅ homey app publish                        │
│     ✅ Upload build artifact                    │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  6. Homey App Store                             │
│     🎉 App publiée!                             │
│     📱 Disponible pour installation             │
└─────────────────────────────────────────────────┘
```

---

## 🎯 NEXT STEPS

### Configuration Initiale

1. ✅ Workflows nettoyés
2. ⏳ **Ajouter `HOMEY_TOKEN` secret dans GitHub**
3. ⏳ Créer première release pour tester
4. ⏳ Vérifier publication sur App Store

### Utilisation Continue

1. Développer features
2. Push sur master (validation auto)
3. Créer release quand prêt (publication auto)
4. Vérifier sur Homey App Store

---

## 📖 DOCUMENTATION OFFICIELLE

**Homey CLI:**
- https://apps.developer.homey.app/the-basics/getting-started

**GitHub Actions:**
- https://docs.github.com/en/actions

**Homey App Store:**
- https://apps.athom.com/

---

## ✅ RÉSULTAT FINAL

**STATUS:** 🏆 **WORKFLOWS OFFICIELS HOMEY**

- Workflows: ✅ 3 officiels (validate, publish, auto-organize)
- Désactivés: ✅ 38 anciens workflows
- Méthode: ✅ 100% officielle Homey
- Publication: ✅ Via GitHub releases
- Validation: ✅ Automatique sur push
- Clean: ✅ Organisation automatique
- Production: ✅ READY

**Tout est maintenant conforme aux méthodes officielles Homey pour GitHub Actions!** 🎉

---

**Créé:** 2025-11-04  
**Script:** scripts/maintenance/FIX_GITHUB_WORKFLOWS.js  
**Status:** Production Ready  
