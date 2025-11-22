# 📋 MASTER DEVICE LIST - Tous les Issues GitHub

**Sources:** dlnraja/com.tuya.zigbee + JohanBendz/com.tuya.zigbee
**Date:** 2025-11-21
**Status:** TRAITEMENT EN COURS

---

## 🎯 DEVICES DLNRAJA REPOSITORY

### 1. ✅ TS0044 / _TZ3000_u3nv1jwk - 4 Button Touch Remote
**Issue:** #76
**Status:** EN COURS (driver existe, besoin IAS Zone fix)
**Action:** Ajouter manufacturer ID dans button_wireless_4

### 2. ✅ ZG-204ZL - Motion Sensor
**Issue:** #75
**Status:** ✅ FIXED v4.10.1
**Action:** Aucune (déjà traité)

### 3. 🔧 TS0201 / _TZ3000_1o6x1bl0 - Temp/Humidity with Buzzer
**Issue:** #37
**User:** laborhexe0210
**Status:** À TRAITER
**Device:** Temperature and Humidity Sensor with buzzer and external sensor
**Action:** Créer driver spécialisé avec support buzzer

### 4. 🔧 TS0601 - MOES CO Detector
**Issue:** #35
**User:** gore-
**Status:** À TRAITER
**Device:** MOES Carbon Monoxide detector
**Action:** Créer driver CO detector avec alarm_co

### 5. 🔧 TS0503B / _TZ3210_0zabbfa - RGB LED Strip Controller
**Issue:** #34
**User:** massari46
**Status:** À TRAITER
**Device:** Smart RGB COLOR LED Strip Controller
**Action:** Créer driver RGB controller

### 6. 🔧 TS0201 - Temp/Humidity Sensor with Screen
**Issue:** #32
**User:** kodalissri
**Status:** À TRAITER
**Device:** Temperature and Humidity Sensor with LCD Screen
**Action:** Vérifier si driver actuel compatible ou créer nouveau

### 7. ✅ ZG-204ZM - PIR Radar + Illumination Sensor
**Issue:** #29
**User:** kodalissri
**Status:** ✅ FIXED v4.10.1
**Action:** Aucune (déjà traité avec ZG-204ZL)

### 8. 🔧 ZG-204ZV - Multi-Sensor (Motion + Temp + Humidity + Lux)
**Issue:** #28
**User:** kodalissri
**Status:** À TRAITER
**Device:** Motion, Temperature, Humidity and Illumination Sensor
**Action:** Créer driver multi-capteur complet

### 9. 🔧 Aqara Precision Motion Sensor
**Issue:** #25
**User:** GXA064
**Status:** À TRAITER
**Note:** Non-Tuya, mais demandé
**Action:** Rechercher si compatible Tuya protocol

### 10. 🔧 TS0201 / Smart Knob - _TZ3000_gwkzibhs / TS004F
**Issue:** #22
**Status:** À TRAITER
**Device:** Smart Knob rotary controller
**Action:** Créer driver bouton rotatif

---

## 🎯 DEVICES JOHAN BENDZ REPOSITORY

### 11. 🔧 TS011F / _TZ3210_cehuw1lw - Power Socket
**Issue:** JohanBendz#1312
**User:** gussj
**Status:** À TRAITER
**Action:** Ajouter manufacturer ID au driver socket

### 12. 🔧 TS1101 / _TZ3000_7ysdnebc - 2CH Zigbee Dimmer Module
**Issue:** JohanBendz#1311
**User:** jcd
**Status:** À TRAITER
**Device:** 2-Channel Dimmer Module
**Action:** Créer driver dimmer 2-gang

### 13. 🔧 TS0601 / _TZE200_9xfjixap - Zigbee Thermostat
**Issue:** JohanBendz#1310
**User:** tashunka73
**Status:** À TRAITER
**Device:** Tuya Zigbee Thermostat
**Action:** Créer driver thermostat avec Tuya DP

### 14. 🔧 TS0601 / _TZE200_dcrrztpa - Wall Socket USB-C PD
**Issue:** JohanBendz#1307
**User:** Gaza84
**Status:** À TRAITER
**Device:** Zigbee Wall Socket with USB-C Power Delivery
**Action:** Créer driver socket USB-C avec energy monitoring

