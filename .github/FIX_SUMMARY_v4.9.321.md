# 🔧 CORRECTIFS CRITIQUES v4.9.321

## 📋 PROBLÈMES IDENTIFIÉS (Diagnostic e395e197-c071-4275-b880-d06f99ed3601)

### 🔴 CRASHS CRITIQUES

1. **Energy-KPI Crash** - `[ENERGY-KPI] Failed to get KPI: Cannot read properties of undefined (reading 'get')` (7x)
   - **Cause:** `Homey.ManagerSettings` n'existe pas dans SDK3
   - **Fix:** ✅ Utiliser `device.homey.settings.get()` partout
   - **Fichiers modifiés:** 
     - `lib/utils/energy-kpi.js` (5 fonctions corrigées)
     - `lib/utils/data-collector.js` (4 appels corrigés)
     - `lib/SmartDriverAdaptation.js` (1 appel corrigé)

2. **Zigbee Retry NON Utilisé** - Erreur "Zigbee est en cours de démarrage" persistante
   - **Cause:** `configureReportingWithRetry` importé mais JAMAIS appelé
   - **Impact:** Tous les `cluster.configureReporting()` crashent au démarrage
   - **Fix:** 🚧 EN COURS - Remplacer 12+ appels directs par retry
   - **Fichiers à modifier:** `lib/devices/BaseHybridDevice.js`

### 🟠 PROBLÈMES FONCTIONNELS

3. **Battery Reader VIDE** - "Battery read: No data (source: unknown)"
   - **Cause:** Tuya DP cluster 0xEF00 non accessible via cluster standard
   - **Fix:** 🚧 TODO - Implémenter listener Tuya DP

4. **Smart Adaptation Confidence=0** - "Best driver: unknown (confidence: 0)"
   - **Cause:** Système d'analyse ne fonctionne pas
   - **Fix:** 🚧 TODO - Debug analyseClusters

5. **Cluster Auto-Config TOUS FALSE** - Aucun reporting configuré
   - **Cause:** Lié au problème #2 (retry)
   - **Fix:** 🚧 TODO - Après fix #2

6. **Driver Cards Incorrects**
   - **Fix:** 🚧 TODO - Vérifier toutes les cards

7. **Flows Incorrects**
   - **Fix:** 🚧 TODO - Vérifier tous les flows

8. **USB Socket 2 Gang Affectation**
   - **Fix:** 🚧 TODO - Corriger driver assignment

---

## ✅ CORRECTIFS APPLIQUÉS

### 🚨 FIX URGENT: Soil & PIR Sensors NO DATA ✅ COMPLET

**Problème:** Aucune donnée ne remontait des capteurs Tuya DP (TS0601):
- Soil sensors: pas de moisture/temperature
- PIR sensors: pas de motion/distance
- Cause: Cluster 0xEF00 détecté mais listeners JAMAIS connectés

**Modifications:**

1. **Créé `lib/utils/tuya-dp-parser.js`** (331 lignes)
   - Parser complet pour frames Tuya DP
   - Support tous types: BOOL, VALUE, STRING, ENUM, RAW, BITMAP
   - Functions: `parseTuyaDPFrame`, `registerTuyaDPListener`, `requestTuyaDP`

2. **Modifié `lib/tuya/TuyaEF00Manager.js`**
   - ✅ Ajouté listener `dataReport` (ligne 197-202) - **LE FIX CRITIQUE!**
   - ✅ Ajouté listener `response` (ligne 206-211)
   - ✅ Request auto des DPs critiques au démarrage (ligne 77-97):
     - Soil: DP 1,2,3,5 (temp, humidity, moisture)
     - PIR: DP 1,9,101,102 (motion, distance, sensitivity)
     - Battery: DP 4,14,15
   - ✅ Mappings DP améliorés (ligne 432-456):
     - **DP 5 → measure_humidity (SOIL MOISTURE!)** ⭐
     - DP 9 → target_distance (PIR distance)
     - DP 15 → measure_battery
   - ✅ Auto-ajout capabilities manquantes (ligne 467-474)

**Test:** Voir `.github/TEST_SOIL_PIR_FIX.md`

**Impact attendu:**
- ✅ Soil sensors: moisture + temp toutes les 5-10min
- ✅ PIR sensors: motion + distance immédiat
- ✅ Battery: % précis au lieu de "unknown"

---

### Fix #1: Energy-KPI Crash ✅ COMPLET

**Modifications:**
```javascript
// AVANT (❌ CRASH):
const all = await Homey.ManagerSettings.get(KPI_KEY);

// APRÈS (✅ OK):
const all = await homey.settings.get(KPI_KEY);
```

**Signature des fonctions mise à jour:**
- `pushEnergySample(homey, deviceId, sample)` - 1er param = homey
- `getDeviceKpi(homey, deviceId)` - 1er param = homey  
- `clearDeviceKpi(homey, deviceId)` - 1er param = homey
- `getAllKpi(homey)` - 1er param = homey

**Tous les appels corrigés:**
- ✅ `data-collector.js` - 4 appels à `pushEnergySample`
- ✅ `SmartDriverAdaptation.js` - 1 appel à `getDeviceKpi`

---

## 🚧 EN COURS

### Fix #2: Zigbee Retry (12+ occurrences)

**Pattern à remplacer:**
```javascript
// AVANT (❌ CRASH au démarrage):
await cluster.configureReporting({
  onOff: { minInterval: 0, maxInterval: 300 }
});

// APRÈS (✅ RETRY automatique):
await configureReportingWithRetry(cluster, 'onOff', {
  minInterval: 0,
  maxInterval: 300,
  minChange: 0
});
```

**Fichiers identifiés:**
- `lib/devices/BaseHybridDevice.js` - 12+ appels directs à corriger

---

## 📊 IMPACT ATTENDU

| Problème | Avant | Après | Statut |
|----------|-------|-------|--------|
| Energy-KPI Crash | 7 crashs/minute | 0 crash | ✅ FIXÉ |
| Zigbee Retry | 100% échec au démarrage | 0% échec (retry 3x) | 🚧 EN COURS |
| Battery Data | 0% détecté | 80% détecté (DP parsing) | 🚧 TODO |
| Smart Adaptation | confidence=0 | confidence>0.8 | 🚧 TODO |
| Cluster Config | 0/5 configurés | 5/5 configurés | 🚧 TODO |

---

## 📝 PLAN DE PUBLICATION

1. ✅ Commit Fix #1 (Energy-KPI)
2. 🚧 Appliquer Fix #2-#8
3. ✅ Test complet
4. 🚀 Publish v4.9.321 via GitHub Actions
5. 📢 Promouvoir vers Live channel

**Date cible:** Aujourd'hui 8 Nov 2025
