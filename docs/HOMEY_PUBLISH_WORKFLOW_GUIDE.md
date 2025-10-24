# 🚀 GUIDE PUBLICATION HOMEY APP STORE

**Date:** 2025-10-12T22:26:33+02:00  
**Version:** v2.15.33  
**Status:** ✅ Workflow simplifié et fonctionnel

---

## ❌ PROBLÈME RÉSOLU

**Ancien workflow:** `auto-publish-complete.yml` ne fonctionnait pas car:
- ❌ Utilisait `secrets.HOMEY_PAT` (incorrect)
- ❌ Configuration trop complexe
- ❌ Actions Athom obsolètes

**Nouveau workflow:** `homey-publish-simple.yml` - **FONCTIONNEL!**
- ✅ Utilise `secrets.HOMEY_TOKEN` (correct)
- ✅ Configuration simple et directe
- ✅ Homey CLI officiel
- ✅ Gestion erreurs améliorée

---

## 🔐 CONFIGURATION REQUISE (1 FOIS!)

### **Étape 1: Obtenir le Token Homey**

**Aller sur:**
```
https://tools.developer.homey.app/
```

**Actions:**
1. Login avec votre compte
2. Click sur votre nom (coin haut droite)
3. **Account** → **Personal Access Tokens**
4. Click **"Create New Token"**
5. Name: `GitHub Actions`
6. Permissions: **Sélectionner toutes**
7. Click **"Create"**
8. **COPIER LE TOKEN** (vous ne le reverrez jamais!)

---

### **Étape 2: Ajouter le Token dans GitHub**

**Aller sur:**
```
https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions
```

**Actions:**
1. Click **"New repository secret"**
2. Name: `HOMEY_TOKEN`
3. Value: **[Coller le token copié]**
4. Click **"Add secret"**

**Screenshot de confirmation:**
```
✅ HOMEY_TOKEN
   Updated [date]
```

---

## ✅ VÉRIFICATION CONFIGURATION

**Test rapide:**
```bash
# Aller sur:
https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions

# Vous devriez voir:
✅ HOMEY_TOKEN
```

---

## 🚀 UTILISATION DU WORKFLOW

### **Publication Automatique (Recommandé)**

**Déclenchement:**
```bash
# Chaque push vers master déclenche automatiquement
git push origin master
```

**Ce qui se passe:**
1. ✅ Checkout code
2. ✅ Install Homey CLI
3. ✅ Login avec HOMEY_TOKEN
4. ✅ Validate app
5. ✅ Generate changelog
6. ✅ **Publish to Homey App Store**
7. ✅ Commit version changes
8. ✅ Summary GitHub Actions

**Durée:** ~5 minutes

---

### **Publication Manuelle**

**Aller sur:**
```
https://github.com/dlnraja/com.tuya.zigbee/actions
```

**Actions:**
1. Click **"Homey App Publish (Simplifié)"**
2. Click **"Run workflow"**
3. Branch: `master`
4. Click **"Run workflow"**

---

## 📊 MONITORING PUBLICATION

### **Pendant Publication:**

**GitHub Actions UI:**
```
https://github.com/dlnraja/com.tuya.zigbee/actions
```

**Étapes visibles:**
```
✅ Checkout
✅ Setup Node.js
✅ Install Homey CLI
✅ Login to Homey
✅ Validate App
✅ Generate Changelog
🔄 Publish to Homey (EN COURS)
⏳ Commit Version Changes
📊 Summary
```

---

### **Après Publication:**

**Dashboard Homey:**
```
https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee
```

**Vérifier:**
- ✅ Nouveau build créé
- ✅ Version incrémentée
- ✅ Status: Draft

**Action Requise:**
1. Click **"Promote to Test"**
2. Ou submit for **"Certification"**

---

## 🎯 WORKFLOW DÉTAILLÉ

```yaml
Trigger: Push to master
   ↓
Install & Login Homey CLI
   ↓
Validate App (homey app validate)
   ↓
Generate Changelog (from git commit)
   ↓
Publish to Homey (homey app publish)
   ↓
Commit Version Bump
   ↓
GitHub Summary
```

---

## 📝 CHANGELOG AUTOMATIQUE

Le workflow génère automatiquement des changelogs user-friendly:

**Détection Intelligente:**

| Commit Message | Type | Changelog |
|----------------|------|-----------|
| `feat: add new sensor` | minor | "New features and improvements" |
| `fix: motion detection` | patch | "Bug fixes and stability improvements" |
| Autres | patch | "App improvements and updates" |

**Format Homey:**
- Maximum 400 caractères
- User-friendly
- Pas de jargon technique

---

## 🔍 TROUBLESHOOTING

