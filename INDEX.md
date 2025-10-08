# 🚀 Tuya Zigbee - Système Unifié de Publication

## Vue d'ensemble du projet

Ce projet est un système complet pour gérer et publier une application Homey avec génération automatique d'images professionnelles.

---

## 📋 Table des Matières

- [Utilisation Rapide](#utilisation-rapide)
- [Architecture](#architecture)
- [Système d'Images](#système-dimages)
- [Workflows](#workflows)
- [Documentation](#documentation)

---

## ⚡ Utilisation Rapide

### Un seul fichier pour tout:

```batch
PUBLISH.bat
```

**Deux modes au choix:**

**[1] QUICK PUBLISH** (5 min)
- 🎨 Génération images Build 8-9
- ✅ Validation Homey
- 📤 Git push

**[2] FULL ENRICHMENT** (30 min)
- 🐙 Enrichissement GitHub (PRs/Issues)
- 🌐 Enrichissement Forums (Homey/Zigbee2MQTT/Blakadder)
- 🔍 Analyse patterns + validation
- 🎨 Génération images Build 8-9
- ✅ Validation complète
- 📤 Git push

Puis **GitHub Actions** publie automatiquement vers Homey App Store!

---

## 🏗️ Architecture

### Fichiers Principaux

```
tuya_repair/
├── PUBLISH.bat                    ← SCRIPT PRINCIPAL (lance tout)
│
├── scripts/
│   └── SMART_IMAGE_GENERATOR.js   ← Générateur images Build 8-9
│
├── .github/workflows/
│   └── publish-main.yml           ← CI/CD avec images intégrées
│
├── drivers/                       ← 164 drivers Zigbee
│   └── */assets/*.png            ← Images générées automatiquement
│
├── assets/images/                 ← Images app
│   ├── small.png (250x175)
│   └── large.png (500x350)
│
└── Documentation/
    ├── README_PUBLISH.md          ← Guide principal
    ├── IMAGE_GENERATION_GUIDE.md  ← Guide couleurs complet
    └── QUICK_START.md             ← Démarrage rapide
```

---

## 🎨 Système d'Images (Build 8-9)

### Codes Couleurs Johan Bendz

| Catégorie | Couleur Primaire | Secondaire | Icône |
|-----------|-----------------|------------|-------|
| **Switches** | #4CAF50 🟢 | #8BC34A | Boutons multi-gang |
| **Sensors** | #2196F3 🔵 | #03A9F4 | Ondes PIR |
| **Lighting** | #FFD700 🟡 | #FFA500 | Ampoule |
| **Climate** | #FF9800 🟠 | #FF5722 | Thermomètre |
| **Security** | #F44336 🔴 | #E91E63 | Bouclier |
| **Power** | #9C27B0 🟣 | #673AB7 | Prise électrique |
| **Automation** | #607D8B ⚫ | #455A64 | Bouton télécommande |

### Catégorisation Automatique

Le système analyse le nom du driver pour déterminer automatiquement:
- La catégorie (switch, sensor, light, etc.)
- Le nombre de gangs (1gang, 2gang, 3gang)
- Le type d'icône approprié
- Les couleurs à appliquer

### Exemples

**Switch 2gang AC**
- Détecté comme: Switches
- Couleur: Vert #4CAF50
- Icône: 2 boutons côte à côte
- Indicateur: "2" affiché

**Motion Sensor PIR**
- Détecté comme: Sensors
- Couleur: Bleu #2196F3
- Icône: Ondes concentriques
- Style: Gradient professionnel

---

## 🔄 Workflows

### Local (Windows)

```batch
# Lance tout le processus
PUBLISH.bat
```

Phases exécutées:
1. Pre-flight checks
2. Generate smart images
3. Clean Homey cache
4. Validate application
5. Git commit & push

### GitHub Actions (Automatique)

Fichier: `.github/workflows/publish-main.yml`

Déclenché sur: Push vers `master`

Étapes:
1. Checkout repository
2. Setup Node.js 18
3. Install dependencies
4. **Install Canvas** (Linux dependencies)
5. **Generate Smart Images** (Build 8-9)
6. Login Homey
7. Clean build cache
8. Build & Validate
9. Publish to Homey App Store
10. Summary report

---

## 📚 Documentation

### Guides Principaux

- **`README_PUBLISH.md`** - Guide complet d'utilisation
- **`IMAGE_GENERATION_GUIDE.md`** - Système de couleurs détaillé
- **`QUICK_START.md`** - Démarrage rapide

### Monitoring

- **GitHub Actions**: https://github.com/dlnraja/com.tuya.zigbee/actions
- **Homey Dashboard**: https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee
- **App Store**: https://homey.app/app/com.dlnraja.tuya.zigbee

---

## 🔧 Configuration Requise

### Prérequis Locaux (Windows)
- Node.js 18+
- Git configuré
- Homey CLI: `npm install -g homey`
- Canvas: Installé automatiquement par PUBLISH.bat

### Prérequis GitHub Actions
- Secret `HOMEY_TOKEN` configuré dans repository
- Workflow activé (automatique)

---

## 📊 Statistiques Projet

### Drivers
- **Total**: 164 drivers
- **Catégories**: 7 (switches, sensors, lighting, climate, security, power, automation)
- **Devices supportés**: 550+ dispositifs Zigbee
- **Manufacturers**: 80+ fabricants

### Images
- **App images**: 2 (small, large)
- **Driver images**: 328 (164 × 2 sizes)
- **Système**: Build 8-9 color codes
- **Standards**: Johan Bendz + Homey SDK3

### Publication
- **Méthode**: GitHub Actions CI/CD
- **Fréquence**: Sur chaque push
- **Validation**: Automatique avec Homey CLI
- **Target**: Homey App Store

---

## 🎯 Workflow Typique

### Développement Local

```batch
# 1. Modifier des drivers ou config
# ... edit files ...

# 2. Lancer publication
PUBLISH.bat

# 3. Le script fait tout:
#    - Génère images
#    - Valide app
#    - Commit + push

# 4. GitHub Actions publie automatiquement
```

### Monitoring

```batch
# Vérifier le workflow
https://github.com/dlnraja/com.tuya.zigbee/actions

# Vérifier publication
https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee
```

---

## 🆘 Dépannage

### Canvas Installation Failed

**Windows**:
```batch
npm install --global --production windows-build-tools
npm install canvas
```

**WSL2**:
```bash
sudo apt-get install libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev build-essential g++
npm install canvas
```

### Git Push Failed

```batch
# Vérifier status
git status

# Pull d'abord si nécessaire
git pull --rebase origin master

# Puis retry
PUBLISH.bat
```

### Validation Errors

Les warnings sont normaux et n'empêchent pas la publication.
Le script demande confirmation avant de continuer.

---

## 🎉 Succès Précédents

Ce système unifié est basé sur:

- ✅ **Build 1.1.9**: 111+ drivers, publication réussie
- ✅ **Build 2.0.0**: 149 drivers, transformation complète
- ✅ **V15 Holistique**: 164 drivers, 0 issues
- ✅ **Build 8-9**: Système de couleurs éprouvé
- ✅ **Auto-Fixer V19**: Correction automatique 100% success

**Résultat**: Système unifié = Simplicité + Fiabilité maximales!

---

## 📝 Notes Importantes

### Version Management
- Version actuelle maintenue dans `app.json`
- Bumps manuels avant push si nécessaire
- GitHub Actions ne change pas la version

### Cache Management
- `.homeybuild` et `.homeycompose` nettoyés automatiquement
- Évite problèmes de build corrompu
- Images fraîches à chaque build

### Image Generation
- Toujours re-généré localement ET sur CI
- Garantit cohérence entre local et production
- Build 8-9 color system appliqué partout

---

## 🔐 Sécurité

### Secrets
- `HOMEY_TOKEN` stocké dans GitHub Secrets
- Jamais committé dans le repository
- Rotation régulière recommandée

### Git
- `.gitignore` configuré pour exclure:
  - `.homeybuild/`
  - `.homeycompose/`
  - `node_modules/`
  - Fichiers sensibles

---

## 🚀 Roadmap

- [x] Système unifié avec un seul BAT
- [x] Génération images Build 8-9
- [x] GitHub Actions intégré
- [x] Documentation complète
- [ ] Tests automatisés
- [ ] Enrichissement mensuel automatique
- [ ] Analytics dashboard

---

## 📞 Support

### Documentation
- `README_PUBLISH.md` - Guide principal
- `IMAGE_GENERATION_GUIDE.md` - Couleurs détaillées
- `QUICK_START.md` - Démarrage rapide

### Logs
- Local: Console PUBLISH.bat
- CI: GitHub Actions logs

### Community
- Homey Community Forum
- GitHub Issues

---

**Version**: Build 8-9 Unified System  
**Status**: ✅ Production Ready  
**Maintainer**: dlnraja  
**Last Update**: 2025-10-08 07:42

---

## ⚡ TL;DR

**Pour publier**: `PUBLISH.bat`

**C'est tout!** 🎉
