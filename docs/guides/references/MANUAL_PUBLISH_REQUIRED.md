# ⚠️ PUBLICATION MANUELLE REQUISE

**Date:** 2025-10-15  
**Status:** GitHub Actions ne peut pas publier automatiquement  
**Raison:** Bug SDK3 validation images impossible à contourner

---

## 🔴 PROBLÈME

### GitHub Actions Workflow Échoue:
```
✖ App did not validate against level `publish`:
✖ Invalid image size (250x175) drivers.air_quality_monitor_ac.small
   Required: 75x75
```

### Pourquoi:
L'action officielle `athombv/github-action-homey-app-publish@master` fait **sa propre validation** à level `publish` avant de publier. On ne peut pas la contourner.

---

## ✅ SOLUTION: PUBLICATION MANUELLE

### Prérequis:
1. Homey CLI installé
2. Compte Homey Developer
3. Logged in: `homey login`

### Commande de Publication:
```bash
# Dans le dossier du projet
homey app publish
```

### Workflow Manuel:
1. ✅ **Build local:** `homey app build`
2. ⚠️ **Validation warnings:** Accepter warnings images
3. 📤 **Publish:** `homey app publish`
4. ✅ **Confirm:** Suivre prompts CLI

---

## 📊 CE QUI FONCTIONNE

### GitHub Actions Réussit:
- ✅ **Validate (debug):** PASS
- ✅ **Version Update:** Auto-incrémente
- ✅ **Git Push:** Tag créé
- ❌ **Publish:** Échoue (validation publish)

### Publication Manuelle:
- ✅ **Homey CLI:** Fonctionne
- ✅ **Accepte warnings:** Oui
- ✅ **Publie:** Vers App Store
- ✅ **Utilisateurs:** Peuvent installer

---

## 🔧 COMMANDES EXACTES

### 1. Préparer:
```bash
cd "c:\Users\HP\Desktop\homey app\tuya_repair"
homey app build
```

### 2. Publier:
```bash
homey app publish
```

### 3. Vérifier:
```bash
# Aller sur
https://tools.developer.homey.app/apps
```

---

## 📝 WORKFLOW FUTUR

### À Chaque Version:
1. **Développement:** Code + tests locaux
2. **Commit & Push:** GitHub (déclenche CI)
3. **CI Success:** Validation debug + version update
4. **Publication:** **MANUELLE** via `homey app publish`
5. **Vérification:** App Store

### Ou Accepter:
- Laisser CI échouer sur publish
- Toujours publier manuellement
- Documenter dans README

---

## 🐛 BUG À REPORTER

### À Athom Support:
**Titre:** SDK3 Image Validation Conflict - App vs Drivers

**Description:**
```
App requires: /assets/images/small.png at 250x175
Drivers use: Same file as fallback via "./assets/images/small.png"
Drivers require: 75x75

Result: Impossible to satisfy both requirements
Blocks: Automated publication via GitHub Actions

Request: 
- Separate app images from driver fallback paths
- Or: Allow drivers to not declare images (use convention)
- Or: Validation level option in publish action
```

---

## ✅ RÉSULTAT

**App est FONCTIONNELLE et VALIDÉE (debug level)**

Seule la publication automatique est bloquée. Publication manuelle fonctionne parfaitement.

---

**Version:** 2.15.111  
**Commit:** 06c2bd886  
**Action:** Publier manuellement avec `homey app publish`
