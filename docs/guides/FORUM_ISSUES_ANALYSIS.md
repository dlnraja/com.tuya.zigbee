#  ANALYSE EXHAUSTIVE FORUM - PROBLÈMES IDENTIFIÉS

**Date**: 2026-01-13  
**Source**: Pages 46-48 + activité dlnraja  
**Status**: EN COURS DE CORRECTION

---

##  PROBLÈMES CRITIQUES (9 identifiés)

### 1. **BSEED 4-Gang Switch TS0726** 
- **ManufacturerID**: `_TZ3002_pzao9ls1`
- **ProductID**: `TS0726`
- **Problème**: "Could not get device by id" error
- **Power Source**: Incorrect (battery au lieu de mains)
- **Status Driver**:  DÉJÀ PRÉSENT dans switch_4gang
- **Action**: Fix flow card registration + power source detection
- **Interview**: Disponible (4 endpoints, clusters 0xE000/0xE001)

### 2. **HOBEIAN ZG-101ZL Button**
- **ManufacturerID**: `HOBEIAN`
- **ProductID**: `ZG-101ZL`
- **Problème**: Détecté comme "Unknown Zigbee Device"
- **Cause**: Clusters mismatch - utilise 0xE001 au lieu de 0xE000
- **Status Driver**:  DÉJÀ PRÉSENT dans button_wireless_1
- **Action**: Ajouter support cluster 57345 (0xE001) + onOff attribute listener
- **Interview**: Complète avec nouveaux clusters

### 3. **Water Leak Detector HOBEIAN ZG-222Z**
- **ManufacturerID**: `HOBEIAN`
- **ProductID**: `ZG-222Z`
- **Problème**: Nouvelle demande utilisateur Lasse_K
- **Type**: waterSensor (IAS Zone)
- **Clusters**: [0, 3, 1280, 1]
- **Status**:  DÉJÀ PRÉSENT dans water_leak_sensor
- **Action**: Vérifier manufacturerName case (HOBEIAN vs _TZ...)
- **Interview**: Complète disponible

### 4. **mmWave Ceiling Presence Sensor**
- **ManufacturerID**: `_TZE200_crq3r3la`
- **ProductID**: `CK-BL702-MWS-01(7016)`
- **Problème**: Détecté comme "Climate Sensor" au lieu de "Presence Sensor"
- **Power Source**: Incorrect (battery au lieu de mains 220V)
- **Utilisateurs**: JJ10, Ricardo_Lenior
- **Action**: Déplacer de climate_sensor vers motion_sensor
- **Settings manquants**: sensitivity, range, detection_distance

### 5. **Door/Contact Sensor - Logique Inversée**
- **Utilisateur**: Lasse_K
- **Problème**: Alarm inversé
  - Magnet PROCHE = alarm_contact TRUE (devrait être FALSE)
  - Magnet ÉLOIGNÉ = alarm_contact FALSE (devrait être TRUE)
- **Action**: Inverser logique dans IAS Zone handler ou contact sensor driver

### 6. **Smart Button Auto-Trigger Bug**
- **Utilisateur**: Cam
- **Problème**: Se déclenche automatiquement toutes les heures (x:30)
- **Symptôme**: Pas de réaction aux pressions physiques réelles
- **Action**: Debug timing + event listener

### 7. **3-Button Remote Battery - NON SUPPORTÉ**
- **Utilisateur**: Daniel_van_Mourik
- **Screenshot**: Disponible avec manufacturerID visible
- **Action**: Extraire manufacturerID + productID depuis screenshot
- **Driver**: button_wireless_3 ou créer nouveau

### 8. **mmWave Sensor - Fausses Valeurs Température/Humidité**
- **Utilisateur**: Rudy_De_Vylder
- **Device**: TZE_200 presence sensor
- **Problème**: Affiche temp/humidity alors que capteur n'a pas ces sensors
- **Battery**: Drop à 0% en sleep, retour 100% au wake
- **Action**: Désactiver capabilities non supportées

### 9. **Hejhome Light Switches - Unknown Device**
- **Utilisateur**: Trey_Rogerson
- **Problème**: Pair uniquement comme "plain zigbee" router sans onoff
- **Action**: Demander interview data complète

