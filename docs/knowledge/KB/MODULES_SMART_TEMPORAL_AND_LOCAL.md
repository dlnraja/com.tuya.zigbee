# Held devices, sensors, smart features, temporal tools and Wi-Fi local helpers (hand-written reference)

Written 2026-11-16 for the documentation coverage work (P3350, queue item 5), continuing [MODULES_PERFORMANCE_PROTOCOL_AND_PROFILES](MODULES_PERFORMANCE_PROTOCOL_AND_PROFILES.md). Each entry says in our own words what the module is for, how it is bounded and where it is wired. "Importers" counts the other files under `lib/`, `drivers/` and `app.js` that `require()` it on master at the time of writing; 0 means nothing loads it today (kept for reference, never removed without a check). Modules reached only through a folder `index.js` count that index as an importer.

## Held drivers, memory and settings

- `lib/devices/held/WallSwitchRfEws1154zDevice.js` (P3330) - device class of the EWS1154-Z RF wall switch, moved out of its own driver folder so the published driver `wall_switch_1gang_1way` can run it for the exact couples of the held driver `wall_switch_rf_ews1154z` (which only re-exports it). The DP layout follows the zigbee-herdsman-converters definition (credited in CREDITS.md); nothing is written to the Tuya cluster at pairing. Wired through `lib/drivers/HeldDriverFolds.js`. Importers: 2.
- `lib/memory/SettingsBudget.js` (P3312) - boot-time size check of the app settings. Homey hands every setting to the app as JSON text before `onInit`, so one oversized value is parsed again at every start and, with a character above U+00FF, doubles in memory; on a small Homey this caused an out-of-memory restart loop. `enforceSettingsBudget(homey)` removes any key above 512 KiB (`MAX_KEY_CHARS`) and logs only the key name and size, never the content; normal keys are untouched. Called once from `app.js`. Importers: 1.
- `lib/settings/migrateSettingKey.js` - copies a device setting from an old key to a new key and leaves the old value in place (additive rename). Returns what it did (`wrote`, `unchanged`, `absent`, `no-settings-api`). Importers: 1.

## Quirks, registries and firmware compensation

- `lib/quirks/QuirksDatabase.js` - static table of per-device workarounds (force On/Off instead of Level Control, keep-alive pings, Tuya DP device, Xiaomi attributes, fixed endpoints, custom init), with ideas taken from the ZHA quirk collection; lookup by manufacturer pattern and model. Used by `app.js`, `lib/index.js` and `UniversalPairingManager`. Importers: 3.
- `lib/registry/CentralizedDPRegistry.js` - in-memory registry of Tuya DP definitions with a priority order when two sources disagree, grouping by device type and a reverse lookup from a Homey capability to its DP. Created in `app.js`. Importers: 1.
- `lib/registry/DeviceProfileRegistry.js` - profile lookup keyed case-insensitively on exact manufacturer|product id, then manufacturer only, then product id only, then a per-device-type default; also builds a dynamic profile from a live node. Reached through `lib/registry/index.js`. Lead L-P3350-02: the manufacturer-only and pid-only fallbacks do not follow the exact mfr+pid rule; review before relying on it for new devices. Importers: 1.
- `lib/resilience/FirmwareQuirkCompensator.js` (P2392) - fleet-wide clean-up of UI ghosts created by firmware/compose mixes: it removes the DIY `tuya_dp_*` capabilities from non-universal drivers and `measure_battery`/`alarm_battery` from mains-powered devices (then sets an approximate mains energy profile), re-armed once per device. Called from `HomeyGapCompensator`. Lead L-P3350-01: these removals are the same pattern P3290 made advisory in `HardwareDetectionShim` (removal deletes user flows and insights); to be turned into log-only/hidden-but-kept on master after the publish hold. Importers: 1.

## Sensors

