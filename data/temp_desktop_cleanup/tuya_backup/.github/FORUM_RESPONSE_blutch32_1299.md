# Forum Response - blutch32 Post #1299

## 📋 Copier/Coller pour le Forum

---

@blutch32

Merci pour les interviews détaillées ! Voici mon analyse :

### 1️⃣ Contact Sensor `_TZ3000_996rpfy6` (TS0203) - "alarm always no"

**Analyse de l'interview :**
```
iasZone: {}  ← VIDE! C'est le problème!
```

Le cluster IAS Zone n'est pas correctement enrollé. C'est pour ça que `alarm_contact` reste toujours "no".

**Fix dans v5.6.0 :**
- ✅ Fingerprint déjà ajouté à la liste `invertedByDefault`
- ✅ Le capteur devrait fonctionner après re-pairing

**Action requise :**
1. **Supprimer** le capteur de Homey
2. **Redémarrer** l'app Universal Tuya Zigbee
3. **Re-pairer** le capteur en appuyant sur le bouton reset

**Si toujours "no" après re-pairing :**
- Va dans les paramètres du device
- Active "Invert contact state" (Inverser l'état du contact)

---

### 2️⃣ Soil Sensor `HOBEIAN ZG-303Z` - ✅ Fonctionne !

Tu as confirmé que ça fonctionne maintenant. 

**Note :** Ce n'est PAS un contact sensor, c'est un capteur de sol/climat avec :
- 🌡️ Temperature (cluster 1026)
- 💧 Humidity (cluster 1029) 
- 🔋 Battery (cluster 1)
- 📡 Tuya DP (cluster 61184)

---

### 3️⃣ Energy Meter `_TZE284_81yrt3lo` (TS0601) - "detected as unknown"

**Analyse :**
- Type: Router (mains powered)
- Clusters: [4, 5, 61184, 0, 60672]
- C'est un **compteur d'énergie 2 canaux CT** (pince ampèremétrique)

**Fix dans v5.6.0 :**
- ✅ Fingerprint déjà ajouté au driver `power_clamp_meter`

**Action requise :**
1. **Supprimer** le device de Homey
2. **Redémarrer** l'app Universal Tuya Zigbee  
3. **Re-pairer** le device

Il devrait maintenant apparaître comme "Power Clamp Meter" avec les capabilities :
- `measure_power` (W)
- `meter_power` (kWh)
- `measure_voltage` (V)
- `measure_current` (A)

---

### 📊 Résumé

| Device | Fingerprint | Status | Action |
|--------|-------------|--------|--------|
| Contact Sensor | `_TZ3000_996rpfy6` | ⚠️ IAS non enrollé | Re-pairer |
| Soil Sensor | `HOBEIAN ZG-303Z` | ✅ OK | - |
| Energy Meter | `_TZE284_81yrt3lo` | ⚠️ Mauvais driver | Re-pairer |

**Important :** Après mise à jour vers v5.6.0, tu dois **re-pairer** les devices qui étaient en "unknown" pour qu'ils soient reconnus par le bon driver.

Dis-moi si ça fonctionne après le re-pairing ! 🙏

---
