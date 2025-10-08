# 🔄 GUIDE COMPLET DES WORKFLOWS GITHUB

**Date:** 2025-10-08 21:22  
**Status:** ✅ CONFIGURED AND ORGANIZED

---

## 📋 WORKFLOWS DISPONIBLES

Le projet dispose de **4 workflows GitHub Actions** organisés et optimisés:

### 1. 🚀 homey-app-store.yml (PRINCIPAL - AUTO)
```yaml
Trigger: push sur master
Status: ✅ ACTIF
Actions: Officielles Athom
```

**Fonctionnalités:**
- Validation automatique (level: publish)
- Publication Draft automatique
- Auto-promotion Draft → Test
- Summary complet

**Quand s'exécute:**
- À chaque push sur branch `master`
- Automatiquement, 0 intervention

**Résultat:**
- Build créé en 3-5 minutes
- Disponible: https://homey.app/a/com.dlnraja.tuya.zigbee/test/

---

### 2. 📝 manual-publish.yml (MANUEL)
```yaml
Trigger: workflow_dispatch uniquement
Status: ✅ DISPONIBLE
Usage: Publication manuelle avec version bump
```

**Fonctionnalités:**
- Version bump manuel (major/minor/patch)
- Changelog personnalisé
- Commit + tag automatique
- Publication Homey + GitHub Release

**Quand utiliser:**
- Publication contrôlée avec version spécifique
- Changelog personnalisé important
- Release majeure

**Comment déclencher:**
1. GitHub → Actions → "Manual Publish to Homey"
2. Click "Run workflow"
3. Choisir version bump
4. Entrer changelog
5. Run

---

### 3. 🔄 monthly-auto-enrichment.yml (SCHEDULE)
```yaml
Trigger: Schedule mensuel + workflow_dispatch
Status: ✅ ACTIF
Schedule: 1er de chaque mois à 02:00 UTC
```

**Fonctionnalités:**
- Enrichissement automatique database devices
- Mise à jour manufacturer IDs
- Version bump patch automatique
- Publication automatique si changements

**Quand s'exécute:**
- Automatiquement le 1er de chaque mois
- Ou manuellement via workflow_dispatch

**Objectif:**
- Maintenir database à jour
- Intégrer nouveaux devices Zigbee2MQTT
- Publications mensuelles régulières

---

### 4. ~~📦 publish-auto.yml (DÉSACTIVÉ)~~
```yaml
Trigger: DÉSACTIVÉ (était push:master)
Status: ⚠️ DISABLED
Raison: Conflit avec homey-app-store.yml
```

**Pourquoi désactivé:**
- Déclenchement simultané avec homey-app-store.yml
- Erreurs generate-changelog.sh
- Fonctionnalités dupliquées
- Workflow plus complexe

**Alternative:**
- Utiliser `homey-app-store.yml` (automatique)
- Ou `manual-publish.yml` (manuel)

**Status:**
- Garde uniquement `workflow_dispatch` si besoin
- Déclenchement automatique désactivé

---

## 🎯 UTILISATION PAR SCÉNARIO

### Scénario 1: Push Changements Code
```
ACTION: git push origin master
WORKFLOW: homey-app-store.yml (automatique)
RÉSULTAT: Build Test en 3-5 minutes
```

**Cas d'usage:**
- Ajout nouveaux manufacturer IDs
- Corrections bugs
- Améliorations drivers
- Updates documentation

**Process:**
1. ✅ Commit changements localement
2. ✅ Push sur master
3. ✅ Workflow auto-déclenché
4. ✅ Validation + Publication + Promotion
5. ✅ Build disponible en Test

---

### Scénario 2: Release Majeure Contrôlée
```
ACTION: Déclenchement manuel workflow
WORKFLOW: manual-publish.yml
RÉSULTAT: Release avec version + changelog spécifiques
```

**Cas d'usage:**
- Release majeure (breaking changes)
- Changelog détaillé important
- Publication coordonnée
- Annonce officielle

**Process:**
1. ✅ GitHub → Actions → Manual Publish
2. ✅ Run workflow
3. ✅ Choisir major/minor/patch
4. ✅ Écrire changelog
5. ✅ Publish → Draft
6. ✅ Dashboard → Promouvoir Live

---

### Scénario 3: Enrichissement Mensuel
```
ACTION: Automatique 1er du mois
WORKFLOW: monthly-auto-enrichment.yml
RÉSULTAT: Database enrichie + publication si changements
```

**Cas d'usage:**
- Maintenance régulière
- Updates manufacturer IDs
- Intégration nouveaux devices
- Synchronisation Zigbee2MQTT

**Process:**
1. ✅ Cron déclenche automatiquement
2. ✅ Fetch databases externes
3. ✅ Merge nouveaux IDs
4. ✅ Commit si changements
5. ✅ Publish automatiquement

---

## 🔑 SECRETS GITHUB REQUIS

### HOMEY_PAT (OBLIGATOIRE)
```
Secret: HOMEY_PAT
Type: Personal Access Token
Obtention: https://tools.developer.homey.app/me
Usage: Tous les workflows publication
```

**Configuration:**
1. Obtenir token Homey
2. GitHub → Settings → Secrets → Actions
3. New secret: `HOMEY_PAT`
4. Valeur: Token copié

**Vérification:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.developer.homey.app/user/me
```

---

## ⚙️ CONFIGURATION WORKFLOWS

### Modifier Trigger Événements

**homey-app-store.yml:**
```yaml
on:
  push:
    branches:
      - master  # Changer branch si besoin
