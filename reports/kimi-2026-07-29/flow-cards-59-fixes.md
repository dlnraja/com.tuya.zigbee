# Flow Cards — Correction des 59 issues critiques

Date : 2026-07-29 · Projet : `com.tuya.zigbee` (`C:/Users/Dell/Documents/homey/master`)
Audit : `node scripts/analysis/audit_all_flow_cards.js`

## Résultat global

| Mesure | Avant | Après |
|---|---|---|
| CRITICAL – MISSING REGISTRATION | 17 | **0** |
| CRITICAL – MISSING RUNLISTENER | 0 | 0 |
| CRITICAL – TRIGGERED BUT NOT DEFINED | 42 | **0** |
| **Total critiques** | **59** | **0 (exit 0)** |

Preuves : `reports/audit_before.txt` (exit 1, 59 critiques) → `reports/audit_final.txt` (exit 0, « Aucune issue critique détectée »).

## Cause racine principale (26 des 42 « TRIGGERED BUT NOT DEFINED »)

L'audit ne lisait que le champ `flow` inline de `driver.compose.json`. Or les flow cards vivent dans
`driver.flow.compose.json` (421 drivers sur 431), fusionné dans `app.json` au build. Les IDs déclenchés
étaient donc valides — faux positifs de l'outil.

**Fix** : `scripts/analysis/audit_all_flow_cards.js` lit désormais les deux fichiers et fusionne
triggers/conditions/actions (dédoublonnage par id). Le CHECK 1 (missing registration) reste scopé aux
cards **inline** de `driver.compose.json` : les cards du flow compose sont enregistrées dynamiquement
(helpers, boucles, libs partagées) et un match littéral y produisait 4711 faux positifs.

Les 26 faux positifs ainsi résolus incluent : air_purifier, air_purifier_climate, air_purifier_contact,
air_purifier_dimmer, air_purifier_lcdtemphumidsensor, air_purifier_motion, bed_sensor (×2),
curtain_motor, curtain_motor_shutter, curtain_motor_wall, doorbell, fan_controller (×3),
presence_detector (×2), sensor_motion_presence, sensor_presence_radar, smart_scene_panel,
smoke_detector_advanced (×2), wall_dimmer_1gang_1way (×2), weather_station_outdoor (pressure, battery_low).

## 16 vrais « TRIGGERED BUT NOT DEFINED » corrigés

| # | Driver / ID déclenché | Cause | Fix |
|---|---|---|---|
| 1 | blaster_remote `ir_code_received` | code sans préfixe driver | (a) code → `blaster_remote_ir_code_received` (défini) |
| 2 | climate_sensor_smart `climate_sensor_smart_smart_scene_panel_scene_activated` | préfixe doublé (template smart_scene_panel) | (a) code → `climate_sensor_smart_scene_panel_scene_activated` + ID dynamique `..._switch_${g}_changed` corrigé (double « smart » supprimé) |
| 3 | contact_sensor_curtain `contact_button_pressed` | ID générique hérité template | (a) code → `contact_sensor_curtain_button_pressed` (défini) |
| 4 | contact_sensor_dimmer `contact_button_pressed` | card absente partout | (b) définition `contact_sensor_dimmer_button_pressed` ajoutée (pattern voisin curtain) + code aligné |
| 5-8 | generic_diy `identify`, `turn_on_endpoint`, `turn_off_endpoint`, `set_dim` | ces 4 cards existent comme **actions** ; le code utilisait `getDeviceTriggerCard` | (a) code → `getDeviceActionCard` (×4) |
| 9 | radar_sensor_2 `target_distance_changed` | card absente, ID non préfixé | (b) définition `radar_sensor_2_target_distance_changed` ajoutée (token `target_distance`, pattern voisin) + code aligné |
| 10 | sensor_climate_smart `sensor_climate_smart_climate_sensor_smart_smart_scene_panel_scene_activated` | triple préfixe ; cards renommées en hash sha1 | (a) code → IDs hachés définis (`..._pane_abe86` scene, map gang→`61d9d/57762/fbfa2/ceaca`) |
| 11-12 | sr_zs_switch `switch_state_changed`, `scene_triggered_configurable` | sans préfixe | (a) code → `sr_zs_switch_state_changed`, `sr_zs_switch_scene_triggered_configurable` |
| 13 | usb_outlet_advanced `usb_outlet_button_pressed` | préfixe partiel | (a) code → `usb_outlet_advanced_usb_outlet_button_pressed` |
| 14 | wall_remote_4_gang_2 `wall_remote_4_gang_buttons_2` | préfixe du driver parent (template) | (a) code → `wall_remote_4_gang_2_wall_remote_4_gang_buttons_2` |
| 15-16 | weather_station_outdoor `..._outdoor_temperature_changed`, `..._outdoor_humidity_changed` | « outdoor » en double | (a) code → `weather_station_outdoor_temperature_changed` / `_humidity_changed` |

