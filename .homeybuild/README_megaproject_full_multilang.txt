# Universal Tuya & Zigbee Device App – Mega Project (SDK3+, JS-only, Fully Autonomous)

## 📌 ENGLISH VERSION

### 🚀 Objective
A fully autonomous and self-healing Homey app for Tuya and Zigbee devices:
- JavaScript-only automation (no PowerShell)
- Automatic monthly enrichment & update (drivers, changelog, dashboard)
- Optional AI inference (OpenAI, HuggingFace, heuristics, forum scraping)
- Full SDK3+ compatibility for all Homey boxes (Pro, Cloud, Bridge)
- Devices separated: `/drivers/tuya/` and `/drivers/zigbee/`
- Cleans legacy code and folders (fusion*, .vscode, old/test drivers)
- Scrapes & syncs with: Z2M, ZHA, SmartLife/Samsung, ENKI, Domoticz, Zigbee official specs, Tuya SDK
- Dynamic TODO list for missing or incomplete devices
- Generates: README, CHANGELOG, drivers-matrix, GitHub Pages dashboard
- Auto-validates via Homey CLI (no auto-publish)
- Multilingual logs & commits (EN/FR/NL/TA)
- Regenerates past changelogs & history if corrupted or partial

### 🧠 Data Sources
- 🧩 Zigbee2MQTT device converters
- 🧩 ZHA integration (Home Assistant)
- 🧩 Samsung SmartLife (Zigbee SDK extraction)
- 🧩 Legrand/Enki (Zigbee profiles)
- 🧩 Domoticz forums and device DB
- 📚 Homey Community Forums: topics [26439], [140352]
- 📚 Zigbee Alliance specs, Tuya cluster/dp docs
- 🔁 Historical Git data, Homey CLI interviews

### 🔄 Monthly Automation
- `mega-pipeline.js` executes all:
  - Clean
  - Enrich
  - Reorganize
  - Test
  - Document
  - Dashboard deploy
  - Changelog generation (EN > FR > NL > TA)
- AI fallback for missing info (cluster, dpId, capabilities)
- Fallback templates for low-confidence detection
- Logs: no user config, no personal paths
- Smart caching of forum scraping + `.cache/` system

### 📊 Project Statistics
- **Total Drivers**: 550+ documented drivers
- **Tuya Drivers**: 400+ drivers in `/drivers/tuya/`
- **Zigbee Drivers**: 150+ drivers in `/drivers/zigbee/`
- **Categories**: Lights, Switches, Plugs, Sensors, Controls, Temperature
- **Compatibility**: All Homey boxes (Pro, Cloud, Bridge)
- **SDK Version**: 3+ exclusive
- **Languages**: EN, FR, NL, TA (priority order)

### 🛠️ Technical Features
- **Self-Healing**: Automatic detection and repair of broken files
- **Smart Enrichment**: AI-powered driver completion
- **Forum Integration**: Automatic scraping of Homey Community
- **GitHub Actions**: Monthly automated updates
- **Dashboard**: Real-time driver matrix and statistics
- **Documentation**: Multilingual README and CHANGELOG
- **Validation**: Homey CLI integration for testing

---

## 🇫🇷 VERSION FRANÇAISE

### 🚀 Objectif
Une application Homey totalement autonome pour gérer tous les appareils Tuya et Zigbee :
- Automatisation 100% JavaScript (PowerShell désactivé)
- Enrichissement automatique tous les mois
- IA facultative (OpenAI, HuggingFace, scraping forums, heuristiques)
- Compatibilité totale SDK3+ toutes Homey (Pro, Cloud, Bridge)
- Séparation stricte `/drivers/tuya/` et `/drivers/zigbee/`
- Nettoyage : `fusion*`, `.vscode`, anciens drivers, etc.
- Scraping + synchronisation : Z2M, ZHA, SmartLife/Samsung, Enki, Domoticz
- Génère README, CHANGELOG, matrice des drivers, Dashboard GitHub Pages
- Validé automatiquement via `homey app validate` (pas de publication directe)
- Traductions des logs et commits : anglais puis français

### 🧠 Sources de données
- 🧩 Zigbee2MQTT
- 🧩 ZHA (Home Assistant)
- 🧩 Samsung SmartLife (Zigbee SDK)
- 🧩 Legrand Enki
- 🧩 Forums Domoticz
- 📚 Forums Homey : sujets [26439], [140352]
- 📚 Spécifications Zigbee et Tuya (clusters, dp)
- 🔁 Données historiques du Git + Homey CLI

