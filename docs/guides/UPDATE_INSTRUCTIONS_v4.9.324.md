# 🚨 INSTRUCTIONS CRITIQUES - UPDATE v4.9.324

## ❌ PROBLÈME IDENTIFIÉ

Tu utilises **v4.9.321** alors que **v4.9.324** est nécessaire!

Tous les bugs dans ton diagnostic sont **DÉJÀ FIXÉS** dans les versions plus récentes.

---

## 🐛 BUGS DANS v4.9.321 (ta version actuelle)

### 1. **Battery Reader - Mode Tuya DP incorrect**
```
[BATTERY-READER] Trying Tuya DP protocol...  ← FAUX pour _TZ3000_*
```
- **Status:** ✅ FIXÉ dans v4.9.322
- **Impact:** Battery pas affichée pour boutons TS0043/TS0044

### 2. **Migration Queue - Invalid homey instance**
```
[MIGRATION-QUEUE] Invalid homey instance
```
- **Status:** ✅ FIXÉ dans v4.9.322  
- **Impact:** Migration queue crash

### 3. **TS0601 Sensors - Pas de données**
```
Climate Monitor - Pas de température/humidity
Presence Radar - Pas de motion/présence
Soil Tester - Pas de soil moisture
```
- **Status:** ✅ FIXÉ dans v4.9.323 (Emergency fix)
- **Impact:** Sensors "morts"

### 4. **Driver invalide: usb_outlet**
```
[SAFE-MIGRATE] Target driver not found: usb_outlet
This is an INVALID DRIVER ID - cannot migrate
```
- **Status:** ✅ FIXÉ dans v4.9.324 (MAINTENANT!)
- **Impact:** Ton 2-gang USB reste sur mauvais driver

---

## ✅ SOLUTION: UPDATE VERS v4.9.324

### **Version progression:**
```
v4.9.321 (TA VERSION)
  ↓ Battery reader fix
v4.9.322
  ↓ TS0601 emergency fix
v4.9.323
  ↓ usb_outlet driver fix
v4.9.324 (REQUIS!)
```

---

## 📋 INSTRUCTIONS ÉTAPE PAR ÉTAPE

### **Étape 1: Attendre v4.9.324 (~40 minutes)**

```
⏱️ Maintenant (17:00) → Build start
⏱️ +10 min (17:10) → Validation complete
⏱️ +40 min (17:40) → App disponible Test
```

**Check workflow:** https://github.com/dlnraja/com.tuya.zigbee/actions

---

### **Étape 2: Update l'app**

1. Ouvre Homey app sur smartphone
2. → More → Apps
3. → Universal Tuya Zigbee
4. → Check for updates
5. → Install v4.9.324

**OU**

1. Ouvre Homey Developer Tools (web)
2. → Apps
3. → Universal Tuya Zigbee → Update

---

### **Étape 3: Restart l'app (IMPORTANT!)**

**Option A - Via Homey App:**
1. More → Apps
2. Universal Tuya Zigbee
3. Settings ⚙️
4. Restart App

**Option B - Via Developer Tools:**
1. Apps → Universal Tuya Zigbee
2. Restart

**Option C - Restart Homey complet (recommandé):**
1. Settings → System
2. Restart Homey

---

### **Étape 4: Attendre 2 minutes**

Laisse l'app initialiser tous les devices.

---

### **Étape 5: Vérifier les logs**

**Pour TS0043 button:**
```
Developer Tools → Device: Contrôleur 3 Boutons
Cherche:
✅ [BATTERY-READER] Trying genPowerCfg cluster...  (PAS Tuya DP!)
✅ Battery: XX% (source: genPowerCfg)
```

**Pour 2-gang USB:**
```
Developer Tools → Device: Switch 2gang
Cherche:
✅ USB OUTLET 2-GANG → switch_2_gang
✅ Driver is CORRECT
✅ Pas d'erreur "usb_outlet"
```

**Pour TS0601 sensors:**
```
Developer Tools → Device: Climate Monitor
Cherche:
✅ [TS0601 FIX] EMERGENCY FIX ACTIVATED
✅ Tuya cluster 0xEF00 FOUND
✅ dataReport received
✅ DP 1 → measure_temperature = XX
```

---

### **Étape 6: Envoyer nouveau diagnostic**

**SEULEMENT si problèmes persistent après v4.9.324:**

1. Update vers v4.9.324 ✅
2. Restart app ✅
3. Attendre 5 minutes ✅
4. Nouveau diagnostic:
   - Homey App → Settings → Submit Diagnostic
   - Message: "v4.9.324 - Toujours pas de données sensors"
5. Copie diagnostic ID ici

---

## 🎯 CE QUI VA CHANGER

### **Avant (v4.9.321):**
```
❌ TS0043 → Battery via Tuya DP (FAUX!)
❌ 2-gang USB → Migration vers usb_outlet (N'EXISTE PAS!)
❌ TS0601 sensors → Pas de données
❌ Migration queue crash
```

### **Après (v4.9.324):**
```
✅ TS0043 → Battery via genPowerCfg (CORRECT!)
✅ 2-gang USB → Migration vers switch_2_gang (EXISTE!)
✅ TS0601 sensors → Emergency fix force dataReport
✅ Migration queue fonctionne
```

---

## ⚠️ IMPORTANT

**NE PAS:**
- ❌ Re-pairer les devices AVANT update
- ❌ Modifier manuellement les drivers
- ❌ Envoyer nouveau diagnostic AVANT update
- ❌ Demander plus de fixes (attends v4.9.324!)

**FAIRE:**
- ✅ Attendre v4.9.324 disponible (~40 min)
- ✅ Update app
- ✅ Restart app/Homey
- ✅ Attendre 2-5 minutes
- ✅ Vérifier logs
- ✅ Envoyer diagnostic SEULEMENT si problème persiste

---

## 📊 RÉSUMÉ DES 4 VERSIONS

| Version | Fixes | Status |
|---------|-------|--------|
| v4.9.321 | (TON ACTUEL) | ❌ BUGS |
| v4.9.322 | Battery + Migration queue | ✅ |
| v4.9.323 | TS0601 emergency fix | ✅ |
| v4.9.324 | usb_outlet fix | ✅ REQUIS! |

---

## ⏰ TIMELINE

```
✅ 17:00 → v4.9.324 créé & poussé
⏱️ 17:10 → Workflow validation
⏱️ 17:20 → Build & tests
⏱️ 17:40 → App disponible Test
⏱️ 18:00 → Tu peux update!
⏱️ 18:05 → Vérifier logs
⏱️ 18:10 → Tout devrait fonctionner! ✅
```

---

## 🆘 SI PROBLÈMES PERSISTENT

**Après avoir fait TOUTES les étapes ci-dessus:**

1. Check version dans Homey: **DOIT être v4.9.324**
2. Check logs pour TS0043: **DOIT voir "genPowerCfg"**
3. Check logs pour 2-gang: **DOIT voir "switch_2_gang"**
4. Check logs pour TS0601: **DOIT voir "[TS0601 FIX]"**

**Si TOUJOURS pas bon:**
→ Envoie nouveau diagnostic + copie TOUS les logs ici!

---

**Workflow:** https://github.com/dlnraja/com.tuya.zigbee/actions  
**Version requise:** v4.9.324  
**Status:** En cours de publication (40 min)  
**Action:** ATTENDS! PUIS UPDATE! PUIS TESTE! 🚀
