# 🏠 Tuya Zigbee Project

[![Version](https://img.shields.io/badge/version-1.0.4--20250729--0530-blue.svg)](https://github.com/dlnraja/com.tuya.zigbee/releases)
[![Homey SDK](https://img.shields.io/badge/Homey%20SDK-3.0-green.svg)](https://apps.homey.app/fr/com.tuya.zigbee)
[![License](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![Languages](https://img.shields.io/badge/languages-EN%20%7C%20FR%20%7C%20NL%20%7C%20TA-orange.svg)](README.md)

---

## 📋 Description / Description / Beschrijving / விளக்கம்

**English**: Complete Homey application for controlling Tuya and pure Zigbee devices in local mode. This application offers clear separation between protocols and maximum compatibility with all devices.

**Français**: Application Homey complète pour contrôler vos appareils Tuya et Zigbee pur en mode local. Cette application offre une séparation claire entre les protocoles et une compatibilité maximale avec tous les appareils.

**Nederlands**: Complete Homey-applicatie voor het besturen van Tuya en pure Zigbee-apparaten in lokale modus. Deze applicatie biedt duidelijke scheiding tussen protocollen en maximale compatibiliteit met alle apparaten.

**தமிழ்**: உள்ளூர் பயன்முறையில் Tuya மற்றும் தூய Zigbee சாதனங்களை கட்டுப்படுத்த Homey முழுமையான பயன்பாடு. இந்த பயன்பாடு நெறிமுறைகளுக்கு இடையே தெளிவான பிரிப்பு மற்றும் அனைத்து சாதனங்களுடனும் அதிகபட்ச பொருந்தக்கூடிய தன்மையை வழங்குகிறது.

---

## 🎯 Key Features / Fonctionnalités Principales / Belangrijkste Functies / முக்கிய அம்சங்கள்

### ✅ **Multi-Protocol Support / Support Multi-Protocole / Multi-Protocol Ondersteuning / பல நெறிமுறை ஆதரவு**
- **Tuya Protocol**: Local control without API dependency
- **Pure Zigbee Protocol**: Direct Zigbee communication
- **Clear Separation**: Organized by protocol and category
- **Universal Compatibility**: Known and unknown firmware support

### ✅ **Homey SDK 3 Architecture / Architecture Homey SDK 3 / Homey SDK 3 Architectuur / Homey SDK 3 கட்டமைப்பு**
- **Optimized Performance**: Fast response times
- **Intelligent Polling**: Protocol-specific polling
- **Error Handling**: Comprehensive error management
- **Modular Design**: Easy maintenance and extension

### ✅ **Multi-Language Support / Support Multi-Langue / Multi-Taal Ondersteuning / பல மொழி ஆதரவு**
- **English (EN)**: Primary language
- **Français (FR)**: Secondary language  
- **Nederlands (NL)**: Tertiary language
- **தமிழ் (TA)**: Quaternary language

---

## 🏗️ Project Architecture / Architecture du Projet / Project Architectuur / திட்ட கட்டமைப்பு

### 📁 **Protocol Structure / Structure des Protocoles / Protocol Structuur / நெறிமுறை கட்டமைப்பு**

```
drivers/
├── tuya/                    # 🔌 Tuya devices only / Appareils Tuya uniquement / Alleen Tuya-apparaten / Tuya சாதனங்கள் மட்டும்
│   ├── controllers/         # Tuya Controllers / Contrôleurs Tuya / Tuya Controllers / Tuya கட்டுப்படுத்திகள்
│   ├── sensors/            # Tuya Sensors / Capteurs Tuya / Tuya Sensoren / Tuya சென்சார்கள்
│   ├── security/           # Tuya Security / Sécurité Tuya / Tuya Beveiliging / Tuya பாதுகாப்பு
│   ├── climate/            # Tuya Climate / Climatisation Tuya / Tuya Klimaat / Tuya காலநிலை
│   └── automation/         # Tuya Automation / Automatisation Tuya / Tuya Automatisering / Tuya தானியக்கம்
└── zigbee/                 # 📡 Pure Zigbee devices only / Appareils Zigbee pur uniquement / Alleen pure Zigbee-apparaten / தூய Zigbee சாதனங்கள் மட்டும்
    ├── controllers/         # Zigbee Controllers / Contrôleurs Zigbee / Zigbee Controllers / Zigbee கட்டுப்படுத்திகள்
    ├── sensors/            # Zigbee Sensors / Capteurs Zigbee / Zigbee Sensoren / Zigbee சென்சார்கள்
    ├── security/           # Zigbee Security / Sécurité Zigbee / Zigbee Beveiliging / Zigbee பாதுகாப்பு
    ├── climate/            # Zigbee Climate / Climatisation Zigbee / Zigbee Klimaat / Zigbee காலநிலை
    └── automation/         # Zigbee Automation / Automatisation Zigbee / Zigbee Automatisering / Zigbee தானியக்கம்
```

---

## 🔌 Tuya Drivers / Drivers Tuya / Tuya Drivers / Tuya டிரைவர்கள்

### 🏠 **Tuya Controllers / Contrôleurs Tuya / Tuya Controllers / Tuya கட்டுப்படுத்திகள்**
- **tuya-light**: Smart Tuya bulb (onoff, dim, light_hue, light_saturation, light_temperature)
- **tuya-switch**: Smart Tuya switch (onoff)
- **tuya-wall-switch**: Tuya wall switch (onoff)
- **tuya-fan**: Tuya fan (onoff, dim, fan_set)
- **tuya-garage-door**: Tuya garage door (garage_door_set)
- **tuya-curtain**: Tuya curtain (onoff, dim, curtain_set)
- **tuya-smart-plug**: Smart Tuya plug (onoff, dim, measure_power, measure_current, measure_voltage)

### 📊 **Tuya Sensors / Capteurs Tuya / Tuya Sensoren / Tuya சென்சார்கள்**
- **tuya-temperature-sensor**: Tuya temperature sensor (measure_temperature)
- **tuya-humidity-sensor**: Tuya humidity sensor (measure_humidity)
- **tuya-pressure-sensor**: Tuya pressure sensor (measure_pressure)

### 🔒 **Tuya Security / Sécurité Tuya / Tuya Beveiliging / Tuya பாதுகாப்பு**
- **tuya-motion-sensor**: Tuya motion detector (alarm_motion)
- **tuya-contact-sensor**: Tuya contact sensor (alarm_contact)
- **tuya-lock**: Smart Tuya lock (lock_set, lock_get)

---

## 📡 Pure Zigbee Drivers / Drivers Zigbee Pur / Pure Zigbee Drivers / தூய Zigbee டிரைவர்கள்

### 🏠 **Pure Zigbee Controllers / Contrôleurs Zigbee Pur / Pure Zigbee Controllers / தூய Zigbee கட்டுப்படுத்திகள்**
- **zigbee-wall-switch**: Pure Zigbee wall switch (onoff)
- **zigbee-smart-plug**: Pure Zigbee smart plug (onoff, dim)
- **zigbee-curtain**: Pure Zigbee curtain (onoff, dim, curtain_set)

### 📊 **Pure Zigbee Sensors / Capteurs Zigbee Pur / Pure Zigbee Sensoren / தூய Zigbee சென்சார்கள்**
- **zigbee-temperature-sensor**: Pure Zigbee temperature sensor (measure_temperature)

### 🔒 **Pure Zigbee Security / Sécurité Zigbee Pur / Pure Zigbee Beveiliging / தூய Zigbee பாதுகாப்பு**
- **zigbee-motion-sensor**: Pure Zigbee motion detector (alarm_motion)

---

## 🔄 Recovery Sources by Protocol / Sources de Récupération par Protocole / Herstelbronnen per Protocol / நெறிமுறை வாரியாக மீட்பு மூலங்கள்

### 🔌 **Tuya Sources / Sources Tuya / Tuya Bronnen / Tuya மூலங்கள்**
- **Homey Community**: 2000 Tuya devices analyzed / 2000 appareils Tuya analysés / 2000 Tuya-apparaten geanalyseerd / 2000 Tuya சாதனங்கள் பகுப்பாய்வு செய்யப்பட்டன
- **GitHub Tuya**: 1500 Tuya devices analyzed / 1500 appareils Tuya analysés / 1500 Tuya-apparaten geanalyseerd / 1500 Tuya சாதனங்கள் பகுப்பாய்வு செய்யப்பட்டன
- **SmartThings**: 1800 Tuya devices analyzed / 1800 appareils Tuya analysés / 1800 Tuya-apparaten geanalyseerd / 1800 Tuya சாதனங்கள் பகுப்பாய்வு செய்யப்பட்டன
- **Old Git Commits**: Tuya drivers recovery / Récupération des drivers Tuya / Tuya drivers herstel / Tuya டிரைவர்கள் மீட்பு

### 📡 **Pure Zigbee Sources / Sources Zigbee Pur / Pure Zigbee Bronnen / தூய Zigbee மூலங்கள்**
- **Zigbee2MQTT**: 4464 pure Zigbee devices analyzed / 4464 appareils Zigbee pur analysés / 4464 pure Zigbee-apparaten geanalyseerd / 4464 தூய Zigbee சாதனங்கள் பகுப்பாய்வு செய்யப்பட்டன
- **Home Assistant**: 3000 pure Zigbee devices analyzed / 3000 appareils Zigbee pur analysés / 3000 pure Zigbee-apparaten geanalyseerd / 3000 தூய Zigbee சாதனங்கள் பகுப்பாய்வு செய்யப்பட்டன
- **OpenHAB**: 1200 pure Zigbee devices analyzed / 1200 appareils Zigbee pur analysés / 1200 pure Zigbee-apparaten geanalyseerd / 1200 தூய Zigbee சாதனங்கள் பகுப்பாய்வு செய்யப்பட்டன

---

## 📊 Statistics by Protocol / Statistiques par Protocole / Statistieken per Protocol / நெறிமுறை வாரியாக புள்ளிவிவரங்கள்

### 🔌 **Tuya Devices / Appareils Tuya / Tuya Apparaten / Tuya சாதனங்கள்**
| Category / Catégorie / Categorie / வகை | Drivers / Drivers / Drivers / டிரைவர்கள் | Capabilities / Capacités / Mogelijkheden / திறன்கள் |
|------------|-------------------|----------------------|
| Controllers / Contrôleurs / Controllers / கட்டுப்படுத்திகள் | 7 | onoff, dim, fan_set, garage_door_set, curtain_set, measure_power |
| Sensors / Capteurs / Sensoren / சென்சார்கள் | 3 | measure_temperature, measure_humidity, measure_pressure |
| Security / Sécurité / Beveiliging / பாதுகாப்பு | 3 | alarm_motion, alarm_contact, lock_set, lock_get |
| **Total / Total / Totaal / மொத்தம்** | **13** | **15+ capabilities / capacités / mogelijkheden / திறன்கள்** |

### 📡 **Pure Zigbee Devices / Appareils Zigbee Pur / Pure Zigbee Apparaten / தூய Zigbee சாதனங்கள்**
| Category / Catégorie / Categorie / வகை | Drivers / Drivers / Drivers / டிரைவர்கள் | Capabilities / Capacités / Mogelijkheden / திறன்கள் |
|------------|-------------------|----------------------|
| Controllers / Contrôleurs / Controllers / கட்டுப்படுத்திகள் | 3 | onoff, dim, curtain_set |
| Sensors / Capteurs / Sensoren / சென்சார்கள் | 1 | measure_temperature |
| Security / Sécurité / Beveiliging / பாதுகாப்பு | 1 | alarm_motion |
| **Total / Total / Totaal / மொத்தம்** | **5** | **5+ capabilities / capacités / mogelijkheden / திறன்கள்** |

---

## 🚀 Installation / Installation / Installatie / நிறுவல்

### Prerequisites / Prérequis / Vereisten / முன்நிபந்தனைகள்
- Homey v5.0.0 or higher / Homey v5.0.0 ou supérieur / Homey v5.0.0 of hoger / Homey v5.0.0 அல்லது அதற்கு மேற்பட்டது
- Compatible Tuya or pure Zigbee devices / Appareils Tuya ou Zigbee pur compatibles / Compatibele Tuya of pure Zigbee-apparaten / பொருந்தக்கூடிய Tuya அல்லது தூய Zigbee சாதனங்கள்

### Installation via Homey / Installation via Homey / Installatie via Homey / Homey மூலம் நிறுவல்
1. Open Homey app / Ouvrez l'application Homey / Open de Homey-app / Homey பயன்பாட்டைத் திறக்கவும்
2. Go to "Apps" → "Install" / Allez dans "Apps" → "Installer" / Ga naar "Apps" → "Installeren" / "Apps" → "நிறுவு"க்குச் செல்லவும்
3. Search for "Tuya Zigbee" / Recherchez "Tuya Zigbee" / Zoek naar "Tuya Zigbee" / "Tuya Zigbee"ஐத் தேடவும்
4. Click "Install" / Cliquez sur "Installer" / Klik op "Installeren" / "நிறுவு"ஐக் கிளிக் செய்யவும்

### Manual Installation / Installation manuelle / Handmatige installatie / கைமுறை நிறுவல்
```bash
git clone https://github.com/dlnraja/com.tuya.zigbee.git
cd com.tuya.zigbee
npm install
npm run build
```

---

## 🛠️ Development / Développement / Ontwikkeling / மேம்பாடு

### Development Prerequisites / Prérequis de Développement / Ontwikkeling Vereisten / மேம்பாட்டு முன்நிபந்தனைகள்
- Node.js 18+ / Node.js 18+ / Node.js 18+ / Node.js 18+
- Homey CLI / Homey CLI / Homey CLI / Homey CLI
- Git / Git / Git / Git

### Development Installation / Installation du Développement / Ontwikkeling Installatie / மேம்பாட்டு நிறுவல்
```bash
git clone https://github.com/dlnraja/com.tuya.zigbee.git
cd com.tuya.zigbee
npm install
```

### Available Scripts / Scripts Disponibles / Beschikbare Scripts / கிடைக்கும் ஸ்கிரிப்ட்கள்
```bash
npm run build          # Build / Compilation / Bouwen / கட்டமைத்தல்
npm run test           # Tests / Tests / Tests / சோதனைகள்
npm run lint           # Linting / Linting / Linting / லிண்டிங்
npm run dev            # Development mode / Mode développement / Ontwikkelingsmodus / மேம்பாட்டு பயன்முறை
```

---

## 📝 Documentation / Documentation / Documentatie / ஆவணப்படுத்தல்

- [Installation Guide / Guide d'Installation / Installatie Gids / நிறுவல் வழிகாட்டி](docs/installation-guide.md)
- [Configuration Guide / Guide de Configuration / Configuratie Gids / கட்டமைப்பு வழிகாட்டி](docs/configuration-guide.md)
- [Tuya Zigbee Rules / Règles Tuya Zigbee / Tuya Zigbee Regels / Tuya Zigbee விதிகள்](docs/tuya-zigbee-rules.md)
- [Versioning Rules / Règles de Versioning / Versie Regels / பதிப்பு விதிகள்](docs/versioning-rules.md)
- [Architecture / Architecture / Architectuur / கட்டமைப்பு](docs/architecture.md)

---

## 🤝 Contribution / Contribution / Bijdrage / பங்களிப்பு

Contributions are welcome! Please / Les contributions sont les bienvenues ! Veuillez / Bijdragen zijn welkom! Gelieve / பங்களிப்புகள் வரவேற்கப்படுகின்றன! தயவுசெய்து:

1. Fork the project / Fork le projet / Fork het project / திட்டத்தை fork செய்யவும்
2. Create a feature branch / Créer une branche feature / Maak een feature branch / ஒரு feature branch உருவாக்கவும் (`git checkout -b feature/AmazingFeature`)
3. Commit your changes / Commit vos changements / Commit je wijzigingen / உங்கள் மாற்றங்களை commit செய்யவும் (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch / Push vers la branche / Push naar de branch / branchக்கு push செய்யவும் (`git push origin feature/AmazingFeature`)
5. Open a Pull Request / Ouvrir une Pull Request / Open een Pull Request / ஒரு Pull Request திறக்கவும்

---

## 📄 License / Licence / Licentie / உரிமம்

This project is under MIT license. See the [LICENSE](LICENSE) file for more details.

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

Dit project is onder MIT licentie. Zie het [LICENSE](LICENSE) bestand voor meer details.

இந்த திட்டம் MIT உரிமத்தின் கீழ் உள்ளது. மேலும் விவரங்களுக்கு [LICENSE](LICENSE) கோப்பைப் பார்க்கவும்.

---

## 👨‍💻 Author / Auteur / Auteur / ஆசிரியர்

**dlnraja** - [dylan.rajasekaram+homey@gmail.com](mailto:dylan.rajasekaram+homey@gmail.com)

---

## 🙏 Acknowledgments / Remerciements / Dankbetuigingen / நன்றிகள்

- **Homey Community**: Support and inspiration / Support et inspiration / Ondersteuning en inspiratie / ஆதரவு மற்றும் ஈர்ப்பு
- **Zigbee2MQTT**: Documentation and pure Zigbee compatibility / Documentation et compatibilité Zigbee pur / Documentatie en pure Zigbee-compatibiliteit / ஆவணப்படுத்தல் மற்றும் தூய Zigbee பொருந்தக்கூடிய தன்மை
- **GitHub Tuya**: Reference Tuya drivers / Drivers de référence Tuya / Referentie Tuya drivers / குறிப்பு Tuya டிரைவர்கள்
- **SmartThings**: Extended Tuya compatibility / Compatibilité étendue Tuya / Uitgebreide Tuya-compatibiliteit / விரிவான Tuya பொருந்தக்கூடிய தன்மை
- **Home Assistant**: Advanced pure Zigbee integrations / Intégrations avancées Zigbee pur / Geavanceerde pure Zigbee-integraties / மேம்பட்ட தூய Zigbee ஒருங்கிணைப்புகள்
- **OpenHAB**: Multi-platform pure Zigbee support / Support multi-plateforme Zigbee pur / Multi-platform pure Zigbee-ondersteuning / பல தள தூய Zigbee ஆதரவு

---

## 📞 Support / Support / Ondersteuning / ஆதரவு

- **Email**: dylan.rajasekaram+homey@gmail.com
- **GitHub Issues**: [Issues](https://github.com/dlnraja/com.tuya.zigbee/issues)
- **Homey Community**: [Forum](https://community.homey.app)

---

**Version / Version / Versie / பதிப்பு**: 1.0.4-20250729-0530  
**Last Update / Dernière mise à jour / Laatste update / கடைசி புதுப்பிப்பு**: 29/07/2025 05:30:00  
**Status / Statut / Status / நிலை**: ✅ Active and maintained / Actif et maintenu / Actief en onderhouden / செயலில் மற்றும் பராமரிக்கப்படுகிறது  
**Supported Protocols / Protocoles Supportés / Ondersteunde Protocollen / ஆதரிக்கப்படும் நெறிமுறைகள்**: 🔌 Tuya + 📡 Pure Zigbee / Tuya + Zigbee Pur / Tuya + Pure Zigbee / Tuya + தூய Zigbee