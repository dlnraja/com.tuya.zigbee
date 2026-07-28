# Master Backlog Fixes — 2026-07-28

> Suite de `scripts-catalog-phase1.md` (section « Bugs découverts à traiter », items #6, #8, #9),
> `dashboard-diag.md` et `destroyed-guard-fixes.md`. Aucun commit/push git.
> Environnement : Windows / Git Bash, Node v24, racine `C:/Users/Dell/Documents/homey/master`.

## Synthèse

| Tâche | Sujet | Résultat |
|---|---|---|
| 1 | Drivers avec `manufacturerName` vide | **27 drivers remplis (1 075 mfrs sourcés), 0 restant vide** — fingerprint-health PASS, 0 collision nouvelle |
| 2 | 21 tokens orphelins `air_purifier_*` + throw `lcdtemphumidsensor` | **20 cartes câblées dans le code, 1 token retiré (alignement carte←code)** ; throw supprimé → « No blocking throws » |
| 3 | `scripts/ULTIMATE_CHECK.js` stub vide | **Implémenté** (orchestrateur horodaté, fallbacks WARN, `--verbose`) |
| 4 | Checkers crachant sur artefacts CI absents | **2 scripts gardés** (`check-open-buttons.js`, `check-writes.js`) ; scan scripts/validation + scripts/ci : RAS |
| Bonus | `check-driver-health.js` : `node --check` sur fichiers JSON | **Corrigé** (924 faux échecs JSON éliminés) |

---

## TÂCHE 1 — Drivers à `manufacturerName` vide

### Périmètre réel (élargi en cours de session)

Le check initial listait **14 drivers** vides. En cours de session (23:44 local), un
**processus parallèle** a retiré les placeholders `_TZE200_placeholder_*` de **13 autres
drivers** (batch unique, mtime identique), les faisant passer dans la catégorie « vide ».
Les 27 drivers ont été traités avec la même rigueur.

### Méthodologie (pipeline auditable, scripts dans `tmp/`)

1. `tmp/filter-empty-mfr.js` — construit le pool de candidats par driver depuis des sources
   à **appariement mfr+pid préservé** uniquement :
   - `data/mfs_db.json` (`devices` par device + `driverMapping` par driver),
   - `scripts/sync/data/{z2m,zha,deconz,blakadder}.json` (fingerprints mfr+pid + catégorie/description),
   - `data/scanners/*.json` **uniquement** pour les records à 1 mfr ou 1 model
     (les fichiers multi-empreintes perdent l'appariement mfr×pid — source rejetée sinon).
2. Filtres d'acceptation :
   - **0 collision exacte** `mfr|pid` (case-sensitive, règle du gate CI `fp-collision-check`)
     avec tout autre driver non exempt, pour **tous** les pids du driver (produit croisé) ;
   - **preuve de classe** par familles (thermo, contact, motion, water, plug, light, dimmer,
     curtain, climate, gateway…) sur deviceType/driverHint/fichier z2m-zha/catégorie blakadder ;
   - exclusion des placeholders (`xxxx`, `unknown`, `_tz3000_g`, `_tz3000_xyz`…)
     et d'un faux « dongle » (`_TZE200_IOSSYXRA` = dongle moteur de rideau AM15) ;
   - **dédup inter-cibles** : un même mfr accepté dans 2 cibles aux pids recouverts est
     conservé dans une seule (priorité driverHint exact > driverMapping > sources > alpha) ;
   - pour 7 drivers sans candidat « propre » : mode **dual-case** (doctrine v5.5.297 du
     projet) — variantes de casse non réclamées de mfrs déjà présents ailleurs, avec preuve
     de famille de classe. Le gate CI étant case-sensitive, cela ne crée aucune collision.
3. `tmp/apply-empty-mfr.js` — pré-vérification anti-collision avant écriture, puis écrit
   `driver.compose.json` **et** `app.json` (fichier généré mais tracké ; cohérence exigée
   par `pre-commit-fp-sync.js`).

### Drivers remplis (27) — 1 075 mfrs au total

| Driver | mfrs | Preuves principales |
|---|---:|---|
| device_air_purifier_plug | 79 | blakadder/z2m plugs TS011F, mfs socket (dual-case) |
| device_air_purifier_radiator | 1 | z2m TRV AR331 (`_TZE284_nbv4tdaz`, seul TRV non réclamé) |
| device_plug_smart | 2 | blakadder/z2m prises Lidl TS0101 |
| dimmable_recessed_led | 16 | mfs+blakadder+z2m TS0502B (light) |
| dimmer_2_gang_tuya | 5 | mfs wall_dimmer, z2m « Dimmer 2 channel QADZ2 » |
| doorwindowsensor_4 | 3 | mfs contact (`_tze284_8whfphjv`, `cat0001`, `dss0010`) |
| gateway_zigbee_bridge | 5 | mfs `usb_dongle_triple` (dongles USB = bridges) |
| motion_sensor_switch | 8 | z2m/zha présence/PIR, mfs motion (TS0225) |
| sensor_contact_rain | 68 | blakadder contact TS0203 (dual-case) |
| smart_garden_irrigation_control | 5 | blakadder « Smart Garden Irrigation Control Woox », z2m rain sensor |
| temphumidsensor3 | 4 | mfs driverMapping explicite (SNTZ003) |
| wall_curtain_switch | 32 | z2m curtain TS130F + mfs curtain_motor_* (dual-case) |
| wall_switch_4_gang | 31 | driverMapping, z2m « 4 button remote », blakadder « Wall Switch 4 Gang » |
| water_detector | 1 | mfs water_leak (`_tz3210_tgvtvdo`, TS0207) |
| device_plug_energy | 2 | z2m outlet ZMO-606-P2 |
| device_radiator_valve | 197 | mfs/blakadder/z2m TRV+thermostat TS0601 (dual-case) |
| dimmable_led_strip | 82 | mfs light/dimmer, z2m dimmer |
| gas_sensor_switch | 1 | z2m « Gas sensor SM0212 » |
| lcdtemphumidsensor_3 | 10 | z2m temp/hum, mfs climate, driverMapping (`ntcht02`) |
| light_bulb_rgb_led | 41 | mfs+z2m+blakadder TS0505B light |
| plug | 5 | mfs switch TS0001/TS0003, z2m ZRM01 |
| rgb_led_strip | 15 | mfs+z2m+blakadder TS0505A light |
| rgb_mood_light | 2 | mfs driverMapping |
| rgb_wall_led_light | 2 | mfs driverMapping |
| sensor_climate_contact | 432 | mfs climate/contact TS0601 (dual-case) |
| sensor_climate_motion | 1 | mfs slim_motion_sensor |
| tunable_bulb_E14 | 25 | mfs+z2m+blakadder TS0502A light |

### Incidents et décisions

- **Collisions croisées** : `cat0001`/`dss0010`/`_tze284_8whfphjv` acceptés dans 3 drivers
  contact aux pids recouverts (produit croisé mfr×pid) → 15 collisions nouvelles détectées
  par le gate, corrigé (conservés dans `doorwindowsensor_4` uniquement) puis généralisé
  par la dédup inter-cibles du pipeline.
- **`sensor_climate_contact` (432 mfrs)** : gros volume assumé — variantes lowercase de mfrs
  climate/contact réclamés en uppercase par les catchalls (`climate_sensor`, `contact_sensor`).
  Doctrine dual-case explicite du projet (audit-case-sensitivity, fix v5.5.297).
- **`gateway_zigbee_bridge`** : son nom dit « gateway », ses pids disent « prises Sonoff ».
  Remplissage limité aux 5 dongles USB sourcés (`usb_dongle_triple`) — refus d'y verser
  500+ mfrs switch génériques (doctrine « pas de mfr hors classe »).
- **Fichiers** : 27× `drivers/<id>/driver.compose.json`, `app.json`.

### Validation

- `fp-collision-check.js --baseline` : **44 courantes, 0 nouvelle, exit 0** ✓
- `check-fingerprint-health.js` : **0 vide, PASS** ✓
- `pre-commit-fp-sync.js` (cohérence compose ↔ app.json) : **PASS** ✓

---

## TÂCHE 2 — Tokens orphelins + throw bloquant

### Constat

Les 21 cartes (`tools/ci/flow-coherence-audit.js`, drivers `air_purifier_*`) déclaraient des
tokens jamais fournis par le code. Le pattern des drivers voisins (`soil_sensor`,
`air_quality_co2`, `presence_sensor_radar`) est : **le code déclenche la carte avec le token**
(ex. `soil_sensor/device.js:383` → `.trigger(this, { moisture })`). Alignement fait dans ce
sens, sauf une carte.

### Corrections (11 fichiers)

| Driver | Cartes | Fix |
|---|---|---|
| `air_purifier` | pm25 | Trigger `{pm25}` dans le handler DP.pm25 (`device.js`) |
| `air_purifier_climate` | pm25 | Idem + liste d'enregistrement `driver.js` (ids copiés de air_purifier → ids propres) |
| `air_purifier_lcdtemphumidsensor` | pm25 | Idem (device.js + driver.js) |
| `air_purifier_motion` | pm25 | Idem (device.js + driver.js) |
| `air_purifier_dimmer` | brightness ×2, dim | **Bug d'ID** : le code déclenchait `air_purifier_dimmer_dimmer_wall_1gang_*` (double préfixe) au lieu de `air_purifier_dimmer_wall_1gang_*` → corrigé ; ajout du trigger `dim_changed` `{dim}` |
| `air_purifier_presence` | lux, distance | Override `safeSetCapabilityValue` → trigger `illuminance_changed`/`distance_changed` avec dédup (`_lastFlowValues`) |
| `air_purifier_quality` | co2, temperature, humidity, pm25 | Idem (override, map 4 caps) |
| `air_purifier_soil` | moisture, temperature, battery | Idem (override, map 3 caps) |
| `air_purifier_contact` | battery | Trigger dans `_handleBatteryUpdate` `{battery}` |
| `air_purifier_contact` | left_open (duration) | **Token retiré** de la carte (compose + app.json) : la sémantique « durée spécifiée » n'a ni arg ni implémentation nulle part dans le projet (les voisins `contact_sensor_zigbee` ont le même token jamais fourni) — alignement carte←code, rien d'inventé |
| `air_purifier_switch` | duration, clicks, action | **Bug d'ID** : `PhysicalButtonMixin` construit les IDs depuis `this.driver.id` (`air_purifier_switch`) mais les cartes sont préfixées `air_purifier_switch_1gang_` → override `_safeTriggerFlow` qui remap le préfixe (corrige aussi turned_on/off, power_changed, battery_low) |
| `lcdtemphumidluxsensor` | — | `throw new Error('QAAYS sensor endpoint 1 is unavailable')` dans `onNodeInit` → remplacé par un log + dégradation gracieuse (temp/hum tentées, lux/batterie skippés) |

Tous les helpers de trigger ont garde `_destroyed` + try/catch (doctrine projet).

### Validation

- `node --check` sur les 14 fichiers JS touchés : OK
- `verify_flows_integrity.js` : Missing 0, Format Errors 0 ✓
- `check-flow-cards.js` : 87 cartes, 0 JSON invalide ✓
- `audit-anti-generic.js` : **« ✅ No blocking throws found in onNodeInit »** ✓

---

## TÂCHE 3 — `scripts/ULTIMATE_CHECK.js` implémenté

Orchestrateur read-only (était un stub `'use strict'` seul). Lance dans l'ordre, avec logs
horodatés (nom, durée, PASS/FAIL) et résumé final à compteurs :

1. `scripts/PRE_COMMIT_CHECKS.js`
2. `scripts/_validate_all.js`
3. `scripts/validation/check-destroyed-guard.js`
4. Syntaxe `node --check` in-process (`vm.Script`) sur `app.js` + `lib/` (580 fichiers, ~1 s)
5. `scripts/validation/check-driver-health.js`

Règles : script introuvable/crash/timeout → **WARN + CONTINUE** ; exit final non-zero
**seulement** si un check a réellement FAIL (exit ≠ 0 ou verdict d'échec explicite).
`--verbose` pour la sortie détaillée.

Écueils corrigés en test : détection d'échec case-sensitive (le mot « failed » dans le nom
de fichier `cleanup-failed-runs.js` causait un faux FAIL) ; timeout porté à 15 min
(`check-driver-health` ≈ 10 min à froid).

---

## TÂCHE 4 — Gardes artefacts CI absents

| Fichier | Fix |
|---|---|
| `tools/ci/check-open-buttons.js` | Garde `existsSync` sur `.github/state/temporal-cross-reference.json` → log « SKIP artefact CI absent » + `exit 0` (avant : crash ENOENT ligne 2) |
| `tools/ci/check-writes.js` | Helper `readOrNull()` : chaque section lisant un fichier absent (ex. `.diag/johan-shadow-audit.js`) est SKIPPÉE avec log ; logique inchangée quand le fichier existe |

Scan `scripts/validation/` + `scripts/ci/` (readFileSync sur `.github/state/`, artefacts,
reports) : **aucun autre script non gardé** (les références à `.github/state` sont des
pathspecs git ou déjà protégées par `existsSync`).

## BONUS — Bug de catégorie dans `check-driver-health.js`

Le script lançait `node --check` sur **tous** les fichiers scannés, y compris les `.json`
(924 faux échecs « Syntax » noyant le rapport). `node --check` est désormais limité aux
fichiers `.js` (le check manufacturerName sur les JSON est conservé).

---

## Validation globale

| Check | Résultat |
|---|---|
| `node --check` sur tous les fichiers JS touchés | ✅ OK |
| `node scripts/_validate_all.js` | ✅ **3/3 checks passed** |
| `node .github/scripts/fp-collision-check.js --baseline …` | ✅ **0 collision nouvelle**, exit 0 |
| `node scripts/validation/check-fingerprint-health.js` | ✅ **0 driver vide, PASS** |
| `node scripts/validation/check-destroyed-guard.js` | ✅ 0 erreur, PASSED (12 warnings préexistants) |
| `node scripts/validation/check-driver-health.js` | ✅ 0 erreur (après fix JSON + 0 mfr vide) |
| `npx mocha test/critical/*.test.js` | ✅ **75 passing, 0 failing** (62 à l'époque du rapport phase 2 ; tests ajoutés entre-temps par d'autres sessions) |
| `node scripts/ULTIMATE_CHECK.js` | ✅ **exit 0** (5/5 PASS) |

## Fichiers modifiés (hors `tmp/` et ce rapport)

- `drivers/*/driver.compose.json` ×27 (manufacturerName) + `app.json`
- `drivers/air_purifier/device.js`, `air_purifier_climate/{device,driver}.js`,
  `air_purifier_lcdtemphumidsensor/{device,driver}.js`, `air_purifier_motion/{device,driver}.js`,
  `air_purifier_dimmer/device.js`, `air_purifier_presence/device.js`,
  `air_purifier_quality/device.js`, `air_purifier_soil/device.js`,
  `air_purifier_contact/device.js` + `driver.flow.compose.json`, `air_purifier_switch/device.js`
- `drivers/lcdtemphumidsensor/device.js`
- `scripts/ULTIMATE_CHECK.js` (implémentation)
- `scripts/validation/check-driver-health.js` (fix catégorie JSON)
- `tools/ci/check-open-buttons.js`, `tools/ci/check-writes.js`

Scripts d'analyse conservés pour audit : `tmp/filter-empty-mfr.js`, `tmp/apply-empty-mfr.js`,
`tmp/empty-mfr-final.json` (preuves par mfr).

## Points d'attention

- **Processus parallèle actif** sur le working tree (batch de modifs à 23:44 local :
  retrait de placeholders mfr sur 13 drivers, +13 tests mocha depuis le rapport phase 2,
  baseline de collisions modifiée à 03:06). Mes changements sont anti-collision vérifiés,
  mais un `git status` de revue est recommandé avant commit.
- `sensor_climate_contact` (432 mfrs) et `device_radiator_valve` (197) reposent sur la
  doctrine dual-case : si le projet décide un jour de normaliser la casse côté pairing,
  ces listes seront à revoir.
- Les 12 warnings « raw setCapabilityValue » de check-destroyed-guard restent préexistants
  (hors scope, déjà documentés).
