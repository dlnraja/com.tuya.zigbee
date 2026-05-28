# CRITICAL MISTAKES - Never Repeat (v8.5.0 Phoenix Sovereign + Fleetwood Gateway)

> **Dernière mise à jour :** 28 Mai 2026
> **Version :** v8.5.36
> **Architecture :** Phoenix Sovereign + Fleetwood Gateway + UnifiedBatteryHandler + Dual-Layer Gate

---

## 🔴 GRAVITÉ CRITIQUE (CRASH / EXPLOIT / BUG PRODUCTION)

### A. CODE BUGS ENCOUNTERED

| ID | Règle | Explication |
|----|-------|-------------|
| A1 | Settings keys: `zb_model_id` NOT `zb_modelId` | Homey SDK3 exige underscore. `zb_manufacturer_name` NOT `zb_manufacturerName` |
| A2 | Flow triggers: NO `titleFormatted` with `[[device]]` | Cause double-declaration bug (Homey SDK3). Utiliser `title` field uniquement |
| A3 | Press type **0-indexed**: 0=single 1=double 2=hold | 1-indexed a cassé TS0044. Strictement 0-based |
| A4 | Battery check order: test `<=100` FIRST then `<=200` | Ordre inverse = branche unreachable |
| A5 | Double-inversion: IAS+alarm_contact les deux invert = back to original | Invert UNE SEULE fois maximum |
| A6 | Imports: `require('../../lib/tuya/TuyaZigbeeDevice')` | NE PAS utiliser `require('../../lib/TuyaZigbeeDevice')` (path wrong) |
| A7 | Mixin order: `PhysicalButtonMixin(VirtualButtonMixin(UnifiedSwitchBase))` | Ordre capital. Jamais l'inverse |
| A8 | `setCapabilityValue()` DOIT être `await` | Oublier `await` cause des crashes intermittents sur valeurs rapides |
| A9 | `console.log/error` INTERDIT dans production code | Utiliser `this.homey.log()` / `this.homey.error()` ou logger injectable |
| A10 | Jamais `eval()` ou `new Function()` pour parsers | Sécurité. Utiliser SafeParser dispatch (voir DriverMappingLoader) |

### B. PHOENIX SOVEREIGN v8.5.0 RULES

| ID | Règle | Explication |
|----|-------|-------------|
| B1 | **Jamais** `this.setCapabilityValue('button', ...)` direct | Utiliser **toujours** `this._safeSetCapability()` ou `this.safesetCapability()` |
| B2 | Formules linéaires batterie STRICTEMENT INTERDITES | `(voltage - 2.5) / 0.5` est banni. Utiliser `UnifiedBatteryHandler` |
| B3 | Profils non-linéaires obligatoires: `3V_2100`, `1.5V_AA`, etc. | Les courbes linéaires donnent 0% ou 100% erronés |
| B4 | `get mainsPowered() { return true; }` pour USB/mains | Retirer `measure_battery` dans `onNodeInit()` |
| B5 | `_destroyed` guard dans toutes les méthodes asynchrones | Évite les appels après destroy (crash Homey) |
| B6 | `_safeHomey` getter partout | `return this.homey ? this.homey : null` évite les null pointer |
| B7 | `_destroyDevice()` dans `onUninit()` et `onDeleted()` | Nettoie sockets TCP, event listeners, timers |
| B8 | **Smart Divisors**: Jamais `value / 100` manuel | Utiliser `smartDivisorDetect(rawValue, dpId, options)` |
| B9 | Double-Division Bug: TuyaEF00Manager → /100 → dpMappings → /100 | SmartDivisorManager résout ce bug |
| B10 | Virtual Buttons: Toujours `markAppCommand()` avant set | Empêche les boucles infinies Generic Flow Card |

### C. UNIFIEDBATTERYHANDLER (FUSION COMPLÈTE v8.5.0)

| ID | Règle | Explication |
|----|-------|-------------|
| C1 | Import: `const UnifiedBatteryHandler = require('../../lib/battery/UnifiedBatteryHandler')` | Chemin exact, PAS `../../battery/` |
| C2 | `calculateFromVoltage(voltage, batteryType, temperature)` | 3 paramètres obligatoires. voltage en V, pas mV |
| C3 | Battery types supportés: CR2032, CR2450, CR2477, CR123A, CR1632, AAA, AA, C, D, 9V, 2xAAA, 2xAA, 4xAAA, Li-ion, Li-polymer, 18650 | 15+ profils non-linéaires embarqués |
| C4 | Store persistence entre sessions obligatoire | Persist on every update, restore on init |
| C5 | Anti-flood 5min/2% deduplication | Ne pas mettre à jour batterie trop souvent |
| C6 | `lookupBatteryProfile(manufacturerName, productId)` | 20+ device profiles |
| C7 | EMA smoothing intégré | Lissage exponentiel des valeurs |

