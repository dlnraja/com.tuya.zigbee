# 🚀 PLAN D'ACTION v4.9.190 - CORRECTIONS COMPLÈTES

## ✅ PROBLÈMES IDENTIFIÉS

### 1. **TS0002 CONFLICT** - 38 Drivers avec même productId
**Cause**: 38 drivers différents acceptent TOUS "TS0002" dans leur liste productId  
**Conséquence**: Homey choisit aléatoirement entre switch_basic_2gang, switch_wall_2gang, usb_outlet_2port, etc.  
**Solution**: Utiliser manufacturerName SPÉCIFIQUES + endpoints pour différencier

### 2. **usb_outlet_2port** - Import manquant
**Erreur**: `BaseHybridDevice is not defined`  
**Cause**: `require('../../lib/SwitchDevice')` au lieu de `BaseHybridDevice`  
**Status**: ✅ DÉJÀ CORRIGÉ dans v4.9.188

### 3. **removeBatteryFromACDevices** - Méthode manquante
**Erreur**: `removeBatteryFromACDevices is not a function`  
**Cause**: Méthode appelée mais jamais implémentée dans BaseHybridDevice  
**Solution**: Implémenter la fonction

### 4. **Promise .catch on undefined**
**Erreur**: `Cannot read properties of undefined (reading 'catch')`  
**Cause**: Fonctions retournant `undefined` au lieu de `Promise`  
**Solution**: Wrapper avec `Promise.resolve()`

### 5. **Tuya EF00 timing**
**Erreur**: `tuyaCluster not available`  
**Cause**: Manager initialisé en background, appelé immédiatement  
**Status**: ✅ DÉJÀ CORRIGÉ dans v4.9.188 (retry loop)

### 6. **Battery indicator sur AC devices**
**Problème**: `measure_battery` affiché pour appareils AC (USB outlet)  
**Solution**: `removeBatteryFromACDevices()` + migration script

---

## 📋 PLAN D'IMPLÉMENTATION

### PHASE 1: FIX CRITIQUES (Maintenant)
**Durée estimée**: 30 minutes

#### A. Implémenter removeBatteryFromACDevices ✅
```javascript
async removeBatteryFromACDevices() {
  if (this.powerType === 'AC' || this.powerType === 'DC' || this.hasUSB) {
    if (this.hasCapability('measure_battery')) {
      await this.removeCapability('measure_battery');
      this.log('✅ Removed measure_battery for AC/DC device');
    }
  }
}
```

#### B. Fix Promise wrappers
- Identifier toutes les fonctions async qui peuvent retourner `undefined`
- Wrapper avec `Promise.resolve()`
- Ajouter `.catch()` robustes

#### C. Fix TS0002 fingerprints - Strategy
**Option 1**: Enlever TS0002 des drivers NON-2gang  
**Option 2**: Ajouter manufacturerName distincts  
**Option 3**: Utiliser `endpoints.length` comme différenciateur

**Décision**: Option 2 + 3 combinées

---

### PHASE 2: CUSTOM PAIRING VIEW (High value)
**Durée estimée**: 2 heures

#### Features
- Liste candidats drivers basée sur manufacturerName + productId + endpoints
- Bouton "Use this driver" pour override
- Export diagnostic JSON pour crowdsourcing
- UI moderne (match avec device-finder.html)

#### Files à créer
```
/pairing/select-driver.html (✅ Existe déjà!)
/pairing/select-driver.js (✅ Existe déjà!)
```

**Action**: Vérifier si fonctionnel et améliorer

---

### PHASE 3: MIGRATION SCRIPT (Medium priority)
**Durée estimée**: 1 heure

#### Script Fonctions
1. Scan tous devices de l'app via Homey API
2. Lire `zb_product_id`, `zb_manufacturer_name`, `powerSource`
3. Si AC/DC et a `measure_battery`: supprimer capability
4. Si mauvais driver assigné (ex USB → switch): proposer reassign
5. Export CSV: devices à corriger manuellement

#### File
```
/scripts/migrate-existing-devices.js
```

---

### PHASE 4: DOCUMENTATION & TESTS
**Durée estimée**: 1 heure

#### Docs
- Update README avec fingerprint matrix
- Guide troubleshooting "Wrong driver assigned"
- FAQ migration

#### Tests
- Unit tests pour removeBatteryFromACDevices
- Mock ZigBeeNode powerSource
- E2E pairing simulation

---

## 🎯 COMMITS PLANIFIÉS

### Commit 1: v4.9.190-implement-removebattery-promisewrappers
**Files**:
- `lib/BaseHybridDevice.js` - Implémenter removeBatteryFromACDevices
- `lib/BaseHybridDevice.js` - Fix Promise wrappers
- `lib/TuyaEF00Manager.js` - Ensure Promise returns

### Commit 2: v4.9.191-fix-ts0002-fingerprints-specificity
**Files**:
- 38x `drivers/*/driver.compose.json` - Ajouter manufacturerName spécifiques
- Enlever TS0002 des drivers qui ne sont PAS 2-gang

### Commit 3: v4.9.192-improve-custom-pairing-view
**Files**:
- `pairing/select-driver.html` - UI améliorée
- `pairing/select-driver.js` - Logique complète

### Commit 4: v4.9.193-migration-script-devices
**Files**:
- `scripts/migrate-existing-devices.js` - Script migration
- `docs/MIGRATION_GUIDE.md` - Guide utilisateur

---

## 📊 METRICS DE SUCCÈS

### Avant v4.9.190
- ❌ 38 drivers en conflit TS0002
- ❌ usb_outlet_2port crash au load
- ❌ Battery indicator sur AC devices
- ❌ Errors Promise .catch undefined

### Après v4.9.193
- ✅ 0 conflits TS0002 (manufacturerName spécifiques)
- ✅ usb_outlet_2port stable + 2 ports fonctionnels
- ✅ Battery indicator SEULEMENT sur battery devices
- ✅ 0 errors Promise
- ✅ Custom pairing view opérationnelle
- ✅ Migration script disponible

---

## 🚦 STATUS ACTUEL

**v4.9.189**: Device Finder UI créé ✅  
**v4.9.188**: Soil/PIR timing fix + USB import fix ✅  
**v4.9.187**: Settings page fix ✅  

**NEXT**: v4.9.190 - removeBatteryFromACDevices + Promise wrappers

---

## ⏱️ TIMELINE

- **00:00-00:30**: Commit 1 (removeBattery + Promises)
- **00:30-01:00**: Commit 2 (TS0002 fingerprints - top 10 drivers)
- **01:00-03:00**: Commit 3 (Custom pairing view improvements)
- **03:00-04:00**: Commit 4 (Migration script)
- **04:00-05:00**: Tests + validation + documentation

**Total**: ~5 heures pour implémentation complète

---

## 🎯 PRIORITÉS USER

1. **HIGH**: usb_outlet_2port fonctionne avec 2 ports ✅ (déjà fix)
2. **HIGH**: Plus d'indicateur battery sur USB AC ← **MAINTENANT**
3. **HIGH**: Mauvais driver auto-assigné ← **MAINTENANT**
4. **MED**: Custom pairing view
5. **MED**: Migration devices existants
6. **LOW**: Tests automatisés

---

**DÉBUT EXÉCUTION: v4.9.190**
