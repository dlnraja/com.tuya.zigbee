# 🚨 HOTFIX VAGUE 1 - PLAN D'ACTION IMMÉDIAT

## 📋 RÉSUMÉ AUDIT V2

Basé sur l'audit ultra-détaillé, voici les corrections **CRITIQUES** à faire pour restaurer la compatibilité 4.1.11.

---

## 🎯 PROBLÈMES IDENTIFIÉS

### **1. Boutons TS0041/TS004x - Class Socket au lieu de Button**

**Symptôme:**
```
"Le truc USB affiche toujours un gang avec un on/off"
```

**Cause:**
- Drivers comme `switch_wireless_1gang` ont `class: "socket"`
- Smart-Adapt supprime bien onoff/dim mais la **tuile UI reste une prise**
- Homey choisit l'icône basée sur `class` AVANT les capabilities

**Solution:**
✅ Drivers déjà CORRECTS:
- `button_ts0041` - class: "button", capabilities: ["measure_battery"]
- `button_ts0043` - class: "button", capabilities: ["measure_battery"]
- `button_ts0044` - class: "button", capabilities: ["measure_battery"]

⚠️ Drivers À CORRIGER:
- `switch_wireless_1gang` - si c'est un remote (TS0041), renommer ou pointer vers `button_ts0041`
- `button_wireless_1` - vérifier class + capabilities
- `button_wireless_3` - vérifier class + capabilities
- `button_wireless_4` - vérifier class + capabilities

---

### **2. TS0601 Climate - dataQuery API Cassée**

**Symptôme:**
```
[TUYA] dataQuery failed: tuyaSpecific.dataQuery: dp is an unexpected property
```

**Cause:**
API signature changée dans zigbee-clusters. Ancienn: `{dp: X}` → Nouveau: `{dpValues: [{dp: X}]}`

**Solution:**

**Fichier:** `drivers/climate_monitor/device.js` (ou TuyaEF00Manager)

```javascript
// ❌ DEPRECATED (cause l'erreur)
await endpoint.clusters[61184].command('dataQuery', { dp: 101 });

// ✅ CORRECT (nouvelle signature)
await endpoint.clusters[61184].command('dataQuery', {
  dpValues: [{ dp: 101 }]
});
```

**Alternative (MEILLEURE):**
Désactiver dataQuery pour TS0601 Climate (_TZE284_vvmbj46n):
- Ces devices envoient des reports passifs
- Pas besoin de polling actif
- Ajouter flag dans TuyaDPDatabase:
  ```javascript
  {
    manufacturerName: '_TZE284_vvmbj46n',
    supportsActiveQuery: false,
    passiveReportOnly: true
  }
  ```

---

### **3. Soil Sensor - DPs Pas Mappés**

**Symptôme:**
```
measure_temperature = null
measure_humidity = null
measure_humidity.soil = null
measure_battery = 100 ✅
```

**Cause:**
- BatteryManagerV4 fonctionne (battery = 100)
- Mais TuyaDPMapper n'est pas branché pour temp/humidity
- Profil DP manquant pour `_TZE284_oitavov2`

**Solution:**

**1. Ajouter dans TuyaDPDatabase.js:**
```javascript
{
  manufacturerName: '_TZE284_oitavov2',
  productId: 'TS0601',
  name: 'Tuya Soil Moisture Sensor',
  dpMap: {
    1: { name: 'temperature', capability: 'measure_temperature', type: 0x02, divider: 10 },
    2: { name: 'soil_humidity', capability: 'measure_humidity.soil', type: 0x02 },
    4: { name: 'battery', capability: 'measure_battery', type: 0x02 },
    5: { name: 'battery_state', type: 0x04 } // ENUM (optional)
  }
}
```

**2. Vérifier capabilities dans driver.compose.json:**
```json
{
  "capabilities": [
    "measure_temperature",
    "measure_humidity.soil",
    "measure_battery"
  ]
}
```

**3. S'assurer que autoSetup() est appelé dans device.js:**
```javascript
const TuyaDPMapper = require('../../lib/tuya/TuyaDPMapper');

async onNodeInit({ zclNode }) {
  // AUTO DP MAPPING
  await TuyaDPMapper.autoSetup(this, zclNode);

  // Battery V4
  this.batteryManager = new BatteryManagerV4(this, 'CR2032');
  await this.batteryManager.startMonitoring();
}
```

---

### **4. Radar PIR - measure_luminance Manquante**

**Symptôme:**
```
alarm_motion = null
measure_luminance = null
measure_battery = 100 ✅
```

