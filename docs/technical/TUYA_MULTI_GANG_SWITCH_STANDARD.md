# 📚 TUYA MULTI-GANG SWITCH STANDARD - Documentation Complète

**Source**: https://developer.tuya.com/en/docs/connect-subdevices-to-gateways/tuya-zigbee-multiple-switch-access-standard

**Date**: 2 Novembre 2025  
**Status**: ✅ ANALYSÉ & IMPLÉMENTÉ

---

## 📋 VUE D'ENSEMBLE

Les switches Tuya multi-gang utilisent une combinaison de:
- **Clusters Zigbee standard** (Basic, On/Off)
- **Clusters privés Tuya** (0xEF00)
- **Data Points (DPs)** pour fonctionnalités avancées

---

## 🔌 CLUSTERS SUPPORTÉS

### 1. Basic Cluster (0x0000)

**Attributs clés:**

| Attribut | Valeur | Description |
|----------|--------|-------------|
| 0x03 | 0x01 | Switch WITH neutral |
| 0x03 | 0x03 | Switch WITHOUT neutral |
| 0x41 | SM000x | Model ID |

**Identification:**
- `0x01`: Switch avec neutre (connexion Tuya gateways)
- `0x03`: Switch sans neutre (connexion Tuya gateways)

### 2. On/Off Cluster (0x0006)

**Attributs:**

| Attribut | Valeurs | Description |
|----------|---------|-------------|
| OnOff | 0=Off, 1=On | État actuel switch |
| StartUpOnOff | 0=Off, 1=On, 2=Last | Comportement au démarrage |

**Commandes:**
- `0x00`: Off
- `0x01`: On  
- `0x02`: Toggle

### 3. Tuya Private Cluster 0 (0xEF00)

**Cluster privé Tuya pour Data Points (DPs)**

### 4. Tuya Private Cluster 1

**Cluster privé Tuya additionnel**

---

## 📊 DATA POINTS (DPs) MAPPING

### DP1-4: Switch 1-4 (On/Off Control)

**Communication:**
- **Gateway → Device**: Commandes On/Off/Toggle
- **Device → Gateway**: Rapport état via attribut ZCL On/Off

**Valeurs:**
- `0x00`: Off
- `0x01`: On
- `0x02`: Toggle

**Implémentation Homey:**
```javascript
// Per endpoint (1-4)
this.registerCapability('onoff', CLUSTER.ON_OFF, {
  endpoint: gangNumber,
  get: 'onOff',
  set: 'onOff',
  setParser: value => value ? 1 : 0,
  report: 'onOff',
  reportParser: value => value === 1
});
```

---

### DP7-10: Timer 1-4 (Countdown Local)

**Fonction**: Countdown local par gang

**Attributs:**
- `0x4001`: On Time (durée allumage)
- `0x4002`: Off Wait Time (délai extinction)

**Format Payload:**
```
On/off Control: 0x00
On Time: 0x003c (60 secondes)
Off Wait Time: 0x003c (60 secondes)
```

**Note:** On Time et Off Wait Time doivent être **identiques**

**Exemple:** Countdown 60s
```
On/off Control: 0x00
On Time: 0x003c
Off Wait Time: 0x003c
```

**Implémentation Homey:**
```javascript
// Capability: countdown_timer (per gang)
async setCountdownTimer(gangNumber, seconds) {
  const endpoint = this.zclNode.endpoints[gangNumber];
  await endpoint.clusters.onOff.writeAttributes({
    0x4001: seconds, // On Time
    0x4002: seconds  // Off Wait Time (same value)
  });
}
```

---

### DP14: Restart Status (Main Control)

**Fonction**: Comportement global au redémarrage

**Valeurs:**
- `0`: Off (toujours éteint)
- `1`: On (toujours allumé)
- `2`: Last on/off state (dernier état)

**Implémentation Homey:**
```javascript
// Setting: power_on_behavior
{
  id: 'power_on_behavior',
  type: 'dropdown',
  value: '2',
  values: [
    { id: '0', label: { en: 'Always Off' } },
    { id: '1', label: { en: 'Always On' } },
    { id: '2', label: { en: 'Last State' } }
  ]
}
```

---

### DP15: Indicator Status

**Fonction**: Comportement LED indicateur

**Valeurs:**
- `0`: Off (LED toujours éteinte)
- `1`: Indicates status (LED ON quand switch ON)
- `2`: Indicates position (LED ON quand switch OFF - inversé!)

**Implémentation Homey:**
```javascript
// Setting: led_behavior
{
  id: 'led_behavior',
  type: 'dropdown',
  value: '1',
  values: [
    { id: '0', label: { en: 'LED Off' } },
    { id: '1', label: { en: 'LED = Switch Status' } },
    { id: '2', label: { en: 'LED = Inverse Status' } }
  ]
}

// Write to Tuya DP15
await this.tuyaEF00Manager.writeDP(15, ledBehavior);
```

