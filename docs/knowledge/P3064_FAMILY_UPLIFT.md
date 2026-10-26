# P3064 — family-by-family uplift (master, 2026-10-26)

Scope: every device family except IR blasters (separate track). Method: the coverage matrix
(`scripts/kb/z2m-coverage.js`, master/stable/bastien) gave the "partial" couples; each gap was
re-checked by hand against zigbee-herdsman-converters (local copy at commit 7462b54) and against the
driver code itself, because most "missing DP" rows are artefacts: upstream DPs without a name
(composite structs, ignored DPs such as `[12, null, null]`) never enter the DP catalogue.

Rules applied: exact manufacturer+product couples only, one source per couple, additive code,
no 0xEF00 write at pairing, optional capabilities only after a real report (no empty tiles, no
re-pair). New couples are not added in this batch (combo budget unchanged; master ~15496/15500).

## Shared building blocks (new)
- `lib/helpers/LateCapability.js` — adds an optional capability the first time the device sends a
  real value, then writes it. One add attempt per capability per device, bounded, fail-soft.
- `lib/tuya/PassiveDpRx.js` — receive-only Tuya datapoint listener for drivers whose base class has
  no EF00 layer (manager first, then raw cluster, multi-DP frames split). Never transmits.

## Results per family
| Family | Real gaps found | Done in P3064 | Parked / next |
|---|---|---|---|
| Plugs / energy meters | Moes ZM7LT3 3-phase (`_TZE284_cf4b5ktf`): total power DP9, phase structs DP6-8, PF/frequency not decoded. TOQCB2-80 breakers: internal temperature DP131 unused | Per-couple map + 18-byte phase struct (sum until DP9 seen); TOQCB2-80 DP131 → `measure_temperature` (late) | TOQCB2 protection thresholds DP102-119 as settings (needs compose settings); `energy_meter_din` lsanae15 DP3/4/17/21-24 (mostly unnamed upstream) |
| Switches / relays | SWS6TZ-WHITE (`_TZE200_8eazvzo6`) metering DP21-23 ignored in `switch_wall_6gang` | Late `measure_current/power/voltage` on that couple only | hbxadcl0 DP107 (unnamed upstream, ignorable) |
| Dimmers | MG-DIM02Z (`_TZE284_da26abzz`) in `wall_dimmer_tuya` uses DP141/142 + metering DP21-23; the V1 map (DP1/DP2, DP21 = backlight) misread it | Per-couple TX/RX map (141 state, 142 brightness 0-1000), late metering, DPs blocked from dynamic discovery | Knob dimmer `_TZE200_tgeqdjgk` colour temperature DP107 (needs TX too) |
| Smoke / CO (safety) | TS0601 couples in the IAS-based `smoke_sensor` driver had no datapoint path at all | Receive-only DP path: TS0601_smoke_co (6ycgarab, aoah6bv8, 2841000000_6ycgarab) smoke DP1 / CO DP18 / battery DP15; PA-44Z (qvzsq3s2); GSKS-ZB (qcasmfan, + tamper DP4). `alarm_co` added late | `_TZE200_/_TZE204_6ycgarab`: **unsourced-kept** (long-present, no upstream source, not pinned — same policy as d3m9v8p6/pwj6vuj9). `_TZ3210_09hzmirw`: EcoDim CCT bulb, removed from smoke_sensor in P3067 (now `light_cct_ts0502b`, baseline exemptions approvedBy dlnraja t561u/t555u delegated). `_TZE284_6ycgarab`: TS0601 only (Z2M, ZHA #4181, Tasmota) — single owner `smoke_sensor`, the TS0205-only `smoke_sensor3` claim dropped (P3067) |
| Thermostats / TRV | `windowcoverings_set` "missing" rows are artefacts (valve position) | — | hpkusvom DP1 check |
| Covers | "onoff" exposes are upstream backlight/limit switches | — | — |
| Buttons / keypads | keypad `_TZE284_rt5dklro` arm actions DP27/28, user DP112 | — | next batch |
| Lights | LED controllers 8fffc3kb / gt5al3bl DP61 (paint colour) | — | next batch |
| Climate / soil | soil AOYAN DP9 temperature unit; lb0fsvba DP6 | — | settings only, low impact |
| Battery sensors | many `alarm_battery` / `measure_voltage` expose rows | — | intentionally not added (SDK rule: no measure_battery + alarm_battery together) |

## P3067 catalogue decisions (2026-10-26)
| Couple | Decision | Source | Effect on paired devices |
|---|---|---|---|
| `_TZ3210_09hzmirw` (4 casings) × TS0205/TS0601/SMD9300 in smoke_sensor | removed (parasite) | Z2M tuya.ts TS0502B whiteLabel EcoDim ED-10032 | none: Homey keeps paired devices on their driver id; new pairings go to light_cct_ts0502b |
| `_TZE200_6ycgarab`, `_TZE204_6ycgarab` in smoke_sensor | unsourced-kept | none upstream | none |
| `_TZE284_6ycgarab` × TS0205 in smoke_sensor3 | dropped from smoke_sensor3 (double claim) | Z2M TS0601_smoke_co, ZHA quirks #4181 (TS0601), Tasmota `TZE284_6ycgarab.zb` (TS0601) | none; couple still in payload via smoke_sensor, baseline gate OK |
| `_TZE200_7deq70b8` (2 casings each) × TS0601 in curtain_motor | moved to `switch_2gang` (wrong class; pinned sacred-keep) | Z2M tuya.ts TS0601_switch (same entry as _TZE200_nkjintbl), ZHA TuyaDoubleSwitchGP, blakadder ZY-US 2 | none (was never in the published payload under curtain_motor) |
| `_TZE204_pxbjch8m` × TS0601 | added to `panel_switch_cover_tuya` with its own exact profile (DP1 cover state, DP7 relay; DP8 motor direction left untouched, no write at pairing) | Z2M tuya.ts TS0601_cover_with_1_switch_limited | new couple, nobody paired before |
| `_TZE200_vawy74yh` (co_sensor) and `_TZE204/_TZE284_vawy74yh` (climate_sensor) × TS0601 | moved to `smoke_sensor` (profile `ssd01`: DP1 0 = smoke, DP15 battery; pinned sacred-keep); co_sensor cartesian combos × TS0601_co/TS0212 removed with 4 baseline exemptions (approvedBy dlnraja t561u/t555u delegated); fingerprint hints → smoke_sensor | Z2M moes.ts ZSS-HM-SSD01, ZHA tuya_smoke.py, blakadder Moes_ZSS-HM-SSD01, Hubitat Tuya Zigbee Smoke Detector | none to re-pair: co_sensor / climate_sensor map DP1 to `alarm_smoke` (added on first report) for this mfr instead of alarm_co / temperature |
| `_TZE200_cxakecfo/ybsqljjg/4aijvczq/r5ksy7qo` (2 casings) × TS0601 | ybsqljjg/4aijvczq/r5ksy7qo moved from climate_sensor to `device_radiator_valve` (pinned sacred-keep, hints + mfs_db → TRV); all 4 on the ME167 core profile + ME168 DPs (DP14/15 window, DP101/105 comfort/eco /10, DP103/104 boost) — DP15 no longer battery | Z2M avatto.ts ME168_AVATTO, Domoticz z4d TS0601-ME168 | none to re-pair: cxakecfo was on Profile A (DP3 read as setpoint, DP4 as temperature) and is corrected at runtime; the other 3 were never in the published payload. Budget 15500 cap: 5 cartesian artefacts displaced (ZB-CL01 × _tz3000 bulbs, BSEED socket in gateway_zigbee_bridge) |

## Credits
DP layouts: Koen Kanters and the zigbee-herdsman-converters contributors (tuya.ts models
TS0601_smoke_co, PA-44Z, GSKS-ZB, moes.ts ZSS-HM-SSD01, MG-DIM02Z, SWS6TZ-WHITE, TOQCB2-80; moes.ts ZM7LT3).
Facts only, own implementation, no code copied.
