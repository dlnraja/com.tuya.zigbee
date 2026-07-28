# Résolution des mfrs synthétiques — data/mfs_db.json

Date : 2026-07-28 · Agent : kimi · Projet : `C:/Users/Dell/Documents/homey/master`
Périmètre respecté : **uniquement** `data/mfs_db.json`, `tmp/`, `reports/` (aucun driver, app.json, lib/, scripts/ touchés).

## Résumé

| | Valeur |
|---|---|
| Entrées synthétiques dans mfs_db | 95 |
| Résolues (`resolvedBy` ajouté) | **95 / 95** (dont 8 via fallback mot-clé, marquées *faible*) |
| Non résolues | **0** |
| Nouveaux vrais mfrs ajoutés à mfs_db | **5** (4308 → **4313**, stats.totalEntries maj) |
| Nouveaux mfrs issus du volet A (21 prunés) | `_tz3210_remypqqm`, `_tz3000_ubrvwoxv` |
| Validation | JSON parse OK · fp-collision-check **exit 0** · `_validate_all.js` **3/3** |

Backup pré-écriture : `data/mfs_db.json.bak.1785278420682`.

Scripts : `tmp/resolve-synthetic-mfrs.js` (analyse cross-sources, 10 423 fingerprints indexés depuis
blakadder/z2m/zha/hubitat/domoticz/smartthings/tuya-local), `tmp/apply-synthetic-resolution.js` (application).
Sorties d'analyse : `tmp/synthetic-resolution.json` (95 entrées, scores, vendors, noms commerciaux),
`tmp/pruned21-resolution.json` (14 templates).

