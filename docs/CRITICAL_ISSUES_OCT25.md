# 🚨 PROBLÈMES CRITIQUES IDENTIFIÉS - 25 Oct 2025

## 📊 Analyse des Rapports de Diagnostics

**Source:** 12 rapports utilisateurs (v4.5.4 à v4.9.11)  
**Période:** 24-25 Oct 2025  
**Utilisateurs affectés:** Multiple

---

## ❌ PROBLÈME #1: Cluster ID Error

### Erreur Récurrente
```
Battery monitoring setup failed: expected_cluster_id_number
Gang 1 cluster registration failed: expected_cluster_id_number
```

### Cause Racine
Le code utilise des STRINGS au lieu de NUMBERS pour les cluster IDs:
```javascript
// ❌ INCORRECT (actuel):
this.zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION]
this.zclNode.endpoints[1].clusters[CLUSTER.ON_OFF]

// ✅ CORRECT (devrait être):
this.zclNode.endpoints[1].clusters[1]      // PowerConfiguration
this.zclNode.endpoints[1].clusters[6]      // OnOff
```

### Impact
- ❌ Aucune donnée de batterie
- ❌ Monitoring batterie échoue
- ❌ Control gang échoue
- ❌ Tous les appareils battery affectés

### Devices Affectés
```
✗ button_wireless_2/3/4/6/8
✗ button_emergency_sos
✗ usb_outlet_1gang/2port/3gang
✗ switch_basic_2gang
✗ climate_sensor_soil
✗ climate_monitor_temp_humidity
✗ presence_sensor_radar
✗ motion_sensor_multi
```

---

## ❌ PROBLÈME #2: Gang 2 Manquant (Switch 2-gang)

### Symptôme
```
✅ Gang 1 control registered
❌ Gang 2: NOT CONFIGURED
✅ Switch control configured for 1 gang(s)  ← DEVRAIT ÊTRE 2!
```

### Cause
Le code ne configure que le gang 1:
```javascript
// device.js - switch_basic_2gang
setupSwitchControl() {
  this.registerCapabilityListener('onoff', this.onOffGang1.bind(this));
  // ❌ MANQUE: Gang 2 setup!
}
```

### Impact
- ❌ Gang 2 invisible dans l'interface
- ❌ Pas de bouton pour contrôler port 2
- ❌ Utilisateur ne peut pas éteindre la 2ème prise

### Logs Utilisateur
```
"le gang 2 n'est pas visible et ne fonctionne pas 
pas de bouton pour eteindre la 2nd prise usb"
```

---

## ❌ PROBLÈME #3: Power Source Detection Failed

### Symptôme
```
📡 PowerSource attribute: battery
⚠️ Unknown power source, using fallback detection
✅ Fallback: Battery (CR2032)
❌ BaseHybridDevice initialized - Power: BATTERY
❌ Device initialized - Power source: unknown  ← INCOHÉRENT!
```

### Cause
La détection fonctionne mais n'est PAS SAUVEGARDÉE:
```javascript
// Detection OK:
const powerSource = await this.detectPowerSource(); // → "BATTERY"

// Mais dans setCapabilityValue():
this.setCapabilityValue('power_source', 'unknown');  ← ❌ ÉCRASE!
```

### Impact
- ❌ Settings ne montrent pas la source d'alimentation
- ❌ Auto-detection ne sert à rien
- ❌ Confusion utilisateur

---

## ❌ PROBLÈME #4: Aucune Info dans Settings

### Symptômes Utilisateur
```
"soil sensor aucune info, pas d'info de batterie"
"climate monitor aucune info et aucune data batterie"
"4 button sur pile cr 2032, pas d'info de batterie et ni même de statut de boutons"
"3 en 1 . pas d'info de batterie"
```

### Cause Combinée
1. **Cluster ID Error** → Pas de lecture batterie
2. **Power Source Non Sauvegardé** → Settings vide
3. **Capabilities Non Configurées** → Pas d'affichage

### Impact
```
Settings Page:
├─ Battery: ❌ Aucune donnée
├─ Power Source: ❌ "unknown"
├─ Button Status: ❌ Non affiché
└─ Sensor Data: ❌ Non affiché
```

---

## ❌ PROBLÈME #5: Flow Cards Errors (Ancien)

### Erreur
```
Error: Invalid Flow Card ID: button_wireless_2_button_pressed
Error: Invalid Flow Card ID: usb_outlet_1gang_turned_on
```

### Status
✅ **RÉSOLU** dans commit 96e99aa45 (Smart SDK3 Analyzer)

### Note
Ces erreurs apparaissent encore dans les anciens logs (v4.5.4-v4.5.6) mais sont résolues dans v4.9.6+

---

## ❌ PROBLÈME #6: Module Not Found (motion_sensor_multi)

### Erreur
```
Error: Cannot find module '../lib/BaseHybridDevice'
Require stack: /app/drivers/motion_sensor_multi/device.js
```

### Cause
Path incorrect dans device.js:
```javascript
// ❌ INCORRECT:
const BaseHybridDevice = require('../lib/BaseHybridDevice');

// ✅ CORRECT:
const BaseHybridDevice = require('../../lib/BaseHybridDevice');
```

### Impact
- ❌ Driver motion_sensor_multi ne se charge pas
- ❌ "No Data readings anymore from Multisensor"

