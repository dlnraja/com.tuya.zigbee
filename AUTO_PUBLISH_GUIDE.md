# 🚀 AUTO-PUBLISH: Publication Automatique à Chaque Commit

## ✅ **ACTIVÉ!**

Chaque fois que tu `git push` vers `master`, l'app sera **automatiquement validée et publiée** sur le Homey App Store (channel: **test**).

---

## 🔄 **WORKFLOW AUTOMATIQUE**

### **Trigger:**
```bash
git add -A
git commit -m "fix: Mon changement"
git push origin master
```

### **Que se passe-t-il?**
```
1. ✅ Détection du push → Workflow démarre automatiquement
2. ✅ Validation Athom (level: publish)
3. ✅ Build de l'app (homey app build)
4. ✅ Publication sur Homey App Store (channel: test)
5. ✅ Création d'une GitHub Release automatique
6. ✅ Notification de succès (email Athom)
```

**Durée totale: ~8 minutes**

---

## 🛑 **SKIP PUBLISH (si nécessaire)**

### **Pour commit SANS publication:**

```bash
git commit -m "docs: Update README [skip ci]"
git push origin master
```

**Ou:**

```bash
git commit -m "chore: Cleanup [no publish]"
git push origin master
```

**Motifs pour skip:**
- Documentation uniquement
- Cleanup/refactoring
- Work in progress
- Tests locaux

---

## 📋 **FICHIERS IGNORÉS (pas de trigger)**

Le workflow **NE SE DÉCLENCHE PAS** si tu modifies seulement:

```
**.md                  (Documentation)
.github/**             (Workflows)
archive/**             (Archives)
tools/**               (Scripts)
docs/**                (Documentation)
```

**Pourquoi?** Éviter les publications inutiles pour des changements de docs!

---

## ✅ **VALIDATION AUTOMATIQUE**

### **Si validation OK:**
```
✅ Validation passed
✅ Build successful
✅ Published to Test channel
✅ GitHub Release created
✅ Email confirmation sent
```

### **Si validation ÉCHOUE:**
```
❌ Validation failed
❌ Publication skipped
❌ Check errors in GitHub Actions logs

Fix & push again → Auto-retry!
```

---

## 🎯 **WORKFLOW vs COMMIT**

### **Tu as maintenant 2 workflows:**

#### **1. Auto-Publish (Automatique)**
```yaml
Fichier: .github/workflows/auto-publish.yml
Trigger: Push vers master
Action: Valide + Publie automatiquement
Channel: Test
Skip: [skip ci] ou [no publish]
```

**Utilise pour:**
- ✅ Fixes de bugs
- ✅ Nouvelles features
- ✅ Hotfix urgent
- ✅ Tout changement de code

#### **2. Manual Workflow (Manuel)**
```yaml
Fichier: .github/workflows/validate-fix-publish.yml
Trigger: workflow_dispatch (bouton)
Action: Cleanup + Valide + Publie
Channel: Test ou Live
Options: force_publish
```

**Utilise pour:**
- ✅ Publication vers **Live** (production)
- ✅ Force publish si validation mineure échoue
- ✅ Cleanup + organization avant release majeure

---

## 📊 **EXEMPLE: WORKFLOW TYPIQUE**

### **Scénario: Bugfix urgent**

```bash
# 1. Fix le bug
vim lib/utils/battery-reader.js

# 2. Commit
git add lib/utils/battery-reader.js
git commit -m "fix(battery): Correct Tuya DP detection for _TZ3000_* devices"

# 3. Push
git push origin master
```

**Résultat automatique:**
```
⏱️  0min: Push détecté
⏱️  2min: Validation OK
⏱️  5min: Build OK
⏱️  8min: Publication OK
⏱️ 30min: Disponible dans Homey App Store (Test)
```

**Tu reçois un email:**
```
Subject: App submission received
Your app "Universal Tuya Zigbee" v4.9.322 has been submitted
Status: Processing → Available in Test channel
```

---

### **Scénario: Update docs uniquement**

```bash
# 1. Update README
vim README.md

# 2. Commit avec [skip ci]
git add README.md
git commit -m "docs: Update installation guide [skip ci]"

# 3. Push
git push origin master
```

**Résultat:**
```
✅ Push OK
🚫 Workflow skipped (docs only)
❌ Pas de publication (normal!)
```

---

### **Scénario: Promotion vers Live**

```bash
# App stable dans Test depuis 48h
# Aucun bug reporté
# Prêt pour production
```

**Action:**
1. Va sur: https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/validate-fix-publish.yml
2. Clique: **Run workflow**
3. Sélectionne: **channel: live**
4. Confirme: **Run workflow**

**Résultat:**
```
✅ Cleanup & organization
✅ Validation
✅ Publication vers LIVE (production)
✅ Email confirmation
✅ App disponible pour TOUS les users Homey!
```

---

## 🔒 **SÉCURITÉ**

### **HOMEY_PAT Secret:**

Le workflow utilise `${{ secrets.HOMEY_PAT }}` pour publier.

**Vérifier que le secret existe:**
1. GitHub → Settings → Secrets and variables → Actions
2. Repository secrets → `HOMEY_PAT`
3. Si absent → Créer avec ton Personal Access Token Athom

**Obtenir un PAT:**
1. https://tools.developer.homey.app/
2. Sign in avec compte Athom
3. Generate Personal Access Token
4. Copie le token
5. GitHub → Secrets → New secret → Name: `HOMEY_PAT` → Value: [ton token]

---

## 🐛 **TROUBLESHOOTING**

### **Problème: Workflow ne démarre pas**

**Causes possibles:**
```
❌ Commit message contient [skip ci]
❌ Modifications seulement dans fichiers ignorés (*.md)
❌ Branch n'est pas master
```

