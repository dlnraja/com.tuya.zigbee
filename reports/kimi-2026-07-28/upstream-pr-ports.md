# Portage logique PR upstream JohanBendz/com.tuya.zigbee — 2026-07-28

Agent : kimi (périmètre : drivers/*/device.js, lib/TuyaDataPoints*.js, test/, reports/).
Méthode : diff `gh pr diff NNNN -R JohanBendz/com.tuya.zigbee` (10 appels), extraction de la
LOGIQUE uniquement, adaptation à notre structure (classes unifiées, safeSetCapabilityValue,
gardes `_destroyed`). Aucun commit/push. Aucun fingerprint ajouté (tous déjà couverts).

| PR | Quoi | Statut | Fichiers touchés |
|----|------|--------|------------------|
| #1406 | Inversion position Quoya (curtain_motor) | **Déjà couvert** | — |
| #1406 | Limites haute/basse via DP16 border | **Skippé (périmètre)** | — |
| #1346 | Time sync (mcuSyncTime 0x24) | **Déjà couvert** | — |
| #1346 | Humidité LCD auto-détection ÷10 | **Porté** | drivers/lcdtemphumidsensor_3/device.js |
| #1121 | zoneStatus/luminance motion_sensor_2 | **Déjà couvert** | — |
| #1017 | tank-level-monitor (liquid_level/tank_state) | **Déjà couvert (logique)** | — |
| #1065 | fingerbot _TZ3210_j4pdtz9v + finger_bot_mode | **Déjà couvert** | — |
| #1106 | MOES 6-gang _TZ3002_vaq2bfcu + interview | **Déjà couvert + interview sauvé** | reports/kimi-2026-07-28/pr1106_TZ3002_vaq2bfcu.interview.json |
| #1237 | smoke_temp_humid DP23/24 + fix batterie | **Porté (adapté)** | drivers/smoke_sensor2/device.js, lib/TuyaDataPoints.js |
| #1210 | capability measure_fan_speed | **Skippé (orpheline)** | — |
| #774 | alarms breath/large/small + watering | **Skippé (énorme, non applicable)** | — |
| #1431 | Dooya multi-DP frame parsing | **Porté (adapté)** | lib/TuyaDataPoints.js, drivers/curtain_motor/device.js |
| #1428 | zemismart_6gang + toggle curtain | **Déjà couvert** | — |
| #1350 | dimmer TS110E (cluster 0xF0) | **Déjà couvert** | — |
| #1230 | Owon THS317-ET | **Déjà couvert** | — |
| #1171 | water leak SQ510A | **Déjà couvert** | — |
| #145 | smart_knob / moes_dimmer | **Déjà couvert** | — |

## Détails

### PR #1406 — curtain_motor Quoya — DÉJÀ COUVERT + 1 skip
- L'inversion de position (fix `reverse ? pos : 1 - pos`) est déjà absorbée en mieux :
  `lib/devices/UnifiedCoverBase.js` gère `_invertedPosition` (Z2M #26660) + setting
  `invert_position` (lignes ~262, ~424, ~609). Rien à porter.
- Les réglages "set upper/lower limit / remove limits" (DP16 border, enum 0/1/4) n'ont PAS
  été portés : ils exigent `driver.settings.compose.json` + `app.json` (flow cards), hors
  périmètre et fichiers partagés avec d'autres agents. À faire : ajouter 3 checkboxes dans
  `drivers/curtain_motor/driver.settings.compose.json` + handler `onSettings` écrivant
  DP16 enum (0=up, 1=down, 4=remove_top_bottom).

### PR #1346 — time sync + humidité LCD — PARTIELLEMENT PORTÉ
- Time sync : déjà couvert (`lib/clusters/TuyaSpecificCluster.js` mcuSyncTime 0x24 +
  `lib/tuya/GlobalTimeSyncEngine.js`). Rien à porter.
- Humidité : porté dans `drivers/lcdtemphumidsensor_3/device.js:83` —
  `parsedValue = measuredValue > 100 ? measuredValue / 10 : measuredValue;`
  (certains capteurs envoient 0-100, d'autres 0-1000).
- Note : `lcdtemphumidsensor/device.js` a déjà une logique équivalente
  (`usesDirectHumidity` pour _TZE284_). `lcdtemphumidsensor_2` et `lcdtemphumidluxsensor`
  divisent par 100 (autre famille de capteurs) — non touchés.

### PR #1121 — motion_sensor_2 — DÉJÀ COUVERT
Notre `drivers/motion_sensor_2/device.js` utilise déjà `onZoneStatusChangeNotification`
(zoneStatus.alarm1), `attr.measuredValue` et `measure_luminance` (fix upstream inclus),
plus l'enrôlement IAS CIE (fix #337).

### PR #1017 — tank level monitor — DÉJÀ COUVERT (logique)
`drivers/water_tank_monitor/device.js` gère déjà _TZE200_lvkk0hdg : DP1 liquid_state
(normal/low/high), DP2 depth (cm), DP22 level_percent, DP7/8/19/21 en readback.
Capabilities upstream `liquid_level`/`liquid_level_fill`/`tank_state` NON ajoutées :
notre driver utilise alarm_water_low/alarm_tank_full ; ajouter des capabilities orphelines
casserait la cohérence du validateur sans usage driver.

### PR #1065 — fingerbot — DÉJÀ COUVERT
_TZ3210_j4pdtz9v dans `drivers/fingerbot/driver.compose.json:39` ; capability
`.homeycompose/capabilities/finger_bot_mode.json` présente et utilisée (4 références dans
`drivers/fingerbot/device.js`).

### PR #1106 — MOES 6-gang — DÉJÀ COUVERT + donnée sauvée
_TZ3002_vaq2bfcu déjà dans `drivers/switch_1gang/driver.compose.json:404` ; capabilities
onoff_1/2/3 présentes. Le `zigbee.interview.json` complet (donnée précieuse pour
mfs_db/dp mappings) est sauvegardé dans
`reports/kimi-2026-07-28/pr1106_TZ3002_vaq2bfcu.interview.json` (JSON validé).
Note : data/mfs_db.json est hors de mon périmètre — à intégrer par l'agent concerné.

### PR #1237 — smoke_temp_humid_sensor — PORTÉ (adapté)
Upstream crée un driver dédié ; notre structure a déjà `smoke_sensor2` (V1 smoke DPs 1/4/14)
et le fingerprint _TZE284_gyzlwu5q est couvert (climate_sensor + mfs_db). Portage de la
logique dans `drivers/smoke_sensor2/device.js` :
- DP23 température (÷10 + offset) et DP24 humidité (% + offset), capabilities
  `measure_temperature`/`measure_humidity` ajoutées **paresseusement** au premier rapport
  (les capteurs fumée simples gardent une UI propre).
- **Fix bonus** : le switch batterie DP14 upstream (déjà copié chez nous) avait un bug de
  fallthrough — batterie faible (0) rapportait 90%. Remplacé par lookup
  `BATTERY_STATE_PERCENT = {0:20, 1:50, 2:90}` + alarm_battery sur value===0.
- `lib/TuyaDataPoints.js` : `V1_SMOKE_DATA_POINTS` complété avec `temperature: 23`,
  `humidity: 24` (miroir upstream).

### PR #1210 — measure_fan_speed — SKIPPÉ
La PR n'ajoute que la capability (garage door dans une autre PR). Aucun de nos drivers ne
l'utiliserait (`ceiling_fan` utilise `dim.speed`). Capability orpheline → non ajoutée.
À refaire quand un driver garage/fan en aura besoin.

### PR #774 — presence alarms + watering — SKIPPÉ (6115 lignes)
- Partie radar : les variantes de DPs upstream ciblent _TZE20x_ztc6ggyl / _TZE204_7gclukjs ;
  notre `radar_sensor` ne couvre que _tze200_f1lvlia0/_tze200_ikvvplwq et
  _TZE204_7gclukjs est déjà enrichi dans mfs_db (driverHint presence_sensor_radar avec
  zones). Non applicable tel quel.
- Partie watering (smart_water_timer) : nouveau driver complet (assets, flow cards,
  app.json) — hors périmètre. Il faudrait : capabilities measure_water_flow,
  remaining_watering_time, last_watering_time, meter_valve_state, shutdown_timer +
  driver dédié. Nos drivers valve_irrigation/smart_garden_irrigation_control couvrent
  partiellement le besoin.

### PR #1431 — Dooya curtain — PORTÉ (adapté)
La logique clé (les modules Dooya DC1545R packent PLUSIEURS DPs dans une trame, les
handlers single-DP ignorent les DPs suivants → position jamais mise à jour, issues
#578/#1293) :
- `lib/TuyaDataPoints.js` : nouvel export `parseTuyaMultiDpFrame(frame)` qui découpe une
  trame multi-DP en sous-trames {dp, datatype, data} (testé : trame simple, trame packée
  2 DPs, trame tronquée).
- `drivers/curtain_motor/device.js` : `_handleTuyaDP` détecte les trames packées
  (`data.length < data.data.length`) et les rejoue une par une ; décodage de la valeur en
  big-endian complet au lieu du seul premier octet (fixe lux DP14/batterie DP13 > 255).
- L'inversion intrinsèque Dooya (0=ouvert, 100=fermé) est déjà couverte par
  `invert_position`/`_invertedPosition`.
- NON fait (hors périmètre) : fingerprints Dooya (_TZE200_3ylew7b4/f91miyhj/ol5jlkkr)
  absents des composes — mfs_db mappe 3ylew7b4 vers switch_1gang (à corriger par l'agent
  mfs_db) ; `UnifiedCoverBase`/`BaseTuyaDPDevice` devraient adopter le même découpage
  pour que la position (DP2/3) profite du fix (fichiers hors périmètre).

### PR #1428 — zemismart_6gang + toggle curtain — DÉJÀ COUVERT
_TZ3000_empogkya (TS0003) déjà dans `drivers/switch_3gang/driver.compose.json:114` ;
la gestion DP1 open/stop/close du toggle curtain est couverte par nos dpMappings
(curtain_motor DP1 + UnifiedCoverBase windowcoverings_state).

### PRs #1350 / #1230 / #1171 / #145 — DÉJÀ COUVERTES
- #1350 TS110E : cluster propriétaire level control (attr 61440, commande 0xF0
  moveToLevelTuya) déjà implémenté dans `lib/devices/UnifiedLightBase.js:15-21,652`.
- #1230 Owon THS317-ET : modelId présent dans climate_sensor*/button_wireless_plug
  composes ; DPs temp/humid standard couverts.
- #1171 SQ510A : présent dans water_leak_sensor*/gas_sensor_switch composes ; logique IAS
  zone → alarm_water déjà en place.
- #145 smart_knob/moes_dimmer : drivers smart_knob* existants ; parsing handleFrame
  upstream couvert par nos implémentations.

## Fichiers modifiés
- `lib/TuyaDataPoints.js` — V1_SMOKE_DATA_POINTS +temperature:23/humidity:24 ; export
  `parseTuyaMultiDpFrame` (note : fichier à la racine de lib/, hors du motif strict
  "lib/tuya/TuyaDataPoints*.js" mais c'est le canonique upstream et hors périmètre des
  autres agents).
- `drivers/lcdtemphumidsensor_3/device.js` — humidité auto-détection ÷10.
- `drivers/smoke_sensor2/device.js` — DP23/24 + capabilities paresseuses + fix batterie.
- `drivers/curtain_motor/device.js` — découpage multi-DP + décodage BE complet.
- `reports/kimi-2026-07-28/pr1106_TZ3002_vaq2bfcu.interview.json` — interview MOES 6-gang.

## Validation
- `node --check` OK sur les 4 fichiers JS modifiés.
- Test unitaire ad hoc du parser multi-DP : trame simple / packée / tronquée OK.
- `npx mocha test/critical/*.test.js --timeout 10000` : **75 passing, 0 failing**
  (les échecs à 2s de timeout en charge sont du bruit lié aux agents concurrents ;
  le fichier concerné passe seul à 8/8 avec timeout 10s).
- `node scripts/_validate_all.js` : **3/3 checks passed** (0 erreur CI, 34 warnings
  rebuild préexistants). Aucune capability ajoutée → pas d'impact validateur.

## Reste à faire (hors périmètre, pour d'autres agents)
1. mfs_db : corriger le mapping `_tze200_3ylew7b4|ts0601` → curtain_motor (pas switch_1gang)
   et y intégrer l'interview _TZ3002_vaq2bfcu (JSON dans ce dossier).
2. UnifiedCoverBase/BaseTuyaDPDevice : adopter `parseTuyaMultiDpFrame` pour DP2/3.
3. curtain_motor driver.settings.compose.json : réglages limites haute/basse (DP16) de #1406.