**Cause:**
- Profil DP incomplet pour `_TZE200_rhgsbacq`
- measure_luminance pas mappée

**Solution:**

**1. Ajouter dans TuyaDPDatabase.js:**
```javascript
{
  manufacturerName: '_TZE200_rhgsbacq',
  productId: 'TS0601',
  name: 'Tuya PIR Motion Sensor with Illuminance',
  dpMap: {
    1: { name: 'presence', capability: 'alarm_motion', type: 0x01 }, // BOOL
    4: { name: 'battery', capability: 'measure_battery', type: 0x02 },
    9: { name: 'illuminance', capability: 'measure_luminance', type: 0x02 }, // lux
    // TODO: Ajouter autres DPs (distance, sensibilité) via DP Discovery
  }
}
```

**2. Ajouter capability dans driver.compose.json:**
```json
{
  "capabilities": [
    "alarm_motion",
    "measure_luminance",
    "measure_battery"
  ]
}
```

**3. Activer DP Discovery mode temporairement:**
```javascript
// Dans settings ou device.js
if (this.getSetting('dp_discovery_mode')) {
  this.dpDiscovery = new TuyaDPDiscovery(this);
  this.dpDiscovery.startDiscovery();
  this.log('[RADAR] DP Discovery active - interact with device!');
}
```

---

### **5. Batteries - UI Pas Visible**

**Symptôme:**
```
"les autres devices n'ont pas la carte avec l'affichage du pourcentage de batterie"
```

**Cause:**
- Valeurs internes OK (measure_battery = X%)
- Mais mobile.card custom peut cacher la batterie
- Ou alarm_battery manquante

**Solution:**

**1. S'assurer alarm_battery existe:**
```javascript
// Dans BatteryManagerV4 ou device.js
await this.setCapabilityValue('measure_battery', percentage);
await this.setCapabilityValue('alarm_battery', percentage <= threshold);
```

**2. Déclarer statiquement dans driver.compose.json:**
```json
{
  "capabilities": [
    "measure_battery",
    "alarm_battery",
    "..."
  ]
}
```

**3. Ne PAS override mobile.card sauf si nécessaire:**
Laisser Homey générer la carte par défaut avec l'icône batterie.

---

## 📊 PRIORITÉS VAGUE 1

### **Priority 1: Boutons (TS0041/TS004x)** 🔴

**Action immédiate:**
1. Auditer tous les drivers `button_*` et `switch_wireless_*`
2. Vérifier class = "button" (pas socket/light)
3. Vérifier capabilities = ["measure_battery"] uniquement
4. Supprimer onoff/dim/levelControl des driver.compose.json

**Drivers à vérifier:**
- ✅ button_ts0041 (CORRECT)
- ✅ button_ts0043 (CORRECT)
- ✅ button_ts0044 (CORRECT)
- ⚠️ button_wireless_1
- ⚠️ button_wireless_3
- ⚠️ button_wireless_4
- ⚠️ switch_wireless_1gang (si remote)

---

### **Priority 2: TS0601 Climate** 🟠

**Action immédiate:**
1. Fix dataQuery API signature
2. OU désactiver dataQuery (passive reports only)
3. Vérifier TuyaDPMapper.autoSetup() est appelé
4. Tester sur device réel

**Fichiers:**
- `drivers/climate_monitor/device.js`
- `lib/tuya/TuyaEF00Manager.js`
- `lib/tuya/TuyaDPDatabase.js`

---

### **Priority 3: Soil Sensor** 🟡

**Action immédiate:**
1. Ajouter profil complet dans TuyaDPDatabase
2. Vérifier capabilities dans driver.compose.json
3. Appeler TuyaDPMapper.autoSetup()
4. Tester

**Fichiers:**
- `drivers/climate_sensor_soil/driver.compose.json`
- `drivers/climate_sensor_soil/device.js`
- `lib/tuya/TuyaDPDatabase.js`

---

### **Priority 4: Radar PIR** 🟢

**Action immédiate:**
1. Ajouter measure_luminance dans profil DP
2. Activer DP Discovery pour enrichir
3. Tester

**Fichiers:**
- `drivers/presence_sensor_radar/driver.compose.json`
- `drivers/presence_sensor_radar/device.js`
- `lib/tuya/TuyaDPDatabase.js`

---

### **Priority 5: Batteries UI** 🔵

**Action immédiate:**
1. Ajouter alarm_battery partout
2. Déclarer capabilities statiquement
3. Éviter mobile.card custom
4. Logs BatteryManagerV4

**Fichiers:**
- Tous drivers sur batterie
- `lib/BatteryManagerV4.js`

---

