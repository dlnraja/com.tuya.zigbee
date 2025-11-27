# ✅ AUDIT V2 - REFONTE COMPLÈTE

**Date:** 2025-11-22
**Status:** 🎯 PLAN COMPLET + OUTILS CRÉÉS
**Objectif:** Aligner avec Homey guidelines + stabiliser comme apps production

---

## 📊 RÉSUMÉ EXÉCUTIF

### Ce qui a été identifié:
1. 🔴 **Smart-Adapt trop agressif** → Modifie capabilities runtime
2. 🔴 **TS004x confusion** → Buttons traités comme switches
3. 🔴 **TS0601 API cassée** → dataQuery obsolète, valeurs null
4. 🟡 **Batterie incohérente** → 100% figé, UI manquante
5. 🟡 **Architecture désalignée** → Classes/capabilities non-standard

### Ce qui a été créé:
1. ✅ **DebugManager** → Mode debug global contrôlable
2. ✅ **SmartAdaptManager** → Mode read-only par défaut
3. ✅ **BatteryManagerV2** → Simple, prédictible, raisonnable
4. ✅ **Templates TS004x** → Drivers propres buttons/remotes
5. ✅ **Guide Tuya DP Fix** → Nouvelle API + event-based
6. ✅ **Plan complet** → Roadmap v5.0.0 "Stable Edition"

---

## 🎯 PHILOSOPHIE V2

### Avant (v4.9.x - "Ambitious"):
```
Smart-Adapt = Chirurgien automatique
Capabilities = Dynamiques au runtime
Drivers = Hybrides multi-usages
Batterie = 100% fictif + polling 5min
Tuya DP = Polling agressif
```

### Après (v5.0.0 - "Stable"):
```
Smart-Adapt = Outil d'analyse seulement
Capabilities = Statiques, déclarées dans .compose
Drivers = Dédiés, un rôle clair
Batterie = Lecture simple, intervalles raisonnables
Tuya DP = Event-based + fallback intelligent
```

### Principe directeur:
> **"Si Tuya officiel / Xiaomi / Hue ne le font pas, nous non plus"**

---

## 📁 FICHIERS CRÉÉS

### 1. **lib/DebugManager.js**
**Purpose:** Contrôle centralisé des logs

**Features:**
- Flag `developer_debug_mode` (app settings)
- Méthodes: `debug()`, `log()`, `error()`, `verbose()`
- Impact performance awareness
- Log spam réduit pour users production

**Usage:**
```javascript
const debugMgr = new DebugManager(this.homey);

debugMgr.debug('Verbose info'); // Only if debug mode
debugMgr.log('Always shown');   // Always
debugMgr.error('Critical');      // Always
```

---

### 2. **lib/SmartAdaptManager.js**
**Purpose:** Smart-Adapt en mode read-only

**Features:**
- Default: ANALYSIS ONLY (no modifications)
- Experimental mode: `experimental_smart_adapt` flag
- Detailed suggestions logged
- Actions: add/remove capabilities (only if experimental)
- Detects: buttons, switches, sensors

**Philosophy:**
- Suggestions → User decides
- No surprise modifications
- Aligns with Homey guidelines

**Logs:**
```
╔═══════════════════════════════════════════╗
║   SMART-ADAPT ANALYSIS                   ║
╚═══════════════════════════════════════════╝
Device: Wireless Button 4-Gang
Driver: button_wireless_4

⚠️  WARNINGS:
   - Buttons should NOT have onoff capability
     Capability: onoff
     Action: remove

📝 ACTIONS (WOULD APPLY if experimental mode enabled):
   remove_capability: onoff
   Reason: Buttons are controllers, not controllable devices

💡 TIP: Enable "Experimental Smart-Adapt" in app settings
```

---

### 3. **lib/BatteryManagerV2.js**
**Purpose:** Batterie simple et fiable

**Features:**
- **Priority:** Tuya DP → ZCL 0x0001 → null
- **No fictional values:** Pas de 100% permanent
- **Reasonable polling:**
  - Motion/Contact: 4h
  - Climate: 2h
  - Button/Remote: 6h
  - Default: 4h
