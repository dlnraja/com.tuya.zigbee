# Fixes P1/P2 - Version 4.11.1

## ✅ PRIORITÉ 1 - Bugs critiques (TOUS FIXES)

### 1.1. Fix Tuya DP Protocol (TS0601 climate/soil/radar)

**Problème:**
- Climate Monitor, Soil Sensor, Radar Presence → tous `null` pour temp/humidity/motion
- Logs: `dataQuery failed: dp is an unexpected property`
- Logs: `sendFrame failed: Impossible de joindre l'appareil`

**Root cause:**
- Mauvaise signature `dataQuery({ dp: 1 })` au lieu de `getData({ seq, datapoints: buffer })`
- Pas de profil centralisé pour mapper DPs→capabilities

**Fixes appliqués:**
```javascript
// lib/tuya/TuyaEF00Manager.js - FIXED
await tuyaCluster.getData({
  seq: Math.floor(Math.random() * 0xFFFF),
  datapoints: Buffer.from([dp])
});

// lib/tuya/TuyaProfiles.js - NEW
const TUYA_PROFILES = {
  'TS0601|_TZE284_vvmbj46n': { // Climate Monitor
    dpMap: {
      1: { capability: 'measure_temperature', scale: 10 },
      2: { capability: 'measure_humidity' },
      4: { capability: 'measure_battery' }
    }
  },
  'TS0601|_TZE284_oitavov2': { // Soil Sensor
    dpMap: {
      1: { capability: 'measure_temperature', scale: 10 },
      2: { capability: 'measure_humidity.soil' },
      4: { capability: 'measure_battery' }
    }
  },
  'TS0601|_TZE200_rhgsbacq': { // Radar Presence
    dpMap: {
      1: { capability: 'alarm_motion' },
      4: { capability: 'measure_battery' },
      12: { capability: 'measure_luminance' }
    }
  }
};
```

**Status:** ✅ Devices should now report temp/humidity/motion correctly

---

### 1.2. Fix Button Flow Cards (TS004x)

**Problème:**
- Cam: "smart button maintenant reconnu, mais aucun événement de press dans les flows"
- Flow card IDs ne correspondaient pas aux fichiers `.flow.compose.json`

**Root cause:**
- Code générait: `button_wireless_4_button_1_double`
- Fichier attendait: `button_wireless_4_button_4gang_button_1_double`
- Manquait `_button_Xgang_` dans l'ID

**Fixes appliqués:**
```javascript
// lib/devices/ButtonDevice.js - FIXED
const gangCount = this.buttonCount || 1;

// Single press
const specificCardId = `${driverId}_button_${gangCount}gang_button_${button}_pressed`;

// Double press
const doubleCardId = `${driverId}_button_${gangCount}gang_button_${button}_double`;

// Long press
const longCardId = `${driverId}_button_${gangCount}gang_button_${button}_long`;
```

**Status:** ✅ Button press events should now trigger flows

---

### 1.3. Fix TS0002 USB Driver Assignment

**Problème:**
- TS0002 USB (_TZ3000_h1ipgkwn) assigné au driver 1-gang switch
- Affichait onoff.l1/.l2 = null (mauvaises capabilities)
- Manufacturer dans 12 drivers différents!

**Fixes appliqués:**
- Retiré `_TZ3000_h1ipgkwn` de 9 drivers incorrects:
  - switch_2gang, switch_2gang_alt, switch_basic_2gang_usb
  - switch_remote, switch_touch_2gang, switch_wall_2gang
  - switch_wall_2gang_basic, switch_wall_2gang_bseed, switch_wall_2gang_smart
- Gardé uniquement dans: `usb_outlet_2port` ✅

**Status:** ✅ TS0002 USB now correctly assigned to 2-port USB outlet driver

---

### 1.4. Centralize Tuya DP Detection

**Problème:**
- Incohérences: Smart-Adapt dit "Tuya DP", Battery-Reader dit "standard Zigbee"
- Détection dupliquée dans 5+ fichiers différents

**Fixes appliqués:**
```javascript
// lib/device_helpers.js - IMPROVED
function isTuyaDP(deviceInfo, device = null) {
  // RULE 1: TS0601 = always Tuya DP
  if (modelId === 'TS0601') return true;

  // RULE 2: _TZE manufacturer prefix
  if (manufacturer.startsWith('_TZE')) return true;

  // RULE 3: Cluster 0xEF00 presence
  if (zclNode has cluster manuSpecificTuya) return true;

  // RULE 4: Legacy cluster check
  if (clusters['0xEF00'] || clusters['61184']) return true;

  return false;
}
```

**Usage:**
- `lib/utils/battery-reader.js` → utilise maintenant `isTuyaDP()` central
- Single source of truth pour toute l'app

**Status:** ✅ Consistent TS0601 detection across all modules

---

## ✅ PRIORITÉ 2 - Stabilité (COMPLÉTÉ)

### 2.1. Smart-Adapt Mode Diagnostic

**Problème:**
- Smart-Adapt modifiait les capabilities dynamiquement à chaque boot
- UX pourrie: "device commence en switch, devient bouton au reboot"
- Instabilité pour devices qui marchent déjà

