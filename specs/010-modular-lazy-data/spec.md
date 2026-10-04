# Spec 010: modular architecture, chunked data, lazy loading (R22)

## Goal
Small services/modules/functions; data loaded on demand in small chunks; non-critical layers loaded
after init. Incremental migration, nothing degraded: every couple that matches today still matches,
every capability still works. Measure boot time and heap before and after each step.

## Scope
1. Data sharding: `data/mfs_db.json` (5 MB, excluded from payload), `lib/tuya/fingerprints.json`
   (0.89 MB, runtime) and similar catalogs split per productId or mfr prefix into
   `lib/data/shards/<kind>/<key>.json`, plus a small index. Loader `lib/data/ShardLoader.js`:
   `get(kind, key)` loads one shard on first use; LRU-bounded cache (cap + TTL, R21); shared
   across devices (never copied per device).
2. Lazy modules: heavy optional layers (EF00 extras, OTA, Wi-Fi/tuya-local, learning engines,
   diagnostics) are required on first use; non-critical layers start after `onInit` via a deferred
   scheduler with bounded concurrency.
3. app.json size: keep within the 4 MB compact limit (today 3.70 MB) while fingerprints grow.
4. Modularity: split oversized files (>1500 lines) into focused modules behind the same exports.

## Non-goals
No change of matching semantics, driver ids, app ids or capability names. No bulk data rewrite.

## Measurement
`scripts/perf/boot-heap.js`: require the app entry and every driver/device module in a Homey-less
harness, record wall time and `process.memoryUsage().heapUsed` before and after; result stored in
`reports/perf/boot-heap-<date>.json` and compared in CI (warn on > 10 % regression).

## Acceptance
- Same couple → driver resolution for all compose couples (golden file before/after).
- Boot time and heap equal or better; critical tests not worse than the baseline.
- Shard cache bounded (unit test), no per-device copies (R21 gate).

## Design sources (research before T2; reimplement our own way, credit in CREDITS.md)
- Homey Apps SDK v3 docs and developer guides: app lifecycle (`onInit`, `onUninit`), drivers and
  devices (`onNodeInit`, `onDeleted`), flow cards (register once per driver/app), performance and
  memory guidance (https://apps.developer.homey.app/).
- athombv/node-homey-zigbeedriver and athombv/node-zigbee-clusters (cluster/attribute handling,
  binding, reporting).
- Structure of well-built Homey apps: official Athom brand apps, JohanBendz/com.tuya.zigbee,
  Aqara, IKEA, Sonoff, Philips Hue and other community Zigbee apps (lazy requires, shared
  data, flow-card registration, listener cleanup).