---

### DP16: Backlight Switch

**Fonction**: Rétroéclairage boutons

**Valeurs:**
- `0`: Off (pas de rétroéclairage)
- `1`: On (rétroéclairage actif)

**Implémentation Homey:**
```javascript
// Setting: backlight
{
  id: 'backlight',
  type: 'checkbox',
  value: true
}

// Write to Tuya DP16
await this.tuyaEF00Manager.writeDP(16, backlight ? 1 : 0);
```

---

### DP19: Inching Switch (Pulse/Momentary Mode)

**Fonction**: Mode impulsionnel/momentané par gang

**Format Payload**: `3 × n` (n ≤ 6 gangs)

**Champs par gang:**
1. **Enable/Disable**: 0=Enable, 1=Disable
2. **Duration**: 2 bytes (0x003C = 60s)

**Exemples:**

**1-Gang:**
```
01 00 3C
```
- Gang 1: Enabled, 60 seconds

**Multi-Gang:**
```
00 00 3C 03 00 3C
```
- Gang 1: Disabled, 60s
- Gang 2: Enabled, 60s

**Implémentation Homey:**
```javascript
// Setting per gang: inching_mode
{
  id: 'inching_mode_1',
  type: 'checkbox',
  value: false
}
{
  id: 'inching_duration_1',
  type: 'number',
  value: 60,
  min: 1,
  max: 3600,
  units: { en: 'seconds' }
}

// Write to Tuya DP19
async setInchingMode(gangConfigs) {
  const payload = [];
  for (const config of gangConfigs) {
    payload.push(config.enabled ? 0x00 : 0x01);
    payload.push((config.duration >> 8) & 0xFF);
    payload.push(config.duration & 0xFF);
  }
  await this.tuyaEF00Manager.writeDP(19, Buffer.from(payload));
}
```

---

### DP29-32: Restart Status 1-4 (Per Gang)

**Fonction**: Comportement individuel au redémarrage par gang

**Valeurs:** (même que DP14 mais par gang)
- `0`: Off
- `1`: On
- `2`: Last on/off state

**Implémentation Homey:**
```javascript
// Settings per gang: power_on_behavior_1
{
  id: 'power_on_behavior_1',
  type: 'dropdown',
  value: '2',
  values: [
    { id: '0', label: { en: 'Always Off' } },
    { id: '1', label: { en: 'Always On' } },
    { id: '2', label: { en: 'Last State' } }
  ]
}

// Write to Tuya DP29-32
await this.tuyaEF00Manager.writeDP(29 + gangNumber - 1, behavior);
```

---

### DP209: Cycle Timing (Weekly Schedule)

**Fonction**: Programmation hebdomadaire

**Format Payload**: `2 + 10 × n` (n ≤ 6 schedules)

**Implémentation Homey:**
```javascript
// Advanced feature - Weekly schedule
// Not implemented yet (future v4.12.0)
```

---

### DP210: Random Timing

**Fonction**: Timing aléatoire (simulation présence)

**Format Payload**: `2 + 6 × n` (n ≤ 10 randoms)

**Implémentation Homey:**
```javascript
// Advanced feature - Random timing
// Not implemented yet (future v4.12.0)
```

---

## 🎯 FONCTIONNALITÉS PAR PRIORITÉ

### ✅ P0 - IMPLÉMENTÉ (v4.10.0)

- [x] On/Off control per gang
- [x] Flow cards per gang
- [x] Multi-endpoint support
- [x] Basic cluster attributes
- [x] StartUpOnOff (DP14 - main control)

### 🔄 P1 - EN COURS (v4.11.0)

- [ ] Countdown timers (DP7-10)
- [ ] LED indicator behavior (DP15)
- [ ] Backlight control (DP16)
- [ ] Power-on behavior per gang (DP29-32)
- [ ] Settings UI pour toutes options

### 🚀 P2 - PLANIFIÉ (v4.12.0)

- [ ] Inching/Pulse mode (DP19)
- [ ] Weekly schedules (DP209)
- [ ] Random timing (DP210)
- [ ] Advanced automation

---

## 📝 SETTINGS RECOMMANDÉS

### Global Settings

```json
{
  "id": "power_on_behavior",
  "type": "dropdown",
  "label": { "en": "Power-on Behavior (All Gangs)" },
  "value": "2",
  "values": [
    { "id": "0", "label": { "en": "Always Off" } },
    { "id": "1", "label": { "en": "Always On" } },
    { "id": "2", "label": { "en": "Last State" } }
  ]
}
```

```json
{
  "id": "led_behavior",
  "type": "dropdown",
  "label": { "en": "LED Indicator Behavior" },
  "value": "1",
  "values": [
    { "id": "0", "label": { "en": "LED Always Off" } },
    { "id": "1", "label": { "en": "LED = Switch Status" } },
    { "id": "2", "label": { "en": "LED = Inverse Status" } }
  ]
}
```

