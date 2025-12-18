# 📋 ZCL TIME CLUSTER - LOGS ZIGBEE ATTENDUS

## 🎯 **OBJECTIF**
Patterns de logs attendus pour valider que la synchronisation **ZCL Time Cluster 0x000A** fonctionne correctement sur les devices **TS0601 _TZE284_vvmbj46n** avec RTC + LCD.

---

## ✅ **LOGS DE SUCCÈS - DÉTECTION RTC**

### 🔍 **Détection outCluster 0x000A**
```
[RtcDetect] outClusters: [25, 10, 61184] → RTC: true
[RtcDetect] ✅ RTC confirmed via outCluster 0x000A
[CLIMATE] 🔍 RTC Detection: {"hasRtc":true,"method":"outCluster","confidence":"high"}
[CLIMATE] 🔥 RTC DEVICE DETECTED - Setting up ZCL Time Cluster sync
```

### 🔗 **Binding Time Cluster**
```
[ZigbeeTime] Binding Time cluster...
[ZigbeeTime] ✅ Time cluster bound
```

### ⏰ **Sync ZCL Time réussie**
```
[ZigbeeTime] Unix: 1734538800 → Zigbee: 787854000 (delta: 946684800)
[ZigbeeTime] Writing time=787854000, status=1
[ZigbeeTime] ✅ Time attributes written successfully
[ZigbeeTime] ✅ Sync successful on attempt 1
[CLIMATE] ✅ Initial ZCL Time sync successful - LCD should show correct time!
```

### 📖 **Read-back validation (optionnel)**
```
[ZigbeeTime] 📖 Read-back: time=787854000, status=1
```

---

## ⚠️ **LOGS D'ERREUR - DIAGNOSTIC**

### ❌ **Device sans RTC**
```
[RtcDetect] outClusters: [0, 1, 1026, 1029, 61184] → RTC: false
[RtcDetect] ❌ No Time outCluster (found: [0,1,1026,1029,61184])
[CLIMATE] 🔍 RTC Detection: {"hasRtc":false,"method":"none","confidence":"high"}
```

### ❌ **Cluster Time non accessible**
```
[ZigbeeTime] ❌ All 3 attempts failed
[CLIMATE] ⚠️ Initial sync failed: max_retries
```

### ⏳ **Throttle (normal)**
```
[ZigbeeTime] Sync throttled (< 24h depuis dernière sync)
[CLIMATE] Daily sync result: throttled
```

---

## 🧪 **LOGS DEBUG MODE**

### 🔬 **Test toutes les méthodes**
```
[CLIMATE] 🧪 ZCL DEBUG MODE: Testing all Time cluster methods...
[ZigbeeTime] 🧪 DEBUG MODE: Testing all sync methods...
[ZigbeeTime] Testing: time_only...
[ZigbeeTime] ✅ time_only successful
[ZigbeeTime] Testing: time_status...
[ZigbeeTime] ✅ time_status successful
[ZigbeeTime] Testing: time_zone...
[ZigbeeTime] ❌ time_zone failed: UNSUPPORTED_ATTRIBUTE
[ZigbeeTime] 🧪 Debug results: [
  {"method":"time_only","success":true},
  {"method":"time_status","success":true},
  {"method":"time_zone","success":false,"error":"UNSUPPORTED_ATTRIBUTE"}
]
```

---

## 🔔 **LOGS WAKE-UP (onEndDeviceAnnounce)**

### ✅ **RTC device wake + sync**
```
[CLIMATE] 🔔 Device announced (wake from sleep)
[CLIMATE] 🕐 RTC device wake - triggering ZCL Time sync...
[ZigbeeTime] Unix: 1734538850 → Zigbee: 787854050 (delta: 946684800)
[CLIMATE] ✅ Wake-up ZCL Time sync successful
```

### ⏳ **Wake-up throttlé (normal)**
```
[CLIMATE] 🔔 Device announced (wake from sleep)
[CLIMATE] 🕐 RTC device wake - triggering ZCL Time sync...
[ZigbeeTime] Sync throttled (< 24h depuis dernière sync)
```

---

## 📊 **PATTERNS DE VALIDATION**

| Pattern | Signification | Action |
|---------|---------------|--------|
| `outCluster.*10` | Device a RTC | ✅ Continuer avec ZCL |
| `outCluster.*0x000A` | Device a RTC | ✅ Continuer avec ZCL |
| `time=787854XXX` | Epoch 2000 correct | ✅ LCD affichera bonne heure |
| `time=1734538XXX` | Epoch 1970 (ERREUR) | ❌ LCD affichera 1970 |
| `status=1` | Master + Sync | ✅ Device accepte l'heure |
| `UNSUPPORTED_ATTRIBUTE` | Attribut pas supporté | ⚠️ Normal, continuer |
| `throttled` | < 24h depuis sync | ✅ Protection batterie OK |

---

## 🔍 **CONVERSION EPOCHS**

### **Formule Zigbee Time**
```
Zigbee Time = Unix Timestamp - 946684800
```

### **Exemples**
| Unix | Zigbee | Date |
|------|--------|------|
| 1734538800 | 787854000 | 2024-12-18 16:00 |
| 1735344000 | 788659200 | 2024-12-27 16:00 |
| 1609459200 | 662774400 | 2021-01-01 00:00 |

---

## 🚨 **TROUBLESHOOTING**

### **LCD affiche mauvaise date**
1. Vérifier epoch dans logs : `time=1734538XXX` = ERREUR
2. Device utilise Unix 1970 au lieu de Zigbee 2000
3. Bug code → vérifier `ZIGBEE_EPOCH_OFFSET = 946684800`

### **Pas de sync du tout**
1. Vérifier `outCluster` contient `10` ou `0x000A`
2. Si absent → device n'a pas de RTC
3. Utiliser fallback EF00 si nécessaire

### **Sync fails constant**
1. Device en deep sleep
2. Attendre wake-up naturel
3. Vérifier endpoint 1 accessible

---

## 🎯 **VALIDATION FINALE**

**✅ SUCCÈS** si logs contiennent :
1. `RTC confirmed via outCluster`
2. `Time cluster bound`
3. `time=787854XXX` (Zigbee epoch)
4. `Sync successful`
5. LCD affiche heure correcte

**❌ ÉCHEC** si :
1. `No Time outCluster`
2. `max_retries`
3. `time=1734538XXX` (Unix epoch)
4. LCD affiche 1970 ou freeze
