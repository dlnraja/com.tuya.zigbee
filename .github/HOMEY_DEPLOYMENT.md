# 🚀 Homey App Store - Déploiement Automatique via GitHub Actions

## 📋 Configuration Requise

### 1. **Obtenir votre Token Homey**

```bash
# Se connecter à Homey CLI
homey login

# Obtenir le token
homey settings token get
```

Vous obtiendrez un token qui ressemble à : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

### 2. **Ajouter le Token comme Secret GitHub**

1. Aller dans votre repository GitHub : `https://github.com/dlnraja/com.tuya.zigbee`
2. Cliquer sur **Settings** → **Secrets and variables** → **Actions**
3. Cliquer sur **New repository secret**
4. Nom du secret : `HOMEY_TOKEN`
5. Valeur : Coller votre token Homey
6. Cliquer sur **Add secret**

---

## 🎯 Utilisation

### **Méthode 1: Déclenchement Automatique (RECOMMANDÉ)**

Le workflow se déclenche **automatiquement** quand vous créez un tag de version :

```bash
# Incrementer version dans app.json (ex: 4.9.294 → 4.9.295)
# Commiter les changements
git add -A
git commit -m "release: v4.9.295 - Description des changements"

# Créer le tag
git tag -a v4.9.295 -m "Release v4.9.295"

# Push avec tags
git push origin master --tags
```

**Le workflow GitHub Actions se lance automatiquement et publie sur le Homey App Store !** 🎉

---

### **Méthode 2: Déclenchement Manuel**

Si vous voulez publier sans créer de tag :

1. Aller sur GitHub : **Actions** tab
2. Sélectionner **Homey App Store Publisher**
3. Cliquer sur **Run workflow**
4. Sélectionner la branche `master`
5. Cliquer sur **Run workflow**

---

## 📊 Workflow Steps

Le workflow GitHub Actions exécute automatiquement :

1. ✅ **Checkout code** - Récupère le code
2. ✅ **Setup Node.js 20** - Configure l'environnement
3. ✅ **Install dependencies** - Installe npm + Homey CLI
4. ✅ **Validate structure** - Vérifie app.json, drivers/, lib/
5. ✅ **Build app** - `homey app build`
6. ✅ **Validate** - `homey app validate --level publish`
7. ✅ **Publish** - `homey app publish` (publie sur App Store!)
8. ✅ **Create GitHub Release** - Crée une release avec build artifacts
9. ✅ **Monitor** - Surveille le statut du déploiement

---

## 🔍 Monitoring

### **Voir les logs en temps réel:**

1. Aller sur GitHub → **Actions** tab
2. Cliquer sur le workflow en cours d'exécution
3. Voir les logs détaillés de chaque step

### **Statut du déploiement:**

- ✅ **Success** → App publiée sur Homey App Store (disponible dans 15-30 min)
- ❌ **Failed** → Voir les logs pour corriger l'erreur

---

## ⚠️ Erreurs Communes

### **1. HOMEY_TOKEN not set**

```
❌ ERROR: HOMEY_TOKEN secret not set!
```

**Solution:** Ajouter le secret `HOMEY_TOKEN` dans GitHub Settings (voir étape 2)

---

### **2. Validation Failed**

```
❌ Validation failed: Invalid app.json
```

**Solution:** 
- Vérifier la syntaxe de `app.json`
- Exécuter localement : `homey app validate --level publish`
- Corriger les erreurs et recommiter

---

### **3. Version Conflict**

```
❌ Version 4.9.294 already exists
```

**Solution:**
- Incrémenter la version dans `app.json`
- Créer un nouveau tag avec la nouvelle version

---

## 📦 Build Artifacts

Le workflow crée automatiquement :

1. **build-report.txt** - Rapport de build avec statistiques
2. **build/*.tar.gz** - Archive de l'app prête pour déploiement
3. **GitHub Release** - Release publique avec changelog

---

## 🎉 Résultat Final

Après un workflow réussi :

1. ✅ App publiée sur **Homey App Store**
2. ✅ Disponible pour **tous les utilisateurs** dans 15-30 minutes
3. ✅ **GitHub Release** créée avec artifacts
4. ✅ **Changelog** visible sur GitHub
5. ✅ **Build report** généré automatiquement

---

## 🔄 Workflow Automatique Complet

```bash
# LOCAL
git add -A
git commit -m "release: v4.9.295 - New features"
git tag -a v4.9.295 -m "Release v4.9.295"
git push origin master --tags

# GITHUB ACTIONS (automatique)
# → Checkout
# → Build
# → Validate
# → Publish to Homey App Store ✅
# → Create GitHub Release

# HOMEY APP STORE (15-30 min)
# → Version 4.9.295 disponible pour tous ! 🎊
```

---

## 📞 Support

En cas de problème :

1. Vérifier les logs dans **GitHub Actions**
2. Vérifier que `HOMEY_TOKEN` est bien configuré
3. Tester localement : `homey app validate --level publish`
4. Vérifier la version dans `app.json`

---

## 🚀 Déploiement Immédiat

Pour publier la version actuelle **v4.9.294** MAINTENANT :

```bash
cd "c:\Users\HP\Desktop\homey app\tuya_repair"

# Le tag existe déjà, forcer le workflow manuel:
git push origin master --tags --force
```

Puis aller sur GitHub → Actions → **Run workflow** manuellement.

**L'app sera publiée automatiquement sur le Homey App Store ! 🎉**