**Fixes appliqués:**
```javascript
// lib/SmartDriverAdaptation.js - NEW MODE
const adaptMode = this.device.getSetting('smart_adapt_mode') || 'diagnostic_only';

if (adaptMode === 'diagnostic_only') {
  this.log('🔍 [DIAGNOSTIC MODE] Would make these changes:');
  this.log(`   ❌ Would remove: ${comparison.incorrect.join(', ')}`);
  this.log(`   ✅ Would add: ${comparison.missing.join(', ')}`);
  this.log('   ℹ️  Set smart_adapt_mode=active to enable automatic changes');
  return; // NO CHANGES MADE
}
```

**Modes:**
- `diagnostic_only` (DEFAULT): Analyse + logs uniquement, pas de modifications
- `active`: Permet modifications automatiques (ancien comportement)

**Benefits:**
- ✅ Capabilities stables - pas de changements surprise
- ✅ Diagnostics intelligents toujours disponibles
- ✅ User peut activer mode actif si besoin
- ✅ Plus proche du modèle "drivers statiques" des autres apps Homey

**Status:** ✅ Smart-Adapt now respects stability first, intelligence second

---

## 📊 Commits

```bash
65039b3 fix(P1): disable broken dataQuery for sleepy TS0601 devices
97e0051 fix(P2): centralize isTuyaDP detection across all modules
6706bd9 fix(P1): correct TS0002 USB driver assignment
9e130d4 fix(P1): implement correct Tuya DP protocol + centralized profiles
b216bc7 fix(P1): correct button flow card IDs for TS004x devices
586dbd4 feat(P2): add diagnostic-only mode to Smart-Adapt
```

**Total:** 6 commits, ~800 lines changed

---

## 🧪 Testing Checklist

### TS0601 Devices (Climate/Soil/Radar)
- [ ] Pair TS0601 climate monitor
- [ ] Check logs: should see `getData` instead of `dataQuery`
- [ ] Wait 1-2 minutes for first report
- [ ] Verify `measure_temperature`, `measure_humidity`, `measure_battery` populated
- [ ] Check: no more "dp is an unexpected property" errors

### Button Devices (TS0041/42/43/44)
- [ ] Pair TS004x wireless button
- [ ] Press button → check logs for flow trigger attempts
- [ ] Create flow: "When button 1 pressed" → test notification
- [ ] Test double-press and long-press triggers
- [ ] Verify no `onoff`/`dim` capabilities on button class devices

### TS0002 USB
- [ ] Pair _TZ3000_h1ipgkwn (TS0002)
- [ ] Verify driver = `usb_outlet_2port`
- [ ] Check capabilities: `onoff`, `onoff.usb2` (not onoff.l1/l2)
- [ ] Test port control works

### Smart-Adapt Mode
- [ ] Check any device logs → should see `[DIAGNOSTIC MODE]`
- [ ] Verify capabilities don't change between reboots
- [ ] Optionally set `smart_adapt_mode=active` to test old behavior

---

## 📝 Known Limitations

1. **Battery-powered TS0601**: Cannot actively query DPs (sleepy enddevices)
   - Must wait for passive reports on device wake-up
   - First data may take 1-5 minutes after pairing

2. **Button bind**: Some TS004x require manual re-pairing if bind fails
   - Check logs for `[BIND] OnOff bind failed`
   - If no events received, remove device and re-pair

3. **Smart-Adapt diagnostic only**: Won't auto-fix capability mismatches
   - User must manually switch driver if needed
   - Or enable `smart_adapt_mode=active` (not recommended for stable devices)

---

## 🔜 Next Steps (P3 - Quality of Life)

Not implemented yet, but recommended:

### 3.1. Debug Level Setting
```javascript
// app.json
"settings": [
  {
    "id": "debug_level",
    "type": "dropdown",
    "value": "normal",
    "values": [
      { "id": "normal", "label": "Normal (errors + warnings)" },
      { "id": "verbose", "label": "Verbose (all logs)" }
    ]
  }
]
```

### 3.2. Battery Capability Labels
- Fix labels: `measure_battery` should always say "Battery", not "Contrôleur"
- Check `capabilitiesOptions` in driver.compose.json files

### 3.3. CI Validation
- Add GitHub Action: `homey app validate`
- Check manifests consistency
- Unit tests for TuyaProfiles, isTuyaDP, etc.

---

## 📚 References

- [Homey Community Thread](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352/527)
- [Johan's Original Repo](https://github.com/JohanBendz/com.tuya.zigbee)
- [Homey Apps SDK](https://apps-sdk-v3.developer.homey.app/)
- [Tuya DP Protocol](https://github.com/zigbeefordomoticz/wiki/blob/master/en-eng/Technical/Tuya-0xEF00.md)

---

**Version:** 4.11.1
**Date:** 2025-11-22
**Author:** Dylan Rajasekaram (with AI assist)
**Status:** ✅ P1 COMPLETE | ✅ P2 COMPLETE | 🔜 P3 PENDING