---

##  DEMANDES NOUVELLES DEVICES

### Water Leak Detector (Lasse_K)
- **Status**:  Device déjà supporté
- **Action**: Guider utilisateur vers driver correct

### 3-Button Remote (Daniel_van_Mourik)
- **Status**:  À AJOUTER
- **Priority**: HIGH
- **Info**: Screenshots disponibles

---

##  CORRECTIONS À IMPLÉMENTER

### Priority HIGH
1.  Fix BSEED TS0726 flow card registration
2.  Fix HOBEIAN ZG-101ZL cluster 0xE001 detection
3.  Fix mmWave sensor classification (climate  presence)
4.  Fix door sensor alarm inversion logic
5.  Fix power source detection (mains vs battery)

### Priority MEDIUM
6. Debug button auto-trigger timing
7. Add 3-button remote support
8. Fix false temperature/humidity readings

### Priority LOW
9. Guide Hejhome switches (need interview)

---

##  STATISTIQUES

- **Pages analysées**: 46-48
- **Problèmes identifiés**: 9
- **Devices déjà supportés**: 3
- **Nouveaux devices**: 1
- **Bugs logiques**: 3
- **Corrections power source**: 2

---

##  LIENS FORUM RÉFÉRENCÉS

1. https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352/955
2. https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352?page=48
3. https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352?page=47
4. https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352?page=46

**NEXT**: Implémenter corrections identifiées

---

##  NOUVEAUX DEVICES IDENTIFIÉS (Pages 40-42)

### eWeLink Temperature & Humidity Sensor
- **ManufacturerID**: `eWeLink`
- **ProductID**: `CK-TLSR8656-SS5-01(7014)`
- **Clusters**: [0, 1, 3, 4, 32, 1026, 1029, 64529]
- **Features**: Temperature, Humidity, Battery, Poll Control
- **Status**:  À AJOUTER au driver climate_sensor
- **Interview**: Complète disponible

### HOBEIAN ZG-102Z Contact Sensor
- **ManufacturerID**: `HOBEIAN`
- **ProductID**: `ZG-102Z`
- **Clusters**: [0, 3, 1280, 61184, 1] - IAS Zone + Tuya DP
- **Features**: Contact, Battery, Tamper
- **Status**:  À AJOUTER au driver contact_sensor
- **Interview**: Complète disponible

### RGB Bulb TS0505B
- **ManufacturerID**: `_TZ3210_s8lvbbuc`
- **ProductID**: `TS0505B`
- **Features**: RGB+CCT, mains-powered
- **Status**:  Probablement déjà supporté

### 4-Scene Button Switches
- **ManufacturerID**: `_TZ3000_wkai4ga5`, `_TZ3000_5tqxpine`
- **Problème**: Paired as "Wireless Controller" instead of "4-Scene Switch"
- **Demande**: Better capability naming (button_upper_left vs button.1)
- **Action**: Vérifier driver button_wireless_4 mapping

---

##  DEMANDES SUPPLÉMENTAIRES

### Zigbee IR Blaster
- **Utilisateur**: FrankP
- **Status**: En attente de développement
- **Priority**: MEDIUM

### Motion Sensor Lux Updates
- **Problème**: Lux level only updates on motion trigger, not continuously
- **Demande**: Update lux independently of motion events
- **Action**: Modifier reporting configuration

### Curtain Motor Improvements
- **Demande**: Better battery/luminance reporting
- **ManufacturerID**: `_TZ3000_5tqxpine`

---

##  STATISTIQUES FINALES

- **Pages analysées**: 40-48 (9 pages)
- **Problèmes critiques**: 9
- **Nouveaux devices**: 4
- **Bugs logiques**: 3
- **Demandes features**: 3
- **Corrections power source**: 2
- **Users impactés**: 10+

---

##  ACTIONS COMPLÉTÉES

1.  GitHub Actions workflows corrigés (permissions + YAML)
2.  Forum analysé exhaustivement (pages 40-48)
3.  Problèmes documentés avec interviews complètes
4.  FORUM_ISSUES_ANALYSIS.md créé
