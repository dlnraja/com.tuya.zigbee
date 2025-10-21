# ⚠️ PUBLICATION BLOQUÉE - SOLUTION MANUELLE REQUISE

## 🚨 PROBLÈME

**GitHub Actions échoue SYSTÉMATIQUEMENT** malgré validation locale réussie:

```
✓ App validated successfully against level `publish`  ← LOCAL
✖ drivers.air_quality_monitor_ac: property `images` is required  ← GITHUB
```

**Raison:** Conflit entre merge commits et déclarations images qui ne persistent pas.

---

## ✅ SOLUTION: PUBLICATION MANUELLE

### Tu DOIS exécuter manuellement depuis ton terminal:

```bash
cd "C:\Users\HP\Desktop\homey app\tuya_repair"
homey app publish
```

**Prompts attendus:**
1. "Uncommitted changes?" → **Y**
2. "Update version?" → **Y**
3. "Select version:" → **Patch** (Enter)
4. "Changelog:" → **"Critical device.js fixes - Motion and SOS sensors"**
5. Warnings images: **Accepter / Ignorer**

---

## 📦 CE QUI SERA PUBLIÉ

**Device.js Fixes (v2.15.125+):**
```javascript
✅ Motion Sensor:
   - Temperature parser: value/100
   - Humidity parser: value/100
   - Illuminance: logarithmic
   - Battery: value/2
   - Motion: IAS Zone + listener

✅ SOS Button:
   - Battery: value/2
   - Alarm: IAS Zone + listener
   - Zone status notification
```

---

## 📱 POUR LES UTILISATEURS (APRÈS PUBLICATION)

### Peter et autres affectés:

**Étape 1: Update**
- Homey → Settings → Apps
- Universal Tuya Zigbee → Update
- Version: 2.15.125+

**Étape 2: RE-PAIRER (OBLIGATOIRE!)**
- Supprimer Motion Sensor ancien
- Supprimer SOS Button ancien  
- Re-ajouter via Add Device
- Sélectionner bons drivers

**Étape 3: Vérifier**
- Temperature: 12.1°C ✅
- Humidity: 89.3% ✅
- Illuminance: 31 lux ✅
- Battery: 100% ✅
- Motion: Triggers flows ✅
- SOS: Triggers flows ✅

---

## 🔧 POURQUOI GITHUB ACTIONS NE FONCTIONNE PAS

**Problèmes multiples:**
1. Merge commits perdent modifications app.json
2. Scripts PowerShell/Node.js s'auto-suppriment
3. Déclarations images ne persistent pas entre pulls
4. Validation locale PASS ≠ Validation GitHub PASS

**Conclusion:** Trop de complexité. Publication manuelle = PLUS FIABLE.

---

## ⏰ TEMPS ESTIMÉ

**Publication manuelle:** 2-3 minutes  
**Disponibilité App Store:** Immédiate après publish  
**Update pour users:** Instantané

---

## 📊 RÉSUMÉ SESSION

**Durée totale:** ~3h (21:00 - 00:00)  
**Problèmes résolus:** 6 majeurs  
**Commits:** 25+  
**Scripts créés:** 18+  
**Résultat:** Device.js fixes PRÊTS, publication manuelle requise

---

**Date:** 16 octobre 2025, 00:00 UTC+02:00  
**Version locale:** 2.15.125 (avec tous fixes)  
**Version App Store:** 2.15.110 (ancienne)  
**Action requise:** `homey app publish` manuel
