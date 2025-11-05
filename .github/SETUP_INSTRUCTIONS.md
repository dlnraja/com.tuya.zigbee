# 🚀 SETUP GITHUB ACTIONS - Instructions Complètes

## 🎯 OBJECTIF

Publier automatiquement l'app sur le **Homey App Store** via **GitHub Actions**, SANS utiliser le CLI localement.

---

## ⚡ ÉTAPE 1: Obtenir le Token Homey

### **Sur votre ordinateur local:**

```bash
# 1. Se connecter à Homey (si pas déjà fait)
homey login

# 2. Obtenir votre token
homey settings token get
```

**Vous obtiendrez un token comme:** 
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1ZTk4Yzg2YzY1NzQzNjAwM2E5ZTc1YjgiLCJpYXQiOjE2OTg1MDQzMjF9.xYzABC123...
```

**⚠️ IMPORTANT:** Gardez ce token secret! Ne le partagez jamais publiquement.

---

## ⚡ ÉTAPE 2: Ajouter le Token dans GitHub

### **1. Aller sur votre repository GitHub:**

https://github.com/dlnraja/com.tuya.zigbee

### **2. Aller dans Settings:**

Repository → **Settings** (en haut à droite)

### **3. Aller dans Secrets:**

Settings → **Secrets and variables** → **Actions**

### **4. Créer un nouveau secret:**

- Cliquer sur **New repository secret**
- **Name:** `HOMEY_TOKEN`
- **Value:** Coller votre token complet (copié à l'étape 1)
- Cliquer sur **Add secret**

### **✅ Vérification:**

Vous devriez voir un secret nommé `HOMEY_TOKEN` dans la liste.

---

## ⚡ ÉTAPE 3: Pousser le Code sur GitHub

```bash
cd "c:\Users\HP\Desktop\homey app\tuya_repair"

# Vérifier que les workflows sont bien ajoutés
git status

# Push les changements
git push origin master
```

---

## ⚡ ÉTAPE 4: Déclencher la Publication

### **MÉTHODE A: Automatique via Tag (RECOMMANDÉ)**

```bash
# Le tag v4.9.294 existe déjà, donc on peut:

# Option 1: Créer un nouveau tag avec version suivante
# (Incrémenter app.json version avant: 4.9.294 → 4.9.295)
git tag -a v4.9.295 -m "Release v4.9.295"
git push origin v4.9.295

# Option 2: Re-pousser le tag existant (force)
git push origin v4.9.294 --force
```

**Le workflow `homey-publish.yml` se déclenche automatiquement!** 🎉

---

### **MÉTHODE B: Manuelle via GitHub Interface**

1. Aller sur: https://github.com/dlnraja/com.tuya.zigbee/actions
2. Cliquer sur **Homey App Store Publisher** (dans la liste de gauche)
3. Cliquer sur **Run workflow** (bouton bleu à droite)
4. Sélectionner branch: **master**
5. Cliquer sur **Run workflow** (bouton vert)

**Le workflow se lance immédiatement!** 🎉

---

## 📊 ÉTAPE 5: Surveiller le Déploiement

### **Voir les logs en direct:**

1. Aller sur: https://github.com/dlnraja/com.tuya.zigbee/actions
2. Cliquer sur le workflow en cours d'exécution (première ligne)
3. Cliquer sur **validate-and-publish** job
4. Voir les logs détaillés en temps réel

### **Steps exécutés:**

```
✅ Checkout code
✅ Setup Node.js 20
✅ Install dependencies (npm + homey CLI)
✅ Get version from tag
✅ Validate app structure
✅ Build Homey app
✅ Validate with Homey CLI (publish level)
✅ Generate build report
🚀 Publish to Homey App Store  ← LA MAGIE!
✅ Create GitHub Release
✅ Post success comment
📊 Monitor deployment status
```

---

## ✅ ÉTAPE 6: Vérifier la Publication

### **Dans les logs GitHub Actions:**

Si vous voyez:
```
✅ Published successfully to Homey App Store!
Version 4.9.294 is now available
```

**C'EST BON!** 🎉

### **Sur le Homey App Store:**

- Attendre **15-30 minutes**
- Aller dans l'app Homey → **Settings** → **Apps**
- Chercher **Universal Tuya Zigbee**
- Une mise à jour devrait être disponible!

---

## 🚨 DÉPANNAGE

### **Erreur: HOMEY_TOKEN not set**

```
❌ ERROR: HOMEY_TOKEN secret not set!
```

**Solution:**
- Vérifier que vous avez bien ajouté le secret `HOMEY_TOKEN` dans GitHub Settings
- Le nom doit être EXACTEMENT `HOMEY_TOKEN` (majuscules)
- Vérifier que le token est valide: `homey settings token get`

---

### **Erreur: Validation failed**

```
❌ Validation failed at level publish
```

**Solution:**
- Voir les logs détaillés pour identifier l'erreur
- Tester localement: `homey app validate --level publish`
- Corriger l'erreur dans le code
- Recommiter et re-déclencher le workflow

---

### **Erreur: Token expired**

```
❌ Authentication failed: Token expired
```

**Solution:**
1. Générer un nouveau token: `homey login` puis `homey settings token get`
2. Mettre à jour le secret `HOMEY_TOKEN` dans GitHub Settings
3. Re-déclencher le workflow

---

## 📦 WORKFLOWS DISPONIBLES

### **1. `homey-publish.yml` - Publication sur App Store**

**Se déclenche:**
- Sur création de tag `v*` (ex: v4.9.294)
- Manuellement via GitHub Actions

**Fait:**
- Build + Validate + Publish sur Homey App Store
- Crée une GitHub Release avec artifacts

---

### **2. `auto-fix.yml` - Monitoring & Validation**

**Se déclenche:**
- À chaque push sur master
- À chaque pull request
- Quotidiennement à 2h du matin
- Manuellement via GitHub Actions

**Fait:**
- Valide la structure de l'app
- Vérifie les drivers et lib files
- Détecte les problèmes courants
- Génère un rapport de santé

---

## 🎉 RÉSULTAT FINAL

Après configuration complète:

1. ✅ **Token Homey** configuré dans GitHub Secrets
2. ✅ **Workflows** actifs sur GitHub Actions
3. ✅ **Publication automatique** sur tag de version
4. ✅ **Monitoring quotidien** de la santé de l'app
5. ✅ **GitHub Releases** créées automatiquement
6. ✅ **Plus besoin de CLI local** pour publier!

---

## 🚀 PUBLIER v4.9.294 MAINTENANT

```bash
cd "c:\Users\HP\Desktop\homey app\tuya_repair"

# Push le code (déjà fait)
git push origin master

# Pousser le tag existant (force trigger)
git push origin v4.9.294 --force
```

Puis:
1. Aller sur https://github.com/dlnraja/com.tuya.zigbee/actions
2. Voir le workflow `Homey App Store Publisher` se lancer
3. Attendre ~5-10 minutes
4. ✅ **Version 4.9.294 publiée sur Homey App Store!**

---

## 📞 SUPPORT

En cas de problème:

1. Vérifier les logs dans GitHub Actions
2. Vérifier que `HOMEY_TOKEN` est configuré
3. Tester localement: `homey app validate --level publish`
4. Voir le fichier `.github/HOMEY_DEPLOYMENT.md` pour plus de détails

**Tout est automatique maintenant! Plus besoin de CLI local! 🎉**
