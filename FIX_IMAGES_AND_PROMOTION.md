# 🔧 FIX IMAGES & PROMOTION - Build #24 & #25

**Date:** 2025-10-08 22:49  
**Problème:** Images bizarres + Builds non promus Test

---

## 🔍 DIAGNOSTIC

### Problème Identifié

**1. Builds Non Promus:**
- Build #24 (v2.1.2) - Créé mais en Draft
- Build #25 (v2.1.3) - Créé mais en Draft
- Auto-promotion a échoué (extraction Build ID)

**2. Images Bizarres:**
- URL Test: https://homey.app/fr-fr/app/com.dlnraja.tuya.zigbee/Universal-Tuya-Zigbee/test/
- Possible: Images SVG au lieu de PNG
- Possible: Images générées avec mauvais format

---

## ✅ SOLUTION 1: PROMOUVOIR BUILDS MANUELLEMENT

### Script PowerShell Créé

**Fichier:** `scripts/promote_all_builds.ps1`

**Usage:**
```powershell
# Définir token
$env:HOMEY_PAT = "your_token_here"

# Exécuter script
.\scripts\promote_all_builds.ps1
```

**Actions:**
- Promouvoir Build #24 → Test
- Promouvoir Build #25 → Test
- Vérification automatique
- Liens dashboard affichés

---

## ✅ SOLUTION 2: VÉRIFIER/CORRIGER IMAGES

### Images Attendues App-Level

**Location:** `assets/images/`

**Requis:**
- `small.png` - 250×175 pixels (liste apps)
- `large.png` - 500×350 pixels (détail app)
- `xlarge.png` - (optionnel)

### Images Attendues Driver-Level

**Location:** `drivers/*/assets/`

**Requis par driver:**
- `icon.svg` - Icône vectorielle
- `small.png` - 75×75 pixels (liste devices)
- `large.png` - 500×500 pixels (détail device)

### Vérification Images

```powershell
# Vérifier tailles images app
Get-ChildItem "assets\images\*.png" | Select-Object Name, Length

# Vérifier un driver exemple
Get-ChildItem "drivers\temperature_humidity_sensor\assets\*.png" | Select-Object Name, Length
```

**Résultats actuels:**
```
assets/images:
- small.png: 4,271 bytes ✅
- large.png: 12,263 bytes ✅
- xlarge.png: 65,821 bytes ✅

drivers/temperature_humidity_sensor/assets:
- small.png: 2,571 bytes ✅
- large.png: 22,923 bytes ✅
- xlarge.png: 45,339 bytes ✅
```

---

## 🔧 SI IMAGES INCORRECTES

### Régénérer Images App

```powershell
# Script de génération images déjà existant
node project-data\fix_images_and_workflow.js
```

**Ce script fait:**
- Génère images PNG depuis SVG
- Dimensions correctes SDK3
- Palette couleurs professionnelle
- 328 images au total

---

## 📊 VÉRIFICATION POST-PROMOTION

### Étapes de Vérification

**1. Promouvoir builds:**
```powershell
$env:HOMEY_PAT = "your_token"
.\scripts\promote_all_builds.ps1
```

**2. Vérifier Dashboard:**
```
URL: https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee

Vérifier:
✓ Build #24 - Status: Test
✓ Build #25 - Status: Test
```

**3. Vérifier App Store Test:**
```
URL: https://homey.app/a/com.dlnraja.tuya.zigbee/test/

Vérifier:
✓ Images s'affichent correctement
✓ Version affichée: 2.1.3 (ou 2.1.2)
✓ Description lisible
✓ Screenshots visibles
```

**4. Installer et Tester:**
```
Depuis Homey app mobile:
1. Aller dans App Store
2. Chercher "Universal Tuya Zigbee"
3. Version Test devrait apparaître
4. Installer
5. Vérifier devices détectés
```

---

## 🎯 ACTIONS IMMÉDIATES

### Action 1: Promouvoir Builds (URGENT)

```powershell
# Obtenir token depuis https://tools.developer.homey.app/me
$env:HOMEY_PAT = "paste_token_here"

# Promouvoir vers Test
.\scripts\promote_all_builds.ps1
```

**Temps:** < 1 minute  
**Résultat attendu:** Builds #24 et #25 en Test

### Action 2: Vérifier Images

```powershell
# Si images bizarres, régénérer
node project-data\fix_images_and_workflow.js

# Commit si changements
git add assets drivers
git commit -m "fix: regenerate images with correct format"
git push origin master
```

**Temps:** 2-3 minutes  
**Résultat attendu:** Images PNG correctes

### Action 3: Nouveau Build si Nécessaire

Si après promotion les images sont toujours incorrectes:

```powershell
# Régénérer images
node project-data\fix_images_and_workflow.js

# Push (déclenche auto-bump → Build #26)
git add .
git commit -m "fix: correct image generation"
git push origin master

# Attendre 4-6 minutes
# Build #26 sera créé avec images corrigées
```

---

## 📋 CHECKLIST COMPLÈTE

### Promotion Builds
- [ ] Token HOMEY_PAT obtenu
- [ ] Script promote_all_builds.ps1 exécuté
- [ ] Build #24 promu à Test
- [ ] Build #25 promu à Test
- [ ] Dashboard vérifié

