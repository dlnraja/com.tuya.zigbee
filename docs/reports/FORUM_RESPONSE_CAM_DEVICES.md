# 📋 RÉPONSE FORUM - Cam Unknown Zigbee Devices

**Date:** 12 Octobre 2025 03:45  
**Utilisateur:** Cam  
**Problème:** Button et PIR motion sensor avec lux = "unknown zigbee device"  
**Version utilisée:** v2.7.1 (ancienne!)

---

## 🎯 PROBLÈME IDENTIFIÉ

### Version Obsolète
```
Version Cam:      v2.7.1 (5 mois d'ancienneté!)
Version actuelle: v2.11.3 (publiée aujourd'hui)
Différence:       4 versions majeures
```

**Problème principal:** v2.7.1 ne contient pas les derniers drivers et corrections!

---

## ✅ SOLUTION IMMÉDIATE

### Étape 1: Mettre à Jour l'App

```markdown
1. Ouvrir Homey App
2. Settings → Apps → Universal Tuya Zigbee
3. Click "Update" si disponible
4. OU: Supprimer app → Réinstaller v2.11.3
5. Redémarrer Homey
```

**Pourquoi?**
- v2.11.3 contient **167 drivers** vs ~80 dans v2.7.1
- Support pour 1500+ devices vs ~500
- Corrections bugs critiques
- Support HOBEIAN, devices blancs, etc.

---

## 🔍 INFORMATIONS NÉCESSAIRES

Pour ajouter support spécifique à tes devices, j'ai besoin de:

### 1. **Zigbee Interview**

**Comment faire:**
```bash
# Via Homey Developer Tools
1. Aller sur: https://developer.athom.com/tools/zigbee
2. Se connecter avec ton Homey
3. Sélectionner le device
4. Click "Interview device"
5. Copier le JSON complet
```

**Ou via Homey CLI:**
```bash
homey app run
# Puis pairer le device et voir logs
```

### 2. **Manufacturer Name & Product ID**

Dans les settings du device, chercher:
```
manufacturerName: "_TZ3000_xxxxxxxx" ou "BRAND_NAME"
productId: "TS0203" ou "MODEL-123"
modelId: "ZG-204ZV" (si présent)
```

### 3. **Screenshot Device Settings**

Je vois que tu as envoyé un screenshot - parfait! Mais j'ai besoin de:
- Settings page du device (pas juste la liste)
- Capabilities attendues (motion? lux? battery?)
- Marque du device

---

## 📸 ANALYSE SCREENSHOT

D'après ton screenshot (Screenshot 2025-10-12 at 12.12.52 pm):

**Ce que je vois:**
- Devices listés avec "unknown zigbee device"
- Probablement devices white-label (sans marque)
- App Store version: v2.7.1

**Ce qu'il faut faire:**
1. **UPDATE vers v2.11.3 IMMÉDIATEMENT**
2. Après update, re-pairer les devices
3. Si toujours "unknown", envoyer interview

---

## 🎯 DRIVERS DISPONIBLES v2.11.3

### Button Devices (Scenes)
```
✅ scene_switch_1_gang_battery
✅ scene_switch_2_gang_battery
✅ scene_switch_3_gang_battery
✅ scene_switch_4_gang_battery
✅ scene_switch_6_gang_battery
✅ smart_knob_battery
```

### PIR Motion + Lux Sensors
```
✅ motion_illumination_battery
✅ motion_temp_humidity_illumination_multi_battery
✅ pir_radar_illumination_sensor_battery
✅ motion_sensor_battery (simple)
```

**Total:** 15+ drivers pour buttons et 20+ pour motion sensors!

---

## 📋 CHECKLIST TROUBLESHOOTING

### Avant de demander support:

- [ ] **Mettre à jour app vers v2.11.3**
- [ ] **Redémarrer Homey**
- [ ] **Supprimer devices "unknown"**
- [ ] **Re-pairer devices après update**
- [ ] Si toujours problème → Interview Zigbee

### Pour ajouter nouveau device:

