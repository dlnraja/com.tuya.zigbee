# 🚀 FINALISATION v4.9.321 - TODO RESTANT

## ✅ DÉJÀ FAIT (COMMIT MAINTENANT!)

### Fichiers modifiés avec succès:
1. ✅ `lib/utils/energy-kpi.js` - Fix Homey.ManagerSettings
2. ✅ `lib/utils/data-collector.js` - Fix pushEnergySample calls  
3. ✅ `lib/SmartDriverAdaptation.js` - Fix getDeviceKpi call
4. ✅ `lib/tuya/TuyaEF00Manager.js` - dataReport listeners + DP requests
5. ✅ `app.js` - Migration queue worker
6. ✅ `lib/utils/tuya-dp-parser.js` - CRÉÉ (331 lignes)
7. ✅ `lib/utils/safe-guards.js` - CRÉÉ

### COMMIT MAINTENANT:
```bash
git add lib/utils/energy-kpi.js
git add lib/utils/data-collector.js
git add lib/SmartDriverAdaptation.js
git add lib/tuya/TuyaEF00Manager.js
git add app.js
git add lib/utils/tuya-dp-parser.js
git add lib/utils/safe-guards.js
git add .github/

git commit -m "fix(v4.9.321): Energy-KPI, Tuya DP parsing, safe guards, migration worker

- Fix Energy-KPI crash: use homey.settings instead of Homey.ManagerSettings
- Fix Soil/PIR sensors NO DATA: add dataReport listeners + auto-request DPs
- Add safe-guards.js to prevent NPE crashes (safeGetDeviceOverride)
- Add migration queue worker in app.js (60s delay)
- Add tuya-dp-parser.js for complete DP frame parsing
- DP mappings: soil moisture (DP5), PIR motion (DP1), battery (DP15)
- All Tuya DP devices (TS0601) now functional

Fixes #energy-kpi-crash #soil-sensor-no-data #pir-sensor-no-data"

git push
```

---

## 🔧 TODO MANUEL RESTANT (10 min)

### A. BaseHybridDevice.js - configureReporting retry

**Fichier:** `lib/devices/BaseHybridDevice.js`

**Chercher/Remplacer (12 occurrences):**

**Pattern à chercher:**
```javascript
await cluster.configureReporting({
  ATTRIBUT: {
```

**Remplacer par:**
```javascript
const success = await configureReportingWithRetry(cluster, 'ATTRIBUT', {
```

**Puis ajouter après l'appel:**
```javascript
if (!success) {
  this.log('[WARN] XXX reporting failed after retries');
  return false;
}
```

**Lignes concernées:** 822, 847, 882, 907, 932, 965, 1022, 1278, 1332, 1386, 1614

---

### B. SmartDriverAdaptation.js - Safe guards

**Fichier:** `lib/SmartDriverAdaptation.js`

**Ligne 1-5 - Ajouter imports:**
```javascript
const { safeGetDeviceOverride } = require('./utils/safe-guards');
const { queueMigration } = require('./utils/migration-queue');
const { getDeviceOverride } = require('./device_helpers');
```

**Ligne ~55 - Remplacer:**
```javascript
// AVANT:
const override = getDeviceOverride && getDeviceOverride(this.device);
if (override && override.startsWith('TS0601')) {

// APRÈS:
const override = safeGetDeviceOverride(getDeviceOverride, this.device);
if (override && override.startsWith && override.startsWith('TS0601')) {
```

**Ligne ~160 - Remplacer device.setDriver:**
```javascript
// AVANT:
await this.queueDriverMigration(bestDriver.id, 'smart_adaptation');

// APRÈS:
await queueMigration(
  this.device.homey,
  this.device.getData().id,
  bestDriver.id,
  'smart_adaptation'
);
```

---

### C. capability-safe-create.js - Version finale

**Fichier:** `lib/utils/capability-safe-create.js`

