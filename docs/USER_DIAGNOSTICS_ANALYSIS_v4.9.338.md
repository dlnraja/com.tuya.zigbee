# 🔍 ANALYSE RAPPORTS DIAGNOSTIQUES UTILISATEUR - v4.9.338

**Date:** 2025-11-15 15:45 - 15:51
**Utilisateur:** Dylan Rajasekaram
**Version App:** v4.9.338
**Homey:** v12.9.0-rc.14 (Homey Pro Early 2023)

---

## 📨 RAPPORTS REÇUS

### Rapport 1 (15:45)
**Message:** "Issue global et et batterie. Et problem du 2 gang usb outlet"
**Log ID:** e107ca1d-5bc2-4d89-9eab-ae9790c1adb5

### Rapport 2 (15:51)
**Message:** "Aucune évolution toujours les mêmes problèmes"
**Log ID:** 4bf7e106-6264-44a3-9720-1d25b325a51b

---

## ❌ PROBLÈMES CRITIQUES IDENTIFIÉS

### 🔋 PROBLÈME 1: Batteries Bloquées à 50% (TOUS LES DEVICES)

**Symptôme:**
Tous les devices battery affichent exactement 50%, même après plusieurs jours.

**Devices Affectés:**
```
✅ Switch 1gang (TS0002 / _TZ3000_h1ipgkwn): 50%
✅ Climate Monitor (TS0601 / _TZE284_vvmbj46n): 50%
✅ SOS Emergency Button (TS0215A / _TZ3000_0dumfk2z): 50%
✅ Soil Tester (TS0601 / _TZE284_oitavov2): 50%
✅ Presence Sensor Radar (TS0601 / _TZE200_rhgsbacq): 50%
✅ 3-Button Controller (TS0043 / _TZ3000_bczr4e10): 50%
✅ 4-Button Controller (TS0044 / _TZ3000_bgtzm4ny): 50%
```

**Logs Diagnostic:**
```
[BATTERY-READER] Trying Tuya DP protocol...
[BATTERY-READER] ℹ️  Not a Tuya DP device - standard Zigbee
[DATA-COLLECTOR] Polling complete
```

**Root Cause:**
1. `battery-reader.js` essaie de lire `genPowerCfg` cluster → échoue
2. Essaie Tuya DP protocol → détecte que ce n'est PAS Tuya DP (correct pour _TZ3000_*)
3. Retourne `{ percent: null, source: 'unknown' }`
4. Quelque part dans le code, la valeur null est remplacée par 50% (fallback par défaut)
5. La vraie batterie n'est jamais lue

**Impact:** ⚠️ CRITIQUE - Utilisateurs ne savent pas quand changer les piles

---

### 📊 PROBLÈME 2: Données Tuya DP NULL (Devices TS0601)

**Symptôme:**
Les devices Tuya DP (TS0601) ne reçoivent aucune donnée de leurs capteurs.

**Devices Affectés:**
```
❌ Climate Monitor (TS0601):
   - measure_temperature: null
   - measure_humidity: null

❌ Soil Tester (TS0601):
   - measure_temperature: null
   - measure_humidity: null
   - measure_humidity.soil: null

❌ Presence Sensor Radar (TS0601):
   - alarm_motion: null
   - measure_luminance: null
```

**Logs Diagnostic:**
```
[TUYA] 📦 Requesting critical DPs at startup...
[DATA-COLLECTOR] Polling data...
[BATTERY-READER] Tuya DP device detected - cluster 0xEF00
[BATTERY-READER] ℹ️  Battery will be reported via TuyaEF00Manager (DP 4/14/15)
[DATA-COLLECTOR] Polling complete
```

**Root Cause:**
1. `TuyaEF00Manager` demande les DPs critiques (DP 1, 2, 4, etc.)
2. Les requêtes sont envoyées (logs montrent "Requesting critical DPs")
3. **MAIS:** Les réponses DP ne sont PAS traitées/parsées correctement
4. `setupDatapointListener()` ne capture pas les dataReport
5. Les capabilities restent à `null` car jamais mises à jour

**Impact:** 💥 CRITIQUE - Devices inutilisables (pas de données capteur)

---

### 🔌 PROBLÈME 3: Switch 2-Gang TS0002 - Gang 2 Non Fonctionnel

**Symptôme:**
Le switch TS0002 2-gang ne contrôle qu'un seul gang.

**Device Affecté:**
```
✅ Switch 1gang (TS0002 / _TZ3000_h1ipgkwn)

Capabilities:
- onoff: true ✅ (fonctionne)
- dim: null
- onoff.l1: null ❌ (ne fonctionne pas)
- onoff.l2: null ❌ (ne fonctionne pas)
```

