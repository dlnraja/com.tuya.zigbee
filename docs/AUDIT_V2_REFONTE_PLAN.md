# 🎯 AUDIT V2 - PLAN DE REFONTE MAJEURE

**Date:** 2025-11-22
**Status:** 🔴 REFONTE CRITIQUE EN COURS
**Objectif:** Aligner l'app avec les guidelines Homey et stabiliser comme les apps production

---

## 📋 PROBLÈMES IDENTIFIÉS (Audit complet)

### 1. **Smart-Adapt trop agressif** 🔴 CRITIQUE
**Problème:**
- Modifie capabilities dynamiquement (add/remove onoff, dim, etc.)
- Transforme des switches en buttons automatiquement
- Comportement imprévisible pour l'utilisateur
- Peter's issue: "wireless button" au lieu de "1-gang switch"

**Ce que font les apps stables:**
- Drivers statiques avec capabilities fixes
- Pas de chirurgie runtime sur les devices
- Smart-Adapt = outil d'analyse, pas de modification auto

**Solution:**
```javascript
// Mode read-only par défaut
const SMART_ADAPT_MODE = this.homey.settings.get('experimental_smart_adapt') || false;

if (SMART_ADAPT_MODE) {
  // Mode actuel: modifications dynamiques
  this.log('[SMART-ADAPT] EXPERIMENTAL MODE: Auto-adapting capabilities');
} else {
  // Mode production: analyse only
  this.log('[SMART-ADAPT] ANALYSIS MODE: Logging suggestions only');
  // Ne fait que logger, ne modifie rien
}
```

---

### 2. **TS004x - Confusion Button vs Switch** 🔴 CRITIQUE
**Problème:**
- TS0041/TS0043/TS0044 traités comme buttons ET switches
- Smart-Adapt supprime onoff/dim → casse les switches réels
- Drivers hybrides → comportement change entre versions

**Ce que font les apps stables:**
- Drivers séparés:
  - `button_wireless_1` → class: button, Flow cards only
  - `switch_wall_1gang` → class: socket, onoff capability

**Solution:**
Créer drivers dédiés:
```
drivers/
  button_wireless_1/     # TS0041 - Remote only
  button_wireless_3/     # TS0043 - Remote only
  button_wireless_4/     # TS0044 - Remote only
  switch_wall_1gang/     # TS0001/TS0011 - Switch only
```

**Flow Cards (buttons):**
- "When button 1 pressed"
- "When button 1 double pressed"
- "When button 1 long pressed"
- NO onoff, NO dim

---

### 3. **TS0601 Tuya DP - API cassée** 🔴 CRITIQUE
**Problème:**
```
[TUYA] dataQuery failed: tuyaSpecific.dataQuery: dp is an unexpected property
```
- API zigbee-clusters a changé
- `dp` n'est plus reconnu → doit être `dpValues` ou autre
- Valeurs restent à `null` pour temperature, humidity, soil, radar
- Fallback sendFrame échoue: "Impossible de joindre l'appareil"

**Ce que font les apps stables:**
- S'appuient sur attribute reporting (pas query polling)
- Subscribe à `tuyaData` events
- Parse DP via table statique

**Solution:**
1. **Fixer dataQuery signature:**
```javascript
// ❌ Ancien (cassé)
await this.zclNode.endpoints[1].clusters.tuyaSpecific.dataQuery({
  dp: 1
});

// ✅ Nouveau (correct)
await this.zclNode.endpoints[1].clusters.tuyaSpecific.dataQuery({
  dpValues: [{ dp: 1, datatype: 2, value: 0 }]
});
```

2. **Subscribe aux events DP:**
```javascript
this.registerAttrReportListener('tuyaSpecific', 'dataReport', (data) => {
  this.onTuyaData(data);
}, 1);

onTuyaData(data) {
  const dpMap = this.getStoreValue('tuya_dp_configuration') || {};

  data.dpValues.forEach(dp => {
    const capabilityName = dpMap[dp.dp];
    if (capabilityName) {
      const value = this.convertTuyaDpValue(dp);
      this.setCapabilityValue(capabilityName, value);
    }
  });
}
```