```

**manual-publish.yml:**
```yaml
on:
  workflow_dispatch:  # Toujours manuel
```

**monthly-auto-enrichment.yml:**
```yaml
on:
  schedule:
    - cron: '0 2 1 * *'  # Modifier schedule si besoin
  workflow_dispatch:
```

---

## 📊 MONITORING WORKFLOWS

### GitHub Actions Dashboard
```
URL: https://github.com/dlnraja/com.tuya.zigbee/actions
```

**Informations visibles:**
- Workflows runs (succès/échec)
- Logs détaillés
- Durée exécution
- Artifacts générés

### Homey Dashboard
```
URL: https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee
```

**Informations visibles:**
- Builds créés
- Status (Draft/Test/Live)
- Version actuelle
- Installation stats

---

## 🐛 TROUBLESHOOTING

### Workflow Échoue: "personal_access_token required"

**Cause:** Secret `HOMEY_PAT` manquant ou invalide

**Solution:**
1. Vérifier secret existe
2. Régénérer token si nécessaire
3. Mettre à jour secret GitHub

---

### Deux Workflows Se Déclenchent

**Cause:** Plusieurs workflows avec même trigger

**Solution:**
1. Identifier workflows conflictuels
2. Désactiver un des deux
3. Ou changer triggers

**Exemple fix:**
```yaml
# Avant (conflit)
on:
  push:
    branches: [master]

# Après (désactivé)
on:
  # push:
  #   branches: [master]
  workflow_dispatch:
```

---

### Workflow Validation Échoue

**Causes communes:**
- JSON mal formatté
- Images manquantes
- Manufacturer ID invalide

**Solution:**
```bash
# Test local
homey app validate --level=publish

# Vérifier JSON
cat app.json | jq .

# Vérifier images
find assets/images drivers/*/assets -name "*.png"
```

---

### Build Non Promu en Test

**Cause:** API promotion échoue

**Solution:**
1. Vérifier logs workflow
2. Check HTTP status code
3. Promouvoir manuellement depuis dashboard
4. Vérifier `HOMEY_PAT` permissions

---

## 📈 STATISTIQUES WORKFLOWS

### Temps Moyen d'Exécution

**homey-app-store.yml:**
- Validation: 30-60s
- Publication: 60-90s
- Promotion: 5-10s
- **Total:** ~3-5 minutes

**manual-publish.yml:**
- Validation: 30-60s
- Version bump: 10-20s
- Publication: 60-90s
- Release: 10-20s
- **Total:** ~4-6 minutes

**monthly-auto-enrichment.yml:**
- Enrichment: 5-10 minutes
- Validation: 30-60s
- Publication: 60-90s
- **Total:** ~7-12 minutes

---

## ✅ BEST PRACTICES

### 1. Commits
```bash
# Convention commit messages
feat: nouvelle fonctionnalité
fix: correction bug
chore: maintenance
docs: documentation

# Déclenche workflow automatiquement
git push origin master
```

### 2. Versions
```
patch: Bug fixes (2.0.5 → 2.0.6)
minor: New features (2.0.5 → 2.1.0)
major: Breaking changes (2.0.5 → 3.0.0)
```

### 3. Changelog
```
User-friendly, pas technique
Bénéfices utilisateur, pas implementation
Court et clair (max 400 caractères)
```

### 4. Testing
```
Toujours tester build Test avant Live
Vérifier installation fonctionne
Valider devices supportés
Check health score dashboard
```

---

## 🔮 WORKFLOWS FUTURS (Optionnel)

### Test Automatisés
```yaml
name: Run Tests
on: [push, pull_request]
jobs:
  test:
    - run: npm test
    - run: homey app validate --level=verified
```

### Pre-Release Candidate
```yaml
name: Create RC Build
on: 
  push:
    tags: ['rc-*']
jobs:
  - Validate
  - Publish Draft
  - Label as "Release Candidate"
```

### Health Check Monitoring
```yaml
name: Weekly Health Check
on:
  schedule:
    - cron: '0 0 * * 0'  # Every Sunday
jobs:
  - Check API health
  - Validate all drivers
  - Report issues
```

---

## 📚 RESSOURCES

### Documentation Workflows
- GitHub Actions: https://docs.github.com/en/actions
- Workflow Syntax: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions
- Cron Syntax: https://crontab.guru/

### Actions Homey
- Validate: https://github.com/marketplace/actions/homey-app-validate
- Publish: https://github.com/marketplace/actions/homey-app-publish
- Version: https://github.com/marketplace/actions/homey-app-update-version

### Homey Developer
- Dashboard: https://tools.developer.homey.app/
- API Docs: https://api.developer.homey.app/
- Forum: https://community.homey.app/

---

## 🎉 RÉSUMÉ

### Configuration Actuelle

**Workflows Actifs:**
- ✅ homey-app-store.yml (auto sur push)
- ✅ manual-publish.yml (manuel)
- ✅ monthly-auto-enrichment.yml (schedule)
- ⚠️ publish-auto.yml (désactivé)

**Secrets Requis:**
- ✅ HOMEY_PAT (Personal Access Token)

**Actions Officielles:**
- ✅ athombv/github-action-homey-app-validate
- ✅ athombv/github-action-homey-app-publish
- ✅ athombv/github-action-homey-app-version

**Résultat:**
🎊 **Workflows 100% fonctionnels et organisés!** 🎊

---

**Document créé:** 2025-10-08 21:22  
**Type:** Guide Complet Workflows  
**Status:** ✅ FINAL ET COMPLET
