# Spec 003: Device coordinator
## Problem
The same value arrives over ZCL report, Tuya DP and raw frames → duplicate capability writes, double flow triggers,
button floods, actuator command bursts.
## Outcome
One entry point per device: `coordinator.ingest(source, key, value, meta)` and `coordinator.command(target, payload)`.
## Requirements
- MUST pass the leading edge immediately (zero added latency on the first event).
- MUST dedupe across channels by ZCL seqNum / Tuya seq, else by a short window taken from a per-device-type /
  per-driver / per-mfr+pid profile (values benchmarked against Z2M, ZHA, Johan, deCONZ, localtuya; adaptive; setting override, 0 = off) (M1).
- Multi-click (double/triple) window only auto-enabled for remotes without native press type; otherwise off (M2).
- MUST give one trigger per real button press and keep double/triple/long press (press type is part of the key).
- MUST collapse actuator report bursts; never send an identical command twice inside the window; command echoes do not retrigger flows.
- master: full version (per-channel stats, adaptive window). stable: simple version (seq + fixed window).
- Single-channel native devices: untouched.
## Prior art (ideas only, credited in CREDITS.md, no GPL code)
Johan Bendz' Tuya Zigbee apps, Koenkk zigbee-herdsman-converters, ZHA quirks, localtuya, deCONZ.
## Existing code to consolidate (no parallel stack)
lib/multichannel/ReceptionManager.js, TransmissionManager.js, lib/layers/ReconnectBurstCoalescer.js,
lib/utils/UniversalThrottleManager.js, lib/utils/BidirectionalButtonState.js.
## Constitution: D1, D2, D6.
