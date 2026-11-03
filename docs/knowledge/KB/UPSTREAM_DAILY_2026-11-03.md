# Upstream daily, 2026-11-03

Daily KB refresh (routine "Homey bases de connaissances"). Facts only, our own words.

## Clones that moved
- make-all/tuya-local 2931535 → 633c008: pytest bump and one Wi-Fi litter box yaml line. No Zigbee impact.
- SmartThingsCommunity/SmartThingsEdgeDrivers 4fa6683 → 71bea06: camera privacy mode only.
- JohanBendz/com.tuya.zigbee 61577d8 → 328d24e (v0.2.76): large reformat (706 → 650 driver/maker entries, 21 makers added). Every real couple it adds is already in our app; the only couples still absent on all three branches are cross-product artefacts (`_TZ3000_rcuyhwe3|RH3001`, `_TZ3000_rcuyhwe3|SNZB-04`, `_TZ3000_yxqnffam|RH3001`, `_TZ3000_upgcbody|q9mpfhw`, the last one removed on purpose by P3077). Not added.
- arendst/Tasmota 0f67f94 → 568220d: changelogs only.
- Unchanged: zigbee-herdsman-converters c18c32d, zigbee-herdsman c1a54e3, ZHA quirks 862124c, deCONZ a4c17ad, Blakadder d96e8aa, zigbee-OTA f57c8a3, zigbee-clusters 2add8be, Z2M docs f2cc3d9b5, Hubitat d5cec83, ioBroker acdafa6, Domoticz 7989e2f, tinytuya c0eb2ee, localtuya 59c95cd.

## Coverage matrix (all sources, 3578 couples)
Compared with the 2026-11-02 run made under the same publish caps (15500 total / 1500 per driver / 2 case forms).

| Branch | absent | complete | compacted | wrong_class | partial |
|---|---|---|---|---|---|
| master | 521 → 516 | 680 → 954 | 2213 → 1815 | 1 → 7 | 163 → 286 |
| stable-v5 | 546 → 542 | 576 → 577 | 2318 → 2321 | 9 → 9 | 129 → 129 |
| bastien-home | 474 → 474 | 628 → 636 | 2329 → 2321 | 7 → 7 | 140 → 140 |

The master gain comes from the P3242/P3246 parasite-pid trims: 280 couples went compacted → complete and 127 compacted → partial. The trims also made 6 wrong-class placements visible (they were hidden as "compacted" before).

## Fixed today (P3252, master first)
Three wrong-class couples moved to the driver their upstream model needs, exact couple only, removal evidence recorded in `data/couple-removal-evidence.json`:
- `_TZE200_ojzhk75b|TS0601` water_tank_monitor → wall_dimmer_tuya (Z2M `TS0601_dimmer_1_gang_1`, its Z2M siblings already in wall_dimmer_tuya; Johan lists it there too).
- `_TZE200_wzk0x7fq|TS0601` curtain_motor → vibration_sensor (Z2M HOBEIAN ZG-102ZM; the misattribution registry already names vibration_sensor).
- `_TZE284_qoi1aqxg|TS0601` button_wireless → curtain_motor (Z2M Moes FWJZCEH18A001 roller blind; sibling `_TZE2841000000_u68q868h` already in curtain_motor).
Two of them would have been dropped by publish compaction in their new driver, so they are pinned; the two `_TZ3000_r6buo8ba` smartplug couples (TS011F, TS0121) the pins would have displaced are pinned too. Rebuilt payload: zero source-confirmed couple lost versus origin/master.

## Parked
- 10 master couples newly dropped by compaction (5 complete, 5 partial; mostly wall_dimmer_tuya): `data/leads/kb-compaction-losses-2026-11-03.json`. Not pinned: the payload sits at its cap, so each pin pushes another couple out.
- Remaining wrong-class leads, need a DP check of the target driver first: `_TZE204_sdykkwsu` (AVATTO ZDMS16 2-channel dimmer, now energy_meter_3phase), `_TZE204_x9usygq1` (Moes ZHT-PT01 pilot-wire thermostat, now curtain_motor), `_TZE204_zxkwaztm` (Moes ZHT-S03 wall thermostat, now curtain_motor). `_TZE284_ikul00sx` (fan + light) in a fan driver is acceptable.

## Issues and forum
- Johan #1549 `_TZ3000_b4awzgct|TS0041` "does not work" is on Johan's app; the couple is in our button_wireless_1, pinned and present in the master payload. Lead only.
- Our repo issues since 02/11 are auto-closed crash reports, already handled by the overnight passes.
- Unknown commands: nothing new. Forum: covered by the forum sweep routine (read only).
