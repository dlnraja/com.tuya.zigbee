# Upstream daily notes, 2026-10-26

Written in our own words. Facts and ids only, each with its source.

## Coverage matrix (scripts/kb/z2m-coverage.js, all sources)

| Branch | Total | Absent | Compacted | Wrong class | Partial | Complete |
|---|---:|---:|---:|---:|---:|---:|
| master (before, 25/10) | 3573 | 532 | 2254 | 9 | 151 | 627 |
| master (after) | 3651 | 538 | 2306 | 3 | 157 | 647 |
| stable-v5 (before) | 3573 | 544 | 2318 | 9 | 129 | 573 |
| stable-v5 (after) | 3651 | 564 | 2363 | 9 | 129 | 586 |
| bastien-home (before) | 3573 | 559 | 2303 | 9 | 119 | 583 |
| bastien-home (after) | 3651 | 498 | 2368 | 7 | 143 | 635 |

The total grew by 78 because the mirrors were refreshed (zhc 7462b54 and others).

## Parked couples (publish budget full on all three branches)

Payload budgets at this run: master 15496/15500 (with the TS0601 top-up), stable-v5 15498/15500, bastien-home 15499/15500. The headroom work (wip/p3057-headroom) is not merged yet. Adding these couples now would only make them "compacted" or shuffle out other attested couples, so they are parked here with their source and target. Place and pin them once headroom lands.

| Couple | Device (source) | Target driver | Note |
|---|---|---|---|
| `_TZ3210_ekjc2rzh` / TS0225 | Ekaza 24 GHz presence, TS0225_EKAZA (zhc 7462b54 `tuya.ts`) | presence_sensor_radar | sibling `_TZ3210_eep3fewj` already there |
| `_TZ3210_hs01bacp` / TS030F | Moes ZC301 curtain (zhc 7462b54 `moes.ts`) | curtain_motor | only TS030F driver |
| `_TZE28C1000000_cf4b5ktf` / TS0601 | Moes ZM7LT3 3-phase meter (zhc 7462b54 `moes.ts`) | energy_meter_3phase | sibling `_TZE284_cf4b5ktf`; needs the 0xED00 segmented decoder for full data |
| `_TZE284_y7hpvgyp` / TS0601 | Moes ZM6LT1 1-phase meter (zhc 7462b54 `moes.ts`) | power_clamp_meter (or 1-phase meter driver) | same family as 2fnssffc |
| `_TZE28C1000000_cjbofhxw` / TS0601 | PJ-MGW1203 clamp (zhc 7462b54 `tuya.ts`) | power_clamp_meter | sibling `_TZE284_cjbofhxw` |
| `_TZE204_0hhou4yj` / TS0601 | TS0601_floor_thermostat_006, ELECTSMART EST-D100Z (zhc 7462b54 `tuya.ts`) | floor thermostat driver (DP map check first) | |
| `_TZE284_fziifcxj` / TS0601 | Appartme APRM-04-005 TRV (zhc 7462b54; SmartThings) | thermostatic_radiator_valve if DPs fit | |

## Wrong-class leads (not moved this run)

- `_TZE204_6a4vxfnv`, `_TZE200_edl8pz1k`, `_TZE204_edl8pz1k` / TS0601: floor thermostats in Z2M (`tuya.ts`), listed in climate_sensor on all branches and dropped from every payload. Move to a floor thermostat driver after the DP maps are compared.
- `_TZE284_2fnssffc` / TS0601: Moes ZM6LT1 energy meter in Z2M (`moes.ts`), listed in thermostatic_radiator_valve. Move to the meter driver with the parked ZM6LT1 couple.
- `_TZE204_ue3rzddr` / TS0601: in climate_sensor; a request on JohanBendz/com.tuya.zigbee [#1076](https://github.com/JohanBendz/com.tuya.zigbee/issues/1076) describes it as a wall dimmer. No upstream converter found; needs a diag or interview before any move.
- `_TZE2841000000_hodyryli` / TS0601: ZT08 variant (zhc 7462b54). Left to the session owning wip/p3055-parasites (the `_TZE284_` form is already on climate_sensor_zt08).

## Protocol notes

- EF00 0x25 reply: checked, already aligned with Z2M (no manufacturer code, `00 01 01`). See KB/UNKNOWN_COMMANDS.md.
- 0xED00 segmented DP transfer used by new Moes meters: documented in KB/UNKNOWN_COMMANDS.md, provisional, not implemented.

## Forum and issues (read-only)

- Homey forum 140352 post 2268 (seikossss): NEO NAS-WV05B2-L `_TZE284_z7a2jmyy` irrigation timer. Already on master in water_valve_smart (2dc7ff9ac3, P3037), not yet in a published build.
- Topics 157537, 35206: no Tuya facts. 154077, 101901: no new posts.
- dlnraja/com.tuya.zigbee: #576, #571, #570, #559 closed by the maintainer on 25/10; #560 still open (already handled on master per P3058-4).
- JohanBendz/com.tuya.zigbee #1526-#1534 couples: all already present on master except the ue3rzddr class question above.
