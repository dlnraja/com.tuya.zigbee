# ✅ PUBLICATION AUTOMATIQUE CONFIGURÉE!

## 🎉 **C'EST FAIT!**

Votre repository est maintenant configuré pour la **publication automatique** sur le Homey App Store via GitHub Actions!

**Commit:** 2038d03774  
**Date:** 2025-11-09 23:10  
**Status:** ✅ READY

---

## 📦 **CE QUI A ÉTÉ AJOUTÉ**

### **1. Workflow de Publication**
```
.github/workflows/publish.yml (120 lignes)
```

**Déclencheurs:**
- ✅ Push d'un tag (ex: `v4.9.328`)
- ✅ Déclenchement manuel via GitHub UI

**Actions:**
1. Validation de l'app (tests + lint)
2. Build de l'app
3. Publication sur Homey App Store
4. Création automatique GitHub Release

---

### **2. Documentation Complète**

```
.github/PUBLISH_SETUP.md (450 lignes) - Guide technique complet
PUBLISH_GUIDE.md (380 lignes)         - Guide rapide en français
GITHUB_ACTIONS_STATUS.md (250 lignes) - Status CI/CD
```

**Couvre:**
- Configuration du token Homey
- Instructions pas-à-pas
- Dépannage
- Exemples complets
- Best practices

---

## 🚀 **UTILISATION**

### **Configuration (À faire 1 fois)**

#### **Étape 1: Obtenir le Token Homey**

```bash
# Installer Homey CLI (si pas déjà fait)
npm install -g homey

# Se connecter à votre compte Homey
homey login

# Copier le token affiché
homey token
```

**Résultat:**
```
Your token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjVlNzg...
            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
            Copier ce token!
```

---

#### **Étape 2: Ajouter à GitHub Secrets**

**Via Web UI:**

1. **Aller sur:** https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions

2. **Cliquer sur:** "New repository secret"

3. **Remplir le formulaire:**
   - **Name:** `HOMEY_API_TOKEN`
   - **Secret:** (coller votre token)

4. **Cliquer:** "Add secret"

**Vérification:**
```
✅ Vous devriez voir:
   Repository secrets
   ├── HOMEY_API_TOKEN (set)
```

---

### **Publication (Chaque Release)**

#### **Méthode Automatique** ⭐ RECOMMANDÉE

```bash
# 1. Mettre à jour la version
# Éditer app.json: "version": "4.9.327" → "4.9.328"

# 2. Mettre à jour CHANGELOG.md
# Ajouter les changements de cette version

# 3. Commiter les changements
git add app.json CHANGELOG.md
git commit -m "chore: bump version to v4.9.328"
git push origin master

# 4. Créer et pousser le tag
git tag v4.9.328
git push origin v4.9.328

# ✨ C'est tout! Le workflow se déclenche automatiquement
```

**Résultat après ~10 minutes:**
```
✅ App validée
✅ Tests passés
✅ App publiée sur Homey App Store
✅ GitHub Release créé
```

---

#### **Méthode Manuelle** (Alternative)

1. **Aller sur:** https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/publish.yml

2. **Cliquer sur:** "Run workflow" (bouton à droite)

3. **Sélectionner:** Branch: `master`

4. **Entrer:** Version (ex: `4.9.328`)

5. **Cliquer:** "Run workflow"

---

## 📋 **CHECKLIST AVANT PUBLICATION**

Avant de pousser un tag, vérifier:

```
[ ] ✅ Version mise à jour dans app.json
[ ] ✅ CHANGELOG.md mis à jour avec les changements
[ ] ✅ Tests passés (npm test)
[ ] ✅ Lint OK (npm run lint)
[ ] ✅ Validation OK (npm run validate:publish)
[ ] ✅ Commit et push sur master
[ ] ✅ Tag créé avec bonne version (v4.9.328)
```

