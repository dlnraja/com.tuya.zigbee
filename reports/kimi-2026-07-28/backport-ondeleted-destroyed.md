# Backport stable-v5 — chaîne `onDeleted` (issue #513) + gardes `_destroyed` (2026-07-28)

> Sources : `master/reports/kimi-2026-07-28/issue-513.md` et `master/reports/kimi-2026-07-28/destroyed-guard-fixes.md`.
> Cible : `C:/Users/Dell/Documents/homey/stable` (v5.12.29, branche stable-v5). **Aucun commit/push git.**

## Synthèse

| Famille | Applicables | Appliqués | Déjà présents | Non pertinents |
|---|---|---|---|---|
| A — `onDeleted` sans `super` (5 fixes master) | 5 | **5** | 0 | 0 |
| B — gardes `_destroyed` (29 fichiers / 36 erreurs checker) | 29 | **29** (37 gardes) | 0 | 0 |

Les 29 fichiers B de stable étaient **byte-identiques à master HEAD (pré-fix)** — vérifié par
`git show HEAD:<fichier>` vs stable pour chacun. La sortie du checker stable pré-fix était
identique à celle du rapport master (36 erreurs, mêmes fichiers/lignes).

## Fix A — chaîne `onDeleted` cassée (crash `null._onDeleted`, issue #513)

