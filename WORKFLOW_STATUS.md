# 🔍 Status Workflow GitHub Actions - Test Publication

## ✅ Actions Effectuées

### 1. Push Test Déclenché
**Commit:** `1cf5f70c2` - test: workflow GitHub Actions publication  
**Date:** 2025-10-08 18:47

**Fichiers modifiés:**
- `.github/TEST_WORKFLOW.md` (créé)
- `CHECK_WORKFLOW.bat` (créé)

### 2. Workflow Configuré
**Fichier:** `.github/workflows/publish-auto.yml`

**Déclencheur:** ✅ Push sur master activé
```yaml
on:
  push:
    branches: [master]
```

**Actions Homey Officielles:**
1. ✅ `athombv/github-action-homey-app-validate@master`
2. ✅ `athombv/github-action-homey-app-version@master`
3. ✅ `athombv/github-action-homey-app-publish@master`

---

## 🔍 Comment Vérifier le Workflow

### Méthode 1: GitHub UI (Navigateur)
```
✅ Ouvert automatiquement dans votre navigateur
```

1. Aller sur: https://github.com/dlnraja/com.tuya.zigbee/actions
2. Chercher workflow: **"Publish to Homey App Store"**
3. Cliquer pour voir les détails

**Statuts possibles:**
- 🟡 **Jaune (En cours)** - Workflow en exécution
- 🟢 **Vert (Success)** - Workflow réussi
- 🔴 **Rouge (Failed)** - Workflow échoué

### Méthode 2: Script Windows
```batch
CHECK_WORKFLOW.bat
```

**Prérequis:** GitHub CLI (`gh`)  
**Installation:** `winget install --id GitHub.cli`

**Fonctionnalités:**
- Liste les 10 derniers workflows
- Affiche les détails d'un run
- Affiche les logs complets

### Méthode 3: Git Local
```bash
# Vérifier les commits pushés
git log --oneline -5

# Vérifier les tags
git tag -l

# Pull les changements du bot
git pull
```

---

## 🎯 Workflow Attendu

### Étape 1: Validation SDK3 (2-3 min)
```
✅ Validate Homey App
   - Vérifie app.json
   - Contrôle les drivers
   - Valide les images (75x75, 500x500, 1000x1000)
```

**Si échec:** Erreur de validation SDK3
- Vérifier localement: `homey app validate`
- Corriger les erreurs
- Re-push

### Étape 2: Génération Changelog (< 1 min)
```
📝 Generate Changelog from Commits
   - Récupère commits depuis dernier tag
   - Formate pour Homey API (max 500 chars)
   - Affiche dans Step Summary
```

**Changelog généré:**
```
- test: workflow GitHub Actions publication
- feat: script monitoring workflow GitHub Actions
- docs: guide complet de publication avec GitHub Actions
- feat: workflows et scripts alignés avec Actions Homey officielles
```

### Étape 3: Détection Version (< 1 min)
```
🔢 Determine Version Bump
   - Analyse message commit
   - test: → patch (1.0.X)
```

**Règles détection:**
- `BREAKING`/`major:` → **major** (X.0.0)
- `feat`/`feature`/`minor:` → **minor** (1.X.0)  
- Autres → **patch** (1.0.X)

### Étape 4: Update Version (< 1 min)
```
🆙 Update Homey App Version
   - Action: athombv/github-action-homey-app-version@master
   - Modifie app.json + .homeychangelog.json
   - Output: nouvelle version (ex: 1.8.3)
```

### Étape 5: Commit + Tag (< 1 min)
```
💾 Commit Version Update
   - git add -A
   - git commit -m "chore: bump version to vX.X.X [skip ci]"
   - git tag "vX.X.X"
   - git push origin HEAD --tags
```

**Note:** `[skip ci]` évite une boucle infinie

### Étape 6: Publication Homey (2-5 min)
```
🚀 Publish to Homey App Store
   - Action: athombv/github-action-homey-app-publish@master
   - Utilise: secrets.HOMEY_PAT
   - Upload vers Homey Developer Tools
   - Output: URL Dashboard
```

**⚠️ CRITIQUE:** Nécessite `HOMEY_PAT` secret configuré!

**Si échec:**
- `HOMEY_PAT` manquant ou invalide
- Version déjà publiée
- Validation non passée

### Étape 7: GitHub Release (< 1 min)
```
📦 Create GitHub Release
   - Crée release "vX.X.X"
   - Notes: Changelog
   - Generate-notes: Oui
```

### Étape 8: Rapport Success (< 1 min)
```
🎉 Publication Success
   - Affiche résumé dans Step Summary
   - Liens: Homey Dashboard + GitHub Release
```

---

## ⚠️ Problèmes Potentiels

### ❌ Workflow ne démarre pas

**Causes:**
- Workflow YAML invalide
- GitHub Actions désactivées
- Problème synchronisation GitHub

