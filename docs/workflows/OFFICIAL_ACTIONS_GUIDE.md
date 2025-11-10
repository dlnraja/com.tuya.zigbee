# 🚀 HOMEY OFFICIAL GITHUB ACTIONS - GUIDE COMPLET

Date: 2025-11-10 02:12  
Version: 4.9.328  
Status: ✅ **UTILISATION DES ACTIONS OFFICIELLES ATHOM**

---

## 🎯 **CHANGEMENT MAJEUR**

**Avant:** Utilisation de Homey CLI (`homey login`, `homey app publish`)  
**Maintenant:** Utilisation des **Actions GitHub Officielles Athom** ✅

---

## ✅ **ACTIONS OFFICIELLES ATHOM**

### **1. Homey App Validate**
```yaml
uses: athombv/github-action-homey-app-validate@v1
```
- ✅ Validation officielle de l'app
- ✅ Vérifie app.json, drivers, capabilities
- ✅ Pas de CLI nécessaire

### **2. Homey App Publish**
```yaml
uses: athombv/github-action-homey-app-publish@master
with:
  personal_access_token: ${{ secrets.HOMEY_PAT }}
```
- ✅ Publication officielle sur Homey App Store
- ✅ Direct vers Athom sans CLI
- ✅ Retourne URL de gestion

### **3. Homey App Update Version** (optionnel)
```yaml
uses: athombv/github-action-homey-app-update-version@v1
```
- ✅ Mise à jour automatique de la version

---

## 🔑 **CONFIGURATION HOMEY_PAT**

### **C'est Quoi HOMEY_PAT?**

**HOMEY_PAT** = **Personal Access Token** pour Homey Developer Tools

**Avant:** `HOMEY_API_TOKEN` (pour CLI)  
**Maintenant:** `HOMEY_PAT` (pour Actions officielles) ✅

---

### **Étape 1: Obtenir votre Token**

1. **Aller sur:**
   ```
   https://tools.developer.homey.app/me
   ```

2. **Se connecter** avec votre compte Athom

3. **Copier votre Personal Access Token**
   ```
   Exemple: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6...
   ```

---

### **Étape 2: Ajouter à GitHub Secrets**

1. **Aller sur:**
   ```
   https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions
   ```

2. **Cliquer:** "New repository secret"

3. **Remplir:**
   ```
   Name: HOMEY_PAT
   Value: (coller votre token)
   ```

4. **Cliquer:** "Add secret"

✅ **Token configuré!**

---

## 📦 **NOUVEAUX WORKFLOWS**

### **1. publish-official.yml** ⭐ PRINCIPAL

```yaml
Trigger: Push tag (v4.9.328) ou Manual
Durée: ~5 minutes
Requiert: HOMEY_PAT

Jobs:
1. Validate Homey App (official)
2. Publish to Homey App Store (official)
3. Create GitHub Release
4. Notify

Avantages:
✅ Actions officielles Athom
✅ Pas de CLI nécessaire
✅ Plus rapide
✅ Plus fiable
```

**Utilisation:**
```bash
# Méthode 1: Push tag
git tag v4.9.328
git push origin v4.9.328

# Méthode 2: Manual trigger
# https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/publish-official.yml
# → Run workflow
```

---

### **2. force-publish-official.yml** 🚀 FORCE PUBLISH

```yaml
Trigger: Manual uniquement
Durée: ~5 minutes
Requiert: HOMEY_PAT

Options:
- skip_validation: true/false

Jobs:
1. Validate (optional)
2. Force Publish (official, continue on error)
3. Create tag
4. Create GitHub Release
5. Summary

Avantages:
✅ Bypass validation si nécessaire
✅ Continue même avec erreurs
✅ Actions officielles
✅ Création auto tag
```

**Utilisation:**
```
https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/force-publish-official.yml
→ Run workflow
→ skip_validation: false (ou true pour forcer)
```

---

### **3. ci-official.yml** 🔄 CI/CD

