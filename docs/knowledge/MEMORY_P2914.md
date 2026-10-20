# P2914 — App memory crashes (20/10/2026)

## Evidence
- Homey diagnostics, Zigbee Bastien **1.0.161**, 18/10/2026 20:44 (Paris): `FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory`. Last GCs: `Mark-Compact (reduce) 63.8 (66.4) -> 62.4 MB` at uptime 917 s, so the app hit the ~64 MB Homey ceiling about 15 minutes after start. The lines just before are relay fan-out, plus the `[FLOW-GUARD] Invalid Flow Card ID` logs (`capability_value_changed_generic`, `device_interaction`).
- No memory crash report from any app after the P2830 fixes of 18/10 (group-0 fan-out, bounded dedupe/log buffers/queues, HeapSentinel, lazy deferred modules, BoundedJsonCache, MemwarnGuard ENOENT). GitHub issues have no open memory report.

## Measurement (scripts/ci/memory-budget.js, SDK stubbed, `--expose-gc`)
Code + static data heap before any device event, app.js plus all drivers:

| branch | before P2914 | after P2914 |
|---|---|---|
| master | 26.8 MB (1375 modules) | 26.5 MB (1353) |
| stable-v5 | 25.2 MB (1343) | 25.1 MB (1321) |
| bastien-home | 26.0 MB (1336) | 25.8 MB (1314) |

That is about 40 % of the 64 MB budget, used before the first device event. Biggest inclusive costs: `BaseUnifiedDevice` 6.8 MB (shared by every Zigbee base), `TuyaZigbeeDevice` 3.8 MB to 3.1 MB, `DeviceIOFacade` 1.9 MB, `OTAUpdateManager` 0.95 MB, `tuyapi` 0.86 MB, `TuyaUDPDiscovery` 0.5 MB.

## Fixes (additive, no couple or capability touched)
1. **Resilience registry leak.** `ZigbeeResilience.attach()` puts each device in a module-level `Set` ticked by one shared interval. `BaseUnifiedDevice` attached again on every node init without detaching the old entry, and only `onDeleted` detached it, not `onUninit`. Re-interviews and app restarts therefore left dead device objects pinned and ticking. Now the old entry is detached before attaching, and `TuyaZigbeeDevice.onUninit` detaches too.
2. **Lazy `tuyapi`** in `TuyaLocalClient`: loaded on the first WiFi connect.
3. **Lazy `http`/`https`** in `NetworkResilience`, and lazy `NetworkResilience` in `TuyaZigbeeDevice`, which only uses it on the Enigma report path.

## Guards
- `test/p2914-memory-leak.test.js`:
  - 3000 add/re-init/remove cycles through the resilience registry leave it empty and the heap growth under 8 MB.
  - 3000 cycles through the DPCache stay bounded the same way.
  - Source pins on the detach paths and the lazy loads.
  - Code heap must stay at or under `scripts/ci/memory-budget.json` (30 MB), with at most 40 driver load errors so the number stays meaningful.
- `node22-tests.yml` runs the leak test as a hard step and writes a *Memory budget* table to the job summary.

## Next levers (not done, would change startup behaviour)
- Construct `OTAUpdateManager` and `TuyaUDPDiscovery` only when a WiFi or OTA-capable device exists (about 1.5 MB).
- Split `BaseUnifiedDevice` feature managers into per-feature lazy loads.

# P2915: load simulation, lazy OTA/UDP, flow card ids (20/10/2026)

## Simulated load (`scripts/ci/load-heap-sim.js`, 150 devices of 5 drivers, 100 events each, then delete all)

| branch | after init | after events: before → after | after delete: before → after | intervals left |
|---|---|---|---|---|
| master | 27 MB | 41.2 → 32.1 | 40.9 → 22.4 | 150 → 0 |
| stable-v5 | 26.3 MB | 40.0 → 31.2 | 39.6 → 21.6 | 150 → 0 |
| bastien-home | 26.4 MB | 40.0 → 31.7 | 39.9 → 22.1 | 150 → 0 |

## Top retainers in the snapshot, before the fixes
- **Diagnostic log ring per device** (`DiagnosticLogsCollector`): 6.3 MB of concatenated strings and 12 MB of strings. Each device kept 2000 entries, and each entry was a full `JSON.stringify` of every logged object. The `diagnosticLogsBuffer` of each driver class was a direct retainer (0.3–0.7 MB each).
  - Fix: 200 entries per device, at most 300 characters each, objects summarised shallowly, strings stored flat.
- **`DeviceTelemetryEstimator` intervals (120 of 150):**
  - When `record()` attached the estimator, `this.telemetryEstimator` was never set, so `onDeleted`/`onUninit` never destroyed it.
  - `destroy()` could also run during `init()`.
  - Fix: destroy reaches the instance either way, and init stops if the estimator was destroyed.
- **`DynamicCapabilityManager` (30):** `AutoAdaptiveDevice` (buttons and remotes) replaced the instance built by the base class without cleaning it up, which orphaned its 2 h interval. The base class's background step did the same.
  - Fix: clean up the old instance or reuse it.

## Lazy OTA and WiFi UDP discovery
- **`OTAUpdateManager`:** built by `_ensureOTAManager()` on first need (flow card, scan, `getOTAManager()`, or auto-discovery when at least one device exists). It returns null and never throws on failure.
- **`TuyaUDPDiscovery`:** started only when a `wifi_*` device exists. Any WiFi device starts it from its init (`ensureTuyaUDPDiscovery()`), once.
- **Heap when loading `app.js`:** 3.1 → 2.4 MB (master), 2.9 → 2.2 MB (stable), 2.7 → 2.0 MB (Bastien).

## Flow card ids
- **Bastien:** `capability_value_changed_generic`, `device_interaction` and `home_mode_changed` were declared, but `bastien-publish-fleet-prune.js` dropped every card not prefixed by a kept driver. The Bastien 1.0.161 diagnostics logged "Invalid Flow Card ID" on every event. The three triggers are now kept.
- **master:** declares all three.
- **stable:** declares `capability_value_changed_generic` and guards the other two (`isCardDeclared` / `FlowCardPresence`).
