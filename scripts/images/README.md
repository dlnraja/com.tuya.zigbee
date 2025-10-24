# 🎨 Intelligent Image Generation System

**Système de génération d'images personnalisées selon Homey SDK3**

---

## 🚀 Quick Start

```bash
# Vérifier images actuelles
npm run images:verify

# Régénérer TOUTES les images (183 drivers)
npm run images:regenerate

# Générer pour un driver spécifique
npm run images:generate -- driver_id

# Vérifier après régénération
npm run images:verify && npm run validate:publish
```

---

## 📐 Specs Homey SDK3 (CRITIQUES)

### **Driver Images** (découvertes 18 Oct 2025)

```
small.png:  75 x 75    (pairing wizard icon)
large.png:  500 x 500  (device in app)
xlarge.png: 1000 x 1000 (high resolution)
```

⚠️ **NE PAS confondre avec app images** (250x175, 500x350, 1000x700)

---

## 🎨 Personnalisation Automatique

### **Détection Type d'Appareil**

Le système détecte automatiquement le type et applique:
- **Couleurs**: Gradient contextuel
- **Icône**: Emoji représentatif  
- **Texte**: Nom localisé

**Types détectés:**
- 📊 Sensor (vert)
- 🏃 Motion (bleu)
- 🚪 Contact (orange)
- 🎚️ Switch (violet)
- 💡 Light (jaune)
- 🚨 Alarm (rouge)
- 🌡️ Temperature (rose)
- 💦 Humidity (cyan)
- 📱 Remote (violet foncé)
- 🪟 Curtain (marron)

### **Détection Type d'Alimentation**

Overlay automatique dans coin supérieur droit:
- 🔋 **Battery** (vert) - CR2032, CR2450, AAA, etc.
- ⚡ **AC Power** (orange) - 230V, 110V, mains
- 🔌 **DC Power** (bleu) - 12V, 24V, adapter
- 🔄 **Hybrid** (violet) - Dual power, backup
- 🔌 **USB** (cyan) - USB, USB-C

**Détection depuis:**
- Driver ID
- Nom du driver
- Mots-clés

---

## 🛠️ Scripts Disponibles

### 1. **intelligent-image-generator.js**

Génère images personnalisées pour un ou tous les drivers.

**Features:**
- Gradient selon type appareil
- Icon emoji contextuel
- Nom du device (si large/xlarge)
- Badge alimentation (si large/xlarge)
- Badge Tuya/Zigbee (si xlarge)
- Border radius moderne
- Shadows et effects

**Usage:**
```bash
# Un driver
node scripts/images/intelligent-image-generator.js motion_sensor_pir_battery

# Tous les drivers (pas recommandé directement, utiliser batch)
node scripts/images/intelligent-image-generator.js
```

### 2. **batch-regenerate-all.js**

Régénération massive avec parallélisation.

**Features:**
- 10 workers parallèles
- Progress bar temps réel
- Error handling robuste
- Stats complètes

**Usage:**
```bash
npm run images:regenerate

# Ou directement
node scripts/images/batch-regenerate-all.js
```

**Output:**
```
🚀 BATCH REGENERATE ALL DRIVER IMAGES
Parallelization: 10 workers
[100%] 183/183 drivers | 0 errors

📊 FINAL SUMMARY:
  ✅ Successfully generated: 549 images
  📁 Drivers processed: 183/183
  ❌ Errors: 0
  ⏱️  Duration: 45.3s
  ⚡ Speed: 4.0 drivers/s
```

### 3. **verify-all-images.js**

Vérifie existence et dimensions de toutes les images.

**Checks:**
- Existence 3 images par driver
- Dimensions exactes (75x75, 500x500, 1000x1000)
- Format PNG valide

**Usage:**
```bash
npm run images:verify

# Ou directement
node scripts/images/verify-all-images.js
```

---

## 📊 Workflow Complet

### **Régénération Images + Validation + Publish**

```bash
# 1. Régénérer toutes les images
npm run images:regenerate

# 2. Vérifier images
npm run images:verify

# 3. Validation complète
npm run validate

# 4. Si OK: Clean build + validation publish
npm run validate:publish

# 5. Commit
git add drivers/*/assets/images/
git commit -m "feat(images): Batch regenerate with intelligent personalization"

# 6. Push
git push origin master

# 7. Publish Homey
homey app publish
```

---

## 🎯 Personnalisation Avancée

### **Ajouter Nouveau Type d'Appareil**

Éditer `intelligent-image-generator.js`:

```javascript
const DEVICE_TYPES = {
  // ...
  newtype: {
    color: '#HEX_COLOR',
    icon: '🔥',  // Emoji
    gradient: ['#COLOR1', '#COLOR2'],
    keywords: ['keyword1', 'keyword2']
  }
};
```

### **Ajouter Nouveau Type d'Alimentation**

```javascript
const POWER_TYPES = {
  // ...
  solar: {
    icon: '☀️',
    color: '#FFC107',
    label: 'Solar',
    keywords: ['solar', 'photovoltaic']
  }
};
```

---

## 📚 Références

- **Specs**: `references/HOMEY_SDK3_COMPLETE_SPECS.json`
- **Discoveries**: `CRITICAL_DISCOVERIES_OCT2025.md`
- **Validation**: `README_VALIDATION.md`

---

## ⚠️ Important

**TOUJOURS** vérifier après régénération:
```bash
npm run images:verify && npm run validate:publish
```

**Dimensions CRITIQUES:**
- Driver images: 75x75, 500x500, 1000x1000
- App images: 250x175, 500x350, 1000x700 (différent!)

---

**Last Updated:** 18 Octobre 2025  
**Status:** Production Ready ✅
