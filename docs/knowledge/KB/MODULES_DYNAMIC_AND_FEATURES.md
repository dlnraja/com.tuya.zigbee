# Dynamic DP engines, eWeLink LAN, errors and gateway soft features

Hand-written notes (daily resume 2026-10-27) for 30 library modules that the doc-coverage report listed as undocumented. Each entry says what the module does, who loads it and what to watch before changing it. Wording is ours. Status words as in [MODULES_DEVICES_AND_DIAGNOSTICS](MODULES_DEVICES_AND_DIAGNOSTICS.md): **live** = loaded by a driver, the app or a CI script; **index only** = exported from a folder `index.js` with no direct driver use; **unused** = nothing requires it (kept, never removed without the owner's yes).

## Dynamic DP layer (`lib/dynamic`)

- `lib/dynamic/DPAdaptationEngine.js` (live, via `AutoAdaptiveDevice` and `lib/layers/UniversalLayerBootstrap.js`). Watches every incoming Tuya DP and keeps a small pattern per DP id: how often it reports, whether the value is stable, and whether a new value is far from its usual spread. It flags DPs that appear for the first time, DPs whose behaviour changed (a hint of a firmware update) and DPs that went silent. Its output only raises or lowers confidence for the dynamic capability layer; it never adds a capability on its own. Keep its per-DP history bounded when editing (heap rule).
- `lib/dynamic/DPAutoMapper.js` (live, via `AutoAdaptiveDevice`). Suggests a Homey capability for an unknown DP from its type (bool, value, enum, string) and its value range, for example a value that stays between -40 and 80 looks like a temperature. Each guess is logged with the reason, and a user override in the device settings always wins. This is the heuristic fallback of the "infer when missing" rule: driver DP maps and exact mfr+pid quirks come first.
- `lib/dynamic/SmartFlowManager.js` (live, via `AutoAdaptiveDevice`). Fires flow triggers when a capability value changes: thresholds, fast rises or drops, a value that stays the same for a while. Every trigger goes through a cooldown so a chatty device cannot flood flows. Undeclared trigger ids fall back to a generic trigger instead of throwing.
- `lib/dynamic/SmartBiorhythmHandler.js` (live, via `lib/tuya/TuyaZigbeeDevice.js`). Day-rhythm colour temperature for lights. When the device has its own biorhythm DP it is switched on that way; otherwise the app computes a warm-to-cool curve from the local sun position (DaylightAtmosphere) and applies it on a timer. The timer is stopped on teardown.
- `lib/dynamic/SmartDoorlockHandler.js` (live, via `TuyaZigbeeDevice`). Reads the common Tuya door lock DPs (unlock event, unlock record, battery, alarm such as tamper or wrong code, door open state) and maps them to Homey capabilities. Lock models that use other DP ids keep their own driver map; this is a shared default.
- `lib/dynamic/SmartButtonRouter.js` (unused). Routes single, double and hold presses of TS0041 to TS0044 scene switches to per-gang flow triggers, through `safeFlowCard` so an undeclared card id is a logged no-op. The live button path is the raw L1 handling in the button base classes; this file is kept for reference.

## Energy and errors

- `lib/energy/ExportEnergyConfig.js` (live, via `TuyaZigbeeDevice`). Some clamps and plugs only gain `meter_power.exported` at runtime, so it cannot be declared in the manifest `energy` block. Once that capability exists, this helper tells Homey Energy about it once per device through `setEnergy()`, and only if nothing declared an export capability before. Because `setEnergy()` overrides later manifest changes for that device, keep the guard narrow. Background: Athom SDK Energy documentation (imported and exported meter capabilities); first raised in issue #105.
- `lib/errors/UserFriendlyErrors.js` (live, `app.js` and `lib/errors/index.js`). Turns technical errors (timeouts, Zigbee send failures, missing clusters, memory pressure) into short messages with a suggestion, and counts them per category so repeated problems show up in diagnostics. Stack traces are shown only when they help.

## eWeLink local LAN (`lib/ewelink-local`)

- `lib/ewelink-local/EweLinkCrypto.js` (live, via the LAN client). AES-128-CBC encryption of the LAN payload with a key derived (MD5) from the device API key, plus the matching decrypt. This is the scheme the eWeLink LAN mode uses on port 8081.
- `lib/ewelink-local/EweLinkLANClient.js` (live, via `EweLinkLocalDevice`). Small HTTP client for one eWeLink device on the LAN: on/off for single and multi-outlet devices, dimming, pulse (inching) and power-on state, plus periodic `/zeroconf/info` polling. Responses are capped at 64 KB, a shared network breaker opens after 5 failures, and nothing connects while memory is under pressure. Reconnect runs every 5 s on a single timer.
- `lib/ewelink-local/EweLinkLocalDriver.js` (live, Sonoff Wi-Fi drivers such as `wifi_sonoff_smate2`, `wifi_sonoff_tx_2ch`, `wifi_sonoff_tx_3ch`). Shared driver: mDNS discovery, a manual configure step during pairing (device id, IP, API key) with localized errors (P3070), the shared Wi-Fi connection store, and the repair handlers added in P3072.

## Gateway soft features (`lib/features`, master only)

All of these come from P2563 to P2568: everyday ideas seen on commercial hubs (Lutron, Aqara, SmartThings, IKEA, Home Assistant) rebuilt on Homey in our own way, with no brand names in the UI. They are opt-in, poll gently, respect the boot budget, and are not ported to stable-v5 wholesale.

- `lib/features/SmartGatewayFeatureHub.js` (live, `app.js`). Owns and starts the features below, wires the lamp-mesh occupancy events to flow triggers and exposes start/stop helpers for flows.
- `lib/features/SoftFeatureCatalog.js` (live, hub and recipe runner). Reads the list of 200 unbranded feature recipes from `config/architecture/world-smart-features-200-ssot.json` once and caches it.
- `lib/features/LocalSelfImproveCatalog.js` (live, via `HomeyGapCompensator`). A fixed list of the local helpers that compensate for things Homey lacks (boot budget, protocol fallback chain, raw cluster fallback and so on), so docs and agents point at real local code rather than an imagined cloud service. No side effects.
- `lib/features/LampMeshOccupancy.js` (live, hub). Guesses room occupancy from lights: changes in each light's signal quality against its own baseline, variance across lights in a zone, recent on/off or dim activity, and optional PIR sensors. It is a soft estimate, not the RF sensing some hubs do in firmware.
- `lib/features/SoftDaylightFade.js` (live, `app.js`, AdaptiveLightingManager, CircadianEngine). Shared easing engine for one-shot fades, continuous daylight following, dawn ramps and dusk fades.
- `lib/features/SoftAmbientSync.js` (live, hub). Ambient colour sync limited to a few lights (4 by default) and one update every 2 s at most, started and stopped explicitly. It replaces continuous screen-sync streams that would flood the mesh.
- `lib/features/SoftDeviceLink.js` (live, hub). App-level link from a remote or motion sensor to lights: when the source flips, the targets follow. Homey cannot bind third-party remotes directly as some gateways do, so this does it in the app.
- `lib/features/LuxAdaptiveDim.js` (live, hub). Lowers light level when a lux sensor reads bright and raises it toward a target when dark, in small steps.
- `lib/features/MirrorLightSync.js` (live, hub). One light leads, followers copy its on/off and dim, rate-limited.
- `lib/features/AbsenceEnergySoft.js` (live, hub). When a zone becomes empty, enrolled loads are dimmed or switched off, with a cooldown.
- `lib/features/ContactEntrySoft.js` (live, hub). Opening a door contact softly turns on chosen lights, optionally skipped during quiet hours.
- `lib/features/IdleAutoOffSoft.js` (live, hub). Turns a light off softly after it stayed on without any change for a set number of minutes.
- `lib/features/WelcomeHomeSoft.js` (live, hub). When an armed zone becomes occupied, welcome lights fade on, with a cooldown.
- `lib/features/StaggeredLeaveOff.js` (live, hub and recipe runner). Turns many lights off with small delays between them, so the Zigbee network is not hit by one burst.
- `lib/features/ShadeDaylightSoft.js` (live, hub). Closes enrolled covers when the sun goes below a dusk angle and opens them after dawn, checked every few minutes.
- `lib/features/PeakLoadSoftShed.js` (live, hub). When a meter reports power above a threshold, enrolled lights are dimmed until it drops.
- `lib/features/QuietHoursGuard.js` (live, `app.js`, ContactEntrySoft, recipe runner). Pure check of whether the current time is inside a quiet window given as HH:MM, including windows that cross midnight.
- `lib/features/NightPathBias.js` (live, `app.js`, hub, recipe runner). Pure helper that lowers path and welcome light levels at night, using the house mode first and the clock or sun as fallback.
- `lib/features/DeviceGroupSceneManager.js` (index only, `lib/features/index.js`). Save and restore the state of a group of devices as a scene, with optional fades. No flow card uses it yet.
