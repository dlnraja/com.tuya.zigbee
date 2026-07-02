# Forum Smart Life Cloud Reference - 2026-07-02

Source: https://community.homey.app/t/app-tuya-smart-life-smart-living/146735

## Scope

This Homey forum topic is for the official/cloud "Tuya - Smart Life. Smart Living" app, created on 2025-12-11 and last active in the fetched dump on 2026-06-27. It is not the native Zigbee support thread, but it contains useful cross-app signals for Tuya DP handling, pairing UX, raw commands, scaling, and offline diagnostics.

## Timeline Signals

- 2025-12-11 to 2025-12-13: users reported QR/login repair after Homey update/reboot, lights returning `[2001] 2001`, and devices becoming unavailable. Forum replies identify Tuya 2001 as device offline.
- 2025-12-13 to 2026-01-23: unsupported or "unknown" devices repeatedly needed raw code/DP visibility: circuit breaker/meter, fan speed, CO2 detector, face-recognition access panel, power strip, cat feeder, and IR scenes.
- 2026-02-14 to 2026-04-19: repeated energy/power scale complaints on power plugs and sockets. Users compare Tuya Cloud values against Homey values and mention tenfold/large kWh discrepancies.
- 2026-03-18 to 2026-05-28: users ask how to discover which DP/code controls device actions and how to drive scene-like attributes from flows.
- 2026-06-13 to 2026-06-21: an air conditioner reported ambient temperature as `205`; follow-up suggests divisor/scaling problems and later user reset/re-pair fixed it.
- 2026-06-16: fan coil device exposed only temperature when added as unknown; requested heat/cool/ventilation and fan speed mode.
- 2026-06-27: Pi-hole/DNS blocking can allow pairing but leave devices "not connected" in Homey while still working in Smart Life.

## Cross-App Actions Applied

- Classified Tuya cloud `2001` errors as reachability/offline, not unknown crashes.
- Removed hidden `this.homey` timer dependencies from SmartLife QR polling and local TCP heartbeat/reconnect logic.
- Hardened cloud/auth logging so Homey logger objects do not break circuit breaker logging.
- Activated generic WiFi raw DP hooks and Flow cards:
  - raw DP updates now populate `discovered_dps`;
  - `wifi_generic_dp_changed` triggers with DP and value tokens;
  - `wifi_generic_set_dp` can send bool, number, string, and JSON values.
- Added configurable WiFi fan speed raw range. Default remains `0..100`, but devices requiring `1..6` can now set min/max without a dedicated driver rewrite.
- Reused the same DP hook to revive existing WiFi water tank monitor custom DP handling.

## Non-Goals

- This does not clone the official cloud app or its cloud credentials.
- This does not add native support for every cloud-only WiFi category from the thread.
- Gmail crash-log processing was not available in this run; OAuth remained blocked in prior attempts.
