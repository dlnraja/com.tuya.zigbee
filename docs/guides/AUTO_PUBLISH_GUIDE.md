# 🚀 Auto-Publish Complete - Guide Complet

**Date:** 2025-10-11 14:43  
**Workflow:** `auto-publish-complete.yml`  
**Status:** ✅ **PRODUCTION READY**

---

## 🎯 Vue d'Ensemble

**Publication automatique complète** à chaque push vers `master` utilisant les **actions officielles Athom**.

### Workflow Complet

```
Push → Pre-Checks → Validate → Version → Publish → Dashboard
```

**Temps total:** ~3-5 minutes  
**Intervention manuelle:** Aucune (100% automatique)

---

## ⚡ Configuration Rapide (1 Étape)

### Configurer HOMEY_PAT

**C'EST LA SEULE ÉTAPE REQUISE:**

1. **Obtenir token:**
   ```
   https://tools.developer.homey.app/me
   → Personal Access Tokens
   → Create new token
   → Copier le token
   ```

2. **Ajouter dans GitHub:**
   ```
   https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions
   → New repository secret
     Name: HOMEY_PAT
     Value: <paste token>
   → Add secret
   ```

**C'est tout!** Le reste est 100% automatique.

---

## 🎮 Comment Ça Marche

### Déclenchement Automatique

**À chaque push vers `master`:**

1. ✅ **Pre-Flight Checks**
   - Vérification JSON syntax
   - Vérification structure drivers
   - Analyse commit message

2. ✅ **Validation Officielle**
   - Action: `athombv/github-action-homey-app-validate@master`
   - Niveau: publish

3. ✅ **Versioning Intelligent**
   - Action: `athombv/github-action-homey-app-version@master`
   - Auto-détecte le type de version depuis commit

4. ✅ **Publication Automatique**
   - Action: `athombv/github-action-homey-app-publish@master`
   - Publie directement vers Homey App Store

---

## 🧠 Versioning Intelligent

### Détection Automatique

| Commit commence par | Version | Exemple |
|---------------------|---------|---------|
| `feat:`, `feature:`, `add:` | **minor** | 2.1.51 → 2.2.0 |
| `fix:`, `bug:`, `patch:` | **patch** | 2.1.51 → 2.1.52 |
| `break:`, `major:`, `breaking:` | **major** | 2.1.51 → 3.0.0 |
| `device`, `manufacturer`, `driver` | **patch** | 2.1.51 → 2.1.52 |
| `forum`, `community`, `issue` | **patch** | 2.1.51 → 2.1.52 |
| Autre | **patch** | 2.1.51 → 2.1.52 |

### Changelog Automatique

| Type commit | Changelog généré |
|-------------|------------------|
| `feat:` | "New features and device support added" |
| `fix:` | "Bug fixes and stability improvements" |
| `device` | "Enhanced device compatibility and manufacturer support" |
| `forum` | "Community-reported issues fixed" |
| Autre | "Performance and stability improvements" |

---

## ⏭️ Skip Publication

### Option 1: Commit Message

Ajouter dans le commit message:

```bash
git commit -m "docs: update README [skip publish]"
git push
# → Validation seulement, pas de publication
```

**Mots-clés qui skip:**
- `[skip ci]`
- `[skip publish]`
- `docs:` au début
- `doc:` au début

### Option 2: Manual Dispatch

```
GitHub → Actions → Auto-Publish Complete Pipeline
  → Run workflow
    → Skip auto-publish: true
```

---

## 📊 Exemple d'Utilisation

### Scénario 1: Ajouter Nouveaux Devices

```bash
# 1. Ajouter devices dans drivers/
git add drivers/new_device/

# 2. Commit avec prefix feat:
git commit -m "feat: add support for 10 new temperature sensors"

# 3. Push
git push origin master
```

**Résultat automatique:**
- ✅ Validation OK
- ✅ Version: 2.1.51 → **2.2.0** (minor)
- ✅ Changelog: "New features and device support added"
- ✅ Publié sur Homey App Store

---

### Scénario 2: Bug Fix

```bash
# 1. Corriger bug
git add drivers/sensor/device.js

# 2. Commit avec prefix fix:
git commit -m "fix: temperature sensor now reports correctly"

# 3. Push
git push origin master
```

**Résultat automatique:**
- ✅ Validation OK
- ✅ Version: 2.1.51 → **2.1.52** (patch)
- ✅ Changelog: "Bug fixes and stability improvements"
- ✅ Publié sur Homey App Store

---

### Scénario 3: Documentation

```bash
# 1. Mise à jour doc
git add README.md

# 2. Commit avec prefix docs:
git commit -m "docs: update installation guide"

# 3. Push
git push origin master
```

**Résultat automatique:**
- ✅ Validation OK
- ⏭️ **Publication skipped** (docs seulement)

---

## 🔍 Monitoring

### Vérifier GitHub Actions

```
https://github.com/dlnraja/com.tuya.zigbee/actions
```

**Look for:**
- 🟢 Green = Success
- 🔴 Red = Failed
- 🟡 Yellow = Running
- ⚪ Gray = Skipped

### Vérifier Homey Dashboard

```
https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee
```

**Après publication réussie:**
- Nouveau build apparaît (Draft)
- Prêt à promouvoir vers Test

