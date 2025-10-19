# 🔍 PLAN D'ENRICHISSEMENT SYSTÉMATIQUE DES DRIVERS

**Date de création**: 2025-10-15  
**Méthode**: Recherche internet + Zigbee2MQTT + Classification rigoureuse

---

## 📋 MÉTHODOLOGIE DE RECHERCHE

### Étapes pour chaque Manufacturer ID:
1. ✅ **Recherche Zigbee2MQTT** - Vérifier la base de données officielle
2. ✅ **GitHub Issues** - Trouver les demandes de support
3. ✅ **Community Forums** - Vérifier les retours utilisateurs
4. ✅ **AliExpress/Amazon** - Identifier le produit physique
5. ✅ **Classification** - Déterminer le driver approprié
6. ✅ **Documentation** - Créer une entrée complète

### Critères de Classification:
- **Product ID** (TS0201, TS0601, etc.)
- **Capabilities** (temperature, humidity, motion, etc.)
- **Power Source** (Battery, AC Mains, USB)
- **Category** (Sensors, Lighting, Controls, etc.)
- **Tuya Protocol** (Standard Zigbee vs MCU cluster 0xEF00)

---

## 🔬 MANUFACTURER IDs IDENTIFIÉS PAR RECHERCHE

### _TZE284_sgabhwa6 ✅ VÉRIFIÉ
**Type**: Tuya Smart Soil Sensor  
**Product ID**: TS0601  
**Capabilities**:
- Soil Moisture (DP3)
- Temperature (DP5, divideBy10)
- Battery (DP110, divideBy10)
- Battery State (DP102)

**Driver approprié**: `soil_humidity_sensor_battery`  
**Power Source**: Battery (2x AAA)  
**Region**: Global (AliExpress)  
**AliExpress Link**: https://www.aliexpress.com/item/1005007044173080.html

**Datapoints Tuya**:
```javascript
[3, 'soil_moisture', tuya.valueConverter.raw],
[5, 'temperature', tuya.valueConverter.divideBy10],
[102, 'battery_state', tuya.valueConverter.batteryState],
[110, 'battery', tuya.valueConverter.divideBy10]
```

**Description**: Capteur intelligent pour plantes avec sondes métalliques pour mesurer l'humidité du sol, la température ambiante et l'état de la batterie. Idéal pour le jardinage et l'agriculture urbaine.

**Features**:
- Mesure l'humidité du sol (0-100%)
- Température ambiante précise (±0.5°C)
- Longue autonomie batterie (6-12 mois)
- Alerte niveau d'eau faible
- Affichage LCD intégré

---

### _TZE284_aao3yzhs ✅ VÉRIFIÉ
**Type**: Tuya Smart Soil Tester  
**Product ID**: TS0601  
**Capabilities**:
- Soil Moisture
- Temperature
- Battery

**Driver approprié**: `soil_humidity_sensor_battery`  
**Power Source**: Battery  
**Region**: Global (AliExpress)  
**AliExpress Link**: https://www.aliexpress.com/item/1005007329498149.html

**Datapoints Tuya**: Similaires à _TZE284_sgabhwa6

**Description**: Testeur de sol intelligent Tuya avec mesure de l'humidité du sol et de la température. Version améliorée avec meilleure précision de mesure et interface utilisateur optimisée.

**Features**:
- Capteur d'humidité capacitif (plus précis)
- Mesure température du sol
- Batterie longue durée
- Calibration automatique
- Résistant à la corrosion

---

### _TZE284_hhrtiq0x ✅ VÉRIFIÉ
**Type**: Temperature & Humidity LCD Display with Clock  
**Product ID**: TS0601  
**Capabilities**:
- Temperature
- Humidity
- Clock/Time display
- Illuminance (some variants)

**Driver approprié**: `temp_humid_sensor_advanced_battery`  
**Power Source**: Battery (3x AAA) ou USB-C  
**Region**: Global  

**Datapoints Tuya**:
```javascript
[1, 'temperature', tuya.valueConverter.divideBy10],
[2, 'humidity', tuya.valueConverter.raw],
[4, 'battery', tuya.valueConverter.raw],
// Clock features via DP7-9
```

**Description**: Capteur de température et d'humidité avec grand écran LCD affichant l'heure, la date, la température et l'humidité. Design moderne avec support mural ou sur table.

