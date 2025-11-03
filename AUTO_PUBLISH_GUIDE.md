# 🚀 AUTO-PUBLISH GUIDE - GitHub Actions

**Date:** 2025-11-03  
**Status:** ✅ SYSTÈME AUTO-PUBLISH CRÉÉ

---

## 📋 CONFIGURATION REQUISE

### 1. Secret HOMEY_TOKEN (IMPORTANT!)

Le workflow nécessite un token Homey pour publier automatiquement.

#### Obtenir le Token Homey

**Option A: Via Homey CLI**
```bash
homey login
# Suivre les instructions
# Le token est stocké dans ~/.homey/token
```

**Option B: Via Homey Developer**
1. Aller sur https://developer.athom.com
2. Login avec votre compte
3. Aller dans Settings → API Tokens
4. Créer un nouveau token avec permissions "Publish Apps"

#### Configurer le Secret GitHub

1. **Aller sur GitHub:**
   https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions

2. **Cliquer "New repository secret"**

3. **Nom:** `HOMEY_TOKEN`

4. **Value:** Coller votre token Homey
   - Format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

5. **Cliquer "Add secret"**

✅ **Configuration terminée!**

---

## 🚀 MÉTHODE 1: Script PowerShell (Recommandé)

### Exécution Simple

```powershell
cd "C:\Users\HP\Desktop\homey app\tuya_repair"
.\scripts\auto_push_publish.ps1
```

### Étapes Automatiques

Le script va:
1. ✅ Valider l'app (`homey app validate`)
2. ✅ Afficher les fichiers modifiés
3. ✅ Extraire la version de app.json
4. ✅ Stage tous les fichiers (`git add .`)
5. ✅ Commit avec message détaillé
6. ✅ Demander confirmation pour push
7. ✅ Push vers GitHub (`git push origin master`)
8. ✅ Ouvrir browser vers GitHub Actions

### Sortie Attendue

```
🚀 AUTO PUSH & PUBLISH TO HOMEY APP STORE
═══════════════════════════════════════════════════

✅ Step 1: Validating app...
✅ Validation passed!

📊 Step 2: Checking git status...
Modified files:
M  lib/BseedDetector.js
M  app.json
A  lib/ClusterDPDatabase.js

📌 Step 3: Reading version...
Version: 4.10.0

📦 Step 4: Staging all changes...
✅ All files staged

💾 Step 5: Committing...
✅ Commit successful!

🚀 Step 6: Pushing to GitHub...
Push to GitHub and auto-publish? (y/n): y

═══════════════════════════════════════════════════
✅ PUSH SUCCESSFUL!
═══════════════════════════════════════════════════

🎉 GitHub Actions will now:
   1. Build the app
   2. Validate at publish level
   3. Publish to Homey App Store
   4. Create GitHub Release

📊 Monitor progress at:
   https://github.com/dlnraja/com.tuya.zigbee/actions
```

---

## 🚀 MÉTHODE 2: Commandes Git Manuelles

### Étape par Étape

```bash
cd "C:\Users\HP\Desktop\homey app\tuya_repair"

# 1. Valider
npx homey app validate --level publish

# 2. Stage
git add .

# 3. Commit
git commit -m "feat: Auto-publish v4.10.0"

# 4. Push (déclenche auto-publication)
git push origin master
```

---

## 🚀 MÉTHODE 3: Manual Trigger (Workflow Dispatch)

### Via GitHub Web Interface

1. **Aller sur Actions:**
   https://github.com/dlnraja/com.tuya.zigbee/actions

2. **Sélectionner "Auto Publish to Homey App Store"**

3. **Cliquer "Run workflow"**

4. **Choisir branch:** `master`

5. **Option:** Force publish (optionnel)

6. **Cliquer "Run workflow"**

✅ **Publication déclenchée manuellement!**

---

## 📊 WORKFLOW GITHUB ACTIONS

### Déclencheurs

Le workflow se déclenche sur:
- ✅ Push vers `master` ou `main`
- ✅ Manual trigger (workflow_dispatch)

**Ignoré pour:**
- ❌ Fichiers `**.md`
- ❌ Dossier `docs/**`
- ❌ Dossier `.github/**`

### Étapes du Workflow

```yaml
1. Checkout Repository
   ↓
2. Setup Node.js 18
   ↓
3. Install Dependencies (npm ci + homey CLI)
   ↓
4. Build App (homey app build)
   ↓
5. Validate App (homey app validate --level publish)
   ↓
6. Extract Version (from app.json)
   ↓
7. Publish to Homey App Store (homey app publish)
   ↓
8. Create GitHub Release (tag + release notes)
   ↓
9. Notify Success/Failure
```

### Durée Estimée

- **Build & Validate:** ~2-3 minutes
- **Publish:** ~3-5 minutes
- **GitHub Release:** ~30 seconds
- **TOTAL:** ~5-10 minutes

