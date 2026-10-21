# P2926 — Bastien app: crashes and failing Flow cards/buttons (21/10/2026, Paris)

## Evidence (Homey-only Gmail, since 15/10)
| Date (Paris) | App / version | Event | Trace / device |
|---|---|---|---|
| 17/10 19:15 | bastien 1.0.161 | diag + crash | `FATAL ERROR: Reached heap limit … JavaScript heap out of memory` (OOMErrorHandler); button_wireless_2 `1ea51404…` TUYA-MAGIC readAttributes fail; switch_1gang x7 unhandled 0x0000 frames |
| 18/10 20:47 | bastien 1.0.161 | diag + crash | same OOM; FLOW-GUARD `Invalid Flow Card ID`: home_mode_changed, capability_value_changed_generic, device_interaction |
| 17/10 17:45 | universal 9.0.1506 | crash | `ENOENT uv_resident_set_memory at process.memoryUsage (MemwarnGuard.js:22)` |
| 17/10 23:42 | universal | diag | (no crash) |
No user crash/diag mail since 18/10 for any of the three apps; 21/10 mails are only master build processing failures (AggregateError / socket hang up).

## Mapping to fixes
- OOM 1.0.161 → already on bastien-home: P2830 (bounded dedupe/fan-out), P2914 (ZigbeeResilience registry no longer pins devices), P2915 (bounded diag log ring, telemetry estimator). Verified in `git log origin/bastien-home`.
- MemwarnGuard ENOENT → MemwarnGuard already guarded; P2926 also guards the last unguarded call (`StartupTimeProfiler._getCurrentMemory`).
- Invalid Flow Card IDs / Flows and buttons not firing → root cause in `scripts/maintenance/bastien-publish-fleet-prune.js`: the publish prune kept only driver-prefixed cards + 3 hardcoded triggers, so **every other app-level card used by the code was removed from the published manifest** (button_pressed, tuya_dp_*, scene_*, battery_*, soft_feature_* …). P2926 keeps each app-level card referenced in lib/drivers/app.js (scanned at publish), drops a card whose device arg is filtered to pruned drivers only, and trims mixed driver_id filters (no orphan → no Athom invalid_state). Now 70 app-level cards survive; manifest 0.9 MB.
- Test: `test/critical/p2926-bastien-prune-app-cards.test.js`.

## Remaining
- Multi-path button router (master P29xx) not landed on master yet; port when it does.
- 0x0000 unhandled frames on switch_1gang are log-only (throttled), not a crash.
