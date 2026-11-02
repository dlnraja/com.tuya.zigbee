# Driver continuations (P3206, 02/11/2026 Paris)

**Registry (SSOT):** `config/architecture/driver-continuations.json`. **Resolver:** `lib/drivers/DriverContinuations.js`.
**CI check:** `node scripts/ci/driver-continuations-check.js`. **Test:** `test/critical/p3206-baseline-narrow-continuations.test.js`.

## Why
Homey matches the exact `manufacturerName × productId` cartesian per driver (no wildcard, case-sensitive;
apps.developer.homey.app/wireless/zigbee, community t/51187). We cap at 1500 combos per driver and ~20000 total
(see `docs/knowledge/ATHOM_LIMITS.md`). A driver that is full gets a continuation instead of losing couples.

## Markers
- Full driver: `{ "full": true, "continuation": "<id>_2" }`
- Continuation: `{ "continuationOf": "<root id>", "index": 2 }` (chains go on: `_3`, `_4`, ...).
- Not written into driver.compose.json (validate does not need it; keep the compose standard).

## Rules
1. A continuation **subclasses** the root `device.js`/`driver.js` (one-line `require('../<root>/device')`), reuses the
   root assets (icons/images via path) and its flow cards — no duplicated logic, no duplicated flow cards.
2. **Paired devices never move**: the root keeps every couple it already ships; only overflow couples go to the continuation.
3. One couple, one driver: decided per exact mfr+pid. Group couples sharing a pid set in the same continuation so the
   cross-product adds no parasite combos.
4. Writers (`scripts/kb/apply-batch.js`, `scripts/leads/strict-apply.js`) add new couples to `firstNonFull(root)`.
5. Audits (dedup, one-couple-one-driver, conflict) compare `logicalId()` — a chain is one logical driver.
6. Coverage matrix, Device Finder, publish compaction, workflows and AI prompts read the registry through the resolver.
7. CI fails on: non-reciprocal links, unreachable continuation, couple duplicated across a chain, `full` flag wrong
   against the cap (`cap.perDriverCombos × cap.fullAtRatio`), continuation carrying couples behind a non-full driver.

## Duplicate driver gate (P3238, 02/11/2026 Paris)
`node scripts/ci/driver-signature-dup-gate.js` (test `p3238`): a NEW driver whose class + capability set equals an
existing driver fails CI. Put its exact couples on the existing driver (or its chain via `firstNonFull`), or register it
as a continuation. Exempt: continuations and `config/publish-hold-drivers.json`. Existing duplicates are baselined in
`config/ci/driver-signature-baseline.json` (never add ids by hand). Drivers with no couple of their own get
`"deprecated": true` (id kept; Homey cannot migrate paired devices) — P3237.

## Chains in place
- climate_sensor -> climate_sensor_2 (P3229), curtain_motor -> curtain_motor_2 (P3233),
  contact_sensor -> contact_sensor_2 (P3239: lumi.sensor_magnet[.aq2], pids TS0203/TY0203/DS01; held).

## Budget reality (measured 02/11/2026 on master)
- Payload 19943 combos, 14804 source-backed, 3192 strong (kb/diag/sacred) → parasite ratio 0.258.
- Perfect pid-set packing costs exactly the couple count: strong 3126 couples / 391 pid-set groups (fits 20000);
  all sourced incl. weak mfs_db 79762 couples (≥ 327 drivers at 1500) — **cannot fit any split under 20000**.
- A fallback/generic driver adopting unmatched devices is **not possible**: unmatched devices go to Homey's own
  "Basic Zigbee Device", never to an app driver.
- New pairable driver ids historically coincided with Athom AggregateError rejections: add continuations held
  (`config/publish-hold-drivers.json`) and release one per bisectable publish.
