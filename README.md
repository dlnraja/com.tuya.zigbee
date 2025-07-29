# 🏠 Tuya Zigbee Project

[![Version](https://img.shields.io/badge/version-1.0.9--20250729--0620-blue.svg)](https://github.com/dlnraja/com.tuya.zigbee/releases)
[![Homey SDK](https://img.shields.io/badge/Homey%20SDK-3.0-green.svg)](https://apps.homey.app/fr/com.tuya.zigbee)
[![License](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![Languages](https://img.shields.io/badge/languages-EN%20%7C%20FR%20%7C%20NL%20%7C%20TA-orange.svg)](README.md)

---

## ENGLISH VERSION

### 📋 Description

Complete Homey application for controlling Tuya and pure Zigbee devices in local mode. This application offers clear separation between protocols and maximum compatibility with all devices. Features include multi-protocol support, Homey SDK 3 architecture, multi-language support, local control, and universal compatibility.

### 🎯 Key Features

- **Multi-Protocol Support**: Tuya and Pure Zigbee protocols
- **Homey SDK 3 Architecture**: Modern and optimized structure
- **Multi-Language Support**: EN, FR, NL, TA
- **Local Control**: No API dependency for Tuya devices
- **Universal Compatibility**: Known and unknown firmware support
- **Intelligent Polling**: Protocol-specific polling systems
- **Error Handling**: Comprehensive error management
- **Modular Design**: Easy maintenance and extension
- **Performance Optimization**: Fast response times
- **Security Features**: Advanced security implementations

### 🏗️ Project Architecture

Organized by protocol (Tuya/Zigbee) and category (controllers/sensors/security/climate/automation). Clear separation between Tuya devices (local control without API) and pure Zigbee devices (direct Zigbee communication). Modular structure with intelligent folder organization and extensible design.

### 🔌 Tuya Drivers

13 Tuya drivers across controllers, sensors, and security categories. Each driver supports local control without API dependency, intelligent polling, error handling, and universal compatibility with known and unknown firmware versions.

**Controllers**: tuya-light, tuya-switch, tuya-wall-switch, tuya-fan, tuya-garage-door, tuya-curtain, tuya-smart-plug
**Sensors**: tuya-temperature-sensor, tuya-humidity-sensor, tuya-pressure-sensor
**Security**: tuya-motion-sensor, tuya-contact-sensor, tuya-lock

### 📡 Pure Zigbee Drivers

5 Pure Zigbee drivers for direct Zigbee communication. Each driver implements Homey SDK 3 best practices with intelligent polling, error handling, and universal compatibility. Supports both generic and specific device types.

**Controllers**: zigbee-wall-switch, zigbee-smart-plug, zigbee-curtain
**Sensors**: zigbee-temperature-sensor
**Security**: zigbee-motion-sensor

### 📊 Statistics

18 total drivers, 20+ capabilities, 2 protocols supported. Comprehensive coverage across all device categories with intelligent fallback systems and universal compatibility.

### 🚀 Installation

Install via Homey app or manual installation with npm. Prerequisites include Homey v5.0.0+, compatible Tuya or pure Zigbee devices, Node.js 18+, and Homey CLI for development.

### 🛠️ Development

Node.js 18+, Homey CLI, Git required for development. Available scripts include build, test, lint, validate, deploy, and dev. Comprehensive error handling and intelligent polling systems implemented.

### 📝 Documentation

Complete guides for installation, configuration, and architecture. Includes comprehensive documentation for all drivers, troubleshooting guides, and best practices for development and deployment.

### 🤝 Contribution

Fork, create feature branch, commit changes, push, open Pull Request. Follow coding standards, include tests, update documentation, and ensure compatibility with existing drivers.

### 📄 License

MIT license - see LICENSE file for details. This project is open source and welcomes contributions from the community while maintaining high standards of quality and compatibility.

### 👨‍💻 Author

**dlnraja** - [[redacted-email]](mailto:[redacted-email])

Lead developer and maintainer of the Tuya Zigbee project, specializing in Homey SDK 3 development and multi-protocol device integration.

### 🙏 Acknowledgments

Homey Community, Zigbee2MQTT, GitHub Tuya, SmartThings, Home Assistant, OpenHAB, Node-RED, Domoticz, Fibaro, Vera, Hubitat, OpenZwave, Amazon Alexa, Google Home, Apple HomeKit, Samsung SmartThings, IFTTT, Zapier, Microsoft Azure IoT, AWS IoT, Google Cloud IoT, IBM Watson IoT

### 📞 Support

Email support at [redacted-email], GitHub Issues for bug reports and feature requests, Homey Community Forum for general discussions and troubleshooting assistance.

---

## VERSION FRANÇAISE

### 📋 Description

Application Homey complète pour contrôler vos appareils Tuya et Zigbee pur en mode local. Cette application offre une séparation claire entre les protocoles et une compatibilité maximale avec tous les appareils. Fonctionnalités incluant le support multi-protocole, l'architecture Homey SDK 3, le support multi-langue, le contrôle local et la compatibilité universelle.

### 🎯 Fonctionnalités Principales

- **Support Multi-Protocole**: Protocoles Tuya et Zigbee pur
- **Architecture Homey SDK 3**: Structure moderne et optimisée
- **Support Multi-Langue**: EN, FR, NL, TA
- **Contrôle Local**: Aucune dépendance API pour les appareils Tuya
- **Compatibilité Universelle**: Support firmware connu et inconnu
- **Polling Intelligent**: Systèmes de polling spécifiques au protocole
- **Gestion d'Erreur**: Gestion d'erreur complète
- **Design Modulaire**: Maintenance et extension faciles
- **Optimisation Performance**: Temps de réponse rapides
- **Fonctionnalités Sécurité**: Implémentations de sécurité avancées

### 🏗️ Architecture du Projet

Organisé par protocole (Tuya/Zigbee) et catégorie (contrôleurs/capteurs/sécurité/climat/automatisation). Séparation claire entre appareils Tuya (contrôle local sans API) et appareils Zigbee pur (communication Zigbee directe). Structure modulaire avec organisation intelligente des dossiers et design extensible.

### 🔌 Drivers Tuya

13 drivers Tuya répartis en contrôleurs, capteurs et sécurité. Chaque driver supporte le contrôle local sans dépendance API, le polling intelligent, la gestion d'erreur et la compatibilité universelle avec les versions de firmware connues et inconnues.

**Contrôleurs**: tuya-light, tuya-switch, tuya-wall-switch, tuya-fan, tuya-garage-door, tuya-curtain, tuya-smart-plug
**Capteurs**: tuya-temperature-sensor, tuya-humidity-sensor, tuya-pressure-sensor
**Sécurité**: tuya-motion-sensor, tuya-contact-sensor, tuya-lock

### 📡 Drivers Zigbee Pur

5 drivers Zigbee pur pour la communication Zigbee directe. Chaque driver implémente les meilleures pratiques Homey SDK 3 avec polling intelligent, gestion d'erreur et compatibilité universelle. Supporte les types d'appareils génériques et spécifiques.

**Contrôleurs**: zigbee-wall-switch, zigbee-smart-plug, zigbee-curtain
**Capteurs**: zigbee-temperature-sensor
**Sécurité**: zigbee-motion-sensor

### 📊 Statistiques

18 drivers totaux, 20+ capacités, 2 protocoles supportés. Couverture complète de toutes les catégories d'appareils avec systèmes de fallback intelligents et compatibilité universelle.

### 🚀 Installation

Installation via l'app Homey ou installation manuelle avec npm. Prérequis incluent Homey v5.0.0+, appareils Tuya ou Zigbee pur compatibles, Node.js 18+ et Homey CLI pour le développement.

### 🛠️ Développement

Node.js 18+, Homey CLI, Git requis pour le développement. Scripts disponibles incluent build, test, lint, validate, deploy et dev. Gestion d'erreur complète et systèmes de polling intelligents implémentés.

### 📝 Documentation

Guides complets pour l'installation, la configuration et l'architecture. Inclut une documentation complète pour tous les drivers, des guides de dépannage et les meilleures pratiques pour le développement et le déploiement.

### 🤝 Contribution

Fork, créer une branche feature, commit des changements, push, ouvrir Pull Request. Suivre les standards de codage, inclure des tests, mettre à jour la documentation et assurer la compatibilité avec les drivers existants.

### 📄 Licence

Licence MIT - voir le fichier LICENSE pour les détails. Ce projet est open source et accueille les contributions de la communauté tout en maintenant des standards élevés de qualité et de compatibilité.

### 👨‍💻 Auteur

**dlnraja** - [[redacted-email]](mailto:[redacted-email])

Développeur principal et mainteneur du projet Tuya Zigbee, spécialisé dans le développement Homey SDK 3 et l'intégration multi-protocole d'appareils.

### 🙏 Remerciements

Homey Community, Zigbee2MQTT, GitHub Tuya, SmartThings, Home Assistant, OpenHAB, Node-RED, Domoticz, Fibaro, Vera, Hubitat, OpenZwave, Amazon Alexa, Google Home, Apple HomeKit, Samsung SmartThings, IFTTT, Zapier, Microsoft Azure IoT, AWS IoT, Google Cloud IoT, IBM Watson IoT

### 📞 Support

Support par email à [redacted-email], GitHub Issues pour les rapports de bugs et demandes de fonctionnalités, Forum Homey Community pour les discussions générales et l'assistance de dépannage.

---

## NEDERLANDSE VERSIE

### 📋 Beschrijving

Complete Homey-applicatie voor het besturen van Tuya en pure Zigbee-apparaten in lokale modus. Deze applicatie biedt duidelijke scheiding tussen protocollen en maximale compatibiliteit met alle apparaten. Functies omvatten multi-protocol ondersteuning, Homey SDK 3 architectuur, multi-taal ondersteuning, lokale besturing en universele compatibiliteit.

### 🎯 Belangrijkste Functies

- **Multi-Protocol Ondersteuning**: Tuya en Pure Zigbee protocollen
- **Homey SDK 3 Architectuur**: Moderne en geoptimaliseerde structuur
- **Multi-Taal Ondersteuning**: EN, FR, NL, TA
- **Lokale Besturing**: Geen API-afhankelijkheid voor Tuya-apparaten
- **Universele Compatibiliteit**: Ondersteuning voor bekende en onbekende firmware
- **Intelligente Polling**: Protocol-specifieke polling-systemen
- **Foutafhandeling**: Uitgebreide foutafhandeling
- **Modulair Ontwerp**: Eenvoudig onderhoud en uitbreiding
- **Prestatie Optimalisatie**: Snelle reactietijden
- **Beveiligingsfuncties**: Geavanceerde beveiligingsimplementaties

### 🏗️ Project Architectuur

Georganiseerd per protocol (Tuya/Zigbee) en categorie (controllers/sensoren/beveiliging/klimaat/automatisering). Duidelijke scheiding tussen Tuya-apparaten (lokale besturing zonder API) en pure Zigbee-apparaten (directe Zigbee communicatie). Modulaire structuur met intelligente maporganisatie en uitbreidbaar ontwerp.

### 🔌 Tuya Drivers

13 Tuya drivers verdeeld over controllers, sensoren en beveiliging. Elke driver ondersteunt lokale besturing zonder API-afhankelijkheid, intelligente polling, foutafhandeling en universele compatibiliteit met bekende en onbekende firmware-versies.

**Contrôleurs**: tuya-light, tuya-switch, tuya-wall-switch, tuya-fan, tuya-garage-door, tuya-curtain, tuya-smart-plug
**Capteurs**: tuya-temperature-sensor, tuya-humidity-sensor, tuya-pressure-sensor
**Beveiliging**: tuya-motion-sensor, tuya-contact-sensor, tuya-lock

### 📡 Pure Zigbee Drivers

5 Pure Zigbee drivers voor directe Zigbee communicatie. Elke driver implementeert Homey SDK 3 best practices met intelligente polling, foutafhandeling en universele compatibiliteit. Ondersteunt zowel generieke als specifieke apparaattypen.

**Contrôleurs**: zigbee-wall-switch, zigbee-smart-plug, zigbee-curtain
**Capteurs**: zigbee-temperature-sensor
**Beveiliging**: zigbee-motion-sensor

### 📊 Statistieken

18 totale drivers, 20+ mogelijkheden, 2 ondersteunde protocollen. Uitgebreide dekking van alle apparaatcategorieën met intelligente fallback-systemen en universele compatibiliteit.

### 🚀 Installatie

Installeren via Homey app of handmatige installatie met npm. Vereisten omvatten Homey v5.0.0+, compatibele Tuya of pure Zigbee-apparaten, Node.js 18+ en Homey CLI voor ontwikkeling.

### 🛠️ Ontwikkeling

Node.js 18+, Homey CLI, Git vereist voor ontwikkeling. Beschikbare scripts omvatten build, test, lint, validate, deploy en dev. Uitgebreide foutafhandeling en intelligente polling-systemen geïmplementeerd.

### 📝 Documentatie

Complete gidsen voor installatie, configuratie en architectuur. Omvat uitgebreide documentatie voor alle drivers, troubleshooting gidsen en best practices voor ontwikkeling en implementatie.

### 🤝 Bijdrage

Fork, feature branch maken, wijzigingen committen, push, Pull Request openen. Volg coding standaarden, neem tests op, update documentatie en zorg voor compatibiliteit met bestaande drivers.

### 📄 Licentie

MIT licentie - zie LICENSE bestand voor details. Dit project is open source en verwelkomt bijdragen van de community terwijl het hoge standaarden van kwaliteit en compatibiliteit handhaaft.

### 👨‍💻 Auteur

**dlnraja** - [[redacted-email]](mailto:[redacted-email])

Hoofdontwikkelaar en onderhouder van het Tuya Zigbee project, gespecialiseerd in Homey SDK 3 ontwikkeling en multi-protocol apparaatintegratie.

### 🙏 Dankbetuigingen

Homey Community, Zigbee2MQTT, GitHub Tuya, SmartThings, Home Assistant, OpenHAB, Node-RED, Domoticz, Fibaro, Vera, Hubitat, OpenZwave, Amazon Alexa, Google Home, Apple HomeKit, Samsung SmartThings, IFTTT, Zapier, Microsoft Azure IoT, AWS IoT, Google Cloud IoT, IBM Watson IoT

### 📞 Ondersteuning

Email ondersteuning op [redacted-email], GitHub Issues voor bug rapporten en feature verzoeken, Homey Community Forum voor algemene discussies en troubleshooting assistentie.

---

## தமிழ் பதிப்பு

### 📋 விளக்கம்

உள்ளூர் பயன்முறையில் Tuya மற்றும் தூய Zigbee சாதனங்களை கட்டுப்படுத்த Homey முழுமையான பயன்பாடு. இந்த பயன்பாடு நெறிமுறைகளுக்கு இடையே தெளிவான பிரிப்பு மற்றும் அனைத்து சாதனங்களுடனும் அதிகபட்ச பொருந்தக்கூடிய தன்மையை வழங்குகிறது. அம்சங்களில் பல நெறிமுறை ஆதரவு, Homey SDK 3 கட்டமைப்பு, பல மொழி ஆதரவு, உள்ளூர் கட்டுப்பாடு மற்றும் உலகளாவிய பொருந்தக்கூடிய தன்மை ஆகியவை அடங்கும்.

### 🎯 முக்கிய அம்சங்கள்

- **பல நெறிமுறை ஆதரவு**: Tuya மற்றும் தூய Zigbee நெறிமுறைகள்
- **Homey SDK 3 கட்டமைப்பு**: நவீன மற்றும் உகந்தமயமாக்கப்பட்ட கட்டமைப்பு
- **பல மொழி ஆதரவு**: EN, FR, NL, TA
- **உள்ளூர் கட்டுப்பாடு**: Tuya சாதனங்களுக்கு API சார்பு இல்லை
- **உலகளாவிய பொருந்தக்கூடிய தன்மை**: அறியப்பட்ட மற்றும் அறியப்படாத firmware ஆதரவு
- **நுண்ணறிவு கண்காணிப்பு**: நெறிமுறை-குறிப்பிட்ட கண்காணிப்பு அமைப்புகள்
- **பிழை கையாளுதல்**: விரிவான பிழை கையாளுதல்
- **மாடுலர் வடிவமைப்பு**: எளிதான பராமரிப்பு மற்றும் விரிவாக்கம்
- **செயல்திறன் உகந்தமயமாக்கல்**: வேகமான பதில் நேரங்கள்
- **பாதுகாப்பு அம்சங்கள்**: மேம்பட்ட பாதுகாப்பு செயல்படுத்தல்கள்

### 🏗️ திட்ட கட்டமைப்பு

நெறிமுறை (Tuya/Zigbee) மற்றும் வகை (கட்டுப்படுத்திகள்/சென்சார்கள்/பாதுகாப்பு/காலநிலை/தானியக்கம்) வாரியாக ஒழுங்கமைக்கப்பட்டது. Tuya சாதனங்கள் (API இல்லாமல் உள்ளூர் கட்டுப்பாடு) மற்றும் தூய Zigbee சாதனங்கள் (நேரடி Zigbee தகவல்தொடர்பு) இடையே தெளிவான பிரிப்பு. நுண்ணறிவு கோப்புறை அமைப்பு மற்றும் விரிவாக்கக்கூடிய வடிவமைப்புடன் மாடுலர் கட்டமைப்பு.

### 🔌 Tuya டிரைவர்கள்

கட்டுப்படுத்திகள், சென்சார்கள் மற்றும் பாதுகாப்பு வகைகளில் 13 Tuya டிரைவர்கள். ஒவ்வொரு டிரைவரும் API சார்பு இல்லாமல் உள்ளூர் கட்டுப்பாடு, நுண்ணறிவு கண்காணிப்பு, பிழை கையாளுதல் மற்றும் அறியப்பட்ட மற்றும் அறியப்படாத firmware பதிப்புகளுடன் உலகளாவிய பொருந்தக்கூடிய தன்மையை ஆதரிக்கிறது.

**கட்டுப்படுத்திகள்**: tuya-light, tuya-switch, tuya-wall-switch, tuya-fan, tuya-garage-door, tuya-curtain, tuya-smart-plug
**சென்சார்கள்**: tuya-temperature-sensor, tuya-humidity-sensor, tuya-pressure-sensor
**பாதுகாப்பு**: tuya-motion-sensor, tuya-contact-sensor, tuya-lock

### 📡 தூய Zigbee டிரைவர்கள்

நேரடி Zigbee தகவல்தொடர்புக்கான 5 தூய Zigbee டிரைவர்கள். ஒவ்வொரு டிரைவரும் நுண்ணறிவு கண்காணிப்பு, பிழை கையாளுதல் மற்றும் உலகளாவிய பொருந்தக்கூடிய தன்மையுடன் Homey SDK 3 சிறந்த நடைமுறைகளை செயல்படுத்துகிறது. பொதுவான மற்றும் குறிப்பிட்ட சாதன வகைகளை ஆதரிக்கிறது.

**கட்டுப்படுத்திகள்**: zigbee-wall-switch, zigbee-smart-plug, zigbee-curtain
**சென்சார்கள்**: zigbee-temperature-sensor
**பாதுகாப்பு**: zigbee-motion-sensor

### 📊 புள்ளிவிவரங்கள்

18 மொத்த டிரைவர்கள், 20+ திறன்கள், 2 ஆதரிக்கப்படும் நெறிமுறைகள். நுண்ணறிவு fallback அமைப்புகள் மற்றும் உலகளாவிய பொருந்தக்கூடிய தன்மையுடன் அனைத்து சாதன வகைகளிலும் விரிவான கவரேஜ்.

### 🚀 நிறுவல்

Homey பயன்பாட்டின் மூலம் நிறுவல் அல்லது npm உடன் கைமுறை நிறுவல். முன்நிபந்தனைகளில் Homey v5.0.0+, பொருந்தக்கூடிய Tuya அல்லது தூய Zigbee சாதனங்கள், Node.js 18+ மற்றும் மேம்பாட்டுக்கான Homey CLI ஆகியவை அடங்கும்.

### 🛠️ மேம்பாடு

மேம்பாட்டுக்கு Node.js 18+, Homey CLI, Git தேவை. கிடைக்கக்கூடிய scripts build, test, lint, validate, deploy மற்றும் dev ஆகியவை அடங்கும். விரிவான பிழை கையாளுதல் மற்றும் நுண்ணறிவு கண்காணிப்பு அமைப்புகள் செயல்படுத்தப்பட்டுள்ளன.

### 📝 ஆவணப்படுத்தல்

நிறுவல், கட்டமைப்பு மற்றும் கட்டமைப்புக்கான முழுமையான வழிகாட்டிகள். அனைத்து டிரைவர்களுக்கான விரிவான ஆவணப்படுத்தல், சிக்கல் தீர்வு வழிகாட்டிகள் மற்றும் மேம்பாடு மற்றும் நிறுவலுக்கான சிறந்த நடைமுறைகள் ஆகியவை அடங்கும்.

### 🤝 பங்களிப்பு

Fork, feature branch உருவாக்கு, மாற்றங்களை commit செய், push, Pull Request திற. குறியீட்டு தரநிலைகளைப் பின்பற்று, சோதனைகளைச் சேர்க்கவும், ஆவணப்படுத்தலைப் புதுப்பிக்கவும் மற்றும் இருக்கும் டிரைவர்களுடன் பொருந்தக்கூடிய தன்மையை உறுதிசெய்யவும்.

### 📄 உரிமம்

MIT உரிமம் - விவரங்களுக்கு LICENSE கோப்பைப் பார்க்கவும். இந்த திட்டம் திறந்த மூலமாக உள்ளது மற்றும் தரம் மற்றும் பொருந்தக்கூடிய தன்மையின் உயர் தரநிலைகளை பராமரிக்கும் போது சமூகத்தின் பங்களிப்புகளை வரவேற்கிறது.

### 👨‍💻 ஆசிரியர்

**dlnraja** - [[redacted-email]](mailto:[redacted-email])

Tuya Zigbee திட்டத்தின் முன்னணி மேம்பாட்டாளர் மற்றும் பராமரிப்பாளர், Homey SDK 3 மேம்பாடு மற்றும் பல நெறிமுறை சாதன ஒருங்கிணைப்பில் நிபுணத்துவம் பெற்றவர்.

### 🙏 நன்றி

Homey Community, Zigbee2MQTT, GitHub Tuya, SmartThings, Home Assistant, OpenHAB, Node-RED, Domoticz, Fibaro, Vera, Hubitat, OpenZwave, Amazon Alexa, Google Home, Apple HomeKit, Samsung SmartThings, IFTTT, Zapier, Microsoft Azure IoT, AWS IoT, Google Cloud IoT, IBM Watson IoT

### 📞 ஆதரவு

[redacted-email] இல் மின்னஞ்சல் ஆதரவு, பிழை அறிக்கைகள் மற்றும் அம்ச கோரிக்கைகளுக்கான GitHub Issues, பொதுவான விவாதங்கள் மற்றும் சிக்கல் தீர்வு உதவிக்கான Homey Community Forum.

---

**Version**: 1.0.9-20250729-0620  
**Last Update**: 29/07/2025 06:20:00  
**Status**: ✅ Active and maintained  
**Supported Protocols**: 🔌 Tuya + 📡 Pure Zigbee  
**Total Drivers**: 18 (13 Tuya + 5 Zigbee)  
**Capabilities**: 20+  
**Languages**: EN, FR, NL, TA