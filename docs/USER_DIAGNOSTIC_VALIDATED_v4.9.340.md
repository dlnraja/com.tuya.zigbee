# ✅ DIAGNOSTIC UTILISATEUR VALIDÉ - PLAN PATCH v4.9.340

**Date:** 2025-11-15 16:02
**Source:** Analyse logs utilisateur détaillés
**Status:** ✅ 100% VALIDÉ - Implémentation en cours

---

## 🎯 VALIDATION COMPLÈTE DU DIAGNOSTIC

Votre analyse est **parfaite** et identifie exactement les root causes:

| Problème | Votre Diagnostic | Notre Analyse | Status |
|----------|------------------|---------------|--------|
| **Switch TS0002** | Mappé dans driver 1-gang | ✅ IDENTIQUE | ✅ VALIDÉ |
| **Batteries 50%** | Manque configureReporting | ✅ IDENTIQUE | ✅ VALIDÉ |
| **TS0601 null** | Détection DP + mapping | ✅ IDENTIQUE | ✅ VALIDÉ |
| **Boutons batterie** | ClusterConfig battery:false | ✅ IDENTIQUE | ✅ VALIDÉ |
| **Boutons events** | Single endpoint listener | ✅ IDENTIQUE | ✅ VALIDÉ |

---

## 📋 PLAN PATCH v4.9.340 - PRIORISÉ

### 🔥 PRIORITÉ 1: Battery Reporting (GLOBAL)

**Problème Exact:**
```javascript
// ClusterConfig actuel
{
  battery: false,  // ❌ DÉSACTIVÉ
  power: false,
  climate: false,
  onoff: false,
  level: false
}

// Résultat
- Pas de configureReporting
- Pas de listener attr.batteryPercentageRemaining
- measure_battery reste à 50 (default Homey)
```

**Solution Proposée (VALIDÉE):**
```javascript
// 1. Fix ClusterConfig - basé sur capabilities
const wantsBattery = this.hasCapability('measure_battery');
const config = {
  battery: wantsBattery,  // ✅ TRUE si capability présente
  // ...
};

// 2. Helper générique
async _configureBatteryReporting() {
  const endpoint = this.zclNode.endpoints[1];
  if (!endpoint || !endpoint.clusters.powerConfiguration) return;

  await endpoint.clusters.powerConfiguration.configureReporting({
    batteryPercentageRemaining: {
      minInterval: 3600,    // 1h
      maxInterval: 43200,   // 12h
      minChange: 1          // 1% (2 en Zigbee)
    },
  }).catch(this.error);

  endpoint.clusters.powerConfiguration.on(
    'attr.batteryPercentageRemaining',
    value => {
      const percent = value / 2; // 0–200 → 0–100
      this.setCapabilityValue('measure_battery', percent)
          .catch(this.error);
    }
  );
}
```

**Fichiers à Modifier:**
1. `lib/utils/cluster-config.js` (ou équivalent) - Fix detection
2. `lib/devices/BaseHybridDevice.js` - Add _configureBatteryReporting()
3. `lib/utils/battery-reader.js` - Add fallback to powerConfiguration

**Effort:** 2h
**Impact:** TOUS devices avec measure_battery

---

### 🔥 PRIORITÉ 2: TS0601 Tuya DP (Climate/Soil/Radar)

**Problème Exact:**
```javascript
// BatteryReader log
Climate Monitor: "Tuya DP device detected" ✅
Soil Tester: "Not a Tuya DP device" ❌ FAUX!
Radar: "Not a Tuya DP device" ❌ FAUX!

// Tous sont TS0601 avec tuya_dp_configuration settings
```

**Solution Proposée (VALIDÉE):**
```javascript
// 1. Force Tuya DP detection
// drivers/sensor_climate_ts0601/device.js (ou base TS0601Device)

async onNodeInit() {
  // Force Tuya DP mode
  this.usesTuyaDP = true;
  this.hasTuyaCluster = true;

  // Ou condition sur settings
  if (this.getSetting('tuya_dp_configuration')) {
    this.usesTuyaDP = true;
    this.hasTuyaCluster = true;
  }

  await super.onNodeInit();
}

// 2. Fix DP mapping
onDataPoint(dpId, value) {
  const mapping = this.getSetting('tuya_dp_configuration') || {};
  const capabilityName = mapping[dpId];

  switch (capabilityName) {
    case 'temperature':
      this.setCapabilityValue('measure_temperature', value / 10);
      break;
    case 'humidity':
      this.setCapabilityValue('measure_humidity', value);
      break;
    case 'soil_humidity':
      this.setCapabilityValue('measure_humidity.soil', value);
      break;
    case 'battery_percentage':
      this.setCapabilityValue('measure_battery', value);
      break;
    case 'motion':
      this.setCapabilityValue('alarm_motion', !!value);
      break;
  }
}
```

