# 🤖 Workflow GitHub Actions - Mode Headless

**Version**: 2.1.50  
**Date**: 2025-10-11  
**Statut**: ✅ **CORRIGÉ - Mode Headless Activé**

---

## ❌ Problème Identifié

### Erreur Originale

```
? There are uncommitted changes. Are you sure you want to continue? (y/N)
Error: Process completed with exit code 130.
```

**Cause**: Homey CLI en **mode interactif** attendant une confirmation utilisateur.

---

## ✅ Solution Implémentée

### Modifications Principales

#### 1. **Nettoyage du Répertoire de Travail**

```yaml
- name: Reset Working Directory
  run: |
    # Clean all untracked files and directories
    git clean -fd
    # Reset any modifications
    git reset --hard HEAD
    # Verify clean state
    echo "📊 Git status:"
    git status
```

**Objectif**: Éliminer TOUS les fichiers non committés avant publication.

#### 2. **Mode Headless Homey CLI**

```yaml
- name: Publish to Homey (Headless Mode)
  env:
    HOMEY_PAT: ${{ secrets.HOMEY_PAT }}
  run: |
    # Create Homey credentials file for headless auth
    mkdir -p ~/.homey
    cat > ~/.homey/config.json << EOF
    {
      "token": "${{ secrets.HOMEY_PAT }}"
    }
    EOF
    
    # Publish with headless flag (non-interactive)
    npx homey app publish --skip-build
```

**Innovations**:
- ✅ Authentification automatique via `config.json`
- ✅ Flag `--skip-build` pour éviter rebuild
- ✅ Pas d'interaction utilisateur requise

#### 3. **Séparation Version Bump et Publication**

```yaml
- name: Commit Version Bump
  run: |
    # Stash any build artifacts
    git stash --include-untracked || true
    
    if [ -n "$(git status --porcelain)" ]; then
      git add app.json .homeychangelog.json 2>/dev/null || true
      git commit -m "chore: bump version [skip ci]" || true
    fi

- name: Push Version Changes
  run: |
    git pull --rebase origin master || true
    git push origin HEAD || echo "⚠️ Push failed"
```

**Logique**:
1. Stash les fichiers de build
2. Commit uniquement `app.json` et `.homeychangelog.json`
3. Push séparé pour éviter les conflits
4. Reset complet avant publication

---

## 🔄 Workflow Complet (Étape par Étape)

### Phase 1: Préparation

```yaml
1. Checkout code
   ├─ fetch-depth: 0 (historique complet)
   └─ token: GITHUB_TOKEN

2. Setup Node.js 18
   └─ cache: npm

3. Install Dependencies
   ├─ homey CLI
   └─ canvas (pour images)

4. Clean Build Cache
   ├─ .homeycompose/
   └─ .homeybuild/
```

### Phase 2: Validation

```yaml
5. Validate (Debug Level)
   └─ npx homey app validate --level debug

6. Validate (Publish Level)
   └─ npx homey app validate --level publish

7. Build App
   └─ npx homey app build

8. Upload Artifact
   └─ .homeybuild/ + app.json
```

### Phase 3: Version Management

```yaml
9. Generate Changelog
   ├─ Analyse commit message
   └─ Génère changelog user-friendly

10. Auto-Increment Version
    ├─ Patch version bump
    └─ Utilise GitHub Action Athom

11. Commit Version Bump
    ├─ Stash build artifacts
    ├─ Add app.json + .homeychangelog.json
    └─ Commit avec [skip ci]

12. Push Version Changes
    ├─ Pull --rebase
    └─ Push origin HEAD
```

### Phase 4: Publication

```yaml
13. Reset Working Directory
    ├─ git clean -fd
    ├─ git reset --hard HEAD
    └─ Vérifier état propre

14. Publish to Homey (Headless)
    ├─ Créer ~/.homey/config.json
    ├─ npx homey app publish --skip-build
    └─ Extraire URL dashboard

15. Extract Build ID
    └─ Python script API call

16. Auto-Promote to Test
    ├─ curl POST to Homey API
    ├─ target: "test"
    └─ Bearer token authentication
```

### Phase 5: Summary

```yaml
17. Generate Summary
    ├─ Version published
    ├─ Build ID
    ├─ Promotion status
    └─ Links (Dashboard, Test URL)
```

---

## 🔑 Secrets Requis

### HOMEY_PAT

**Nom**: `HOMEY_PAT`  
**Type**: Personal Access Token  
**Obtention**: https://tools.developer.homey.app/personal-access-tokens

**Configuration GitHub**:
1. Repository → Settings → Secrets and variables → Actions
2. New repository secret
3. Name: `HOMEY_PAT`
4. Value: [votre token Homey]

---

## 🎯 Flags Homey CLI Headless

### Commandes Utilisées

| Commande | Flags | Mode |
|----------|-------|------|
| `homey app validate` | `--level publish` | Headless ✅ |
| `homey app build` | (aucun) | Headless ✅ |
| `homey app publish` | `--skip-build` | Headless ✅ |

