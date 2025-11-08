# 🧪 TEST DU FIX SOIL & PIR SENSORS

## ✅ Modifications appliquées

### 1. `lib/utils/tuya-dp-parser.js` - CRÉÉ
- Parser complet pour cluster 0xEF00
- Décodage des frames Tuya DP
- Support tous les types: BOOL, VALUE, STRING, ENUM, RAW

### 2. `lib/tuya/TuyaEF00Manager.js` - MODIFIÉ
**Ajouté:**
- ✅ Listener `dataReport` (ligne 197-202)
- ✅ Listener `response` (ligne 206-211)
- ✅ Request automatique des DPs critiques au démarrage (ligne 77-97):
  - DP 1, 2, 3, 5 (Soil sensor)
  - DP 9, 101, 102 (PIR sensor)
  - DP 4, 14, 15 (Battery)
- ✅ Mappings DP améliorés (ligne 432-456):
  - DP 5 → `measure_humidity` (SOIL MOISTURE! ⭐)
  - DP 9 → `target_distance` (PIR distance)
  - DP 15 → `measure_battery` (Battery %)
- ✅ Auto-ajout des capabilities manquantes (ligne 467-474)
- ✅ Logs détaillés avec émojis

---

## 🧪 TESTS À FAIRE

### **Test 1: Vérifier les logs au démarrage**

**Redémarre l'app Homey** et cherche dans les logs:

```
[TUYA] ✅ EF00 cluster detected
[TUYA] 🎧 Setting up datapoint listeners...
[TUYA] ✅ dataReport listener registered
[TUYA] ✅ response listener registered
[TUYA] 🔍 Requesting critical DPs at startup...
[TUYA] ✅ DP 5 query sent via dataQuery
[TUYA] ✅ Critical DPs requested
```

✅ **Si tu vois ces logs** → Listeners activés!

---

### **Test 2: Soil Sensor - Attendre les données**

**Attends 10 secondes** après le démarrage, cherche:

```
[TUYA] 📦 dataReport received! {...}
[TUYA] DP 5 = 45
[TUYA] ✅ measure_humidity = 4.5 (DP 5)
```

✅ **Si tu vois `DP 5`** → Soil moisture reçue!
✅ **Si tu vois `measure_humidity`** → Capability mise à jour!

**Ouvre la carte device dans Homey UI:**
- Tu dois voir **Humidity: XX%** (moisture du sol)
- Tu dois voir **Temperature: XX°C**

---

### **Test 3: PIR Sensor - Bouger devant le capteur**

**Bouge devant le PIR**, cherche:

```
[TUYA] 📦 dataReport received! {...}
[TUYA] DP 1 = true
[TUYA] ✅ alarm_motion = true (DP 1)
```

OU

```
[TUYA] DP 9 = 120
[TUYA] ✅ target_distance = 1.2 (DP 9)
```

✅ **Si tu vois `DP 1` ou `DP 9`** → PIR envoie des données!

---

### **Test 4: Battery - Vérifier la batterie**

Cherche:

```
[TUYA] DP 15 = 100
[TUYA] ✅ measure_battery = 100 (DP 15)
```

OU

```
[TUYA] DP 4 = 95
[TUYA] ✅ measure_battery = 95 (DP 4)
```

✅ **Si tu vois `measure_battery`** → Batterie lue!

---

## ❌ SI AUCUNE DONNÉE NE REMONTE

### **Cas 1: Pas de listener registered**
Si tu ne vois PAS `✅ dataReport listener registered`:
```javascript
// Le cluster 0xEF00 n'est pas trouvé
// Vérifie le nom du cluster dans les logs
```

**Action:** Cherche dans les logs:
```
[TUYA] ℹ️ Available clusters: ...
```

Copie-moi la liste des clusters disponibles!

---

### **Cas 2: Pas de dataReport reçu**
Si tu vois les listeners mais PAS de `📦 dataReport received`:

**Action 1:** Force un refresh manuel
```javascript
// Dans les Settings du device, ajoute un bouton "Refresh"
// Ou utilise Developer Tools → Refresh device
```

**Action 2:** Vérifie que le device est réveillé
- Les devices battery dorment! 
- Appuie sur un bouton physique pour réveiller
- Ou attends 5-10 minutes (cycle de wake-up)

---

### **Cas 3: dataReport reçu mais pas parsé**
Si tu vois `📦 dataReport` mais PAS de `DP X =`:

**Action:** Copie-moi le contenu exact de `dataReport received! {...}`

---

## 🔍 LOGS À ME COPIER

Si ça ne marche toujours pas, copie-moi:

1. **Les 50 premières lignes des logs après redémarrage de l'app**
2. **La ligne `Available clusters:`**
3. **Les logs après avoir bougé devant le PIR ou touché le soil sensor**

---

## ✅ RÉSULTATS ATTENDUS

### **Soil Sensor:**
- DP 5 → Humidity (soil moisture)
- DP 3 → Temperature (soil temp)
- DP 15 → Battery %

### **PIR Sensor:**
- DP 1 → Motion (bool)
- DP 9 → Distance (meters)
- DP 15 → Battery %

---

## 🚀 PROCHAINES ÉTAPES SI ÇA MARCHE

1. ✅ Commit les fichiers modifiés
2. ✅ Tester avec TOUS les soil/PIR sensors
3. ✅ Passer au Fix #2 (Zigbee retry)
4. ✅ Publish v4.9.321

---

## 📝 NOTES IMPORTANTES

- Les devices **Tuya DP (TS0601)** N'utilisent PAS les clusters Zigbee standard
- TOUT passe par le cluster **0xEF00** (manuSpecificTuya)
- Les données arrivent via **dataReport** command
- Les DPs doivent être **requestés** activement (pas de reporting auto)

**⏱️ Délai normal:** 3-10 secondes après le wake-up du device
