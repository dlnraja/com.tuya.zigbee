# 🔄 REFONTE MAJEURE - PLAN COMPLET & INTELLIGENT

**Date**: 2025-10-22 @ 17:45 CET  
**Version Actuelle**: v4.1.6  
**Objectif**: Simplification, fusion drivers hybrid, SDK3 compliance

---

## 🚨 PROBLÈMES CRITIQUES URGENTS

### 1. ❌ ERREUR SYNTAXE - wireless_switch_3button_cr2032
**Diagnostic**: Log e10dadd9-7cf9-4cd3-9e8b-3b929aeccd29  
**Erreur**:
```
SyntaxError: Unexpected identifier at line 448
async pollAttributes() {
```

**Status**: ⏳ À ANALYSER  
**Priorité**: 🔴 CRITIQUE (bloque le driver)

---

### 2. ⚠️ SOS BUTTON - IAS Zone Enrollment Failed
**Diagnostic**: Log 23ff6ed3-06c0-4865-884f-bc6ac1a6b159  
**Erreur**:
```
Direct IAS enrollment failed: Error: IEEE address not available from zclNode
at SOSEmergencyButtonDevice.onNodeInit (line 234)
```

**Symptômes**:
- ✅ Motion sensor fonctionne parfaitement
- ✅ Batterie SOS button visible
- ❌ Aucune réponse au clic SOS button
- ❌ IAS Zone enrollment échoue

**Cause Probable**: IEEE address retrieval échoue  
**Status**: ⏳ À CORRIGER  
**Priorité**: 🔴 CRITIQUE

---

### 3. 📦 "Big 3 Button Wall CR2032" - Driver Inconnu
**Diagnostic**: Log b3028f16-36c6-46a7-b028-2f3cb34915c3  
**Message**: "Big 3 button wall cr2032"  
**Problem**: Driver pas identifié, user ne sait pas lequel choisir

**Status**: ⏳ À IDENTIFIER  
**Priorité**: 🟡 MOYENNE

---