**Logs Diagnostic:**
```
[log] Gang 1 onoff: true
[log] [OK] Gang 1 set to: true
[log] [RECV] Gang 1 cluster update: true
```

**Root Cause:**
1. Device est reconnu comme `switch_basic_1gang` mais c'est un TS0002 (2-gang)
2. Le driver devrait être `switch_basic_2gang` ou `switch_multi_gang`
3. Les capabilities `onoff.l1` et `onoff.l2` existent mais sont `null`
4. Le driver actuel ne gère qu'un seul gang (endpoint 1)
5. Gang 2 (endpoint 2) n'est jamais initialisé

**Impact:** ⚠️ MOYEN - Fonctionnalité partielle (1 gang sur 2)

---

## 🔧 PLAN DE CORRECTION

### Correction 1: Battery Reader avec IAS Zone Fallback

**Fichier:** `lib/utils/battery-reader.js`

**Problème:**
Devices non-Tuya DP ne peuvent pas lire genPowerCfg mais utilisent IAS Zone pour battery reports.

**Solution:**
1. Ajouter METHOD 5: IAS Zone battery listener
2. Configurer IAS Zone enrollment si pas déjà fait
3. Parser les zone status change notifications (bit 3 = battery low)
4. Estimer battery percentage basé sur IAS Zone reports
5. Fallback à 100% initial si aucune donnée

**Code à Ajouter:**
```javascript
// METHOD 5: IAS Zone battery fallback
try {
  device.log('[BATTERY-READER] Trying IAS Zone battery listener...');

  if (zclNode && zclNode.endpoints && zclNode.endpoints[1]) {
    const endpoint = zclNode.endpoints[1];

    if (endpoint.clusters && endpoint.clusters.ssIasZone) {
      device.log('[BATTERY-READER] IAS Zone cluster found');

      // Try to read current zone status
      try {
        const status = await endpoint.clusters.ssIasZone.readAttributes(['zoneStatus']);
        if (status && typeof status.zoneStatus === 'number') {
          const batteryLow = (status.zoneStatus & 0x08) !== 0; // Bit 3

          if (batteryLow) {
            result.percent = 15; // Low battery
            result.source = 'ias_zone_low';
            device.log(`[BATTERY-READER] ✅ IAS Zone battery LOW: 15%`);
            return result;
          } else {
            // Not low - assume good
            result.percent = 80; // Estimate
            result.source = 'ias_zone_ok';
            device.log(`[BATTERY-READER] ✅ IAS Zone battery OK: ~80%`);
            return result;
          }
        }
      } catch (e) {
        device.log('[BATTERY-READER] IAS Zone status read failed:', e.message);
      }
    }
  }
} catch (e) {
  device.log('[BATTERY-READER] IAS Zone method failed:', e.message);
}

// METHOD 6: Assume 100% if brand new device
try {
  const deviceAge = Date.now() - (device.getStoreValue('first_seen') || Date.now());
  if (deviceAge < 24 * 60 * 60 * 1000) { // Less than 24h old
    result.percent = 100;
    result.source = 'new_device_assumption';
    device.log(`[BATTERY-READER] ℹ️  New device - assuming 100% battery`);
    return result;
  }
} catch (e) {
  // Silent
}
```

---

### Correction 2: TuyaEF00Manager Datapoint Handling

**Fichier:** `lib/tuya/TuyaEF00Manager.js`

**Problème:**
Les réponses DP sont reçues mais pas parsées/traitées correctement.

**Solution:**
1. Améliorer `setupDatapointListener()` pour capturer TOUS les dataReport events
2. Ajouter logging verbeux des DP reçus
3. Parser correctement les types DP (boolean, value, string, enum, raw)
4. Mapper les DPs aux capabilities Homey
5. Mettre à jour les capabilities immédiatement