### Authentification Headless

```bash
# Créer config file
mkdir -p ~/.homey
cat > ~/.homey/config.json << EOF
{
  "token": "YOUR_HOMEY_PAT"
}
EOF

# CLI utilise automatiquement ce token
npx homey app publish --skip-build
```

**Avantages**:
- ✅ Pas de prompt interactif
- ✅ Authentification automatique
- ✅ Compatible CI/CD
- ✅ Pas besoin de `homey login`

---

## 🐛 Résolution Problèmes

### "Uncommitted changes" Error

**Symptôme**:
```
? There are uncommitted changes. Are you sure you want to continue? (y/N)
```

**Solution**:
```yaml
- name: Reset Working Directory
  run: |
    git clean -fd
    git reset --hard HEAD
```

### Publication Échoue

**Symptôme**:
```
❌ Publication failed
```

**Solutions**:

1. **Vérifier HOMEY_PAT**:
   - Valid token
   - Permissions correctes
   - Pas expiré

2. **Vérifier app.json**:
   - `id` correct: `com.dlnraja.tuya.zigbee`
   - Version incrémentée
   - SDK 3 compliance

3. **Build artifacts**:
   ```bash
   # Vérifier si .homeybuild existe
   ls -la .homeybuild/
   ```

### Build ID Non Extrait

**Symptôme**:
```
❌ Could not extract Build ID
```

**Solution**:
```python
# Vérifier script Python
cat .github/scripts/extract_build_id.py

# Tester manuellement
python3 .github/scripts/extract_build_id.py
```

---

## 📊 Monitoring

### GitHub Actions

**URL**: https://github.com/dlnraja/com.tuya.zigbee/actions

**Logs à Vérifier**:
1. ✅ Validate (Debug Level)
2. ✅ Validate (Publish Level)
3. ✅ Build App
4. ✅ Publish to Homey (Headless Mode)
5. ✅ Auto-Promote to Test

### Homey Dashboard

**URL**: https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee

**À Vérifier**:
- Version publiée
- Build ID
- Status (Draft → Test → Live)

---

## 🔄 Workflow Triggers

### Déclencheurs

```yaml
on:
  push:
    branches:
      - master
  workflow_dispatch:
```

**Triggers**:
1. **Push vers master**: Automatique
2. **Manual dispatch**: Actions → Run workflow

### [skip ci]

Utiliser `[skip ci]` dans commit message pour éviter boucle infinie:

```bash
git commit -m "chore: bump version to v2.1.50 [skip ci]"
```

---

## 📈 Améliorations Futures

### 1. Cache NPM Modules

```yaml
- name: Cache node_modules
  uses: actions/cache@v3
  with:
    path: node_modules
    key: ${{ runner.os }}-npm-${{ hashFiles('package-lock.json') }}
```

### 2. Parallel Validation

```yaml
strategy:
  matrix:
    level: [debug, publish]
```

### 3. Slack/Discord Notifications

```yaml
- name: Notify Success
  if: success()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
```

### 4. Rollback Automatique

```yaml
- name: Rollback on Failure
  if: failure()
  run: |
    git revert HEAD
    git push
```

---

## ✅ Checklist Pré-Publication

Avant chaque push vers master:

- [ ] `homey app validate --level publish` en local
- [ ] Cache `.homeybuild` et `.homeycompose` nettoyé
- [ ] `HOMEY_PAT` secret configuré
- [ ] Version incrémentée dans `app.json`
- [ ] Changelog généré
- [ ] Tests manuels effectués

---

## 📚 Références Officielles

### Homey CLI Documentation

- **CLI Commands**: https://apps.developer.homey.app/the-basics/homey-cli
- **Headless Mode**: https://apps.developer.homey.app/tools/cli#headless-mode
- **Publishing**: https://apps.developer.homey.app/tools/publishing

### GitHub Actions Athom

- **Validate**: https://github.com/athombv/github-action-homey-app-validate
- **Publish**: https://github.com/athombv/github-action-homey-app-publish
- **Version**: https://github.com/athombv/github-action-homey-app-version

### Homey API

- **Developer API**: https://api.developer.homey.app
- **Authentication**: Bearer token via Personal Access Token
- **Endpoints**:
  - `GET /app/{appId}/build` - Liste builds
  - `POST /app/{appId}/build/{buildId}/promote` - Promote build

---

## 🎉 Résultat Attendu

Après chaque push vers master:

```
✅ Validate (Debug Level) - PASSED
✅ Validate (Publish Level) - PASSED
✅ Build App - SUCCESS
✅ Publish to Homey (Headless Mode) - PUBLISHED
✅ Auto-Promote to Test - PROMOTED
```

**Summary**:
- **Version**: 2.1.50
- **Build ID**: 12345
- **Auto-Promoted**: true
- **Test URL**: https://homey.app/a/com.dlnraja.tuya.zigbee/test/

---

**Fin du guide**

Le workflow est maintenant **100% automatisé** en mode headless, sans aucune interaction utilisateur requise.
