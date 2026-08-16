# Module load health

Generated: 2026-08-16T17:01:05.519Z

Scopes: lib, drivers. Modules loaded in a child process: **1486**.
Loaded cleanly: **588**. Threw from a repo frame: **0**, from **0** distinct causes.
Threw from inside `node_modules`: **898** — outside a Homey Pro the `homey`
package resolves to the CLI, so `homey-zigbeedriver` cannot build its base classes and every
driver base fails. Those are the sandbox, not the code, and are excluded from the count above.

`node --check` cannot catch any of this: a module can parse perfectly and still throw the
moment it is required.

## Causes, most affected first

None — every module loads.

## Modules sharing a basename at different paths

Requiring by basename, or copying a require line between files, then picks the
wrong one. This is how "class extends undefined" happens.

| basename | paths |
|---|---|
| `TuyaSpecificCluster.js` | `lib/clusters/TuyaSpecificCluster.js`<br>`lib/tuya/TuyaSpecificCluster.js`<br>`lib/TuyaSpecificCluster.js` |
| `DeviceFingerprintDB.js` | `lib/DeviceFingerprintDB.js`<br>`lib/tuya/DeviceFingerprintDB.js`<br>`lib/tuya-local/DeviceFingerprintDB.js` |
| `BatteryManagerV3.js` | `lib/battery/BatteryManagerV3.js`<br>`lib/BatteryManagerV3.js` |
| `OnOffBoundCluster.js` | `lib/clusters/OnOffBoundCluster.js`<br>`lib/OnOffBoundCluster.js` |
| `TuyaColorControlCluster.js` | `lib/clusters/TuyaColorControlCluster.js`<br>`lib/TuyaColorControlCluster.js` |
| `TuyaOnOffCluster.js` | `lib/clusters/TuyaOnOffCluster.js`<br>`lib/TuyaOnOffCluster.js` |
| `TuyaWindowCoveringCluster.js` | `lib/clusters/TuyaWindowCoveringCluster.js`<br>`lib/TuyaWindowCoveringCluster.js` |
| `DynamicCapabilityManager.js` | `lib/dynamic/DynamicCapabilityManager.js`<br>`lib/managers/DynamicCapabilityManager.js` |
| `SanityFilter.js` | `lib/filter/SanityFilter.js`<br>`lib/tuya/SanityFilter.js` |
| `GlobalTimeSyncEngine.js` | `lib/GlobalTimeSyncEngine.js`<br>`lib/tuya/GlobalTimeSyncEngine.js` |
| `IntelligentPresenceInference.js` | `lib/helpers/IntelligentPresenceInference.js`<br>`lib/sensors/IntelligentPresenceInference.js` |
| `ManufacturerNameHelper.js` | `lib/helpers/ManufacturerNameHelper.js`<br>`lib/utils/ManufacturerNameHelper.js` |
| `TuyaSpecificClusterDevice.js` | `lib/tuya/TuyaSpecificClusterDevice.js`<br>`lib/TuyaSpecificClusterDevice.js` |
| `UniversalDataHandler.js` | `lib/UniversalDataHandler.js`<br>`lib/utils/UniversalDataHandler.js` |