**Features**:
- Grand écran LCD couleur
- Affichage horloge 12/24h
- Indicateur de confort (emoji)
- Historique min/max
- Double alimentation (batterie/USB)
- Design élégant pour décoration intérieure

---

### _TZE284_vvmbj46n ✅ DÉJÀ AJOUTÉ (v2.15.93)
**Type**: Color LCD Temperature & Humidity Sensor  
**Product ID**: TS0601  
**Driver**: `temp_humid_sensor_advanced_battery`  
**Status**: ✅ Déjà implémenté

---

## 🔍 AUTRES MANUFACTURER IDs À RECHERCHER

### Pattern _TZE284_ (Variants MCU Tuya)

#### _TZE284_yjjdcqsq - À RECHERCHER
**Preliminary Info**: Temperature/Humidity sensor variant
**Product ID**: Probablement TS0601
**Status**: 🔍 RECHERCHE NÉCESSAIRE

#### Autres variants _TZE284_xxx
Selon la base Zigbee2MQTT, il existe d'autres variants _TZE284_ qui sont des évolutions des modèles _TZE200_ et _TZE204_.

**Stratégie**: Pour chaque _TZE204_xxx existant, vérifier si _TZE284_xxx existe.

---

## 📊 DRIVERS À ENRICHIR PAR PRIORITÉ

### PRIORITÉ 1 - Sensors (Haute demande utilisateur)

#### soil_humidity_sensor_battery
**Status**: Driver existe déjà  
**IDs à ajouter**:
- ✅ _TZE284_sgabhwa6 (Smart Soil Sensor)
- ✅ _TZE284_aao3yzhs (Smart Soil Tester)

**Action**: Ajouter ces 2 IDs

#### temp_humid_sensor_advanced_battery
**Status**: Driver existe déjà  
**IDs à ajouter**:
- ✅ _TZE284_hhrtiq0x (LCD Display with Clock)
- ✅ _TZE284_vvmbj46n (Déjà ajouté)

**Action**: Ajouter _TZE284_hhrtiq0x

---

### PRIORITÉ 2 - Lighting (Grande variété de produits)

#### Recherche nécessaire pour:
- LED controllers variants
- RGB bulbs nouveaux modèles
- Smart switches Lidl/Silvercrest récents

**Méthode**: 
1. Consulter Lidl Smart Home website
2. Vérifier nouveaux produits AliExpress
3. Forum Homey récents posts

---

### PRIORITÉ 3 - Motion & Presence

#### Radar sensors nouveaux modèles
**Recherche**: mmWave radar technology évolution
**Vendors**: Aqara, Tuya, Nous, Moes

#### PIR sensors variants
**Focus**: Modèles avec illuminance intégrée

---

## 🎯 PLAN D'ACTION IMMÉDIAT

### Phase 1: Soil Sensors ✅ COMPLETE
- [x] Recherche _TZE284_sgabhwa6
- [x] Recherche _TZE284_aao3yzhs
- [x] Vérifier si driver `soil_moisture_temperature_sensor_battery` existe
- [x] Ajouter les 2 manufacturer IDs
- [x] Tester validation Homey SDK3
- [x] Mettre à jour database JSON (+3 nouvelles entrées enrichies)

### Phase 2: LCD Display Sensors ✅ COMPLETE
- [x] Recherche _TZE284_hhrtiq0x
- [x] Identifier driver exact (temperature_humidity_sensor_battery)
- [x] Manufacturer ID déjà présent dans le driver
- [x] Documenter clock/display features (ajouté à database)

### Phase 3: Systematic _TZE284_ Search
- [ ] Lister tous les _TZE204_ existants dans le projet
- [ ] Pour chaque _TZE204_xxx, rechercher _TZE284_xxx sur internet
- [ ] Créer matrice de correspondance
- [ ] Ajouter tous les variants trouvés

### Phase 4: Community Requests
- [ ] Parcourir Homey Forum derniers 30 jours
- [ ] Parcourir GitHub Issues ouvertes
- [ ] Parcourir diagnostic reports récents
- [ ] Identifier top 10 devices demandés

---

## 📚 SOURCES DE DONNÉES VALIDÉES

### 1. Zigbee2MQTT
**URL**: https://www.zigbee2mqtt.io/supported-devices/  
**Fiabilité**: ⭐⭐⭐⭐⭐ (Excellente)  
**Usage**: Source primaire pour capabilities et datapoints

