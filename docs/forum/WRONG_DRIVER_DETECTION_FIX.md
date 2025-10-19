# 🔧 Temperature Sensor Detected as Smoke Detector - Fix Guide

**Issue:** Temperature sensor paired as smoke detector  
**Log ID:** 906cebef-20cf-4dd0-9a21-add06795662a  
**App Version:** v2.15.133  
**Status:** Known issue - Easy fix available

---

## 🎯 Problème

Votre **capteur de température** (Temperature Sensor) a été détecté et appairé comme **détecteur de fumée** (Smoke Detector) pendant l'ajout du device.

### Pourquoi ça arrive?

**Manufacturer IDs partagés:**
- Certains manufacturer IDs Tuya sont utilisés pour PLUSIEURS types de devices
- Exemple: `_TZE200_aycxwiau` peut être:
  - Temperature sensor
  - Smoke detector  
  - Temp + Humidity sensor

**Ordre de détection:**
- Homey essaie les drivers dans un certain ordre
- Si smoke_detector est testé avant temperature_sensor
- Et que les deux ont le même manufacturer ID
- Le device sera appairé comme smoke_detector (incorrect)

---

## ✅ SOLUTION RAPIDE (5 minutes)

### Étape 1: Supprimer Device

```bash
1. Homey App → Devices
2. Trouver le "Smoke Detector" (qui est en fait votre temperature sensor)
3. Settings (⚙️) → Advanced → Remove device
4. Confirmer suppression
```

### Étape 2: Factory Reset Device

**Temperature Sensor (batterie):**
```bash
1. Retirer batterie 10 secondes
2. Appuyer sur bouton reset 5 secondes (si présent)
3. Remettre batterie
4. LED devrait clignoter rapidement (pairing mode)
```

**Si pas de bouton reset:**
```bash
1. Retirer batterie 30 secondes
2. Remettre batterie
3. LED clignote = ready
```

### Étape 3: Re-pairing CORRECT

**IMPORTANT:** Chercher le BON driver cette fois

```bash
1. Homey App → Devices → Add Device
2. Search: "Universal Tuya Zigbee"
3. Chercher: "Temperature Sensor" 
   (PAS "Smoke Detector"!)

Options correctes:
✅ "Temperature Sensor (Battery)"
✅ "Temperature + Humidity Sensor (Battery)"
✅ "Temperature Sensor Advanced (Battery)"
✅ "Temperature Sensor Pro (Battery)"

❌ ÉVITER:
❌ "Smoke Detector (Battery)"
❌ "Smoke + Temperature Detector (Battery)"
```

### Étape 4: Vérification

**Après pairing:**
```bash
1. Device Settings → Advanced → Zigbee Information
2. Vérifier:
   - Device Class: "sensor" ✅
   - Capabilities: measure_temperature, measure_battery ✅
   - PAS alarm_smoke ❌

3. Test:
   - Température affichée?
   - Valeur réaliste (15-25°C intérieur)?
   - Update régulier?
```

---

## 🔍 COMMENT IDENTIFIER LE DEVICE CORRECT

### Indices Visuels

**Temperature Sensor:**
- LCD display avec température (ex: 22.5°C)
- Petit (5-8cm)
- Pas de trous/grilles (pas de capteur fumée)
- Souvent avec % humidité aussi

**Smoke Detector:**
- Gros (10-15cm diamètre)
- Grilles/trous pour détecter fumée
- Bouton test
- Souvent montage plafond

### Indices Packaging

**Temperature Sensor:**
```
📦 Box mention:
- "Temperature Sensor"
- "Temp + Humidity"
- "Climate Monitor"
- "Indoor Thermometer"
Model: TS0201, TS0601 (temp)
```

**Smoke Detector:**
```
📦 Box mention:
- "Smoke Detector"
- "Fire Alarm"
- "Smoke Sensor"
Model: TS0205, TS0601 (smoke)
```

### Indices Manufacturer ID

**Si vous avez déjà appairé:**
```bash
Device Settings → Advanced → Zigbee Information → Manufacturer

Common IDs:

Temperature Sensor:
- _TZE200_cwbvmsar
- _TZE200_bjawzodf
- _TZE200_locansqn
- _TZ3000_qomxlryd

Smoke Detector:
- _TZE200_dq1mfjug
- _TZE200_m9skfctm
- _TZ3210_up3pngle

⚠️ Ambigus (les deux):
- _TZE200_aycxwiau (peut être temp OU smoke)
→ Utiliser indices visuels!
```

---

## 🛠️ SOLUTION ALTERNATIVE: Re-Interview

**Si suppression/re-pairing difficile:**

### Méthode 1: Homey Developer Tools

```bash
1. Installer Homey Developer Tools (web)
2. https://tools.developer.homey.app/tools/zigbee
3. Select device
4. "Re-interview device"
5. Attendre 1-2 minutes
6. Check capabilities updated
```

