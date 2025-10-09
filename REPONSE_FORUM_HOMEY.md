# 📢 RÉPONSE FORUM HOMEY COMMUNITY

## 🎉 NOUVELLE VERSION 2.1.31 DISPONIBLE EN TEST ! 

Bonjour à tous ! 👋

Je suis ravi d'annoncer que **tous les devices demandés** sur le forum et GitHub ont été ajoutés à l'app **Universal Tuya Zigbee** ! 

La version **2.1.31** est maintenant disponible sur le **Test channel** et sera bientôt certifiée pour le Live channel.

---

## ✅ DEVICES AJOUTÉS - Vos demandes traitées !

### 🔴 @Gerrit_Fikse - Vibration Sensor TS0210 (Issue #26)
**Status:** ✅ **CORRIGÉ ET FONCTIONNEL**

Votre capteur de vibration est maintenant correctement détecté ! Le bug qui le faisait apparaître comme "wall switch" est résolu.

**Device supporté:**
- ✅ Model: TS0210
- ✅ Manufacturer: _TZ3000_lqpt3mvr
- ✅ Type: Vibration Sensor
- ✅ Driver: `vibration_sensor`

**Capacités Homey:**
- Détection de vibration (`alarm_motion`)
- Niveau de batterie (`measure_battery`)
- Température (`measure_temperature`)

**🔗 Produit:** [Amazon Link](https://www.amazon.nl/-/en/Aprilsunnyzone-Vibration-Sensor-Zigbee-Control/dp/B0DM6637SN)

**Pour utiliser:**
1. Installez la version 2.1.31 depuis le Test channel
2. Supprimez l'ancien device (s'il est mal détecté)
3. Ré-appairez le capteur
4. Il sera maintenant détecté comme "Vibration Sensor" ✅

---

### 🔴 @kodalissri - ZG-204ZM PIR Radar Illumination Sensor (Issue #29)
**Status:** ✅ **AJOUTÉ AVEC NOUVEAU DRIVER**

**Device supporté:**
- ✅ Model: ZG-204ZM / TS0601
- ✅ Manufacturer: HOBEIAN, _TZE200_2aaelwxk, _TZE200_kb5noeto, _TZE200_tyffvoij
- ✅ Type: PIR + Radar + Illumination Sensor
- ✅ Driver: `pir_radar_illumination_sensor`

**Capacités Homey:**
- Détection de mouvement PIR + Radar (`alarm_motion`)
- Mesure de luminosité en lux (`measure_luminance`)
- Niveau de batterie (`measure_battery`)

