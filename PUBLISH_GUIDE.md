# 🚀 GUIDE: Publier l'App via GitHub Actions

## ⚡ **CONFIGURATION RAPIDE**

### **Étape 1: Obtenir le Token Homey**

```bash
# Installer Homey CLI
npm install -g homey

# Se connecter
homey login

# Copier le token affiché
homey token
```

**Résultat:**
```
Your token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### **Étape 2: Ajouter le Secret GitHub**

1. **Aller sur:** https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions
2. **Cliquer:** "New repository secret"
3. **Remplir:**
   - Name: `HOMEY_API_TOKEN`
   - Value: (coller votre token)
4. **Cliquer:** "Add secret"

✅ **Configuration terminée!**

---

## 🎯 **PUBLIER UNE NOUVELLE VERSION**

### **Méthode 1: Automatique (Recommandée)**

```bash
# 1. Mettre à jour la version dans app.json
# "version": "4.9.327" → "4.9.328"

# 2. Mettre à jour CHANGELOG.md
# Ajouter les changements de la version

# 3. Commiter
git add app.json CHANGELOG.md
git commit -m "chore: bump version to v4.9.328"
git push origin master

# 4. Créer et pousser le tag
git tag v4.9.328
git push origin v4.9.328
```

**✨ La magie opère:**
- ⏱️ Dans ~10 minutes, l'app sera publiée automatiquement!
- 🔔 Vous recevrez un email si ça échoue
- ✅ Sinon, c'est un succès silencieux!

**Vérifier:**
- 🔄 Workflow: https://github.com/dlnraja/com.tuya.zigbee/actions
- 📦 App Store: https://apps.homey.app/app/com.dlnraja.tuya.zigbee
- 🏷️ Release: https://github.com/dlnraja/com.tuya.zigbee/releases

---

### **Méthode 2: Manuelle**

1. **Aller sur:** https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/publish.yml
2. **Cliquer:** "Run workflow" (bouton à droite)
3. **Entrer:** Version (ex: `4.9.328`)
4. **Cliquer:** "Run workflow"

⏱️ Attendre ~10 minutes

---

### **Méthode 3: Local (Backup)**

Si GitHub Actions ne fonctionne pas:

```bash
npm install -g homey
homey login
homey app validate --level publish
homey app publish
```

---

## 📋 **CHECKLIST AVANT PUBLICATION**

```
[ ] Version mise à jour dans app.json
[ ] CHANGELOG.md mis à jour
[ ] Tests passés (npm test)
[ ] Lint OK (npm run lint)
[ ] Validation OK (npm run validate:publish)
[ ] Git commit + push
[ ] Tag créé et poussé
```

---

## 🔄 **PROCESSUS AUTOMATIQUE**

Quand vous poussez un tag `v4.9.328`:

```
1. Validation (~3 min)
   ✓ Checkout code
   ✓ Install dependencies
   ✓ Run tests
   ✓ Validate app
   
2. Publication (~5 min)
   ✓ Authenticate Homey
   ✓ Build app
   ✓ Publish to App Store
   ✓ Create GitHub Release
   
3. Notification
   ✓ Success/Failure message
```

**Total: ~8-10 minutes**

---

## ✅ **SUCCÈS**

Vous verrez sur GitHub Actions:

```
✅ Publish to Homey App Store
  ✓ validate / Validate App
  ✓ publish / Publish to Homey
  ✓ notify / Notify

✅ App published successfully!
✅ Version: v4.9.328
```

**Vérifier:**
1. 📦 App Store: https://apps.homey.app/app/com.dlnraja.tuya.zigbee
2. 🏷️ GitHub Release créé automatiquement
3. 📝 Release notes générées depuis CHANGELOG.md

---

## ❌ **EN CAS D'ÉCHEC**

### **"Authentication failed"**

❌ **Problème:** Token invalide ou expiré

✅ **Solution:**
```bash
homey logout
homey login
homey token
# Mettre à jour le secret GitHub avec le nouveau token
```

---

### **"Validation failed"**

❌ **Problème:** Structure app invalide

✅ **Solution:**
```bash
# Tester localement
npm run validate:publish