### 🔄 Automatisation Mensuelle
- `mega-pipeline.js` exécute tout :
  - Nettoyage
  - Enrichissement
  - Réorganisation
  - Tests
  - Documentation
  - Déploiement dashboard
  - Génération changelog (EN > FR > NL > TA)
- IA de secours pour infos manquantes (cluster, dpId, capacités)
- Templates de secours pour détection faible confiance
- Logs : pas de config utilisateur, pas de chemins personnels
- Cache intelligent du scraping forums + système `.cache/`

### 📊 Statistiques du Projet
- **Drivers Totaux**: 550+ drivers documentés
- **Drivers Tuya**: 400+ drivers dans `/drivers/tuya/`
- **Drivers Zigbee**: 150+ drivers dans `/drivers/zigbee/`
- **Catégories**: Lumières, Interrupteurs, Prises, Capteurs, Contrôles, Température
- **Compatibilité**: Toutes les box Homey (Pro, Cloud, Bridge)
- **Version SDK**: 3+ exclusif
- **Langues**: EN, FR, NL, TA (ordre de priorité)

### 🛠️ Fonctionnalités Techniques
- **Auto-réparation**: Détection et réparation automatique des fichiers cassés
- **Enrichissement intelligent**: Complétion des drivers par IA
- **Intégration forums**: Scraping automatique de la communauté Homey
- **GitHub Actions**: Mises à jour automatisées mensuelles
- **Dashboard**: Matrice des drivers et statistiques en temps réel
- **Documentation**: README et CHANGELOG multilingues
- **Validation**: Intégration Homey CLI pour les tests

---

## 🇳🇱 NEDERLANDS VERSIE

### 🚀 Doel
Volledig autonome Homey app voor Tuya & Zigbee apparaten:
- Alleen JavaScript (geen PowerShell)
- Automatische maandelijkse updates en verrijking
- AI-optie (OpenAI, HuggingFace, forum scraping)
- SDK3+ compatibiliteit voor alle Homey-versies
- Gescheiden `/drivers/tuya/` en `/drivers/zigbee/`
- Synchronisatie met Z2M, ZHA, SmartLife, Enki, Domoticz
- Automatische changelog, dashboard, documenten
- Homey CLI validatie (geen automatische publicatie)
- Meertalige logs & commits (EN → NL)

### 🧠 Gegevensbronnen
- 🧩 Zigbee2MQTT device converters
- 🧩 ZHA integratie (Home Assistant)
- 🧩 Samsung SmartLife (Zigbee SDK extractie)
- 🧩 Legrand/Enki (Zigbee profielen)
- 🧩 Domoticz forums en device DB
- 📚 Homey Community Forums: topics [26439], [140352]
- 📚 Zigbee Alliance specs, Tuya cluster/dp docs
- 🔁 Historische Git data, Homey CLI interviews

### 🔄 Maandelijkse Automatisering
- `mega-pipeline.js` voert alles uit:
  - Schoonmaken
  - Verrijking
  - Herorganisatie
  - Testen
  - Documentatie
  - Dashboard deploy
  - Changelog generatie (EN > FR > NL > TA)
- AI fallback voor ontbrekende info (cluster, dpId, capabilities)
- Fallback templates voor lage betrouwbaarheid detectie
- Logs: geen user config, geen persoonlijke paden
- Slimme caching van forum scraping + `.cache/` systeem

### 📊 Project Statistieken
- **Totaal Drivers**: 550+ gedocumenteerde drivers
- **Tuya Drivers**: 400+ drivers in `/drivers/tuya/`
- **Zigbee Drivers**: 150+ drivers in `/drivers/zigbee/`
- **Categorieën**: Lampen, Schakelaars, Stopcontacten, Sensoren, Controles, Temperatuur
- **Compatibiliteit**: Alle Homey boxes (Pro, Cloud, Bridge)
- **SDK Versie**: 3+ exclusief
- **Talen**: EN, FR, NL, TA (prioriteitsvolgorde)

### 🛠️ Technische Functies
- **Zelfherstellend**: Automatische detectie en reparatie van kapotte bestanden
- **Slimme verrijking**: AI-aangedreven driver voltooiing
- **Forum integratie**: Automatisch scraping van Homey Community
- **GitHub Actions**: Maandelijkse geautomatiseerde updates
- **Dashboard**: Real-time driver matrix en statistieken
- **Documentatie**: Meertalige README en CHANGELOG
- **Validatie**: Homey CLI integratie voor testen