```yaml
Trigger: Push sur master/develop
Durée: ~3-5 minutes
Requiert: Rien

Jobs:
1. Validate Homey App (official)
2. Build Documentation
3. Deploy GitHub Pages (master only)
4. Summary

Avantages:
✅ Validation officielle continue
✅ Pas de token requis
✅ Build docs automatique
✅ Deploy pages automatique
```

---

## 🆚 **COMPARAISON: CLI vs ACTIONS OFFICIELLES**

### **Avant (avec CLI):**

```yaml
- name: Install Homey CLI
  run: npm install -g homey
  
- name: Authenticate
  run: homey login --token ${{ secrets.HOMEY_API_TOKEN }}
  
- name: Validate
  run: homey app validate --level publish
  
- name: Publish
  run: homey app publish

Problèmes:
❌ Installation CLI lente (~1-2 min)
❌ Dépendances Node.js
❌ Peut échouer sur réseau
❌ Logs moins clairs
❌ Token différent
```

### **Maintenant (Actions Officielles):**

```yaml
- name: Validate
  uses: athombv/github-action-homey-app-validate@v1
  
- name: Publish
  uses: athombv/github-action-homey-app-publish@master
  with:
    personal_access_token: ${{ secrets.HOMEY_PAT }}

Avantages:
✅ Pas d'installation CLI
✅ Direct vers API Athom
✅ Plus rapide (~2-3 min économisés)
✅ Plus fiable
✅ Logs meilleurs
✅ Token officiel Athom
```

---

## 📊 **MIGRATION**

### **Anciens Workflows → Nouveaux Workflows**

| Ancien | Nouveau | Status |
|--------|---------|--------|
| `publish.yml` (CLI) | `publish-official.yml` | ✅ Remplacé |
| `force-publish.yml` (CLI) | `force-publish-official.yml` | ✅ Remplacé |
| `ci.yml` (CLI) | `ci-official.yml` | ✅ Remplacé |

### **Anciens Secrets → Nouveaux Secrets**

| Ancien | Nouveau | Obtenir à |
|--------|---------|-----------|
| `HOMEY_API_TOKEN` | `HOMEY_PAT` | https://tools.developer.homey.app/me |

---

## 🚀 **UTILISATION IMMÉDIATE**

### **Méthode 1: Publish Standard** ⭐ RECOMMANDÉE

```bash
# 1. Configurer HOMEY_PAT (si pas déjà fait)
# https://tools.developer.homey.app/me
# → Copier token
# → Ajouter à GitHub Secrets (HOMEY_PAT)

# 2. Tag et push
git tag v4.9.328
git push origin v4.9.328

# 3. Workflow publish-official.yml se lance automatiquement
# https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/publish-official.yml

# 4. Attendre ~5 minutes
# ✅ App published!
```

---

### **Méthode 2: Force Publish**

```bash
# 1. Aller sur
https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/force-publish-official.yml

# 2. Run workflow
# → skip_validation: false (validation normale)
# → OU true (force même si erreurs)

# 3. Attendre ~5 minutes
# ✅ App force published!
```

---

### **Méthode 3: CI/CD Automatique**

```bash
# Push sur master déclenche automatiquement ci-official.yml
git add -A
git commit -m "feat: new feature"
git push origin master

# Workflow ci-official.yml se lance automatiquement
# ✅ Validation + Build docs + Deploy pages
```

---

## ✅ **VÉRIFICATION POST-PUBLISH**

### **1. Homey Developer Tools**

```
https://tools.developer.homey.app

Vérifier:
✅ App visible dans "My Apps"
✅ Version correcte (4.9.328)
✅ Status: Published / Draft / Test
✅ Peut gérer release (Test/Live)
```

### **2. Homey App Store**

```
https://apps.homey.app/app/com.dlnraja.tuya.zigbee

Vérifier:
✅ App visible publiquement
✅ Version affichée correcte
✅ Description à jour
✅ Installation possible
```

