# Upstream weekly 2026-11-16 (P3345)

Weekly safety net for the window 2026-11-02 -> 2026-11-16 (daily runs failed 04-07/11 and 09-14/11). Facts only, rewritten in our own words, one source per row.

## Window volumes
- zigbee-herdsman-converters c18c32d -> f368dcd: 184 commits (45 touch src/devices/tuya.ts). Fingerprint set diff: 67 couples added, 0 removed. 58 Tuya-style couples, 8 already placed by the dailies (P3343) or already present.
- zha-device-handlers 862124c -> b07fa76: 9 commits, Tuya-relevant #5601 (TS0726 2-gang spell), #5605 (GX04 battery size), #5610 (NOUS E9 lifecycle), #5628 (ZONNSMART TRV limits), #4965 (`_TZE284_2nhqasjh`, already on soil_sensor).
- deCONZ a4c17ad -> c24e81c: 4 CI-only commits. Blakadder d96e8aa: 0. Johan SDK3 328d24e: 0. zigbee-herdsman c1a54e3 -> 199c2f2: 5 (0x0A dataReportAlt #1937 already noted 11-08). tuya-local 2931535 -> 8d6f4ca: 29 (Wi-Fi only).

## Placed on master (exact couples, one owner each, pinned in publish-sacred-keep-couples.json)

| couple | driver | source (zhc f368dcd) |
|---|---|---|
| `_TZ3000_g5pzotdr` / TS0001 | switch_1gang | zhc tuya.ts TS0001_power (MoveSmart MS-M2Z whitelabel, #13621), sibling ids already on switch_1gang |
| `_TZ3210_aracgljk` / TS0003 | switch_3gang | zhc tuya.ts Nova Digital SA-3 / NFZB-03 3-gang switch, siblings _TZ3000_fawk5xjv/_TZ3000_bvij6kod on switch_3gang |
| `_TZ3210_xfbmf71h` / TS0003 | switch_3gang | zhc tuya.ts TS0003_switch_3_gang_with_backlight (Nova Digital SA-WK-2C whitelabel), siblings on switch_3gang |
| `_TZD200_7khnomgh` / TS0601 | soil_sensor | zhc hobeian.ts ZG-303Z (HYSYIOT HS303Z whitelabel), sibling _TZE200_wqashyqo, ZG-303Z DP map |
| `_TZD200_gt1gge3x` / TS0601 | rain_sensor | zhc hobeian.ts ZG-223Z rain sensor, sibling _TZE200_gt1gge3x on rain_sensor |
| `_TZE2841000000_nlrfgpny` / TS0601 | siren | zhc neo.ts NEO NAS-AB06B2 (#13646), siblings _TZE200/_TZE204/_TZE284_nlrfgpny on siren |
| `_TZE284_1iii6x0y` / TS0601 | switch_wall_6gang | zhc tuya.ts TS0601_switch_6_gang (JWCOM SA-ZB417F-BR whitelabel, #13630), DP1-6 like _TZE204_gxbdnfrh |
| `_TZE204_bb5xlia1` / TS0601 | switch_wall_6gang | zhc nova_digital.ts SA-WK 4X4 6-channel switch (#13758), DP1-6 state, DP101 all-channels |
| `_TZE204_tayx2ud6` / TS0601 | wall_switch_4_gang_tuya | zhc nova_digital.ts TS0601_ND_4Gang 4-gang touch switch (#13722), DP1-4 state |
| `_TZE28C1000000_lbhh5o6z` / TS0601 | wall_switch_4_gang_tuya | zhc tuya.ts TS0601_switch_4_gang_1 (AVATTO ZWSMD-4 whitelabel), DP1-4 state |
| `_TZE204_0corc0ph` / TS0601 | gas_sensor | zhc tuya.ts Xenon Smart X7633 / Zorro Alert JT-ZL2010Z natural gas detector, DP1 gas |
| `_TZE204_mqij5jas` / TS0601 | gas_sensor | zhc tuya.ts Jikaida JKD-839Z gas sensor, DP1 gas / DP2 gas value |
| `_TZE284_lqhqj73n` / TS0601 | curtain_motor_2 | zhc tuya.ts outdoor roller blind motor (#13793), DP1 control, DP2/3 position, DP13 battery (curtain_motor is full: new couples go to its continuation curtain_motor_2, DRIVER_CONTINUATIONS rule 4) |
| `_TZE284_pfbtmgo1` / TS0601 | water_leak_sensor | zhc nous.ts Nous E13 / Sygonix W08-Z10T water leak or shortage sensor (#13763), DP1 water, DP102 water_leak |
| `_TZE200_7sa1ogeny` / TS0601 | soil_sensor | zhc tuya.ts HYSYIOT HS300TF solar soil sensor, DP3 moisture / DP5 temperature / DP15 battery / DP101 humidity / DP102 lux |
| `_TZD200_7sa1ogeny` / TS0601 | soil_sensor | zhc tuya.ts HYSYIOT HS300TF solar soil sensor (same definition) |
| `_TZE200_sa1ogeny` / TS0601 | soil_sensor | zhc tuya.ts HYSYIOT HS300TF solar soil sensor (fertility variant) |
| `_TZD200_sa1ogeny` / TS0601 | soil_sensor | zhc tuya.ts HYSYIOT HS300TF solar soil sensor (fertility variant) |
| `_TZ3210_3632cjza` / TS0502B | light_cct_ts0502b | zhc tuya.ts TS0502B whitelabel ECODO DR-MW-2436 tunable white LED driver (#13725) |

Profile wiring (additive): `_TZD200_5ziwcyoe` -> HOBEIAN_ZG204ZX and `_TZD200_vfh3tuo1` -> ZG_204ZV_MULTISENSOR in presence_sensor_radar/configs.js (ready; the couples themselves are parked, see below), `_tzd200_7khnomgh` -> ZG-303Z soil map, Nous E13 DP map in water_leak_sensor (DP101 alarm mode no longer read as a leak; DP1 water and DP102 water_leak drive alarm_water).

## Wrong-class moves (evidence in data/couple-removal-evidence.json)

| couple | move | why |
|---|---|---|
| `_TZ3002_l8bfzlcd` / TS0726 | switch_4gang -> switch_1gang | wrong driver: zhc tuya.ts TS0726_1_gang lists it with _TZ3000_ovbvmhiq and _TZ3002_wowrpxxu (1-gang switch with neutral), not a 4-gang; moved to switch_1gang |
| `_TZE284_1di7ujzp` / TS0601 | climate_sensor -> water_leak_sensor | wrong driver: zhc nous.ts Nous E13 water leak or shortage sensor (same definition as _TZE284_pfbtmgo1), not a climate sensor; moved to water_leak_sensor |
| `_TZE204_lbhh5o6z` / TS0601 | curtain_motor -> wall_switch_4_gang_tuya | wrong driver: zhc tuya.ts TS0601_switch_4_gang_1 (AVATTO ZWSMD-4 4-gang switch) and JohanBendz wall_switch_4_gang_tuya; not a cover; moved to wall_switch_4_gang_tuya |
| `_TZE284_lbhh5o6z` / TS0601 | curtain_motor -> wall_switch_4_gang_tuya | wrong driver: zhc tuya.ts TS0601_switch_4_gang_1 (AVATTO ZWSMD-4 4-gang switch); not a cover; moved to wall_switch_4_gang_tuya |
| `_TZE204_iik0pquw` / TS0601 | curtain_motor -> wall_switch_4_gang_tuya | wrong driver: zhc tuya.ts TS0601_switch_4_gang_1 (ZYXH TY-04Z 4-gang switch) and JohanBendz wall_switch_4_gang_tuya; not a cover; moved to wall_switch_4_gang_tuya |

## Ready but blocked by the parasite budget
`_TZD200_5ziwcyoe`, `_TZD200_gfng0whq`, `_TZD200_vfh3tuo1` (presence_sensor_radar) and `_TZ3000_a8mhmsol` (switch_2gang): class verified, but placing them pushes `manifest-budget` parasites over 65423 (presence_sensor_radar carries 56 pids). Master after this commit: 65410. Needs a presence continuation or a reviewed budget raise.

## Leads (not placed)
See `data/leads/weekly-upstream-2026-11-16.json`: ME173 and Fontastic TRVs, Intelbras lock, HYSYIOT HS206Z/HS207Z/HS209Z family, Lincukoo G08A siren, Lincukoo N02 noise sensor (sound_sensor_tuya is exact-pair), CTL radar, HeatHUB fan coil, ZG-308Z valve, ZMD-208-2 dimmer, padded goecjd1t/2fnssffc meters (wrong-class families), 07P4 panel (0x0A), Nous D1Z, two TS011F 2-gang sockets, plus upstream DP changes to compare.
