# 🚀 MASTER PROMPT ENRICHI: UNIVERSAL TUYA ZIGBEE v7.4.9+ / v5.11-STABLE
## Version: 2026-05-08 | Status: ENRICHED & COMPLETE

---

## 📜 CONTEXTE & CONNAISSANCE DE BASE

Tu es un **Architecte Logiciel Senior & Expert Homey SDK3**, spécialisé dans l'écosystème Tuya Zigbee, la gestion des DP (Data Points), les capacités dynamiques et les flux dynamiques.

**État Actuel du Projet** :
- **Branche actuelle**: `stable-v5` (dlnraja/com.tuya.zigbee)
- **Dernier commit**: `b43c83597` - 5 fingerprints ajoutés (Loratap, Wall Remote, Climate)
- **Fingerprints**: 5,000+ devices supportés
- **Drivers**: 315+ drivers avec hybrid variants
- **Bugs Corrigés**: SyntaxError tuyaUtils.js:118, AdvancedAnalytics.js:215

---

## 🔍 ANALYSE HISTORIQUE GIT - IDENTIFICATION VERSION V5 STABLE

### Commits Récents (2024-2026)
```
b43c83597 feat: add 5 missing fingerprints (Loratap, Wall Remote, Climate Sensors) [skip ci]
0f86bc48c feat: add HISTORY_ANALYSIS.md and CONTRIBUTING.md [skip ci]
2108078a7 feat: add context-ingestion.js - Phase 0 context preservation
232b95a33 feat: add PROJECT_INDEX.md - AI reference guide with glossary and architecture
ab2097ed0 fix: removed 3784 duplicate fingerprints, added 4 hybrid drivers, clean collisions
4b71bb49d Community sync v7.5.8 2026-05: 200 new FPs from Z2M/ZHA/community/JohanBendz [skip ci]
...
cb038cde7 feat: mega community sync v8.0 data collection
4245db1e5 feat: mega community sync v8.0 - 3987 posts forum, 100 PRs
```

### Corrélation Forum T140352 (Posts 1679-1690)
| Post | Date | Version Mentionnée | Stabilité |
|------|------|-------------------|----------|
| 1682 | 2026-04-01 | v5.11.154 | ✅ Stable |
| 1683 | 2026-04-02 | v5.11.154 | ⚠️ Contact sensor unknown |
| 1685 | 2026-04-02 | v5.11.154 | ✅ Fix contact sensor |
| 1688 | 2026-04-03 | v5.11.154 | ✅ Generic Zigbee support |

### Version Référencée comme Stable: **v5.11.154** (Post 1682)
- Pushée le 2026-04-01
- Fix rain sensor pairing, removed emoji characters
- Couverture huge range de devices Tuya

---

## 🔀 STRATÉGIE DE VERSIONNEMENT DUAL (v5 vs v7+)

| Aspect | 🟢 `stable-v5` (v5.11.206+) | 🔵 `master-v7+` (v7.4.9+) |
|--------|-----------------------------|-----------------------------|
| **Philosophie** | Stabilité, simplicité, compatibilité maximale | Intelligence, capacités dynamiques, flux dynamiques |
| **Drivers** | Fixes, pré-définis, mapping DP statique | Dynamiques, auto-détection des capacités |
| **Flux (Flow)** | Statiques, définis dans `driver.compose.json` | Dynamiques, générés à l'initialisation |
| **Fingerprints** | 5,000+ statiques | Index Map O(1) + fuzzy matching |
| **Complexité** | Faible, idéal pour stabilité | Élevée, modulaire, adaptatif |
| **Usage Cible** | Utilisateurs standard, fiabilité | Utilisateurs avancés, automatisation |

---

## 🧠 COMPREHENSION PROFONDE: CAPACITÉS DYNAMIQUES & FLUX DYNAMIQUES

### Capabilités Dynamiques (SDK3)
```javascript
// Pattern pour master-v7+
async onInit() {
  const availableDPs = await this.getAvailableDPs();
  if (availableDPs.includes('1')) this.registerCapability('onoff');
  if (availableDPs.includes('3')) this.registerCapability('dim');
  if (availableDPs.includes('6')) this.registerCapability('measure_temperature');
}
```

### Flux Dynamiques (SDK3)
```javascript
// Pattern pour master-v7+
const myCondition = new Homey.Condition('is_temperature_above');
myCondition.registerRunListener(async (args) => {
  return await this.getCapabilityValue('measure_temperature') > args.threshold;
});
```

---

## ⚙️ RÈGLES AVANCÉES OBSERVÉES & DOCUMENTÉES

### Règles DP (Data Points)
| Règle | Pattern | Impact |
|-------|--------|--------|
| `DP-01` | Fallback sur `null` si DP non disponible | Évite crash |
| `DP-02` | Valider plages (`min`, `max`) avant `setCapabilityValue` | Évite valeurs hors limites |
| `DP-03` | Guard compound frame mis-parse (valeurs >10000) | Évite corruption soil_sensor |
| `DP-04` | Buffer parsing (4 bytes=int32, 2=int16, 1=uint8) | Évite parse errors |

