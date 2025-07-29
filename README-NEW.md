# 🏠 Tuya Zigbee Homey App

**Complete Homey application for Tuya and Zigbee devices with comprehensive updates and all latest features**

[![Version](https://img.shields.io/badge/version-1.0.12--20250729--1405-blue.svg)](https://github.com/dlnraja/tuya_repair)
[![Drivers](https://img.shields.io/badge/drivers-31%20total-green.svg)](https://github.com/dlnraja/tuya_repair)
[![Status](https://img.shields.io/badge/status-OK-brightgreen.svg)](https://github.com/dlnraja/tuya_repair)

## 🚀 **Fonctionnalités Principales**

### 📡 **Support Multi-Protocoles**
- ✅ **Tuya Zigbee** - Appareils Tuya compatibles Zigbee
- ✅ **Zigbee Natif** - Appareils Zigbee standards
- ✅ **Mode Local Only** - Fonctionnement sans API cloud
- ✅ **SDK3 Compliant** - Migration complète vers Homey SDK 3

### 🔧 **Gestion Avancée**
- ⚡ **Voltage/Amperage/Batterie** - Monitoring complet des appareils
- 🔄 **Polling Intelligent** - Surveillance en temps réel
- 🎯 **Capabilities Avancées** - onoff, dim, measure_temperature, measure_humidity, alarm_motion, alarm_contact, windowcoverings_state, measure_power
- 🛡️ **Cleanup Automatique** - Nettoyage des ressources avec onUninit()

### 📊 **Structure Optimisée**
```
drivers/
├── tuya/
│   ├── controllers/     # Interrupteurs, lampes, prises
│   ├── sensors/        # Capteurs température, humidité
│   └── security/       # Capteurs mouvement, contact
└── zigbee/
    ├── controllers/     # Contrôleurs Zigbee
    ├── sensors/        # Capteurs Zigbee
    └── security/       # Sécurité Zigbee
```

## 📦 **Drivers Disponibles**

### 🎛️ **Contrôleurs Tuya (16)**
- **tuya-switch** - Interrupteur Tuya basique
- **tuya-light** - Lampe Tuya avec dimming
- **tuya-wall-switch** - Interrupteur mural Tuya
- **tuya-smart-plug** - Prise intelligente avec mesure de puissance
- **tuya-curtain** - Rideau avec contrôle d'ouverture/fermeture
- **tuya-fan** - Ventilateur avec contrôle de vitesse
- **tuya-temperature-sensor** - Capteur de température
- **tuya-humidity-sensor** - Capteur d'humidité
- **tuya-motion-sensor** - Capteur de mouvement
- **tuya-contact-sensor** - Capteur de contact

### 📡 **Contrôleurs Zigbee (15)**
- **zigbee-switch** - Interrupteur Zigbee
- **zigbee-light** - Lampe Zigbee avec dimming
- **zigbee-wall-switch** - Interrupteur mural Zigbee
- **zigbee-smart-plug** - Prise intelligente Zigbee
- **zigbee-temperature-sensor** - Capteur de température Zigbee
- **zigbee-motion-sensor** - Capteur de mouvement Zigbee

## 🛠️ **Installation**

### Prérequis
- Homey v6.0 ou supérieur
- Module Zigbee compatible
- Appareils Tuya/Zigbee

### Installation Automatique
```bash
# Cloner le repository
git clone https://github.com/dlnraja/tuya_repair.git

# Installer les dépendances
npm install

# Valider l'application
homey app validate
```

## 🔧 **Scripts Disponibles**

### 📥 **Recovery et Scraping**
```powershell
# Recovery complet des drivers
.\scripts\dump-scraping-final.ps1

# Ajout des archives manquantes
.\scripts\add-missing-archives.ps1
```

### 🔄 **Reorganisation**
```powershell
# Reorganisation intelligente
.\scripts\reorganize-drivers-intelligent.ps1

# Reorganisation simple
.\scripts\reorganize-simple.ps1
```

### 📊 **Monitoring et Validation**
```powershell
# Monitoring intelligent
.\scripts\monitoring-intelligent.ps1

# Validation simple
.\scripts\validation-simple.ps1
```

### 🔄 **Mise à Jour**
```powershell
# Mise à jour des scripts
.\scripts\update-scripts-simple.ps1
```

## 📈 **Statistiques du Projet**

- **Drivers Totaux** : 31 drivers
- **Drivers Tuya** : 16 drivers
- **Drivers Zigbee** : 15 drivers
- **Statut** : ✅ OK
- **SDK3 Compliance** : 100%
- **Structure** : Optimisée et organisée

## 🎯 **Fonctionnalités Avancées**

### ⚡ **Gestion Énergétique**
- **Mesure de Puissance** - Monitoring en temps réel
- **Voltage/Amperage** - Surveillance des paramètres électriques
- **Batterie** - Alertes de remplacement automatiques

### 🔄 **Optimisations Automatiques**
- **Migration SDK3** - Conversion automatique vers Homey SDK 3
- **Génération d'Images** - Création automatique des icônes SVG
- **Fusion Intelligente** - Regroupement des drivers similaires
- **Validation Continue** - Vérification automatique de l'intégrité

### 📁 **Structure de Fichiers**
Chaque driver contient :
- `device.js` - Code principal optimisé SDK3
- `driver.compose.json` - Métadonnées du driver
- `driver.settings.compose.json` - Paramètres du driver
- `assets/images/icon.svg` - Icône SVG avec dégradé

## 🔄 **Workflow de Développement**

1. **Recovery** - Récupération des drivers depuis Git et sources locales
2. **Optimisation** - Migration vers SDK3 et optimisation
3. **Reorganisation** - Structuration intelligente des dossiers
4. **Validation** - Vérification de l'intégrité et des performances
5. **Monitoring** - Surveillance continue du projet

## 📋 **Capabilities Supportées**

### 🎛️ **Contrôles**
- `onoff` - Allumage/Extinction
- `dim` - Variation d'intensité
- `windowcoverings_state` - État des volets/rideaux
- `windowcoverings_set` - Contrôle des volets/rideaux

### 📊 **Mesures**
- `measure_temperature` - Température
- `measure_humidity` - Humidité
- `measure_power` - Puissance électrique

### 🛡️ **Sécurité**
- `alarm_motion` - Détection de mouvement
- `alarm_contact` - Détection d'ouverture/fermeture

## 🚀 **Améliorations Récentes**

### ✅ **Version 1.0.12-20250729-1405**
- **Ajout de 16 drivers manquants** avec structure complète
- **Migration complète vers SDK3** pour tous les drivers
- **Gestion voltage/amperage/batterie** intégrée
- **Génération automatique d'images** SVG avec gradients
- **Validation continue** du projet
- **Monitoring intelligent** en temps réel
- **Structure de dossiers optimisée** avec séparation Tuya/Zigbee

### 🔧 **Scripts Mis à Jour**
- Intégration des dernières logiques du chat
- Optimisation automatique des performances
- Validation complète de l'intégrité
- Monitoring en temps réel des statistiques

## 📞 **Support**

### 👨‍💻 **Auteur**
- **Nom** : dlnraja
- **Email** : dylan.rajasekaram@gmail.com
- **GitHub** : [@dlnraja](https://github.com/dlnraja)

### 🐛 **Issues et Contributions**
- **Issues** : [GitHub Issues](https://github.com/dlnraja/tuya_repair/issues)
- **Pull Requests** : [GitHub PRs](https://github.com/dlnraja/tuya_repair/pulls)
- **Discussions** : [GitHub Discussions](https://github.com/dlnraja/tuya_repair/discussions)

## 📄 **Licence**

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🙏 **Remerciements**

- **Homey Team** - Pour le SDK et la documentation
- **Tuya** - Pour la compatibilité des appareils
- **Zigbee Alliance** - Pour le protocole Zigbee
- **Communauté Homey** - Pour les retours et contributions

---

**⭐ N'oubliez pas de donner une étoile au projet si vous l'appréciez !**