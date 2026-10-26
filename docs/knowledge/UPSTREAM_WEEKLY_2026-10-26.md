# Upstream weekly check, 2026-10-19 to 2026-10-26

Written in our own words. Facts and ids only, each with its source. This is the weekly safety net
behind the daily KB run (see UPSTREAM_DAILY_2026-10-26.md); items already handled there are not repeated.

## Window

| Source | From | To | Commits | Tuya-relevant |
|---|---|---|---:|---|
| Koenkk/zigbee-herdsman-converters | bb5242d9f5 | 7462b541b3 | 45 | `tuya.ts`, `moes.ts`, `nova_digital.ts`, `lib/tuya.ts` |
| zigpy/zha-device-handlers | 1d6598c32a | 1f1405b0eb | 3 | `tuya/mcu` 0x25 reply framing (already checked by the daily run) |
| dresden-elektronik/deconz-rest-plugin | a4c17adfa0 | same | 0 | none |
| blakadder/zigbee | d96e8aaf72 | same | 0 | none |
| make-all/tuya-local | 225943071b | 8de6b3cce6 | 35 | Wi-Fi devices only, no Zigbee couple |
| JohanBendz/com.tuya.zigbee | 130854f4c6 | 61577d8ec2 | 1 | workflow only |

## Implemented this run

- P3060: packed phase DPs (8-byte voltage/current/power) can carry negative power in two ways. The offset form
  (raw minus 0x99999A) was already decoded; some `_TZE200_nslr42tt` units use plain 24-bit two's complement
  above 0x99999A instead, which we showed as a power of several MW. Both are now decoded in
  `lib/tuya/TuyaNegPower24.js`, used by `TuyaPhaseStruct` and `SpmPhaseDecoder`. Values below 0x99999B decode
  exactly as before. Source: zhc 7462b54 `src/lib/tuya.ts` (Koen Kanters and contributors). Test:
  `test/p3060-neg-power-24.test.js`.

## Parked couples (publish budget still full, same reason as the daily run)

| Couple | Device (source) | Target driver | Note |
|---|---|---|---|
| `_TZE204_kobbcyum` / TS0601 | Tongou TOWSMR1-40A-AC RCBO family (zhc 7462b54 `tuya.ts`, joins `_TZE284_432zhuwe`) | smart_rcbo | today only in climate_sensor, see leads |
| `_TZE2841000000_8se38w3c` / TS0601 | long-name form of TZ-ZT01_GA4 temp/humidity probe (zhc 7462b54 `tuya.ts`) | climate_sensor | Homey matches the exact string, so the long form needs its own entry |
| `_TZ3210_cmnwaylf` / TS0501B | ECODO ECD-ZB-REPEATER, a repeater with an indicator LED driven as a light (zhc 7462b54 `tuya.ts`) | zigbee_repeater (LED as optional onoff/dim) | absent everywhere |

## Wrong-class leads (decision needed, not moved)

- `_TZE284_tdhnhhiy` / TS0601: Nova Digital SYZB-6W, a 6-gang wall switch (DP1-6 gangs, DP16 backlight). Z2M moved it out of the
  generic 6-gang list into its own definition in `nova_digital.ts` this week. We list it in climate_sensor only.
  Target: wall_switch_6_gang_tuya.
- `_TZE204_nvxorhcj` / TS0601: Nova Digital ZTS-8W-B, 8 gangs (DP1-6 plus DP101/102). We list it in switch_1gang.
- `_TZE284_kow4ok3t` / TS0601: Nova Digital ZTS-8B, 8 gangs, same layout. We list it in switch_4_gang_metering.
  There is no 8-gang driver yet; per the standing rule a new `wall_switch_8_gang_tuya` category is the clean fix,
  to ship as its own isolated master step after headroom lands.
- `_TZE204_kobbcyum` and `_TZE284_432zhuwe` / TS0601: Tongou RCBO, listed in climate_sensor. Target smart_rcbo.
- `_TZE200_nslr42tt` / TS0601: bidirectional 3-phase meter in Z2M, listed in switch_wireless (and handled in
  power_clamp_meter code without a manifest claim). Target power_clamp_meter or energy_meter_3phase after a DP check.

## Upstream changes of substance

- Z2M split three Nova Digital multi-gang switches out of the generic Tuya lists into dedicated definitions
  (new file `nova_digital.ts`), and split `_TZE204_6a4vxfnv` away from the `edl8pz1k` floor thermostat into a new
  definition shared with `_TZE204_0hhou4yj` (ELECTSMART). The floor thermostat part is already in the daily leads.
- More long manufacturer names (`_TZE28C1000000_*`, `_TZE2841000000_*`) appeared as siblings of existing couples.
  Our runtime already treats that prefix as EF00 (ManufacturerVariationManager), but each long name still needs its
  own manifest entry to pair.
- `_TZE284_hkdl5fmv` (new Z2M sibling of the `_TZE200_hkdl5fmv` meter) is already in energy_meter_din on master.
- No couple was removed upstream this week except through the moves above.
