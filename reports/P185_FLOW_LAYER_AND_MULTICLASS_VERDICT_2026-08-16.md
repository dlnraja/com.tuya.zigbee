# P185 — Flow layer audit and the multi-class verdict (2026-08-16)

Two things asked for and delivered here: the real product verification of the 30
multi-class manufacturers I had deferred in P184, and an audit of the flow layer
across every protocol layer.

## 1. The 30 multi-class manufacturers — verdict

The question was whether a manufacturer appearing in two drivers of different
device classes is legitimate or a leftover. It is answerable with data: mfs_db
records the modelIds each manufacturer has actually been observed reporting, so
a placement is real if the driver claims at least one of them.

**26 of the 30 are legitimate** — every driver matches a distinct observed
modelId of the same manufacturer. This is the sacred-couple doctrine working
exactly as written:

| manufacturerName | observed | resolves as |
|---|---|---|
| `_tz3000_3zofvcaa` | TS0201, TS0002, TS0601 | `climate_sensor` takes TS0201/TS0601, `switch_usb_dongle` takes TS0002 |
| `_tz3000_n2egfsli` | TS0601, TS0042, TS0203 | `button_wireless_2` takes TS0042, `contact_sensor` takes TS0203 |
| `_tz3210_jaap6jeb` | TS0203, TS0601 | `bulb_rgbw` takes TS0601, `contact_sensor` takes TS0203 |
| `_tz3000_1dd0d5yi` (+3 siblings) | TS0301, TS0601, TS130F | `curtain_motor_shutter` takes TS0301/TS0601, `wall_curtain_switch` takes TS130F |
| 7× `zigbee_repeater` pairs | TS0207, TS0601 | `motion_sensor` takes TS0601, `zigbee_repeater` takes TS0207 |

So the answer to "my device paired as the wrong type" is **not** in this list for
those 26. They cannot mispair: the productId sets do not intersect and each side
corresponds to a real product.

**4 had no overlap** at the time of the manual pass, and widening the check to
every mentioned manufacturer brings the total to **11**. They are graded by
evidence quality, because that turned out to matter:

| Evidence | manufacturerName | no overlap in | observed |
|---|---|---|---|
| local + z2m | `_tz3000_blhvsaqf` | `switch_wall_7gang` | TS0001, TS0601 |
| local + z2m | `_tz3000_g9g2xnch` | `smart_knob` | TS0001, TS0601 |
| local + z2m | `_tz3000_r0o2dahu` | `smart_knob` | TS0001, TS0601 |
| local + z2m + hubitat | `_tz3210_dse8ogfy` | `fingerbot` | TS0042, TS0503A, TS0601 |
| local + z2m + integration | `_tz3210_ol1uhvza` | `climate_sensor` | TS0301, TS130F |
| z2m | `_tz3008_1a8m8wd6` | `generic_tuya` | TS011F_plug_1 |
| local only | `_tz3000_vd43bbfq`, `_tz3000_yj6k7vfo`, `_tze204_xtrnjaoz`, `_tz3000_3dfewsk1`, `_tze204_5cuocqty` | various | single-model lists |

**Still not stripped, and the reason is now sharper than "be careful".** The
risk is asymmetric: leaving an entry that cannot match costs nothing at runtime,
while removing one that mfs_db merely failed to observe leaves a real user unable
to pair. The bottom five have a single `local` source, which usually means the
model list is incomplete rather than the placement wrong.

### The check nearly shipped with a false positive

The first version reported `_tze200_myd45weu` — the HOBEIAN ZG-303Z soil sensor —
as observing only `TS0044`, which is nonsense. Cause: mfs_db keys the same
manufacturer under several case variants, and building the lookup with
`map.set(key.toLowerCase(), …)` let the last variant overwrite the others. Union
the lists and the false positive disappears.

This is the same last-write-wins trap fixed for the misattribution registry in
P179, in a different file. Worth remembering that any lowercase-keyed index over
mfs_db has to merge rather than assign.

## 2. Flow layer

Audited 4,959 declared flow cards across 430 drivers plus 131 app-level cards,
cross-referenced against every `get*Card` / `_tryCard` / `_safeTriggerFlow` call.

### Fixed: all nine flow cards of `climate_sensor_smart` were dead

`drivers/climate_sensor_smart/driver.js` was a copy of the `smart_scene_panel`
driver and kept that driver's card id prefix. Its compose declares
`climate_sensor_smart_scene_panel_*`, but the code asked for
`smart_scene_panel_*` — and those ids **exist**, because the sibling driver
declares them.

So this was worse than a no-op: the driver attached its run listeners to another
driver's cards while its own nine cards got none. For a user that means the four
"Set switch N" actions do nothing at all, and the scene filter never applies.
Both drivers now use their own prefix, registration is wrapped, and the class
name no longer claims to be the other driver.

While fixing it: the export still named the old class after the rename, which
`node --check` cannot catch because it is a reference error rather than a syntax
error. Verified explicitly that no stale reference remains.

### Confirmed NOT a defect

The audit flagged `_getFlowCard` calls outside try/catch across ~21 drivers as a
crash risk. Traced it: `lib/drivers/ZigBeeDriverFlowCardPatch.js:32` patches
`_getFlowCard` onto `ZigBeeDriver.prototype` with internal error handling, and it
returns `null` rather than throwing. It also swallows the "already registered"
error. Unguarded calls are therefore untidy, not dangerous.

### Remaining flow debt, not fixed here

- **35 card ids referenced in code but declared nowhere**, including
  `low_battery_warning`, `device_online`/`device_offline`, `button_scene_recall`,
  `tuya_dp_value_is`, `tuya_dp_set`. Three feature modules
  (`AdvancedMultiConditionFlows`, `StateHistoryTrigger`, `NetworkTopologyTrigger`)
  are never instantiated in `app.js` at all — ghost wiring.
- **`network_device_joined`** in code vs **`network_new_device_joined`** in
  compose.
- **Three conditions with no run listener**, so permanently false:
  `boiler_switch_energy_power_above`, `boiler_switch_energy_temperature_above`,
  `tuya_dp_type_is`.
- **65 app-level cards** use `titleFormatted` with `[[device]]`, which the project
  bans. Zero in driver-level compose — the ban was applied to drivers and never
  to `.homeycompose/flow/**`.
- `zone_capability_set` declares an autocomplete arg with no autocomplete
  listener, so the picker is empty.

Each needs a decision between declaring the card and deleting the caller, which
is a judgement call per card rather than a sweep.

### Protocol layer coverage

| Layer | Surfaced to flows | Gap |
|---|---|---|
| ZCL onOff | yes — physical/gang + capability triggers | — |
| ZCL levelControl | partial | no app-wide "level changed" trigger |
| ZCL scenes | partial | `button_scene_recall` fired but undeclared |
| multistateInput | folded into button cards | no raw multistate trigger |
| IAS Zone | via capabilities | helper triggers undeclared; tamper bits set capabilities only |
| Tuya EF00 DP | yes — received/changed/threshold/bitmap/raw + send actions | two listeners bind to undeclared cards |
| powerConfiguration | partial | four battery triggers undeclared; mains/battery switch invisible |

## 3. Tooling

`tools/ci/cross-source-user-report-triage.js` now performs the product check
itself, so the 30-row "go and look" list is a graded 11-row list with the
evidence behind each row. Rerunning it after any identity change re-derives the
verdict instead of relying on this document.

## Commands

```bash
node tools/ci/cross-source-user-report-triage.js --fetch
node tools/ci/rules-enforcement-matrix.js
node tools/ci/battery-button-intelligence-gate.js
```