**Commandes de vérification:**
```bash
# Vérifier les tests
npm test

# Vérifier le lint
npm run lint

# Vérifier la validation
npm run validate:publish

# Si tout est OK → publier!
git tag v4.9.328
git push origin v4.9.328
```

---

## 🔄 **WORKFLOW DÉTAILLÉ**

Quand vous poussez un tag `v4.9.328`:

### **Job 1: Validate** (~3 min)
```
✓ Checkout code
✓ Setup Node.js 22
✓ Install dependencies (npm ci)
✓ Run tests (npm test)
✓ Validate for publish (npm run validate:publish)
```

### **Job 2: Publish** (~5 min)
```
✓ Checkout code
✓ Setup Node.js 22
✓ Install dependencies
✓ Install Homey CLI (npm install -g homey)
✓ Authenticate with Homey (homey login --token)
✓ Validate app structure (homey app validate --level publish)
✓ Build app (homey app build)
✓ Publish to Homey App Store (homey app publish)
✓ Create GitHub Release
```

### **Job 3: Notify**
```
✓ Success notification (if published)
✓ Failure notification (if failed)
```

**Temps total:** ~8-10 minutes

---

## ✅ **SUCCÈS**

### **Sur GitHub Actions:**

```
✅ Publish to Homey App Store
  ✓ validate / Validate App (3m 24s)
  ✓ publish / Publish to Homey (5m 12s)
  ✓ notify / Notify (0m 5s)

✅ App published successfully!
✅ Version: v4.9.328
✅ Check: https://apps.homey.app/app/com.dlnraja.tuya.zigbee
```

### **Vérifications:**

1. **App Store Homey:**
   - 🔗 https://apps.homey.app/app/com.dlnraja.tuya.zigbee
   - Version affichée: `4.9.328`
   - Changements visibles

2. **GitHub Release:**
   - 🔗 https://github.com/dlnraja/com.tuya.zigbee/releases/tag/v4.9.328
   - Release notes générées automatiquement
   - CHANGELOG.md attaché

3. **Workflow:**
   - 🔗 https://github.com/dlnraja/com.tuya.zigbee/actions
   - Status: ✅ Success
   - Tous les jobs verts

---

## ❌ **DÉPANNAGE**

### **Erreur: "Authentication failed"**

**Cause:** Token invalide ou expiré

**Solution:**
```bash
# Régénérer le token
homey logout
homey login
homey token

# Mettre à jour GitHub Secret:
# Settings → Secrets → HOMEY_API_TOKEN → Update
# Coller le nouveau token
```

---

### **Erreur: "Validation failed"**

**Cause:** Structure app invalide

**Solution:**
```bash
# Tester localement
npm run validate:publish

# Voir les erreurs détaillées
homey app validate --level publish

# Corriger les erreurs
# Recommiter et re-tag
```

---

### **Erreur: "Tests failed"**

**Cause:** Tests unitaires échouent

**Solution:**
```bash
# Lancer les tests localement
npm test

# Voir les détails
npm run test:coverage

# Corriger les tests
# Recommiter et re-tag
```

---

### **Erreur: "Version already exists"**

**Cause:** Cette version existe déjà sur l'App Store

**Solution:**
```bash
# Bumper la version
# app.json: "version": "4.9.329"

# Recommiter
git add app.json
git commit -m "chore: bump to v4.9.329"
git push

# Nouveau tag
git tag v4.9.329
git push origin v4.9.329
```

---

## 📊 **MONITORING**

### **Pendant la Publication:**

**Via GitHub Web:**
- 🔗 https://github.com/dlnraja/com.tuya.zigbee/actions
- Cliquer sur le workflow en cours
- Voir les logs en temps réel

**Via GitHub CLI:**
```bash
# Installer GitHub CLI (si pas déjà fait)
# https://cli.github.com/

# Voir les runs
gh run list --repo dlnraja/com.tuya.zigbee

# Suivre en temps réel
gh run watch --repo dlnraja/com.tuya.zigbee
```

