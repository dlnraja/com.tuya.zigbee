# 📸 IMAGE REQUIREMENTS - USB DRIVERS

**Date**: 23 Octobre 2025  
**Drivers**: usb_outlet_1gang, usb_outlet_2port, usb_outlet_3gang  
**Status**: ⚠️ Images à créer

---

## 📐 SPÉCIFICATIONS TECHNIQUES

### Tailles Requises (SDK3)
1. **Small**: 75x75 pixels
2. **Large**: 500x500 pixels
3. **XLarge**: 1000x1000 pixels

### Format
- **Type**: PNG avec transparence
- **Background**: Transparent
- **Style**: Icône moderne, minimal, professionnel

---

## 🎨 DESIGN RECOMMANDÉ

### Concept Visuel
**USB Outlet Icon** = 🔌 (Prise) + ⚡ (USB Symbol)

### Couleurs
- **Primary**: Bleu électrique (#1E88E5) - Pour USB
- **Secondary**: Gris foncé (#424242) - Pour prise
- **Accent**: Blanc (#FFFFFF) - Pour contraste

### Style
- **Minimal**: Lignes épurées
- **Flat Design**: Pas d'ombres complexes
- **Professional**: Similaire aux icônes officielles Homey
- **Clear**: Visible à 75x75

---

## 📂 FICHIERS À CRÉER

### usb_outlet_1gang
```
drivers/usb_outlet_1gang/assets/images/
├── small.png     (75x75)    - Icon in app list
├── large.png     (500x500)  - Device detail view
└── xlarge.png    (1000x1000)- High resolution display
```

**Visual Concept**: Prise simple avec 1 port USB clairement visible

---

### usb_outlet_2port
```
drivers/usb_outlet_2port/assets/images/
├── small.png     (75x75)
├── large.png     (500x500)
└── xlarge.png    (1000x1000)
```

**Visual Concept**: Prise avec 2 ports USB côte à côte

---

### usb_outlet_3gang
```
drivers/usb_outlet_3gang/assets/images/
├── small.png     (75x75)
├── large.png     (500x500)
└── xlarge.png    (1000x1000)
```

**Visual Concept**: Prise avec 3 ports USB alignés

---

## 🖼️ LEARNMODE SVG

Chaque driver doit avoir un `learnmode.svg`:

```
drivers/usb_outlet_1gang/assets/learnmode.svg
drivers/usb_outlet_2port/assets/learnmode.svg
drivers/usb_outlet_3gang/assets/learnmode.svg
```

### Contenu SVG
**Montre**: Comment jumeler l'appareil (bouton d'appairage)

**Exemple SVG Template**:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">
  <!-- USB Outlet illustration -->
  <rect x="100" y="100" width="300" height="300" 
        fill="#fff" stroke="#424242" stroke-width="4" rx="20"/>
  
  <!-- USB Port -->
  <rect x="200" y="250" width="100" height="50" 
        fill="#1E88E5" rx="5"/>
  
  <!-- Pairing Button -->
  <circle cx="250" cy="180" r="30" 
          fill="#FF5722" opacity="0.8"/>
  
  <!-- Press indicator (animated in actual use) -->
  <text x="250" y="380" text-anchor="middle" 
        font-size="24" fill="#424242">
    Press 5s to pair
  </text>
</svg>
```

---

## 🎯 RÉFÉRENCE DESIGN

### Inspirations
1. **Homey Official Apps**: Style épuré et moderne
2. **Material Design Icons**: Google's USB and power icons
3. **Johan Bendz App**: Icônes professionnelles et claires

### Éléments Visuels Clés
- **Port USB**: Rectangle arrondi bleu
- **Prise électrique**: Outline gris foncé
- **Indicateur LED**: Point lumineux (optionnel)
- **Nombre de ports**: Clairement visible dans le design

---

## ✅ CHECKLIST CRÉATION

### Pour Chaque Driver
- [ ] Créer small.png (75x75)
- [ ] Créer large.png (500x500)
- [ ] Créer xlarge.png (1000x1000)
- [ ] Créer learnmode.svg
- [ ] Vérifier transparence PNG
- [ ] Vérifier visibilité à 75x75
- [ ] Tester affichage dans Homey
- [ ] Valider cohérence entre les 3 tailles

### Tests de Qualité
- [ ] Visible sur fond clair
- [ ] Visible sur fond sombre
- [ ] Pas de pixels flous
- [ ] Transparence correcte
- [ ] Cohérence style avec autres drivers

---

## 🛠️ OUTILS RECOMMANDÉS

### Pour Création Images
1. **Figma** (gratuit) - Design professionnel
2. **Adobe Illustrator** - Si disponible
3. **Inkscape** (gratuit, open-source) - Bon pour SVG
4. **Canva** (gratuit) - Facile d'utilisation

### Pour Export PNG
- Export avec transparence activée
- Résolution exacte requise
- Pas de compression excessive

---

## 📋 SOLUTION TEMPORAIRE

**En attendant les vraies images**, tu peux:

### Option 1: Copier depuis avatto_usb_outlet
```powershell
Copy-Item "drivers/avatto_usb_outlet/assets/images/*" `
  "drivers/usb_outlet_1gang/assets/images/"
```

### Option 2: Utiliser placeholders
Créer des placeholders simples avec texte:
- "USB 1" pour usb_outlet_1gang
- "USB 2" pour usb_outlet_2port
- "USB 3" pour usb_outlet_3gang

---

## 🎨 EXEMPLE CODE SVG COMPLET

### learnmode.svg Template
```svg
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     viewBox="0 0 600 600" 
     width="600" 
     height="600">
  
  <!-- Background -->
  <rect width="600" height="600" fill="none"/>
  
  <!-- Outlet body -->
  <rect x="150" y="100" width="300" height="400" 
        fill="#ffffff" stroke="#333" stroke-width="6" 
        rx="30" ry="30"/>
  
  <!-- USB Ports (2 shown for usb_outlet_2port) -->
  <rect x="180" y="200" width="100" height="60" 
        fill="#1E88E5" stroke="#0D47A1" stroke-width="3" 
        rx="8"/>
  <rect x="320" y="200" width="100" height="60" 
        fill="#1E88E5" stroke="#0D47A1" stroke-width="3" 
        rx="8"/>
  
  <!-- USB Symbol -->
  <text x="230" y="240" font-size="30" fill="#fff" 
        font-family="Arial, sans-serif">⚡</text>
  <text x="370" y="240" font-size="30" fill="#fff" 
        font-family="Arial, sans-serif">⚡</text>
  
  <!-- Pairing button -->
  <circle cx="300" y="350" r="40" 
          fill="#FF5722" stroke="#BF360C" stroke-width="3"/>
  <text x="300" y="360" font-size="24" fill="#fff" 
        text-anchor="middle" font-weight="bold">
    PAIR
  </text>
  
  <!-- Instruction text -->
  <text x="300" y="480" font-size="20" fill="#666" 
        text-anchor="middle">
    Press and hold for 5 seconds
  </text>
  <text x="300" y="510" font-size="20" fill="#666" 
        text-anchor="middle">
    until LED blinks
  </text>
  
  <!-- LED indicator -->
  <circle cx="300" cy="130" r="8" fill="#4CAF50" 
          opacity="0.8"/>
</svg>
```

---

## 🔄 MISE À JOUR APRÈS CRÉATION

Une fois les images créées:

1. ✅ Placer dans les dossiers appropriés
2. ✅ Vérifier chemins dans driver.compose.json
3. ✅ Tester dans Homey
4. ✅ Ajuster si nécessaire
5. ✅ Documenter dans changelog

---

**Document Créé**: 23 Octobre 2025  
**Status**: ⚠️ Images à créer  
**Priorité**: MOYENNE (fonctionnel sans, mais requis pour publication)
