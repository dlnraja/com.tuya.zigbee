# 📋 NOUVEAUX DRIVERS - Version 2.1.31

## 🆕 NOUVEAUX DRIVERS CRÉÉS

### 1. PIR Radar Illumination Sensor (ZG-204ZM)
**📁 Emplacement:** `drivers/pir_radar_illumination_sensor/`
**🆔 ID Driver:** `pir_radar_illumination_sensor`
**🔧 Issue GitHub:** #29
**👤 Demandé par:** kodalissri

**✨ Capacités Homey:**
- ✅ `alarm_motion` - Détection de mouvement PIR + Radar
- ✅ `measure_luminance` - Mesure de luminosité (lux)
- ✅ `measure_battery` - Niveau de batterie

**📡 Manufactureurs supportés:**
- HOBEIAN
- _TZE200_2aaelwxk
- _TZE200_kb5noeto
- _TZE200_tyffvoij

**🎯 Produits:**
- TS0601
- ZG-204ZM

**🔗 Lien produit:** https://a.aliexpress.com/_mKcJ8RJ

---

### 2. Motion Temp Humidity Illumination Sensor (ZG-204ZV)
**📁 Emplacement:** `drivers/motion_temp_humidity_illumination_sensor/`
**🆔 ID Driver:** `motion_temp_humidity_illumination_sensor`
**🔧 Issue GitHub:** #28
**👤 Demandé par:** kodalissri

**✨ Capacités Homey:**
- ✅ `alarm_motion` - Détection de mouvement radar mmWave
- ✅ `measure_temperature` - Température en °C
- ✅ `measure_humidity` - Humidité en %
- ✅ `measure_luminance` - Mesure de luminosité (lux)
- ✅ `measure_battery` - Niveau de batterie

**📡 Manufactureurs supportés:**
- HOBEIAN
- _TZE200_uli8wasj
- _TZE200_grgol3xp
- _TZE200_rhgsbacq
- _TZE200_y8jijhba

**🎯 Produits:**
- TS0601
- ZG-204ZV

**🔗 Lien produit:** https://a.aliexpress.com/_mrlhbgN

---

## 🔧 DRIVERS EXISTANTS ENRICHIS

### 3. Vibration Sensor - TS0210 (BUG CORRIGÉ)
**📁 Emplacement:** `drivers/vibration_sensor/`
**🆔 ID Driver:** `vibration_sensor`
**🔧 Issue GitHub:** #26
**👤 Demandé par:** gfi63 (Gerrit_Fikse sur forum)

**🐛 Bug corrigé:**
- ❌ AVANT: Détecté comme "wall switch" au lieu de "vibration sensor"
- ✅ APRÈS: Correctement détecté comme "vibration sensor"

**✨ Capacités Homey:**
- ✅ `onoff` - État on/off
- ✅ `measure_battery` - Niveau de batterie
- ✅ `measure_temperature` - Température
- ✅ `alarm_motion` - Détection de vibration
- ✅ `measure_luminance` - Luminosité

**📡 Manufactureurs AJOUTÉS:**
- TS0210 (ProductID)
- _TZ3000_lqpt3mvr (ManufacturerName)

**🔗 Lien produit:** https://www.amazon.nl/-/en/Aprilsunnyzone-Vibration-Sensor-Zigbee-Control/dp/B0DM6637SN

---

### 4. Wireless Switch 1-Gang (TS0041 Button)
**📁 Emplacement:** `drivers/wireless_switch_1gang_cr2032/`
**🆔 ID Driver:** `wireless_switch_1gang_cr2032`
**🔧 Issue GitHub:** #30
**👤 Demandé par:** askseb

**✨ Capacités Homey:**
- ✅ `measure_battery` - Niveau de batterie
- ✅ `onoff` - Bouton on/off
- ✅ `dim` - Contrôle dimmer
- ✅ Support 1 ou 2 push (simple/double clic)

**📡 Manufactureur AJOUTÉ:**
- _TZ3000_yj6k7vfo

**🎯 Produit:**
- TS0041 (1-gang button)

---

### 5. Door Window Sensor (TS0203)
**📁 Emplacement:** `drivers/door_window_sensor/`
**🆔 ID Driver:** `door_window_sensor`
**🔧 Issue GitHub:** #31
**👤 Demandé par:** askseb

**✨ Capacités Homey:**
- ✅ `onoff` - État on/off
- ✅ `measure_battery` - Niveau de batterie
- ✅ `measure_temperature` - Température
- ✅ `alarm_motion` - Détection mouvement
- ✅ `measure_luminance` - Luminosité
- ✅ `alarm_contact` - Contact porte/fenêtre (ouvert/fermé)

**📡 Manufactureur AJOUTÉ:**
- _TZ3000_okohwwap

**🎯 Produit:**
- TS0203 (door sensor)

---

### 6. Temperature Humidity Sensor with Screen (TS0201)
**📁 Emplacement:** `drivers/temperature_humidity_sensor/`
**🆔 ID Driver:** `temperature_humidity_sensor`
**🔧 Issue GitHub:** #32
**👤 Demandé par:** kodalissri

**✨ Capacités Homey:**
- ✅ `measure_temperature` - Température en °C
- ✅ `measure_humidity` - Humidité en %
- ✅ `measure_battery` - Niveau de batterie
- ✅ `alarm_motion` - Détection mouvement
- ✅ `measure_luminance` - Luminosité
- ✅ **AVEC ÉCRAN LCD** affichant temp/humidité

**📡 Manufactureur AJOUTÉ:**
- _TZ3000_bgsigers

**🎯 Produit:**
- TS0201 (avec écran)

**🔗 Lien produit:** https://www.aliexpress.com/item/1005007816835463.html

---

### 7. Energy Monitoring Plug Advanced (TS011F)
**📁 Emplacement:** `drivers/energy_monitoring_plug_advanced/`
**🆔 ID Driver:** `energy_monitoring_plug_advanced`
**🔧 Issue GitHub:** #27
**👤 Demandé par:** gfi63

**✨ Capacités Homey:**
- ✅ `onoff` - Marche/Arrêt de la prise
- ✅ `measure_power` - Puissance instantanée (W)
- ✅ `meter_power` - Consommation totale (kWh)
- ✅ `measure_voltage` - Tension électrique (V)
- ✅ `measure_current` - Courant électrique (A)

**📡 Manufactureur AJOUTÉ:**
- _TZ3000_npg02xft

**🎯 Produit:**
- TS011F (outlet with metering)

---

## 📊 RÉSUMÉ

✅ **2 nouveaux drivers créés**
✅ **5 drivers existants enrichis**
✅ **7 issues GitHub fermées** (#26, #27, #28, #29, #30, #31, #32)
✅ **1 bug critique corrigé** (TS0210 vibration sensor)
✅ **11 nouveaux manufactureurs ajoutés**

**🚀 Version:** 2.1.31
**📅 Date:** 9 octobre 2025
**🔗 GitHub:** https://github.com/dlnraja/com.tuya.zigbee
**🏪 Homey App Store:** https://homey.app/a/com.dlnraja.tuya.zigbee/test/