---

## 🎯 **EXEMPLE COMPLET**

```bash
# === JOUR 1: DÉVELOPPEMENT ===

# Créer branche feature
git checkout -b feature/ts0004-driver

# Développer...
# ... code, code, code ...

# Commiter
git add drivers/switch_4_gang_tuya/
git commit -m "feat: add TS0004 4-gang driver"
git push origin feature/ts0004-driver

# Créer PR, review, merge


# === JOUR 2: PRÉPARER RELEASE ===

# Pull master
git checkout master
git pull origin master

# Mettre à jour version
nano app.json
# "version": "4.9.327" → "4.9.328"

# Mettre à jour CHANGELOG
nano CHANGELOG.md
# Ajouter:
# ## [4.9.328] - 2025-11-10
# ### Added
# - TS0004 4-gang driver with full Tuya DP support

# Tester
npm test                    # ✓ 20 tests passed
npm run lint                # ✓ No errors
npm run validate:publish    # ✓ Validation passed

# Commiter
git add app.json CHANGELOG.md
git commit -m "chore: bump version to v4.9.328"
git push origin master


# === JOUR 2: PUBLIER ===

# Créer tag
git tag v4.9.328

# Pousser tag
git push origin v4.9.328

# ✨ Workflow se déclenche automatiquement!

# Attendre ~10 minutes
# Vérifier: https://github.com/dlnraja/com.tuya.zigbee/actions

# Voir:
# ✓ validate / Validate App (3m 24s)
# ✓ publish / Publish to Homey (5m 12s)
# ✓ notify / Notify (0m 5s)

# ✅ Success!


# === JOUR 3: VÉRIFIER ===

# App Store
open https://apps.homey.app/app/com.dlnraja.tuya.zigbee
# Version: 4.9.328 ✓

# GitHub Release
open https://github.com/dlnraja/com.tuya.zigbee/releases
# v4.9.328 ✓

# === JOUR 3: CÉLÉBRER 🎉 ===
echo "App published successfully! 🚀"
```

---

## 📚 **DOCUMENTATION**

### **Guides:**
- 📄 **PUBLISH_GUIDE.md** - Guide rapide en français
- 📄 **.github/PUBLISH_SETUP.md** - Guide technique complet
- 📄 **GITHUB_ACTIONS_STATUS.md** - Status CI/CD

### **Workflow:**
- 📄 **.github/workflows/publish.yml** - Workflow de publication
- 📄 **.github/workflows/ci.yml** - Workflow CI/CD

### **Ressources Externes:**
- 🔗 Homey CLI: https://apps-sdk-v3.developer.homey.app/
- 🔗 GitHub Actions: https://docs.github.com/en/actions
- 🔗 Homey App Store: https://apps.homey.app/

---

## 🎉 **RÉSUMÉ**

### **Configuration** (1 fois)
```bash
1. homey token
2. Ajouter à GitHub Secrets (HOMEY_API_TOKEN)
```

### **Publication** (chaque release)
```bash
1. Bumper version dans app.json
2. Mettre à jour CHANGELOG.md
3. git tag v4.9.328
4. git push origin v4.9.328
5. Attendre ~10 min
6. ✅ Published!
```

---

## ✅ **NEXT STEPS**

### **Maintenant:**
1. **Configurer le token:**
   - `homey token`
   - Ajouter à GitHub Secrets

2. **Tester la publication:**
   - Bumper version à v4.9.328
   - Pousser tag
   - Vérifier workflow

### **Plus tard:**
- Publier v4.10.0 (minor release)
- Automatiser encore plus (auto-bump version)
- Ajouter notifications Slack/Discord

---

**Créé:** 2025-11-09 23:10  
**Commit:** 2038d03774  
**Status:** ✅ READY FOR AUTOMATED PUBLISHING  

**🎉 TOUT EST PRÊT - IL NE RESTE QU'À CONFIGURER LE TOKEN!** 🚀