3. **Tables DP statiques par modèle:**
```javascript
// drivers/climate_sensor_soil/tuya_dp_map.js
module.exports = {
  '_TZE284_oitavov2': {
    1: { capability: 'measure_temperature', divisor: 10 },
    2: { capability: 'measure_humidity', divisor: 1 },
    3: { capability: 'measure_humidity.soil', divisor: 1 },
    4: { capability: 'measure_battery', divisor: 1 }
  }
};
```

---

### 4. **Batterie incohérente** 🟡 IMPORTANT
**Problème:**
- `measure_battery` ajouté dynamiquement → UI incohérente
- Valeur figée à 100% (new_device_assumption)
- Polling toutes les 5 minutes → tue la batterie
- "Les autres devices n'ont pas la carte avec l'affichage du pourcentage"

**Ce que font les apps stables:**
- `measure_battery` statique dans `driver.compose.json`
- Lecture simple: Tuya DP ou cluster 0x0001
- Polling 1-4h, ou reporting only

**Solution:**
1. **Déclarer statiquement:**
```json
// driver.compose.json
{
  "capabilities": [
    "onoff",
    "measure_battery"
  ]
}
```

2. **Simplifier Battery-Reader:**
```javascript
async readBattery() {
  // 1. Tuya DP (priorité)
  if (this.isTuyaDpDevice()) {
    const dp = this.getTuyaBatteryDp(); // Ex: DP 4
    return await this.readTuyaDp(dp);
  }

  // 2. Cluster PowerConfiguration
  if (this.hasCluster(0x0001)) {
    return await this.readZclBattery();
  }

  // 3. Pas de batterie
  return null; // Pas de 100% fictif
}
```

3. **Polling raisonnable:**
```javascript
// Secteur: pas de batterie
// Batterie: 1-4h selon type
const BATTERY_INTERVALS = {
  motion: 4 * 3600, // 4h
  contact: 4 * 3600,
  climate: 2 * 3600, // 2h
  button: 6 * 3600   // 6h
};
```

---

### 5. **Architecture désalignée** 🟡 IMPORTANT
**Problème:**
- Classes incohérentes (socket pour button, etc.)
- Capabilities dynamiques vs statiques
- Flow Cards mal alignées

**Ce que recommande Homey:**
- `class: socket` → prises, onoff
- `class: button` → remotes, Flow scenes only
- `class: sensor` → climate, motion, contact
- `class: light` → bulbs, dim, color

**Solution:**
Réorganiser tous les drivers:
```
button_wireless_1/      class: button
button_wireless_3/      class: button
button_wireless_4/      class: button
switch_wall_1gang/      class: socket
switch_wall_2gang/      class: socket
climate_sensor_soil/    class: sensor
motion_sensor_pir/      class: sensor
plug_energy_monitor/    class: socket
```

---

## 🚀 PLAN DE CORRECTION (Ordre d'attaque)

### **PHASE 1: Stabilisation immédiate** (2-3h)

#### 1.1. Créer flag Developer Debug Mode
```javascript
// app.json - settings
{
  "id": "developer_debug_mode",
  "type": "checkbox",
  "label": { "en": "Developer Debug Mode" },
  "value": false,
  "hint": { "en": "Enable verbose logging for debugging (impacts performance)" }
}
```

#### 1.2. Geler Smart-Adapt
```javascript
// Wrapper pour toutes les modifications de capabilities
async modifyCapability(action, capability) {
  const debugMode = this.homey.settings.get('developer_debug_mode');

  if (!debugMode) {
    this.log(`[SMART-ADAPT] ANALYSIS: Would ${action} capability: ${capability}`);
    return; // Ne fait rien
  }

  // Mode expérimental seulement
  this.log(`[SMART-ADAPT] EXPERIMENTAL: ${action} capability: ${capability}`);
  // ... modification réelle
}
```

#### 1.3. Fixer API Tuya dataQuery
```javascript
// Chercher tous les appels à dataQuery
// Remplacer par nouvelle signature
```

---

### **PHASE 2: Drivers propres TS004x** (4-5h)