**🔗 Produit:** [AliExpress Link](https://a.aliexpress.com/_mKcJ8RJ)

---

### 🔴 @kodalissri - ZG-204ZV Multi-Sensor (Issue #28)
**Status:** ✅ **AJOUTÉ AVEC NOUVEAU DRIVER**

**Device supporté:**
- ✅ Model: ZG-204ZV / TS0601
- ✅ Manufacturer: HOBEIAN, _TZE200_uli8wasj, _TZE200_grgol3xp, _TZE200_rhgsbacq, _TZE200_y8jijhba
- ✅ Type: Motion + Temp + Humidity + Illumination Sensor (4-in-1)
- ✅ Driver: `motion_temp_humidity_illumination_sensor`

**Capacités Homey:**
- Détection de mouvement radar mmWave (`alarm_motion`)
- Température en °C (`measure_temperature`)
- Humidité en % (`measure_humidity`)
- Luminosité en lux (`measure_luminance`)
- Niveau de batterie (`measure_battery`)

**🔗 Produit:** [AliExpress Link](https://a.aliexpress.com/_mrlhbgN)

---

### 🔴 @askseb - TS0041 Button (Issue #30)
**Status:** ✅ **AJOUTÉ**

**Device supporté:**
- ✅ Model: TS0041
- ✅ Manufacturer: _TZ3000_yj6k7vfo
- ✅ Type: 1-gang wireless button (1 ou 2 push)
- ✅ Driver: `wireless_switch_1gang_cr2032`

**Capacités Homey:**
- Bouton simple/double clic
- Contrôle on/off
- Support dimmer
- Niveau de batterie

---

### 🔴 @askseb - TS0203 Door Sensor (Issue #31)
**Status:** ✅ **AJOUTÉ**

**Device supporté:**
- ✅ Model: TS0203
- ✅ Manufacturer: _TZ3000_okohwwap
- ✅ Type: Door/Window Contact Sensor
- ✅ Driver: `door_window_sensor`

**Capacités Homey:**
- Contact porte/fenêtre ouvert/fermé (`alarm_contact`)
- Détection de mouvement optionnelle
- Température
- Luminosité
- Niveau de batterie

---

### 🔴 @kodalissri - TS0201 Temp/Humidity with Screen (Issue #32)
**Status:** ✅ **AJOUTÉ**

**Device supporté:**
- ✅ Model: TS0201
- ✅ Manufacturer: _TZ3000_bgsigers
- ✅ Type: Temperature & Humidity Sensor with LCD Screen
- ✅ Driver: `temperature_humidity_sensor`

**Capacités Homey:**
- Température en °C (`measure_temperature`)
- Humidité en % (`measure_humidity`)
- Niveau de batterie (`measure_battery`)
- Affichage LCD intégré

**🔗 Produit:** [AliExpress Link](https://www.aliexpress.com/item/1005007816835463.html)

---

### 🔴 @gfi63 - TS011F Outlet with Metering (Issue #27)
**Status:** ✅ **AJOUTÉ**

**Device supporté:**
- ✅ Model: TS011F
- ✅ Manufacturer: _TZ3000_npg02xft
- ✅ Type: Smart Outlet with Energy Monitoring
- ✅ Driver: `energy_monitoring_plug_advanced`

**Capacités Homey:**
- Contrôle marche/arrêt (`onoff`)
- Puissance instantanée en W (`measure_power`)
- Consommation totale en kWh (`meter_power`)
- Tension électrique en V (`measure_voltage`)
- Courant électrique en A (`measure_current`)

---

## 📋 AUTRES DEMANDES TRAITÉES

### 🔴 _TZE284_vvmbj46n Temperature & Humidity Sensor
**Status:** ✅ **DÉJÀ SUPPORTÉ**

Ce manufactureur est déjà supporté dans le driver `temperature_humidity_sensor` depuis plusieurs versions. Si votre device ne s'appaire pas correctement, essayez:

1. Réinitialisez le capteur (reset factory)
2. Supprimez l'ancien device dans Homey
3. Ré-appairez en mode "Add Device" → "Tuya Zigbee" → "Temperature Humidity Sensor"

---

## 🚀 COMMENT INSTALLER LA NOUVELLE VERSION

### Option 1: Test Channel (Recommandé - Version 2.1.31 disponible maintenant)
1. Ouvrez l'App Store Homey
2. Cherchez "Universal Tuya Zigbee"
3. Activez le **Test channel**
4. Installez la version **2.1.31**

### Option 2: Attendre la certification Live
La version sera soumise pour certification et disponible sur le Live channel dans quelques jours.

---

## 📊 RÉSUMÉ DE LA VERSION 2.1.31

✅ **7 demandes GitHub fermées** (#26, #27, #28, #29, #30, #31, #32)
✅ **2 nouveaux drivers créés** (ZG-204ZM, ZG-204ZV)
✅ **5 drivers existants enrichis**
✅ **11 nouveaux manufactureurs ajoutés**
✅ **1 bug critique corrigé** (TS0210 vibration sensor)

---

## 🔗 LIENS UTILES

- **GitHub Repository:** https://github.com/dlnraja/com.tuya.zigbee
- **Issues GitHub:** https://github.com/dlnraja/com.tuya.zigbee/issues
- **Test App:** https://homey.app/a/com.dlnraja.tuya.zigbee/test/
- **Documentation:** Voir `NOUVEAUX_DRIVERS_v2.1.31.md` sur GitHub

---

## 📢 FUTURES DEMANDES

Pour toute nouvelle demande de device:
1. **Vérifiez d'abord** si le device n'est pas déjà supporté
2. Ouvrez une **issue sur GitHub** avec les informations complètes:
   - Interview Zigbee du device
   - Manufacturer Name et Model ID
   - Lien d'achat si possible
3. Ou postez sur ce thread du forum avec les mêmes informations

---

## ❤️ MERCI À LA COMMUNAUTÉ !

Un grand merci à tous ceux qui ont contribué avec leurs interviews de devices, leurs tests et leurs retours :
- @Gerrit_Fikse
- @kodalissri
- @askseb
- @gfi63
- Et tous les autres membres actifs !

**Continuez à partager vos devices Tuya Zigbee, ensemble nous rendons cette app de plus en plus complète !** 🚀

---

*Dylan Raja*
*Développeur - Universal Tuya Zigbee App*
*9 octobre 2025*
