# Rapport de Corrections - Bugs Forum Homey Community

**Date**: 2025-10-10  
**Version**: 2.1.40 (en préparation)  
**Auteur**: Dylan Rajasekaram

## 📋 Résumé Exécutif

Corrections approfondies des bugs critiques rapportés sur le forum Homey Community, suivant les standards de Johan Bendz et les guidelines Homey SDK3.

---

## 🐛 Bug #259 - Capteur Température/Humidité (Karsten_Hille)

### Problème Identifié
- ❌ Le capteur s'apparie mais ne montre pas les valeurs temp/humidité
- ❌ Détection incorrecte d'un capteur de mouvement
- ❌ Capabilities incorrectes dans le driver

### Cause Racine
Le driver `temperature_humidity_sensor` avait:
1. Capabilities incorrectes: `alarm_motion` et `measure_luminance` alors que c'est un capteur temp/humidité pur
2. Manufacturer IDs mélangés avec des boutons (TS0041-TS0044) et capteurs de mouvement (TS0202)
3. Product IDs trop larges incluant des switches et autres devices
4. Clusters Zigbee incorrects (1030, 1280 au lieu de 1026, 1029)
5. Configuration de reporting insuffisante

### ✅ Corrections Appliquées

#### `drivers/temperature_humidity_sensor/driver.compose.json`
- **Capabilities nettoyées**: Supprimé `alarm_motion` et `measure_luminance`
- **Manufacturer IDs corrigés**: Uniquement capteurs temp/humidité authentiques
  ```json
  "_TZ3000_bgsigers", "_TZ3000_fllyghyj", "_TZ3000_idrxiajl",
  "_TZ3000_ywagc4rj", "_TZE200_bjawzodf", "_TZE200_dwcarsat",
  "_TZE200_hhrtiq0x", "_TZE200_hl0ss9oa", "_TZE200_locansqn",
  "_TZE200_yjjdcqsq", "_TZE284_hhrtiq0x", "_TZE284_sgabhwa6"
  ```
- **Product IDs simplifiés**: Seulement `TS0201` et `TS0601`
- **Clusters Zigbee corrigés**: 
  - Cluster 1026 (msTemperatureMeasurement)
  - Cluster 1029 (msRelativeHumidity)

#### `drivers/temperature_humidity_sensor/device.js`
- **Suppression du code**: Retiré la logique pour `alarm_motion` et `measure_luminance`
- **Configuration de reporting améliorée**:
  - Température: min 60s, max 3600s, changement min 0.5°C
  - Humidité: min 60s, max 3600s, changement min 1%
  - Batterie: min 3600s, max 43200s, changement min 2%

### Impact
✅ Les capteurs température/humidité s'apparieront correctement  
✅ Les valeurs temp/humidité seront affichées et mises à jour  
✅ Plus de détection erronée de capteur de mouvement

---

## 🐛 Bug #256 - PIR/Boutons "Unknown Zigbee Device" (Cam)

### Problème Identifié
- ❌ Capteurs PIR et boutons restent en "Unknown Zigbee Device"
- ❌ Impossible de les connecter fonctionnellement
- ❌ Manque d'images pour identifier les bons drivers

### Cause Racine
1. Le driver `motion_sensor_pir_battery` partageait les mêmes manufacturer IDs que `temperature_humidity_sensor`
2. IDs mélangés incluant des boutons (TS0041-TS0044) et capteurs de température (TS0201)
3. Conflit de pairing entre différents drivers
4. Clusters incorrects incluant 1030 et 61184 non pertinents

### ✅ Corrections Appliquées

#### `drivers/motion_sensor_pir_battery/driver.compose.json`
- **Manufacturer IDs nettoyés**: Uniquement capteurs PIR authentiques
  ```json
  "_TZ3000_kmh5qpmb", "_TZ3000_mcxw5ehu", "_TZ3000_mmtwjmaq",
  "_TZ3000_otvn3lne", "_TZ3040_bb6xaihh", "_TZ3040_wqmtjsyk",
  "_TZE200_3towulqd", "_TZE200_ar0slwnd", "_TZE200_bq5c8xfe",
  "_TZE200_ztc6ggyl", "_TZE204_ztc6ggyl", "_TZE284_0zse7xqg"
  ```
- **Product IDs simplifiés**: Seulement `TS0202` (PIR sensor standard)
- **Clusters Zigbee nettoyés**: 
  - Clusters: 0, 1, 1024, 1280
  - Bindings: 1, 1280