---

## 🛠️ Pre-Flight Checks Détaillés

### Check 1: JSON Syntax

```bash
Validates all *.json files
Ensures no syntax errors
Excludes node_modules/
```

**Errors cause:** Pipeline fails before validation

### Check 2: Driver Structure

```bash
Counts drivers/ subdirectories
Ensures at least 1 driver exists
Verifies basic structure
```

**Errors cause:** Pipeline fails before validation

### Check 3: Commit Analysis

```bash
Reads last commit message
Determines if should publish
Detects version type needed
```

**Skips publish if:** `[skip ci]`, `[skip publish]`, `docs:`

---

## 📋 Workflow Steps Détaillés

### Step 1: Pre-Flight Checks (~30s)

```yaml
jobs:
  pre-checks:
    - Install dependencies
    - Check JSON syntax
    - Check driver structure
    - Analyze commit message
    outputs:
      should_publish: true/false
```

### Step 2: Validation (~1-2 min)

```yaml
jobs:
  validate:
    needs: pre-checks
    - uses: athombv/github-action-homey-app-validate@master
      with:
        level: publish
```

### Step 3: Auto-Publish (~2-3 min)

```yaml
jobs:
  auto-publish:
    needs: [pre-checks, validate]
    if: should_publish == 'true'
    - Generate smart changelog
    - uses: athombv/github-action-homey-app-version@master
    - Commit version changes
    - Wait for git sync
    - uses: athombv/github-action-homey-app-publish@master
```

### Step 4: Summary (~10s)

```yaml
jobs:
  notify:
    needs: [pre-checks, validate, auto-publish]
    - Generate summary
    - Show status
```

---

## 🐛 Troubleshooting

### "HOMEY_PAT not found"

**Solution:**
```
1. Verify secret exists at:
   https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions
2. Name must be exactly: HOMEY_PAT
3. Value must be valid token from Homey
```

### "Validation failed"

**Solution:**
```bash
# Test locally first
npx homey app validate --level publish

# Fix errors
# Then push again
```

### "Version already exists"

**Solution:**
```
1. Check Homey Dashboard for duplicate
2. Delete draft build if needed
3. Push again
```

### "Permission denied"

**Solution:**
```yaml
# Workflow needs this permission:
permissions:
  contents: write
# Already configured in workflow
```

---

## 📚 Comparaison avec Méthode Manuelle

| Feature | Auto-Publish | Manuel |
|---------|--------------|--------|
| **Déclenchement** | Automatique | Manuel dispatch |
| **Versioning** | Auto-détecté | Choix manuel |
| **Changelog** | Auto-généré | Input manuel |
| **Intervention** | 0 | 3 clics |
| **Temps** | 3-5 min | 5-10 min |
| **Erreurs** | Moins | Plus |
| **Idéal pour** | CI/CD quotidien | Releases majeures |

---

## 🎓 Best Practices

### Commit Messages

**✅ Bon:**
```bash
git commit -m "feat: add 20 new motion sensors"
git commit -m "fix: temperature reading bug"
git commit -m "docs: update README [skip publish]"
```

**❌ Mauvais:**
```bash
git commit -m "update"
git commit -m "changes"
git commit -m "wip"
```

### Testing Avant Push

```bash
# 1. Valider localement
npx homey app validate --level publish

# 2. Installer sur Homey de test
npx homey app install

# 3. Tester fonctionnalités

# 4. Commit et push
git commit -m "feat: tested new feature"
git push
```

### Documentation Updates

```bash
# Toujours utiliser prefix docs: pour docs
git commit -m "docs: update installation guide"
# → Skip auto-publish

# Ou ajouter [skip publish]
git commit -m "chore: cleanup code [skip publish]"
# → Skip auto-publish
```

---

## 🔗 Ressources

### Documentation

- **Ce guide:** AUTO_PUBLISH_GUIDE.md
- **Setup GitHub Actions:** GITHUB_ACTIONS_SETUP.md
- **Workflows officiels:** .github/workflows/OFFICIAL_WORKFLOWS_GUIDE.md

### Actions Athom Officielles

1. **Validate:** https://github.com/marketplace/actions/homey-app-validate
2. **Version:** https://github.com/marketplace/actions/homey-app-update-version
3. **Publish:** https://github.com/marketplace/actions/homey-app-publish

### Homey Developer

- **Dashboard:** https://tools.developer.homey.app
- **App Management:** https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee
- **Test URL:** https://homey.app/a/com.dlnraja.tuya.zigbee/test/

---

## ✅ Ready to Auto-Publish!

**Configuration complète:**
- ✅ Workflow auto-publish configuré
- ⏳ HOMEY_PAT à configurer (1 fois)
- ✅ Documentation complète

**Next steps:**
1. **Configure HOMEY_PAT** (voir début du guide)
2. **Test avec commit:** `git commit -m "test: auto-publish" --allow-empty && git push`
3. **Monitor:** https://github.com/dlnraja/com.tuya.zigbee/actions
4. **Check Dashboard:** https://tools.developer.homey.app

---

**Status:** ✅ **100% AUTOMATED & PRODUCTION READY**  
**Created:** 2025-10-11 14:43  
**Workflow:** auto-publish-complete.yml

---

**Made with ❤️ using Official Athom GitHub Actions**