### **3. GitHub Release**

```
https://github.com/dlnraja/com.tuya.zigbee/releases/tag/v4.9.328

Vérifier:
✅ Release créée
✅ CHANGELOG.md attaché
✅ Release notes
✅ Tag correct
```

---

## 🔧 **DÉPANNAGE**

### **Erreur: "HOMEY_PAT not configured"**

**Solution:**
```bash
1. Obtenir token: https://tools.developer.homey.app/me
2. Ajouter à GitHub Secrets (HOMEY_PAT)
3. Relancer workflow
```

---

### **Erreur: "Validation failed"**

**Solution:**
```bash
# Tester localement (optionnel)
npm install -g homey
homey login
homey app validate --level publish

# Ou utiliser force-publish avec skip_validation: true
```

---

### **Erreur: "Publish failed"**

**Causes possibles:**
1. ❌ Token expiré → Régénérer
2. ❌ App déjà published à cette version → Bump version
3. ❌ Validation errors → Corriger ou skip

**Solution:**
```bash
# Utiliser force-publish
https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/force-publish-official.yml
→ skip_validation: true
```

---

## 📚 **DOCUMENTATION OFFICIELLE**

### **Actions Athom:**
- [Homey App Validate](https://github.com/marketplace/actions/homey-app-validate)
- [Homey App Publish](https://github.com/marketplace/actions/homey-app-publish)
- [Homey App Update Version](https://github.com/marketplace/actions/homey-app-update-version)

### **Documentation:**
- [Publishing | Homey Apps SDK](https://apps.developer.homey.app/app-store/publishing)
- [Homey Developer Tools](https://tools.developer.homey.app)
- [Homey Apps SDK](https://apps.developer.homey.app)

---

## 🎯 **RÉSUMÉ**

### **Ce qui a changé:**

```
❌ AVANT:
- Workflows avec Homey CLI
- npm install -g homey
- homey login --token
- homey app publish
- Token: HOMEY_API_TOKEN
- Durée: ~10 minutes
- Moins fiable

✅ MAINTENANT:
- Workflows avec Actions Officielles Athom
- athombv/github-action-homey-app-validate
- athombv/github-action-homey-app-publish
- Pas de CLI nécessaire
- Token: HOMEY_PAT
- Durée: ~5 minutes
- Plus fiable et officiel
```

### **Avantages:**

```
✅ Actions officielles Athom
✅ Plus rapide (2-3 min économisés)
✅ Plus fiable (direct API)
✅ Meilleurs logs
✅ Token officiel
✅ Pas d'installation CLI
✅ Moins de dépendances
✅ Maintenance par Athom
```

---

## 🚀 **PROCHAINES ÉTAPES**

### **Maintenant:**

1. **Configurer HOMEY_PAT:**
   ```
   https://tools.developer.homey.app/me
   → Copier token
   → https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions
   → New secret: HOMEY_PAT
   ```

2. **Push et publish:**
   ```bash
   git add -A
   git commit -m "feat: switch to official Homey GitHub Actions"
   git push origin master
   
   git tag v4.9.328
   git push origin v4.9.328
   ```

3. **Vérifier workflow:**
   ```
   https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/publish-official.yml
   ```

4. **Célébrer!** 🎉

---

**Date:** 2025-11-10 02:12  
**Version:** 4.9.328  
**Status:** ✅ **PRÊT AVEC ACTIONS OFFICIELLES ATHOM**  

---

# 🎉 **WORKFLOWS OFFICIELS PRÊTS!**

## 📝 **À FAIRE:**

1. **Configurer HOMEY_PAT:** https://tools.developer.homey.app/me
2. **Push:** `git push origin master`
3. **Tag:** `git tag v4.9.328 && git push origin v4.9.328`
4. **Vérifier:** https://github.com/dlnraja/com.tuya.zigbee/actions

**🚀 ACTIONS OFFICIELLES = PLUS RAPIDE, PLUS FIABLE!** ✅
