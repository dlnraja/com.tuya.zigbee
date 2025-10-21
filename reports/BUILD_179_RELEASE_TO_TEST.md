# 🚀 BUILD 179 v2.15.107 - RELEASE TO TEST

**Date:** 2025-10-15  
**Build:** 179  
**Version:** 2.15.107  
**Status:** 📦 **DRAFT** → ⏳ **À PUBLIER EN TEST**

---

## 🔍 STATUT ACTUEL

### Build 179 Créé ✅
- ✅ Version: 2.15.107
- ✅ Size: 47.1 MB
- ✅ SDK: 3
- ✅ Validation: PASSED
- ✅ 183 drivers
- ✅ 366 images personnalisées incluses

### Mode Actuel
🔴 **DRAFT** - Les images ne sont PAS encore visibles car l'app n'est pas en mode TEST

---

## ⚠️ PROBLÈME

Les images personnalisées ont été **CRÉÉES et PUSHÉES** avec succès (commit b65f5e177), MAIS:

1. Le Build 179 est en mode **DRAFT**
2. Les utilisateurs ne peuvent pas voir l'app en mode DRAFT
3. Les images personnalisées ne seront visibles QUE quand l'app sera en mode **TEST**

---

## ✅ SOLUTION - RELEASE TO TEST

### Action Requise sur Developer Portal

1. **Aller sur:** https://tools.developer.homey.app/
2. **Naviguer vers:** My Apps → com.dlnraja.tuya.zigbee → Build 179
3. **Cliquer:** "Release to Test" (ou équivalent)
4. **Confirmer** la publication

### Après Release to Test

Les nouvelles images personnalisées seront **IMMÉDIATEMENT** visibles:
- 🔴 Motion sensors - Rouge + 🔋
- 🟦 Contact sensors - Cyan + 🔋
- 🔘 Switches - Gris + ⚡
- 💡 Lights - Jaune + ⚡
- etc.

---

## 🎨 IMAGES PERSONNALISÉES INCLUSES

### Build 179 Contient:

**366 images PNG personnalisées:**
- Motion sensors: Fond rouge, icône 👁️, badge 🔋
- Contact sensors: Fond cyan, icône 🚪, badge 🔋
- Temperature: Fond orange, icône 🌡️, badge 🔋
- Switches: Fond gris, icône 🔘, badge ⚡
- Lights: Fond jaune, icône 💡, badge ⚡
- Etc. (20+ types différents)

**Chaque driver a:**
- ✅ small.png (75x75) - Image unique
- ✅ large.png (500x500) - Image unique
- ✅ Couleur selon type
- ✅ Badge selon énergie (🔋 battery ou ⚡ AC)

---

## 📊 VÉRIFICATION POST-RELEASE

### URLs à Vérifier (après release to test)

**Test App:**
```
https://homey.app/a/com.dlnraja.tuya.zigbee/test/
```

**CDN Build 179:**
```
https://apps.homeycdn.net/app/com.dlnraja.tuya.zigbee/179/[hash]/
```

**Exemples d'images à vérifier:**
```
.../drivers/motion_sensor_battery/assets/images/small.png  → 🔴 Rouge
.../drivers/smart_switch_1gang_ac/assets/images/small.png  → 🔘 Gris
.../drivers/temperature_sensor_battery/assets/images/small.png  → 🟠 Orange
```

---

## 🔄 ALTERNATIVE - AUTO-PUBLISH

Si vous avez coché **"Automatically Publish after Approval"** sur le developer portal:
- L'app passera automatiquement en TEST après validation
- Sinon, action manuelle requise

---

## 📋 CHECKLIST FINALE

### Avant Release to Test
- [x] Build 179 créé
- [x] 366 images personnalisées générées
- [x] Commit et push réussis
- [x] Validation Homey PASSED
- [x] Size: 47.1 MB (OK)

### Après Release to Test
- [ ] App visible sur https://homey.app/a/com.dlnraja.tuya.zigbee/test/
- [ ] Images personnalisées visibles pour chaque driver
- [ ] Différentes couleurs selon type
- [ ] Badges énergie visibles

---

## 🎯 INSTRUCTIONS DÉTAILLÉES

### Étape 1: Release to Test
1. Aller sur https://tools.developer.homey.app/tools/apps
2. Cliquer sur "Universal Tuya Zigbee"
3. Voir "Build 179 (v2.15.107)" en mode DRAFT
4. Cliquer sur "Release to Test" ou bouton similaire
5. Confirmer

### Étape 2: Vérification
1. Attendre 1-2 minutes (propagation CDN)
2. Aller sur https://homey.app/a/com.dlnraja.tuya.zigbee/test/
3. Naviguer vers un driver (ex: motion_sensor_battery)
4. Vérifier l'image - devrait être ROUGE avec 👁️ et 🔋

### Étape 3: Confirmation
Si les images sont correctes:
- ✅ Tout fonctionne!
- ✅ Prêt pour certification

Si les images sont toujours génériques:
- Vérifier le build number affiché
- Vider cache navigateur (Ctrl+F5)
- Attendre 5-10 minutes supplémentaires

---

## ⚡ RÉSUMÉ

**Problème:** Build 179 en mode DRAFT → Images pas visibles  
**Solution:** Release to Test via developer portal  
**Résultat attendu:** 366 images personnalisées visibles immédiatement  
**Durée:** ~2 minutes

---

**Build:** 179  
**Version:** 2.15.107  
**Status:** ⏳ **ATTENTE RELEASE TO TEST**  
**Action:** 👆 **MANUEL - VIA DEVELOPER PORTAL**

🎊 **Les images personnalisées sont PRÊTES et attendent juste la publication en TEST!** 🎊
