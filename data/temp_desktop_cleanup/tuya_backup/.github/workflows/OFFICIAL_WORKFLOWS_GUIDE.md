# 📚 Guide Officiel - Workflows GitHub Actions Homey

**Date:** 2025-10-11  
**Based on:** [Official Homey Documentation](https://apps.developer.homey.app/app-store/publishing)

---

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Actions Officielles GitHub Marketplace](#actions-officielles)
3. [Workflows Disponibles](#workflows-disponibles)
4. [Configuration Requise](#configuration-requise)
5. [Utilisation](#utilisation)
6. [Dépannage](#dépannage)

---

## 🎯 Vue d'ensemble

Ce projet utilise les **actions officielles Homey** disponibles sur GitHub Marketplace pour automatiser la validation, le versioning et la publication de l'app.

### Actions Officielles Homey

| Action | URL | Purpose |
|--------|-----|---------|
| **Validate** | [athombv/github-action-homey-app-validate](https://github.com/marketplace/actions/homey-app-validate) | Valide l'app selon les standards Homey |
| **Update Version** | [athombv/github-action-homey-app-update-version](https://github.com/marketplace/actions/homey-app-update-version) | Incrémente la version et génère le changelog |
| **Publish** | [athombv/github-action-homey-app-publish](https://github.com/marketplace/actions/homey-app-publish) | Publie l'app sur Homey App Store |

---

## 📦 Actions Officielles

### 1. Homey App Validate

```yaml
- name: Validate App
  uses: athombv/github-action-homey-app-validate@master
  with:
    validate-level: publish  # debug, publish, ou verified
```

**Niveaux de validation:**
- `debug` - Développement (images optionnelles)
- `publish` - Publication Homey Pro (requis)
- `verified` - Développeur vérifié + Homey Cloud (stricte)

### 2. Homey App Update Version

```yaml
- name: Update Version
  uses: athombv/github-action-homey-app-update-version@master
  with:
    version: patch  # patch, minor, ou major
    changelog: "Bug fixes and improvements"
```

**Types de version:**
- `patch` - 2.1.51 → 2.1.52 (corrections)
- `minor` - 2.1.51 → 2.2.0 (nouvelles fonctionnalités)
- `major` - 2.1.51 → 3.0.0 (changements majeurs)

### 3. Homey App Publish

```yaml
- name: Publish App
  uses: athombv/github-action-homey-app-publish@master
  with:
    personal-access-token: ${{ secrets.HOMEY_PAT }}
```

**Prérequis:**
- Secret GitHub `HOMEY_PAT` configuré
- App validée avec succès
- Version mise à jour

---

## 🔄 Workflows Disponibles

### Workflow 1: `homey-official-publish.yml`

**Déclenchement:**
- Push sur `master` (automatique)
- Manuel via `workflow_dispatch`

**Étapes:**
1. ✅ Validation (niveau publish)
2. 📦 Mise à jour de version (patch auto)
3. 🚀 Publication sur Homey App Store
4. 📝 Commit des changements de version

**Utilisation manuelle:**

```bash
# Via GitHub UI
Repository → Actions → Official Homey App Store Publication → Run workflow
  - Branch: master
  - Version type: patch/minor/major
  - Changelog: "Your custom message"
```

### Workflow 2: `homey-validate.yml`

**Déclenchement:**
- Pull requests vers `master`
- Push sur branches secondaires
- Manuel via `workflow_dispatch`

**Étapes:**
1. ✅ Validation multi-niveaux (debug + publish)
2. 🔍 Vérification syntaxe JSON
3. 📊 Vérification structure drivers

**Utilisation:**
Automatique lors des PRs et développement.

---

## ⚙️ Configuration Requise

### 1. GitHub Secrets

Créer le secret `HOMEY_PAT` dans votre repository:

```
Repository Settings
  → Secrets and variables
    → Actions
      → New repository secret
        Name: HOMEY_PAT
        Value: <votre Personal Access Token Homey>
```

**Obtenir un PAT Homey:**
1. Aller sur https://tools.developer.homey.app
2. Account → Personal Access Tokens
3. Create new token
4. Copier et sauvegarder dans GitHub Secrets

### 2. Permissions GitHub Actions

Dans `.github/workflows/*.yml`:

```yaml
permissions:
  contents: write  # Requis pour commit de version
```

### 3. Dependencies

Le workflow installe automatiquement:
- `homey` (Homey CLI)
- `canvas` (pour génération d'images)

---

## 🚀 Utilisation

### Publication Automatique (Recommandée)

1. **Développer et tester localement:**
   ```bash
   npm install
   npx homey app validate --level publish
   ```

2. **Commit et push sur master:**
   ```bash
   git add .
   git commit -m "feat: add support for new devices"
   git push origin master
   ```

3. **GitHub Actions s'exécute automatiquement:**
   - Valide l'app
   - Incrémente la version (patch)
   - Publie sur Homey App Store
   - Commit le nouveau numéro de version

4. **Gérer la release via Dashboard:**
   - Aller sur https://tools.developer.homey.app
   - Apps SDK → My Apps
   - Choisir **Test** ou **Live** release

### Publication Manuelle

**Utiliser le script PowerShell:**

```powershell
# Publication standard
.\scripts\automation\publish-homey-official.ps1

# Dry run (test sans publier)
.\scripts\automation\publish-homey-official.ps1 -DryRun

# Version mineure avec changelog custom
.\scripts\automation\publish-homey-official.ps1 `
  -VersionType minor `
  -Changelog "Added 20 new device models"

# Skip validation (déconseillé)
.\scripts\automation\publish-homey-official.ps1 -SkipValidation
```

**Utiliser la CLI directement:**

```bash
# Méthode officielle simple
npx homey app publish
```

---

## 🎯 Processus de Release

### Étape 1: Draft → Test

Après publication GitHub Actions:

1. **App créée en Draft** dans votre dashboard
2. **Promouvoir vers Test:**
   - Dashboard → My Apps → Universal Tuya Zigbee
   - Choose "Release to Test"
   - App disponible via Test URL uniquement

**Test URL:**
```
https://homey.app/a/com.dlnraja.tuya.zigbee/test/
```

### Étape 2: Test → Live (Certification)

Après tests concluants:

1. **Soumettre pour certification:**
   - Dashboard → My Apps → Universal Tuya Zigbee
   - Choose "Submit for certification"
   - ⚠️ **Décocher** "publish directly after approval" si vous voulez vérifier d'abord

2. **Athom Review (1-3 jours ouvrables):**
   - Vérification App Store Guidelines
   - Test fonctionnel basique
   - Vérification assets/description

3. **Après approbation:**
   - Si auto-publish activé → Live immédiatement
   - Sinon → Vous pouvez release manuellement

**Live URL:**
```
https://homey.app/a/com.dlnraja.tuya.zigbee/
```

---

## 🔍 Dépannage

### Erreur: "Validation failed"

**Vérifier localement:**
```bash
npx homey app validate --level publish
```

**Causes fréquentes:**
- Images manquantes/mauvaise taille
- Capabilities invalides
- Clusters Zigbee en format string au lieu de numérique
- Batteries type invalide

### Erreur: "Authentication failed"

**Solutions:**
1. Vérifier que `HOMEY_PAT` est bien configuré dans GitHub Secrets
2. Vérifier que le token n'est pas expiré
3. Régénérer un nouveau token si besoin

### Erreur: "Build already exists"

**Solutions:**
1. Attendre quelques minutes (le build précédent est peut-être en cours)
2. Incrémenter manuellement la version dans `app.json`
3. Nettoyer le cache: `rm -rf .homeybuild .homeycompose`

### Le workflow ne se déclenche pas

**Vérifications:**
1. GitHub Actions activé dans repo settings
2. Workflow file dans `.github/workflows/`
3. Syntaxe YAML correcte
4. Permissions `contents: write` définies

---

## 📊 Comparaison Méthodes

| Méthode | Avantages | Inconvénients |
|---------|-----------|---------------|
| **GitHub Actions (Officiel)** | ✅ Automatisé<br>✅ Versioning auto<br>✅ Traçable | ⚠️ Nécessite configuration secrets |
| **CLI Manuelle** | ✅ Simple<br>✅ Contrôle total | ⚠️ Manuel<br>⚠️ Pas d'historique auto |
| **Script PowerShell** | ✅ Semi-automatisé<br>✅ Configurable | ⚠️ Windows seulement |

---

## 📚 Ressources

### Documentation Officielle
- [Homey Publishing Guide](https://apps.developer.homey.app/app-store/publishing)
- [App Store Guidelines](https://apps.developer.homey.app/app-store/guidelines)
- [Validation Levels](https://apps.developer.homey.app/app-store/publishing#requirements)

### GitHub Marketplace Actions
- [Validate Action](https://github.com/marketplace/actions/homey-app-validate)
- [Version Action](https://github.com/marketplace/actions/homey-app-update-version)
- [Publish Action](https://github.com/marketplace/actions/homey-app-publish)

### Developer Tools
- [Homey Developer Dashboard](https://tools.developer.homey.app)
- [Homey App Store](https://homey.app/apps)

---

## ✅ Checklist Pre-Publication

Avant de publier:

- [ ] `npx homey app validate --level publish` passe sans erreurs
- [ ] Tous les drivers ont des images (small/large)
- [ ] CHANGELOG.md mis à jour
- [ ] README.md décrit correctement l'app
- [ ] `HOMEY_PAT` secret configuré (pour GitHub Actions)
- [ ] Version incrémentée de manière appropriée
- [ ] Git repository propre (pas de fichiers non commitées)

---

**Dernière mise à jour:** 2025-10-11  
**Mainteneur:** Dylan Rajasekaram  
**Support:** [GitHub Issues](https://github.com/dlnraja/com.tuya.zigbee/issues)