**Fichiers à Modifier:**
1. `lib/tuya/TuyaEF00Manager.js` - Force usesTuyaDP si settings
2. `lib/utils/IntelligentProtocolRouter.js` - Override detection
3. Drivers TS0601 individuels - Add onDataPoint mapping

**Effort:** 1h
**Impact:** Climate Monitor, Soil Tester, Presence Radar

---

### 🔥 PRIORITÉ 3: Boutons TS0043/TS0044 Multi-Endpoint

**Problème Exact:**
```javascript
// CMD-LISTENER actuel
[CMD-LISTENER]   - scenes: not present

// Ne regarde que endpoint[1]
// Alors que TS0044 a 4 endpoints (1-4)
```

**Solution Proposée (VALIDÉE):**
```javascript
// drivers/button_wireless_4/device.js

_onInitCommandListeners() {
  const endpoints = this.zclNode.endpoints || {};

  for (const [epId, endpoint] of Object.entries(endpoints)) {
    const id = Number(epId);

    if (endpoint.clusters.onOff) {
      endpoint.clusters.onOff.on('commandOn', () => this._onButtonPress(id, 'single'));
      endpoint.clusters.onOff.on('commandOff', () => this._onButtonPress(id, 'single'));
    }

    if (endpoint.clusters.levelControl) {
      endpoint.clusters.levelControl.on('commandMove', () => this._onButtonPress(id, 'hold'));
      endpoint.clusters.levelControl.on('commandStep', () => this._onButtonPress(id, 'double'));
    }

    if (endpoint.clusters.scenes) {
      endpoint.clusters.scenes.on('commandRecall', (payload) =>
        this._onScene(id, payload)
      );
    }
  }
}

_onButtonPress(buttonIndex, gesture) {
  // Ex: buttonIndex 1–4, gesture: 'single' | 'double' | 'hold'
  this.setCapabilityValue('alarm_generic', true).catch(this.error);

  this.homey.flow
    .getDeviceTriggerCard(`button_${buttonIndex}_${gesture}`)
    .trigger(this, {})
    .catch(this.error);

  // Reset après un court délai
  this.homey.setTimeout(() => {
    this.setCapabilityValue('alarm_generic', false).catch(this.error);
  }, 500);
}
```

**Fichiers à Modifier:**
1. `drivers/button_wireless_3/device.js`
2. `drivers/button_wireless_4/device.js`
3. `drivers/switch_wireless_*/device.js` (pattern identique)

**Effort:** 2h
**Impact:** Tous boutons multi-gang

---

### 🔥 PRIORITÉ 4: Switch TS0002 - Driver Dédié 2-Gang

**Problème Exact:**
```
Driver actuel: switch_basic_1gang
Product ID: TS0002 (2-gang!)
Capabilities: onoff, onoff.l1, onoff.l2
Résultat: onoff.l1 = null, onoff.l2 = null
```

