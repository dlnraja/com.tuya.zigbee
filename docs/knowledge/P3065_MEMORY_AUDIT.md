# P3065 — Memory audit (all branches)

Trigger: Bastien OOM on v1.0.161 / v1.0.209 (relays stop, app killed, `JSON.parse` ~62 MB in diag 097f1743).
Method: static review + node harness `scripts/perf/p3065-lifecycle-leak-harness.js` (real driver/device classes,
stubbed Homey/zclNode, N devices per driver, DP events, delete/re-pair cycles, `--expose-gc` heap after GC).
Env knobs: `DRV=a,b` drivers, `FLOOD=k` DP flood blocks (`out.flood`), `INTRO=1` per-device collection sizes (`out.intro`).
Usage: `node --expose-gc scripts/perf/p3065-lifecycle-leak-harness.js <root> <devicesPerDriver> <events> <cycles>`.

Existing protections reused (not duplicated): MemwarnGuard, memwarn-cleaners, MemoryBudget (P3023), BoundedJsonCache,
safeMemoryUsage, LogBuffer/log-buffer (bounded), LiveDataUpdater payload cap, TuyaEF00Manager `_dpStateDedup` (≤500).

## Leaks / crashes found

| # | Finding | Effect | Fix | Branches |
|---|---------|--------|-----|----------|
| 1 | `homey.setInterval` timers owned by a device (and its managers) are only cleared at app destroy, not on device delete/uninit | every delete/re-pair or re-init leaked intervals + the whole dead device graph | `lib/utils/OwnedTimerSweep.js` called after `_destroyDevice` in TuyaZigbeeDevice onDeleted/onUninit (+ deferred 2nd sweep 30 s) and BaseUnifiedDevice onDeleted | all 3 |
| 2 | `this.warn()` called on SimpleClass (no `warn`) — VirtualButtonMixin | TypeError at init | `warn()` on TuyaZigbeeDevice + guard | all 3 |
| 3 | 13 ReferenceError/TypeError at runtime (water leak DP1 alarm transform, contact_climate `getManufacturer`, radar `divisor`/unbounded lux Map, `subDeviceId` in 5 switch onDeleted, `super.onNodeInit` in onDeleted of rcbo/remote, climate flow `temp`, missing `safeMultiply` imports, TRV getter-only `dpMappings`) | crash loops → re-init → leak amplification | targeted fixes + ESLint no-undef ratchet test | all 3 (TRV master only; stable air_purifier_motion extra) |
| 4 | Late async init after delete (IntelligentDeviceAdapter maintenance, PeriodicAutoEnricher) | re-armed timers on dead device | `_destroyed` guards | all 3 |
| 5 | DeviceIOFacade `startReportingPollFallback` armed by the async interview **after** delete, never cleared | 1–5 forever intervals/run under CPU pressure (seen on CI bastien 40312247579) | refuse when `_destroyed`, self-clear on tick, `stopReportingPollFallback()` | all 3 |
| 6 | Per-device diag rings (receptionManager 200, diag loggers 100) and `_dpDedup` (keys embed raw JSON, purged only every 100 DPs, unguarded `_protocolStats`) | bounded but large on big meshes; possible TypeError | memwarn cleaner `p3065-diag-rings` (keep 20) + hard cap 256 keys + guarded purge | all 3 |

## Measurements (heap after GC, MB)

Delete/re-pair cycles:

| Run | Before | After |
|-----|--------|-------|
| master, all 471 drivers — intervals left per cycle | 289 → 581 → 873 | 0–3 (now 0 after #5) |
| master, all 471 drivers — heap afterDelete | 88.8 → 107.7 → 128.4 | 60 / 60 |
| master — dead devices still reachable | 144 → 289 → 432 | ~26–28 constant |
| stable-v5, 12 drivers × 120 devices, 60 ev, 3 cycles | 49.5 → 61.4 → 70.2 (timers 240/480/720) | 45.3 / 46.2 / 45.2 (timers 0) |
| bastien-home, same | 47.9 → 59.6 → **68.7 (> 64 MB Homey ceiling)** | 41.4 / 42.8 / 43.4 (timers 0) |
| bastien-home, 7 drivers × 40, 6 runs on 1 CPU (CI-like) — intervals left | 1–5 (DeviceIOFacade) | 0 in 6/6 |

DP flood without deletes (bounded): 40 dev × 8 drivers × 25 blocks plateaus at 54.6 MB; 5 drivers × 60 dev × 4 blocks 57.4–58.6 MB.

## Not fixed (noted, behavior changes or low value)

- ReceptionManager sorts on every push (CPU, not memory).
- UnifiedSensorBase ignores `{fromDevice}` transform objects (behavior change → master later).
- wall_switch_2/3_gang `ZCLDataTypes` reference (inside try/catch, harmless).

## Tests

`test/critical/p3065-owned-timer-sweep.test.js`, `p3065-undef-crash-fixes.test.js`, `p3065-memwarn-diag-rings.test.js`,
`p3065-io-report-poll-leak.test.js` (node:test, run by node22-tests).

Commits: master af5e17c403, d1eea228de, 0f624c0f6f, 391e6191f2 · stable-v5 24ae0c5c9c+1aad09f8eb, d3069acd74, 84f67aeafc, c06671ad17 ·
bastien-home 8ee643d6fe+e88235ac65, 13be6bf719, 945252c5b8, 1452bf3d56.
