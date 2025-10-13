# 🔍 HOBEIAN ZG-204Z - ANALYSE COMPLÈTE & RÉSOLUTION

**Date:** 2025-10-13 10:15  
**Device:** HOBEIAN ZG-204Z (PIR Motion Sensor)  
**Status:** 🔄 **INVESTIGATION EN COURS**

---

## 📊 INFORMATIONS PRODUIT

### **HOBEIAN ZG-204Z - Famille de Capteurs**

**Variantes Connues:**
- **ZG-204Z** - PIR Motion Sensor (basique)
- **ZG-204ZL** - PIR + Illuminance Sensor
- **ZG-204ZV** - PIR + Temp + Humidity + Illuminance (Multi-Sensor)
- **ZG-204ZM** - PIR + mmWave Radar (Presence Sensor)

---

## 🔍 ZIGBEE2MQTT SPECIFICATIONS

### **ZG-204Z (Basic PIR)**

**Capabilities:**
- ✅ `occupancy` (binary) - Motion detection
- ✅ `battery` (numeric, %) - Battery level
- ✅ `voltage` (numeric, mV) - Battery voltage
- ✅ `sensitivity` (enum: low, medium, high) - PIR sensitivity
- ✅ `keep_time` (enum: 30, 60, 120 seconds) - Motion timeout
- ✅ `battery_low` (binary) - Low battery indicator

**Technical Details:**
- **Manufacturer:** HOBEIAN
- **Communication:** Telink TLSR8258 chip (not standard Tuya)
- **Power:** Battery powered (typically CR2450 or AAA)
- **Protocol:** Zigbee 3.0
- **Clusters:** Standard IAS Zone (1280) for motion detection

---

## 🔎 ÉTAT ACTUEL DANS L'APP

### **Driver Assignation Check:**

#### 1. **motion_sensor_illuminance_battery**
```json
{
  "capabilities": ["alarm_motion", "measure_luminance", "measure_battery"],
  "manufacturerName": [
    "_TZ3000_mmtwjmaq",
    "_TZ3000_kmh5qpmb",
    "LUMI",
    "Signify Netherlands B.V.",
    "IKEA of Sweden"
  ],
  "productId": ["TS0202", "RTCGQ11LM", "SML001", "E2494"]
}
```
**Status:** ❌ **HOBEIAN pas listé**

#### 2. **motion_temp_humidity_illumination_multi_battery**
```json
{
  "capabilities": [
    "alarm_motion", 
    "measure_battery",
    "measure_luminance", 
    "measure_temperature", 
    "measure_humidity"
  ],
  "manufacturerName": ["HOBEIAN", ...],
  "productId": ["TS0601", "ZG-204ZV", "ZG-204ZL"]
}
```
**Status:** ✅ **HOBEIAN listé (ZG-204ZV, ZG-204ZL)**  
**Problème:** ZG-204Z (basique) **MANQUANT**

---

## 🚨 PROBLÈME IDENTIFIÉ

### **Issue pour ZG-204Z (Basic PIR):**

**Symptômes:**
1. ❌ ZG-204Z (basique) ne peut pas être pairé
2. ❌ Pas de driver dédié pour PIR simple HOBEIAN
3. ❌ productId "ZG-204Z" absent de tous les drivers

**Cause Racine:**
- Les drivers existants supportent ZG-204ZV et ZG-204ZL
- **Mais ZG-204Z basique n'est pas supporté**
- HOBEIAN manufacturer name est dans multi-sensor driver
- Mais ZG-204Z n'a que motion + battery (pas temp/humidity)

---

## ✅ SOLUTIONS PROPOSÉES

### **Option 1: Ajouter ZG-204Z au Driver PIR Basique** ⭐ **RECOMMANDÉ**

**Driver:** `motion_sensor_pir_battery`

**Modifications Nécessaires:**
```json
{
  "manufacturerName": [
    ... (existing),
    "HOBEIAN"  // ← AJOUTER
  ],
  "productId": [
    ... (existing),
    "ZG-204Z"  // ← AJOUTER
  ]
}
```

**Avantages:**
- ✅ Minimal changes
- ✅ Correspond aux capabilities (motion + battery only)
- ✅ Driver PIR déjà testé et stable

---

### **Option 2: Créer Driver Dédié HOBEIAN**

**Nouveau Driver:** `motion_sensor_hobeian_battery`

**Configuration:**
```json
{
  "name": {
    "en": "HOBEIAN Motion Sensor (PIR, Battery)"
  },
  "class": "sensor",
  "capabilities": [
    "alarm_motion",
    "measure_battery"
  ],
  "zigbee": {
    "manufacturerName": ["HOBEIAN"],
    "productId": ["ZG-204Z"],
    "endpoints": {
      "1": {
        "clusters": [0, 1, 3, 1280],
        "bindings": [1, 1280]
      }
    }
  },
  "energy": {
    "batteries": ["CR2450"]
  }
}
```

**Avantages:**
- ✅ Support spécifique HOBEIAN
- ✅ Settings personnalisés (sensitivity, keep_time)
- ✅ Pas d'interférence avec autres drivers

**Inconvénients:**
- ❌ Plus de maintenance
- ❌ Duplication de code

---

## 🔧 RECOMMANDATION FINALE

### **SOLUTION: Option 1 - Enrichir Driver Existant**

**Action:**
1. Modifier `drivers/motion_sensor_pir_battery/driver.compose.json`
2. Ajouter HOBEIAN manufacturer name
3. Ajouter ZG-204Z product ID
4. Tester avec device réel

---

## 📝 DÉTAILS TECHNIQUES SUPPLÉMENTAIRES

### **Clusters Attendus (ZG-204Z):**

Basé sur Zigbee2MQTT et ZHA:
```
Endpoint 1:
- Cluster 0 (Basic)
- Cluster 1 (Power Configuration)
- Cluster 3 (Identify)
- Cluster 1280 (IAS Zone) - Motion detection
```

### **Différence avec ZG-204ZV:**

| Feature | ZG-204Z | ZG-204ZV |
|---------|---------|----------|
| Motion | ✅ | ✅ |
| Battery | ✅ | ✅ |
| Illuminance | ❌ | ✅ |
| Temperature | ❌ | ✅ |
| Humidity | ❌ | ✅ |
| Clusters | 0,1,3,1280 | 0,1,3,1024,1026,1029,1280 |
| Product ID | ZG-204Z | ZG-204ZV |

---

## 🎯 PROCHAINES ÉTAPES

1. **Enrichir `motion_sensor_pir_battery` driver**
2. **Ajouter HOBEIAN + ZG-204Z**
3. **Valider avec Homey CLI**
4. **Tester avec device réel (si disponible)**
5. **Déployer v2.15.65**

---

## 📊 COMPATIBILITÉ ESTIMÉE

**Après Fix:**
- ✅ ZG-204Z (PIR basique)
- ✅ ZG-204ZL (PIR + Lux) - déjà supporté
- ✅ ZG-204ZV (Multi-Sensor) - déjà supporté
- ⚠️ ZG-204ZM (mmWave) - nécessite investigation séparée

---

## 🔗 SOURCES

1. **Zigbee2MQTT:** https://www.zigbee2mqtt.io/devices/ZG-204Z.html
2. **ZHA Device Handlers:** https://github.com/zigpy/zha-device-handlers/issues/4184
3. **Home Assistant Community:** Multiple forum threads
4. **SmartHomeScene Review:** Technical specifications

---

**STATUS:** 🔄 **READY FOR IMPLEMENTATION**
