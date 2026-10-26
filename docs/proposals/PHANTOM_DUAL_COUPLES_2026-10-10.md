# Proposal — phantom dual couples (for approval, nothing applied)

Date: 2026-10-10. Status: **proposal only**. No fingerprint is removed by this document or by any workflow.
Source data: `data/leads/dual-couples.json` (generated 2026-10-09 by `scripts/leads/dual-couples.js`).

## What a phantom couple is

Homey matches a Zigbee device when one driver lists its manufacturerName **and** its productId. A driver that lists
M manufacturerNames and P productIds therefore matches every M×P combination. A *phantom* dual couple is a
combination that two or more drivers match, while **no source** (Z2M, ZHA, Blakadder, diagnostics, forum, issues)
has ever reported a device with that exact mfr+productId. It exists only because two lists were multiplied.

- On 2026-10-03 the count was 599 and the decision was: keep them all, act only on conflicts reported by users.
- Current report: **634 phantom** couples out of 744 dual couples (verdicts: kept 592, adapt 42).

## Why they cannot simply be deleted

A phantom couple has no entry of its own: removing it means removing the mfr from one driver (which also drops its
real couples there) or removing the productId (which drops it for every other mfr). Both can break pairing of real
devices, so removal is never the default (constitution: additive only, never degrade).

## Breakdown

| Pattern | Couples |
|---|---|
| same class duplicate (sensor) | 122 |
| light duplicate drivers | 121 |
| light colour vs dim/white | 75 |
| cross class (button/socket) | 73 |
| same class duplicate (button) | 65 |
| cross class (socket/windowcoverings) | 40 |
| switch gang mismatch (1/4) | 30 |
| cross class (sensor/socket/windowcoverings) | 18 |
| cross class (light/socket) | 16 |
| same class duplicate (windowcoverings) | 14 |
| switch gang mismatch (1/2) | 12 |
| cross class (sensor/socket) | 11 |
| switch same gang (1) | 9 |
| cross class (sensor/windowcoverings) | 7 |
| cross class (button/sensor/socket) | 6 |
| cross class (button/other) | 4 |
| cross class (button/sensor/socket/windowcoverings) | 2 |
| cross class (button/other/remote/sensor/socket/windowcoverings) | 2 |
| cross class (remote/sensor) | 2 |
| cross class (remote/socket) | 2 |
| same class duplicate (other) | 2 |
| cross class (light/sensor) | 1 |

Most frequent driver sets:

| Drivers matching the same phantom couples | Couples |
|---|---|
| bulb_dimmable + dimmer_wall_1gang | 72 |
| button_wireless_2 + button_wireless_4 | 63 |
| bulb_rgb + led_strip_rgbw | 44 |
| contact_sensor + sensor_contact_zigbee | 42 |
| button_wireless_2 + plug | 33 |
| curtain_motor + switch_1gang + switch_3gang | 32 |
| dimmer_1_gang_tuya + dimmer_wall_1gang | 32 |
| button_wireless_4 + plug_energy_monitor | 31 |
| gas_sensor_switch + plug_energy_monitor | 30 |
| bulb_dimmable + light_bulb_dimmable_tunable | 24 |
| climate_sensor + presence_sensor_radar + soil_sensor | 20 |
| climate_sensor + presence_sensor_radar | 17 |

## Proposed handling (please choose)

| # | Option | Effect on paired devices | Effect on pairing | Recommended |
|---|---|---|---|---|
| 1 | Keep everything as today (status quo, 2026-10-03 decision) | none | unchanged | yes, default |
| 2 | Mark phantom couples in the report and in the native-matrix gate as "frozen": no new phantom couple may be created (gate already shrink-only) | none | unchanged | yes |
| 3 | When a user reports a device on a phantom couple, research the hardware and move the real couple to an exact-pair driver (as done for WHD02 / TS011F on 2026-10-10), recording the old entry in `lib/data/dual-couple-legacy.json` | kept (legacy file) | the reported couple goes to exactly one driver | yes |
| 4 | Proactively split the largest clusters (e.g. bulb_dimmable + dimmer_wall_1gang, button_wireless_2 + button_wireless_4) into exact-pair drivers using external sources only | kept | changes which driver pairs new devices for those mfrs | only after review, cluster by cluster |
| 5 | Remove mfrs or productIds to make phantom couples disappear | **risk of breaking** | real devices may stop pairing | **no** |

## What would be needed from you

- Approve options 2 and 3 as standing rules (they match the current practice).
- For option 4, name the first cluster to study (suggestion: `button_wireless_2` + `plug`, 33 phantom couples, where
  three real TS011F conflicts were already resolved today).

## Notes

- 42 phantom couples carry verdict `adapt` (runtime adapts to the paired driver); they need no manifest change.
- Nothing in this file is copied from third-party text; counts come from our own report.
