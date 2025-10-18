# 📋 Validation Guide - Homey SDK3

**Guide complet pour validation publish - Basé sur découvertes 18 Oct 2025**

---

## 🎯 Validation Rapide

```bash
# One-liner: Check everything
node scripts/validation/pre-publish-check.js
```

Si erreurs détectées, corriger automatiquement:
```bash
node scripts/validation/fix-driver-images-object.js
node scripts/validation/fix-app-image-dimensions.js
```

---

## 📐 Specs Images - MÉMORISEZ!

### **App Images** (`/assets/images/`)

```
small.png:  250 x 175
large.png:  500 x 350  ← CRITIQUE: PAS 500x500!
xlarge.png: 1000 x 700
```

### **Driver Images** (`/drivers/{id}/assets/images/`)

```
small.png:  75 x 75
large.png:  500 x 500  ← Différent de app!
xlarge.png: 1000 x 1000
```

**Erreur commune:** Confondre dimensions app et driver!

---

## ✅ Checklist Pre-Publish

- [ ] App large.png = 500x350 (pas 500x500)
- [ ] Chaque driver a objet images dans app.json
- [ ] Tous drivers Zigbee ont learnmode
- [ ] Flow card IDs uniques
- [ ] Clean .homeybuild cache
- [ ] `homey app validate --level publish` PASSED

---

## 🔧 Fixes Automatiques

### Fix Images Object

```bash
node scripts/validation/fix-driver-images-object.js
```

Ajoute objet images pour tous drivers avec chemins corrects.

### Fix App Image Dimensions

```bash
node scripts/validation/fix-app-image-dimensions.js
```

Corrige dimensions images app (surtout large.png → 500x350).

### Add Learnmode

```bash
node scripts/fixes/add-learnmode-to-all-drivers.js
```

Ajoute learnmode à tous drivers Zigbee.

---

## 🚨 Erreurs Validation Courantes

### `Invalid image size (250x175) drivers.{id}.small`

**Cause:** Objet images manquant dans app.json  
**Fix:** `node scripts/validation/fix-driver-images-object.js`

### `Invalid image size (500x500): assets/images/large.png`

**Cause:** App large.png doit être 500x350  
**Fix:** `node scripts/validation/fix-app-image-dimensions.js`

### `Duplicate flow card ID`

**Cause:** Flow card ID utilisé plusieurs fois  
**Fix:** `node scripts/fixes/fix-all-duplicate-flow-ids.js`

---

## 📚 Références

- **Specs complètes:** `references/HOMEY_SDK3_COMPLETE_SPECS.json`
- **Success story:** `VALIDATION_SUCCESS_SUMMARY.md`
- **Memories:** 4 memories créées avec découvertes critiques

---

**Note:** Ces découvertes ont résolu validation publish pour 183 drivers le 18 Oct 2025!
