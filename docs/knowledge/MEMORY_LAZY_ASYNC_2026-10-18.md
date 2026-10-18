# Memory safety: lazy + async loading, bounded caches (2026-10-18)

Shared root cause for the Universal Tuya 9.0.1506 crash (build 3590) and Bastien's "heap out of memory" logs:
memory pressure on the Homey app process. Two independent problems made it worse, and both live in code
that all three branches share.

## 1. The guard itself could crash the app
`MemwarnGuard.handle` called `process.memoryUsage()` unguarded. Under pressure it can throw
`ENOENT (uv_resident_set_memory)`, so the very handler meant to relieve pressure killed the app.
Now every `process.memoryUsage()` use (guard, PerformanceOptimizer, DiagnosticReportExport,
AutonomousVerificationEngine) has a try/catch and a `v8.getHeapStatistics()` fallback.

## 2. Big reference JSON pinned forever
`require('data/dp_registry.json')` (2 MB text) and the energy reference were held in Node's module cache and
again in per-instance fields: nothing could release them. Pattern now (`lib/utils/BoundedJsonCache.js`):
- parse at first use only (never at startup); async `get()` (non-blocking read, one yield before parse,
  concurrent loads de-duplicated) or `getSync()` for callers that cannot await;
- bounded LRU: max 4 entries / 16 MB of source text; a file bigger than the whole budget is served but not kept;
- no per-instance references (always read through the cache), so `clear()` really frees the data;
- `memwarn-cleaners` registers `json-cache` -> `clearShared()`; the next use re-reads from disk.

## 3. The guard no longer adds load while memory is tight
`attach()` uses `handleAsync`: cleaners run one per tick (`setImmediate`), async cleaners are awaited with a
2 s timeout, concurrent `memwarn` events coalesce into the in-flight run (no stacking), and a repeat within
60 s sets `severity: 'high'` in the cleaner argument. Event history is capped at 20.

## Rules for new code (all branches)
1. Big data (> ~100 KB) is loaded lazily through `BoundedJsonCache`, never `require()`d at module top or
   cached in an instance field.
2. Non-essential work (catalog builds, reports, intelligence) is deferred until after `onInit` has finished.
3. Every cache/queue has a hard bound and, if rebuildable, a cleaner registered in `memwarn-cleaners.js`.
4. Never call `process.memoryUsage()` bare.

## For the Bastien track (bastien-home) and stable-v5
Same root cause, same fix. Port: `lib/utils/MemwarnGuard.js`, `lib/utils/BoundedJsonCache.js`,
`lib/utils/memwarn-cleaners.js`, and the two call sites (`TuyaUniversalMapper._getRegistryMapping`,
`DeviceTelemetryEstimator._energyReference`). Tests: `test/memwarn-guard.test.js`,
`test/critical/p2863-bounded-json-cache.test.js`. Bastien's `invalid_flow_card_id` spam is also shared:
see `UNBLOCK_MASTER_AND_ISSUE_560_2026-10-18.md` (FLOW-GUARD log-once + UniversalFlowCardLoader fallback).
