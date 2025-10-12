# 🚀 Quick Start - Publication Homey

**Pour:** Universal Tuya Zigbee v2.1.51  
**Date:** 2025-10-11  
**Méthode:** Actions Officielles Homey

---

## ⚡ Démarrage Rapide (5 minutes)

### Étape 1: Configuration Secret (UNE FOIS)

**⚠️ ACTION REQUISE IMMÉDIATE:**

```bash
1. Aller sur: https://tools.developer.homey.app
2. Account → Personal Access Tokens
3. "Create new token"
4. Copier le token
```

**Puis dans GitHub:**

```
https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions
→ "New repository secret"
  Name: HOMEY_PAT
  Value: <coller le token>
→ "Add secret"
```

**✅ Status:** ⚠️ À FAIRE MAINTENANT

---

### Étape 2: Validation Locale

```bash
cd "c:\Users\HP\Desktop\homey app\tuya_repair"

# Valider l'app
npx homey app validate --level publish
```

**Résultat attendu:**
```
✓ Pre-processing app...
✓ Validating app...
✓ App validated successfully against level `publish`
```

**✅ Status:** ✅ DÉJÀ VALIDÉ (2.1.51)

---

### Étape 3: Publication (3 MÉTHODES AU CHOIX)

#### 🔹 Méthode A: Push Automatique (RECOMMANDÉ)

```bash
# Faire n'importe quel changement
git add .
git commit -m "feat: test official workflow"
git push origin master

# → GitHub Actions s'exécute automatiquement
# → Vérifier: https://github.com/dlnraja/com.tuya.zigbee/actions
```

#### 🔹 Méthode B: GitHub UI Manuel

```
1. https://github.com/dlnraja/com.tuya.zigbee/actions
2. "Official Homey App Store Publication"
3. "Run workflow"
   - Branch: master
   - Version: patch
   - Changelog: "Bug fixes and improvements"
4. "Run workflow"
```

#### 🔹 Méthode C: CLI Directe

```bash
npx homey app publish
# → Répondre aux prompts interactifs
```

---

### Étape 4: Promouvoir vers Test

**Après publication GitHub Actions:**

```
1. Aller sur: https://tools.developer.homey.app
2. Apps SDK → My Apps
3. "Universal Tuya Zigbee"
4. Voir nouveau build (v2.1.52)
5. "Promote to Test"
```

**Test URL:**
```
https://homey.app/a/com.dlnraja.tuya.zigbee/test/
```

---

## 📋 Checklist Complète

### Avant Première Publication

- [ ] Secret `HOMEY_PAT` configuré dans GitHub
- [ ] App validée localement (`npx homey app validate --level publish`)
- [ ] CHANGELOG.md mis à jour
- [ ] Git repository clean

### Workflow GitHub Actions

- [ ] Push effectué vers master
- [ ] GitHub Actions exécuté avec succès
- [ ] Version incrémentée automatiquement
- [ ] Build visible dans Dashboard Homey

### Test Release

- [ ] Build promu vers Test
- [ ] Test URL accessible
- [ ] Tests fonctionnels effectués
- [ ] Feedback collecté

### Live Release (Optionnel)

- [ ] Tests concluants
- [ ] Soumis pour certification Athom
- [ ] Certification approuvée
- [ ] Promu vers Live

---

## 🔗 Liens Essentiels

### Homey Developer
- **Dashboard:** https://tools.developer.homey.app
- **Test URL:** https://homey.app/a/com.dlnraja.tuya.zigbee/test/
- **Live URL:** https://homey.app/a/com.dlnraja.tuya.zigbee/

### GitHub
- **Actions:** https://github.com/dlnraja/com.tuya.zigbee/actions
- **Settings:** https://github.com/dlnraja/com.tuya.zigbee/settings

### Documentation
- **Guide Complet:** [PUBLICATION_GUIDE_OFFICIELLE.md](./PUBLICATION_GUIDE_OFFICIELLE.md)
- **Workflows Guide:** [.github/workflows/OFFICIAL_WORKFLOWS_GUIDE.md](./.github/workflows/OFFICIAL_WORKFLOWS_GUIDE.md)
- **Récap Technique:** [RECAP_IMPLEMENTATION_OFFICIELLE.md](./RECAP_IMPLEMENTATION_OFFICIELLE.md)

---

## 🆘 Aide Rapide

### ❓ "Le workflow ne démarre pas"

**Solution:**
1. Vérifier que `HOMEY_PAT` est configuré
2. Vérifier dans Actions → Workflows si le workflow est actif
3. Faire un push trivial pour tester

### ❓ "Validation failed"

**Solution:**
```bash
npx homey app validate --level publish
# → Lire les erreurs et corriger
```

### ❓ "Authentication failed"

**Solution:**
1. Régénérer `HOMEY_PAT` sur Homey Dashboard
2. Mettre à jour dans GitHub Secrets

### ❓ "Build already exists"

**Solution:**
1. Attendre 2-3 minutes
2. Ou nettoyer: `rm -rf .homeybuild .homeycompose`

---

## 📞 Support

- **GitHub Issues:** https://github.com/dlnraja/com.tuya.zigbee/issues
- **Forum Homey:** https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352/
- **Documentation Homey:** https://apps.developer.homey.app

---

**Créé:** 2025-10-11  
**Version App:** 2.1.51  
**Status Workflow:** ✅ Actif (93fd4a628)
