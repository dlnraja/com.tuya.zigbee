# Routage des 85 paires non routées (tmp/47pairs-unrouted.txt)

Date : 2026-07-29 — Auteur : kimi (subagent routage)

**Résultat : 85/85 paires routées** (46 mfrs uniques mis à jour dans `data/mfs_db.json`). 0 restant non routé.

Sources utilisées : snapshots locaux `scripts/sync/data/{z2m,blakadder,zha,deconz}.json`, `data/scanners/*.json`, et converters zigbee-herdsman-converters master (GitHub, notés `z2m_master`) quand le snapshot local avait une description nulle ou périmée. Aucune recherche web générique n'a été retenue comme preuve (les recherches par hash ne retournent rien d'exploitable).

Points notables :

- Le trio TS0207 (`_tz3000_hgm6k8ku` / `_tz3000_piuensvr` / `_tz3000_mmzmkkd4`) n'est PAS un water leak : z2m master `ewelink.ts` les identifie comme répéteurs USB (eWeLink CK-BL702-ROUTER-01, HOBEIAN ZG-807Z, COOLO ZG-807ZL). Preuve directe > heuristique TS0207.
- `_TZ3290_acv1iuslxi3shaaj` / `_TZ3290_rlkmy85q4pzoxobl` : le snapshot local disait « Tubular motor » (ZS06) — z2m master confirme ZS06 = télécommande IR universelle TS1201 (accord avec `zha ts1201.py`).
- `_tz3000_abci1hiu` : hint précédent `radiator_valve` erroné, corrigé → Moes ZS-SR4-2169 télécommande 4 boutons (Blakadder + Hubitat).
- `_tze200_ra6wrlgv` / `_tze200_yp5tsi3y` : les descriptions du snapshot local étaient des libellés de datapoints ; z2m master : roller shutter controller (BOX ERC2206-Z) et wall switch (BOX EWS1154-Z).
- `_tze200_rt5dklro` : clavier d'alarme DAEWOO WKE502Z (RFID) — catégorie identifiée, aucun driver Homey dédié (pas de driverHint, note dans l'entrée).
- Les 14 mfrs TS004x sont des boutons/télécommandes (Blakadder, Hubitat kkossev TS004F lib, SmartThings button-battery) ; plusieurs mfrs sont réutilisés sur plusieurs pids (notes dans les entrées).

