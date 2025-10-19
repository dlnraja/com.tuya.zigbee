# 🚨 PUBLICATION MANUELLE REQUISE

## ⚠️ SITUATION ACTUELLE

**GitHub Actions ÉCHOUE à la publication** en raison d'un conflit SDK3 images:

```
× App did not validate against level `publish`:
× drivers.air_quality_monitor_ac: property `images` is required in order to publish an app.
```

**Version sur App Store:** 2.15.110 (ANCIENNE, avec device.js corrompus)  
**Version locale:** 2.15.120 (NOUVELLE, avec tous les fixes)

## 🔧 PROBLÈME TECHNIQUE

**Conflit SDK3 Homey:**
- APP images: DOIVENT être 250x175 (small) et 500x350 (large)
- Driver images: DOIVENT être 75x75 (small) et 500x500 (large)
- Homey REQUIRE des déclarations `images` dans app.json pour publish
- Mais les scripts d'ajout automatique ne fonctionnent pas (auto-suppression)

**État actuel:**
- ✅ 366 images personnalisées créées (75x75 et 500x500) pour drivers
- ✅ Device.js restaurés avec parsers complets
- ✅ Validation debug: PASS
- ❌ Validation publish: FAIL (manque déclarations images pour 183 drivers)

---

## 📝 SOLUTION: PUBLICATION MANUELLE

### Option 1: CLI Homey (RECOMMANDÉE)

**Étapes:**
1. Ouvrir terminal dans le projet
2. Exécuter: `homey app publish`
3. Répondre aux prompts:
   - Uncommitted changes? **Y**
   - Update version? **Y**
   - Select version: **Patch**
   - Changelog: **"Critical device.js fixes - Motion and SOS sensors restored"**
4. Warnings sur images: **Accepter**

**Commande complète:**
```bash
cd "C:\Users\HP\Desktop\homey app\tuya_repair"
homey app publish
```

### Option 2: Demander Support Athom

Si la publication CLI échoue aussi, contacter Athom:
- Email: support@athom.com
- Forum: https://community.homey.app
- Expliquer le conflit SDK3 images APP vs drivers

---

## ✅ CE QUI EST PRÊT POUR PUBLICATION

### 1. Device Files Restaurés
- `motion_temp_humidity_illumination_multi_battery/device.js` ✅
- `sos_emergency_button_cr2032/device.js` ✅

### 2. Capabilities Complètes
```javascript
✅ Temperature: reportParser value/100 (12.1°C)
✅ Humidity: reportParser value/100 (89.3%)
✅ Illuminance: logarithmic conversion (31 lux)
✅ Battery: reportParser value/2 (100%)
✅ Motion: IAS Zone + notification listener
✅ SOS: IAS Zone + notification listener
```

### 3. Images Créées
- ✅ 366 images personnalisées pour drivers
- ✅ Images APP correctes (250x175 / 500x350)

---

## 🎯 INSTRUCTIONS POUR UTILISATEURS (APRÈS PUBLICATION)

Une fois la version 2.15.121+ publiée:

### Peter et autres utilisateurs affectés:

**Étape 1: Mettre à jour**
1. Homey App → Settings → Apps
2. Universal Tuya Zigbee → Update
3. Version: 2.15.121+

**Étape 2: RE-PAIRER devices (OBLIGATOIRE!)**

**Motion Sensor:**
1. Supprimer l'ancien device
2. Add Device → Universal Tuya Zigbee
3. Sélectionner: "motion temp humidity illumination multi battery"
4. Pairing normal

**SOS Button:**
1. Supprimer l'ancien device
2. Add Device → Universal Tuya Zigbee
3. Sélectionner: "sos emergency button cr2032"
4. Pairing normal

**Étape 3: Vérifier valeurs**
Après re-pairing, les valeurs devraient s'afficher:
- Temperature: 12.1°C ✅
- Humidity: 89.3% ✅
- Illuminance: 31 lux ✅
- Battery: 100% ✅
- Motion: Trigger flows ✅
- SOS: Trigger flows ✅

---

## 📊 RÉSUMÉ TECHNIQUE

**Ce qui a été corrigé (v2.15.120):**
- Device.js complets avec class definitions
- registerCapability avec reportParsers
- IAS Zone enrollment avec error handling
- Notification listeners pour Motion et SOS
- Debug logging pour diagnostic

**Ce qui bloque GitHub Actions:**
- Conflit SDK3 images (APP 250x175 vs drivers 75x75)
- Scripts d'ajout automatique ne persistent pas
- Validation `publish` level trop stricte

**Solution:**
- Publication manuelle via CLI Homey
- OU attendre fix SDK4 d'Athom
- OU script externe pour modifier app.json

---

## 🔗 LIENS UTILES

- **Dashboard:** https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee
- **App Store:** https://homey.app/a/com.dlnraja.tuya.zigbee
- **GitHub:** https://github.com/dlnraja/com.tuya.zigbee
- **Forum Issue:** https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352/358

---

**Date:** 15 octobre 2025, 23:35 UTC+02:00  
**Version locale:** 2.15.120 (avec fixes)  
**Version App Store:** 2.15.110 (ancienne)  
**Status:** ⚠️ **PUBLICATION MANUELLE REQUISE**
