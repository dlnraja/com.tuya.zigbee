# Device helpers, base classes, diagnostics and discovery modules

Hand-written notes (daily resume 2026-10-26) for 30 library modules that the doc-coverage report listed as undocumented. Each entry says what the module is for, who loads it and what to keep in mind before changing it. Wording is ours; where a module was inspired by another project or a user report, the source is named.

Status words: **live** = loaded by a driver, the app or a CI script; **index only** = exported from a folder `index.js` but no driver requires it directly; **unused** = nothing in the tree requires it (kept on purpose, never removed without the owner's yes, rule "additive, nothing lost").

## Converters and coordination

- `lib/converters/TuyaDeviceDefinitions.js` (index only, via `lib/converters/index.js`). A table of Tuya device definitions laid out the way zigbee-herdsman-converters and ZHA quirks describe devices (fingerprint, DP list, conversions). It is reference data for tooling and the converter index; drivers keep their own DP maps.
- `lib/coordinator/DeviceCoordinator.js` (live, via `lib/coordinator/attach.js`, Spec 003, test `test/critical/device-coordinator.test.js`). One gate per device for values that may arrive on several channels at once (native ZCL, Tuya DP, raw frames). The first value always passes with no delay; only true repeats are dropped (same ZCL or Tuya sequence number, or the same value on the same key inside a short per-profile window). Button keys include the press type so single, double and long presses never merge. Outgoing commands with an identical payload to the same target inside a short window are dropped, and the device's echo of a command is marked so it does not fire flows a second time.
- `lib/covers/CoverFlowActions.js` (live, 4 cover drivers, P2799). Gives the Open / Close / Stop / Go to favourite position action cards real behaviour on `curtain_motor`, `curtain_motor_shutter`, `curtain_motor_wall` and `contact_sensor_curtain`; before P2799 they only logged. The stored favourite position idea comes from Somfy TaHoma/Overkiz "My" position.

## Detectors

- `lib/detectors/BseedDetector.js` (index only, via `lib/index.js`). Recognises BSEED multi-gang switches whose firmware needs Tuya DP writes instead of plain On/Off, because a standard On/Off on one gang switched every gang (user report by Loïc Salmona). Exact-couple checks live in the drivers; this helper only answers "is this a BSEED that needs DP mode".
- `lib/detectors/MotionAwarePresenceDetector.js` (index only; logs as `[MeshPresence]`). Soft presence guess from changes in Zigbee RSSI/LQI around a device: it learns a baseline, then raises a presence event when the radio link is disturbed. Optional feature, never a replacement for a real motion or radar sensor.

## Device feature helpers (event emitters attached to a device)

These classes are created with a device and options, listen to DP reports and emit events. All of them are optional layers: a missing DP simply means the feature stays idle.

- `lib/devices/AirPurifierFilterLife.js`. Tracks remaining filter life (percentage DP) and hours used (time DP) for Tuya air purifiers, with a reset command after a filter change.
- `lib/devices/CameraPTZController.js`. Pan, tilt, zoom and stop for Tuya Zigbee cameras through DPs on 0xEF00, with a speed value per move.
- `lib/devices/CurtainMotorTilt.js`. Position plus slat angle for venetian blinds and shutters, combined position+tilt moves and named favourite states.
- `lib/devices/DoorbellCameraSnapshot.js`. Snapshot handling for doorbell cameras: capture on a ring or motion event, or on demand, and keep the reported image URL.
- `lib/devices/EnergyMeterPerPhase.js`. Per-phase voltage, current, power, power factor and energy for single, split and three-phase meters, plus totals over all phases. The P3060 two's complement fix for negative power lives in the packed-phase decoder, not here.
- `lib/devices/FingerprintLockFeatures.js`. Lock/unlock, user and fingerprint add/delete/query, tamper and an access log for Tuya fingerprint locks.
- `lib/devices/IRBlasterCodeDatabase.js`. Stores and sends learned IR codes per device type, brand, model and command (air conditioners, TVs, fans), with a raw-code send path for Zosung-style blasters.
- `lib/devices/SmokePreAlarm.js`. Early warning for smoke and CO detectors: watches the trend of smoke density, CO ppm and temperature and raises graded alerts before the device's own alarm.
- `lib/devices/DoorWindowContactHelper.js` (live, 12 drivers, v9.0.415). Shared IAS contact logic for the door and window sensor family: IAS zone enrolment so the sensor actually sends zone changes, a first state read, an invert setting for firmwares that report the opposite state, and a tamper listener (`attachTamperListener`). Triggered by forum reports from Peter_van_Werkhoven (thread 140352).
- `lib/devices/MiBoxerFut089zZones.js` (live, folded into `button_wireless_4` for the exact couple `_TZ3000_xwh1e22x` + TS1002). Helpers for the MiBoxer FUT089Z 8-zone RGB+CCT remote: it talks to Zigbee group base+N for zone N (factory base 100) with On/Off, Level and Color commands plus the Tuya scene command 0xFD. Behaviour credited to Zigbee2MQTT `miboxer.ts`, u236/homed-service-zigbee and JohanBendz/com.tuya.zigbee#1361; the implementation is ours.
- `lib/devices/Ts004xDedicatedComplement.js` (live, P2616). Fallback layer for unusual TS0043/TS0044 scene switches that keeps the older dedicated fixes alive next to the fleet hybrid init (P2520): LevelControl step/move presses, a raw-frame path that reads the 0xFD press type from the ZCL header (P2328), and a diagnostic log for frames nobody recognised. It only adds presses; deduplication is done by the caller.

## Base device classes

- `lib/devices/BaseTuyaDPDevice.js` (index only). Older generic base for TS0601 devices: finds and binds the 0xEF00 cluster, registers dataReport/dataResponse listeners and parses DP values by type. Current drivers extend `TuyaZigbeeDevice` or the unified bases instead; per project rules 0xEF00 stays optional and must never be required for pairing.
- `lib/devices/PlugDevice.js`, `lib/devices/SensorDevice.js`, `lib/devices/SwitchDevice.js`, `lib/devices/WallTouchDevice.js` (index only; `PlugDevice` is also the template of `scripts/automation/driver-generator.js`). Small bases on top of `AutoAdaptiveDevice`: plugs (on/off plus whichever power measurements the device has), sensors (motion, climate, light, battery type detection), multi-gang switches (per-gang on/off and gang count) and wall touch panels (1 to 8 buttons, debounced button combinations, temperature and tamper).

## Diagnostics

- `lib/diagnostics/FleetIdentityLog.js` (live, P2248). Writes one identity line (manufacturer name and model id, read through the ManufacturerNameHelper chain) at init and wake, so the next Homey diagnostic report always shows the exact couple. Added after several diags from Peter_van_Werkhoven arrived without any identity.
- `lib/diagnostics/DiagContentEnricher.js` (live in CI tools: `tools/ci/user-impact-investigator.js`, `tools/ci/render-diag-treat.js`, `tools/ci/recursive-diag-interview-treat.js`, `scripts/dashboard/generate-diagnostics-dashboard.js`). Pulls exact couples, signals and log ids out of sanitised diagnostic text with regexes and pairing heuristics. It never echoes personal data.
- `lib/diagnostics/DebugManager.js`, `lib/diagnostics/DeviceHealth.js`, `lib/diagnostics/HealthCheck.js` (unused). An app-wide debug flag with log levels, a per-device connection monitor with ping, and a device and network health report (connectivity, power, function). Kept as building blocks; wiring any of them in must respect the memory budget rules (bounded timers, no per-device intervals without a cap).

## Discovery

- `lib/discovery/AutonomousAdvertisingDiscovery.js` (live, P2410). Lists devices that are advertising right now on the LAN and the mesh by merging the Tuya UDP discovery cache, Homey discovery strategy results and Zigbee mesh map nodes with a fresh last-seen time. Used by LAN pairing, the settings API and local-first IP repair; no cloud call.
- `lib/discovery/SmartDeviceDiscovery.js` (live, loaded by `app.js`) and `lib/discovery/SmartDiscovery.js` (index only). Rule-based identification: match manufacturer, model and clusters against known patterns and suggest a driver and settings. Despite the "AI" wording in their headers they are plain pattern tables, no model and no network call.

## Flow helpers

- `lib/drivers/FlowGangControl.js` (live, 10 drivers). Shared on/off for multi-gang flow cards: maps gang N to `onoff`, `onoff.N` or `onoff.gangN` (whichever the device has), sets one gang or all gangs, and keeps the capability value in sync without throwing when a capability listener is missing.