---

## 🇱🇰 தமிழ்ப் பதிப்பு (Tamil - Sri Lanka)

### 🎯 குறிக்கோள்
Tuya மற்றும் Zigbee சாதனங்களுக்கு முழுமையான தானியங்கி Homey பயன்பாடு:
- JavaScript மட்டுமே (PowerShell இல்லை)
- மாதாந்திர புதுப்பிப்பு மற்றும் enrichment
- தேர்வுக்குரிய AI (OpenAI, HuggingFace)
- SDK3+ ஆதரவு அனைத்து Homey டிவைசுகளுக்கும்
- `/drivers/tuya/` மற்றும் `/drivers/zigbee/` தனியாக பிரிக்கப்பட்டவை
- Z2M, ZHA, Samsung SmartLife, Enki, Domoticz உடன் இணைப்பு
- README, CHANGELOG, dashboard தானாக உருவாகும்
- Homey CLI மூலம் Validate செய்கிறது (automatic publish இல்லை)

### 🧠 தரவு மூலங்கள்
- 🧩 Zigbee2MQTT சாதன மாற்றிகள்
- 🧩 ZHA ஒருங்கிணைப்பு (Home Assistant)
- 🧩 Samsung SmartLife (Zigbee SDK பிரித்தெடுத்தல்)
- 🧩 Legrand/Enki (Zigbee சுயவிவரங்கள்)
- 🧩 Domoticz forums மற்றும் சாதன DB
- 📚 Homey Community Forums: topics [26439], [140352]
- 📚 Zigbee Alliance specs, Tuya cluster/dp docs
- 🔁 வரலாற்று Git தரவு, Homey CLI நேர்காணல்கள்

### 🔄 மாதாந்திர தானியங்கி
- `mega-pipeline.js` அனைத்தையும் செயல்படுத்துகிறது:
  - சுத்தம் செய்தல்
  - செழிப்பாக்கம்
  - மறுசீரமைப்பு
  - சோதனை
  - ஆவணப்படுத்தல்
  - Dashboard deploy
  - Changelog உருவாக்கம் (EN > FR > NL > TA)
- காணாமல் போன தகவல்களுக்கு AI fallback (cluster, dpId, capabilities)
- குறைந்த நம்பகத்தன்மை கண்டறிதலுக்கு fallback templates
- Logs: user config இல்லை, தனிப்பட்ட பாதைகள் இல்லை
- Forum scraping இன் smart caching + `.cache/` system

### 📊 திட்ட புள்ளிவிவரங்கள்
- **மொத்த Drivers**: 550+ ஆவணப்படுத்தப்பட்ட drivers
- **Tuya Drivers**: 400+ drivers `/drivers/tuya/` இல்
- **Zigbee Drivers**: 150+ drivers `/drivers/zigbee/` இல்
- **வகைகள்**: விளக்குகள், சுவிட்சுகள், சாக்கெட்டுகள், சென்சார்கள், கட்டுப்பாடுகள், வெப்பநிலை
- **ஒத்திசைவு**: அனைத்து Homey boxes (Pro, Cloud, Bridge)
- **SDK பதிப்பு**: 3+ பிரத்தியேகம்
- **மொழிகள்**: EN, FR, NL, TA (முன்னுரிமை வரிசை)

### 🛠️ தொழில்நுட்ப அம்சங்கள்
- **சுய-குணப்படுத்தல்**: உடைந்த கோப்புகளின் தானியங்கி கண்டறிதல் மற்றும் சரிசெய்தல்
- **ஸ்மார்ட் செழிப்பாக்கம்**: AI-ஆல் இயக்கப்படும் driver முடிவுறுத்தல்
- **Forum ஒருங்கிணைப்பு**: Homey Community இன் தானியங்கி scraping
- **GitHub Actions**: மாதாந்திர தானியங்கி புதுப்பிப்புகள்
- **Dashboard**: Real-time driver matrix மற்றும் புள்ளிவிவரங்கள்
- **ஆவணப்படுத்தல்**: பலமொழி README மற்றும் CHANGELOG
- **சரிபார்ப்பு**: சோதனைக்கான Homey CLI ஒருங்கிணைப்பு

---

## 📋 PROJECT STRUCTURE