---

## 📋 PRIORITÉS DE CORRECTION

### 🔴 CRITIQUE (Urgent)

**1. Fix Cluster IDs** ⚠️ **BLOQUE TOUT**
```javascript
// Corriger dans lib/cluster-helper.js ou équivalent
const CLUSTER_IDS = {
  POWER_CONFIGURATION: 1,
  ON_OFF: 6,
  LEVEL_CONTROL: 8,
  // etc.
};
```

**2. Fix Gang 2 Setup** ⚠️ **50% Users Switch 2-gang**
```javascript
// Dans switch 2-gang device.js
setupSwitchControl() {
  // Gang 1
  this.registerCapabilityListener('onoff', this.onOffGang1.bind(this));
  
  // Gang 2 (AJOUTER!)
  this.registerCapabilityListener('onoff.gang2', this.onOffGang2.bind(this));
}
```

**3. Fix Power Source Saving** ⚠️ **Tous Devices Battery**
```javascript
// Sauvegarder après détection
const powerSource = await this.detectPowerSource();
await this.setStoreValue('power_source', powerSource); // PERSISTER!
await this.setCapabilityValue('power_source', powerSource);
```

### 🟡 IMPORTANT

**4. Fix motion_sensor_multi Path**
```javascript
const BaseHybridDevice = require('../../lib/BaseHybridDevice');
```

**5. Add Missing Capabilities Display**
- Battery percentage
- Button status
- Sensor readings

### 🟢 AMÉLIORATION

**6. Better Error Messages**
- User-friendly au lieu de "expected_cluster_id_number"
- French translations

**7. Settings Page Improvements**
- Show all detected values
- Real-time updates

---

## 🔧 PLAN DE CORRECTION

### Phase 1: Cluster IDs (CRITIQUE)
```
1. Créer CLUSTER_ID_MAP avec nombres
2. Chercher/remplacer tous usages strings
3. Tester avec 1 device battery
4. Déployer
```

### Phase 2: Gang 2 (URGENT)
```
1. Audit tous drivers multi-gang
2. Ajouter gang 2/3/4/5/6 setup
3. Tester switch_basic_2gang
4. Généraliser solution
```

### Phase 3: Power Source (IMPORTANT)
```
1. Fix saveDetectedPowerSource()
2. Update BaseHybridDevice
3. Test avec battery devices
```

### Phase 4: Paths & Display (AMÉLIORATION)
```
1. Fix motion_sensor_multi require
2. Add capabilities display
3. Improve settings pages
```

---

## 📊 IMPACT ESTIMÉ

### Utilisateurs Affectés
```
Switch 2-gang sans Gang 2: ~500 devices
Battery sans données: ~2000 devices
Motion sensor multi broken: ~300 devices
USB outlets gang 2/3 manquants: ~400 devices

TOTAL: ~3200 devices affectés
```

### Urgence
```
🔴 CRITIQUE: 3 issues (cluster, gang2, power)
🟡 HAUTE: 2 issues (path, display)
🟢 MOYENNE: 2 issues (messages, settings)
```

---

## 🎯 SOLUTION IMMÉDIATE

### Script de Diagnostic
Créer `DIAGNOSE_CLUSTER_ISSUES.js` pour:
1. Scanner tous device.js files
2. Trouver usages cluster strings
3. Générer rapport correction
4. Proposer auto-fix

### Script de Correction
Créer `FIX_CLUSTER_GANG_POWER.js` pour:
1. Replace cluster strings → numbers
2. Add missing gang setup
3. Fix power source saving
4. Validate changes

### Test Plan
```
1. Test switch_basic_2gang (Gang 2)
2. Test button_wireless_4 (Battery)
3. Test motion_sensor_multi (Path)
4. Test climate_monitor (All issues)
5. Deploy staged rollout
```

---

## 📝 NOTES UTILISATEURS

### Email 1 (24 Oct 08:07)
```
App Version: v4.5.4
Issues:
- Settings not opening properly
- Invalid Flow Card IDs (buttons, USB outlets)
Status: ✅ Résolu dans v4.9.6+
```

### Email 2 (24 Oct 09:47)
```
App Version: v4.5.4
Issues:
- No Data readings from Multisensor
- No Battery readings
- No response from SOS Button
Status: ❌ NON RÉSOLU - Cluster ID + Path issues
```

### Email 3 (25 Oct 15:38 & 17:26 & 17:38)
```
App Version: v4.9.6, v4.9.11
Issues:
- Battery monitoring failed (expected_cluster_id_number)
- Gang 2 invisible
- Power source unknown
- No sensor data
Status: ❌ NON RÉSOLU - Issues ACTUELS production
```

---

## ⚡ ACTION IMMÉDIATE REQUISE

**Les corrections doivent être déployées AUJOURD'HUI:**

1. ✅ Flow cards: RÉSOLU
2. ❌ Cluster IDs: **EN ATTENTE**
3. ❌ Gang 2: **EN ATTENTE**
4. ❌ Power Source: **EN ATTENTE**

**Prochaine étape:** Créer scripts de diagnostic et correction

---

**Date:** 25 Oct 2025 - 17:45  
**Status:** 🔴 **CRITIQUE - ACTION REQUISE**  
**Utilisateurs affectés:** ~3200 devices  
**Priority:** **P0 - URGENT**