| Paire | Source | Catégorie | driverHint | Confiance |
|---|---|---|---|---|
| _tze200_ra6wrlgv\|TS0601 | z2m, z2m_master | cover | curtain_module | 0.85 |
| _tze200_yp5tsi3y\|TS0601 | z2m, z2m_master | switch | switch_1gang | 0.8 |
| _tze200_rt5dklro\|TS0601 | z2m, z2m_master | sensor | unknown | 0.7 |
| _tz3000_hgm6k8ku\|TS0207 | local, z2m, z2m_master | router | zigbee_repeater | 0.85 |
| _tz3000_piuensvr\|TS0207 | local, z2m, z2m_master | router | zigbee_repeater | 0.85 |
| _tz3000_mmzmkkd4\|TS0207 | z2m, z2m_master | router | zigbee_repeater | 0.85 |
| _tze284_ajhu0zqb\|TS0601 | z2m, z2m_master | sensor | water_leak_sensor | 0.85 |
| _tz3000_dd8wwzcy\|TS011F | local, z2m, blakadder, domoticz | socket | plug_energy_monitor | 0.8 |
| _tze284_7qc2wlqr\|TS0601 | z2m, z2m_master | cover | curtain_motor | 0.85 |
| _tz3210_5ksufhqi\|TS0002 | z2m, z2m_master | switch | switch_2gang | 0.85 |
| _tze200_b0ihkhxh\|TS0601 | z2m, z2m_master | switch | switch_1gang | 0.85 |
| _tz3210_klsm24op\|TS0505B | z2m, z2m_master | light | bulb_rgbw | 0.85 |
| _tz3210_pdqu9pot\|TS0505B | z2m, z2m_master | light | bulb_rgbw | 0.85 |
| _tze284_rjjsib2d\|TS0601 | z2m, z2m_master | sensor | climate_sensor | 0.85 |
| _tz3290_u9xac5rv\|TS1201 | local, z2m, zha, z2m_master | remote | ir_remote | 0.85 |
| _tz3290_lidgqyzu\|TS1201 | z2m, z2m_master | remote | ir_remote | 0.85 |
| _tz3210_f0byevky\|ZB-CL01 | z2m, z2m_master | light | led_controller_rgb | 0.8 |
| _tyst11_jeaxp72v\|eaxp72v | local, zha, blakadder | thermostat | thermostatic_radiator_valve | 0.85 |
| _tyst11_kfvq6avy\|fvq6avy | local, zha | thermostat | thermostatic_radiator_valve | 0.75 |
| _tyst11_zivfvd7h\|ivfvd7h | local, zha, blakadder | thermostat | thermostatic_radiator_valve | 0.85 |
| _tyst11_hhrtiq0x\|hrtiq0x | local, zha | thermostat | thermostatic_radiator_valve | 0.75 |
| _tyst11_ps5v5jor\|s5v5jor | local, zha, blakadder | thermostat | thermostatic_radiator_valve | 0.85 |
| _tyst11_owwdxjbx\|wwdxjbx | local, zha | thermostat | thermostatic_radiator_valve | 0.75 |
| _tyst11_8daqwrsj\|daqwrsj | local, zha, z2m, blakadder | thermostat | thermostatic_radiator_valve | 0.85 |
| _tyst11_czk78ptr\|zk78ptr | local, zha, blakadder | thermostat | thermostatic_radiator_valve | 0.85 |
| _tyst11_ckud7u2l\|kud7u2l | local, zha, blakadder | thermostat | thermostatic_radiator_valve | 0.85 |
| _tyst11_ywdxldoj\|wdxldoj | local, zha | thermostat | thermostatic_radiator_valve | 0.75 |
| _tyst11_cwnjrr72\|wnjrr72 | local, zha | thermostat | thermostatic_radiator_valve | 0.75 |
| _tyst11_2atgpdho\|atgpdho | local, zha | thermostat | thermostatic_radiator_valve | 0.75 |
| _tyst11_wmcdj3aq\|mcdj3aq | local, zha, blakadder | cover | curtain_motor | 0.85 |
| _tz3290_acv1iuslxi3shaaj\|TS1201 | local, z2m, zha, z2m_master | remote | ir_remote | 0.85 |
| _tz3290_rlkmy85q4pzoxobl\|TS1201 | local, z2m, zha, z2m_master | remote | ir_remote | 0.85 |
| _tz3000_ixla93vd\|TS0042 | local, z2m, hubitat, smartthings, blakadder, z2m_master | remote | button_wireless_scene | 0.75 |
| _tz3000_ixla93vd\|TS0043 | local, z2m, hubitat, smartthings, blakadder, z2m_master | remote | button_wireless_scene | 0.75 |
| _tz3000_ixla93vd\|TS0044 | local, z2m, hubitat, smartthings, blakadder, z2m_master | remote | button_wireless_scene | 0.75 |
| _tz3000_ixla93vd\|TS0046 | local, z2m, hubitat, smartthings, blakadder, z2m_master | remote | button_wireless_scene | 0.75 |
| _tz3000_ixla93vd\|TS004F | local, z2m, hubitat, smartthings, blakadder, z2m_master | remote | button_wireless_scene | 0.75 |
| _tz3000_adkvzooy\|TS0046 | local, hubitat, smartthings, blakadder, deconz | remote | button_wireless_3 | 0.6 |
| _tz3000_fa9mlvja\|TS0042 | local, z2m, hubitat, smartthings, blakadder, z2m_master | remote | button_wireless_1 | 0.8 |
| _tz3000_fa9mlvja\|TS0044 | local, z2m, hubitat, smartthings, blakadder, z2m_master | remote | button_wireless_1 | 0.8 |
| _tz3000_fa9mlvja\|TS0046 | local, z2m, hubitat, smartthings, blakadder, z2m_master | remote | button_wireless_1 | 0.8 |
| _tz3000_fa9mlvja\|TS004F | local, z2m, hubitat, smartthings, blakadder, z2m_master | remote | button_wireless_1 | 0.8 |
| _tz3000_8rppvwda\|TS0042 | local, hubitat, smartthings | remote | remote_button_wireless | 0.6 |
| _tz3000_8rppvwda\|TS0043 | local, hubitat, smartthings | remote | remote_button_wireless | 0.6 |
| _tz3000_8rppvwda\|TS0044 | local, hubitat, smartthings | remote | remote_button_wireless | 0.6 |
| _tz3000_8rppvwda\|TS0046 | local, hubitat, smartthings | remote | remote_button_wireless | 0.6 |
| _tz3000_8rppvwda\|TS0215A | local, hubitat, smartthings | remote | remote_button_wireless | 0.6 |
| _tz3000_8rppvwda\|TS004F | local, hubitat, smartthings | remote | remote_button_wireless | 0.6 |
| _tz3000_ja5osu5g\|TS0041 | local, hubitat, smartthings, z2m, blakadder | remote | button_wireless_scene | 0.65 |
| _tz3000_ja5osu5g\|TS0042 | local, hubitat, smartthings, z2m, blakadder | remote | button_wireless_scene | 0.65 |
| _tz3000_ja5osu5g\|TS0043 | local, hubitat, smartthings, z2m, blakadder | remote | button_wireless_scene | 0.65 |
| _tz3000_ja5osu5g\|TS0044 | local, hubitat, smartthings, z2m, blakadder | remote | button_wireless_scene | 0.65 |
| _tz3000_ja5osu5g\|TS0046 | local, hubitat, smartthings, z2m, blakadder | remote | button_wireless_scene | 0.65 |
| _tz3000_ja5osu5g\|TS0215A | local, hubitat, smartthings, z2m, blakadder | remote | button_wireless_scene | 0.65 |
| _tz3000_w8jwkczz\|TS0041 | local, hubitat, smartthings | remote | remote_button_wireless | 0.6 |
| _tz3000_w8jwkczz\|TS0042 | local, hubitat, smartthings | remote | remote_button_wireless | 0.6 |
| _tz3000_w8jwkczz\|TS0046 | local, hubitat, smartthings | remote | remote_button_wireless | 0.6 |
| _tz3000_w8jwkczz\|TS0215A | local, hubitat, smartthings | remote | remote_button_wireless | 0.6 |
| _tz3000_w8jwkczz\|TS004F | local, hubitat, smartthings | remote | remote_button_wireless | 0.6 |
| _tz3000_w4thianr\|TS0041 | local, hubitat, smartthings | remote | remote_button_wireless | 0.6 |
| _tz3000_w4thianr\|TS0042 | local, hubitat, smartthings | remote | remote_button_wireless | 0.6 |
| _tz3000_w4thianr\|TS0046 | local, hubitat, smartthings | remote | remote_button_wireless | 0.6 |
| _tz3000_vp6clf9d\|TS0046 | local, hubitat, smartthings, blakadder, deconz | remote | button_wireless_4 | 0.8 |
| _tz3000_ufhtxr59\|TS0041 | local, hubitat, smartthings, blakadder | remote | button_wireless_4 | 0.8 |
| _tz3000_ufhtxr59\|TS0042 | local, hubitat, smartthings, blakadder | remote | button_wireless_4 | 0.8 |
| _tz3000_ufhtxr59\|TS0046 | local, hubitat, smartthings, blakadder | remote | button_wireless_4 | 0.8 |
| _tz3000_ufhtxr59\|TS004F | local, hubitat, smartthings, blakadder | remote | button_wireless_4 | 0.8 |
| _tz3000_wkai4ga5\|TS0215A | local, hubitat, smartthings, blakadder, deconz | remote | button_wireless_4 | 0.7 |
| _tz3000_abci1hiu\|TS0041 | local, hubitat, smartthings, blakadder, deconz | remote | button_wireless_4 | 0.8 |
| _tz3000_abci1hiu\|TS0042 | local, hubitat, smartthings, blakadder, deconz | remote | button_wireless_4 | 0.8 |
| _tz3000_abci1hiu\|TS0043 | local, hubitat, smartthings, blakadder, deconz | remote | button_wireless_4 | 0.8 |
| _tz3000_abci1hiu\|TS0046 | local, hubitat, smartthings, blakadder, deconz | remote | button_wireless_4 | 0.8 |
| _tz3000_abci1hiu\|TS0215A | local, hubitat, smartthings, blakadder, deconz | remote | button_wireless_4 | 0.8 |
| _tz3000_dku2cfsc\|TS0046 | local, hubitat, smartthings | remote | remote_button_wireless | 0.65 |
| _tz3000_dku2cfsc\|TS0215A | local, hubitat, smartthings | remote | remote_button_wireless | 0.65 |
| _tz3000_mh9px7cq\|TS0042 | local, z2m, hubitat, smartthings, blakadder, z2m_master | remote | button_wireless_4 | 0.85 |
| _tz3000_mh9px7cq\|TS0043 | local, z2m, hubitat, smartthings, blakadder, z2m_master | remote | button_wireless_4 | 0.85 |
| _tz3000_mh9px7cq\|TS0046 | local, z2m, hubitat, smartthings, blakadder, z2m_master | remote | button_wireless_4 | 0.85 |
| _tz3000_mh9px7cq\|TS0215A | local, z2m, hubitat, smartthings, blakadder, z2m_master | remote | button_wireless_4 | 0.85 |
| _tz3000_mh9px7cq\|TS004F | local, z2m, hubitat, smartthings, blakadder, z2m_master | remote | button_wireless_4 | 0.85 |
| _tz3000_j61x9rxn\|TS0042 | local, z2m, hubitat, smartthings, z2m_master | remote | button_wireless_4 | 0.85 |
| _tz3000_j61x9rxn\|TS0043 | local, z2m, hubitat, smartthings, z2m_master | remote | button_wireless_4 | 0.85 |
| _tz3000_j61x9rxn\|TS0046 | local, z2m, hubitat, smartthings, z2m_master | remote | button_wireless_4 | 0.85 |
| _tz3000_j61x9rxn\|TS0215A | local, z2m, hubitat, smartthings, z2m_master | remote | button_wireless_4 | 0.85 |
| _tz3000_j61x9rxn\|TS004F | local, z2m, hubitat, smartthings, z2m_master | remote | button_wireless_4 | 0.85 |

## Validation

- `node -e "JSON.parse(...data/mfs_db.json)"` → OK
- `node .github/scripts/fp-collision-check.js --baseline .github/fingerprint-collision-baseline.json` → exit 0 (0 current, 0 new)