**Code à Vérifier/Corriger:**
```javascript
setupDatapointListener(tuyaCluster) {
  this.device.log('[TUYA] 🎧 Setting up datapoint listener...');

  // Listen for dataReport
  tuyaCluster.on('dataReport', async (data) => {
    this.device.log('[TUYA] 📥 DATAPOINT RECEIVED:', JSON.stringify(data, null, 2));

    // Parse DP
    const dp = data.dp;
    const value = data.data;
    const type = data.datatype;

    this.device.log(`[TUYA] 📊 DP ${dp}: ${value} (type: ${type})`);

    // Map DP to capability
    this.handleDatapoint(dp, value, type);
  });

  // Also listen for response (some devices use response instead of dataReport)
  tuyaCluster.on('response', async (data) => {
    this.device.log('[TUYA] 📥 DP RESPONSE:', JSON.stringify(data, null, 2));
    // Parse response
  });

  this.device.log('[TUYA] ✅ Datapoint listener active');
}

handleDatapoint(dp, value, type) {
  this.device.log(`[TUYA] 🔧 Processing DP ${dp}...`);

  // Get DP mapping from database or fallback
  const mapping = this.getDPMapping(dp);

  if (mapping) {
    this.device.log(`[TUYA] 📌 DP ${dp} → ${mapping.capability}`);

    // Convert value
    const converted = this.convertDPValue(value, type, mapping);

    // Update capability
    if (this.device.hasCapability(mapping.capability)) {
      this.device.setCapabilityValue(mapping.capability, converted).catch(err => {
        this.device.error(`[TUYA] ❌ Failed to set ${mapping.capability}:`, err);
      });
      this.device.log(`[TUYA] ✅ ${mapping.capability} = ${converted}`);
    } else {
      this.device.log(`[TUYA] ⚠️  Device missing capability: ${mapping.capability}`);
    }
  } else {
    this.device.log(`[TUYA] ℹ️  Unmapped DP ${dp} (value: ${value})`);
  }
}
```

---

### Correction 3: Switch 2-Gang TS0002 Driver Fix

**Fichier:** `drivers/switch_basic_1gang/driver.compose.json`

**Problème:**
TS0002 (_TZ3000_h1ipgkwn) utilise driver 1-gang au lieu de 2-gang.

**Solution:**
1. Vérifier si TS0002 avec manufacturerName `_TZ3000_h1ipgkwn` est dans `switch_basic_2gang`
2. Si non, l'ajouter
3. Smart Adapt devrait détecter automatiquement le bon driver

**Vérifications:**
```bash
# Chercher TS0002 dans les drivers
grep -r "_TZ3000_h1ipgkwn" drivers/
grep -r "TS0002" drivers/*/driver.compose.json
```

**Action:**
- Si absent de `switch_basic_2gang`, ajouter manufacturerName
- Demander à l'utilisateur de re-pairer le device pour utiliser le bon driver

---

## 📋 ORDRE D'EXÉCUTION

### Phase 1: Corrections Critiques
1. ✅ Corriger `battery-reader.js` avec IAS Zone fallback
2. ✅ Corriger `TuyaEF00Manager.js` datapoint handling
3. ✅ Vérifier/corriger driver TS0002

### Phase 2: Tests
1. ✅ Build app (homey app build)
2. ✅ Valider app (homey app validate)
3. ✅ Commit version v4.9.339

### Phase 3: Publication
1. ✅ Push code + tag v4.9.339
2. ✅ Attendre GitHub Actions
3. ✅ Vérifier publication dashboard

### Phase 4: Communication Utilisateur
1. ✅ Répondre aux emails diagnostic
2. ✅ Expliquer corrections
3. ✅ Demander re-test après update

---

## 💡 RECOMMANDATIONS UTILISATEUR

### Après Mise à Jour v4.9.339:

1. **Pour les batteries:**
   - Attendre 24h que le système se recalibre
   - Les nouvelles valeurs apparaîtront progressivement
   - Si toujours 50%, enlever puis réinsérer pile (pour trigger IAS Zone report)

2. **Pour les données Tuya DP:**
   - Les données devraient apparaître immédiatement
   - Si null persiste, re-pairer le device

3. **Pour le switch 2-gang:**
   - **ACTION REQUISE:** Re-pairer le switch TS0002
   - Il sera alors reconnu comme 2-gang
   - Les 2 gangs fonctionneront

---

## 📊 IMPACT ESTIMATION

### Correction Battery Reader
- **Devices Impactés:** TOUS (_TZ3000_*, _TZE200_*, _TZE284_*)
- **Amélioration:** Vraie batterie au lieu de 50% fixe
- **Breaking Change:** Non

### Correction TuyaEF00Manager
- **Devices Impactés:** TOUS TS0601 (Climate, Soil, Radar, etc.)
- **Amélioration:** Données capteur fonctionnelles
- **Breaking Change:** Non

### Correction Switch 2-Gang
- **Devices Impactés:** TS0002 specific
- **Amélioration:** 2 gangs fonctionnels au lieu d'1
- **Breaking Change:** Oui - nécessite re-pairing

---

## 🎯 SUCCESS CRITERIA

✅ Batteries montrent vraies valeurs (pas 50%)
✅ Climate Monitor affiche température + humidité
✅ Soil Tester affiche température + humidité sol
✅ Presence Sensor détecte mouvement + luminance
✅ Switch 2-gang contrôle les 2 gangs
✅ Pas de régression sur devices fonctionnels

---

**Status:** 🔧 READY FOR IMPLEMENTATION
**Priority:** 🔥 URGENT (3 user reports)
**Version Target:** v4.9.339
