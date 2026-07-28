# Compactor Priority Fix — Evidence-Based Zigbee Fingerprint Compaction (2026-07-28)

> Fix for the root cause documented in `publish-pruning-rootcause.md` (issue #513).
> The publish-time compactor no longer truncates fingerprints by array order:
> it prioritizes **observed** manufacturers from `data/mfs_db.json`.

## Design

`scripts/maintenance/compact-zigbee-identifiers.cjs` was rewritten around one
principle: **never drop an observed manufacturer while a speculative one is kept.**

1. **mfs_db loading** — `data/mfs_db.json` is loaded from the repo checkout
   (path overridable via `HOMEY_MFS_DB_PATH` / `opts.mfsDbPath`; raw or indexed
   db injectable via `opts.mfsDb` for tests). Indexed as:
   - `byMfr`: lowercase mfr → `{ manufacturerId, modelIds, confidence }`
     (primary source `devices`, fallback top-level mfr keys);
   - `byDriver`: driverId → mfr set (from `devices[].driverHint`,
     `driverMapping`, and top-level entries' `driverId`).
   - If the file is missing/unreadable → **graceful fallback to the exact
     legacy behavior** (order-based `slice`, budgets 350/20000) with a warning.
2. **productId reduction first** — for drivers above `pidReduceOver` combos
   (default 350, env `HOMEY_ZIGBEE_PID_REDUCE_OVER`), productIds are reduced to
   `modelIds ∩ driver pids` observed in mfs_db for the driver's observed
   manufacturers, in original pid order. **Never emptied**: if mfs_db has no
   matching modelId, the original pid list is kept. This shrinks the
   cross-product without losing any real (mfr, pid) pair.
3. **Prioritized mfr truncation** — only if still above `maxDriverCombos`
   after pid reduction: mfrs are kept in priority order
   (a) observed, sorted by confidence desc (stable), then (b) speculative in
   original order. Observed mfrs are only cut when the budget mathematically
   cannot hold them all; such budget-forced drops are collected in
   `result.observedDropped` and logged loudly.
4. **Rescue of all-synthetic/empty drivers** — before dropping a driver whose
   manufacturers are all synthetic (or missing), real mfrs pointing at it in
   mfs_db (driverHint / driverMapping / top-level driverId) are attached
   instead (confidence-sorted; pids filled from their modelIds if the driver
   had none). Drivers with no mfs_db match are dropped as before, with an
   explicit log line including the reason (`no-mfs-db-match` / `no-mfs-db`).
5. **Logging** — one line per modified driver:
   `[compact] <driver>: mfrs A→B (obs X/Y), pids C→D, combos E→F`
   plus a final summary (combos before→after, observed preserved X/X,
   compacted/rescued/pruned counts, budget-forced drops if any).
   `COMPACT_VERBOSE=1` adds dropped-mfr detail. `prepare-publish.js` prints the
   evidence status, observed-preserved count, rescued drivers, and warns on any
   budget-forced observed drop (logging-only change).

## Chosen budgets (measured, not guessed)

| Budget | Value | Rationale |
|---|---|---|
| `maxDriverCombos` (mfs_db present) | **10000** (env `HOMEY_ZIGBEE_MAX_DRIVER_COMBOS`) | Largest observed-only need is `climate_sensor`: 831 obs × 10 pids = 8 310. 10000 preserves every observed mfr in all drivers. |
| `maxTotalCombos` (mfs_db present) | **60000** (env `HOMEY_ZIGBEE_MAX_TOTAL_COMBOS`) | Resulting total is 36 319 — comfortable headroom, far below the payload danger zone. |
| `pidReduceOver` | **350** (env `HOMEY_ZIGBEE_PID_REDUCE_OVER`) | Same threshold as the legacy per-driver cap: broad drivers shed unobserved pids early; this is what brings the total from 195 649 → 36 319 without touching any observed mfr. |
| Legacy fallback (no mfs_db) | 350 / 20000 | Unchanged historical behavior. |

Keeping **all** observed mfrs does **not** explode the payload: compacted
`app.json` is **3.00 MB** (< 4 MB) with **36 319** combos (< 60 000).
No observed manufacturer had to be sacrificed — `observedDropped` is empty.

## Metrics (app.json @ 2026-07-29 00:06 local, 431 drivers)

| | Legacy (order-based) | Prioritized (this fix) |
|---|---|---|
| Drivers in publish manifest | 309 | **324** (+15 rescued) |
| Observed mfrs preserved | 1 932 / 5 294 (**3 362 dropped**) | **5 395 / 5 395 (0 dropped)**¹ |
| Total combos | ≤ 20 000 (forced) | 195 649 → **36 319** |
| app.json size | 2.74 MB | **3.00 MB** |
| `_TZE284_hodyryli` in `climate_sensor` | **dropped** (kept first 4 mfrs only) | **preserved** |

¹ 5 395 counts mfrs observed in mfs_db (devices + top-level keys) across all
drivers including the 42 mfrs attached to the 15 rescued drivers. Counted on
`devices` only: 5 294 source → 5 336 published (delta = rescued).

### Per-driver detail (all 32 modified drivers, rescue excluded)

| driver | mfrs | obs kept | pids | combos |
|---|---|---|---|---|
| bulb_dimmable | 48→48 | 48/48 | 90→4 | 4320→192 |
| bulb_rgbw | 27→27 | 27/27 | 13→2 | 351→54 |
| button_wireless_1 | 15→15 | 12/12 | 31→1 | 465→15 |
| button_wireless_2 | 246→246 | 245/245 | 106→14 | 26076→3444 |
| button_wireless_4 | 12→12 | 10/10 | 47→4 | 564→48 |
| button_wireless_plug | 32→32 | 32/32 | 40→9 | 1280→288 |
| climate_sensor | 854→854 | 831/831 | 74→10 | 63196→8540 |
| curtain_motor | 36→36 | 34/34 | 54→2 | 1944→72 |
| curtain_motor_shutter | 29→29 | 29/29 | 49→2 | 1421→58 |
| dimmable_led_strip | 79→79 | 79/79 | 10→2 | 790→158 |
| dimmer_wall_1gang | 56→56 | 56/56 | 20→2 | 1120→112 |
| diy_custom_zigbee | 205→205 | 205/205 | 73→1 | 14965→205 |
| generic_diy | 75→75 | 71/71 | 50→1 | 3750→75 |
| generic_tuya | 449→449 | 436/436 | 4→2 | 1796→898 |
| light_bulb_rgb | 14→14 | 14/14 | 59→2 | 826→28 |
| motion_sensor | 56→56 | 54/54 | 49→2 | 2744→112 |
| plug_energy_monitor | 38→38 | 37/37 | 79→4 | 3002→152 |
| presence_sensor_radar | 242→242 | 238/238 | 49→25 | 11858→6050 |
| radiator_valve | 149→149 | 149/149 | 17→2 | 2533→298 |
| sensor_contact_zigbee | 148→148 | 148/148 | 36→3 | 5328→444 |
| sensor_motion_presence | 29→29 | 29/29 | 23→4 | 667→116 |
| soil_sensor | 61→61 | 56/56 | 46→3 | 2806→183 |
| switch_1gang | 504→504 | 498/498 | 38→9 | 19152→4536 |
| switch_2gang | 50→50 | 48/48 | 11→2 | 550→100 |
| switch_3gang | 45→45 | 43/43 | 48→2 | 2160→90 |
| switch_4gang | 68→68 | 64/64 | 43→2 | 2924→136 |

Rescued (15): bulb_tunable_white(+6), button_wireless_switch(+1),
contact_sensor_zigbee(+9), device_air_purifier_plug(+4), device_plug_smart(+2),
device_radiator_valve(+3), device_radiator_valve_thermostat(+1),
gateway_zigbee_bridge(+1), sensor_contact_climate(+6), sensor_contact_rain(+1),
sensor_contact_water(+1), smart_garden_irrigation_control(+2), smoke_sensor(+1),
switch_1_gang_metering(+1), switch_wall_5gang(+3).

Pruned (107): all-synthetic or empty drivers with **no** mfs_db match —
dropped exactly as before, now with an explicit reason per driver.

## Issue #513 proof

- Source `app.json`: `climate_sensor` has 854 mfrs incl. `_TZE284_hodyryli`.
- Legacy compactor kept the **first 4** mfrs → hodyryli dropped → "Unknown unit".
- New compactor: `climate_sensor` keeps **854/854 mfrs (obs 831/831)**, pids
  74→10, combos 63 196→8 540. `_TZE284_hodyryli` verified present in the
  compacted manifest (integration test + manual check on
  `tmp/app-compacted-test.json`).

## Files changed

- `scripts/maintenance/compact-zigbee-identifiers.cjs` — rewritten (prioritized
  compaction, mfs_db loading/indexing, rescue, logging, new exports
  `loadMfsDatabase` / `indexMfsDatabase`).
- `scripts/prepare-publish.js` — logging only: evidence status, observed
  preserved X/X, rescued drivers, budget-forced drop warning.
- `test/compact-zigbee-priority.test.js` — new: 7 unit tests (priority order,
  never-empty pids, rescue, legacy fallback, budget-forced drop reporting) +
  1 integration gate on the real `app.json` + `data/mfs_db.json` (all observed
  mfrs preserved, `_TZE284_hodyryli` present, < 4 MB, ≤ maxTotalCombos).

Scratch/audit files: `tmp/proto-compact.cjs`, `tmp/compact-run.log`,
`tmp/app-compacted-test.json`, `tmp/app-legacy-test.json`.

## Verification

- `node --check` on all 3 modified/added files: OK.
- `npx mocha test/compact-zigbee-priority.test.js test/compact-zigbee-identifiers.test.js`:
  **10 passing** (incl. the 2 pre-existing legacy tests, unchanged behavior).
- CLI dry-run on a copy of `app.json`: exit 0, summary
  `combos 195649→36319, observed mfrs preserved 5395/5395, compacted=32, rescued=15, pruned=107`.
- Fallback dry-run (`HOMEY_MFS_DB_PATH=/nonexistent.json`): legacy mode engaged,
  `climate_sensor` → 4 mfrs, budgets 350/20000 — historical behavior confirmed.
- `prepare-publish.js` itself was **not** run end-to-end (writes to os.tmpdir /
  publish path); the compactor was exercised via `require` and CLI on copies.

## Notes & follow-ups

- `app.json` / `drivers/` / `data/` are being actively modified by another
  workstream; metrics above are a snapshot. The compaction is input-agnostic
  and the regression gate re-derives expectations from the current files.
- If mfs_db grows beyond the budget, observed drops become **budget-forced**:
  they are listed in `result.observedDropped`, printed as a WARNING by the CLI
  and by `prepare-publish.js` — a future CI gate can fail the publish on
  `observedDropped.length > 0` (suggested in the root-cause report, point 6).
- `presence_sensor_radar` keeps 25 pids because its observed mfrs genuinely
  span 25 modelIds — pid reduction is evidence-bound, not arbitrary.