**Solution Proposée (VALIDÉE):**
```javascript
// 1. Créer driver dédié: drivers/switch_basic_2gang_usb/

// driver.compose.json
{
  "id": "switch_basic_2gang_usb",
  "name": {
    "en": "2-Gang USB Switch (TS0002)",
    "fr": "Switch 2-Gang USB (TS0002)"
  },
  "class": "socket",
  "capabilities": ["onoff.l1", "onoff.l2"],
  "zigbee": {
    "manufacturerName": ["_TZ3000_h1ipgkwn"],
    "productId": ["TS0002"],
    "endpoints": {
      "1": {
        "clusters": [0, 3, 4, 5, 6],
        "bindings": [6]
      },
      "2": {
        "clusters": [6],
        "bindings": [6]
      }
    }
  }
}

// device.js
async onNodeInit({ zclNode }) {
  this.zclNode = zclNode;

  // Listen endpoint 1
  zclNode.endpoints[1].clusters.onOff.on('attr.onOff', value => {
    this.setCapabilityValue('onoff.l1', value).catch(this.error);
  });

  // Listen endpoint 2
  zclNode.endpoints[2].clusters.onOff.on('attr.onOff', value => {
    this.setCapabilityValue('onoff.l2', value).catch(this.error);
  });

  // Actions utilisateur → endpoint 1
  this.registerCapabilityListener('onoff.l1', async value => {
    await zclNode.endpoints[1].clusters.onOff[value ? 'on' : 'off']();
  });

  // Actions utilisateur → endpoint 2
  this.registerCapabilityListener('onoff.l2', async value => {
    await zclNode.endpoints[2].clusters.onOff[value ? 'on' : 'off']();
  });
}

// 2. Retirer TS0002 de switch_basic_1gang
// drivers/switch_basic_1gang/driver.compose.json
"productId": ["TS0001", "TS0011"]  // REMOVE TS0002
```

**Fichiers à Créer/Modifier:**
1. `drivers/switch_basic_2gang_usb/` (NOUVEAU driver complet)
2. `drivers/switch_basic_1gang/driver.compose.json` (retirer TS0002)

**Effort:** 1h
**Impact:** Switch TS0002 _TZ3000_h1ipgkwn

---

## 📊 ORDRE D'IMPLÉMENTATION RECOMMANDÉ

### Phase 1: Battery Reporting (2h)
```
1. Fix ClusterConfig logic (capability-based)
2. Add _configureBatteryReporting() helper
3. Integrate in BaseHybridDevice.onNodeInit()
4. Test avec TS0044
```

### Phase 2: TS0601 Tuya DP (1h)
```
1. Force usesTuyaDP si tuya_dp_configuration settings
2. Fix IntelligentProtocolRouter detection
3. Verify onDataPoint mapping
4. Test avec Climate Monitor, Soil Tester, Radar
```

### Phase 3: Multi-Endpoint Listeners (2h)
```
1. Refactor _onInitCommandListeners (loop endpoints)
2. Update button_wireless_3, button_wireless_4
3. Add flow cards button_{n}_{gesture}
4. Test TS0044 4 buttons
```

### Phase 4: Switch TS0002 Driver (1h)
```
1. Create switch_basic_2gang_usb driver
2. Remove TS0002 from switch_basic_1gang
3. Test mapping onoff.l1, onoff.l2
4. Document re-pairing
```

**Total Effort:** ~6h
**Target Release:** v4.9.340 (2025-11-16)

---

## 🎯 FICHIERS PAR PRIORITÉ

Vous proposez de me donner **un fichier à la fois** pour réécriture. Parfait!

### Ordre Suggéré:

**1. BatteryReader.js** (30min)
- Add powerConfiguration fallback
- Remove false "Not a Tuya DP" message

**2. ClusterConfig Manager** (30min)
- Fix capability-based detection
- Enable battery:true if measure_battery

**3. BaseHybridDevice.js** (1h)
- Add _configureBatteryReporting()
- Call in onNodeInit()

**4. IntelligentProtocolRouter.js** (30min)
- Force Tuya DP si tuya_dp_configuration settings

**5. TuyaEF00Manager.js** (30min)
- Fix onDataPoint mapping
- Add verbose logging

**6. button_wireless_4/device.js** (1h)
- Multi-endpoint listeners
- Battery reporting

**7. switch_basic_2gang_usb/** (1h)
- Nouveau driver complet

---

## ✅ VALIDATION TECHNIQUE

Vos propositions sont **architecturalement correctes**:

✅ **configureReporting pattern** - Conforme Athom SDK3
✅ **Multi-endpoint loop** - Best practice Zigbee
✅ **Capability-based config** - Logique robuste
✅ **Tuya DP force mode** - Solution élégante
✅ **Driver séparé TS0002** - Clean architecture

---

## 🚀 PRÊT À IMPLÉMENTER

**Quel fichier voulez-vous que je commence?**

Options:
1. **BatteryReader.js** - Quick win, impact immédiat
2. **ClusterConfig** - Foundation pour tout
3. **BaseHybridDevice** - Central integration
4. **Button device.js** - Feature complete

Ou je peux **tous les faire d'un coup** si vous préférez une release complète v4.9.340.

**Votre choix?**
