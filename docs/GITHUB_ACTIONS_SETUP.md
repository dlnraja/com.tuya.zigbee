# 🤖 Configuration GitHub Actions - Guide Complet

**Date:** 12 Octobre 2025  
**Version:** 2.0

---

## 🎯 Vue d'Ensemble

GitHub Actions configure pour:
- ✅ **Auto-publish** vers Homey App Store (si changements drivers)
- ✅ **Scraping hebdomadaire** (tous les lundis 2h UTC)
- ✅ **Validation complète** avant chaque publication
- ✅ **Zero intervention** manuelle requise

---

## 🔐 Configuration Secrets GitHub

### Étape 1: Obtenir le HOMEY_TOKEN

**Sur votre machine locale:**

```bash
# 1. Login Homey CLI
homey login

# 2. Récupérer le token
cat ~/.homey/session.json
```

**Sortie:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {...}
}
```

**Copier la valeur de `token`** (sans les guillemets)

### Étape 2: Ajouter Secret GitHub

1. Aller sur GitHub repository
2. **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. **Name:** `HOMEY_TOKEN`
5. **Secret:** Coller le token copié
6. Click **"Add secret"**

### ✅ Vérification

Le secret devrait apparaître dans la liste:
```
HOMEY_TOKEN
Updated X minutes ago
```

**⚠️ IMPORTANT:**
- Ne JAMAIS committer le token dans le code
- Le secret est chiffré par GitHub
- Seules les GitHub Actions peuvent le lire

---

## 📋 Workflows Disponibles

### 1. Auto Driver Publish

**Fichier:** `.github/workflows/auto-driver-publish.yml`

**Trigger:**
```yaml
on:
  push:
    branches: [ master ]
    paths:
      - 'drivers/**'  # SEULEMENT changements drivers
  workflow_dispatch:    # Manuel aussi
```

**Étapes:**
1. ✅ Détection changements drivers
2. ✅ Validation syntax (JSON)
3. ✅ Homey CLI validation (publish level)
4. ✅ SDK3 compliance check
5. ✅ Driver endpoints check
6. ✅ Auto-bump version (patch +1)
7. ✅ Commit version bump
8. ✅ Re-validation post-bump
9. ✅ **Publish Homey App Store**
10. ✅ Create GitHub Release
11. ✅ Summary détaillé

**Si pas de changements drivers:**
- Skip publication
- Sync docs uniquement

### 2. Weekly Enrichment

**Fichier:** `.github/workflows/weekly-enrichment.yml`

**Trigger:**
```yaml
on:
  schedule:
    - cron: '0 2 * * 1'  # Lundi 2h UTC
  workflow_dispatch:      # Manuel aussi
```

**Étapes:**
1. ✅ Scrape forum Homey
2. ✅ Scrape GitHub issues
3. ✅ Check databases (Zigbee2MQTT, Blakadder)
4. ✅ Génère enrichment reports
5. ✅ Commit reports vers GitHub

**Output:**
- `docs/enrichment/enrichment_report_*.json`
- `docs/enrichment/enrichment_plan_*.json`
- `docs/enrichment/user_data_requests.md`

---

## 🚀 Utilisation

### Publish Automatique

**1. Modifier un driver:**
```bash
# Exemple: Fix battery calculation
vim drivers/sos_emergency_button_cr2032/device.js

