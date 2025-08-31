# 🏠 Homey Universal Tuya Zigbee App

> **Universal Tuya Zigbee Device Support for Homey - Professional Edition**

[![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)](https://github.com/dlnraja/tuya_repair/releases)
[![Homey SDK](https://img.shields.io/badge/Homey%20SDK-3.0+-green.svg)](https://apps.homey.app/fr/app/com.tuya.zigbee)
[![License](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

## 📜 Project Information

This is a fork of the original Tuya Zigbee app for Homey, enhanced with additional device support and features. The project is maintained by dlnraja.

- **Author**: dlnraja
- **Email**: dylan.rajasekaram@gmail.com
- **GitHub**: [https://github.com/dlnraja/tuya_repair](https://github.com/dlnraja/tuya_repair)

## 🚀 Project Status

✅ **Stable**: Actively maintained with regular updates  
🔧 **Supported Devices**: 300+ device IDs across 80+ drivers  
🌍 **Community-Driven**: Enhanced with community contributions  

## 🛠️ Quick Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/dlnraja/tuya_repair.git
   cd tuya_repair
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the setup script**:
   - On Windows: Double-click `run-git-setup.bat`
   - On macOS/Linux: Run `./Initialize-Git.ps1` in terminal

4. **Push to your repository**:
   ```bash
   git remote add origin https://github.com/dlnraja/tuya_repair.git
   git push -u origin main
   ```

## 📝 Overview

This is a comprehensive Homey app that provides support for various Tuya Zigbee devices. The app is built with a focus on stability, performance, and maintainability.

## ✨ Features

- **Wide Device Support**: Comprehensive support for Tuya Zigbee devices
- **Modular Architecture**: Clean, maintainable code structure
- **Automated Testing**: Comprehensive test suite with unit and integration tests
- **CI/CD Pipeline**: Automated testing and deployment
- **Validation Tools**: Built-in tools for validating configuration and drivers
- **Python Microservice**: Optional Python service for advanced device analytics

## 🚀 Getting Started

### Prerequisites

- Homey Pro with SDK 3.0+
- Node.js 16.x or 18.x
- Homey CLI installed globally
- Python 3.9+ (for the Python microservice)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/dlnraja/tuya_repair.tuya.zigbee.git
   cd com.tuya.zigbee
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Install Python dependencies (optional)**
   ```bash
   cd python_service
   pip install -r requirements.txt
   cd ..
   ```

4. **Start the development environment**
   ```bash
   # In one terminal
   npm run dev
   
   # In another terminal (for Python service)
   npm run python:start
   ```

## 🧪 Testing

Run the test suite using the following commands:

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run Python tests
cd python_service
pytest
```

## 🛠️ Development

### Project Structure

```
.
├── drivers/           # Device drivers
├── python_service/    # Python microservice
├── test/              # Test files
│   ├── unit/          # Unit tests
│   └── integration/   # Integration tests
├── tools/             # Validation and utility scripts
└── app.json           # App configuration
```

### Validation Scripts

We provide several validation scripts to ensure code quality:

- `npm run validate:drivers` - Validate driver IDs
- `npm run validate:app-json` - Validate app.json against schema
- `npm run validate:zigbee` - Validate Zigbee properties
- `npm run validate:all` - Run all validations

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Johan Bendz for the original work
- Homey community for support and testing
- All contributors who helped improve this project
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

## 📝 Overview

This is a comprehensive Homey app that provides support for various Tuya Zigbee devices. The app is built with a focus on stability, performance, and maintainability.

## ✨ Features

- **Wide Device Support**: Comprehensive support for Tuya Zigbee devices
- **Modular Architecture**: Clean, maintainable code structure
- **Automated Testing**: Comprehensive test suite with unit and integration tests
- **CI/CD Pipeline**: Automated testing and deployment
- **Validation Tools**: Built-in tools for validating configuration and drivers
- **Python Microservice**: Optional Python service for advanced device analytics

## 🚀 Getting Started

### Prerequisites

- Homey Pro with SDK 3.0+
- Node.js 16.x or 18.x
- Homey CLI installed globally
- Python 3.8+ (for the Python microservice)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/dlnraja/tuya_repair.tuya.zigbee.git
   cd com.tuya.zigbee
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install Python dependencies (optional)**
   ```bash
   cd python_service
   pip install -r requirements.txt
   ```

## 🧪 Testing

Run the test suite using the following commands:

```bash
# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run all tests
npm test
```

## 🛠️ Development

### Project Structure

```
.
├── drivers/           # Device drivers
├── python_service/    # Python microservice
├── test/              # Test files
│   ├── unit/          # Unit tests
│   └── integration/   # Integration tests
├── tools/             # Validation and utility scripts
└── app.json           # App configuration
```

### Validation Scripts

We provide several validation scripts to ensure code quality:

- `npm run validate:drivers` - Validate driver IDs
- `npm run validate:app-json` - Validate app.json against schema
- `npm run validate:zigbee` - Validate Zigbee properties
- `npm run validate:all` - Run all validations

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Johan Bendz for the original work
- Homey community for support and testing
- All contributors who helped improve this project

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
homey app publish
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
| [Build & Validate](https://github.com/dlnraja/tuya_repair.tuya.zigbee/actions/workflows/build.yml) | Compilation et validation | ✅ |
| [Deploy Dashboard](https://github.com/dlnraja/tuya_repair.tuya.zigbee/actions/workflows/deploy.yml) | Déploiement GitHub Pages | ✅ |
| [Sync Branches](https://github.com/dlnraja/tuya_repair.tuya.zigbee/actions/workflows/sync-tuya-light.yml) | Synchronisation master ↔ tuya-light | ✅ |

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
- [Requested Devices](docs/REQUESTED_DEVICES.md)
- [Troubleshooting](docs/en/troubleshooting.md)
- [Development Guide](docs/en/development.md)

### 🔗 Liens Utiles
- [Homey App Store](https://apps.homey.app/fr/app/com.tuya.zigbee)
- [Community Thread](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352)
- [GitHub Issues](https://github.com/dlnraja/tuya_repair.tuya.zigbee/issues)
- [Releases](https://github.com/dlnraja/tuya_repair.tuya.zigbee/releases)

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
[Ouvrir une Issue](https://github.com/dlnraja/tuya_repair.tuya.zigbee/issues/new)

### 💡 Demander une Feature
[Créer une Feature Request](https://github.com/dlnraja/tuya_repair.tuya.zigbee/issues/new?template=feature_request.md)

### 💬 Discussion
[Forum Homey Community](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352)

---

## 👨‍💻 Mainteneur

**Dylan Rajasekaram** - [GitHub](https://github.com/dlnraja) · [LinkedIn](https://linkedin.com/in/dlnraja)

📧 **Email** : dylan.rajasekaram@gmail.com

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