### 15. 🔧 TS0601 - 10G mmWave Radar Multi-Sensor
**Issue:** JohanBendz#1305
**User:** michelhelsdingen
**Status:** À TRAITER
**Device:** 10G Human Motion Sensor avec Temperature, Humidity, Luminance
**Action:** Créer driver mmWave advanced

### 16. 🔧 Door & Window Sensor
**Issue:** JohanBendz#1304
**User:** toththommy-hash
**Status:** À TRAITER
**Device:** Zigbee Door & Window contact sensor
**Action:** Vérifier manufacturer ID et ajouter au driver existant

### 17. 🔧 _TZE284_sgabhwa6 - Soil Moisture Sensor
**Recherché:** Blakadder + Zigbee2MQTT
**Status:** À TRAITER
**Device:** Smart Soil Sensor (temperature + humidity du sol)
**Action:** Créer driver soil sensor

### 18. 🔧 ZigBee RGB/RGBW SPI LED Controller - LIANGLED / WZ-SPI
**Issue:** JohanBendz#1302
**Status:** À TRAITER
**Device:** SPI LED Controller
**Action:** Créer driver SPI controller

### 19. 🔧 TS0601 / _TZE200_nv6nxo0c - Moes Curtain Motor
**Issue:** JohanBendz#1301
**Status:** À TRAITER
**Device:** ZigBee Curtain Motor
**Action:** Créer driver curtain motor

### 20. 🔧 TS011F / _TZ3210_fgwhjm9j - Power Socket 20A
**Issue:** JohanBendz#1300
**Status:** À TRAITER
**Device:** Power socket zigbee 20 Ampere
**Action:** Ajouter manufacturer ID au driver socket

### 21. 🔧 TS0201 - Zbeacon Temp/Humidity
**Issue:** JohanBendz#1299
**Status:** À TRAITER
**Device:** Temperature and Humidity sensor - Zbeacon brand
**Action:** Ajouter manufacturer ID

---

## 📊 STATISTIQUES

**Total Devices:** 21
**Déjà Traités:** 3 (ZG-204ZL, ZG-204ZM, Boutons partiellement)
**À Traiter:** 18
**Priorité Critique:** 5
**Priorité Haute:** 8
**Priorité Moyenne:** 5

---

## 🎯 PLAN D'ACTION PAR PRIORITÉ

### P0 - CRITIQUE (v4.11.0 - Cette semaine)

1. **TS0044 Button IAS Zone Fix** - Cam's issue
2. **TS0201 Temp/Humidity** - Multiple users
3. **TS011F Sockets** - 2 variantes demandées
4. **Door/Window Sensor** - Security device

### P1 - HAUTE (v4.12.0 - Semaine prochaine)

5. **TS0601 MOES CO Detector** - Safety device
6. **TS0503B RGB LED Controller** - Popular device
7. **ZG-204ZV Multi-Sensor** - Feature-rich
8. **TS1101 2CH Dimmer** - Requested
9. **Thermostat _TZE200_9xfjixap** - Climate control

### P2 - MOYENNE (v4.13.0 - 2-3 semaines)

10. **Soil Moisture Sensor** - Specialized
11. **Smart Knob TS004F** - Rotary control
12. **USB-C PD Socket** - Modern device
13. **10G mmWave Radar** - Advanced sensor
14. **Curtain Motor** - Automation

### P3 - BASSE (v4.14.0+ - Futur)

15. **RGB/RGBW SPI Controller** - Niche
16. **Aqara Motion** - Non-Tuya
17. **20A Power Socket** - Same as regular but higher amp
18. **Zbeacon Temp/Humidity** - Brand variant

---

## 🔍 RECHERCHE BLAKADDER REQUISE

Pour chaque device, rechercher:
1. ✅ Manufacturer IDs complets
2. ✅ Product IDs / Model IDs
3. ✅ Clusters utilisés
4. ✅ Capabilities supportées
5. ✅ Tuya Datapoints (si TS0601)
6. ✅ Particularités techniques

---

**Next Action:** Rechercher devices P0 sur Blakadder/Zigbee2MQTT
