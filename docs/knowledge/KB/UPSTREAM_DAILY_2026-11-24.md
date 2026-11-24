# Upstream daily 2026-11-24 (kb-daily-2026-11-24)

Facts only, rewritten in our own words; every source is credited in CREDITS.md and docs/knowledge/KB_SOURCES.md.

## Pointers

| source | before | after | what changed |
|---|---|---|---|
| zigbee-herdsman-converters | ed29f80 | ed29f80 | nothing new since 2026-11-23 (remote HEAD checked) |
| zigbee-herdsman | 892a1dd | 892a1dd | nothing new |
| ZHA quirks | 19fa63e | 19fa63e | nothing new |
| deCONZ | c24e81c | c24e81c | nothing new |
| Z2M docs site | ee7f0244a | ee7f0244a | nothing new (published package 26.136.0 used for exposes) |
| zigbee-OTA | 0900397 | 0900397 | nothing new |
| Hubitat (kkossev) / SmartThings / Mariano Edge / ioBroker | 355d1d6 / ce82361 / 88f56fd / 327293b | same | nothing new |
| Johan's app (SDK3) | 328d24e | 61577d8 (remote HEAD mirrored by refresh) | 1284 Tuya couples counted (was 1161 in the 2026-11-03 matrix) |
| tuya-local (Wi-Fi) | c7b6158 | af92a0e | 3 commits: novadigital_midpanel8_controller DP77 made optional, fan step-size fix, media_player fix. Wi-Fi only, lead only. |
| Tasmota | 016be63 | 6d1a2e4 | build option only (NimBLE), no Zigbee template change |
| Domoticz z4d-certified-devices | 81fd9ab | dcead2f (11.631) | Excellux NTCHT01 (battery halved, ZCL 0402 ignored for internal temp), Sonoff/Nodon/Casa.ia non-Tuya; TS0501B `_TZ3210_dbilpfqk` already shipped (bulb_dimmable) |
| Blakadder, tinytuya, localtuya, zigbee-clusters | unchanged | | |

## Coverage matrix (docs/knowledge/Z2M_COVERAGE.md)

Last committed matrix (2026-11-03): master total 3578 / absent 516 / compacted 1815 / wrong class 7 / partial 286 / complete 954.
Today (upstream totals grew to 3730 couples, shipped data unchanged):

| branch | absent | compacted | wrong class | partial | complete |
|---|---:|---:|---:|---:|---:|
| master | 579 | 1872 | 4 | 324 | 951 |
| stable-v5 | 627 | 2366 | 9 | 138 | 590 |
| bastien-home | 565 | 2362 | 7 | 147 | 649 |

Payloads: master 15497/15500 + TS0601 top-up 19999/20000, stable-v5 15493/15500, bastien-home 15500/15500.

## Done

- Harvest files refreshed (scripts/data/z2m-tuya-dps.json 1205 couples / 13964 DP rows, ZHA quirk 241 couples, deCONZ 152 couples), data/kb/couples.json 4423→4502, KB device pages.
- New P3405 rule in scripts/data/build-unknown-dp-catalog.js: a regeneration keeps every couple and DP of the previous
  catalogue that no current source lists (today's run would have dropped `_TZE204_zxkwaztm` DP68 and one older couple), test p3405 (fail-before 2/4).
- Shipped DP catalogue (lib/zigbee/data/unknown-dp-catalog.json) NOT updated: the regenerated file (+70 couples, +145 DPs, 0 lost)
  is 186,274 B, over the 180,000 B budget of test p3018b (HEAD 177,528 B). Parked; with it master would move partial 324→302, complete 951→973.
- lib/zigbee/data/inferred-dp-family.json kept as it was: a regeneration would drop 5 inferred families (lead).

## Parked (data/leads/kb-parked-2026-11-24.json)

8 exact couples absent from all 3 branches (`_TZ3000_9il3ag1z` TS0001, `_TZ3000_sjb7pafq` TS0002, `_TZE28C1000000_cvub6xbb`,
`_TZE204_jrtvxwvy`, `_TZE204_lnsk1ead`, `_TZE20C1000000_9segdjw4`, `_TZE2841000000_sonkaxrd`, `_TZE28C1000000_ac0fhfiq`) and
3 wrong-class couples in climate_sensor (sonkaxrd CO alarm, 2x ac0fhfiq energy meter; not shipped today, compacted out).
Measured on master: any placement evicts a shipped couple (krwtzhfd/TS004F, or every form of `_TZE200_awepdiwi`), so all wait.

## Forum and issues (read-only)

- 140352: no post after #2279. 26439 (Johan): no post after #5543. 157537 (Device Watchdog, other app): idea only
  (a total counter that only counts the problem kinds the user switched on confused a user; keep our counters explicit).
- dlnraja/com.tuya.zigbee issues: only the recurring `[crash] a8994dc2f3` "diag-log-unfetched" (#662, no data). Johan repo: no update.
- Homey Gmail diagnostics: nothing new since 2026-11-22 22:30 (already handled).
