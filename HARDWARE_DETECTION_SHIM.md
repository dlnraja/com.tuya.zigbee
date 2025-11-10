# 🔧 Hardware Detection Shim - Documentation

## 🎯 Objectif

Le **Hardware Detection Shim** détecte automatiquement le hardware réel d'un device Zigbee au runtime et corrige les capabilities si le driver assigné ne correspond pas.

**Avantages**:
- ✅ Pas besoin de re-pairing pour l'utilisateur
- ✅ Auto-correction transparente
- ✅ Logs détaillés pour diagnostics
- ✅ Non-intrusif (pas d'erreurs si correction impossible)

---

## 📊 Cas d'Usage

### Cas 1: USB Outlet assigné à Switch 2-Gang

**Avant**:
```
Device: USB Outlet 2-Ports (_TZ3000_h1ipgkwn + TS0002)
Driver assigné: switch_basic_2gang
Capabilities: ["onoff", "onoff.button2", "measure_battery"]
❌ Pas de measure_voltage, measure_current, led_mode
❌ measure_battery présent alors qu'AC powered
```

**Après (auto-correction)**:
```
[SHIM] 🔍 Hardware detection started...
[SHIM] 📊 Detection results:
  - deviceType: usb_outlet
  - powerSource: AC
  - hasUSB: true
  - tuyaDPs: [16, 17, 20]
  
[SHIM] 🔧 Applying 5 corrections...
[SHIM] REMOVE: measure_battery
  Reason: AC-powered device should not have battery capability
[SHIM] ✅ Removed: measure_battery

[SHIM] ADD: measure_voltage
  Reason: USB outlet detected (DP 17)
[SHIM] ✅ Added: measure_voltage

[SHIM] ADD: measure_current
  Reason: USB outlet detected (DP 20)
[SHIM] ✅ Added: measure_current

[SHIM] ADD: led_mode
  Reason: USB outlet with LED control (DP 16)
[SHIM] ✅ Added: led_mode

[SHIM] RENAME: onoff.button2 → onoff.usb2
  Reason: USB outlet should use onoff.usb2 instead of onoff.button2
[SHIM] ✅ Renamed: onoff.button2 → onoff.usb2

[SHIM] ✅ Hardware corrections applied
```

**Résultat final**:
```
Capabilities: ["onoff", "onoff.usb2", "led_mode", "measure_voltage", "measure_current"]
✅ Device fonctionne correctement!
```

---

### Cas 2: Switch assigné à USB Outlet

**Avant**:
```
Device: Switch 2-Gang (_TZ3000_4fjiwweb + TS0002)
Driver assigné: usb_outlet_2port
Capabilities: ["onoff", "onoff.usb2", "measure_voltage", "measure_current"]
❌ measure_voltage/current non supportés par hardware
```

**Après (auto-correction)**:
```
[SHIM] 🔍 Hardware detection started...
[SHIM] 📊 Detection results:
  - deviceType: switch_2gang
  - powerSource: AC
  - hasUSB: false
  - tuyaDPs: []
  
[SHIM] 🔧 Applying 2 corrections...
[SHIM] REMOVE: measure_voltage
  Reason: Not a USB outlet (no voltage DP detected)
[SHIM] ✅ Removed: measure_voltage

[SHIM] REMOVE: measure_current
  Reason: Not a USB outlet (no current DP detected)
[SHIM] ✅ Removed: measure_current

[SHIM] ✅ Hardware corrections applied
```

---

## 🔍 Détection Hardware

Le shim détecte automatiquement:

### 1. Source d'alimentation
```js
- Lit powerSource attribute du cluster powerConfiguration
- Fallback: vérifie zb_device_type (router = AC)
- Résultat: 'AC', 'DC', 'BATTERY', ou 'unknown'
```

### 2. Présence Tuya EF00
```js
- Cherche cluster 0xEF00 sur tous les endpoints
- Détecte tuya/tuyaManufacturerCluster
- Résultat: true/false
```

### 3. Tuya Data Points (DPs)
```js
- Lit tuya_dp_configuration dans settings
- Détecte DPs spécifiques:
  - DP 16: LED control (led_mode)
  - DP 17: Voltage measurement (measure_voltage)
  - DP 20: Current measurement (measure_current)
```

### 4. Type de Device
```js
- USB Outlet: DPs 17 ou 20 présents
- Outlet with Metering: cluster electricalMeasurement
- Switch: cluster onOff
- Multi-gang: multiple endpoints avec onOff
```

### 5. Endpoints & Clusters
```js
- Liste tous les endpoints (sauf getDeviceEndpoint)
- Liste tous les clusters par endpoint
- Détecte onOff sur plusieurs endpoints → multi-gang
```

---

## 🛠️ Corrections Appliquées

### Type 1: REMOVE
```js
Retire une capability non supportée par hardware
Exemple: measure_battery sur device AC
```

### Type 2: ADD
```js
Ajoute une capability supportée mais manquante
Exemple: measure_voltage sur USB outlet mal détecté
```

### Type 3: RENAME
```js
Renomme une capability pour correspondre au hardware
Exemple: onoff.button2 → onoff.usb2 sur USB outlet
```

### Type 4: SILENT (DP Pool)
```js
Ajoute tuya_dp_1..tuya_dp_12 pour devices Tuya EF00
Sans logging (trop verbeux)
```

---

## 📝 Logs Diagnostics

### Logs Normaux (correction réussie)
```
[SHIM] 🔍 Hardware detection started...
[SHIM] Found 2 endpoints
[SHIM] Power source: AC
[SHIM] Tuya EF00 detected on endpoint 1
[SHIM] 📊 Detection results: {...}
[SHIM] Current driver: switch_basic_2gang
[SHIM] Current capabilities: ["onoff","onoff.button2","measure_battery"]
[SHIM] 🔧 Applying 4 corrections...
[SHIM] REMOVE: measure_battery
[SHIM]   Reason: AC-powered device should not have battery capability
[SHIM] ✅ Removed: measure_battery
[SHIM] ✅ Hardware corrections applied
[BACKGROUND] ✅ Hardware corrections applied automatically
```

### Logs Échec (non-critique)
```
[SHIM] 🔍 Hardware detection started...
[SHIM] ❌ Detection failed: Cannot read properties of undefined
[BACKGROUND] Hardware shim failed (non-critical): ...
```

**Note**: Les échecs du shim sont **non-critiques** et n'empêchent pas le device de fonctionner.

---

## 🔄 Intégration dans BaseHybridDevice

Le shim est appelé automatiquement dans `_runBackgroundInitialization()`:

```js
// Step 2b: Hardware detection shim (auto-correct capabilities)
this.log('[BACKGROUND] Step 2b/8: Hardware detection & auto-correction...');
try {
  const shim = new HardwareDetectionShim(this);
  const corrected = await shim.detectAndCorrect(this.zclNode);
  if (corrected) {
    this.log('[BACKGROUND] ✅ Hardware corrections applied automatically');
  }
} catch (err) {
  this.error('[BACKGROUND] Hardware shim failed (non-critical):', err);
}
```

**Ordre d'exécution**:
1. Power source detection
2. Remove battery from AC/DC devices
3. **Hardware shim auto-correction** ← NOUVEAU!
4. IAS Zone enrollment
5. Multi-endpoint configuration
6. Tuya EF00 initialization
7. Capability registration

---

## 🧪 Testing

### Test 1: USB Outlet mal assigné
```
1. Pairer USB outlet → se fait assigner switch_basic_2gang
2. Update app vers v4.9.178+
3. Restart app
4. Observer logs:
   ✅ [SHIM] USB outlet detected
   ✅ [SHIM] Added: measure_voltage
   ✅ [SHIM] Added: measure_current
   ✅ [SHIM] Removed: measure_battery
5. Vérifier capabilities dans l'app:
   ✅ Voltage s'affiche
   ✅ Current s'affiche
   ✅ Plus d'indicateur battery
```

### Test 2: Switch mal assigné
```
1. Switch assigné à usb_outlet_2port (impossible normalement, mais test)
2. Update app
3. Restart app
4. Observer logs:
   ✅ [SHIM] Not a USB outlet
   ✅ [SHIM] Removed: measure_voltage
   ✅ [SHIM] Removed: measure_current
```

---

## ⚙️ Configuration

Pas de configuration requise! Le shim fonctionne automatiquement.

**Désactiver** (si nécessaire pour debug):
```js
// Dans BaseHybridDevice.js, commenter:
// const shim = new HardwareDetectionShim(this);
// const corrected = await shim.detectAndCorrect(this.zclNode);
```

---

## 🚀 Performance

- **Temps d'exécution**: ~200-500ms par device
- **Impact**: Négligeable (exécuté en background)
- **Erreurs**: Safe (catch all exceptions)
- **Mémoire**: ~5KB par instance

---

## 🔮 Évolutions Futures

### Phase 1 (v4.9.178) ✅
- Détection USB outlet vs Switch
- Correction battery sur AC devices
- Auto-ajout capabilities manquantes

### Phase 2 (future)
- Détection device families (TS0601 variants)
- Auto-suggestion driver correct dans logs
- GitHub Pages avec mapping centralisé

### Phase 3 (future)
- Pairing flow custom avec sélection driver
- Machine learning pour améliorer détection
- Community feedback integration

---

## 📚 Références

- `lib/HardwareDetectionShim.js` - Code principal
- `lib/BaseHybridDevice.js` - Intégration
- `scripts/audit-fingerprint-collisions.js` - Détection collisions
- `docs/FINGERPRINTS.md` - Guide fingerprints

---

## 🆘 Support

Si le shim ne corrige pas correctement:

1. Vérifier logs complets (Settings → Diagnostics → Send report)
2. Chercher `[SHIM]` dans les logs
3. Vérifier `Detection results` JSON
4. Ouvrir issue sur GitHub avec logs

**GitHub**: https://github.com/dlnraja/com.tuya.zigbee/issues