Pattern porté : appel parent gardé `if (super.onDeleted) { await super.onDeleted(); }` (+ `async`
si besoin), commentaires taggés « Backport (issue #513) » au lieu du tag version master.

| Fix master | Fichier stable | Défaut présent ? | Appliqué ? | Validation |
|---|---|---|---|---|
| `lib/tuya/TuyaZigbeeDevice.js:870` | `lib/tuya/TuyaZigbeeDevice.js` | Oui (racine de la hiérarchie, `onDeleted` sans super, `onUninit` appelait bien super) | Oui — appel parent gardé en fin de méthode | `node --check` OK |
| `lib/devices/UnifiedSensorBase.js:4489` | `lib/devices/UnifiedSensorBase.js` | Oui (code identique au master pré-fix) | Oui — appel parent gardé + try/catch | `node --check` OK |
| `lib/devices/TuyaUnifiedDevice.js:1852` | `lib/devices/TuyaUnifiedDevice.js` | Oui | Oui — méthode passée `async` + appel parent gardé | `node --check` OK |
| `drivers/outdoor_2_socket/device.secondSocket.js:34` | `drivers/outdoor_2_socket/device.secondSocket.js` | Oui (étend `ZigBeeDevice` directement) | Oui — `async` + appel parent gardé | `node --check` OK |
| `lib/templates/BEST_PRACTICE_DEVICE_TEMPLATE.js:184` | `lib/templates/BEST_PRACTICE_DEVICE_TEMPLATE.js` | Oui | Oui — appel parent gardé | `node --check` OK |

⚠️ **Limite du checker stable** : `scripts/validation/check-super-ondeleted.js` rapporte **0 erreur
avant ET après** le backport — il ne détecte pas ce pattern (il signale seulement 5 warnings
`onUninit` préexistants dans d'autres drivers). Le défaut a été confirmé par lecture directe des 5
méthodes. Le 6e override master (`lib/utils/ClassExtendsGuard.js`, stub intentionnel) n'existe pas
dans stable (`lib/utils/ClassExtendsGuard.js` absent) — non applicable.

## Fix B — gardes `_destroyed` (29 fichiers, 36 erreurs checker)

Le checker `scripts/validation/check-destroyed-guard.js` **existe dans stable** et a été utilisé
comme gate : **36 erreurs avant → 0 erreur après** (12 warnings « raw setCapabilityValue »
préexistants, inchangés).

Pattern porté : uniquement les lignes de garde (`if (this._destroyed) {return;}` en tête de
callback / avant l'appel SDK, `device?._destroyed` pour les fonctions module). **Non portés**
(volontairement, discipline backport minimal) : les reformattages cosmétiques du worktree master
(`return;` → `{return;}`, template literals, `let`→`const`), le refactor `safeSetTimeout` +
changement de signature de `MCUVersionHelper.configureMcuVersionRequest` (master : ajout du param
`device` ; stable : garde `this?._destroyed` comme documenté dans le rapport master), et un
changement sans rapport dans `UnifiedThermostatBase.js` (`activeOffset`, ligne ~759 du worktree
master).

| Fichier stable | Défaut présent ? | Gardes ajoutées | Emplacement |
|---|---|---|---|
| `drivers/curtain_module/device.js` | Oui (:63) | 1 | Avant `safeSetCapabilityValue('windowcoverings_set')` dans setParser |
| `drivers/curtain_module_2_gang/device.js` | Oui (:75) | 1 | Idem |
| `drivers/pir_mmwave_sensor/device.js` | Oui (:145) | 1 | Tête de `onZoneStatusAttributeReport` |
| `drivers/smart_garden_irrigation_control/device.js` | Oui (:53) | 1 | Callback `on('report')` batterie, avant `measure_battery` |
| `drivers/soil_sensor/device.js` | Oui (:214) | 1 | Tête de `_updateWaterAlarm` |
| `drivers/switch/device.js` | Oui (:286) | 1 | Avant le bloc `rmsCurrent` |
| `drivers/switch_wall_5gang/device.js` | Oui (:117) | 1 | Avant le 2e `safeSetCapabilityValue` (mode « magic ») |
| `drivers/switch_wall_6gang/device.js` | Oui (:117) | 1 | Idem |
| `drivers/switch_wall_7gang/device.js` | Oui (:117) | 1 | Idem |
| `drivers/switch_wall_8gang/device.js` | Oui (:153) | 1 | Idem |
| `drivers/sirentemphumidsensor/device.js` | Oui (:405-406) | 1 | Début du `case dataPoints.ALARM` |
| `drivers/siren_sirentemphumidsensor/device.js` | Oui (:264, :269) | 2 | Têtes de `handlePowerMode` et `reportHumidityCapacity` |
| `drivers/smart_knob_rotary/device.js` | Oui (:356, :367) | 2 | Têtes de `_triggerRotateRight` et `_triggerButtonPress` |
| `drivers/water_leak_sensor_tuya/device.js` | Oui (:45, :48, :54) | 2 | Tête de `onReport` + avant le cas dp 101 |
| `drivers/wifi_camera/device.js` | Oui (:143-144) | 1 | Tête de `_onDPData` |
| `drivers/blaster_remote/device.js` | Oui (4 timers) | 2 | Têtes des callbacks `setTimeout` (send 10 s, learn 30 s) |
| `drivers/garage_door_opener/device.js` | Oui (2 timers) | 1 | Après le délai 2 s, avant `requestDP(3)` |
| `drivers/led_controller_dimmable/device.js` | Oui (4 timers) | 2 | Après les délais 100 ms / 200 ms (stratégies ZCL) |
| `lib/devices/UnifiedPlugBase.js` | Oui (:337, :342) | 1 | Avant le bloc `rmsVoltage` du poll énergie |
| `lib/devices/UnifiedThermostatBase.js` | Oui (:285) | 1 | Tête du callback `attr.localTemperature` |
| `lib/mixins/VirtualButtonMixin.js` | Oui (:478) | 1 | Avant `safeSetCapabilityValue('onoff')` post-identify |
| `lib/mixins/ZigbeeHealthMixin.js` | Oui (:48) | 1 | Avant `safeSetCapabilityValue('alarm_presence')` |
| `lib/mixins/CapabilityManagerMixin.js` | Oui (2 timers) | 1 | Boucle d'attente `addCapability` (`return false`) |
| `lib/tuya/MagicPacketRegistry.js` | Oui (2 timers) | 1 | `device?._destroyed` après le délai inter-paquets |
| `lib/tuya/MCUVersionHelper.js` | Oui (2 timers) | 1 | `this?._destroyed` après le délai (pas de param `device` en stable — cf. note ci-dessus) |
| `lib/tuya/TS0601_EMERGENCY_FIX.js` | Oui (4 timers) | 2 | `device?._destroyed` après les délais 500 ms / 5000 ms |
| `lib/tuya/TuyaDPManager_Enhanced.js` | Oui (2 timers) | 1 | Tête de `_wait()` (`return Promise.resolve()`) |
| `lib/tuya/TuyaModernExtend.js` | Oui (1 timer) | 1 | `device?._destroyed` en tête de `sync` (setInterval time-sync) |
| `lib/tuya/TuyaSpecificClusterDevice.js` | Oui (6 timers) | 3 | Après délais de `waitForDeviceReady`, retry DP (`return`), bulk commands (`break`) |

Total : **37 gardes** pour 36 erreurs checker (plusieurs appels SDK dans un même callback sont
couverts par une seule garde ; à l'inverse certaines erreurs doublées sur des lignes adjacentes
sont couvertes par la même garde). Aucune logique métier modifiée.

## Validation stable

| Étape | Résultat |
|---|---|
| `node --check` sur les 34 fichiers modifiés | **34/34 OK** |
| `node scripts/validation/check-destroyed-guard.js` | **0 erreur, PASSED, exit 0** (avant : 36 erreurs, exit 1 ; 12 warnings préexistants inchangés) |
| `node scripts/validation/check-super-ondeleted.js` | PASSED, exit 0 (0 erreur avant/après — ne couvre pas le pattern, cf. note Fix A ; 5 warnings `onUninit` préexistants) |
| `npx mocha test/critical/*.test.js` | **12 passing, 0 fail** |
| `npx mocha "test/**/*.test.js"` (= script `npm test`) | **12 passing, 0 fail** (le glob ne matche que `test/critical` + racine, mêmes 12 tests) |
| `npx jest tests/unit` (hors script npm, jest.config.js) | **53/53 passed** (1 échec flaky au tout premier run à froid, non reproduit sur 3 runs suivants) |
| `node scripts/_validate_all.js` | **2/3, exit 1 — échec PRÉEXISTANT non lié** : `[M14] No changelog entry for v5.12.29 in .homeychangelog.json`. Le worktree stable contenait déjà des modifications non commitées de `app.json`, `.homeycompose/app.json`, `package.json`, `tools/ci/version-branch-gate.js` (bump de version en cours) avant ce backport. Broken requires : 2 faux positifs documentés (`BatteryMasterEngine.js`, `tuya-engine/index.js` — identiques à master). Driver mesh : 0 erreur. Warnings O20/M09 préexistants. |

## Discipline / fichiers touchés

34 fichiers modifiés, tous listés ci-dessus (5 fix A + 29 fix B) — uniquement des ajouts de gardes
et d'appels `super.onDeleted()` + commentaires « Backport (issue #513) ». Aucun autre fichier
touché. Aucun commit/push git.

## Points à suivre (non bloquants, hors scope)

- `lib/tuya/MCUVersionHelper.js` et `lib/tuya/MagicPacketRegistry.js` (stable) : `this.homey.setTimeout`
  dans des fonctions module où `this` est `undefined` (TypeError absorbé par les try/catch appelants)
  — le refactor `safeSetTimeout` + passage de `device` existe sur master mais n'a pas été porté
  (hors backport minimal). À planifier si souhaité.
- `check-super-ondeleted.js` (stable) ne détecte pas les overrides `onDeleted` sans super dans les
  classes de `lib/` — durcissement du checker à envisager.
- L'échec M14 (changelog v5.12.29) précède ce backport ; à résoudre avec le bump de version en cours.