**Solution:**
```bash
# Vérifier branch
git branch  # Devrait afficher: * master

# Push vers master
git push origin master
```

---

### **Problème: Validation échoue**

**Causes possibles:**
```
❌ Erreurs dans app.json
❌ Drivers manquants
❌ Capabilities invalides
❌ Dependencies manquantes
```

**Solution:**
1. Check logs dans GitHub Actions
2. Fix erreurs
3. Commit & push → Auto-retry!

```bash
# Exemple: Fix app.json
vim app.json
git add app.json
git commit -m "fix: Correct app.json structure"
git push origin master  # Auto-publish retry!
```

---

### **Problème: Publication échoue**

**Causes possibles:**
```
❌ HOMEY_PAT secret manquant
❌ PAT expiré
❌ Version déjà publiée
❌ App rejetée par Athom
```

**Solution:**
```bash
# 1. Vérifier HOMEY_PAT dans GitHub Secrets
# 2. Re-générer PAT si expiré
# 3. Bump version dans app.json

vim app.json  # version: "4.9.323"
git add app.json
git commit -m "chore: Bump version to 4.9.323"
git push origin master  # Auto-publish avec nouvelle version!
```

---

### **Problème: Boucle infinie de commits**

**Si le workflow crée des commits qui triggent le workflow:**

**Protection activée:**
```yaml
# Le workflow utilise github-actions[bot]
# Tous ses commits ont automatiquement [skip ci]
# → Pas de boucle possible!
```

**Si quand même boucle:**
```bash
# Ajouter [skip ci] manuellement
git commit -m "fix: Something [skip ci]"
```

---

## 📈 **STATISTIQUES**

### **Avant Auto-Publish:**
```
1. Code locally
2. Commit
3. Push
4. Attendre
5. Aller sur GitHub Actions
6. Cliquer Run workflow
7. Sélectionner options
8. Confirmer
9. Attendre 10 min
10. Check email

Temps total: 15-20 min
Actions manuelles: 5
```

### **Après Auto-Publish:**
```
1. Code locally
2. Commit
3. Push

Temps total: 2 min (+ 8 min background)
Actions manuelles: 0
```

**Gain de temps: 90%!** 🚀

---

## 🎉 **AVANTAGES**

### **1. Rapidité**
✅ Push → Auto-publish en 8 min  
✅ Pas de clics manuels  
✅ Pas d'oublis

### **2. Fiabilité**
✅ Validation automatique avant publish  
✅ Pas de publication si erreurs  
✅ GitHub Release automatique

### **3. Traçabilité**
✅ Chaque version = 1 commit  
✅ Changelog automatique  
✅ Rollback facile (git revert)

### **4. Flexibilité**
✅ Skip avec [skip ci]  
✅ Manual workflow toujours disponible  
✅ Test → Live promotion facile

---

## 📋 **CHECKLIST PRE-COMMIT**

Avant chaque commit qui sera auto-publié:

- [ ] Code testé localement
- [ ] CHANGELOG.md mis à jour
- [ ] Version bumpée dans app.json (si nécessaire)
- [ ] Pas de console.log() debug oubliés
- [ ] Commit message clair et descriptif
- [ ] Si docs only → Ajouter [skip ci]

---

## 🎯 **BEST PRACTICES**

### **Commit Messages:**

```bash
# ✅ BON (auto-publish OK)
git commit -m "fix(battery): Correct Tuya DP detection"
git commit -m "feat(tuya): Add live update for TS0601"
git commit -m "hotfix: Emergency fix for crash"

# ✅ BON (skip publish)
git commit -m "docs: Update README [skip ci]"
git commit -m "chore: Cleanup code [no publish]"

# ❌ MAUVAIS (trop vague)
git commit -m "fix"
git commit -m "update"
git commit -m "changes"
```

### **Version Bumping:**

```bash
# Bugfix: x.x.X (patch)
4.9.322 → 4.9.323

# Feature: x.X.x (minor)
4.9.323 → 4.10.0

# Breaking: X.x.x (major)
4.10.0 → 5.0.0
```

### **Test → Live Workflow:**

```
1. Develop & commit → Auto-publish to Test
2. Monitor Test for 24-48h
3. If stable → Manual workflow → Live
4. Monitor Live for 1 week
5. Repeat!
```

---

## 🔗 **LIENS UTILES**

**Workflows:**
- Auto-Publish: https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/auto-publish.yml
- Manual: https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/validate-fix-publish.yml

**Homey Tools:**
- Developer Tools: https://tools.developer.homey.app/
- App Store: https://homey.app/en-us/app/com.dlnraja.tuya.zigbee/

**GitHub:**
- Releases: https://github.com/dlnraja/com.tuya.zigbee/releases
- Secrets: https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions

---

## ✅ **RÉSUMÉ**

### **Avant:**
```
git push → Rien → Attendre → GitHub → Clics → Attendre → Email
```

### **Maintenant:**
```
git push → AUTO-VALIDATE → AUTO-BUILD → AUTO-PUBLISH → Email ✅
```

**C'est tout! 🎉**

---

**Auto-Publish activé depuis:** v4.9.322  
**Workflow file:** `.github/workflows/auto-publish.yml`  
**Status:** ✅ ACTIF!  

---

**Prochaine action:**

```bash
# Commit ce nouveau workflow
git add .github/workflows/auto-publish.yml AUTO_PUBLISH_GUIDE.md
git commit -m "feat: Add auto-publish workflow on every push"
git push origin master

# Le workflow se déclenchera automatiquement!
# v4.9.322 sera publiée dans 8 minutes! 🚀
```
