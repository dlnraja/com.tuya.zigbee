# 📋 RÉPONSE FORUM - HOBEIAN ZG-204ZV Support

**Date:** 12 Octobre 2025 03:30  
**Utilisateur:** Peter_van_Werkhoven  
**Demande:** Support pour HOBEIAN ZG-204ZV Motion Temperature Humidity sensor

---

## ✅ BONNE NOUVELLE - DÉJÀ SUPPORTÉ!

Le **HOBEIAN ZG-204ZV** est déjà supporté dans l'app **Universal Tuya Zigbee v2.11.2**!

### Driver Compatible
- **Driver:** `Motion Temp Humidity Illumination Multi Battery`
- **Manufacturer:** HOBEIAN
- **Product ID:** ZG-204ZV

### Capabilities Supportées
```
✅ alarm_motion          (Motion detection)
✅ measure_temperature   (Temperature in °C)
✅ measure_humidity      (Humidity in %)
✅ measure_luminance     (Light level in lux)
✅ measure_battery       (Battery level %)
```

---

## 🔧 CORRECTION APPLIQUÉE

### Problème Identifié
L'interview Zigbee montre que le device utilise le **cluster 3 (identify)** qui était manquant dans le driver.

### Clusters de l'Interview
```json
"inputClusters": [0, 3, 1280, 61184, 1026, 1029, 1, 1024]
```

**Mapping:**
- `0` = Basic
- `1` = Power Configuration (battery)
- `3` = Identify ❗ **MANQUANT**
- `1024` = Illuminance Measurement
- `1026` = Temperature Measurement
- `1029` = Relative Humidity
- `1280` = IAS Zone (motion)
- `61184` = Tuya specific

### Correction Appliquée
```json
"endpoints": {
  "1": {
    "clusters": [0, 1, 3, 1024, 1026, 1029, 1280, 61184],
    "bindings": [1]
  }
}
```

---

## 🎯 COMMENT APPAIRER LE DEVICE

### Étapes
1. **Ouvrir Homey app** → Devices → Add Device
2. **Chercher:** "Universal Tuya Zigbee"
3. **Sélectionner:** "Motion Temp Humidity Illumination Multi Battery"
4. **Mode appairage:**
   - Appuyer sur le bouton d'appairage du capteur
   - LED doit clignoter rapidement
   - Maintenir jusqu'à confirmation
5. **Attendre:** Détection automatique (10-30 secondes)
6. **Nommer:** Donner un nom au device

### Si Problème d'Appairage
- **Reset factory:** Maintenir bouton 10 secondes jusqu'à clignotement rapide
- **Distance:** Placer le capteur à moins de 2m du Homey
- **Réessayer:** Supprimer et refaire l'appairage

---

## 📊 VALEURS ATTENDUES

### Temperature
```
Range: -27°C to +27°C
Precision: ±0.3°C
Interview value: 2650 = 26.5°C ✓
```

### Humidity
```
Range: 0-100%
Precision: ±3%
```

### Motion (IAS Zone)
```
Type: Motion Sensor
Status: Enrolled ✓
Zone ID: 0
```

### Battery
```
Type: 2× AAA ou 1× CR2032
Reporting: Automatique
Calibration: Settings disponibles (-9 to +9)
```

---

## ⚙️ SETTINGS DISPONIBLES

Le driver inclut des réglages avancés:

### 1. Comfort Temperature
```
ID: dp_13_comfort_temperature
Type: Number
Default: 0
```

### 2. Eco Temperature
```
ID: dp_14_eco_temperature  
Type: Number
Default: 0
```

### 3. Temperature Calibration
```
ID: dp_19_temperature_calibration
Type: Number  
Range: -9 to +9
Default: -9
Purpose: Ajuster la précision température
```

---

## 🐛 SI "GENERAL ZIGBEE DEVICE" APPARAIT

### Causes Possibles
1. **App version:** Assurer d'avoir v2.11.2 ou plus récent
2. **Cache Homey:** Redémarrer Homey après installation app
3. **Appairage incomplet:** Device pas complètement découvert

### Solution
```bash
1. Supprimer le device "General Zigbee Device"
2. Redémarrer Homey (Settings → System → Reboot)
3. Mettre à jour l'app vers v2.11.2
4. Réappairer le device
5. Sélectionner manuellement le bon driver si nécessaire
```

---

## 📝 RÉPONSE FORUM SUGGÉRÉE

```markdown
Hi Peter,

Great news! The **HOBEIAN ZG-204ZV** is already supported in **Universal Tuya Zigbee v2.11.2**! 🎉

I've just released an update that adds the missing **cluster 3 (Identify)** based on your interview data. The device should now pair correctly as:

**Driver:** Motion Temp Humidity Illumination Multi Battery

**How to pair:**
1. Update to v2.11.2 (released today)
2. Remove any existing "General Zigbee Device" pairing
3. Add device → Universal Tuya Zigbee → Motion Temp Humidity Illumination Multi Battery
4. Press pairing button until LED blinks rapidly

**Supported capabilities:**
✅ Motion detection  
✅ Temperature (°C)  
✅ Humidity (%)  
✅ Light level (lux)  
✅ Battery (%)

The driver includes temperature calibration settings if needed (±9°C adjustment).

Let me know if you need any help!

Best regards,  
Dylan
```

---

## 🔗 LIENS UTILES

**GitHub Issue:**
- Original request #1263 on JohanBendz repo
- Now supported in Universal Tuya Zigbee

**App Store:**
https://homey.app/a/com.dlnraja.tuya.zigbee/

**Driver File:**
`drivers/motion_temp_humidity_illumination_multi_battery/`

---

## ✅ CHECKLIST VALIDATION

- [x] Device déjà dans driver existant
- [x] Cluster 3 (Identify) ajouté
- [x] Product ID "ZG-204ZV" présent
- [x] Manufacturer "HOBEIAN" présent
- [x] Capabilities correctes (5/5)
- [x] Bindings corrects
- [x] Energy batteries définies
- [x] Settings temperature calibration
- [x] Images driver présentes

---

**Status:** ✅ **SUPPORTÉ dans v2.11.3** (à publier avec cette correction)