## 🔧 VAGUE 2: STABILISATION CORE V4

### **1. BatteryManagerV4 - Logs & setCapabilityValue**

```javascript
// Ajouter logs clairs
async updateBattery(percentage) {
  this.log(`[BATTERY-V4] 🔋 Updating battery: ${percentage}%`);
  await this.device.setCapabilityValue('measure_battery', percentage);

  const threshold = this.device.getSetting('battery_low_threshold') || 20;
  const isLow = percentage <= threshold;
  await this.device.setCapabilityValue('alarm_battery', isLow);

  this.log(`[BATTERY-V4] ✅ Battery updated: ${percentage}%, alarm: ${isLow}`);
}
```

---

### **2. Tuya DP vs Standard Zigbee - Séparation Nette**

```javascript
// Dans SmartAdaptManager ou device init
isTuyaDPDevice() {
  const tuya = this.getStoreValue('tuya_dp_device');
  const is0xEF00 = this.manufacturerName?.startsWith('_TZE');
  return tuya || is0xEF00;
}

async onNodeInit({ zclNode }) {
  if (this.isTuyaDPDevice()) {
    // ✅ Tuya path
    this.log('[TUYA-DP] Device uses 0xEF00 - skipping standard cluster config');

    // NO standard ZCL reporting
    // Use TuyaDPMapper
    await TuyaDPMapper.autoSetup(this, zclNode);
  } else {
    // ✅ Standard Zigbee path
    this.log('[STANDARD-ZCL] Configuring standard Zigbee clusters');

    // Use standard cluster reporting
    this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT);
  }
}
```

---

### **3. Documentation MIGRATION_V4 - Known Regressions**

Ajouter section dans `MIGRATION_V4_GUIDE.md`:

```markdown
## 🐛 Known Regressions vs 4.1.11

### Fixed in v5.0.0:
- ✅ TS0041/TS004x buttons showing as sockets → Fixed: class="button"
- ✅ TS0601 Climate dataQuery errors → Fixed: dpValues signature
- ✅ Soil sensor null values → Fixed: DP mapping
- ✅ Radar luminance missing → Fixed: DP profile

### In Progress:
- 🔄 Battery UI visibility (mobile.card)
- 🔄 Remaining driver migrations to V4

### Known Issues:
- ⚠️ Some TS0601 devices require passive-only mode (no active dataQuery)
```

---

## 📝 CHECKLIST FINALE VAGUE 1

### **Boutons:**
- [ ] Auditer tous button_* drivers
- [ ] Vérifier class="button"
- [ ] Supprimer onoff/dim
- [ ] Tester sur TS0041

### **Climate:**
- [ ] Fix dataQuery signature OU disable
- [ ] Vérifier autoSetup()
- [ ] Tester report passifs

### **Soil:**
- [ ] Ajouter profil DP complet
- [ ] Vérifier capabilities
- [ ] Tester temp/humidity

### **Radar:**
- [ ] Ajouter measure_luminance
- [ ] Activer DP Discovery
- [ ] Enrichir profil

### **Batteries:**
- [ ] Ajouter alarm_battery partout
- [ ] Logs BatteryManagerV4
- [ ] Tester UI

---

## 🎯 RÉSULTATS ATTENDUS

Après Vague 1, l'utilisateur devrait voir:
- ✅ TS0041 apparaît comme **bouton** avec icône battery (pas prise)
- ✅ Climate Monitor remonte **temp + humidity** (pas d'erreurs dataQuery)
- ✅ Soil Sensor affiche **temp + soil humidity + battery**
- ✅ Radar montre **motion + luminance + battery**
- ✅ Toutes les batteries ont **icône battery** visible

---

## 📚 FICHIERS PRIORITAIRES À MODIFIER

| Fichier | Action | Priority |
|---------|--------|----------|
| `drivers/button_wireless_1/driver.compose.json` | Audit class/capabilities | 🔴 P1 |
| `drivers/climate_monitor/device.js` | Fix dataQuery | 🟠 P2 |
| `lib/tuya/TuyaEF00Manager.js` | Fix dataQuery signature | 🟠 P2 |
| `drivers/climate_sensor_soil/device.js` | Add autoSetup() | 🟡 P3 |
| `lib/tuya/TuyaDPDatabase.js` | Add soil profile | 🟡 P3 |
| `drivers/presence_sensor_radar/device.js` | Add luminance | 🟢 P4 |
| `lib/BatteryManagerV4.js` | Add logs | 🔵 P5 |

---

**Version:** Vague 1 Action Plan
**Date:** Nov 23, 2025
**Status:** READY TO IMPLEMENT 🚀
