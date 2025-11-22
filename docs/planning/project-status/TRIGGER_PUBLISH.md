# 🚀 Trigger Homey Publish

## Problème Identifié

Le workflow `homey-official-publish.yml` ne s'est **pas déclenché** car:

### 1. **paths-ignore Configuration**
```yaml
paths-ignore:
  - '**.md'
  - 'docs/**'
  - 'reports/**'
  - 'scripts/**'
  - 'project-data/**'
```

**Problème**: Nos derniers commits (v2.15.83, v2.15.84) ont principalement modifié:
- `reports/` - Reports générés
- `scripts/` - Scripts automation
- `*.md` - Documentation

**Résultat**: GitHub Actions a ignoré ces commits!

---

### 2. **Vérifier HOMEY_TOKEN Secret**

Le workflow nécessite:
```yaml
personal_access_token: ${{ secrets.HOMEY_TOKEN }}
```

**Action Required**: Vérifier que `HOMEY_TOKEN` est configuré dans:
- GitHub Repo → Settings → Secrets and variables → Actions → Repository secrets
- Nom: `HOMEY_TOKEN`
- Value: Votre Homey Personal Access Token

---

## ✅ Solutions

### Option 1: Trigger Manuel (RECOMMANDÉ)

**Via GitHub Interface**:
1. Aller sur: https://github.com/dlnraja/com.tuya.zigbee/actions
2. Cliquer sur "Homey App - Official Publish" workflow
3. Cliquer sur "Run workflow" dropdown
4. Select branch: `master`
5. Cliquer "Run workflow" button vert

**Le workflow se lancera immédiatement!**

---

### Option 2: Commit Trigger app.json

Modifier `app.json` pour forcer le trigger:

```bash
# Option A: Bump version patch
npm version patch --no-git-tag-version

# Option B: Petit changement app.json (ajouter commentaire)
```

Puis commit + push → Workflow se déclenchera

---

### Option 3: Créer Workflow Trigger File

Créer un fichier `.trigger-publish` vide:
```bash
echo "trigger" > .trigger-publish
git add .trigger-publish
git commit -m "Trigger Homey publish workflow"
git push origin master
```

---

## 🔧 Fix Permanent Recommandé

### Modifier le workflow pour ne PAS ignorer app.json changes

**Edit `.github/workflows/homey-official-publish.yml`**:

```yaml
on:
  push:
    branches:
      - master
    paths:
      # ONLY trigger on important files
      - 'app.json'
      - '.homeychangelog.json'
      - 'drivers/**'
      - 'lib/**'
      - 'locales/**'
      - 'assets/**'
      - 'package.json'
  workflow_dispatch:
```

**Avantage**: Workflow se déclenche SEULEMENT quand app.json change = moins de runs inutiles

---

## 📊 Vérification Workflow Status

### Check si HOMEY_TOKEN configuré:
```bash
# Via GitHub CLI (si installé)
gh secret list

# Via Web Interface
https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions
```

### Check derniers workflow runs:
```bash
# Via GitHub CLI
gh run list --workflow="homey-official-publish.yml"

# Via Web
https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/homey-official-publish.yml
```

---

## 🎯 Action Immédiate Recommandée

**Pour publier v2.15.84 MAINTENANT**:

1. **Trigger Manuel** (plus rapide):
   - Go to Actions → Homey App - Official Publish
   - Run workflow manually
   - Wait ~2-3 minutes
   - Check Homey Developer Dashboard

2. **OU Bump Version** (si token pas configuré):
   ```bash
   # Bump to v2.15.85
   # Modify app.json version
   # Commit + push
   ```

---

## 📝 Notes Importantes

### Workflow Steps
1. ✅ **Validate**: Homey app validation (publish level)
2. ✅ **Version**: Auto-bump version patch
3. ✅ **Publish**: Push to Homey App Store

### Auto-Version Behavior
Le workflow **auto-bump** la version en `patch`:
- Current: 2.15.84
- After workflow: 2.15.85 (automatiquement)

**Si vous voulez garder 2.15.84**: Utilisez trigger manuel ET commentez la step `version` du workflow

---

## ✅ Vérification Post-Publish

Après trigger:
1. Check workflow logs: https://github.com/dlnraja/com.tuya.zigbee/actions
2. Check Homey Dashboard: https://tools.developer.homey.app/apps
3. Verify version published
4. Test download from App Store

---

**RECOMMENDATION**: 
🚀 **TRIGGER MANUEL** = Solution la plus rapide et sûre!
