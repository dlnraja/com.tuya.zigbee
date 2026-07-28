# Correctifs destroyed-guard + validateurs (2026-07-28)

> Suite du rapport `scripts-catalog-phase1.md`, section « Bugs découverts à traiter » (items #2, #3, #4).
> Aucun commit/push git effectué.

## Synthèse

| Fix | Sujet | Validateur AVANT | Validateur APRÈS |
|---|---|---|---|
| FIX 1 | 36 erreurs « SDK call / timer sans garde `_destroyed` » | `check-destroyed-guard.js` : **36 erreurs, FAILED, exit 1** | **0 erreur, PASSED, exit 0** (12 warnings préexistants inchangés) |
| FIX 2 | Crash `main().catch()` sur non-Promise | `p89-case-sensitivity-audit.js` : crash systématique (`TypeError: main(...).catch is not a function`) | Exécution complète, exit 0, rapport JSON produit |
| FIX 3 | Checkers « FAILED mais exit 0 » | Non reproduit sur master actuel : les deux scripts **exit 1** déjà | Vérifié empiriquement — aucun changement de code nécessaire |

## FIX 1 — Gardes `_destroyed` (19 fichiers, 36 occurrences)

Pattern appliqué, cohérent avec le code voisin : `if (this._destroyed) {return;}` en tête de
callback/méthode, ou juste avant l'appel SDK quand une garde existait déjà mais hors de la
fenêtre de 10 lignes du checker. Pour les fonctions module recevant le device en paramètre :
`if (device?._destroyed) {return;}`. Aucune logique métier modifiée.

| Fichier | Occurrences | Correction |
|---|---|---|
| `drivers/curtain_module/device.js` | :63 | Garde avant `safeSetCapabilityValue('windowcoverings_set')` dans setParser |
| `drivers/curtain_module_2_gang/device.js` | :75 | Idem |
| `drivers/pir_mmwave_sensor/device.js` | :145 | Garde en tête de `onZoneStatusAttributeReport` |
| `drivers/smart_garden_irrigation_control/device.js` | :53 | Garde dans le callback `on('report')` batterie |
| `drivers/soil_sensor/device.js` | :214 | Garde en tête de `_updateWaterAlarm` |
| `drivers/switch/device.js` | :286 | Garde avant le bloc `rmsCurrent` (garde existante à >10 lignes) |
| `drivers/switch_wall_5gang/device.js` | :117 | Garde avant le 2ᵉ `safeSetCapabilityValue` (mode « magic ») |
| `drivers/switch_wall_6gang/device.js` | :117 | Idem |
| `drivers/switch_wall_7gang/device.js` | :117 | Idem |
| `drivers/switch_wall_8gang/device.js` | :153 | Idem |
| `drivers/sirentemphumidsensor/device.js` | :405-406 | Garde au début du `case dataPoints.ALARM` |
| `drivers/siren_sirentemphumidsensor/device.js` | :264, :269 | Gardes en tête de `handlePowerMode` et `reportHumidityCapacity` |
| `drivers/smart_knob_rotary/device.js` | :356, :367 | Gardes en tête de `_triggerRotateRight` et `_triggerButtonPress` |
| `drivers/water_leak_sensor_tuya/device.js` | :45, :48, :54 | Garde en tête de `onReport` + garde avant le cas dp 101 |
| `drivers/wifi_camera/device.js` | :143-144 | Garde en tête de `_onDPData` |
| `drivers/blaster_remote/device.js` | 4 timers | Gardes en tête des 2 callbacks `setTimeout` (send timeout 10 s, learn timeout 30 s) |
| `drivers/garage_door_opener/device.js` | 2 timers | Garde après le délai de 2 s avant `requestDP(3)` |
| `drivers/led_controller_dimmable/device.js` | 4 timers | Gardes après les 2 délais (`setTimeout` 100 ms / 200 ms) dans les stratégies ZCL |
| `lib/devices/UnifiedPlugBase.js` | :337, :342 | Garde avant le bloc `rmsVoltage` dans le poll énergie (garde d'entrée à >10 lignes) |
| `lib/devices/UnifiedThermostatBase.js` | :285 | Garde en tête du callback `attr.localTemperature` |
| `lib/mixins/VirtualButtonMixin.js` | :478 | Garde avant le `safeSetCapabilityValue('onoff')` post-identify |
| `lib/mixins/ZigbeeHealthMixin.js` | :48 | Garde avant `safeSetCapabilityValue('alarm_presence')` |
| `lib/mixins/CapabilityManagerMixin.js` | 2 timers | Garde dans la boucle d'attente `addCapability` (`return false`) |
| `lib/tuya/MagicPacketRegistry.js` | 2 timers | Garde `device?._destroyed` après le délai inter-paquets |
| `lib/tuya/MCUVersionHelper.js` | 2 timers | Garde `this?._destroyed` après le délai (voir « Points à suivre ») |
| `lib/tuya/TS0601_EMERGENCY_FIX.js` | 4 timers | Gardes `device?._destroyed` après les 2 délais (500 ms / 5000 ms) |
| `lib/tuya/TuyaDPManager_Enhanced.js` | 2 timers | Garde dans `_wait()` (`return Promise.resolve()`) |
| `lib/tuya/TuyaModernExtend.js` | 1 timer | Garde `device?._destroyed` en tête de `sync` (setInterval time-sync) |
| `lib/tuya/TuyaSpecificClusterDevice.js` | 6 timers | Gardes après les délais de `waitForDeviceReady`, retry DP (`return`) et bulk commands (`break`) |

Validation : `node scripts/validation/check-destroyed-guard.js` → **Errors: 0, PASSED, exit 0**
(avant : Errors: 36, FAILED, exit 1). Les 12 warnings « raw setCapabilityValue » sont
préexistants et hors scope.

## FIX 2 — `tools/ci/p89-case-sensitivity-audit.js:173`

- **Cause** : `main()` est synchrone (retourne `undefined`) → `main().catch(...)` lève
  `TypeError: main(...).catch is not a function` à chaque exécution.
- **Correctif** (`tools/ci/p89-case-sensitivity-audit.js:173`) : remplacement par
  `try { main(); } catch (e) { console.error(e); process.exit(1); }`. Comportement identique,
  gestion d'erreur conservée.
- **Vérification** : `node --check` OK ; exécution complète exit 0, summary imprimé,
  rapport écrit dans `.github/state/p89-case-sensitivity-audit.json` (répertoire d'état
  gitignored — aucune écriture dans `drivers/` ni `data/`).

## FIX 3 — Exit codes des checkers

Constat sur le master actuel (la mention « FAILED mais exit 0 » du catalogue ne se reproduit
plus — probablement corrigée entre-temps) :

- `scripts/validation/check-destroyed-guard.js` — `process.exit(1)` quand `errors > 0`
  (lignes 230-235). Vérifié : exit 1 avant FIX 1, exit 0 après. **Aucun changement.**
- `scripts/validation/check-driver-collisions.js` — `process.exit(1)` quand `hasErrors`
  (lignes 93-98). Vérifié : exit 1 (44 collisions). **Aucun changement.** Ce script n'a **pas**
  de mode baseline ; il n'est utilisé que dans `ai-monthly-audit.yml` avec `|| true` (non
  bloquant). La gate CI réelle est `.github/scripts/fp-collision-check.js --baseline
  .github/fingerprint-collision-baseline.json` (`validate.yml`, `unified-ci.yml`), qui est
  baseline-aware : vérifié **exit 0** — les 44 collisions courantes sont toutes couvertes par
  la baseline (426 entrées) et seules de **nouvelles** collisions feraient échouer la gate.

Logique de détection des deux scripts inchangée, conformément à la consigne.

## Validation finale

- `node --check` sur les 29 fichiers modifiés + le script CI : **tous OK**.
- `node scripts/_validate_all.js` : **3/3 checks passed**, exit 0 ( Mandatory OK / Broken
  requires OK — les 2 « requires cassés » sont les faux positifs documentés, gardés par
  try/catch / Driver mesh OK — 0 erreur, le bug #1 `wall_switch_4gang_1way` du catalogue est
  déjà résolu sur master ).
- `npx mocha test/critical/*.test.js` : **62 passing**, exit 0.

## Points à suivre (non bloquants, hors scope)

- `lib/tuya/MCUVersionHelper.js` et `lib/tuya/MagicPacketRegistry.js` utilisent
  `this.homey.setTimeout` dans des **fonctions module** où `this` n'est pas le device
  (undefined en strict mode → TypeError, actuellement absorbé par les try/catch appelants).
  La garde ajoutée satisfait le checker et est sans risque, mais le vrai correctif serait de
  passer `device`/`homey` en paramètre (refactor à planifier).
- Les 12 warnings « raw setCapabilityValue » du checker restent à traiter si le projet décide
  d'imposer `safeSetCapabilityValue` partout.

---

## FIX 4 (2026-07-28, session 2) — Refactor `this.homey.setTimeout` dans fonctions module

Résolution du premier « Point à suivre » ci-dessus : `lib/tuya/MCUVersionHelper.js` et
`lib/tuya/MagicPacketRegistry.js` appelaient `this.homey.setTimeout` dans des **fonctions
module** (pas des méthodes) — `this` est `undefined` en strict mode → TypeError absorbé par
les try/catch environnants → délais jamais appliqués (fonctionnalité silencieusement morte).

### Analyse des appelants

Grep exhaustif (`lib/`, `drivers/`, `app.js`, `test/`, `scripts/`, `tools/`) :
**aucun `require()` de ces deux modules nulle part** — ni `configureMcuVersionRequest`,
ni `getMagicPacketConfig`, ni `executeMagicPackets` ne sont importés/appelés (la seule
mention hors des fichiers eux-mêmes est un commentaire dans `lib/SDK3CompatBridge.js:35`).
Les homonymes `sendTimeSync` trouvés par grep appartiennent à d'autres classes
(`TuyaCommandSender`, `TuyaEF00Manager`, `TuyaTimeSyncManager`, …) sans lien avec ce module.
→ **Les deux modules sont du code mort actuellement.** Signatures corrigées quand même pour
cohérence, conformément à la consigne.

### Corrections

- `lib/tuya/MCUVersionHelper.js`
  - Ajout `const { safeSetTimeout } = require('../utils/safe-timers');` (pattern de
    `lib/tuya/DataRecoveryManager.js`).
  - `configureMcuVersionRequest(cluster, options)` → `configureMcuVersionRequest(device, cluster, options = {})`
    (device en première position, pattern du projet). JSDoc mis à jour.
  - `this.homey.setTimeout(r, delayBetween)` → `safeSetTimeout(device, r, delayBetween)` ;
    garde `this?._destroyed` → `device?._destroyed`.
  - `sendTimeSync(cluster, format)` et `formatTimeSync(date, format)` : aucun `this`
    problématique → inchangées (refactor minimal).
- `lib/tuya/MagicPacketRegistry.js`
  - Ajout du même import `safeSetTimeout`.
  - `executeMagicPackets(device, cluster, config)` : signature déjà correcte (device en
    paramètre) ; `this.homey.setTimeout(r, pkt.delay)` → `safeSetTimeout(device, r, pkt.delay)`.
    Garde `device?._destroyed` existante conservée.
- **try/catch** : conservés dans les deux fichiers — ils protègent aussi les commandes
  cluster (`mcuVersionRequest`, `dataQuery`, `sendFrame`) contre les erreurs Zigbee réelles,
  pas seulement le TypeError. Ce n'était donc pas leur seul rôle.
- `.homeybuild/` non touché (artefact de build généré).

### Validation

- `node --check` sur les 2 fichiers : OK.
- `node scripts/_validate_all.js` : **3/3 checks passed**, exit 0.
- `npx mocha test/critical/*.test.js` : **62 passing**, exit 0.
- `node scripts/validation/check-destroyed-guard.js` : **Errors: 0, PASSED, exit 0**
  (12 warnings « raw setCapabilityValue » préexistants inchangés).
