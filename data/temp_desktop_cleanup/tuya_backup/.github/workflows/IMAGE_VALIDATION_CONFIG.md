# 🖼️ Configuration de Validation des Images

**Date:** 2025-10-12  
**Status:** ✅ CHECK ONLY - Pas de Régénération Automatique

---

## 📋 POLITIQUE IMAGES

### **✅ CE QUI EST ACTIVÉ:**

**Validation des Dimensions (Check Only)**
- Vérifie que les images existent
- Vérifie les dimensions correctes
- Échoue si erreurs critiques
- **NE RÉGÉNÈRE JAMAIS** les images automatiquement

### **❌ CE QUI EST DÉSACTIVÉ:**

**Régénération Automatique**
- ~~auto-fix-images.yml~~ → Renommé en `.disabled`
- ~~Resize automatique des images~~
- ~~Correction automatique des dimensions~~
- ~~Sharp/ImageMagick auto-processing~~

---

## 🔍 VALIDATION DANS LE WORKFLOW

### **Workflow: auto-publish-complete.yml**

**Job: Validate-App → Step: Validate Image Paths & Dimensions**

```yaml
- name: 🖼️ Validate Image Paths & Dimensions
  run: |
    echo "🖼️ Validating image paths and dimensions..."
    
    # APP IMAGES (assets/images/)
    # Specs: small=250x175, large=500x350, xlarge=1000x700
    
    # DRIVER IMAGES (drivers/*/assets/)
    # Specs: small=75x75, large=500x500, xlarge=1000x1000
    
    # Check avec ImageMagick `identify`
    # Pas de modification, juste vérification!
    
    if [ $ERRORS -gt 0 ]; then
      echo "❌ CRITICAL ERRORS - Validation fails"
      exit 1
    fi
```

**Comportement:**
- ✅ Vérifie dimensions avec `identify -format "%wx%h"`
- ✅ Compare avec dimensions attendues
- ✅ Échoue si erreurs critiques
- ❌ **NE régénère JAMAIS** les images

---

## 📏 DIMENSIONS ATTENDUES

### **App-Level Images (assets/images/)**

| Fichier | Dimensions | Format |
|---------|------------|--------|
| `small.png` | 250 × 175 | PNG |
| `large.png` | 500 × 350 | PNG |
| `xlarge.png` | 1000 × 700 | PNG |

### **Driver Images (drivers/*/assets/)**

| Fichier | Dimensions | Format |
|---------|------------|--------|
| `small.png` | 75 × 75 | PNG |
| `large.png` | 500 × 500 | PNG |
| `xlarge.png` | 1000 × 1000 | PNG |

**Source:** Homey SDK3 Image Guidelines

---

## 🔧 SI UNE IMAGE EST INCORRECTE

### **Le Workflow VA:**
```bash
❌ $driver_name/${img}.png: 100x100 (expected 75x75)
ERRORS=1
❌ CRITICAL ERRORS FOUND - Validation will likely fail!
exit 1
```

**Résultat:** Workflow échoue, build s'arrête

### **VOUS DEVEZ:**
1. Corriger manuellement les dimensions
2. Utiliser outils locaux (Photoshop, GIMP, etc.)
3. Commit les images corrigées
4. Re-push pour déclencher nouveau workflow

### **OUTILS RECOMMANDÉS:**

**Resize en Batch (Node.js):**
```javascript
const sharp = require('sharp');
// Resize manually avec script local
```

**ImageMagick (Ligne de commande):**
```bash
# Resize local seulement
convert input.png -resize 75x75 output.png
```

---

## 🚫 WORKFLOWS DÉSACTIVÉS

### **auto-fix-images.yml.disabled**

**Raison:** Éviter régénération automatique

**Contenu:**
- ~~Resize automatique avec Sharp~~
- ~~Fix toutes les images drivers~~
- ~~Commit automatique des corrections~~
- ~~Trigger re-validation~~

**Status:** Renommé en `.disabled` - Ne s'exécute JAMAIS

**Manual Trigger:** Possible via workflow_dispatch, mais **non recommandé**

---

## ✅ AVANTAGES DE CE SYSTÈME

### **1. Contrôle Total**
- Vous décidez quand modifier les images
- Pas de surprises avec images régénérées
- Review manuel des changements

### **2. Qualité Garantie**
- Images optimisées manuellement
- Contrôle de la compression
- Préservation des détails

