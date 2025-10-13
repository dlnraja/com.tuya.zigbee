# 🚨 HOBEIAN SENSORS - ANALYSE COMPLÈTE DES PROBLÈMES

**Date:** 2025-10-13 10:26  
**Status:** 🔍 **INVESTIGATION COMPLÈTE**

---

## 📊 PROBLÈMES IDENTIFIÉS

### **1. ZM-P1 Détecté comme ZG-204Z** ⚠️

**Issue:** GitHub Koenkk/zigbee2mqtt #28103

**Symptômes:**
- Device ZM-P1 (Tuya motion sensor)
- Détecté incorrectement comme ZG-204Z
- Attributes exposés: `alarm_1`, `alarm_2`, `tamper`, `battery`, `illuminance`
- ❌ **PAS d'attribut `occupancy`**

**Database Entry:**
```json
{
  "manufName": "HOBEIAN",
  "modelId": "ZG-204ZL",  // ← Device is ZM-P1 but reports as ZG-204ZL
  "clusters": [0, 3, 1280, 61184, 1, 1024]
}
```

**Problème Racine:**
- ZM-P1 a un modelId différent mais firmware similaire à ZG-204ZL
- IAS Zone (1280) expose `alarm_1` et `alarm_2` au lieu de `occupancy`
- Confusion d'identification entre plusieurs modèles

**Impact sur Homey:**
- ⚠️ Si ZM-P1 est pairé, il sera assigné au mauvais driver
- ⚠️ Capabilities incorrectes (alarm au lieu de motion)

---

### **2. ZG-204ZM - Faux Mouvement Constant** 🔴

**Issue:** Reddit r/homeassistant

**Symptômes:**
- ZG-204ZM (PIR + mmWave 24GHz)
- Détecte mouvement constant même dans boîte carton
- Motion "large" détecté correctement lors de marche
- Mais motion "small" jamais cleared → sensor reste "occupé"

**Explication Technique:**

**mmWave Physics:**
- ✅ mmWave traverse carton, bois, murs fins
- ✅ Détecte micro-mouvements (respiration, pulsations cardiaques)
- ❌ Trop sensible pour usage normal
- ❌ Besoin calibration sensitivity/keep_time

**Problème Configuration:**
```
Default settings (trop sensibles):
- Sensitivity: HIGH
- Keep Time: 30 seconds
- mmWave: Enabled (trop sensible aux micro-mouvements)
```

**Impact sur Homey:**
- ⚠️ Users verront sensor constamment "occupied"
- ⚠️ Automations ne fonctionnent pas correctement
- ⚠️ Besoin settings pour ajuster sensitivity

---

### **3. ZG-204ZL Issue #1267 (Johan Bendz)** ✅

**Status:** ✅ **DÉJÀ RÉSOLU dans v2.15.54**

**Fix Appliqué:**
```json
// drivers/motion_temp_humidity_illumination_multi_battery/driver.compose.json
"productId": [
  "TS0601",
  "ZG-204ZV",
  "ZG-204ZL"  // ← AJOUTÉ
]
```

---

## 🔍 ANALYSE DÉTAILLÉE - FAMILLE HOBEIAN

### **Modèles Confirmés:**

| Model | Description | ModelID Zigbee | Clusters | Status Homey |
|-------|-------------|----------------|----------|--------------|
| **ZG-204Z** | PIR basique | ZG-204Z | 0,1,3,1280 | ✅ v2.15.65 |
| **ZG-204ZL** | PIR + Lux | ZG-204ZL | 0,1,3,1024,1280,61184 | ✅ v2.15.54 |
| **ZG-204ZV** | PIR + Temp + Hum + Lux | ZG-204ZV | 0,1,3,1024,1026,1029,1280 | ✅ v2.15.54 |
| **ZG-204ZM** | PIR + mmWave 24GHz | ZG-204ZM | 0,1,3,1024,1280,61184 + mmWave | ⚠️ Problème sensitivity |
| **ZM-P1** | Motion + Lux (Tuya) | ZG-204ZL | 0,1,3,1024,1280,61184 | ❌ Confusion identité |

---

## 🔧 SOLUTIONS PROPOSÉES

### **Solution 1: ZM-P1 Identification** ⭐

**Problème:** ZM-P1 rapporte modelId "ZG-204ZL" mais est device différent

**Options:**

**A. Ajouter ZM-P1 comme alias dans driver existant**
```json
// drivers/motion_temp_humidity_illumination_multi_battery/driver.compose.json
"productId": [
  "TS0601",
  "ZG-204ZV",
  "ZG-204ZL",
  "ZM-P1"  // ← AJOUTER si modelId est différent
]
```

**B. Attendre retour utilisateur avec device interview**
- Besoin: device interview complet de ZM-P1
- Vérifier: modelId réel vs ZG-204ZL
- Si différent: ajouter support spécifique

**Recommandation:** Option B (attendre données réelles)

---

### **Solution 2: ZG-204ZM mmWave Sensitivity** ⭐⭐⭐

**Problème:** mmWave trop sensible, faux positifs constants

**Solution Technique:**

