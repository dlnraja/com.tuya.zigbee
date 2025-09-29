# 🎨 GUIDE ULTIME - GÉNÉRATION D'IMAGES HOMEY SDK3

## 📋 SPÉCIFICATIONS OFFICIELLES HOMEY SDK3

### 📏 Dimensions obligatoires:
- **small**: 75x75px (icône driver)
- **large**: 250x175px (carte device) 
- **xlarge**: 500x350px (page détails)

### 🎨 Format et qualité:
- Format: PNG avec transparence
- Poids: < 50KB par image
- Résolution: 72-96 DPI
- Espace couleur: sRGB

## 🎯 STYLE JOHAN BENDZ + SOURCES D'INSPIRATION

### Sources de référence:
- ✅ **ZHA (Zigbee Home Assistant)**: Style épuré, reconnaissable
- ✅ **Zigbee2MQTT**: Iconographie claire et fonctionnelle  
- ✅ **Homey officiel**: Cohérence avec l'écosystème
- ✅ **Johan Bendz**: Design professionnel, unbranded

### Principes de design:
- **Minimalisme**: Formes simples, pas de détails superflus
- **Unbranded**: Aucun logo de marque (MOES, BSEED, etc.)
- **Professionnel**: Qualité industrielle, finitions soignées
- **Cohérent**: Style uniforme sur tous les drivers

## 🏷️ CATÉGORIES DE PRODUITS ET VISUELS

### 🔌 INTERRUPTEURS
- **1gang**: Rectangle blanc avec 1 bouton rond central
- **2gang**: Rectangle blanc avec 2 boutons ronds alignés
- **3gang**: Rectangle blanc avec 3 boutons ronds en ligne
- **Couleurs**: Blanc/gris clair, LED bleue subtile
- **Reconnaissance IA**: Boutons circulaires bien définis

### 🏃 CAPTEURS DE MOUVEMENT  
- **Forme**: Dôme blanc avec grille PIR
- **Éléments**: Lentille noire, LED de statut
- **Style**: Vue 3/4, ombrage subtil
- **Reconnaissance IA**: Forme de dôme avec pattern en nid d'abeille

### 🔌 PRISES INTELLIGENTES
- **Standard**: Cylindre blanc avec prises visibles
- **Energy**: + indicateurs LED/écran de mesure
- **Perspective**: Vue légèrement angulaire
- **Reconnaissance IA**: Forme cylindrique avec prises EU

### 🌡️ CAPTEURS TEMPÉRATURE
- **Forme**: Rectangle compact avec écran LCD
- **Éléments**: Display, grilles d'aération
- **Style**: Vue frontale claire
- **Reconnaissance IA**: Écran rectangulaire avec ventilation

## 🤖 OPTIMISATION POUR RECONNAISSANCE IA/OPENCV

### Règles de contraste:
- **Ratio minimum**: 4.5:1 entre éléments et fond
- **Contours nets**: Bordures bien définies pour détection
- **Formes géométriques**: Cercles, rectangles, formes simples
- **Symétrie**: Composition équilibrée

### Caractéristiques distinctives:
- **Switches**: Nombre de boutons clairement visible
- **Sensors**: Forme de dôme ou rectangle avec grilles
- **Plugs**: Prises électriques reconnaissables
- **Displays**: Écrans/LED distinctifs

## 🎨 PALETTE COULEURS COHÉRENTE

### Couleurs principales:
- **Blanc**: #FFFFFF (dispositifs plastique)
- **Gris clair**: #F5F5F5 (nuances)
- **Bleu Homey**: #1E88E5 (LED, accents)
- **Noir**: #212121 (lentilles, écrans)
- **Vert**: #4CAF50 (LED énergie)

### Effets et matériaux:
- **Plastique blanc**: Mat, légèrement réfléchissant
- **Métal**: Argent brossé pour éléments premium
- **LED**: Lueur douce, pas éblouissante
- **Écrans**: Contraste élevé, lisible

## 🚫 ÉLÉMENTS INTERDITS

- ❌ **Marques**: MOES, BSEED, Tuya, etc.
- ❌ **Texte**: Labels, modèles, références
- ❌ **Logos**: Aucun branding visible
- ❌ **Couleurs criardes**: Rouge vif, jaune flash
- ❌ **Arrière-plans complexes**: Textures, dégradés
- ❌ **Ombres dures**: Éclairage brutal

## 🛠️ OUTILS ET WORKFLOW

### Générateurs IA recommandés:
1. **DALL-E 3**: "Professional white smart switch, 3 buttons, minimalist, unbranded, white background, Homey SDK3 style"
2. **Midjourney**: --style minimalist --ar 1:1 (pour small) ou 10:7 (large/xlarge)
3. **Stable Diffusion**: Avec LoRA pour style cohérent

### Post-traitement:
1. **Redimensionnement**: Respect exact des dimensions
2. **Optimisation**: TinyPNG, ImageOptim (<50KB)
3. **Validation**: Contraste, netteté, reconnaissance
4. **Nommage**: driver_size.png (ex: smart_switch_3gang_ac_large.png)

## 📊 VALIDATION ET TESTS

### Checklist avant utilisation:
- [ ] Dimensions exactes (75x75, 250x175, 500x350)
- [ ] Format PNG correct
- [ ] Poids < 50KB
- [ ] Transparence ou fond blanc pur
- [ ] Style cohérent avec autres drivers
- [ ] Aucun branding visible
- [ ] Reconnaissance IA possible
- [ ] Contraste suffisant

### Tests de reconnaissance:
- **OpenCV**: Détection de contours
- **TensorFlow**: Classification d'objets
- **Vision APIs**: Google, Azure, AWS

---
*Guide généré par Ultimate Image System*
*Conformité: Homey SDK3 + Johan Bendz + ZHA/Z2M + Reconnaissance IA*