```
com.tuya.zigbee/
├── drivers/
│   ├── tuya/
│   │   ├── lights/          # Tuya light devices
│   │   ├── switches/        # Tuya switch devices
│   │   ├── plugs/           # Tuya plug devices
│   │   ├── sensors/         # Tuya sensor devices
│   │   └── controls/        # Tuya control devices
│   └── zigbee/
│       ├── lights/          # Generic Zigbee lights
│       ├── switches/        # Generic Zigbee switches
│       ├── sensors/         # Generic Zigbee sensors
│       └── temperature/     # Temperature sensors
├── scripts/
│   ├── core/               # Core automation scripts
│   ├── enrichment/         # AI enrichment scripts
│   └── validation/         # Testing and validation
├── docs/
│   ├── specs/             # Technical specifications
│   └── guides/            # User guides
├── .github/
│   └── workflows/         # GitHub Actions automation
├── app.js                 # Main application file
├── app.json              # Homey app configuration
├── package.json          # Dependencies
└── README.md            # This file
```

## 🚀 QUICK START

### Installation
```bash
# Clone the repository
git clone https://github.com/dlnraja/com.tuya.zigbee.git

# Install dependencies
npm install

# Validate the app
homey app validate

# Install on Homey
homey app install
```

### Development
```bash
# Run the mega pipeline
node scripts/core/mega-pipeline-ultimate.js

# Run specific modules
node scripts/core/fusion-tuya-light-drivers.js
node scripts/core/ultimate-driver-analyzer.js
node scripts/core/release-manager.js
```

## 📊 DRIVER STATISTICS

### Current Status
- **Total Drivers**: 550+ documented
- **Tuya Drivers**: 400+ (lights, switches, plugs, sensors, controls)
- **Zigbee Drivers**: 150+ (generic devices, temperature sensors)
- **Categories**: 6 main categories with subcategories
- **Compatibility**: All Homey boxes (Pro, Cloud, Bridge)
- **SDK Version**: 3+ exclusive

### Driver Categories
1. **Lights** - RGB, dimmable, tunable, strips, panels
2. **Switches** - On/off, dimmers, scene controllers
3. **Plugs** - Smart plugs, power monitoring
4. **Sensors** - Motion, contact, humidity, pressure
5. **Controls** - Curtains, blinds, thermostats
6. **Temperature** - Temperature and humidity sensors

## 🔧 TECHNICAL SPECIFICATIONS

### Homey SDK3+ Compatibility
- **Minimum SDK**: 3.0.0
- **Target SDK**: Latest stable
- **Compatibility**: Pro, Cloud, Bridge
- **Features**: Full SDK3+ features

### Driver Structure
Each driver contains:
- `driver.compose.json` - Driver configuration
- `device.js` - Device implementation
- `icon.svg` - Device icon (optional)
- `images/` - Device images (optional)

### Automation Features
- **Self-Healing**: Automatic file repair
- **Smart Enrichment**: AI-powered completion
- **Forum Integration**: Community scraping
- **GitHub Actions**: Monthly updates
- **Dashboard**: Real-time statistics
- **Documentation**: Multilingual support

## 📚 DOCUMENTATION

### Guides
- [Installation Guide](docs/guides/installation.md)
- [Driver Development](docs/guides/driver-development.md)
- [Automation Setup](docs/guides/automation.md)
- [Troubleshooting](docs/guides/troubleshooting.md)

### Specifications
- [Driver Specification](docs/specs/driver-spec.md)
- [API Documentation](docs/specs/api.md)
- [Automation Rules](docs/specs/automation.md)

## 🤝 CONTRIBUTING

### Development Rules
1. **JavaScript Only**: No PowerShell scripts
2. **SDK3+**: All code must be SDK3+ compatible
3. **Multilingual**: Support EN, FR, NL, TA
4. **Automation**: Monthly automated updates
5. **Validation**: All changes must pass `homey app validate`

### Code Style
- **Language**: JavaScript (ES6+)
- **Formatting**: Prettier
- **Linting**: ESLint
- **Testing**: Homey CLI validation

## 📄 LICENSE

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 ACKNOWLEDGMENTS

- **Homey Community**: For device reports and feedback
- **Zigbee2MQTT**: For device definitions
- **ZHA**: For Home Assistant integration
- **Samsung SmartLife**: For Zigbee SDK
- **Legrand Enki**: For Zigbee profiles
- **Domoticz**: For device database

---

**📅 Last Updated**: 31/07/2025  
**🔧 Version**: 3.1.0  
**✅ Status**: FUSION TUYA-LIGHT COMPLETE - READY FOR PRODUCTION

---

For all contributions, rules, changelog and upgrade process: see `/docs/specs/`, `/scripts/`, and `.github/workflows/`. 