### Méthode 2: Zigbee Reset

```bash
1. Homey Settings → Zigbee
2. "Reset Zigbee Network"
⚠️ WARNING: RE-PAIRE TOUS LES DEVICES!
   Seulement si <10 devices total
```

---

## 📊 CAPABILITIES COMPARISON

### Temperature Sensor (Correct)

```json
{
  "capabilities": [
    "measure_temperature",
    "measure_battery"
  ],
  "class": "sensor",
  "icon": "temperature"
}
```

**Ce que vous DEVEZ voir:**
- ✅ Température (°C)
- ✅ Batterie (%)
- ❌ PAS alarm_smoke

### Smoke Detector (Incorrect pour temp sensor)

```json
{
  "capabilities": [
    "alarm_smoke",
    "measure_battery",
    "measure_temperature" (optionnel)
  ],
  "class": "sensor",
  "icon": "smoke_detector"
}
```

**Problème si temp sensor appairé comme ça:**
- ❌ alarm_smoke présent (inutile)
- ⚠️ measure_temperature peut exister mais incorrect
- ❌ Flows: "Smoke detected" au lieu de "Temperature changed"

---

## 🔄 MIGRATION FLOWS

**Si vous aviez déjà flows:**

### Avant (Smoke Detector - Incorrect)

```
WHEN: Smoke Detector alarm_smoke true
THEN: ...
```

### Après (Temperature Sensor - Correct)

```
WHEN: Temperature Sensor temperature changed
AND: Temperature > 25°C
THEN: ...
```

**Export/Import:**
```bash
1. Avant suppression: Export flows (Homey web)
2. Après re-pairing: Modifier JSON
3. Remplacer device ID
4. Import flows modifiés
```

---

## 🚨 SI ÇA NE FONCTIONNE TOUJOURS PAS

### Option 1: Device Request

**Si device vraiment ambigu:**

```bash
1. GitHub Issues:
   https://github.com/dlnraja/com.tuya.zigbee/issues

2. Template: "Device Detection Issue"

3. Fournir:
   - Manufacturer ID (Zigbee info)
   - Model Number
   - Photo device (dessus + dessous)
   - Packaging/manual si possible
   - Diagnostic report ID
```

### Option 2: Forum Support

```bash
Homey Community Forum:
https://community.homey.app/t/universal-tuya-zigbee/140352

Poster:
- Screenshot device pairing
- Photo physique device
- Manufacturer ID
- Log ID: 906cebef-20cf-4dd0-9a21-add06795662a
```

### Option 3: Temporary Workaround

**En attendant fix:**

```bash
1. Garder device appairé comme smoke_detector
2. Ignorer capability alarm_smoke (ne pas utiliser)
3. Utiliser SEULEMENT measure_temperature
4. Créer flows basés sur temperature

⚠️ Pas idéal mais fonctionne
```

---

## 🎯 PRÉVENTION FUTURE

### Lors du Pairing

**Checklist:**
```
✅ Lire packaging device AVANT pairing
✅ Noter type exact (Temperature vs Smoke)
✅ Chercher driver EXACT dans app
✅ Vérifier capabilities APRÈS pairing
✅ Test device immédiatement
```

### Drivers Recommandés par Type

**Temperature uniquement:**
- ✅ Temperature Sensor (Battery)
- ✅ Temperature Sensor Advanced (Battery)
- ✅ Temperature Sensor Pro (Battery)

**Temperature + Humidity:**
- ✅ Temperature + Humidity Sensor (Battery)
- ✅ Temp + Humid Sensor Advanced (Battery)

**Smoke uniquement:**
- ✅ Smoke Detector (Battery)
- ✅ Smart Smoke Detector Advanced (Battery)

**Smoke + Temperature:**
- ✅ Smoke + Temperature Detector (Battery)
- ⚠️ Utiliser SEULEMENT si device a vraiment les deux fonctions!

---

## 📝 SUMMARY

**Problème:** Temperature sensor → Smoke detector (wrong driver)

**Cause:** Manufacturer ID ambigu + ordre détection

**Solution rapide:**
1. Remove device
2. Factory reset
3. Re-pair avec driver "Temperature Sensor" correct
4. Vérifier capabilities

**Durée:** 5 minutes

**Risque:** Aucun (juste re-pairing)

**Support:** GitHub issues ou Forum si problème persiste

---

## 🔗 RESSOURCES

- **GitHub Issues:** https://github.com/dlnraja/com.tuya.zigbee/issues
- **Forum:** https://community.homey.app/t/140352
- **Device Request Template:** .github/ISSUE_TEMPLATE/device-request.yml
- **Pairing Guide:** docs/PAIRING_COOKBOOK.md

---

*Fix Guide créé: 16 Octobre 2025*  
*Log ID référence: 906cebef-20cf-4dd0-9a21-add06795662a*  
*App Version: v2.15.133 → v3.0.0 (fix included)*