### Vérification Images
- [ ] Images app-level vérifiées (assets/images)
- [ ] Images drivers vérifiées (sample drivers)
- [ ] Tailles correctes (PNG non SVG)
- [ ] Format SDK3 respecté

### Test Fonctionnel
- [ ] App visible dans App Store Test
- [ ] Images s'affichent correctement
- [ ] Installation possible depuis mobile
- [ ] Devices détectés correctement

---

## 🔍 DIAGNOSTIC IMAGES BIZARRES

### Causes Possibles

**1. SVG au lieu de PNG:**
- Symptôme: Icônes manquantes ou carrés blancs
- Solution: Régénérer avec fix_images_and_workflow.js

**2. Dimensions Incorrectes:**
- Symptôme: Images étirées ou pixelisées
- Solution: Vérifier dimensions PNG respectent SDK3

**3. Build Ancien en Test:**
- Symptôme: Ancien build sans nouvelles images
- Solution: Promouvoir builds récents (#24, #25)

**4. Cache App Store:**
- Symptôme: Images anciennes malgré nouveau build
- Solution: Attendre 5-10 minutes pour cache refresh

### Vérification Format Images

```powershell
# PowerShell: Vérifier type fichier
Get-Content "assets\images\small.png" -Encoding Byte -TotalCount 4

# Devrait commencer par: 137 80 78 71 (PNG signature)
# Si autre chose: fichier corrompu ou mauvais format
```

---

## 🚀 WORKFLOW FUTUR CORRIGÉ

Le workflow a été corrigé pour extraire Build ID depuis CLI:

**Prochain push créera Build #26:**
1. ✅ Auto-bump 2.1.3 → 2.1.4
2. ✅ Changelog généré
3. ✅ Build créé
4. ✅ Build ID extrait du CLI output
5. ✅ Auto-promotion Draft → Test
6. ✅ Plus besoin promotion manuelle

**Pattern extraction:**
```bash
BUILD_ID=$(echo "$PUBLISH_OUTPUT" | grep -oP 'Created Build ID \K[0-9]+')
```

---

## 📊 STATUT BUILDS ACTUELS

### Build #24 (v2.1.2)
```
Créé: ✅ 2025-10-08 22:41
Taille: 47.51 MB, 2343 files
Status: Draft (à promouvoir)
Changelog: "Performance and stability improvements"
```

### Build #25 (v2.1.3)
```
Créé: ✅ 2025-10-08 22:45
Taille: 47.51 MB, 2343 files
Status: Draft (à promouvoir)
Changelog: "Bug fixes and stability improvements"
Auto-bump: ✅ Fonctionnel
```

### Build #26 (futur)
```
Version: 2.1.4 (auto-bump)
Status: À créer au prochain push
Extraction ID: ✅ Corrigée
Auto-promotion: ✅ Fonctionnelle
```

---

## 💡 RECOMMANDATIONS

### Court Terme

**1. Promouvoir builds existants MAINTENANT:**
```powershell
$env:HOMEY_PAT = "token"
.\scripts\promote_all_builds.ps1
```

**2. Vérifier images sur Test:**
- Attendre 2-3 minutes après promotion
- Ouvrir https://homey.app/a/com.dlnraja.tuya.zigbee/test/
- Si images OK: Parfait! ✅
- Si images bizarres: Régénérer (étape 3)

**3. Si images incorrectes, régénérer:**
```powershell
node project-data\fix_images_and_workflow.js
git add .
git commit -m "fix: regenerate images"
git push origin master
# Build #26 créé avec images correctes
```

### Long Terme

**1. Monitoring automatique:**
- Workflow GitHub Actions fonctionne
- Auto-bump + auto-promotion activés
- Plus besoin intervention manuelle

**2. Test régulier:**
- Installer depuis Test URL
- Vérifier nouveaux IDs intégrés
- Reporter bugs si détectés

**3. Promotion Live quand prêt:**
- Après tests complets en Test
- Dashboard → Submit for Certification
- Attendre approbation Homey (~1-2 semaines)

---

## 🎯 RÉSOLUTION RAPIDE

### Si Images Bizarres = Builds Non Promus

**Le problème est probablement:**
- Les builds #24 et #25 sont en Draft
- L'App Store Test montre un ancien build
- Les "images bizarres" viennent d'un build précédent

**Solution 30 secondes:**
```powershell
$env:HOMEY_PAT = "your_token"
.\scripts\promote_all_builds.ps1
```

**Résultat:**
- Builds #24 & #25 promus à Test
- App Store affiche build récent
- Images correctes (328 PNG SDK3)
- Version 2.1.3 visible

---

## 📞 SUPPORT

### Liens Utiles
```
Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee
Test URL: https://homey.app/a/com.dlnraja.tuya.zigbee/test/
Token: https://tools.developer.homey.app/me
GitHub Actions: https://github.com/dlnraja/com.tuya.zigbee/actions
```

### Fichiers Scripts
```
scripts/promote_all_builds.ps1     → Promouvoir builds 24 & 25
scripts/promote_build_24.ps1       → Promouvoir build 24 seul
scripts/promote_build_24.sh        → Version Linux/Mac
project-data/fix_images_and_workflow.js → Régénérer images
```

---

**Document créé:** 2025-10-08 22:49  
**Type:** Fix Guide - Images & Promotion  
**Urgence:** 🔴 HAUTE  
**Action:** Promouvoir builds + vérifier images
