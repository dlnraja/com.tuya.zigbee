# 🚀 PUBLICATION VIA GITHUB ACTIONS

## ✅ Méthode Recommandée - Workflow Officiel

### 📋 Workflow Actif

**Fichier**: `.github/workflows/homey-official-publish.yml`

**Déclencheurs**:
1. ✅ **Push sur master** (automatique)
2. ✅ **Manuel** via GitHub Actions interface

---

## 🎯 PUBLICATION MANUELLE (RECOMMANDÉ)

### Étape 1: Aller sur GitHub Actions

1. Ouvrir https://github.com/dlnraja/com.tuya.zigbee/actions
2. Cliquer sur **"Homey App - Official Publish"** dans la liste à gauche
3. Cliquer sur **"Run workflow"** (bouton bleu en haut à droite)
4. Sélectionner branch `master`
5. Cliquer **"Run workflow"**

### Étape 2: Le Workflow Fait Tout Automatiquement

```
✅ 1. Validation (debug level)
✅ 2. Auto-increment version (patch: 4.9.81 → 4.9.82)
✅ 3. Commit nouvelle version [skip ci]
✅ 4. Création GitHub Release
✅ 5. Publication Homey App Store
```

**Durée**: ~3-5 minutes

---

## 🔑 Configuration Requise

### Secret GitHub: `HOMEY_PAT`

Le workflow utilise un **Personal Access Token** Homey.

#### Vérifier le Secret

1. Aller sur https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions
2. Vérifier que **`HOMEY_PAT`** existe

#### Créer le Token (si manquant)

1. Aller sur https://tools.developer.homey.app/tools/cli
2. Cliquer **"Generate Personal Access Token"**
3. Copier le token (commence par `homey_pat_...`)
4. Sur GitHub:
   - Settings → Secrets and variables → Actions
   - New repository secret
   - Name: `HOMEY_PAT`
   - Secret: coller le token
   - Add secret

---

## 📊 Que Fait le Workflow?

### Job 1: Validate ✅
```yaml
- Checkout code
- Install Node.js 18
- npm ci
- Validate app (debug level)
```

### Job 2: Version 📦
```yaml
- Auto-increment version (patch)
- Update .homeychangelog.json
- Commit & push [skip ci]
- Create GitHub Release avec tag
```

### Job 3: Publish 🚀
```yaml
- Checkout latest (avec nouvelle version)
- Install Homey CLI
- homey app publish (avec HOMEY_PAT)
- Success/Failure notification
```

---

## 🎯 Avantages GitHub Actions

✅ **Automatique** - Un clic suffit
✅ **Version auto-incrémentée** - Pas de prompt
✅ **Release GitHub** - Tag + notes créés automatiquement
✅ **Changelog** - Mis à jour automatiquement
✅ **Logs complets** - Tout est tracé
✅ **Retry logic** - Push avec retry si échec
✅ **Pas de problème local** - Pas de conflits git locaux

---

## ⚠️ Notes Importantes

### Skip CI

Le commit de version contient `[skip ci]` pour éviter:
- ❌ Boucle infinie (workflow qui déclenche workflow)
- ✅ Seul le commit initial déclenche publish

### Paths Ignored

Le workflow **ignore** les changements dans:
- `**.md`
- `docs/**`
- `reports/**`
- `scripts/**`
- `project-data/**`

**Pourquoi?** Documentation/scripts ne nécessitent pas de nouvelle publication.

---

## 🔄 Workflow de Publication Complet

```bash
# Développement local
git add .
git commit -m "feat: nouvelle fonctionnalité"
git push origin master

# GitHub Actions se déclenche automatiquement:
1. ✅ Valide app
2. ✅ Incrémente version: 4.9.81 → 4.9.82
3. ✅ Commit version [skip ci]
4. ✅ Push + tag
5. ✅ Crée GitHub Release
6. ✅ Publie sur Homey Store
7. 🎉 DONE!
```

---

## 🆘 Dépannage

### ❌ "HOMEY_PAT not found"

**Solution**: Ajouter le secret GitHub (voir ci-dessus)

### ❌ "Push rejected"

Le workflow a un **retry logic**:
- 3 tentatives avec delay 5s
- Fetch + reset entre chaque tentative
- Force push avec `--force` si nécessaire

### ❌ "Validation failed"

Vérifier localement avant push:
```bash
npm run validate
homey app validate --level publish
```

### ❌ "Publish failed"

Vérifier:
1. Token HOMEY_PAT valide?
2. Account Homey Developer actif?
3. App ID correct dans app.json?

---

## 📍 URLs Utiles

- **GitHub Actions**: https://github.com/dlnraja/com.tuya.zigbee/actions
- **Homey Developer**: https://tools.developer.homey.app/apps
- **Homey CLI Docs**: https://apps.developer.homey.app/the-homey-app/publishing
- **Create PAT**: https://tools.developer.homey.app/tools/cli

---

## 🎯 Commandes Rapides

```bash
# Trigger publication manuelle (via interface)
# Aller sur: https://github.com/dlnraja/com.tuya.zigbee/actions
# → "Homey App - Official Publish" → "Run workflow"

# Voir status publication
gh run list --workflow="homey-official-publish.yml" --limit 5

# Voir logs dernière publication
gh run view --log
```

---

## ✅ RÉSUMÉ

**Publication GitHub Actions = RECOMMANDÉ**

1. 🎯 **Un clic** sur interface GitHub
2. ⏱️ **3-5 minutes** automatique
3. 📦 **Version auto-incrémentée**
4. 🏷️ **Release GitHub créé**
5. 🚀 **Publié sur Homey Store**
6. 📊 **Logs complets**
7. ✅ **Aucun conflit git local**

**C'est LA méthode professionnelle!** 🎉