- **Simple conversion:** Voltage → percent (linear interpolation)

**Key methods:**
```javascript
await readBattery()           // Main read logic
async startMonitoring()       // Setup with appropriate interval
stopMonitoring()             // Cleanup
```

**No more:**
- ❌ 5-minute polling
- ❌ 100% new_device_assumption forever
- ❌ Complex curve calculations for every read

---

### 4. **DRIVERS_TS004X_V2_TEMPLATE.md**
**Purpose:** Templates drivers propres TS004x

**Drivers:**
- `button_wireless_1_v2/` (TS0041)
- `button_wireless_3_v2/` (TS0043)
- `button_wireless_4_v2/` (TS0044)

**Structure:**
```json
{
  "class": "button",           // ✅ Correct!
  "capabilities": [
    "measure_battery"          // ✅ Only!
  ],
  "productId": ["TS0041"]
}
```

**Flow Cards:**
- `button_1_pressed`
- `button_1_double`
- `button_1_long_press_start`
- `button_1_long_press_stop`

**What we DON'T have:**
- ❌ NO onoff
- ❌ NO dim
- ❌ NO class: socket

---

### 5. **TUYA_DP_API_FIX.md**
**Purpose:** Fix TS0601 dataQuery + event-based reporting

**Problem:**
```javascript
// ❌ OLD (broken)
dataQuery({ dp: 1 })
// Error: "dp is an unexpected property"
```

**Solution:**
```javascript
// ✅ NEW (correct)
dataQuery({
  dpValues: [
    { dp: 1, datatype: 2, value: 0 }
  ]
})
```

**Better approach:**
```javascript
// Event-based (primary)
this.registerAttrReportListener(
  'tuyaSpecific',
  'dataReport',
  (data) => this.onTuyaData(data),
  1
);

// Polling (fallback only)
```

**DP Mappings:**
```javascript
// Soil sensor (_TZE284_oitavov2)
{
  1: { capability: 'measure_temperature', divisor: 10 },
  2: { capability: 'measure_humidity', divisor: 1 },
  3: { capability: 'measure_humidity.soil', divisor: 1 },
  4: { capability: 'measure_battery', divisor: 1 }
}
```

---

### 6. **AUDIT_V2_REFONTE_PLAN.md**
**Purpose:** Plan complet de refonte

**Phases:**
1. **Stabilisation immédiate** (2-3h)
   - Debug mode flag
   - Smart-Adapt read-only
   - dataQuery fix

2. **Drivers propres TS004x** (4-5h)
   - button_wireless_1_v2
   - button_wireless_3_v2
   - button_wireless_4_v2

3. **Batterie simple** (2-3h)
   - Déclarer statiquement
   - BatteryManagerV2 rollout
   - Polling raisonnable

4. **TS0601 Tuya DP fix** (6-8h)
   - Nouvelle API
   - Event-based reporting
   - Tables DP par modèle

5. **Architecture & Flow Cards** (4-6h)
   - Classes alignées
   - Flow Cards statiques
   - Cleanup capabilities

---

## 🎯 METRICS DE SUCCÈS

### Avant (v4.9.x):
- ❌ TS004x = confusion button/switch
- ❌ TS0601 = valeurs null
- ❌ Batterie = 100% figé ou null
- ❌ Smart-Adapt = modifications auto runtime
- ❌ Classes incohérentes (button = socket)
- ❌ Polling batterie = 5 minutes
- ❌ dataQuery API obsolète

### Après (v5.0.0 "Stable Edition"):
- ✅ TS004x = buttons propres, Flow cards clairs
- ✅ TS0601 = valeurs réelles (temp/humidity/soil/motion)
- ✅ Batterie = lecture simple, vraies valeurs
- ✅ Smart-Adapt = analyse only (debug mode)
- ✅ Classes alignées Homey guidelines
- ✅ Polling batterie = 2-6h selon type
- ✅ dataQuery API à jour + event-based

---

## 📊 DRIVERS PRIORITAIRES

