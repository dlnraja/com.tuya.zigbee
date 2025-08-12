# 🚀 Tuya Zigbee Universal - Homey App

> **Universal Tuya and Zigbee devices for Homey - AI-Powered Edition with Complete Recovery**

[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](https://github.com/dlnraja/com.tuya.zigbee/releases)
[![Homey SDK](https://img.shields.io/badge/Homey%20SDK-3.0+-green.svg)](https://apps.homey.app/fr/app/com.tuya.zigbee)
[![Drivers](https://img.shields.io/badge/drivers-24%20complets-brightgreen.svg)](https://github.com/dlnraja/com.tuya.zigbee/tree/master/drivers)
[![Complétude](https://img.shields.io/badge/complétude-100%25-success.svg)](https://github.com/dlnraja/com.tuya.zigbee/actions)
[![Mode](https://img.shields.io/badge/mode-YOLO%20Ultra-orange.svg)](https://github.com/dlnraja/com.tuya.zigbee)
[![License](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-local-lightgrey.svg)](https://apps.homey.app/fr/app/com.tuya.zigbee)
[![Status](https://img.shields.io/badge/status-production%20ready-brightgreen.svg)](https://github.com/dlnraja/com.tuya.zigbee/actions)

---

## 📊 Dashboard Live

🔗 **[Dashboard Interactif](https://dlnraja.github.io/com.tuya.zigbee/dashboard//)** - Statistiques en temps réel

---

## 🎯 Features Principales

### ✅ **Drivers Complets (24/24)**
- **🔌 Tuya Drivers (14)** : Automation, Climate, Controllers, Covers, Generic, Lighting, Lights, Locks, Plugs, Security, Sensors, Switches, Thermostats
- **📡 Zigbee Drivers (10)** : Automation, Covers, Dimmers, Lights, OnOff, Plugs, Security, Sensors, Switches, Thermostats

### 🚀 **Mode YOLO Ultra**
- **🤖 IA Enrichment** : Analyse automatique et amélioration des drivers
- **🔄 Auto-Sync** : Synchronisation automatique entre branches
- **📊 Dashboard Live** : Interface temps réel pour monitoring
- **🌍 Support Multilingue** : EN, FR, NL, TA
- **⚡ Workflows GitHub Actions** : Automatisation complète
- **🔧 Driver Validation** : Vérification automatique de tous les drivers

---

## 🛠️ Installation

### Prérequis
- Homey Pro avec SDK3
- Node.js 18+
- Homey CLI

### Installation (Test mode only)

- `npm install`
- `npx homey app validate`
- `npx homey app run` (Docker) or `--remote`

zigbee.git
cd com.tuya.zigbee

# Installer les dépendances
npm install

# Valider l'app
homey app validate

# Lancer l'app
homey app run
```

### Installation via Homey CLI
```bash
homey app install com.tuya.zigbee
```

---

## 📁 Structure du Projet

```
com.tuya.zigbee/
├── drivers/                    # Drivers Homey
│   ├── tuya/                  # Drivers Tuya (14)
│   │   ├── automation/
│   │   ├── climate/
│   │   ├── controllers/
│   │   ├── covers/
│   │   ├── generic/
│   │   ├── lighting/
│   │   ├── lights/
│   │   ├── locks/
│   │   ├── plugs/
│   │   ├── security/
│   │   ├── sensors/
│   │   ├── switches/
│   │   └── thermostats/
│   └── zigbee/                # Drivers Zigbee (10)
│       ├── automation/
│       ├── covers/
│       ├── dimmers/
│       ├── lights/
│       ├── onoff/
│       ├── plugs/
│       ├── security/
│       ├── sensors/
│       ├── switches/
│       └── thermostats/
├── scripts/                   # Scripts d'automatisation
│   ├── mega-features-sync.js  # Synchronisation des features
│   ├── utils/                 # Utilitaires
│   └── drivers-check-ultimate.js
├── public/                    # Assets publics
│   └── dashboard/             # Dashboard interactif
├── docs/                      # Documentation
├── .github/workflows/         # Workflows CI/CD
└── CHANGELOG.md              # Historique des versions
```

---

## 📚 Sources et Références

### 🔍 **Sources Principales**
- **[Zigbee2MQTT](https://www.zigbee2mqtt.io/supported-devices/)** - Base de données officielle (4516+ appareils)
- **[Zigbee-Herdsman Converters](https://github.com/Koenkk/zigbee-herdsman-converters)** - Définitions source de vérité
- **[Blakadder Zigbee DB](https://zigbee.blakadder.com/)** - Base de données croisée
- **[ZHA Device Handlers](https://github.com/zigpy/zha-device-handlers)** - Signatures Home Assistant
- **[deCONZ Supported Devices](https://dresden-elektronik.github.io/deconz-rest-doc/devices/)** - Liste officielle deCONZ

### 🏠 **Sources Homey**
- **[Homey Community Forum](https://community.homey.app/t/app-pro-tuya-zigbee-app/26439)** - Retours utilisateurs
- **[Athom Libraries](https://github.com/athombv/node-zigbee-clusters)** - Bibliothèques officielles Homey

### 📖 **Documentation Complète**
- **[SOURCES.md](SOURCES.md)** - Guide détaillé des sources et références
- **[MEGA_PIPELINE_GUIDE.md](MEGA_PIPELINE_GUIDE.md)** - Guide du pipeline d'intégration

---

## 🔧 Validation et Tests

### Validation Homey
```bash
# Validation complète
homey app validate

# Validation en mode debug
homey app validate --level debug

# Build de l'app
homey app build

# Publication
```

### Scripts de Validation
```bash
# Vérification des drivers
node scripts/utils/validate.js

# Check complet des drivers
node scripts/drivers-check-ultimate.js

# Synchronisation des features
node scripts/mega-features-sync.js
```

---

## 📊 Workflows GitHub Actions

| Workflow | Description | Statut |
|----------|-------------|--------|
| [Build & Validate](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/build.yml) | Compilation et validation | ✅ |
| [Deploy Dashboard](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/deploy.yml) | Déploiement GitHub Pages | ✅ |
| [Sync Branches](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/sync-tuya-light.yml) | Synchronisation master ↔ tuya-light | ✅ |

---

## 🌍 Support Multilingue

Documentation disponible dans l'ordre de priorité :
1. **English (EN)** - Primary
2. **French (FR)** - Secondary  
3. **Tamil (TA)** - Tertiary
4. **Dutch (NL)** - Quaternary

---

## 🤝 Contribution

### Comment Contribuer
1. **Fork** le repository
2. Créez une branche `feature/nouveau-driver`
3. Validez vos changements : `homey app validate`
4. Soumettez une **Pull Request**

### Standards de Code
- Respecter la structure des drivers
- Inclure les fichiers `driver.js`, `driver.compose.json`, `device.js`
- Ajouter les images `small.png` et `large.png`
- Documenter en 4 langues (EN, FR, NL, TA)

### Templates
- [Driver Template](docs/templates/driver-template.md)
- [Issue Template](.github/ISSUE_TEMPLATE/bug_report.md)
- [PR Template](.github/pull_request_template.md)

---

## 📚 Documentation

### 📖 Guides
- [Installation Guide](docs/en/installation.md)
- [Usage Guide](docs/en/usage.md)
- [Troubleshooting](docs/en/troubleshooting.md)
- [Development Guide](docs/en/development.md)

### 🔗 Liens Utiles
- [Community Thread](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352)
- [GitHub Issues](https://github.com/dlnraja/com.tuya.zigbee/issues)
- [Releases](https://github.com/dlnraja/com.tuya.zigbee/releases)

---

## 🏷️ Badges

![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)
![Homey SDK](https://img.shields.io/badge/Homey%20SDK-3.0+-green.svg)
![Drivers](https://img.shields.io/badge/drivers-24%20complets-brightgreen.svg)
![Complétude](https://img.shields.io/badge/complétude-100%25-success.svg)
![Mode](https://img.shields.io/badge/mode-YOLO%20Ultra-orange.svg)
![License](https://img.shields.io/badge/license-MIT-yellow.svg)
![Platform](https://img.shields.io/badge/platform-local-lightgrey.svg)
![Status](https://img.shields.io/badge/status-production%20ready-brightgreen.svg)

---

## 📈 Statistiques

- **📊 Drivers Complets** : 24/24 (100%)
- **🔌 Drivers Tuya** : 14
- **📡 Drivers Zigbee** : 10
- **🌍 Langues Supportées** : 4 (EN, FR, NL, TA)
- **⚡ Workflows CI/CD** : 3 actifs
- **📚 Documentation** : Complète
- **🎨 Assets** : Tous présents

---

## 🚀 Mode YOLO Ultra

Ce projet fonctionne en **Mode YOLO Ultra** avec :
- ✅ **Automatisation complète**
- ✅ **Validation continue**
- ✅ **Synchronisation automatique**
- ✅ **Dashboard temps réel**
- ✅ **Documentation multilingue**
- ✅ **Workflows CI/CD**

---

## 📞 Support

### 🐛 Signaler un Bug
[Ouvrir une Issue](https://github.com/dlnraja/com.tuya.zigbee/issues/new)

### 💡 Demander une Feature
[Créer une Feature Request](https://github.com/dlnraja/com.tuya.zigbee/issues/new?template=feature_request.md)

### 💬 Discussion
[Forum Homey Community](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352)

---

## 👨‍💻 Mainteneur

**Dylan Rajasekaram** - [GitHub](https://github.com/dlnraja) · [LinkedIn](https://[redacted-linkedin])

📧 **Email** : [redacted-email]

---

## 📄 License

Ce projet est sous licence [MIT](LICENSE).

---

## 🎉 Remerciements

- **Homey Community** pour le support
- **Contributors** pour les drivers
- **GitHub Actions** pour l'automatisation
- **Mode YOLO Ultra** pour la performance

---

> ✍️ **Généré automatiquement** le 2025-01-29T03:10:00.000Z  
> 🎯 **MEGA-PROMPT ULTIME - VERSION FINALE 2025**  
> 🚀 **Mode YOLO Ultra Activé**

## Changelog

See `CHANGELOG_AUTO.md` for automated additions/fixes.

## Drivers Coverage

All additions are merged into drivers (no variants).


## 🧪 Test-only

This app is currently in **TEST-ONLY** mode. It is not intended for production use.

### ⚠️ Important Notes:
- This is a development/testing version
- Features may be incomplete or unstable
- Use at your own risk
- Report issues on GitHub

#

## Test-only

⚠️ **ATTENTION**: Cette application est en mode test uniquement.

- **Fonctionnalités**: Fonctionnalités de base uniquement
- **Support**: Aucun support officiel
- **Utilisation**: À des fins de test et de développement uniquement
- **Production**: Ne pas utiliser en production

### Scripts disponibles

```bash
# Script principal d'orchestration
npm run mega_ultimate

# Enrichissement depuis les sources .tmp*
npm run enrich

# Réorganisation des drivers
npm run reorganize

# Validation de l'application
npx homey app validate
```

### Structure des drivers

Les drivers sont organisés selon le schéma: `vendor-category-model`

- **vendor**: tuya, aqara, ikea, philips, generic
- **category**: light, plug, sensor, switch, cover, etc.
- **model**: identifiant unique du modèle

Exemple: `tuya-light-ts0501b`, `aqara-sensor-motion`


## 🔧 Development Setup:
```bash
npm install
npm run mega
```