## 17 « MISSING REGISTRATION » corrigés

Cards définies **inline** dans `driver.compose.json` (présentes dans app.json) mais jamais enregistrées :

| Driver | Cards | Fix |
|---|---|---|
| air_purifier_curtain | 4 actions `air_purifier_curtain_curtain_{calibrate,reset_position,hold,open_partial}` | enregistrement `getDeviceActionCard(...).registerRunListener` dans `driver.js` (logique capabilities : state up/down/idle, windowcoverings_set ; calibration = cycle best-effort avec setting `calibration_time`) |
| curtain_motor_tilt | 4 actions `curtain_{calibrate,reset_position,hold,open_partial}` | idem dans `curtain_motor_tilt/driver.js` |
| ir_blaster | action `ir_blaster_send_tv_command` | enregistrement dans `_registerEnhancedActions` : mappe la commande sur un code appris (`tv_power`…), fallback `IRCodeLibrary.getCode(brand,'tv',command)` |
| radiator_controller | 2 triggers, 2 conditions, 3 actions | `driver.js` réécrit : triggers `radiator_mode_changed`/`pilot_signal_sent`, conditions `radiator_is_heating`/`heating_mode_is`, actions `set_heating_mode`/`send_pilot_signal`/`set_temperature_offset` ; `device.js` : registration doublonne de `set_heating_mode` retirée, `pilot_signal_sent` désormais déclenché depuis `_sendPilotWireSignal` (résout aussi le warning DEFINED_NOT_TRIGGERED), méthode `_setTemperatureOffset` ajoutée |
| sensor_gas_presence | action `sensor_gas_presence_run_self_test` | enregistrement dans `_registerFlowCards` (délègue à `device.runSelfTest` si présent, sinon retour false loggé) |

## Vérifications

- `node --check` : OK sur les 18 fichiers JS touchés ; JSON valide pour les 2 flow compose modifiés.
- IDs : regex `^[a-z0-9_]+$` et ≤ 50 chars — 4844 cards dans `app.json`, **0 invalide**. Les 2 nouvelles
  cards (`radar_sensor_2_target_distance_changed`, `contact_sensor_dimmer_button_pressed`) seront
  régénérées dans app.json au build (flow sections non touchées à la main, conforme à la consigne ;
  `sync-appjson-zigbee.js` ne concerne que les blocs zigbee, inchangés).
- `npx mocha test/critical/*.test.js --timeout 10000` : **73 passing / 2 failing** (75 total).
  Les 2 échecs sont **pré-existants et hors scope** (routing manufacturer, aucun fichier touché par cette
  mission) : `button_wireless_4 must claim _TZ3000_rco1yzb1` et `switch_3gang must claim _TZ3000_eqsair32`
  (`test/critical/forum-routing-regressions.test.js:100` et `:162`).
- Aucun `git commit`/`push` effectué par cet agent. Note : un agent concurrent (agent-36, commit
  `49613f69f` à 02:41 UTC) a embarqué dans son commit une partie des modifications du working tree
  (édits device.js précoces + script d'audit) ; les 11 fichiers restants sont encore non commités.

## Restants (non critiques, documentés)

- 2754 warnings DEFINED_BUT_NEVER_TRIGGERED et 110 MISSING_TOKENS / 15 INCORRECT_CAPABILITY : révélés par
  la lecture du flow compose ; bruit structurel du repo (cards génériques déclenchées dynamiquement), hors
  scope des 59 critiques.
- Bug connu non traité (hors scope) : `air_purifier_curtain/driver.js` enregistre aussi
  `curtain_motor_tilt_{turn_on,turn_off,toggle}` (préfixe d'un autre driver, héritage de template) —
  double registration potentielle attrapée par try/catch. À corriger dans une passe dédiée.

## Fichiers modifiés

- `scripts/analysis/audit_all_flow_cards.js` (fix outil : lecture driver.flow.compose.json)
- `drivers/blaster_remote/device.js`, `drivers/climate_sensor_smart/device.js`,
  `drivers/sensor_climate_smart/device.js`, `drivers/contact_sensor_curtain/device.js`,
  `drivers/contact_sensor_dimmer/device.js`, `drivers/sr_zs_switch/device.js`,
  `drivers/usb_outlet_advanced/device.js`, `drivers/wall_remote_4_gang_2/device.js`,
  `drivers/weather_station_outdoor/device.js`, `drivers/radar_sensor_2/device.js`,
  `drivers/generic_diy/device.js`
- `drivers/contact_sensor_dimmer/driver.flow.compose.json` (+1 trigger),
  `drivers/radar_sensor_2/driver.flow.compose.json` (+1 trigger)
- `drivers/air_purifier_curtain/driver.js`, `drivers/curtain_motor_tilt/driver.js`,
  `drivers/ir_blaster/driver.js`, `drivers/sensor_gas_presence/driver.js`,
  `drivers/radiator_controller/driver.js`, `drivers/radiator_controller/device.js`
