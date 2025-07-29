# 🏠 Tuya Zigbee Project

[![Version](https://img.shields.io/badge/version-1.0.11--20250729--0700-blue.svg)](https://github.com/dlnraja/com.tuya.zigbee/releases)
[![Homey SDK](https://img.shields.io/badge/Homey%20SDK-3.0-green.svg)](https://apps.homey.app/fr/com.tuya.zigbee)
[![License](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![Languages](https://img.shields.io/badge/languages-EN%20%7C%20FR%20%7C%20NL%20%7C%20TA-orange.svg)](README.md)

---

## ENGLISH VERSION

### 📋 Description

Complete Homey application for controlling Tuya and pure Zigbee devices in local mode. This application offers comprehensive driver support with 620 total drivers (115 Tuya + 458 Zigbee + 47 specialized), intelligent protocol separation, Homey SDK 3 architecture, multi-language support, local control, universal compatibility, and advanced voltage/amperage/battery management.

### 🎯 Key Features

- **Comprehensive Driver Support**: 620 total drivers with intelligent protocol separation
- **Multi-Protocol Support**: Tuya and Pure Zigbee protocols with specialized categories
- **Homey SDK 3 Architecture**: Modern and optimized structure with full compliance
- **Multi-Language Support**: EN, FR, NL, TA with complete translations
- **Local Control**: No API dependency for Tuya devices
- **Universal Compatibility**: Known and unknown firmware support versions
- **Intelligent Organization**: Protocol-based folder structure with categories
- **Advanced Error Handling**: Comprehensive error management and recovery
- **Voltage/Amperage/Battery Management**: Complete voltage, amperage, and battery level management
- **Battery Replacement Alerts**: Intelligent battery replacement alerts for applicable devices
- **Modular Design**: Easy maintenance and extension
- **Performance Optimization**: Fast response times and efficient resource usage
- **Security Features**: Advanced security implementations and validation

### 🏗️ Project Architecture

Organized by protocol (Tuya/Zigbee) and category (controllers/sensors/security/climate/automation) with specialized subcategories for Zigbee (generic/legacy/unknown/custom). Clear separation between Tuya devices (local control without API) and pure Zigbee devices (direct Zigbee communication). Modular structure with intelligent folder organization and extensible design.

### 🔌 Tuya Drivers

115 Tuya drivers across controllers, sensors, security, climate, and automation categories. Each driver supports local control without API dependency, intelligent polling, error handling, universal compatibility with known and unknown firmware versions, and advanced voltage/amperage/battery management.

**Controllers**: tuya-light, tuya-switch, tuya-wall-switch, tuya-fan, tuya-garage-door, tuya-curtain, tuya-smart-plug, wall_dimmer_tuya, wall_switch_1_gang_tuya, wall_switch_2_gang_tuya, wall_switch_3_gang, wall_switch_4_gang, wall_switch_5_gang_tuya, wall_switch_6_gang_tuya
**Sensors**: tuya-temperature-sensor, tuya-humidity-sensor, tuya-pressure-sensor, temphumidsensor, temphumidsensor2, temphumidsensor3, temphumidsensor4, temphumidsensor5, lcdtemphumidsensor, lcdtemphumidsensor_2, lcdtemphumidsensor_3, lcdtemphumidluxsensor, sirentemphumidsensor
**Security**: tuya-motion-sensor, tuya-contact-sensor, tuya-lock, motion_sensor, motion_sensor_2, pirsensor, pir_sensor_2, smart_motion_sensor, slim_motion_sensor, smart_door_window_sensor, smart_contact_sensor
**Climate**: tuya-thermostat, tuya-hvac, tuya-valve, wall_thermostat, thermostatic_radiator_valve, valvecontroller
**Automation**: tuya-irrigation, tuya-gateway, smart_garden_irrigation_control, smart_air_detection_box

### 📡 Pure Zigbee Drivers

458 Pure Zigbee drivers for direct Zigbee communication across all categories. Each driver implements Homey SDK 3 best practices with intelligent polling, error handling, universal compatibility, and advanced voltage/amperage/battery management. Supports both generic and specific device types with specialized categories.

**Controllers**: zigbee-light, zigbee-switch, zigbee-wall-switch, zigbee-smart-plug, zigbee-curtain, rgb_bulb_E27, rgb_bulb_E14, rgb_led_strip, rgb_led_strip_controller, rgb_ceiling_led_light, rgb_floor_led_light, rgb_wall_led_light, rgb_spot_GU10, rgb_spot_GardenLight, rgb_mood_light, rgb_led_light_bar, tunable_bulb_E27, tunable_bulb_E14, tunable_spot_GU10
**Sensors**: zigbee-temperature-sensor, zigbee-humidity-sensor, zigbee-pressure-sensor, rain_sensor, soilsensor, soilsensor_2, multi_sensor, sensor_temp_TUYATEC-g3gl6cgy
**Security**: zigbee-motion-sensor, zigbee-contact-sensor, zigbee-lock, radar_sensor, radar_sensor_2, radar_sensor_ceiling, smoke_sensor, smoke_sensor2, smoke_sensor3
**Climate**: zigbee-thermostat, zigbee-hvac, zigbee-valve
**Automation**: zigbee-irrigation, zigbee-gateway, smart_remote_1_button, smart_remote_1_button_2, smart_remote_4_buttons, handheld_remote_4_buttons, wall_remote_1_gang, wall_remote_2_gang, wall_remote_3_gang, wall_remote_4_gang, wall_remote_4_gang_2, wall_remote_4_gang_3, wall_remote_6_gang, remote_control, smart_button_switch, smart_knob_switch

### 🔧 Specialized Zigbee Drivers

47 specialized Zigbee drivers for advanced use cases and legacy support with voltage/amperage/battery management:

**Generic**: Generic light, switch, sensor, and controller drivers for unknown devices
**Legacy**: Legacy protocol support for older Zigbee devices
**Unknown**: Fallback drivers for unidentified device types
**Custom**: Custom implementations for specific manufacturer requirements

### ⚡ Advanced Features

**Voltage Management**: Comprehensive voltage monitoring and alerts for all applicable devices
**Amperage Management**: Real-time amperage tracking and overload protection
**Battery Management**: Intelligent battery level monitoring with replacement alerts
**Battery Replacement Alerts**: Automatic notifications when battery replacement is needed
**Power Optimization**: Advanced power management and efficiency features

### 📊 Statistics

620 total drivers, 30+ capabilities, 2 protocols supported. Comprehensive coverage across all device categories with intelligent fallback systems, universal compatibility, and advanced voltage/amperage/battery management. Advanced driver recovery system with 635 local source files analyzed.

**Version**: 1.0.11-20250729-0700
**Last Update**: 29/07/2025 13:08:00
**Status**: ✅ Active and maintained
**Supported Protocols**: 🔌 Tuya + 📡 Pure Zigbee
**Total Drivers**: 620 (115 Tuya + 458 Zigbee + 47 Specialized)
**Capabilities**: 30+
**Languages**: EN, FR, NL, TA
**Advanced Features**: Voltage/Amperage/Battery Management

---

## VERSION FRANÇAISE

### 📋 Description

Application Homey complète pour contrôler les appareils Tuya et Zigbee purs en mode local. Cette application offre un support de drivers complet avec 620 drivers totaux (115 Tuya + 458 Zigbee + 47 spécialisés), une séparation intelligente des protocoles, une architecture Homey SDK 3, un support multi-langues, un contrôle local, une compatibilité universelle et une gestion avancée voltage/ampérage/batterie.

### 🎯 Fonctionnalités Clés

- **Support Complet des Drivers**: 620 drivers totaux avec séparation intelligente des protocoles
- **Support Multi-Protocoles**: Protocoles Tuya et Zigbee purs avec catégories spécialisées
- **Architecture Homey SDK 3**: Structure moderne et optimisée avec conformité complète
- **Support Multi-Langues**: EN, FR, NL, TA avec traductions complètes
- **Contrôle Local**: Aucune dépendance API pour les appareils Tuya
- **Compatibilité Universelle**: Support des versions de firmware connues et inconnues
- **Organisation Intelligente**: Structure de dossiers basée sur les protocoles avec catégories
- **Gestion d'Erreurs Avancée**: Gestion complète des erreurs et récupération
- **Gestion Voltage/Ampérage/Batterie**: Gestion complète des niveaux de voltage, ampérage et batterie
- **Alertes de Remplacement de Batterie**: Alertes intelligentes de remplacement de batterie pour les appareils applicables
- **Design Modulaire**: Maintenance et extension faciles
- **Optimisation des Performances**: Temps de réponse rapides et utilisation efficace des ressources
- **Fonctionnalités de Sécurité**: Implémentations de sécurité avancées et validation

### 🏗️ Architecture du Projet

Organisé par protocole (Tuya/Zigbee) et catégorie (contrôleurs/capteurs/sécurité/climat/automatisation) avec sous-catégories spécialisées pour Zigbee (générique/legacy/inconnu/custom). Séparation claire entre les appareils Tuya (contrôle local sans API) et les appareils Zigbee purs (communication Zigbee directe). Structure modulaire avec organisation intelligente des dossiers et design extensible.

### 🔌 Drivers Tuya

115 drivers Tuya à travers les catégories contrôleurs, capteurs, sécurité, climat et automatisation. Chaque driver supporte le contrôle local sans dépendance API, le polling intelligent, la gestion d'erreurs, la compatibilité universelle avec les versions de firmware connues et inconnues, et la gestion avancée voltage/ampérage/batterie.

**Contrôleurs**: tuya-light, tuya-switch, tuya-wall-switch, tuya-fan, tuya-garage-door, tuya-curtain, tuya-smart-plug, wall_dimmer_tuya, wall_switch_1_gang_tuya, wall_switch_2_gang_tuya, wall_switch_3_gang, wall_switch_4_gang, wall_switch_5_gang_tuya, wall_switch_6_gang_tuya
**Capteurs**: tuya-temperature-sensor, tuya-humidity-sensor, tuya-pressure-sensor, temphumidsensor, temphumidsensor2, temphumidsensor3, temphumidsensor4, temphumidsensor5, lcdtemphumidsensor, lcdtemphumidsensor_2, lcdtemphumidsensor_3, lcdtemphumidluxsensor, sirentemphumidsensor
**Sécurité**: tuya-motion-sensor, tuya-contact-sensor, tuya-lock, motion_sensor, motion_sensor_2, pirsensor, pir_sensor_2, smart_motion_sensor, slim_motion_sensor, smart_door_window_sensor, smart_contact_sensor
**Climat**: tuya-thermostat, tuya-hvac, tuya-valve, wall_thermostat, thermostatic_radiator_valve, valvecontroller
**Automatisation**: tuya-irrigation, tuya-gateway, smart_garden_irrigation_control, smart_air_detection_box

### 📡 Drivers Zigbee Purs

458 drivers Zigbee purs pour la communication Zigbee directe à travers toutes les catégories. Chaque driver implémente les meilleures pratiques Homey SDK 3 avec polling intelligent, gestion d'erreurs, compatibilité universelle et gestion avancée voltage/ampérage/batterie. Supporte les types d'appareils génériques et spécifiques avec catégories spécialisées.

**Contrôleurs**: zigbee-light, zigbee-switch, zigbee-wall-switch, zigbee-smart-plug, zigbee-curtain, rgb_bulb_E27, rgb_bulb_E14, rgb_led_strip, rgb_led_strip_controller, rgb_ceiling_led_light, rgb_floor_led_light, rgb_wall_led_light, rgb_spot_GU10, rgb_spot_GardenLight, rgb_mood_light, rgb_led_light_bar, tunable_bulb_E27, tunable_bulb_E14, tunable_spot_GU10
**Capteurs**: zigbee-temperature-sensor, zigbee-humidity-sensor, zigbee-pressure-sensor, rain_sensor, soilsensor, soilsensor_2, multi_sensor, sensor_temp_TUYATEC-g3gl6cgy
**Sécurité**: zigbee-motion-sensor, zigbee-contact-sensor, zigbee-lock, radar_sensor, radar_sensor_2, radar_sensor_ceiling, smoke_sensor, smoke_sensor2, smoke_sensor3
**Climat**: zigbee-thermostat, zigbee-hvac, zigbee-valve
**Automatisation**: zigbee-irrigation, zigbee-gateway, smart_remote_1_button, smart_remote_1_button_2, smart_remote_4_buttons, handheld_remote_4_buttons, wall_remote_1_gang, wall_remote_2_gang, wall_remote_3_gang, wall_remote_4_gang, wall_remote_4_gang_2, wall_remote_4_gang_3, wall_remote_6_gang, remote_control, smart_button_switch, smart_knob_switch

### 🔧 Drivers Zigbee Spécialisés

47 drivers Zigbee spécialisés pour les cas d'usage avancés et le support legacy avec gestion voltage/ampérage/batterie:

**Générique**: Drivers génériques pour lumière, interrupteur, capteur et contrôleur pour appareils inconnus
**Legacy**: Support des protocoles legacy pour les appareils Zigbee plus anciens
**Inconnu**: Drivers de fallback pour les types d'appareils non identifiés
**Custom**: Implémentations custom pour les exigences spécifiques des fabricants

### ⚡ Fonctionnalités Avancées

**Voltage Beheer**: Uitgebreide voltage monitoring et waarschuwingen voor alle toepasselijke apparaten
**Amperage Beheer**: Real-time amperage tracking en overbelastingsbescherming
**Batterij Beheer**: Intelligente batterij niveau monitoring met vervangingswaarschuwingen
**Batterij Vervangingswaarschuwingen**: Automatische notificaties wanneer batterij vervanging nodig is
**Energie Optimalisatie**: Geavanceerde energiebeheer en efficiëntie functies

### 📊 Statistiques

620 drivers totaux, 30+ capacités, 2 protocoles supportés. Couverture complète à travers toutes les catégories d'appareils avec systèmes de fallback intelligents, compatibilité universelle et gestion avancée voltage/ampérage/batterie. Système de récupération de drivers avancé avec 635 fichiers sources locaux analysés.

**Versie**: 1.0.11-20250729-0700
**Dernière Mise à Jour**: 29/07/2025 13:08:00
**Statut**: ✅ Actif et onderhouden
**Ondersteunde Protocollen**: 🔌 Tuya + 📡 Pure Zigbee
**Drivers Totaux**: 620 (115 Tuya + 458 Zigbee + 47 Spécialisés)
**Capaciteiten**: 30+
**Talen**: EN, FR, NL, TA
**Geavanceerde Functies**: Voltage/Amperage/Batterij Beheer

---

## NEDERLANDSE VERSIE

### 📋 Beschrijving

Complete Homey applicatie voor het besturen van Tuya en pure Zigbee apparaten in lokale modus. Deze applicatie biedt uitgebreide driver ondersteuning met 620 totale drivers (115 Tuya + 458 Zigbee + 47 gespecialiseerd), intelligente protocol scheiding, Homey SDK 3 architectuur, meertalige ondersteuning, lokale controle, universele compatibiliteit en geavanceerd voltage/amperage/batterij beheer.

### 🎯 Belangrijkste Functies

- **Uitgebreide Driver Ondersteuning**: 620 totale drivers met intelligente protocol scheiding
- **Multi-Protocol Ondersteuning**: Tuya en Pure Zigbee protocollen met gespecialiseerde categorieën
- **Homey SDK 3 Architectuur**: Moderne en geoptimaliseerde structuur met volledige naleving
- **Meertalige Ondersteuning**: EN, FR, NL, TA met complete vertalingen
- **Lokale Controle**: Geen API afhankelijkheid voor Tuya apparaten
- **Universele Compatibiliteit**: Ondersteuning voor bekende en onbekende firmware versies
- **Intelligente Organisatie**: Protocol-gebaseerde mapstructuur met categorieën
- **Geavanceerde Foutafhandeling**: Uitgebreide foutbeheer en herstel
- **Voltage/Amperage/Batterij Beheer**: Complete voltage, amperage en batterij niveau beheer
- **Batterij Vervangingswaarschuwingen**: Intelligente batterij vervangingswaarschuwingen voor toepasselijke apparaten
- **Modulair Ontwerp**: Eenvoudig onderhoud en uitbreiding
- **Prestatie Optimalisatie**: Snelle responstijden en efficiënt resource gebruik
- **Beveiligingsfuncties**: Geavanceerde beveiligingsimplementaties en validatie

### 🏗️ Project Architectuur

Georganiseerd per protocol (Tuya/Zigbee) en categorie (controllers/sensoren/beveiliging/klimaat/automatisering) met gespecialiseerde subcategorieën voor Zigbee (generiek/legacy/onbekend/custom). Duidelijke scheiding tussen Tuya apparaten (lokale controle zonder API) en pure Zigbee apparaten (directe Zigbee communicatie). Modulaire structuur met intelligente maporganisatie en uitbreidbaar ontwerp.

### 🔌 Tuya Drivers

115 Tuya drivers over controllers, sensoren, beveiliging, klimaat en automatisering categorieën. Elke driver ondersteunt lokale controle zonder API afhankelijkheid, intelligente polling, foutafhandeling, universele compatibiliteit met bekende en onbekende firmware versies, en geavanceerd voltage/amperage/batterij beheer.

**Controllers**: tuya-light, tuya-switch, tuya-wall-switch, tuya-fan, tuya-garage-door, tuya-curtain, tuya-smart-plug, wall_dimmer_tuya, wall_switch_1_gang_tuya, wall_switch_2_gang_tuya, wall_switch_3_gang, wall_switch_4_gang, wall_switch_5_gang_tuya, wall_switch_6_gang_tuya
**Sensoren**: tuya-temperature-sensor, tuya-humidity-sensor, tuya-pressure-sensor, temphumidsensor, temphumidsensor2, temphumidsensor3, temphumidsensor4, temphumidsensor5, lcdtemphumidsensor, lcdtemphumidsensor_2, lcdtemphumidsensor_3, lcdtemphumidluxsensor, sirentemphumidsensor
**Beveiliging**: tuya-motion-sensor, tuya-contact-sensor, tuya-lock, motion_sensor, motion_sensor_2, pirsensor, pir_sensor_2, smart_motion_sensor, slim_motion_sensor, smart_door_window_sensor, smart_contact_sensor
**Klimaat**: tuya-thermostat, tuya-hvac, tuya-valve, wall_thermostat, thermostatic_radiator_valve, valvecontroller
**Automatisering**: tuya-irrigation, tuya-gateway, smart_garden_irrigation_control, smart_air_detection_box

### 📡 Pure Zigbee Drivers

458 Pure Zigbee drivers voor directe Zigbee communicatie over alle categorieën. Elke driver implementeert Homey SDK 3 best practices met intelligente polling, foutafhandeling, universele compatibiliteit en geavanceerd voltage/amperage/batterij beheer. Ondersteunt zowel generieke als specifieke apparaattypes met gespecialiseerde categorieën.

**Controllers**: zigbee-light, zigbee-switch, zigbee-wall-switch, zigbee-smart-plug, zigbee-curtain, rgb_bulb_E27, rgb_bulb_E14, rgb_led_strip, rgb_led_strip_controller, rgb_ceiling_led_light, rgb_floor_led_light, rgb_wall_led_light, rgb_spot_GU10, rgb_spot_GardenLight, rgb_mood_light, rgb_led_light_bar, tunable_bulb_E27, tunable_bulb_E14, tunable_spot_GU10
**Sensoren**: zigbee-temperature-sensor, zigbee-humidity-sensor, zigbee-pressure-sensor, rain_sensor, soilsensor, soilsensor_2, multi_sensor, sensor_temp_TUYATEC-g3gl6cgy
**Beveiliging**: zigbee-motion-sensor, zigbee-contact-sensor, zigbee-lock, radar_sensor, radar_sensor_2, radar_sensor_ceiling, smoke_sensor, smoke_sensor2, smoke_sensor3
**Klimaat**: zigbee-thermostat, zigbee-hvac, zigbee-valve
**Automatisering**: zigbee-irrigation, zigbee-gateway, smart_remote_1_button, smart_remote_1_button_2, smart_remote_4_buttons, handheld_remote_4_buttons, wall_remote_1_gang, wall_remote_2_gang, wall_remote_3_gang, wall_remote_4_gang, wall_remote_4_gang_2, wall_remote_4_gang_3, wall_remote_6_gang, remote_control, smart_button_switch, smart_knob_switch

### 🔧 Gespecialiseerde Zigbee Drivers

47 gespecialiseerde Zigbee drivers voor geavanceerde use cases en legacy ondersteuning met voltage/amperage/batterij beheer:

**Generiek**: Generieke licht, schakelaar, sensor en controller drivers voor onbekende apparaten
**Legacy**: Legacy protocol ondersteuning voor oudere Zigbee apparaten
**Onbekend**: Fallback drivers voor niet-geïdentificeerde apparaattypes
**Custom**: Custom implementaties voor specifieke fabrikant vereisten

### ⚡ Geavanceerde Functies

**Voltage Beheer**: Uitgebreide voltage monitoring en waarschuwingen voor alle toepasselijke apparaten
**Amperage Beheer**: Real-time amperage tracking en overbelastingsbescherming
**Batterij Beheer**: Intelligente batterij niveau monitoring met vervangingswaarschuwingen
**Batterij Vervangingswaarschuwingen**: Automatische notificaties wanneer batterij vervanging nodig is
**Energie Optimalisatie**: Geavanceerde energiebeheer en efficiëntie functies

### 📊 Statistieken

620 totale drivers, 30+ capaciteiten, 2 protocollen ondersteund. Uitgebreide dekking over alle apparaatcategorieën met intelligente fallback systemen, universele compatibiliteit en geavanceerd voltage/amperage/batterij beheer. Geavanceerd driver herstel systeem met 635 lokale bronbestanden geanalyseerd.

**Versie**: 1.0.11-20250729-0700
**Laatste Update**: 29/07/2025 13:08:00
**Status**: ✅ Actief en onderhouden
**Ondersteunde Protocollen**: 🔌 Tuya + 📡 Pure Zigbee
**Totale Drivers**: 620 (115 Tuya + 458 Zigbee + 47 Gespecialiseerd)
**Capaciteiten**: 30+
**Talen**: EN, FR, NL, TA
**Geavanceerde Functies**: Voltage/Amperage/Batterij Beheer

---

## தமிழ் பதிப்பு

### 📋 விளக்கம்

உள்ளூர் பயன்முறையில் Tuya மற்றும் pure Zigbee சாதனங்களை கட்டுப்படுத்த முழுமையான Homey பயன்பாடு. இந்த பயன்பாடு 620 மொத்த drivers (115 Tuya + 458 Zigbee + 47 specialized), புத்திசாலித்தனமான protocol பிரிப்பு, Homey SDK 3 கட்டமைப்பு, பல மொழி ஆதரவு, உள்ளூர் கட்டுப்பாடு, உலகளாவிய பொருந்தக்கூடிய தன்மை மற்றும் மேம்பட்ட voltage/amperage/battery மேலாண்மையுடன் விரிவான driver ஆதரவை வழங்குகிறது.

### 🎯 முக்கிய அம்சங்கள்

- **விரிவான Driver ஆதரவு**: புத்திசாலித்தனமான protocol பிரிப்புடன் 620 மொத்த drivers
- **Multi-Protocol ஆதரவு**: specialized categories உடன் Tuya மற்றும் Pure Zigbee protocols
- **Homey SDK 3 கட்டமைப்பு**: முழுமையான இணக்கத்துடன் நவீன மற்றும் உகந்தமயமாக்கப்பட்ட கட்டமைப்பு
- **பல மொழி ஆதரவு**: முழுமையான மொழிபெயர்ப்புகளுடன் EN, FR, NL, TA
- **உள்ளூர் கட்டுப்பாடு**: Tuya சாதனங்களுக்கு API சார்பு இல்லை
- **உலகளாவிய பொருந்தக்கூடிய தன்மை**: அறியப்பட்ட மற்றும் அறியப்படாத firmware பதிப்புகளுக்கான ஆதரவு
- **புத்திசாலித்தனமான அமைப்பு**: categories உடன் protocol-அடிப்படையிலான folder கட்டமைப்பு
- **மேம்பட்ட பிழை கையாளுதல்**: விரிவான பிழை மேலாண்மை மற்றும் மீட்பு
- **Voltage/Amperage/Battery மேலாண்மை**: முழுமையான voltage, amperage மற்றும் battery level மேலாண்மை
- **Battery மாற்று எச்சரிக்கைகள்**: Battery மாற்று தேவைப்படும்போது தானியங்கி அறிவிப்புகள்
- **சக்தி உகந்தமயமாக்கல்**: மேம்பட்ட சக்தி மேலாண்மை மற்றும் திறன் அம்சங்கள்
- **பாதுகாப்பு அம்சங்கள்**: மேம்பட்ட பாதுகாப்பு செயலாக்கங்கள் மற்றும் சரிபார்ப்பு

### 🏗️ திட்ட கட்டமைப்பு

Protocol (Tuya/Zigbee) மற்றும் category (controllers/sensors/security/climate/automation) படி ஒழுங்கமைக்கப்பட்டுள்ளது, Zigbee க்கான specialized subcategories (generic/legacy/unknown/custom) உடன். Tuya சாதனங்கள் (API இல்லாமல் உள்ளூர் கட்டுப்பாடு) மற்றும் pure Zigbee சாதனங்கள் (நேரடி Zigbee தொடர்பு) இடையே தெளிவான பிரிப்பு. புத்திசாலித்தனமான folder அமைப்பு மற்றும் விரிவாக்கக்கூடிய வடிவமைப்புடன் modular கட்டமைப்பு.

### 🔌 Tuya Drivers

Controllers, sensors, security, climate மற்றும் automation categories முழுவதும் 115 Tuya drivers. ஒவ்வொரு driver-ம் API சார்பு இல்லாமல் உள்ளூர் கட்டுப்பாடு, புத்திசாலித்தனமான polling, பிழை கையாளுதல், அறியப்பட்ட மற்றும் அறியப்படாத firmware பதிப்புகளுடன் உலகளாவிய பொருந்தக்கூடிய தன்மை மற்றும் மேம்பட்ட voltage/amperage/battery மேலாண்மையை ஆதரிக்கிறது.

**Controllers**: tuya-light, tuya-switch, tuya-wall-switch, tuya-fan, tuya-garage-door, tuya-curtain, tuya-smart-plug, wall_dimmer_tuya, wall_switch_1_gang_tuya, wall_switch_2_gang_tuya, wall_switch_3_gang, wall_switch_4_gang, wall_switch_5_gang_tuya, wall_switch_6_gang_tuya
**Sensors**: tuya-temperature-sensor, tuya-humidity-sensor, tuya-pressure-sensor, temphumidsensor, temphumidsensor2, temphumidsensor3, temphumidsensor4, temphumidsensor5, lcdtemphumidsensor, lcdtemphumidsensor_2, lcdtemphumidsensor_3, lcdtemphumidluxsensor, sirentemphumidsensor
**Security**: tuya-motion-sensor, tuya-contact-sensor, tuya-lock, motion_sensor, motion_sensor_2, pirsensor, pir_sensor_2, smart_motion_sensor, slim_motion_sensor, smart_door_window_sensor, smart_contact_sensor
**Climate**: tuya-thermostat, tuya-hvac, tuya-valve, wall_thermostat, thermostatic_radiator_valve, valvecontroller
**Automation**: tuya-irrigation, tuya-gateway, smart_garden_irrigation_control, smart_air_detection_box

### 📡 Pure Zigbee Drivers

அனைத்து categories முழுவதும் நேரடி Zigbee தொடர்புக்கான 458 Pure Zigbee drivers. ஒவ்வொரு driver-ம் புத்திசாலித்தனமான polling, பிழை கையாளுதல், உலகளாவிய பொருந்தக்கூடிய தன்மை மற்றும் மேம்பட்ட voltage/amperage/battery மேலாண்மையுடன் Homey SDK 3 best practices ஐ செயலாக்குகிறது. Specialized categories உடன் generic மற்றும் specific device types இரண்டையும் ஆதரிக்கிறது.

**Controllers**: zigbee-light, zigbee-switch, zigbee-wall-switch, zigbee-smart-plug, zigbee-curtain, rgb_bulb_E27, rgb_bulb_E14, rgb_led_strip, rgb_led_strip_controller, rgb_ceiling_led_light, rgb_floor_led_light, rgb_wall_led_light, rgb_spot_GU10, rgb_spot_GardenLight, rgb_mood_light, rgb_led_light_bar, tunable_bulb_E27, tunable_bulb_E14, tunable_spot_GU10
**Sensors**: zigbee-temperature-sensor, zigbee-humidity-sensor, zigbee-pressure-sensor, rain_sensor, soilsensor, soilsensor_2, multi_sensor, sensor_temp_TUYATEC-g3gl6cgy
**Security**: zigbee-motion-sensor, zigbee-contact-sensor, zigbee-lock, radar_sensor, radar_sensor_2, radar_sensor_ceiling, smoke_sensor, smoke_sensor2, smoke_sensor3
**Climate**: zigbee-thermostat, zigbee-hvac, zigbee-valve
**Automation**: zigbee-irrigation, zigbee-gateway, smart_remote_1_button, smart_remote_1_button_2, smart_remote_4_buttons, handheld_remote_4_buttons, wall_remote_1_gang, wall_remote_2_gang, wall_remote_3_gang, wall_remote_4_gang, wall_remote_4_gang_2, wall_remote_4_gang_3, wall_remote_6_gang, remote_control, smart_button_switch, smart_knob_switch

### 🔧 Specialized Zigbee Drivers

மேம்பட்ட use cases மற்றும் legacy ஆதரவுக்கான 47 specialized Zigbee drivers voltage/amperage/battery மேலாண்மையுடன்:

**Generic**: அறியப்படாத சாதனங்களுக்கான generic light, switch, sensor மற்றும் controller drivers
**Legacy**: பழைய Zigbee சாதனங்களுக்கான legacy protocol ஆதரவு
**Unknown**: அடையாளம் காணப்படாத device types க்கான fallback drivers
**Custom**: குறிப்பிட்ட manufacturer தேவைகளுக்கான custom செயலாக்கங்கள்

### ⚡ மேம்பட்ட அம்சங்கள்

**Voltage மேலாண்மை**: அனைத்து பொருந்தக்கூடிய சாதனங்களுக்கான விரிவான voltage monitoring மற்றும் எச்சரிக்கைகள்
**Amperage மேலாண்மை**: Real-time amperage tracking மற்றும் overload பாதுகாப்பு
**Battery மேலாண்மை**: மாற்று எச்சரிக்கைகளுடன் புத்திசாலித்தனமான battery level monitoring
**Battery மாற்று எச்சரிக்கைகள்**: Battery மாற்று தேவைப்படும்போது தானியங்கி அறிவிப்புகள்
**சக்தி உகந்தமயமாக்கல்**: மேம்பட்ட சக்தி மேலாண்மை மற்றும் திறன் அம்சங்கள்

### 📊 புள்ளிவிவரங்கள்

620 மொத்த drivers, 30+ capabilities, 2 protocols ஆதரிக்கப்படுகிறது. அனைத்து device categories முழுவதும் விரிவான coverage புத்திசாலித்தனமான fallback systems, உலகளாவிய பொருந்தக்கூடிய தன்மை மற்றும் மேம்பட்ட voltage/amperage/battery மேலாண்மையுடன். 635 உள்ளூர் source files பகுப்பாய்வு செய்யப்பட்ட மேம்பட்ட driver recovery system.

**பதிப்பு**: 1.0.11-20250729-0700
**கடைசி புதுப்பிப்பு**: 29/07/2025 13:08:00
**நிலை**: ✅ செயலில் மற்றும் பராமரிக்கப்படுகிறது
**ஆதரிக்கப்படும் Protocols**: 🔌 Tuya + 📡 Pure Zigbee
**மொத்த Drivers**: 620 (115 Tuya + 458 Zigbee + 47 Specialized)
**Capabilities**: 30+
**மொழிகள்**: EN, FR, NL, TA
**மேம்பட்ட அம்சங்கள்**: Voltage/Amperage/Battery மேலாண்மை

---

## 📞 Contact

**Author**: dlnraja / dylan.rajasekaram@gmail.com  
**Repository**: [GitHub](https://github.com/dlnraja/com.tuya.zigbee)  
**Homey App**: [App Store](https://apps.homey.app/fr/com.tuya.zigbee)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.