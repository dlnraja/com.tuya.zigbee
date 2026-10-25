# P3031 — couples historiques récupérés (bastien-home, 2026-10-25)

Demande t506u/t507u : récupérer les couples mfr×pid exacts des anciennes versions (toutes branches + tags) et les réintégrer intelligemment.

## Méthode

- Inventaire : listes manufacturerName×productId de chaque commit/tag (git cat-file, aucun clone complet), réduites aux couples **attestés** (source amont ou appareil ; jamais un produit cartésien).
- Diff vs HEAD de la branche ; raison de la perte via `git log -S` (colonne lastTouch de data/leads/p3031-recovered-couples.json).
- Retraits volontaires conservés : config/architecture/curated-couple-removals.json (0 collision), P2974/P3018b « un couple = un driver », pins W4, prune P2830 (f5ed9b65bf : _TZ3000_hktqahrq, _TZE200_bq5c8xfe restent retirés).
- Placement : driver le plus spécifique existant (propriétaire HEAD master ou modèle Z2M/ZHA/deCONZ) ; refus si le mfr appartient déjà à un autre driver avec un pid de ce driver (pas de doublon). Aucun nouveau driver.
- Sources (réécrites, pas de copie) : Koenkk/zigbee-herdsman-converters (MIT), ZHA quirks (Apache-2.0), deCONZ DDF (BSD-3), Blakadder, app Homey de JohanBendz et forks. Merci à leurs contributeurs.

## Couples réintégrés (17)

| driver | couple | source(s) |
|---|---|---|
| button_wireless_1 | _TYZB01_ub7urdza × TS0041A | Z2M-converters, Z2M-docs |
| button_wireless_3 | _TZ3000_pkeqinnt × TS0043 | deCONZ |
| curtain_motor | _TZE284_a0hirjnh × TS0601 | Z2M-converters, Z2M-docs, Z2M-converters(whitelabel) |
| curtain_motor | _TZE284_zuq5xxib × TS0601 | Z2M-converters, Z2M-docs |
| plug_energy_monitor | _TZ3008_xvfd3nkp × TS011F | Z2M-converters, Z2M-docs, Z2M-converters(whitelabel) |
| plug_energy_monitor | _TZ3008_qziabvzj × TS011F | Z2M-converters, Z2M-docs, Z2M-converters(whitelabel) |
| plug_energy_monitor | _TZ3008_iooniers × TS011F | Z2M-converters, Z2M-docs, Z2M-converters(whitelabel) |
| scene_switch_4 | _TZ3000_wbfgbpxq × TS0044 | deCONZ |
| switch_1gang | _TZ3000_ahvrgyac × TS0001 | Z2M-converters, Z2M-docs, Z2M-converters(whitelabel) |
| switch_1gang | _TZ3000_bbebkwjk × TS0001 | Z2M-converters, Z2M-docs |
| switch_2gang | _TZ3000_nuenzetq × TS0002 | deCONZ, JohanBendz-app, Homey-app:johan, Z2M-converters(whitelabel) |
| switch_2gang | _TZE28C1000000_o409r73p × TS0601 | Z2M-converters, Z2M-docs |
| switch_2gang | _TZ3000_hopb2kjm × TS0002 | Z2M-converters, Z2M-docs, Z2M-converters(whitelabel) |
| switch_3gang | _TZ3000_bu47m8pv × TS0003 | Z2M-converters, Z2M-docs, Z2M-converters(whitelabel) |
| switch_3gang | _TZ3000_f6pgzqob × TS0003 | Z2M-converters, Z2M-docs, Z2M-converters(whitelabel) |
| switch_4gang | _TZ300A_57kqwetw × TS0726 | Z2M-converters, Z2M-docs |
| wall_dimmer_tuya | _TZ3210_o235agwx × TS110E | Z2M-converters, Z2M-docs |

## Suggestions hors flotte Bastien (48)

Driver absent de keepDriverIds → non ajoutés, listés dans data/leads/p3031-recovered-couples.json.

## Bloqués / à revoir

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
