# 🎯 MASTER SYSTEM - GUIDE COMPLET

Date: 2025-11-10 13:16  
Version: 4.9.328  
Status: ✅ **SYSTÈME MASTER ACTIF**

---

## 🚀 **SYSTÈME MASTER - 3 WORKFLOWS**

Le système a été simplifié à **3 workflows essentiels** qui font TOUT:

### **1. MASTER-publish.yml** 📦
**Fonction:** Publier l'app sur Homey App Store

**Triggers:**
- Push tag `v*.*.*`
- Manuel (workflow_dispatch)

**Méthodes:**
- ✅ **Official Action** - athombv/github-action-homey-app-publish
- ✅ **Homey CLI** - Installation et publish via CLI
- ✅ **Both** - Les deux méthodes (par défaut)

**Requis:**
- `HOMEY_PAT` configuré (Personal Access Token)

**Usage:**
```bash
# Méthode 1: Push tag
git tag v4.9.328
git push origin v4.9.328

# Méthode 2: Manuel
https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/MASTER-publish.yml
→ Run workflow
→ method: both
```

---

### **2. MASTER-cleanup-organize.yml** 🧹
**Fonction:** Nettoyer et organiser automatiquement

**Triggers:**
- Manuel (workflow_dispatch)
- Hebdomadaire (Dimanche 2am)

**Actions:**
- 📦 Archive les anciens workflows
- 📚 Organise la documentation
- 📝 Crée un index
- 🗂️ Structure propre

**Résultat:**
```
.github/workflows/
├── MASTER-publish.yml              ✅ ACTIF
├── MASTER-cleanup-organize.yml     ✅ ACTIF
├── MASTER-auto-fix-monitor.yml     ✅ ACTIF
└── archive/
    ├── old-workflow-1.yml.disabled
    ├── old-workflow-2.yml.disabled
    └── ...

docs/
├── README.md                       ✅ Index
├── workflows/                      📊 Docs workflows
├── guides/                         📖 Guides
└── archive/                        🗄️ Anciennes docs
```

---

### **3. MASTER-auto-fix-monitor.yml** 🔧
**Fonction:** Surveillance et correction automatique

**Triggers:**
- Manuel (workflow_dispatch)
- Push sur master
- Toutes les 30 minutes

**Vérifications:**
- ✅ app.json valide
- ✅ HOMEY_PAT configuré
- ✅ Structure de fichiers
- ✅ Authentication Homey
- ✅ Validation app

**Auto-Fixes:**
- 📁 Crée répertoires manquants
- 🔧 Corrige configuration
- 📝 Met à jour si nécessaire
- 💾 Commit automatique

**Monitoring:**
- 🔍 Status en temps réel
- 📊 Rapport détaillé
- ⚠️ Alertes si problèmes
- 💡 Suggestions actions

---

## 🔑 **CONFIGURATION HOMEY_PAT**

### **Pourquoi HOMEY_PAT?**

**HOMEY_PAT** = Personal Access Token pour publier sur Homey App Store

**Sans HOMEY_PAT:**
- ❌ Impossible de publier
- ✅ Workflows fonctionnent (mode dry-run)
- ✅ Monitoring actif
- ✅ Auto-fix actif

**Avec HOMEY_PAT:**
- ✅ Publication complète
- ✅ Toutes fonctionnalités
- ✅ App sur App Store

---

### **Comment Obtenir HOMEY_PAT?**

#### **Étape 1: Aller sur Developer Tools**
```
https://tools.developer.homey.app/api
```

#### **Étape 2: Se Connecter**
- Compte Athom/Homey
- Email + Password

#### **Étape 3: Copier le Token**
- Section "Personal Access Token"
- Cliquer pour révéler
- Copier entièrement

**Format du token:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### **Étape 4: Ajouter à GitHub**

1. **Aller sur:**
   ```
   https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions
   ```

2. **Cliquer:** "New repository secret"

3. **Remplir:**
   ```
   Name: HOMEY_PAT
   Value: (coller le token)
   ```

4. **Cliquer:** "Add secret"

✅ **Configuration terminée!**

---

## 📊 **WORKFLOWS - ÉTAT ACTUEL**

### **Workflows Actifs (3):**
```
✅ MASTER-publish.yml
✅ MASTER-cleanup-organize.yml
✅ MASTER-auto-fix-monitor.yml
```

### **Workflows Archivés (15+):**
```
📦 Tous dans .github/workflows/archive/
   → Désactivés automatiquement
   → Conservés pour référence
   → Ne s'exécutent plus
```

---

## 🎯 **UTILISATION**

### **Pour Publier:**

```bash
# 1. S'assurer que HOMEY_PAT est configuré
#    https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions

# 2. Lancer MASTER-publish workflow
https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/MASTER-publish.yml
→ Run workflow
→ method: both (official-action + cli)
→ Run workflow

# 3. Attendre ~5 minutes

# 4. Vérifier
https://tools.developer.homey.app
→ My Apps
→ com.dlnraja.tuya.zigbee
→ Devrait apparaître!
```

