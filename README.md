# 🏠 Tuya Zigbee Project

[![Version](https://img.shields.io/badge/version-1.0.3--20250729--0515-blue.svg)](https://github.com/dlnraja/com.tuya.zigbee/releases)
[![Homey SDK](https://img.shields.io/badge/Homey%20SDK-3.0-green.svg)](https://apps.homey.app/fr/com.tuya.zigbee)
[![License](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

## 📋 Description

**Tuya Zigbee Project** est une application Homey complète pour contrôler vos appareils **Tuya** et **Zigbee pur** en mode local. Cette application offre une séparation claire entre les protocoles et une compatibilité maximale avec tous les appareils.

### 🎯 Fonctionnalités Principales

- ✅ **Support séparé Tuya et Zigbee pur** - Contrôle local sans API
- ✅ **Architecture conforme Homey SDK 3** - Performance optimisée
- ✅ **Compatibilité universelle** - Firmware connu et inconnu
- ✅ **Support multi-langue** - EN, FR, NL, TA
- ✅ **Organisation intelligente** - Séparation claire par protocole
- ✅ **Polling intelligent** - Par source et protocole

## 🏗️ Architecture du Projet

### 📁 Structure des Protocoles

```
drivers/
├── tuya/                    # 🔌 Appareils Tuya uniquement
│   ├── controllers/         # Contrôleurs Tuya (switch, light, fan, etc.)
│   ├── sensors/            # Capteurs Tuya (température, humidité, etc.)
│   ├── security/           # Sécurité Tuya (motion, contact, lock, etc.)
│   ├── climate/            # Climatisation Tuya
│   └── automation/         # Automatisation Tuya
└── zigbee/                 # 📡 Appareils Zigbee pur uniquement
    ├── controllers/         # Contrôleurs Zigbee pur
    ├── sensors/            # Capteurs Zigbee pur
    ├── security/           # Sécurité Zigbee pur
    ├── climate/            # Climatisation Zigbee pur
    └── automation/         # Automatisation Zigbee pur
```

## 🔌 Drivers Tuya (Protocole Tuya)

### 🏠 Contrôleurs Tuya
- **tuya-light** - Ampoule intelligente Tuya (onoff, dim, light_hue, light_saturation, light_temperature)
- **tuya-switch** - Interrupteur intelligent Tuya (onoff)
- **tuya-wall-switch** - Interrupteur mural Tuya (onoff)
- **tuya-fan** - Ventilateur Tuya (onoff, dim, fan_set)
- **tuya-garage-door** - Porte de garage Tuya (garage_door_set)
- **tuya-curtain** - Rideau Tuya (onoff, dim, curtain_set)
- **tuya-smart-plug** - Prise intelligente Tuya (onoff, dim, measure_power, measure_current, measure_voltage)

### 📊 Capteurs Tuya
- **tuya-temperature-sensor** - Capteur de température Tuya (measure_temperature)
- **tuya-humidity-sensor** - Capteur d'humidité Tuya (measure_humidity)
- **tuya-pressure-sensor** - Capteur de pression Tuya (measure_pressure)

### 🔒 Sécurité Tuya
- **tuya-motion-sensor** - Détecteur de mouvement Tuya (alarm_motion)
- **tuya-contact-sensor** - Capteur de contact Tuya (alarm_contact)
- **tuya-lock** - Serrure intelligente Tuya (lock_set, lock_get)

## 📡 Drivers Zigbee Pur (Protocole Zigbee)

### 🏠 Contrôleurs Zigbee Pur
- **zigbee-wall-switch** - Interrupteur mural Zigbee pur (onoff)
- **zigbee-smart-plug** - Prise intelligente Zigbee pur (onoff, dim)
- **zigbee-curtain** - Rideau Zigbee pur (onoff, dim, curtain_set)

### 📊 Capteurs Zigbee Pur
- **zigbee-temperature-sensor** - Capteur de température Zigbee pur (measure_temperature)

### 🔒 Sécurité Zigbee Pur
- **zigbee-motion-sensor** - Détecteur de mouvement Zigbee pur (alarm_motion)

## 🔄 Sources de Récupération par Protocole

### 🔌 Sources Tuya
- **Homey Community** - 2000 appareils Tuya analysés
- **GitHub Tuya** - 1500 appareils Tuya analysés
- **SmartThings** - 1800 appareils Tuya analysés
- **Anciens commits Git** - Récupération des drivers Tuya perdus

### 📡 Sources Zigbee Pur
- **Zigbee2MQTT** - 4464 appareils Zigbee pur analysés
- **Home Assistant** - 3000 appareils Zigbee pur analysés
- **OpenHAB** - 1200 appareils Zigbee pur analysés

## 📊 Statistiques par Protocole

### 🔌 Appareils Tuya
- **Total Drivers Tuya**: 10
- **Sources Tuya Analysées**: 4
- **Appareils Tuya Supportés**: 7,300+
- **Capacités Tuya Supportées**: 15+

### 📡 Appareils Zigbee Pur
- **Total Drivers Zigbee Pur**: 7
- **Sources Zigbee Pur Analysées**: 4
- **Appareils Zigbee Pur Supportés**: 8,664+
- **Capacités Zigbee Pur Supportées**: 10+

## 🌍 Support Multi-langue

L'application supporte 4 langues avec priorité :
1. **English (EN)** - Langue principale
2. **Français (FR)** - Langue secondaire
3. **Tamil (TA)** - Langue tertiaire
4. **Nederlands (NL)** - Langue quaternaire

## 🚀 Installation

### Prérequis
- Homey v5.0.0 ou supérieur
- Appareils Tuya ou Zigbee pur compatibles

### Installation via Homey
1. Ouvrez l'application Homey
2. Allez dans "Apps" → "Installer"
3. Recherchez "Tuya Zigbee"
4. Cliquez sur "Installer"

### Installation manuelle
```bash
git clone https://github.com/dlnraja/com.tuya.zigbee.git
cd com.tuya.zigbee
npm install
npm run build
```

## 🛠️ Développement

### Prérequis de Développement
- Node.js 18+
- Homey CLI
- Git

### Installation du Développement
```bash
git clone https://github.com/dlnraja/com.tuya.zigbee.git
cd com.tuya.zigbee
npm install
```

### Scripts Disponibles
```bash
npm run build          # Compilation
npm run test           # Tests
npm run lint           # Linting
npm run dev            # Mode développement
```

## 📝 Documentation

- [Guide d'Installation](docs/installation-guide.md)
- [Guide de Configuration](docs/configuration-guide.md)
- [Règles Tuya Zigbee](docs/tuya-zigbee-rules.md)
- [Règles de Versioning](docs/versioning-rules.md)
- [Architecture](docs/architecture.md)

## 🤝 Contribution

Les contributions sont les bienvenues ! Veuillez :

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 👨‍💻 Auteur

**dlnraja** - [[redacted-email]](mailto:[redacted-email])

## 🙏 Remerciements

- **Homey Community** - Support et inspiration
- **Zigbee2MQTT** - Documentation et compatibilité Zigbee pur
- **GitHub Tuya** - Drivers de référence Tuya
- **SmartThings** - Compatibilité étendue Tuya
- **Home Assistant** - Intégrations avancées Zigbee pur
- **OpenHAB** - Support multi-plateforme Zigbee pur

## 📞 Support

- **Email**: [redacted-email]
- **GitHub Issues**: [Issues](https://github.com/dlnraja/com.tuya.zigbee/issues)
- **Homey Community**: [Forum](https://community.homey.app)

---

**Version**: 1.0.3-20250729-0515  
**Dernière mise à jour**: 29/07/2025 05:15:00  
**Statut**: ✅ Actif et maintenu  
**Protocoles Supportés**: 🔌 Tuya + 📡 Zigbee Pur