- `lib/sensors/ContactDefaultInvert.js` (P3011) - fixes the default contact polarity check that never matched (arguments swapped in a case-insensitive helper). On the DP path only ids where an outside source confirms an inverted DP1 bit get the default inversion (`_TZE200_pay2byax`, `_TZE204_pay2byax`); IAS-zone ids stay informational because `AlarmPolarityManager` already handles them, so there is no double inversion. The user invert setting still XORs the default. Importers: 3 (contact drivers).
- `lib/sensors/RadarDirectMode.js` (P2791, GH#550) - per-device opt-in `radar_direct_mode`: raw DP reports map straight to capabilities and smoothing/inference writes are skipped. Distance can be scaled per user setting (dm or cm), and a value outside the profile range is taken as cm. Default off. Importers: 1 (`presence_sensor_radar`).
- `lib/sensors/SoilTempScale.js` (P3011) - soil sensors of the `_TZE200_oitavov2` family report DP5 temperature already in degrees C; that raw value is used only when the manufacturer matches and the value is physically plausible, otherwise the auto-detect scale applies. Importers: 2 (soil drivers).

## Smart features (`lib/smart/`, `lib/smartadapt/`)

- `lib/smart/ClusterModel.js` - data model of an inferred device group (room, functional, energy or presence) with members, confidence level and a user-override flag. Importers: 4.
- `lib/smart/ClusterScoring.js` - similarity score between two devices from five signals: switched together within a short window, user action sequences, time-of-day context, device class compatibility and a profile match, each with a weight. Importers: 2.
- `lib/smart/ClusterStorage.js` - saves and loads the inferred groups in Homey settings with optional auto-save; a group the user edited (`userOverride`) is never changed by the engine. Importers: 2.
- `lib/smart/SmartCoordinator.js` - one entry point for the smart features: power estimation without a meter, presence inference without a sensor, the clustering engine and the IR session manager; `destroy()` stops them all. Exported through `lib/smart/index.js`. Importers: 1.
- `lib/smartadapt/SuggestionEngine.js` - non-destructive adaptation: it analyses clusters and capabilities, produces suggestions with a confidence score, logs them and flags them for confirmation; `applySuggestions` does nothing unless confirmed. Created in `app.js`. Importers: 1.

## Process, templates and test helpers

- `lib/suppress-punycode.js` - silences only Node's DEP0040 warning (the built-in `punycode` module) that comes from old transitive dependencies of `node-fetch@2`; every other warning still prints. Loaded from `app.js`. Importers: 1.
- `lib/templates/BEST_PRACTICE_DEVICE_TEMPLATE.js` - reference SDK3 device class (cluster constants, report options in `registerCapability`, flow trigger helper, safe capability getter). Not loaded at runtime. Importers: 0.
- `lib/templates/TuyaTS0601DeviceTemplate.js` - reference TS0601 device class (DP handler table, capability setup, sleepy-device check, `sendDP`). Not loaded at runtime. Importers: 0.
- `lib/testing/TestFramework.js` - small describe/it runner with mock DP reports, capability checks and flow trigger checks for driver self-tests; exposed through `lib/testing/index.js` and `app.js`. Importers: 1.

## Temporal tools (`lib/temporal/`, maintainer side)

- `lib/temporal/EvolutionTracker.js` - snapshots of project metrics (drivers, fingerprints, capabilities, flow cards) over time from the tree and git history, with a local cache. Importers: 1.
- `lib/temporal/ProjectTimeline.js` - cached, time-windowed timeline of commits, releases, issues and forum posts. Importers: 1.
- `lib/temporal/RegressionDetector.js` - looks for reverted fixes, bugs that come back, removed features and metric drops (driver/fingerprint/capability counts going down). Importers: 1.

## Tuya engine and scraping

- `lib/tuya-engine/VirtualBidirectionalSync.js` - for Tuya "mode B" physical switches tied to virtual capabilities: a short per-capability lock (1.5 s) stops the physical change -> virtual update -> physical command loop. Used by `TuyaDataPointEngine`. Importers: 1.
- `lib/scraper/FreeScrapeStack.js` - maintainer-side fetch chain that tries free readers first (direct JSON APIs, keyless readers, archive snapshots) and paid services only with a key and a daily budget; tiers can be skipped by env flags. Not loaded by the app. Importers: 0.

## Wi-Fi local helpers (`lib/tuya-local/`)

- `AirQualityVerdict.js` (P2647) - pure helpers for Wi-Fi air-quality devices: a good/moderate/poor verdict from CO2 (1000/1500 ppm) and PM2.5 (35/55) and an upward threshold-crossing test for flow triggers. Importers: 1.
- `CloudDpTable.js` (P2956, forum 154077 #491) - reads a DP table carried by a discovered device (tinytuya mapping, Tuya OpenAPI functions/status, plain dps) into one schema; no table means callers keep the old behaviour. Importers: 1.
- `CoverModeInference.js` (P2950, forum 154077 #527) - a switch that only shows DP1 with a string value on the curtain category is treated as a cover command (open/stop/close tokens); position DPs stay optional. Importers: 1.
- `CoverPositionSource.js` (P2952, forum 154077 #487/#489) - many motors take the requested position on DP2 but report the real one on DP3; once DP3 has reported it owns the tile. Importers: 1.
- `CoverTravelEstimator.js` - opt-in time-based position for covers with only open/close/stop: a pure state machine that integrates motion time against a calibrated full travel time; the device owns the timer. Importers: 1.
- `LocalDeviceInsights.js` (P2951, forum 154077 #526-#528) - glue between the inference helpers and pairing/device code: driver mismatch hint (for example a strip paired as a plug), sub-socket plan and a support bundle; an empty result means keep current behaviour. Importers: 2.