**Solutions:**
1. Vérifier syntax YAML:
   ```bash
   # Utiliser un validateur YAML en ligne
   # https://www.yamllint.com/
   ```

2. Vérifier GitHub Actions:
   - Repository → Settings → Actions
   - "Allow all actions and reusable workflows"

3. Attendre 1-2 minutes (délai GitHub)

### ❌ Validation échoue

**Erreur typique:**
```
Error: Images must be 75x75px for drivers
```

**Solution:**
```bash
# Régénérer images
node scripts/FIX_ALL_IMAGES.js

# Valider localement
homey app validate --level publish

# Push corrections
git add -A
git commit -m "fix: correct image dimensions"
git push
```

### ❌ Publication échoue

**Erreur:** `HOMEY_PAT` not configured

**Solution:**
1. Obtenir token: https://tools.developer.homey.app/me
2. GitHub → Settings → Secrets → Actions
3. New secret: `HOMEY_PAT` = [token]
4. Re-run workflow

**Erreur:** Version already published

**Solution:**
- Version déjà sur Homey App Store
- Incrémenter manuellement dans app.json
- Push et retry

### ❌ Commit échoue

**Erreur:** Git push failed

**Causes:**
- Branch protégée
- Permissions insuffisantes

**Solution:**
1. Repository → Settings → Branches
2. Branch protection rules
3. Allow force pushes (pour bots)
4. Ou ajuster permissions dans workflow YAML

---

## 📊 Monitoring en Temps Réel

### Dashboard GitHub Actions
```
https://github.com/dlnraja/com.tuya.zigbee/actions
```

**Refresh:** Automatique toutes les 10 secondes

**Filtres disponibles:**
- Workflow: "Publish to Homey App Store"
- Status: All / Success / Failure / In Progress
- Branch: master
- Actor: github-actions[bot]

### Homey Dashboard
```
https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee
```

**Vérifier après publication:**
- Nouvelle version visible
- Status: "In Review" ou "Published"
- Changelog affiché
- Stats mise à jour

### Email Notifications

GitHub envoie emails pour:
- ✅ Workflow success
- ❌ Workflow failure
- 🔔 Première publication réussie

**Configurer:** GitHub → Settings → Notifications

---

## 🔧 Re-déclencher Manuellement

### Si le workflow échoue:

**Option 1: Re-run depuis GitHub UI**
1. Aller sur le workflow échoué
2. Click "Re-run all jobs"
3. Ou "Re-run failed jobs"

**Option 2: workflow_dispatch**
1. GitHub → Actions
2. "Publish to Homey App Store"
3. "Run workflow"
4. Choisir: Branch (master) + Version (patch/minor/major)
5. "Run workflow"

**Option 3: Nouveau commit**
```bash
# Commit vide pour re-déclencher
git commit --allow-empty -m "chore: trigger workflow"
git push
```

---

## ✅ Checklist Succès

Après 10-15 minutes, vérifier:

### Sur GitHub:
- [ ] Workflow "Publish to Homey App Store" = 🟢 Success
- [ ] Nouveau commit du bot: "chore: bump version to vX.X.X [skip ci]"
- [ ] Nouveau tag: vX.X.X
- [ ] GitHub Release créée
- [ ] Step Summary complet

### Sur Homey:
- [ ] Nouvelle version visible sur Dashboard
- [ ] Status: "In Review" (puis "Published" après validation Athom)
- [ ] Changelog affiché
- [ ] Build ID généré

### Localement:
```bash
# Pull changements
git pull

# Vérifier tag
git tag -l

# Vérifier version dans app.json
cat app.json | grep version
```

---

## 📱 Contacts & Support

**En cas de problème persistant:**

1. **GitHub Actions Logs**
   - Télécharger logs complets
   - Analyser erreurs spécifiques

2. **Homey Developer Tools**
   - Support: https://support.homey.app/
   - Forum: https://community.homey.app/

3. **Actions Homey**
   - Issues: https://github.com/athombv/github-action-homey-app-publish/issues

---

## 🎓 Prochains Tests

Une fois le premier workflow réussi:

1. **Test publication manuelle:**
   ```
   GitHub → Actions → Manual Publish → Run workflow
   ```

2. **Test version minor:**
   ```bash
   git commit -m "feat: nouvelle fonctionnalité test"
   git push
   ```

3. **Test version major:**
   ```bash
   git commit -m "BREAKING: changement majeur test"
   git push
   ```

4. **Test rollback:**
   - Publier version N+1
   - Rollback vers version N si problème

---

**📊 Status Actuel:** Workflow déclenché, monitoring en cours...

**🔗 Liens Rapides:**
- [GitHub Actions](https://github.com/dlnraja/com.tuya.zigbee/actions)
- [Homey Dashboard](https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee)
- [Documentation Workflows](.github/workflows/WORKFLOWS.md)
- [Guide Publication](PUBLICATION_GUIDE.md)

---

**Dernière mise à jour:** 2025-10-08 18:47  
**Commit test:** 1cf5f70c2