# Commit et push
git add drivers/
git commit -m "fix: battery calculation for SOS button"
git push origin master
```

**2. GitHub Actions s'exécute automatiquement:**
- Détecte changement dans `drivers/`
- Valide tout
- Bump version 2.15.3 → 2.15.4
- Publish Homey App Store
- Create release v2.15.4

**3. Check résultat:**
- GitHub Actions tab (onglet Actions)
- Voir les logs détaillés
- Summary automatique

### Publish Manuel

**Via GitHub Interface:**

1. Aller sur **Actions** tab
2. Click **Auto Driver Publish** workflow
3. Click **Run workflow**
4. Select branch: **master**
5. Click **Run workflow**

**Utile pour:**
- Forcer re-publish
- Tester workflow
- Debug

### Enrichment Manuel

**Via GitHub Interface:**

1. Aller sur **Actions** tab
2. Click **Weekly Auto-Enrichment** workflow
3. Click **Run workflow**
4. Select branch: **master**
5. Click **Run workflow**

**Utile pour:**
- Scraping immédiat (sans attendre lundi)
- Check nouvelles issues forum
- Mise à jour enrichment plan

---

## 📊 Monitoring

### GitHub Actions Tab

**Voir tous les runs:**
- ✅ Success (vert)
- ⚠️ Warnings (jaune)
- ❌ Failed (rouge)

**Click sur un run pour:**
- Voir logs détaillés
- Check validation steps
- Voir erreurs si failed

### Notifications

**Par défaut, GitHub envoie email si:**
- Workflow failed
- Vous êtes author du commit

**Personnaliser:**
Settings → Notifications → Actions

---

## 🛡️ Validations Appliquées

### 1. Syntax Validation

```bash
# Valide tous les JSON
jq empty app.json
jq empty .homeychangelog.json
for manifest in drivers/*/driver.compose.json; do
  jq empty "$manifest"
done
```

**Si erreur:** Workflow STOP

### 2. Homey CLI Validation

```bash
homey app validate --level publish
```

**Vérifie:**
- Tous les champs requis
- Format capabilities
- Driver manifests
- SDK version
- Dependencies

**Si erreur:** Workflow STOP

### 3. SDK3 Compliance

```javascript
// Vérifie SDK version = 3
require('./app.json').sdk === 3

// Check pas de homey-meshdriver (deprecated)
!package.json.includes('homey-meshdriver')
```

**Si erreur:** Workflow STOP

### 4. Driver Endpoints

```javascript
// Check tous Zigbee drivers ont endpoints
for driver in zigbee_drivers:
  if !driver.zigbee.endpoints:
    warning()  // Continue quand même
```

**Si warning:** Continue (pas bloquant)

### 5. Post-Bump Validation

Après version bump, re-valide TOUT:
```bash
homey app validate --level publish
```

**Garantit:** Aucune casse durant bump

---

## 🔧 Troubleshooting

### Erreur: "HOMEY_TOKEN not configured"

**Solution:**
1. Vérifier secret existe dans GitHub Settings
2. Nom exact: `HOMEY_TOKEN` (case-sensitive)
3. Re-générer token si expiré

### Erreur: "Homey authentication failed"

**Causes possibles:**
1. Token expiré → Regénérer
2. Token invalide → Copier correctement
3. Account suspendu → Vérifier account Homey

**Solution:**
```bash
# Regénérer token local
homey logout
homey login
cat ~/.homey/session.json

# Update secret GitHub
```

### Erreur: "Validation failed"

**Voir logs détaillés:**
1. GitHub Actions → Failed run
2. Click step qui a fail
3. Voir error message complet

**Causes fréquentes:**
- JSON invalide
- Capability non supportée
- Cluster ID string au lieu de number
- Missing endpoints

**Fix:**
```bash
# Valider localement AVANT push
homey app validate --level publish

# Fix errors
# Re-test
# Push
```

### Workflow ne se déclenche pas

**Vérifier:**
1. Changements dans `drivers/` ?
2. Push sur branch `master` ?
3. Workflow activé (pas disabled) ?

**Debug:**
```bash
# Check quels fichiers changed
git diff --name-only HEAD~1 HEAD

# Doit inclure drivers/*
```

### Publication réussit mais pas visible sur Homey

**Délai normal:** 5-15 minutes

**Vérifier:**
1. Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee
2. Status doit être "Live"
3. Logs workflow doivent dire "Successfully published"

---

## 📈 Best Practices

### DO ✅

1. **Tester localement avant push**
   ```bash
   homey app validate --level publish
   npm test  # Si tests existent
   ```

2. **Commit messages clairs**
   ```bash
   git commit -m "fix: battery calculation SOS button"
   # Pas: "update"
   ```

3. **Laisser workflow auto-bump version**
   - Ne pas bump manuellement
   - Workflow gère automatiquement

4. **Check logs si erreur**
   - Aller dans GitHub Actions
   - Lire erreur complète
   - Fix avant re-push

5. **Monitor dashboard Homey après publish**
   - Vérifier version live
   - Check pas d'erreurs users

### DON'T ❌

1. **Committer secrets dans code**
   ```javascript
   // ❌ NEVER DO THIS
   const token = "eyJhbGciOiJIUzI1...";
   ```

2. **Force push sur master**
   ```bash
   git push -f origin master  # ❌ Casse workflow
   ```

3. **Modifier app.json version manuellement**
   - Workflow auto-bump
   - Conflicts si manuel

4. **Skip validation localement**
   - Toujours `homey app validate` avant push
   - Économise temps si erreur

5. **Ignorer warnings**
   - Warnings = problèmes potentiels
   - Fix même si non-bloquant

---

## 🎯 Exemples Concrets

### Scenario 1: Fix Bug Simple

**Code:**
```bash
# 1. Fix bug
vim drivers/motion_sensor/device.js

# 2. Test local
homey app validate

# 3. Commit
git add drivers/motion_sensor/device.js
git commit -m "fix: motion sensor timeout issue"

# 4. Push
git push origin master
```

**Résultat automatique:**
- GitHub Actions détecte changement drivers
- Valide
- Bump 2.15.3 → 2.15.4
- Publish Homey
- Create release v2.15.4
- Users reçoivent update

**Temps:** ~5 minutes total (automatique)

### Scenario 2: Update Documentation

**Code:**
```bash
# 1. Update docs
vim docs/ENRICHMENT_SYSTEM.md

# 2. Commit
git add docs/
git commit -m "docs: clarify enrichment process"

# 3. Push
git push origin master
```

**Résultat automatique:**
- GitHub Actions détecte PAS de changements drivers
- Skip publish Homey
- Sync docs vers GitHub
- Pas de nouvelle version

**Temps:** ~1 minute (rapide)

### Scenario 3: Enrichment Manuel

**Action:**
1. GitHub → Actions → Weekly Auto-Enrichment
2. Run workflow (manual)

**Résultat automatique:**
- Scrape forum + GitHub + databases
- Génère enrichment reports
- Commit vers GitHub
- Rapports dispo dans `docs/enrichment/`

**Review:**
```bash
# Local
git pull
cat docs/enrichment/user_data_requests.md

# Si besoin user data
# Poster sur forum demandant diagnostic logs
```

---

## 📚 Ressources

### Documentation Homey

- [Homey CLI](https://apps.developer.homey.app/the-homey-cli)
- [App Structure](https://apps.developer.homey.app/the-app/app-structure)
- [Publishing](https://apps.developer.homey.app/the-homey-cli/publishing-your-app)

### GitHub Actions

- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Debugging](https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows)

### Project Docs

- `docs/AUTOMATION_COMPLETE.md` - Système automation complet
- `docs/ENRICHMENT_SYSTEM.md` - Enrichissement intelligent
- `docs/WORKFLOW_AUTOMATIQUE.md` - Git workflow
- `.github/workflows/` - Workflow configs

---

## 🔄 Maintenance

### Mise à Jour Homey CLI

**GitHub Actions met à jour automatiquement:**
```yaml
- run: npm install -g homey@latest
```

**Local:**
```bash
npm update -g homey
```

### Rotation Token

**Recommandé:** Tous les 6 mois

1. Générer nouveau token
   ```bash
   homey logout
   homey login
   cat ~/.homey/session.json
   ```

2. Update secret GitHub
   - Settings → Secrets → HOMEY_TOKEN → Update

3. Test workflow manuel

### Vérification Santé

**Mensuel:**
1. Check GitHub Actions tab (tous green?)
2. Review failed runs (s'il y en a)
3. Vérifier dashboard Homey (version live correcte?)
4. Check enrichment reports (enrichissement actif?)

---

## ✅ Checklist Setup Initial

- [ ] HOMEY_TOKEN ajouté dans GitHub Secrets
- [ ] Test workflow manuel (Run workflow)
- [ ] Workflow success (check vert)
- [ ] Version publiée sur dashboard Homey
- [ ] GitHub Release créé
- [ ] Notifications GitHub configurées
- [ ] Documentation lue et comprise

---

**Créé:** 12 Octobre 2025  
**Version:** 2.0  
**Status:** ✅ Production Ready
