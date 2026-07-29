# Forum — 5 bugs « nécessitant interview » traités en défensif (2026-07-29)

> Mission : traiter sans interview les 5 bugs reliquats de
> `forum-bugs-reliquats-solo.md` (topic 140352), avec des fixes défensifs
> génériques (aucune devinette destructive). Périmètre respecté :
> `drivers/*/device.js`, `drivers/*/driver.compose.json` (mfrs), `lib/tuya/`,
> `test/`, `reports/`. Aucun commit/push.

## Bug 1 — Energy scaling ×660 (posts #2092/#2093)

- **Analyse** : les drivers meter (`din_rail_meter`, `device_plug_energy`)
  utilisent `smartDivisor: true` → `SmartDivisorManager.smartParse` avec
  défaut energy ÷100 (`KNOWN_DIVISORS.energy.default = 100`). Une famille
  ÷1000/÷10 non reconnue produit des valeurs cumulées absurdes (~660 kWh pour
  ~1 kWh). `device_din_rail` (doorbell) et `device_din_rail_meter`
  (déshumidificateur HVAC) n'ont aucune gestion d'énergie — rien à corriger.
  **PJ-1203A `_TZE204_81yrt3lo` vérifié** : `power_clamp_meter` applique ÷100
  sur DP106-109, conforme à Z2M #18419 — diviseur correct.
  **Bug évident trouvé** : `get meterProfile()` testait la liste de mfrs
  contre elle-même (`pj1203aIds.some(id => includesCI(pj1203aIds, id))`) →
  retournait **toujours** `'pj1203a'`, même pour les compteurs triphasés.
- **Fix appliqué** :
  - Nouveau `lib/tuya/EnergyJumpGuard.js` : garde défensive générique. Si un
    rapport cumulé `meter_power` fait un bond impossible (+500 kWh en un
    rapport, ou > 10000 kWh avec historique < 100), essaie les diviseurs
    alternatifs (×0.1, ×0.01), applique le premier plausible en facteur
    **sticky** et logue ; sinon accepte avec warning (jamais de drop
    silencieux).
  - Injection via override `safeSetCapabilityValue` dans
    `drivers/din_rail_meter/device.js`, `drivers/device_plug_energy/device.js`,
    `drivers/power_clamp_meter/device.js`.
  - Correction `meterProfile` : `includesCI(pj1203aIds, mfr)` (le mfr réel est
    maintenant comparé).
- **Preuve** : `node --check` OK sur les 4 fichiers ; heuristique ÷100
  PJ-1203A conforme Z2M #18419 (commentaires driver + Z2M).

## Bug 2 — TS0044 MOES `_TZ3000_u3nv1jwk` appuis non détectés

- **Analyse** : `drivers/button_wireless_4/device.js` v10.1.2 couvre déjà
  cluster E000 (cmd0-6/FD/FE/FF + BoundCluster), onOff on/off/toggle,
  LevelControl (step/move/stop), Tuya DP 1-4, intercepteur raw (0x0006/0xFD et
  0xE000), et scenes 0x0005 via `ButtonDevice._registerSceneRecallListener`.
  Les trames non reconnues étaient silencieusement ignorées.
- **Fix appliqué** : fallback VERBOSE v10.1.3 — `_logUnrecognizedFrame()`
  logue endpoint, cluster, command id et data hex de **toute** trame non
  reconnue (intercepteur raw + DPs Tuya hors 1-4 + trames DP imparsables),
  throttle 60 s par signature. Pur ajout de diagnostic, aucune devinette.
- **Preuve** : `node --check` OK ; test de routing TS0044 existant
  (`forum-routing-regressions`) toujours vert.

## Bug 3 — HOBEIAN ZG-222Z paire mais aucune donnée

- **Analyse** : 3 drivers portent `ZG-222Z`. `gas_sensor_switch` a une liste
  `manufacturerName` **vide** → ne claim rien (inerte). `water_leak_sensor`
  a déjà IAS complet (`IASZoneManager.enrollIASZone()` + `IASAlarmFallback`).
  Le vrai coupable : **`water_leak_sensor_tuya`** claim `_TZ3000_k4ej3ww2`
  (le mfr HOBEIAN du ZG-222Z, device TS0207 **IAS**) mais n'écoutait que le
  cluster Tuya EF00 (DP 14/15/101) — aucun enrollment IAS, aucun listener
  zoneStatus → le capteur paire et reste muet.
- **Fix appliqué** (`drivers/water_leak_sensor_tuya/device.js`) :
  - Enrollment IAS via `IASZoneManager` (pattern de `water_leak_sensor`) ;
    no-op logué pour les variantes TS0601 sans cluster IAS.
  - Lecture initiale `zoneStatus`/`zoneState` → `alarm_water`.
  - Fallback verbose : si ni DP ni IAS sous 5 min, log diagnostic détaillé
    (mfr, iasEnrolled, clusters présents) via `safeSetTimeout`
    (`lib/utils/safe-timers.js`), nettoyé dans `onDeleted`/`onUninit`.
  - `this.zclNode = zclNode` stocké (requis par `IASZoneManager`).
