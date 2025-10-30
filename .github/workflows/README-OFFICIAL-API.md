# 🚀 Publication Officielle via API Athom (Sans CLI)

## ✅ Workflow Actif

**Fichier:** `homey-official-publish-api.yml`

Ce workflow utilise **100% les actions GitHub officielles d'Athom** sans Homey CLI:

### 🔧 Actions Officielles Utilisées

1. **`athombv/github-action-homey-app-validate@master`**
   - Validation de l'app niveau `publish`
   - Vérifie tous les critères du App Store

2. **`athombv/github-action-homey-app-version@master`**
   - Incrémentation automatique de version (patch)
   - Mise à jour de `.homeychangelog.json`
   - Création de tags Git

3. **`athombv/github-action-homey-app-publish@master`**
   - Publication directe via API Athom
   - **PAS DE HOMEY CLI REQUIS!**
   - Authentification via Personal Access Token

---

## 📋 Configuration Requise

### 1. Secret GitHub: `HOMEY_PAT`

Créez un Personal Access Token sur Homey Developer Tools:

```
1. Allez sur: https://tools.developer.homey.app/
2. Cliquez sur votre profil → Settings
3. Personal Access Tokens → Create New Token
4. Nom: "GitHub Actions Publish"
5. Permissions: "Publish apps"
6. Copiez le token (vous ne le reverrez plus!)
```

### 2. Ajoutez le Secret dans GitHub

```
1. GitHub Repo → Settings → Secrets and variables → Actions
2. New repository secret
3. Name: HOMEY_PAT
4. Value: [collez votre token]
5. Add secret
```

---

## 🚀 Déclenchement

Le workflow se déclenche automatiquement sur:

```yaml
on:
  push:
    branches:
      - master
    paths-ignore:
      - '**.md'        # Ignore les fichiers markdown
      - 'docs/**'      # Ignore la doc
      - 'scripts/**'   # Ignore les scripts
      - 'fix-*.js'     # Ignore les scripts de fix
```

**OU** manuellement:
```
GitHub → Actions → Homey App - Official API Publish → Run workflow
```

---

## 📊 Étapes du Workflow

### Job 1: Validate ✅
```
✓ Checkout code
✓ Setup Node.js 18
✓ Install dependencies
✓ Validate (publish level)
```

### Job 2: Version 🔢
```
✓ Checkout code
✓ Auto-increment version (patch)
✓ Update .homeychangelog.json
✓ Commit & tag
✓ Push to master
```

### Job 3: Publish 🚀
```
✓ Checkout latest code
✓ Setup Node.js
✓ Install dependencies
✓ Publish via API Athom (NO CLI!)
```

### Job 4: Update Docs 📝
```
✓ Update README badges
✓ Commit doc updates
```

---

## ✅ Avantages vs Homey CLI

| Feature | CLI | API Officielle |
|---------|-----|----------------|
| Installation | `npm install -g homey` | ❌ Pas nécessaire |
| Authentification | Interactive | ✅ Token automatique |
| CI/CD | Complexe | ✅ Simple |
| Maintenance | Dépendances | ✅ Aucune |
| Performance | Lent | ✅ Rapide |
| Fiabilité | Variable | ✅ Stable |

---

## 🔍 Monitoring

Vérifiez vos publications:

1. **GitHub Actions**: https://github.com/dlnraja/com.tuya.zigbee/actions
2. **Homey Dashboard**: https://tools.developer.homey.app/apps
3. **App Store**: https://homey.app/en-us/app/com.dlnraja.tuya.zigbee/

---

## 🐛 Troubleshooting

### Erreur: "Invalid token"
```
Solution:
1. Regénérer token sur Homey Developer Tools
2. Mettre à jour secret HOMEY_PAT dans GitHub
3. Re-run workflow
```

### Erreur: "Version already exists"
```
Solution: Le workflow incrémente automatiquement.
Si erreur persiste, vérifiez app.json manuellement.
```

### Workflow ne se déclenche pas
```
Vérifications:
1. Push sur branch master? ✓
2. Fichier modifié n'est pas ignoré? ✓
3. Workflow activé (.yml, pas .yml.disabled)? ✓
```

---

## 📚 Documentation Officielle

- **Actions GitHub Athom**: https://github.com/athombv/github-actions
- **Homey Developer Tools**: https://tools.developer.homey.app/
- **SDK Documentation**: https://apps-sdk-v3.developer.homey.app/

---

## 🎯 Workflow Actuel

**Actif:**
- ✅ `homey-official-publish-api.yml` (API Athom pure)

**Désactivés:**
- ❌ `homey-official-publish.yml.disabled` (utilisait CLI)
- ❌ `auto-publish.yml` (ancien système)
- ❌ Tous les autres *.yml.disabled

---

## ✨ Résumé

```
✅ 100% Actions GitHub officielles Athom
✅ Aucune dépendance Homey CLI
✅ Publication automatique sur push
✅ Incrémentation version automatique
✅ Changelog automatique
✅ Tags Git automatiques
✅ Documentation auto-update

🚀 Push to master = Publication automatique!
```
