# 🎨 Smart Image Generation System

## Build 8-9 Color System Integration

Ce système génère automatiquement des images professionnelles pour tous les drivers avec les standards Johan Bendz.

---

## 🎨 Codes Couleurs par Catégorie

### Switches (Interrupteurs)
- **Couleur primaire**: `#4CAF50` (Vert)
- **Couleur secondaire**: `#8BC34A` (Vert clair)
- **Icône**: Boutons avec gangs (1, 2, 3, etc.)
- **Indicateur**: Nombre de gangs affiché

### Sensors (Capteurs)
- **Couleur primaire**: `#2196F3` (Bleu)
- **Couleur secondaire**: `#03A9F4` (Bleu clair)
- **Icône**: Ondes PIR, capteur de mouvement
- **Types**: Motion, door, window, presence

### Lighting (Éclairage)
- **Couleur primaire**: `#FFD700` (Or/Jaune)
- **Couleur secondaire**: `#FFA500` (Orange)
- **Icône**: Ampoule, LED strip
- **Types**: Bulb, strip, dimmer

### Climate (Climatisation)
- **Couleur primaire**: `#FF9800` (Orange)
- **Couleur secondaire**: `#FF5722` (Rouge-orange)
- **Icône**: Thermomètre
- **Types**: Temperature, humidity, thermostat

### Security (Sécurité)
- **Couleur primaire**: `#F44336` (Rouge)
- **Couleur secondaire**: `#E91E63` (Rose)
- **Icône**: Bouclier, protection
- **Types**: Smoke, alarm, lock

### Power (Énergie)
- **Couleur primaire**: `#9C27B0` (Violet)
- **Couleur secondaire**: `#673AB7` (Violet foncé)
- **Icône**: Prise électrique
- **Types**: Plug, socket, energy monitoring

### Automation (Automatisation)
- **Couleur primaire**: `#607D8B` (Gris-bleu)
- **Couleur secondaire**: `#455A64` (Gris foncé)
- **Icône**: Bouton, télécommande
- **Types**: Button, remote, scene, knob

---

## 📐 Dimensions SDK3

### Images App
- **Small**: 250 x 175 px
- **Large**: 500 x 350 px

### Images Driver
- **Small**: 75 x 75 px
- **Large**: 500 x 500 px

---

## 🚀 Utilisation

### 1. Script Local (Windows)
```batch
# Vérifier tout avant génération
CHECK_ALL_BEFORE_PUSH.bat

# Générer images + valider + publier
GENERATE_IMAGES_AND_PUBLISH.bat
```

### 2. Script Direct (Node.js)
```bash
node scripts/SMART_IMAGE_GENERATOR.js
```

### 3. GitHub Actions (Automatique)
Le workflow `publish-with-smart-images.yml` s'exécute automatiquement sur chaque push vers master:
1. Génère toutes les images
2. Vérifie les dimensions
3. Valide avec Homey CLI
4. Publie vers Homey App Store

---

## 🎯 Catégorisation Automatique

Le système analyse automatiquement le nom du driver pour déterminer:

| Nom du driver contient | Catégorie | Couleur |
|------------------------|-----------|---------|
| switch, gang, relay | Switches | Vert |
| motion, sensor, detector, door, window | Sensors | Bleu |
| light, bulb, led, strip, dimmer | Lighting | Or |
| temperature, humidity, thermostat, climate | Climate | Orange |
| smoke, alarm, security, lock | Security | Rouge |
| plug, socket, energy, power | Power | Violet |
| button, remote, scene, knob | Automation | Gris |

---

## ✨ Fonctionnalités Spéciales

### Multi-gang Switches
- Détection automatique du nombre de gangs (1gang, 2gang, 3gang)
- Affichage du nombre correct de boutons
- Indicateur numérique dans le coin

### Gradients Professionnels
- Dégradés Johan Bendz entre couleur primaire et secondaire
- Overlay subtil pour profondeur
- Icônes blanches pour contraste

### Icônes Contextuelles
- Ondes pour capteurs de mouvement
- Thermomètre pour capteurs climatiques
- Bouclier pour sécurité
- Prise pour énergie
- Ampoule pour éclairage

---

## 📊 Rapport de Génération

Le script génère un rapport complet avec:
- ✅ Nombre d'images générées
- 📊 Distribution par catégorie
- 🎨 Couleurs appliquées
- ❌ Erreurs éventuelles

---

## 🔧 Dépannage

### Erreur: canvas module not found
```bash
npm install canvas
```

### Erreur: Permission denied
```bash
# Windows: Exécuter en administrateur
# Linux: sudo chmod +x scripts/SMART_IMAGE_GENERATOR.js
```

### Images manquantes après génération
```bash
# Vérifier structure
node -e "console.log(require('fs').readdirSync('drivers'))"

# Re-générer
node scripts/SMART_IMAGE_GENERATOR.js
```

---

## 📚 Références

- **Build 8-9**: Système de couleurs éprouvé avec succès
- **Johan Bendz**: Standards de design professionnel
- **Homey SDK3**: Specifications officielles
- **Memory 1d6a8eb6**: Phase 5 OPTIMIZE avec succès 100%

---

## ✅ Checklist Avant Push

- [ ] Canvas module installé
- [ ] Script SMART_IMAGE_GENERATOR.js présent
- [ ] Drivers directory accessible
- [ ] Assets/images directory créé
- [ ] Git repository actif
- [ ] GitHub Actions workflow présent

---

**Status**: ✅ READY FOR PRODUCTION
**Version**: Build 8-9 Color System
**Last Update**: 2025-10-08
