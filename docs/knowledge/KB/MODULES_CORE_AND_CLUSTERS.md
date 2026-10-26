# Core helpers, time sync and custom clusters (hand-written reference)

Written 2026-10-25 for the documentation coverage work (P3032 follow-up, queue item 5). Each entry says what the module is for, when it runs and what it must never do. All of these are optional layers: none of them is required for pairing, and a failure in any of them must leave the native Homey path working (see `docs/rules`). See also [CODE_REFERENCE](CODE_REFERENCE.md) for the header line of every file and [DOC_COVERAGE](DOC_COVERAGE.md) for what is still undocumented.

## Device classification and time

- `lib/TuyaDeviceClassifier.js` — small rule set that tells whether a TS0601 device has a clock screen (LCD with RTC) so the time-sync layer is only offered to devices that can use it. It works on the normalised manufacturer name, keeps a short list of known clock batches and excludes the button families.
- `lib/TuyaEpochDetector.js` — listens on the Tuya cluster (0xEF00) for the device's time request (command 0x24) and works out whether that device expects seconds since 1970 or since 2000 (the 946684800 s offset), so the time manager answers in the right epoch.
- `lib/TuyaTimeDebugProbe.js` — one-shot diagnostic that sends the four time payload variants (1970 or 2000 epoch, short or extended frame) once per device and logs the outcome. It never repeats and is only used to learn which variant a clock accepts.
- `lib/TuyaTimeManager.js` — answers Tuya time requests on 0xEF00 and pushes a periodic sync, throttled to one sync every six hours by default, with a single retry timer per device.
- `lib/ZigbeeTimeSync.js` — the standard-ZCL alternative: writes the Time cluster (0x000A, Zigbee 2000 epoch) after binding, throttled to once a day with retries. It is the first choice for devices that expose the Time cluster, with the Tuya path above as fallback.

## Engines and managers

- `lib/TuyaUniversalBridge.js` — event bridge that turns any Tuya DP change (all six DP types) or manufacturer-cluster event into flow-card triggers, keeping a bounded per-device history so users can build flows on DPs no driver maps yet.
- `lib/UniversalZigbeeProtocol.js` — reference engine listing Zigbee profiles (ZHA, ZLL, SE, Green Power), known manufacturer cluster ids per brand and the standard ZCL cluster ids, with helpers to interpret frames from any of them. Used as a lookup table more than as a runtime path.
- `lib/ZigbeeClusterManager.js` — generic handler for standard clusters used directly by drivers: IAS Zone (0x0500) alarms, IAS WD (0x0502) warnings, the Tuya DP cluster and the usual on/off, level and colour clusters.
- `lib/clusters/CustomClusterManager.js` — scans every endpoint for clusters the Homey interview skipped (Tuya 0xEF00–0xEFFF and manufacturer range 0xFC00–0xFFFF), binds and listens to them as a bonus; nothing breaks if none answers.
- `lib/clusters/UnknownClusterHandler.js` — registers a dynamic cluster and bound cluster for any id at runtime, with one event emitter per id, so unmapped Tuya clusters (0xE000 buttons, 0xE001 switch mode, 0xE002 sensor alarms, 0xFD02 modules) can be heard without a dedicated class.
- `lib/adapters/ZHAQuirkAdapter.js` — build-side parser that reads ZHA quirk files (cached under `.github/cache/zha`) and maps their clusters and DPs to Homey capabilities through `ZclToHomeyMap`. Used by enrichment scripts, never at runtime on Homey.
- `lib/analytics/AnalyticsSystem.js` — in-memory metrics store with hard caps (points per metric, devices tracked, total points) sized for Homey Pro memory.
- `lib/battery/ZclBatteryMonitor.js` — gives a battery reading to drivers that declare `measure_battery` but had no battery code: listens to the power configuration cluster (percentage and voltage), normalises the value through the shared battery helpers, sets `measure_battery` and `alarm_battery` (20 % threshold) and reads once only on mains devices. Re-attaching after a device announce does not stack listeners.
- `lib/cache/SmartCache.js` — least-recently-used cache with per-entry expiry and optional disk persistence, used for build and scan scripts that need a bounded cache.
- `lib/catalog/ComplementaryCoverageCatalog.js` — read-only inventory of every complementary I/O path (facades, fallback chains, raw cluster listeners, protocol detection) beyond the native Homey libraries, used by CI to prove the layers exist. It has no side effects.

## Custom and extended clusters

- `lib/TuyaLevelControlCluster.js` — extends the standard Level Control cluster (0x0008) with the Tuya brightness attribute 0xF000 and the Tuya dim command 0xF0, keeping every standard attribute and command.
- `lib/TuyaWindowCoveringCluster.js` and `lib/clusters/TuyaWindowCoveringCluster.js` — two copies of the extended Window Covering cluster for ZCL curtain modules (TS130F and similar): Tuya status 0xF000 (open, stop, close), calibration mode, motor reversal and calibration time. The `lib/clusters` copy is the one drivers load; the root copy is kept for older imports.
- `lib/clusters/IasAceCluster.js` — IAS ACE cluster (0x0501) and its bound cluster, so SOS buttons and keyfobs that send emergency, arm and panic commands on IAS ACE (not on IAS Zone) reach the driver. Used by `button_emergency_sos` and `heiman_keyfob`.
- `lib/clusters/TuyaE001BoundCluster.js` — bound cluster that logs and forwards attribute reports and frames from Tuya cluster 0xE001 (power-on and switch-mode settings).
- `lib/clusters/TuyaE002BoundCluster.js` — bound cluster for Tuya 0xE002 sensor alarm reports; accepts both attribute ids seen for the humidity maximum (0xD00D and the older 0xD00C).
- `lib/clusters/TuyaE003Cluster.js` and `lib/clusters/TuyaE003BoundCluster.js` — Tuya 0xE003 scene and button cluster (scene mode and scene id attributes) and the bound side that turns each incoming command into a scene event plus a raw-frame callback.
- `lib/clusters/TuyaOnOffExtCluster.js` — reference list of the extra Tuya attributes on the On/Off cluster (backlight, power-on state, child lock and similar). It must not be registered globally because it would replace the standard On/Off cluster; drivers read those attribute ids through the normal cluster.
- `lib/clusters/ZosungIRControlCluster.js`, `lib/clusters/ZosungIRControlBoundCluster.js` and `lib/clusters/ZosungIRTransmitBoundCluster.js` — the Zosung infrared clusters (0xE004 learn/send and the transmit side) registered early at app start for the IR blaster; the bound sides re-emit learn status, send results and the transmit handshake steps as device events.

## Constants

- `lib/constants/DeviceConstants.js` — shared thresholds (battery low and critical levels, the 255 unknown value, the divide-by-two Zigbee battery scale and similar) so drivers stop hard-coding them.
- `lib/constants/REPORTING_CONFIGS.js` — attribute reporting intervals and minimum changes per measurement type, tuned to avoid flooding the mesh (power, voltage and current slowed down in 5.12.12), with per-capability lookup and override helpers.
- `lib/constants/ZigbeeConstants.js` — central table of ZCL cluster ids and common attribute ids used across the libraries.