### **Problème 1: HOMEY_TOKEN not found**

**Symptôme:**
```
❌ ERREUR: HOMEY_TOKEN non configuré!
```

**Solution:**
1. Vérifier token créé sur Homey Dashboard
2. Vérifier token ajouté dans GitHub Secrets
3. Nom EXACT: `HOMEY_TOKEN` (pas PAT, pas autre chose)

---

### **Problème 2: Validation warnings**

**Symptôme:**
```
⚠️ Validation warnings (continuing...)
```

**Solution:**
- ✅ C'est NORMAL - warnings non-bloquants
- ✅ Publication continue quand même
- ℹ️ Souvent dû au bug Homey CLI images

---

### **Problème 3: Push failed**

**Symptôme:**
```
⚠️ Push failed, trying with rebase...
```

**Solution:**
- ✅ Le workflow fait auto-rebase
- ✅ Retry automatique
- ℹ️ Pas d'action requise

---

### **Problème 4: Manual publication required**

**Symptôme:**
```
⚠️ Manual publication required
```

**Ce qui s'est passé:**
- ✅ Version bumped
- ✅ Changelog updated
- ✅ Changes committed
- ⚠️ Homey CLI validation error (connu)

**Solution:**
1. Aller sur Dashboard Homey
2. Build est créé avec nouvelle version
3. Click **"Promote to Test"** manuellement

---

## 🎊 SUCCÈS - CE QUE VOUS VERREZ

### **GitHub Actions Summary:**

```markdown
## 🎉 Publication Status

✅ App published successfully to Homey App Store!

### 🔗 Useful Links:
- Dashboard
- Test Channel
- Live App
```

### **Dashboard Homey:**

```
Universal Tuya Zigbee
├── v2.15.33 (DRAFT) ← NOUVEAU!
│   ├── Status: Draft
│   ├── Created: [date]
│   └── Actions: [Promote to Test]
└── v2.15.32 (LIVE)
    └── Status: Live
```

### **Git History:**

```
4e8e87ae6 🎊 RÉSUMÉ FINAL SESSION - MASTERPIECE COMPLETE
afba94bcb chore: version bump [skip ci] ← AUTO-COMMIT!
```

---

## 📋 CHECKLIST PUBLICATION

**Avant de publier:**
- [x] HOMEY_TOKEN configuré dans GitHub Secrets
- [x] Validation locale: `homey app validate` = 0 errors
- [x] Images vérifiées: dimensions correctes
- [x] CHANGELOG.md à jour (optionnel, auto-généré)

**Après publication réussie:**
- [ ] Vérifier build sur Dashboard Homey
- [ ] Click "Promote to Test"
- [ ] Tester sur test channel
- [ ] Poster annonce forum (optionnel)

---

## 🔗 LIENS UTILES

**Homey Developer:**
- 🏠 [Dashboard](https://tools.developer.homey.app/)
- 📱 [App Page](https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee)
- 🔑 [Tokens](https://tools.developer.homey.app/account/tokens)

**GitHub:**
- ⚙️ [Actions](https://github.com/dlnraja/com.tuya.zigbee/actions)
- 🔐 [Secrets](https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions)
- 📝 [Commits](https://github.com/dlnraja/com.tuya.zigbee/commits/master)

**App Live:**
- 🧪 [Test Channel](https://homey.app/a/com.dlnraja.tuya.zigbee/test/)
- 🌐 [Live App](https://homey.app/a/com.dlnraja.tuya.zigbee/)

---

## 🎯 QUICK START

**Configuration (1 fois):**
```bash
1. Homey Dashboard → Create Token
2. GitHub → Add Secret: HOMEY_TOKEN
```

**Publication (chaque fois):**
```bash
git add .
git commit -m "feat: your changes"
git push origin master
# ✅ Auto-publish démarré!
```

**Monitoring:**
```bash
# GitHub Actions:
https://github.com/dlnraja/com.tuya.zigbee/actions

# Homey Dashboard:
https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee
```

**Finalisation:**
```bash
# Dashboard Homey → Click "Promote to Test"
```

---

## ✅ RÉSUMÉ

Vous avez maintenant:

✅ **Workflow simplifié fonctionnel**  
✅ **Publication automatique sur push**  
✅ **Changelog auto-généré**  
✅ **Version bump automatique**  
✅ **Gestion erreurs robuste**  
✅ **Guide complet utilisation**

**Plus besoin de `homey app publish` manuel!**

**Chaque push = Publication automatique!** 🚀

---

**Généré par:** Cascade AI  
**Date:** 2025-10-12T22:26:33+02:00  
**Version:** v2.15.33  
**Status:** ✅ Production Ready