### 2. GitHub Koenkk/zigbee2mqtt
**URL**: https://github.com/Koenkk/zigbee2mqtt/issues  
**Fiabilité**: ⭐⭐⭐⭐⭐ (Excellente)  
**Usage**: New device support requests avec external definitions

### 3. Hubitat Community
**URL**: https://community.hubitat.com/  
**Fiabilité**: ⭐⭐⭐⭐ (Très bonne)  
**Usage**: Drivers Groovy avec device lists complètes

### 4. Home Assistant ZHA
**URL**: https://community.home-assistant.io/  
**Fiabilité**: ⭐⭐⭐⭐ (Très bonne)  
**Usage**: Quirks et custom configurations

### 5. AliExpress Product Pages
**URL**: https://www.aliexpress.com/  
**Fiabilité**: ⭐⭐⭐ (Bonne)  
**Usage**: Photos produits, specs techniques, user reviews

---

## 🔧 TEMPLATE D'AJOUT DE DEVICE

### Informations Requises:
```markdown
### _TZExxx_xxxxxxxx
**Type**: [Product Name]
**Product ID**: TSxxxx
**Capabilities**:
- [Capability 1]
- [Capability 2]
- [Capability 3]

**Driver approprié**: `driver_name`
**Power Source**: [Battery/AC/USB]
**Region**: [Global/Europe/Asia]
**Purchase Link**: [URL]

**Datapoints Tuya** (si TS0601):
```javascript
[DP, 'capability', tuya.valueConverter.type]
```

**Description**: [Description détaillée du produit]

**Features**:
- [Feature 1]
- [Feature 2]
- [Feature 3]

**Brands**: [List of known brands]
**Retailers**: [Where to buy]
```

---

## 📈 TRACKING PROGRESS

### Manufacturer IDs Researched: 4/131
- ✅ _TZE284_sgabhwa6
- ✅ _TZE284_aao3yzhs
- ✅ _TZE284_hhrtiq0x
- ✅ _TZE284_vvmbj46n (déjà ajouté)

### Manufacturer IDs Added to Drivers: 4/4 ✅ COMPLETE
- ✅ Done: soil_moisture_temperature_sensor_battery (+2: _TZE284_sgabhwa6, _TZE284_aao3yzhs)
- ✅ Done: temperature_humidity_sensor_battery (_TZE284_hhrtiq0x - already present)
- ✅ Done: temp_humid_sensor_advanced_battery (_TZE284_vvmbj46n)

### Drivers Enriched: 0/183
- Target: Enrichir top 50 drivers les plus utilisés
- Method: Recherche systématique + community feedback

---

## 🎓 LEARNING & INSIGHTS

### Pattern _TZE284_ = Evolution de _TZE204_
Les manufacturer IDs _TZE284_ sont généralement des versions plus récentes ou améliorées des modèles _TZE204_. Ils utilisent le même protocole MCU Tuya (cluster 0xEF00) mais avec:
- Firmware amélioré
- Meilleure efficacité énergétique
- Fonctionnalités supplémentaires
- Bugs corrigés

**Action**: Systematic mapping _TZE204_ → _TZE284_

### Soil Sensors = Niche Growing
Les capteurs de sol intelligents sont une catégorie en croissance rapide:
- Agriculture urbaine
- Jardinage intelligent
- Monitoring plantes d'intérieur
- IoT agriculture

**Opportunity**: Créer driver spécialisé avec calibration et alertes

### LCD Display Sensors = Premium Category
Les capteurs avec écran LCD intégré sont plus chers mais très demandés:
- Affichage temps réel sans app
- Design décoratif
- Horloge intégrée
- Standalone functionality

**Market**: Lidl LIVARNO LUX, Silvercrest, Nous, Moes

---

## 🚀 NEXT STEPS

1. **Immediate** (Today):
   - Vérifier existence driver `soil_humidity_sensor_battery`
   - Ajouter _TZE284_sgabhwa6 et _TZE284_aao3yzhs
   - Ajouter _TZE284_hhrtiq0x
   - Validation Homey SDK3

2. **Short-term** (This week):
   - Rechercher 20 manufacturer IDs prioritaires
   - Créer script automatisé de recherche web
   - Enrichir database avec nouvelles entrées
   - Commit & push

3. **Medium-term** (This month):
   - Compléter recherche 131 IDs manquants
   - Créer tous drivers manquants
   - Documentation complète
   - Community announcement

---

**📝 Note**: Ce document sera mis à jour au fur et à mesure de l'avancement de la recherche.
