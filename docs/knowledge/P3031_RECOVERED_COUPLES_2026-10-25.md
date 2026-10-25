# P3031 — couples historiques récupérés (master, 2026-10-25)

Demande t506u/t507u : récupérer les couples mfr×pid exacts des anciennes versions (toutes branches + tags) et les réintégrer intelligemment.

## Méthode

- Inventaire : listes manufacturerName×productId de chaque commit/tag (git cat-file, aucun clone complet), réduites aux couples **attestés** (source amont ou appareil ; jamais un produit cartésien).
- Diff vs HEAD de la branche ; raison de la perte via `git log -S` (colonne lastTouch de data/leads/p3031-recovered-couples.json).
- Retraits volontaires conservés : config/architecture/curated-couple-removals.json (0 collision), P2974/P3018b « un couple = un driver », pins W4, prune P2830 (f5ed9b65bf : _TZ3000_hktqahrq, _TZE200_bq5c8xfe restent retirés).
- Placement : driver le plus spécifique existant (propriétaire HEAD master ou modèle Z2M/ZHA/deCONZ) ; refus si le mfr appartient déjà à un autre driver avec un pid de ce driver (pas de doublon). Aucun nouveau driver.
- Sources (réécrites, pas de copie) : Koenkk/zigbee-herdsman-converters (MIT), ZHA quirks (Apache-2.0), deCONZ DDF (BSD-3), Blakadder, app Homey de JohanBendz et forks. Merci à leurs contributeurs.

## Couples réintégrés (31)

| driver | couple | source(s) |
|---|---|---|
| button_wireless_1 | _TYZB01_ub7urdza × TS0041A | Z2M-converters, Z2M-docs |
| curtain_motor_shutter | _TZE200_ra6wrlgv × TS0601 | Z2M-converters, Z2M-docs |
| gas_detector | _TZE204_qaxkdgyt × TS0601 | Z2M-converters, Z2M-docs |
| led_controller_dimmable | _TZ3210_4zinq6io × TS0501B | ZHA, Blakadder |
| led_controller_dimmable | _TZ3210_9q49basr × TS0501B | ZHA, Blakadder |
| led_controller_dimmable | _TZ3210_e5t9bfdv × TS0501B | ZHA, Blakadder |
| led_controller_dimmable | _TZ3210_agjx0pxt × TS0501B | ZHA |
| led_controller_dimmable | _TZ3210_d062rv7j × TS0501B | ZHA |
| led_controller_dimmable | _TZ3210_i680rtja × TS0501B | ZHA, Blakadder |
| led_controller_dimmable | _TZ3210_syh4kuef × TS0501B | ZHA |
| led_strip_rgbw | _TZ3000_g5xawfcq × TS0503B | Blakadder |
| light_cct_ts0502b | _TZB210_ue01a0s2 × TS0502B | Z2M-converters(whitelabel) |
| light_cct_ts0502b | _TZ3210_09hzmirw × TS0502B | Z2M-converters(whitelabel) |
| light_rgbcct_ts0505b | _TZB210_endmggws × TS0505B | Z2M-converters(whitelabel) |
| light_rgbcct_ts0505b | _TZ3210_jd3z4yig × TS0505B | Z2M-converters(whitelabel) |
| remote_dimmer | _TYZB01_hww2py6b × TS1001 | Z2M-converters, Z2M-docs, Blakadder |
| remote_dimmer | _TZ3000_ztrfrcsu × TS1001 | Z2M-converters, Z2M-docs |
| scene_switch_4 | _TZ3000_wbfgbpxq × TS0044 | deCONZ |
| smartplug | _TZ3210_2uk4z8ce × TS011F | Z2M-converters, Z2M-docs |
| smartplug | _TZ3000_xzhnra8x × TS011F | deCONZ |
| switch_module_whd02 | _TZ3000_dlhhrhs8 × TS000F | Z2M-converters, Z2M-docs |
| temphumidsensor | _TZ3000_ena8vgqb × TS0201 | deCONZ |
| temphumidsensor | _TZ3000_5nrcorgu × TS0201 | deCONZ |
| temphumidsensor | _TZ3000_yujem9ee × TS0201 | Z2M-converters(whitelabel) |
| wall_switch_1_gang_tuya | _TZE200_b0ihkhxh × TS0601 | Z2M-converters, Z2M-docs |
| wall_switch_4_gang_tuya | _TZE204_y4jqpry8 × TS0601 | Z2M-converters, Z2M-docs |
| water_leak_sensor_tuya | _TZE284_ajhu0zqb × TS0601 | Z2M-converters, Z2M-docs |
| water_valve_smart | _TZE200_htnnfasr × TS0601 | Z2M-converters, Z2M-docs, ZHA, deCONZ, Blakadder |
| water_valve_smart | _TZE200_7ytb3h8u × TS0601 | ZHA, Z2M-converters, Z2M-converters(whitelabel) |
| water_valve_smart | _TZE204_7ytb3h8u × TS0601 | ZHA, Z2M-converters, Z2M-converters(whitelabel) |
| water_valve_smart | _TZE284_7ytb3h8u × TS0601 | ZHA, deCONZ, Z2M-converters, Z2M-converters(whitelabel) |

