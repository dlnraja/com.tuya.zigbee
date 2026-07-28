# Publish Pipeline Pruning — Root Cause Analysis (2026-07-28)

> **This is the root cause of issue #513 and of the massive gap between the repo catalog and the published app.**

## TL;DR

The publish-time compactor `scripts/maintenance/compact-zigbee-identifiers.cjs`
(run by `scripts/prepare-publish.js`) **truncates Zigbee fingerprints by array order**,
dropping **3 351 OBSERVED manufacturers** (verified against `data/mfs_db.json`) from the
published build. The Test channel build 2673 (v9.0.348, published 2026-07-24 21:33 UTC,
state=test, 361 installs) contains only **286 of 431 drivers** and keeps only the
**first 6 of 854 manufacturerNames** in `climate_sensor` — `_TZE284_hodyryli` (issue #513)
is cut, so the user's device pairs as "Unknown unit" even on the current build.

## Evidence chain

1. `node scripts/check-build.js` (default buildId 2463) misleadingly shows an old
   `processing_failed` build — the pipeline is NOT dead.
2. Athom API `/api/v1/app/com.dlnraja.tuya.zigbee` → `testBuild: {id:2673, version:"9.0.348", state:"test", installs:361}`.
   Recent builds: 2669 (9.0.344) → 2673 (9.0.348), all 2026-07-24. `processing_failed`
   is transient per-build (2672 failed, 2673 succeeded 8 min later), NOT a 6-week freeze.
3. Downloaded the published archive of build 2673 (2.82 MB app.json) and diffed:
   - local `app.json`: 431 drivers, 6.49 MB, `climate_sensor` = 854 mfrs, hodyryli present
   - local `.homeybuild/app.json`: 430 drivers, 854 mfrs, hodyryli present (build is correct)
   - **published `app.json`: 286 drivers, `climate_sensor` = 6 mfrs — exactly the FIRST 6
     of the local array** (OWON, TUYATEC-AVTSQQBD, TUYATEC-W89THYFC, _TYST11,
     _TYST11_2dpplnsn, _TYST11_8daqwrsj) → order-based `slice(0, limit)`.
4. `compactZigbeeIdentifiers()` caps each driver at `maxDriverCombos` (default **350** =
   mfrs × pids) and keeps `manufacturers.slice(0, floor(350/pids))` — blind truncation,
   no priority for observed devices.
5. Drivers whose manufacturerNames ALL match the synthetic regex
   (`unknown|dummy|placeholder|needs_device_assignment|_generic_|_hybrid_|_master_`)
   are dropped entirely → the 145 missing drivers (`air_purifier_*`, `blaster_remote`,
   `bulb_*`, `button_wireless_*`, `climate_sensor_device`…).

## Impact measurement (local app.json vs mfs_db observed set, 4 315 mfrs)

- 31 drivers over the 350-combo cap.
- **Observed mfrs kept: 437 — observed mfrs dropped: 3 351.**
- Worst cases:
  - `climate_sensor`: 854 mfrs × 74 pids → keeps 4, **829 observed dropped**
  - `button_wireless_2`: 246 × 106 → keeps 3, **242 observed dropped**
  - `diy_custom_zigbee`: 205 × 73 → keeps 4, **201 observed dropped**
  - `generic_diy`: 75 × 50 → keeps 7, **64 observed dropped**
  - `bulb_dimmable`: 48 × 90 → keeps 3, **45 observed dropped**
  - `dimmer_wall_1gang`: 56 × 20 → keeps 17, **39 observed dropped**
  - `curtain_motor` / `curtain_motor_shutter`: 28 + 22 observed dropped
- `_TZE284_hodyryli` IS in mfs_db (observed) → dropped purely by array position.

## Why the cap exists (do not remove blindly)

Athom expands manufacturerName × productId server-side; tens of thousands of combos
inflate the upload payload and cause `processing_failed`. `prepare-publish.js` also
hard-fails above 4 MB app.json. Any fix must keep the payload bounded.

## Fix design (agreed direction)

Replace blind `slice(0, limit)` with **evidence-prioritized compaction**:

1. Load `data/mfs_db.json` (available in CI checkout; stripped from payload later anyway).
2. For over-cap drivers, first reduce **productIds** to those actually observed with at
   least one of the driver's mfrs in mfs_db (e.g. climate_sensor likely needs ~10 pids,
   not 74) — this shrinks the cross-product without losing any real pair.
3. Then keep mfrs by priority: (a) observed in mfs_db, (b) remaining, until the combo
   budget is met. Never drop an observed (mfr, pid) pair before a speculative one.
4. For all-synthetic drivers dropped entirely: re-attach observed mfrs from mfs_db
   (mfs_db entries carry `driverHint`) instead of dropping the driver.
5. Make budgets env-configurable (already: `HOMEY_ZIGBEE_MAX_DRIVER_COMBOS`,
   `HOMEY_ZIGBEE_MAX_TOTAL_COMBOS`) and log a per-driver before/after table
   (verbose) in the publish output for auditability.
6. Add a CI gate: after compaction, verify that every mfr+pid pair from the last N
   user-reported issues (or at minimum mfs_db high-confidence entries) survives in the
   publish manifest — fail the publish if a regressions like #513 would occur.

## Related findings

- `prepare-publish.js` deletes `data/mfs_db.json` from the payload (by design, size) —
  fine, compaction must happen BEFORE that step using the checkout copy.
- The 6.49 MB local app.json is itself over the 4 MB limit; the compactor currently
  achieves the size goal by destroying the catalog. Prioritization should achieve it
  by dropping speculative cross-product entries instead.
- Secrets on GitHub are all present (HOMEY_PAT 2026-05-28, ATHOM_CLIENT_ID/SECRET…) —
  no secret-related blocker.
