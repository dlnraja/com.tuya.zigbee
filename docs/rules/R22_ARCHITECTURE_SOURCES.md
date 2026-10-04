# R22 architecture sources (spec 010 / T0)

Research notes for spec 010 (modular architecture, chunked data, lazy loading). Written in our own
words; nothing below is copied code. Each point says what we take from the source and how it
applies here. Measured figures come from `scripts/perf/boot-heap.js` (T1, 2026-10-04, Node 22,
Homey-less harness, module load only).

## Baseline (T1, master 2026-10-04)
- 895 driver/device/app modules requested, 1428 modules in the require cache after loading.
- Module load: about 0.5 s wall time and about 33 MB of heap on a warm file cache.
- `zigbee-clusters` alone costs about 40 ms and `homey-zigbeedriver` about 7 ms (about 6 MB of heap
  together), so most of the cost is our own code and data.
- Largest runtime data: `lib/tuya/fingerprints.json` 0.93 MB (loaded at runtime);
  `data/mfs_db.json` 5.25 MB (excluded from the payload).
- Files over 1500 lines (T7 candidates): `lib/devices/BaseUnifiedDevice.js` (about 5300),
  `lib/devices/UnifiedSensorBase.js` (about 4900), `lib/tuya/TuyaEF00Manager.js` (about 3900),
  `lib/mixins/PhysicalButtonMixin.js`, both radar `device.js`, `lib/tuya/TuyaZigbeeDevice.js`,
  `lib/devices/ButtonDevice.js`, `lib/battery/UnifiedBatteryHandler.js`,
  `lib/flow/FeatureFlowCards.js`.
- The golden couple-to-driver snapshot is in `specs/010-modular-lazy-data/golden-couples.json`.
  It covers 391 drivers with zigbee couples. Check it with
  `node scripts/perf/golden-couples.js --check`.

## Homey Apps SDK v3 (https://apps.developer.homey.app/)
- The App class is created once, so shared resources belong there and devices reach them through
  `this.homey.app` (https://apps.developer.homey.app/the-basics/app). For us, the shard cache
  (T2) is one app-level instance that every device shares. No device keeps its own copy (R21).
- Flow cards are registered once per app or driver, not once per device. Listener registration in
  `onInit` of every device multiplies the memory cost by the number of devices.
- Node.js runtime per firmware (same page, "Node.js" table):
  - Homey Pro 2016-2019 runs Node 16 from v7.4 up to v12.9.
  - Homey Pro Early 2023 and Homey Pro mini run Node 18 before v12.9.
  - All platforms run Node 22 from v12.9.0.
  - Our compatibility is `>=12.2.0`, so code and dependencies must still run on Node 16/18. This
    blocks dependencies that require Node >= 22: zigbee-clusters >= 3.2.0 and
    homey-zigbeedriver 2.2.18.
- Node 22 upgrade guide (https://apps.developer.homey.app/upgrade-guides/node-22): socket
  behaviour changed. It is relevant only to code that opens sockets (Wi-Fi/tuya-local layers).
- `.homeyignore` keeps repository-only data (reports, specs, `data/mfs_db.json`) out of the
  payload. Shards that are needed at runtime must not be ignored.

## athombv/node-homey-zigbeedriver (https://github.com/athombv/node-homey-zigbeedriver)
- `ZigBeeDevice.onNodeInit({ zclNode })` is the device entry point. Capability mapping through
  `registerCapability` and its `get`/`set`/`report` parsers keeps the per-capability logic small
  and declarative. This is the model for splitting our large base classes into small capability
  modules (T7).
- Attribute reporting and binding are configured once, at first init, guarded by a store flag
  (`configureAttributeReporting`). We follow the same once-only pattern, for example the DP102
  threshold write in sound_sensor_tuya.

## athombv/node-zigbee-clusters (https://github.com/athombv/node-zigbee-clusters)
- Clusters are classes registered in a static map. Custom clusters extend a base and are added
  with `Cluster.addCluster`, so adding attributes means extending a cluster class (as we do in
  `lib/clusters/TuyaOnOffCluster.js` for `startUpOnOff` 0x4003) rather than forking the library.
- The library is cheap to load compared with our own data, so lazy loading pays off most in our
  catalogs and optional layers.

## Structure of other Homey Zigbee apps
- JohanBendz/com.tuya.zigbee (https://github.com/JohanBendz/com.tuya.zigbee): one small driver
  folder per device family, with the shared helpers in a thin `lib`. It shows that many drivers
  are fine as long as each `device.js` stays small and heavy helpers are shared and loaded once.
- Athom brand apps (for example https://github.com/athombv/com.ikea.tradfri and
  https://github.com/athombv/com.philips.hue.zigbee): drivers subclass `ZigBeeDevice` and map
  capabilities declaratively. They have no global data catalogs, and per-device state lives in
  the store and settings.
- Community Zigbee apps (Aqara, Sonoff and others) use the same declarative mapping. Optional
  features (OTA, diagnostics) are usually separate modules required where they are used.

## Decisions for T2-T8
1. `lib/data/ShardLoader.js`: one shared instance, `get(kind, key)` loads one JSON shard on
   first use, LRU cap plus TTL (R21), and no per-device copies.
2. Shard the runtime `fingerprints.json` by productId, with a small index. Keep a fallback to the
   full file until the golden check and the perf numbers are equal or better (T4).
3. Lazy-require audit (T5): EF00 extras, OTA, Wi-Fi/tuya-local, learning and diagnostics layers
   are required on first use.
4. Every step is checked with `golden-couples.js --check` (no couple lost) and with
   `boot-heap.js --compare` (warn above 10 %).
5. Keep every dependency runnable on Node 16/18 while the minimum firmware is below 12.9.0.