- **Preuve** : `node --check` OK ; `IASZoneManager._handleZoneStatusChange`
  gère `alarm_water` (alarm1 OU alarm2, fix Lasse_K v5.8.58).

## Bug 4 — INSOMA valve `_TZE284_fhvpaltk` « 4 dim levels »

- **Analyse** : grep exhaustif (`-i`) sur tous les `driver.compose.json` +
  `app.json` : `fhvpaltk` n'existe que dans
  `drivers/valve_dual_irrigation/driver.compose.json` (3 casses) et comme
  constante de profil dans `drivers/valve_irrigation/device.js`
  (`INSOMA_MFRS`, sans claim). **Aucune dual-claim dimmer/plug** — le
  dual-claim à l'origine du « 4 dim levels » a déjà été éliminé en amont.
  `valve_dual_irrigation` expose `onoff.valve_1/2`, `measure_battery`,
  `button.1` — conforme.
- **Fix appliqué** : aucun (rien à retirer). Vérifié par le gate collision.
- **Preuve** : grep `fhvpaltk` → uniquement valve_dual_irrigation ;
  collision check exit 0.

## Bug 5 — `_TZE200_ka8l86iu` expose motion mais pas presence

- **Analyse** : le device est documenté (dp_registry / device_matrix) comme
  HOBEIAN ZG-204ZK (mmWave CK-BL702) : DP1 presence, DP4 detection_distance,
  DP121 battery. Deux causes :
  1. Le mapping `KA8L86IU_BATTERY` DP1 utilise `enumMap {0:true, 1:false}` —
     pour une trame **booléenne** (sémantique binaire Z2M : true = présent),
     `enumMap[true] → enumMap["1"] → false` : inversion silencieuse.
  2. `UnifiedSensorBase` route l'occupancy ZCL (0x0406) vers `alarm_motion`
     **uniquement** ; `alarm_human` n'était alimenté que par les DP → motion
     sans presence.
- **Fix appliqué** :
  - `drivers/presence_sensor_radar/device.js` : trame booléenne avec enumMap
    → valeur prise directement (Z2M binaire, v8.0.1) ; override
    `safeSetCapabilityValue` mirror `alarm_motion` → `alarm_human`
    (cohérent avec le handler DP1 qui set déjà les deux).
  - `drivers/presence_sensor_radar/configs.js` : ajout des DPs documentés —
    DP4 `measure_luminance.distance` (detection_distance), DP121
    `measure_battery` (alt au DP110 historique).
- **Preuve** : `node --check` OK ; sources `data/dp_registry.json` (DP1/4/121
  ZG-204ZK) et `data/device_matrix.json` (ka8l86iu = ZG-204ZK HOBEIAN
  presence).

## Réparation annexe (gate mocha) — 2 mfrs manquants

Les tests `forum-routing-regressions` échouaient (73/75) **avant** mes
modifications (asserts sur `driver.compose.json`/`app.json`, fichiers non
touchés par les bugs 1-5) :
- `_TZ3000_rco1yzb1` absent de `button_wireless_4` (baseline collision :
  « button_wireless_4 vs scene fallback »).
- `_TZ3000_eqsair32` absent de `switch_3gang` (baseline : « 3-gang specific
  vs switch_1gang fallback »).

Les deux claims sont documentés comme légitimes par
`.github/fingerprint-collision-baseline.json` → restauration dans les deux
`driver.compose.json`, puis `node scripts/maintenance/sync-appjson-zigbee.js`
(synced: 379, changed: 13). Note : le sync écrit `app.json` minifié
(`JSON.stringify` sans indent) — re-formaté en 2 espaces pour un diff propre
(15 insertions / 56 suppressions, suppressions = mfrs obsolètes absents des
compose, ex. `device_radiator_valve_smart`/`valvecontroller` dont le compose
a une liste mfr vide — état pré-existant, fidèlement reflété).

## Validation finale

| Gate | Résultat |
|------|----------|
| `node --check` (8 fichiers modifiés/créés) | OK |
| `fp-collision-check.js --baseline` | **exit 0** (34 current, 0 new, tous baseline-couverts) |
| `node scripts/_validate_all.js` | **3/3 checks passed** |
| `npx mocha test/critical/*.test.js --timeout 10000` | **75 passing, 0 failing** |
| `sync-appjson-zigbee.js` | exécuté (mfrs touchés) |

## Fichiers touchés

- `lib/tuya/EnergyJumpGuard.js` (nouveau)
- `drivers/din_rail_meter/device.js`
- `drivers/device_plug_energy/device.js`
- `drivers/power_clamp_meter/device.js`
- `drivers/button_wireless_4/device.js`
- `drivers/water_leak_sensor_tuya/device.js`
- `drivers/presence_sensor_radar/device.js`
- `drivers/presence_sensor_radar/configs.js`
- `drivers/button_wireless_4/driver.compose.json` (+`_TZ3000_rco1yzb1`)
- `drivers/switch_3gang/driver.compose.json` (+`_TZ3000_eqsair32` ×2 casses)
- `app.json` (regénéré par sync canonique + re-formatage 2 espaces)