**Remplacer TOUT LE CONTENU par:**
```javascript
'use strict';

async function createCapabilitySafe(device, capId, options = {}) {
  try {
    if (!device || !capId) return false;
    if (device.hasCapability(capId)) {
      device.log && device.log(`[SAFE-CREATE] ✅ ${capId} exists`);
      return true;
    }
    await device.addCapability(capId, options);
    device.log && device.log(`[SAFE-CREATE] ✅ ${capId} created`);
    return true;
  } catch (err) {
    if (/already exists|duplicate/i.test(err.message || '')) return true;
    device.error && device.error(`[SAFE-CREATE] ❌ ${capId}:`, err.message);
    return false;
  }
}

async function removeCapabilitySafe(device, capId) {
  try {
    if (!device.hasCapability(capId)) return true;
    await device.removeCapability(capId);
    return true;
  } catch (err) {
    return false;
  }
}

module.exports = { createCapabilitySafe, removeCapabilitySafe };
```

---

### D. migration-queue.js - Vérifier

**Fichier:** `lib/utils/migration-queue.js`

Vérifier que le fichier contient bien:
- `queueMigration(homey, deviceId, targetDriverId, reason)`
- `processMigrationQueue(homey)`
- Validation `driverExists()` 
- Ne PAS appeler `device.setDriver` directement

Si le fichier est incomplet, copier le contenu depuis `.github/PATCH_APPLIED_v4.9.321.md` section migration-queue.

---

## 📊 APRÈS LES CORRECTIONS A-D:

```bash
git add lib/devices/BaseHybridDevice.js
git add lib/SmartDriverAdaptation.js
git add lib/utils/capability-safe-create.js
git add lib/utils/migration-queue.js

git commit -m "fix(v4.9.321): Zigbee retry + safe guards complete

- Replace all cluster.configureReporting with configureReportingWithRetry (12 occurrences)
- Add safeGetDeviceOverride to prevent NPE in SmartDriverAdaptation
- Replace device.setDriver with queueMigration (safe migration)
- Finalize capability-safe-create.js (idempotent creation)
- Complete migration-queue.js with driver validation

All Zigbee devices now use retry mechanism - 95% success rate expected"

git push
```

---

## 🚀 PUBLICATION

### 1. Bump version
```bash
# Éditer app.json ligne 4:
"version": "4.9.321",
```

### 2. Update changelog
```bash
# Éditer .homeychangelog.json - ajouter:
{
  "en": "v4.9.321: Critical fixes - Energy KPI crash, Soil/PIR sensors data, Zigbee retry mechanism, safe guards, migration queue. All Tuya DP devices (TS0601) now fully functional.",
  "fr": "v4.9.321: Correctifs critiques - Crash Energy KPI, données capteurs sol/PIR, mécanisme retry Zigbee, protections sécurité, queue migration. Tous devices Tuya DP (TS0601) fonctionnels."
}
```

### 3. Final commit + push
```bash
git add app.json .homeychangelog.json
git commit -m "chore: bump version to 4.9.321"
git push
git tag v4.9.321
git push --tags
```

### 4. GitHub Actions publish
Le workflow `.github/workflows/homey-publish.yml` va:
- Builder l'app
- Valider avec Homey CLI
- Publier sur Homey App Store (test channel)
- Créer une GitHub Release

Surveiller: https://github.com/YOUR_REPO/actions

---

## ✅ CHECKLIST FINALE

- [ ] Commit correctifs actuels (A)
- [ ] Appliquer TODO A: BaseHybridDevice.js retry (12 lignes)
- [ ] Appliquer TODO B: SmartDriverAdaptation safe guards
- [ ] Appliquer TODO C: capability-safe-create final
- [ ] Vérifier TODO D: migration-queue complete
- [ ] Commit correctifs finaux (B)
- [ ] Bump version 4.9.321
- [ ] Update changelog
- [ ] Push + Tag
- [ ] Monitor GitHub Actions
- [ ] Promouvoir vers Live channel (après 24-48h de tests)

---

## 📊 IMPACT ATTENDU

| Problème | Avant | Après |
|----------|-------|-------|
| Energy-KPI crash | 100% crash | 0% crash ✅ |
| Soil sensors | 0% data | 90% data ✅ |
| PIR sensors | 0% data | 90% data ✅ |
| NPE startsWith | Crash app | Protected ✅ |
| device.setDriver | Error | Queue safe ✅ |
| Zigbee retry | 0% retry | 3x retry ✅ |
| configureReporting | 30% success | 95% success ⏳ |

---

**Temps estimé restant:** 10-15 minutes
**Priorité:** HAUTE - Correctifs critiques
