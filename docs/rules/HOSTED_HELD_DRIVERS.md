# Held drivers hosted in dormant published drivers (P3331)

Owner decision, 16/11/2026 (Paris): ship the devices of the held drivers without a new driver id, so the
Athom upload stays at 347 drivers (345 visible; see docs/knowledge/athom-driver-ceiling.md). This builds on
P3330 (same-class folds) and reuses the sound part of the unmerged P3264 branch (`origin/arch/fit-347`).

## SSOT

`lib/drivers/held-driver-folds.json`

- `hosts`: published driver ids whose own couples are fake or unpairable (no real device is paired on them):
  `device_generic_tuya`, `sensor_contact_presence`, `smart_rcbo`, `switch_plug_1`. Deprecated drivers are
  never hosts (Athom hides them, so nothing could pair).
- `folds.<held>` with `kind: "host"`: `into` (a host), `deviceClass` (`drivers/<held>/device.js`),
  optional `flowRegistrar`, and the exact `manufacturerName` x `productId` strings carried. Only couples
  that no payload driver owns are listed (for example 3 of the 8 makers of `smoke_sensor_ts0601_dp`).
- `notHosted`: held drivers that are not hosted, with the reason (their couple already ships elsewhere).
- Generated: `lib/drivers/held-host-profiles.json` (class, capabilities, capability options of each hosted
  driver), written by `node scripts/maintenance/build-held-host-profiles.cjs`; the test checks it is in sync.

## Publish (`scripts/prepare-publish.js`, step 5a2, payload only)

1. The held id leaves the payload as before. `applyHeldFolds` appends its exact strings to the host entry and
   fails closed on: undeclared host, a maker already on the host before hosting, any couple (exact or cartesian)
   already owned by another payload driver, a couple not formed.
2. The held settings the host lacks are appended to the host entry (setting ids stay unique).
3. The held flow cards keep their ids; their device filter `driver_id=<held>` becomes `driver_id=<host>`, so
   they ship instead of being dropped.
4. The held driver folder does not ship (driver folders must match app.json). Its JS is copied to
   `lib/hosted/<held>/`, every relative require re-resolved from there (fail closed if it leaves the payload).
   In the source tree, `lib/hosted/<held>/{device,driver}.js` are committed shims that re-export
   `drivers/<held>/`, so the runtime loads one literal path in both trees.
5. P3024b (no couple of the last Test package lost) and the 347 ceiling run afterwards, unchanged.

Source composes are untouched, so the duplicate-couple and couple-removal gates see one owner per couple and
no couple moves (no removal-evidence entry is needed).

## Runtime (`lib/drivers/HeldDriverFolds.js`)

- The host `driver.js` `onMapDeviceClass` calls `foldedDeviceClass(<host>, device)`. The exact maker +
  productId (trimmed, any case; settings `zb_manufacturer_name` / `zb_model_id`, then store, then data)
  selects the hosted held driver. A cartesian combo of two hosted drivers, an unknown device or a host
  couple keep the host device class.
- The held device class is wrapped once: `this._hostedAs = <held>`, a one-shot class migration from the host
  class (`lib/utils/DeviceClassMigration`), the held capabilities added with their options and the host-only
  manifest capabilities removed, then the held `onInit` runs unchanged.
- Device-triggered cards built from the driver id (`PhysicalButtonMixin`, `FlowCardHeuristics`,
  `TuyaSpecificClusterDevice`, `switch_wall_6gang`) use `_hostedAs` first, so the held card ids fire.
- Host `driver.js` `onInit` calls `registerHostedFlows(this, <host>)`: the static `registerFlowCards(driver)`
  of `heiman_siren` and `switch_2gang_ts0002` registers their action/condition listeners on the host, only
  while the held id is absent from the manifest.

## Limits

- The device pairs under the host's name and icon (Homey has no per-device rename from the app).
- The host settings page lists the settings of every profile it hosts (unused ones are ignored).
- Energy metadata (`energy` block) stays the host's.

## Releasing a hosted driver

When a held id is released or graduates, it ships as itself and its fold is ignored (folds apply only to ids
held in this payload). Devices already paired on the host stay there (Homey binds a device to its driver id).

Tests: `test/critical/p3331-hosted-held-drivers.test.js`, `test/critical/p3330-held-driver-folds.test.js`.

## P3360 class maps (couples already on a published host)

Four leftover P3085 held drivers have their exact couples already shipped on a published host (last Test package). Do not fold them with kind:host (that would append or steal couples). Use `lib/drivers/published-host-class-maps.json` and `onMapDeviceClass` on the published owner instead:

- Couples stay on the published driver id.
- The held id stays in `config/publish-hold-drivers.json`.
- Held JS is copied into the payload under `lib/hosted/<id>/` (same keepDirs path as P3331, without applyHeldFolds).
- Map only the listed manufacturerName + productId pairs (e.g. Excellux only, not every pid on motion_sensor_switch).