- [ ] **Manufacturer name** (de l'interview)
- [ ] **Product ID / Model ID**
- [ ] **Capabilities attendues** (motion, lux, battery, etc.)
- [ ] **Photo/lien device** (pour identifier type)
- [ ] **Interview Zigbee complet** (JSON)

---

## 💡 DEVICES WHITE-LABEL COMMON

### Si ton device ressemble à:

**Button 1-4 gang wireless:**
```
Compatible avec:
- TS004F (Tuya 4-gang)
- _TZ3000_xabckq1v
- _TZ3000_bi6lpsew
- _TZ3000_4fjiwweb
```

**PIR Motion + Lux:**
```
Compatible avec:
- TS0202 (Tuya PIR)
- _TZ3000_mmtwjmaq
- _TZ3000_kmh5qpmb
- IAS Zone + Illuminance
```

---

## 🔧 RÉPONSE FORUM SUGGÉRÉE

```markdown
Hi Cam! 👋

Thanks for testing! I see you're on **v2.7.1** which is quite outdated.

**Quick fix:**
1. **Update to v2.11.3** (just published today!)
   - Settings → Apps → Universal Tuya Zigbee → Update
2. **Restart Homey**
3. **Remove** the "unknown zigbee device" pairings
4. **Re-pair** your devices after update

**What changed:**
- v2.11.3 has **167 drivers** (vs ~80 in v2.7.1)
- Added support for 1500+ devices
- Fixed many pairing issues
- Better white-label device recognition

**If still "unknown" after update:**

Please provide:
1. **Manufacturer name** (from device settings)
2. **Model/Product ID**
3. **Zigbee interview** (via https://developer.athom.com/tools/zigbee)
4. **What capabilities** should the device have? (motion, lux, battery, button presses, etc.)

**For your devices:**
- **Button:** Likely TS004F or similar → Should work after update
- **PIR + Lux:** Likely TS0202 or _TZ3000_mmtwjmaq → Should work after update

The app now has 15+ button drivers and 20+ motion sensor drivers, so yours should be recognized!

Let me know after you update, and if needed, I'll add specific support for your exact models.

Best regards,
Dylan

P.S. I see your GitHub issues #1268 - I'll prioritize those too! 🚀
```

---

## 🎯 ACTIONS À PRENDRE

### Court terme (v2.11.3 - FAIT)
- [x] Support HOBEIAN ZG-204ZV
- [x] Settings page fix
- [x] Images uniques
- [ ] Attendre feedback Cam après update

### Si toujours problème (v2.11.4)
- [ ] Analyser interview devices Cam
- [ ] Créer drivers spécifiques si nécessaire
- [ ] Ajouter manufacturer IDs manquants
- [ ] Tester avec devices similaires

---

## 📊 COMPARAISON VERSIONS

```
v2.7.1 (Cam's version):
├─ Drivers: ~80
├─ Devices: ~500
├─ Last update: Mai 2025
└─ Missing: Recent fixes

v2.11.3 (Current):
├─ Drivers: 167 (+108%)
├─ Devices: 1500+ (+200%)
├─ Last update: Octobre 2025
├─ Fixes: Battery, settings, HOBEIAN
└─ Images: Uniques et distinctes
```

---

## ✅ POURQUOI UPDATE RÉSOUT SOUVENT

### Nouveaux Drivers Ajoutés
Entre v2.7.1 et v2.11.3, on a ajouté:
- 87 nouveaux drivers
- 1000+ nouveaux manufacturer IDs
- Support devices blancs
- Corrections endpoints
- Meilleure reconnaissance auto

### Bugs Fixes Inclus
- Battery "56 years ago" → FIXÉ
- Settings page timeout → FIXÉ
- Gas sensor confusion → FIXÉ
- Images identiques → FIXÉ
- Cluster IDs incorrects → FIXÉ

---

## 🔗 LIENS UTILES

**App Store:**
https://homey.app/a/com.dlnraja.tuya.zigbee/

**Developer Tools:**
https://developer.athom.com/tools/zigbee

**GitHub Issues:**
https://github.com/dlnraja/com.tuya.zigbee/issues

**Forum Thread:**
https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352

---

## 💬 TEMPLATE RÉPONSE CAM

**Si devices fonctionnent après update:**
```
Great news! After updating to v2.11.3, your devices are now recognized correctly. 
The button is: [driver name]
The PIR sensor is: [driver name]
Everything working as expected!
```

**Si toujours problème:**
```
After update to v2.11.3, devices still showing as "unknown".
Here's the Zigbee interview:
[JSON interview]

Device info:
- Manufacturer: [name]
- Model: [model]
- Expected capabilities: motion detection, lux sensor, battery

Can you add specific support for these?
```

---

**Status:** ✅ **RÉPONSE PRÊTE** - Attente feedback Cam après update v2.11.3
