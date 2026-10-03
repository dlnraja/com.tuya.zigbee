# Plan 003
- `lib/coordinator/DeviceCoordinator.js` as a façade over ReceptionManager/TransmissionManager.
- Key = capability (+endpoint, +press type). State per key: lastValue, lastTs, lastSeq, lastChannel.
- ingest: seq seen → drop; same value within window from another channel → drop; else apply now.
- command: identical payload to same target within window → drop; mark expected echo.
- Setting `coord_window_ms`. Stable gets the simple subset only.
- Tests with fake clock: test/critical/device-coordinator.test.js.