### Critique (ASAP):
1. **button_wireless_1_v2** (TS0041) → Template ready
2. **button_wireless_3_v2** (TS0043) → Template ready
3. **button_wireless_4_v2** (TS0044) → Template ready
4. **climate_sensor_soil** (TS0601) → Fix guide ready
5. **climate_monitor_temp_humidity** (TS0601) → Fix guide ready
6. **presence_sensor_radar** (TS0601) → Fix guide ready

### Important:
7. **sos_button** (TS0215A)
8. **switch_wall_1gang** (TS0001/TS0011)
9. **motion_sensor_pir** (TS0202)
10. **contact_sensor** (TS0203)

---

## 🔧 CONFIGURATION NÉCESSAIRE

### App settings à ajouter (app.json):

```json
{
  "settings": [
    {
      "id": "developer_debug_mode",
      "type": "checkbox",
      "label": {
        "en": "Developer Debug Mode",
        "fr": "Mode Debug Développeur"
      },
      "value": false,
      "hint": {
        "en": "Enable verbose logging (impacts performance)",
        "fr": "Activer logs verbeux (impact performance)"
      }
    },
    {
      "id": "experimental_smart_adapt",
      "type": "checkbox",
      "label": {
        "en": "Experimental: Smart-Adapt Auto-Modify",
        "fr": "Expérimental: Smart-Adapt Auto-Modif"
      },
      "value": false,
      "hint": {
        "en": "⚠️ Allow Smart-Adapt to automatically modify device capabilities. Use with caution!",
        "fr": "⚠️ Permettre à Smart-Adapt de modifier automatiquement les capacités. Utiliser avec précaution!"
      }
    }
  ]
}
```

---

## 🚀 ROADMAP

### v4.9.275 (Hotfix):
- ✅ Tuya DP dataQuery API fix
- ✅ BatteryManagerV2 pour nouveaux devices
- ⚠️ Legacy drivers inchangés

### v5.0.0 "Stable Edition" (Major):
- ✅ Tous drivers TS004x V2
- ✅ Smart-Adapt read-only par défaut
- ✅ BatteryManagerV2 pour tous
- ✅ TS0601 event-based
- ✅ Classes alignées
- ✅ Flow Cards optimisées
- ⚠️ Breaking changes documentés

### v5.1.0 (Cleanup):
- 🗑️ Deprecate old hybrid drivers
- 📚 Migration guide complet
- 🔧 User-facing diagnostic UI

### v6.0.0 (Future):
- 🗑️ Remove old drivers
- 🎯 Full Homey guidelines compliance
- 🚀 Performance optimizations

---

## 📝 NEXT ACTIONS

### Immédiat (Cette session):
1. ✅ Review audit complet → DONE
2. ✅ Créer outils de base → DONE
3. ✅ Templates drivers → DONE
4. ✅ Guides API fixes → DONE
5. ⏭️ Commit tout → À FAIRE

### Court terme (Prochaines sessions):
1. Implémenter button_wireless_1_v2
2. Tester Tuya DP fix sur vraisi devices
3. Rollout BatteryManagerV2
4. Update app settings
5. Documentation utilisateur

### Moyen terme (v5.0.0):
1. Tous drivers V2
2. Migration guide
3. Beta testing
4. Publication

---

## 🎉 CONCLUSION

### Ce qu'on a accompli:
- 📊 Audit complet aligné sur Homey + autres apps
- 🛠️ 6 fichiers de documentation/templates/tools créés
- 🎯 Plan clair phase par phase
- ✅ Philosophie "Stable Edition" définie
- 🚀 Roadmap v5.0.0 tracée

### Principe final:
> **"Stabilité > Ambition"**
> **"Prédictibilité > Automatisation"**
> **"Guidelines Homey > Ingéniosité maison"**

### Ready pour:
1. Implémenter les fixes
2. Tester sur vraisi devices
3. Publier v5.0.0 "Stable Edition"
4. Regagner confiance users (comme Peter)

---

**Créé:** 2025-11-22
**Status:** ✅ AUDIT COMPLET + OUTILS PRÊTS
**Target:** v5.0.0 "Stable Edition"
**Files:** 6 documents + 3 managers créés
