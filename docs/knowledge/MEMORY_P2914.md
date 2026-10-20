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