### Impact
✅ Capteurs PIR s'apparieront correctement sans conflit  
✅ Plus de confusion avec autres types de devices  
✅ Reconnaissance correcte lors du pairing

---

## 🐛 Bug #261 - Support Capteur Gaz TS0601_gas_sensor_2 (ugrbnk)

### Problème Identifié
- ⚠️ Demande d'ajout support pour nouveau capteur de gaz Tuya
- 📝 Référence: https://www.zigbee2mqtt.io/devices/TS0601_gas_sensor_2.html

### ✅ Corrections Appliquées

#### `drivers/gas_sensor_ts0601/driver.compose.json`
- **Manufacturer IDs enrichis**: Ajout des nouveaux modèles
  ```json
  "_TZE200_ezqy5pvh", "_TZE204_ezqy5pvh",
  "_TZE200_ggev5fsl", "_TZE204_ggev5fsl",
  "_TZE284_rjgdhqqi"
  ```

### Impact
✅ Support étendu pour plus de capteurs de gaz Tuya  
✅ Compatible avec TS0601_gas_sensor_2

---

## 📊 Validation et Tests

### Homey App Validation
```bash
✓ Pre-processing app...
✓ Validating app...
✓ App validated successfully against level 'publish'
```

**Warnings (non-bloquants)**:
- `titleFormatted` manquants pour `identify_device` et `reset_meter` (sera requis dans le futur)

### Compliance SDK3
✅ Capabilities correctement définies  
✅ Clusters Zigbee conformes  
✅ Endpoints correctement configurés  
✅ Images présentes pour tous les drivers  
✅ Energy configuration (batteries) définie

---

## 🎯 Prochaines Étapes Recommandées

### Priorité Haute
1. **Tests utilisateurs**: Demander aux utilisateurs du forum de tester la nouvelle version
2. **Images de pairing**: Ajouter des images de référence comme dans l'app Johan Bendz
3. **Documentation**: Créer un guide d'identification des devices

### Priorité Moyenne
4. **Ajout `titleFormatted`**: Pour conformité future SDK
5. **Enrichissement manufacturer IDs**: Selon retours communauté
6. **Logging amélioré**: Pour faciliter le diagnostic

### Priorité Basse
7. **Optimisation reporting**: Ajuster intervals selon feedback
8. **Tests automatisés**: Ajouter tests unitaires pour parsers

---

## 📝 Notes Techniques

### Standards Suivis
- ✅ **Johan Bendz Design**: Structure et nomenclature respectées
- ✅ **Homey SDK3**: Guidelines strictement appliquées
- ✅ **Zigbee Clusters**: Conformité ZCL (Zigbee Cluster Library)

### Manufacturer IDs - Bonnes Pratiques
- Format complet: `_TZxxxx_xxxxxxxx` (prefix + 8 caractères)
- Séparation claire par type de device
- Pas de chevauchement entre drivers

### Clusters Zigbee Critiques
- **1026** (0x0402): Temperature Measurement
- **1029** (0x0405): Relative Humidity Measurement  
- **1024** (0x0400): Illuminance Measurement
- **1280** (0x0500): IAS Zone (alarm/motion)
- **0001** (0x0001): Power Configuration (battery)

---

## 🚀 Publication

### Checklist Pre-Publication
- [x] Validation Homey CLI réussie
- [x] Drivers corrigés et testés localement
- [x] Documentation mise à jour
- [ ] Changelog mis à jour
- [ ] Version bump (2.1.39 → 2.1.40)
- [ ] Tests communautaires
- [ ] Publication App Store

### Message Forum Suggéré
```
📢 Version 2.1.40 - Corrections Majeures

Bonjour à tous,

Suite à vos retours (merci @Karsten_Hille, @Cam, @ugrbnk), 
j'ai corrigé en profondeur les problèmes suivants:

✅ Capteurs température/humidité affichent maintenant les valeurs
✅ Plus de fausse détection de capteur de mouvement
✅ Capteurs PIR s'apparient correctement (plus de "Unknown Device")
✅ Support ajouté pour TS0601_gas_sensor_2

Les manufacturer IDs ont été complètement nettoyés et séparés 
par type de device pour éviter les conflits de pairing.

Merci pour votre patience et vos rapports détaillés!
```

---

**Fin du rapport**
