# Upstream daily notes, 2026-10-27

Written in our own words. Facts and ids only, each with its source.

## Coverage matrix (scripts/kb/z2m-coverage.js, all sources)

| Branch | Total | Absent | Compacted | Wrong class | Partial | Complete |
|---|---:|---:|---:|---:|---:|---:|
| master (before, 26/10) | 3651 | 536 | 2301 | 3 | 157 | 654 |
| master (after, 9.0.1602 tree bf486bba98) | 3573 | 520 | 2218 | 1 | 161 | 673 |
| stable-v5 (before) | 3651 | 564 | 2361 | 9 | 128 | 589 |
| stable-v5 (after, 5.12.515) | 3573 | 544 | 2316 | 9 | 130 | 574 |
| bastien-home (before) | 3651 | 497 | 2363 | 7 | 142 | 642 |
| bastien-home (after, 1.0.217) | 3573 | 471 | 2324 | 7 | 142 | 629 |

The total fell by 78 because Johan's app (JohanBendz/com.tuya.zigbee 328d24e, v0.2.76) now lists fewer
cross-product couples (1284 to 1161 Tuya couples). Nothing was removed on our side. The master gains
(complete +19, wrong class 3 to 1) come from the one-couple-one-driver batches pushed on master overnight.
The only wrong-class row left on master is `_TZE284_ikul00sx` / TS0601 in fan_light_tuya_5_levels
(Z2M exposes a fan plus a light; our class is fan, the light part is a capability, so this is a matrix
limitation rather than a misplacement).

## Parked couples (publish budget still full)

Payload budgets at this run: master 19997/20000 with the TS0601 top-up (15498/15500 before it),
stable-v5 15500/15500, bastien-home 15500/15500. The seven couples parked on 2026-10-26
([UPSTREAM_DAILY_2026-10-26.md](UPSTREAM_DAILY_2026-10-26.md)) are still absent on all three branches and
stay parked; the three wrong-class leads listed there (`_TZE204_6a4vxfnv`, `_TZE200_edl8pz1k`,
`_TZE284_2fnssffc`) are unchanged. Not placed this run because another session is moving couples on
master and the budget has no room; adding them now would only push out attested couples.

## Upstream changes since 2026-10-26

| Source | Range | What matters for us |
|---|---|---|
| [zigpy/zha-device-handlers](https://github.com/zigpy/zha-device-handlers) | d54cf9e..2b1abce | PR #5531: Xiaomi/Aqara read responses are now decoded like reports (0xFF01 struct), but a model attribute (0x0005) seen in a read response is no longer treated as a reset-button press. Our `lib/xiaomi/XiaomiSpecialHandler.js` already decodes 0xFF01 from read responses; lesson: never fire button events from a read we requested. PR #5547/#5395: constant attributes are neither cached nor reported as unsupported (relevant to the P3011 unsupported guard: an attribute we answer locally must never be marked unsupported). PR #5239: Aqara E1 TRV schedule accepts 00:00. No Tuya couple added. |
| [make-all/tuya-local](https://github.com/make-all/tuya-local) | 8de6b3c..2454696 | New Wi-Fi config HQL DS-123 radar switch, product id `k2xfhfqsqbqvbbig` (DP1 switch, DP102 presence string "presence", DP103 delay 5-86400 s, plus sensitivity and alarm DPs), from PR #6274. Not in our `data/wifi/tuya-local-product-schemas.json` (pinned at tuya-local 95300d05); lead for the next schema refresh. Klarstein Bornholm heater config fixes (Wi-Fi). |
| [SmartThingsCommunity/SmartThingsEdgeDrivers](https://github.com/SmartThingsCommunity/SmartThingsEdgeDrivers) | 3c3946ec07..3a48d3d84f | Sonoff SWV2C valve fingerprint (#3171). Sonoff, not Tuya: out of scope for the matrix. |
| [JohanBendz/com.tuya.zigbee](https://github.com/JohanBendz/com.tuya.zigbee) | 61577d8..328d24e | Releases v0.2.60 to v0.2.76 and rain sensor `_TZ3210_tgvtvdoc` / TS0207 (#983). All 126 manufacturer ids added in the range are already listed on our three branches (the rain sensor is in rain_sensor on all three). Johan issues updated since 26/10 (#1542 hy369 `_TZE200_ckud7u2l`, #1461 NTCHT02, #1382 `_TZE200_crq3r3la`, #869 `_TZ3210_j4pdtz9v`, #1026 `_TZ3000_ja5osu5g`) all map to existing drivers. |
| Unchanged | | zhc 7462b54 (remote HEAD checked), deCONZ, Blakadder, tinytuya, localtuya, zigbee-clusters, zigbee-OTA, Hubitat, ioBroker, Tasmota, Domoticz |

## Unknown commands

No new unknown command, cluster or DP confirmed by a source this run. dlnraja/com.tuya.zigbee had no
new issue since the last run (only the daily digest). Gmail diags and the forum topics are read by their
own routines later today.
