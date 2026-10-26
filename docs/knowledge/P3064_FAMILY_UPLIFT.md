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
| Smoke / CO (safety) | TS0601 couples in the IAS-based `smoke_sensor` driver had no datapoint path at all | Receive-only DP path: TS0601_smoke_co (6ycgarab, aoah6bv8, 2841000000_6ycgarab) smoke DP1 / CO DP18 / battery DP15; PA-44Z (qvzsq3s2); GSKS-ZB (qcasmfan, + tamper DP4). `alarm_co` added late | `_TZE200_/_TZE204_6ycgarab` and `_TZ3210_09hzmirw` have no upstream smoke source (09hzmirw is an EcoDim bulb upstream) — left untouched, flagged |
| Thermostats / TRV | `windowcoverings_set` "missing" rows are artefacts (valve position) | — | hpkusvom DP1 check |
| Covers | "onoff" exposes are upstream backlight/limit switches | — | — |
| Buttons / keypads | keypad `_TZE284_rt5dklro` arm actions DP27/28, user DP112 | — | next batch |
| Lights | LED controllers 8fffc3kb / gt5al3bl DP61 (paint colour) | — | next batch |
| Climate / soil | soil AOYAN DP9 temperature unit; lb0fsvba DP6 | — | settings only, low impact |
| Battery sensors | many `alarm_battery` / `measure_voltage` expose rows | — | intentionally not added (SDK rule: no measure_battery + alarm_battery together) |

## Credits
DP layouts: Koen Kanters and the zigbee-herdsman-converters contributors (tuya.ts models
TS0601_smoke_co, PA-44Z, GSKS-ZB, MG-DIM02Z, SWS6TZ-WHITE, TOQCB2-80; moes.ts ZM7LT3).
Facts only, own implementation, no code copied.