### D. DRIVERMAPPINGLOADER (DML) — BONNES PRATIQUES

| ID | Règle | Explication |
|----|-------|-------------|
| D1 | Constructeur DML: Jamais `console.log`/`console.error` direct | Utiliser `this._log`/`this._error` avec setLogger() |
| D2 | Toujours injecter logger: `dml.setLogger(this.homey)` | Permet logs Homey SDK3 formatés |
| D3 | Toujours injecter UnifiedBatteryHandler: `dml.setBatteryHandler(handler)` | Pour parser batterie non-linéaire |
| D4 | Parser `battery_voltage_to_percent` interdit en direct | Déléguer à `UnifiedBatteryHandler.calculateFromVoltage()` |
| D5 | Singleton DML: `getInstance()` / require shortcuts | Éviter `new DriverMappingLoader()` multiple |
| D6 | SafeParser dispatch: `divide_by_`, `multiply_by_`, `boolean`, `clamp`, `enum` | Jamais de chaînes eval() |

### E. FLEETWOOD GATEWAY v8.4.0+ SYNTAX PURITY

| ID | Règle | Explication |
|----|-------|-------------|
| E1 | ZCL Method Override Purity: braces correctes | Override `getDeviceById(id)` DOIT fermer correctement |
| E2 | ZCL Measurement Scoping: variables uniques | `scaledCurrent` ≠ `scaledPower` dans même scope |
| E3 | Mains/Battery Approximation: conflit interdit | Si `measure_power`/`meter_power` dans compose → pas `energy.approximation` |
| E4 | GHA Shell Default: `defaults: run: shell: bash` | Chaque workflow .yml DOIT avoir cette config |
| E5 | GHA Cloud Purity Gate: `PRE_COMMIT_CHECKS.js` | 100% JS syntax parsing avant commit |

---

## 🟡 GRAVITÉ MOYENNE (WARNING / RÉGRESSION POTENTIELLE)

### F. BACKLIGHT VALUES (Layer 11)

| ID | Règle | Explication |
|----|-------|-------------|
| F1 | Backlight = string `"off"`, `"normal"`, `"inverted"` | JAMAIS de nombres (`0`, `1`, `2`) |
| F2 | Envoi: `const lightMode = backlightMode === 'normal' ? 1 : 2;` | Toujours ternary pour mapper string → DP int |
| F3 | Lecture: Ne jamais comparer `=== 0`, `=== 1`, `'0'`, `'1'` | Strictement vérifié par Layer 11 |

### G. IAS ZONE / MOTION

| ID | Règle | Explication |
|----|-------|-------------|
| G1 | Sleepy battery: opportunistic enrollment on wake | Attendre le wake pour IAS enrollment |
| G2 | `noIasMotion` override: check `_hasTuyaDPCluster` | Si pas de Tuya DP, ZCL-only |
| G3 | ZCL-only devices: force `noTemp=noHum=true` | Quand pas de 0xEF00 |
| G4 | Numeric cluster lookup: `0x0500` = `1280` | Utiliser clés string ET number |

### H. PHYSICAL BUTTON DETECTION

| ID | Règle | Explication |
|----|-------|-------------|
| H1 | 2000ms timeout for app command pending window | Standard |
| H2 | Track: `_lastOnoffState`, `_appCommandPending`, `_appCommandTimeout` | 3 variables d'état |
| H3 | `isPhysical = reportingEvent AND NOT _appCommandPending` | Logique de détection |
| H4 | `markAppCommandAll()` pour multi-gang | Firmware broadcast multi-EP |
| H5 | Dedup: skip same capability+value within 500ms | Anti-flood physique |

### I. BSEED ZCL-ONLY RULES

