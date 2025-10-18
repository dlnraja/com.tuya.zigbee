# 🚀 START HERE - New Developers Guide

**Universal Tuya Zigbee App - Homey SDK3**

---

## 📋 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Check everything is OK
node scripts/validation/pre-publish-check.js

# 3. Build & validate
Remove-Item -Recurse -Force .homeybuild
homey app build
homey app validate --level publish
```

---

## ⚠️ PIÈGES CRITIQUES

### 🖼️ **1. Dimensions Images**

**DÉCOUVERTE CRITIQUE:** App large.png = **500x350** (PAS 500x500!)

| Type | small | large | xlarge |
|------|-------|-------|--------|
| **App** | 250x175 | **500x350** | 1000x700 |
| **Driver** | 75x75 | **500x500** | 1000x1000 |

**Fix:** `node scripts/validation/fix-app-image-dimensions.js`

### 📝 **2. Objet Images Required**

Chaque driver doit avoir dans app.json:
```json
{
  "images": {
    "small": "/drivers/{id}/assets/images/small.png",
    "large": "/drivers/{id}/assets/images/large.png",
    "xlarge": "/drivers/{id}/assets/images/xlarge.png"
  }
}
```

**Fix:** `node scripts/validation/fix-driver-images-object.js`

### 🔨 **3. Cache .homeybuild**

TOUJOURS clean avant validation:
```bash
Remove-Item -Recurse -Force .homeybuild
homey app build
```

---

## 📚 Documentation

- **`references/HOMEY_SDK3_COMPLETE_SPECS.json`** - Specs officielles
- **`VALIDATION_SUCCESS_SUMMARY.md`** - Guide résolution problèmes
- **Scripts validation:** `scripts/validation/`

---

## 🛠️ Scripts Utiles

```bash
# Validation complète
node scripts/validation/pre-publish-check.js

# Fixes automatiques
node scripts/validation/fix-driver-images-object.js
node scripts/validation/fix-app-image-dimensions.js

# Build
Remove-Item -Recurse -Force .homeybuild
homey app build
homey app validate --level publish
```

---

**Ready!** Pour plus de détails: `VALIDATION_SUCCESS_SUMMARY.md`
