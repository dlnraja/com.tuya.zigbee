# 🚀 Publication Système Unifié

## Un seul fichier pour TOUT faire

---

## ⚡ Utilisation Simple

### Lancer le processus unifié:

```batch
PUBLISH.bat
```

**Deux modes disponibles:**

### Mode 1: QUICK PUBLISH (5 min)
- ✅ Génération images Build 8-9
- ✅ Validation Homey
- ✅ Git push automatique

### Mode 2: FULL ENRICHMENT (30 min)
- 🐙 GitHub Integration (PRs, Issues, Repos)
- 🌐 Forum Integration (Homey, Zigbee2MQTT, Blakadder)
- 🔍 Pattern Analysis
- 🔬 Ultra-Fine Driver Analysis
- 🌐 Web Validation
- 🎨 Smart Images Generation Build 8-9
- ✅ Validation complète
- 📤 Git push automatique

Ensuite **GitHub Actions** prend le relais automatiquement!

---

## 🎨 Système d'Images

### Codes Couleurs Automatiques

| Catégorie | Couleur | Icône |
|-----------|---------|-------|
| Switches | 🟢 Vert | Boutons avec gangs |
| Sensors | 🔵 Bleu | Ondes PIR |
| Lighting | 🟡 Or | Ampoule |
| Climate | 🟠 Orange | Thermomètre |
| Security | 🔴 Rouge | Bouclier |
| Power | 🟣 Violet | Prise |
| Automation | ⚫ Gris | Bouton |

### Dimensions SDK3
- **App**: 250x175 (small), 500x350 (large)
- **Drivers**: 75x75 (small), 500x500 (large)

---

## 🔄 Workflow GitHub Actions

Le workflow `publish-main.yml` s'exécute automatiquement sur chaque push:

1. 📥 Checkout code
2. 🔧 Setup Node.js 18
3. 📦 Install dependencies
4. 🎨 **Install Canvas + Generate Images**
5. 🔐 Login Homey
6. 🧹 Clean cache
7. ✅ Build & Validate
8. 📤 Publish to Homey App Store

---

## 📁 Fichiers du Système

### Script Principal
- **`PUBLISH.bat`** - Lance tout le processus (Windows)

### Générateur d'Images
- **`scripts/SMART_IMAGE_GENERATOR.js`** - Générateur Node.js avec Build 8-9 colors

### Workflow GitHub
- **`.github/workflows/publish-main.yml`** - CI/CD automatique avec génération d'images intégrée

### Documentation
- **`IMAGE_GENERATION_GUIDE.md`** - Guide complet des couleurs
- **`QUICK_START.md`** - Guide de démarrage rapide

---

## 🔧 Prérequis

### Obligatoire
- Node.js 18+
- Git configuré
- Homey CLI installé (`npm install -g homey`)

### Installé Automatiquement
- Module `canvas` (installé par PUBLISH.bat si manquant)

---

## 🆘 Dépannage

### Erreur Canvas
```batch
npm install --global --production windows-build-tools
npm install canvas
```

### Erreur Git Push
Vérifiez:
- Connexion internet
- Authentification GitHub
- Pas de conflits (`git pull` d'abord)

### Images non générées
Vérifiez que `scripts/SMART_IMAGE_GENERATOR.js` existe et exécutez manuellement:
```batch
node scripts/SMART_IMAGE_GENERATOR.js
```

---

## 📊 Monitoring

### GitHub Actions
https://github.com/dlnraja/com.tuya.zigbee/actions

### Homey Dashboard
https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee

### App Store
https://homey.app/app/com.dlnraja.tuya.zigbee

---

## ✅ Checklist

Avant de lancer `PUBLISH.bat`:

- [ ] Node.js installé
- [ ] Dans le bon dossier (racine projet)
- [ ] Dossier `drivers` présent
- [ ] Git configuré
- [ ] Modifications prêtes à être commitées

---

## 🎯 Exemples de Résultats

### Switch 2gang
- Couleur: 🟢 Vert (#4CAF50)
- Icône: 2 boutons visibles
- Indicateur: "2" dans le coin

### Motion Sensor
- Couleur: 🔵 Bleu (#2196F3)
- Icône: Ondes PIR concentriques
- Style: Professionnel avec gradient

### Smart Plug
- Couleur: 🟣 Violet (#9C27B0)
- Icône: Prise électrique
- Features: Energy monitoring visible

---

## 🎉 Inspirations

Ce système unifie les succès de:
- ✅ Build 8-9: Système de couleurs éprouvé
- ✅ Version 1.1.9: 111+ drivers publiés
- ✅ Version 2.0.0: 149 drivers transformés
- ✅ V15: 164 drivers, 0 issues

**Résultat**: Un seul script BAT + workflow GitHub Actions intégré = Simplicité maximale!

---

**Version**: Build 8-9 Unified System  
**Status**: ✅ Production Ready  
**Last Update**: 2025-10-08