## Enrichissement DP (catalogue, additif)

Lignes « noms seulement » (capability null, jamais requises au pairing, pas de 0xEF00 déclaré) ajoutées à data/dp_couple_knowledge.json puis catalogue + shards reconstruits (build-unknown-dp-catalog.js, build-dp-shards.js) :

- _TZE200_7ytb3h8u / _TZE204_7ytb3h8u (GIEX GX02/QT06_2) — Z2M giex.ts + legacy giexWaterValve
- _TZE200_ra6wrlgv (BOX ERC2206-Z) — Z2M box.ts
- _TZE284_xuflgcnz (RTX ZVG1) — Z2M rtx.ts + legacy fz.ZVG1

## Bloqués / à revoir

- _TYZB01_o63ssaah, _TZ3000_amis43tj, _TZ3000_c8bqthpo × TS0207 (master) : water_leak_blitzwolf_bw_is9 est un driver P2958 à couples exacts et water_leak_sensor entre en collision (gate fp-collision) avec water_leak_sensor_tuya, qui porte déjà ce mfr ; nécessite un driver dédié
- _TZ3000_arw23zcs, _TZ3000_it1hm1cr × TS0207 (master) : water_leak_blitzwolf_bw_is9 est à couples exacts (P2958) ; water_leak_sensor porte aussi TS0601, ce qui créerait une collision avec leur entrée TS0601 dans switch_1gang (gate fp-collision) ; nécessite un driver dédié
- _TZE200_yh7aoahi × TS0601 : smoke: collides with (yh7aoahi,TS0205) in smoke_sensor3 for every smoke driver
- _TZ3210_4ubylghk × TS110E : collision with rgb_led_strip TS0601
- _TZ3290_* (6) × TS1201 : IR blasters: mfrs sit as junk TS0601/TS0002 couples in climate_sensor/button_wireless_2
- _TZ1800_akzvkzqq × TS0211 : doorbell: collision with usb_dongle_triple
- _TZE204_myd45weu × TS0222 : collision with existing owner
- _TZ3000_0s1izerx/_TZ3000_bgsigers × SNTZ003/TY0201 : ambiguous whitelabel
- _TZ3000_abaplimj/_TZ3000_mqiev3jk × * : Z2M solar rain sensor vs deCONZ leak: conflicting sources
- _TZ3000_hktqahrq × TS0202 : deCONZ context points to WHD02 switch module, voluntarily pruned in f5ed9b65bf (P2830): kept removed
- _TZE200_bq5c8xfe × TS0202 : Z2M says TS0601 temp/hum; voluntarily pruned in f5ed9b65bf (P2830): kept removed
- _TZE21C_dohbhb5k/_TZE21C_i2ij4rb3 × TS0601 : thermostat-switch: driver uncertain
- SONOFF/non-Tuya (SNZB-02P …) × * : ~61 combos + collision risk, not restored
- malformed (eWeLi\u0001…, TZ3000_air9m6af, wildcards, xxxxxxxx) × * : not exact couples
- Mauvais placements à revoir (non modifiés) : _TZE284_goecjd1t (AVATTO ZWPM16, compteur) dans radiator_valve ; _TZE284_z98viqa6 (Moes SFD02-Z, variateur) dans curtain_motor.

## Plafond publish

Les ajouts source ne cassent pas le plafond 15500 (le compacteur publish tronque) ; un couple récupéré ne survit dans le payload que s’il est prioritaire (mfs_db / pins P2286). Non forcé ici.

Test : test/critical/p3031-recovered-couples.test.js.