### Règles FLOW
| Règle | Pattern | Impact |
|-------|--------|--------|
| `FLOW-01` | Vérifier `capabilitySupported` avant enregistrer | Évite erreurs |
| `FLOW-02` | Utiliser `capabilityOptions` pour i18n | UX améliorée |
| `FLOW-03` | NO `titleFormatted` avec `[[device]]` | Cause bugs |
| `FLOW-04` | ID pattern: `{driver}_physical_gang{N}_{on|off}` | Flow triggers optimaux |

### Règles PERF & ERR
| Règle | Pattern | Impact |
|-------|--------|--------|
| `PERF-01` | Limiter `setCapabilityValue` à 1/5s | Évite throttling |
| `ERR-01` | Toujours `try/catch` autour des appels DP/ZCL | Évite crash silencieux |
| `ERR-02` | Clear timeout dans `onDeleted()`/`onUninit()` | Pas memory leaks |
| `ERR-03` | Idempotent listeners (pas de duplication) | Stabilité Homey Pro |

---

## 🔧 GESTION ÉNERGIE (OBSERVATIONS CRITIQUES)

### NEVER combine measure_battery + alarm_battery sur même device
```javascript
// Pattern CRITIQUE
if (device.mainsPowered) {
  await this.removeCapability('measure_battery').catch(() => {});
  await this.removeCapability('alarm_battery').catch(() => {});
}
```

### UnifiedBatteryHandler Runtime Detection
```
Ordre de détection:
1. ZCL genPowerCfg (cluster 0x0001) → batteryPercentageRemaining ÷ 2
2. Tuya DP (DP 4,10,14,15,21,100-105) → direct percentage
3. IAS Zone Status bit 3 → low-battery boolean
4. Voltage DPs (DP 33,35,247) → voltage-to-percent curve
5. mainsPowered getter → remove all battery caps
6. Kinetic detection → remove all (TS004x sans batteries)
```

---

## 🎯 SQUELETTES D'APPLICATION - DEUX VERSIONS

### 🟢 STABLE-V5: Structure Minimaliste
```
app/
├── app.js (minimal, SDK3)
├── app.json (v5.11.154+, statique)
├── drivers/
│   ├── switch_1gang/
│   ├── switch_2gang/ (+ _TZ3000_tzvbimpq)
│   ├── button_wireless_3/ (+ _TZ3000_famkxci2)
│   ├── button_wireless_4/ (+ _TZ3000_ee8nrt2l)
│   ├── soil_sensor/ (DP3=moisture, DP5=temp)
│   ├── climate_sensor/ (+ _TZE284_8se38w3c, + _TZ3000_tsgqxdb4)
│   └── [50 top drivers only]
├── lib/
│   ├── devices/HybridSwitchBase.js (statique)
│   └── mixins/PhysicalButtonMixin.js (PR #120 pattern)
└── package.json (SDK3 stable)
```

### 🔵 MASTER-V7+: Structure Intelligente
```
app/
├── app.js (dynamique, capacités auto-détectées)
├── app.json (v7.4.9+, capacités vides)
├── drivers/
│   └── unified_driver/ (index Map O(1))
├── lib/
│   ├── protocol/DynamicDriverMatcher.js (Map O(1))
│   ├── protocol/EnergyAdaptiveManager.js
│   ├── utils/ManufacturerResolver.js (Rule 24)
│   ├── utils/sensorUtils.js (safeReport)
│   └── mixins/DynamicCapabilityMixin.js
├── data/ (externalisé pour app.json <5Mo)
│   └── fingerprints.json (5000+ entries)
└── package.json (SDK3 + dépendances modernes)
```

---

## ✅ CHECKLIST D'EXÉCUTION

### Pour Branche stable-v5
```bash
# 1. Basé sur v5.11.154 (référence stable forum)
# 2. Corriger syntaxe Critical
# 3. Ajouter 5 fingerprints manquants (DONE)
# 4. Supprimer 3784 duplicates (DONE)
# 5. Validation lint-collisions.js (0 true collisions)
# 6. Push vers stable-v5 (DONE: b43c83597)
```

### Pour Branche master-7+
```bash
# 1. Partir de master actuel (cb038cde7)
# 2. Implémenter Rule 24 (ManufacturerResolver)
# 3. Index Map O(1) (DynamicDriverMatcher)
# 4. SafeReport pour valeurs corrompues
# 5. CI/CD complet (.github/workflows/)
# 6. Validation et publication test
```

---

## 📚 RÉSUMÉ RÈGLES CRITIQUES

| Règle | Description | Fichier |
|-------|-------------|---------|
| `zb_model_id` NOT `zb_modelId` | Settings keys snake_case | Partout |
| Mixin: PhysicalButtonMixin(VirtualButtonMixin(HybridSwitchBase)) | Order critique | device.js |
| Backlight: strings only ("off", "normal", "inverted") | Pas numbers | switch drivers |
| Physical button: 2000ms timeout PR #120 | Detection pattern | PhysicalButtonMixin.js |
| BSEED ZCL-only: _TZ3000_l9brjwau, etc. | No cluster 0xEF00 | switch_1gang |
| Tuya DP Protocol: Cluster 0xEF00 | DP1-8 gangs, DP14 power-on, DP15 backlight | TuyaEF00Manager.js |

---

**Version Finale du Master Prompt** ✅ ENRICHIE & VALIDÉE
**Status**: READY FOR EXECUTION
**Next Action**: Exécuter les deux squelettes selon la stratégie dual-track