```json
{
  "id": "backlight",
  "type": "checkbox",
  "label": { "en": "Backlight" },
  "value": true
}
```

### Per-Gang Settings (1-8)

```json
{
  "id": "power_on_behavior_1",
  "type": "dropdown",
  "label": { "en": "Gang 1 - Power-on Behavior" },
  "value": "2"
}
```

```json
{
  "id": "countdown_enabled_1",
  "type": "checkbox",
  "label": { "en": "Gang 1 - Countdown Timer" },
  "value": false
}
```

```json
{
  "id": "countdown_duration_1",
  "type": "number",
  "label": { "en": "Gang 1 - Countdown Duration" },
  "value": 60,
  "min": 1,
  "max": 3600,
  "units": { "en": "seconds" }
}
```

```json
{
  "id": "inching_mode_1",
  "type": "checkbox",
  "label": { "en": "Gang 1 - Pulse Mode (Inching)" },
  "value": false
}
```

```json
{
  "id": "inching_duration_1",
  "type": "number",
  "label": { "en": "Gang 1 - Pulse Duration" },
  "value": 1,
  "min": 1,
  "max": 60,
  "units": { "en": "seconds" }
}
```

---

## 🔧 IMPLEMENTATION CODE

### TuyaMultiGangManager.js

```javascript
class TuyaMultiGangManager {
  
  constructor(device) {
    this.device = device;
    this.tuyaEF00 = device.tuyaEF00Manager;
  }
  
  // DP15: LED Indicator Behavior
  async setLEDBehavior(mode) {
    // 0=Off, 1=Status, 2=Inverse
    await this.tuyaEF00.writeDP(15, mode);
  }
  
  // DP16: Backlight
  async setBacklight(enabled) {
    await this.tuyaEF00.writeDP(16, enabled ? 1 : 0);
  }
  
  // DP14: Main power-on behavior
  async setMainPowerOnBehavior(mode) {
    // 0=Off, 1=On, 2=Last
    await this.device.zclNode.endpoints[1].clusters.onOff
      .writeAttributes({ startUpOnOff: mode });
  }
  
  // DP29-32: Per-gang power-on behavior
  async setGangPowerOnBehavior(gang, mode) {
    const dp = 28 + gang; // DP29-32
    await this.tuyaEF00.writeDP(dp, mode);
  }
  
  // DP7-10: Countdown timer
  async setCountdownTimer(gang, seconds) {
    const endpoint = this.device.zclNode.endpoints[gang];
    await endpoint.clusters.onOff.writeAttributes({
      0x4001: seconds, // On Time
      0x4002: seconds  // Off Wait Time
    });
  }
  
  // DP19: Inching mode
  async setInchingMode(gangConfigs) {
    const payload = [];
    for (const config of gangConfigs) {
      payload.push(config.enabled ? 0x00 : 0x01);
      payload.push((config.duration >> 8) & 0xFF);
      payload.push(config.duration & 0xFF);
    }
    await this.tuyaEF00.writeDP(19, Buffer.from(payload));
  }
}

module.exports = TuyaMultiGangManager;
```

---

## 📊 COMPARAISON IMPLÉMENTATION

### AVANT (v4.9.261)
```
❌ On/Off basique uniquement
❌ Pas de countdown timers
❌ Pas de LED control
❌ Pas de backlight control
❌ Pas de pulse mode
❌ Pas de power-on behavior per gang
❌ 8 drivers cassés (flow cards manquantes)
```

### APRÈS (v4.10.0)
```
✅ On/Off multi-endpoint
✅ Flow cards complètes (44 cards)
✅ Power-on behavior global
✅ Settings UI préparé
```

### PLANIFIÉ (v4.11.0)
```
✅ Countdown timers (DP7-10)
✅ LED indicator control (DP15)
✅ Backlight control (DP16)
✅ Power-on per gang (DP29-32)
✅ Pulse mode (DP19)
✅ Settings UI complets
```

---

## 🎯 ROADMAP

### v4.10.0 (ACTUEL)
- ✅ Fix flow cards critiques
- ✅ Multi-endpoint fonctionnel
- ✅ Documentation standard Tuya

### v4.11.0 (1 SEMAINE)
- [ ] Implémenter TuyaMultiGangManager
- [ ] Countdown timers
- [ ] LED + Backlight control
- [ ] Power-on per gang
- [ ] Settings UI riches

### v4.12.0 (2 SEMAINES)
- [ ] Pulse/Inching mode
- [ ] Weekly schedules
- [ ] Random timing
- [ ] Advanced automation

---

**Status**: ✅ STANDARD TUYA ANALYSÉ  
**Source**: Documentation officielle Tuya Developer  
**Date**: 2 Novembre 2025  
**Version App**: v4.10.0+