#### 2.1. button_wireless_1 (TS0041)
```json
{
  "name": { "en": "Wireless Button (1 button)" },
  "class": "button",
  "capabilities": ["measure_battery"],
  "zigbee": {
    "manufacturerName": ["_TZ3000_*"],
    "productId": ["TS0041"]
  }
}
```

**Flow Cards:**
- `button_1_pressed`
- `button_1_double`
- `button_1_long`

#### 2.2. button_wireless_3 (TS0043)
```json
{
  "class": "button",
  "capabilities": ["measure_battery"],
  "productId": ["TS0043"]
}
```

**Flow Cards:**
- `button_1_pressed`, `button_2_pressed`, `button_3_pressed`
- `button_1_double`, `button_2_double`, `button_3_double`
- `button_1_long`, `button_2_long`, `button_3_long`

#### 2.3. button_wireless_4 (TS0044)
Même pattern, 4 boutons

---

### **PHASE 3: Batterie simple** (2-3h)

#### 3.1. Déclarer statiquement
Tous les drivers sur batterie:
```json
"capabilities": ["measure_battery"]
```

#### 3.2. Simplifier Battery-Reader
- Priorité 1: Tuya DP
- Priorité 2: Cluster 0x0001
- Priorité 3: null (pas de valeur fictive)

#### 3.3. Polling raisonnable
- Motion/Contact: 4h
- Climate: 2h
- Button: 6h
- **PAS de 5 minutes!**

---

### **PHASE 4: TS0601 Tuya DP fix** (6-8h)

#### 4.1. Corriger dataQuery
Nouvelle API zigbee-clusters

#### 4.2. Event-based reporting
Subscribe à `tuyaData` events

#### 4.3. Tables DP statiques
Pour chaque _TZE2xx_ connu:
- climate_sensor_soil
- climate_monitor_temp_humidity
- presence_sensor_radar

---

### **PHASE 5: Architecture & Flow Cards** (4-6h)

#### 5.1. Réorganiser classes
- Buttons → `class: button`
- Switches → `class: socket`
- Sensors → `class: sensor`

#### 5.2. Flow Cards statiques
Déclarer dans `.homeycompose/flow/`

#### 5.3. Cleanup capabilities
Retirer capabilities dynamiques inutiles

---

## 📊 MÉTRIQUES DE SUCCÈS

### Avant (4.9.x):
- ❌ TS004x = confusion button/switch
- ❌ TS0601 = valeurs null
- ❌ Batterie = 100% figé
- ❌ Smart-Adapt = modifications auto
- ❌ Classes incohérentes

### Après (v5.0.0 - "Stable Edition"):
- ✅ TS004x = buttons propres, Flow cards
- ✅ TS0601 = valeurs réelles (temp/humidity/soil)
- ✅ Batterie = lecture simple, valeurs vraies
- ✅ Smart-Adapt = analyse only (debug mode)
- ✅ Classes alignées Homey guidelines

---

## 🔧 DRIVERS À REFAIRE (Priorité)

### Critique (ASAP):
1. **button_wireless_1** (TS0041)
2. **button_wireless_3** (TS0043)
3. **button_wireless_4** (TS0044)
4. **climate_sensor_soil** (TS0601 _TZE284_oitavov2)
5. **climate_monitor_temp_humidity** (TS0601 _TZE284_vvmbj46n)
6. **presence_sensor_radar** (TS0601 _TZE200_rhgsbacq)

### Important:
7. **sos_button** (TS0215A)
8. **switch_wall_1gang** (TS0001/TS0011)
9. **motion_sensor_pir** (TS0202)
10. **contact_sensor** (TS0203)

---

## 📝 ACTIONS IMMÉDIATES

Je vais maintenant:
1. ✅ Créer le flag Developer Debug Mode
2. ✅ Créer le wrapper Smart-Adapt read-only
3. ✅ Rechercher et documenter tous les appels dataQuery
4. ✅ Créer les templates de drivers propres TS004x
5. ✅ Créer le nouveau BatteryManager simplifié

**Prêt à commencer? On y va! 🚀**

---

**Créé:** 2025-11-22
**Status:** 🔴 REFONTE EN COURS
**Target:** v5.0.0 "Stable Edition"