| ID | Règle | Explication |
|----|-------|-------------|
| I1 | Group toggle bug: firmware broadcast ZCL to ALL EPs | Z2M #27167, ZHA #2443 |
| I2 | Fix: `_removeGroupMemberships()` + `_lastCommandedGang` + 2s window | Pattern validé |
| I3 | `_TZ3000_v4l4b0lp` ajouté pour switch_3gang (Issue #170) | BSEED 3-gang ZCL routing |
| I4 | `requiresExplicitBinding=true` pour BSEED | Pas d'attr reports sans binding |
| I5 | Register capability listeners BEFORE attr listeners | Packetninja fix |

### J. TUYA DP PROTOCOL

| ID | Règle | Explication |
|----|-------|-------------|
| J1 | Cluster 0xEF00 (61184) | Porte-étendard Tuya DP |
| J2 | Types: 0=Raw 1=Bool 2=Value 3=String 4=Enum 5=Bitmap | Standard Tuya |
| J3 | DP values may need division: temp/10, hum/10, battery/2 | MAIS SmartDivisorManager le gère |
| J4 | Some manufacturers send raw C (no division) | Vérifier par fingerprint |
| J5 | Multi-DP frames: parse ALL DPs dans un seul report | Ne pas ignorer les DPs additionnels |
| J6 | Time Sync (0x24): 10-byte `[seq:2][UTC:4][Local:4]` | Echo `seqNum` from request |

### K. ENERGY & HYBRID DRIVERS

| ID | Règle | Explication |
|----|-------|-------------|
| K1 | **Plus de suffixe** `"hybrid"` ou `"hybride"` | Tous les drivers sont hybrides par défaut |
| K2 | Energy management globalisé | Pas de sous-dossier "hybrid" |
| K3 | Config keys: supprimer `hybrid` des directory/config/class | Normalisation |
| K4 | Clusters Électriques: `0x0B04` (RMS Current/Voltage/Power) | Toujours `configureReporting()` |
| K5 | Variable scoping: `scaledCurrent` ET `scaledPower` distincts | Pas de `const scaled` réutilisé |

### L. FINGERPRINTS

| ID | Règle | Explication |
|----|-------|-------------|
| L1 | Fingerprint = `manufacturerName` + `productId` COMBINÉ | Les DEUX doivent matcher |
| L2 | Même mfr dans plusieurs drivers = NORMAL | Différents productIds = OK |
| L3 | TRUE collision = même mfr + même productId incompatible | Seulement là, retirer |
| L4 | TS0601 collisions = inhérentes à Tuya (2094 restants) | Accepter, documenter |
| L5 | Case-insensitive: utiliser `driver-fingerprint-matcher.js` | NE PAS `.toLowerCase()` manuellement |
| L6 | Pas de wildcards SDK3: `_TZE284_*` INVALIDE | Chaque fingerprint complet |
| L7 | Mise à jour: `auto-learn-fingerprints.js` → compose.json | Pipeline automatisé |

---

## 🟢 GRAVITÉ BASSE (INFO / BONNE PRATIQUE)

### M. MULTI-GANG SWITCHES

| ID | Règle |
|----|-------|
| M1 | Capabilities: `onoff` (gang1), `onoff.gang2`, `onoff.gang3`, `onoff.gang4` |
| M2 | Endpoint mapping: EP1=gang1, EP2=gang2, etc. |
| M3 | Flow IDs: `{driver}_physical_gang{N}_{on\|off}` |
| M4 | Broadcast filter: `_lastCommandedGang` + 2s |
| M5 | Tuya DP: DP1-8 = gang states, DP14=power-on, DP15=backlight, DP101=child_lock |

### N. BUTTON DRIVERS

| ID | Règle |
|----|-------|
| N1 | OnOffBoundCluster per EP for multi-press detection |
| N2 | cmd 0xFD on genOnOff = press type (bind d'abord) |
| N3 | E000 BoundCluster for Tuya-specific button events |
| N4 | First press after sleep may be lost (Zigbee limitation) |

### O. VALIDATION & RELEASE

| ID | Règle |
|----|-------|
| O1 | Toujours: `npx homey app validate --level publish` |
| O2 | Toujours: `node -c` sur fichiers `.js` modifiés |
| O3 | Update `.homeycompose/app.json` version |
| O4 | Update `.homeychangelog.json` (add at TOP) |
| O5 | JAMAIS `npx homey app publish` local → GitHub Actions |
| O6 | `zb_` prefix warning in settings = cosmétique (app valide) |
| O7 | **Post-Promotion** : audit récursif docs + registres + dotfiles |
| O8 | **Comment robustness** : `grep -v '^[[:space:]]*//'` pour banned words |
| O9 | **Draft isolation** : `temp/` ignoré par syntax checker |
| O10 | **Base class exports** : `SensorBase.SensorBase = SensorBase; module.exports = SensorBase;` |
| O11 | **Universal Evolution Loop** : scan PRs/issues → auto-learn → self-heal → enrich |
| O12 | **Smart Divisors + UnifiedBatteryHandler** : vérifier que les imports sont corrects |
| O13 | **icon.svg OBLIGATOIRE à la racine** — SDK3 exige `/icon.svg`. Sans lui, Athom affiche `undefined` dans tous les champs du manifest (Name, SDK, Category, etc.) causant "Processing failed". Builds #2175-2179 ont été perdus pour cette raison |
| O14 | **CI bot INTERDIT de supprimer des manufacturerName[]** — Le bot (`nightly-auto-process`, `monthly-enrichment`) écrase `app.json` depuis `.homeycompose/` et perd les MFs ajoutés uniquement dans `app.json`. Le Dual-Layer Gate (`dual-layer-integrity-gate.yml`) bloque ce scénario |
| O15 | **Fichiers junk racine = pollution bundle** — Les commandes PowerShell mal échappées créent des fichiers comme `!d.startsWith('.')`, `$null`, `m.toLowerCase())` qui polluent le package Homey. Le script `scripts/maintenance/root-cleanup.js` et le workflow `root-cleanup-and-integrity.yml` automatisent le nettoyage |
| O16 | **Buffer-based JSON loading obligatoire** — Pour `app.json` (7MB) et `fingerprints.json`, toujours `JSON.parse(fs.readFileSync(path))` (Buffer) au lieu de `JSON.parse(fs.readFileSync(path, 'utf8'))` (String). Divise par 2 l'empreinte mémoire V8 heap. Limite Homey Pro: 64MB |
| O17 | **CHAMP `"icon"` INTERDIT dans app.json** — Le champ `"icon"` n'est PAS dans le schema `homey-lib` (schema.properties.icon = undefined). Athom SDK3 utilise TOUJOURS `assets/icon.svg` hardcodé (App.js:618). Ajouter `"icon": "icon.svg"` dans app.json cause "Processing failed" côté serveur Athom. Placer l'icône uniquement dans `assets/icon.svg` |
| O18 | **`*.json` WILDCARD INTERDIT dans .homeyignore** — La règle `*.json` exclut TOUS les JSON y compris les fichiers runtime critiques: `data/fingerprints.json` (DeviceFingerprintDB.js:83), `lib/tuya/fingerprints.json` (tuya-engine:14), `locales/*.json` (util/index.js:131). Pattern correct: exclure uniquement les fichiers dev spécifiques par chemin exact, jamais par wildcard `*.json` |
| O19 | **`category` DOIT être une STRING (pas un array)** — Bien que le schema homey-lib accepte `oneOf: [string, array]` et que la validation locale passe, le **serveur Athom rejette un array** et retourne Processing failed. stable-v5 utilise `"appliances"` (string). JAMAIS `["appliances"]` (array). Source: comparaison stable-v5 vs master |
| O20 | **Champ `api` + permission `homey:manager:api` causent des delays de review** — La permission `homey:manager:api` déclenche une "thorough review" (homey-lib/lib/App.js) et peut causer des délais ou rejets. La branche stable-v5 n'a pas ce champ. Supprimer `api` et vider `permissions: []` pour aligner sur stable-v5 |

### P. DIAGNOSTICS & SUPPORT

| ID | Règle |
|----|-------|
| P1 | Diag reports expire 60s après button press |
| P2 | Always ask: update to latest + remove + re-pair + diag |
| P3 | Piotr 2-gang `_TZ3000_cauq1okq` = DEVICE FIRMWARE (Z2M #14750) |
| P4 | configureReporting needed for power/voltage/current |

### Q. UNANNOUNCED TELEMETRY (PASSIVE MODE)

| ID | Règle |
|----|-------|
| Q1 | Sleepy devices broadcast telemetry on random intervals |
| Q2 | NEVER block reports due to "device initialized" status |
| Q3 | TuyaEF00Manager passive mode MUST remain intact |
| Q4 | Log: `[TUYA] 📥 Passive frame received` for diagnostics |

---

## 🔐 SÉCURITÉ & FUITE DE DONNÉES

### R. TOKENS & SECRETS

| ID | Règle | Explication |
|----|-------|-------------|
| R1 | **Jamais** token dans `.git/config` | Les tokens GitHub dans remote URLs fuient |
| R2 | **Jamais** `.env` dans le repo | Ajouter à `.gitignore`. Vérifier avant chaque push |
| R3 | **Jamais** `process.env.CLIENT_ID/SECRET` dans code runtime | Ces valeurs sont pour CI/CD uniquement |
| R4 | Homey PAT: stocker dans GitHub Secrets, pas dans code | `HOMEY_PAT` / `GH_PAT` via secrets |
| R5 | `DISCOURSE_API_KEY`: ne jamais hardcoder | Secret GitHub uniquement |
| R6 | Révocation immédiate si fuite suspectée | Aller sur `https://github.com/settings/tokens` |
| R7 | Audit `.git/config` régulier: `git remote -v` sans token | Vérifier les URLs |

---

## 📚 RÉFÉRENCES

- **UnifiedBatteryHandler**: `lib/battery/UnifiedBatteryHandler.js`
- **SmartDivisorManager**: `lib/managers/SmartDivisorManager.js`
- **DriverMappingLoader**: `lib/utils/DriverMappingLoader.js`
- **TuyaZigbeeDevice** (v8.5.0): `lib/tuya/TuyaZigbeeDevice.js`
- **Fleetwood Gateway**: docs/rules/FLEETWOOD_GATEWAY.md
- **Architecture AI**: docs/ARCHITECTURE_AI.md
- **Post-Promotion Protocol**: docs/rules/POST_PROMOTION_PROTOCOL.md
- **Global Investigation Plan**: docs/GLOBAL_INVESTIGATION_PLAN.md