# Voir les erreurs détaillées
homey app validate --level publish

# Corriger et recommiter
```

---

### **"Version already exists"**

❌ **Problème:** Version déjà publiée

✅ **Solution:**
```bash
# Bumper la version
# app.json: "version": "4.9.329"

# Recommiter avec nouveau tag
git tag v4.9.329
git push origin v4.9.329
```

---

## 🎯 **VERSIONING**

```
MAJOR.MINOR.PATCH

4.9.327
│ │  │
│ │  └── Patch: Corrections bugs
│ └────── Minor: Nouvelles fonctionnalités
└──────── Major: Changements majeurs
```

**Exemples:**
- `v4.9.327` → `v4.9.328` - Patch (bug fix)
- `v4.9.328` → `v4.10.0` - Minor (nouvelle feature)
- `v4.10.0` → `v5.0.0` - Major (breaking change)

---

## 🔐 **SÉCURITÉ**

### **❌ NE JAMAIS:**
- Commiter le token dans le code
- Partager votre token Homey
- Mettre le token dans un fichier

### **✅ TOUJOURS:**
- Utiliser GitHub Secrets
- Garder le token privé
- Régénérer si compromis

---

## 📊 **MONITORING**

### **Pendant la publication:**

**Voir en temps réel:**
```bash
# Via GitHub CLI (si installé)
gh run watch

# Ou sur le web
# https://github.com/dlnraja/com.tuya.zigbee/actions
```

**Logs disponibles:**
- Validation logs
- Build logs
- Publish logs
- Error details (si échec)

---

## 🎉 **APRÈS PUBLICATION**

### **1. Vérifier l'App Store**
- Aller sur https://apps.homey.app/app/com.dlnraja.tuya.zigbee
- Vérifier que la version est à jour
- Tester l'installation

### **2. Vérifier GitHub Release**
- Aller sur https://github.com/dlnraja/com.tuya.zigbee/releases
- Voir la nouvelle release
- Éditer si besoin

### **3. Annoncer**
- Forum Homey Community
- Discord
- Réseaux sociaux

---

## 🚀 **EXEMPLE COMPLET**

```bash
# Jour 1: Développement
git checkout -b feature/ts0004-driver
# ... développer ...
git commit -m "feat: add TS0004 4-gang driver"
git push origin feature/ts0004-driver
# Créer PR, review, merge

# Jour 2: Préparer release
git checkout master
git pull

# Mettre à jour version
# app.json: "version": "4.9.328"

# Mettre à jour CHANGELOG
nano CHANGELOG.md
# Ajouter:
# ## [4.9.328] - 2025-11-10
# ### Added
# - TS0004 4-gang driver support

# Tester
npm test
npm run lint
npm run validate:publish

# Commiter
git add app.json CHANGELOG.md
git commit -m "chore: bump version to v4.9.328"
git push origin master

# Publier
git tag v4.9.328
git push origin v4.9.328

# Attendre ~10 min
# Vérifier: https://github.com/dlnraja/com.tuya.zigbee/actions

# Jour 3: Célébrer 🎉
# App published!
# Users can update!
```

---

## 📞 **AIDE**

### **Documentation:**
- 📚 Homey CLI: https://apps-sdk-v3.developer.homey.app/
- 📚 GitHub Actions: https://docs.github.com/en/actions
- 📚 Workflow file: `.github/workflows/publish.yml`
- 📚 Setup guide: `.github/PUBLISH_SETUP.md`

### **Support:**
- 💬 GitHub Issues: https://github.com/dlnraja/com.tuya.zigbee/issues
- 💬 Homey Community Forum
- 💬 Discord

---

## ✅ **RÉSUMÉ ULTRA-RAPIDE**

```bash
# Configuration (1 fois)
homey token
# → Ajouter à GitHub Secrets

# Publication (chaque release)
git tag v4.9.328
git push origin v4.9.328

# Attendre ~10 min
# ✅ Done!
```

**C'est tout!** 🎉

---

**Créé:** 2025-11-09 23:10  
**Status:** ✅ Prêt à utiliser  
**Next:** Configurer le token et publier!
