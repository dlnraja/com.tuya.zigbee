# P2927 — HEIMAN couples kept on a specific driver and on the generic fallback (21/10/2026)

User decision 2026-10-21, applying the 2026-10-20 rule "the specific driver wins, the generic driver is the fallback".

## Couples kept on two drivers
| Couple | Specific driver (wins) | Generic driver (fallback) |
|---|---|---|
| HEIMAN × TS0041 | smoke_detector_advanced | universal_zigbee |
| HEIMAN × TS0205 | smoke_detector_advanced | universal_zigbee |
| HEIMAN × TS0601 | smoke_detector_advanced | universal_zigbee |

universal_zigbee keeps the HEIMAN brand because 63 of its 66 productIds have no specific driver. Taking the name out would drop all 63 couples (the 9.0.1575 resolver did that, see P2921).

## How the checkers treat them
- `data/native-matrix-reviewed-duals.json` lists all 3, each with reason, source and date. The entry covers only this exact driver set; any other driver holding HEIMAN on these pids is still a conflict.
- `tools/ci/lib/reviewed-duals.js` is read by `scripts/automation/fix-fingerprint-conflicts.js` (it no longer proposes a removal), `scripts/gates/native-matrix-gate.js`, `tools/ci/prune-fp-collision-bleed.js` and `tools/ci/build-device-truth.js`.
- `scripts/leads/dual-couples.js` (P2794 report) now classifies a reviewed dual as `kept`, with the reason "specific driver wins, generic is the fallback".

## Why Homey picks the specific driver
- At interview time Homey compares the device's manufacturerName and modelId with each driver's manifest. When more than one driver matches, it takes the first matching driver in manifest order (Homey SDK Zigbee docs; field reports in the Universal Tuya thread 140352, e.g. smoke vs temperature sensor matched "by driver loading order").
- The drivers in our source `app.json` and in the built `.homeybuild/app.json` are sorted by id, because the build reads `drivers/` in alphabetical order. `smoke_detector_advanced` (index 300) comes before `universal_zigbee` (index 356).
- So a HEIMAN smoke sensor on TS0041/TS0205/TS0601 pairs to the specific driver, and universal_zigbee only takes HEIMAN devices whose pid no specific driver lists.
- `test/critical/p2927-heiman-generic-fallback-duals.test.js` locks this down: the entries and reason exist, the checker verdict is `kept`, and the specific driver is listed first in a sorted list.
- A generic driver must keep an id that sorts after the specific drivers (`universal_*` does). If a generic driver is ever renamed, re-check the order.
- Devices already paired keep their driver; this only affects new pairings.