### 4. 🔋 Boutons Noirs CR2032 - Pas d'Info Batterie
**Diagnostic**: Log e10dadd9 (même que #1)  
**Message**: "pas dinfo de batterie peut être que je me suis trompé de driver"

**Cause**: Mauvais driver OU problème batterie reporting  
**Status**: ⏳ À DIAGNOSTIQUER  
**Priorité**: 🟡 MOYENNE

---

## 🎯 REFONTE STRATÉGIQUE

### OBJECTIF PRINCIPAL
**Simplifier l'expérience utilisateur** en fusionnant intelligemment les drivers par fonction, tout en détectant automatiquement le type d'alimentation.

---

## 📋 STRATÉGIE DE FUSION INTELLIGENTE

### Principe: Drivers "Hybrid" Auto-Détection

**AVANT** (183 drivers avec suffixes):
```
zemismart_wireless_switch_1button_cr2032
zemismart_wireless_switch_1button_cr2450
zemismart_wireless_switch_1gang_cr2032
moes_wireless_switch_1gang_cr2032
...
```

**APRÈS** (drivers simplifiés):
```
zemismart_wireless_switch_1button     (auto-detect: CR2032, CR2450, AAA)
zemismart_wireless_switch_3button     (auto-detect: CR2032, battery)
moes_smart_switch_1gang              (auto-detect: AC, DC, hybrid)
...
```

---

### Classification Intelligente

#### **1. SWITCHES / BUTTONS (par nb de boutons)**
- `wireless_switch_1button` (CR2032, CR2450, AAA - auto-detect)
- `wireless_switch_2button` (CR2032 - auto-detect)
- `wireless_switch_3button` (CR2032 - auto-detect)
- `wireless_switch_4button` (CR2032 - auto-detect)
- `wireless_switch_6button` (CR2032 - auto-detect)
- `wireless_switch_8button` (CR2032 - auto-detect)

#### **2. SMART SWITCHES (par nb de gangs)**
- `smart_switch_1gang` (AC, DC, hybrid, internal - auto-detect)
- `smart_switch_2gang` (AC, DC, hybrid - auto-detect)
- `smart_switch_3gang` (AC, DC, hybrid, CR2032 - auto-detect)
- `smart_switch_4gang` (CR2032 - auto-detect)

#### **3. SENSORS**
- `motion_sensor` (battery, AC - auto-detect)
- `motion_temp_humidity_illumination` (battery - multi-types)
- `temperature_sensor` (CR2032, AAA, battery - auto-detect)
- `temp_humid_sensor` (battery - auto-detect)
- `contact_sensor` (CR2032 - auto-detect)
- `water_leak_sensor` (battery - auto-detect)
- `smoke_detector` (battery - auto-detect)

#### **4. CONTROLLERS**
- `curtain_motor` (AC, internal - auto-detect)
- `roller_blind_controller` (AC - auto-detect)
- `valve_smart` (AA - auto-detect)
- `dimmer_wireless` (CR2032 - auto-detect)

---

## 🔧 DÉTECTION AUTO ALIMENTATION

### Méthode 1: Battery Cluster Detection
```javascript
// Si powerConfiguration cluster disponible → Battery powered
if (zclNode.endpoints[1]?.clusters?.powerConfiguration) {
  this.log('✅ Battery powered device detected');
  this.batteryType = 'battery'; // CR2032, CR2450, AAA, etc.
}
```

### Méthode 2: AC/DC Detection
```javascript
// Si pas de battery cluster → AC ou DC powered
if (!zclNode.endpoints[1]?.clusters?.powerConfiguration) {
  this.log('✅ AC/DC powered device detected');
  this.powerType = 'mains'; // AC ou DC
}
```

### Méthode 3: Device Identification
```javascript
// Lire attributes pour identifier exactement
const basicCluster = zclNode.endpoints[1]?.clusters?.basic;
const attrs = await basicCluster.readAttributes([
  'manufacturerName',
  'modelId',
  'powerSource' // 0x00 = Unknown, 0x01 = Mains, 0x03 = Battery
]);

if (attrs.powerSource === 0x03) {
  this.powerType = 'battery';
} else if (attrs.powerSource === 0x01) {
  this.powerType = 'mains';
}
```

---

## ⚠️ SDK3 COMPLIANCE - CAPABILITIES OBSOLÈTES

### ❌ CAPABILITIES SUPPRIMÉES DANS SDK3

1. **`alarm_battery`** - N'EXISTE PLUS
   - ⚠️ À REMPLACER par autre méthode ou supprimer

2. **Autres à vérifier**:
   - `alarm_generic` (vérifier si existe encore)
   - `alarm_motion` (vérifier si existe encore)

### ✅ CAPABILITIES SDK3 VALIDES

- `measure_battery` ✅
- `onoff` ✅
- `dim` ✅
- `measure_temperature` ✅
- `measure_humidity` ✅
- `measure_luminance` ✅
- `alarm_contact` ✅ (si existe)
- `alarm_water` ✅ (si existe)

---

## 📊 PLAN D'EXÉCUTION PAR PHASES

### PHASE 1: CORRECTIONS URGENTES ⏱️ 2H
**Objectif**: Fixer les bugs bloquants

1. ✅ **Fixer erreur syntaxe wireless_switch_3button**
   - Analyser device.js line 448
   - Corriger syntaxe JavaScript
   - Tester compilation

2. ✅ **Fixer SOS button IAS Zone**
   - Revoir méthode IEEE address retrieval
   - Utiliser `this.homey.zigbee.ieee` correct
   - Tester enrollment

3. ✅ **Identifier "Big 3 Button Wall"**
   - Analyser diagnostic b3028f16
   - Mapper au bon driver
   - Créer documentation user

4. ✅ **Fixer batterie reporting boutons noirs**
   - Vérifier configureAttributeReporting
   - Tester battery percentage

**Deliverable**: v4.1.7 avec corrections critiques

---

### PHASE 2: AUDIT SDK3 COMPLIANCE ⏱️ 3H
**Objectif**: Identifier & corriger incompatibilités SDK3

1. ✅ **Scanner toutes capabilities obsolètes**
   - Grep `alarm_battery` partout
   - Lister toutes capabilities utilisées
   - Vérifier contre SDK3 docs

2. ✅ **Remplacer capabilities obsolètes**
   - `alarm_battery` → alternative ou supprimer
   - Autres si trouvées

3. ✅ **Vérifier méthodes ZCL obsolètes**
   - `write()` → `writeAttributes()`
   - `read()` → `readAttributes()`
   - Autres deprecated methods

**Deliverable**: Rapport compliance SDK3 + corrections

---

### PHASE 3: FUSION DRIVERS (TRIAL) ⏱️ 4H
**Objectif**: Créer premiers drivers hybrid comme preuve de concept

1. ✅ **Créer driver hybrid template**
   - Wireless switch 1-button (test avec CR2032, CR2450)
   - Auto-detect batterie type
   - Tester avec vrais devices

2. ✅ **Créer smart switch hybrid**
   - Smart switch 1-gang (test avec AC, DC, hybrid)
   - Auto-detect power source
   - Tester fonctionnalités

3. ✅ **Documentation pattern**
   - Comment créer driver hybrid
   - Best practices auto-detection
   - Fallback strategies

**Deliverable**: 2 drivers hybrid fonctionnels + template

---

### PHASE 4: MIGRATION COMPLÈTE ⏱️ 12H
**Objectif**: Migrer tous drivers vers system hybrid

1. ✅ **Grouper drivers par catégorie**
   - Wireless switches (1-8 buttons)
   - Smart switches (1-4 gangs)
   - Sensors (motion, temp, humidity, etc.)
   - Controllers (curtain, blind, valve, etc.)

2. ✅ **Fusionner progressivement**
   - Par catégorie (commencer switches)
   - Tester chaque groupe
   - Backup avant fusion

3. ✅ **Migration manufacturer IDs**
   - Scanner duplicates
   - Fusionner manufacturer IDs intelligemment
   - Éviter conflicts

4. ✅ **Clean-up suffixes**
   - Supprimer `_cr2032`, `_ac`, `_dc`, `_internal`, etc.
   - Renommer folders
   - Update app.json

**Deliverable**: App avec drivers hybrid (~50-60 drivers au lieu de 183)

---

### PHASE 5: TESTING & VALIDATION ⏱️ 4H
**Objectif**: Valider tout fonctionne

1. ✅ **Test matrix**
   - Chaque type de device
   - Chaque type d'alimentation
   - Auto-detection validation

2. ✅ **User acceptance testing**
   - Demander aux users de tester
   - Collect feedback
   - Fix issues

3. ✅ **Documentation user**
   - Guide pairing simplifié
   - FAQ drivers hybrid
   - Troubleshooting

**Deliverable**: v5.0.0 stable & documentée

---

## 🔍 ANALYSE MANUFACTURER IDs

### Problème Actuel
Beaucoup de manufacturer IDs sont dupliqués across drivers, causant:
- Confusion au pairing (quel driver choisir?)
- Devices matchent plusieurs drivers
- Maintenance difficile

### Solution Intelligente

#### **1. Créer Database Centralisée**
```
lib/
  manufacturer-ids/
    database.json  // Tous les IDs mappés aux devices
    validator.js   // Validation no duplicates
```

#### **2. Mapper IDs → Device Types**
```json
{
  "_TZ3000_4fjiwweb": {
    "type": "wireless_switch",
    "buttons": 1,
    "power": "cr2032",
    "capabilities": ["onoff", "measure_battery"]
  },
  "_TZ3000_xabckq1v": {
    "type": "smart_switch",
    "gangs": 1,
    "power": ["ac", "dc", "hybrid"],
    "capabilities": ["onoff", "dim"]
  }
}
```

#### **3. Algorithme Smart Matching**
```javascript
// Au pairing:
1. Lire manufacturer ID + model ID
2. Query database
3. Si multiple matches → demander user de choisir
4. Si unique match → auto-select driver
5. Si no match → suggest generic driver
```

---

## 📝 CHECKLIST AVANT DÉPLOIEMENT

### Code Quality
- [ ] Pas d'erreurs syntaxe
- [ ] Pas de capabilities obsolètes SDK3
- [ ] Pas de méthodes ZCL deprecated
- [ ] Auto-detection power source fonctionne
- [ ] Battery reporting fonctionne
- [ ] IAS Zone enrollment fonctionne

### Testing
- [ ] Test switches 1-8 buttons
- [ ] Test smart switches 1-4 gangs
- [ ] Test sensors (motion, temp, contact)
- [ ] Test controllers (curtain, blind)
- [ ] Test avec batteries différentes (CR2032, CR2450, AAA)
- [ ] Test avec AC/DC/hybrid

### Documentation
- [ ] README updated
- [ ] CHANGELOG updated
- [ ] User guide pairing
- [ ] Developer docs driver hybrid
- [ ] Migration guide pour users

### Deployment
- [ ] Version bumped (v5.0.0)
- [ ] Git commit with detailed message
- [ ] GitHub Actions build OK
- [ ] Homey App Store publication
- [ ] Forum announcement
- [ ] Email users de la refonte

---

## 🎯 RÉSULTAT ATTENDU

### Avant Refonte
- ❌ 183 drivers avec suffixes confusants
- ❌ Duplicate manufacturer IDs
- ❌ User confusion au pairing
- ❌ Maintenance nightmare

### Après Refonte
- ✅ ~50-60 drivers intelligents
- ✅ Auto-detection alimentation
- ✅ Pas de suffixes
- ✅ Manufacturer IDs centralisés
- ✅ Pairing simplifié
- ✅ Maintenance facile
- ✅ SDK3 100% compliant

---

## ⏰ TIMELINE COMPLÈTE

| Phase | Durée | Début | Fin | Status |
|-------|-------|-------|-----|--------|
| Phase 1: Corrections urgentes | 2H | Maintenant | +2H | 🔴 À COMMENCER |
| Phase 2: Audit SDK3 | 3H | +2H | +5H | ⏳ Pending |
| Phase 3: Fusion trial | 4H | +5H | +9H | ⏳ Pending |
| Phase 4: Migration complète | 12H | +9H | +21H | ⏳ Pending |
| Phase 5: Testing & validation | 4H | +21H | +25H | ⏳ Pending |
| **TOTAL** | **25H** | **Maintenant** | **~3 jours** | ⏳ **EN ATTENTE GO** |

---

## 🚀 DÉMARRAGE PHASE 1

**Action Immédiate**: Fixer les 4 bugs critiques  
**Temps Estimé**: 2 heures  
**Deliverable**: v4.1.7 stable

### Ordre d'exécution:
1. **Wireless switch 3button syntaxe** (30 min)
2. **SOS button IAS Zone** (1H)
3. **Identifier Big 3 Button** (15 min)
4. **Battery reporting boutons noirs** (15 min)

---

**Status Global**: ⏰ **EN ATTENTE APPROBATION & GO**  
**Prêt à Démarrer**: ✅ OUI  
**Resources Needed**: Code access + testing devices  
**Risk Level**: 🟡 MOYEN (refonte majeure mais planifiée)
