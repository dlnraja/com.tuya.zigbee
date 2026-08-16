# P187 — JS codebase: load health, not just syntax (2026-08-16)

Same method as the workflow pass: get real execution evidence rather than trust a
static read. For JavaScript the decisive test is not "does it parse" but **"does
it load"**.

## Why parsing is not enough

`node --check` compiles a file. It cannot see a module that throws the instant it
is required:

- a class renamed while `module.exports` still names the old one — a
  `ReferenceError` I very nearly shipped earlier today in
  `climate_sensor_smart/driver.js`
- a `require` path that no longer resolves
- a base class that evaluates to `undefined`, or to something that is not a
  constructor

That last family is signature S18 in the project history: 18 commits over 8
months, and at least one app-crash-on-startup.

So `tools/ci/module-load-health.js` actually `require()`s every runtime module in
a child process, batched and isolated so one crash cannot take the run down. When
a batch dies as a whole it re-runs file by file, so the blame lands on the
responsible file rather than on all twenty-five.

## Result: one real defect across 1,486 modules

**`drivers/device_air_purifier_water/driver.js:5`**

```js
const Homey = require('homey');
class WaterTankMonitorDriver extends Homey {   // the module object, not Homey.Driver
```

On a Homey this throws `Class extends value #<Object> is not a constructor` at
load time, so **the driver could never start**. It parses perfectly, which is why
it survived every syntax gate. Exactly one occurrence in the whole repo; the 109
other plain drivers use `const { Driver } = require('homey')`, which is what it
now uses too.

Everything else loads: **1,486 modules, 0 real failures.**

## Getting the signal right took three passes, and that is the interesting part

The first run reported **38 failures in `lib/` alone**. All false.

Outside a Homey Pro, `require('homey')` resolves to the **Homey CLI package**,
which has no `Device`/`Driver` classes. So `homey-zigbeedriver` cannot build its
bases and everything downstream fails. A tool that reports that as 898 bugs is
worse than no tool.

Three refinements were needed, each because the previous discriminator was wrong:

1. **Stack frame origin** — failures thrown from inside `node_modules` are the
   sandbox. Cut 38 to 4.
2. **The extended expression** — four of our own files write
   `extends Homey.Device` directly, so the frame is in the repo but the cause is
   still the missing runtime. Had to read the source, not the stack. Cut 4 to 0
   for `lib/`.
3. **Transitive propagation** — a WiFi driver extending `TuyaLocalDevice` fails
   because *that* module could not build its `Homey.Device` base. Walking the
   require edges until the classification stops growing cut 90 to 0.

Crucially, the guard is narrow: only `Class extends value undefined` can be
excused this way. A base resolving to an **Object** stays a defect — which is
precisely how the real bug above stayed visible while 898 sandbox failures were
filtered out.

## Duplicate module basenames (rule S5, previously unenforced)

Two modules sharing a filename at different paths is how a copied require line
picks up the wrong one. Raw count was 17; after excluding per-driver files
(`list_devices.js`, `helpers.js`) and **re-export shims**, **14 are genuinely
divergent**:

| basename | paths |
|---|---|
| `TuyaSpecificCluster.js` | `lib/clusters/`, `lib/tuya/`, `lib/` |
| `DeviceFingerprintDB.js` | `lib/`, `lib/tuya/`, `lib/tuya-local/` |
| `TuyaSpecificClusterDevice.js` | `lib/tuya/`, `lib/` |
| `SanityFilter.js` | `lib/filter/`, `lib/tuya/` |
| `UniversalDataHandler.js` | `lib/`, `lib/utils/` |
| `ManufacturerNameHelper.js` | `lib/helpers/`, `lib/utils/` |
| `GlobalTimeSyncEngine.js` | `lib/`, `lib/tuya/` |
| `DynamicCapabilityManager.js` | `lib/dynamic/`, `lib/managers/` |
| `IntelligentPresenceInference.js` | `lib/helpers/`, `lib/sensors/` |
| `BatteryManagerV3.js` | `lib/battery/`, `lib/` |
| 4 cluster files | `lib/clusters/` vs `lib/` |

The shim distinction earned its place immediately.
`lib/helpers/IntelligentDPAutoDiscovery.js` looked like a divergent copy of the
`lib/sensors/` one — which would have meant the banned linear battery formula I
fixed there in P180 was still live for the seven drivers requiring the helpers
path. It is a one-line `module.exports = require('../sensors/…')`, so the fix
does reach them. Reported as a shim, not a hazard.

Resolving the remaining 14 means choosing a canonical path per module and
updating every requirer. Left for individual decisions rather than a sweep.

## A separate find: `tmp/` was not excluded from the publish bundle

`tmp/` holds **405 MB and 13,263 JS files**. It is gitignored, so the repository
is unaffected — but Homey does not read `.gitignore`, it reads `.homeyignore`,
and that file only had `*.tmp` and `**/*.tmp`, which match a file **extension**,
never the directory.

`homey app build` would therefore have pulled all of it into `.homeybuild`, which
`scripts/prepare-publish.js` then copies. Against a 32 MB uncompressed ceiling
that is a latent bundle bomb, and it fits the historical pattern of the size gate
being raised (24 → 40 → 45 → 50 MB) instead of the bundle being shrunk. One line
added to `.homeyignore`.

## Codebase shape

| Area | JS files |
|---|---|
| `drivers/` | 874 |
| `lib/` | 612 |
| `scripts/` | 563 |
| `tools/` | 339 |
| `test/` | 72 |
| `tmp/` (scratch, ignored) | 13,263 |

The load check deliberately defaults to `lib` and `drivers` only. `scripts/` and
`tools/` are CLI entry points — requiring them would execute their side effects,
so they are opt-in via `--scope`.

## Commands

```bash
node tools/ci/module-load-health.js
node tools/ci/module-load-health.js --scope=lib
node tools/ci/module-load-health.js --strict
node tools/ci/rules-enforcement-matrix.js
```