---

## 📊 MONITORING

### GitHub Actions

**URL:** https://github.com/dlnraja/com.tuya.zigbee/actions

**Statuses:**
- 🟡 **In Progress:** Workflow en cours
- ✅ **Success:** Publication réussie
- ❌ **Failed:** Échec (voir logs)

### Logs

Cliquer sur le workflow pour voir:
- Validation output
- Publication status
- Release creation
- Erreurs éventuelles

### Homey Developer

**URL:** https://developer.athom.com/apps

Vérifier:
- ✅ App published
- ✅ Version correcte
- ✅ Changelog présent
- ✅ Status "Live"

---

## 🎯 CHANGELOG AUTOMATIQUE

Le workflow génère automatiquement un changelog:

```
Auto-published v4.10.0 via GitHub Actions

✅ Phase 2 - Intelligent System
✅ README Sync  
✅ Tuya Enrichment (145 drivers)
✅ Loïc Data (27 switches + BSEED)
✅ Ultra Cluster & DP System

🎯 186 drivers total
📡 50+ Zigbee clusters
📊 100+ Tuya DataPoints
🔋 Auto time/battery sync
🔌 Protocol routing intelligent
```

---

## 📦 GITHUB RELEASE AUTOMATIQUE

### Contenu Release

- **Tag:** `v4.10.0`
- **Title:** Release v4.10.0
- **Body:** Description détaillée
  - Features
  - Statistics
  - Installation
  - Documentation links

### URL Release

Automatiquement créé à:
`https://github.com/dlnraja/com.tuya.zigbee/releases/tag/v4.10.0`

---

## ⚠️ TROUBLESHOOTING

### Erreur: "HOMEY_TOKEN not found"

**Solution:**
1. Vérifier secret GitHub configuré
2. Nom exact: `HOMEY_TOKEN` (case-sensitive)
3. Token valide et non expiré

### Erreur: "Validation failed"

**Solution:**
```bash
# Valider localement
npx homey app validate --level publish

# Corriger erreurs
# Re-commit & push
```

### Erreur: "Publication failed"

**Solution:**
1. Vérifier token permissions
2. Vérifier version app.json unique
3. Vérifier app.json syntaxe
4. Voir logs détaillés dans Actions

### Workflow ne se déclenche pas

**Vérifications:**
1. Push vers `master` ou `main`?
2. Pas que des fichiers .md?
3. Workflow file correct?
4. GitHub Actions activé?

---

## 🔒 SÉCURITÉ

### Token Protection

✅ **DO:**
- Store dans GitHub Secrets
- Ne jamais commit dans code
- Limiter permissions (publish only)

❌ **DON'T:**
- Partager le token
- Logger le token
- Commit dans .env

### Best Practices

- ✅ Rotate tokens périodiquement
- ✅ Utiliser tokens spécifiques (pas personal)
- ✅ Monitor activity logs
- ✅ Révoquer si compromis

---

## 📚 DOCUMENTATION WORKFLOW

### Fichiers Créés

1. `.github/workflows/auto-publish-homey.yml` - Workflow GitHub Actions
2. `scripts/auto_push_publish.ps1` - Script PowerShell automatique
3. `AUTO_PUBLISH_GUIDE.md` - Ce guide

### Références

- **GitHub Actions:** https://docs.github.com/actions
- **Homey CLI:** https://apps.developer.homey.app/the-basics/getting-started
- **Homey Developer:** https://developer.athom.com

---

## ✅ CHECKLIST AVANT PUBLICATION

Avant d'exécuter le script:

- [ ] app.json version incrémentée
- [ ] homey app validate passe
- [ ] Tous fichiers committed localement
- [ ] HOMEY_TOKEN configuré dans GitHub
- [ ] Branch master ou main
- [ ] Documentation à jour

---

## 🎉 RÉSULTAT ATTENDU

### Après Push Réussi

1. ✅ Code sur GitHub
2. ✅ Workflow déclenché automatiquement
3. ✅ Build & validation réussis
4. ✅ Publication Homey App Store
5. ✅ GitHub Release créé
6. ✅ App disponible pour users

### Timeline

- **T+0:** Push vers GitHub
- **T+1min:** Workflow démarre
- **T+3min:** Build & validate
- **T+8min:** Publication complete
- **T+10min:** App live sur store

---

## 🚀 QUICK START

**1 seule commande:**

```powershell
.\scripts\auto_push_publish.ps1
```

**Confirmer push → DONE!** ✅

---

*System: Auto-publish via GitHub Actions*  
*Status: ✅ Ready*  
*Workflow: .github/workflows/auto-publish-homey.yml*  
*Script: scripts/auto_push_publish.ps1*  
*Guide: AUTO_PUBLISH_GUIDE.md*