---

### **Pour Nettoyer:**

```bash
# Lancer MASTER-cleanup-organize workflow
https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/MASTER-cleanup-organize.yml
→ Run workflow

# Ou attendre dimanche 2am (auto)
```

---

### **Pour Surveiller:**

```bash
# Monitoring automatique toutes les 30 min

# Pour forcer:
https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/MASTER-auto-fix-monitor.yml
→ Run workflow

# Voir le rapport dans Summary
```

---

## 🔍 **TROUBLESHOOTING**

### **Problème: App pas sur dashboard**

**Solution:**
```
1. Vérifier HOMEY_PAT:
   https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions
   → Doit y avoir "HOMEY_PAT"

2. Vérifier validité token:
   https://tools.developer.homey.app/api
   → Copier nouveau token si expiré
   → Mettre à jour GitHub Secret

3. Lancer MASTER-publish:
   → method: both
   → Attendre fin

4. Vérifier dashboard:
   https://tools.developer.homey.app
   → My Apps
```

---

### **Problème: Workflow échoue**

**Solution:**
```
1. Voir MASTER-auto-fix-monitor logs:
   → Identifie problèmes automatiquement
   → Corrige si possible

2. Vérifier app.json valide:
   node -e "JSON.parse(require('fs').readFileSync('app.json'))"

3. Re-lancer MASTER-publish
```

---

### **Problème: Trop de workflows**

**Solution:**
```
Lancer MASTER-cleanup-organize:
→ Archive automatiquement anciens workflows
→ Garde seulement les 3 MASTER
→ Organise documentation
```

---

## 📋 **CHECKLIST PUBLICATION**

```
[ ] HOMEY_PAT configuré
[ ] app.json valide (version correcte)
[ ] CHANGELOG.md à jour
[ ] Pas de workflows en conflit
[ ] MASTER-publish workflow prêt
[ ] Lancer MASTER-publish (method: both)
[ ] Attendre ~5 minutes
[ ] Vérifier developer dashboard
[ ] Vérifier app store
```

---

## 🎉 **AVANTAGES SYSTÈME MASTER**

### **Simplicité:**
```
❌ Avant: 18 workflows différents
✅ Après: 3 workflows MASTER

❌ Avant: Conflits, confusion
✅ Après: Clair, simple, efficace
```

### **Fiabilité:**
```
✅ 2 méthodes publish (official + CLI)
✅ Auto-fix automatique
✅ Monitoring continu
✅ Cleanup automatique
```

### **Maintenance:**
```
✅ Auto-organisation
✅ Auto-correction
✅ Workflows archivés auto
✅ Documentation structurée
```

---

## 🔗 **LIENS RAPIDES**

### **Workflows:**
```
📦 MASTER-publish:
https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/MASTER-publish.yml

🧹 MASTER-cleanup:
https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/MASTER-cleanup-organize.yml

🔧 MASTER-auto-fix:
https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/MASTER-auto-fix-monitor.yml
```

### **Homey:**
```
🔑 Get HOMEY_PAT:
https://tools.developer.homey.app/api

📊 Developer Dashboard:
https://tools.developer.homey.app

🏪 App Store:
https://apps.homey.app/app/com.dlnraja.tuya.zigbee
```

### **GitHub:**
```
🔐 Secrets:
https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions

⚙️ Actions:
https://github.com/dlnraja/com.tuya.zigbee/actions
```

---

## 📊 **RÉSUMÉ**

```
✅ 3 workflows MASTER créés
✅ Système simplifié et efficace
✅ Publish: 2 méthodes (official + CLI)
✅ Cleanup: Automatique
✅ Monitoring: Toutes les 30 min
✅ Auto-fix: Intégré
✅ Documentation: Organisée

⚠️ REQUIS: HOMEY_PAT
   → https://tools.developer.homey.app/api
   → GitHub Secrets

📝 PROCHAINE ÉTAPE:
   1. Configurer HOMEY_PAT
   2. Lancer MASTER-publish
   3. Attendre 5 min
   4. Vérifier dashboard
```

---

**Date:** 2025-11-10 13:16  
**Version:** 4.9.328  
**Status:** ✅ **SYSTÈME MASTER PRÊT**  

---

# 🚀 **ACTION IMMÉDIATE:**

## **1. Configurer HOMEY_PAT**
👉 https://tools.developer.homey.app/api

## **2. Lancer MASTER-publish**
👉 https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/MASTER-publish.yml

## **3. Vérifier Dashboard**
👉 https://tools.developer.homey.app

**🎯 SYSTÈME MASTER = SIMPLICITÉ + EFFICACITÉ!** ✅