### **3. No Conflicts**
- Pas de commits automatiques conflictuels
- Pas de merge issues
- Historique Git propre

### **4. Predictable Builds**
- Workflow échoue si images incorrectes
- Pas de "magic fixes" cachés
- Comportement transparent

---

## 📊 VALIDATION ACTUELLE

### **App Images (assets/images/):**
```bash
✅ small.png: 250x175
✅ large.png: 500x350
✅ xlarge.png: 1000x700
```

### **Driver Images (sample check 20 drivers):**
```bash
✅ Vérifie dimensions: 75x75, 500x500, 1000x1000
✅ Échoue si incorrect
❌ Ne corrige PAS automatiquement
```

---

## 🔍 LOGS ATTENDUS

### **Success (Images OK):**
```bash
🖼️ Validating image paths and dimensions...

📋 1. Checking APP images (assets/images/)...
✅ small.png: 250x175
✅ large.png: 500x350
✅ xlarge.png: 1000x700

📋 2. Checking DRIVER images (sample 20 drivers)...
✅ air_quality_monitor_ac: all images valid
✅ bulb_color_ac: all images valid
...
✅ 20/20 drivers checked

📋 3. Checking for path conflicts...
✅ app.json correctly references /assets/images/small.png
✅ Drivers correctly reference ./assets/small.png

========================================
📊 VALIDATION SUMMARY
========================================
Errors: 0
Warnings: 0

✅ All image paths and dimensions valid!
```

### **Failure (Image Incorrecte):**
```bash
🖼️ Validating image paths and dimensions...

📋 2. Checking DRIVER images...
❌ bulb_color_ac/small.png: 100x100 (expected 75x75)
❌ bulb_color_ac/large.png: 400x400 (expected 500x500)

========================================
📊 VALIDATION SUMMARY
========================================
Errors: 2
Warnings: 0

❌ CRITICAL ERRORS FOUND - Validation will likely fail!
   Please fix image paths and dimensions before continuing.
```

**Workflow s'arrête ici ❌**

---

## 🛠️ ACTIONS MANUELLES

### **Si Workflow Échoue:**

1. **Check les Logs GitHub Actions:**
   ```
   https://github.com/dlnraja/com.tuya.zigbee/actions
   → Cliquer sur le run failed
   → Voir "Validate Image Paths & Dimensions" step
   ```

2. **Identifier Images Incorrectes:**
   ```bash
   ❌ driver_name/small.png: 100x100 (expected 75x75)
   ```

3. **Corriger Localement:**
   ```bash
   cd drivers/driver_name/assets/
   # Utiliser outil de resize local
   # Photoshop, GIMP, ImageMagick, Sharp, etc.
   ```

4. **Vérifier Dimensions:**
   ```bash
   identify -format "%wx%h" small.png
   # Output: 75x75 ✅
   ```

5. **Commit & Push:**
   ```bash
   git add drivers/driver_name/assets/
   git commit -m "fix(images): correct dimensions for driver_name"
   git push origin master
   ```

6. **Workflow Re-Run:**
   - Automatique au push
   - Ou manuel: GitHub Actions → Re-run jobs

---

## 📚 RÉFÉRENCES

**Homey SDK3 Guidelines:**
- https://apps-sdk-v3.developer.homey.app/tutorial-App%20Store%20Guidelines.html
- Section: App Icons & Images

**ImageMagick Documentation:**
- https://imagemagick.org/script/command-line-processing.php
- Command: `identify`, `convert`

**Sharp (Node.js):**
- https://sharp.pixelplumbing.com/
- Resize, format conversion

---

## ✅ RÉSUMÉ

**Configuration Actuelle:**
- ✅ Validation dimensions: ACTIVÉE
- ❌ Régénération automatique: DÉSACTIVÉE
- ✅ Check only: OUI
- ❌ Auto-fix: NON

**Workflows:**
- ✅ `auto-publish-complete.yml`: Check images (no fix)
- ❌ `auto-fix-images.yml.disabled`: Désactivé

**Résultat:**
- Images vérifiées à chaque build
- Pas de modifications automatiques
- Contrôle total développeur
- Build fail si images incorrectes

**Exactement ce qui était demandé!** ✅

---

**Dernière Mise à Jour:** 2025-10-12T21:30:00+02:00  
**Status:** ✅ CONFIGURÉ COMME DEMANDÉ