Structure des nouvelles entrées : `manufacturerId` minuscule, `modelIds`, `deviceType` + `driverHint`
hérités du synthétique, `sources` réelles, `confidence: 0.5`, `lastSeen` du jour, plus `names`/`vendors`
commerciaux. Le champ `resolvedBy` ajouté aux synthétiques est sûr : les consommateurs
(`lib/helpers/ProbabilisticDeviceDetector.js`, `lib/utils/fingerprint-matcher.js`, `lib/dynamic/AutonomousEnricher.js`,
scripts d'enrichissement) ne lisent que des champs nommés — vérifié par grep.

## Volet A — les 21 mfrs prunés (14 templates)

**Origine git** : les 6 templates `_master_*` (dual-case = 12 mfrs) ont été créés le **2026-06-27** par le
commit bot `4e40e1f10` « Fix master publish validation gates » : les `manufacturerName: []` vides de drivers
génériques ont été remplis avec des placeholders pour passer les gates de publication Athom — ce ne sont
**pas** des devices observés. Les 7 `_TZE200_placeholder_*` datent du **10–12/07** (création des drivers
lumière `7b64ef71f` v9.0.192 puis consolidation « P11 carte blanche » `248d4da14`), même rôle de placeholder.
`_hybrid_lcdtemphumidsensor_3_*` (dual-case) : template placeholder de la même famille.

**Forme de restauration** : pas de réinjection des placeholders (ils n'ont jamais été observés et gonflent
app.json — le pruning reste justifié). Restauration = **correspondance vers les vrais mfrs** documentée dans
`tmp/pruned21-resolution.json` + ajout à mfs_db des vrais mfrs absents
(`_tz3210_remypqqm` Avacom « Tuya 12W E27 RGB+CCT Bulb », `_tz3000_ubrvwoxv` plug).
Pour `valve_dual_irrigation`, le vrai device était déjà connu : `_TZE284_eaet5qt5` / `_TZE284_fhvpaltk`
(déjà dans le driver) + correspondances GiEX Irrigation Valve (`_TZE200_SH1BTABB`, `_TZE200_A7SGHMMS`),
Tuya Water Valve (`_TZE200_WT9AGWF3`).

| Driver template | pids | Vrais mfrs (top 3) | Noms commerciaux | Sources |
|---|---|---|---|---|
| `device_plug_energy` | TS0002, TS0121, TS011F | `_TZ3000_G5XAWFCQ`<br>`_TZ3000_3OOAZ3NG`<br>`_TZ3000_AMDYMR7L` | BlitzWolf BW-SHP13<br>BlitzWolf BW-SHP13<br>BlitzWolf BW-SHP13 | blakadder, domoticz |
| `device_radiator_valve` | TS0601 | `_TZE200_BVU2WNXZ`<br>`_TZE200_HVAXB2TC`<br>`_TZE204_5TOC8EFA` | Avatto TRV06<br>Avatto TRV06<br>BSEED GL86HTBZ1 | blakadder, hubitat |
| `gas_sensor_switch` | TS0601 | `_TZE200_GGEV5FSL`<br>`_TZE200_YOJQA8XN`<br>`_TZE200_U9BFWHA0` | Tuya RSH_ZigBee-GS01<br>Tuya ZGB-QG<br>Beca BHT-003 | blakadder |
| `sensor_climate_contact` | TS0601 | `_TZE200_N8DLJORX`<br>`_TZE200_PAY2BYAX`<br>`_TZE200_WFXUHOEA` | Tuya ZG-102ZL<br>Tuya ZG-102ZL<br>LoraTap GDC311ZBQ1 | blakadder, hubitat, z2m |
| `sensor_climate_motion` | TS0601, TS0225 | `_TZ3218_AWARHUSB`<br>`_TZE200_IKVNCLUO`<br>`_TZE200_WUKB7RHC` | Linptech ES1<br>Moes ZSS-QY-HP<br>Moes ZSS-QY-HP | blakadder |
| `valve_dual_irrigation` | TS0601 | `_TZE200_U9BFWHA0`<br>`_TZE200_AOCLFNXZ`<br>`_TZE200_WT9AGWF3` | Beca BHT-003<br>Beca BHT-6000<br>Tuya FK-V02 | blakadder |
| `dimmable_led_strip` | TS0502B, TS110E, TS110F, TS0502 | `_TZB210_RKGNGB5O`<br>`_TZ3000_92chsky7`<br>`_TZ3210_tkkb1ym8` | Skydance S1-B(WZ)<br>Lonsonho QS-Zigbee-D02-TRIAC-2C-LN<br>QA QADZ1 | blakadder, z2m |
| `light_bulb_rgb_led` | TS0505B | `_TZ3000_V1SRFW9X`<br>`_TZ3000_GB5GAECA`<br>`_TZ3210_REMYPQQM` | Aldi C422AC11D41H140.0W<br>Aldi C422AC14D41H140.0W<br>Avacom TS0505B | blakadder |
| `plug` | TS0001, TS0003, TS000F, TS0011, TS011F | `_TZ3000_XKAP8WTB`<br>`_TZ3210_fhx7lk3d`<br>`_TZ3000_QNEJHCSU` | Aubess AP-SMT-Breaker02-1CH<br>BSEED TS011F_wall_outlet<br>Tuya QS-Zigbee-S05-EC | blakadder, z2m |
| `rgb_led_strip` | TS0505A | `_TZ3000_9CPUACA6`<br>`_TZ3000_GEK6SNAJ`<br>`_TZ3000_KDPXJU99` | Lidl 14148906L<br>Lidl 14149505L<br>Lidl HG06106A | blakadder, z2m, hubitat |
| `rgb_mood_light` | TS0505A, TS0505B | `_TZ3000_V1SRFW9X`<br>`_TZ3000_GB5GAECA`<br>`_TZ3210_REMYPQQM` | Aldi C422AC11D41H140.0W<br>Aldi C422AC14D41H140.0W<br>Avacom TS0505B | blakadder |
| `rgb_wall_led_light` | TS0505A | `_TZ3000_9CPUACA6`<br>`_TZ3000_GEK6SNAJ`<br>`_TZ3000_KDPXJU99` | Lidl 14148906L<br>Lidl 14149505L<br>Lidl HG06106A | blakadder, z2m, hubitat |
| `tunable_bulb_E14` | TS0502A | `_TZ3000_8UAOILU9`<br>`_TZ3000_RYLAOZUC`<br>`_TZ3000_5FKUFHN1` | Lidl 100335194<br>Lidl 14147206L<br>Lidl 14147206L | blakadder |
| `lcdtemphumidsensor_3` | TS0601, TS0201 | `_TZ3000_MXZO5RHF`<br>`_TZ3000_82PTNSD4`<br>`_TZ3000_YWAGC4RJ` | Danfoss Ally 014G2480<br>Mercator Ikuü SMA03P<br>Moes ZSS-KB-TH | blakadder, z2m, domoticz |
## Volet B — les 95 entrées synthétiques de mfs_db

Légende : *(faible)* = correspondance par mot-clé seul (pas de pid commun), à confirmer.
Les 5 nouveaux mfrs ajoutés à mfs_db : `_tz3210_remypqqm` (Avacom, ampoule RGB+CCT E27 12W),
`_tz3000_ubrvwoxv` (plug), `_tze3000_pfc7i3kt` (Moes, switch module 3 gang MS-104CZ),
`_tze200_rjxqso4a` (Moes, CO alarm ZSS-HM-CO), `_tz3000_m0btfbt7` (wall remote 6 gang).

| Synthétique | pids | Vrais mfrs (top 3) | Noms / vendors | Sources | Action |
|---|---|---|---|---|---|
| `_hybrid_air_purifier_climate_needs_device_assignment` | TS0601 | `_TZE200_D0YU2XGI`<br>`_TYST11_D0YU2XGI`<br>`_TZE200_T1BLO2BJ` | Neo NAS-AB02B0<br>Neo NAS-AB02B0<br>Neo NAS-AB02B2 | blakadder, z2m | resolvedBy ajouté |
| `_hybrid_air_purifier_curtain_needs_device_assignment` | TS0601 | `_TZE200_C2FMOM5Z`<br>`_TZE204_C2FMOM5Z`<br>`_TZE204_isvlaage` | Tuya Air Box<br>Tuya Air Box<br>Lincukoo E02C-Z10T | blakadder, z2m | resolvedBy ajouté |
| `_hybrid_air_purifier_dimmer_needs_device_assignment` | TS0601 | `_TZE200_C2FMOM5Z`<br>`_TZE204_C2FMOM5Z`<br>`_TZE204_isvlaage` | Tuya Air Box<br>Tuya Air Box<br>Lincukoo E02C-Z10T | blakadder, z2m | resolvedBy ajouté |
| `_hybrid_air_purifier_din_needs_device_assignment` | TS0601 | `_TZE200_C2FMOM5Z`<br>`_TZE204_C2FMOM5Z`<br>`_TZE204_isvlaage` | Tuya Air Box<br>Tuya Air Box<br>Lincukoo E02C-Z10T | blakadder, z2m | resolvedBy ajouté |
| `_hybrid_air_purifier_lcdtemphumidsensor_needs_device_assignment` | TS0601 | `_TZE200_D0YU2XGI`<br>`_TYST11_D0YU2XGI`<br>`_TZE200_T1BLO2BJ` | Neo NAS-AB02B0<br>Neo NAS-AB02B0<br>Neo NAS-AB02B2 | blakadder, z2m | resolvedBy ajouté |
| `_hybrid_air_purifier_motion_needs_device_assignment` | TS0601 | `_TZE200_IKVNCLUO`<br>`_TZE200_WUKB7RHC`<br>`_TZE200_HOLEL4DK` | Moes ZSS-QY-HP<br>Moes ZSS-QY-HP<br>Moes ZSS-QY-HP | blakadder | resolvedBy ajouté |
| `_tz3000_dummy1781425895942` | TS0601 | `_TZE200_IKVNCLUO`<br>`_TZE200_WUKB7RHC`<br>`_TZE200_HOLEL4DK` | Moes ZSS-QY-HP<br>Moes ZSS-QY-HP<br>Moes ZSS-QY-HP | blakadder | resolvedBy ajouté |
| `_hybrid_air_purifier_siren_needs_device_assignment` | TS0601 | `_TZE200_C2FMOM5Z`<br>`_TZE204_C2FMOM5Z`<br>`_TZE204_isvlaage` | Tuya Air Box<br>Tuya Air Box<br>Lincukoo E02C-Z10T | blakadder, z2m | resolvedBy ajouté |
| `_hybrid_air_purifier_soil_needs_device_assignment` | TS0601 | `_TZE200_MYD45WEU`<br>`_TZE200_GA1MAEOF`<br>`_TZE284_g2e6cpnw` | Qoto QT-07S<br>Qoto QT-07S<br>Tuya TS0601_soil | blakadder, z2m | resolvedBy ajouté |
| `_tz3000_dummy1781425895945` | TS0601 | `_TZE200_C2FMOM5Z`<br>`_TZE204_C2FMOM5Z`<br>`_TZE204_isvlaage` | Tuya Air Box<br>Tuya Air Box<br>Lincukoo E02C-Z10T | blakadder, z2m | resolvedBy ajouté |
| `_hybrid_blaster_remote_needs_device_assignment` | TS0601 | `_TZE200_9MAHTQTG`<br>`_TZE200_R731ZLXK`<br>`_TZE200_KYFQMMYL` | Zemismart TB26-6<br>Zemismart TB26-6<br>Lonsonho X713A | blakadder | resolvedBy ajouté |
| `_hybrid_boiler_switch_energy_needs_device_assignment` | TS0601 | `_TZE200_R32CTEZX`<br>`_TZE200_KYFQMMYL`<br>`_TZE200_WUNUFSIL` | Lerlink T2-Z67<br>Lonsonho X713A<br>Lonsonho X712A | blakadder, z2m, zha | resolvedBy ajouté |
| `_hybrid_bulb_rgb_rgbw_needs_device_assignment` | TS0601 | `_TZE200_chyvmhay`<br>`_TZE200_uiyqstza`<br>`_TZE200_3thxjahu` | Lidl HG08633<br>Lidl HG08633<br>Tuya WZ5_rgb_1 | z2m | resolvedBy ajouté |
| `_hybrid_button_wireless_fingerbot_needs_device_assignment` | TS0601 | `_TZE200_9MAHTQTG`<br>`_TZE200_R731ZLXK`<br>`_TZE200_KYFQMMYL` | Zemismart TB26-6<br>Zemismart TB26-6<br>Lonsonho X713A | blakadder | resolvedBy ajouté |
| `_hybrid_button_wireless_valve_needs_device_assignment` | TS0601 | `_TZE200_BVU2WNXZ`<br>`_TZE200_HVAXB2TC`<br>`_TZE204_5TOC8EFA` | Avatto TRV06<br>Avatto TRV06<br>BSEED GL86HTBZ1 | blakadder, hubitat | resolvedBy ajouté |
| `_hybrid_climate_sensor_dimmer_needs_device_assignment` | TS0601 | `_TZE200_D0YU2XGI`<br>`_TYST11_D0YU2XGI`<br>`_TZE200_T1BLO2BJ` | Neo NAS-AB02B0<br>Neo NAS-AB02B0<br>Neo NAS-AB02B2 | blakadder, z2m | resolvedBy ajouté |
| `_hybrid_climate_sensor_energy_needs_device_assignment` | TS0201 | `_TZ3000_MXZO5RHF`<br>`_TZ3000_82PTNSD4`<br>`_TZ3000_YWAGC4RJ` | Danfoss Ally 014G2480<br>Mercator Ikuü SMA03P<br>Moes ZSS-KB-TH | blakadder, z2m, domoticz | resolvedBy ajouté |
| `_hybrid_climate_sensor_plug_needs_device_assignment` | TS0601 | `_TZE200_D0YU2XGI`<br>`_TYST11_D0YU2XGI`<br>`_TZE200_T1BLO2BJ` | Neo NAS-AB02B0<br>Neo NAS-AB02B0<br>Neo NAS-AB02B2 | blakadder, z2m | resolvedBy ajouté |
| `_hybrid_climate_sensor_presence_needs_device_assignment` | TS0601 | `_TZE200_IKVNCLUO`<br>`_TZE200_WUKB7RHC`<br>`_TZE200_HOLEL4DK` | Moes ZSS-QY-HP<br>Moes ZSS-QY-HP<br>Moes ZSS-QY-HP | blakadder | resolvedBy ajouté |
| `_hybrid_climate_sensor_smart_needs_device_assignment` | TS0601 | `_TZE200_D0YU2XGI`<br>`_TYST11_D0YU2XGI`<br>`_TZE200_T1BLO2BJ` | Neo NAS-AB02B0<br>Neo NAS-AB02B0<br>Neo NAS-AB02B2 | blakadder, z2m | resolvedBy ajouté |
| `_hybrid_climate_sensor_switch_needs_device_assignment` | TS0601 | `_TZE200_D0YU2XGI`<br>`_TYST11_D0YU2XGI`<br>`_TZE200_T1BLO2BJ` | Neo NAS-AB02B0<br>Neo NAS-AB02B0<br>Neo NAS-AB02B2 | blakadder, z2m | resolvedBy ajouté |
| `_hybrid_contact_sensor_curtain_needs_device_assignment` | TS0601 | `_TZE200_N8DLJORX`<br>`_TZE200_PAY2BYAX`<br>`_TZE200_WFXUHOEA` | Tuya ZG-102ZL<br>Tuya ZG-102ZL<br>LoraTap GDC311ZBQ1 | blakadder, hubitat, z2m | resolvedBy ajouté |
| `_hybrid_contact_sensor_dimmer_needs_device_assignment` | TS0601 | `_TZE200_N8DLJORX`<br>`_TZE200_PAY2BYAX`<br>`_TZE200_WFXUHOEA` | Tuya ZG-102ZL<br>Tuya ZG-102ZL<br>LoraTap GDC311ZBQ1 | blakadder, hubitat, z2m | resolvedBy ajouté |
| `_hybrid_contact_sensor_plug_needs_device_assignment` | TS0601 | `_TZE200_N8DLJORX`<br>`_TZE200_PAY2BYAX`<br>`_TZE200_WFXUHOEA` | Tuya ZG-102ZL<br>Tuya ZG-102ZL<br>LoraTap GDC311ZBQ1 | blakadder, hubitat, z2m | resolvedBy ajouté |
| `_hybrid_contact_sensor_switch_needs_device_assignment` | TS0601 | `_TZE200_N8DLJORX`<br>`_TZE200_PAY2BYAX`<br>`_TZE200_WFXUHOEA` | Tuya ZG-102ZL<br>Tuya ZG-102ZL<br>LoraTap GDC311ZBQ1 | blakadder, hubitat, z2m | resolvedBy ajouté |
| `_hybrid_device_air_purifier_needs_device_assignment` | TS0601 | `_TZE200_BVU2WNXZ`<br>`_TZE200_HVAXB2TC`<br>`_TZE204_5TOC8EFA` | Avatto TRV06<br>Avatto TRV06<br>BSEED GL86HTBZ1 | blakadder, hubitat | resolvedBy ajouté |
| `_tze200_placeholder_generic` | TS0601_air_purifier, RH3001, TS0207, TS0505B, TS0044, TS0003, TY0201, TS0011 | `_TZ3000_HAFSQARE`<br>`_TZ3000_V4L4B0LP`<br>`_TZE200_R32CTEZX` | BSEED TS0011<br>Eardatek ESW-3ZAB-EU<br>Lerlink T2-Z67 | blakadder, z2m | resolvedBy ajouté |
| `_hybrid_device_air_purifier_din_needs_device_assignment` | TS0601 | `_TZE200_C2FMOM5Z`<br>`_TZE204_C2FMOM5Z`<br>`_TZE204_isvlaage` | Tuya Air Box<br>Tuya Air Box<br>Lincukoo E02C-Z10T | blakadder, z2m | resolvedBy ajouté |
| `_hybrid_device_air_purifier_floor_needs_device_assignment` | TS0601 | `_TZE200_BVU2WNXZ`<br>`_TZE200_HVAXB2TC`<br>`_TZE204_5TOC8EFA` | Avatto TRV06<br>Avatto TRV06<br>BSEED GL86HTBZ1 | blakadder, hubitat | resolvedBy ajouté |
| `_hybrid_device_air_purifier_humidifier_needs_device_assignment` | TS0601 | `_TZE200_C2FMOM5Z`<br>`_TZE204_C2FMOM5Z`<br>`_TZE204_isvlaage` | Tuya Air Box<br>Tuya Air Box<br>Lincukoo E02C-Z10T | blakadder, z2m | resolvedBy ajouté |
| `_hybrid_device_air_purifier_led_needs_device_assignment` | TS0601 | `_TZE200_C2FMOM5Z`<br>`_TZE204_C2FMOM5Z`<br>`_TZE204_isvlaage` | Tuya Air Box<br>Tuya Air Box<br>Lincukoo E02C-Z10T | blakadder, z2m | resolvedBy ajouté |
| `_hybrid_device_air_purifier_motion_needs_device_assignment` | TS0601 | `_TZE200_IKVNCLUO`<br>`_TZE200_WUKB7RHC`<br>`_TZE200_HOLEL4DK` | Moes ZSS-QY-HP<br>Moes ZSS-QY-HP<br>Moes ZSS-QY-HP | blakadder | resolvedBy ajouté |
| `_hybrid_device_air_purifier_presence_needs_device_assignment` | TS0601 | `_TZE200_IKVNCLUO`<br>`_TZE200_WUKB7RHC`<br>`_TZE200_HOLEL4DK` | Moes ZSS-QY-HP<br>Moes ZSS-QY-HP<br>Moes ZSS-QY-HP | blakadder | resolvedBy ajouté |
| `_hybrid_device_air_purifier_quality_needs_device_assignment` | TS0601 | `_TZE200_C2FMOM5Z`<br>`_TZE204_C2FMOM5Z`<br>`_TZE204_isvlaage` | Tuya Air Box<br>Tuya Air Box<br>Lincukoo E02C-Z10T | blakadder, z2m | resolvedBy ajouté |
| `_hybrid_device_air_purifier_siren_needs_device_assignment` | TS0601 | `_TZE200_C2FMOM5Z`<br>`_TZE204_C2FMOM5Z`<br>`_TZE204_isvlaage` | Tuya Air Box<br>Tuya Air Box<br>Lincukoo E02C-Z10T | blakadder, z2m | resolvedBy ajouté |
| `_hybrid_device_air_purifier_smart_needs_device_assignment` | TS0601 | `_TZE200_BVU2WNXZ`<br>`_TZE200_HVAXB2TC`<br>`_TZE204_5TOC8EFA` | Avatto TRV06<br>Avatto TRV06<br>BSEED GL86HTBZ1 | blakadder, hubitat | resolvedBy ajouté |
| `_hybrid_device_air_purifier_thermostat_needs_device_assignment` | TS0601 | `_TZE200_BVU2WNXZ`<br>`_TZE200_HVAXB2TC`<br>`_TZE204_5TOC8EFA` | Avatto TRV06<br>Avatto TRV06<br>BSEED GL86HTBZ1 | blakadder, hubitat | resolvedBy ajouté |
| `_hybrid_device_din_rail_meter_needs_device_assignment` | TS0001 | `_TZ3000_XKAP8WTB`<br>`_TZ3000_YL3ZUYAW`<br>`_TZ3000_BEZFTHWC` | Aubess AP-SMT-Breaker02-1CH<br>Cloud Even ZBS05-LN<br>EARU RDCBC/Z-1P/2P | blakadder | resolvedBy ajouté |
| `_hybrid_device_floor_heating_needs_device_assignment` | TS0601 | `_TZE200_BVU2WNXZ`<br>`_TZE200_HVAXB2TC`<br>`_TZE204_5TOC8EFA` | Avatto TRV06<br>Avatto TRV06<br>BSEED GL86HTBZ1 | blakadder, hubitat | resolvedBy ajouté |
| `_hybrid_device_floor_heating_thermostat_needs_device_assignment` | TS0601 | `_TZE200_BVU2WNXZ`<br>`_TZE200_HVAXB2TC`<br>`_TZE204_5TOC8EFA` | Avatto TRV06<br>Avatto TRV06<br>BSEED GL86HTBZ1 | blakadder, hubitat | resolvedBy ajouté |
| `_hybrid_device_plug_energy_monitor_needs_device_assignment` | TS0601 | `_TZE200_EAAC7DKW`<br>`_TZE200_LSANAE15`<br>`_TZE200_BYZDAYIE` | Tuya DAC2161C<br>Tuya DAC2161C<br>Hiking DDS238-2 | blakadder, z2m | resolvedBy ajouté |
| `_hybrid_device_radiator_valve_thermostat_needs_device_assignment` | TS0601 | `_TZE200_BVU2WNXZ`<br>`_TZE200_HVAXB2TC`<br>`_TZE204_5TOC8EFA` | Avatto TRV06<br>Avatto TRV06<br>BSEED GL86HTBZ1 | blakadder, hubitat | resolvedBy ajouté |
| `_hybrid_dimmer_0_10v_needs_device_assignment` | TS0601 | `_TZE200_3P5YDOS3`<br>`_TZE200_0NAUXA0P`<br>`_TZE200_DFXKCOTS` | BSEED GL86ZTD11<br>Eardatek EDM-1ZAA-EU<br>Eardatek EDM-1ZAA-EU | blakadder, zha | resolvedBy ajouté |
| `_hybrid_dimmer_1_gang_2_needs_device_assignment` | TS110E | `_TZ3210_tkkb1ym8`<br>`_TZ3210_ngqk6jia`<br>`_TZ3210_weaqkhab` | QA QADZ1<br>Tuya TS110E_1gang_1<br>Tuya TS110E_1gang_1 | z2m | resolvedBy ajouté |
| `_hybrid_dimmer_1_gang_tuya_needs_device_assignment` | TS110F | `_TZ3000_92chsky7`<br>`_TZ3000_hexqj6ls` | Lonsonho QS-Zigbee-D02-TRIAC-2C-LN<br>ClickSmart+ CSP051 | z2m | resolvedBy ajouté |
| `_hybrid_dimmer_4ch_needs_device_assignment` | TS0601 | `_TZE200_3P5YDOS3`<br>`_TZE200_0NAUXA0P`<br>`_TZE200_DFXKCOTS` | BSEED GL86ZTD11<br>Eardatek EDM-1ZAA-EU<br>Eardatek EDM-1ZAA-EU | blakadder, zha | resolvedBy ajouté |
| `_hybrid_dimmer_air_purifier_needs_device_assignment` | TS0601 | `_TZE200_C2FMOM5Z`<br>`_TZE204_C2FMOM5Z`<br>`_TZE204_isvlaage` | Tuya Air Box<br>Tuya Air Box<br>Lincukoo E02C-Z10T | blakadder, z2m | resolvedBy ajouté |
| `_hybrid_dimmer_bulb_dimmable_needs_device_assignment` | TS0601 | `_TZE200_3P5YDOS3`<br>`_TZE200_0NAUXA0P`<br>`_TZE200_DFXKCOTS` | BSEED GL86ZTD11<br>Eardatek EDM-1ZAA-EU<br>Eardatek EDM-1ZAA-EU | blakadder, zha | resolvedBy ajouté |
| `_hybrid_dimmer_wall_switch_needs_device_assignment` | TS0601 | `_TZE200_3P5YDOS3`<br>`_TZE200_0NAUXA0P`<br>`_TZE200_DFXKCOTS` | BSEED GL86ZTD11<br>Eardatek EDM-1ZAA-EU<br>Eardatek EDM-1ZAA-EU | blakadder, zha | resolvedBy ajouté |
| `_hybrid_dimmer_wall_water_needs_device_assignment` | TS0601 | `_TZE200_U9BFWHA0`<br>`_TZE200_AOCLFNXZ`<br>`_TZE200_WT9AGWF3` | Beca BHT-003<br>Beca BHT-6000<br>Tuya FK-V02 | blakadder | resolvedBy ajouté |
| `_tz3000_dummy1781425895946` | TS0601 | `_TZE200_N8DLJORX`<br>`_TZE200_PAY2BYAX`<br>`_TZE200_WFXUHOEA` | Tuya ZG-102ZL<br>Tuya ZG-102ZL<br>LoraTap GDC311ZBQ1 | blakadder, hubitat, z2m | resolvedBy ajouté |
| `_hybrid_door_controller_garage_needs_device_assignment` | TS0603 | `_TZE608_c75zqghm`<br>`_TZE608_fmemczv1`<br>`_TZE608_xkr8gep3` | LoraTap GDC311ZBQ1<br>LoraTap GDC311ZBQ1<br>LoraTap GDC311ZBQ1 | z2m | resolvedBy ajouté |
| `_hybrid_double_power_point_needs_device_assignment` | TS0601 | `_TZE284_5yah8qx4`<br>`_TZE200_0zaf1cr8`<br>`_TZE204_ntcy3xu1` | Nova Digital TO-WK-1W/B<br>Tuya TS011F_3_gang<br>Tuya TS011F_3_gang | z2m | resolvedBy ajouté |
| `_hybrid_double_power_point_2_needs_device_assignment` | TS0601 | `_TZE284_5yah8qx4`<br>`_TZE200_0zaf1cr8`<br>`_TZE204_ntcy3xu1` | Nova Digital TO-WK-1W/B<br>Tuya TS011F_3_gang<br>Tuya TS011F_3_gang | z2m | resolvedBy ajouté |
| `_hybrid_energy_meter_din_needs_device_assignment` | TS0601 | `_TZE200_EAAC7DKW`<br>`_TZE200_LSANAE15`<br>`_TZE200_BYZDAYIE` | Tuya DAC2161C<br>Tuya DAC2161C<br>Hiking DDS238-2 | blakadder, z2m | resolvedBy ajouté |
| `_hybrid_gas_sensor_needs_device_assignment` | TS0601_gas | `_TZE200_GGEV5FSL`<br>`_TZE200_YOJQA8XN`<br>`_TZE200_U9BFWHA0` | Tuya RSH_ZigBee-GS01<br>Tuya ZGB-QG<br>Beca BHT-003 | blakadder | resolvedBy ajouté |
| `_hybrid_hvac_air_conditioner_needs_device_assignment` | TS0601_ac | `_TZE200_BVU2WNXZ`<br>`_TZE200_HVAXB2TC`<br>`_TZE204_5TOC8EFA` | Avatto TRV06<br>Avatto TRV06<br>BSEED GL86HTBZ1 | blakadder, hubitat | resolvedBy ajouté |
| `_hybrid_illuminance_sensor_needs_device_assignment` | TS0222 | `_TZ3000_t9qqxn70`<br>`_TZE200_khx7nnka`<br>`_TZE200_yi4jtqq1` | Tuya TS0222_light<br>— Tuya Zigbee Light Sensor.groovy<br>— Tuya Zigbee Light Sensor.groovy | z2m, hubitat | resolvedBy ajouté |
| `_hybrid_lcdtemphumidsensor_2_needs_device_assignment` | TS0601 | `_TZE200_D0YU2XGI`<br>`_TYST11_D0YU2XGI`<br>`_TZE200_T1BLO2BJ` | Neo NAS-AB02B0<br>Neo NAS-AB02B0<br>Neo NAS-AB02B2 | blakadder, z2m | resolvedBy ajouté |
| `_hybrid_outdoor_2_socket_needs_device_assignment` | TS0601 | `_TZE200_N8DLJORX`<br>`_TZE200_PAY2BYAX`<br>`_TZE200_WFXUHOEA` | Tuya ZG-102ZL<br>Tuya ZG-102ZL<br>LoraTap GDC311ZBQ1 | blakadder, hubitat, z2m | resolvedBy ajouté |
| `_hybrid_plug_smart_needs_device_assignment` | TS0111 | `_TZ3000_IDRFFZNF` *(faible)*<br>`_TZ3000_9VO5ICAU` *(faible)*<br>`_TZ3000_O1JZCXOU` *(faible)* | Avatto CLY8101U-GE<br>Avatto TS011F<br>BSEED GL86ZEUSK1 | blakadder, domoticz, z2m | resolvedBy ajouté |
| `_hybrid_plug_smart_switch_needs_device_assignment` | TS0601 | `_TZE200_EAAC7DKW`<br>`_TZE200_LSANAE15`<br>`_TZE200_BYZDAYIE` | Tuya DAC2161C<br>Tuya DAC2161C<br>Hiking DDS238-2 | blakadder, z2m | resolvedBy ajouté |
| `_hybrid_radar_sensor_2_needs_device_assignment` | TS0601 | `_TZE200_IKVNCLUO`<br>`_TZE200_WUKB7RHC`<br>`_TZE200_HOLEL4DK` | Moes ZSS-QY-HP<br>Moes ZSS-QY-HP<br>Moes ZSS-QY-HP | blakadder | resolvedBy ajouté |
| `_hybrid_radiator_controller_needs_device_assignment` | TS0601_rad | `_TZE200_BVU2WNXZ`<br>`_TZE200_HVAXB2TC`<br>`_TZE204_5TOC8EFA` | Avatto TRV06<br>Avatto TRV06<br>BSEED GL86HTBZ1 | blakadder, hubitat | resolvedBy ajouté |
| `_tz3000_dummy1781425895948` | TS0601 | `_TZE200_VUCANKJX`<br>`_TZE200_E3OITDYU`<br>`_TZE200_LA2C2UO9` | LoraTap TGM100W<br>Moes MS-105B<br>Moes MS-105Z | blakadder, domoticz | resolvedBy ajouté |
| `_hybrid_remote_button_wireless_fingerbot_needs_device_assignment` | TS0601 | `_TZE200_9MAHTQTG`<br>`_TZE200_R731ZLXK`<br>`_TZE200_KYFQMMYL` | Zemismart TB26-6<br>Zemismart TB26-6<br>Lonsonho X713A | blakadder | resolvedBy ajouté |
| `_hybrid_remote_button_wireless_scene_needs_device_assignment` | TS0601 | `_TZE200_9MAHTQTG`<br>`_TZE200_R731ZLXK`<br>`_TZE200_KYFQMMYL` | Zemismart TB26-6<br>Zemismart TB26-6<br>Lonsonho X713A | blakadder | resolvedBy ajouté |
| `_hybrid_remote_button_wireless_valve_needs_device_assignment` | TS0601 | `_TZE200_BVU2WNXZ`<br>`_TZE200_HVAXB2TC`<br>`_TZE204_5TOC8EFA` | Avatto TRV06<br>Avatto TRV06<br>BSEED GL86HTBZ1 | blakadder, hubitat | resolvedBy ajouté |
| `_hybrid_scene_switch_6ch_needs_device_assignment` | TS0601 | `_TZE200_9MAHTQTG`<br>`_TZE200_R731ZLXK`<br>`_TZE200_KYFQMMYL` | Zemismart TB26-6<br>Zemismart TB26-6<br>Lonsonho X713A | blakadder | resolvedBy ajouté |
| `_hybrid_sensor_climate_presence_needs_device_assignment` | TS0601 | `_TZE200_IKVNCLUO`<br>`_TZE200_WUKB7RHC`<br>`_TZE200_HOLEL4DK` | Moes ZSS-QY-HP<br>Moes ZSS-QY-HP<br>Moes ZSS-QY-HP | blakadder | resolvedBy ajouté |
| `_hybrid_sensor_climate_smart_needs_device_assignment` | TS0601 | `_TZE200_D0YU2XGI`<br>`_TYST11_D0YU2XGI`<br>`_TZE200_T1BLO2BJ` | Neo NAS-AB02B0<br>Neo NAS-AB02B0<br>Neo NAS-AB02B2 | blakadder, z2m | resolvedBy ajouté |
| `_hybrid_sensor_contact_plug_needs_device_assignment` | TS0601 | `_TZE200_N8DLJORX`<br>`_TZE200_PAY2BYAX`<br>`_TZE200_WFXUHOEA` | Tuya ZG-102ZL<br>Tuya ZG-102ZL<br>LoraTap GDC311ZBQ1 | blakadder, hubitat, z2m | resolvedBy ajouté |
| `_hybrid_sensor_motion_radar_needs_device_assignment` | TS0601 | `_TZE200_IKVNCLUO`<br>`_TZE200_WUKB7RHC`<br>`_TZE200_HOLEL4DK` | Moes ZSS-QY-HP<br>Moes ZSS-QY-HP<br>Moes ZSS-QY-HP | blakadder | resolvedBy ajouté |
| `_hybrid_shutter_roller_controller_needs_device_assignment` | TS0601_shutter | `_TZE200_ZUZ7F94Z`<br>`_TZE200_YENBR4OM`<br>`_TZE200_9P5XMJ5R` | A-OK AM25<br>BSEED GL86ZTCS31<br>HiLADUO   | blakadder, zha | resolvedBy ajouté |
| `_hybrid_sirentemphumidsensor_needs_device_assignment` | TS0601 | `_TZE200_D0YU2XGI`<br>`_TYST11_D0YU2XGI`<br>`_TZE200_T1BLO2BJ` | Neo NAS-AB02B0<br>Neo NAS-AB02B0<br>Neo NAS-AB02B2 | blakadder, z2m | resolvedBy ajouté |
| `_hybrid_siren_sirentemphumidsensor_needs_device_assignment` | TS0601 | `_TZE200_D0YU2XGI`<br>`_TYST11_D0YU2XGI`<br>`_TZE200_T1BLO2BJ` | Neo NAS-AB02B0<br>Neo NAS-AB02B0<br>Neo NAS-AB02B2 | blakadder, z2m | resolvedBy ajouté |
| `_hybrid_smartplug_2_socket_needs_device_assignment` | TS011F | `_TZ3000_0yxeawjt`<br>`_TZ3000_c7nc9w3c`<br>`_TZ3210_c7nc9w3c` | LELLKI XF-EU-S100-1-M<br>LELLKI WK34-EU<br>LELLKI WK34-EU | z2m | resolvedBy ajouté |
| `_hybrid_smart_heater_needs_device_assignment` | TS0601_heater | `_TZE200_2EKUZ3DZ`<br>`_TZE204_djurk6p5`<br>`_TZE204_tagezcph` | Beok TGR85-ZB<br>ENGO ECB62-ZB<br>Tuya TE-1Z | blakadder, zha, z2m | resolvedBy ajouté |
| `_hybrid_smart_irrigation_valve_needs_device_assignment` | TS0601 | `_TZE200_U9BFWHA0`<br>`_TZE200_AOCLFNXZ`<br>`_TZE200_WT9AGWF3` | Beca BHT-003<br>Beca BHT-6000<br>Tuya FK-V02 | blakadder | resolvedBy ajouté |
| `_hybrid_smart_remote_4_buttons_needs_device_assignment` | TS0215A | `_TZ3000_FSIEPNRH`<br>`_TZ3000_4FSGUKOF`<br>`_TZ3000_WR2UCAJ9` | Nedis ZBRC10WT<br>Tuya TS0215A<br>Tuya TS0215A | blakadder, domoticz, smartthings | resolvedBy ajouté |
| `_hybrid_smart_screen_switch_needs_device_assignment` | TS0601 | `_TZE200_R32CTEZX`<br>`_TZE200_KYFQMMYL`<br>`_TZE200_WUNUFSIL` | Lerlink T2-Z67<br>Lonsonho X713A<br>Lonsonho X712A | blakadder, z2m, zha | resolvedBy ajouté |
| `_hybrid_smart_switch_needs_device_assignment` | TS0601 | `_TZE200_R32CTEZX`<br>`_TZE200_KYFQMMYL`<br>`_TZE200_WUNUFSIL` | Lerlink T2-Z67<br>Lonsonho X713A<br>Lonsonho X712A | blakadder, z2m, zha | resolvedBy ajouté |
| `_hybrid_socket_power_strip_four_two_needs_device_assignment` | TS0111 | `_TZ3000_V1SRFW9X` *(faible)*<br>`_TZ3000_GB5GAECA` *(faible)*<br>`_TZ3000_G1GLZZFK` *(faible)* | Aldi C422AC11D41H140.0W<br>Aldi C422AC14D41H140.0W<br>Aldi F122SB62H22A4.5W | blakadder, z2m | resolvedBy ajouté |
| `_hybrid_soil_sensor_ec_needs_device_assignment` | TS0601 | `_TZE200_MYD45WEU`<br>`_TZE200_GA1MAEOF`<br>`_TZE284_g2e6cpnw` | Qoto QT-07S<br>Qoto QT-07S<br>Tuya TS0601_soil | blakadder, z2m | resolvedBy ajouté |
| `_hybrid_switch_1_gang_needs_device_assignment` | TS0003 | `_TZ3000_V4L4B0LP`<br>`_TZE3000_PFC7I3KT`<br>`_TZ3000_VSASBZKF` | Eardatek ESW-3ZAB-EU<br>Moes MS-104CZ<br>Tuya SML-03Z | blakadder, z2m | resolvedBy ajouté |
| `_hybrid_switch_2_gang_metering_needs_device_assignment` | TS0601 | `_TZE200_R32CTEZX`<br>`_TZE200_KYFQMMYL`<br>`_TZE200_WUNUFSIL` | Lerlink T2-Z67<br>Lonsonho X713A<br>Lonsonho X712A | blakadder, z2m, zha | resolvedBy ajouté |
| `_hybrid_switch_wall_needs_device_assignment` | TS0601 | `_TZE200_R32CTEZX`<br>`_TZE200_KYFQMMYL`<br>`_TZE200_WUNUFSIL` | Lerlink T2-Z67<br>Lonsonho X713A<br>Lonsonho X712A | blakadder, z2m, zha | resolvedBy ajouté |
| `_hybrid_temphumidsensor4_needs_device_assignment` | TS0601 | `_TZE200_D0YU2XGI`<br>`_TYST11_D0YU2XGI`<br>`_TZE200_T1BLO2BJ` | Neo NAS-AB02B0<br>Neo NAS-AB02B0<br>Neo NAS-AB02B2 | blakadder, z2m | resolvedBy ajouté |
| `_hybrid_ultrasonic_heat_meter_needs_device_assignment` | TS0601 | `_TZE200_LGSTEPHA`<br>`_TZE200_KAGKGK0I`<br>`_TZE200_I0B1DBQU` | Javis JS-ZB-SA1<br>Javis JS-ZB-SA1<br>Javis JS-ZB-SA1 | blakadder | resolvedBy ajouté |
| `_hybrid_ultrasonic_water_meter_needs_device_assignment` | TS0601 | `_TZE200_U9BFWHA0`<br>`_TZE200_AOCLFNXZ`<br>`_TZE200_WT9AGWF3` | Beca BHT-003<br>Beca BHT-6000<br>Tuya FK-V02 | blakadder | resolvedBy ajouté |
| `_hybrid_wall_remote_4_gang_2_needs_device_assignment` | TS0043 | `_TZ3000_RRJR1Q0U`<br>`_TZ3000_BI6LPSEW`<br>`_TZ3000_FAMKXCI2` | Eardatek ESW-0ZAB-EU<br>LoraTap SS600ZB<br>LoraTap SS600ZB | blakadder, hubitat, smartthings | resolvedBy ajouté |
| `_hybrid_wall_remote_4_gang_3_needs_device_assignment` | TS0043 | `_TZ3000_RRJR1Q0U`<br>`_TZ3000_BI6LPSEW`<br>`_TZ3000_FAMKXCI2` | Eardatek ESW-0ZAB-EU<br>LoraTap SS600ZB<br>LoraTap SS600ZB | blakadder, hubitat, smartthings | resolvedBy ajouté |
| `_hybrid_wall_remote_6_gang_needs_device_assignment` | TS0046 | `_TZ3000_xabckq1v`<br>`_TZ3000_gbm10jnj`<br>`_TZ3000_w8jwkczz` | — fingerprints.yaml<br>— fingerprints.yaml<br>— fingerprints.yaml | smartthings | resolvedBy ajouté |
| `_hybrid_wall_switch_1_gang_tuya_needs_device_assignment` | TS0001 | `_TZ3000_XKAP8WTB`<br>`_TZ3210_FHX7LK3D`<br>`_TZ3000_YL3ZUYAW` | Aubess AP-SMT-Breaker02-1CH<br>Clicksmart CMA30651<br>Cloud Even ZBS05-LN | blakadder | resolvedBy ajouté |
| `_sedea_unknown` | TS0201 | `_TZ3000_MXZO5RHF`<br>`_TZ3000_82PTNSD4`<br>`_TZ3000_YWAGC4RJ` | Danfoss Ally 014G2480<br>Mercator Ikuü SMA03P<br>Moes ZSS-KB-TH | blakadder, z2m, domoticz | resolvedBy ajouté |
## Non-résolus

Aucun : 95/95 ont au moins une correspondance. Les 8 entrées résolues en mode *faible*
(mot-clé sans pid commun, ex. `_hybrid_illuminance_sensor_needs_device_assignment` TS0222)
sont à confirmer manuellement avant tout usage automatisé.

## Limites

- Le matching est heuristique (pid + catégorie blakadder + mots-clés sur description) : les listes
  `resolvedBy` sont des **candidats** triés par score, pas des certitudes d'appairage.
- Les entrées `_hybrid_<driverA>_<driverB>` représentent des appareils partagés entre deux drivers ;
  la résolution vise le premier type détecté dans le hint.
- ZHA ne fournit que le suffixe TS0601 : toutes ses entrées sont traitées comme famille TS0601.