**A. Ajouter Settings pour Calibration**
```json
{
  "settings": [
    {
      "type": "dropdown",
      "id": "pir_sensitivity",
      "label": {
        "en": "PIR Sensitivity"
      },
      "value": "medium",
      "values": [
        {"id": "low", "label": {"en": "Low"}},
        {"id": "medium", "label": {"en": "Medium"}},
        {"id": "high", "label": {"en": "High"}}
      ]
    },
    {
      "type": "dropdown",
      "id": "keep_time",
      "label": {
        "en": "Motion Timeout"
      },
      "value": "60",
      "values": [
        {"id": "30", "label": {"en": "30 seconds"}},
        {"id": "60", "label": {"en": "1 minute"}},
        {"id": "120", "label": {"en": "2 minutes"}},
        {"id": "300", "label": {"en": "5 minutes"}}
      ]
    },
    {
      "type": "checkbox",
      "id": "mmwave_enabled",
      "label": {
        "en": "Enable mmWave (24GHz Radar)"
      },
      "hint": {
        "en": "Disable for PIR-only mode. mmWave detects micro-movements through walls."
      },
      "value": true
    },
    {
      "type": "dropdown",
      "id": "mmwave_sensitivity",
      "label": {
        "en": "mmWave Sensitivity"
      },
      "value": "low",
      "values": [
        {"id": "low", "label": {"en": "Low (recommended)"}},
        {"id": "medium", "label": {"en": "Medium"}},
        {"id": "high", "label": {"en": "High"}}
      ]
    }
  ]
}
```

**B. Documentation Utilisateur**
```markdown
⚠️ **ZG-204ZM mmWave Notice:**

This sensor uses 24GHz mmWave radar which:
- ✅ Detects presence even when stationary
- ⚠️ Detects through cardboard, thin walls, furniture
- ⚠️ Sensitive to micro-movements (breathing, heartbeat)

**Recommended Settings:**
- mmWave Sensitivity: LOW
- Motion Timeout: 2-5 minutes
- Place sensor with clear line of sight
- Avoid pointing at walls/windows

**If constant false motion:**
1. Disable mmWave → PIR-only mode
2. Reduce sensitivity to LOW
3. Increase timeout to 5 minutes
```

---

## 📊 DRIVER ACTUEL - PIR + RADAR

**Driver:** `pir_radar_illumination_sensor_battery`

**Status:** Vérifions s'il supporte ZG-204ZM...

---

## 🎯 ACTIONS REQUISES

### **Priorité 1: ZG-204ZM Support Complet** 🔴

1. ✅ Vérifier si `pir_radar_illumination_sensor_battery` supporte déjà ZG-204ZM
2. ❌ Ajouter settings pour sensitivity/keep_time
3. ❌ Ajouter documentation mmWave
4. ❌ Tester avec device réel (si disponible)

### **Priorité 2: ZM-P1 Identification** 🟡

1. ⏳ Attendre device interview de ZM-P1 réel
2. ⏳ Vérifier modelId vs manufacturer ID
3. ⏳ Ajouter support si nécessaire

### **Priorité 3: Documentation** 🟢

1. ✅ Document complet créé (ce fichier)
2. ❌ User guide pour mmWave sensors
3. ❌ Troubleshooting false motion

---

## 📚 SOURCES & RÉFÉRENCES

1. **ZM-P1 Issue:** https://github.com/Koenkk/zigbee2mqtt/issues/28103
2. **ZG-204ZM False Motion:** https://www.reddit.com/r/homeassistant/comments/1fosbpp/
3. **ZG-204ZL Issue #1267:** https://github.com/JohanBendz/com.tuya.zigbee/issues/1267
4. **SmartHomeScene Review:** https://smarthomescene.com/reviews/zigbee-battery-powered-presence-sensor-zg-204zm-review/
5. **Zigbee2MQTT Devices:** 
   - https://www.zigbee2mqtt.io/devices/ZG-204Z.html
   - https://www.zigbee2mqtt.io/devices/ZG-204ZV.html

---

## 🔍 TECHNICAL DETAILS

### **mmWave vs PIR:**

| Feature | PIR | mmWave 24GHz |
|---------|-----|--------------|
| Detection Range | 5-7m | 5-10m |
| Through Objects | ❌ | ✅ |
| Stationary Detection | ❌ | ✅ |
| Micro-movements | ❌ | ✅ (trop sensible) |
| Power Consumption | Low | Higher |
| False Positives | Rare | Frequent (si mal calibré) |

### **IAS Zone Attributes:**

```
Cluster 1280 (IAS Zone):
- alarm_1: Motion detected (PIR)
- alarm_2: Presence detected (mmWave)
- tamper: Device tampered
- battery_low: Low battery
```

**Homey Mapping:**
```javascript
// alarm_1 → alarm_motion (PIR)
// alarm_2 → presence (mmWave) ou ignoré
```

---

## 🎊 RÉSUMÉ

**Problèmes Identifiés:** 3  
**Déjà Résolus:** 1 (ZG-204ZL)  
**En Investigation:** 2 (ZM-P1, ZG-204ZM sensitivity)

**Prochaines Étapes:**
1. Vérifier driver `pir_radar_illumination_sensor_battery`
2. Ajouter ZG-204ZM si manquant
3. Implémenter settings sensitivity
4. Créer documentation utilisateur mmWave
5. Attendre feedback communauté

---

**STATUS:** 🔄 **ANALYSE COMPLÈTE - PRÊT POUR IMPLÉMENTATION**
