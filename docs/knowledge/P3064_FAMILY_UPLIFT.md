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
| Covers | "onoff" exposes are upstream backlight/limit switches; TS130F `dropped` rows are budget compaction, not gaps; cover_4 DP7 = work_state (Z2M ignores it). Real bug: `curtain_motor` wrote open/close time to DP101/102 at start and on settings — on AM43 (`zah67ekd`/`icka1clh`, Z2M TS0601_cover_4) DP102 is factory_reset, on `libht6ua` DP101 is motor_direction | P3067: DP101/102 writes skipped for the AM43/tubular/Quoya family (settings kept, reverse unchanged) | — |
| Buttons / keypads | WKE502Z `_TZE200_rt5dklro`: no ACK after arm (DP23), hub mode DP101 sent once forever though it resets at power cut, DP25/DP112 and options DP103-111 unmapped. `_TZE200_kzm5w4iz` vibration/contact sensor owned by `button_emergency_sos` (forbids alarm_contact). TS0041/TS0215A `measure_voltage` rows | P3067: ACK DP23 after DP27/28; hub mode per session + after DP25; DP25 → homealarm_state; DP112 → label setting; 7 non-blocking settings (DP103 0-180 s, DP104/105/106/107/110/111) written on change only, queued until the keypad wakes, volatile ones re-sent after DP25. kzm5w4iz moved to `vibration_sensor` (DP1 contact, DP3 battery, DP10 vibration; pinned) | `measure_voltage` on battery buttons intentionally not added (battery % already derived from it) |
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

## P3067 per-family completeness (t569u / t570u)
| Family | Sourced DPs mapped | Optional ZCL fallback | Lazy capabilities added | New / moved drivers | Left out (why) |
|---|---|---|---|---|---|
| Buttons / keypads | WKE502Z: 3, 23, 24, 25, 26-29, 101, 103-107, 110-112 (DP108/109 admin / user codes not exposed: secrets) ; kzm5w4iz 1, 3, 10 | not applicable (pure 0xEF00, nothing bound at pairing) | none new (alarm_contact / alarm_vibration already in vibration_sensor) | kzm5w4iz → vibration_sensor | measure_voltage on TS0041 / TS0215A (battery % already covers it) |
| Lights | GL-SPI-206P: 1, 2, 3 (white only), 4, 61 RX+TX, 53, 101, 102, 103 ; MG-DIM02Z: 141-144, 146, 21-23 ; knob tgeqdjgk: 102, 103, 106, 107, 141 | ZCL onOff/level stay the primary path on TS050x bulbs (unchanged); SPI / MG / knob are pure 0xEF00 | none new (light_temperature on knob, measure_* on MG already lazy since P3064/P3066) | none | SPI DP7 countdown, DP51 scene, DP52 music (need Flow actions, handed to P3065); knob DP111/112 actions, DP121/122/131/132 second light (needs a 2-light driver, budget); `_TZE284_nvodulvi` M9-zigbee-SL 8-gang scene switch sits on dimmer_wall_1gang (wrong family, needs its own driver: deferred, budget) |
| Soil / breaker (family 9) | CS-201Z / ZG-303Z: 3, 5, 9 (guarded), 15, 106, 109 RX ; 102, 104 (/10), 105, 110, 111 kept as device-reported values (store) ; ZBN-DJ-63 `_TZE204_lb0fsvba` (moved lcdtemphumidsensor_3 → smart_breaker): 1, 6, 9, 16, 103 RX, 15 + 110 in store | none needed (pure 0xEF00) | measure_temperature late on ZBN-DJ-63 (already a known capability, nothing for P3065) | removed `_TZE204_lb0fsvba`+Excellux cartesian couples (exemption approvedBy) | soil device-side calibration TX (would need a separate setting set, Homey offsets kept); ZBN-DJ-63 prepayment DP11-14, thresholds DP17/18, countdown/recover DP102-107 (settings/Flow, P3065) ; UFH rfpyqax9 DP101-108, sound ZY-N1 DP101, garage TS0603 DP12 : next |
| Lights — adaptive lighting (all lights) | not DP-specific: CT via light_temperature, RGB-only via hue/sat white approximation, dimmer via dim (opt-in) | ZCL colorTempPhysicalMin/Max mireds used when stored (`ct_phys_min_mired` / `ct_phys_max_mired`), else 2700–6500 K | none (settings `adaptive_lighting` default true, `adaptive_brightness` default false on 65 light drivers; global `adaptive_lighting_global`) | none | startup CT / power-on behaviour (ZCL 0x4010 startUpColorTemperatureMireds): deferred, per-couple support unverified ; lazy ZCL read of physical mireds: deferred |
| Energy estimates (all mains families) | measure_power / measure_current / measure_voltage / power factor feed the precedence measured > calculated > learned > user > default | none | none (read-only `energy_source` label on 92 metered drivers; `energy.approximation` added to 48 unmetered on/off drivers) | none | per-couple rated watts: table ready (`couples`), filled only when a reliable source states it |

## P3067 catalogue decisions, buttons / keypads
| Couple | Decision | Source | Effect on paired devices |
|---|---|---|---|
| `_TZE200_kzm5w4iz` (4 casings) × TS0601 | moved from button_emergency_sos to `vibration_sensor` (pinned sacred-keep; hints + mfs_db → vibration_sensor) | Z2M tuya.ts TS0601_vibration_sensor, ZHA quirk (DP1 contact, DP3 battery, DP10 vibration) | none: paired devices stay on their driver; new pairings get contact + vibration |

## Credits
DP layouts: Koen Kanters and the zigbee-herdsman-converters contributors (tuya.ts models
TS0601_smoke_co, PA-44Z, GSKS-ZB, moes.ts ZSS-HM-SSD01, MG-DIM02Z, SWS6TZ-WHITE, TOQCB2-80; moes.ts ZM7LT3).
Facts only, own implementation, no code copied.

## P3067 thermostat metering
| Couple | Driver | DPs (zhc tuya.ts) |
|---|---|---|
| `_TZE200_snfdqllf` AETZ01_AC | air_conditioner_aetz01 (P3068, moved out of device_radiator_valve) | 116 W, 117 kWh (raw) |
| `_TZE204_ilzkxrav` TWC-R01 | device_radiator_valve | 11 W, 115 V, 116 A, 117 kWh (/10) |
| `_TZE204_0hcjew5p` TH-P1Z | wall_thermostat | 11 W /10, 101 V /10, 102 A /1000, 107 kWh /10; DP101 no longer arms FCU |

## P3071 families 10-13 (master)
| Family | Real gaps | Done | Artefacts (no change) |
|---|---|---|---|
| 10 DIN / 3-phase meters | din_1 DP1 read as relay, DP6 struct unread; *-GT DP6/7/8 phase structs unread | per-couple decode in energy_meter_din / energy_meter_3phase (test p3071) | DP17/18 alarm sets (zhc ignores them) |
| 11 Smoke / gas | none | — | 288WZ DP1 (enum, already 0 = alarm), gas_sensor_2 DP13 (zhc ignores) |
| 12 Garage / valves | none | — | TS0603 DP12 (zhc ignores), FK-BV05 windowcoverings_set (valve position) |
| 13 UFH / sound / RCBO | none in code | — | Pro Line X10 DP101-110 already mapped; RCBO hkdl5fmv temperature parked (legacy hoch_din frame, lazy capability = manifest cost) |
